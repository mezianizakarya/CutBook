-- ============================================================================
-- Shop Loyalty system (per-shop visit punch card + milestones + rewards).
--
-- Independent of Reputation. Backend-computed from the bookings history via a
-- trigger on public.bookings; the React Native client never computes counts.
--
-- Award model (fires whenever a booking reaches 'completed'):
--   * 1 completed booking = 1 loyalty visit. current_streak +1, best_streak
--     updated, total_completed_visits +1, last_qualifying_visit_at set.
--   * Counted ALWAYS (even if no program/enabled yet), so history is credited
--     and toggling the program on later retroactively unlocks milestones.
--   * Streak breakers (current_streak := 0, last_streak_break_at := now()):
--       - booking reaches 'no_show' (customer failed to show), or
--       - customer-initiated cancellation within 24h of starts_at (mirrors the
--         reputation "late cancel" window). Cancellations >= 24h early and
--         cancellations by the shop do NOT break the streak.
--   * Idempotent: loyalty_visits.booking_id is UNIQUE, so a booking can never
--     be double-counted, and re-running the award/backfill is safe.
--
-- Milestones / rewards model:
--   * Milestones belong to a shop's loyalty program (one program per shop).
--   * A milestone unlocks when total_completed_visits >= visit_count. At most
--     one reward per (customer, milestone) — unique constraint. Unlocks are
--     recomputed (reconcile) after every award and after any milestone save or
--     program enable, so editing the ladder retroactively credits customers.
--   * A reward is 'unlocked' -> 'redeemed' (redeem_reward, against an upcoming
--     booking at the same shop) or 'expired' (future, via expires_at).
--   * Unlocks only happen while program.enabled. Deleting a milestone cascades
--     away its reward rows (owner action; redeemed history is removed with it).
--   * Redemption requires program.enabled; an already-unlocked reward stays
--     redeemable even if its milestone is later deactivated.
--
-- Writes: SECURITY DEFINER RPCs only (set_loyalty_program, save/delete
-- milestone, redeem_reward). Tables are SELECT-only to clients under RLS.
-- ============================================================================

-- 1. Tables ------------------------------------------------------------------

create table public.loyalty_programs (
  id         bigint generated always as identity primary key,
  shop_id    bigint not null unique references public.shops (id) on delete cascade,
  enabled    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.loyalty_programs is
  'One loyalty program per shop. enabled gates reward unlocks + redemption + UI.';

create table public.loyalty_milestones (
  id                 bigint generated always as identity primary key,
  loyalty_program_id bigint not null references public.loyalty_programs (id) on delete cascade,
  visit_count        integer not null
                     constraint loyalty_milestones_visit_count_check check (visit_count > 0),
  reward_type        text not null
                     constraint loyalty_milestones_reward_type_check
                     check (reward_type in ('percentage_discount', 'fixed_discount', 'free_service', 'custom')),
  reward_title       text not null,
  reward_description text,
  reward_value       numeric(10, 2),
  active             boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint loyalty_milestones_value_check check (
    (reward_type = 'percentage_discount' and reward_value is not null
       and reward_value > 0 and reward_value <= 100)
    or (reward_type = 'fixed_discount' and reward_value is not null and reward_value >= 0)
    or (reward_type = 'free_service' and reward_value is null)
    or (reward_type = 'custom')
  ),
  constraint loyalty_milestones_program_visit_unique unique (loyalty_program_id, visit_count)
);

create table public.customer_loyalty (
  id                      bigint generated always as identity primary key,
  customer_id             text not null references public.profiles (id) on delete cascade,
  shop_id                 bigint not null references public.shops (id) on delete cascade,
  total_completed_visits  integer not null default 0
                          constraint customer_loyalty_total_visits_check check (total_completed_visits >= 0),
  current_streak          integer not null default 0
                          constraint customer_loyalty_current_streak_check check (current_streak >= 0),
  best_streak             integer not null default 0
                          constraint customer_loyalty_best_streak_check check (best_streak >= 0),
  last_qualifying_visit_at timestamptz,
  last_streak_break_at    timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint customer_loyalty_customer_shop_unique unique (customer_id, shop_id)
);

create index customer_loyalty_shop_idx on public.customer_loyalty (shop_id);

create table public.loyalty_visits (
  id                  bigint generated always as identity primary key,
  customer_loyalty_id bigint not null references public.customer_loyalty (id) on delete cascade,
  shop_id             bigint not null references public.shops (id) on delete cascade,
  booking_id          bigint not null unique references public.bookings (id) on delete cascade,
  awarded_at          timestamptz not null default now(),
  increment_streak    boolean not null default true
);

create index loyalty_visits_customer_created_idx
  on public.loyalty_visits (customer_loyalty_id, awarded_at desc);
create index loyalty_visits_shop_idx on public.loyalty_visits (shop_id);

create table public.customer_rewards (
  id                   bigint generated always as identity primary key,
  customer_loyalty_id  bigint not null references public.customer_loyalty (id) on delete cascade,
  milestone_id         bigint not null references public.loyalty_milestones (id) on delete cascade,
  status               text not null default 'unlocked'
                       constraint customer_rewards_status_check
                       check (status in ('unlocked', 'redeemed', 'expired')),
  unlocked_at          timestamptz not null default now(),
  redeemed_at          timestamptz,
  redeemed_booking_id  bigint references public.bookings (id) on delete set null,
  expires_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint customer_rewards_milestone_unique unique (customer_loyalty_id, milestone_id)
);

create index customer_rewards_status_idx on public.customer_rewards (customer_loyalty_id, status);

-- 2. updated_at triggers (matches the rest of the schema) -------------------

create trigger loyalty_programs_set_updated_at before update on public.loyalty_programs
  for each row execute function private.set_updated_at();
create trigger loyalty_milestones_set_updated_at before update on public.loyalty_milestones
  for each row execute function private.set_updated_at();
create trigger customer_loyalty_set_updated_at before update on public.customer_loyalty
  for each row execute function private.set_updated_at();
create trigger customer_rewards_set_updated_at before update on public.customer_rewards
  for each row execute function private.set_updated_at();

-- 3. RLS ---------------------------------------------------------------------

alter table public.loyalty_programs   enable row level security;
alter table public.loyalty_milestones enable row level security;
alter table public.customer_loyalty   enable row level security;
alter table public.loyalty_visits     enable row level security;
alter table public.customer_rewards   enable row level security;

-- Programs + milestones are shop settings visible to every logged-in user
-- (customers need the reward ladder on the shop page). No write policies:
-- all writes go through the SECURITY DEFINER RPCs.

create policy "loyalty_programs_select" on public.loyalty_programs
  for select to authenticated using (true);

create policy "loyalty_milestones_select" on public.loyalty_milestones
  for select to authenticated using (true);

-- customer_loyalty: the customer themselves, or staff (owner/manager) of the
-- shop, or an admin.

create policy "customer_loyalty_select_self" on public.customer_loyalty
  for select to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'));

create policy "customer_loyalty_select_staff_or_admin" on public.customer_loyalty
  for select to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

-- loyalty_visits: same access model, expressed through customer_loyalty.

create policy "loyalty_visits_select_self" on public.loyalty_visits
  for select to authenticated
  using (exists (
    select 1 from public.customer_loyalty cl
    where cl.id = customer_loyalty_id
      and cl.customer_id = (select auth.jwt() ->> 'sub')
  ));

create policy "loyalty_visits_select_staff_or_admin" on public.loyalty_visits
  for select to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

-- customer_rewards: same access model.

create policy "customer_rewards_select_self" on public.customer_rewards
  for select to authenticated
  using (exists (
    select 1 from public.customer_loyalty cl
    where cl.id = customer_loyalty_id
      and cl.customer_id = (select auth.jwt() ->> 'sub')
  ));

create policy "customer_rewards_select_staff_or_admin" on public.customer_rewards
  for select to authenticated
  using (exists (
    select 1 from public.customer_loyalty cl
    where cl.id = customer_loyalty_id
      and ((select private.shop_role(cl.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

-- No insert/update/delete policies on any loyalty table.

grant select on public.loyalty_programs   to authenticated;
grant select on public.loyalty_milestones to authenticated;
grant select on public.customer_loyalty   to authenticated;
grant select on public.loyalty_visits     to authenticated;
grant select on public.customer_rewards   to authenticated;

-- 4. Reconcile (unlock milestones for a customer / a whole shop) -------------

create or replace function public.reconcile_customer_loyalty(p_customer_loyalty_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cl         public.customer_loyalty;
  v_program    public.loyalty_programs;
  v_shop_name  text;
  v_milestone  record;
  v_inserted   boolean;
begin
  select * into v_cl
    from public.customer_loyalty
   where id = p_customer_loyalty_id;
  if v_cl is null then
    return;
  end if;

  select * into v_program
    from public.loyalty_programs
   where shop_id = v_cl.shop_id;
  if v_program is null or not v_program.enabled then
    return;
  end if;

  select name into v_shop_name from public.shops where id = v_cl.shop_id;

  for v_milestone in
    select m.id, m.reward_title
      from public.loyalty_milestones m
     where m.loyalty_program_id = v_program.id
       and m.active
       and m.visit_count <= v_cl.total_completed_visits
     order by m.visit_count
  loop
    v_inserted := false;
    insert into public.customer_rewards (
      customer_loyalty_id, milestone_id, status, unlocked_at
    ) values (
      v_cl.id, v_milestone.id, 'unlocked', now()
    )
    on conflict (customer_loyalty_id, milestone_id) do nothing
    returning true into v_inserted;

    if v_inserted then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        v_cl.customer_id,
        'loyalty_reward_unlocked',
        'Reward unlocked',
        coalesce(v_shop_name, 'Your barbershop') || ' · ' || v_milestone.reward_title,
        jsonb_build_object(
          'shop_id', v_cl.shop_id,
          'customer_loyalty_id', v_cl.id,
          'milestone_id', v_milestone.id
        )
      );
    end if;
  end loop;
end;
$$;

create or replace function public.reconcile_shop_loyalty(p_shop_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cl record;
begin
  for v_cl in
    select id
      from public.customer_loyalty
     where shop_id = p_shop_id
  loop
    perform public.reconcile_customer_loyalty(v_cl.id);
  end loop;
end;
$$;

-- Internal only (trigger + RPCs run as owner); clients must not invoke these,
-- so a customer cannot probe another customer's rewards.
revoke all on function public.reconcile_customer_loyalty(bigint) from public;
revoke all on function public.reconcile_shop_loyalty(bigint) from public;

-- 5. Engine: award / break-streak helpers ------------------------------------

create or replace function private.award_loyalty_visit(p_booking_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_cl_id   bigint;
  v_awarded boolean;
begin
  select * into v_booking
    from public.bookings
   where id = p_booking_id;
  if v_booking is null or v_booking.status <> 'completed' then
    return false;
  end if;

  insert into public.customer_loyalty (customer_id, shop_id)
  values (v_booking.customer_id, v_booking.shop_id)
  on conflict (customer_id, shop_id) do nothing
  returning id into v_cl_id;

  if v_cl_id is null then
    select id into v_cl_id
      from public.customer_loyalty
     where customer_id = v_booking.customer_id
       and shop_id = v_booking.shop_id;
  end if;

  insert into public.loyalty_visits (customer_loyalty_id, shop_id, booking_id)
  values (v_cl_id, v_booking.shop_id, p_booking_id)
  on conflict (booking_id) do nothing
  returning true into v_awarded;
  if v_awarded is null then
    return false;
  end if;

  update public.customer_loyalty
     set total_completed_visits      = total_completed_visits + 1,
         current_streak              = current_streak + 1,
         best_streak                 = greatest(best_streak, current_streak + 1),
         last_qualifying_visit_at    = coalesce(v_booking.completed_at, now())
   where id = v_cl_id;

  perform public.reconcile_customer_loyalty(v_cl_id);
  return true;
end;
$$;

revoke all on function private.award_loyalty_visit(bigint) from public;

create or replace function private.break_loyalty_streak(p_booking_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_breaks  boolean := false;
begin
  select * into v_booking
    from public.bookings
   where id = p_booking_id;
  if v_booking is null then
    return;
  end if;

  if v_booking.status = 'no_show' then
    v_breaks := true;
  elsif v_booking.status = 'cancelled'
        and v_booking.cancelled_by_id = v_booking.customer_id
        and v_booking.cancelled_at is not null
        and (extract(epoch from (v_booking.starts_at - v_booking.cancelled_at)) / 3600) < 24 then
    v_breaks := true;
  end if;

  if v_breaks then
    update public.customer_loyalty
       set current_streak       = 0,
           last_streak_break_at = now()
     where customer_id = v_booking.customer_id
       and shop_id     = v_booking.shop_id;
  end if;
end;
$$;

revoke all on function private.break_loyalty_streak(bigint) from public;

-- 6. Trigger on terminal booking states --------------------------------------

create or replace function private.loyalty_on_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'completed' then
      perform private.award_loyalty_visit(new.id);
    elsif new.status in ('cancelled', 'no_show') then
      perform private.break_loyalty_streak(new.id);
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'completed' then
      perform private.award_loyalty_visit(new.id);
    elsif new.status in ('cancelled', 'no_show') then
      perform private.break_loyalty_streak(new.id);
    end if;
  end if;
  return null;
end;
$$;

revoke all on function private.loyalty_on_booking_change() from public;

create trigger loyalty_on_booking_change
  after insert or update of status on public.bookings
  for each row execute function private.loyalty_on_booking_change();

-- 7. Owner RPCs (program + milestone management) ------------------------------

create or replace function public.set_loyalty_program(p_shop_id bigint, p_enabled boolean)
returns public.loyalty_programs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_row public.loyalty_programs;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if (select private.shop_role(p_shop_id)) not in ('owner', 'manager')
     and (select private.current_role()) <> 'admin' then
    raise exception 'not authorized to manage this shop';
  end if;

  insert into public.loyalty_programs (shop_id, enabled)
  values (p_shop_id, p_enabled)
  on conflict (shop_id) do update set enabled = excluded.enabled
  returning * into v_row;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid, 'loyalty_program_updated', 'loyalty_programs', p_shop_id::text,
          jsonb_build_object('enabled', p_enabled));

  -- Enabling retroactively unlocks milestones from already-counted visits.
  if p_enabled then
    perform public.reconcile_shop_loyalty(p_shop_id);
  end if;

  return v_row;
end;
$$;

revoke all on function public.set_loyalty_program(bigint, boolean) from public;
grant execute on function public.set_loyalty_program(bigint, boolean) to authenticated;

create or replace function public.save_loyalty_milestone(
  p_program_id         bigint,
  p_visit_count        integer,
  p_reward_type        text,
  p_reward_title       text,
  p_reward_description text default null,
  p_reward_value       numeric default null,
  p_active             boolean default true,
  p_sort_order         integer default 0,
  p_milestone_id       bigint default null
)
returns public.loyalty_milestones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     text;
  v_program public.loyalty_programs;
  v_row     public.loyalty_milestones;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_program
    from public.loyalty_programs
   where id = p_program_id;
  if v_program is null then
    raise exception 'loyalty program not found';
  end if;
  if (select private.shop_role(v_program.shop_id)) not in ('owner', 'manager')
     and (select private.current_role()) <> 'admin' then
    raise exception 'not authorized to manage this shop';
  end if;

  if p_visit_count is null or p_visit_count <= 0 then
    raise exception 'visit count must be positive';
  end if;
  if p_reward_type not in ('percentage_discount', 'fixed_discount', 'free_service', 'custom') then
    raise exception 'invalid reward type';
  end if;
  if p_reward_title is null or btrim(p_reward_title) = '' then
    raise exception 'reward title is required';
  end if;
  if (p_reward_type = 'percentage_discount'
        and (p_reward_value is null or p_reward_value <= 0 or p_reward_value > 100))
     or (p_reward_type = 'fixed_discount' and (p_reward_value is null or p_reward_value < 0))
     or (p_reward_type = 'free_service' and p_reward_value is not null) then
    raise exception 'invalid reward value';
  end if;

  if exists (
    select 1 from public.loyalty_milestones
    where loyalty_program_id = p_program_id
      and visit_count = p_visit_count
      and (p_milestone_id is null or id <> p_milestone_id)
  ) then
    raise exception 'a reward already exists at % visits', p_visit_count;
  end if;

  if p_milestone_id is null then
    insert into public.loyalty_milestones (
      loyalty_program_id, visit_count, reward_type, reward_title,
      reward_description, reward_value, active, sort_order
    ) values (
      p_program_id, p_visit_count, p_reward_type, btrim(p_reward_title),
      nullif(btrim(coalesce(p_reward_description, '')), ''),
      p_reward_value, p_active, p_sort_order
    )
    returning * into v_row;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
    values (v_uid, 'loyalty_milestone_created', 'loyalty_milestones',
            v_row.id::text, to_jsonb(v_row));
  else
    update public.loyalty_milestones
       set visit_count         = p_visit_count,
           reward_type         = p_reward_type,
           reward_title        = btrim(p_reward_title),
           reward_description  = nullif(btrim(coalesce(p_reward_description, '')), ''),
           reward_value        = p_reward_value,
           active              = p_active,
           sort_order          = p_sort_order
     where id = p_milestone_id and loyalty_program_id = p_program_id
     returning * into v_row;
    if v_row is null then
      raise exception 'milestone not found';
    end if;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
    values (v_uid, 'loyalty_milestone_updated', 'loyalty_milestones',
            v_row.id::text, to_jsonb(v_row));
  end if;

  -- A new/changed milestone may unlock retroactively for existing customers.
  perform public.reconcile_shop_loyalty(v_program.shop_id);
  return v_row;
end;
$$;

revoke all on function public.save_loyalty_milestone(bigint, integer, text, text, text, numeric, boolean, integer, bigint) from public;
grant execute on function public.save_loyalty_milestone(bigint, integer, text, text, text, numeric, boolean, integer, bigint) to authenticated;

create or replace function public.delete_loyalty_milestone(p_milestone_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        text;
  v_milestone  public.loyalty_milestones;
  v_program    public.loyalty_programs;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_milestone
    from public.loyalty_milestones
   where id = p_milestone_id;
  if v_milestone is null then
    raise exception 'milestone not found';
  end if;

  select * into v_program
    from public.loyalty_programs
   where id = v_milestone.loyalty_program_id;
  if v_program is null then
    raise exception 'loyalty program not found';
  end if;
  if (select private.shop_role(v_program.shop_id)) not in ('owner', 'manager')
     and (select private.current_role()) <> 'admin' then
    raise exception 'not authorized to manage this shop';
  end if;

  delete from public.loyalty_milestones where id = p_milestone_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before)
  values (v_uid, 'loyalty_milestone_deleted', 'loyalty_milestones',
          p_milestone_id::text, to_jsonb(v_milestone));
end;
$$;

revoke all on function public.delete_loyalty_milestone(bigint) from public;
grant execute on function public.delete_loyalty_milestone(bigint) to authenticated;

-- 8. Customer RPC: redeem a reward against an upcoming booking ----------------

create or replace function public.redeem_reward(p_reward_id bigint, p_booking_id bigint)
returns public.customer_rewards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     text;
  v_reward  public.customer_rewards;
  v_cl      public.customer_loyalty;
  v_program public.loyalty_programs;
  v_booking public.bookings;
  v_row     public.customer_rewards;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_reward
    from public.customer_rewards
   where id = p_reward_id
   for update;
  if v_reward is null then
    raise exception 'reward not found';
  end if;

  select * into v_cl
    from public.customer_loyalty
   where id = v_reward.customer_loyalty_id;
  if v_cl.customer_id <> v_uid then
    raise exception 'not authorized';
  end if;

  if v_reward.status <> 'unlocked' then
    raise exception 'reward is not available';
  end if;
  if v_reward.expires_at is not null and v_reward.expires_at < now() then
    update public.customer_rewards
       set status = 'expired'
     where id = p_reward_id and status = 'unlocked';
    raise exception 'reward has expired';
  end if;

  select * into v_program
    from public.loyalty_programs
   where shop_id = v_cl.shop_id;
  if v_program is null or not v_program.enabled then
    raise exception 'loyalty program is not active';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id
   for update;
  if v_booking is null then
    raise exception 'booking not found';
  end if;
  if v_booking.customer_id <> v_uid then
    raise exception 'not authorized';
  end if;
  if v_booking.shop_id <> v_cl.shop_id then
    raise exception 'booking is at a different shop';
  end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'reward can only be applied to an upcoming booking';
  end if;

  update public.customer_rewards
     set status              = 'redeemed',
         redeemed_at         = now(),
         redeemed_booking_id = p_booking_id
   where id = p_reward_id and status = 'unlocked'
   returning * into v_row;
  if v_row is null then
    raise exception 'reward already redeemed';
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (v_uid, 'reward_redeemed', 'customer_rewards', p_reward_id::text,
          jsonb_build_object('status', 'unlocked'),
          jsonb_build_object('status', 'redeemed', 'booking_id', p_booking_id));

  return v_row;
end;
$$;

revoke all on function public.redeem_reward(bigint, bigint) from public;
grant execute on function public.redeem_reward(bigint, bigint) to authenticated;

-- 9. Backfill existing bookings (idempotent; runs even when no program exists,
-- so toggling a program on later credits prior visits) ------------------------

do $$
declare
  v_event record;
begin
  for v_event in
    select b.id, b.status,
           case
             when b.status = 'completed' then coalesce(b.completed_at, b.updated_at, b.created_at)
             when b.status = 'cancelled' then coalesce(b.cancelled_at, b.updated_at)
             else coalesce(b.updated_at, b.created_at)
           end as event_time
      from public.bookings b
     where b.status in ('completed', 'cancelled', 'no_show')
       and exists (
         select 1 from public.profiles p
         where p.id = b.customer_id and p.deleted_at is null
       )
     order by event_time asc, b.id asc
  loop
    if v_event.status = 'completed' then
      perform private.award_loyalty_visit(v_event.id);
    elsif v_event.status in ('cancelled', 'no_show') then
      perform private.break_loyalty_streak(v_event.id);
    end if;
  end loop;
end;
$$;
