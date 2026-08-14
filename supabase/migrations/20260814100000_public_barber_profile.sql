-- Public barber profile for customers.
-- `profiles` is RLS-restricted to self/admin only. Customers browsing a shop
-- need a safe, whitelisted view of a barber's professional info. This RPC
-- exposes ONLY display_name/avatar_url (from shop_members, the public-facing
-- snapshot) plus specialty/years_of_experience/bio/city (from profiles), and
-- only for barbers who currently belong to an approved, active shop.

create or replace function public.get_public_barber_profile(p_profile_id text)
returns table (
  profile_id          text,
  display_name        text,
  avatar_url          text,
  specialty           text,
  years_of_experience integer,
  bio                 text,
  city                text,
  shop_names          text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  -- Gate: the profile must be a current barber member of at least one
  -- approved, active, non-deleted shop. Otherwise we return no row.
  select exists (
    select 1
    from public.shop_members sm
    join public.shops s on s.id = sm.shop_id
    where sm.profile_id = p_profile_id
      and sm.member_role = 'barber'
      and sm.removed_at is null
      and s.status = 'approved'
      and s.is_active
      and s.deleted_at is null
  ) into v_ok;

  if not v_ok then
    return;
  end if;

  return query
  select
    pr.id,
    coalesce((
      select smd.display_name
      from public.shop_members smd
      where smd.profile_id = pr.id
        and smd.member_role = 'barber'
        and smd.removed_at is null
      order by smd.joined_at desc
      limit 1
    ), pr.first_name || ' ' || pr.last_name),
    (
      select sma.avatar_url
      from public.shop_members sma
      where sma.profile_id = pr.id
        and sma.member_role = 'barber'
        and sma.removed_at is null
      order by sma.joined_at desc
      limit 1
    ),
    pr.specialty,
    pr.years_of_experience,
    pr.bio,
    pr.city,
    coalesce((
      select array_agg(s.name order by s.name)
      from public.shop_members sms
      join public.shops s on s.id = sms.shop_id
      where sms.profile_id = pr.id
        and sms.member_role = 'barber'
        and sms.removed_at is null
        and s.status = 'approved'
        and s.is_active
        and s.deleted_at is null
    ), '{}'::text[])
  from public.profiles pr
  where pr.id = p_profile_id;
end;
$$;

revoke all on function public.get_public_barber_profile(text) from public;
grant execute on function public.get_public_barber_profile(text) to anon, authenticated;
