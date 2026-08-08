-- ============================================================================
-- booking_customer_details: minimal customer info for staff/owner views.
--
-- `profiles_select_self_or_admin` means barbers and owners cannot SELECT other
-- users' profile rows, so joining `profiles` from a `bookings` query returns
-- nulls. This SECURITY DEFINER RPC exposes exactly the customer fields the
-- barber/owner screens need for bookings they are actually allowed to see
-- (their own bookings, or bookings of shops they own/manage, or any booking
-- for admins). No RLS policy is weakened or bypassed for the caller — access
-- is re-checked per booking inside the function.
-- ============================================================================

create or replace function public.booking_customer_details(p_booking_ids bigint[])
returns table (
  booking_id bigint,
  customer_id text,
  first_name text,
  last_name text,
  avatar_url text,
  email text,
  phone text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          text;
  v_booking_id   bigint;
  v_booking      public.bookings;
  v_is_staff     boolean;
  v_is_staff_lead boolean;
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

    if not (
      v_is_staff
      or v_is_staff_lead
      or (select role from public.profiles where id = v_uid) = 'admin'
    ) then
      continue;
    end if;

    return query
      select v_booking_id as booking_id,
             p.id as customer_id,
             p.first_name,
             p.last_name,
             p.avatar_url,
             p.email,
             p.phone
        from public.profiles p
       where p.id = v_booking.customer_id;
  end loop;

  return;
end;
$$;

grant execute on function public.booking_customer_details(bigint[]) to authenticated;
