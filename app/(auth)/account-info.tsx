import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import { fetchOwnProfile, type OwnProfile } from "@/lib/profile";
import { ACCOUNT_TYPE_LABELS } from "@/lib/roles";
import { colors, radius, spacing } from "@/lib/theme";
import { formatUsername } from "@/lib/username";

type InfoRowProps = {
  label: string;
  value?: string | null;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value ?? "—"}
      </Text>
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
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

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
        <Text style={styles.title}>Account info</Text>
        <Text style={styles.subtitle}>
          Your personal details and account settings.
        </Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loaded ? (
        <View style={styles.card}>
          <InfoRow label="Full name" value={fullName} />
          <View style={styles.divider} />
          <InfoRow label="Username" value={formatUsername(profile?.username)} />
          <View style={styles.divider} />
          <InfoRow label="Email" value={email} />
          <View style={styles.divider} />
          <InfoRow label="Phone" value={profile?.phone} />
          <View style={styles.divider} />
          <InfoRow label="City" value={profile?.city} />
          <View style={styles.divider} />
          <InfoRow label="Role" value={profile?.role ? ACCOUNT_TYPE_LABELS[profile.role] : null} />
          <View style={styles.divider} />
          <InfoRow label="Member since" value={joinedAt} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
