import { runList, runMaybe } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export type ShopVerificationStatus = "pending" | "approved" | "rejected";

export type ShopVerificationRequest = {
  id: number;
  shop_id: number;
  status: ShopVerificationStatus;
  note: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ShopVerificationState = {
  isVerified: boolean;
  request: ShopVerificationRequest | null;
};

export type PendingShopVerificationRequest = {
  id: number;
  shop_id: number;
  note: string | null;
  created_at: string;
  shops: {
    name: string;
    slug: string;
    city: string | null;
    logo_url: string | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
};

const REQUEST_SELECT =
  "id, shop_id, status, note, review_note, reviewed_at, created_at";

export async function fetchShopVerificationState(
  shopId: number
): Promise<ShopVerificationState> {
  const [shop, request] = await Promise.all([
    runMaybe<{ is_verified: boolean }>(
      supabase.from("shops").select("is_verified").eq("id", shopId).maybeSingle()
    ),
    fetchLatestShopVerificationRequest(shopId),
  ]);
  return {
    isVerified: shop?.is_verified ?? false,
    request,
  };
}

export async function fetchLatestShopVerificationRequest(
  shopId: number
): Promise<ShopVerificationRequest | null> {
  const requests = await runList<ShopVerificationRequest>(
    supabase
      .from("shop_verification_requests")
      .select(REQUEST_SELECT)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(1)
  );
  return requests[0] ?? null;
}

export async function loadPendingShopVerificationRequests(): Promise<
  PendingShopVerificationRequest[]
> {
  return runList<PendingShopVerificationRequest>(
    supabase
      .from("shop_verification_requests")
      .select(
        "id, shop_id, note, created_at, shops(id, name, slug, city, logo_url, profiles!shops_created_by_fkey(first_name, last_name))"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
  );
}

export async function countPendingShopVerificationRequests(): Promise<number> {
  const { count, error } = await supabase
    .from("shop_verification_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function submitShopVerificationRequest(
  shopId: number,
  note: string
): Promise<ShopVerificationRequest> {
  const { data, error } = await supabase.rpc("submit_shop_verification_request", {
    p_shop_id: shopId,
    p_note: note.trim() || null,
  });
  if (error) {
    throw error;
  }
  return data as unknown as ShopVerificationRequest;
}

export async function withdrawShopVerificationRequest(
  requestId: number
): Promise<void> {
  const { error } = await supabase.rpc("withdraw_shop_verification_request", {
    p_request_id: requestId,
  });
  if (error) {
    throw error;
  }
}
