-- ============================================================================
-- verification_requests: barber/owner verification workflow.
--
-- Flow:
--   A barber or shop owner requests verification (submit_verification_request).
--   An admin reviews it (admin_review_verification_request): approving flips
--   profiles.is_verified to true, rejecting records the decision so the user
--   can re-apply. The applicant can withdraw a pending request.
--
-- Security:
--   profiles.is_verified is NOT in the column-scoped UPDATE grant for
--   authenticated (see 20260808190000_profiles_grants_hardening.sql), so only
--   the SECURITY DEFINER admin RPC can set it — never the client.
--   verification_requests has a single SELECT policy (own row or admin). All
--   writes happen through the RPCs below.
-- ============================================================================

alter table public.profiles
  add column is_verified boolean not null default false;

create table public.verification_requests (
  id          bigint generated always as identity primary key,
  profile_id  text not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending'
              constraint verification_requests_status_check
              check (status in ('pending', 'approved', 'rejected')),
  note        text,                 -- applicant's reason
  review_note text,                 -- admin's decision note (e.g. rejection reason)
  reviewed_at timestamptz,
  reviewed_by text references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint verification_requests_review_consistency
    check ((reviewed_by is null) = (reviewed_at is null))
);

create index verification_requests_profile_idx
  on public.verification_requests (profile_id, created_at desc);
create index verification_requests_status_idx
  on public.verification_requests (status);
create unique index verification_requests_one_pending
  on public.verification_requests (profile_id) where (status = 'pending');

create trigger verification_requests_set_updated_at
  before update on public.verification_requests
  for each row execute function private.set_updated_at();

alter table public.verification_requests enable row level security;

create policy "verification_requests_select_self_or_admin" on public.verification_requests
  for select to authenticated
  using (profile_id = (select auth.jwt() ->> 'sub')
         or (select private.current_role()) = 'admin');

grant select on public.verification_requests to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: submit_verification_request (barber/owner only, one pending at a time)
-- ----------------------------------------------------------------------------
create or replace function public.submit_verification_request(
  p_note text default null
)
returns public.verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     text;
  v_profile public.profiles;
  req       public.verification_requests;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile is null or v_profile.deleted_at is not null then
    raise exception 'profile not found';
  end if;
  if v_profile.role not in ('barber', 'owner') then
    raise exception 'only barbers and shop owners can request verification';
  end if;
  if v_profile.is_verified then
    raise exception 'your account is already verified';
  end if;
  if exists (
    select 1 from public.verification_requests
    where profile_id = v_uid and status = 'pending'
  ) then
    raise exception 'a verification request is already pending';
  end if;

  insert into public.verification_requests (profile_id, status, note)
  values (v_uid, 'pending', nullif(btrim(coalesce(p_note, '')), ''))
  returning * into req;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid, 'verification_requested', 'verification_requests',
          req.id::text, to_jsonb(req));

  return req;
end;
$$;

revoke all on function public.submit_verification_request(text) from public;
grant execute on function public.submit_verification_request(text) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: withdraw_verification_request (own pending request only)
-- ----------------------------------------------------------------------------
create or replace function public.withdraw_verification_request(p_request_id bigint)
returns public.verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  req   public.verification_requests;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into req
    from public.verification_requests
   where id = p_request_id
   for update;
  if req is null then
    raise exception 'request not found';
  end if;
  if req.profile_id <> v_uid then
    raise exception 'not authorized to withdraw this request';
  end if;
  if req.status <> 'pending' then
    raise exception 'only a pending request can be withdrawn';
  end if;

  delete from public.verification_requests where id = req.id returning * into req;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before)
  values (v_uid, 'verification_request_withdrawn', 'verification_requests',
          req.id::text, to_jsonb(req));

  return req;
end;
$$;

revoke all on function public.withdraw_verification_request(bigint) from public;
grant execute on function public.withdraw_verification_request(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: admin_review_verification_request (admin only)
-- ----------------------------------------------------------------------------
create or replace function public.admin_review_verification_request(
  p_request_id  bigint,
  p_approve     boolean,
  p_review_note text default null
)
returns public.verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid text;
  req   public.verification_requests;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin only';
  end if;

  select * into req
    from public.verification_requests
   where id = p_request_id
   for update;
  if req is null then
    raise exception 'request not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'request has already been reviewed';
  end if;

  update public.verification_requests
     set status      = case when p_approve then 'approved' else 'rejected' end,
         review_note = nullif(btrim(coalesce(p_review_note, '')), ''),
         reviewed_by = v_uid,
         reviewed_at = now()
   where id = req.id
   returning * into req;

  if p_approve then
    update public.profiles
       set is_verified = true
     where id = req.profile_id;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (v_uid,
          case when p_approve then 'verification_approved' else 'verification_rejected' end,
          'verification_requests', req.id::text, to_jsonb(req));

  return req;
end;
$$;

revoke all on function public.admin_review_verification_request(bigint, boolean, text) from public;
grant execute on function public.admin_review_verification_request(bigint, boolean, text) to authenticated;
