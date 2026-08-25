type WeightEntry = readonly [number, string];

const RUBIK_WEIGHTS: readonly WeightEntry[] = [
  [300, "Rubik-Light"],
  [400, "Rubik-Regular"],
  [500, "Rubik-Medium"],
  [600, "Rubik-SemiBold"],
  [700, "Rubik-Bold"],
  [800, "Rubik-ExtraBold"],
  [900, "Rubik-Black"],
];

const TAJAWAL_WEIGHTS: readonly WeightEntry[] = [
  [200, "Tajawal-ExtraLight"],
  [300, "Tajawal-Light"],
  [400, "Tajawal-Regular"],
  [500, "Tajawal-Medium"],
  [700, "Tajawal-Bold"],
  [800, "Tajawal-ExtraBold"],
  [900, "Tajawal-Black"],
];

const ARABIC_CHAR_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function normalizeFontWeight(weight: unknown): number {
  if (weight === "bold") {
    return 700;
  }
  if (weight === "normal" || weight == null) {
    return 400;
  }
  const numeric =
    typeof weight === "number" ? weight : Number.parseInt(String(weight), 10);
  return numeric >= 100 && numeric <= 900 ? numeric : 400;
}

export function resolveFontFamily(arabic: boolean, weight: unknown): string {
  const target = normalizeFontWeight(weight);
  const table = arabic ? TAJAWAL_WEIGHTS : RUBIK_WEIGHTS;
  let best = table[0];
  let bestDiff = Math.abs(target - best[0]);
  for (const entry of table) {
    const diff = Math.abs(target - entry[0]);
    if (diff < bestDiff || (diff === bestDiff && entry[0] > best[0])) {
      best = entry;
      bestDiff = diff;
    }
  }
  return best[1];
}

export function containsArabicText(value: unknown): boolean {
  if (typeof value === "string") {
    return ARABIC_CHAR_RE.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(containsArabicText);
  }
  return false;
}
