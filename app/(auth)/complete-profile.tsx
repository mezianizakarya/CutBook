import { useUser } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { UsernameField } from "@/components/ui/UsernameField";
import { FullScreenLoader } from "@/lib/auth";
import { validatePhoneNumber } from "@/lib/countries";
import { errorMessageFromUnknown } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/lib/theme";
import {
  isUsernameTaken,
  suggestUsername,
  validateUsername,
} from "@/lib/username";

export default function CompleteProfileScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const randomSuffix = useMemo(() => Math.floor(100 + Math.random() * 900), []);

  useEffect(() => {
    if (!usernameEdited) {
      setUsername(`${suggestUsername(firstName, lastName)}${randomSuffix}`);
    }
  }, [firstName, lastName, usernameEdited, randomSuffix]);

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
    setUsernameError(null);
    setPhoneError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("profile.enter_full_name"));
      return;
    }
    const phoneValidation = validatePhoneNumber(phone);
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      return;
    }
    const chosenUsername = username.trim();
    if (!chosenUsername) {
      setError(t("profile.choose_username"));
      return;
    }
    const validationErrors = validateUsername(chosenUsername);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    setSubmitting(true);
    try {
      if (await isUsernameTaken(chosenUsername)) {
        setUsernameError(t("profile.username_taken"));
        return;
      }
      await currentUser.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      const role = currentUser.unsafeMetadata?.role;
      const onboardingStep =
        role === "barber"
          ? "professional"
          : role === "owner"
            ? "shop"
            : "complete";
      await currentUser.updateMetadata({
        unsafeMetadata: {
          phone: phone.trim() || undefined,
          profileCompleted: true,
          onboardingStep,
        },
      });
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ phone: phone.trim(), username: chosenUsername })
        .eq("id", currentUser.id);
      if (dbError) {
        const message = dbError.message.toLowerCase();
        if (message.includes("duplicate") || message.includes("unique")) {
          setError(t("profile.username_taken"));
          return;
        }
        console.warn("Failed to sync profile to Supabase:", dbError.message);
      }
      router.replace(
        role === "barber"
          ? "/onboarding/barber-professional"
          : role === "owner"
            ? { pathname: "/onboarding/owner-shop", params: { from: "signup" } }
            : "/loading"
      );
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll centered paddingHorizontal={14}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("onboarding.complete_your_profile")}</Text>
        <Text style={styles.subtitle}>
          {t("onboarding.profile_details_info")}
        </Text>
      </View>

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
          onChangeText={(text) => {
            setUsernameEdited(true);
            setUsername(text);
          }}
          placeholder="janedoe123"
          error={usernameError}
        />

        <PhoneInput
          label={t("shop.phone")}
          value={phone}
          onChangeValue={(text) => {
            setPhone(text);
            setPhoneError(null);
          }}
          error={phoneError}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button title={t("profile.finish")} onPress={handleComplete} loading={submitting} />
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
