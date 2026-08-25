import type { StatusTone } from "@/components/ui/StatusBadge";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/i18n";

export const REPUTATION_LEVELS = ["new", "regular", "reliable", "trusted", "elite"] as const;

export type ReputationLevel = (typeof REPUTATION_LEVELS)[number];

export function isReputationLevel(value: string | null | undefined): value is ReputationLevel {
  return value != null && (REPUTATION_LEVELS as readonly string[]).includes(value);
}

export function getReputationLabel(level: ReputationLevel): string {
  return t(`reputation.${level}` as any);
}

export const REPUTATION_TONES: Record<ReputationLevel, StatusTone> = {
  new: "slate",
  regular: "blue",
  reliable: "green",
  trusted: "cyan",
  elite: "violet",
};

export type CustomerReputation = {
  level: ReputationLevel;
  trustScore: number;
  completedCount: number;
  noShowCount: number;
  reliabilityRate: number | null;
};

/**
 * Reads the backend-computed reputation row for the current user. The level is
 * generated in the database (admin override else auto_level); the client never
 * calculates or writes it. Missing rows (no bookings yet) resolve to `new`.
 */
export async function fetchMyReputation(): Promise<CustomerReputation | null> {
  const { data } = await supabase
    .from("customer_reputation")
    .select(
      "level, trust_score, completed_count, no_show_count, reliability_rate"
    )
    .maybeSingle();

  if (!data) {
    return null;
  }

  const row = data as {
    level: string | null;
    trust_score: number;
    completed_count: number;
    no_show_count: number;
    reliability_rate: number | null;
  };

  return {
    level: isReputationLevel(row.level) ? row.level : "new",
    trustScore: row.trust_score ?? 0,
    completedCount: row.completed_count ?? 0,
    noShowCount: row.no_show_count ?? 0,
    reliabilityRate: row.reliability_rate,
  };
}

/**
 * Empty fallback shown until a customer has any booking history (matches the
 * database defaults in customer_reputation).
 */
export function emptyReputation(): CustomerReputation {
  return {
    level: "new",
    trustScore: 0,
    completedCount: 0,
    noShowCount: 0,
    reliabilityRate: null,
  };
}

/** @deprecated Use getReputationLabel() instead */
export const REPUTATION_LABELS: Record<ReputationLevel, string> = {
  new: "New",
  regular: "Regular",
  reliable: "Reliable",
  trusted: "Trusted",
  elite: "Elite",
};
