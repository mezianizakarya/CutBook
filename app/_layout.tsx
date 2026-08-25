import { ClerkProvider } from "@clerk/expo";
import { Stack } from "expo-router";

import { CLERK_PUBLISHABLE_KEY, tokenCache } from "@/lib/clerk";
import { I18nProvider } from "@/lib/I18nProvider";
import { useSupabaseSession } from "@/lib/supabase-auth";
import { colors } from "@/lib/theme";
import { CountryProvider } from "@/lib/user-country";

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
}

function SupabaseSessionBridge() {
  useSupabaseSession();
  return null;
}

const publishableKey = CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SupabaseSessionBridge />
      <I18nProvider>
        <CountryProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </CountryProvider>
      </I18nProvider>
    </ClerkProvider>
  );
}
