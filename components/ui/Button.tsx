import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "@/components/AppText";


import { colors, radius, spacing } from "@/lib/theme";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger" | "dangerOutline" | "successOutline" | "blue" | "blueOutline";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const background =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "blue"
          ? colors.blue
          : "transparent";

  const labelColor =
    variant === "primary" || variant === "danger" || variant === "blue"
      ? colors.white
      : variant === "dangerOutline" || variant === "successOutline" || variant === "blueOutline"
        ? variant === "dangerOutline"
          ? colors.danger
          : variant === "successOutline"
            ? colors.success
            : colors.blue
        : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === "outline" && styles.outline,
        variant === "dangerOutline" && styles.dangerOutline,
        variant === "successOutline" && styles.successOutline,
        variant === "blueOutline" && styles.blueOutline,
        style,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <AppText style={[styles.label, { color: labelColor }]}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerOutline: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  successOutline: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  blueOutline: {
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
