import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatRating } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  loadFavoriteShops,
  removeFavorite,
  type ShopSummary,
} from "@/lib/shop";
import { colors, radius, spacing } from "@/lib/theme";
import { useUserCountry } from "@/lib/user-country";

export default function FavoritesScreen() {
  const { user } = useUser();
  const customerId = user?.id;
  const router = useRouter();
  const userCountry = useUserCountry();

  const [shops, setShops] = useState<ShopSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!customerId) {
      return;
    }
    setError(null);
    try {
      setShops(await loadFavoriteShops(customerId, userCountry));
    } catch (e) {
      setError(errorMessageFromUnknown(e));
      setShops((previous) => previous ?? []);
    }
  }, [customerId, userCountry]);

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

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleRemove(shop: ShopSummary) {
    if (!customerId || removingIds.has(shop.id)) {
      return;
    }
    setRemovingIds((previous) => new Set(previous).add(shop.id));
    try {
      await removeFavorite(customerId, shop.id);
      setShops((previous) =>
        (previous ?? []).filter((row) => row.id !== shop.id)
      );
    } catch (e) {
      Alert.alert(t("favorites.could_not_remove"), errorMessageFromUnknown(e));
    } finally {
      setRemovingIds((previous) => {
        const next = new Set(previous);
        next.delete(shop.id);
        return next;
      });
    }
  }

  if (loading && !shops) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const count = shops?.length ?? 0;

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("favorites.title")}</Text>
        <Text style={styles.subtitle}>
          {count === 1 ? t("favorites.one_saved_shop") : t("favorites.shop_count", { count })}
        </Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        style={styles.list}
        data={shops}
        keyExtractor={(row) => String(row.id)}
        showsVerticalScrollIndicator={false}
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
            title={t("favorites.no_favorites")}
            subtitle={t("favorites.tap_heart")}
            actionLabel={t("favorites.discover_shops")}
            onAction={() => router.push("/customer/discover")}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/customer/shop/[id]", params: { id: item.id } })
            }
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Image
              source={item.logo_url ? { uri: item.logo_url } : undefined}
              contentFit="cover"
              style={styles.logo}
            />
            <View style={styles.rowInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name || "—"}
                </Text>
                {item.is_verified && <VerifiedIcon size={16} />}
              </View>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.city ?? "—"}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={colors.success} />
                <Text style={styles.ratingText}>
                  {formatRating(item.rating_avg, item.rating_count)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleRemove(item)}
              disabled={removingIds.has(item.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name} from favorites`}
              style={({ pressed }) => [
                styles.heartButton,
                pressed && styles.heartButtonPressed,
              ]}
            >
              <Ionicons name="heart" size={20} color={colors.danger} />
            </Pressable>
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
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heartButtonPressed: {
    opacity: 0.7,
  },
});
