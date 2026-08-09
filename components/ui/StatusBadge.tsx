import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

export type StatusTone = "success" | "danger" | "warning" | "role";

type StatusBadgeProps = {
  label: string;
  tone: StatusTone;
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={[styles.label, styles[`${tone}Label`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  successLabel: {
    color: colors.success,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  dangerLabel: {
    color: colors.danger,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
  warningLabel: {
    color: colors.warning,
  },
  role: {
    backgroundColor: colors.primarySoft,
  },
  roleLabel: {
    color: colors.primaryDark,
  },
});
