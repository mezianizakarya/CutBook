import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDateTime } from "@/lib/format";
import {
  loadCustomerLoyalty,
  redeemReward,
  type CustomerLoyaltyView,
  type CustomerReward,
  type LoyaltyMilestone,
} from "@/lib/loyalty";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";

type RedeemBooking = {
  id: number;
  starts_at: string;
  service_name: string;
};

type ShopLoyaltyCardProps = {
  shopId: number;
  customerId: string;
};

function rewardLabel(milestone: LoyaltyMilestone): string {
  if (milestone.reward_type === "percentage_discount") {
    return `${milestone.reward_value}% off`;
  }
  if (milestone.reward_type === "fixed_discount") {
    return `${formatCents(Math.round((milestone.reward_value ?? 0) * 100))} off`;
  }
  if (milestone.reward_type === "free_service") {
    return "Free service";
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
        "No upcoming booking",
        "You can apply this reward when you have an upcoming booking at this shop."
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
      Alert.alert("Reward applied", "Your reward has been applied to this booking.");
      await load();
    } catch (e) {
      Alert.alert("Couldn't apply reward", errorMessageFromUnknown(e));
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Loyalty</Text>
            <Text style={styles.subtitle}>Earn a visit with every completed cut.</Text>
          </View>
          <Ionicons name="pricetags" size={22} color={colors.primaryDark} />
        </View>

        <View style={styles.statsRow}>
          <Stat value={total} label="Visits" />
          <View style={styles.statDivider} />
          <Stat value={card?.current_streak ?? 0} label="Streak" />
          <View style={styles.statDivider} />
          <Stat value={card?.best_streak ?? 0} label="Best" />
        </View>

        {nextMilestone ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {total} of {nextMilestone.visit_count} visits ·{" "}
              {rewardLabel(nextMilestone)}
            </Text>
          </View>
        ) : activeMilestones.length > 0 ? (
          <Text style={styles.progressText}>All rewards unlocked — thank you!</Text>
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
                    <Text
                      style={[
                        styles.visitPillText,
                        reached && styles.visitPillTextReached,
                      ]}
                    >
                      {milestone.visit_count}
                    </Text>
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle} numberOfLines={1}>
                      {milestone.reward_title}
                    </Text>
                    <Text style={styles.milestoneMeta} numberOfLines={1}>
                      {rewardLabel(milestone)}
                      {milestone.reward_description
                        ? ` · ${milestone.reward_description}`
                        : ""}
                    </Text>
                  </View>
                  <StatusBadge status={status} />
                </View>
              );
            })}
          </View>
        ) : null}

        {unlockedRewards.length > 0 ? (
          <View style={styles.availableWrap}>
            <Text style={styles.availableTitle}>Ready to use</Text>
            {unlockedRewards.map((reward) => {
              const milestone = milestoneById.get(reward.milestone_id);
              if (!milestone) {
                return null;
              }
              return (
                <Button
                  key={reward.id}
                  title={`Apply ${milestone.reward_title}`}
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
        <Text style={styles.sheetTitle}>Apply reward</Text>
        <Text style={styles.sheetText}>
          Choose the booking to apply this reward to.
        </Text>
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
              <Text style={styles.bookingName} numberOfLines={1}>
                {booking.service_name}
              </Text>
              <Text style={styles.bookingMeta}>
                {formatDateTime(booking.starts_at)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </BottomSheet>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status: "unlocked" | "redeemed" | "expired" | "locked";
}) {
  if (status === "locked") {
    return (
      <View style={[styles.badge, styles.badgeLocked]}>
        <Text style={[styles.badgeText, styles.badgeTextLocked]}>Locked</Text>
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
      <Text style={[styles.badgeText, { color: tone.text }]}>
        {status[0].toUpperCase() + status.slice(1)}
      </Text>
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
