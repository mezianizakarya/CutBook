import { useUser } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import { createShop } from "@/lib/owner";
import { colors, spacing } from "@/lib/theme";

export default function OwnerShopScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/welcome" />;
  }

  if (user.unsafeMetadata?.role !== "owner") {
    return <Redirect href="/loading" />;
  }

  if (!user.unsafeMetadata?.profileCompleted) {
    return <Redirect href="/complete-profile" />;
  }

  const currentUser = user;

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your shop's name.");
      return;
    }
    setSubmitting(true);
    try {
      await createShop(
        {
          name,
          city,
          address_line1: address,
          phone,
          description,
        },
        currentUser.id
      );
      await currentUser.updateMetadata({
        unsafeMetadata: { onboardingStep: "complete" },
      });
      router.replace("/loading");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll centered>
      <View style={styles.header}>
        <Text style={styles.title}>Create your shop</Text>
        <Text style={styles.subtitle}>
          Your shop goes live on CutBook once it{"'"}s approved. You can add
          services and working hours later.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Shop name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. The Fade Room"
          autoCapitalize="words"
        />
        <TextField
          label="City"
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Austin"
          autoCapitalize="words"
        />
        <TextField
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Street address (optional)"
          autoCapitalize="words"
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Optional"
          keyboardType="phone-pad"
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What makes your shop special?"
          autoCapitalize="sentences"
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Create shop" onPress={handleCreate} loading={submitting} />
        <Button
          title="Skip for now"
          variant="ghost"
          onPress={() => router.replace("/loading")}
        />
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
});
