import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const background =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === "outline" && styles.outline,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "danger" ? colors.white : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "outline" && styles.outlineLabel,
            variant === "ghost" && styles.ghostLabel,
          ]}
        >
          {title}
        </Text>
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
  outlineLabel: {
    color: colors.primary,
  },
  ghostLabel: {
    color: colors.primary,
  },
});
