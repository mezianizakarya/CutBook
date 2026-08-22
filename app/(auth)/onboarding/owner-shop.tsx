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
import { colors, radius, spacing } from "@/lib/theme";

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
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Create your shop</Text>
      </View>
      <Text style={styles.subtitle}>
        Your shop goes live on Kutz once it{"'"}s approved. You can add
        services and working hours later.
      </Text>

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
  skipWrap: {
    marginTop: spacing.sm,
  },
});
