import { useAuth, useUser } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { FullScreenLoader } from "@/lib/auth";
import { ROLE_ROUTES, ROLE_LABELS } from "@/lib/roles";
import { colors, spacing } from "@/lib/theme";

export default function UnauthorizedScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn) {
    return <Redirect href="/welcome" />;
  }

  const role = user?.unsafeMetadata?.role;
  const homeRoute = role ? ROLE_ROUTES[role] : null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/welcome");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen centered>
      <View style={styles.container}>
        <Text style={styles.code}>403</Text>
        <Text style={styles.title}>Access denied</Text>
        <Text style={styles.description}>
          You don&apos;t have permission to view this page.
          {role ? ` Your current role is ${ROLE_LABELS[role]}.` : ""}
        </Text>

        <View style={styles.actions}>
          {homeRoute && (
            <Button title="Go to my home" onPress={() => router.replace(homeRoute)} />
          )}
          <Button
            title="Sign out"
            onPress={handleSignOut}
            variant="outline"
            loading={signingOut}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  code: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.danger,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    fontSize: 15,
    color: colors.muted,
  },
  actions: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
    gap: spacing.md,
  },
});
