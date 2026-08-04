import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { errorMessage } from "@/lib/errors";
import { colors, spacing } from "@/lib/theme";

export default function ResetPasswordScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleReset() {
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (!signIn) return;
    setSubmitting(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (error) {
        return;
      }
      if (signIn.status === "complete") {
        await signIn.reset();
        router.replace({ pathname: "/sign-in", params: { message: "Password reset. Sign in with your new password." } });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const globalErrors = errors?.global ?? null;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>Choose a strong password you haven&apos;t used before.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          error={errors?.fields.password?.message}
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your new password"
          secureTextEntry
        />

        {localError && <Text style={styles.errorText}>{localError}</Text>}
        {globalErrors?.map((err) => (
          <Text key={err.code} style={styles.errorText}>
            {errorMessage(err)}
          </Text>
        ))}

        <Button
          title="Reset Password"
          onPress={handleReset}
          loading={submitting}
          disabled={fetchStatus === "fetching"}
        />
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => router.push("/sign-in")}>
          <Text style={styles.link}>Back to sign in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginTop: spacing.xl,
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
  link: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "600",
    alignSelf: "center",
  },
  footer: {
    marginTop: spacing.xl,
  },
});
