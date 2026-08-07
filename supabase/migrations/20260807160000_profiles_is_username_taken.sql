-- 4.3 is_username_taken RPC --------------------------------------------------
-- The app's username availability check can't SELECT other users' rows because
-- of RLS (profiles_select_self_or_admin). This SECURITY DEFINER function lets
-- any authenticated user test availability WITHOUT exposing other profiles.
-- Excludes the caller's own row so editing your own username isn't flagged.
create or replace function public.is_username_taken(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where username = lower(p_username)
      and id <> (select auth.jwt() ->> 'sub')
  );
$$;

grant execute on function public.is_username_taken(text) to authenticated;
