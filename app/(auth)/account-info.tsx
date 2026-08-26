import { useUser } from "@clerk/expo";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Screen } from "@/components/ui/Screen";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import { getLocale, t } from "@/lib/i18n";
import { localeDateString } from "@/lib/format";
import { fetchOwnProfile, type OwnProfile } from "@/lib/profile";
import { getAccountTypeLabel } from "@/lib/roles";
import { colors, radius, spacing } from "@/lib/theme";
import { formatUsername } from "@/lib/username";

type InfoRowProps = {
  label: string;
  value?: string | null;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <AppText style={styles.rowValue} numberOfLines={2}>
        {value ?? "—"}
      </AppText>
    </View>
  );
}

export default function AccountInfoScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      return;
    }
    const currentUser = user;
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchOwnProfile(currentUser.id);
        if (!cancelled) {
          setProfile(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(errorMessageFromUnknown(e));
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/welcome" />;
  }

  const fullName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    null;
  const email = user.primaryEmailAddress?.emailAddress;
  const joinedAt = user.createdAt
    ? localeDateString(new Date(user.createdAt), getLocale(), {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

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
        <AppText style={styles.title}>{t("account.info_title")}</AppText>
      </View>
      <AppText style={styles.subtitle}>
        {t("account.info_subtitle")}
      </AppText>

      {!!error && <AppText style={styles.error}>{error}</AppText>}

      {loaded ? (
        <View style={styles.card}>
          <InfoRow label={t("account.full_name")} value={fullName} />
          <View style={styles.divider} />
          <InfoRow label={t("account.username")} value={formatUsername(profile?.username)} />
          <View style={styles.divider} />
          <InfoRow label={t("account.email")} value={email} />
          <View style={styles.divider} />
          <InfoRow label={t("account.phone")} value={profile?.phone} />
          <View style={styles.divider} />
          <InfoRow label={t("account.city")} value={profile?.city} />
          <View style={styles.divider} />
          <InfoRow label={t("account.role")} value={profile?.role ? getAccountTypeLabel(profile.role) : null} />
          <View style={styles.divider} />
          <InfoRow label={t("account.member_since")} value={joinedAt} />
        </View>
      ) : null}
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    paddingVertical: spacing.md,
    gap: 2,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.md,
  },
});
