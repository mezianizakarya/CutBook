import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { UsernameField } from "@/components/ui/UsernameField";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import { fetchOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/lib/theme";
import { isUsernameTaken, validateUsername } from "@/lib/username";

export default function EditProfileScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      return;
    }
    const currentUser = user;
    let cancelled = false;
    async function load() {
      try {
        const profile = await fetchOwnProfile(currentUser.id);
        if (cancelled) {
          return;
        }
        setFirstName(currentUser.firstName ?? "");
        setLastName(currentUser.lastName ?? "");
        setUsername(profile?.username ?? "");
      } catch {
        if (!cancelled) {
          setFirstName(currentUser.firstName ?? "");
          setLastName(currentUser.lastName ?? "");
          setUsername("");
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/welcome" />;
  }

  const currentUser = user;

  async function handleSave() {
    setError(null);
    setUsernameError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    const chosenUsername = username.trim();
    if (!chosenUsername) {
      setError("Please choose a username.");
      return;
    }
    const validationErrors = validateUsername(chosenUsername);
    if (validationErrors.length > 0) {
      setUsernameError(validationErrors[0]);
      return;
    }
    setSubmitting(true);
    try {
      if (await isUsernameTaken(chosenUsername)) {
        setUsernameError("This username is already taken.");
        return;
      }
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ username: chosenUsername })
        .eq("id", currentUser.id);
      if (dbError) {
        const message = dbError.message.toLowerCase();
        if (message.includes("duplicate") || message.includes("unique")) {
          setUsernameError("This username is already taken.");
          return;
        }
        throw dbError;
      }
      await currentUser.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      router.back();
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backRow}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>
          Update your name and username so people can find you.
        </Text>
      </View>

      {loaded ? (
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

          <UsernameField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="janedoe123"
            error={usernameError}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button title="Save changes" onPress={handleSave} loading={submitting} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
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
