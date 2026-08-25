import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatRating } from "@/lib/format";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { useUserCountry } from "@/lib/user-country";

type ShopInfo = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean;
  logo_url: string | null;
};

type BarberRow = {
  id: number;
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string | null;
  shops: ShopInfo | null;
};

type SortFilter = "top" | "newest";

const PAGE_SIZE = 50;

const BARBER_SELECT =
  "id, profile_id, display_name, avatar_url, joined_at, shops!inner(id, name, city, country, rating_avg, rating_count, is_verified, logo_url)";

export default function DiscoverScreen() {
  const router = useRouter();
  const userCountry = useUserCountry();
  const [barbers, setBarbers] = useState<BarberRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("top");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    let builder = supabase
      .from("shop_members")
      .select(BARBER_SELECT)
      .eq("member_role", "barber")
      .is("removed_at", null);
    if (userCountry) {
      builder = builder.eq("shops.country", userCountry);
    }
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
  }, [sortFilter, userCountry]);

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
      .is("removed_at", null);
    if (userCountry) {
      builder = builder.eq("shops.country", userCountry);
    }
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
  }, [loadingMore, hasMore, barbers?.length, sortFilter, userCountry]);

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
        <Text style={styles.title}>{t("discover.title")}</Text>
        <Text style={styles.subtitle}>
          {t("discover.stats", { barbers: barbers?.length ?? 0, cities: cityCounts.length })}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t("discover.search_barber_shop")}
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
            {t("discover.all_cities", { count: barbers?.length ?? 0 })}
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
                {sort === "top" ? t("discover.top_rated") : t("discover.newest")}
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
            <Text style={styles.emptyTitle}>{t("discover.no_barbers_found")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("discover.try_filter")}
            </Text>
            {hasActiveFilters && (
              <Button
                title={t("discover.reset_filters")}
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
                  title={t("home.load_more")}
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
            onPress={() => {
              if (!item.profile_id) {
                return;
              }
              const params = new URLSearchParams();
              if (item.shops) {
                params.set("shopId", String(item.shops.id));
                params.set("shopName", item.shops.name);
              }
              const query = params.toString();
              router.push(
                `/customer/barber/${item.profile_id}${query ? `?${query}` : ""}`
              );
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Avatar fullName={item.display_name} imageUrl={item.avatar_url} size={44} />
            <View style={styles.rowInfo}>
              <View style={styles.rowNameLine}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.display_name || "—"}
                </Text>
                {(item.shops?.is_verified ?? false) && <VerifiedIcon size={16} />}
              </View>
              <Text style={styles.rowUsername} numberOfLines={1}>
                {item.shops?.name ?? t("discover.no_shop")}
              </Text>
            </View>
            <View style={styles.rowBadges}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={colors.success} />
                <Text style={styles.ratingBadgeText}>
                  {formatRating(item.shops?.rating_avg ?? null, item.shops?.rating_count ?? null, { showCount: false })}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingHorizontal: 14,
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
    paddingEnd: 44,
  fontSize: 15,
  color: colors.text,
  backgroundColor: colors.surface,
  },
  clearButton: {
    position: "absolute",
    end: spacing.xs,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.sm,
    marginStart: 0,
    marginEnd: -14,
  },
  chipsScrollLast: {
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingEnd: 4,
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
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowUsername: {
    fontSize: 13,
    color: colors.muted,
  },
  rowBadges: {
    alignItems: "flex-end",
    gap: spacing.xs,
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
});
