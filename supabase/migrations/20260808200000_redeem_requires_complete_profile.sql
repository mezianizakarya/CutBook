-- A barber can only join a shop once their professional profile step is done.
-- onboarding_step is webhook-mirrored from Clerk unsafeMetadata.onboardingStep
-- ('complete' is set by the barber-professional onboarding screen). Clients
-- cannot write this column (grants hardening), so the DB value is authoritative.

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
  if v_profile.onboarding_step is distinct from 'complete' then
    raise exception 'finish your barber profile before joining a shop';
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
