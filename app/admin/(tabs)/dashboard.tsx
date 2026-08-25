import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import {
  loadAdminStats,
  loadRecentUsers,
  type AdminStats,
  type RecentUser,
} from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { useFormatCents } from "@/lib/format";
import { getRoleLabel } from "@/lib/roles";
import { getLocale, t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";
import { countPendingShopVerificationRequests } from "@/lib/shop-verification";
import { countPendingVerificationRequests } from "@/lib/verification";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const [pendingShopVerificationCount, setPendingShopVerificationCount] =
    useState(0);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notice } = useNotice();
  const formattedRevenue = useFormatCents(stats?.monthRevenueCents ?? null);

  const load = useCallback(async () => {
    setError(null);
    const [statsResult, verificationCount, shopVerificationCount, recentResult] =
      await Promise.all([
        loadAdminStats(),
        countPendingVerificationRequests(),
        countPendingShopVerificationRequests(),
        loadRecentUsers(6),
      ]);
    setStats(statsResult);
    setPendingVerificationCount(verificationCount);
    setPendingShopVerificationCount(shopVerificationCount);
    setRecentUsers(recentResult);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch((e) => {
          if (!cancelled) {
            setError(errorMessageFromUnknown(e));
          }
        })
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

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setRefreshing(false);
    }
  }

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(getLocale(), {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    []
  );

  if (loading && !stats) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen paddingHorizontal={14} style={styles.screenPadding}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("tabs.dashboard")}</Text>
          <Text style={styles.subtitle}>{dateLabel}</Text>
        </View>

        {notice ? <NoticeBanner notice={notice} style={styles.noticeSpacing} /> : null}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {!!stats && (
          <>
            <View style={styles.statsRow}>
              <StatCard label={t("tabs.users")} value={String(stats.activeUsers)} />
              <StatCard label={t("roles.barber")} value={String(stats.barbers)} />
              <StatCard label={t("roles.owner")} value={String(stats.owners)} />
              <StatCard label={t("tabs.shop")} value={String(stats.shops)} />
            </View>
            <View style={styles.statsRow}>
              <StatCard label={t("status.pending")} value={String(stats.pendingShops)} />
              <StatCard label={t("staff.today")} value={String(stats.todayBookings)} />
              <StatCard label={t("staff.revenue")} value={formattedRevenue} />
            </View>
          </>
        )}

        <Pressable
          onPress={() => router.push("/admin/pending-shops")}
          style={({ pressed }) => [styles.reviewCard, pressed && styles.reviewCardPressed]}
        >
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewTitle}>{t("admin.pending_approvals")}</Text>
            <Text style={styles.reviewSubtitle}>{t("admin.shops_waiting_approval")}</Text>
          </View>
          <View style={styles.reviewCount}>
            <Text style={styles.reviewCountText}>{stats?.pendingShops ?? 0}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/admin/pending-verifications")}
          style={({ pressed }) => [styles.reviewCard, pressed && styles.reviewCardPressed]}
        >
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewTitle}>{t("admin.barber_verification")}</Text>
            <Text style={styles.reviewSubtitle}>{t("admin.barbers_owners_verify")}</Text>
          </View>
          <View style={styles.reviewCount}>
            <Text style={styles.reviewCountText}>{pendingVerificationCount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/admin/pending-shop-verifications")}
          style={({ pressed }) => [styles.reviewCard, pressed && styles.reviewCardPressed]}
        >
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewTitle}>{t("admin.shop_verification")}</Text>
            <Text style={styles.reviewSubtitle}>{t("admin.shops_waiting_verified")}</Text>
          </View>
          <View style={styles.reviewCount}>
            <Text style={styles.reviewCountText}>{pendingShopVerificationCount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <SectionHeader title={t("admin.recent_signups")} />
        {recentUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t("admin.no_recent_signups")}</Text>
          </View>
        ) : (
          recentUsers.map((user) => (
            <View key={user.id} style={styles.row}>
              <Avatar fullName={fullName(user)} imageUrl={user.avatar_url} size={44} />
              <View style={styles.rowInfo}>
                <View style={styles.rowNameLine}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {fullName(user)}
                  </Text>
                  {user.is_verified && <VerifiedIcon size={16} />}
                </View>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {user.email ?? t("admin.no_email")}
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {user.role ? getRoleLabel(user.role) : "—"}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function fullName(user: RecentUser): string {
  const name = [user.first_name ?? "", user.last_name ?? ""]
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();
  return name || "—";
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: 98,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  noticeSpacing: {
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  reviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewCardPressed: {
    opacity: 0.8,
  },
  reviewInfo: {
    flex: 1,
    gap: 2,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  reviewSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  reviewCount: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  roleBadge: {
    backgroundColor: "#fef3c7",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b45309",
  },
});
