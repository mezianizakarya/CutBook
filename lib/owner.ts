import { BOOKING_SELECT, type BookingRow } from "@/lib/booking";
import { waitForDbRole } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

export type OwnerShop = {
  id: number;
  name: string;
  slug: string;
  status: "pending" | "approved" | "suspended";
  is_verified: boolean;
  logo_url: string | null;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  myRole: "owner" | "manager";
};

export type OwnerStaffRow = {
  id: number;
  shop_id: number;
  profile_id: string;
  member_role: "owner" | "manager" | "barber";
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
};

export type OwnerService = {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  category: string | null;
  is_active: boolean;
  sort_order: number;
};

export type WorkingHoursRow = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

const SHOP_MANAGE_SELECT =
  "id, name, slug, status, is_verified, logo_url, description, address_line1, address_line2, city, state, country, postal_code, phone, email, website";

/**
 * Shops where the signed-in user is an owner or manager. RLS on `shops` only
 * shows rows the user manages, but we still pin `shop_members` to the profile
 * so a plain barber membership never leaks in as a managed shop.
 */
export async function loadOwnerShops(profileId: string): Promise<OwnerShop[]> {
  if (!profileId) {
    return [];
  }
  const { data: memberships, error: membershipsError } = await supabase
    .from("shop_members")
    .select("shop_id, member_role")
    .eq("profile_id", profileId)
    .in("member_role", ["owner", "manager"])
    .is("removed_at", null);
  if (membershipsError) {
    throw membershipsError;
  }
  const roleById = new Map<number, "owner" | "manager">();
  for (const member of memberships ?? []) {
    roleById.set(member.shop_id, member.member_role);
  }
  const shopIds = [...roleById.keys()];
  if (shopIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("shops")
    .select(SHOP_MANAGE_SELECT)
    .in("id", shopIds);
  if (error) {
    throw error;
  }
  return ((data ?? []) as unknown as Omit<OwnerShop, "myRole">[]).map(
    (shop) => ({
      ...shop,
      myRole: roleById.get(shop.id) ?? "owner",
    })
  );
}

/** Bookings across the owned/managed shops in the [from, to) window. */
export async function loadShopBookings(
  shopIds: number[],
  from: Date,
  to: Date
): Promise<BookingRow[]> {
  const ids = [...new Set(shopIds)];
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("shop_id", ids)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as BookingRow[];
}

const STAFF_SELECT =
  "id, shop_id, profile_id, member_role, display_name, avatar_url, joined_at";

/** Active (non-removed) members of the owned/managed shops, owners first. */
export async function loadShopStaff(
  shopIds: number[]
): Promise<OwnerStaffRow[]> {
  const ids = [...new Set(shopIds)];
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("shop_members")
    .select(STAFF_SELECT)
    .in("shop_id", ids)
    .is("removed_at", null)
    .neq("member_role", "owner");
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as unknown as OwnerStaffRow[];
  const rank: Record<OwnerStaffRow["member_role"], number> = {
    owner: 0,
    manager: 1,
    barber: 2,
  };
  return rows.sort(
    (a, b) =>
      rank[a.member_role] - rank[b.member_role] ||
      a.joined_at.localeCompare(b.joined_at)
  );
}

/** Soft-removes a staff member (keeps their booking history). */
export async function removeStaffMember(memberId: number): Promise<void> {
  const { error } = await supabase
    .from("shop_members")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) {
    throw error;
  }
}

export async function loadShopServices(shopId: number): Promise<OwnerService[]> {
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, description, price_cents, duration_minutes, category, is_active, sort_order"
    )
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as OwnerService[];
}

export type ServiceInput = {
  name: string;
  description?: string | null;
  price_cents: number;
  duration_minutes: number;
  category?: string | null;
};

export async function createService(
  shopId: number,
  input: ServiceInput
): Promise<OwnerService> {
  const { data, error } = await supabase
    .from("services")
    .insert({ ...input, shop_id: shopId })
    .select(
      "id, name, description, price_cents, duration_minutes, category, is_active, sort_order"
    )
    .single();
  if (error) {
    throw error;
  }
  return data as unknown as OwnerService;
}

export async function updateService(
  id: number,
  input: ServiceInput
): Promise<OwnerService> {
  const { data, error } = await supabase
    .from("services")
    .update(input)
    .eq("id", id)
    .select(
      "id, name, description, price_cents, duration_minutes, category, is_active, sort_order"
    )
    .single();
  if (error) {
    throw error;
  }
  return data as unknown as OwnerService;
}

export async function setServiceActive(
  id: number,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) {
    throw error;
  }
}

export async function loadWorkingHours(shopId: number): Promise<WorkingHoursRow[]> {
  const { data, error } = await supabase
    .from("working_hours")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .eq("shop_id", shopId)
    .order("day_of_week", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as WorkingHoursRow[];
}

/** Replaces the whole weekly schedule (delete + insert in one call each). */
export async function saveWorkingHours(
  shopId: number,
  days: WorkingHoursRow[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("working_hours")
    .delete()
    .eq("shop_id", shopId);
  if (deleteError) {
    throw deleteError;
  }
  const rows = days.map((day) => ({
    shop_id: shopId,
    day_of_week: day.day_of_week,
    opens_at: day.is_closed ? null : day.opens_at,
    closes_at: day.is_closed ? null : day.closes_at,
    is_closed: day.is_closed,
  }));
  const { error: insertError } = await supabase
    .from("working_hours")
    .insert(rows);
  if (insertError) {
    throw insertError;
  }
}

export type ShopPatch = Partial<
  Pick<
    OwnerShop,
    | "name"
    | "description"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "country"
    | "postal_code"
    | "phone"
    | "email"
    | "website"
  >
>;

/** Editing shop details is owner-only under RLS (managers get read access). */
export async function updateShop(shopId: number, patch: ShopPatch): Promise<void> {
  const { error } = await supabase.from("shops").update(patch).eq("id", shopId);
  if (error) {
    throw error;
  }
}

export type ShopDraft = {
  name: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  address_line1?: string;
  phone?: string;
  email?: string;
  website?: string;
};

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "shop";
}

/**
 * Creates a shop via the `create_shop` RPC (owner role required, SECURITY
 * DEFINER). The RPC checks the caller's DB profile role, which the Clerk
 * webhook mirrors eventually — so we wait (bounded) for the role to land
 * before creating, so a brand-new owner isn't rejected mid-onboarding.
 */
export async function createShop(draft: ShopDraft, ownerId: string): Promise<number> {
  const synced = await waitForDbRole(ownerId, "owner");
  if (!synced) {
    throw new Error(
      "Your account is still being set up. Give it a few seconds, then try again."
    );
  }
  const suffix = Math.random().toString(36).slice(2, 6);
  const { data, error } = await supabase.rpc("create_shop", {
    p_name: draft.name.trim(),
    p_slug: `${slugify(draft.name)}-${suffix}`,
    p_description: draft.description?.trim() || null,
    p_city: draft.city?.trim() || null,
    p_state: draft.state?.trim() || null,
    p_country: draft.country?.trim() || null,
    p_postal_code: draft.postal_code?.trim() || null,
    p_address_line1: draft.address_line1?.trim() || null,
    p_phone: draft.phone?.trim() || null,
    p_email: draft.email?.trim() || null,
    p_website: draft.website?.trim() || null,
  });
  if (error) {
    throw error;
  }
  return (data as unknown as OwnerShop).id;
}
