import { useUser } from "@clerk/expo";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { t } from "@/lib/i18n";
import {
  emptyReputation,
  fetchMyReputation,
  getReputationLabel,
  type CustomerReputation,
} from "@/lib/reputation";
import { colors, radius, spacing } from "@/lib/theme";
import { useFocusLoad } from "@/lib/useFocusLoad";

export function CustomerReputationSection() {
  const { user } = useUser();

  const { data, loading, error } = useFocusLoad<CustomerReputation | null>(
    async () => {
      if (!user?.id) {
        return null;
      }
      return fetchMyReputation();
    },
    [user?.id]
  );

  const reputation = data ?? emptyReputation();

  return (
    <View style={styles.section}>
      <SectionHeader title={t("customer.trust_level")} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>{t("customer.trust_level")}</Text>
              <Text style={styles.levelValue}>
                {getReputationLabel(reputation.level)}
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label={t("customer.completed_bookings")}
              value={String(reputation.completedCount)}
            />
            <StatCard
              label={t("customer.no_shows")}
              value={String(reputation.noShowCount)}
            />
          </View>
        </>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
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
  levelCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: "500",
  },
  levelValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
