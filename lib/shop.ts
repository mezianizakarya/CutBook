import { runList, runMaybe } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export type ShopSummary = {
  id: number;
  name: string;
  city: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean;
  logo_url: string | null;
};

export type ShopService = {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  category: string | null;
};

export type ShopMember = {
  id: number;
  display_name: string;
  avatar_url: string | null;
  member_role: string;
  joined_at: string | null;
};

export type WorkingHoursRow = {
  id: number;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

export type ShopDetail = ShopSummary & {
  slug: string;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  services: ShopService[];
  members: ShopMember[];
  working_hours: WorkingHoursRow[];
};

export const SHOP_SUMMARY_SELECT =
  "id, name, slug, city, rating_avg, rating_count, is_verified, logo_url";

export type ShopSummaryOrder = "top" | "newest";

/** Approved, active shops ordered by rating or recency (paged). */
export async function loadShopSummaries(options: {
  order: ShopSummaryOrder;
  start: number;
  count: number;
}): Promise<ShopSummary[]> {
  let builder = supabase.from("shops").select(SHOP_SUMMARY_SELECT);
  if (options.order === "top") {
    builder = builder.order("rating_avg", { ascending: false, nullsFirst: false });
  } else {
    builder = builder.order("created_at", { ascending: false });
  }
  return runList<ShopSummary>(
    builder.range(options.start, options.start + options.count - 1)
  );
}

/** The shops a customer has favorited, most recent first. */
export async function loadFavoriteShops(customerId: string): Promise<ShopSummary[]> {
  const rows = await runList<{ shop: ShopSummary | null }>(
    supabase
      .from("favorites")
      .select(`shop:shops(${SHOP_SUMMARY_SELECT})`)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
  );
  return rows
    .map((row) => row.shop)
    .filter((shop): shop is ShopSummary => shop !== null);
}

export async function loadShopDetail(shopId: number): Promise<ShopDetail | null> {
  const data = await runMaybe<
    Omit<ShopDetail, "services" | "members"> & {
      services: (ShopService & { is_active: boolean })[];
      members: ShopMember[];
    }
  >(
    supabase
      .from("shops")
      .select(
        `${SHOP_SUMMARY_SELECT}, description, address_line1, address_line2, state, country, postal_code, phone, email, website, services:services(id, name, description, price_cents, duration_minutes, category, is_active), members:shop_members(id, display_name, avatar_url, member_role, joined_at), working_hours(id, day_of_week, opens_at, closes_at, is_closed)`
      )
      .eq("id", shopId)
      .maybeSingle()
  );
  if (!data) {
    return null;
  }
  return {
    ...data,
    services: (data.services ?? [])
      .filter((service) => service.is_active !== false)
      .sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "")),
    members: (data.members ?? []).filter((member) => member.member_role === "barber"),
  };
}

export async function fetchFavoriteShopIds(customerId: string): Promise<Set<number>> {
  const { data } = await supabase
    .from("favorites")
    .select("shop_id")
    .eq("customer_id", customerId);
  return new Set((data ?? []).map((row) => (row as { shop_id: number }).shop_id));
}

export async function addFavorite(customerId: string, shopId: number): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .insert({ customer_id: customerId, shop_id: shopId });
  if (error) {
    throw error;
  }
}

export async function removeFavorite(customerId: string, shopId: number): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("customer_id", customerId)
    .eq("shop_id", shopId);
  if (error) {
    throw error;
  }
}
