-- 4.1 usernames -------------------------------------------------------------
-- A unique, human-friendly username that replaces the email in the admin UI.
alter table public.profiles
  add column username text;

-- Keep usernames lowercase (same convention as profiles_email_lowercase).
alter table public.profiles
  add constraint profiles_username_lowercase check (username = lower(username));

-- The platform admin keeps the reserved name. Target the ACTIVE row (there may
-- be a soft-deleted history row with the same email).
update public.profiles
  set username = 'admin'
  where id = (
    select id from public.profiles
    where email = 'zkrmznoff@gmail.com' and deleted_at is null
    order by created_at asc
    limit 1
  );

-- Fallback: if the email above didn't match, give the reserved name to the
-- oldest active admin so the migration always produces an 'admin' username.
with chosen as (
  select id
  from public.profiles
  where role = 'admin'
    and account_status = 'active'
    and (username is null or username = '')
  order by created_at asc, id asc
  limit 1
)
update public.profiles p
  set username = 'admin'
  from chosen c
  where p.id = c.id
    and not exists (
      select 1 from public.profiles where username = 'admin'
    );

-- Backfill everyone else with a unique username built from their name
-- (first + last name, stripped to a-z0-9), appending a number on collision.
do $$
declare
  r record;
  base text;
  candidate text;
  counter int;
begin
  for r in
    select p.id, p.first_name, p.last_name
    from public.profiles p
    where p.username is null or p.username = ''
    order by p.created_at asc, p.id asc
  loop
    base := lower(regexp_replace(
      coalesce(r.first_name, '') || coalesce(r.last_name, ''),
      '[^a-zA-Z0-9]', '', 'g'
    ));
    if base = '' then
      base := 'user';
    end if;
    candidate := base;
    counter := 1;
    while exists (
      select 1 from public.profiles
      where username = candidate and id <> r.id
    ) loop
      counter := counter + 1;
      candidate := base || counter::text;
    end loop;
    update public.profiles
      set username = candidate
      where id = r.id;
  end loop;
end $$;

-- Enforce uniqueness on any username that has been set.
create unique index profiles_username_unique
  on public.profiles (username)
  where username is not null and username <> '';
