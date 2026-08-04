import { useAuth } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { FullScreenLoader } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";

export default function WelcomeScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (isSignedIn) {
    return <Redirect href="/loading" />;
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>CB</Text>
          </View>
          <Text style={styles.title}>CutBook</Text>
          <Text style={styles.tagline}>
            Book your next haircut with the best barbers in town.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Sign In" onPress={() => router.push("/sign-in")} />
          <Button
            title="Create Account"
            onPress={() => router.push("/sign-up")}
            variant="outline"
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
  },
  tagline: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 280,
  },
  actions: {
    gap: spacing.md,
  },
});
