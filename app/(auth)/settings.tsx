import { useUser } from "@clerk/expo";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";

import { DeleteAccountButton } from "@/components/ui/DeleteAccountButton";
import { LanguageSheet } from "@/components/ui/LanguageSheet";
import { Screen } from "@/components/ui/Screen";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { FullScreenLoader } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useUserCountry } from "@/lib/user-country";
import { useRegionSheet } from "@/lib/useRegionSheet";

type SettingsRowProps = {
  label: string;
  onPress: () => void;
};

function SettingsRow({ label, onPress }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <AppText style={styles.rowLabel}>{label}</AppText>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const userCountry = useUserCountry();
  const { openSheet, sheetContent } = useRegionSheet(userCountry);
  const [showLanguage, setShowLanguage] = useState(false);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn) {
    return <Redirect href="/welcome" />;
  }

  const isAdmin = user?.unsafeMetadata?.role === "admin";

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
        <AppText style={styles.title}>{t("tabs.settings")}</AppText>
      </View>
      <AppText style={styles.subtitle}>
        {t("settings.subtitle")}
      </AppText>

      <View style={styles.group}>
        <SettingsRow
          label={t("profile.edit_profile")}
          onPress={() => router.push("/edit-profile")}
        />
        <View style={styles.divider} />
        <SettingsRow
          label={t("account.info_title")}
          onPress={() => router.push("/account-info")}
        />
        <View style={styles.divider} />
        <SettingsRow
          label={t("settings.account_region")}
          onPress={openSheet}
        />
        <View style={styles.divider} />
        <SettingsRow
          label={t("settings.language")}
          onPress={() => setShowLanguage(true)}
        />
        {!isAdmin && (
          <>
            <View style={styles.divider} />
            <SettingsRow
              label={t("shop.request_verification")}
              onPress={() => router.push("/verification")}
            />
          </>
        )}
      </View>

      <View style={styles.footer}>
        <SignOutButton />
        <DeleteAccountButton />
      </View>

      {sheetContent}

      <LanguageSheet
        visible={showLanguage}
        onClose={() => setShowLanguage(false)}
      />
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
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
