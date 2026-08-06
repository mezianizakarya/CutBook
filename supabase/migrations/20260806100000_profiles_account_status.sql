-- Computed account status so Supabase always shows it (table editor + SQL).
alter table public.profiles
  add column account_status text not null generated always as (
    case
      when deleted_at is not null then 'deleted'
      when is_disabled then 'disabled'
      else 'active'
    end
  ) stored;
