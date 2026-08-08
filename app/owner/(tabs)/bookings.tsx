import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BookingCard } from "@/components/ui/BookingCard";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [notice, setNotice] = useState<{
    message: string;
    tone: "danger" | "success";
  } | null>(null);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(message: string, tone: "danger" | "success") {
    setNotice({ message, tone });
    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
    }
    noticeTimeout.current = setTimeout(() => setNotice(null), 3000);
  }

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

        {notice ? (
          <View
            style={[
              styles.notice,
              notice.tone === "danger" ? styles.noticeDanger : styles.noticeSuccess,
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                notice.tone === "danger" ? styles.noticeTextDanger : styles.noticeTextSuccess,
              ]}
            >
              {notice.message}
            </Text>
          </View>
        ) : null}

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

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
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
  notice: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeDanger: {
    backgroundColor: "#fee2e2",
  },
  noticeSuccess: {
    backgroundColor: "#dcfce7",
  },
  noticeText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "600",
  },
  noticeTextDanger: {
    color: colors.danger,
  },
  noticeTextSuccess: {
    color: colors.success,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
