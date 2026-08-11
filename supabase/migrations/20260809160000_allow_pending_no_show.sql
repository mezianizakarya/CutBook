-- ============================================================================
-- Barber work session: allow no-show on pending bookings.
--
-- The work session's "Customer didn't arrive" action marks the NEXT booking
-- no_show. New bookings arrive as 'pending' (the barber confirms only when
-- starting service), so gating no_show behind 'confirmed' made the action
-- fail for the common case. This redefines set_booking_status to allow
-- pending -> no_show (additive only; every existing transition is unchanged).
-- ============================================================================

create or replace function public.set_booking_status(p_booking_id bigint, p_status text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     text;
  v_booking public.bookings;
  v_allowed text[];
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_status not in ('confirmed', 'completed', 'no_show') then
    raise exception 'invalid target status';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id
   for update;
  if v_booking is null then
    raise exception 'booking not found';
  end if;

  if not (
    exists (select 1 from public.shop_members
            where id = v_booking.staff_id and profile_id = v_uid and removed_at is null)
    or exists (select 1 from public.shop_members m
               where m.id = v_booking.staff_id
                 and m.shop_id in (select sm.shop_id from public.shop_members sm
                                   where sm.profile_id = v_uid
                                     and sm.member_role in ('owner', 'manager')
                                     and sm.removed_at is null))
    or (select role from public.profiles where id = v_uid) = 'admin'
  ) then
    raise exception 'not authorized to change this booking';
  end if;

  v_allowed := case v_booking.status
    when 'pending' then array['confirmed', 'no_show']
    when 'confirmed' then array['completed', 'no_show']
    else array[]::text[]
  end;
  if not (p_status = any (v_allowed)) then
    raise exception 'invalid transition % -> %', v_booking.status, p_status;
  end if;

  update public.bookings
     set status = p_status
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.set_booking_status(bigint, text) from public;
grant execute on function public.set_booking_status(bigint, text) to authenticated;
