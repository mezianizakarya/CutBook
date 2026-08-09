import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import {
  BookingStatusBadge,
  type BookingStatus,
} from "@/components/ui/BookingStatusBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { DetailRow, DetailsCard } from "@/components/ui/DetailsCard";
import {
  cancelBooking,
  customerDisplayName,
  setBookingStatus,
  type BookingCustomer,
  type BookingRow,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDateTime } from "@/lib/format";
import { colors, spacing } from "@/lib/theme";
import { useConfirmAction } from "@/lib/useConfirmAction";
import type { NoticeTone } from "@/lib/useNotice";

type StaffBookingSheetProps = {
  row: BookingRow;
  customer: BookingCustomer | null;
  onClose: () => void;
  onUpdated: (updated: BookingRow) => void;
  onNotice: (message: string, tone: NoticeTone) => void;
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
  const [current, setCurrent] = useState(row);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const {
    confirming: confirmingCancel,
    count: confirmCount,
    press: cancelPress,
    reset: cancelReset,
  } = useConfirmAction(() => {
    void handleCancel();
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

  const name = customerDisplayName(customer);
  const subtitle =
    customer?.phone || customer?.email || current.shop?.name || "—";
  const primary = nextPrimaryTransition(current.status);
  const cancellable =
    current.status === "pending" || current.status === "confirmed";
  const showNoShow = current.status === "confirmed";

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.header}>
        <Avatar fullName={name} imageUrl={customer?.avatar_url} size={48} />
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

      <DetailsCard>
        <DetailRow label="Service" value={current.service_name || "—"} labelWidth={62} />
        <DetailRow label="When" value={formatDateTime(current.starts_at)} labelWidth={62} />
        <DetailRow
          label="Duration"
          value={`${current.service_duration_minutes} min`}
          labelWidth={62}
        />
        <DetailRow label="Shop" value={current.shop?.name ?? "—"} labelWidth={62} />
        <DetailRow label="Price" value={formatCents(current.service_price_cents)} labelWidth={62} />
        {!!customer?.phone && (
          <DetailRow label="Phone" value={customer.phone} labelWidth={62} />
        )}
        {!!customer?.email && (
          <DetailRow label="Email" value={customer.email} labelWidth={62} />
        )}
        {!!current.note && (
          <DetailRow label="Note" value={current.note} numberOfLines={2} labelWidth={62} />
        )}
        {!!current.cancel_reason && (
          <DetailRow
            label="Reason"
            value={current.cancel_reason}
            numberOfLines={2}
            labelWidth={62}
          />
        )}
      </DetailsCard>

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
          onPress={cancelPress}
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
            cancelReset();
            return;
          }
          onClose();
        }}
        style={styles.closeButton}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
  closeButton: {
    backgroundColor: colors.surface,
  },
});
