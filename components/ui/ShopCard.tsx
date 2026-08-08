import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

export type ShopCardRow = {
  id: number;
  name: string;
  city: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean;
  logo_url: string | null;
};

type ShopCardProps = {
  shop: ShopCardRow;
  onPress: (shop: ShopCardRow) => void;
};

const CARD_WIDTH = 168;

export function ShopCard({ shop, onPress }: ShopCardProps) {
  return (
    <Pressable
      onPress={() => onPress(shop)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Image
        source={
          shop.logo_url
            ? { uri: shop.logo_url }
            : undefined
        }
        contentFit="cover"
        style={styles.image}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {shop.name || "—"}
          </Text>
          {shop.is_verified && (
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={colors.primaryDark}
            />
          )}
        </View>
        <Text style={styles.city} numberOfLines={1}>
          {shop.city ?? "—"}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.success} />
          <Text style={styles.rating}>
            {shop.rating_avg != null
              ? `${Number(shop.rating_avg).toFixed(1)} (${shop.rating_count ?? 0})`
              : "New"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.85,
  },
  image: {
    width: "100%",
    height: 100,
    backgroundColor: colors.primarySoft,
  },
  info: {
    padding: spacing.sm,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  city: {
    fontSize: 12,
    color: colors.muted,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rating: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
});
