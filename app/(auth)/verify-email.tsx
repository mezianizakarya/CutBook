import { useAuth, useSignIn, useSignUp, useUser } from "@clerk/expo";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { errorMessage, errorMessageFromUnknown } from "@/lib/errors";
import { colors, spacing } from "@/lib/theme";

type VerifyMode = "signup" | "reset" | "verify";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: VerifyMode =
    params.mode === "reset" ? "reset" : params.mode === "signup" ? "signup" : "verify";

  const router = useRouter();
  const { signUp, errors: signUpErrors } = useSignUp();
  const { signIn, errors: signInErrors } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const errors = mode === "signup" ? signUpErrors : signInErrors;

  async function sendCode() {
    setSendError(null);
    if (mode === "signup") {
      const { error } = await signUp!.verifications.sendEmailCode();
      if (error) {
        setSendError(errorMessage(error));
        return;
      }
    } else if (mode === "reset") {
      const { error } = await signIn!.resetPasswordEmailCode.sendCode();
      if (error) {
        setSendError(errorMessage(error));
        return;
      }
    } else {
      const email = user?.primaryEmailAddress;
      if (!email) {
        setSendError("No verified email address is available on this account.");
        return;
      }
      try {
        await email.prepareVerification({ strategy: "email_code" });
      } catch (error) {
        setSendError(errorMessageFromUnknown(error));
        return;
      }
    }
    setCodeSent(true);
  }

  useEffect(() => {
    if (mode === "verify" && userLoaded && user && !codeSent) {
      sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, userLoaded, user]);

  if (mode === "verify") {
    if (userLoaded && (!isSignedIn || !user)) {
      return <Redirect href="/loading" />;
    }
  } else if (authLoaded && isSignedIn) {
    return <Redirect href="/loading" />;
  }

  async function handleVerify() {
    setVerifyError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp!.verifications.verifyEmailCode({ code });
        if (error) {
          setVerifyError(errorMessage(error));
          return;
        }
        if (signUp!.status === "complete") {
          const { error: finalizeError } = await signUp!.finalize();
          if (!finalizeError) {
            router.replace("/loading");
          }
        }
      } else if (mode === "reset") {
        const { error } = await signIn!.resetPasswordEmailCode.verifyCode({ code });
        if (error) {
          setVerifyError(errorMessage(error));
          return;
        }
        if (signIn!.status === "needs_new_password") {
          router.replace("/reset-password");
        }
      } else {
        const email = user?.primaryEmailAddress;
        if (!email) {
          setVerifyError("No email address is available on this account.");
          return;
        }
        await email.attemptVerification({ code });
        router.replace("/loading");
      }
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : "Verification failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll centered>
      <View style={styles.header}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code that was sent to your email address.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Verification code"
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          keyboardType="numeric"
          error={errors?.fields.code?.message ?? verifyError}
        />

        {sendError && <Text style={styles.errorText}>{sendError}</Text>}

        <Button title="Verify Code" onPress={handleVerify} loading={submitting} />

        <Pressable onPress={sendCode} disabled={submitting}>
          <Text style={styles.resendText}>
            {codeSent ? "Resend code" : "Send me a new code"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/loading")}>
          <Text style={styles.link}>Back to app</Text>
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
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  resendText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  link: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
  },
});
