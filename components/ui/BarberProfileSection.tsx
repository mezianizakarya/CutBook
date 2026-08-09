import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { DetailRow, DetailsCard } from "@/components/ui/DetailsCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { loadMemberShops, loadMyMemberships } from "@/lib/barber";
import { fetchOwnProfile } from "@/lib/profile";
import { colors, radius, spacing } from "@/lib/theme";
import { useFocusLoad } from "@/lib/useFocusLoad";

type ProfessionalData = {
  specialty: string | null;
  years: number | null;
  shopNames: string[];
};

export function BarberProfileSection() {
  const { user } = useUser();
  const router = useRouter();

  const { data, loading, error } = useFocusLoad<ProfessionalData>(
    async () => {
      if (!user?.id) {
        return { specialty: null, years: null, shopNames: [] };
      }
      const [profile, memberships] = await Promise.all([
        fetchOwnProfile(user.id),
        loadMyMemberships(user.id),
      ]);
      const shops = await loadMemberShops(
        memberships.map((member) => member.shop_id)
      );
      return {
        specialty: profile?.specialty ?? null,
        years: profile?.years_of_experience ?? null,
        shopNames: shops.map((shop) => shop.name),
      };
    },
    [user?.id]
  );

  const yearsLabel =
    data?.years != null
      ? `${data.years} ${data.years === 1 ? "year" : "years"}`
      : "Not set";

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
        <DetailsCard>
          <DetailRow label="Specialty" value={data?.specialty ?? "Not set"} numberOfLines={2} />
          <DetailRow label="Experience" value={yearsLabel} />
        </DetailsCard>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <SectionHeader title="My shops" />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !data || data.shopNames.length === 0 ? (
        <Text style={styles.emptyText}>
          You{"'"}re not part of any shop yet. Join with an invitation code.
        </Text>
      ) : (
        <View style={styles.card}>
          {data.shopNames.map((name) => (
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
