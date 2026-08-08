import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import {
  BookingStatusBadge,
  type BookingStatus,
} from "@/components/ui/BookingStatusBadge";
import { formatCents, formatDateTime } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";

export type BookingCardRow = {
  id: number;
  status: BookingStatus;
  starts_at: string;
  service_name: string;
  service_price_cents: number;
  shop: { id: number; name: string; logo_url: string | null } | null;
  staff: { id: number; display_name: string; avatar_url: string | null } | null;
};

type BookingCardProps = {
  booking: BookingCardRow;
  onPress: (booking: BookingCardRow) => void;
};

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const staffName = booking.staff?.display_name ?? "—";
  const shopName = booking.shop?.name ?? "—";
  const subtitle =
    staffName === "—" && shopName === "—"
      ? "—"
      : `${staffName !== "—" ? staffName : ""}${staffName !== "—" && shopName !== "—" ? " · " : ""}${shopName !== "—" ? shopName : ""}`;

  return (
    <Pressable
      onPress={() => onPress(booking)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar
        fullName={staffName}
        imageUrl={booking.staff?.avatar_url ?? booking.shop?.logo_url}
        size={44}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {booking.service_name || "—"}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <Text style={styles.time} numberOfLines={1}>
          {formatDateTime(booking.starts_at)}
        </Text>
      </View>
      <View style={styles.trailing}>
        <BookingStatusBadge status={booking.status} />
        <Text style={styles.price}>{formatCents(booking.service_price_cents)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.8,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  time: {
    fontSize: 12,
    color: colors.muted,
  },
  trailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
});
