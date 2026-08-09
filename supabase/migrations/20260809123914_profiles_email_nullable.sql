-- Allow a NULL email so the Clerk webhook can store profiles for users
-- without an email address. NULL never collides in the
-- profiles_email_active_unique partial index, unlike the previous "" sentinel
-- which collided for two active accounts with no email. The
-- profiles_email_lowercase check already passes NULL (a NULL comparison is
-- neither true nor false), so only the NOT NULL constraint is dropped.
alter table public.profiles
  alter column email drop not null;
