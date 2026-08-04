import { useSignIn } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing } from "@/lib/theme";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLoading = !signIn || submitting;

  async function handleSignIn() {
    if (!signIn) return;
    setSubmitting(true);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        return;
      }
      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize();
        if (!finalizeError) {
          router.replace("/loading");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const globalErrors = errors?.global ?? null;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your CutBook account</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="you@example.com"
          keyboardType="email-address"
          error={errors?.fields.identifier?.message}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          error={errors?.fields.password?.message}
        />

        {globalErrors?.map((err) => (
          <Text key={err.code} style={styles.globalError}>
            {err.message}
          </Text>
        ))}

        {typeof message === "string" && message.length > 0 && (
          <Text style={styles.successText}>{message}</Text>
        )}

        <Pressable onPress={() => router.push("/forgot-password")}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        <Button
          title="Sign In"
          onPress={handleSignIn}
          loading={isLoading}
          disabled={fetchStatus === "fetching"}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don&apos;t have an account?</Text>
        <Pressable onPress={() => router.push("/sign-up")}>
          <Text style={styles.link}>Sign up</Text>
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
    color: colors.accent,
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
