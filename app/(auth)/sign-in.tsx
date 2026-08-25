import { useAuth, useClerk, useSignIn } from "@clerk/expo";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { errorMessage } from "@/lib/errors";
import { FullScreenLoader } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";

type SecondFactorStrategy = "email_code" | "phone_code" | "totp";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [secondFactorStrategy, setSecondFactorStrategy] =
    useState<SecondFactorStrategy | null>(null);
  const [code, setCode] = useState("");

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (isSignedIn) {
    return <Redirect href="/loading" />;
  }

  async function completeSignIn() {
    if (!signIn) return;
    const { error: finalizeError } = await signIn.finalize();
    if (!finalizeError) {
      router.replace("/loading");
    }
  }

  async function startSecondFactor() {
    if (!signIn) return;
    const emailCode = signIn.supportedSecondFactors.find(
      (factor) => factor.strategy === "email_code",
    );
    const phoneCode = signIn.supportedSecondFactors.find(
      (factor) => factor.strategy === "phone_code",
    );

    if (emailCode) {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setLocalError(errorMessage(sendError));
        return;
      }
      setSecondFactorStrategy("email_code");
    } else if (phoneCode) {
      const { error: sendError } = await signIn.mfa.sendPhoneCode();
      if (sendError) {
        setLocalError(errorMessage(sendError));
        return;
      }
      setSecondFactorStrategy("phone_code");
    } else {
      setSecondFactorStrategy("totp");
    }
    setCode("");
    setVerifying(true);
  }

  async function handleSignIn() {
    if (!signIn) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        // A session already exists for this user (e.g. a password reset that
        // created one). Activate it instead of leaving the user stuck here.
        const existing = signIn.existingSession;
        if (existing) {
          await setActive({ session: existing.sessionId });
          router.replace("/loading");
        }
        return;
      }
      if (signIn.status === "complete") {
        await completeSignIn();
        return;
      }
      if (
        signIn.status === "needs_client_trust" ||
        signIn.status === "needs_second_factor"
      ) {
        // First sign-in from a new device (Client Trust) or MFA. Both require a
        // second-factor code before the attempt can complete.
        await startSecondFactor();
        return;
      }
      setLocalError(t("auth.sign_in_error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifySecondFactor() {
    if (!signIn || !secondFactorStrategy) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const { error } =
        secondFactorStrategy === "email_code"
          ? await signIn.mfa.verifyEmailCode({ code })
          : secondFactorStrategy === "phone_code"
            ? await signIn.mfa.verifyPhoneCode({ code })
            : await signIn.mfa.verifyTOTP({ code });
      if (error) {
        setLocalError(errorMessage(error));
        return;
      }
      if (signIn.status === "complete") {
        await completeSignIn();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const globalErrors = errors?.global ?? null;

  if (verifying) {
    return (
      <Screen scroll centered>
        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.verify_your_account")}</Text>
          <Text style={styles.subtitle}>
            {secondFactorStrategy === "totp"
              ? t("auth.enter_authenticator_code")
              : t("auth.enter_email_or_phone_code")}
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label={t("auth.verification_code")}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            keyboardType="numeric"
            error={localError ?? errors?.fields.code?.message}
          />

          <Button
            title={t("auth.verify_code")}
            onPress={handleVerifySecondFactor}
            loading={submitting}
            disabled={fetchStatus === "fetching"}
          />

          {secondFactorStrategy !== "totp" && (
            <Pressable onPress={startSecondFactor} disabled={submitting}>
              <Text style={styles.link}>{t("auth.resend_code")}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              setVerifying(false);
              setCode("");
              setLocalError(null);
            }}
          >
            <Text style={styles.link}>{t("auth.start_over")}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll centered>
      <View style={styles.header}>
        <Text style={styles.title}>{t("auth.welcome_back")}</Text>
        <Text style={styles.subtitle}>{t("auth.sign_in_to_account")}</Text>
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
        <TextField
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          placeholder={t("auth.your_password")}
          secureTextEntry
          error={errors?.fields.password?.message}
        />

        {globalErrors?.map((err) => (
          <Text key={err.code} style={styles.globalError}>
            {err.message}
          </Text>
        ))}

        {localError && <Text style={styles.globalError}>{localError}</Text>}

        {typeof message === "string" && message.length > 0 && (
          <Text style={styles.successText}>{message}</Text>
        )}

        <Pressable onPress={() => router.push("/forgot-password")}>
          <Text style={styles.link}>{t("auth.forgot_password")}</Text>
        </Pressable>

        <Button
          title={t("auth.sign_in")}
          onPress={handleSignIn}
          loading={submitting}
          disabled={fetchStatus === "fetching"}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("auth.dont_have_account")}</Text>
        <Pressable onPress={() => router.push("/sign-up")}>
          <Text style={styles.link}>{t("auth.sign_up")}</Text>
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
  successText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
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
