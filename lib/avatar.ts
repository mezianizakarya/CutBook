/** Builds avatar initials, e.g. "JD" for "Jane Doe" or "J" for a single name. */
export function getInitials(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

/** Light pastel backgrounds for initials/letter fallbacks (black text stays readable). */
const AVATAR_COLORS = [
  "#EAF2FE",
  "#DCFCE7",
  "#FEE2E2",
  "#FEF3C7",
  "#EDE9FE",
  "#FFE4E6",
  "#CCFBF1",
  "#E0F2FE",
  "#FFEDD5",
  "#FCE7F3",
];

/**
 * Deterministic background color for an avatar/logo fallback. Stable per seed
 * (name/id), so a user or shop keeps the same color across renders.
 */
export function avatarColor(seed: string | null | undefined): string {
  const key = seed ?? "";
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
