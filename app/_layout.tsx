import { ClerkProvider } from "@clerk/expo";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { useEffect } from "react";
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

SplashScreen.preventAutoHideAsync();

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
  const [fontsLoaded, fontError] = useFonts({
    "Rubik-Light": require("@/assets/fonts/Rubik/static/Rubik-Light.ttf"),
    "Rubik-Regular": require("@/assets/fonts/Rubik/static/Rubik-Regular.ttf"),
    "Rubik-Medium": require("@/assets/fonts/Rubik/static/Rubik-Medium.ttf"),
    "Rubik-SemiBold": require("@/assets/fonts/Rubik/static/Rubik-SemiBold.ttf"),
    "Rubik-Bold": require("@/assets/fonts/Rubik/static/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("@/assets/fonts/Rubik/static/Rubik-ExtraBold.ttf"),
    "Rubik-Black": require("@/assets/fonts/Rubik/static/Rubik-Black.ttf"),
    "Tajawal-ExtraLight": require("@/assets/fonts/Tajawal/Tajawal-ExtraLight.ttf"),
    "Tajawal-Light": require("@/assets/fonts/Tajawal/Tajawal-Light.ttf"),
    "Tajawal-Regular": require("@/assets/fonts/Tajawal/Tajawal-Regular.ttf"),
    "Tajawal-Medium": require("@/assets/fonts/Tajawal/Tajawal-Medium.ttf"),
    "Tajawal-Bold": require("@/assets/fonts/Tajawal/Tajawal-Bold.ttf"),
    "Tajawal-ExtraBold": require("@/assets/fonts/Tajawal/Tajawal-ExtraBold.ttf"),
    "Tajawal-Black": require("@/assets/fonts/Tajawal/Tajawal-Black.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
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
