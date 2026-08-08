import { useFocusEffect } from "expo-router";
import { useUser } from "@clerk/expo";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Button } from "@/components/ui/Button";
import { fetchBookingCustomers, toBookingCard, type BookingCustomer, type BookingRow } from "@/lib/booking";
import {
  addDayOff,
  availabilityForDay,
  dayHasTimeOff,
  loadMemberShops,
  loadMyAvailability,
  loadMyBookings,
  loadMyMemberships,
  loadMyTimeOffs,
  removeDayOff,
  weekStart,
  type AvailabilityRow,
  type BarberMember,
  type BarberShop,
  type TimeOffRow,
} from "@/lib/barber";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatOpenRange, isSameDay, startOfDay } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

type ScheduleContext = {
  memberships: BarberMember[];
  shops: BarberShop[];
  availability: AvailabilityRow[];
  timeOffs: TimeOffRow[];
};

const EMPTY_CONTEXT: ScheduleContext = {
  memberships: [],
  shops: [],
  availability: [],
  timeOffs: [],
};

export default function BarberScheduleScreen() {
  const { user } = useUser();
  const [context, setContext] = useState<ScheduleContext | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [changing, setChanging] = useState(false);

  const weekDays = useMemo(() => {
    const start = weekStart(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
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
    const start = weekStart(new Date());
    const end = new Date(start.getTime() + 7 * 86_400_000);
    const [shops, availability, timeOffs, rows] = await Promise.all([
      loadMemberShops(memberships.map((member) => member.shop_id)),
      loadMyAvailability(memberIds),
      loadMyTimeOffs(memberIds),
      loadMyBookings(memberIds, start, end),
    ]);
    setContext({ memberships, shops, availability, timeOffs });
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

  const primaryMember = context?.memberships[0] ?? null;
  const shop = context?.shops[0] ?? null;

  const dayBookings = useMemo(
    () =>
      (bookings ?? [])
        .filter((row) => isSameDay(row.starts_at, selectedDay))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [bookings, selectedDay]
  );

  const dayAvailability = useMemo(
    () =>
      primaryMember
        ? availabilityForDay(context?.availability ?? [], primaryMember.id, selectedDay)
        : [],
    [context, primaryMember, selectedDay]
  );

  const dayOff = useMemo(
    () =>
      primaryMember
        ? dayHasTimeOff(context?.timeOffs ?? [], primaryMember.id, selectedDay)
        : null,
    [context, primaryMember, selectedDay]
  );

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.booking_id, customer])),
    [customers]
  );

  const isPastDay = selectedDay.getTime() < startOfDay(new Date()).getTime();
  const canTakeDayOff =
    !isPastDay && !dayOff && dayAvailability.length > 0 && !!primaryMember;

  function handleUpdated(updated: BookingRow) {
    setBookings((previous) =>
      (previous ?? []).map((row) => (row.id === updated.id ? updated : row))
    );
    setSelected((previous) =>
      previous && previous.id === updated.id ? updated : previous
    );
  }

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

  async function handleAddDayOff() {
    if (!primaryMember) {
      return;
    }
    Alert.alert(
      "Mark as unavailable",
      "Customers won't be able to book you for this day.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take day off",
          style: "destructive",
          onPress: async () => {
            setChanging(true);
            try {
              await addDayOff(primaryMember.id, selectedDay);
              await load();
            } catch (e) {
              Alert.alert("Couldn't update availability", errorMessageFromUnknown(e));
            } finally {
              setChanging(false);
            }
          },
        },
      ]
    );
  }

  async function handleRemoveDayOff() {
    if (!dayOff) {
      return;
    }
    setChanging(true);
    try {
      await removeDayOff(dayOff.id);
      await load();
    } catch (e) {
      Alert.alert("Couldn't update availability", errorMessageFromUnknown(e));
    } finally {
      setChanging(false);
    }
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
        <EmptyState
          title="Not assigned to a shop"
          subtitle="You're not a member of any barbershop yet. Ask your shop owner to add you as staff."
        />
      </Screen>
    );
  }

  const selectedLabel = selectedDay.toLocaleDateString(undefined, {
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
          <Text style={styles.title}>Schedule</Text>
          <Text style={styles.subtitle}>
            {shop?.name ?? "—"} · {selectedLabel}
          </Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekScroll}
          contentContainerStyle={styles.weekRow}
        >
          {weekDays.map((day) => {
            const active = isSameDay(day, selectedDay);
            const today = isSameDay(day, new Date());
            return (
              <PressableDay
                key={day.toISOString()}
                day={day}
                active={active}
                today={today}
                onPress={() => setSelectedDay(day)}
              />
            );
          })}
        </ScrollView>

        {dayOff ? (
          <View style={[styles.dayPill, styles.dayPillLeave]}>
            <Text style={styles.dayPillLeaveText}>
              On leave — {dayOff.reason ?? "Unavailable"}
            </Text>
          </View>
        ) : dayAvailability.length > 0 ? (
          <View style={[styles.dayPill, styles.dayPillAvailable]}>
            <Text style={styles.dayPillAvailableText}>
              Available{" "}
              {dayAvailability
                .map((window) => formatOpenRange(window.starts_at, window.ends_at))
                .join(" · ")}
            </Text>
          </View>
        ) : (
          <View style={[styles.dayPill, styles.dayPillOff]}>
            <Text style={styles.dayPillOffText}>Not available this day</Text>
          </View>
        )}

        {canTakeDayOff && (
          <Button
            title="Mark as day off"
            variant="dangerOutline"
            loading={changing}
            disabled={changing}
            onPress={handleAddDayOff}
          />
        )}
        {!!dayOff && !isPastDay && (
          <Button
            title="Remove day off"
            variant="outline"
            loading={changing}
            disabled={changing}
            onPress={handleRemoveDayOff}
            style={styles.removeButton}
          />
        )}

        <Text style={styles.dayBookingsTitle}>
          {dayBookings.length > 0
            ? `${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"}`
            : "No bookings this day"}
        </Text>
        {dayBookings.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayTitle}>Nothing scheduled</Text>
            <Text style={styles.emptyDaySubtitle}>
              Bookings for this day will show up here.
            </Text>
          </View>
        ) : (
          dayBookings.map((row) => (
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
            onNotice={() => undefined}
          />
        )}
      </Modal>
    </Screen>
  );
}

type PressableDayProps = {
  day: Date;
  active: boolean;
  today: boolean;
  onPress: () => void;
};

function PressableDay({ day, active, today, onPress }: PressableDayProps) {
  return (
    <PressableDayButton active={active} today={today} onPress={onPress}>
      <Text style={[styles.dayLetter, active && styles.dayLetterActive]}>
        {DAY_LETTERS[day.getDay()]}
      </Text>
      <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>
        {day.getDate()}
      </Text>
    </PressableDayButton>
  );
}

function PressableDayButton({
  active,
  today,
  onPress,
  children,
}: {
  active: boolean;
  today: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayPillButton,
        active && styles.dayPillButtonActive,
        today && !active && styles.dayPillButtonToday,
      ]}
    >
      {children}
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
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  weekScroll: {
    flexGrow: 0,
    marginLeft: 0,
    marginRight: -14,
  },
  weekRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: 4,
  },
  dayPillButton: {
    width: 52,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayPillButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayPillButtonToday: {
    borderColor: colors.primary,
  },
  dayLetter: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  dayLetterActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  dayNumberActive: {
    color: colors.white,
  },
  dayPill: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillAvailable: {
    backgroundColor: "#dcfce7",
    borderColor: colors.success,
  },
  dayPillAvailableText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
  },
  dayPillLeave: {
    backgroundColor: "#fee2e2",
    borderColor: colors.danger,
  },
  dayPillLeaveText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  dayPillOff: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  dayPillOffText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  removeButton: {
    backgroundColor: colors.surface,
  },
  dayBookingsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.xs,
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
