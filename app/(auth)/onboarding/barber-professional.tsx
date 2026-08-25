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
import { t } from "@/lib/i18n";
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
      setError(t("barber.add_specialty_error"));
      return;
    }
    const parsedYears = years.trim() === "" ? null : Number(years);
    if (
      parsedYears == null ||
      !Number.isInteger(parsedYears) ||
      parsedYears < 0 ||
      parsedYears > 100
    ) {
      setError(t("barber.experience_range_error"));
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
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("barber.tell_customers")}</Text>
      </View>
      <Text style={styles.subtitle}>
        {t("barber.specialty_experience_info")}
      </Text>

      <View style={styles.form}>
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
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

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button title={t("common.save")} onPress={handleSave} loading={submitting} />
        {isOnboarding && (
          <Button title={t("barber.skip_for_now")} variant="ghost" onPress={handleSkip} />
        )}
      </View>
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
