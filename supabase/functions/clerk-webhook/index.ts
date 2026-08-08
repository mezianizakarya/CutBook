import { verifyWebhook } from "npm:@clerk/backend@3.15.1/webhooks";
import { createClient } from "npm:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");

// Roles that can be assigned from Clerk metadata. `admin` is intentionally
// excluded: it can only be granted by editing profiles.role in Supabase.
const VALID_ROLES = new Set(["customer", "barber", "owner"]);

type ClerkEvent = {
  type: string;
  data: {
    object: string;
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    has_image?: boolean;
    primary_email_address_id?: string | null;
    email_addresses?: { id?: string; email_address?: string }[];
    phone_numbers?: { phone_number?: string }[];
    last_sign_in_at?: number | null;
    unsafe_metadata?: Record<string, unknown>;
  };
};

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Idempotent upsert so Clerk retries can be replayed safely. */
async function upsertProfile(data: ClerkEvent["data"]): Promise<void> {
  if (data.object !== "user") {
    return;
  }

  const email =
    data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
      ?.email_address ??
    data.email_addresses?.[0]?.email_address ??
    "";

  const record: Record<string, unknown> = {
    id: data.id,
    email,
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    avatar_url: data.has_image ? (data.image_url ?? null) : null,
    last_active_at: data.last_sign_in_at
      ? new Date(data.last_sign_in_at).toISOString()
      : null,
    deleted_at: null,
  };

  const metadata = data.unsafe_metadata ?? {};
  if (typeof metadata.role === "string" && VALID_ROLES.has(metadata.role)) {
    record.role = metadata.role;
  }
  if (typeof metadata.profileCompleted === "boolean") {
    record.onboarding_completed = metadata.profileCompleted;
  }
  if (
    typeof metadata.onboardingStep === "string" &&
    ["basics", "professional", "shop", "complete"].includes(metadata.onboardingStep)
  ) {
    record.onboarding_step = metadata.onboardingStep;
  }
  const phone = metadata.phone ?? data.phone_numbers?.[0]?.phone_number;
  if (typeof phone === "string" && phone.length > 0) {
    record.phone = phone;
  }

  const { error } = await getAdminClient()
    .from("profiles")
    .upsert(record, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

/** Soft delete keeps booking/review history (FKs are ON DELETE RESTRICT). */
async function softDeleteProfile(id: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!webhookSecret) {
    return new Response("CLERK_WEBHOOK_SECRET is not configured", { status: 500 });
  }

  let event: ClerkEvent;
  try {
    event = (await verifyWebhook(req, { signingSecret: webhookSecret })) as unknown as ClerkEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await upsertProfile(event.data);
        break;
      case "user.deleted":
        await softDeleteProfile(event.data.id);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Failed to sync profile for ${event.type}:`, err);
    return new Response("Sync failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
