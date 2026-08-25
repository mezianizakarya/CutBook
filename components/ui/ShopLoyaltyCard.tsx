import { Ionicons } from "@expo/vector-icons";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDateTime } from "@/lib/format";
import { useUserCountry } from "@/lib/user-country";
import {
  loadCustomerLoyalty,
  redeemReward,
  type CustomerLoyaltyView,
  type CustomerReward,
  type LoyaltyMilestone,
} from "@/lib/loyalty";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { t } from "@/lib/i18n";

type RedeemBooking = {
  id: number;
  starts_at: string;
  service_name: string;
};

type ShopLoyaltyCardProps = {
  shopId: number;
  customerId: string;
};

function rewardLabel(milestone: LoyaltyMilestone, countryCode?: string | null): string {
  if (milestone.reward_type === "percentage_discount") {
    return `${milestone.reward_value}% off`;
  }
  if (milestone.reward_type === "fixed_discount") {
    return `${formatCents(Math.round((milestone.reward_value ?? 0) * 100), countryCode)} off`;
  }
  if (milestone.reward_type === "free_service") {
    return t("loyalty.free_service");
  }
  return milestone.reward_title;
}

function milestoneStatus(
  milestone: LoyaltyMilestone,
  view: CustomerLoyaltyView
): "unlocked" | "redeemed" | "expired" | "locked" {
  const reward = view.rewards.find((r) => r.milestone_id === milestone.id);
  if (!reward) {
    return "locked";
  }
  return reward.status;
}

/**
 * Customer loyalty punch card for a shop. Only renders while the shop's
 * program is enabled; visit counts and unlocks are computed server-side.
 */
export function ShopLoyaltyCard({ shopId, customerId }: ShopLoyaltyCardProps) {
  const userCountry = useUserCountry();
  const [view, setView] = useState<CustomerLoyaltyView | null>(null);
  const [upcoming, setUpcoming] = useState<RedeemBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<CustomerReward | null>(null);

  const load = useCallback(async () => {
    const next = await loadCustomerLoyalty(customerId, shopId);
    setView(next);
    const { data, error } = await supabase
      .from("bookings")
      .select("id, starts_at, service_name")
      .eq("customer_id", customerId)
      .eq("shop_id", shopId)
      .in("status", ["pending", "confirmed"])
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });
    if (error) {
      throw error;
    }
    setUpcoming((data ?? []) as unknown as RedeemBooking[]);
  }, [customerId, shopId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!view?.program?.enabled) {
    return null;
  }

  const card = view.card;
  const total = card?.total_completed_visits ?? 0;
  const activeMilestones = view.milestones.filter((m) => m.active);
  const nextMilestone = activeMilestones.find((m) => m.visit_count > total);
  const progress = nextMilestone
    ? Math.min(1, total / nextMilestone.visit_count)
    : total > 0
      ? 1
      : 0;
  const unlockedRewards = view.rewards.filter((r) => r.status === "unlocked");
  const milestoneById = new Map(
    view.milestones.map((m) => [m.id, m])
  );

  async function handleRedeem(reward: CustomerReward) {
    if (upcoming.length === 0) {
      Alert.alert(
        t("loyalty.no_upcoming_booking"),
        t("loyalty.apply_when_upcoming")
      );
      return;
    }
    if (upcoming.length === 1) {
      void applyReward(reward, upcoming[0].id);
      return;
    }
    setRedeemTarget(reward);
  }

  async function applyReward(reward: CustomerReward, bookingId: number) {
    setRedeemingId(reward.id);
    setRedeemTarget(null);
    try {
      await redeemReward(reward.id, bookingId);
      Alert.alert(t("loyalty.reward_applied"), t("loyalty.reward_applied_message"));
      await load();
    } catch (e) {
      Alert.alert(t("loyalty.could_not_apply"), errorMessageFromUnknown(e));
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <AppText style={styles.title}>{t("loyalty.title")}</AppText>
            <AppText style={styles.subtitle}>{t("loyalty.subtitle")}</AppText>
          </View>
          <Ionicons name="pricetags" size={22} color={colors.primaryDark} />
        </View>

        <View style={styles.statsRow}>
          <Stat value={total} label={t("loyalty.visits")} />
          <View style={styles.statDivider} />
          <Stat value={card?.current_streak ?? 0} label={t("loyalty.streak")} />
          <View style={styles.statDivider} />
          <Stat value={card?.best_streak ?? 0} label={t("loyalty.best")} />
        </View>

        {nextMilestone ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <AppText style={styles.progressText}>
              {t("loyalty.progress", { total, milestone: nextMilestone.visit_count, rewardLabel: rewardLabel(nextMilestone, userCountry) })}
            </AppText>
          </View>
        ) : activeMilestones.length > 0 ? (
          <AppText style={styles.progressText}>{t("loyalty.all_rewards_unlocked")}</AppText>
        ) : null}

        {activeMilestones.length > 0 ? (
          <View style={styles.ladder}>
            {activeMilestones.map((milestone) => {
              const status = milestoneStatus(milestone, view);
              const reached = total >= milestone.visit_count;
              return (
                <View key={milestone.id} style={styles.milestoneRow}>
                  <View
                    style={[
                      styles.visitPill,
                      reached && styles.visitPillReached,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.visitPillText,
                        reached && styles.visitPillTextReached,
                      ]}
                    >
                      {milestone.visit_count}
                    </AppText>
                  </View>
                  <View style={styles.milestoneInfo}>
                    <AppText style={styles.milestoneTitle} numberOfLines={1}>
                      {milestone.reward_title}
                    </AppText>
                    <AppText style={styles.milestoneMeta} numberOfLines={1}>
                      {rewardLabel(milestone, userCountry)}
                      {milestone.reward_description
                        ? ` · ${milestone.reward_description}`
                        : ""}
                    </AppText>
                  </View>
                  <StatusBadge status={status} />
                </View>
              );
            })}
          </View>
        ) : null}

        {unlockedRewards.length > 0 ? (
          <View style={styles.availableWrap}>
            <AppText style={styles.availableTitle}>{t("loyalty.ready_to_use")}</AppText>
            {unlockedRewards.map((reward) => {
              const milestone = milestoneById.get(reward.milestone_id);
              if (!milestone) {
                return null;
              }
              return (
                <Button
                  key={reward.id}
                  title={t("loyalty.apply_to_booking", { rewardTitle: milestone.reward_title })}
                  variant="primary"
                  loading={redeemingId === reward.id}
                  disabled={redeemingId !== null}
                  onPress={() => void handleRedeem(reward)}
                />
              );
            })}
          </View>
        ) : null}
      </View>

      <BottomSheet
        visible={redeemTarget !== null}
        onClose={() => setRedeemTarget(null)}
      >
        <AppText style={styles.sheetTitle}>{t("loyalty.apply_reward")}</AppText>
        <AppText style={styles.sheetText}>
          {t("loyalty.choose_booking")}
        </AppText>
        {upcoming.map((booking) => (
          <Pressable
            key={booking.id}
            onPress={() => {
              if (redeemTarget) {
                void applyReward(redeemTarget, booking.id);
              }
            }}
            style={({ pressed }) => [
              styles.bookingRow,
              pressed && styles.bookingRowPressed,
            ]}
          >
            <View style={styles.bookingInfo}>
              <AppText style={styles.bookingName} numberOfLines={1}>
                {booking.service_name}
              </AppText>
              <AppText style={styles.bookingMeta}>
                {formatDateTime(booking.starts_at)}
              </AppText>
            </View>
            <RTLIcon name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </BottomSheet>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const statusKeyMap = {
  unlocked: "loyalty.unlocked" as const,
  redeemed: "loyalty.redeemed" as const,
  expired: "loyalty.expired" as const,
  locked: "loyalty.locked" as const,
};

function StatusBadge({
  status,
}: {
  status: "unlocked" | "redeemed" | "expired" | "locked";
}) {
  if (status === "locked") {
    return (
      <View style={[styles.badge, styles.badgeLocked]}>
        <AppText style={[styles.badgeText, styles.badgeTextLocked]}>{t(statusKeyMap.locked)}</AppText>
      </View>
    );
  }
  const tone =
    status === "unlocked"
      ? { bg: colors.successSoft, text: colors.success }
      : status === "redeemed"
        ? { bg: colors.slateSoft, text: colors.slate }
        : { bg: colors.dangerSoft, text: colors.danger };
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <AppText style={[styles.badgeText, { color: tone.text }]}>
        {t(statusKeyMap[status])}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  progressWrap: {
    gap: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  ladder: {
    gap: spacing.sm,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  visitPill: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  visitPillReached: {
    backgroundColor: colors.primary,
  },
  visitPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  visitPillTextReached: {
    color: colors.white,
  },
  milestoneInfo: {
    flex: 1,
    gap: 2,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  milestoneMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeLocked: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeTextLocked: {
    color: colors.muted,
  },
  availableWrap: {
    gap: spacing.sm,
  },
  availableTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sheetText: {
    fontSize: 14,
    color: colors.muted,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bookingRowPressed: {
    opacity: 0.8,
  },
  bookingInfo: {
    flex: 1,
    gap: 2,
  },
  bookingName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  bookingMeta: {
    fontSize: 12,
    color: colors.muted,
  },
});
