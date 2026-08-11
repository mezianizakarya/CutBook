import { runMaybe } from "@/lib/db";
import type { Role } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

export type OnboardingStep = "basics" | "professional" | "shop" | "complete";

export const ONBOARDING_STEPS: Record<OnboardingStep, OnboardingStep> = {
  basics: "basics",
  professional: "professional",
  shop: "shop",
  complete: "complete",
};

export type OwnProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  specialty: string | null;
  years_of_experience: number | null;
  role: Role | null;
  username: string | null;
};

const OWN_PROFILE_SELECT =
  "id, email, first_name, last_name, phone, avatar_url, bio, city, specialty, years_of_experience, role, username";

export async function fetchOwnProfile(userId: string): Promise<OwnProfile | null> {
  return runMaybe<OwnProfile>(
    supabase
      .from("profiles")
      .select(OWN_PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle()
  );
}

/**
 * Whether a barber has completed their required professional fields.
 * Mirrors the authoritative gate in `redeem_shop_invitation`: BOTH a
 * non-blank specialty and a valid years_of_experience are required. Bio is
 * optional and never gates joining a shop.
 */
export function isBarberProfessionalComplete(
  profile: Pick<OwnProfile, "specialty" | "years_of_experience"> | null
): boolean {
  return (
    profile?.specialty != null &&
    profile.specialty.trim() !== "" &&
    profile.years_of_experience != null
  );
}

export async function saveBarberProfessional(
  userId: string,
  input: {
    specialty: string | null;
    yearsOfExperience: number | null;
    bio?: string | null;
  }
): Promise<void> {
  const specialty = input.specialty?.trim() ? input.specialty.trim() : null;
  const { error } = await supabase
    .from("profiles")
    .update({
      specialty,
      years_of_experience: input.yearsOfExperience,
      ...(input.bio !== undefined && {
        bio: input.bio?.trim() ? input.bio.trim() : null,
      }),
    })
    .eq("id", userId);
  if (error) {
    throw error;
  }
}

/**
 * Polls `profiles.role` until it matches the expected value. The Clerk webhook
 * mirrors the chosen role to the DB eventually, and clients can no longer write
 * `role` directly — so onboarding that depends on the DB role (creating a shop)
 * waits briefly for the mirror to land.
 */
export async function waitForDbRole(
  userId: string,
  expected: Role,
  timeoutMs = 15000,
  intervalMs = 1500
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data && (data as { role: string }).role === expected) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
