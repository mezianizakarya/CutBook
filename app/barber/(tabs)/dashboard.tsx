import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { BookingCard } from "@/components/ui/BookingCard";
import { Button } from "@/components/ui/Button";
import { CompleteProfileFirstSheet } from "@/components/ui/CompleteProfileFirstSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { JoinShopForm } from "@/components/ui/JoinShopForm";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StaffBookingSheet } from "@/components/ui/StaffBookingSheet";
import { StatCard } from "@/components/ui/StatCard";
import {
  customerDisplayName,
  fetchBookingCustomers,
  toBookingCard,
  type BookingCustomer,
  type BookingRow,
} from "@/lib/booking";
import {
  availabilityForDay,
  computeDashboardStats,
  dayHasTimeOff,
  leaveShop,
  loadMemberShops,
  loadMyAvailability,
  loadMyBookings,
  loadMyMemberships,
  loadMyTimeOffs,
  type AvailabilityRow,
  type BarberMember,
  type BarberShop,
  type TimeOffRow,
} from "@/lib/barber";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  useFormatCents,
  formatOpenRange,
  formatTime,
  greetingFor,
  startOfDay,
} from "@/lib/format";
import { fetchOwnProfile, isBarberProfessionalComplete } from "@/lib/profile";
import { getLocale, t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";
import { useNotice } from "@/lib/useNotice";
import { activeEntry, buildTodaySchedule, nextEntry } from "@/lib/workSession";

type BarberContext = {
  memberships: BarberMember[];
  shops: BarberShop[];
  availability: AvailabilityRow[];
  timeOffs: TimeOffRow[];
};

const EMPTY_CONTEXT: BarberContext = {
  memberships: [],
  shops: [],
  availability: [],
  timeOffs: [],
};

export default function BarberDashboardScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [context, setContext] = useState<BarberContext | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [joinVisible, setJoinVisible] = useState(false);
  const [completeProfileVisible, setCompleteProfileVisible] = useState(false);
  const [joinedShop, setJoinedShop] = useState<string | null>(null);
  const joinedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { notice, showNotice } = useNotice();
  const [leaveArmed, setLeaveArmed] = useState(false);
  const {
    count: leaveCountdown,
    start: startLeaveCountdown,
    cancel: cancelLeaveCountdown,
  } = useConfirmCountdown({
    onExpire: () => setLeaveArmed(false),
  });

  function armLeave() {
    setLeaveArmed(true);
    startLeaveCountdown();
  }

  function disarmLeave() {
    cancelLeaveCountdown();
    setLeaveArmed(false);
  }

  useEffect(() => {
    return () => {
      if (joinedTimeout.current) {
        clearTimeout(joinedTimeout.current);
      }
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setContext(EMPTY_CONTEXT);
      setBookings([]);
      setCustomers([]);
      setProfileComplete(false);
      return;
    }
    const [profile, memberships] = await Promise.all([
      fetchOwnProfile(user.id),
      loadMyMemberships(user.id),
    ]);
    setProfileComplete(isBarberProfessionalComplete(profile));
    if (memberships.length === 0) {
      setContext(EMPTY_CONTEXT);
      setBookings([]);
      setCustomers([]);
      return;
    }
    const memberIds = memberships.map((member) => member.id);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getTime() + 14 * 86_400_000);
    const [shops, availability, timeOffs, rows] = await Promise.all([
      loadMemberShops(memberships.map((member) => member.shop_id)),
      loadMyAvailability(memberIds),
      loadMyTimeOffs(memberIds),
      loadMyBookings(memberIds, from, to),
    ]);
    setContext({ memberships, shops, availability, timeOffs });
    setBookings(rows);
    const todayStart = startOfDay(now).getTime();
    const todayEnd = todayStart + 86_400_000;
    const todayIds = rows
      .filter(
        (row) =>
          new Date(row.starts_at).getTime() >= todayStart &&
          new Date(row.starts_at).getTime() < todayEnd
      )
      .map((row) => row.id);
    setCustomers(await fetchBookingCustomers(todayIds));
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

  const workSchedule = useMemo(
    () => buildTodaySchedule(todayBookings),
    [todayBookings]
  );
  const workActive = useMemo(
    () => activeEntry(workSchedule),
    [workSchedule]
  );
  const workNext = useMemo(() => nextEntry(workSchedule), [workSchedule]);

  const primaryMember = context?.memberships[0] ?? null;
  const shop = context?.shops[0] ?? null;

  async function confirmLeave() {
    if (!primaryMember) {
      return;
    }
    disarmLeave();
    try {
      await leaveShop(primaryMember.id);
      showNotice(t("barber.left_shop"), "success");
      void load();
    } catch (e) {
      showNotice(errorMessageFromUnknown(e), "danger");
    }
  }

  const availabilityToday = useMemo(
    () =>
      primaryMember
        ? availabilityForDay(context?.availability ?? [], primaryMember.id, new Date())
        : [],
    [context, primaryMember]
  );
  const leaveToday = useMemo(
    () =>
      primaryMember
        ? dayHasTimeOff(context?.timeOffs ?? [], primaryMember.id, new Date())
        : null,
    [context, primaryMember]
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

  if (loading && !context) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (context && context.memberships.length === 0) {
    return (
      <Screen scroll paddingHorizontal={14} paddingTop={spacing.sm}>
        <View style={styles.pageHeader}>
          <AppText style={styles.pageTitle}>{t("tabs.dashboard")}</AppText>
        </View>
        <EmptyState
          title={t("barber.not_assigned_shop")}
          subtitle={t("barber.not_member_yet")}
          actionLabel={t("shop.join_with_code")}
          onAction={() => {
            if (profileComplete) {
              setJoinVisible(true);
            } else {
              setCompleteProfileVisible(true);
            }
          }}
        />
        <JoinShopForm
          visible={joinVisible}
          onClose={() => setJoinVisible(false)}
          onJoined={(shopName) => {
            setJoinedShop(shopName);
            if (joinedTimeout.current) {
              clearTimeout(joinedTimeout.current);
            }
            joinedTimeout.current = setTimeout(
              () => setJoinedShop(null),
              3000
            );
            void load();
          }}
        />
        <CompleteProfileFirstSheet
          visible={completeProfileVisible}
          onClose={() => setCompleteProfileVisible(false)}
          onCompleteProfile={() => {
            setCompleteProfileVisible(false);
            router.push("/onboarding/barber-professional");
          }}
        />
      </Screen>
    );
  }

  const greetingName = user?.firstName || primaryMember?.display_name || t("common.there");
  const today = new Date();
  const dateLabel = today.toLocaleDateString(getLocale(), {
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
            {greetingFor(today)}, {greetingName}
          </AppText>
          <AppText style={styles.subtitle}>{dateLabel}</AppText>
          {!!shop && (
            <View style={styles.shopRow}>
              <AppText style={styles.shopName}>{shop.name}</AppText>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  if (leaveArmed) {
                    void confirmLeave();
                  } else {
                    armLeave();
                  }
                }}
                style={[
                  styles.leaveButton,
                  leaveArmed && styles.leaveButtonArmed,
                ]}
              >
                <AppText
                  style={[
                    styles.leaveButtonText,
                    leaveArmed && styles.leaveButtonTextArmed,
                  ]}
                >
                  {leaveArmed ? t("barber.confirm_leave", { count: leaveCountdown }) : t("barber.leave_shop")}
                </AppText>
              </Pressable>
            </View>
          )}
        </View>

        {notice ? <NoticeBanner notice={notice} /> : null}

        {!!error && <AppText style={styles.error}>{error}</AppText>}

        {joinedShop ? (
          <View style={[styles.pill, styles.pillAvailable]}>
            <AppText style={styles.pillAvailableText}>
              {t("shop.you_joined", { shopName: joinedShop })}
            </AppText>
          </View>
        ) : leaveToday ? (
          <View style={[styles.pill, styles.pillLeave]}>
            <AppText style={styles.pillLeaveText}>
              {t("barber.on_leave_today", { reason: leaveToday.reason ?? t("barber.unavailable") })}
            </AppText>
          </View>
        ) : availabilityToday.length > 0 ? (
          <View style={[styles.pill, styles.pillAvailable]}>
            <AppText style={styles.pillAvailableText}>
              {t("barber.available_today", { ranges: availabilityToday
                .map((window) =>
                  formatOpenRange(window.starts_at, window.ends_at)
                )
                .join(" · ") })}
            </AppText>
          </View>
        ) : (
          <View style={[styles.pill, styles.pillOff]}>
            <AppText style={styles.pillOffText}>{t("barber.not_scheduled_today")}</AppText>
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard label={t("staff.today")} value={String(stats.todayCount)} />
          <StatCard label={t("status.pending")} value={String(stats.pendingCount)} />
          <StatCard label={t("status.completed")} value={String(stats.completedCount)} />
          <StatCard label={t("staff.revenue")} value={formattedRevenue} />
        </View>

        <SectionHeader title={t("barber.todays_schedule")} />
        {workSchedule.length === 0 ? (
          <EmptyState
            title={t("barber.nothing_scheduled_today")}
            subtitle={t("barber.enjoy_breather")}
          />
        ) : (
          <>
            <View style={styles.workdayRow}>
              <View style={styles.workdayInfo}>
                <AppText style={styles.workdayTitle}>
                  {workSchedule.length === 1
                    ? t("barber.appointment_count", { count: workSchedule.length })
                    : t("barber.appointment_count_plural", { count: workSchedule.length })}
                </AppText>
                <AppText style={styles.workdaySubtitle}>
                  {workActive
                    ? t("barber.serving_now", { name: customerDisplayName(customerById.get(workActive.row.id)) })
                    : workNext
                      ? t("barber.next_up_at", { time: formatTime(new Date(workNext.expectedStartMs).toISOString()) })
                      : t("barber.all_completed")}
                </AppText>
              </View>
              {(workActive || workNext) && (
                <Button
                  title={
                    workActive ? t("barber.continue_work_session") : t("barber.start_workday")
                  }
                  onPress={() => router.push("/barber/work-session")}
                  style={styles.workdayButton}
                />
              )}
            </View>
            {todayBookings.map((row) => (
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
            ))}
          </>
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
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  pageHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
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
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  leaveButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaveButtonArmed: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  leaveButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  leaveButtonTextArmed: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  pill: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pillAvailable: {
    backgroundColor: "#dcfce7",
    borderColor: colors.success,
  },
  pillAvailableText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
  },
  pillLeave: {
    backgroundColor: "#fee2e2",
    borderColor: colors.danger,
  },
  pillLeaveText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  pillOff: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  pillOffText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  workdayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  workdayInfo: {
    flex: 1,
    gap: 2,
  },
  workdayTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  workdaySubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  workdayButton: {
    minWidth: 148,
  },
});
