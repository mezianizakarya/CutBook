import type { BookingCustomer, BookingRow } from "@/lib/booking";
import { BOOKING_SELECT, fetchBookingCustomers } from "@/lib/booking";
import { runList, runQuery, uniqueIds } from "@/lib/db";
import { startOfDay } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export type BarberMember = {
  id: number;
  shop_id: number;
  member_role: "owner" | "manager" | "barber";
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
};

export type BarberShop = {
  id: number;
  name: string;
  logo_url: string | null;
};

/** Whitelisted barber profile fields visible to customers (via SECURITY DEFINER RPC). */
export type PublicBarberProfile = {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  specialty: string | null;
  years_of_experience: number | null;
  bio: string | null;
  city: string | null;
  shop_names: string[];
};

/**
 * Loads a barber's public profile for customers. Only returns data for barbers
 * currently employed at an approved, active shop; returns null otherwise.
 */
export async function loadPublicBarberProfile(
  profileId: string
): Promise<PublicBarberProfile | null> {
  const { data, error } = await supabase
    .rpc("get_public_barber_profile", { p_profile_id: profileId })
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data as PublicBarberProfile | null) ?? null;
}

export type PublicBarberService = {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  category: string | null;
};

/**
 * The active services a barber provides, resolved through the shop's service
 * catalog with any per-staff price/duration overrides. Uses only public RLS
 * tables (shop_members public staff, staff_services public, services public).
 * When `shopId` is given the services are restricted to that shop's membership.
 */
export async function loadPublicBarberServices(
  profileId: string,
  shopId?: number
): Promise<PublicBarberService[]> {
  let builder = supabase
    .from("shop_members")
    .select(
      "staff_services(is_active, price_cents, duration_minutes, service:services(id, name, description, price_cents, duration_minutes, category, is_active))"
    )
    .eq("profile_id", profileId)
    .eq("member_role", "barber")
    .is("removed_at", null);
  if (shopId != null) {
    builder = builder.eq("shop_id", shopId);
  }
  const rows = await runList<{
    staff_services: {
      is_active: boolean;
      price_cents: number | null;
      duration_minutes: number | null;
      service: PublicBarberService & { is_active: boolean } | null;
    }[];
  }>(builder);
  const result: PublicBarberService[] = [];
  for (const row of rows) {
    for (const link of row.staff_services ?? []) {
      const service = link.service;
      if (!service || service.is_active === false || link.is_active === false) {
        continue;
      }
      result.push({
        id: service.id,
        name: service.name,
        description: service.description,
        price_cents: link.price_cents ?? service.price_cents,
        duration_minutes: link.duration_minutes ?? service.duration_minutes,
        category: service.category,
      });
    }
  }
  return result.sort((a, b) =>
    (a.category ?? "").localeCompare(b.category ?? "")
  );
}

export type PublicPortfolioImage = {
  id: number;
  object_path: string;
  caption: string | null;
  is_cover: boolean;
  sort_order: number;
};

/**
 * A barber's public portfolio photos (public RLS). When `shopId` is given the
 * images are restricted to that shop's membership.
 */
export async function loadPublicBarberPortfolio(
  profileId: string,
  shopId?: number
): Promise<PublicPortfolioImage[]> {
  let builder = supabase
    .from("shop_members")
    .select(
      "portfolio_images(id, object_path, caption, is_cover, sort_order)"
    )
    .eq("profile_id", profileId)
    .eq("member_role", "barber")
    .is("removed_at", null);
  if (shopId != null) {
    builder = builder.eq("shop_id", shopId);
  }
  const rows = await runList<{
    portfolio_images: PublicPortfolioImage[];
  }>(builder);
  return rows
    .flatMap((row) => row.portfolio_images ?? [])
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export type AvailabilityRow = {
  id: number;
  shop_member_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

export type TimeOffRow = {
  id: number;
  shop_member_id: number;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

const MEMBER_SELECT =
  "id, shop_id, member_role, display_name, avatar_url, joined_at";

/**
 * Memberships of the current user. RLS exposes every active barber via
 * `shop_members_select_public_staff`, so the query must be pinned to the
 * signed-in profile to avoid mixing in other barbers.
 */
export async function loadMyMemberships(
  profileId: string
): Promise<BarberMember[]> {
  return runList<BarberMember>(
    supabase
      .from("shop_members")
      .select(MEMBER_SELECT)
      .eq("profile_id", profileId)
      .is("removed_at", null)
      .order("joined_at", { ascending: true })
  );
}

export async function leaveShop(memberId: number): Promise<void> {
  const { error } = await supabase.rpc("leave_shop", { p_member_id: memberId });
  if (error) {
    throw error;
  }
}

export async function loadMemberShops(shopIds: number[]): Promise<BarberShop[]> {
  const ids = uniqueIds(shopIds);
  if (ids.length === 0) {
    return [];
  }
  return runList<BarberShop>(
    supabase.from("shops").select("id, name, logo_url").in("id", ids)
  );
}

export async function loadMyAvailability(
  memberIds: number[]
): Promise<AvailabilityRow[]> {
  const ids = uniqueIds(memberIds);
  if (ids.length === 0) {
    return [];
  }
  return runList<AvailabilityRow>(
    supabase
      .from("availability")
      .select("id, shop_member_id, day_of_week, starts_at, ends_at")
      .in("shop_member_id", ids)
      .order("day_of_week", { ascending: true })
      .order("starts_at", { ascending: true })
  );
}

export async function loadMyTimeOffs(
  memberIds: number[]
): Promise<TimeOffRow[]> {
  const ids = uniqueIds(memberIds);
  if (ids.length === 0) {
    return [];
  }
  return runList<TimeOffRow>(
    supabase
      .from("time_offs")
      .select("id, shop_member_id, starts_at, ends_at, reason")
      .in("shop_member_id", ids)
      .order("starts_at", { ascending: false })
  );
}

export async function loadMyBookings(
  memberIds: number[],
  from?: Date,
  to?: Date
): Promise<BookingRow[]> {
  const ids = uniqueIds(memberIds);
  if (ids.length === 0) {
    return [];
  }
  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("staff_id", ids)
    .order("starts_at", { ascending: true });
  if (from) {
    query = query.gte("starts_at", from.toISOString());
  }
  if (to) {
    query = query.lt("starts_at", to.toISOString());
  }
  return runList<BookingRow>(query);
}

export async function addDayOff(
  memberId: number,
  date: Date,
  reason = "Unavailable"
): Promise<TimeOffRow> {
  const start = startOfDay(date);
  const end = new Date(start.getTime() + 86_400_000);
  return runQuery<TimeOffRow>(
    supabase
      .from("time_offs")
      .insert({
        shop_member_id: memberId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        reason,
      })
      .select("id, shop_member_id, starts_at, ends_at, reason")
      .single()
  );
}

export async function removeDayOff(timeOffId: number): Promise<void> {
  const { error } = await supabase.from("time_offs").delete().eq("id", timeOffId);
  if (error) {
    throw error;
  }
}

export type DashboardStats = {
  todayCount: number;
  pendingCount: number;
  completedCount: number;
  monthRevenueCents: number;
};

export function computeDashboardStats(
  bookings: BookingRow[],
  now = new Date()
): DashboardStats {
  const dayStart = startOfDay(now).getTime();
  const dayEnd = dayStart + 86_400_000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  let todayCount = 0;
  let pendingCount = 0;
  let completedCount = 0;
  let monthRevenueCents = 0;

  for (const booking of bookings) {
    const start = new Date(booking.starts_at).getTime();
    if (start >= dayStart && start < dayEnd) {
      todayCount += 1;
    }
    if (booking.status === "pending") {
      pendingCount += 1;
    }
    if (booking.status === "completed") {
      completedCount += 1;
      if (start >= monthStart && start < monthEnd) {
        monthRevenueCents += booking.service_price_cents;
      }
    }
  }
  return { todayCount, pendingCount, completedCount, monthRevenueCents };
}

export type BarberClient = {
  customer_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  booking_count: number;
  completed_count: number;
  upcoming_count: number;
  last_booking: string | null;
  favorite_service: string | null;
};

export function groupClients(
  bookings: BookingRow[],
  customers: BookingCustomer[],
  now = new Date()
): BarberClient[] {
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const byCustomer = new Map<string, BarberClient>();
  const serviceCounts = new Map<string, Map<string, number>>();

  for (const customer of customers) {
    const booking = bookingById.get(customer.booking_id);
    if (!booking) {
      continue;
    }
    let client = byCustomer.get(customer.customer_id);
    if (!client) {
      client = {
        customer_id: customer.customer_id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        avatar_url: customer.avatar_url,
        email: customer.email,
        phone: customer.phone,
        booking_count: 0,
        completed_count: 0,
        upcoming_count: 0,
        last_booking: null,
        favorite_service: null,
      };
      byCustomer.set(customer.customer_id, client);
      serviceCounts.set(customer.customer_id, new Map());
    }
    client.booking_count += 1;
    if (booking.status === "completed") {
      client.completed_count += 1;
    }
    if (
      (booking.status === "pending" || booking.status === "confirmed") &&
      new Date(booking.starts_at).getTime() >= now.getTime()
    ) {
      client.upcoming_count += 1;
    }
    if (!client.last_booking || booking.starts_at > client.last_booking) {
      client.last_booking = booking.starts_at;
    }
    const counts = serviceCounts.get(customer.customer_id);
    if (counts) {
      counts.set(booking.service_name, (counts.get(booking.service_name) ?? 0) + 1);
    }
  }

  const result = [...byCustomer.values()];
  for (const client of result) {
    const counts = serviceCounts.get(client.customer_id);
    let best: string | null = null;
    let bestCount = 0;
    if (counts) {
      for (const [service, count] of counts) {
        if (count > bestCount) {
          best = service;
          bestCount = count;
        }
      }
    }
    client.favorite_service = best;
  }

  return result.sort(
    (a, b) =>
      b.booking_count - a.booking_count ||
      (b.last_booking ?? "").localeCompare(a.last_booking ?? "")
  );
}

export function availabilityForDay(
  rows: AvailabilityRow[],
  memberId: number,
  date: Date
): AvailabilityRow[] {
  const day = date.getDay();
  return rows
    .filter((row) => row.shop_member_id === memberId && row.day_of_week === day)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function dayHasTimeOff(
  rows: TimeOffRow[],
  memberId: number,
  date: Date
): TimeOffRow | null {
  const dayStart = startOfDay(date).getTime();
  const dayEnd = dayStart + 86_400_000;
  return (
    rows.find(
      (row) =>
        row.shop_member_id === memberId &&
        new Date(row.starts_at).getTime() < dayEnd &&
        new Date(row.ends_at).getTime() > dayStart
    ) ?? null
  );
}

export function weekStart(value: Date): Date {
  const start = startOfDay(value);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

/** Every distinct customer who ever booked this barber (for walk-in picker). */
export async function loadBarberClients(
  memberIds: number[]
): Promise<BarberClient[]> {
  const ids = uniqueIds(memberIds);
  if (ids.length === 0) {
    return [];
  }
  const now = new Date();
  const from = new Date(now.getTime() - 90 * 86_400_000);
  const to = new Date(now.getTime() + 14 * 86_400_000);
  const rows = await loadMyBookings(ids, from, to);
  const customers = await fetchBookingCustomers(rows.map((row) => row.id));
  return groupClients(rows, customers);
}
