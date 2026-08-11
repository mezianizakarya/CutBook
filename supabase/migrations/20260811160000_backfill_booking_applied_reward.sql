-- Backfill the booking reward snapshot for redemptions that happened before
-- 20260811150000_booking_applied_reward.sql (redeem_reward now writes the
-- snapshot itself). Idempotent: only fills rows that don't already have it.

update public.bookings b
set applied_reward_type  = m.reward_type,
    applied_reward_title = m.reward_title,
    applied_reward_value = m.reward_value,
    updated_at           = now()
from public.customer_rewards r
join public.loyalty_milestones m on m.id = r.milestone_id
where r.redeemed_booking_id = b.id
  and r.status = 'redeemed'
  and b.applied_reward_title is null;
