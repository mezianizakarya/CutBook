import { supabase } from "@/lib/supabase";

/** An invitation as returned by the create/revoke RPCs and the listing query. */
export type ShopInvitation = {
  id: number;
  shop_id: number;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  used_by: string | null;
  used_at: string | null;
};

export type InvitationStatus = "active" | "used" | "expired" | "revoked";

export function invitationStatus(
  invitation: ShopInvitation,
  now = new Date()
): InvitationStatus {
  if (invitation.used_at) {
    return "used";
  }
  if (invitation.revoked_at) {
    return "revoked";
  }
  if (new Date(invitation.expires_at).getTime() < now.getTime()) {
    return "expired";
  }
  return "active";
}

const INVITATION_SELECT =
  "id, shop_id, code, created_by, created_at, expires_at, revoked_at, revoked_by, used_by, used_at";

/**
 * Invitations across the given shops. RLS scopes the read to shop
 * owner/manager (or admin) rows.
 */
export async function loadShopInvitations(
  shopIds: number[]
): Promise<ShopInvitation[]> {
  const ids = [...new Set(shopIds)];
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("shop_invitations")
    .select(INVITATION_SELECT)
    .in("shop_id", ids)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as ShopInvitation[];
}

/** Owner/manager creates a fresh single-use code (valid 7 days). */
export async function createShopInvitation(
  shopId: number
): Promise<ShopInvitation> {
  const { data, error } = await supabase
    .rpc("create_shop_invitation", { p_shop_id: shopId, p_expires_in_days: 7 })
    .single();
  if (error) {
    throw error;
  }
  return data as unknown as ShopInvitation;
}

export async function revokeShopInvitation(
  invitationId: number
): Promise<ShopInvitation> {
  const { data, error } = await supabase
    .rpc("revoke_shop_invitation", { p_invitation_id: invitationId })
    .single();
  if (error) {
    throw error;
  }
  return data as unknown as ShopInvitation;
}

export type RedeemResult = {
  member_id: number;
  shop_id: number;
  shop_name: string;
  display_name: string;
};

/**
 * Redeems a single-use code as the signed-in barber. Atomic and single-use
 * at the database level (the invitation row is locked inside the RPC).
 */
export async function redeemShopInvitation(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase
    .rpc("redeem_shop_invitation", { p_code: code })
    .single();
  if (error) {
    throw error;
  }
  return data as unknown as RedeemResult;
}
