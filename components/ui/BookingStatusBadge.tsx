import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";

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
