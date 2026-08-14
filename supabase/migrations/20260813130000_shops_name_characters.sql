-- Enforce plain-text shop names (letters, numbers, spaces, hyphen, apostrophe).
-- Strip emojis/symbols from existing rows first, then add a CHECK constraint so
-- every insert/update (including create_shop) is validated in the DB.

update public.shops
   set name = btrim(regexp_replace(name, '[^[:alpha:][:digit:] ''-]+', '', 'g'))
 where btrim(name) !~ '^[[:alpha:][:digit:] ''-]+$';

alter table public.shops
  add constraint shops_name_characters_check
  check (btrim(name) ~ '^[[:alpha:][:digit:] ''-]+$');
