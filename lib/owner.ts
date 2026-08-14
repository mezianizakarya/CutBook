import { BOOKING_SELECT, type BookingRow } from "@/lib/booking";
import { runList, runQuery, uniqueIds } from "@/lib/db";
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
  latitude: number | null;
  longitude: number | null;
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

export const SERVICE_SELECT =
  "id, name, description, price_cents, duration_minutes, category, is_active, sort_order";

export type WorkingHoursRow = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

const SHOP_MANAGE_SELECT =
  "id, name, slug, status, is_verified, logo_url, description, address_line1, address_line2, city, state, country, postal_code, phone, email, website, latitude, longitude";

/**
 * Shops where the signed-in user is an owner or manager. RLS on `shops` only
 * shows rows the user manages, but we still pin `shop_members` to the profile
 * so a plain barber membership never leaks in as a managed shop.
 */
export async function loadOwnerShops(profileId: string): Promise<OwnerShop[]> {
  if (!profileId) {
    return [];
  }
  const memberships = await runList<{
    shop_id: number;
    member_role: "owner" | "manager";
  }>(
    supabase
      .from("shop_members")
      .select("shop_id, member_role")
      .eq("profile_id", profileId)
      .in("member_role", ["owner", "manager"])
      .is("removed_at", null)
  );
  const roleById = new Map<number, "owner" | "manager">();
  for (const member of memberships) {
    roleById.set(member.shop_id, member.member_role);
  }
  const shopIds = [...roleById.keys()];
  if (shopIds.length === 0) {
    return [];
  }
  const shops = await runList<Omit<OwnerShop, "myRole">>(
    supabase
      .from("shops")
      .select(SHOP_MANAGE_SELECT)
      .in("id", shopIds)
      .is("deleted_at", null)
  );
  return shops.map((shop) => ({
    ...shop,
    myRole: roleById.get(shop.id) ?? "owner",
  }));
}

/** Bookings across the owned/managed shops in the [from, to) window. */
export async function loadShopBookings(
  shopIds: number[],
  from: Date,
  to: Date
): Promise<BookingRow[]> {
  const ids = uniqueIds(shopIds);
  if (ids.length === 0) {
    return [];
  }
  return runList<BookingRow>(
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .in("shop_id", ids)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at", { ascending: false })
  );
}

const STAFF_SELECT =
  "id, shop_id, profile_id, member_role, display_name, avatar_url, joined_at";

/** Active (non-removed) members of the owned/managed shops, owners first. */
export async function loadShopStaff(
  shopIds: number[]
): Promise<OwnerStaffRow[]> {
  const ids = uniqueIds(shopIds);
  if (ids.length === 0) {
    return [];
  }
  const rows = await runList<OwnerStaffRow>(
    supabase
      .from("shop_members")
      .select(STAFF_SELECT)
      .in("shop_id", ids)
      .is("removed_at", null)
      .neq("member_role", "owner")
  );
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
  return runList<OwnerService>(
    supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
  );
}

export type ServiceInput = {
  name: string;
  description?: string | null;
  price_cents: number;
  duration_minutes: number;
  category?: string | null;
};

export function validateServiceInput(input: ServiceInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) {
    errors.push("Service name is required.");
  }
  if (!Number.isFinite(input.price_cents) || input.price_cents < 0) {
    errors.push("Price must be zero or more.");
  }
  if (!Number.isInteger(input.duration_minutes) || input.duration_minutes <= 0) {
    errors.push("Duration must be a positive number of minutes.");
  }
  return errors;
}

export async function createService(
  shopId: number,
  input: ServiceInput
): Promise<OwnerService> {
  const errors = validateServiceInput(input);
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }
  return runQuery<OwnerService>(
    supabase
      .from("services")
      .insert({ ...input, shop_id: shopId })
      .select(SERVICE_SELECT)
      .single()
  );
}

export async function updateService(
  id: number,
  input: ServiceInput
): Promise<OwnerService> {
  const errors = validateServiceInput(input);
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }
  return runQuery<OwnerService>(
    supabase.from("services").update(input).eq("id", id).select(SERVICE_SELECT).single()
  );
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
  return runList<WorkingHoursRow>(
    supabase
      .from("working_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("shop_id", shopId)
      .order("day_of_week", { ascending: true })
  );
}

export type UpcomingBooking = {
  id: number;
  starts_at: string;
  ends_at: string;
  service_name: string;
};

/**
 * Active upcoming bookings for a shop over the booking horizon (14 days).
 * Used to warn owners before saving working hours that would push an existing
 * booking outside the new schedule.
 */
export async function loadUpcomingBookings(
  shopId: number
): Promise<UpcomingBooking[]> {
  const from = new Date();
  const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
  return runList<UpcomingBooking>(
    supabase
      .from("bookings")
      .select("id, starts_at, ends_at, service_name")
      .eq("shop_id", shopId)
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at", { ascending: true })
  );
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
    | "logo_url"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "country"
    | "postal_code"
    | "phone"
    | "email"
    | "website"
    | "latitude"
    | "longitude"
  >
>;

/** Editing shop details is owner-only under RLS (managers get read access). */
export async function updateShop(shopId: number, patch: ShopPatch): Promise<void> {
  const { error } = await supabase.from("shops").update(patch).eq("id", shopId);
  if (error) {
    throw error;
  }
}

/**
 * Soft-deletes a shop via the `delete_shop` RPC (owner or admin only, SECURITY
 * DEFINER). Sets `deleted_at` + `is_active = false` so it vanishes from all
 * customer-facing queries; history and bookings are preserved.
 */
export async function deleteShop(shopId: number): Promise<void> {
  const { error } = await supabase.rpc("delete_shop", { p_shop_id: shopId });
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
  latitude?: number;
  longitude?: number;
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

const SHOP_NAME_PATTERN = /^[\p{L}\p{N} '-]+$/u;

export function sanitizeShopName(value: string): string {
  return value.replace(/[^\p{L}\p{N} '-]+/gu, "");
}

export function shopNameError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Please enter your shop's name.";
  }
  if (!SHOP_NAME_PATTERN.test(trimmed)) {
    return "Shop name can only contain letters and numbers.";
  }
  return null;
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
  const shop = await runQuery<OwnerShop>(
    supabase.rpc("create_shop", {
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
      p_latitude: draft.latitude ?? null,
      p_longitude: draft.longitude ?? null,
    })
  );
  return shop.id;
}

type MediaBucket = "shop-logos" | "shop-gallery";

/**
 * Uploads a `data:` URI to a shop media bucket under `<shop_id>/...`. Storage
 * RLS only allows owner/manager uploads into their own shop's folder, so this
 * must run AFTER the shop (and the owner's membership) exists.
 */
async function uploadShopMedia(
  bucket: MediaBucket,
  shopId: number,
  dataUri: string
): Promise<string> {
  const metaMatch = dataUri.match(/^data:([^;]+);/);
  const mime = metaMatch?.[1] ?? "image/jpeg";
  const base64 = dataUri.split(",")[1];
  if (!base64) {
    throw new Error("Could not read the selected photo. Please try again.");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const extension = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${shopId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes.buffer, { contentType: mime });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Uploads the shop logo and points `shops.logo_url` at it. */
export async function uploadShopLogo(shopId: number, logoUri: string): Promise<void> {
  const publicUrl = await uploadShopMedia("shop-logos", shopId, logoUri);
  await updateShop(shopId, { logo_url: publicUrl });
}

/**
 * Saves the logo for an existing shop. A `data:` URI is uploaded and
 * `shops.logo_url` is pointed at it; `null` clears the logo; an already-public
 * URL (unchanged) is a no-op.
 */
export async function saveShopLogo(shopId: number, logoUri: string | null): Promise<void> {
  if (logoUri == null) {
    await updateShop(shopId, { logo_url: null });
    return;
  }
  if (logoUri.startsWith("data:")) {
    await uploadShopLogo(shopId, logoUri);
  }
}

/** Public gallery photo URLs for a shop, ordered as displayed. */
export { loadShopGallery } from "@/lib/shop";

/**
 * Replaces a shop's gallery photos (first photo becomes the cover). Existing
 * rows are cleared first so a failed upload can be retried without duplicating
 * rows; an empty list clears the gallery. Accepts `data:` URIs to upload and
 * existing public URLs to reuse as-is.
 */
export async function uploadShopGallery(
  shopId: number,
  galleryUris: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("shop_gallery")
    .delete()
    .eq("shop_id", shopId);
  if (deleteError) {
    throw deleteError;
  }
  if (galleryUris.length === 0) {
    return;
  }
  const rows: {
    shop_id: number;
    object_path: string;
    caption: string | null;
    is_cover: boolean;
    sort_order: number;
  }[] = [];
  for (let i = 0; i < galleryUris.length; i++) {
    const uri = galleryUris[i];
    const objectPath = uri.startsWith("data:")
      ? await uploadShopMedia("shop-gallery", shopId, uri)
      : uri;
    rows.push({
      shop_id: shopId,
      object_path: objectPath,
      caption: null,
      is_cover: i === 0,
      sort_order: i + 1,
    });
  }
  const { error: insertError } = await supabase.from("shop_gallery").insert(rows);
  if (insertError) {
    throw insertError;
  }
}
