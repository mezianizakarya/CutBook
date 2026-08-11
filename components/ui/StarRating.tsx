import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, spacing } from "@/lib/theme";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  filledColor?: string;
};

/**
 * Five-star rating. Interactive when `onChange` is provided, otherwise a
 * read-only display row. Half steps are not supported; integer ratings only.
 */
export function StarRating({
  value,
  onChange,
  size = 16,
  filledColor = colors.success,
}: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, index) => index + 1);
  return (
    <View style={styles.row} accessibilityRole={onChange ? "adjustable" : "image"}>
      {stars.map((star) => {
        const filled = star <= value;
        const icon = (
          <Ionicons
            name={filled ? "star" : "star-outline"}
            size={size}
            color={filled ? filledColor : colors.border}
          />
        );
        if (!onChange) {
          return <View key={star}>{icon}</View>;
        }
        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
