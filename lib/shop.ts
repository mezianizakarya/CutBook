import { runList, runMaybe } from "@/lib/db";
import { parseTimeToMinutes, localeTimeString } from "@/lib/format";
import { getLocale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export type ShopSummary = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
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
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  member_role: string;
  joined_at: string | null;
  specialty: string | null;
  years_of_experience: number | null;
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
  latitude: number | null;
  longitude: number | null;
  services: ShopService[];
  members: ShopMember[];
  working_hours: WorkingHoursRow[];
  gallery: string[];
};

export const SHOP_SUMMARY_SELECT =
  "id, name, slug, city, country, rating_avg, rating_count, is_verified, logo_url";

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

export type HomeShop = ShopSummary & {
  services: {
    name: string;
    price_cents: number;
    category: string | null;
    is_active: boolean;
  }[];
};

/** Approved shops with their active services (cheapest first), for the home rail. */
export async function loadHomeShops(options: {
  order: ShopSummaryOrder;
  start: number;
  count: number;
  country?: string | null;
}): Promise<HomeShop[]> {
  let builder = supabase
    .from("shops")
    .select(`${SHOP_SUMMARY_SELECT}, services(name, price_cents, category, is_active)`);
  if (options.country) {
    builder = builder.eq("country", options.country);
  }
  if (options.order === "top") {
    builder = builder.order("rating_avg", { ascending: false, nullsFirst: false });
  } else {
    builder = builder.order("created_at", { ascending: false });
  }
  const rows = await runList<HomeShop>(
    builder.range(options.start, options.start + options.count - 1)
  );
  return rows.map((shop) => ({
    ...shop,
    services: (shop.services ?? [])
      .filter((service) => service.is_active !== false)
      .sort((a, b) => a.price_cents - b.price_cents),
  }));
}

export type NearbyShop = HomeShop & {
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number;
};

/** Shops near the given coordinates, nearest first, with distance in km. */
export async function loadNearbyShops(
  latitude: number,
  longitude: number,
  options: { maxKm?: number; limit?: number; country?: string | null } = {}
): Promise<NearbyShop[]> {
  const { maxKm = 50, limit = 20, country } = options;
  const { data, error } = await supabase.rpc("nearby_shops", {
    p_latitude: latitude,
    p_longitude: longitude,
    p_max_km: maxKm,
    p_limit: limit,
    p_country: country ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []) as unknown as NearbyShop[];
  return rows.map((row) => ({
    ...row,
    rating_avg: row.rating_avg != null ? Number(row.rating_avg) : null,
    services: Array.isArray(row.services) ? row.services : [],
  }));
}

export type OpenTodaySlot = {
  starts_at: string;
  ends_at: string;
  label: string;
};

export type ShopOpenToday = ShopSummary & {
  opens_at: string;
  closes_at: string;
  slots: OpenTodaySlot[];
};

const SLOT_STEP_MINUTES = 30;

/** The next `count` half-hour starts after `now` within today's opening window. */
function nextSlotsToday(
  opensAt: string,
  closesAt: string,
  now: Date,
  count: number
): OpenTodaySlot[] {
  const open = parseTimeToMinutes(opensAt);
  const close = parseTimeToMinutes(closesAt);
  if (open == null || close == null) {
    return [];
  }
  const slots: OpenTodaySlot[] = [];
  for (
    let start = open;
    start + SLOT_STEP_MINUTES <= close;
    start += SLOT_STEP_MINUTES
  ) {
    const startsAt = new Date(now);
    startsAt.setHours(0, 0, 0, 0);
    startsAt.setMinutes(start);
    const endsAt = new Date(startsAt.getTime() + SLOT_STEP_MINUTES * 60_000);
    if (startsAt.getTime() <= now.getTime()) {
      continue;
    }
    slots.push({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      label: localeTimeString(startsAt, getLocale(), {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
    if (slots.length >= count) {
      break;
    }
  }
  return slots;
}

/** Approved shops that are open today, with a few upcoming start times. */
export async function loadShopsOpenToday(country?: string | null): Promise<ShopOpenToday[]> {
  const weekday = new Date().getDay();
  let builder = supabase
    .from("working_hours")
    .select(`shop_id, opens_at, closes_at, shop:shops(${SHOP_SUMMARY_SELECT})`)
    .eq("day_of_week", weekday)
    .eq("is_closed", false)
    .not("opens_at", "is", null)
    .not("closes_at", "is", null)
    .order("opens_at", { ascending: true });
  if (country) {
    builder = builder.eq("shop.country", country);
  }
  const { data } = await builder;
  const rows = (data ?? []) as unknown as {
    shop_id: number;
    opens_at: string | null;
    closes_at: string | null;
    shop: ShopSummary | null;
  }[];
  const seen = new Set<number>();
  const result: ShopOpenToday[] = [];
  for (const row of rows) {
    if (!row.shop || !row.opens_at || !row.closes_at || seen.has(row.shop_id)) {
      continue;
    }
    seen.add(row.shop_id);
    result.push({
      ...row.shop,
      opens_at: row.opens_at,
      closes_at: row.closes_at,
      slots: nextSlotsToday(row.opens_at, row.closes_at, new Date(), 3),
    });
  }
  return result;
}

/** The shops a customer has favorited, most recent first. */
export async function loadFavoriteShops(
  customerId: string,
  country?: string | null
): Promise<ShopSummary[]> {
  let builder = supabase
    .from("favorites")
    .select(`shop:shops(${SHOP_SUMMARY_SELECT})`)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (country) {
    builder = builder.eq("shop.country", country);
  }
  const rows = await runList<{ shop: ShopSummary | null }>(builder);
  return rows
    .map((row) => row.shop)
    .filter((shop): shop is ShopSummary => shop !== null);
}

export async function loadShopDetail(shopId: number): Promise<ShopDetail | null> {
  const [data, barbers, gallery] = await Promise.all([
    runMaybe<
      Omit<ShopDetail, "services" | "members" | "gallery"> & {
        services: (ShopService & { is_active: boolean })[];
        members: ShopMember[];
      }
    >(
      supabase
        .from("shops")
        .select(
          `${SHOP_SUMMARY_SELECT}, description, address_line1, address_line2, state, country, postal_code, phone, email, website, latitude, longitude, services:services(id, name, description, price_cents, duration_minutes, category, is_active), members:shop_members(id, profile_id, display_name, avatar_url, member_role, joined_at), working_hours(id, day_of_week, opens_at, closes_at, is_closed)`
        )
        .eq("id", shopId)
        .maybeSingle()
    ),
    loadShopBarbers(shopId),
    loadShopGallery(shopId),
  ]);
  if (!data) {
    return null;
  }
  const specialtyById = new Map(
    barbers.map((barber) => [barber.profile_id, barber])
  );
  return {
    ...data,
    services: (data.services ?? [])
      .filter((service) => service.is_active !== false)
      .sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "")),
    members: (data.members ?? [])
      .filter((member) => member.member_role === "barber")
      .map((member) => ({
        ...member,
        specialty: specialtyById.get(member.profile_id)?.specialty ?? null,
        years_of_experience:
          specialtyById.get(member.profile_id)?.years_of_experience ?? null,
      })),
    gallery,
  };
}

/** Public gallery photo URLs for a shop, ordered as displayed. */
export async function loadShopGallery(shopId: number): Promise<string[]> {
  const rows = await runList<{ object_path: string }>(
    supabase
      .from("shop_gallery")
      .select("object_path")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true })
  );
  return rows.map((row) => row.object_path);
}

/** Barber members of a shop with their public professional info (via RPC). */
export async function loadShopBarbers(shopId: number): Promise<ShopMember[]> {
  const { data, error } = await supabase
    .rpc("get_shop_barbers", { p_shop_id: shopId });
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as unknown as {
    member_id: number;
    profile_id: string;
    display_name: string;
    avatar_url: string | null;
    joined_at: string | null;
    specialty: string | null;
    years_of_experience: number | null;
  }[];
  return rows.map((row) => ({
    id: row.member_id,
    profile_id: row.profile_id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    member_role: "barber",
    joined_at: row.joined_at,
    specialty: row.specialty,
    years_of_experience: row.years_of_experience,
  }));
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
