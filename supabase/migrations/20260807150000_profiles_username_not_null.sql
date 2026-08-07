-- 4.2 username NOT NULL ------------------------------------------------------
-- The username is required for every profile (the admin UI shows it instead of
-- the email). Backfill any stragglers first so the constraint can be added.

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

-- Fallback default so the Clerk webhook (which creates profiles without a
-- username) never trips the NOT NULL constraint. Real users replace this with
-- their chosen username during onboarding. Kept lowercase to satisfy the
-- profiles_username_lowercase check.
alter table public.profiles
  alter column username
    set default 'user_' || substr(md5(random()::text), 1, 8);

-- The username is now mandatory for every profile.
alter table public.profiles
  alter column username set not null;
