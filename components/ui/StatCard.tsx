import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

type StatCardProps = {
  label: string;
  value: string;
  accent?: boolean;
};

export function StatCard({ label, value, accent = false }: StatCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      <Text style={[styles.label, accent && styles.labelAccent]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
  },
  cardAccent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  valueAccent: {
    color: colors.white,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  labelAccent: {
    color: "rgba(255, 255, 255, 0.8)",
  },
});
