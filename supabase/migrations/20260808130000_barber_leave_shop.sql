-- ============================================================================
-- Barber leaves a shop (self-service).
--
-- Soft-removes the caller's active membership (keeps booking history), cancels
-- the barber's open (pending/confirmed) bookings, and audits the action.
-- Owners cannot leave through this RPC; they need an admin to reassign.
-- ============================================================================

create or replace function public.leave_shop(p_member_id bigint)
returns public.shop_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    text;
  v_member public.shop_members;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_member
    from public.shop_members m
   where m.id = p_member_id
     and m.profile_id = v_uid
     and m.removed_at is null
   for update;
  if v_member is null then
    raise exception 'active membership not found';
  end if;
  if v_member.member_role = 'owner' then
    raise exception 'a shop owner cannot leave a shop they own';
  end if;

  update public.bookings
     set status = 'cancelled',
         cancel_reason = 'Barber left the shop',
         cancelled_at = now(),
         cancelled_by_id = v_uid
   where staff_id = v_member.id
     and status in ('pending', 'confirmed');

  update public.shop_members
     set removed_at = now()
   where id = v_member.id
   returning * into v_member;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid, 'shop_membership_left', 'shop_members',
          v_member.id::text, to_jsonb(v_member));

  return v_member;
end;
$$;

revoke all on function public.leave_shop(bigint) from public;
grant execute on function public.leave_shop(bigint) to authenticated;
