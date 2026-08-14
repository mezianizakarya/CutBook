-- Shop soft-delete for owners.
--
-- Owners cannot hard-delete a shop (FKs on bookings/reviews/shop_members use
-- ON DELETE RESTRICT). Mirroring account soft-delete, delete_shop sets
-- deleted_at + is_active = false, which hides the shop from every customer
-- facing query (shops_select_public requires approved, is_active, and
-- deleted_at is null) while preserving history. The caller must be the shop's
-- owner or an admin. Idempotent: a shop already deleted (or missing) raises.
-- Every deletion is appended to audit_log (before/after).

create or replace function public.delete_shop(p_shop_id bigint)
returns public.shops
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    text;
  v_role   text;
  v_before public.shops;
  v_after  public.shops;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_role := (select private.shop_role(p_shop_id));
  if v_role is distinct from 'owner'
     and (select private.current_role()) is distinct from 'admin' then
    raise exception 'only the shop owner can delete a shop';
  end if;

  select * into v_before
    from public.shops
   where id = p_shop_id
     and deleted_at is null
   for update;
  if v_before is null then
    raise exception 'shop not found';
  end if;

  update public.shops
     set deleted_at = now(),
         is_active = false
   where id = p_shop_id
   returning * into v_after;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (v_uid, 'shop_deleted', 'shops', p_shop_id::text, to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$;

grant execute on function public.delete_shop(bigint) to authenticated;
