import { useAuth } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { FullScreenLoader } from "@/lib/auth";
import { t } from "@/lib/i18n";
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
    <Screen centered>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Image
              source={require("@/assets/kutz-app-icons/ios/AppIcon.appiconset/Icon-1024.png")}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.title}>KUTZ</Text>
          <Text style={styles.tagline}>
            {t("auth.tagline")}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title={t("auth.sign_in")} onPress={() => router.push("/sign-in")} />
          <Button
            title={t("auth.create_account")}
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
    width: 104,
    height: 104,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
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
