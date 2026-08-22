-- Region-based isolation: indexes + RPC updates.
-- 1. Indexes on shops.country and profiles.country for fast filtering.
-- 2. nearby_shops RPC: add p_country parameter to filter by shop country.
-- 3. admin_search_profiles RPC: add country column + p_country filter.

-- ── Indexes ──────────────────────────────────────────────────────────────

create index if not exists shops_country_idx on public.shops (country)
  where deleted_at is null;

create index if not exists profiles_country_idx on public.profiles (country);

-- ── nearby_shops: add country filter ─────────────────────────────────────

create or replace function public.nearby_shops(
  p_latitude double precision,
  p_longitude double precision,
  p_max_km double precision default 50,
  p_limit integer default 20,
  p_country text default null
)
returns table (
  id          bigint,
  name        text,
  slug        text,
  city        text,
  rating_avg  numeric,
  rating_count integer,
  is_verified boolean,
  logo_url    text,
  latitude    double precision,
  longitude   double precision,
  distance_km double precision,
  services    jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with shop_dist as (
    select
      s.*,
      (
        6371 * 2 * asin(sqrt(
          power(sin(radians(s.latitude - p_latitude) / 2), 2)
          + cos(radians(p_latitude)) * cos(radians(s.latitude))
            * power(sin(radians(s.longitude - p_longitude) / 2), 2)
        ))
      ) as distance_km
    from public.shops s
    where s.status = 'approved'
      and s.is_active
      and s.deleted_at is null
      and s.latitude is not null
      and s.longitude is not null
      and (p_country is null or s.country = p_country)
  )
  select
    sd.id,
    sd.name,
    sd.slug,
    sd.city,
    sd.rating_avg,
    sd.rating_count,
    sd.is_verified,
    sd.logo_url,
    sd.latitude,
    sd.longitude,
    sd.distance_km,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', sv.name,
            'price_cents', sv.price_cents,
            'category', sv.category,
            'is_active', true
          )
          order by sv.price_cents asc
        )
        from public.services sv
        where sv.shop_id = sd.id
          and sv.is_active
      ),
      '[]'::jsonb
    ) as services
  from shop_dist sd
  where sd.distance_km <= p_max_km
  order by sd.distance_km asc
  limit p_limit;
$$;

revoke all on function public.nearby_shops(double precision, double precision, double precision, integer, text) from public;
grant execute on function public.nearby_shops(double precision, double precision, double precision, integer, text) to authenticated;

-- ── admin_search_profiles: add country column + filter ───────────────────

create or replace function public.admin_search_profiles(
  p_query   text,
  p_limit   integer default 50,
  p_offset  integer default 0,
  p_country text default null
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
  is_verified    boolean,
  created_at     timestamptz,
  last_active_at timestamptz,
  country        text
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
           pr.is_verified, pr.created_at, pr.last_active_at, pr.country
      from public.profiles pr
     where (v_q = ''
        or pr.email ilike '%' || v_q || '%'
        or pr.username ilike '%' || v_q || '%'
        or pr.first_name ilike '%' || v_q || '%'
        or pr.last_name ilike '%' || v_q || '%')
       and (p_country is null or pr.country = p_country)
     order by pr.created_at desc
     limit p_limit offset p_offset;
end;
$$;

revoke all on function public.admin_search_profiles(text, integer, integer, text) from public;
grant execute on function public.admin_search_profiles(text, integer, integer, text) to authenticated;
