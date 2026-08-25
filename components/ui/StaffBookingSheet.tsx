import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


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
import { formatDateTime, useFormatCents } from "@/lib/format";
import { t } from "@/lib/i18n";
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
  const formattedPrice = useFormatCents(current.service_price_cents);
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
          ? t("staff.booking_confirmed")
          : status === "completed"
            ? t("staff.booking_completed")
            : t("staff.booking_no_show");
      onNotice(message, status === "no_show" ? "danger" : "success");
    } catch (e) {
      Alert.alert(t("staff.could_not_update"), errorMessageFromUnknown(e));
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
      onNotice(t("staff.booking_cancelled"), "danger");
      onClose();
    } catch (e) {
      Alert.alert(t("staff.could_not_cancel"), errorMessageFromUnknown(e));
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
          <AppText style={styles.headerName} numberOfLines={1}>
            {name}
          </AppText>
          <AppText style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        <BookingStatusBadge status={current.status} />
      </View>

      <DetailsCard>
        <DetailRow label={t("staff.service")} value={current.service_name || "—"} labelWidth={62} />
        <DetailRow label={t("staff.when")} value={formatDateTime(current.starts_at)} labelWidth={62} />
        <DetailRow
          label={t("staff.duration")}
          value={`${current.service_duration_minutes} ${t("common.min")}`}
          labelWidth={62}
        />
        <DetailRow label={t("staff.shop")} value={current.shop?.name ?? "—"} labelWidth={62} />
        <DetailRow label={t("staff.price")} value={formattedPrice} labelWidth={62} />
        {!!customer?.phone && (
          <DetailRow label={t("staff.phone")} value={customer.phone} labelWidth={62} />
        )}
        {!!customer?.email && (
          <DetailRow label={t("staff.email")} value={customer.email} labelWidth={62} />
        )}
        {!!current.note && (
          <DetailRow label={t("staff.note")} value={current.note} numberOfLines={2} labelWidth={62} />
        )}
        {!!current.cancel_reason && (
          <DetailRow
            label={t("staff.reason")}
            value={current.cancel_reason}
            numberOfLines={2}
            labelWidth={62}
          />
        )}
      </DetailsCard>

      {primary === "confirmed" && (
        <Button
          title={t("staff.confirm_booking")}
          variant="primary"
          loading={busy}
          disabled={busy}
          onPress={() => void handleStatusChange("confirmed")}
        />
      )}
      {primary === "completed" && (
        <Button
          title={t("staff.mark_complete")}
          variant="successOutline"
          loading={busy}
          disabled={busy}
          onPress={() => void handleStatusChange("completed")}
        />
      )}
      {showNoShow && (
        <Button
          title={t("staff.mark_no_show")}
          variant="dangerOutline"
          loading={busy}
          disabled={busy}
          onPress={() => void handleStatusChange("no_show")}
        />
      )}
      {cancellable && (
        <Button
          title={
            confirmingCancel ? t("staff.confirm_cancel", { count: confirmCount }) : t("staff.cancel_booking")
          }
          onPress={cancelPress}
          variant={confirmingCancel ? "danger" : "dangerOutline"}
          loading={cancelling}
          disabled={busy || cancelling}
        />
      )}
      <Button
        title={t("common.close")}
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
