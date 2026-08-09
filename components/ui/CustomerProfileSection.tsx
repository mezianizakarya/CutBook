import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { errorMessageFromUnknown } from "@/lib/errors";
import { loadFavoriteShops } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/lib/theme";

type BookingCounts = {
  all: number;
  upcoming: number;
};

export function CustomerProfileSection() {
  const { user } = useUser();
  const customerId = user?.id;

  const [counts, setCounts] = useState<BookingCounts | null>(null);
  const [favorites, setFavorites] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      async function load() {
        if (!customerId) {
          if (!cancelled) {
            setCounts({ all: 0, upcoming: 0 });
            setFavorites(0);
          }
          return;
        }
        try {
          const [bookingResult, favoriteShops] = await Promise.all([
            supabase
              .from("bookings")
              .select("status, starts_at")
              .eq("customer_id", customerId),
            loadFavoriteShops(customerId),
          ]);
          if (cancelled) {
            return;
          }
          const rows = (bookingResult.data ?? []) as {
            status: string;
            starts_at: string;
          }[];
          const now = Date.now();
          setCounts({
            all: rows.length,
            upcoming: rows.filter(
              (row) =>
                (row.status === "pending" || row.status === "confirmed") &&
                new Date(row.starts_at).getTime() >= now
            ).length,
          });
          setFavorites(favoriteShops.length);
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
    }, [customerId])
  );

  return (
    <View style={styles.section}>
      <SectionHeader title="Activity" />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.statsRow}>
          <StatCard label="Bookings" value={String(counts?.all ?? 0)} />
          <StatCard label="Upcoming" value={String(counts?.upcoming ?? 0)} />
          <StatCard label="Favorites" value={String(favorites ?? 0)} />
        </View>
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
