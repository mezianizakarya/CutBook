-- Surfaces the loyalty reward a customer applied to a booking so staff can
-- see it on booking rows (barbers can't read customer_rewards under RLS).
--
-- Mirrors the existing bookings snapshot pattern (service_name/price/duration):
-- redeem_reward copies the milestone's reward fields onto the booking at
-- redemption time. The snapshot is per-booking history and needs no extra RLS
-- (bookings are already SELECTable by the shop's staff and the customer).

alter table public.bookings
  add column applied_reward_type  text,
  add column applied_reward_title text,
  add column applied_reward_value numeric,
  add constraint bookings_applied_reward_type_check check (
    applied_reward_type is null
    or applied_reward_type in ('percentage_discount', 'fixed_discount', 'free_service', 'custom')
  );

create or replace function public.redeem_reward(p_reward_id bigint, p_booking_id bigint)
returns public.customer_rewards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      text;
  v_reward   public.customer_rewards;
  v_cl       public.customer_loyalty;
  v_program  public.loyalty_programs;
  v_booking  public.bookings;
  v_milestone public.loyalty_milestones;
  v_row      public.customer_rewards;
begin
  v_uid := (select auth.jwt() ->> 'sub');
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_reward
    from public.customer_rewards
   where id = p_reward_id
   for update;
  if v_reward is null then
    raise exception 'reward not found';
  end if;

  select * into v_cl
    from public.customer_loyalty
   where id = v_reward.customer_loyalty_id;
  if v_cl.customer_id <> v_uid then
    raise exception 'not authorized';
  end if;

  if v_reward.status <> 'unlocked' then
    raise exception 'reward is not available';
  end if;
  if v_reward.expires_at is not null and v_reward.expires_at < now() then
    update public.customer_rewards
       set status = 'expired'
     where id = p_reward_id and status = 'unlocked';
    raise exception 'reward has expired';
  end if;

  select * into v_program
    from public.loyalty_programs
   where shop_id = v_cl.shop_id;
  if v_program is null or not v_program.enabled then
    raise exception 'loyalty program is not active';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id
   for update;
  if v_booking is null then
    raise exception 'booking not found';
  end if;
  if v_booking.customer_id <> v_uid then
    raise exception 'not authorized';
  end if;
  if v_booking.shop_id <> v_cl.shop_id then
    raise exception 'booking is at a different shop';
  end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'reward can only be applied to an upcoming booking';
  end if;

  update public.customer_rewards
     set status              = 'redeemed',
         redeemed_at         = now(),
         redeemed_booking_id = p_booking_id
   where id = p_reward_id and status = 'unlocked'
   returning * into v_row;
  if v_row is null then
    raise exception 'reward already redeemed';
  end if;

  -- Snapshot the reward onto the booking so the shop's staff can see it.
  select * into v_milestone
    from public.loyalty_milestones
   where id = v_reward.milestone_id;

  update public.bookings
     set applied_reward_type  = v_milestone.reward_type,
         applied_reward_title = v_milestone.reward_title,
         applied_reward_value = v_milestone.reward_value,
         updated_at           = now()
   where id = p_booking_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (v_uid, 'reward_redeemed', 'customer_rewards', p_reward_id::text,
          jsonb_build_object('status', 'unlocked'),
          jsonb_build_object('status', 'redeemed', 'booking_id', p_booking_id));

  return v_row;
end;
$$;

revoke all on function public.redeem_reward(bigint, bigint) from public;
grant execute on function public.redeem_reward(bigint, bigint) to authenticated;
