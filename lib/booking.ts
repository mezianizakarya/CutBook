import type { BookingCardRow } from "@/components/ui/BookingCard";
import { supabase } from "@/lib/supabase";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type BookingRow = {
  id: number;
  status: BookingStatus;
  starts_at: string;
  ends_at: string | null;
  service_name: string;
  service_price_cents: number;
  service_duration_minutes: number;
  note: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  shop: { id: number; name: string; logo_url: string | null } | null;
  staff: { id: number; display_name: string; avatar_url: string | null } | null;
};

export const BOOKING_SELECT =
  "id, status, starts_at, ends_at, service_name, service_price_cents, service_duration_minutes, note, cancel_reason, cancelled_at, shop:shops(id, name, logo_url), staff:shop_members(id, display_name, avatar_url)";

export function toBookingCard(row: BookingRow): BookingCardRow {
  return {
    id: row.id,
    status: row.status,
    starts_at: row.starts_at,
    service_name: row.service_name,
    service_price_cents: row.service_price_cents,
    shop: row.shop,
    staff: row.staff,
  };
}

/** Bookings that can still be cancelled by a customer (upcoming + not terminal). */
export function isCancellable(row: BookingRow, now = new Date()): boolean {
  return (
    (row.status === "pending" || row.status === "confirmed") &&
    new Date(row.starts_at).getTime() > now.getTime()
  );
}

export async function cancelBooking(bookingId: number): Promise<BookingRow> {
  const { data, error } = await supabase
    .rpc("cancel_booking", { p_booking_id: bookingId })
    .select(BOOKING_SELECT)
    .single();
  if (error) {
    throw error;
  }
  return data as unknown as BookingRow;
}

export async function setBookingStatus(
  bookingId: number,
  status: "confirmed" | "completed" | "no_show"
): Promise<BookingRow> {
  const { data, error } = await supabase
    .rpc("set_booking_status", { p_booking_id: bookingId, p_status: status })
    .select(BOOKING_SELECT)
    .single();
  if (error) {
    throw error;
  }
  return data as unknown as BookingRow;
}

export function nextStaffTransition(status: BookingStatus): string {
  if (status === "pending") {
    return "confirm";
  }
  if (status === "confirmed") {
    return "complete";
  }
  return "none";
}

export type BookingCustomer = {
  booking_id: number;
  customer_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
};

export function customerDisplayName(
  customer: BookingCustomer | null | undefined
): string {
  if (!customer) {
    return "—";
  }
  const full = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || "Customer";
}

/**
 * Resolves customer details for bookings via the SECURITY DEFINER RPC
 * (profiles RLS hides other users' rows from staff/owner reads).
 */
export async function fetchBookingCustomers(
  bookingIds: number[]
): Promise<BookingCustomer[]> {
  const ids = [...new Set(bookingIds)].filter(
    (id): id is number => Number.isFinite(id)
  );
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await supabase.rpc("booking_customer_details", {
    p_booking_ids: ids,
  });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as BookingCustomer[];
}
