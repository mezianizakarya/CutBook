import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import {
  loadSavedLocale,
  saveLocale,
  setLocale,
  getLocale,
  isRTL,
  type SupportedLocale,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: SupportedLocale;
  isRTL: boolean;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isLoading: boolean;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  isRTL: false,
  setLocale: async () => {},
  isLoading: true,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getLocale());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedLocale().then((saved) => {
      setLocale(saved);
      setLocaleState(saved);
      applyRTL(saved);
      setIsLoading(false);
    });
  }, []);

  const applyRTL = useCallback(async (nextLocale: SupportedLocale) => {
    const shouldBeRTL = isRTL(nextLocale);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      try {
        await Updates.reloadAsync();
      } catch {}
    }
  }, []);

  const handleSetLocale = useCallback(async (newLocale: SupportedLocale) => {
    await saveLocale(newLocale);
    setLocaleState(newLocale);
    await applyRTL(newLocale);
  }, [applyRTL]);

  return (
    <I18nContext.Provider value={{ locale, isRTL: isRTL(locale), setLocale: handleSetLocale, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}
