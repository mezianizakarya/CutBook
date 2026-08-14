-- Nearby shops for the customer home "Nearby barbers" rail.
-- Customers don't get raw row access to all shop data by default, so this RPC
-- returns ONLY the public whitelist (same columns as SHOP_SUMMARY_SELECT) plus a
-- haversine distance from the customer's current coordinates and the shop's
-- active services (cheapest first). Only approved, active, non-deleted shops
-- with coordinates are returned, ordered by distance.

create or replace function public.nearby_shops(
  p_latitude double precision,
  p_longitude double precision,
  p_max_km double precision default 50,
  p_limit integer default 20
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

revoke all on function public.nearby_shops(double precision, double precision, double precision, integer) from public;
grant execute on function public.nearby_shops(double precision, double precision, double precision, integer) to authenticated;
