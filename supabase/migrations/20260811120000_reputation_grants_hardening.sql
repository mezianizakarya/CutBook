-- Remove Supabase default table grants that are not needed for
-- customer_reputation. RLS already blocks authenticated writes (no INSERT /
-- UPDATE / DELETE policies), but defense-in-depth: strip every privilege from
-- anon/authenticated except the SELECT that powers the self/admin read policy.
-- Write access is exclusively via SECURITY DEFINER RPCs and the service role.

revoke all on public.customer_reputation from anon;
revoke all on public.customer_reputation from authenticated;
grant select on public.customer_reputation to authenticated;
