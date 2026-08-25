import { useUser } from "@clerk/expo";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ShopForm, type ShopFormValues } from "@/components/ui/ShopForm";
import { FullScreenLoader } from "@/lib/auth";
import { t } from "@/lib/i18n";
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
          <RTLIcon name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <AppText style={styles.title}>{t("shop.create_your_shop")}</AppText>
      </View>
      <AppText style={styles.subtitle}>
        {t("shop.shop_live_info")}
      </AppText>

      <ShopForm submitLabel={t("shop.create_shop_button")} onSubmit={handleCreate} />

      {isOnboarding && (
        <View style={styles.skipWrap}>
          <Button
            title={t("barber.skip_for_now")}
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
