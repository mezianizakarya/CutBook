-- 4.4 username format constraints ------------------------------------------
-- Enforce the product's username rules at the DB level so a malformed value
-- can never enter through the Clerk webhook, an RPC, or a future admin edit.
-- Rules: 3-30 chars, only a-z / 0-9 / `.` / `_`, must start AND end with a
-- letter or number, and no consecutive separators. (Lowercasing is already
-- enforced by profiles_username_lowercase; uniqueness by the partial unique
-- index profiles_username_unique.)

-- Repair any legacy value that would violate the new rules first. Repaired
-- names reuse the NOT NULL fallback pattern (user_ + 8 hex chars), which is
-- lowercase, 3-30 chars, alnum on both edges and has no double separators.
do $$
declare
  r record;
  candidate text;
  counter int;
begin
  for r in
    select id
    from public.profiles
    where username is null
       or username = ''
       or char_length(username) < 3
       or char_length(username) > 30
       or username !~ '^[a-z0-9._]+$'
       or username ~ '^[._]'
       or username ~ '[._]$'
       or username ~ '[._]{2,}'
    order by id
  loop
    counter := 0;
    loop
      counter := counter + 1;
      candidate := 'user_' || substr(md5(random()::text), 1, 8)
                   || case when counter > 1 then counter::text else '' end;
      exit when not exists (
        select 1 from public.profiles where username = candidate and id <> r.id
      );
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_username_length
    check (char_length(username) between 3 and 30);

alter table public.profiles
  add constraint profiles_username_charset
    check (username ~ '^[a-z0-9._]+$');

alter table public.profiles
  add constraint profiles_username_alnum_edges
    check (username ~ '^[a-z0-9]' and username ~ '[a-z0-9]$');

alter table public.profiles
  add constraint profiles_username_no_double_separators
    check (username !~ '[._]{2,}');
