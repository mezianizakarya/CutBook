-- ============================================================================
-- CutBook — Initial production schema
-- ============================================================================
-- Identity:    Clerk is the identity provider. profiles.id = Clerk "sub" claim
--              (text, e.g. "user_2abc..."), read from auth.jwt() ->> 'sub'.
--              A Clerk webhook -> Edge Function (service_role) upserts/deletes
--              profile rows; the client never INSERTs or hard-DELETEs profiles.
-- Roles:       profiles.role is the AUTHORITATIVE role used by RLS. Client-side
--              routing still uses Clerk unsafeMetadata.role (convenience only,
--              never trusted for authorization).
-- Statuses:    TEXT + CHECK (not Postgres enums) so new values need no migration.
-- Money:       integer cents (never floats).
-- IDs:         bigint identity (UUIDv4 causes index fragmentation; these IDs are
--              never exposed as public URLs). partitions-ready for high-write
--              tables: bookings, notifications, audit_log.
--
-- Apply:       Supabase Dashboard -> SQL Editor -> run this file, or
--              `supabase db push` once the CLI is set up. Must be the only
--              migration applied to a fresh project (or the first in order).
-- ============================================================================

-- ============================================================================
-- 0. Extensions
-- ============================================================================
create extension if not exists pg_trgm;   -- fuzzy/ILIKE search on shops
create extension if not exists btree_gist; -- allows bigint equality in EXCLUDE

-- Helper functions below reference tables created later in this same migration;
-- defer body validation until the schema exists (single-transaction apply).
set check_function_bodies = off;

-- ============================================================================
-- 1. Private helper schema
-- ============================================================================
create schema if not exists private;

-- Authoritative role of the JWT user (fresh per query, bypasses RLS on
-- purpose: it is only ever read for the caller's OWN profile).
create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role::text
  from public.profiles
  where id = (select auth.jwt() ->> 'sub')
$$;

-- Role of the current user within a given shop (owner/manager/barber/NULL).
create or replace function private.shop_role(p_shop_id bigint)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select member_role::text
  from public.shop_members
  where shop_id = p_shop_id
    and profile_id = (select auth.jwt() ->> 'sub')
    and removed_at is null
$$;

-- Shared updated_at maintenance trigger.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Recomputes shops.rating_avg / rating_count from published reviews.
create or replace function private.refresh_shop_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id bigint := coalesce(new.shop_id, old.shop_id);
begin
  update public.shops
     set rating_avg = stats.avg_rating,
         rating_count = stats.total
    from (
      select coalesce(avg(rating), 0)::numeric(3, 2) as avg_rating,
             count(*)::integer as total
      from public.reviews
      where shop_id = v_shop_id
        and status = 'published'
    ) stats
   where public.shops.id = v_shop_id;
  return null;
end;
$$;

-- Populates review.author_name from the reviewer's profile (not client-supplied).
create or replace function private.set_review_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.author_name := (
    select case
      when first_name is null or first_name = '' then ''
      when last_name is null or last_name = '' then initcap(first_name)
      else initcap(first_name || ' ' || left(last_name, 1) || '.')
    end
    from public.profiles
    where id = new.customer_id
  );
  return new;
end;
$$;

-- Revoke blanket PUBLIC execute on private helpers (defense in depth; RLS
-- policies and trigger context still reach them via the grants below).
revoke all on function private.current_role() from public;
revoke all on function private.shop_role(bigint) from public;
revoke all on function private.refresh_shop_rating() from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.set_review_author() from public;

grant usage on schema private to authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function private.shop_role(bigint) to authenticated;

-- ============================================================================
-- 2. Tables
-- ============================================================================

-- 2.1 profiles ---------------------------------------------------------------
create table public.profiles (
  id                   text primary key,           -- Clerk "sub"
  email                text not null,
  first_name           text not null default '',
  last_name            text not null default '',
  phone                text,
  avatar_url           text,                       -- Supabase Storage path or Clerk URL
  bio                  text,
  city                 text,
  role                 text not null default 'customer'
                       constraint profiles_role_check
                       check (role in ('customer', 'barber', 'owner', 'admin')),
  is_disabled          boolean not null default false,
  onboarding_completed boolean not null default false,
  last_active_at       timestamptz,
  deleted_at           timestamptz,                -- GDPR soft delete / anonymize
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email))
);

-- 2.2 shops ------------------------------------------------------------------
create table public.shops (
  id            bigint generated always as identity primary key,
  name          text not null,
  slug          text not null unique,
  description   text,
  logo_url      text,                              -- -> "shop-logos" bucket
  address_line1 text,
  address_line2 text,
  city          text,
  state         text,
  country       text,
  postal_code   text,
  latitude      double precision,
  longitude     double precision,
  phone         text,
  email         text,
  website       text,
  status        text not null default 'pending'
                constraint shops_status_check
                check (status in ('pending', 'approved', 'suspended')),
  is_verified   boolean not null default false,    -- admin badge
  is_active     boolean not null default true,     -- temporary close / moderation
  rating_avg    numeric(3, 2) not null default 0,  -- trigger-maintained aggregate
  rating_count  integer not null default 0,
  deleted_at    timestamptz,                       -- soft delete
  created_by    text references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint shops_slug_lowercase check (slug = lower(slug)),
  constraint shops_rating_avg_range check (rating_avg between 0 and 5),
  constraint shops_rating_count_nonneg check (rating_count >= 0)
);

-- 2.3 shop_members (staff + ownership) ---------------------------------------
create table public.shop_members (
  id          bigint generated always as identity primary key,
  shop_id     bigint not null references public.shops (id) on delete restrict,
  profile_id  text not null references public.profiles (id) on delete restrict,
  member_role text not null
              constraint shop_members_member_role_check
              check (member_role in ('owner', 'manager', 'barber')),
  -- Public-facing snapshot (decouples the staff listing from private profiles).
  display_name text not null default '',
  avatar_url    text,
  joined_at   timestamptz not null default now(),
  removed_at  timestamptz,                         -- soft delete (keeps booking history)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2.4 services (shop-level catalog) ------------------------------------------
create table public.services (
  id               bigint generated always as identity primary key,
  shop_id          bigint not null references public.shops (id) on delete restrict,
  name             text not null,
  description      text,
  duration_minutes integer not null
                   constraint services_duration_check check (duration_minutes > 0),
  price_cents      integer not null
                   constraint services_price_check check (price_cents >= 0),
  category         text,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2.5 staff_services (which staff perform which services) --------------------
create table public.staff_services (
  id               bigint generated always as identity primary key,
  shop_member_id   bigint not null references public.shop_members (id) on delete cascade,
  service_id       bigint not null references public.services (id) on delete cascade,
  price_cents      integer constraint staff_services_price_check check (price_cents >= 0),
  duration_minutes integer constraint staff_services_duration_check check (duration_minutes > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2.6 bookings ---------------------------------------------------------------
create table public.bookings (
  id                     bigint generated always as identity primary key,
  shop_id                bigint not null references public.shops (id) on delete restrict,
  customer_id            text not null references public.profiles (id) on delete restrict,
  staff_id               bigint not null references public.shop_members (id) on delete restrict,
  service_id             bigint not null references public.services (id) on delete restrict,
  status                 text not null default 'pending'
                         constraint bookings_status_check
                         check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  starts_at              timestamptz not null,
  ends_at                timestamptz not null,
  service_name           text not null,            -- snapshot
  service_price_cents    integer not null          -- snapshot
                         constraint bookings_price_check check (service_price_cents >= 0),
  service_duration_minutes integer not null        -- snapshot
                         constraint bookings_duration_check check (service_duration_minutes > 0),
  note                   text,
  cancel_reason          text,
  cancelled_at           timestamptz,
  cancelled_by_id        text references public.profiles (id) on delete restrict,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint bookings_ends_after_starts check (ends_at > starts_at)
);

-- DB-level double-booking prevention for the same staff member.
-- Partial EXCLUDE ignores cancelled / no-show rows.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status not in ('cancelled', 'no_show'));

-- 2.7 working_hours (shop weekly opening hours) ------------------------------
create table public.working_hours (
  id           bigint generated always as identity primary key,
  shop_id      bigint not null references public.shops (id) on delete cascade,
  day_of_week  smallint not null
               constraint working_hours_day_check check (day_of_week between 0 and 6),
  opens_at     time,
  closes_at    time,
  is_closed    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint working_hours_closes_after_opens
    check (is_closed or (opens_at is not null and closes_at is not null and closes_at > opens_at)),
  constraint working_hours_shop_day_unique unique (shop_id, day_of_week)
);

-- 2.8 availability (per-staff recurring weekly windows) ----------------------
create table public.availability (
  id             bigint generated always as identity primary key,
  shop_member_id bigint not null references public.shop_members (id) on delete cascade,
  day_of_week    smallint not null
                 constraint availability_day_check check (day_of_week between 0 and 6),
  starts_at      time not null,
  ends_at        time not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint availability_ends_after_starts check (ends_at > starts_at),
  constraint availability_member_day_start_unique
    unique (shop_member_id, day_of_week, starts_at)
);

-- 2.9 time_offs (one-off unavailability) -------------------------------------
create table public.time_offs (
  id             bigint generated always as identity primary key,
  shop_member_id bigint not null references public.shop_members (id) on delete cascade,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  reason         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint time_offs_ends_after_starts check (ends_at > starts_at)
);

-- 2.10 favorites --------------------------------------------------------------
create table public.favorites (
  id          bigint generated always as identity primary key,
  customer_id text not null references public.profiles (id) on delete cascade,
  shop_id     bigint not null references public.shops (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint favorites_customer_shop_unique unique (customer_id, shop_id)
);

-- 2.11 reviews ----------------------------------------------------------------
create table public.reviews (
  id             bigint generated always as identity primary key,
  shop_id        bigint not null references public.shops (id) on delete restrict,
  customer_id    text not null references public.profiles (id) on delete restrict,
  booking_id     bigint references public.bookings (id) on delete set null,
  rating         smallint not null
                 constraint reviews_rating_check check (rating between 1 and 5),
  comment        text,
  author_name    text not null default '',          -- public-facing, trigger-set
  owner_response text,
  responded_at   timestamptz,
  status         text not null default 'pending'
                 constraint reviews_status_check
                 check (status in ('pending', 'published', 'hidden', 'removed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reviews_shop_customer_unique unique (shop_id, customer_id)
);

-- 2.12 notifications ----------------------------------------------------------
create table public.notifications (
  id           bigint generated always as identity primary key,
  recipient_id text not null references public.profiles (id) on delete cascade,
  type         text not null,
  title        text not null,
  body         text,
  data         jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- 2.13 push_tokens ------------------------------------------------------------
create table public.push_tokens (
  id           bigint generated always as identity primary key,
  profile_id   text not null references public.profiles (id) on delete cascade,
  platform     text not null
               constraint push_tokens_platform_check
               check (platform in ('ios', 'android', 'web')),
  token        text not null,
  device_name  text,
  last_used_at timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint push_tokens_token_unique unique (token)
);

-- 2.14 shop_gallery -----------------------------------------------------------
create table public.shop_gallery (
  id          bigint generated always as identity primary key,
  shop_id     bigint not null references public.shops (id) on delete cascade,
  object_path text not null,                       -- -> "shop-gallery" bucket
  caption     text,
  is_cover    boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 2.15 portfolio_images -------------------------------------------------------
create table public.portfolio_images (
  id             bigint generated always as identity primary key,
  shop_member_id bigint not null references public.shop_members (id) on delete cascade,
  object_path    text not null,                    -- -> "portfolio" bucket
  caption        text,
  is_cover       boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

-- 2.16 settings ---------------------------------------------------------------
create table public.settings (
  profile_id         text primary key references public.profiles (id) on delete cascade,
  notification_prefs jsonb not null default '{}'::jsonb,
  locale             text not null default 'en',
  marketing_opt_in   boolean not null default true,
  updated_at         timestamptz not null default now()
);

-- 2.17 audit_log (append-only) ------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    text references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  before      jsonb,
  after       jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

-- 2.18 platform_settings ------------------------------------------------------
create table public.platform_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  description text,
  updated_by  text references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================
create index profiles_phone_unique_idx on public.profiles (phone)
  where phone is not null and phone <> '';

create index shops_city_idx on public.shops (city);
create index shops_approved_rating_idx on public.shops (status, rating_avg desc)
  where status = 'approved' and deleted_at is null;
create index shops_name_trgm_idx on public.shops using gin (name gin_trgm_ops);
create index shops_city_trgm_idx on public.shops using gin (city gin_trgm_ops);

create unique index shop_members_active_unique
  on public.shop_members (shop_id, profile_id) where removed_at is null;
create index shop_members_profile_active_idx
  on public.shop_members (profile_id) where removed_at is null;
create index shop_members_shop_role_idx
  on public.shop_members (shop_id, member_role) where removed_at is null;

create unique index services_active_name_unique
  on public.services (shop_id, lower(name)) where is_active;
create index services_shop_active_sort_idx
  on public.services (shop_id, is_active, sort_order);

create unique index staff_services_member_service_unique
  on public.staff_services (shop_member_id, service_id);
create index staff_services_service_idx on public.staff_services (service_id);

create index bookings_customer_starts_idx on public.bookings (customer_id, starts_at desc);
create index bookings_staff_starts_idx on public.bookings (staff_id, starts_at);
create index bookings_shop_status_starts_idx on public.bookings (shop_id, status, starts_at);
create index bookings_status_starts_idx on public.bookings (status, starts_at);

create index time_offs_member_starts_idx on public.time_offs (shop_member_id, starts_at);

create index favorites_shop_idx on public.favorites (shop_id);

create index reviews_shop_status_created_idx
  on public.reviews (shop_id, status, created_at desc);
create index reviews_published_rating_idx
  on public.reviews (rating) where status = 'published';
create index reviews_customer_idx on public.reviews (customer_id);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

create index push_tokens_profile_idx on public.push_tokens (profile_id);

create index shop_gallery_shop_sort_idx on public.shop_gallery (shop_id, sort_order);
create index portfolio_member_sort_idx on public.portfolio_images (shop_member_id, sort_order);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_actor_created_idx on public.audit_log (actor_id, created_at desc);

-- ============================================================================
-- 4. Triggers
-- ============================================================================
create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.shops
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.shop_members
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.services
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.staff_services
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.working_hours
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.availability
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.time_offs
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.reviews
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.push_tokens
  for each row execute function private.set_updated_at();

create trigger refresh_shop_rating after insert or update or delete on public.reviews
  for each row execute function private.refresh_shop_rating();
create trigger set_review_author before insert on public.reviews
  for each row execute function private.set_review_author();

-- ============================================================================
-- 5. Row Level Security
-- ============================================================================
alter table public.profiles         enable row level security;
alter table public.shops            enable row level security;
alter table public.shop_members     enable row level security;
alter table public.services         enable row level security;
alter table public.staff_services   enable row level security;
alter table public.bookings         enable row level security;
alter table public.working_hours    enable row level security;
alter table public.availability     enable row level security;
alter table public.time_offs        enable row level security;
alter table public.favorites        enable row level security;
alter table public.reviews          enable row level security;
alter table public.notifications    enable row level security;
alter table public.push_tokens      enable row level security;
alter table public.shop_gallery     enable row level security;
alter table public.portfolio_images enable row level security;
alter table public.settings         enable row level security;
alter table public.audit_log        enable row level security;
alter table public.platform_settings enable row level security;

-- 5.1 profiles ---------------------------------------------------------------
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.jwt() ->> 'sub')
         or (select private.current_role()) = 'admin');

create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = (select auth.jwt() ->> 'sub')
         or (select private.current_role()) = 'admin')
  with check (id = (select auth.jwt() ->> 'sub')
              or (select private.current_role()) = 'admin');
-- No INSERT/DELETE for clients: profiles are created/deleted by the Clerk
-- webhook (service_role) only.

-- 5.2 shops ------------------------------------------------------------------
create policy "shops_select_public" on public.shops
  for select to anon, authenticated
  using (status = 'approved' and is_active and deleted_at is null);

create policy "shops_select_staff_or_admin" on public.shops
  for select to authenticated
  using ((select private.shop_role(id)) is not null
         or (select private.current_role()) = 'admin');

create policy "shops_update_owner_or_admin" on public.shops
  for update to authenticated
  using ((select private.shop_role(id)) = 'owner'
         or (select private.current_role()) = 'admin')
  with check ((select private.shop_role(id)) = 'owner'
              or (select private.current_role()) = 'admin');
-- INSERT/DELETE: through create_shop() RPC and soft-delete via UPDATE only.

-- 5.3 shop_members -----------------------------------------------------------
create policy "shop_members_select_public_staff" on public.shop_members
  for select to anon, authenticated
  using (removed_at is null and member_role = 'barber');

create policy "shop_members_select_self" on public.shop_members
  for select to authenticated
  using (profile_id = (select auth.jwt() ->> 'sub'));

create policy "shop_members_select_staff_or_admin" on public.shop_members
  for select to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

create policy "shop_members_insert_staff_or_admin" on public.shop_members
  for insert to authenticated
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "shop_members_update_staff_or_admin" on public.shop_members
  for update to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin')
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "shop_members_delete_staff_or_admin" on public.shop_members
  for delete to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

-- 5.4 services ---------------------------------------------------------------
create policy "services_select_public" on public.services
  for select to anon, authenticated
  using (is_active);

create policy "services_select_staff_or_admin" on public.services
  for select to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

create policy "services_insert_staff_or_admin" on public.services
  for insert to authenticated
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "services_update_staff_or_admin" on public.services
  for update to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin')
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "services_delete_staff_or_admin" on public.services
  for delete to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

-- 5.5 staff_services ---------------------------------------------------------
create policy "staff_services_select_public" on public.staff_services
  for select to anon, authenticated
  using (is_active);

create policy "staff_services_select_staff_or_admin" on public.staff_services
  for select to authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_id
      and ((select private.shop_role(s.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

create policy "staff_services_insert_staff_or_admin" on public.staff_services
  for insert to authenticated
  with check (exists (
    select 1 from public.shop_members sm
    where sm.id = shop_member_id
      and ((select private.shop_role(sm.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

create policy "staff_services_update_staff_or_admin" on public.staff_services
  for update to authenticated
  using (exists (
    select 1 from public.shop_members sm
    where sm.id = shop_member_id
      and ((select private.shop_role(sm.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ))
  with check (exists (
    select 1 from public.shop_members sm
    where sm.id = shop_member_id
      and ((select private.shop_role(sm.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

create policy "staff_services_delete_staff_or_admin" on public.staff_services
  for delete to authenticated
  using (exists (
    select 1 from public.shop_members sm
    where sm.id = shop_member_id
      and ((select private.shop_role(sm.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

-- 5.6 bookings ---------------------------------------------------------------
-- Direct writes go through cancel_booking() / set_booking_status() RPCs.
create policy "bookings_select_customer" on public.bookings
  for select to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'));

create policy "bookings_select_staff" on public.bookings
  for select to authenticated
  using (staff_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ));

create policy "bookings_select_staff_or_admin" on public.bookings
  for select to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

create policy "bookings_insert_customer" on public.bookings
  for insert to authenticated
  with check (customer_id = (select auth.jwt() ->> 'sub')
              and status = 'pending');
-- No UPDATE/DELETE policies: state transitions are enforced by the RPCs.

-- 5.7 working_hours ----------------------------------------------------------
create policy "working_hours_select_public" on public.working_hours
  for select to anon, authenticated using (true);

create policy "working_hours_insert_staff_or_admin" on public.working_hours
  for insert to authenticated
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "working_hours_update_staff_or_admin" on public.working_hours
  for update to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin')
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "working_hours_delete_staff_or_admin" on public.working_hours
  for delete to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

-- 5.8 availability -----------------------------------------------------------
create policy "availability_select_member" on public.availability
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

create policy "availability_insert_member" on public.availability
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

create policy "availability_update_member" on public.availability
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

create policy "availability_delete_member" on public.availability
  for delete to authenticated
  using (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or exists (
    select 1 from public.shop_members m
    where m.id = shop_member_id
      and ((select private.shop_role(m.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

-- 5.9 time_offs (same access model as availability) --------------------------
create policy "time_offs_select_member" on public.time_offs
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

create policy "time_offs_insert_member" on public.time_offs
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

create policy "time_offs_update_member" on public.time_offs
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

create policy "time_offs_delete_member" on public.time_offs
  for delete to authenticated
  using (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or exists (
    select 1 from public.shop_members m
    where m.id = shop_member_id
      and ((select private.shop_role(m.shop_id)) in ('owner', 'manager')
           or (select private.current_role()) = 'admin')
  ));

-- 5.10 favorites --------------------------------------------------------------
create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'));

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check (customer_id = (select auth.jwt() ->> 'sub'));

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'));

-- 5.11 reviews ----------------------------------------------------------------
create policy "reviews_select_public" on public.reviews
  for select to anon, authenticated
  using (status = 'published');

create policy "reviews_select_own" on public.reviews
  for select to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'));

create policy "reviews_select_staff_or_admin" on public.reviews
  for select to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (customer_id = (select auth.jwt() ->> 'sub'));

create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'))
  with check (customer_id = (select auth.jwt() ->> 'sub'));

create policy "reviews_delete_own" on public.reviews
  for delete to authenticated
  using (customer_id = (select auth.jwt() ->> 'sub'));
-- owner_response / status / responded_at are only writable via
-- respond_to_review() and admin_set_review_status() RPCs (column grants below).

-- 5.12 notifications ----------------------------------------------------------
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.jwt() ->> 'sub'));

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.jwt() ->> 'sub'))
  with check (recipient_id = (select auth.jwt() ->> 'sub'));

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (recipient_id = (select auth.jwt() ->> 'sub'));
-- INSERT: server-side only (Edge Function / RPCs with service context).

-- 5.13 push_tokens ------------------------------------------------------------
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated
  using (profile_id = (select auth.jwt() ->> 'sub'));

create policy "push_tokens_insert_own" on public.push_tokens
  for insert to authenticated
  with check (profile_id = (select auth.jwt() ->> 'sub'));

create policy "push_tokens_update_own" on public.push_tokens
  for update to authenticated
  using (profile_id = (select auth.jwt() ->> 'sub'))
  with check (profile_id = (select auth.jwt() ->> 'sub'));

create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated
  using (profile_id = (select auth.jwt() ->> 'sub'));

-- 5.14 shop_gallery -----------------------------------------------------------
create policy "shop_gallery_select_public" on public.shop_gallery
  for select to anon, authenticated using (true);

create policy "shop_gallery_insert_staff_or_admin" on public.shop_gallery
  for insert to authenticated
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "shop_gallery_update_staff_or_admin" on public.shop_gallery
  for update to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin')
  with check ((select private.shop_role(shop_id)) in ('owner', 'manager')
              or (select private.current_role()) = 'admin');

create policy "shop_gallery_delete_staff_or_admin" on public.shop_gallery
  for delete to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

-- 5.15 portfolio_images -------------------------------------------------------
create policy "portfolio_select_public" on public.portfolio_images
  for select to anon, authenticated using (true);

create policy "portfolio_insert_self_or_admin" on public.portfolio_images
  for insert to authenticated
  with check (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or (select private.current_role()) = 'admin');

create policy "portfolio_update_self_or_admin" on public.portfolio_images
  for update to authenticated
  using (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or (select private.current_role()) = 'admin')
  with check (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or (select private.current_role()) = 'admin');

create policy "portfolio_delete_self_or_admin" on public.portfolio_images
  for delete to authenticated
  using (shop_member_id in (
    select id from public.shop_members
    where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
  ) or (select private.current_role()) = 'admin');

-- 5.16 settings ---------------------------------------------------------------
create policy "settings_select_own" on public.settings
  for select to authenticated
  using (profile_id = (select auth.jwt() ->> 'sub'));

create policy "settings_insert_own" on public.settings
  for insert to authenticated
  with check (profile_id = (select auth.jwt() ->> 'sub'));

create policy "settings_update_own" on public.settings
  for update to authenticated
  using (profile_id = (select auth.jwt() ->> 'sub'))
  with check (profile_id = (select auth.jwt() ->> 'sub'));

-- 5.17 audit_log --------------------------------------------------------------
create policy "audit_log_select_admin" on public.audit_log
  for select to authenticated
  using ((select private.current_role()) = 'admin');
-- No client INSERT/UPDATE/DELETE: rows are written by the RPCs (definer).

-- 5.18 platform_settings ------------------------------------------------------
create policy "platform_settings_select_admin" on public.platform_settings
  for select to authenticated
  using ((select private.current_role()) = 'admin');

create policy "platform_settings_insert_admin" on public.platform_settings
  for insert to authenticated
  with check ((select private.current_role()) = 'admin');

create policy "platform_settings_update_admin" on public.platform_settings
  for update to authenticated
  using ((select private.current_role()) = 'admin')
  with check ((select private.current_role()) = 'admin');

-- ============================================================================
-- 6. RPCs (guarded, security definer; the only sanctioned write paths)
-- ============================================================================

-- 6.1 complete_onboarding: sets the authoritative role exactly once.
create or replace function public.complete_onboarding(p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if p_role not in ('customer', 'barber', 'owner', 'admin') then
    raise exception 'invalid role';
  end if;
  update public.profiles
     set role = p_role,
         onboarding_completed = true
   where id = (select auth.jwt() ->> 'sub')
     and onboarding_completed = false
   returning * into v_profile;

  if v_profile is null then
    raise exception 'profile not found or onboarding already completed';
  end if;
  return v_profile;
end;
$$;

grant execute on function public.complete_onboarding(text) to authenticated;

-- 6.2 create_shop: creates a shop and the owner's membership atomically.
create or replace function public.create_shop(
  p_name        text,
  p_slug        text,
  p_description text default null,
  p_city        text default null,
  p_state       text default null,
  p_country     text default null,
  p_postal_code text default null,
  p_address_line1 text default null,
  p_address_line2 text default null,
  p_phone       text default null,
  p_email       text default null,
  p_website     text default null,
  p_latitude    double precision default null,
  p_longitude   double precision default null
)
returns public.shops
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  text;
  v_shop public.shops;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if (select role from public.profiles where id = v_uid) <> 'owner' then
    raise exception 'only shop owners can create a shop';
  end if;

  insert into public.shops (
    name, slug, description, city, state, country, postal_code,
    address_line1, address_line2, phone, email, website, latitude,
    longitude, created_by, status
  )
  values (
    p_name, lower(p_slug), p_description, p_city, p_state, p_country,
    p_postal_code, p_address_line1, p_address_line2, p_phone, p_email,
    p_website, p_latitude, p_longitude, v_uid, 'pending'
  )
  returning * into v_shop;

  insert into public.shop_members (shop_id, profile_id, member_role, display_name)
  values (v_shop.id, v_uid, 'owner', p_name);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid, 'shop_created', 'shops', v_shop.id::text, to_jsonb(v_shop));

  return v_shop;
end;
$$;

grant execute on function public.create_shop(text, text, text, text, text, text,
  text, text, text, text, text, text, double precision, double precision)
  to authenticated;

-- 6.3 cancel_booking: customer (self), assigned barber, shop owner/manager, admin.
create or replace function public.cancel_booking(p_booking_id bigint)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     text;
  v_booking public.bookings;
  v_is_staff  boolean;
  v_is_staff_lead boolean;
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
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'booking cannot be cancelled in status %', v_booking.status;
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

  if v_booking.customer_id <> v_uid
     and not v_is_staff
     and not v_is_staff_lead
     and (select role from public.profiles where id = v_uid) <> 'admin' then
    raise exception 'not authorized to cancel this booking';
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by_id = v_uid
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(bigint) to authenticated;

-- 6.4 set_booking_status: staff/owner/manager/admin state transitions.
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
    when 'pending' then array['confirmed']
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

grant execute on function public.set_booking_status(bigint, text) to authenticated;

-- 6.5 respond_to_review: shop owner/manager (or admin) replies publicly.
create or replace function public.respond_to_review(p_review_id bigint, p_response text)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     text;
  v_review  public.reviews;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_response is null or length(p_response) = 0 then
    raise exception 'response cannot be empty';
  end if;

  select * into v_review from public.reviews where id = p_review_id for update;
  if v_review is null then
    raise exception 'review not found';
  end if;
  if (select private.shop_role(v_review.shop_id)) is distinct from 'owner'
     and (select private.shop_role(v_review.shop_id)) is distinct from 'manager'
     and (select private.current_role()) is distinct from 'admin' then
    raise exception 'not authorized to respond to this review';
  end if;

  update public.reviews
     set owner_response = p_response,
         responded_at = now()
   where id = p_review_id
   returning * into v_review;

  return v_review;
end;
$$;

grant execute on function public.respond_to_review(bigint, text) to authenticated;

-- 6.6 admin_set_user_disabled -------------------------------------------------
create or replace function public.admin_set_user_disabled(p_user_id text, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin only';
  end if;
  update public.profiles
     set is_disabled = p_disabled
   where id = p_user_id;
  if not found then
    raise exception 'user not found';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values ((select auth.jwt() ->> 'sub'), 'user_disabled_set', 'profiles', p_user_id,
          jsonb_build_object('is_disabled', p_disabled));
end;
$$;

grant execute on function public.admin_set_user_disabled(text, boolean) to authenticated;

-- 6.7 admin_set_shop_status ---------------------------------------------------
create or replace function public.admin_set_shop_status(p_shop_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('pending', 'approved', 'suspended') then
    raise exception 'invalid shop status';
  end if;
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin only';
  end if;
  update public.shops
     set status = p_status
   where id = p_shop_id;
  if not found then
    raise exception 'shop not found';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values ((select auth.jwt() ->> 'sub'), 'shop_status_set', 'shops', p_shop_id::text,
          jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.admin_set_shop_status(bigint, text) to authenticated;

-- 6.8 admin_set_review_status -------------------------------------------------
create or replace function public.admin_set_review_status(p_review_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('published', 'hidden', 'removed') then
    raise exception 'invalid review status';
  end if;
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin only';
  end if;
  update public.reviews
     set status = p_status
   where id = p_review_id;
  if not found then
    raise exception 'review not found';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values ((select auth.jwt() ->> 'sub'), 'review_status_set', 'reviews', p_review_id::text,
          jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.admin_set_review_status(bigint, text) to authenticated;

-- ============================================================================
-- 7. Grants (RLS is the security boundary; these expose tables to the Data API)
-- ============================================================================
grant usage on schema public to anon, authenticated;

-- profiles: no client INSERT/DELETE; restricted UPDATE columns (role,
-- is_disabled, onboarding_completed, deleted_at are protected).
grant select on public.profiles to anon, authenticated;
grant update (email, first_name, last_name, phone, avatar_url, bio, city)
  on public.profiles to authenticated;

-- Public-read tables (anon can SELECT; authenticated full DML via RLS).
grant select on public.shops to anon;
grant all on public.shops to authenticated;

grant select on public.shop_members to anon;
grant all on public.shop_members to authenticated;

grant select on public.services to anon;
grant all on public.services to authenticated;

grant select on public.staff_services to anon;
grant all on public.staff_services to authenticated;

grant select on public.working_hours to anon;
grant all on public.working_hours to authenticated;

grant select on public.shop_gallery to anon;
grant all on public.shop_gallery to authenticated;

grant select on public.portfolio_images to anon;
grant all on public.portfolio_images to authenticated;

-- reviews: anon and staff see limited columns; status/response columns are
-- write-protected by column grants (see RPCs).
grant select (id, shop_id, rating, comment, author_name, owner_response,
              responded_at, created_at) on public.reviews to anon;
grant select on public.reviews to authenticated;
grant insert (shop_id, customer_id, booking_id, rating, comment)
  on public.reviews to authenticated;
grant update (rating, comment) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

-- Private tables: authenticated only; row access fully governed by RLS.
grant all on public.bookings to authenticated;
grant all on public.availability to authenticated;
grant all on public.time_offs to authenticated;
grant all on public.favorites to authenticated;
grant all on public.notifications to authenticated;
grant all on public.push_tokens to authenticated;
grant all on public.settings to authenticated;
grant all on public.audit_log to authenticated;
grant all on public.platform_settings to authenticated;

-- Identity sequences: PostgREST needs USAGE for RETURNING on generated IDs.
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

-- ============================================================================
-- 8. Storage buckets + object-level policies
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',       'avatars',       true,  5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('shop-logos',    'shop-logos',    true,  5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('shop-gallery',  'shop-gallery',  true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('portfolio',     'portfolio',     true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "media_select_public" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('avatars', 'shop-logos', 'shop-gallery', 'portfolio'));

-- avatars: users write only into their own <profile_id>/ folder.
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

-- shop-logos / shop-gallery: owner/manager of the shop in the <shop_id>/ folder.
create policy "shop_media_insert_staff_or_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('shop-logos', 'shop-gallery')
    and (case
           when (storage.foldername(name))[1] ~ '^[0-9]+$'
           then (storage.foldername(name))[1]::bigint
         end) is not null
    and exists (
      select 1 from public.shop_members m
      where m.shop_id = (case
                           when (storage.foldername(name))[1] ~ '^[0-9]+$'
                           then (storage.foldername(name))[1]::bigint
                         end)
        and m.profile_id = (select auth.jwt() ->> 'sub')
        and m.member_role in ('owner', 'manager')
        and m.removed_at is null
    )
  );
create policy "shop_media_update_staff_or_admin" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('shop-logos', 'shop-gallery')
    and exists (
      select 1 from public.shop_members m
      where m.shop_id = (case
                           when (storage.foldername(name))[1] ~ '^[0-9]+$'
                           then (storage.foldername(name))[1]::bigint
                         end)
        and m.profile_id = (select auth.jwt() ->> 'sub')
        and m.member_role in ('owner', 'manager')
        and m.removed_at is null
    )
  )
  with check (
    bucket_id in ('shop-logos', 'shop-gallery')
    and exists (
      select 1 from public.shop_members m
      where m.shop_id = (case
                           when (storage.foldername(name))[1] ~ '^[0-9]+$'
                           then (storage.foldername(name))[1]::bigint
                         end)
        and m.profile_id = (select auth.jwt() ->> 'sub')
        and m.member_role in ('owner', 'manager')
        and m.removed_at is null
    )
  );
create policy "shop_media_delete_staff_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('shop-logos', 'shop-gallery')
    and exists (
      select 1 from public.shop_members m
      where m.shop_id = (case
                           when (storage.foldername(name))[1] ~ '^[0-9]+$'
                           then (storage.foldername(name))[1]::bigint
                         end)
        and m.profile_id = (select auth.jwt() ->> 'sub')
        and m.member_role in ('owner', 'manager')
        and m.removed_at is null
    )
  );

-- portfolio: the barber writes into their own <shop_member_id>/ folder.
create policy "portfolio_insert_self_or_admin" on storage.objects
  for insert to authenticated
  with check (
    (
      bucket_id = 'portfolio'
      and (case
             when (storage.foldername(name))[1] ~ '^[0-9]+$'
             then (storage.foldername(name))[1]::bigint
           end) in (
        select id from public.shop_members
        where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
      )
    )
    or (select private.current_role()) = 'admin'
  );
create policy "portfolio_update_self_or_admin" on storage.objects
  for update to authenticated
  using (
    (
      bucket_id = 'portfolio'
      and (case
             when (storage.foldername(name))[1] ~ '^[0-9]+$'
             then (storage.foldername(name))[1]::bigint
           end) in (
        select id from public.shop_members
        where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
      )
    )
    or (select private.current_role()) = 'admin'
  )
  with check (
    (
      bucket_id = 'portfolio'
      and (case
             when (storage.foldername(name))[1] ~ '^[0-9]+$'
             then (storage.foldername(name))[1]::bigint
           end) in (
        select id from public.shop_members
        where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
      )
    )
    or (select private.current_role()) = 'admin'
  );
create policy "portfolio_delete_self_or_admin" on storage.objects
  for delete to authenticated
  using (
    (
      bucket_id = 'portfolio'
      and (case
             when (storage.foldername(name))[1] ~ '^[0-9]+$'
             then (storage.foldername(name))[1]::bigint
           end) in (
        select id from public.shop_members
        where profile_id = (select auth.jwt() ->> 'sub') and removed_at is null
      )
    )
    or (select private.current_role()) = 'admin'
  );

-- ============================================================================
-- 9. Realtime (RLS filters which events are delivered)
-- ============================================================================
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.reviews;
