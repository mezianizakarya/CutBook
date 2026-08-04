import { useUser } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import { colors, spacing } from "@/lib/theme";

export default function CompleteProfileScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/welcome" />;
  }

  if (user.unsafeMetadata?.profileCompleted) {
    return <Redirect href="/loading" />;
  }

  const currentUser = user;

  async function handleComplete() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setSubmitting(true);
    try {
      await currentUser.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await currentUser.updateMetadata({
        unsafeMetadata: { phone: phone.trim() || undefined, profileCompleted: true },
      });
      router.replace("/loading");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          A few details so barbers and shops know who you are.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <TextField
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jane"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.nameField}>
            <TextField
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              autoCapitalize="words"
            />
          </View>
        </View>

        <TextField
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 000 1234"
          keyboardType="phone-pad"
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Finish" onPress={handleComplete} loading={submitting} />
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
  nameRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  nameField: {
    flex: 1,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
