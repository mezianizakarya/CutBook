import { supabase } from "@/lib/supabase";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/**
 * Lowercased usernames that no one may claim. The platform admin is seeded as
 * `admin` by migration, so that entry is both reserved AND owned by one row.
 * Extend this list freely — it is the single source of truth for the app.
 */
export const RESERVED_USERNAMES: readonly string[] = [
  "administrator",
  "zakarya",
  "support",
  "help",
  "root",
  "system",
  "owner",
  "barber",
  "customer",
  "staff",
  "api",
  "settings",
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "account",
  "accounts",
  "profile",
  "profiles",
  "shop",
  "shops",
  "booking",
  "bookings",
  "discover",
  "favorites",
  "home",
  "dashboard",
  "notifications",
  "messages",
  "chat",
  "contact",
  "security",
  "privacy",
  "terms",
  "about",
  "null",
  "undefined",
  "true",
  "false",
  "www",
  "mail",
  "ftp",
  "test",
  "janedoe123",
  "guest",
  "official",
  "verified",
  "cutbook",
  "cutbookapp",
];

export const RESERVED_USERNAME_SET: ReadonlySet<string> = new Set(
  RESERVED_USERNAMES
);

/**
 * Profanity is matched as a whole token or a substring bounded by `.` / `_` /
 * the start / the end, after a light leetspeak normalization. This avoids the
 * classic false positives ("massage" contains "ass", "button" contains "butt")
 * while still blocking "f.u.c.k" and standalone profanity. Expand freely.
 */
export const PROFANITY_WORDS: readonly string[] = [
  "anal",
  "anus",
  "arse",
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "blowjob",
  "bollocks",
  "boner",
  "boob",
  "bugger",
  "butt",
  "clit",
  "cock",
  "coon",
  "crap",
  "cum",
  "cunt",
  "dick",
  "dildo",
  "dyke",
  "fag",
  "faggot",
  "fuck",
  "fucking",
  "gangbang",
  "genital",
  "goddamn",
  "gook",
  "handjob",
  "homo",
  "horny",
  "jackass",
  "jerkoff",
  "jizz",
  "kike",
  "knob",
  "labia",
  "lesbo",
  "masturbate",
  "milf",
  "motherfucker",
  "nazi",
  "nigga",
  "nigger",
  "nipple",
  "nude",
  "nudity",
  "orgasm",
  "paki",
  "penis",
  "perv",
  "pimp",
  "piss",
  "porn",
  "pornography",
  "prick",
  "pussy",
  "queer",
  "rape",
  "rapist",
  "retard",
  "semen",
  "sex",
  "shit",
  "slut",
  "spic",
  "tits",
  "titties",
  "turd",
  "twat",
  "vagina",
  "viagra",
  "vibrator",
  "wanker",
  "whore",
  "wtf",
];

const PROFANITY_SEPARATOR_BOUNDARY = new RegExp(
  `(^|[._])(${PROFANITY_WORDS.map(escapeRegex).join("|")})([._]|$)`,
  "i"
);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Lowercases a username for storage. Usernames are stored and matched
 * case-insensitively (uniqueness + the is_username_taken RPC both use lower()).
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * "Strip an @ sign" for raw search input, e.g. "@zakaria" -> "zakaria".
 */
export function stripAtPrefix(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

/**
 * Clean text for a username input field: lowercase, drop a leading @ and any
 * character outside a-z, 0-9, `.` and `_`. Structural issues (double
 * separators, leading/trailing separators) are kept so validation can flag them.
 */
export function sanitizeUsernameInput(raw: string): string {
  return stripAtPrefix(raw).toLowerCase().replace(/[^a-z0-9._]/g, "");
}

/** Display form used across the app: "zakaria" -> "@zakaria". */
export function formatUsername(username: string | null | undefined): string {
  return username ? `@${username}` : "";
}

/**
 * Builds a safe base for a suggested username from a person's name
 * (alphanumerics only). Consumers usually append a short suffix for uniqueness.
 */
export function suggestUsername(firstName: string, lastName: string): string {
  const base = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  return base || "user";
}

/** True when the name matches profanity after leetspeak normalization. */
export function containsProfanity(username: string): boolean {
  const normalized = username
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
  // Separator-bounded match ("my.ass", "bad_shit")...
  if (PROFANITY_SEPARATOR_BOUNDARY.test(normalized)) {
    return true;
  }
  // ...plus the separator-stripped whole-string match, which catches
  // obfuscations like "f.u.c.k" -> "fuck" without reintroducing the
  // "massage contains ass" false positives (boundaries become start/end only).
  const stripped = normalized.replace(/[._]/g, "");
  return stripped.length > 0 && PROFANITY_SEPARATOR_BOUNDARY.test(stripped);
}

/**
 * Validates a username against the product rules and returns every violation
 * as a human-readable message. An empty array means the username is valid.
 *
 * An empty value returns no errors on purpose — treat that as "not filled in
 * yet" and enforce presence at submit time (both forms prefill a value).
 */
export function validateUsername(raw: string): string[] {
  const username = normalizeUsername(raw);
  if (!username) {
    return [];
  }
  const errors: string[] = [];

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    errors.push(
      `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`
    );
  }
  if (!/^[a-z0-9._]+$/.test(username)) {
    errors.push("Only lowercase letters, numbers, '.' and '_' are allowed.");
  }
  if (/^[._]/.test(username) || /[._]$/.test(username)) {
    errors.push("Username cannot start or end with '.' or '_'.");
  }
  if (/[._]{2,}/.test(username)) {
    errors.push("Username cannot contain consecutive '.' or '_'.");
  }
  if (RESERVED_USERNAME_SET.has(username)) {
    errors.push("Username contains reserved words.");
  }
  if (containsProfanity(username)) {
    errors.push("Username contains inappropriate language.");
  }
  return errors;
}

/**
 * Availability check that works despite RLS (the is_username_taken RPC is
 * SECURITY DEFINER and excludes the caller's own profile). Returns true when
 * the name is already claimed by someone else.
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return false;
  }
  const { data } = await supabase.rpc("is_username_taken", {
    p_username: normalized,
  });
  return data === true;
}
