-- ============================================================================
-- Region test seed: shops + users across MA, FR, GB, DE
-- Adds multi-region data on top of existing seed (US shops 1-8).
-- Run: npx --yes supabase@latest db query --linked --file supabase/migrations/20260818120000_region_test_seed.sql
-- ============================================================================

-- ── 1. Set country on existing US shops ──────────────────────────────────

update public.shops set country = 'US' where country is null;

-- ── 2. Set country on existing profiles ──────────────────────────────────

update public.profiles set country = 'US'
where country is null
  and id not like 'user_seed_%';

-- ── 3. Profiles: owners for new shops ────────────────────────────────────

insert into public.profiles (id, email, first_name, last_name, username, phone, avatar_url, city, role, country, onboarding_completed, created_at, updated_at)
values
  ('user_seed_40', 'youssef.benali@cutbook.test',   'Youssef', 'Benali',    'youssefbenali',   '+212-600-0040', 'https://i.pravatar.cc/150?u=youssefbenali',   'Casablanca', 'owner', 'MA', true, now() - interval '200 days', now() - interval '200 days'),
  ('user_seed_41', 'fatima.elalaoui@cutbook.test',   'Fatima',  'Elalaoui',  'fatimaelalaoui',  '+212-600-0041', 'https://i.pravatar.cc/150?u=fatimaelalaoui',   'Rabat',      'owner', 'MA', true, now() - interval '190 days', now() - interval '190 days'),
  ('user_seed_42', 'jean.dupont@cutbook.test',       'Jean',    'Dupont',    'jeandupont',      '+33-600-0042',  'https://i.pravatar.cc/150?u=jeandupont',       'Paris',       'owner', 'FR', true, now() - interval '180 days', now() - interval '180 days'),
  ('user_seed_43', 'marie.leroy@cutbook.test',       'Marie',   'Leroy',     'mariealeroy',     '+33-600-0043',  'https://i.pravatar.cc/150?u=mariealeroy',       'Marseille',   'owner', 'FR', true, now() - interval '170 days', now() - interval '170 days'),
  ('user_seed_44', 'james.wilson@cutbook.test',      'James',   'Wilson',    'jameswilson',     '+44-700-0044',  'https://i.pravatar.cc/150?u=jameswilson',       'London',      'owner', 'GB', true, now() - interval '160 days', now() - interval '160 days'),
  ('user_seed_45', 'isla.macdonald@cutbook.test',    'Isla',    'MacDonald', 'islamacdonald',   '+44-700-0045',  'https://i.pravatar.cc/150?u=islamacdonald',     'Edinburgh',   'owner', 'GB', true, now() - interval '150 days', now() - interval '150 days'),
  ('user_seed_46', 'hans.mueller@cutbook.test',      'Hans',    'Mueller',   'hansmueller',     '+49-170-0046',  'https://i.pravatar.cc/150?u=hansmueller',       'Berlin',      'owner', 'DE', true, now() - interval '140 days', now() - interval '140 days')
on conflict (id) do update set email = excluded.email, first_name = excluded.first_name, last_name = excluded.last_name;

-- ── 4. Profiles: barbers for new shops ───────────────────────────────────

insert into public.profiles (id, email, first_name, last_name, username, phone, avatar_url, city, role, country, onboarding_completed, created_at, updated_at)
values
  ('user_seed_50', 'ahmed.bensaid@cutbook.test',    'Ahmed',   'Bensaid',   'ahmedbensaid',   '+212-600-0050', 'https://i.pravatar.cc/150?u=ahmedbensaid',   'Casablanca', 'barber', 'MA', true, now() - interval '160 days', now() - interval '160 days'),
  ('user_seed_51', 'karim.idrissi@cutbook.test',    'Karim',   'Idrissi',   'karimidrissi',   '+212-600-0051', 'https://i.pravatar.cc/150?u=karimidrissi',   'Marrakech',  'barber', 'MA', true, now() - interval '155 days', now() - interval '155 days'),
  ('user_seed_52', 'hassan.tazi@cutbook.test',      'Hassan',  'Tazi',      'hassantazi',     '+212-600-0052', 'https://i.pravatar.cc/150?u=hassantazi',     'Rabat',      'barber', 'MA', true, now() - interval '150 days', now() - interval '150 days'),
  ('user_seed_53', 'youssef.amrani@cutbook.test',   'Youssef', 'Amrani',    'youssefamrani',  '+212-600-0053', 'https://i.pravatar.cc/150?u=youssefamrani',  'Tangier',    'barber', 'MA', true, now() - interval '145 days', now() - interval '145 days'),
  ('user_seed_54', 'lucas.martin@cutbook.test',     'Lucas',   'Martin',    'lucasmartin',    '+33-600-0054',  'https://i.pravatar.cc/150?u=lucasmartin',    'Paris',      'barber', 'FR', true, now() - interval '140 days', now() - interval '140 days'),
  ('user_seed_55', 'camille.durand@cutbook.test',   'Camille', 'Durand',    'camilledurand',  '+33-600-0055',  'https://i.pravatar.cc/150?u=camilledurand',  'Lyon',       'barber', 'FR', true, now() - interval '135 days', now() - interval '135 days'),
  ('user_seed_56', 'antoine.rossi@cutbook.test',    'Antoine', 'Rossi',     'antoinerossi',   '+33-600-0056',  'https://i.pravatar.cc/150?u=antoinerossi',   'Marseille',  'barber', 'FR', true, now() - interval '130 days', now() - interval '130 days'),
  ('user_seed_57', 'oliver.smith@cutbook.test',     'Oliver',  'Smith',     'oliversmith',    '+44-700-0057',  'https://i.pravatar.cc/150?u=oliversmith',    'London',     'barber', 'GB', true, now() - interval '125 days', now() - interval '125 days'),
  ('user_seed_58', 'noah.jones@cutbook.test',       'Noah',    'Jones',     'noahjones',      '+44-700-0058',  'https://i.pravatar.cc/150?u=noahjones',      'Manchester', 'barber', 'GB', true, now() - interval '120 days', now() - interval '120 days'),
  ('user_seed_59', 'eva.brown@cutbook.test',        'Eva',     'Brown',     'evabrown',       '+44-700-0059',  'https://i.pravatar.cc/150?u=evabrown',       'Edinburgh',  'barber', 'GB', true, now() - interval '115 days', now() - interval '115 days'),
  ('user_seed_60', 'lukas.schmidt@cutbook.test',    'Lukas',   'Schmidt',   'lukasschmidt',   '+49-170-0060',  'https://i.pravatar.cc/150?u=lukasschmidt',   'Berlin',     'barber', 'DE', true, now() - interval '110 days', now() - interval '110 days'),
  ('user_seed_61', 'anna.weber@cutbook.test',       'Anna',    'Weber',     'annaweber',      '+49-170-0061',  'https://i.pravatar.cc/150?u=annaweber',      'Munich',     'barber', 'DE', true, now() - interval '105 days', now() - interval '105 days')
on conflict (id) do update set email = excluded.email, first_name = excluded.first_name, last_name = excluded.last_name;

-- ── 5. Profiles: customers per region ────────────────────────────────────

insert into public.profiles (id, email, first_name, last_name, username, phone, avatar_url, city, role, country, onboarding_completed, created_at, updated_at)
values
  ('user_seed_70', 'sara.alami@cutbook.test',       'Sara',    'Alami',     'saraalami',     '+212-600-0070', 'https://i.pravatar.cc/150?u=saraalami',     'Casablanca', 'customer', 'MA', true, now() - interval '100 days', now() - interval '100 days'),
  ('user_seed_71', 'omar.benjelloun@cutbook.test',  'Omar',    'Benjelloun','omarbenjelloun','+212-600-0071', 'https://i.pravatar.cc/150?u=omarbenjelloun', 'Marrakech',  'customer', 'MA', true, now() - interval '95 days',  now() - interval '95 days'),
  ('user_seed_72', 'nadia.fassi@cutbook.test',      'Nadia',   'Fassi',    'nadiafassi',    '+212-600-0072', 'https://i.pravatar.cc/150?u=nadiafassi',    'Rabat',      'customer', 'MA', true, now() - interval '90 days',  now() - interval '90 days'),
  ('user_seed_73', 'rachid.berrada@cutbook.test',   'Rachid',  'Berrada',  'rachidberrada', '+212-600-0073', 'https://i.pravatar.cc/150?u=rachidberrada', 'Tangier',    'customer', 'MA', true, now() - interval '85 days',  now() - interval '85 days'),
  ('user_seed_74', 'pierre.martin@cutbook.test',    'Pierre',  'Martin',   'pierremartin',  '+33-600-0074',  'https://i.pravatar.cc/150?u=pierremartin',  'Paris',      'customer', 'FR', true, now() - interval '80 days',  now() - interval '80 days'),
  ('user_seed_75', 'sophie.bernard@cutbook.test',   'Sophie',  'Bernard',  'sophiebernard', '+33-600-0075',  'https://i.pravatar.cc/150?u=sophiebernard', 'Lyon',       'customer', 'FR', true, now() - interval '75 days',  now() - interval '75 days'),
  ('user_seed_76', 'louis.petit@cutbook.test',      'Louis',   'Petit',   'louischpetit',  '+33-600-0076',  'https://i.pravatar.cc/150?u=louischpetit',  'Marseille',  'customer', 'FR', true, now() - interval '70 days',  now() - interval '70 days'),
  ('user_seed_77', 'george.davies@cutbook.test',    'George',  'Davies',  'georgedavies',  '+44-700-0077',  'https://i.pravatar.cc/150?u=georgedavies',  'London',     'customer', 'GB', true, now() - interval '65 days',  now() - interval '65 days'),
  ('user_seed_78', 'emily.evans@cutbook.test',      'Emily',   'Evans',   'emilyevans',    '+44-700-0078',  'https://i.pravatar.cc/150?u=emilyevans',    'Manchester', 'customer', 'GB', true, now() - interval '60 days',  now() - interval '60 days'),
  ('user_seed_79', 'finlay.clark@cutbook.test',     'Finlay',  'Clark',   'finlayclark',   '+44-700-0079',  'https://i.pravatar.cc/150?u=finlayclark',   'Edinburgh',  'customer', 'GB', true, now() - interval '55 days',  now() - interval '55 days'),
  ('user_seed_80', 'max.hoffmann@cutbook.test',     'Max',     'Hoffmann', 'maxhoffmann',   '+49-170-0080',  'https://i.pravatar.cc/150?u=maxhoffmann',   'Berlin',     'customer', 'DE', true, now() - interval '50 days',  now() - interval '50 days'),
  ('user_seed_81', 'lisa.wagner@cutbook.test',      'Lisa',    'Wagner',  'lisawagner',    '+49-170-0081',  'https://i.pravatar.cc/150?u=lisawagner',    'Munich',     'customer', 'DE', true, now() - interval '45 days',  now() - interval '45 days')
on conflict (id) do update set email = excluded.email, first_name = excluded.first_name, last_name = excluded.last_name;

-- ── 6. Shops across regions (no explicit id — GENERATED ALWAYS) ─────────

insert into public.shops (name, slug, description, status, is_active, is_verified, created_by, country, city, address_line1, phone, email, logo_url)
values
  ('Casablanca Cuts',     'casablanca-cuts',     'Premium fades in the heart of Casablanca.',       'approved', true, true,  'user_seed_40', 'MA', 'Casablanca', '12 Blvd Mohammed V',   '+212-555-0101', 'hello@casablanca-cuts.test',    'https://picsum.photos/seed/casablancacuts/400/300'),
  ('Marrakech Barbers',   'marrakech-barbers',   'Traditional Moroccan barbering meets modern style.', 'approved', true, false, 'user_seed_40', 'MA', 'Marrakech',  '45 Rue Yves Saint Laurent', '+212-555-0102', 'hello@marrakech-barbers.test',  'https://picsum.photos/seed/marrakechbarbers/400/300'),
  ('Rabat Razor',         'rabat-razor',         'Sharp cuts and straight razors in Rabat.',         'approved', true, false, 'user_seed_41', 'MA', 'Rabat',      '8 Ave Hassan II',        '+212-555-0103', 'hello@rabat-razor.test',        'https://picsum.photos/seed/rabatrazor/400/300'),
  ('Tangier Trim',        'tangier-trim',        'Walk-ins welcome in the Medina area.',             'approved', true, false, 'user_seed_41', 'MA', 'Tangier',    '22 Rue de la Kasbah',    '+212-555-0104', 'hello@tangier-trim.test',       'https://picsum.photos/seed/tangiertrim/400/300'),
  ('Le Chic Parisien',    'le-chic-parisien',    'High-end barbering in Le Marais.',                 'approved', true, true,  'user_seed_42', 'FR', 'Paris',      '34 Rue de Rivoli',       '+33-1-555-0201', 'hello@lechicparisien.test',     'https://picsum.photos/seed/lechicparisien/400/300'),
  ('Lyon Cuts',           'lyon-cuts',           'Fresh fades in the Presquile.',                    'approved', true, false, 'user_seed_42', 'FR', 'Lyon',       '15 Rue de la Republique','+33-4-555-0202', 'hello@lyoncuts.test',           'https://picsum.photos/seed/lyoncuts/400/300'),
  ('Marseille Style',     'marseille-style',     'Beach-ready cuts by the port.',                    'approved', true, false, 'user_seed_43', 'FR', 'Marseille',  '7 Quai du Port',         '+33-4-555-0203', 'hello@marseillestyle.test',     'https://picsum.photos/seed/marseillestyle/400/300'),
  ('London Blade',        'london-blade',        'Classic British barbering in Soho.',               'approved', true, true,  'user_seed_44', 'GB', 'London',     '19 Brewer St',           '+44-20-555-0301', 'hello@londonblade.test',        'https://picsum.photos/seed/londonblade/400/300'),
  ('Manchester Fade',     'manchester-fade',     'Skin fades and beard trims in Northern Quarter.',  'approved', true, false, 'user_seed_44', 'GB', 'Manchester', '52 Oldham St',           '+44-161-555-0302', 'hello@manchesterfade.test',     'https://picsum.photos/seed/manchesterfade/400/300'),
  ('Edinburgh Edge',      'edinburgh-edge',      'Precision cuts on the Royal Mile.',                'approved', true, false, 'user_seed_45', 'GB', 'Edinburgh',  '87 High St',             '+44-131-555-0303', 'hello@edinburghedge.test',      'https://picsum.photos/seed/edinburghedge/400/300'),
  ('Berlin Buzz',         'berlin-buzz',         'Minimalist cuts in Kreuzberg.',                    'approved', true, false, 'user_seed_46', 'DE', 'Berlin',     '42 Oranienstr',          '+49-30-555-0401', 'hello@berlinbuzz.test',         'https://picsum.photos/seed/berlinbuzz/400/300'),
  ('Munich Mane',         'munich-mane',         'Bavarian precision grooming.',                     'approved', true, false, 'user_seed_46', 'DE', 'Munich',     '11 Marienplatz',         '+49-89-555-0402', 'hello@munichmane.test',         'https://picsum.photos/seed/munichmane/400/300')
on conflict (slug) do nothing;

-- ── 7. Owner memberships (lookup shop_id by slug) ───────────────────────

insert into public.shop_members (shop_id, profile_id, member_role, display_name, joined_at)
select s.id, m.profile_id, 'owner', m.display_name, m.joined_at
from (values
  ('casablanca-cuts',   'user_seed_40', 'Youssef Benali',   now() - interval '180 days'),
  ('marrakech-barbers', 'user_seed_40', 'Youssef Benali',   now() - interval '175 days'),
  ('rabat-razor',       'user_seed_41', 'Fatima Elalaoui',  now() - interval '170 days'),
  ('tangier-trim',      'user_seed_41', 'Fatima Elalaoui',  now() - interval '165 days'),
  ('le-chic-parisien',  'user_seed_42', 'Jean Dupont',      now() - interval '160 days'),
  ('lyon-cuts',         'user_seed_42', 'Jean Dupont',      now() - interval '155 days'),
  ('marseille-style',   'user_seed_43', 'Marie Leroy',      now() - interval '150 days'),
  ('london-blade',      'user_seed_44', 'James Wilson',     now() - interval '145 days'),
  ('manchester-fade',   'user_seed_44', 'James Wilson',     now() - interval '140 days'),
  ('edinburgh-edge',    'user_seed_45', 'Isla MacDonald',   now() - interval '135 days'),
  ('berlin-buzz',       'user_seed_46', 'Hans Mueller',     now() - interval '130 days'),
  ('munich-mane',       'user_seed_46', 'Hans Mueller',     now() - interval '125 days')
) as m(slug, profile_id, display_name, joined_at)
join public.shops s on s.slug = m.slug
on conflict (shop_id, profile_id) where removed_at is null do nothing;

-- ── 8. Barber memberships (lookup shop_id by slug) ──────────────────────

insert into public.shop_members (shop_id, profile_id, member_role, display_name, avatar_url, joined_at)
select s.id, m.profile_id, 'barber', m.display_name, m.avatar_url, m.joined_at
from (values
  ('casablanca-cuts',   'user_seed_50', 'Ahmed Bensaid',   'https://i.pravatar.cc/150?u=ahmedbensaid',   now() - interval '150 days'),
  ('marrakech-barbers', 'user_seed_51', 'Karim Idrissi',   'https://i.pravatar.cc/150?u=karimidrissi',   now() - interval '145 days'),
  ('rabat-razor',       'user_seed_52', 'Hassan Tazi',     'https://i.pravatar.cc/150?u=hassantazi',     now() - interval '140 days'),
  ('tangier-trim',      'user_seed_53', 'Youssef Amrani',  'https://i.pravatar.cc/150?u=youssefamrani',  now() - interval '135 days'),
  ('le-chic-parisien',  'user_seed_54', 'Lucas Martin',    'https://i.pravatar.cc/150?u=lucasmartin',    now() - interval '130 days'),
  ('lyon-cuts',         'user_seed_55', 'Camille Durand',  'https://i.pravatar.cc/150?u=camilledurand',  now() - interval '125 days'),
  ('marseille-style',   'user_seed_56', 'Antoine Rossi',   'https://i.pravatar.cc/150?u=antoinerossi',   now() - interval '120 days'),
  ('london-blade',      'user_seed_57', 'Oliver Smith',    'https://i.pravatar.cc/150?u=oliversmith',    now() - interval '115 days'),
  ('manchester-fade',   'user_seed_58', 'Noah Jones',      'https://i.pravatar.cc/150?u=noahjones',      now() - interval '110 days'),
  ('edinburgh-edge',    'user_seed_59', 'Eva Brown',       'https://i.pravatar.cc/150?u=evabrown',       now() - interval '105 days'),
  ('berlin-buzz',       'user_seed_60', 'Lukas Schmidt',   'https://i.pravatar.cc/150?u=lukasschmidt',   now() - interval '100 days'),
  ('munich-mane',       'user_seed_61', 'Anna Weber',      'https://i.pravatar.cc/150?u=annaweber',      now() - interval '95 days')
) as m(slug, profile_id, display_name, avatar_url, joined_at)
join public.shops s on s.slug = m.slug
on conflict (shop_id, profile_id) where removed_at is null do nothing;

-- ── 9. Services for new shops ────────────────────────────────────────────

insert into public.services (shop_id, name, description, duration_minutes, price_cents, category, sort_order)
select s.id, svc.name, svc.description, svc.duration_minutes, svc.price_cents, svc.category, svc.sort_order
from public.shops s
cross join (values
  ('Classic Haircut',   'Clean clipper and scissor cut.',                 30, 2500, 'Cuts',   1),
  ('Fade & Finish',     'Skin, mid or high fade styled for you.',         45, 3500, 'Cuts',   2),
  ('Kids Cut',          'Patient cut for kids 12 and under.',             25, 1800, 'Cuts',   3),
  ('Beard Trim',        'Shape and detail with straight-razor finish.',   20, 1500, 'Beard',  4),
  ('Hot Towel Shave',   'Traditional hot towel straight-razor shave.',    30, 2000, 'Shave',  5),
  ('Wash, Cut & Style', 'Shampoo, precision cut and style.',              45, 4000, 'Styling',6)
) as svc(name, description, duration_minutes, price_cents, category, sort_order)
where s.slug in (
  'casablanca-cuts','marrakech-barbers','rabat-razor','tangier-trim',
  'le-chic-parisien','lyon-cuts','marseille-style',
  'london-blade','manchester-fade','edinburgh-edge',
  'berlin-buzz','munich-mane'
);

-- ── 10. Working hours for new shops (Mon-Sat 09:00-18:00, Sun closed) ──

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
where s.slug in (
  'casablanca-cuts','marrakech-barbers','rabat-razor','tangier-trim',
  'le-chic-parisien','lyon-cuts','marseille-style',
  'london-blade','manchester-fade','edinburgh-edge',
  'berlin-buzz','munich-mane'
)
union all
select s.id, 0, null, null, true
from public.shops s
where s.slug in (
  'casablanca-cuts','marrakech-barbers','rabat-razor','tangier-trim',
  'le-chic-parisien','lyon-cuts','marseille-style',
  'london-blade','manchester-fade','edinburgh-edge',
  'berlin-buzz','munich-mane'
);

-- ── 11. Bookings across regions ──────────────────────────────────────────

insert into public.bookings (
  shop_id, customer_id, staff_id, service_id, status, starts_at, ends_at,
  service_name, service_price_cents, service_duration_minutes, note, created_at
)
select
  s.id, c.id, sm.id, svc.id,
  b.status,
  date_trunc('day', now()) + b.day_offset * interval '1 day' + b.start_at * interval '1 minute',
  date_trunc('day', now()) + b.day_offset * interval '1 day' + b.start_at * interval '1 minute' + b.duration * interval '1 minute',
  svc.name, svc.price_cents, b.duration, b.note,
  now() - interval '1 day'
from (values
  -- Morocco: Ahmed Bensaid (casablanca-cuts)
  ('sara.alami@cutbook.test',      'Ahmed Bensaid', 'casablanca-cuts',   'Classic Haircut',   -10, 540,  30, 'completed', null),
  ('omar.benjelloun@cutbook.test', 'Ahmed Bensaid', 'casablanca-cuts',   'Fade & Finish',     -5,  660,  45, 'completed', null),
  ('nadia.fassi@cutbook.test',     'Ahmed Bensaid', 'casablanca-cuts',   'Beard Trim',         0,  540,  20, 'confirmed', null),
  ('rachid.berrada@cutbook.test',  'Ahmed Bensaid', 'casablanca-cuts',   'Classic Haircut',    2,  720,  30, 'pending',   null),
  ('sara.alami@cutbook.test',      'Ahmed Bensaid', 'casablanca-cuts',   'Hot Towel Shave',    4,  600,  30, 'pending',   null),
  -- Morocco: Karim Idrissi (marrakech-barbers)
  ('omar.benjelloun@cutbook.test', 'Karim Idrissi', 'marrakech-barbers', 'Classic Haircut',   -8,  540,  30, 'completed', null),
  ('nadia.fassi@cutbook.test',     'Karim Idrissi', 'marrakech-barbers', 'Wash, Cut & Style', -3,  900,  45, 'completed', null),
  ('sara.alami@cutbook.test',      'Karim Idrissi', 'marrakech-barbers', 'Fade & Finish',      1,  660,  45, 'confirmed', null),
  ('rachid.berrada@cutbook.test',  'Karim Idrissi', 'marrakech-barbers', 'Kids Cut',           3,  630,  25, 'pending',   null),
  -- Morocco: Hassan Tazi (rabat-razor)
  ('nadia.fassi@cutbook.test',     'Hassan Tazi',   'rabat-razor',       'Classic Haircut',  -12,  600,  30, 'completed', null),
  ('sara.alami@cutbook.test',      'Hassan Tazi',   'rabat-razor',       'Beard Trim',        -4,  540,  20, 'completed', null),
  ('omar.benjelloun@cutbook.test', 'Hassan Tazi',   'rabat-razor',       'Fade & Finish',      0,  780,  45, 'confirmed', null),
  ('rachid.berrada@cutbook.test',  'Hassan Tazi',   'rabat-razor',       'Classic Haircut',    5,  900,  30, 'pending',   null),
  -- Morocco: Youssef Amrani (tangier-trim)
  ('sara.alami@cutbook.test',      'Youssef Amrani','tangier-trim',      'Classic Haircut',   -7,  540,  30, 'completed', null),
  ('rachid.berrada@cutbook.test',  'Youssef Amrani','tangier-trim',      'Hot Towel Shave',   -2,  660,  30, 'completed', null),
  ('omar.benjelloun@cutbook.test', 'Youssef Amrani','tangier-trim',      'Beard Trim',         2,  600,  20, 'pending',   null),
  -- France: Lucas Martin (le-chic-parisien)
  ('pierre.martin@cutbook.test',   'Lucas Martin',  'le-chic-parisien',  'Classic Haircut',   -9,  540,  30, 'completed', null),
  ('sophie.bernard@cutbook.test',  'Lucas Martin',  'le-chic-parisien',  'Fade & Finish',     -4,  660,  45, 'completed', null),
  ('louis.petit@cutbook.test',     'Lucas Martin',  'le-chic-parisien',  'Wash, Cut & Style',  0,  900,  45, 'confirmed', null),
  ('pierre.martin@cutbook.test',   'Lucas Martin',  'le-chic-parisien',  'Beard Trim',         3,  600,  20, 'pending',   null),
  -- France: Camille Durand (lyon-cuts)
  ('sophie.bernard@cutbook.test',  'Camille Durand','lyon-cuts',         'Classic Haircut',  -11,  600,  30, 'completed', null),
  ('louis.petit@cutbook.test',     'Camille Durand','lyon-cuts',         'Hot Towel Shave',   -6,  540,  30, 'completed', null),
  ('pierre.martin@cutbook.test',   'Camille Durand','lyon-cuts',         'Fade & Finish',      1,  780,  45, 'confirmed', null),
  -- France: Antoine Rossi (marseille-style)
  ('louis.petit@cutbook.test',     'Antoine Rossi', 'marseille-style',   'Classic Haircut',  -14,  660,  30, 'completed', null),
  ('pierre.martin@cutbook.test',   'Antoine Rossi', 'marseille-style',   'Beard Trim',        -2,  540,  20, 'completed', null),
  ('sophie.bernard@cutbook.test',  'Antoine Rossi', 'marseille-style',   'Fade & Finish',      2,  660,  45, 'pending',   null),
  -- UK: Oliver Smith (london-blade)
  ('george.davies@cutbook.test',   'Oliver Smith',  'london-blade',      'Classic Haircut',  -13,  540,  30, 'completed', null),
  ('emily.evans@cutbook.test',     'Oliver Smith',  'london-blade',      'Fade & Finish',     -7,  660,  45, 'completed', null),
  ('finlay.clark@cutbook.test',    'Oliver Smith',  'london-blade',      'Wash, Cut & Style', -1,  900,  45, 'completed', null),
  ('george.davies@cutbook.test',   'Oliver Smith',  'london-blade',      'Beard Trim',         2,  600,  20, 'confirmed', null),
  ('emily.evans@cutbook.test',     'Oliver Smith',  'london-blade',      'Classic Haircut',    4,  720,  30, 'pending',   null),
  -- UK: Noah Jones (manchester-fade)
  ('emily.evans@cutbook.test',     'Noah Jones',    'manchester-fade',   'Classic Haircut',  -10,  600,  30, 'completed', null),
  ('finlay.clark@cutbook.test',    'Noah Jones',    'manchester-fade',   'Hot Towel Shave',   -5,  540,  30, 'completed', null),
  ('george.davies@cutbook.test',   'Noah Jones',    'manchester-fade',   'Fade & Finish',      1,  780,  45, 'confirmed', null),
  ('emily.evans@cutbook.test',     'Noah Jones',    'manchester-fade',   'Kids Cut',           3,  630,  25, 'pending',   null),
  -- UK: Eva Brown (edinburgh-edge)
  ('finlay.clark@cutbook.test',    'Eva Brown',     'edinburgh-edge',    'Classic Haircut',  -15,  660,  30, 'completed', null),
  ('george.davies@cutbook.test',   'Eva Brown',     'edinburgh-edge',    'Beard Trim',        -3,  540,  20, 'completed', null),
  ('emily.evans@cutbook.test',     'Eva Brown',     'edinburgh-edge',    'Fade & Finish',      0,  660,  45, 'confirmed', null),
  -- Germany: Lukas Schmidt (berlin-buzz)
  ('max.hoffmann@cutbook.test',    'Lukas Schmidt', 'berlin-buzz',       'Classic Haircut',  -12,  540,  30, 'completed', null),
  ('lisa.wagner@cutbook.test',     'Lukas Schmidt', 'berlin-buzz',       'Fade & Finish',     -6,  660,  45, 'completed', null),
  ('max.hoffmann@cutbook.test',    'Lukas Schmidt', 'berlin-buzz',       'Beard Trim',         0,  600,  20, 'confirmed', null),
  ('lisa.wagner@cutbook.test',     'Lukas Schmidt', 'berlin-buzz',       'Wash, Cut & Style',  3,  900,  45, 'pending',   null),
  -- Germany: Anna Weber (munich-mane)
  ('lisa.wagner@cutbook.test',     'Anna Weber',    'munich-mane',       'Classic Haircut',  -14,  600,  30, 'completed', null),
  ('max.hoffmann@cutbook.test',    'Anna Weber',    'munich-mane',       'Hot Towel Shave',   -8,  540,  30, 'completed', null),
  ('lisa.wagner@cutbook.test',     'Anna Weber',    'munich-mane',       'Fade & Finish',      1,  780,  45, 'confirmed', null),
  ('max.hoffmann@cutbook.test',    'Anna Weber',    'munich-mane',       'Kids Cut',           4,  630,  25, 'pending',   null)
) as b(customer_email, staff_name, shop_slug, service_name, day_offset, start_at, duration, status, note)
join public.profiles c on c.email = b.customer_email and c.deleted_at is null
join public.shops s on s.slug = b.shop_slug
join public.shop_members sm on sm.shop_id = s.id and sm.display_name = b.staff_name and sm.removed_at is null
join public.services svc on svc.shop_id = s.id and lower(svc.name) = lower(b.service_name) and svc.is_active;

-- ── 12. Reviews across regions ───────────────────────────────────────────

insert into public.reviews (shop_id, customer_id, booking_id, rating, comment, status, created_at)
select
  s.id, c.id, b.id, r.rating, r.comment, r.status,
  date_trunc('day', now()) + r.day_offset * interval '1 day'
from (values
  ('sara.alami@cutbook.test',      'Casablanca Cuts',   -10, 5, 'Best fade in Casablanca. Ahmed is a genius.',      'published'),
  ('omar.benjelloun@cutbook.test', 'Casablanca Cuts',    -5, 4, 'Clean cut, good atmosphere.',                       'published'),
  ('nadia.fassi@cutbook.test',     'Marrakech Barbers',  -3, 5, 'Love the traditional touch. Karim nailed it.',       'published'),
  ('sara.alami@cutbook.test',      'Rabat Razor',        -4, 4, 'Great beard trim, very precise.',                    'published'),
  ('pierre.martin@cutbook.test',   'Le Chic Parisien',   -9, 5, 'Lucas is the best barber in Paris. Period.',         'published'),
  ('sophie.bernard@cutbook.test',  'Le Chic Parisien',   -4, 4, 'Solid fade, will come back.',                        'published'),
  ('louis.petit@cutbook.test',     'Lyon Cuts',          -6, 4, 'Camille does great work every time.',                'published'),
  ('george.davies@cutbook.test',   'London Blade',       -13, 5, 'Oliver is meticulous. Best in London.',              'published'),
  ('emily.evans@cutbook.test',     'London Blade',        -7, 4, 'Clean and quick. Happy with the result.',            'published'),
  ('finlay.clark@cutbook.test',    'Edinburgh Edge',     -3, 5, 'Eva is fantastic. Highly recommend.',                'published'),
  ('max.hoffmann@cutbook.test',    'Berlin Buzz',        -6, 4, 'Lukas gives a sharp, clean cut.',                    'published'),
  ('lisa.wagner@cutbook.test',     'Munich Mane',        -8, 5, 'Anna is amazing. Best in Munich.',                   'published')
) as r(customer_email, shop_name, day_offset, rating, comment, status)
join public.profiles c on c.email = r.customer_email and c.deleted_at is null
join public.shops s on lower(s.name) = lower(r.shop_name)
join public.bookings b on b.customer_id = c.id and b.shop_id = s.id
  and date_trunc('day', b.starts_at) = date_trunc('day', now()) + r.day_offset * interval '1 day';
