import { runList, runQuery, uniqueIds } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export type BookingCardRow = {
  id: number;
  status: BookingStatus;
  starts_at: string;
  service_name: string;
  service_price_cents: number;
  shop: { id: number; name: string; logo_url: string | null } | null;
  staff: { id: number; display_name: string; avatar_url: string | null } | null;
  applied_reward_title: string | null;
};

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
  started_at: string | null;
  extended_minutes: number;
  paused_at: string | null;
  paused_minutes: number;
  completed_at: string | null;
  service_name: string;
  service_price_cents: number;
  service_duration_minutes: number;
  note: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  applied_reward_title: string | null;
  shop: { id: number; name: string; logo_url: string | null } | null;
  staff: { id: number; display_name: string; avatar_url: string | null } | null;
};

export const BOOKING_SELECT =
  "id, status, starts_at, ends_at, started_at, extended_minutes, paused_at, paused_minutes, completed_at, service_name, service_price_cents, service_duration_minutes, note, cancel_reason, cancelled_at, applied_reward_title, shop:shops(id, name, logo_url), staff:shop_members(id, display_name, avatar_url)";

export function toBookingCard(row: BookingRow): BookingCardRow {
  return {
    id: row.id,
    status: row.status,
    starts_at: row.starts_at,
    service_name: row.service_name,
    service_price_cents: row.service_price_cents,
    shop: row.shop,
    staff: row.staff,
    applied_reward_title: row.applied_reward_title,
  };
}

export type BookAgainRow = {
  id: number;
  starts_at: string;
  service_name: string;
  shop: { id: number; name: string; logo_url: string | null } | null;
};

/** The customer's next upcoming booking (pending or confirmed, future only). */
export async function loadUpcomingBooking(
  customerId: string
): Promise<BookingCardRow | null> {
  const rows = await runList<BookingRow>(
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("customer_id", customerId)
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
  );
  const row = rows[0];
  return row ? toBookingCard(row) : null;
}

/** The customer's most recent completed visits, for the "Book again" rail. */
export async function loadBookAgain(
  customerId: string,
  count = 3
): Promise<BookAgainRow[]> {
  const rows = await runList<BookingRow>(
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("customer_id", customerId)
      .in("status", ["completed", "no_show"])
      .order("starts_at", { ascending: false })
      .limit(count)
  );
  return rows
    .filter((row) => row.shop !== null)
    .map((row) => ({
      id: row.id,
      starts_at: row.starts_at,
      service_name: row.service_name,
      shop: row.shop,
    }));
}

/** Bookings that can still be cancelled by a customer (upcoming + not terminal). */
export function isCancellable(row: BookingRow, now = new Date()): boolean {
  return (
    (row.status === "pending" || row.status === "confirmed") &&
    new Date(row.starts_at).getTime() > now.getTime()
  );
}

export async function cancelBooking(bookingId: number): Promise<BookingRow> {
  return runQuery<BookingRow>(
    supabase
      .rpc("cancel_booking", { p_booking_id: bookingId })
      .select(BOOKING_SELECT)
      .single()
  );
}

export async function setBookingStatus(
  bookingId: number,
  status: "confirmed" | "completed" | "no_show"
): Promise<BookingRow> {
  return runQuery<BookingRow>(
    supabase
      .rpc("set_booking_status", { p_booking_id: bookingId, p_status: status })
      .select(BOOKING_SELECT)
      .single()
  );
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

export function buildCustomerByIdMap(
  customers: BookingCustomer[]
): Map<number, BookingCustomer> {
  return new Map(customers.map((customer) => [customer.booking_id, customer]));
}

export function patchBookingRow(
  rows: BookingRow[],
  updated: BookingRow
): BookingRow[] {
  return rows.map((row) => (row.id === updated.id ? updated : row));
}

/**
 * Resolves customer details for bookings via the SECURITY DEFINER RPC
 * (profiles RLS hides other users' rows from staff/owner reads).
 */
export async function fetchBookingCustomers(
  bookingIds: number[]
): Promise<BookingCustomer[]> {
  const ids = uniqueIds(bookingIds.filter((id) => Number.isFinite(id)));
  if (ids.length === 0) {
    return [];
  }
  return runList<BookingCustomer>(
    supabase.rpc("booking_customer_details", { p_booking_ids: ids })
  );
}
