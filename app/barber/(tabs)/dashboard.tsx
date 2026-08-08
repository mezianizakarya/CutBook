import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { JoinShopForm } from "@/components/ui/JoinShopForm";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StaffBookingSheet } from "@/components/ui/StaffBookingSheet";
import { StatCard } from "@/components/ui/StatCard";
import { fetchBookingCustomers, toBookingCard, type BookingCustomer, type BookingRow } from "@/lib/booking";
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
import { formatCents, formatOpenRange, startOfDay } from "@/lib/format";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [joinVisible, setJoinVisible] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    tone: "danger" | "success";
  } | null>(null);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaveArmed, setLeaveArmed] = useState(false);
  const [leaveCountdown, setLeaveCountdown] = useState(5);
  const leaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function showNotice(message: string, tone: "danger" | "success") {
    setNotice({ message, tone });
    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
    }
    noticeTimeout.current = setTimeout(() => setNotice(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (noticeTimeout.current) {
        clearTimeout(noticeTimeout.current);
      }
      if (leaveTimer.current) {
        clearInterval(leaveTimer.current);
      }
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setContext(EMPTY_CONTEXT);
      setBookings([]);
      setCustomers([]);
      return;
    }
    const memberships = await loadMyMemberships(user.id);
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

  const primaryMember = context?.memberships[0] ?? null;
  const shop = context?.shops[0] ?? null;
  const professionalDone = user?.unsafeMetadata?.onboardingStep === "complete";

  function armLeave() {
    setLeaveArmed(true);
    setLeaveCountdown(5);
    if (leaveTimer.current) {
      clearInterval(leaveTimer.current);
    }
    leaveTimer.current = setInterval(() => {
      setLeaveCountdown((previous) => {
        if (previous <= 1) {
          if (leaveTimer.current) {
            clearInterval(leaveTimer.current);
            leaveTimer.current = null;
          }
          setLeaveArmed(false);
          return 5;
        }
        return previous - 1;
      });
    }, 1000);
  }

  function disarmLeave() {
    if (leaveTimer.current) {
      clearInterval(leaveTimer.current);
      leaveTimer.current = null;
    }
    setLeaveArmed(false);
    setLeaveCountdown(5);
  }

  async function confirmLeave() {
    if (!primaryMember) {
      return;
    }
    disarmLeave();
    try {
      await leaveShop(primaryMember.id);
      showNotice("You left the shop", "success");
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
      <Screen scroll style={styles.screenPadding}>
        {!professionalDone && (
          <Pressable
            style={[styles.pill, styles.pillSetup]}
            onPress={() => router.push("/onboarding/barber-professional")}
          >
            <Text style={styles.pillSetupText}>
              Finish your profile — add your specialty and experience
            </Text>
          </Pressable>
        )}
        <EmptyState
          title={professionalDone ? "Not assigned to a shop" : "Finish your profile first"}
          subtitle={
            professionalDone
              ? "You're not a member of any barbershop yet. Ask your shop owner to share an invitation code with you."
              : "Add your specialty and experience to your profile before you can join a shop."
          }
          actionLabel={
            professionalDone ? "Join a shop with a code" : "Finish your profile"
          }
          onAction={() =>
            professionalDone
              ? setJoinVisible(true)
              : router.push("/onboarding/barber-professional")
          }
        />
        {professionalDone && (
          <JoinShopForm
            visible={joinVisible}
            onClose={() => setJoinVisible(false)}
            onJoined={(shopName) => {
              showNotice(`You joined ${shopName}`, "success");
              void load();
            }}
          />
        )}
      </Screen>
    );
  }

  const greetingName = user?.firstName || primaryMember?.display_name || "there";
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
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
            {greetingFor(today)}, {greetingName}
          </Text>
          <Text style={styles.subtitle}>{dateLabel}</Text>
          {!!shop && (
            <View style={styles.shopRow}>
              <Text style={styles.shopName}>{shop.name}</Text>
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
                <Text
                  style={[
                    styles.leaveButtonText,
                    leaveArmed && styles.leaveButtonTextArmed,
                  ]}
                >
                  {leaveArmed ? `Confirm leave (${leaveCountdown})` : "Leave shop"}
                </Text>
              </Pressable>
            </View>
          )}
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

        {!!error && <Text style={styles.error}>{error}</Text>}

        {!professionalDone && (
          <Pressable
            style={[styles.pill, styles.pillSetup]}
            onPress={() => router.push("/onboarding/barber-professional")}
          >
            <Text style={styles.pillSetupText}>
              Finish your profile — add your specialty and experience
            </Text>
          </Pressable>
        )}

        {leaveToday ? (
          <View style={[styles.pill, styles.pillLeave]}>
            <Text style={styles.pillLeaveText}>
              On leave today — {leaveToday.reason ?? "Unavailable"}
            </Text>
          </View>
        ) : availabilityToday.length > 0 ? (
          <View style={[styles.pill, styles.pillAvailable]}>
            <Text style={styles.pillAvailableText}>
              Available today{" "}
              {availabilityToday
                .map((window) =>
                  formatOpenRange(window.starts_at, window.ends_at)
                )
                .join(" · ")}
            </Text>
          </View>
        ) : (
          <View style={[styles.pill, styles.pillOff]}>
            <Text style={styles.pillOffText}>Not scheduled today</Text>
          </View>
        )}

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
              Enjoy the breather — bookings will show up here.
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
    color: "#fff",
  },
  notice: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeSuccess: {
    backgroundColor: "#dcfce7",
    borderColor: colors.success,
  },
  noticeDanger: {
    backgroundColor: "#fee2e2",
    borderColor: colors.danger,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeTextSuccess: {
    color: colors.success,
  },
  noticeTextDanger: {
    color: colors.danger,
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
  pillSetup: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  pillSetupText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  emptyDay: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
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
