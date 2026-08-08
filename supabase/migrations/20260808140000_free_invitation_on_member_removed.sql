-- ============================================================================
-- Free a used shop invitation when a barber leaves the shop.
--
-- A single-use invitation is bound to a barber's membership. When that
-- membership ends -- barber quits (leave_shop) or owner/manager removes the
-- barber -- the code should become available again so the shop can re-use it.
-- Doing this in a trigger keeps both paths (RPC and direct RLS update)
-- consistent. The redemption stays in audit_log for history.
--
-- SECURITY DEFINER is required: the trigger also fires on the owner/manager's
-- direct RLS update, and shop_invitations has no UPDATE policy, so a normal
-- trigger would silently match zero rows (RLS) and never free the code.
-- ============================================================================

create or replace function private.free_used_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.removed_at is null and new.removed_at is not null then
    update public.shop_invitations si
       set used_by = null,
           used_at = null
     where si.shop_id = new.shop_id
       and si.used_by = new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists shop_members_free_invitation on public.shop_members;
create trigger shop_members_free_invitation
  after update of removed_at on public.shop_members
  for each row execute function private.free_used_invitation();

revoke all on function private.free_used_invitation() from public;
