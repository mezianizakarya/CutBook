export type Country = {
  name: string;
  flag: string;
  /** ISO 3166-1 alpha-2, e.g. "DZ". */
  code: string;
  /** International dialing code including the "+", e.g. "+213". */
  dialCode: string;
  /** Minimum digits in the national number, excluding the dialing code. */
  minDigits: number;
  /** Maximum digits in the national number, excluding the dialing code. */
  maxDigits: number;
};

/** Country list used by the phone input's country picker. Sorted by name. */
export const COUNTRIES: readonly Country[] = [
  { name: "Algeria", flag: "🇩🇿", code: "DZ", dialCode: "+213", minDigits: 9, maxDigits: 9 },
  { name: "Argentina", flag: "🇦🇷", code: "AR", dialCode: "+54", minDigits: 8, maxDigits: 10 },
  { name: "Australia", flag: "🇦🇺", code: "AU", dialCode: "+61", minDigits: 8, maxDigits: 9 },
  { name: "Austria", flag: "🇦🇹", code: "AT", dialCode: "+43", minDigits: 9, maxDigits: 11 },
  { name: "Bahrain", flag: "🇧🇭", code: "BH", dialCode: "+973", minDigits: 8, maxDigits: 8 },
  { name: "Bangladesh", flag: "🇧🇩", code: "BD", dialCode: "+880", minDigits: 10, maxDigits: 10 },
  { name: "Belgium", flag: "🇧🇪", code: "BE", dialCode: "+32", minDigits: 8, maxDigits: 9 },
  { name: "Brazil", flag: "🇧🇷", code: "BR", dialCode: "+55", minDigits: 10, maxDigits: 11 },
  { name: "Bulgaria", flag: "🇧🇬", code: "BG", dialCode: "+359", minDigits: 8, maxDigits: 9 },
  { name: "Cambodia", flag: "🇰🇭", code: "KH", dialCode: "+855", minDigits: 8, maxDigits: 9 },
  { name: "Cameroon", flag: "🇨🇲", code: "CM", dialCode: "+237", minDigits: 9, maxDigits: 9 },
  { name: "Canada", flag: "🇨🇦", code: "CA", dialCode: "+1", minDigits: 10, maxDigits: 10 },
  { name: "Chile", flag: "🇨🇱", code: "CL", dialCode: "+56", minDigits: 8, maxDigits: 9 },
  { name: "China", flag: "🇨🇳", code: "CN", dialCode: "+86", minDigits: 11, maxDigits: 11 },
  { name: "Colombia", flag: "🇨🇴", code: "CO", dialCode: "+57", minDigits: 10, maxDigits: 10 },
  { name: "Croatia", flag: "🇭🇷", code: "HR", dialCode: "+385", minDigits: 8, maxDigits: 9 },
  { name: "Czechia", flag: "🇨🇿", code: "CZ", dialCode: "+420", minDigits: 9, maxDigits: 9 },
  { name: "Denmark", flag: "🇩🇰", code: "DK", dialCode: "+45", minDigits: 8, maxDigits: 8 },
  { name: "Ecuador", flag: "🇪🇨", code: "EC", dialCode: "+593", minDigits: 9, maxDigits: 10 },
  { name: "Egypt", flag: "🇪🇬", code: "EG", dialCode: "+20", minDigits: 10, maxDigits: 10 },
  { name: "Ethiopia", flag: "🇪🇹", code: "ET", dialCode: "+251", minDigits: 9, maxDigits: 9 },
  { name: "Finland", flag: "🇫🇮", code: "FI", dialCode: "+358", minDigits: 8, maxDigits: 10 },
  { name: "France", flag: "🇫🇷", code: "FR", dialCode: "+33", minDigits: 9, maxDigits: 9 },
  { name: "Germany", flag: "🇩🇪", code: "DE", dialCode: "+49", minDigits: 10, maxDigits: 11 },
  { name: "Ghana", flag: "🇬🇭", code: "GH", dialCode: "+233", minDigits: 9, maxDigits: 9 },
  { name: "Greece", flag: "🇬🇷", code: "GR", dialCode: "+30", minDigits: 10, maxDigits: 10 },
  { name: "Hong Kong", flag: "🇭🇰", code: "HK", dialCode: "+852", minDigits: 8, maxDigits: 8 },
  { name: "Hungary", flag: "🇭🇺", code: "HU", dialCode: "+36", minDigits: 8, maxDigits: 9 },
  { name: "Iceland", flag: "🇮🇸", code: "IS", dialCode: "+354", minDigits: 7, maxDigits: 9 },
  { name: "India", flag: "🇮🇳", code: "IN", dialCode: "+91", minDigits: 10, maxDigits: 10 },
  { name: "Indonesia", flag: "🇮🇩", code: "ID", dialCode: "+62", minDigits: 8, maxDigits: 12 },
  { name: "Iran", flag: "🇮🇷", code: "IR", dialCode: "+98", minDigits: 10, maxDigits: 10 },
  { name: "Iraq", flag: "🇮🇶", code: "IQ", dialCode: "+964", minDigits: 10, maxDigits: 10 },
  { name: "Ireland", flag: "🇮🇪", code: "IE", dialCode: "+353", minDigits: 8, maxDigits: 9 },
  { name: "Israel", flag: "🇮🇱", code: "IL", dialCode: "+972", minDigits: 8, maxDigits: 9 },
  { name: "Italy", flag: "🇮🇹", code: "IT", dialCode: "+39", minDigits: 8, maxDigits: 11 },
  { name: "Japan", flag: "🇯🇵", code: "JP", dialCode: "+81", minDigits: 9, maxDigits: 11 },
  { name: "Jordan", flag: "🇯🇴", code: "JO", dialCode: "+962", minDigits: 8, maxDigits: 9 },
  { name: "Kazakhstan", flag: "🇰🇿", code: "KZ", dialCode: "+7", minDigits: 10, maxDigits: 10 },
  { name: "Kenya", flag: "🇰🇪", code: "KE", dialCode: "+254", minDigits: 9, maxDigits: 9 },
  { name: "Kuwait", flag: "🇰🇼", code: "KW", dialCode: "+965", minDigits: 8, maxDigits: 8 },
  { name: "Lebanon", flag: "🇱🇧", code: "LB", dialCode: "+961", minDigits: 7, maxDigits: 8 },
  { name: "Libya", flag: "🇱🇾", code: "LY", dialCode: "+218", minDigits: 9, maxDigits: 9 },
  { name: "Malaysia", flag: "🇲🇾", code: "MY", dialCode: "+60", minDigits: 8, maxDigits: 10 },
  { name: "Mexico", flag: "🇲🇽", code: "MX", dialCode: "+52", minDigits: 10, maxDigits: 10 },
  { name: "Morocco", flag: "🇲🇦", code: "MA", dialCode: "+212", minDigits: 9, maxDigits: 9 },
  { name: "Netherlands", flag: "🇳🇱", code: "NL", dialCode: "+31", minDigits: 9, maxDigits: 9 },
  { name: "New Zealand", flag: "🇳🇿", code: "NZ", dialCode: "+64", minDigits: 8, maxDigits: 10 },
  { name: "Nigeria", flag: "🇳🇬", code: "NG", dialCode: "+234", minDigits: 10, maxDigits: 11 },
  { name: "Norway", flag: "🇳🇴", code: "NO", dialCode: "+47", minDigits: 8, maxDigits: 8 },
  { name: "Oman", flag: "🇴🇲", code: "OM", dialCode: "+968", minDigits: 8, maxDigits: 8 },
  { name: "Pakistan", flag: "🇵🇰", code: "PK", dialCode: "+92", minDigits: 10, maxDigits: 10 },
  { name: "Palestine", flag: "🇵🇸", code: "PS", dialCode: "+970", minDigits: 9, maxDigits: 9 },
  { name: "Peru", flag: "🇵🇪", code: "PE", dialCode: "+51", minDigits: 9, maxDigits: 9 },
  { name: "Philippines", flag: "🇵🇭", code: "PH", dialCode: "+63", minDigits: 10, maxDigits: 10 },
  { name: "Poland", flag: "🇵🇱", code: "PL", dialCode: "+48", minDigits: 9, maxDigits: 9 },
  { name: "Portugal", flag: "🇵🇹", code: "PT", dialCode: "+351", minDigits: 9, maxDigits: 9 },
  { name: "Qatar", flag: "🇶🇦", code: "QA", dialCode: "+974", minDigits: 8, maxDigits: 8 },
  { name: "Romania", flag: "🇷🇴", code: "RO", dialCode: "+40", minDigits: 9, maxDigits: 9 },
  { name: "Russia", flag: "🇷🇺", code: "RU", dialCode: "+7", minDigits: 10, maxDigits: 10 },
  { name: "Saudi Arabia", flag: "🇸🇦", code: "SA", dialCode: "+966", minDigits: 9, maxDigits: 9 },
  { name: "Senegal", flag: "🇸🇳", code: "SN", dialCode: "+221", minDigits: 9, maxDigits: 9 },
  { name: "Serbia", flag: "🇷🇸", code: "RS", dialCode: "+381", minDigits: 8, maxDigits: 9 },
  { name: "Singapore", flag: "🇸🇬", code: "SG", dialCode: "+65", minDigits: 8, maxDigits: 10 },
  { name: "Slovakia", flag: "🇸🇰", code: "SK", dialCode: "+421", minDigits: 9, maxDigits: 9 },
  { name: "Slovenia", flag: "🇸🇮", code: "SI", dialCode: "+386", minDigits: 8, maxDigits: 9 },
  { name: "South Africa", flag: "🇿🇦", code: "ZA", dialCode: "+27", minDigits: 9, maxDigits: 9 },
  { name: "South Korea", flag: "🇰🇷", code: "KR", dialCode: "+82", minDigits: 9, maxDigits: 10 },
  { name: "Spain", flag: "🇪🇸", code: "ES", dialCode: "+34", minDigits: 9, maxDigits: 9 },
  { name: "Sri Lanka", flag: "🇱🇰", code: "LK", dialCode: "+94", minDigits: 9, maxDigits: 10 },
  { name: "Sudan", flag: "🇸🇩", code: "SD", dialCode: "+249", minDigits: 9, maxDigits: 10 },
  { name: "Sweden", flag: "🇸🇪", code: "SE", dialCode: "+46", minDigits: 7, maxDigits: 9 },
  { name: "Switzerland", flag: "🇨🇭", code: "CH", dialCode: "+41", minDigits: 9, maxDigits: 9 },
  { name: "Syria", flag: "🇸🇾", code: "SY", dialCode: "+963", minDigits: 9, maxDigits: 9 },
  { name: "Taiwan", flag: "🇹🇼", code: "TW", dialCode: "+886", minDigits: 9, maxDigits: 10 },
  { name: "Thailand", flag: "🇹🇭", code: "TH", dialCode: "+66", minDigits: 9, maxDigits: 10 },
  { name: "Tunisia", flag: "🇹🇳", code: "TN", dialCode: "+216", minDigits: 8, maxDigits: 8 },
  { name: "Turkey", flag: "🇹🇷", code: "TR", dialCode: "+90", minDigits: 10, maxDigits: 10 },
  { name: "Ukraine", flag: "🇺🇦", code: "UA", dialCode: "+380", minDigits: 9, maxDigits: 9 },
  { name: "United Arab Emirates", flag: "🇦🇪", code: "AE", dialCode: "+971", minDigits: 9, maxDigits: 9 },
  { name: "United Kingdom", flag: "🇬🇧", code: "GB", dialCode: "+44", minDigits: 10, maxDigits: 10 },
  { name: "United States", flag: "🇺🇸", code: "US", dialCode: "+1", minDigits: 10, maxDigits: 10 },
  { name: "Uruguay", flag: "🇺🇾", code: "UY", dialCode: "+598", minDigits: 8, maxDigits: 8 },
  { name: "Uzbekistan", flag: "🇺🇿", code: "UZ", dialCode: "+998", minDigits: 9, maxDigits: 9 },
  { name: "Venezuela", flag: "🇻🇪", code: "VE", dialCode: "+58", minDigits: 10, maxDigits: 10 },
  { name: "Vietnam", flag: "🇻🇳", code: "VN", dialCode: "+84", minDigits: 9, maxDigits: 10 },
  { name: "Yemen", flag: "🇾🇪", code: "YE", dialCode: "+967", minDigits: 9, maxDigits: 9 },
];

/** Default selection shown before the user picks anything. */
export const DEFAULT_COUNTRY: Country = COUNTRIES[0];

/**
 * Splits a phone value like "+2135550001234" into its country and the local
 * number. Matches the longest dial-code prefix; on ties the last match wins
 * (so a "+1" number resolves to the United States, "+7" to Russia).
 */
export function findCountryByDialCode(
  value: string
): { country: Country | null; local: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { country: null, local: "" };
  }
  let match: Country | null = null;
  for (const country of COUNTRIES) {
    if (trimmed.startsWith(country.dialCode)) {
      if (!match || country.dialCode.length >= match.dialCode.length) {
        match = country;
      }
    }
  }
  return match
    ? { country: match, local: trimmed.slice(match.dialCode.length) }
    : { country: null, local: trimmed };
}

/**
 * Validates a full phone value like "+2135550001234" against the digit rules of
 * its country. Returns an error message, or null when the number is valid.
 */
export function validatePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Please enter a phone number.";
  }
  const { country, local } = findCountryByDialCode(trimmed);
  if (!country) {
    return "Please enter a valid phone number.";
  }
  const localDigits = local.replace(/\D/g, "");
  if (localDigits.length < country.minDigits) {
    return `Enter ${country.minDigits} more digit${country.minDigits === 1 ? "" : "s"} for ${country.name} numbers.`;
  }
  if (localDigits.length > country.maxDigits) {
    return `Enter a valid ${country.name} phone number (${country.maxDigits} digits).`;
  }
  return null;
}
