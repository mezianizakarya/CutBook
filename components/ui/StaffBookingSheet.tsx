import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import {
  BookingStatusBadge,
  type BookingStatus,
} from "@/components/ui/BookingStatusBadge";
import { Button } from "@/components/ui/Button";
import {
  cancelBooking,
  customerDisplayName,
  setBookingStatus,
  type BookingCustomer,
  type BookingRow,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDateTime } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";
import { useSheetDrag } from "@/lib/useSheetDrag";

type StaffBookingSheetProps = {
  row: BookingRow;
  customer: BookingCustomer | null;
  onClose: () => void;
  onUpdated: (updated: BookingRow) => void;
  onNotice: (message: string, tone: "success" | "danger") => void;
};

function nextPrimaryTransition(status: BookingStatus): "confirmed" | "completed" | null {
  if (status === "pending") {
    return "confirmed";
  }
  if (status === "confirmed") {
    return "completed";
  }
  return null;
}

export function StaffBookingSheet({
  row,
  customer,
  onClose,
  onUpdated,
  onNotice,
}: StaffBookingSheetProps) {
  const insets = useSafeAreaInsets();
  const { translateY, panResponder } = useSheetDrag(onClose);
  const [current, setCurrent] = useState(row);
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const {
    count: confirmCount,
    start: startCountdown,
    cancel: cancelCountdown,
  } = useConfirmCountdown({
    onExpire: () => setConfirmingCancel(false),
  });

  useEffect(() => {
    setCurrent(row);
  }, [row]);

  async function handleStatusChange(status: "confirmed" | "completed" | "no_show") {
    setBusy(true);
    try {
      const updated = await setBookingStatus(current.id, status);
      setCurrent(updated);
      onUpdated(updated);
      const message =
        status === "confirmed"
          ? "Booking confirmed"
          : status === "completed"
            ? "Booking marked complete"
            : "Booking marked as no-show";
      onNotice(message, status === "no_show" ? "danger" : "success");
    } catch (e) {
      Alert.alert("Couldn't update booking", errorMessageFromUnknown(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setConfirmingCancel(false);
    cancelCountdown();
    setCancelling(true);
    try {
      const updated = await cancelBooking(current.id);
      setCurrent(updated);
      onUpdated(updated);
      onNotice("Booking cancelled", "danger");
      onClose();
    } catch (e) {
      Alert.alert("Couldn't cancel booking", errorMessageFromUnknown(e));
      setCancelling(false);
    }
  }

  function handleCancelPress() {
    if (confirmingCancel) {
      void handleCancel();
    } else {
      setConfirmingCancel(true);
      startCountdown();
    }
  }

  const name = customerDisplayName(customer);
  const subtitle =
    customer?.phone || customer?.email || current.shop?.name || "—";
  const primary = nextPrimaryTransition(current.status);
  const cancellable =
    current.status === "pending" || current.status === "confirmed";
  const showNoShow = current.status === "confirmed";

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable onPress={() => undefined}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY }],
              paddingBottom: spacing.xl + insets.bottom,
            },
          ]}
        >
          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
            <Avatar
              fullName={name}
              imageUrl={customer?.avatar_url}
              size={48}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            <BookingStatusBadge status={current.status} />
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {current.service_name || "—"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>When</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(current.starts_at)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {current.service_duration_minutes} min
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Shop</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {current.shop?.name ?? "—"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                {formatCents(current.service_price_cents)}
              </Text>
            </View>
            {!!customer?.phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{customer.phone}</Text>
              </View>
            )}
            {!!customer?.email && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {customer.email}
                </Text>
              </View>
            )}
            {!!current.note && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Note</Text>
                <Text style={styles.detailValue}>{current.note}</Text>
              </View>
            )}
            {!!current.cancel_reason && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason</Text>
                <Text style={styles.detailValue}>{current.cancel_reason}</Text>
              </View>
            )}
          </View>

          {primary === "confirmed" && (
            <Button
              title="Confirm booking"
              variant="primary"
              loading={busy}
              disabled={busy}
              onPress={() => void handleStatusChange("confirmed")}
            />
          )}
          {primary === "completed" && (
            <Button
              title="Mark complete"
              variant="successOutline"
              loading={busy}
              disabled={busy}
              onPress={() => void handleStatusChange("completed")}
            />
          )}
          {showNoShow && (
            <Button
              title="Mark as no-show"
              variant="dangerOutline"
              loading={busy}
              disabled={busy}
              onPress={() => void handleStatusChange("no_show")}
            />
          )}
          {cancellable && (
            <Button
              title={
                confirmingCancel ? `Confirm cancel (${confirmCount})` : "Cancel booking"
              }
              onPress={handleCancelPress}
              variant={confirmingCancel ? "danger" : "dangerOutline"}
              loading={cancelling}
              disabled={busy || cancelling}
            />
          )}
          <Button
            title="Close"
            variant="outline"
            onPress={() => {
              if (confirmingCancel) {
                setConfirmingCancel(false);
                cancelCountdown();
                return;
              }
              onClose();
            }}
            style={styles.closeButton}
          />
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dragHandleArea: {
    alignSelf: "center",
    marginTop: -spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailLabel: {
    width: 62,
    fontSize: 13,
    color: colors.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  closeButton: {
    backgroundColor: colors.surface,
  },
});
