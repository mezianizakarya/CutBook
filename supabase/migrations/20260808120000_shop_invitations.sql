-- ============================================================================
-- shop_invitations: one-time barber invitation codes.
--
-- Flow:
--   Owner/manager of a shop generates a code (create_shop_invitation).
--   A barber redeems it (redeem_shop_invitation). Redemption is single-use:
--   the invitation row is locked with SELECT ... FOR UPDATE and marked used
--   in the same statement sequence, so two barbers can never redeem the same
--   code concurrently. Revocation and expiry are also enforced inside the
--   RPCs, never by the client.
--
-- Writes only happen through SECURITY DEFINER RPCs; the table itself has a
-- single SELECT policy (shop owner/manager/admin). No client INSERT/UPDATE/
-- DELETE policies exist.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper: random code body (avoid confusing 0/O, 1/I/L)
-- ----------------------------------------------------------------------------
create or replace function private.random_invitation_code()
returns text
language sql
volatile
set search_path = ''
as $$
  with alphabet as (
    select string_to_array('ABCDEFGHJKMNPQRSTUVWXYZ23456789', null) as chars
  )
  select string_agg(
    chars[1 + floor(random() * cardinality(chars))::int], '' order by ord)
  from alphabet, generate_series(1, 6) as ord;
$$;

revoke all on function private.random_invitation_code() from public;

-- ----------------------------------------------------------------------------
-- 2. Table
-- ----------------------------------------------------------------------------
create table public.shop_invitations (
  id         bigint generated always as identity primary key,
  shop_id    bigint not null references public.shops (id) on delete cascade,
  code       text not null,
  created_by text not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by text references public.profiles (id) on delete set null,
  used_by    text references public.profiles (id) on delete set null,
  used_at    timestamptz,
  constraint shop_invitations_code_format
    check (code ~ '^[A-Z0-9]{3}-[A-Z0-9]{6}$'),
  constraint shop_invitations_code_unique unique (code),
  constraint shop_invitations_used_consistency
    check ((used_by is null) = (used_at is null)),
  constraint shop_invitations_revoked_consistency
    check ((revoked_by is null) = (revoked_at is null))
);

create index shop_invitations_shop_created_idx
  on public.shop_invitations (shop_id, created_at desc);

alter table public.shop_invitations enable row level security;

-- Only the shop owner/manager (or an admin) can see a shop's invitation codes.
create policy "shop_invitations_select_staff_or_admin" on public.shop_invitations
  for select to authenticated
  using ((select private.shop_role(shop_id)) in ('owner', 'manager')
         or (select private.current_role()) = 'admin');

-- ----------------------------------------------------------------------------
-- 3. RPC: create_shop_invitation (owner/manager/admin only)
-- ----------------------------------------------------------------------------
create or replace function public.create_shop_invitation(
  p_shop_id          bigint,
  p_expires_in_days  integer default 7
)
returns public.shop_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  text;
  v_code text;
  inv    public.shop_invitations;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_expires_in_days not between 1 and 30 then
    raise exception 'invitation validity must be between 1 and 30 days';
  end if;
  if not exists (
    select 1 from public.shop_members m
    where m.shop_id = p_shop_id
      and m.profile_id = v_uid
      and m.member_role in ('owner', 'manager')
      and m.removed_at is null
  ) and (select role from public.profiles p where p.id = v_uid) <> 'admin' then
    raise exception 'only the shop owner or manager can create invitations';
  end if;

  loop
    v_code := 'CUT-' || private.random_invitation_code();
    exit when not exists (
      select 1 from public.shop_invitations si where si.code = v_code
    );
  end loop;

  insert into public.shop_invitations (shop_id, code, created_by, expires_at)
  values (p_shop_id, v_code, v_uid, now() + p_expires_in_days * interval '1 day')
  returning * into inv;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid, 'shop_invitation_created', 'shop_invitations',
          inv.id::text, to_jsonb(inv));

  return inv;
end;
$$;

revoke all on function public.create_shop_invitation(bigint, integer) from public;
grant execute on function public.create_shop_invitation(bigint, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. RPC: revoke_shop_invitation (owner/manager/admin only, unused only)
-- ----------------------------------------------------------------------------
create or replace function public.revoke_shop_invitation(p_invitation_id bigint)
returns public.shop_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  inv   public.shop_invitations;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
    from public.shop_invitations si
   where si.id = p_invitation_id
   for update;
  if inv is null then
    raise exception 'invitation not found';
  end if;
  if not exists (
    select 1 from public.shop_members m
    where m.shop_id = inv.shop_id
      and m.profile_id = v_uid
      and m.member_role in ('owner', 'manager')
      and m.removed_at is null
  ) and (select role from public.profiles p where p.id = v_uid) <> 'admin' then
    raise exception 'not authorized to revoke this invitation';
  end if;
  if inv.used_at is not null then
    raise exception 'a used invitation cannot be revoked';
  end if;
  if inv.revoked_at is not null then
    return inv;
  end if;

  update public.shop_invitations si
     set revoked_at = now(),
         revoked_by = v_uid
   where si.id = inv.id
   returning * into inv;

  return inv;
end;
$$;

revoke all on function public.revoke_shop_invitation(bigint) from public;
grant execute on function public.revoke_shop_invitation(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. RPC: redeem_shop_invitation (barber only, atomic single-use)
-- ----------------------------------------------------------------------------
create or replace function public.redeem_shop_invitation(p_code text)
returns table (
  member_id    bigint,
  shop_id      bigint,
  shop_name    text,
  display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         text;
  v_code        text;
  v_profile     public.profiles;
  inv           public.shop_invitations;
  v_member      public.shop_members;
  v_shop_name   text;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  v_code := upper(btrim(p_code));
  if v_code = '' then
    raise exception 'enter an invitation code';
  end if;

  select * into v_profile from public.profiles p where p.id = v_uid;
  if v_profile is null then
    raise exception 'profile not found';
  end if;
  if v_profile.role <> 'barber' then
    raise exception 'only barbers can join a shop with an invitation code';
  end if;

  -- Lock the invitation row so two barbers can never redeem it together.
  select * into inv
    from public.shop_invitations si
   where si.code = v_code
   for update;

  if inv is null then
    raise exception 'invalid invitation code';
  end if;
  if inv.revoked_at is not null then
    raise exception 'this invitation has been revoked';
  end if;
  if inv.used_at is not null then
    raise exception 'this invitation has already been used';
  end if;
  if inv.expires_at < now() then
    raise exception 'this invitation has expired';
  end if;

  if exists (
    select 1 from public.shop_members m
    where m.shop_id = inv.shop_id
      and m.profile_id = v_uid
      and m.removed_at is null
  ) then
    raise exception 'you are already a member of this shop';
  end if;

  insert into public.shop_members (
    shop_id, profile_id, member_role, display_name, avatar_url
  )
  values (
    inv.shop_id,
    v_uid,
    'barber',
    btrim(v_profile.first_name || ' ' || v_profile.last_name),
    v_profile.avatar_url
  )
  returning * into v_member;

  update public.shop_invitations si
     set used_by = v_uid,
         used_at = now()
   where si.id = inv.id;

  select s.name into v_shop_name from public.shops s where s.id = inv.shop_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid, 'shop_invitation_redeemed', 'shop_invitations',
          inv.id::text, to_jsonb(inv));

  return query
    select v_member.id as member_id,
           v_member.shop_id as shop_id,
           v_shop_name as shop_name,
           v_member.display_name as display_name;
end;
$$;

revoke all on function public.redeem_shop_invitation(text) from public;
grant execute on function public.redeem_shop_invitation(text) to authenticated;
