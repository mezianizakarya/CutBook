-- Public barber list for the customer Shop Profile.
-- `profiles` is RLS-restricted to self/admin only, and `shop_members` public
-- policy only exposes the public snapshot columns. Customers browsing a shop
-- need a whitelisted view of each barber's professional info (specialty, years
-- of experience) without opening `profiles`. This SECURITY DEFINER RPC exposes
-- ONLY those whitelisted fields, and only for barbers currently employed at the
-- given approved, active, non-deleted shop.

create or replace function public.get_shop_barbers(p_shop_id bigint)
returns table (
  member_id           bigint,
  profile_id          text,
  display_name        text,
  avatar_url          text,
  joined_at           timestamptz,
  specialty           text,
  years_of_experience integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    sm.id,
    sm.profile_id,
    sm.display_name,
    sm.avatar_url,
    sm.joined_at,
    pr.specialty,
    pr.years_of_experience
  from public.shop_members sm
  join public.shops s on s.id = sm.shop_id
  left join public.profiles pr on pr.id = sm.profile_id
  where sm.shop_id = p_shop_id
    and sm.member_role = 'barber'
    and sm.removed_at is null
    and s.status = 'approved'
    and s.is_active
    and s.deleted_at is null
  order by sm.joined_at asc, sm.id asc;
$$;

revoke all on function public.get_shop_barbers(bigint) from public;
grant execute on function public.get_shop_barbers(bigint) to anon, authenticated;
