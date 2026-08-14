-- ============================================================================
-- shop_verification_requests: owner/manager asks to verify their shop.
--
-- Flow:
--   An owner or manager of a shop submits a request (submit_shop_verification_request).
--   An admin reviews it (admin_review_shop_verification_request): approving flips
--   shops.is_verified to true (customer-facing "Verified" badge on shop cards),
--   rejecting records the decision so the owner can re-apply. The applicant can
--   withdraw a pending request.
--
-- Security:
--   shops.is_verified is NOT writable by authenticated (granted columns on
--   shops are SELECT-only), so only the SECURITY DEFINER admin RPC can set it.
--   shop_verification_requests has a single SELECT policy (managed shop or
--   admin). All writes happen through the RPCs below.
-- ============================================================================

create table public.shop_verification_requests (
  id          bigint generated always as identity primary key,
  shop_id     bigint not null references public.shops (id) on delete cascade,
  status      text not null default 'pending'
              constraint shop_verification_requests_status_check
              check (status in ('pending', 'approved', 'rejected')),
  note        text,                 -- applicant's reason
  review_note text,                 -- admin's decision note (e.g. rejection reason)
  reviewed_at timestamptz,
  reviewed_by text references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint shop_verification_requests_review_consistency
    check ((reviewed_by is null) = (reviewed_at is null))
);

create index shop_verification_requests_shop_idx
  on public.shop_verification_requests (shop_id, created_at desc);
create index shop_verification_requests_status_idx
  on public.shop_verification_requests (status);
create unique index shop_verification_requests_one_pending
  on public.shop_verification_requests (shop_id) where (status = 'pending');

create trigger shop_verification_requests_set_updated_at
  before update on public.shop_verification_requests
  for each row execute function private.set_updated_at();

alter table public.shop_verification_requests enable row level security;

create policy "shop_verification_requests_select_managed_or_admin"
  on public.shop_verification_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.shop_members sm
      where sm.shop_id = shop_verification_requests.shop_id
        and sm.profile_id = (select auth.jwt() ->> 'sub')
        and sm.member_role in ('owner', 'manager')
        and sm.removed_at is null
    )
    or (select private.current_role()) = 'admin'
  );

grant select on public.shop_verification_requests to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: submit_shop_verification_request (owner/manager of the shop only)
-- ----------------------------------------------------------------------------
create or replace function public.submit_shop_verification_request(
  p_shop_id bigint,
  p_note    text default null
)
returns public.shop_verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  text;
  v_shop public.shops;
  req    public.shop_verification_requests;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_shop from public.shops where id = p_shop_id;
  if v_shop is null or v_shop.deleted_at is not null then
    raise exception 'shop not found';
  end if;
  if not exists (
    select 1 from public.shop_members sm
    where sm.shop_id = p_shop_id
      and sm.profile_id = v_uid
      and sm.member_role in ('owner', 'manager')
      and sm.removed_at is null
  ) then
    raise exception 'you must manage this shop to request verification';
  end if;
  if v_shop.is_verified then
    raise exception 'this shop is already verified';
  end if;
  if exists (
    select 1 from public.shop_verification_requests
    where shop_id = p_shop_id and status = 'pending'
  ) then
    raise exception 'a verification request is already pending for this shop';
  end if;

  insert into public.shop_verification_requests (shop_id, status, note)
  values (p_shop_id, 'pending', nullif(btrim(coalesce(p_note, '')), ''))
  returning * into req;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid, 'shop_verification_requested', 'shop_verification_requests',
          req.id::text, to_jsonb(req));

  return req;
end;
$$;

revoke all on function public.submit_shop_verification_request(bigint, text) from public;
grant execute on function public.submit_shop_verification_request(bigint, text) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: withdraw_shop_verification_request (manager/owner of the shop only)
-- ----------------------------------------------------------------------------
create or replace function public.withdraw_shop_verification_request(p_request_id bigint)
returns public.shop_verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  req   public.shop_verification_requests;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into req
    from public.shop_verification_requests
   where id = p_request_id
   for update;
  if req is null then
    raise exception 'request not found';
  end if;
  if not exists (
    select 1 from public.shop_members sm
    where sm.shop_id = req.shop_id
      and sm.profile_id = v_uid
      and sm.member_role in ('owner', 'manager')
      and sm.removed_at is null
  ) then
    raise exception 'not authorized to withdraw this request';
  end if;
  if req.status <> 'pending' then
    raise exception 'only a pending request can be withdrawn';
  end if;

  delete from public.shop_verification_requests where id = req.id returning * into req;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before)
  values (v_uid, 'shop_verification_request_withdrawn', 'shop_verification_requests',
          req.id::text, to_jsonb(req));

  return req;
end;
$$;

revoke all on function public.withdraw_shop_verification_request(bigint) from public;
grant execute on function public.withdraw_shop_verification_request(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: admin_review_shop_verification_request (admin only)
-- ----------------------------------------------------------------------------
create or replace function public.admin_review_shop_verification_request(
  p_request_id  bigint,
  p_approve     boolean,
  p_review_note text default null
)
returns public.shop_verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  req   public.shop_verification_requests;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin only';
  end if;

  select * into req
    from public.shop_verification_requests
   where id = p_request_id
   for update;
  if req is null then
    raise exception 'request not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'request has already been reviewed';
  end if;

  update public.shop_verification_requests
     set status      = case when p_approve then 'approved' else 'rejected' end,
         review_note = nullif(btrim(coalesce(p_review_note, '')), ''),
         reviewed_by = v_uid,
         reviewed_at = now()
   where id = req.id
   returning * into req;

  if p_approve then
    update public.shops
       set is_verified = true
     where id = req.shop_id;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid,
          case when p_approve then 'shop_verification_approved'
               else 'shop_verification_rejected' end,
          'shop_verification_requests', req.id::text, to_jsonb(req));

  return req;
end;
$$;

revoke all on function public.admin_review_shop_verification_request(bigint, boolean, text) from public;
grant execute on function public.admin_review_shop_verification_request(bigint, boolean, text) to authenticated;
