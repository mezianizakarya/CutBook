-- ============================================================================
-- Customer Trust / Reputation system (independent of Loyalty & Booking Notes).
--
-- One row per customer in customer_reputation. The backend recomputes it from
-- the bookings history every time a booking reaches a terminal state
-- (completed / cancelled / no_show) via a trigger on public.bookings. The
-- calculation is NEVER done in the React Native client.
--
-- Public levels: new -> regular -> reliable -> trusted -> elite
--
-- Trust score (0..100, defaults below; overridable via
-- platform_settings['reputation_config']):
--   trust_score = completed*6 - late_cancel*8 - very_late_cancel*12 - no_show*15
--   clamped to [0, 100]. Early cancellations score 0 (no penalty).
--
-- Cancellation windows (customer-initiated cancels only, measured from
-- cancelled_at vs starts_at):
--   early      >= 24h before start  -> 0
--   late       2h..24h before start -> -8
--   very late  < 2h before start    -> -12
--   no-show    (status 'no_show')   -> -15
--
-- reliability_rate = completed / (completed + late + very_late + no_show)
-- (null when no such bookings exist).
--
-- Level gates (experience AND reliability):
--   regular : completed >= 1  AND score >= 6
--   reliable: completed >= 5  AND score >= 30 AND reliability >= 0.80
--   trusted : completed >= 15 AND score >= 60 AND reliability >= 0.90
--   elite   : completed >= 30 AND score >= 85 AND reliability >= 0.95
--   otherwise -> new
--
-- Because levels depend on cumulative stats + the reliability rate, a single
-- mistake degrades slowly (one late cancel keeps a Trusted customer Trusted),
-- while repeated negatives compound and push the level down. Experience and
-- reliability are BOTH required, so 100 completed + many misses (Customer A)
-- ranks below 15 completed + perfect attendance (Customer B).
--
-- Effective level = admin override if set, else the computed auto_level
-- (generated column, always consistent).
-- ============================================================================

-- 1. Table -------------------------------------------------------------------

create table public.customer_reputation (
  customer_id text primary key references public.profiles (id) on delete cascade,
  trust_score integer not null default 0
    constraint customer_reputation_score_range check (trust_score between 0 and 100),
  auto_level text not null default 'new'
    constraint customer_reputation_auto_level_check
    check (auto_level in ('new', 'regular', 'reliable', 'trusted', 'elite')),
  admin_level text
    constraint customer_reputation_admin_level_check
    check (admin_level in ('new', 'regular', 'reliable', 'trusted', 'elite')),
  level text not null generated always as (coalesce(admin_level, auto_level)) stored,
  completed_count integer not null default 0,
  early_cancel_count integer not null default 0,
  late_cancel_count integer not null default 0,
  very_late_cancel_count integer not null default 0,
  no_show_count integer not null default 0,
  reliability_rate numeric(6, 4),
  admin_override_reason text,
  admin_override_at timestamptz,
  admin_override_by text references public.profiles (id) on delete set null,
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_reputation_counts_nonneg check (
    completed_count >= 0 and early_cancel_count >= 0 and late_cancel_count >= 0
    and very_late_cancel_count >= 0 and no_show_count >= 0
  )
);

comment on table public.customer_reputation is
  'Backend-computed customer trust/reputation. level = admin override else auto_level.';
comment on column public.customer_reputation.trust_score is
  '0..100 weighted score from booking behavior (see platform_settings reputation_config).';
comment on column public.customer_reputation.reliability_rate is
  'completed / (completed + late_cancel + very_late_cancel + no_show); null with no data.';

create index customer_reputation_level_idx
  on public.customer_reputation (level);

-- 2. updated_at trigger (matches the rest of the schema) ---------------------

create trigger customer_reputation_set_updated_at
  before update on public.customer_reputation
  for each row execute function private.set_updated_at();

-- 3. RLS ---------------------------------------------------------------------

alter table public.customer_reputation enable row level security;

create policy "customer_reputation_select_self" on public.customer_reputation
  for select to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'));

create policy "customer_reputation_select_admin" on public.customer_reputation
  for select to authenticated
  using ((select private.current_role()) = 'admin');

-- No insert/update/delete policies: reputation is backend-controlled only.
-- Staff/barbers read reputation through the SECURITY DEFINER RPC
-- booking_customer_reputation(), which re-checks per-booking access.

grant select on public.customer_reputation to authenticated;

-- 4. Config defaults ---------------------------------------------------------

insert into public.platform_settings (key, value, description)
values (
  'reputation_config',
  '{"weights":{"completed":6,"early_cancel":0,"late_cancel":-8,"very_late_cancel":-12,"no_show":-15},"hours":{"late_cancel":24,"very_late_cancel":2},"levels":[{"level":"elite","min_completed":30,"min_score":85,"min_reliability":0.95},{"level":"trusted","min_completed":15,"min_score":60,"min_reliability":0.9},{"level":"reliable","min_completed":5,"min_score":30,"min_reliability":0.8},{"level":"regular","min_completed":1,"min_score":6,"min_reliability":0}]}'::jsonb,
  'Customer trust/reputation tuning: cancellation windows (hours), score weights, and level thresholds (array ordered highest to lowest, first match wins).'
)
on conflict (key) do nothing;

-- 5. Engine: recalculate_reputation ------------------------------------------

create or replace function public.recalculate_reputation(p_customer_id text)
returns public.customer_reputation
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completed      integer;
  v_early          integer;
  v_late           integer;
  v_very_late      integer;
  v_no_show        integer;
  v_negatives      integer;
  v_reliability    numeric(6, 4);
  v_raw            integer;
  v_score          integer;
  v_level          text;
  v_cfg            jsonb;
  v_rec            jsonb;
  v_idx            integer;
  v_w_completed    integer := 6;
  v_w_early        integer := 0;
  v_w_late         integer := -8;
  v_w_very_late    integer := -12;
  v_w_no_show      integer := -15;
  v_late_hours     numeric := 24;
  v_vlate_hours    numeric := 2;
  v_min_completed  integer;
  v_min_score      integer;
  v_min_reliab     numeric;
  v_row            public.customer_reputation;
begin
  if p_customer_id is null or btrim(p_customer_id) = '' then
    raise exception 'customer id is required';
  end if;

  select value into v_cfg
    from public.platform_settings
   where key = 'reputation_config';

  if v_cfg is not null then
    v_w_completed := coalesce((v_cfg #>> '{weights,completed}')::integer, v_w_completed);
    v_w_early     := coalesce((v_cfg #>> '{weights,early_cancel}')::integer, v_w_early);
    v_w_late      := coalesce((v_cfg #>> '{weights,late_cancel}')::integer, v_w_late);
    v_w_very_late := coalesce((v_cfg #>> '{weights,very_late_cancel}')::integer, v_w_very_late);
    v_w_no_show   := coalesce((v_cfg #>> '{weights,no_show}')::integer, v_w_no_show);
    v_late_hours  := coalesce((v_cfg #>> '{hours,late_cancel}')::numeric, v_late_hours);
    v_vlate_hours := coalesce((v_cfg #>> '{hours,very_late_cancel}')::numeric, v_vlate_hours);
  end if;

  select
    count(*) filter (where status = 'completed'),
    count(*) filter (
      where status = 'cancelled'
        and cancelled_by_id = p_customer_id
        and cancelled_at is not null
        and (extract(epoch from (starts_at - cancelled_at)) / 3600) >= v_late_hours
    ),
    count(*) filter (
      where status = 'cancelled'
        and cancelled_by_id = p_customer_id
        and cancelled_at is not null
        and (extract(epoch from (starts_at - cancelled_at)) / 3600) >= v_vlate_hours
        and (extract(epoch from (starts_at - cancelled_at)) / 3600) < v_late_hours
    ),
    count(*) filter (
      where status = 'cancelled'
        and cancelled_by_id = p_customer_id
        and cancelled_at is not null
        and (extract(epoch from (starts_at - cancelled_at)) / 3600) < v_vlate_hours
    ),
    count(*) filter (where status = 'no_show')
  into v_completed, v_early, v_late, v_very_late, v_no_show
    from public.bookings
   where customer_id = p_customer_id;

  v_raw    := v_completed * v_w_completed + v_early * v_w_early
               + v_late * v_w_late + v_very_late * v_w_very_late
               + v_no_show * v_w_no_show;
  v_score  := least(100, greatest(0, v_raw));

  v_negatives := v_late + v_very_late + v_no_show;
  if (v_completed + v_negatives) > 0 then
    v_reliability := round(
      (v_completed::numeric / (v_completed + v_negatives))::numeric, 4
    );
  else
    v_reliability := null;
  end if;

  -- Level: configured array is ordered highest -> lowest, first match wins.
  v_level := 'new';
  if v_cfg is not null and jsonb_typeof(v_cfg -> 'levels') = 'array'
     and jsonb_array_length(v_cfg -> 'levels') > 0 then
    for v_idx in 1 .. jsonb_array_length(v_cfg -> 'levels')
    loop
      v_rec := (v_cfg -> 'levels') -> (v_idx - 1);
      v_min_completed := coalesce((v_rec ->> 'min_completed')::integer, 0);
      v_min_score     := coalesce((v_rec ->> 'min_score')::integer, 0);
      v_min_reliab    := coalesce((v_rec ->> 'min_reliability')::numeric, 0);
      if v_completed >= v_min_completed
         and v_score >= v_min_score
         and (v_reliability is null or v_reliability >= v_min_reliab) then
        v_level := v_rec ->> 'level';
        exit;
      end if;
    end loop;
  else
    if v_completed >= 30 and v_score >= 85
       and v_reliability is not null and v_reliability >= 0.95 then
      v_level := 'elite';
    elsif v_completed >= 15 and v_score >= 60
          and v_reliability is not null and v_reliability >= 0.90 then
      v_level := 'trusted';
    elsif v_completed >= 5 and v_score >= 30
          and v_reliability is not null and v_reliability >= 0.80 then
      v_level := 'reliable';
    elsif v_completed >= 1 and v_score >= 6 then
      v_level := 'regular';
    end if;
  end if;

  insert into public.customer_reputation (
    customer_id, trust_score, auto_level, completed_count,
    early_cancel_count, late_cancel_count, very_late_cancel_count,
    no_show_count, reliability_rate, last_calculated_at
  ) values (
    p_customer_id, v_score, v_level, v_completed,
    v_early, v_late, v_very_late, v_no_show,
    v_reliability, now()
  )
  on conflict (customer_id) do update set
    trust_score              = excluded.trust_score,
    auto_level               = excluded.auto_level,
    completed_count          = excluded.completed_count,
    early_cancel_count       = excluded.early_cancel_count,
    late_cancel_count        = excluded.late_cancel_count,
    very_late_cancel_count   = excluded.very_late_cancel_count,
    no_show_count            = excluded.no_show_count,
    reliability_rate         = excluded.reliability_rate,
    last_calculated_at       = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- Internal only (trigger + backfill + admin RPC run as owner). Clients cannot
-- invoke it directly, so a customer cannot probe another customer's level.
revoke all on function public.recalculate_reputation(text) from public;

-- 6. Trigger on terminal booking states --------------------------------------

create or replace function private.reputation_on_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status in ('completed', 'cancelled', 'no_show') then
    perform public.recalculate_reputation(new.customer_id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status
        and new.status in ('completed', 'cancelled', 'no_show') then
    perform public.recalculate_reputation(new.customer_id);
  end if;
  return null;
end;
$$;

revoke all on function private.reputation_on_booking_change() from public;

create trigger reputation_on_booking_change
  after insert or update of status on public.bookings
  for each row execute function private.reputation_on_booking_change();

-- 7. Staff read RPC (same access re-check pattern as booking_customer_details)
-- -----------------------------------------------------------------------------

create or replace function public.booking_customer_reputation(p_booking_ids bigint[])
returns table (
  booking_id      bigint,
  customer_id     text,
  level           text,
  completed_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid            text;
  v_booking_id     bigint;
  v_booking        public.bookings;
  v_is_staff       boolean;
  v_is_staff_lead  boolean;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  foreach v_booking_id in array p_booking_ids
  loop
    select * into v_booking
      from public.bookings
     where id = v_booking_id;
    if v_booking is null then
      continue;
    end if;

    v_is_staff := exists (
      select 1 from public.shop_members
      where id = v_booking.staff_id
        and profile_id = v_uid
        and removed_at is null
    );

    v_is_staff_lead := exists (
      select 1 from public.shop_members m
      where m.id = v_booking.staff_id
        and m.shop_id in (
          select sm.shop_id from public.shop_members sm
          where sm.profile_id = v_uid
            and sm.member_role in ('owner', 'manager')
            and sm.removed_at is null
        )
    );

    if not (v_is_staff or v_is_staff_lead
            or (select role from public.profiles where id = v_uid) = 'admin') then
      continue;
    end if;

    return query
      select v_booking_id,
             v_booking.customer_id,
             coalesce(cr.level, 'new')          as level,
             coalesce(cr.completed_count, 0)    as completed_count
        from (select 1) as one
        left join public.customer_reputation cr
          on cr.customer_id = v_booking.customer_id;
  end loop;
  return;
end;
$$;

revoke all on function public.booking_customer_reputation(bigint[]) from public;
grant execute on function public.booking_customer_reputation(bigint[]) to authenticated;

-- 8. Admin override / revoke ------------------------------------------------

create or replace function public.admin_set_reputation_level(
  p_customer_id text,
  p_level       text,
  p_reason      text
)
returns public.customer_reputation
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  text;
  v_prev public.customer_reputation;
  v_row  public.customer_reputation;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if (select role from public.profiles where id = v_uid) <> 'admin' then
    raise exception 'admin only';
  end if;
  if p_level is not null and p_level not in ('new', 'regular', 'reliable', 'trusted', 'elite') then
    raise exception 'invalid level';
  end if;
  if p_level is not null and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'an override reason is required';
  end if;

  select * into v_prev
    from public.customer_reputation
   where customer_id = p_customer_id
   for update;

  if v_prev is null then
    insert into public.customer_reputation (customer_id)
    values (p_customer_id)
    on conflict (customer_id) do nothing;
  end if;

  if p_level is null then
    update public.customer_reputation
       set admin_level           = null,
           admin_override_reason = null,
           admin_override_at     = null,
           admin_override_by     = null
     where customer_id = p_customer_id;
  else
    update public.customer_reputation
       set admin_level           = p_level,
           admin_override_reason = btrim(p_reason),
           admin_override_at     = now(),
           admin_override_by     = v_uid
     where customer_id = p_customer_id;
  end if;

  -- Refresh the automatic level so the effective level is up to date after
  -- revoking an override (admin override fields are untouched by recalc).
  perform public.recalculate_reputation(p_customer_id);

  select * into v_row
    from public.customer_reputation
   where customer_id = p_customer_id;

  insert into public.audit_log (
    actor_id, action, entity_type, entity_id, before, after
  ) values (
    v_uid, 'reputation_level_override', 'customer_reputation', p_customer_id,
    jsonb_build_object('admin_level', v_prev.admin_level),
    jsonb_build_object('admin_level', p_level, 'reason', p_reason)
  );

  return v_row;
end;
$$;

revoke all on function public.admin_set_reputation_level(text, text, text) from public;
grant execute on function public.admin_set_reputation_level(text, text, text) to authenticated;

-- 9. Backfill existing customers --------------------------------------------

do $$
declare
  v_customer record;
begin
  for v_customer in
    select id from public.profiles
     where role = 'customer' and deleted_at is null
  loop
    perform public.recalculate_reputation(v_customer.id);
  end loop;
end;
$$;
