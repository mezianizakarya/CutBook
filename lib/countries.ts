export type Country = {
  name: string;
  flag: string;
  /** ISO 3166-1 alpha-2, e.g. "DZ". */
  code: string;
  /** International dialing code including the "+", e.g. "+213". */
  dialCode: string;
};

/** Country list used by the phone input's country picker. Sorted by name. */
export const COUNTRIES: readonly Country[] = [
  { name: "Algeria", flag: "🇩🇿", code: "DZ", dialCode: "+213" },
  { name: "Argentina", flag: "🇦🇷", code: "AR", dialCode: "+54" },
  { name: "Australia", flag: "🇦🇺", code: "AU", dialCode: "+61" },
  { name: "Austria", flag: "🇦🇹", code: "AT", dialCode: "+43" },
  { name: "Bahrain", flag: "🇧🇭", code: "BH", dialCode: "+973" },
  { name: "Bangladesh", flag: "🇧🇩", code: "BD", dialCode: "+880" },
  { name: "Belgium", flag: "🇧🇪", code: "BE", dialCode: "+32" },
  { name: "Brazil", flag: "🇧🇷", code: "BR", dialCode: "+55" },
  { name: "Bulgaria", flag: "🇧🇬", code: "BG", dialCode: "+359" },
  { name: "Cambodia", flag: "🇰🇭", code: "KH", dialCode: "+855" },
  { name: "Cameroon", flag: "🇨🇲", code: "CM", dialCode: "+237" },
  { name: "Canada", flag: "🇨🇦", code: "CA", dialCode: "+1" },
  { name: "Chile", flag: "🇨🇱", code: "CL", dialCode: "+56" },
  { name: "China", flag: "🇨🇳", code: "CN", dialCode: "+86" },
  { name: "Colombia", flag: "🇨🇴", code: "CO", dialCode: "+57" },
  { name: "Croatia", flag: "🇭🇷", code: "HR", dialCode: "+385" },
  { name: "Czechia", flag: "🇨🇿", code: "CZ", dialCode: "+420" },
  { name: "Denmark", flag: "🇩🇰", code: "DK", dialCode: "+45" },
  { name: "Ecuador", flag: "🇪🇨", code: "EC", dialCode: "+593" },
  { name: "Egypt", flag: "🇪🇬", code: "EG", dialCode: "+20" },
  { name: "Ethiopia", flag: "🇪🇹", code: "ET", dialCode: "+251" },
  { name: "Finland", flag: "🇫🇮", code: "FI", dialCode: "+358" },
  { name: "France", flag: "🇫🇷", code: "FR", dialCode: "+33" },
  { name: "Germany", flag: "🇩🇪", code: "DE", dialCode: "+49" },
  { name: "Ghana", flag: "🇬🇭", code: "GH", dialCode: "+233" },
  { name: "Greece", flag: "🇬🇷", code: "GR", dialCode: "+30" },
  { name: "Hong Kong", flag: "🇭🇰", code: "HK", dialCode: "+852" },
  { name: "Hungary", flag: "🇭🇺", code: "HU", dialCode: "+36" },
  { name: "Iceland", flag: "🇮🇸", code: "IS", dialCode: "+354" },
  { name: "India", flag: "🇮🇳", code: "IN", dialCode: "+91" },
  { name: "Indonesia", flag: "🇮🇩", code: "ID", dialCode: "+62" },
  { name: "Iran", flag: "🇮🇷", code: "IR", dialCode: "+98" },
  { name: "Iraq", flag: "🇮🇶", code: "IQ", dialCode: "+964" },
  { name: "Ireland", flag: "🇮🇪", code: "IE", dialCode: "+353" },
  { name: "Israel", flag: "🇮🇱", code: "IL", dialCode: "+972" },
  { name: "Italy", flag: "🇮🇹", code: "IT", dialCode: "+39" },
  { name: "Japan", flag: "🇯🇵", code: "JP", dialCode: "+81" },
  { name: "Jordan", flag: "🇯🇴", code: "JO", dialCode: "+962" },
  { name: "Kazakhstan", flag: "🇰🇿", code: "KZ", dialCode: "+7" },
  { name: "Kenya", flag: "🇰🇪", code: "KE", dialCode: "+254" },
  { name: "Kuwait", flag: "🇰🇼", code: "KW", dialCode: "+965" },
  { name: "Lebanon", flag: "🇱🇧", code: "LB", dialCode: "+961" },
  { name: "Libya", flag: "🇱🇾", code: "LY", dialCode: "+218" },
  { name: "Malaysia", flag: "🇲🇾", code: "MY", dialCode: "+60" },
  { name: "Mexico", flag: "🇲🇽", code: "MX", dialCode: "+52" },
  { name: "Morocco", flag: "🇲🇦", code: "MA", dialCode: "+212" },
  { name: "Netherlands", flag: "🇳🇱", code: "NL", dialCode: "+31" },
  { name: "New Zealand", flag: "🇳🇿", code: "NZ", dialCode: "+64" },
  { name: "Nigeria", flag: "🇳🇬", code: "NG", dialCode: "+234" },
  { name: "Norway", flag: "🇳🇴", code: "NO", dialCode: "+47" },
  { name: "Oman", flag: "🇴🇲", code: "OM", dialCode: "+968" },
  { name: "Pakistan", flag: "🇵🇰", code: "PK", dialCode: "+92" },
  { name: "Palestine", flag: "🇵🇸", code: "PS", dialCode: "+970" },
  { name: "Peru", flag: "🇵🇪", code: "PE", dialCode: "+51" },
  { name: "Philippines", flag: "🇵🇭", code: "PH", dialCode: "+63" },
  { name: "Poland", flag: "🇵🇱", code: "PL", dialCode: "+48" },
  { name: "Portugal", flag: "🇵🇹", code: "PT", dialCode: "+351" },
  { name: "Qatar", flag: "🇶🇦", code: "QA", dialCode: "+974" },
  { name: "Romania", flag: "🇷🇴", code: "RO", dialCode: "+40" },
  { name: "Russia", flag: "🇷🇺", code: "RU", dialCode: "+7" },
  { name: "Saudi Arabia", flag: "🇸🇦", code: "SA", dialCode: "+966" },
  { name: "Senegal", flag: "🇸🇳", code: "SN", dialCode: "+221" },
  { name: "Serbia", flag: "🇷🇸", code: "RS", dialCode: "+381" },
  { name: "Singapore", flag: "🇸🇬", code: "SG", dialCode: "+65" },
  { name: "Slovakia", flag: "🇸🇰", code: "SK", dialCode: "+421" },
  { name: "Slovenia", flag: "🇸🇮", code: "SI", dialCode: "+386" },
  { name: "South Africa", flag: "🇿🇦", code: "ZA", dialCode: "+27" },
  { name: "South Korea", flag: "🇰🇷", code: "KR", dialCode: "+82" },
  { name: "Spain", flag: "🇪🇸", code: "ES", dialCode: "+34" },
  { name: "Sri Lanka", flag: "🇱🇰", code: "LK", dialCode: "+94" },
  { name: "Sudan", flag: "🇸🇩", code: "SD", dialCode: "+249" },
  { name: "Sweden", flag: "🇸🇪", code: "SE", dialCode: "+46" },
  { name: "Switzerland", flag: "🇨🇭", code: "CH", dialCode: "+41" },
  { name: "Syria", flag: "🇸🇾", code: "SY", dialCode: "+963" },
  { name: "Taiwan", flag: "🇹🇼", code: "TW", dialCode: "+886" },
  { name: "Thailand", flag: "🇹🇭", code: "TH", dialCode: "+66" },
  { name: "Tunisia", flag: "🇹🇳", code: "TN", dialCode: "+216" },
  { name: "Turkey", flag: "🇹🇷", code: "TR", dialCode: "+90" },
  { name: "Ukraine", flag: "🇺🇦", code: "UA", dialCode: "+380" },
  { name: "United Arab Emirates", flag: "🇦🇪", code: "AE", dialCode: "+971" },
  { name: "United Kingdom", flag: "🇬🇧", code: "GB", dialCode: "+44" },
  { name: "United States", flag: "🇺🇸", code: "US", dialCode: "+1" },
  { name: "Uruguay", flag: "🇺🇾", code: "UY", dialCode: "+598" },
  { name: "Uzbekistan", flag: "🇺🇿", code: "UZ", dialCode: "+998" },
  { name: "Venezuela", flag: "🇻🇪", code: "VE", dialCode: "+58" },
  { name: "Vietnam", flag: "🇻🇳", code: "VN", dialCode: "+84" },
  { name: "Yemen", flag: "🇾🇪", code: "YE", dialCode: "+967" },
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
