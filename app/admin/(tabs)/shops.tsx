import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { ShopAdminSheet } from "@/components/ui/ShopAdminSheet";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import {
  loadAdminShops,
  type AdminShop,
  type ShopStatus,
} from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

type StatusFilter = "all" | ShopStatus;

const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "approved", "suspended"];

function getStatusLabels(): Record<StatusFilter, string> {
  return {
    all: t("admin.all_shops"),
    pending: t("owner.pending"),
    approved: t("owner.approved"),
    suspended: t("owner.suspended"),
  };
}

function statusBadgeStyles(status: ShopStatus) {
  switch (status) {
    case "approved":
      return { badge: styles.badgeApproved, text: styles.badgeTextApproved };
    case "suspended":
      return { badge: styles.badgeSuspended, text: styles.badgeTextSuspended };
    default:
      return { badge: styles.badgePending, text: styles.badgeTextPending };
  }
}

export default function AdminShopsScreen() {
  const [shops, setShops] = useState<AdminShop[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AdminShop | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    setShops(await loadAdminShops(statusFilter, query));
  }, [statusFilter, query]);

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

  function handleUpdated(shop: AdminShop) {
    setSelected(shop);
    setShops((previous) =>
      (previous ?? []).map((row) => (row.id === shop.id ? shop : row))
    );
  }

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all" || regionFilter !== "all";

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setRegionFilter("all");
  }

  const regionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of shops ?? []) {
      const region = row.country;
      if (region) {
        counts.set(region, (counts.get(region) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shops]);

  const filteredShops = useMemo(() => {
    return (shops ?? []).filter((row) => {
      if (regionFilter !== "all" && row.country !== regionFilter) {
        return false;
      }
      return true;
    });
  }, [shops, regionFilter]);

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("tabs.shop")}</Text>
        <Text style={styles.subtitle}>
          {shops ? t("admin.shops_count", { count: shops.length }) : t("common.loading")}
        </Text>
      </View>

      {notice ? (
        <NoticeBanner notice={notice} style={styles.noticeSpacing} />
      ) : (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={t("admin.search_shops")}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("admin.clear_search")}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {getStatusLabels()[filter]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {regionCounts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.chipsScroll, { marginBottom: spacing.md }]}
          contentContainerStyle={styles.chipsRow}
        >
          <Pressable
            onPress={() => setRegionFilter("all")}
            style={[styles.chip, regionFilter === "all" && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, regionFilter === "all" && styles.chipLabelActive]}>
              {t("admin.all_regions", { count: shops?.length ?? 0 })}
            </Text>
          </Pressable>
          {regionCounts.map(([region, count]) => {
            const isActive = regionFilter === region;
            return (
              <Pressable
                key={region}
                onPress={() => setRegionFilter(isActive ? "all" : region)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                  {region} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading && !shops ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredShops}
          keyExtractor={(row) => String(row.id)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={t("admin.no_shops_found")}
              subtitle={
                hasActiveFilters
                  ? t("admin.try_different_filter")
                  : t("admin.no_shops_created")
              }
              actionLabel={hasActiveFilters ? t("admin.reset_filters") : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
            />
          }
          renderItem={({ item }) => {
            const statusStyles = statusBadgeStyles(item.status);
            return (
              <Pressable
                onPress={() => setSelected(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Avatar fullName={item.name} imageUrl={item.logo_url} size={44} />
                <View style={styles.rowInfo}>
                  <View style={styles.rowNameLine}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.is_verified && <VerifiedIcon size={16} />}
                  </View>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {item.city ?? t("owner.no_city")}{item.country ? `, ${item.country}` : ""} · {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={styles.rowBadges}>
                  <View style={statusStyles.badge}>
                    <Text style={statusStyles.text}>
                      {item.status === "approved" ? t("owner.approved") : item.status === "suspended" ? t("owner.suspended") : t("owner.pending")}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

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

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 0,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  searchContainer: {
    marginBottom: spacing.md,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  clearButton: {
    position: "absolute",
    right: spacing.xs,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
    marginRight: -14,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: 6,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  chipLabelActive: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: 98,
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
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  rowBadges: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  badgeApproved: {
    backgroundColor: "#dcfce7",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  badgeTextApproved: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
  badgeSuspended: {
    backgroundColor: "#fee2e2",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  badgeTextSuspended: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
  },
  badgePending: {
    backgroundColor: "#fef3c7",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  badgeTextPending: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b45309",
  },
});
