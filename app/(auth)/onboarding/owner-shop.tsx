import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ShopForm, type ShopFormValues } from "@/components/ui/ShopForm";
import { FullScreenLoader } from "@/lib/auth";
import { createShop, uploadShopGallery, uploadShopLogo } from "@/lib/owner";
import { colors, spacing } from "@/lib/theme";

export default function OwnerShopScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [createdShopId, setCreatedShopId] = useState<number | null>(null);

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

  async function handleCreate(values: ShopFormValues) {
    let shopId = createdShopId;
    if (shopId == null) {
      shopId = await createShop(
        {
          name: values.name,
          city: values.city,
          state: values.state,
          postal_code: values.postalCode,
          country: values.country,
          address_line1: values.address,
          phone: values.phone,
          description: values.description,
          latitude: values.latitude ?? undefined,
          longitude: values.longitude ?? undefined,
        },
        currentUser.id
      );
      setCreatedShopId(shopId);
    }
    if (values.logoUri) {
      await uploadShopLogo(shopId, values.logoUri);
    }
    if (values.galleryUris.length > 0) {
      await uploadShopGallery(shopId, values.galleryUris);
    }
    await currentUser.updateMetadata({
      unsafeMetadata: { onboardingStep: "complete" },
    });
    router.replace("/loading");
  }

  const isOnboarding = from === "signup";

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
        <Text style={styles.title}>Create your shop</Text>
        <Text style={styles.subtitle}>
          Your shop goes live on Kutz once it{"'"}s approved. You can add
          services and working hours later.
        </Text>
      </View>

      <ShopForm submitLabel="Create shop" onSubmit={handleCreate} />

      {isOnboarding && (
        <View style={styles.skipWrap}>
          <Button
            title="Skip for now"
            variant="ghost"
            onPress={() => router.replace("/loading")}
          />
        </View>
      )}
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
  skipWrap: {
    marginTop: spacing.sm,
  },
});
