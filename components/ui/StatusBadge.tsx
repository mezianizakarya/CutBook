import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

export type StatusTone =
  | "success"
  | "danger"
  | "warning"
  | "role"
  | "neutral"
  | "slate"
  | "blue"
  | "green"
  | "cyan"
  | "violet";

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
  neutral: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  neutralLabel: {
    color: colors.muted,
  },
  slate: {
    backgroundColor: colors.slateSoft,
  },
  slateLabel: {
    color: colors.slate,
  },
  blue: {
    backgroundColor: colors.blueSoft,
  },
  blueLabel: {
    color: colors.blue,
  },
  green: {
    backgroundColor: colors.greenSoft,
  },
  greenLabel: {
    color: colors.green,
  },
  cyan: {
    backgroundColor: colors.cyanSoft,
  },
  cyanLabel: {
    color: colors.cyan,
  },
  violet: {
    backgroundColor: colors.violetSoft,
  },
  violetLabel: {
    color: colors.violet,
  },
});
