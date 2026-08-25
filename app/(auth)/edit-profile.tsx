import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { UsernameField } from "@/components/ui/UsernameField";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { fetchOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { isUsernameTaken, validateUsername } from "@/lib/username";

const SPECIALTY_SUGGESTIONS = [
  "Fades",
  "Haircuts",
  "Beard work",
  "Kids cuts",
  "Lineups",
  "Designs",
];

export default function EditProfileScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [years, setYears] = useState("");
  const [bio, setBio] = useState("");
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
        setSpecialty(profile?.specialty ?? "");
        setYears(
          profile?.years_of_experience != null
            ? String(profile.years_of_experience)
            : ""
        );
        setBio(profile?.bio ?? "");
      } catch {
        if (!cancelled) {
          setFirstName(currentUser.firstName ?? "");
          setLastName(currentUser.lastName ?? "");
          setUsername("");
          setSpecialty("");
          setYears("");
          setBio("");
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
  const isBarber = currentUser.unsafeMetadata?.role === "barber";

  async function handleSave() {
    setError(null);
    setUsernameError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("profile.enter_full_name"));
      return;
    }
    const chosenUsername = username.trim();
    if (!chosenUsername) {
      setError(t("profile.choose_username"));
      return;
    }
    const validationErrors = validateUsername(chosenUsername);
    if (validationErrors.length > 0) {
      setUsernameError(validationErrors[0]);
      return;
    }
    const parsedYears = years.trim() === "" ? null : Number(years);
    if (isBarber) {
      if (!specialty.trim()) {
        setError(t("profile.add_specialty_error"));
        return;
      }
      if (
        parsedYears == null ||
        !Number.isInteger(parsedYears) ||
        parsedYears < 0 ||
        parsedYears > 100
      ) {
        setError(t("profile.experience_range_error"));
        return;
      }
    }
    setSubmitting(true);
    try {
      if (await isUsernameTaken(chosenUsername)) {
          setUsernameError(t("profile.username_taken"));
        return;
      }
      const updates: Record<string, unknown> = { username: chosenUsername };
      if (isBarber) {
        updates.specialty = specialty.trim();
        updates.years_of_experience = parsedYears;
        updates.bio = bio.trim() ? bio.trim() : null;
      }
      const { error: dbError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id);
      if (dbError) {
        const message = dbError.message.toLowerCase();
        if (message.includes("duplicate") || message.includes("unique")) {
        setUsernameError(t("profile.username_taken"));
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
    <Screen scroll paddingHorizontal={14}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("profile.edit_title")}</Text>
      </View>
      <Text style={styles.subtitle}>
        {t("profile.update_info")}
      </Text>

      {loaded ? (
        <View style={styles.form}>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <TextField
                label={t("profile.first_name")}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Jane"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.nameField}>
              <TextField
                label={t("profile.last_name")}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                autoCapitalize="words"
              />
            </View>
          </View>

          <UsernameField
            label={t("profile.username")}
            value={username}
            onChangeText={setUsername}
            placeholder="janedoe123"
            error={usernameError}
          />

          {isBarber && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("profile.professional_section_title")}</Text>
                <Text style={styles.sectionSubtitle}>
                  {t("profile.professional_section_subtitle")}
                </Text>
              </View>
              <TextField
                label={t("barber.specialty")}
                value={specialty}
                onChangeText={setSpecialty}
                placeholder="e.g. Fades, beard work"
                autoCapitalize="sentences"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsRow}
              >
                {SPECIALTY_SUGGESTIONS.map((suggestion) => {
                  const active =
                    specialty.toLowerCase() === suggestion.toLowerCase();
                  return (
                    <Pressable
                      key={suggestion}
                      onPress={() => setSpecialty(active ? "" : suggestion)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}
                      >
                        {suggestion}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <TextField
                label={t("profile.years_experience")}
                value={years}
                onChangeText={setYears}
                placeholder="e.g. 5"
                keyboardType="numeric"
              />
              <TextField
                label={t("barber.bio")}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell clients about your craft, style and what to expect."
                autoCapitalize="sentences"
                multiline
              />
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button title={t("profile.save_changes")} onPress={handleSave} loading={submitting} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  nameRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  nameField: {
    flex: 1,
  },
  chipsScroll: {
    flexGrow: 0,
    marginLeft: 0,
    marginRight: -14,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.white,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
