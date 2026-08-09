import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

type StatCardProps = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
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
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
});
