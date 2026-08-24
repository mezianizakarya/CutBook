-- ============================================================================
-- KUTZ — DEV / TEST seed data (repeatable)
--
-- WARNING: This file DELETES all rows from the transactional test tables
-- (bookings, reviews, favorites, services, working_hours, availability,
-- time_offs, staff_services, shop_gallery, portfolio_images, notifications,
-- settings, audit_log) and re-inserts them. It does NOT touch real profiles
-- (the admin, zkrmznbeta customer or the zkrmznusa owner account) or the
-- shops / barber memberships that already exist. It only ADDS:
--   * new fake profiles (user_seed_* — no Clerk account, cannot sign in),
--   * owner memberships (shops 1-2 → zkrmznusa test owner; 3-8 → fake owners),
--   * shop details / logos, services, hours, availability, time offs,
--   * bookings (relative to today, all statuses, no staff double-booking),
--   * reviews, favorites, gallery, portfolio and notifications.
--
-- Run:  npx --yes supabase@latest db query --linked --file supabase/seed.sql
-- ============================================================================

set timezone to 'America/New_York';

-- ----------------------------------------------------------------------------
-- 1. Clear transactional test tables (idempotent, keeps FK order happy)
-- ----------------------------------------------------------------------------
truncate table
  public.bookings,
  public.reviews,
  public.favorites,
  public.availability,
  public.time_offs,
  public.staff_services,
  public.services,
  public.working_hours,
  public.shop_gallery,
  public.portfolio_images,
  public.notifications,
  public.settings,
  public.audit_log,
  public.customer_rewards,
  public.loyalty_visits,
  public.customer_loyalty,
  public.loyalty_milestones,
  public.loyalty_programs
cascade;

-- ----------------------------------------------------------------------------
-- 1b. Shop 1 loyalty program (created BEFORE bookings so the award trigger
--     unlocks milestones while the bookings below are inserted)
-- ----------------------------------------------------------------------------
insert into public.loyalty_programs (shop_id, enabled)
values (1, true)
on conflict (shop_id) do update set enabled = true;

insert into public.loyalty_milestones (
  loyalty_program_id, visit_count, reward_type, reward_title,
  reward_description, reward_value, sort_order
)
select lp.id, m.visit_count, m.reward_type, m.reward_title,
       m.reward_description, m.reward_value, m.sort_order
from public.loyalty_programs lp
cross join (values
  (3,  'percentage_discount', '10% off',      'Save 10% on any service.',        10,  1),
  (5,  'free_service',        'Free haircut', 'A free Classic Haircut on us.',   null, 2),
  (10, 'percentage_discount', '20% off',      'Save 20% on any service.',        20,  3)
) as m(visit_count, reward_type, reward_title, reward_description, reward_value, sort_order)
where lp.shop_id = 1
on conflict (loyalty_program_id, visit_count) do update
  set reward_type        = excluded.reward_type,
      reward_title       = excluded.reward_title,
      reward_description = excluded.reward_description,
      reward_value       = excluded.reward_value,
      sort_order         = excluded.sort_order;

-- ----------------------------------------------------------------------------
-- 2. Fake profiles (user_seed_* — dev only, no Clerk account)
-- ----------------------------------------------------------------------------
insert into public.profiles (
  id, email, first_name, last_name, username, phone, avatar_url, city, role,
  onboarding_completed, created_at, updated_at
)
values
  -- customers
  ('user_seed_10', 'mateo.alvarez@cutbook.test',  'Mateo', 'Alvarez', 'mateoalvarez',  '555-0110', 'https://i.pravatar.cc/150?u=mateoalvarez',  'New York',     'customer', true, now() - interval '40 days', now() - interval '40 days'),
  ('user_seed_11', 'chloe.dubois@cutbook.test',    'Chloe', 'Dubois',   'chloedubois',    '555-0111', 'https://i.pravatar.cc/150?u=chloedubois',    'Los Angeles',  'customer', true, now() - interval '38 days', now() - interval '38 days'),
  ('user_seed_12', 'dario.moretti@cutbook.test',   'Dario', 'Moretti',  'dariomoretti',   '555-0112', 'https://i.pravatar.cc/150?u=dariomoretti',   'Chicago',      'customer', true, now() - interval '35 days', now() - interval '35 days'),
  ('user_seed_13', 'amara.okafor@cutbook.test',    'Amara', 'Okafor',   'amaraokafor',    '555-0113', 'https://i.pravatar.cc/150?u=amaraokafor',    'Denver',       'customer', true, now() - interval '30 days', now() - interval '30 days'),
  ('user_seed_14', 'felix.braun@cutbook.test',     'Felix', 'Braun',    'felixbraun',     '555-0114', 'https://i.pravatar.cc/150?u=felixbraun',     'Portland',     'customer', true, now() - interval '28 days', now() - interval '28 days'),
  ('user_seed_15', 'hana.suzuki@cutbook.test',     'Hana',  'Suzuki',   'hanasuzuki',     '555-0115', 'https://i.pravatar.cc/150?u=hanasuzuki',     'Seattle',      'customer', true, now() - interval '25 days', now() - interval '25 days'),
  -- owners
  ('user_seed_30', 'diego.ramirez@cutbook.test',   'Diego', 'Ramirez',  'diegoramirez',   '555-0130', 'https://i.pravatar.cc/150?u=diegoramirez',   'Chicago',      'owner',    true, now() - interval '120 days', now() - interval '120 days'),
  ('user_seed_31', 'sara.khalil@cutbook.test',     'Sara',  'Khalil',   'sarakhalil',     '555-0131', 'https://i.pravatar.cc/150?u=sarakhalil',     'Portland',     'owner',    true, now() - interval '110 days', now() - interval '110 days'),
  ('user_seed_32', 'ethan.brooks@cutbook.test',    'Ethan', 'Brooks',   'ethanbrooks',    '555-0132', 'https://i.pravatar.cc/150?u=ethanbrooks',    'Seattle',      'owner',    true, now() - interval '100 days', now() - interval '100 days')
on conflict (id) do update
  set email = excluded.email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      avatar_url = excluded.avatar_url,
      city = excluded.city,
      role = excluded.role;

-- ----------------------------------------------------------------------------
-- 3. Shop details, logos, verification (shops already exist)
-- ----------------------------------------------------------------------------
update public.shops s
set description   = d.description,
    logo_url      = d.logo_url,
    address_line1 = d.address_line1,
    city          = d.city,
    state         = d.state,
    postal_code   = d.postal_code,
    phone         = d.phone,
    email         = d.email,
    website       = d.website,
    is_verified   = d.is_verified
from (values
  (1, 'A cozy neighborhood spot known for precise fades and good conversation.',
      'https://picsum.photos/seed/cornercut/400/300',       '221 Mulberry St',     'New York',    'NY', '10012', '555-0101', 'hello@thecornercut.test',     'https://thecornercut.test',     true),
  (2, 'Modern fade specialists in the heart of downtown LA.',
      'https://picsum.photos/seed/fadedistrict/400/300',    '841 S Hill St',       'Los Angeles', 'CA', '90015', '555-0102', 'hello@fadedistrict.test',      'https://fadedistrict.test',      true),
  (3, 'Sharp cuts, straight razors and classic Chicago style since 2015.',
      'https://picsum.photos/seed/chicagoclippers/400/300', '118 W Grand Ave',     'Chicago',     'IL', '60607', '555-0103', 'hello@chicagoclippers.test',   'https://chicagoclippers.test',   true),
  (4, 'A friendly den of barbers in LoDo with walk-ins always welcome.',
      'https://picsum.photos/seed/denverden/400/300',       '1600 Glenarm Pl',     'Denver',      'CO', '80202', '555-0104', 'hello@denverden.test',         'https://denverden.test',         false),
  (5, 'Rain-or-shine barbershop with a relaxed Pacific Northwest vibe.',
      'https://picsum.photos/seed/portlandpride/400/300',   '720 NW 23rd Ave',     'Portland',    'OR', '97205', '555-0105', 'hello@portlandpride.test',     'https://portlandpride.test',     false),
  (6, 'Fades, waves and beach-ready styling under the Miami sun.',
      'https://picsum.photos/seed/miamiwaves/400/300',      '100 Biscayne Blvd',   'Miami',       'FL', '33131', '555-0106', 'hello@miamiwaves.test',        'https://miamiwaves.test',        false),
  (7, 'Downtown Seattle barbering with an eye for detail.',
      'https://picsum.photos/seed/cascadebarber/400/300',   '1521 6th Ave',        'Seattle',     'WA', '98101', '555-0107', 'hello@cascadebarber.test',     'https://cascadebarber.test',     false),
  (8, 'Big beard energy and legendary cuts in the heart of Austin.',
      'https://picsum.photos/seed/lonestarcuts/400/300',    '512 W 6th St',        'Austin',      'TX', '78701', '555-0108', 'hello@lonestarcuts.test',      'https://lonestarcuts.test',      false)
) as d(id, description, logo_url, address_line1, city, state, postal_code, phone, email, website, is_verified)
where s.id = d.id;

-- ----------------------------------------------------------------------------
-- 4. Owner memberships
--    Shops 1-2 -> the real zkrmznusa test owner account (so the owner tabs can
--    be exercised by signing in as zkrmznusa@gmail.com). Shops 3-8 -> fake
--    owner profiles so every shop has an owner.
-- ----------------------------------------------------------------------------
insert into public.shop_members (shop_id, profile_id, member_role, display_name, joined_at)
values
  (1, 'user_3HbfXE21HI9gEEkkyX5qL1fe5dc', 'owner', 'Jdrj Vbn',     now() - interval '90 days'),
  (2, 'user_3HbfXE21HI9gEEkkyX5qL1fe5dc', 'owner', 'Jdrj Vbn',     now() - interval '80 days'),
  (3, 'user_seed_30',                     'owner', 'Diego Ramirez', now() - interval '75 days'),
  (4, 'user_seed_30',                     'owner', 'Diego Ramirez', now() - interval '70 days'),
  (5, 'user_seed_31',                     'owner', 'Sara Khalil',   now() - interval '65 days'),
  (6, 'user_seed_31',                     'owner', 'Sara Khalil',   now() - interval '60 days'),
  (7, 'user_seed_32',                     'owner', 'Ethan Brooks',  now() - interval '55 days'),
  (8, 'user_seed_32',                     'owner', 'Ethan Brooks',  now() - interval '50 days')
on conflict (shop_id, profile_id) where removed_at is null do nothing;

-- ----------------------------------------------------------------------------
-- 5. Barber display names + avatars (public-facing snapshots on shop_members)
--    Fixes the truncated "James Cart" value left by an earlier ad-hoc seed.
-- ----------------------------------------------------------------------------
update public.shop_members
set display_name = case display_name
  when 'James Cart' then 'James Carter'
  else display_name
end,
avatar_url = case display_name
  when 'James Cart'    then 'https://i.pravatar.cc/150?u=jamescarter'
  when 'James Carter'  then 'https://i.pravatar.cc/150?u=jamescarter'
  when 'Rosa Delgado'  then 'https://i.pravatar.cc/150?u=rosadelgado'
  when 'Lena Novak'    then 'https://i.pravatar.cc/150?u=lenanovak'
  when 'Marcus Webb'   then 'https://i.pravatar.cc/150?u=marcuswebb'
  when 'Tomas Berg'    then 'https://i.pravatar.cc/150?u=tomasberg'
  when 'Emma Laurent'  then 'https://i.pravatar.cc/150?u=emmalaurent'
  when 'Mia Andersen'  then 'https://i.pravatar.cc/150?u=miaandersen'
  when 'Omar Haddad'   then 'https://i.pravatar.cc/150?u=omarhaddad'
  when 'Kai Tanaka'    then 'https://i.pravatar.cc/150?u=kaitanaka'
  when 'Nina Petrov'   then 'https://i.pravatar.cc/150?u=ninapetrov'
end
where member_role = 'barber' and removed_at is null and display_name in (
  'James Cart', 'James Carter', 'Rosa Delgado', 'Lena Novak', 'Marcus Webb',
  'Tomas Berg', 'Emma Laurent', 'Mia Andersen', 'Omar Haddad', 'Kai Tanaka',
  'Nina Petrov'
);

-- ----------------------------------------------------------------------------
-- 6. Services (same catalog for every shop)
-- ----------------------------------------------------------------------------
insert into public.services (shop_id, name, description, duration_minutes, price_cents, category, sort_order)
select s.id, svc.name, svc.description, svc.duration_minutes, svc.price_cents, svc.category, svc.sort_order
from public.shops s
cross join (values
  ('Classic Haircut',   'Clean clipper and scissor cut with a hot towel finish.',      30, 3000, 'Cuts',   1),
  ('Fade & Finish',     'Skin, mid or high fade styled the way you like it.',          45, 4000, 'Cuts',   2),
  ('Kids Cut',          'A quick, patient cut for kids 12 and under.',                 25, 2200, 'Cuts',   3),
  ('Beard Trim',        'Shape and detail your beard with a straight-razor finish.',   20, 2000, 'Beard',  4),
  ('Hot Towel Shave',   'Traditional hot towel straight-razor shave.',                 30, 2500, 'Shave',  5),
  ('Wash, Cut & Style', 'Shampoo, precision cut and style with product.',              45, 4500, 'Styling',6)
) as svc(name, description, duration_minutes, price_cents, category, sort_order);

-- ----------------------------------------------------------------------------
-- 7. Working hours (Mon-Sat; Sunday closed)
-- ----------------------------------------------------------------------------
insert into public.working_hours (shop_id, day_of_week, opens_at, closes_at, is_closed)
select s.id, wh.day_of_week, wh.opens_at, wh.closes_at, false
from public.shops s
cross join (values
  (1, '09:00'::time, '18:00'::time),
  (2, '09:00'::time, '18:00'::time),
  (3, '09:00'::time, '18:00'::time),
  (4, '09:00'::time, '18:00'::time),
  (5, '09:00'::time, '19:00'::time),
  (6, '09:00'::time, '18:00'::time)
) as wh(day_of_week, opens_at, closes_at)
union all
select s.id, 0, null, null, true
from public.shops s;

-- ----------------------------------------------------------------------------
-- 8. Availability (per barber, mirrors shop hours; Sat until 16:00)
-- ----------------------------------------------------------------------------
insert into public.availability (shop_member_id, day_of_week, starts_at, ends_at)
select sm.id, av.day_of_week, av.starts_at, av.ends_at
from public.shop_members sm
cross join (values
  (1, '09:00'::time, '18:00'::time),
  (2, '09:00'::time, '18:00'::time),
  (3, '09:00'::time, '18:00'::time),
  (4, '09:00'::time, '18:00'::time),
  (5, '09:00'::time, '16:00'::time)
) as av(day_of_week, starts_at, ends_at)
where sm.member_role = 'barber' and sm.removed_at is null;

-- ----------------------------------------------------------------------------
-- 9. Time off (a few, past + future)
-- ----------------------------------------------------------------------------
insert into public.time_offs (shop_member_id, starts_at, ends_at, reason)
select sm.id,
       date_trunc('day', now()) + interval '3 days' + interval '9 hours',
       date_trunc('day', now()) + interval '3 days' + interval '18 hours',
       'Annual leave'
from public.shop_members sm
where sm.display_name = 'James Carter';

insert into public.time_offs (shop_member_id, starts_at, ends_at, reason)
select sm.id,
       date_trunc('day', now()) + interval '4 days' + interval '9 hours',
       date_trunc('day', now()) + interval '4 days' + interval '14 hours',
       'Family appointment'
from public.shop_members sm
where sm.display_name = 'Omar Haddad';

insert into public.time_offs (shop_member_id, starts_at, ends_at, reason)
select sm.id,
       date_trunc('day', now()) - interval '5 days' + interval '9 hours',
       date_trunc('day', now()) - interval '5 days' + interval '17 hours',
       'Sick day'
from public.shop_members sm
where sm.display_name = 'Rosa Delgado';

-- ----------------------------------------------------------------------------
-- 10. Bookings
--     day_offset: days from today (0 = today, negative = past).
--     start_at: minutes since midnight (NY time). Durations chosen so no staff
--     member ever has overlapping non-cancelled/non-no-show bookings.
-- ----------------------------------------------------------------------------
insert into public.bookings (
  shop_id, customer_id, staff_id, service_id, status, starts_at, ends_at,
  service_name, service_price_cents, service_duration_minutes, note, created_at
)
select
  s.id,
  c.id,
  sm.id,
  svc.id,
  b.status,
  date_trunc('day', now()) + b.day_offset * interval '1 day' + b.start_at * interval '1 minute',
  date_trunc('day', now()) + b.day_offset * interval '1 day' + b.start_at * interval '1 minute' + b.duration * interval '1 minute',
  svc.name,
  svc.price_cents,
  b.duration,
  b.note,
  now() - interval '1 day'
from (values
  -- James Carter (shop 1)
  ('zkrmznbeta@gmail.com',    'James Carter', 'Classic Haircut',   -20, 540,  30, 'completed', 'Quick lunch break cut.'),
  ('zkrmznbeta@gmail.com',    'James Carter', 'Fade & Finish',     -16, 660,  45, 'completed', null),
  ('zkrmznbeta@gmail.com',    'James Carter', 'Classic Haircut',   -12, 600,  30, 'completed', 'Quick lunch break cut.'),
  ('mateo.alvarez@cutbook.test',  'James Carter', 'Fade & Finish',     -6, 840,  45, 'completed', null),
  ('ava.thompson@cutbook.test',   'James Carter', 'Beard Trim',        -2, 660,  20, 'completed', null),
  ('zkrmznbeta@gmail.com',    'James Carter', 'Wash, Cut & Style',  0, 1020, 45, 'confirmed', null),
  ('priya.patel@cutbook.test',    'James Carter', 'Classic Haircut',    1, 600,  30, 'confirmed', null),
  ('chloe.dubois@cutbook.test',   'James Carter', 'Fade & Finish',      2, 780,  45, 'pending',   null),
  ('dario.moretti@cutbook.test',  'James Carter', 'Classic Haircut',    4, 900,  30, 'pending',   null),
  ('amara.okafor@cutbook.test',   'James Carter', 'Hot Towel Shave',    6, 720,  30, 'pending',   null),
  -- Rosa Delgado (shop 1)
  ('felix.braun@cutbook.test',    'Rosa Delgado', 'Classic Haircut',  -9, 540,  30, 'completed', null),
  ('ava.thompson@cutbook.test',   'Rosa Delgado', 'Kids Cut',          -3, 600,  25, 'completed', null),
  ('hana.suzuki@cutbook.test',    'Rosa Delgado', 'Wash, Cut & Style', -1, 900,  45, 'completed', null),
  ('mateo.alvarez@cutbook.test',  'Rosa Delgado', 'Beard Trim',         0, 540,  20, 'confirmed', null),
  ('priya.patel@cutbook.test',    'Rosa Delgado', 'Fade & Finish',      0, 600,  45, 'confirmed', null),
  ('chloe.dubois@cutbook.test',   'Rosa Delgado', 'Classic Haircut',    1, 840,  30, 'confirmed', null),
  ('amara.okafor@cutbook.test',   'Rosa Delgado', 'Kids Cut',           3, 630,  25, 'pending',   null),
  ('felix.braun@cutbook.test',    'Rosa Delgado', 'Beard Trim',         5, 960,  20, 'pending',   null),
  -- Lena Novak (shop 2)
  ('priya.patel@cutbook.test',    'Lena Novak',   'Classic Haircut',  -15, 660,  30, 'completed', null),
  ('mateo.alvarez@cutbook.test',  'Lena Novak',   'Hot Towel Shave',   -7, 600,  30, 'completed', null),
  ('dario.moretti@cutbook.test',  'Lena Novak',   'Fade & Finish',     -1, 780,  45, 'completed', null),
  ('zkrmznbeta@gmail.com',    'Lena Novak',   'Classic Haircut',     1, 660,  30, 'confirmed', null),
  ('hana.suzuki@cutbook.test',    'Lena Novak',   'Wash, Cut & Style',  3, 900,  45, 'pending',   null),
  ('ava.thompson@cutbook.test',   'Lena Novak',   'Beard Trim',         6, 570,  20, 'pending',   null),
  ('felix.braun@cutbook.test',    'Lena Novak',   'Classic Haircut',  -20, 960,  30, 'completed', null),
  ('chloe.dubois@cutbook.test',   'Lena Novak',   'Fade & Finish',     -4, 840,  45, 'completed', null),
  -- Marcus Webb (shop 3)
  ('ava.thompson@cutbook.test',   'Marcus Webb',  'Classic Haircut',  -11, 720,  30, 'completed', null),
  ('dario.moretti@cutbook.test',  'Marcus Webb',  'Fade & Finish',     -5, 900,  45, 'completed', null),
  ('zkrmznbeta@gmail.com',    'Marcus Webb',  'Beard Trim',           0, 720,  20, 'confirmed', null),
  ('priya.patel@cutbook.test',    'Marcus Webb',  'Classic Haircut',    2, 660,  30, 'pending',   null),
  ('mateo.alvarez@cutbook.test',  'Marcus Webb',  'Hot Towel Shave',    5, 840,  30, 'pending',   null),
  ('felix.braun@cutbook.test',    'Marcus Webb',  'Kids Cut',          -18, 600,  25, 'cancelled', 'Sorry, family plans changed.'),
  ('chloe.dubois@cutbook.test',   'Marcus Webb',  'Wash, Cut & Style', -8, 780,  45, 'completed', null),
  -- Tomas Berg (shop 3)
  ('hana.suzuki@cutbook.test',    'Tomas Berg',   'Classic Haircut',  -13, 570,  30, 'completed', null),
  ('felix.braun@cutbook.test',    'Tomas Berg',   'Fade & Finish',     -2, 900,  45, 'completed', null),
  ('ava.thompson@cutbook.test',   'Tomas Berg',   'Hot Towel Shave',    1, 960,  30, 'confirmed', null),
  ('dario.moretti@cutbook.test',  'Tomas Berg',   'Classic Haircut',    4, 600,  30, 'pending',   null),
  ('amara.okafor@cutbook.test',   'Tomas Berg',   'Beard Trim',        -1, 600,  20, 'no_show',   'Missed appointment.'),
  ('amara.okafor@cutbook.test',   'Tomas Berg',   'Beard Trim',         3, 780,  20, 'pending',   null),
  ('priya.patel@cutbook.test',    'Tomas Berg',   'Fade & Finish',     -6, 840,  45, 'cancelled', 'Shop closed due to weather.'),
  -- Emma Laurent (shop 4)
  ('ava.thompson@cutbook.test',   'Emma Laurent', 'Classic Haircut',  -14, 600,  30, 'completed', null),
  ('chloe.dubois@cutbook.test',   'Emma Laurent', 'Wash, Cut & Style', -3, 900,  45, 'completed', null),
  ('mateo.alvarez@cutbook.test',  'Emma Laurent', 'Beard Trim',         1, 720,  20, 'confirmed', null),
  ('priya.patel@cutbook.test',    'Emma Laurent', 'Classic Haircut',    4, 960,  30, 'pending',   null),
  ('zkrmznbeta@gmail.com',    'Emma Laurent', 'Fade & Finish',        0, 840,  45, 'pending',   'New client, please confirm.'),
  ('hana.suzuki@cutbook.test',    'Emma Laurent', 'Hot Towel Shave',   -9, 660,  30, 'completed', null),
  -- Mia Andersen (shop 5)
  ('dario.moretti@cutbook.test',  'Mia Andersen', 'Classic Haircut',  -10, 720,  30, 'completed', null),
  ('felix.braun@cutbook.test',    'Mia Andersen', 'Fade & Finish',     -2, 840,  45, 'completed', null),
  ('ava.thompson@cutbook.test',   'Mia Andersen', 'Beard Trim',         3, 600,  20, 'pending',   null),
  ('mateo.alvarez@cutbook.test',  'Mia Andersen', 'Classic Haircut',    6, 900,  30, 'pending',   null),
  ('chloe.dubois@cutbook.test',   'Mia Andersen', 'Hot Towel Shave',   -5, 660,  30, 'completed', null),
  -- Omar Haddad (shop 6)
  ('priya.patel@cutbook.test',    'Omar Haddad',  'Classic Haircut',  -16, 780,  30, 'completed', null),
  ('zkrmznbeta@gmail.com',    'Omar Haddad',  'Wash, Cut & Style',   -4, 900,  45, 'completed', null),
  ('ava.thompson@cutbook.test',   'Omar Haddad',  'Beard Trim',         2, 660,  20, 'confirmed', null),
  ('felix.braun@cutbook.test',    'Omar Haddad',  'Classic Haircut',    5, 840,  30, 'pending',   null),
  ('hana.suzuki@cutbook.test',    'Omar Haddad',  'Fade & Finish',      0, 960,  45, 'confirmed', null),
  -- Kai Tanaka (shop 7)
  ('mateo.alvarez@cutbook.test',  'Kai Tanaka',   'Classic Haircut',   -8, 540,  30, 'completed', null),
  ('dario.moretti@cutbook.test',  'Kai Tanaka',   'Beard Trim',        -1, 720,  20, 'completed', null),
  ('chloe.dubois@cutbook.test',   'Kai Tanaka',   'Fade & Finish',      2, 780,  45, 'confirmed', null),
  ('priya.patel@cutbook.test',    'Kai Tanaka',   'Hot Towel Shave',    4, 900,  30, 'pending',   null),
  ('amara.okafor@cutbook.test',   'Kai Tanaka',   'Classic Haircut',    0, 600,  30, 'pending',   null),
  -- Nina Petrov (shop 8)
  ('hana.suzuki@cutbook.test',    'Nina Petrov',  'Classic Haircut',  -11, 600,  30, 'completed', null),
  ('ava.thompson@cutbook.test',   'Nina Petrov',  'Wash, Cut & Style', -7, 840,  45, 'completed', null),
  ('dario.moretti@cutbook.test',  'Nina Petrov',  'Beard Trim',         1, 660,  20, 'confirmed', null),
  ('mateo.alvarez@cutbook.test',  'Nina Petrov',  'Fade & Finish',      3, 780,  45, 'pending',   null),
  ('felix.braun@cutbook.test',    'Nina Petrov',  'Classic Haircut',    0, 900,  30, 'confirmed', null),
  ('amara.okafor@cutbook.test',   'Nina Petrov',  'Kids Cut',          -2, 960,  25, 'completed', null)
) as b(customer_email, staff_name, service_name, day_offset, start_at, duration, status, note)
join public.profiles c on c.email = b.customer_email and c.deleted_at is null
join public.shop_members sm on sm.display_name = b.staff_name and sm.removed_at is null
join public.shops s on s.id = sm.shop_id
join public.services svc on svc.shop_id = s.id and lower(svc.name) = lower(b.service_name) and svc.is_active;

-- ----------------------------------------------------------------------------
-- 11. Reviews (linked to a completed/published booking by customer+shop+day)
-- ----------------------------------------------------------------------------
insert into public.reviews (shop_id, customer_id, booking_id, rating, comment, status, created_at)
select
  s.id,
  c.id,
  b.id,
  r.rating,
  r.comment,
  r.status,
  date_trunc('day', now()) + r.day_offset * interval '1 day'
from (values
  ('zkrmznbeta@gmail.com',    'The Corner Cut',     -12, 5, 'Great cut and great vibes. James is the best.',              'published'),
  ('mateo.alvarez@cutbook.test',  'The Corner Cut',     -6, 4, 'Clean fade, exactly what I asked for.',                        'published'),
  ('ava.thompson@cutbook.test',   'The Corner Cut',     -3, 5, 'Rosa is so patient with my kids. We love this shop.',            'published'),
  ('felix.braun@cutbook.test',    'The Corner Cut',     -9, 4, 'Solid classic cut. Walked in, walked out sharp.',                'published'),
  ('hana.suzuki@cutbook.test',    'The Corner Cut',     -1, 5, 'Wash, cut and style came out perfect.',                          'published'),
  ('priya.patel@cutbook.test',    'Fade District',    -15, 4, 'Lena nailed the taper. Will be back.',                           'published'),
  ('mateo.alvarez@cutbook.test',  'Fade District',     -7, 5, 'Best hot towel shave in town.',                                  'published'),
  ('dario.moretti@cutbook.test',  'Fade District',     -1, 4, 'Fade was clean and quick.',                                      'published'),
  ('felix.braun@cutbook.test',    'Fade District',    -20, 3, 'Good cut, a little rushed at the end.',                          'pending'),
  ('chloe.dubois@cutbook.test',   'Fade District',     -4, 5, 'Love the finish work.',                                          'published'),
  ('ava.thompson@cutbook.test',   'Chicago Clippers', -11, 4, 'Marcus took his time. Nice fade.',                               'published'),
  ('dario.moretti@cutbook.test',  'Chicago Clippers',  -5, 5, 'The fade and finish is worth every penny.',                      'published'),
  ('chloe.dubois@cutbook.test',   'Chicago Clippers',  -8, 4, 'Great wash, cut and style combo.',                               'published'),
  ('hana.suzuki@cutbook.test',    'Chicago Clippers', -13, 5, 'Tomas is meticulous. Five stars.',                               'published'),
  ('felix.braun@cutbook.test',    'Chicago Clippers',  -2, 4, 'Really happy with the fade.',                                    'published'),
  ('ava.thompson@cutbook.test',   'Denver Den',       -14, 3, 'Fine cut, parking is rough.',                                    'published'),
  ('chloe.dubois@cutbook.test',   'Denver Den',        -3, 4, 'Emma is lovely and very skilled.',                               'published'),
  ('hana.suzuki@cutbook.test',    'Denver Den',        -9, 4, 'Clean shave, nice people.',                                      'published'),
  ('dario.moretti@cutbook.test',  'Portland Pride',   -10, 4, 'Mia always does a great job.',                                   'published'),
  ('felix.braun@cutbook.test',    'Portland Pride',    -2, 5, 'Best fade I have had in Portland.',                              'published'),
  ('chloe.dubois@cutbook.test',   'Portland Pride',    -5, 4, 'Relaxed shop, great vibe.',                                      'published'),
  ('priya.patel@cutbook.test',    'Miami Waves',      -16, 4, 'Omar is great with classic cuts.',                               'published'),
  ('zkrmznbeta@gmail.com',    'Miami Waves',       -4, 5, 'Amazing wash cut and style. Booked again already.',              'published'),
  ('mateo.alvarez@cutbook.test',  'Cascade Barber Co.', -8, 4, 'Kai gives a clean, consistent cut.',                             'published'),
  ('dario.moretti@cutbook.test',  'Cascade Barber Co.', -1, 5, 'Perfect beard trim.',                                           'published'),
  ('hana.suzuki@cutbook.test',    'Lone Star Cuts',   -11, 4, 'Nina did a lovely job.',                                        'published'),
  ('ava.thompson@cutbook.test',   'Lone Star Cuts',    -7, 4, 'Wash, cut and style was excellent.',                             'published'),
  ('amara.okafor@cutbook.test',   'Lone Star Cuts',    -2, 5, 'Kids cut handled like a pro.',                                   'published')
) as r(customer_email, shop_name, day_offset, rating, comment, status)
join public.profiles c on c.email = r.customer_email and c.deleted_at is null
join public.shops s on lower(s.name) = lower(r.shop_name)
join public.bookings b
  on b.customer_id = c.id
 and b.shop_id = s.id
 and date_trunc('day', b.starts_at) = date_trunc('day', now()) + r.day_offset * interval '1 day';

-- A couple of owner responses so the review threads look alive.
update public.reviews r
set owner_response = 'Thanks Ava! See you at the next appointment.',
    responded_at = now()
from public.profiles p, public.shops s
where p.email = 'ava.thompson@cutbook.test'
  and lower(s.name) = 'the corner cut'
  and r.customer_id = p.id and r.shop_id = s.id;

update public.reviews r
set owner_response = 'Really glad the wash, cut and style hit the spot. See you soon!',
    responded_at = now()
from public.profiles p, public.shops s
where p.email = 'zkrmznbeta@gmail.com'
  and lower(s.name) = 'miami waves'
  and r.customer_id = p.id and r.shop_id = s.id;

-- ----------------------------------------------------------------------------
-- 12. Favorites
-- ----------------------------------------------------------------------------
insert into public.favorites (customer_id, shop_id, created_at)
select c.id, s.id, now() - interval '3 days'
from (values
  ('zkrmznbeta@gmail.com',    'The Corner Cut'),
  ('zkrmznbeta@gmail.com',    'Chicago Clippers'),
  ('zkrmznbeta@gmail.com',    'Portland Pride'),
  ('ava.thompson@cutbook.test',   'The Corner Cut'),
  ('ava.thompson@cutbook.test',   'Fade District'),
  ('priya.patel@cutbook.test',    'Fade District'),
  ('mateo.alvarez@cutbook.test',  'Denver Den'),
  ('chloe.dubois@cutbook.test',   'Lone Star Cuts')
) as f(customer_email, shop_name)
join public.profiles c on c.email = f.customer_email and c.deleted_at is null
join public.shops s on lower(s.name) = lower(f.shop_name)
on conflict (customer_id, shop_id) do nothing;

-- ----------------------------------------------------------------------------
-- 13. Shop gallery + barber portfolio (object_path stores a display URL)
-- ----------------------------------------------------------------------------
insert into public.shop_gallery (shop_id, object_path, caption, is_cover, sort_order)
values
  (1, 'https://picsum.photos/seed/cornercut-g1/800/500', 'The shop floor',    true,  1),
  (1, 'https://picsum.photos/seed/cornercut-g2/800/500', 'Barber chairs',     false, 2),
  (1, 'https://picsum.photos/seed/cornercut-g3/800/500', 'Waiting area',      false, 3),
  (2, 'https://picsum.photos/seed/fadedistrict-g1/800/500', 'Main floor',     true,  1),
  (2, 'https://picsum.photos/seed/fadedistrict-g2/800/500', 'Fade bar',       false, 2),
  (3, 'https://picsum.photos/seed/chicagoclippers-g1/800/500', 'Front desk',   true,  1);

insert into public.portfolio_images (shop_member_id, object_path, caption, is_cover, sort_order)
select sm.id, p.object_path, p.caption, p.is_cover, p.sort_order
from public.shop_members sm
join (values
  ('James Carter', 'https://picsum.photos/seed/james-p1/600/400', 'Skin fade',  true,  1),
  ('James Carter', 'https://picsum.photos/seed/james-p2/600/400', 'Textured crop', false, 2),
  ('Rosa Delgado', 'https://picsum.photos/seed/rosa-p1/600/400',  'Kids cut',   true,  1),
  ('Lena Novak',   'https://picsum.photos/seed/lena-p1/600/400',  'Classic taper', true, 1)
) as p(display_name, object_path, caption, is_cover, sort_order)
on sm.display_name = p.display_name;

-- ----------------------------------------------------------------------------
-- 14. Notifications (for the real test accounts so screens look alive)
-- ----------------------------------------------------------------------------
insert into public.notifications (recipient_id, type, title, body, read_at, created_at)
values
  ('user_3Hb5PvEzQhI0rgNM7EiDek4YO5V', 'booking_created',  'Booking requested',
   'Your appointment at The Corner Cut is pending confirmation.', null, now() - interval '6 hours'),
  ('user_3Hb5PvEzQhI0rgNM7EiDek4YO5V', 'booking_confirmed', 'Booking confirmed',
   'James Carter confirmed your appointment today at 5:00 PM.', null, now() - interval '3 hours'),
  ('user_3Hb5PvEzQhI0rgNM7EiDek4YO5V', 'booking_pending',   'New booking request',
   'Your Fade & Finish at Denver Den is waiting for the shop to confirm.', null, now() - interval '2 hours'),
  ('user_3Hb5PvEzQhI0rgNM7EiDek4YO5V', 'reminder',          'Appointment tomorrow',
   'You have a Classic Haircut with Lena Novak tomorrow at 11:00 AM.', null, now() - interval '1 hour'),
  ('user_3HbfXE21HI9gEEkkyX5qL1fe5dc', 'new_booking',       'New booking request',
   'Mateo Alvarez requested a Fade & Finish at The Corner Cut.', null, now() - interval '4 hours'),
  ('user_3HbfXE21HI9gEEkkyX5qL1fe5dc', 'new_review',        'New review',
   'Ava Thompson left a 5-star review for The Corner Cut.', now() - interval '1 day', now() - interval '1 day'),
  ('user_3HbfXE21HI9gEEkkyX5qL1fe5dc', 'new_booking',       'New booking request',
   'Priya Patel requested a Fade & Finish at Fade District.', null, now() - interval '2 hours');

-- ----------------------------------------------------------------------------
-- 15. Work-session demo — today's queue for the dev barber
--     (Zakarya Meziani, member 54, The Corner Cut). Recreates a realistic
--     serving day so the work-session screen shows every state: one completed
--     earlier (with completed_at, recording an early finish), one in progress
--     with a +5 min extension (running countdown), one upcoming confirmed, and
--     one still pending. Idempotent: clears this member's bookings for today
--     first, so it is safe to run standalone. No-op where the profile is absent.
-- ----------------------------------------------------------------------------
delete from public.bookings
where staff_id = (
        select id from public.shop_members
        where profile_id = 'user_3Hg4ilkuLJiIVhvoQOLpKBDYoCC' and removed_at is null
      )
  and starts_at >= date_trunc('day', now());

insert into public.bookings (
  shop_id, customer_id, staff_id, service_id, status, starts_at, ends_at,
  service_name, service_price_cents, service_duration_minutes, note,
  created_at, started_at, extended_minutes, paused_minutes, completed_at
)
select
  s.id,
  c.id,
  sm.id,
  svc.id,
  b.status,
  date_trunc('day', now()) + b.start_minute * interval '1 minute',
  date_trunc('day', now()) + b.start_minute * interval '1 minute' + b.duration * interval '1 minute',
  svc.name,
  svc.price_cents,
  b.duration,
  b.note,
  now() - interval '2 hours',
  case when b.started_ago_minutes is not null
       then now() - b.started_ago_minutes * interval '1 minute' end,
  b.extended_minutes,
  0,
  case when b.completed_after_minutes is not null
       then now() - b.started_ago_minutes * interval '1 minute'
            + b.completed_after_minutes * interval '1 minute' end
from (values
  -- Completed early: 30 min booked, done in 20 (actual finish recorded).
  ('mateo.alvarez@cutbook.test', 'Classic Haircut', 570, 30, 'completed', 120,  0,  20, 'Morning appointment.'),
  -- In progress: started 22 min ago, +5 min extension -> ~13 min left.
  ('ava.thompson@cutbook.test',  'Hot Towel Shave', 630, 30, 'confirmed',  22,  5, null, null),
  -- Up next, confirmed.
  ('priya.patel@cutbook.test',   'Fade & Finish',   690, 45, 'confirmed', null, 0, null, 'Skin fade, please.'),
  -- Still pending, needs confirmation.
  ('zkrmznbeta@gmail.com',       'Beard Trim',      780, 20, 'pending',   null, 0, null, null)
) as b(customer_email, service_name, start_minute, duration, status,
       started_ago_minutes, extended_minutes, completed_after_minutes, note)
join public.profiles c on c.email = b.customer_email and c.deleted_at is null
join public.shop_members sm
  on sm.profile_id = 'user_3Hg4ilkuLJiIVhvoQOLpKBDYoCC' and sm.removed_at is null
join public.shops s on s.id = sm.shop_id
join public.services svc
  on svc.shop_id = s.id and lower(svc.name) = lower(b.service_name) and svc.is_active;
