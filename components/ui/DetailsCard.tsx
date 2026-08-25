import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { colors, radius, spacing } from "@/lib/theme";

type DetailsCardProps = {
  children: ReactNode;
};

export function DetailsCard({ children }: DetailsCardProps) {
  return <View style={styles.card}>{children}</View>;
}

type DetailRowProps = {
  label: string;
  value: string;
  numberOfLines?: number;
  labelWidth?: number;
  action?: ReactNode;
  onPress?: () => void;
};

export function DetailRow({
  label,
  value,
  numberOfLines = 1,
  labelWidth = 90,
  action,
  onPress,
}: DetailRowProps) {
  const content = (
    <>
      <AppText style={[styles.label, { width: labelWidth }]}>{label}</AppText>
      <AppText style={styles.value} numberOfLines={numberOfLines}>
        {value}
      </AppText>
      {action}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
});
