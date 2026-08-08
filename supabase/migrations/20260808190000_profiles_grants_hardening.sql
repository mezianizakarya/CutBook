-- ============================================================================
-- Harden profiles grants.
--
-- The live DB had `grant all on public.profiles to anon, authenticated` —
-- meaning anyone (even unauthenticated anon) could INSERT/DELETE/TRUNCATE and
-- UPDATE every column including role, deleted_at, is_disabled and
-- onboarding_completed, bypassing RLS entirely. This replaces those grants
-- with the narrowest set the app needs:
--
--   * SELECT  -> read access (RLS still gates which rows are visible).
--   * UPDATE  -> only the self-service columns clients actually write
--                (profile editor, username, avatar, phone, barber fields).
--                role / deleted_at / is_disabled / onboarding_* stay
--                protected: they change only through the admin_* RPCs or the
--                Clerk webhook.
--   * INSERT/DELETE/TRUNCATE -> none. Profiles are created and soft-deleted
--                exclusively by the webhook (service_role) and admin RPCs.
--
-- service_role keeps its `grant all` (webhook writes), so it is untouched.
-- ============================================================================

revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to anon, authenticated;

grant update (email, first_name, last_name, phone, avatar_url, bio, city,
              username, specialty, years_of_experience)
  on public.profiles to authenticated;

-- ============================================================================
-- Admin RPC: set a user's role. SECURITY DEFINER + admin-only, mirroring
-- admin_set_user_disabled. Pushes through the updated_at trigger so the
-- DB -> Clerk role reconciliation picks it up.
-- ============================================================================
create or replace function public.admin_set_user_role(p_user_id text, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_role not in ('customer', 'barber', 'owner', 'admin') then
    raise exception 'invalid role';
  end if;
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin only';
  end if;
  update public.profiles
     set role = p_role
   where id = p_user_id;
  if not found then
    raise exception 'user not found';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values ((select auth.jwt() ->> 'sub'), 'user_role_set', 'profiles', p_user_id,
          jsonb_build_object('role', p_role));
end;
$$;

revoke all on function public.admin_set_user_role(text, text) from public;
grant execute on function public.admin_set_user_role(text, text) to authenticated;

-- ============================================================================
-- Admin RPC: soft-delete / restore a user (sets/clears deleted_at). Same
-- pattern as the role RPC above.
-- ============================================================================
create or replace function public.admin_set_user_deleted(p_user_id text, p_deleted boolean)
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
     set deleted_at = case when p_deleted then now() else null end
   where id = p_user_id;
  if not found then
    raise exception 'user not found';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values ((select auth.jwt() ->> 'sub'), 'user_deleted_set', 'profiles', p_user_id,
          jsonb_build_object('deleted_at', p_deleted));
end;
$$;

revoke all on function public.admin_set_user_deleted(text, boolean) from public;
grant execute on function public.admin_set_user_deleted(text, boolean) to authenticated;
