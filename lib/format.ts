export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) {
    return "—";
  }
  const value = cents / 100;
  const digits = cents % 100 === 0 ? 0 : 2;
  return `$${value.toFixed(digits)}`;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? "—";
}

export function formatRange(startIso: string, endIso: string | null | undefined): string {
  const start = formatTime(startIso);
  const end = formatTime(endIso);
  if (end === "—") {
    return start;
  }
  return `${start} – ${end}`;
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  const left = typeof a === "string" ? new Date(a) : a;
  const right = typeof b === "string" ? new Date(b) : b;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toDateKey(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(value);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Formats a Postgres `time` column value (e.g. "09:30:00") as "9:30 AM". */
export function formatTimeOfDay(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) {
    return "—";
  }
  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

export function formatOpenRange(
  opensAt: string | null | undefined,
  closesAt: string | null | undefined
): string {
  if (!opensAt || !closesAt) {
    return "—";
  }
  return `${formatTimeOfDay(opensAt)} – ${formatTimeOfDay(closesAt)}`;
}

type FormatRatingOptions = {
  /** Whether to include the review count. Defaults to true. */
  showCount?: boolean;
  /** Word appended after the count, e.g. "reviews". */
  suffix?: string;
  /** "parens" renders "(12)", "dot" renders "· 12". Defaults to "parens". */
  style?: "parens" | "dot";
  /** Shown when there are no reviews. Defaults to "New". */
  fallback?: string;
};

/** Formats a shop rating + review count, e.g. "4.5 (12)" or "4.5 · 12 reviews". */
export function formatRating(
  ratingAvg: number | null | undefined,
  ratingCount: number | null | undefined,
  options?: FormatRatingOptions
): string {
  if (ratingAvg == null || ratingCount == null || ratingCount <= 0) {
    return options?.fallback ?? "New";
  }
  const avg = Number(ratingAvg).toFixed(1);
  if (options?.showCount === false) {
    return avg;
  }
  const suffix = options?.suffix ? `${ratingCount} ${options.suffix}` : String(ratingCount);
  if (options?.style === "dot") {
    return `${avg} · ${suffix}`;
  }
  return `${avg} (${suffix})`;
}
