import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { avatarColor } from "@/lib/avatar";
import { formatRating } from "@/lib/format";
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
      <View style={styles.image}>
        {shop.logo_url ? (
          <Image
            source={{ uri: shop.logo_url }}
            contentFit="cover"
            style={styles.imageFill}
          />
        ) : (
          <View
            style={[
              styles.imageFill,
              styles.imageFallback,
              { backgroundColor: avatarColor(shop.name) },
            ]}
          >
            <AppText style={styles.imageLetter}>
              {shop.name.charAt(0).toUpperCase()}
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <AppText style={styles.name} numberOfLines={1}>
            {shop.name || "—"}
          </AppText>
          {shop.is_verified && <VerifiedIcon size={16} />}
        </View>
        <AppText style={styles.city} numberOfLines={1}>
          {shop.city ?? "—"}
        </AppText>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.success} />
          <AppText style={styles.rating}>
            {formatRating(shop.rating_avg, shop.rating_count)}
          </AppText>
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
  imageFill: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageLetter: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.primary,
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
