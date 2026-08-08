-- ============================================================================
-- Admin-only profile search across the whole user base (name/username/email).
--
-- The admin Users screen paginates the first 50 profiles client-side, so an
-- in-memory search can't reach users further down. This RPC lets the admin
-- search server-side. It is SECURITY DEFINER and refuses non-admin callers.
-- ============================================================================

create or replace function public.admin_search_profiles(
  p_query  text,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id             text,
  email          text,
  username       text,
  first_name     text,
  last_name      text,
  avatar_url     text,
  phone          text,
  role           text,
  account_status text,
  created_at     timestamptz,
  last_active_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  v_q   text;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if (select p.role from public.profiles p where p.id = v_uid) <> 'admin' then
    raise exception 'admin only';
  end if;
  if p_limit not between 1 and 200 then
    raise exception 'limit must be between 1 and 200';
  end if;
  if p_offset < 0 then
    raise exception 'offset must be non-negative';
  end if;

  v_q := lower(btrim(p_query));

  return query
    select pr.id, pr.email, pr.username, pr.first_name, pr.last_name,
           pr.avatar_url, pr.phone, pr.role::text, pr.account_status::text,
           pr.created_at, pr.last_active_at
      from public.profiles pr
     where v_q = ''
        or pr.email ilike '%' || v_q || '%'
        or pr.username ilike '%' || v_q || '%'
        or pr.first_name ilike '%' || v_q || '%'
        or pr.last_name ilike '%' || v_q || '%'
     order by pr.created_at desc
     limit p_limit offset p_offset;
end;
$$;

revoke all on function public.admin_search_profiles(text, integer, integer) from public;
grant execute on function public.admin_search_profiles(text, integer, integer) to authenticated;
