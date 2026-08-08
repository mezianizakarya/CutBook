import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StaffBookingSheet } from "@/components/ui/StaffBookingSheet";
import { StatCard } from "@/components/ui/StatCard";
import { computeDashboardStats } from "@/lib/barber";
import {
  fetchBookingCustomers,
  toBookingCard,
  type BookingCustomer,
  type BookingRow,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, startOfDay } from "@/lib/format";
import { loadOwnerShops, loadShopBookings, type OwnerShop } from "@/lib/owner";
import { colors, radius, spacing } from "@/lib/theme";

function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export default function OwnerDashboardScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [shops, setShops] = useState<OwnerShop[]>([]);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
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
    const now = new Date();
    const from = startOfDay(now);
    const to = new Date(now.getTime() + 14 * 86_400_000);
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

  const stats = useMemo(
    () => computeDashboardStats(bookings ?? []),
    [bookings]
  );

  const todayBookings = useMemo(() => {
    const rows = bookings ?? [];
    const now = new Date();
    const start = startOfDay(now).getTime();
    const end = start + 86_400_000;
    return rows.filter(
      (row) =>
        new Date(row.starts_at).getTime() >= start &&
        new Date(row.starts_at).getTime() < end
    );
  }, [bookings]);

  const pendingShops = useMemo(
    () => shops.filter((shop) => shop.status === "pending"),
    [shops]
  );

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
          subtitle="Create your first shop to start taking bookings. It appears on CutBook once approved."
          actionLabel="Create your first shop"
          onAction={() => router.push("/onboarding/owner-shop")}
        />
      </Screen>
    );
  }

  const shopName = shops.length === 1 ? shops[0].name : `${shops.length} shops`;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
          <Text style={styles.title}>
            {greetingFor(new Date())}, {user?.firstName ?? "there"}
          </Text>
          <Text style={styles.subtitle}>{dateLabel}</Text>
          <Text style={styles.shopName}>{shopName}</Text>
        </View>

        {pendingShops.length > 0 ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {pendingShops.length === 1
                ? "Your shop is pending approval by CutBook."
                : "Some of your shops are pending approval by CutBook."}
            </Text>
          </View>
        ) : null}

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

        <View style={styles.statsRow}>
          <StatCard label="Today" value={String(stats.todayCount)} accent />
          <StatCard label="Pending" value={String(stats.pendingCount)} />
          <StatCard label="Completed" value={String(stats.completedCount)} />
          <StatCard label="Revenue" value={formatCents(stats.monthRevenueCents)} />
        </View>

        <SectionHeader title="Today's schedule" />
        {todayBookings.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayTitle}>Nothing scheduled today</Text>
            <Text style={styles.emptyDaySubtitle}>
              Bookings across your shops will show up here.
            </Text>
          </View>
        ) : (
          todayBookings.map((row) => (
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
  shopName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
    marginTop: spacing.xs,
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
  emptyDay: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyDayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  emptyDaySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
});
