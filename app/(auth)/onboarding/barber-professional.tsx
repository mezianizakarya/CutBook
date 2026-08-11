import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  fetchOwnProfile,
  isBarberProfessionalComplete,
  saveBarberProfessional,
  type OwnProfile,
} from "@/lib/profile";
import { colors, radius, spacing } from "@/lib/theme";

const SPECIALTY_SUGGESTIONS = [
  "Fades",
  "Haircuts",
  "Beard work",
  "Kids cuts",
  "Lineups",
  "Designs",
];

export default function BarberProfessionalScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [specialty, setSpecialty] = useState("");
  const [years, setYears] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedProfile, setLoadedProfile] = useState<OwnProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetchOwnProfile(user.id)
      .then((profile) => {
        if (cancelled) {
          return;
        }
        setLoadedProfile(profile);
        setSpecialty(profile?.specialty ?? "");
        setYears(
          profile?.years_of_experience != null
            ? String(profile.years_of_experience)
            : ""
        );
        setBio(profile?.bio ?? "");
      })
      .catch(() => {
        // Prefill is best-effort; the form still works without it.
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!isLoaded || loading) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/welcome" />;
  }

  if (user.unsafeMetadata?.role !== "barber") {
    return <Redirect href="/loading" />;
  }

  if (!user.unsafeMetadata?.profileCompleted) {
    return <Redirect href="/complete-profile" />;
  }

  const currentUser = user;
  const wasComplete = isBarberProfessionalComplete(loadedProfile);
  const isOnboarding =
    user.unsafeMetadata?.onboardingStep === "professional" && !wasComplete;

  async function handleSave() {
    setError(null);
    const parsedSpecialty = specialty.trim() ? specialty.trim() : null;
    if (!parsedSpecialty) {
      setError("Add your specialty to complete your barber profile.");
      return;
    }
    const parsedYears = years.trim() === "" ? null : Number(years);
    if (
      parsedYears == null ||
      !Number.isInteger(parsedYears) ||
      parsedYears < 0 ||
      parsedYears > 100
    ) {
      setError("Experience must be a whole number between 0 and 100 years.");
      return;
    }
    setSubmitting(true);
    try {
      await saveBarberProfessional(currentUser.id, {
        specialty: parsedSpecialty,
        yearsOfExperience: parsedYears,
        bio,
      });
      await currentUser.updateMetadata({
        unsafeMetadata: { onboardingStep: "complete" },
      });
      if (wasComplete) {
        router.back();
      } else {
        router.replace("/loading");
      }
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    if (wasComplete) {
      router.back();
    } else {
      router.replace("/loading");
    }
  }

  return (
    <Screen scroll paddingHorizontal={14}>
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
        <Text style={styles.title}>Tell customers about your work</Text>
        <Text style={styles.subtitle}>
          Pick a specialty and add your experience so clients know what to book
          you for. You can change this later.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Specialty"
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {suggestion}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <TextField
          label="Years of experience"
          value={years}
          onChangeText={setYears}
          placeholder="e.g. 5"
          keyboardType="numeric"
        />

        <TextField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Tell clients about your craft, style and what to expect."
          autoCapitalize="sentences"
          multiline
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Save" onPress={handleSave} loading={submitting} />
        {isOnboarding && (
          <Button title="Skip for now" variant="ghost" onPress={handleSkip} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
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
