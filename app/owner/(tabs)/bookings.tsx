import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BookingCard } from "@/components/ui/BookingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { StaffBookingSheet } from "@/components/ui/StaffBookingSheet";
import {
  fetchBookingCustomers,
  toBookingCard,
  type BookingCustomer,
  type BookingRow,
  type BookingStatus,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { loadOwnerShops, loadShopBookings, type OwnerShop } from "@/lib/owner";
import { colors, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

type StatusFilter = "all" | BookingStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No-show" },
];

export default function OwnerBookingsScreen() {
  const { user } = useUser();
  const [shops, setShops] = useState<OwnerShop[]>([]);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [shopFilter, setShopFilter] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setShops([]);
      setBookings([]);
      setCustomers([]);
      return;
    }
    const owned = await loadOwnerShops(user.id);
    setShops(owned);
    if (owned.length === 0) {
      setBookings([]);
      setCustomers([]);
      return;
    }
    const from = new Date(Date.now() - 30 * 86_400_000);
    const to = new Date(Date.now() + 60 * 86_400_000);
    const rows = await loadShopBookings(
      owned.map((shop) => shop.id),
      from,
      to
    );
    setBookings(rows);
    setCustomers(await fetchBookingCustomers(rows.map((row) => row.id)));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch((e) => {
          if (!cancelled) {
            setError(errorMessageFromUnknown(e));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setRefreshing(false);
    }
  }

  function handleUpdated(updated: BookingRow) {
    setBookings((previous) =>
      (previous ?? []).map((row) => (row.id === updated.id ? updated : row))
    );
    setSelected((previous) =>
      previous && previous.id === updated.id ? updated : previous
    );
  }

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.booking_id, customer])),
    [customers]
  );

  const filtered = useMemo(() => {
    const rows = bookings ?? [];
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      if (shopFilter !== "all" && row.shop?.id !== shopFilter) {
        return false;
      }
      return true;
    });
  }, [bookings, statusFilter, shopFilter]);

  if (loading && !bookings) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error && !bookings) {
    return (
      <Screen centered>
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (shops.length === 0) {
    return (
      <Screen scroll style={styles.screenPadding}>
        <EmptyState
          title="You don't manage a shop yet"
          subtitle="Bookings across your shops will appear here."
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>All appointments across your shops.</Text>
        </View>

        {notice ? <NoticeBanner notice={notice} variant="soft" /> : null}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <FilterChip
            label={shops.length > 1 ? "All shops" : shops[0]?.name ?? "Shop"}
            selected={shopFilter === "all"}
            onPress={() => setShopFilter("all")}
          />
          {shops.map((shop) => (
            <FilterChip
              key={shop.id}
              label={shop.name}
              selected={shopFilter === shop.id}
              onPress={() => setShopFilter(shop.id)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {STATUS_FILTERS.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              selected={statusFilter === filter.key}
              onPress={() => setStatusFilter(filter.key)}
            />
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <EmptyState
            title="No bookings"
            subtitle="Try a different filter or check back later."
          />
        ) : (
          filtered.map((row) => (
            <BookingCard
              key={row.id}
              booking={toBookingCard(row)}
              onPress={(card) => {
                const full = bookings?.find((b) => b.id === card.id) ?? null;
                if (full) {
                  setSelected(full);
                }
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setSelected(null)}
      >
        {!!selected && (
          <StaffBookingSheet
            row={selected}
            customer={customerById.get(selected.id) ?? null}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            onNotice={showNotice}
          />
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: 98,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  centerWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    fontSize: 14,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
