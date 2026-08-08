import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { loadMemberShops, loadMyMemberships } from "@/lib/barber";
import { errorMessageFromUnknown } from "@/lib/errors";
import { fetchOwnProfile } from "@/lib/profile";
import { colors, radius, spacing } from "@/lib/theme";

export function BarberProfileSection() {
  const { user } = useUser();
  const router = useRouter();

  const [specialty, setSpecialty] = useState<string | null>(null);
  const [years, setYears] = useState<number | null>(null);
  const [shopNames, setShopNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      async function load() {
        if (!user?.id) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }
        try {
          const [profile, memberships] = await Promise.all([
            fetchOwnProfile(user.id),
            loadMyMemberships(user.id),
          ]);
          const shops = await loadMemberShops(
            memberships.map((member) => member.shop_id)
          );
          if (cancelled) {
            return;
          }
          setSpecialty(profile?.specialty ?? null);
          setYears(profile?.years_of_experience ?? null);
          setShopNames(shops.map((shop) => shop.name));
        } catch (e) {
          if (!cancelled) {
            setError(errorMessageFromUnknown(e));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Professional"
        actionLabel="Edit"
        onAction={() => router.push("/onboarding/barber-professional")}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Specialty</Text>
            <Text style={styles.value} numberOfLines={2}>
              {specialty ?? "Not set"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Experience</Text>
            <Text style={styles.value}>
              {years != null ? `${years} ${years === 1 ? "year" : "years"}` : "Not set"}
            </Text>
          </View>
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <SectionHeader title="My shops" />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : shopNames.length === 0 ? (
        <Text style={styles.emptyText}>
          You{"'"}re not part of any shop yet. Join with an invitation code.
        </Text>
      ) : (
        <View style={styles.card}>
          {shopNames.map((name) => (
            <View key={name} style={styles.row}>
              <Text style={styles.value} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  loading: {
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    width: 90,
    fontSize: 13,
    color: colors.muted,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
