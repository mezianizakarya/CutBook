import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

const STORAGE_KEY = "@cutbook_language";

export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const i18n = new I18n(
  { en, fr },
  {
    defaultLocale: "en",
    enableFallback: true,
    locale: "en",
  }
);

export function getDeviceLocale(): SupportedLocale {
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";
  if (SUPPORTED_LOCALES.includes(deviceLocale as SupportedLocale)) {
    return deviceLocale as SupportedLocale;
  }
  return "en";
}

export async function loadSavedLocale(): Promise<SupportedLocale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) {
      return saved as SupportedLocale;
    }
  } catch {}
  return getDeviceLocale();
}

export async function saveLocale(locale: SupportedLocale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, locale);
  i18n.locale = locale;
}

export function setLocale(locale: SupportedLocale): void {
  i18n.locale = locale;
}

export function getLocale(): SupportedLocale {
  return i18n.locale as SupportedLocale;
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string;
}

export default i18n;
