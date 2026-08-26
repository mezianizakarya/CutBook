import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { BookingCard } from "@/components/ui/BookingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StaffBookingSheet } from "@/components/ui/StaffBookingSheet";
import { StatCard } from "@/components/ui/StatCard";
import { getLocale, t } from "@/lib/i18n";
import { localeDateString } from "@/lib/format";
import { computeDashboardStats } from "@/lib/barber";
import {
  fetchBookingCustomers,
  toBookingCard,
  type BookingCustomer,
  type BookingRow,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { greetingFor, startOfDay, useFormatCents } from "@/lib/format";
import { loadOwnerShops, loadShopBookings, type OwnerShop } from "@/lib/owner";
import { colors, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

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

  const formattedRevenue = useFormatCents(stats.monthRevenueCents);

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
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      </Screen>
    );
  }

  if (shops.length === 0) {
    return (
      <Screen scroll paddingHorizontal={14} style={styles.screenPadding}>
        <EmptyState
          title={t("owner.no_shop_title")}
          subtitle={t("owner.create_first_shop_hint")}
          actionLabel={t("owner.create_first_shop")}
          onAction={() => router.push("/onboarding/owner-shop")}
        />
      </Screen>
    );
  }

  const shopName = shops.length === 1 ? shops[0].name : t("owner.shops_count", { count: shops.length });
  const dateLabel = localeDateString(new Date(), getLocale(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Screen paddingHorizontal={14} style={styles.screenPadding}>
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
          <AppText style={styles.title}>
            {greetingFor(new Date())}, {user?.firstName ?? t("common.there")}
          </AppText>
          <AppText style={styles.subtitle}>{dateLabel}</AppText>
          <AppText style={styles.shopName}>{shopName}</AppText>
        </View>

        {pendingShops.length > 0 ? (
          <NoticeBanner
            notice={{
              message:
                pendingShops.length === 1
                  ? t("owner.shop_pending_single")
                  : t("owner.shop_pending_plural"),
              tone: "role",
            }}
            variant="soft"
          />
        ) : null}

        {notice ? <NoticeBanner notice={notice} variant="soft" /> : null}

        {!!error && <AppText style={styles.errorText}>{error}</AppText>}

        <View style={styles.statsRow}>
          <StatCard label={t("staff.today")} value={String(stats.todayCount)} />
          <StatCard label={t("bookings.pending")} value={String(stats.pendingCount)} />
          <StatCard label={t("bookings.completed")} value={String(stats.completedCount)} />
          <StatCard label={t("staff.revenue")} value={formattedRevenue} />
        </View>

        <SectionHeader title={t("dashboard.today_schedule")} />
        {todayBookings.length === 0 ? (
          <View style={styles.emptyDay}>
            <AppText style={styles.emptyDayTitle}>{t("barber.nothing_scheduled_today")}</AppText>
            <AppText style={styles.emptyDaySubtitle}>
              {t("dashboard.bookings_will_show")}
            </AppText>
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
