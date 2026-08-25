import { useUser } from "@clerk/expo";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { CustomerReputationSection } from "@/components/ui/CustomerReputationSection";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { t } from "@/lib/i18n";
import { loadFavoriteShops } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/lib/theme";
import { useFocusLoad } from "@/lib/useFocusLoad";
import { useUserCountry } from "@/lib/user-country";

type BookingCounts = {
  all: number;
  upcoming: number;
};

type ActivityData = {
  counts: BookingCounts;
  favorites: number;
};

export function CustomerProfileSection() {
  const { user } = useUser();
  const customerId = user?.id;
  const userCountry = useUserCountry();

  const { data, loading, error } = useFocusLoad<ActivityData>(
    async () => {
      if (!customerId) {
        return { counts: { all: 0, upcoming: 0 }, favorites: 0 };
      }
      const [bookingResult, favoriteShops] = await Promise.all([
        supabase
          .from("bookings")
          .select("status, starts_at")
          .eq("customer_id", customerId),
        loadFavoriteShops(customerId, userCountry),
      ]);
      const rows = (bookingResult.data ?? []) as {
        status: string;
        starts_at: string;
      }[];
      const now = Date.now();
      return {
        counts: {
          all: rows.length,
          upcoming: rows.filter(
            (row) =>
              (row.status === "pending" || row.status === "confirmed") &&
              new Date(row.starts_at).getTime() >= now
          ).length,
        },
        favorites: favoriteShops.length,
      };
    },
    [customerId]
  );

  return (
    <>
      <CustomerReputationSection />
      <View style={styles.section}>
        <SectionHeader title={t("customer.activity")} />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <StatCard label={t("customer.bookings")} value={String(data?.counts.all ?? 0)} />
            <StatCard label={t("customer.upcoming")} value={String(data?.counts.upcoming ?? 0)} />
            <StatCard label={t("customer.favorites")} value={String(data?.favorites ?? 0)} />
          </View>
        )}
        {!!error && <AppText style={styles.error}>{error}</AppText>}
      </View>
    </>
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
