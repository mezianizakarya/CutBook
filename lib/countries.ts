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
  /** ISO 4217 currency code, e.g. "DZD". */
  currency: string;
  /** Currency symbol for display, e.g. "DA". */
  symbol: string;
  /** Decimal digits for the currency, e.g. 2. */
  decimalDigits: number;
};

/** Country list used by the phone input's country picker. Sorted by name. */
export const COUNTRIES: readonly Country[] = [
  { name: "Algeria", flag: "🇩🇿", code: "DZ", dialCode: "+213", minDigits: 9, maxDigits: 9, currency: "DZD", symbol: "DA", decimalDigits: 2 },
  { name: "Argentina", flag: "🇦🇷", code: "AR", dialCode: "+54", minDigits: 8, maxDigits: 10, currency: "ARS", symbol: "AR$", decimalDigits: 2 },
  { name: "Australia", flag: "🇦🇺", code: "AU", dialCode: "+61", minDigits: 8, maxDigits: 9, currency: "AUD", symbol: "A$", decimalDigits: 2 },
  { name: "Austria", flag: "🇦🇹", code: "AT", dialCode: "+43", minDigits: 9, maxDigits: 11, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Bahrain", flag: "🇧🇭", code: "BH", dialCode: "+973", minDigits: 8, maxDigits: 8, currency: "BHD", symbol: "BD", decimalDigits: 3 },
  { name: "Bangladesh", flag: "🇧🇩", code: "BD", dialCode: "+880", minDigits: 10, maxDigits: 10, currency: "BDT", symbol: "৳", decimalDigits: 2 },
  { name: "Belgium", flag: "🇧🇪", code: "BE", dialCode: "+32", minDigits: 8, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Brazil", flag: "🇧🇷", code: "BR", dialCode: "+55", minDigits: 10, maxDigits: 11, currency: "BRL", symbol: "R$", decimalDigits: 2 },
  { name: "Bulgaria", flag: "🇧🇬", code: "BG", dialCode: "+359", minDigits: 8, maxDigits: 9, currency: "BGN", symbol: "лв", decimalDigits: 2 },
  { name: "Cambodia", flag: "🇰🇭", code: "KH", dialCode: "+855", minDigits: 8, maxDigits: 9, currency: "KHR", symbol: "៛", decimalDigits: 0 },
  { name: "Cameroon", flag: "🇨🇲", code: "CM", dialCode: "+237", minDigits: 9, maxDigits: 9, currency: "XAF", symbol: "FCFA", decimalDigits: 0 },
  { name: "Canada", flag: "🇨🇦", code: "CA", dialCode: "+1", minDigits: 10, maxDigits: 10, currency: "CAD", symbol: "CA$", decimalDigits: 2 },
  { name: "Chile", flag: "🇨🇱", code: "CL", dialCode: "+56", minDigits: 8, maxDigits: 9, currency: "CLP", symbol: "CL$", decimalDigits: 0 },
  { name: "China", flag: "🇨🇳", code: "CN", dialCode: "+86", minDigits: 11, maxDigits: 11, currency: "CNY", symbol: "¥", decimalDigits: 2 },
  { name: "Colombia", flag: "🇨🇴", code: "CO", dialCode: "+57", minDigits: 10, maxDigits: 10, currency: "COP", symbol: "CO$", decimalDigits: 2 },
  { name: "Croatia", flag: "🇭🇷", code: "HR", dialCode: "+385", minDigits: 8, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Czechia", flag: "🇨🇿", code: "CZ", dialCode: "+420", minDigits: 9, maxDigits: 9, currency: "CZK", symbol: "Kč", decimalDigits: 2 },
  { name: "Denmark", flag: "🇩🇰", code: "DK", dialCode: "+45", minDigits: 8, maxDigits: 8, currency: "DKK", symbol: "kr", decimalDigits: 2 },
  { name: "Ecuador", flag: "🇪🇨", code: "EC", dialCode: "+593", minDigits: 9, maxDigits: 10, currency: "USD", symbol: "$", decimalDigits: 2 },
  { name: "Egypt", flag: "🇪🇬", code: "EG", dialCode: "+20", minDigits: 10, maxDigits: 10, currency: "EGP", symbol: "E£", decimalDigits: 2 },
  { name: "Ethiopia", flag: "🇪🇹", code: "ET", dialCode: "+251", minDigits: 9, maxDigits: 9, currency: "ETB", symbol: "Br", decimalDigits: 2 },
  { name: "Finland", flag: "🇫🇮", code: "FI", dialCode: "+358", minDigits: 8, maxDigits: 10, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "France", flag: "🇫🇷", code: "FR", dialCode: "+33", minDigits: 9, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Germany", flag: "🇩🇪", code: "DE", dialCode: "+49", minDigits: 10, maxDigits: 11, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Ghana", flag: "🇬🇭", code: "GH", dialCode: "+233", minDigits: 9, maxDigits: 9, currency: "GHS", symbol: "GH₵", decimalDigits: 2 },
  { name: "Greece", flag: "🇬🇷", code: "GR", dialCode: "+30", minDigits: 10, maxDigits: 10, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Hong Kong", flag: "🇭🇰", code: "HK", dialCode: "+852", minDigits: 8, maxDigits: 8, currency: "HKD", symbol: "HK$", decimalDigits: 2 },
  { name: "Hungary", flag: "🇭🇺", code: "HU", dialCode: "+36", minDigits: 8, maxDigits: 9, currency: "HUF", symbol: "Ft", decimalDigits: 0 },
  { name: "Iceland", flag: "🇮🇸", code: "IS", dialCode: "+354", minDigits: 7, maxDigits: 9, currency: "ISK", symbol: "kr", decimalDigits: 0 },
  { name: "India", flag: "🇮🇳", code: "IN", dialCode: "+91", minDigits: 10, maxDigits: 10, currency: "INR", symbol: "₹", decimalDigits: 2 },
  { name: "Indonesia", flag: "🇮🇩", code: "ID", dialCode: "+62", minDigits: 8, maxDigits: 12, currency: "IDR", symbol: "Rp", decimalDigits: 0 },
  { name: "Iran", flag: "🇮🇷", code: "IR", dialCode: "+98", minDigits: 10, maxDigits: 10, currency: "IRR", symbol: "﷼", decimalDigits: 0 },
  { name: "Iraq", flag: "🇮🇶", code: "IQ", dialCode: "+964", minDigits: 10, maxDigits: 10, currency: "IQD", symbol: "ID", decimalDigits: 2 },
  { name: "Ireland", flag: "🇮🇪", code: "IE", dialCode: "+353", minDigits: 8, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Israel", flag: "🇮🇱", code: "IL", dialCode: "+972", minDigits: 8, maxDigits: 9, currency: "ILS", symbol: "₪", decimalDigits: 2 },
  { name: "Italy", flag: "🇮🇹", code: "IT", dialCode: "+39", minDigits: 8, maxDigits: 11, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Japan", flag: "🇯🇵", code: "JP", dialCode: "+81", minDigits: 9, maxDigits: 11, currency: "JPY", symbol: "¥", decimalDigits: 0 },
  { name: "Jordan", flag: "🇯🇴", code: "JO", dialCode: "+962", minDigits: 8, maxDigits: 9, currency: "JOD", symbol: "JD", decimalDigits: 3 },
  { name: "Kazakhstan", flag: "🇰🇿", code: "KZ", dialCode: "+7", minDigits: 10, maxDigits: 10, currency: "KZT", symbol: "₸", decimalDigits: 2 },
  { name: "Kenya", flag: "🇰🇪", code: "KE", dialCode: "+254", minDigits: 9, maxDigits: 9, currency: "KES", symbol: "KSh", decimalDigits: 2 },
  { name: "Kuwait", flag: "🇰🇼", code: "KW", dialCode: "+965", minDigits: 8, maxDigits: 8, currency: "KWD", symbol: "KD", decimalDigits: 3 },
  { name: "Lebanon", flag: "🇱🇧", code: "LB", dialCode: "+961", minDigits: 7, maxDigits: 8, currency: "LBP", symbol: "L£", decimalDigits: 2 },
  { name: "Libya", flag: "🇱🇾", code: "LY", dialCode: "+218", minDigits: 9, maxDigits: 9, currency: "LYD", symbol: "LD", decimalDigits: 3 },
  { name: "Malaysia", flag: "🇲🇾", code: "MY", dialCode: "+60", minDigits: 8, maxDigits: 10, currency: "MYR", symbol: "RM", decimalDigits: 2 },
  { name: "Mexico", flag: "🇲🇽", code: "MX", dialCode: "+52", minDigits: 10, maxDigits: 10, currency: "MXN", symbol: "MX$", decimalDigits: 2 },
  { name: "Morocco", flag: "🇲🇦", code: "MA", dialCode: "+212", minDigits: 9, maxDigits: 9, currency: "MAD", symbol: "MAD", decimalDigits: 2 },
  { name: "Netherlands", flag: "🇳🇱", code: "NL", dialCode: "+31", minDigits: 9, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "New Zealand", flag: "🇳🇿", code: "NZ", dialCode: "+64", minDigits: 8, maxDigits: 10, currency: "NZD", symbol: "NZ$", decimalDigits: 2 },
  { name: "Nigeria", flag: "🇳🇬", code: "NG", dialCode: "+234", minDigits: 10, maxDigits: 11, currency: "NGN", symbol: "₦", decimalDigits: 2 },
  { name: "Norway", flag: "🇳🇴", code: "NO", dialCode: "+47", minDigits: 8, maxDigits: 8, currency: "NOK", symbol: "kr", decimalDigits: 2 },
  { name: "Oman", flag: "🇴🇲", code: "OM", dialCode: "+968", minDigits: 8, maxDigits: 8, currency: "OMR", symbol: "OR", decimalDigits: 3 },
  { name: "Pakistan", flag: "🇵🇰", code: "PK", dialCode: "+92", minDigits: 10, maxDigits: 10, currency: "PKR", symbol: "Rs", decimalDigits: 2 },
  { name: "Palestine", flag: "🇵🇸", code: "PS", dialCode: "+970", minDigits: 9, maxDigits: 9, currency: "ILS", symbol: "₪", decimalDigits: 2 },
  { name: "Peru", flag: "🇵🇪", code: "PE", dialCode: "+51", minDigits: 9, maxDigits: 9, currency: "PEN", symbol: "S/", decimalDigits: 2 },
  { name: "Philippines", flag: "🇵🇭", code: "PH", dialCode: "+63", minDigits: 10, maxDigits: 10, currency: "PHP", symbol: "₱", decimalDigits: 2 },
  { name: "Poland", flag: "🇵🇱", code: "PL", dialCode: "+48", minDigits: 9, maxDigits: 9, currency: "PLN", symbol: "zł", decimalDigits: 2 },
  { name: "Portugal", flag: "🇵🇹", code: "PT", dialCode: "+351", minDigits: 9, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Qatar", flag: "🇶🇦", code: "QA", dialCode: "+974", minDigits: 8, maxDigits: 8, currency: "QAR", symbol: "QR", decimalDigits: 2 },
  { name: "Romania", flag: "🇷🇴", code: "RO", dialCode: "+40", minDigits: 9, maxDigits: 9, currency: "RON", symbol: "lei", decimalDigits: 2 },
  { name: "Russia", flag: "🇷🇺", code: "RU", dialCode: "+7", minDigits: 10, maxDigits: 10, currency: "RUB", symbol: "₽", decimalDigits: 2 },
  { name: "Saudi Arabia", flag: "🇸🇦", code: "SA", dialCode: "+966", minDigits: 9, maxDigits: 9, currency: "SAR", symbol: "SAR", decimalDigits: 2 },
  { name: "Senegal", flag: "🇸🇳", code: "SN", dialCode: "+221", minDigits: 9, maxDigits: 9, currency: "XOF", symbol: "CFA", decimalDigits: 0 },
  { name: "Serbia", flag: "🇷🇸", code: "RS", dialCode: "+381", minDigits: 8, maxDigits: 9, currency: "RSD", symbol: "din.", decimalDigits: 2 },
  { name: "Singapore", flag: "🇸🇬", code: "SG", dialCode: "+65", minDigits: 8, maxDigits: 10, currency: "SGD", symbol: "S$", decimalDigits: 2 },
  { name: "Slovakia", flag: "🇸🇰", code: "SK", dialCode: "+421", minDigits: 9, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Slovenia", flag: "🇸🇮", code: "SI", dialCode: "+386", minDigits: 8, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "South Africa", flag: "🇿🇦", code: "ZA", dialCode: "+27", minDigits: 9, maxDigits: 9, currency: "ZAR", symbol: "R", decimalDigits: 2 },
  { name: "South Korea", flag: "🇰🇷", code: "KR", dialCode: "+82", minDigits: 9, maxDigits: 10, currency: "KRW", symbol: "₩", decimalDigits: 0 },
  { name: "Spain", flag: "🇪🇸", code: "ES", dialCode: "+34", minDigits: 9, maxDigits: 9, currency: "EUR", symbol: "€", decimalDigits: 2 },
  { name: "Sri Lanka", flag: "🇱🇰", code: "LK", dialCode: "+94", minDigits: 9, maxDigits: 10, currency: "LKR", symbol: "Rs", decimalDigits: 2 },
  { name: "Sudan", flag: "🇸🇩", code: "SD", dialCode: "+249", minDigits: 9, maxDigits: 10, currency: "SDG", symbol: "SD", decimalDigits: 2 },
  { name: "Sweden", flag: "🇸🇪", code: "SE", dialCode: "+46", minDigits: 7, maxDigits: 9, currency: "SEK", symbol: "kr", decimalDigits: 2 },
  { name: "Switzerland", flag: "🇨🇭", code: "CH", dialCode: "+41", minDigits: 9, maxDigits: 9, currency: "CHF", symbol: "CHF", decimalDigits: 2 },
  { name: "Syria", flag: "🇸🇾", code: "SY", dialCode: "+963", minDigits: 9, maxDigits: 9, currency: "SYP", symbol: "LS", decimalDigits: 2 },
  { name: "Taiwan", flag: "🇹🇼", code: "TW", dialCode: "+886", minDigits: 9, maxDigits: 10, currency: "TWD", symbol: "NT$", decimalDigits: 0 },
  { name: "Thailand", flag: "🇹🇭", code: "TH", dialCode: "+66", minDigits: 9, maxDigits: 10, currency: "THB", symbol: "฿", decimalDigits: 2 },
  { name: "Tunisia", flag: "🇹🇳", code: "TN", dialCode: "+216", minDigits: 8, maxDigits: 8, currency: "TND", symbol: "DT", decimalDigits: 3 },
  { name: "Turkey", flag: "🇹🇷", code: "TR", dialCode: "+90", minDigits: 10, maxDigits: 10, currency: "TRY", symbol: "₺", decimalDigits: 2 },
  { name: "Ukraine", flag: "🇺🇦", code: "UA", dialCode: "+380", minDigits: 9, maxDigits: 9, currency: "UAH", symbol: "₴", decimalDigits: 2 },
  { name: "United Arab Emirates", flag: "🇦🇪", code: "AE", dialCode: "+971", minDigits: 9, maxDigits: 9, currency: "AED", symbol: "AED", decimalDigits: 2 },
  { name: "United Kingdom", flag: "🇬🇧", code: "GB", dialCode: "+44", minDigits: 10, maxDigits: 10, currency: "GBP", symbol: "£", decimalDigits: 2 },
  { name: "United States", flag: "🇺🇸", code: "US", dialCode: "+1", minDigits: 10, maxDigits: 10, currency: "USD", symbol: "$", decimalDigits: 2 },
  { name: "Uruguay", flag: "🇺🇾", code: "UY", dialCode: "+598", minDigits: 8, maxDigits: 8, currency: "UYU", symbol: "$U", decimalDigits: 2 },
  { name: "Uzbekistan", flag: "🇺🇿", code: "UZ", dialCode: "+998", minDigits: 9, maxDigits: 9, currency: "UZS", symbol: "сўм", decimalDigits: 2 },
  { name: "Venezuela", flag: "🇻🇪", code: "VE", dialCode: "+58", minDigits: 10, maxDigits: 10, currency: "VES", symbol: "Bs.S", decimalDigits: 2 },
  { name: "Vietnam", flag: "🇻🇳", code: "VN", dialCode: "+84", minDigits: 9, maxDigits: 10, currency: "VND", symbol: "₫", decimalDigits: 0 },
  { name: "Yemen", flag: "🇾🇪", code: "YE", dialCode: "+967", minDigits: 9, maxDigits: 9, currency: "YER", symbol: "﷼", decimalDigits: 2 },
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
