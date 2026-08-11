-- Barber work session: authoritative "serving" timestamp + accumulated
-- extension minutes. Expected end is DERIVED (started_at + duration +
-- extended_minutes); we never mutate ends_at, so the no-overlap EXCLUDE
-- constraint stays intact.

alter table public.bookings
  add column started_at timestamptz;

alter table public.bookings
  add column extended_minutes integer not null default 0
  constraint bookings_extended_minutes_check check (extended_minutes >= 0);

comment on column public.bookings.started_at is
  'When the barber started serving this booking (authoritative timer anchor).';
comment on column public.bookings.extended_minutes is
  'Accumulated extra minutes added by the barber (authoritative for expected end).';

-- start_booking: begin serving. Marks started_at, promotes pending -> confirmed.
create or replace function public.start_booking(p_booking_id bigint)
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
    raise exception 'not authorized to start this booking';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'booking cannot be started in status %', v_booking.status;
  end if;
  if v_booking.started_at is not null then
    raise exception 'booking already started';
  end if;

  update public.bookings
     set started_at = now(),
         status = case when v_booking.status = 'pending' then 'confirmed' else v_booking.status end
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.start_booking(bigint) from public;
grant execute on function public.start_booking(bigint) to authenticated;

-- extend_booking: add minutes to the currently served booking.
create or replace function public.extend_booking(p_booking_id bigint, p_minutes integer)
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
  if p_minutes is null or p_minutes <= 0 then
    raise exception 'extension must be a positive number of minutes';
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
    raise exception 'not authorized to extend this booking';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'booking cannot be extended in status %', v_booking.status;
  end if;
  if v_booking.started_at is null then
    raise exception 'booking has not started yet';
  end if;

  update public.bookings
     set extended_minutes = v_booking.extended_minutes + p_minutes
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.extend_booking(bigint, integer) from public;
grant execute on function public.extend_booking(bigint, integer) to authenticated;
