import { COUNTRIES } from "@/lib/countries";

export type CurrencyInfo = {
  code: string;
  symbol: string;
  decimalDigits: number;
};

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: "USD",
  symbol: "$",
  decimalDigits: 2,
};

let globalCountryCode: string | null = null;

export function setGlobalCountry(code: string | null) {
  globalCountryCode = code?.toUpperCase() ?? null;
}

export function getGlobalCountry(): string | null {
  return globalCountryCode;
}

export function getCurrencyForCountry(countryCode: string | null | undefined): CurrencyInfo {
  const code = countryCode ?? globalCountryCode;
  if (!code) return DEFAULT_CURRENCY;

  const country = COUNTRIES.find((c) => c.code === code.toUpperCase());
  if (!country) return DEFAULT_CURRENCY;

  return {
    code: country.currency,
    symbol: country.symbol,
    decimalDigits: country.decimalDigits,
  };
}

export function formatPrice(
  cents: number | null | undefined,
  countryCode?: string | null
): string {
  if (cents == null) return "—";
  const currency = getCurrencyForCountry(countryCode);
  const value = cents / 100;
  const formatted = value.toFixed(currency.decimalDigits);
  return `${formatted} ${currency.symbol}`;
}
