import { runList, runMaybe, runQuery } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export type LoyaltyProgram = {
  id: number;
  shop_id: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type LoyaltyRewardType =
  | "percentage_discount"
  | "fixed_discount"
  | "free_service"
  | "custom";

export type LoyaltyMilestone = {
  id: number;
  loyalty_program_id: number;
  visit_count: number;
  reward_type: LoyaltyRewardType;
  reward_title: string;
  reward_description: string | null;
  reward_value: number | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CustomerLoyalty = {
  id: number;
  customer_id: string;
  shop_id: number;
  total_completed_visits: number;
  current_streak: number;
  best_streak: number;
  last_qualifying_visit_at: string | null;
  last_streak_break_at: string | null;
};

export type CustomerRewardStatus = "unlocked" | "redeemed" | "expired";

export type CustomerReward = {
  id: number;
  customer_loyalty_id: number;
  milestone_id: number;
  status: CustomerRewardStatus;
  unlocked_at: string;
  redeemed_at: string | null;
  redeemed_booking_id: number | null;
  expires_at: string | null;
};

export type ShopLoyalty = {
  program: LoyaltyProgram | null;
  milestones: LoyaltyMilestone[];
};

export type CustomerLoyaltyView = {
  program: LoyaltyProgram | null;
  milestones: LoyaltyMilestone[];
  card: CustomerLoyalty | null;
  rewards: CustomerReward[];
};

export type CustomerLoyaltySummary = {
  shop_id: number;
  shop_name: string;
  shop_logo_url: string | null;
  total_completed_visits: number;
  current_streak: number;
  next_milestone: LoyaltyMilestone | null;
  next_milestone_progress: number;
};

const LOYALTY_PROGRAM_SELECT =
  "id, shop_id, enabled, created_at, updated_at";
const LOYALTY_MILESTONE_SELECT =
  "id, loyalty_program_id, visit_count, reward_type, reward_title, reward_description, reward_value, active, sort_order, created_at, updated_at";
const CUSTOMER_LOYALTY_SELECT =
  "id, customer_id, shop_id, total_completed_visits, current_streak, best_streak, last_qualifying_visit_at, last_streak_break_at";
const CUSTOMER_REWARD_SELECT =
  "id, customer_loyalty_id, milestone_id, status, unlocked_at, redeemed_at, redeemed_booking_id, expires_at";

/** The shop's program + milestone ladder (visible to every signed-in user). */
export async function loadShopLoyalty(shopId: number): Promise<ShopLoyalty> {
  const program = await runMaybe<LoyaltyProgram>(
    supabase
      .from("loyalty_programs")
      .select(LOYALTY_PROGRAM_SELECT)
      .eq("shop_id", shopId)
      .maybeSingle()
  );
  if (!program) {
    return { program: null, milestones: [] };
  }
  const milestones = await runList<LoyaltyMilestone>(
    supabase
      .from("loyalty_milestones")
      .select(LOYALTY_MILESTONE_SELECT)
      .eq("loyalty_program_id", program.id)
      .order("visit_count", { ascending: true })
  );
  return { program, milestones };
}

/** A customer's loyalty card + unlocked rewards at a shop (self-only rows). */
export async function loadCustomerLoyalty(
  customerId: string,
  shopId: number
): Promise<CustomerLoyaltyView> {
  const { program, milestones } = await loadShopLoyalty(shopId);
  const card = await runMaybe<CustomerLoyalty>(
    supabase
      .from("customer_loyalty")
      .select(CUSTOMER_LOYALTY_SELECT)
      .eq("customer_id", customerId)
      .eq("shop_id", shopId)
      .maybeSingle()
  );
  if (!program || !card) {
    return { program, milestones, card, rewards: [] };
  }
  const rewards = await runList<CustomerReward>(
    supabase
      .from("customer_rewards")
      .select(CUSTOMER_REWARD_SELECT)
      .eq("customer_loyalty_id", card.id)
  );
  return { program, milestones, card, rewards };
}

/** Toggles the shop's loyalty program. Owner/manager or admin only. */
export async function setLoyaltyProgram(
  shopId: number,
  enabled: boolean
): Promise<LoyaltyProgram> {
  return runQuery<LoyaltyProgram>(
    supabase
      .rpc("set_loyalty_program", { p_shop_id: shopId, p_enabled: enabled })
      .maybeSingle()
  );
}

export type MilestoneInput = {
  reward_type: LoyaltyRewardType;
  reward_title: string;
  reward_description?: string | null;
  reward_value?: number | null;
  active?: boolean;
  sort_order?: number;
};

/** Creates or updates a milestone on the shop's program. */
export async function saveLoyaltyMilestone(
  programId: number,
  visitCount: number,
  input: MilestoneInput,
  milestoneId?: number
): Promise<LoyaltyMilestone> {
  return runQuery<LoyaltyMilestone>(
    supabase
      .rpc("save_loyalty_milestone", {
        p_program_id: programId,
        p_visit_count: visitCount,
        p_reward_type: input.reward_type,
        p_reward_title: input.reward_title,
        p_reward_description: input.reward_description ?? null,
        p_reward_value: input.reward_value ?? null,
        p_active: input.active ?? true,
        p_sort_order: input.sort_order ?? 0,
        p_milestone_id: milestoneId ?? null,
      })
      .maybeSingle()
  );
}

export async function deleteLoyaltyMilestone(milestoneId: number): Promise<void> {
  const { error } = await supabase.rpc("delete_loyalty_milestone", {
    p_milestone_id: milestoneId,
  });
  if (error) {
    throw error;
  }
}

/** Applies an unlocked reward to the customer's own upcoming booking. */
export async function redeemReward(
  rewardId: number,
  bookingId: number
): Promise<CustomerReward> {
  return runQuery<CustomerReward>(
    supabase
      .rpc("redeem_reward", { p_reward_id: rewardId, p_booking_id: bookingId })
      .maybeSingle()
  );
}

/** Loads loyalty summary for all shops the customer has a loyalty card at. */
export async function loadCustomerLoyaltySummary(
  customerId: string
): Promise<CustomerLoyaltySummary[]> {
  const cards = await runList<CustomerLoyalty & { shop: { id: number; name: string; logo_url: string | null } | null }>(
    supabase
      .from("customer_loyalty")
      .select(`${CUSTOMER_LOYALTY_SELECT}, shop:shops(id, name, logo_url)`)
      .eq("customer_id", customerId)
      .order("last_qualifying_visit_at", { ascending: false, nullsFirst: false })
  );

  const summaries: CustomerLoyaltySummary[] = [];
  for (const card of cards) {
    if (!card.shop) continue;
    const { program, milestones } = await loadShopLoyalty(card.shop_id);
    if (!program || !program.enabled) continue;
    const activeMilestones = milestones
      .filter((m) => m.active)
      .sort((a, b) => a.visit_count - b.visit_count);
    const nextMilestone = activeMilestones.find(
      (m) => m.visit_count > card.total_completed_visits
    );
    const prevVisitCount = nextMilestone
      ? activeMilestones
          .filter((m) => m.visit_count < nextMilestone.visit_count)
          .pop()?.visit_count ?? 0
      : activeMilestones[activeMilestones.length - 1]?.visit_count ?? 0;
    const progressRange = (nextMilestone?.visit_count ?? prevVisitCount) - prevVisitCount;
    const progressInStep = card.total_completed_visits - prevVisitCount;
    summaries.push({
      shop_id: card.shop_id,
      shop_name: card.shop.name,
      shop_logo_url: card.shop.logo_url,
      total_completed_visits: card.total_completed_visits,
      current_streak: card.current_streak,
      next_milestone: nextMilestone ?? null,
      next_milestone_progress: progressRange > 0 ? Math.min(progressInStep / progressRange, 1) : 1,
    });
  }
  return summaries;
}
