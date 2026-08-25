import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { t } from "@/lib/i18n";
import { BookingCard } from "@/components/ui/BookingCard";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

type StatusFilter = "all" | BookingStatus;

const STATUS_FILTERS: { key: StatusFilter; labelKey: string }[] = [
  { key: "all", labelKey: "bookings.filter_all" },
  { key: "pending", labelKey: "bookings.pending" },
  { key: "confirmed", labelKey: "bookings.confirmed" },
  { key: "completed", labelKey: "bookings.completed" },
  { key: "cancelled", labelKey: "bookings.cancelled" },
  { key: "no_show", labelKey: "bookings.no_show" },
];

export default function OwnerBookingsScreen() {
  const { user } = useUser();
  const [shops, setShops] = useState<OwnerShop[]>([]);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const counts = useMemo(() => {
    const rows = bookings ?? [];
    const byStatus = new Map<string, number>();
    for (const row of rows) {
      byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
    }
    return byStatus;
  }, [bookings]);

  const filtered = useMemo(() => {
    const rows = bookings ?? [];
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [bookings, statusFilter]);

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
          title={t("owner.no_shop_title")}
          subtitle={t("bookings.will_appear_here")}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("bookings.title")}</Text>
        <Text style={styles.subtitle}>{t("bookings.all_appointments")}</Text>
      </View>

      {notice ? <NoticeBanner notice={notice} variant="soft" /> : null}

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => setStatusFilter(filter.key)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {t(filter.labelKey as string)} (
                {filter.key === "all"
                  ? bookings?.length ?? 0
                  : counts.get(filter.key) ?? 0}
                )
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(row) => String(row.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={t("bookings.no_bookings_filter")}
            subtitle={t("bookings.try_different_filter")}
          />
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={toBookingCard(item)}
            onPress={(card) => {
              const full = bookings?.find((b) => b.id === card.id) ?? null;
              if (full) {
                setSelected(full);
              }
            }}
          />
        )}
      />

      {!!selected && (
        <StaffBookingSheet
          row={selected}
          customer={customerById.get(selected.id) ?? null}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onNotice={showNotice}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
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
  chipsScroll: {
    flexGrow: 0,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginStart: 0,
    marginEnd: -14,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingEnd: 6,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  chipLabelActive: {
    color: colors.white,
  },
});
