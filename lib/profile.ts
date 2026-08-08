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
  const { data, error } = await supabase
    .from("profiles")
    .select(OWN_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data as unknown as OwnProfile | null) ?? null;
}

export async function saveBarberProfessional(
  userId: string,
  input: { specialty: string | null; yearsOfExperience: number | null }
): Promise<void> {
  const specialty = input.specialty?.trim() ? input.specialty.trim() : null;
  const { error } = await supabase
    .from("profiles")
    .update({
      specialty,
      years_of_experience: input.yearsOfExperience,
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
