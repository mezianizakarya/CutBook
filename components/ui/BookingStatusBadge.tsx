import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/theme";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

type BookingStatusBadgeProps = {
  status: BookingStatus;
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[status]]}>
      <Text style={[styles.label, styles[`${status}Label`]]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  pending: {
    backgroundColor: "#fef3c7",
  },
  pendingLabel: {
    color: "#b45309",
  },
  confirmed: {
    backgroundColor: colors.primarySoft,
  },
  confirmedLabel: {
    color: colors.primaryDark,
  },
  completed: {
    backgroundColor: "#dcfce7",
  },
  completedLabel: {
    color: colors.success,
  },
  cancelled: {
    backgroundColor: "#fee2e2",
  },
  cancelledLabel: {
    color: colors.danger,
  },
  no_show: {
    backgroundColor: "#fee2e2",
  },
  no_showLabel: {
    color: colors.danger,
  },
});
