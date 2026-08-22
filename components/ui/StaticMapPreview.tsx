import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { NativeMap } from "@/components/ui/NativeMap";
import { colors, radius, spacing } from "@/lib/theme";

type StaticMapPreviewProps = {
  latitude: number;
  longitude: number;
  height?: number;
  onPress?: () => void;
  style?: ViewStyle;
};

export function StaticMapPreview({
  latitude,
  longitude,
  height = 140,
  onPress,
  style,
}: StaticMapPreviewProps) {
  const map = (
    <View
      style={[styles.wrap, { height }, style]}
      accessibilityLabel="Map preview"
    >
      <NativeMap
        latitude={latitude}
        longitude={longitude}
        zoom={15}
        markers={[
          { id: "pin", latitude, longitude },
        ]}
        style={StyleSheet.absoluteFillObject}
      />
      {onPress ? (
        <View style={styles.expandBadge}>
          <Ionicons name="expand-outline" size={12} color={colors.text} />
          <Text style={styles.expandText}>Tap to change</Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return map;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open map"
      style={({ pressed }) => pressed && styles.pressed}
    >
      {map}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginTop: -spacing.xs,
  },
  expandBadge: {
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  expandText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
});
