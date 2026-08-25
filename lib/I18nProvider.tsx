import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  loadSavedLocale,
  saveLocale,
  setLocale,
  getLocale,
  type SupportedLocale,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isLoading: boolean;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
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
      setIsLoading(false);
    });
  }, []);

  const handleSetLocale = useCallback(async (newLocale: SupportedLocale) => {
    await saveLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}
