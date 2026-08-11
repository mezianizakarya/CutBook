import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  loadBarberClients,
  loadMyBookings,
  loadMyMemberships,
} from "@/lib/barber";
import {
  customerDisplayName,
  fetchBookingCustomers,
  setBookingStatus,
  type BookingCustomer,
  type BookingRow,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatTime, startOfDay } from "@/lib/format";
import { loadShopDetail, type ShopService } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";
import { useNotice } from "@/lib/useNotice";
import {
  activeEntry,
  addWalkIn,
  buildTodaySchedule,
  currentPosition,
  effectiveEndMs,
  endWorkday,
  extendBooking,
  formatCountdown,
  formatDelay,
  isPaused,
  loadWorkday,
  nextEntry,
  pauseBooking,
  remainingAppointments,
  resumeBooking,
  startBooking,
  startWorkday,
  summarizeDay,
  useNow,
  type WorkDayRow,
} from "@/lib/workSession";

const DAY_MS = 86_400_000;
const WARNING_MS = 3 * 60_000;
const EARLY_START_GRACE_MS = 5 * 60_000;

type BarberContext = {
  memberIds: number[];
  primaryMemberId: number;
  shopId: number | null;
};

export default function BarberWorkSessionScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [context, setContext] = useState<BarberContext | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
  const [workday, setWorkday] = useState<WorkDayRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [endingDay, setEndingDay] = useState(false);
  const [walkInVisible, setWalkInVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [finishVisible, setFinishVisible] = useState(false);
  const [endDayVisible, setEndDayVisible] = useState(false);
  const [startArmed, setStartArmed] = useState(false);
  const { notice, showNotice } = useNotice();
  const {
    count: startCountdown,
    start: startStartCountdown,
    cancel: cancelStartCountdown,
  } = useConfirmCountdown({
    onExpire: () => setStartArmed(false),
  });

  const nextAlertedRef = useRef<number | null>(null);
  const zeroAlertedRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setContext(null);
      setBookings([]);
      setCustomers([]);
      setWorkday(null);
      return;
    }
    const memberships = await loadMyMemberships(user.id);
    const memberIds = memberships.map((member) => member.id);
    const dayStart = startOfDay(new Date());
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const rows = await loadMyBookings(memberIds, dayStart, dayEnd);
    const primaryMemberId = memberIds[0] ?? null;
    let todayWorkday: WorkDayRow | null = null;
    if (primaryMemberId != null) {
      todayWorkday = await loadWorkday(primaryMemberId);
    }
    setContext({
      memberIds,
      primaryMemberId: primaryMemberId ?? -1,
      shopId: memberships[0]?.shop_id ?? null,
    });
    setBookings(rows);
    setCustomers(await fetchBookingCustomers(rows.map((row) => row.id)));
    setWorkday(todayWorkday);
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

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void load().catch((e) => setError(errorMessageFromUnknown(e)));
      }
    });
    return () => subscription.remove();
  }, [load]);

  const now = useNow();
  const dayKey = startOfDay(now).getTime();
  const prevDayKeyRef = useRef(dayKey);
  useEffect(() => {
    if (prevDayKeyRef.current !== dayKey) {
      prevDayKeyRef.current = dayKey;
      void load().catch((e) => setError(errorMessageFromUnknown(e)));
    }
  }, [dayKey, load]);

  useEffect(() => {
    if (!context || context.memberIds.length === 0) {
      return;
    }
    const filter = context.memberIds
      .map((id) => String(id))
      .join(",");
    const channel = supabase
      .channel(`barber-work-session-${context.primaryMemberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `staff_id=in.(${filter})`,
        },
        () => {
          void load().catch((e) => setError(errorMessageFromUnknown(e)));
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [context, load]);

  const schedule = useMemo(
    () => buildTodaySchedule(bookings ?? [], now),
    [bookings, now]
  );
  const active = activeEntry(schedule);
  const next = nextEntry(schedule);
  const position = currentPosition(schedule);
  const remaining = remainingAppointments(schedule);

  const activePaused = active ? isPaused(active.row) : false;
  const activeEndMs = active ? effectiveEndMs(active.row, now) : 0;
  const activeRemaining = active ? activeEndMs - now.getTime() : 0;
  const isOvertime = active ? activeRemaining <= 0 : false;
  const timerTone = active
    ? activePaused
      ? colors.warning
      : isOvertime
        ? colors.danger
        : activeRemaining <= WARNING_MS
          ? colors.warning
          : colors.text
    : colors.text;
  const timerCaption = active
    ? activePaused
      ? "On break"
      : isOvertime
        ? "The appointment is running long."
        : activeRemaining <= WARNING_MS
          ? "Almost done"
          : "remaining"
    : "—";

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.booking_id, customer])),
    [customers]
  );

  useEffect(() => {
    if (!next || now.getTime() < new Date(next.row.starts_at).getTime()) {
      return;
    }
    if (nextAlertedRef.current !== next.row.id) {
      nextAlertedRef.current = next.row.id;
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      ).catch(() => undefined);
    }
  }, [next, now]);

  useEffect(() => {
    if (!active || activeRemaining > 0) {
      return;
    }
    if (zeroAlertedRef.current !== active.row.id) {
      zeroAlertedRef.current = active.row.id;
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => undefined);
    }
  }, [active, activeRemaining]);

  async function run(
    action: () => Promise<unknown>,
    success?: string
  ): Promise<void> {
    setBusy(true);
    try {
      await action();
      if (success) {
        showNotice(success);
      }
      await load();
    } catch (e) {
      showNotice(errorMessageFromUnknown(e), "danger");
    } finally {
      setBusy(false);
    }
  }

  function handleStartPress() {
    if (!next) {
      return;
    }
    if (startArmed) {
      setStartArmed(false);
      cancelStartCountdown();
      const bookingId = next.row.id;
      void run(async () => startBooking(bookingId), "Appointment started");
    } else {
      setStartArmed(true);
      startStartCountdown();
    }
  }

  function handleExtend(minutes: number) {
    if (!active) {
      return;
    }
    void run(async () => extendBooking(active.row.id, minutes));
  }

  function handlePause() {
    if (!active) {
      return;
    }
    void run(async () => pauseBooking(active.row.id), "Paused — timer frozen");
  }

  function handleResume() {
    if (!active) {
      return;
    }
    void run(async () => resumeBooking(active.row.id), "Back to work");
  }

  function openFinishSheet() {
    if (!active) {
      return;
    }
    setFinishVisible(true);
  }

  function handleFinishConfirmed() {
    if (!active) {
      return;
    }
    setFinishVisible(false);
    void run(
      async () => setBookingStatus(active.row.id, "completed"),
      "Appointment completed"
    );
  }

  function handleNoShow() {
    if (!next) {
      return;
    }
    void run(
      async () => setBookingStatus(next.row.id, "no_show"),
      "Marked as no-show"
    );
  }

  function handleEndDayConfirmed() {
    const memberId = context?.primaryMemberId;
    if (memberId == null || memberId < 0) {
      return;
    }
    setEndDayVisible(false);
    setEndingDay(true);
    endWorkday(memberId)
      .then((row) => {
        setWorkday(row);
        showNotice("Day wrapped up", "success");
      })
      .catch((e) => showNotice(errorMessageFromUnknown(e), "danger"))
      .finally(() => setEndingDay(false));
  }

  useEffect(() => {
    if (!context || context.memberIds.length === 0) {
      return;
    }
    const memberId = context.primaryMemberId;
    const hasWork = (bookings ?? []).some(
      (row) => row.status === "pending" || row.status === "confirmed"
    );
    if (memberId < 0 || workday || !hasWork) {
      return;
    }
    startWorkday(memberId)
      .then(setWorkday)
      .catch(() => undefined);
  }, [context, bookings, workday]);

  if (loading && bookings === null) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const completedToday = (bookings ?? []).some(
    (row) => row.status === "completed"
  );
  const summary = summarizeDay(bookings ?? [], workday);
  const nothingLeft = schedule.length > 0 && !active && !next;
  const canEndDay =
    !!workday && !workday.ended_at && (summary.served > 0 || nothingLeft);

  const progressLabel =
    schedule.length === 0
      ? "No appointments today"
      : `Appointment ${position} of ${schedule.length}`;

  const startingEarly = next
    ? now.getTime() < new Date(next.row.starts_at).getTime() - EARLY_START_GRACE_MS
    : false;

  const nextCard = next ? (
    <View style={styles.nextSection}>
      <Text style={styles.nextLabel}>NEXT</Text>
      <View style={styles.nextStrip}>
        <Avatar
          fullName={customerDisplayName(customerById.get(next.row.id))}
          imageUrl={customerById.get(next.row.id)?.avatar_url}
          size={32}
        />
        <Text style={styles.nextName}>
          {customerDisplayName(customerById.get(next.row.id))}
        </Text>
      </View>
    </View>
  ) : null;

  return (
    <Screen paddingHorizontal={14} style={styles.screenPadding}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/barber/dashboard");
              }
            }}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Today&apos;s Work</Text>
            <Text style={styles.subtitle}>Today · {progressLabel}</Text>
          </View>
          <Pressable
            onPress={() => setMenuVisible(true)}
            hitSlop={8}
            style={styles.overflowButton}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </Pressable>
        </View>

        {notice ? <NoticeBanner notice={notice} /> : null}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {active ? (
          <>
            <View style={styles.card}>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>NOW SERVING</Text>
              </View>
              <View style={styles.customerRow}>
                <Avatar
                  fullName={customerDisplayName(customerById.get(active.row.id))}
                  imageUrl={customerById.get(active.row.id)?.avatar_url}
                  size={64}
                />
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {customerDisplayName(customerById.get(active.row.id))}
                  </Text>
                  <Text style={styles.serviceLine}>
                    {active.row.service_name} ·{" "}
                    {active.row.service_duration_minutes} min ·{" "}
                    {formatCents(active.row.service_price_cents)}
                  </Text>
                  <Text style={styles.scheduledLine}>
                    Scheduled {formatTime(active.row.starts_at)} –{" "}
                    {formatTime(active.row.ends_at)}
                  </Text>
                  {!!active.row.applied_reward_title && (
                    <Text style={styles.rewardLine}>
                      {active.row.applied_reward_title} applied
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Customer note</Text>
                <Text style={styles.noteText}>
                  {active.row.note || "No note left for this visit"}
                </Text>
              </View>
              <View style={styles.timerBox}>
                <Text style={[styles.timer, { color: timerTone }]}>
                  {activePaused
                    ? formatCountdown(activeRemaining)
                    : isOvertime
                      ? `+${formatCountdown(-activeRemaining)}`
                      : formatCountdown(activeRemaining)}
                </Text>
                <Text style={[styles.timerCaption, { color: timerTone }]}>
                  {isOvertime && !activePaused
                    ? `OVERTIME · ${timerCaption}`
                    : timerCaption}
                </Text>
                <Text style={styles.endsAt}>
                  Ends at {formatTime(new Date(activeEndMs).toISOString())}
                </Text>
              </View>
              <View style={styles.addTimeRow}>
                <Text style={styles.addTimeLabel}>Need more time?</Text>
                <View style={styles.addTimeButtons}>
                  {[1, 2, 5].map((minutes) => (
                    <Pressable
                      key={minutes}
                      onPress={() => handleExtend(minutes)}
                      disabled={busy}
                      style={styles.addTimeButton}
                      accessibilityRole="button"
                    >
                      <Text style={styles.addTimeButtonText}>+{minutes} min</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.stickyActions}>
                <Button
                  title={activePaused ? "RESUME" : "PAUSE"}
                  variant="outline"
                  onPress={activePaused ? handleResume : handlePause}
                  loading={busy}
                  style={styles.flexButton}
                />
                <Button
                  title="FINISH CUT"
                  onPress={openFinishSheet}
                  loading={busy}
                  style={styles.flexButton}
                />
              </View>
            </View>
            {nextCard}
          </>
        ) : nextCard ? (
          nextCard
        ) : (
          <EmptyState
            title={
              completedToday
                ? "All appointments completed"
                : "Nothing scheduled today"
            }
            subtitle={
              completedToday
                ? "Great work today — enjoy the rest of your day."
                : "Bookings will show up here when clients reserve."
            }
          />
        )}

        {!!workday && workday.ended_at ? (
          <>
            <SectionHeader title="Day summary" />
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.served}</Text>
                <Text style={styles.summaryLabel}>Served</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.noShows}</Text>
                <Text style={styles.summaryLabel}>No-shows</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {formatCents(summary.revenueCents)}
                </Text>
                <Text style={styles.summaryLabel}>Revenue</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {summary.delayMs > 0 ? formatDelay(summary.delayMs) : "—"}
                </Text>
                <Text style={styles.summaryLabel}>Delay</Text>
              </View>
            </View>
            <Text style={styles.endedAt}>
              Day ended at {formatTime(workday.ended_at)}
            </Text>
          </>
        ) : null}

        <View style={styles.spacer} />

        <View style={styles.stickyBar}>
          {next ? (
            <View style={styles.stickyActions}>
              <Button
                title={
                  startArmed
                    ? startingEarly
                      ? `Confirm early start (${startCountdown})`
                      : `Confirm start (${startCountdown})`
                    : "START APPOINTMENT"
                }
                onPress={handleStartPress}
                loading={busy}
                variant={startArmed ? "danger" : "primary"}
                style={styles.flexButton}
              />
              <Button
                title="No-show"
                variant="dangerOutline"
                onPress={handleNoShow}
                loading={busy}
                style={styles.flexButton}
              />
            </View>
          ) : context?.shopId != null && context.shopId > 0 ? (
            <Button
              title="Add walk-in"
              variant="outline"
              onPress={() => setWalkInVisible(true)}
              style={styles.walkInButton}
            />
          ) : null}
        </View>
      </View>

      {!!context && context.shopId != null && context.shopId > 0 && (
        <WalkInSheet
          visible={walkInVisible}
          shopId={context.shopId}
          memberId={context.primaryMemberId}
          memberIds={context.memberIds}
          onClose={() => setWalkInVisible(false)}
          onAdded={() => {
            setWalkInVisible(false);
            void load().catch((e) => setError(errorMessageFromUnknown(e)));
          }}
        />
      )}

      <BottomSheet visible={menuVisible} onClose={() => setMenuVisible(false)}>
        <Text style={styles.sheetTitle}>Menu</Text>
        <Pressable
          onPress={() => {
            setMenuVisible(false);
            router.push("/barber/schedule");
          }}
          style={styles.menuItem}
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={22} color={colors.text} />
          <Text style={styles.menuItemText}>Today&apos;s schedule</Text>
          <Text style={styles.menuItemHint}>View the full day</Text>
        </Pressable>
        {!!context && context.shopId != null && context.shopId > 0 && (
          <Pressable
            onPress={() => {
              setMenuVisible(false);
              setWalkInVisible(true);
            }}
            style={styles.menuItem}
            accessibilityRole="button"
          >
            <Ionicons name="person-add-outline" size={22} color={colors.text} />
            <Text style={styles.menuItemText}>Add walk-in</Text>
            <Text style={styles.menuItemHint}>Quick booking</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            setMenuVisible(false);
            setEndDayVisible(true);
          }}
          disabled={endingDay || !canEndDay}
          style={styles.menuItem}
          accessibilityRole="button"
        >
          <Ionicons name="flag-outline" size={22} color={colors.danger} />
          <Text style={[styles.menuItemText, styles.menuItemDanger]}>
            End workday
          </Text>
          <Text style={styles.menuItemHint}>Clock out for the day</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet
        visible={finishVisible}
        onClose={() => setFinishVisible(false)}
      >
        <Text style={styles.sheetTitle}>Finish appointment?</Text>
        <Text style={styles.sheetSubtitle}>
          {active
            ? `${customerDisplayName(customerById.get(active.row.id))} · ${
                active.row.service_name
              }`
            : ""}
        </Text>
        <View style={styles.sheetActions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setFinishVisible(false)}
            style={styles.flexButton}
          />
          <Button
            title="Finish Cut"
            variant="primary"
            onPress={handleFinishConfirmed}
            loading={busy}
            style={styles.flexButton}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={endDayVisible}
        onClose={() => setEndDayVisible(false)}
      >
        <Text style={styles.sheetTitle}>End workday?</Text>
        <Text style={styles.sheetSubtitle}>
          {remaining > 0
            ? `You still have ${remaining} appointment${
                remaining === 1 ? "" : "s"
              } remaining today.`
            : "All appointments are done for today."}
        </Text>
        <View style={styles.sheetActions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setEndDayVisible(false)}
            style={styles.flexButton}
          />
          <Button
            title="End Workday"
            variant="danger"
            onPress={handleEndDayConfirmed}
            loading={endingDay}
            style={styles.flexButton}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

type WalkInSheetProps = {
  visible: boolean;
  shopId: number;
  memberId: number;
  memberIds: number[];
  onClose: () => void;
  onAdded: () => void;
};

function WalkInSheet({
  visible,
  shopId,
  memberId,
  memberIds,
  onClose,
  onAdded,
}: WalkInSheetProps) {
  const [services, setServices] = useState<ShopService[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [offsetMinutes, setOffsetMinutes] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setServiceId(null);
    setCustomerId(null);
    setOffsetMinutes(0);
    (async () => {
      try {
        const [detail, barberClients] = await Promise.all([
          loadShopDetail(shopId),
          loadBarberClients(memberIds),
        ]);
        if (!cancelled) {
          setServices(detail?.services ?? []);
          setClients(
            barberClients.map((client) => ({
              id: client.customer_id,
              name: [client.first_name, client.last_name]
                .filter(Boolean)
                .join(" ") || "Customer",
              avatar: client.avatar_url,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(errorMessageFromUnknown(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, shopId, memberIds]);

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const canSubmit = !!selectedService && !!customerId && !submitting;

  async function handleAdd() {
    if (!selectedService || !customerId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const startsAt = new Date(Date.now() + offsetMinutes * 60_000);
      await addWalkIn({
        staffId: memberId,
        serviceId: selectedService.id,
        customerId,
        startsAt,
      });
      onAdded();
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>Add walk-in</Text>
      <Text style={styles.sheetSubtitle}>
        A customer who walked in without an online booking.
      </Text>

      <Text style={styles.sheetStep}>Service</Text>
      {loading ? (
        <Text style={styles.sheetHint}>Loading…</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sheetChips}
        >
          {services.map((service) => {
            const isActive = serviceId === service.id;
            return (
              <Pressable
                key={service.id}
                onPress={() => setServiceId(service.id)}
                style={[styles.sheetChip, isActive && styles.sheetChipActive]}
              >
                <Text
                  style={[
                    styles.sheetChipLabel,
                    isActive && styles.sheetChipLabelActive,
                  ]}
                >
                  {service.name} · {formatCents(service.price_cents)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Text style={styles.sheetStep}>Customer</Text>
      {loading ? (
        <Text style={styles.sheetHint}>Loading…</Text>
      ) : clients.length === 0 ? (
        <Text style={styles.sheetHint}>
          No previous clients to pick from. Customers who have booked you appear here.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sheetChips}
        >
          {clients.map((client) => {
            const isActive = customerId === client.id;
            return (
              <Pressable
                key={client.id}
                onPress={() => setCustomerId(client.id)}
                style={[
                  styles.sheetClientChip,
                  isActive && styles.sheetChipActive,
                ]}
              >
                <Avatar fullName={client.name} imageUrl={client.avatar} size={24} />
                <Text
                  style={[
                    styles.sheetChipLabel,
                    isActive && styles.sheetChipLabelActive,
                  ]}
                >
                  {client.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Text style={styles.sheetStep}>Start time</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sheetChips}
      >
        {[0, 15, 30, 45].map((offset) => {
          const isActive = offsetMinutes === offset;
          const label =
            offset === 0
              ? "Now"
              : `+${offset} min`;
          return (
            <Pressable
              key={offset}
              onPress={() => setOffsetMinutes(offset)}
              style={[styles.sheetChip, isActive && styles.sheetChipActive]}
            >
              <Text
                style={[
                  styles.sheetChipLabel,
                  isActive && styles.sheetChipLabelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Add booking"
        onPress={handleAdd}
        loading={submitting}
        disabled={!canSubmit}
      />
      <Button
        title="Cancel"
        variant="outline"
        onPress={onClose}
        style={styles.sheetCancel}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 0,
  },
  container: {
    flex: 1,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerText: {
    flex: 1,
    gap: 2,
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
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  customerInfo: {
    flex: 1,
    gap: 2,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  serviceLine: {
    fontSize: 14,
    color: colors.muted,
  },
  scheduledLine: {
    fontSize: 13,
    color: colors.muted,
  },
  rewardLine: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  nextSection: {
    gap: spacing.xs,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  nextStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nextName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  timerBox: {
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.xs,
  },
  timer: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  timerCaption: {
    fontSize: 14,
    fontWeight: "600",
  },
  endsAt: {
    fontSize: 13,
    color: colors.muted,
  },
  noteBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
  },
  addTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  addTimeLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  addTimeButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  addTimeButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  addTimeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  endedAt: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  walkInButton: {
    backgroundColor: colors.surface,
  },
  spacer: {
    flex: 1,
  },
  stickyBar: {
    paddingTop: spacing.sm,
  },
  stickyActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  overflowButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  menuItemDanger: {
    color: colors.danger,
  },
  menuItemHint: {
    fontSize: 13,
    color: colors.muted,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flexButton: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: -spacing.sm,
  },
  sheetStep: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm,
  },
  sheetHint: {
    fontSize: 13,
    color: colors.muted,
  },
  sheetChips: {
    gap: spacing.sm,
    paddingRight: 6,
  },
  sheetChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sheetChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  sheetChipLabelActive: {
    color: colors.white,
  },
  sheetClientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetCancel: {
    backgroundColor: colors.surface,
  },
});
