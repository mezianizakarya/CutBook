import { runList, runMaybe } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type VerificationRequest = {
  id: number;
  profile_id: string;
  status: VerificationStatus;
  note: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type VerificationState = {
  isVerified: boolean;
  request: VerificationRequest | null;
};

export type PendingVerificationRequest = {
  id: number;
  profile_id: string;
  note: string | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: "customer" | "barber" | "owner" | "admin" | null;
  } | null;
};

const REQUEST_SELECT =
  "id, profile_id, status, note, review_note, reviewed_at, created_at";

export async function fetchVerificationState(
  userId: string
): Promise<VerificationState> {
  const [profile, requests] = await Promise.all([
    runMaybe<{ is_verified: boolean }>(
      supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", userId)
        .maybeSingle()
    ),
    fetchLatestVerificationRequest(userId),
  ]);
  return {
    isVerified: profile?.is_verified ?? false,
    request: requests,
  };
}

export async function fetchLatestVerificationRequest(
  userId: string
): Promise<VerificationRequest | null> {
  const requests = await runList<VerificationRequest>(
    supabase
      .from("verification_requests")
      .select(REQUEST_SELECT)
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
  );
  return requests[0] ?? null;
}

export async function loadPendingVerificationRequests(): Promise<
  PendingVerificationRequest[]
> {
  return runList<PendingVerificationRequest>(
    supabase
      .from("verification_requests")
      .select(
        "id, profile_id, note, created_at, profiles!verification_requests_profile_id_fkey(first_name, last_name, email, avatar_url, role)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
  );
}

export async function countPendingVerificationRequests(): Promise<number> {
  const { count, error } = await supabase
    .from("verification_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function submitVerificationRequest(
  note: string
): Promise<VerificationRequest> {
  const { data, error } = await supabase.rpc("submit_verification_request", {
    p_note: note.trim() || null,
  });
  if (error) {
    throw error;
  }
  return data as unknown as VerificationRequest;
}

export async function withdrawVerificationRequest(
  requestId: number
): Promise<void> {
  const { error } = await supabase.rpc("withdraw_verification_request", {
    p_request_id: requestId,
  });
  if (error) {
    throw error;
  }
}
