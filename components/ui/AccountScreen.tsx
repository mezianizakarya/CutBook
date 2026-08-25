import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Button } from "@/components/ui/Button";
import { ProfilePicture } from "@/components/ui/ProfilePicture";
import { ProfileSummary } from "@/components/ui/ProfileSummary";
import { Screen } from "@/components/ui/Screen";
import { emailIsVerified } from "@/lib/auth";
import { t } from "@/lib/i18n";
import type { Role } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";

type AccountScreenProps = {
  role: Role;
  /** Role-specific section rendered between the profile header and footer. */
  children?: ReactNode;
};

type ProfileData = {
  username: string | null;
  is_verified: boolean;
};

export function AccountScreen({ role, children }: AccountScreenProps) {
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (!user?.id) {
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("username, is_verified")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled && !error && data) {
          setProfile(data as ProfileData);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  return (
    <Screen scroll paddingHorizontal={14} paddingTop={spacing.sm}>
      <View style={styles.pageHeader}>
        <View style={styles.titleRow}>
          <AppText style={styles.pageTitle}>{t("tabs.profile")}</AppText>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.settingsButton}
          >
            <Image
              source={require("@/assets/images/settings.png")}
              style={styles.settingsIcon}
              contentFit="contain"
              tintColor={colors.text}
            />
          </Pressable>
        </View>
      </View>
      <View style={styles.header}>
        <View style={styles.identityRow}>
          <ProfilePicture />
          <ProfileSummary
            role={role}
            username={profile?.username}
            verified={
              role === "admin"
                ? emailIsVerified(user)
                : profile?.is_verified ?? false
            }
          />
        </View>
        <View style={styles.buttonRow}>
          <Button
            title={t("profile.edit_profile")}
            variant="outline"
            onPress={() => router.push("/edit-profile")}
            style={styles.flexButton}
          />
          <Button
            title={t("profile.account_info")}
            variant="outline"
            onPress={() => router.push("/account-info")}
            style={styles.flexButton}
          />
        </View>
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIcon: {
    width: 18,
    height: 18,
  },
  header: {
    gap: spacing.lg,
    paddingTop: 3,
    paddingBottom: spacing.md,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
