import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { errorMessageFromUnknown } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ShopInfo = {
  id: number;
  name: string;
  city: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean;
  logo_url: string | null;
};

type BarberRow = {
  id: number;
  display_name: string;
  avatar_url: string | null;
  joined_at: string | null;
  shops: ShopInfo | null;
};

type SortFilter = "top" | "newest";

const PAGE_SIZE = 50;

const BARBER_SELECT =
  "id, display_name, avatar_url, joined_at, shops(id, name, city, rating_avg, rating_count, is_verified, logo_url)";

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DiscoverScreen() {
  const [barbers, setBarbers] = useState<BarberRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("top");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<BarberRow | null>(null);

  const load = useCallback(async () => {
    setError(null);
    let builder = supabase
      .from("shop_members")
      .select(BARBER_SELECT)
      .eq("member_role", "barber")
      .is("removed_at", null)
      .not("shops.id", "is", null);
    if (sortFilter === "newest") {
      builder = builder.order("joined_at", { ascending: false });
    } else {
      builder = builder.order("rating_avg", {
        foreignTable: "shops",
        ascending: false,
      });
    }
    const { data, error } = await builder.range(0, PAGE_SIZE - 1);
    if (error) {
      setError(errorMessageFromUnknown(error));
      setBarbers((previous) => previous ?? []);
      return;
    }
    const rows = (data ?? []) as unknown as BarberRow[];
    setBarbers(rows);
    setHasMore(rows.length === PAGE_SIZE);
  }, [sortFilter]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    const start = barbers?.length ?? 0;
    let builder = supabase
      .from("shop_members")
      .select(BARBER_SELECT)
      .eq("member_role", "barber")
      .is("removed_at", null)
      .not("shops.id", "is", null);
    if (sortFilter === "newest") {
      builder = builder.order("joined_at", { ascending: false });
    } else {
      builder = builder.order("rating_avg", {
        foreignTable: "shops",
        ascending: false,
      });
    }
    const { data, error } = await builder.range(start, start + PAGE_SIZE - 1);
    if (error) {
      setError(errorMessageFromUnknown(error));
    } else {
      const rows = (data ?? []) as unknown as BarberRow[];
      setBarbers((previous) => {
        const existing = new Set((previous ?? []).map((row) => row.id));
        return [
          ...(previous ?? []),
          ...rows.filter((row) => !existing.has(row.id)),
        ];
      });
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, barbers?.length, sortFilter]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load().finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of barbers ?? []) {
      const city = row.shops?.city;
      if (city) {
        counts.set(city, (counts.get(city) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [barbers]);

  const filtered = useMemo(() => {
    const rows = barbers ?? [];
    const q = query.trim().toLowerCase();
    const matched = rows.filter((row) => {
      if (cityFilter !== "all" && row.shops?.city !== cityFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.display_name.toLowerCase().includes(q) ||
        row.shops?.name.toLowerCase().includes(q)
      );
    });
    return matched;
  }, [barbers, query, cityFilter]);

  const hasActiveFilters =
    query.trim() !== "" || cityFilter !== "all";

  function resetFilters() {
    setQuery("");
    setCityFilter("all");
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading && !barbers) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>
          {barbers?.length ?? 0} barbers · {cityCounts.length} cities
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search barber or shop"
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        <Pressable
          onPress={() => setCityFilter("all")}
          style={[styles.chip, cityFilter === "all" && styles.chipActive]}
        >
          <Text
            style={[
              styles.chipLabel,
              cityFilter === "all" && styles.chipLabelActive,
            ]}
          >
            All cities ({barbers?.length ?? 0})
          </Text>
        </Pressable>
        {cityCounts.map(([city, count]) => {
          const isActive = cityFilter === city;
          return (
            <Pressable
              key={city}
              onPress={() => setCityFilter(isActive ? "all" : city)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {city} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.chipsScroll, styles.chipsScrollLast]}
        contentContainerStyle={styles.chipsRow}
      >
        {(["top", "newest"] as SortFilter[]).map((sort) => {
          const isActive = sortFilter === sort;
          return (
            <Pressable
              key={sort}
              onPress={() => setSortFilter(sort)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {sort === "top" ? "Top rated" : "Newest"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        style={styles.list}
        data={filtered}
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
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No barbers found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search or filter.
            </Text>
            {hasActiveFilters && (
              <Button
                title="Reset filters"
                variant="outline"
                onPress={resetFilters}
                style={styles.resetButton}
              />
            )}
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.listFooter}>
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Button
                  title="Load more"
                  variant="outline"
                  onPress={loadMore}
                  style={styles.loadMoreButton}
                />
              )}
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Avatar
              fullName={item.display_name}
              imageUrl={item.avatar_url}
              size={44}
            />
            <View style={styles.rowInfo}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.display_name || "—"}
              </Text>
              <Text style={styles.rowUsername} numberOfLines={1}>
                {item.shops?.name ?? "No shop"}
              </Text>
            </View>
            <View style={styles.rowBadges}>
              {item.shops?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.primaryDark} />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              )}
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={colors.success} />
                <Text style={styles.ratingBadgeText}>
                  {item.shops?.rating_avg != null
                    ? Number(item.shops.rating_avg).toFixed(1)
                    : "New"}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setSelected(null)}
      >
        {!!selected && (
          <BarberSheet
            row={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>
    </Screen>
  );
}

type BarberSheetProps = {
  row: BarberRow;
  onClose: () => void;
};

function BarberSheet({ row, onClose }: BarberSheetProps) {
  const insets = useSafeAreaInsets();
  const { translateY, panResponder } = useSheetDrag(onClose);

  return (
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable onPress={() => undefined}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              transform: [{ translateY }],
              paddingBottom: spacing.xl + insets.bottom,
            },
          ]}
        >
          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>
          <View style={styles.modalHeader}>
            <Avatar
              fullName={row.display_name}
              imageUrl={row.avatar_url}
              size={48}
            />
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalName} numberOfLines={1}>
                {row.display_name || "—"}
              </Text>
              <Text style={styles.modalUsername} numberOfLines={1}>
                {row.shops?.name ?? "No shop"}
              </Text>
            </View>
            {row.shops?.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.primaryDark} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Shop</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {row.shops?.name ?? "—"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {row.shops?.city ?? "—"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>
                {row.shops?.rating_avg != null
                  ? `${Number(row.shops.rating_avg).toFixed(1)} · ${row.shops.rating_count ?? 0} reviews`
                  : "No reviews yet"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Barber since</Text>
              <Text style={styles.detailValue}>
                {formatDate(row.joined_at)}
              </Text>
            </View>
          </View>

          <Button
            title="Close"
            onPress={onClose}
            variant="outline"
            style={styles.cancelButton}
          />
        </Animated.View>
      </Pressable>
    </Pressable>
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
    marginBottom: spacing.sm,
    marginLeft: 0,
    marginRight: -14,
  },
  chipsScrollLast: {
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: 4,
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
  rowUsername: {
    fontSize: 13,
    color: colors.muted,
  },
  rowBadges: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.primarySoft,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#dcfce7",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
  empty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
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
  resetButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  listFooter: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  loadMoreButton: {
    backgroundColor: colors.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dragHandleArea: {
    alignSelf: "center",
    marginTop: -spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  modalHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  modalName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  modalUsername: {
    fontSize: 13,
    color: colors.muted,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailLabel: {
    width: 110,
    fontSize: 13,
    color: colors.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  cancelButton: {
    backgroundColor: colors.surface,
  },
});
