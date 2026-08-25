import { useAuth, useSignUp } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { FullScreenLoader } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (isSignedIn) {
    return <Redirect href="/loading" />;
  }

  async function handleSignUp() {
    if (!signUp) return;
    setSubmitting(true);
    try {
      const { error } = await signUp.password({ emailAddress, password });
      if (error) {
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        return;
      }
      router.replace({ pathname: "/verify-email", params: { mode: "signup" } });
    } finally {
      setSubmitting(false);
    }
  }

  const globalErrors = errors?.global ?? null;

  return (
    <Screen scroll centered>
      <View style={styles.header}>
        <AppText style={styles.title}>{t("auth.create_your_account")}</AppText>
        <AppText style={styles.subtitle}>
          {t("auth.verification_email_info")}
        </AppText>
      </View>

      <View style={styles.form}>
        <TextField
          label={t("auth.email")}
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="you@example.com"
          keyboardType="email-address"
          error={errors?.fields.emailAddress?.message}
        />
        <TextField
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          placeholder={t("auth.create_password_placeholder")}
          secureTextEntry
          error={errors?.fields.password?.message}
        />

        {globalErrors?.map((err) => (
          <AppText key={err.code} style={styles.globalError}>
            {err.message}
          </AppText>
        ))}

        <Button
          title={t("auth.create_account")}
          onPress={handleSignUp}
          loading={submitting}
          disabled={fetchStatus === "fetching"}
        />

        {/* Required for sign-up flows on Expo web. Clerk skips the browser CAPTCHA on iOS and Android. */}
        <View nativeID="clerk-captcha" />
      </View>

      <View style={styles.footer}>
        <AppText style={styles.footerText}>{t("auth.already_have_account")}</AppText>
        <Pressable onPress={() => router.push("/sign-in")}>
          <AppText style={styles.link}>{t("auth.sign_in")}</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
  },
  globalError: {
    color: colors.danger,
    fontSize: 13,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
    alignSelf: "flex-start",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.muted,
    fontSize: 15,
  },
});
