import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ShopAdminSheet } from "@/components/ui/ShopAdminSheet";
import {
  loadAdminShops,
  type AdminShop,
  type ShopStatus,
} from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";

type StatusFilter = "all" | ShopStatus;

const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "approved", "suspended"];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All shops",
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

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
  const [selected, setSelected] = useState<AdminShop | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    tone: "danger" | "success" | "role";
  } | null>(null);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(message: string, tone: "danger" | "success" | "role") {
    setNotice({ message, tone });
    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
    }
    noticeTimeout.current = setTimeout(() => setNotice(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (noticeTimeout.current) {
        clearTimeout(noticeTimeout.current);
      }
    };
  }, []);

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

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all";

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>Shops</Text>
        <Text style={styles.subtitle}>
          {shops ? `${shops.length} shops` : "Loading…"}
        </Text>
      </View>

      {notice ? (
        <View
          style={[
            styles.notice,
            notice.tone === "danger"
              ? styles.noticeDanger
              : notice.tone === "role"
                ? styles.noticeRole
                : styles.noticeSuccess,
          ]}
        >
          <Text
            style={[
              styles.noticeText,
              notice.tone === "danger"
                ? styles.noticeTextDanger
                : notice.tone === "role"
                  ? styles.noticeTextRole
                  : styles.noticeTextSuccess,
            ]}
          >
            {notice.message}
          </Text>
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search shops"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
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
                {STATUS_LABELS[filter]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading && !shops ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={shops ?? []}
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
              title="No shops found"
              subtitle={
                hasActiveFilters
                  ? "Try a different search or filter."
                  : "No shops have been created yet."
              }
              actionLabel={hasActiveFilters ? "Reset filters" : undefined}
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
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {item.city ?? "No city"} · {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={styles.rowBadges}>
                  <View style={statusStyles.badge}>
                    <Text style={statusStyles.text}>
                      {item.status === "approved" ? "Approved" : item.status === "suspended" ? "Suspended" : "Pending"}
                    </Text>
                  </View>
                  {item.is_verified && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primaryDark} />
                  )}
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
  notice: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  noticeSuccess: {
    backgroundColor: "#dcfce7",
    borderColor: colors.success,
  },
  noticeDanger: {
    backgroundColor: "#fee2e2",
    borderColor: colors.danger,
  },
  noticeRole: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDark,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeTextSuccess: {
    color: colors.success,
  },
  noticeTextDanger: {
    color: colors.danger,
  },
  noticeTextRole: {
    color: colors.primaryDark,
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
