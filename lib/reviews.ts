import { runList, runMaybe, runQuery } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export type ReviewStatus = "pending" | "published" | "hidden" | "removed";

export type ReviewRow = {
  id: number;
  shop_id: number;
  customer_id: string;
  booking_id: number | null;
  rating: number;
  comment: string | null;
  author_name: string;
  owner_response: string | null;
  responded_at: string | null;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
};

export type ReviewInput = {
  shopId: number;
  customerId: string;
  bookingId?: number;
  rating: number;
  comment?: string;
};

export const REVIEW_SELECT =
  "id, shop_id, customer_id, booking_id, rating, comment, author_name, owner_response, responded_at, status, created_at, updated_at";

/** The shop's publicly visible reviews, newest first. */
export async function loadShopReviews(shopId: number): Promise<ReviewRow[]> {
  return runList<ReviewRow>(
    supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("shop_id", shopId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
  );
}

/** The caller's own review for a shop (any status), or null when none. */
export async function loadMyShopReview(
  shopId: number,
  customerId: string
): Promise<ReviewRow | null> {
  return runMaybe<ReviewRow>(
    supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("shop_id", shopId)
      .eq("customer_id", customerId)
      .maybeSingle()
  );
}

/** The most recent completed booking a customer has at a shop, if any. */
export async function loadCompletedBookingId(
  shopId: number,
  customerId: string
): Promise<number | null> {
  const row = await runMaybe<{ id: number }>(
    supabase
      .from("bookings")
      .select("id")
      .eq("shop_id", shopId)
      .eq("customer_id", customerId)
      .eq("status", "completed")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );
  return row?.id ?? null;
}

export async function createReview(input: ReviewInput): Promise<ReviewRow> {
  return runQuery<ReviewRow>(
    supabase
      .from("reviews")
      .insert({
        shop_id: input.shopId,
        customer_id: input.customerId,
        booking_id: input.bookingId ?? null,
        rating: input.rating,
        comment: input.comment?.trim() ? input.comment.trim() : null,
      })
      .select(REVIEW_SELECT)
      .single()
  );
}

export async function updateReview(
  reviewId: number,
  rating: number,
  comment: string | null
): Promise<ReviewRow> {
  return runQuery<ReviewRow>(
    supabase
      .from("reviews")
      .update({
        rating,
        comment: comment?.trim() ? comment.trim() : null,
      })
      .eq("id", reviewId)
      .select(REVIEW_SELECT)
      .single()
  );
}

export async function deleteReview(reviewId: number): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) {
    throw error;
  }
}
