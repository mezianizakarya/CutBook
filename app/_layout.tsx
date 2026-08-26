import { ClerkProvider } from "@clerk/expo";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { I18nManager } from "react-native";

import { CLERK_PUBLISHABLE_KEY, tokenCache } from "@/lib/clerk";
import { I18nProvider, useI18n } from "@/lib/I18nProvider";
import { loadSavedLocale, isRTL } from "@/lib/i18n";
import { useSupabaseSession } from "@/lib/supabase-auth";
import { colors } from "@/lib/theme";
import { CountryProvider } from "@/lib/user-country";

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
}

SplashScreen.preventAutoHideAsync().catch(() => {});

loadSavedLocale().then((locale) => {
  const shouldBeRTL = isRTL(locale);
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
});

function SupabaseSessionBridge() {
  useSupabaseSession();
  return null;
}

const publishableKey = CLERK_PUBLISHABLE_KEY;

function AppShell() {
  const { locale } = useI18n();
  return (
    <CountryProvider key={locale}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </CountryProvider>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        SplashScreen.hide();
        setReady(true);
      });
    });
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SupabaseSessionBridge />
      <I18nProvider>
        <AppShell />
      </I18nProvider>
    </ClerkProvider>
  );
}
