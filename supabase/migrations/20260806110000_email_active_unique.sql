-- Enforce a single ACTIVE account per email address. Deleted rows keep their
-- history, so uniqueness applies only while deleted_at is null.
create unique index profiles_email_active_unique
  on public.profiles (email)
  where deleted_at is null;

-- account_status is only ever 'active' or 'deleted'.
alter table public.profiles
  drop column account_status;

alter table public.profiles
  add column account_status text not null generated always as (
    case when deleted_at is not null then 'deleted' else 'active' end
  ) stored;
