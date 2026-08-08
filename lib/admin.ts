import type { PostgrestError } from "@supabase/supabase-js";

import { startOfDay } from "@/lib/format";
import type { Role } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

export type ShopStatus = "pending" | "approved" | "suspended";

export type AdminShop = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: ShopStatus;
  is_verified: boolean;
  is_active: boolean;
  rating_avg: number | null;
  rating_count: number | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type AdminStats = {
  activeUsers: number;
  barbers: number;
  owners: number;
  shops: number;
  pendingShops: number;
  todayBookings: number;
  monthRevenueCents: number;
};

export type RecentUser = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: "customer" | "barber" | "owner" | "admin" | null;
  account_status: "active" | "deleted";
  created_at: string | null;
};

export const SHOP_SELECT =
  "id, name, slug, description, logo_url, address_line1, city, state, phone, email, website, status, is_verified, is_active, rating_avg, rating_count, deleted_at, created_by, created_at";

export async function loadAdminShops(
  status: ShopStatus | "all" = "all",
  query = ""
): Promise<AdminShop[]> {
  let builder = supabase.from("shops").select(SHOP_SELECT);
  if (status !== "all") {
    builder = builder.eq("status", status);
  }
  if (query.trim() !== "") {
    const q = query.trim().toLowerCase();
    builder = builder.or(`name.ilike.%${q}%,city.ilike.%${q}%,slug.ilike.%${q}%`);
  }
  const { data, error } = await builder.order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as AdminShop[];
}

export async function loadAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const dayStart = startOfDay(now).toISOString();
  const dayEnd = new Date(
    new Date(dayStart).getTime() + 86_400_000
  ).toISOString();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  ).toISOString();

  async function count(
    builder: PromiseLike<{
      count: number | null;
      error: PostgrestError | null;
    }>
  ): Promise<number> {
    const { count: value, error } = await builder;
    if (error) {
      throw error;
    }
    return value ?? 0;
  }

  const [activeUsers, barbers, owners, shops, pendingShops, todayBookings] =
    await Promise.all([
      count(
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("account_status", "active")
      ),
      count(
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("account_status", "active")
          .eq("role", "barber")
      ),
      count(
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("account_status", "active")
          .eq("role", "owner")
      ),
      count(
        supabase
          .from("shops")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
      ),
      count(
        supabase
          .from("shops")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("status", "pending")
      ),
      count(
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("starts_at", dayStart)
          .lt("starts_at", dayEnd)
      ),
    ]);

  const { data: monthBookings, error: monthError } = await supabase
    .from("bookings")
    .select("service_price_cents")
    .eq("status", "completed")
    .gte("starts_at", monthStart)
    .lt("starts_at", monthEnd);
  if (monthError) {
    throw monthError;
  }

  return {
    activeUsers,
    barbers,
    owners,
    shops,
    pendingShops,
    todayBookings,
    monthRevenueCents: (monthBookings ?? []).reduce(
      (sum, row) => sum + ((row as { service_price_cents: number }).service_price_cents ?? 0),
      0
    ),
  };
}

export async function loadRecentUsers(limit = 8): Promise<RecentUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, username, first_name, last_name, avatar_url, role, account_status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as RecentUser[];
}

export async function updateShopFields(
  id: number,
  patch: Partial<Pick<AdminShop, "status" | "is_verified" | "is_active">>
): Promise<void> {
  const { error } = await supabase.from("shops").update(patch).eq("id", id);
  if (error) {
    throw error;
  }
}

/** Change a user's role via the admin-only RPC (direct UPDATE is revoked). */
export async function adminSetUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    throw error;
  }
}

/** Soft-delete/restore a user via the admin-only RPC (direct UPDATE is revoked). */
export async function adminSetUserDeleted(
  userId: string,
  deleted: boolean
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_deleted", {
    p_user_id: userId,
    p_deleted: deleted,
  });
  if (error) {
    throw error;
  }
}
