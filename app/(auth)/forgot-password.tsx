import { useAuth, useSignIn } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (isSignedIn) {
    return <Redirect href="/loading" />;
  }

  async function handleSendCode() {
    if (!signIn) return;
    setSubmitting(true);
    try {
      const { error: createError } = await signIn.create({ identifier: emailAddress });
      if (createError) {
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        return;
      }
      router.replace({ pathname: "/verify-email", params: { mode: "reset" } });
    } finally {
      setSubmitting(false);
    }
  }

  const globalErrors = errors?.global ?? null;

  return (
    <Screen scroll centered>
      <View style={styles.header}>
        <Text style={styles.title}>{t("auth.forgot_your_password")}</Text>
        <Text style={styles.subtitle}>
          {t("auth.forgot_password_info")}
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t("auth.email")}
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="you@example.com"
          keyboardType="email-address"
          error={errors?.fields.identifier?.message}
        />

        {globalErrors?.map((err) => (
          <Text key={err.code} style={styles.globalError}>
            {errorMessage(err)}
          </Text>
        ))}

        <Button
          title={t("auth.send_reset_code")}
          onPress={handleSendCode}
          loading={submitting}
          disabled={fetchStatus === "fetching"}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("auth.remembered_password")}</Text>
        <Pressable onPress={() => router.push("/sign-in")}>
          <Text style={styles.link}>{t("auth.sign_in")}</Text>
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
