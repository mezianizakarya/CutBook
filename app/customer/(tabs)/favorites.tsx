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

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  loadFavoriteShops,
  removeFavorite,
  type ShopSummary,
} from "@/lib/shop";
import { colors, radius, spacing } from "@/lib/theme";

export default function FavoritesScreen() {
  const { user } = useUser();
  const customerId = user?.id;
  const router = useRouter();

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
      setShops(await loadFavoriteShops(customerId));
    } catch (e) {
      setError(errorMessageFromUnknown(e));
      setShops((previous) => previous ?? []);
    }
  }, [customerId]);

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
      Alert.alert("Couldn't remove from favorites", errorMessageFromUnknown(e));
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
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>
          {count === 1 ? "1 saved shop" : `${count} saved shops`}
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
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart on any shop to save it here.
            </Text>
            <Button
              title="Discover shops"
              variant="outline"
              onPress={() => router.push("/customer/discover")}
              style={styles.discoverButton}
            />
          </View>
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
                {item.is_verified && (
                  <Ionicons name="checkmark-circle" size={13} color={colors.primaryDark} />
                )}
              </View>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.city ?? "—"}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={colors.success} />
                <Text style={styles.ratingText}>
                  {item.rating_avg != null
                    ? `${Number(item.rating_avg).toFixed(1)} (${item.rating_count ?? 0})`
                    : "New"}
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
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  heartButtonPressed: {
    opacity: 0.7,
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
  discoverButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
});
