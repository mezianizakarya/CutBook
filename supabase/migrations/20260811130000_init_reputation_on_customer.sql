-- Every new customer profile gets an initial reputation row so the DB is the
-- source of truth for even brand-new accounts (level 'new', all-zero counts).
-- The clerk-webhook inserts profiles before any bookings exist; without this
-- the client would fall back to a frontend default until the first terminal
-- booking fires reputation_on_booking_change.

create or replace function private.init_customer_reputation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'customer' and new.deleted_at is null then
    insert into public.customer_reputation (customer_id)
    values (new.id)
    on conflict (customer_id) do nothing;
  end if;
  return null;
end;
$$;

revoke all on function private.init_customer_reputation() from public;

drop trigger if exists init_customer_reputation on public.profiles;

create trigger init_customer_reputation
  after insert on public.profiles
  for each row execute function private.init_customer_reputation();
