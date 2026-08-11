-- Work session upgrades:
--   1. Pause/resume on the served booking (paused_at + accumulated paused_minutes;
--      expected end stays derived, so the EXCLUDE constraint is untouched).
--   2. work_days: persisted clock-in/clock-out per member per day.
--   3. add_walkin: barber/owner/manager/admin inserts a confirmed on-the-spot booking.
--   4. staff_day_schedule: the schedule rows for the staff member who owns a booking,
--      exposed to that booking's customer only (no PII) so the customer UI can run
--      the same buildTodaySchedule engine.

-- 1. Pause / resume ----------------------------------------------------------

alter table public.bookings
  add column paused_at timestamptz;

alter table public.bookings
  add column paused_minutes integer not null default 0
  constraint bookings_paused_minutes_check check (paused_minutes >= 0);

comment on column public.bookings.paused_at is
  'When the barber last paused the served booking (null = running).';
comment on column public.bookings.paused_minutes is
  'Accumulated paused minutes (authoritative for expected end).';

-- pause_booking: freeze the running timer.
create or replace function public.pause_booking(p_booking_id bigint)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_booking public.bookings;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id
   for update;
  if v_booking is null then
    raise exception 'booking not found';
  end if;

  if not (
    exists (
      select 1 from public.shop_members
      where id = v_booking.staff_id
        and profile_id = v_uid
        and removed_at is null
    )
    or exists (
      select 1 from public.shop_members m
      where m.id = v_booking.staff_id
        and m.shop_id in (
          select sm.shop_id from public.shop_members sm
          where sm.profile_id = v_uid
            and sm.member_role in ('owner', 'manager')
            and sm.removed_at is null
        )
    )
    or (select role from public.profiles where id = v_uid) = 'admin'
  ) then
    raise exception 'not authorized to pause this booking';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'booking cannot be paused in status %', v_booking.status;
  end if;
  if v_booking.started_at is null then
    raise exception 'booking has not started yet';
  end if;
  if v_booking.paused_at is not null then
    raise exception 'booking is already paused';
  end if;

  update public.bookings
     set paused_at = now()
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.pause_booking(bigint) from public;
grant execute on function public.pause_booking(bigint) to authenticated;

-- resume_booking: fold the current pause into paused_minutes and resume the clock.
create or replace function public.resume_booking(p_booking_id bigint)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_booking public.bookings;
  v_paused_seconds double precision;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id
   for update;
  if v_booking is null then
    raise exception 'booking not found';
  end if;

  if not (
    exists (
      select 1 from public.shop_members
      where id = v_booking.staff_id
        and profile_id = v_uid
        and removed_at is null
    )
    or exists (
      select 1 from public.shop_members m
      where m.id = v_booking.staff_id
        and m.shop_id in (
          select sm.shop_id from public.shop_members sm
          where sm.profile_id = v_uid
            and sm.member_role in ('owner', 'manager')
            and sm.removed_at is null
        )
    )
    or (select role from public.profiles where id = v_uid) = 'admin'
  ) then
    raise exception 'not authorized to resume this booking';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'booking cannot be resumed in status %', v_booking.status;
  end if;
  if v_booking.paused_at is null then
    raise exception 'booking is not paused';
  end if;

  v_paused_seconds := extract(epoch from (now() - v_booking.paused_at));

  update public.bookings
     set paused_minutes = v_booking.paused_minutes
         + ceil(greatest(v_paused_seconds, 0))::int,
         paused_at = null
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.resume_booking(bigint) from public;
grant execute on function public.resume_booking(bigint) to authenticated;

-- 2. work_days ---------------------------------------------------------------

create table public.work_days (
  id             bigint generated always as identity primary key,
  shop_member_id bigint not null references public.shop_members (id) on delete cascade,
  work_date      date not null,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint work_days_member_date_unique unique (shop_member_id, work_date)
);

comment on table public.work_days is
  'Clock-in / clock-out per barber per day (drives the Finish Day summary).';

alter table public.work_days enable row level security;

create policy "work_days_select_member" on public.work_days
  for select to authenticated
  using (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or exists (
    select 1 from public.shop_members m
    where m.id = shop_member_id
      and ((select private.shop_role(m.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

create policy "work_days_insert_member" on public.work_days
  for insert to authenticated
  with check (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or exists (
    select 1 from public.shop_members m
    where m.id = shop_member_id
      and ((select private.shop_role(m.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

create policy "work_days_update_member" on public.work_days
  for update to authenticated
  using (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or exists (
    select 1 from public.shop_members m
    where m.id = shop_member_id
      and ((select private.shop_role(m.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ))
  with check (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or exists (
    select 1 from public.shop_members m
    where m.id = shop_member_id
      and ((select private.shop_role(m.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

grant select, insert, update on public.work_days to authenticated;

-- start_workday: create today's row if missing (idempotent clock-in).
create or replace function public.start_workday(p_member_id bigint)
returns public.work_days
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_row public.work_days;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not (
    exists (
      select 1 from public.shop_members
      where id = p_member_id and profile_id = v_uid and removed_at is null
    )
    or exists (
      select 1 from public.shop_members m
      where m.id = p_member_id
        and m.shop_id in (
          select sm.shop_id from public.shop_members sm
          where sm.profile_id = v_uid
            and sm.member_role in ('owner', 'manager')
            and sm.removed_at is null
        )
    )
    or (select role from public.profiles where id = v_uid) = 'admin'
  ) then
    raise exception 'not authorized to start this workday';
  end if;

  select * into v_row
    from public.work_days
   where shop_member_id = p_member_id
     and work_date = current_date
   for update;
  if v_row is null then
    insert into public.work_days (shop_member_id, work_date, started_at)
    values (p_member_id, current_date, now())
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.start_workday(bigint) from public;
grant execute on function public.start_workday(bigint) to authenticated;

-- end_workday: clock out today's row (idempotent).
create or replace function public.end_workday(p_member_id bigint)
returns public.work_days
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_row public.work_days;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not (
    exists (
      select 1 from public.shop_members
      where id = p_member_id and profile_id = v_uid and removed_at is null
    )
    or exists (
      select 1 from public.shop_members m
      where m.id = p_member_id
        and m.shop_id in (
          select sm.shop_id from public.shop_members sm
          where sm.profile_id = v_uid
            and sm.member_role in ('owner', 'manager')
            and sm.removed_at is null
        )
    )
    or (select role from public.profiles where id = v_uid) = 'admin'
  ) then
    raise exception 'not authorized to end this workday';
  end if;

  select * into v_row
    from public.work_days
   where shop_member_id = p_member_id
     and work_date = current_date
   for update;
  if v_row is null then
    insert into public.work_days (shop_member_id, work_date, started_at, ended_at)
    values (p_member_id, current_date, now(), now())
    returning * into v_row;
  else
    update public.work_days
       set ended_at = now()
     where id = v_row.id
     returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.end_workday(bigint) from public;
grant execute on function public.end_workday(bigint) to authenticated;

-- 3. add_walkin --------------------------------------------------------------

create or replace function public.add_walkin(
  p_staff_id bigint,
  p_service_id bigint,
  p_customer_id text,
  p_starts_at timestamptz
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_service public.services;
  v_shop_id bigint;
  v_booking public.bookings;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select shop_id into v_shop_id
    from public.shop_members
   where id = p_staff_id and removed_at is null;
  if v_shop_id is null then
    raise exception 'staff member not found';
  end if;

  if not (
    exists (
      select 1 from public.shop_members
      where id = p_staff_id and profile_id = v_uid and removed_at is null
    )
    or exists (
      select 1 from public.shop_members m
      where m.id = p_staff_id
        and m.shop_id in (
          select sm.shop_id from public.shop_members sm
          where sm.profile_id = v_uid
            and sm.member_role in ('owner', 'manager')
            and sm.removed_at is null
        )
    )
    or (select role from public.profiles where id = v_uid) = 'admin'
  ) then
    raise exception 'not authorized to add a walk-in for this staff member';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_customer_id and role = 'customer' and deleted_at is null
  ) then
    raise exception 'customer not found';
  end if;

  select * into v_service
    from public.services
   where id = p_service_id and shop_id = v_shop_id and is_active;
  if v_service is null then
    raise exception 'service not found for this shop';
  end if;

  if p_starts_at is null then
    raise exception 'start time is required';
  end if;

  begin
    insert into public.bookings
      (shop_id, customer_id, staff_id, service_id, status, starts_at, ends_at,
       service_name, service_price_cents, service_duration_minutes)
    values
      (v_shop_id, p_customer_id, p_staff_id, v_service.id, 'confirmed',
       p_starts_at,
       p_starts_at + (v_service.duration_minutes || ' minutes')::interval,
       v_service.name, v_service.price_cents, v_service.duration_minutes)
    returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'that time overlaps an existing booking';
  end;

  return v_booking;
end;
$$;

revoke all on function public.add_walkin(bigint, bigint, text, timestamptz) from public;
grant execute on function public.add_walkin(bigint, bigint, text, timestamptz) to authenticated;

-- 4. staff_day_schedule ------------------------------------------------------
-- Returns the non-PII schedule rows for the staff member who owns the caller's
-- booking on that day, so the customer can derive live progress with the same
-- engine the barber uses. Caller must be the booking's customer.
create or replace function public.staff_day_schedule(p_booking_id bigint)
returns table (
  id bigint,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  started_at timestamptz,
  extended_minutes integer,
  paused_at timestamptz,
  paused_minutes integer,
  service_name text,
  service_price_cents integer,
  service_duration_minutes integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_staff_id bigint;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select b.staff_id into v_staff_id
    from public.bookings b
   where b.id = p_booking_id and b.customer_id = v_uid;
  if v_staff_id is null then
    raise exception 'booking not found for this customer';
  end if;

  v_day_start := date_trunc('day', now());
  v_day_end := v_day_start + interval '1 day';

  return query
    select b.id, b.status, b.starts_at, b.ends_at, b.started_at,
           b.extended_minutes, b.paused_at, b.paused_minutes,
           b.service_name, b.service_price_cents, b.service_duration_minutes
      from public.bookings b
     where b.staff_id = v_staff_id
       and b.starts_at >= v_day_start
       and b.starts_at < v_day_end
     order by b.starts_at;
end;
$$;

revoke all on function public.staff_day_schedule(bigint) from public;
grant execute on function public.staff_day_schedule(bigint) to authenticated;
