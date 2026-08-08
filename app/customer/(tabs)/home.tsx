import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShopCard } from "@/components/ui/ShopCard";
import { errorMessageFromUnknown } from "@/lib/errors";
import { loadShopSummaries, type ShopSummary } from "@/lib/shop";
import { colors, radius, spacing } from "@/lib/theme";

const SECTION_COUNT = 10;

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const firstName = user?.firstName;

  const [topShops, setTopShops] = useState<ShopSummary[] | null>(null);
  const [newestShops, setNewestShops] = useState<ShopSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [top, newest] = await Promise.all([
        loadShopSummaries({ order: "top", start: 0, count: SECTION_COUNT }),
        loadShopSummaries({ order: "newest", start: 0, count: SECTION_COUNT }),
      ]);
      setTopShops(top);
      setNewestShops(newest);
    } catch (e) {
      setError(errorMessageFromUnknown(e));
      setTopShops((previous) => previous ?? []);
      setNewestShops((previous) => previous ?? []);
    }
  }, []);

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

  if (loading && !topShops) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {firstName ? `Hi ${firstName},` : "Hello,"}
        </Text>
        <Text style={styles.subtitle}>
          Find a barbershop and book your next cut.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/customer/discover")}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.search,
          pressed && styles.searchPressed,
        ]}
      >
        <Ionicons name="search" size={18} color={colors.muted} />
        <Text style={styles.searchText}>Search barbers or shops</Text>
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <SectionHeader title="Top rated" />
        <ShopRail
          shops={topShops ?? []}
          loading={loading}
          onPressShop={(shop) =>
            router.push({ pathname: "/customer/shop/[id]", params: { id: shop.id } })
          }
        />

        <SectionHeader title="Newest" />
        <ShopRail
          shops={newestShops ?? []}
          loading={loading}
          onPressShop={(shop) =>
            router.push({ pathname: "/customer/shop/[id]", params: { id: shop.id } })
          }
        />
      </ScrollView>
    </Screen>
  );
}

type ShopRailProps = {
  shops: ShopSummary[];
  loading: boolean;
  onPressShop: (shop: ShopSummary) => void;
};

function ShopRail({ shops, loading, onPressShop }: ShopRailProps) {
  if (loading && shops.length === 0) {
    return (
      <View style={styles.railEmpty}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (shops.length === 0) {
    return <Text style={styles.railEmptyText}>No shops yet.</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.railScroll}
      contentContainerStyle={styles.rail}
    >
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} onPress={onPressShop} />
      ))}
    </ScrollView>
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
  search: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  searchPressed: {
    opacity: 0.8,
  },
  searchText: {
    fontSize: 15,
    color: colors.muted,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  content: {
    paddingBottom: 98,
    gap: spacing.sm,
  },
  railScroll: {
    marginRight: -14,
  },
  rail: {
    gap: spacing.sm,
    paddingRight: 4,
    marginBottom: spacing.md,
  },
  railEmpty: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  railEmptyText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.md,
  },
});
