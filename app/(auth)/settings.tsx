import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DeleteAccountButton } from "@/components/ui/DeleteAccountButton";
import { Screen } from "@/components/ui/Screen";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { FullScreenLoader } from "@/lib/auth";
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
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const userCountry = useUserCountry();
  const { openSheet, sheetContent } = useRegionSheet(userCountry);

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
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>
      <Text style={styles.subtitle}>
        Manage your account and app preferences.
      </Text>

      <View style={styles.group}>
        <SettingsRow
          label="Edit profile"
          onPress={() => router.push("/edit-profile")}
        />
        <View style={styles.divider} />
        <SettingsRow
          label="Account info"
          onPress={() => router.push("/account-info")}
        />
        <View style={styles.divider} />
        <SettingsRow
          label="Account region"
          onPress={openSheet}
        />
        {!isAdmin && (
          <>
            <View style={styles.divider} />
            <SettingsRow
              label="Request verification"
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
