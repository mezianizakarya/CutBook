import { useAuth } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


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
          <AppText style={styles.tagline}>
            {t("auth.tagline")}
          </AppText>
        </View>

        <View style={styles.actions}>
          <Button title={t("auth.sign_in")} onPress={() => router.push("/sign-in")} />
          <Button
            title={t("auth.create_account")}
            onPress={() => router.push("/sign-up")}
            variant="outline"
          />
        </View>

        <AppText style={styles.legalText}>
          {t("legal.continuing")}
          <AppText style={styles.legalLink} onPress={() => router.push("/terms")}>
            {t("legal.terms_of_service")}
          </AppText>
          {t("legal.joiner")}
          <AppText style={styles.legalLink} onPress={() => router.push("/privacy")}>
            {t("legal.privacy_policy")}
          </AppText>
          .
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xs,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  logoBadge: {
    width: 124,
    height: 124,
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
  tagline: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    maxWidth: 320,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  legalText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
    alignSelf: "center",
  },
  legalLink: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
});
