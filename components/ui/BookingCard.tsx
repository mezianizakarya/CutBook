import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Avatar } from "@/components/ui/Avatar";
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge";
import type { BookingCardRow } from "@/lib/booking";
import { formatDateTime, useFormatCents } from "@/lib/format";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

type BookingCardProps = {
  booking: BookingCardRow;
  onPress: (booking: BookingCardRow) => void;
};

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const formattedPrice = useFormatCents(booking.service_price_cents);
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
        <AppText style={styles.name} numberOfLines={1}>
          {booking.service_name || "—"}
        </AppText>
        <AppText style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </AppText>
        <AppText style={styles.time} numberOfLines={1}>
          {formatDateTime(booking.starts_at)}
        </AppText>
        {booking.applied_reward_title ? (
          <View style={styles.rewardBadge}>
            <AppText style={styles.rewardBadgeText} numberOfLines={1}>
              {t("shop.applied", { title: booking.applied_reward_title })}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.trailing}>
        <BookingStatusBadge status={booking.status} />
        <AppText style={styles.price}>{formattedPrice}</AppText>
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
  rewardBadge: {
    marginTop: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
  },
  rewardBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
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
