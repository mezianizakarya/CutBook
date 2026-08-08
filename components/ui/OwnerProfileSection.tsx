import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { errorMessageFromUnknown } from "@/lib/errors";
import { loadOwnerShops, type OwnerShop } from "@/lib/owner";
import { colors, radius, spacing } from "@/lib/theme";

const STATUS_LABELS: Record<OwnerShop["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

function statusBadgeStyles(status: OwnerShop["status"]) {
  switch (status) {
    case "approved":
      return { badge: styles.badgeApproved, text: styles.badgeTextApproved };
    case "suspended":
      return { badge: styles.badgeSuspended, text: styles.badgeTextSuspended };
    default:
      return { badge: styles.badgePending, text: styles.badgeTextPending };
  }
}

export function OwnerProfileSection() {
  const { user } = useUser();
  const router = useRouter();

  const [shops, setShops] = useState<OwnerShop[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      async function load() {
        if (!user?.id) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }
        try {
          const rows = await loadOwnerShops(user.id);
          if (!cancelled) {
            setShops(rows);
          }
        } catch (e) {
          if (!cancelled) {
            setError(errorMessageFromUnknown(e));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  return (
    <View style={styles.section}>
      <SectionHeader
        title="My shops"
        actionLabel={shops && shops.length > 0 ? "Add" : undefined}
        onAction={() => router.push("/onboarding/owner-shop")}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : shops && shops.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            You don{"'"}t manage a shop yet. Create one to start taking bookings.
          </Text>
        </View>
      ) : (
        (shops ?? []).map((shop) => {
          const badge = statusBadgeStyles(shop.status);
          return (
            <View key={shop.id} style={styles.shopRow}>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <Text style={styles.shopMeta}>
                  {shop.city ?? "No city"} ·{" "}
                  {shop.myRole === "owner" ? "Owner" : "Manager"}
                </Text>
              </View>
              <View style={[styles.badge, badge.badge]}>
                <Text style={[styles.badgeText, badge.text]}>
                  {STATUS_LABELS[shop.status]}
                </Text>
              </View>
            </View>
          );
        })
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  loading: {
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  shopMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgePending: {
    backgroundColor: "#fef3c7",
  },
  badgeTextPending: {
    color: "#b45309",
  },
  badgeApproved: {
    backgroundColor: "#dcfce7",
  },
  badgeTextApproved: {
    color: colors.success,
  },
  badgeSuspended: {
    backgroundColor: "#fee2e2",
  },
  badgeTextSuspended: {
    color: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
