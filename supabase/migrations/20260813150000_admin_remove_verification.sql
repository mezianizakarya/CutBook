-- ============================================================================
-- Admin RPC: remove a user's verified badge.
--
-- The admin Users modal lets an admin clear is_verified (mirrors the role
-- badge flow). profiles.is_verified is NOT in the column-scoped UPDATE grant
-- (see 20260808190000_profiles_grants_hardening.sql), so only this SECURITY
-- DEFINER RPC can flip it back. The barber/owner can re-apply afterwards.
-- ============================================================================

create or replace function public.admin_remove_verification(p_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin only';
  end if;
  update public.profiles
     set is_verified = false
   where id = p_user_id;
  if not found then
    raise exception 'user not found';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values ((select auth.jwt() ->> 'sub'), 'verification_removed', 'profiles', p_user_id,
          jsonb_build_object('is_verified', false));
end;
$$;

revoke all on function public.admin_remove_verification(text) from public;
grant execute on function public.admin_remove_verification(text) to authenticated;
