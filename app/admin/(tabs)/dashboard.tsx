import { useFocusEffect } from "expo-router";
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
import { Button } from "@/components/ui/Button";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShopAdminSheet } from "@/components/ui/ShopAdminSheet";
import { StatCard } from "@/components/ui/StatCard";
import {
  loadAdminShops,
  loadAdminStats,
  loadRecentUsers,
  updateShopFields,
  type AdminShop,
  type AdminStats,
  type RecentUser,
} from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingShops, setPendingShops] = useState<AdminShop[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminShop | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    const [statsResult, pendingResult, recentResult] = await Promise.all([
      loadAdminStats(),
      loadAdminShops("pending"),
      loadRecentUsers(6),
    ]);
    setStats(statsResult);
    setPendingShops(pendingResult);
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

  async function quickApprove(shop: AdminShop) {
    setApprovingId(shop.id);
    try {
      await updateShopFields(shop.id, { status: "approved" });
      const updated = { ...shop, status: "approved" as const };
      setPendingShops((previous) => previous.filter((row) => row.id !== shop.id));
      setSelected((previous) => (previous && previous.id === shop.id ? updated : previous));
      setStats((previous) =>
        previous
          ? { ...previous, pendingShops: Math.max(0, previous.pendingShops - 1) }
          : previous
      );
      showNotice(`${shop.name} approved`, "success");
    } catch (e) {
      showNotice(errorMessageFromUnknown(e), "danger");
    } finally {
      setApprovingId(null);
    }
  }

  function handleUpdated(shop: AdminShop) {
    setSelected(shop);
    if (shop.status !== "pending") {
      setPendingShops((previous) => previous.filter((row) => row.id !== shop.id));
      setStats((previous) =>
        previous
          ? { ...previous, pendingShops: Math.max(0, previous.pendingShops - 1) }
          : previous
      );
    }
  }

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
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
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{dateLabel}</Text>
        </View>

        {notice ? <NoticeBanner notice={notice} style={styles.noticeSpacing} /> : null}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {!!stats && (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Users" value={String(stats.activeUsers)} />
              <StatCard label="Barbers" value={String(stats.barbers)} />
              <StatCard label="Owners" value={String(stats.owners)} />
              <StatCard label="Shops" value={String(stats.shops)} />
            </View>
            <View style={styles.statsRow}>
              <StatCard label="Pending" value={String(stats.pendingShops)} />
              <StatCard label="Today" value={String(stats.todayBookings)} />
              <StatCard label="Revenue" value={formatCents(stats.monthRevenueCents)} />
            </View>
          </>
        )}

        <SectionHeader
          title="Pending approvals"
          actionLabel={
            pendingShops.length > 0
              ? `${pendingShops.length} waiting`
              : undefined
          }
        />
        {pendingShops.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing to review</Text>
            <Text style={styles.emptySubtitle}>
              No shops are waiting for approval right now.
            </Text>
          </View>
        ) : (
          pendingShops.map((shop) => (
            <Pressable
              key={shop.id}
              onPress={() => setSelected(shop)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Avatar fullName={shop.name} imageUrl={shop.logo_url} size={44} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {shop.city ?? "No city"} · {formatDate(shop.created_at)}
                </Text>
              </View>
              <Button
                title="Approve"
                variant="successOutline"
                loading={approvingId === shop.id}
                disabled={approvingId !== null}
                onPress={() => void quickApprove(shop)}
                style={styles.approveButton}
              />
            </Pressable>
          ))
        )}

        <SectionHeader title="Recent signups" />
        {recentUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No recent signups</Text>
          </View>
        ) : (
          recentUsers.map((user) => (
            <View key={user.id} style={styles.row}>
              <Avatar
                fullName={fullName(user)}
                imageUrl={user.avatar_url}
                size={44}
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {fullName(user)}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {user.email ?? "No email"}
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {user.role ? ROLE_LABELS[user.role] : "—"}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {!!selected && (
        <ShopAdminSheet
          key={selected.id}
          shop={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onNotice={showNotice}
        />
      )}
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
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
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
  rowPressed: {
    opacity: 0.8,
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
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  approveButton: {
    height: 36,
    paddingHorizontal: spacing.md,
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
