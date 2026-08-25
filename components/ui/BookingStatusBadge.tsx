import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { t } from "@/lib/i18n";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: t("status.pending"),
  confirmed: t("status.confirmed"),
  completed: t("status.completed"),
  cancelled: t("status.cancelled"),
  no_show: t("status.no_show"),
};

const STATUS_TONES: Record<BookingStatus, StatusTone> = {
  pending: "warning",
  confirmed: "role",
  completed: "success",
  cancelled: "danger",
  no_show: "danger",
};

type BookingStatusBadgeProps = {
  status: BookingStatus;
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return <StatusBadge label={STATUS_LABELS[status]} tone={STATUS_TONES[status]} />;
}
