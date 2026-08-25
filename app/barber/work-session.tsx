import { RTLIcon } from "@/components/ui/RTLIcon";
import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { loadMyBookings, loadMyMemberships } from "@/lib/barber";
import {
    customerDisplayName,
    fetchBookingCustomers,
    setBookingStatus,
    type BookingCustomer,
    type BookingRow,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { startOfDay } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";
import {
    activeEntry,
    buildTodaySchedule,
    currentPosition,
    effectiveEndMs,
    extendBooking,
    formatCountdown,
    isPaused,
    loadWorkday,
    nextEntry,
    remainingAppointments,
    startBooking,
    startWorkday,
    useNow,
    type WorkDayRow,
} from "@/lib/workSession";

const DAY_MS = 86_400_000;

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
    const [refreshing, setRefreshing] = useState(false);
    const { notice, showNotice } = useNotice();

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
        const memberIds = memberships.map((m) => m.id);
        const dayStart = startOfDay(new Date());
        const dayEnd = new Date(dayStart.getTime() + DAY_MS);
        const rows = await loadMyBookings(memberIds, dayStart, dayEnd);
        const primaryMemberId = memberIds[0] ?? -1;
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
        setCustomers(await fetchBookingCustomers(rows.map((r) => r.id)));
        setWorkday(todayWorkday);
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            setLoading(true);
            load()
                .catch((e) => {
                    if (!cancelled) setError(errorMessageFromUnknown(e));
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
            return () => { cancelled = true; };
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

    useEffect(() => {
        if (!context || context.memberIds.length === 0) return;
        const filter = context.memberIds.map((id) => String(id)).join(",");
        const channel = supabase
            .channel(`barber-work-session-${context.primaryMemberId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "bookings", filter: `staff_id=in.(${filter})` },
                () => { void load().catch((e) => setError(errorMessageFromUnknown(e))); }
            )
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [context, load]);

    const schedule = useMemo(() => buildTodaySchedule(bookings ?? [], now), [bookings, now]);
    const active = activeEntry(schedule);
    const next = nextEntry(schedule);
    const position = currentPosition(schedule);
    const remaining = remainingAppointments(schedule);

    const customerById = useMemo(
        () => new Map(customers.map((c) => [c.booking_id, c])),
        [customers]
    );

    const completedCount = useMemo(
        () => (bookings ?? []).filter((r) => r.status === "completed").length,
        [bookings]
    );
    const totalCount = schedule.length;

    const activePaused = active ? isPaused(active.row) : false;
    const activeEndMs = active ? effectiveEndMs(active.row, now) : 0;
    const activeRemaining = active ? activeEndMs - now.getTime() : 0;
    const isOvertime = active ? activeRemaining <= 0 : false;

    const queueItems = useMemo(() => {
        return schedule
            .filter((e) => e.row.status !== "cancelled" && e.row.status !== "no_show")
            .map((e) => {
                const customer = customerById.get(e.row.id);
                const phase = !e.row.started_at
                    ? e.row.status === "completed"
                        ? "done"
                        : "waiting"
                    : "in-chair";
                return { entry: e, customer, phase };
            });
    }, [schedule, customerById]);

    async function run(action: () => Promise<unknown>, success?: string): Promise<void> {
        setBusy(true);
        try {
            await action();
            if (success) showNotice(success);
            await load();
        } catch (e) {
            showNotice(errorMessageFromUnknown(e), "danger");
        } finally {
            setBusy(false);
        }
    }

    async function handleRefresh(): Promise<void> {
        setRefreshing(true);
        try {
            await load();
        } catch (e) {
            showNotice(errorMessageFromUnknown(e), "danger");
        } finally {
            setRefreshing(false);
        }
    }

    function handleStart() {
        if (!next) return;
        void run(async () => startBooking(next.row.id), t("barber.appointment_started"));
    }

    function handleFinish() {
        if (!active) return;
        void run(async () => setBookingStatus(active.row.id, "completed"), t("barber.cut_finished"));
    }

    function handleExtend(minutes: number) {
        if (!active) return;
        void run(async () => extendBooking(active.row.id, minutes));
    }

    useEffect(() => {
        if (!context || context.memberIds.length === 0) return;
        const memberId = context.primaryMemberId;
        const hasWork = (bookings ?? []).some((r) => r.status === "pending" || r.status === "confirmed");
        if (memberId < 0 || workday || !hasWork) return;
        startWorkday(memberId).then(setWorkday).catch(() => undefined);
    }, [context, bookings, workday]);

    if (loading && bookings === null) {
        return (
            <Screen centered>
                <ActivityIndicator color={colors.primary} />
            </Screen>
        );
    }

    const activeCustomer = active ? customerById.get(active.row.id) : null;
    const nextCustomer = next ? customerById.get(next.row.id) : null;

    return (
        <Screen paddingHorizontal={14}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                keyboardShouldPersistTaps="handled"
            >
            <View style={styles.header}>
                <Pressable
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace("/barber/dashboard");
                    }}
                    hitSlop={8}
                    style={styles.backButton}
                    accessibilityRole="button"
                >
                    <RTLIcon name="chevron-back" size={26} color={colors.text} />
                </Pressable>
                <Text style={styles.title}>{t("barber.todays_work")}</Text>
                <Text style={styles.counter}>{completedCount} / {totalCount}</Text>
            </View>

            {notice ? (
                <View style={styles.noticePill}>
                    <Text style={styles.noticeText}>{notice.message}</Text>
                </View>
            ) : null}
            {!!error && <Text style={styles.error}>{error}</Text>}

            {active ? (
                <View style={styles.card}>
                    <View style={styles.nowServingPill}>
                        <View style={styles.nowDot} />
                        <Text style={styles.nowServingText}>{t("barber.now_serving")}</Text>
                    </View>

                    <Text style={styles.customerName}>
                        {customerDisplayName(activeCustomer)}
                    </Text>
                    <View style={styles.serviceRow}>
                        <Text style={styles.serviceText}>
                            {active.row.service_name} · {active.row.service_duration_minutes} {t("common.min")}
                        </Text>
                    </View>

                    <View style={styles.timerContainer}>
                        <View style={styles.timerRing}>
                            <Text style={styles.timerTime}>
                                {activePaused
                                    ? formatCountdown(activeRemaining)
                                    : isOvertime
                                        ? `+${formatCountdown(-activeRemaining)}`
                                        : formatCountdown(activeRemaining)}
                            </Text>
                            <Text style={[styles.timerLabel, isOvertime && { color: colors.danger }]}>
                                {activePaused ? t("barber.paused") : isOvertime ? t("barber.overtime") : t("barber.remaining")}
                            </Text>
                        </View>
                    </View>

                    {!!active.row.note && (
                        <View style={styles.noteBox}>
                            <Text style={styles.noteLabel}>{t("staff.note")}</Text>
                            <Text style={styles.noteText}>{active.row.note}</Text>
                        </View>
                    )}

                    <View style={styles.extendRow}>
                        {[1, 2, 5].map((m) => (
                            <Pressable
                                key={m}
                                onPress={() => handleExtend(m)}
                                disabled={busy}
                                style={styles.extendButton}
                            >
                                <Text style={styles.extendButtonText}>{t("barber.extend_min", { minutes: m })}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Button title={t("barber.finish_cut")} onPress={handleFinish} loading={busy} />

                    {next && (
                        <View style={styles.nextBox}>
                            <Text style={styles.nextLabel}>{t("barber.next_label")}</Text>
                            <View style={styles.nextRow}>
                                <Avatar
                                    fullName={customerDisplayName(nextCustomer)}
                                    imageUrl={nextCustomer?.avatar_url}
                                    size={28}
                                />
                                <Text style={styles.nextName}>
                                    {customerDisplayName(nextCustomer)} · {next.row.service_name}
                                </Text>
                                <Text style={styles.nextTime}>
                                    {t("barber.estimated_time", { minutes: next.row.service_duration_minutes })}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            ) : next ? (
                <View style={styles.card}>
                    <Button title={t("barber.start_workday")} onPress={handleStart} loading={busy} />
                </View>
            ) : (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>
                        {completedCount > 0 ? t("barber.all_done_today") : t("barber.no_appointments_today")}
                    </Text>
                </View>
            )}

            <View style={styles.queueHeader}>
                <Text style={styles.queueTitle}>{t("barber.todays_queue")}</Text>
            </View>

            <View style={styles.queueList}>
                {queueItems.map((item) => {
                    const isCurrent = item.phase === "in-chair";
                    const isDone = item.entry.row.status === "completed";
                    return (
                        <View key={item.entry.row.id} style={styles.queueRow}>
                            <View style={[styles.queueDot, isCurrent && styles.queueDotActive]} />
                            <View style={styles.queueInfo}>
                                <Text style={[styles.queueName, isDone && styles.queueNameDone]} numberOfLines={1}>
                                    {customerDisplayName(item.customer)}
                                </Text>
                                {!!item.entry.row.note && (
                                    <Text style={styles.queueNote} numberOfLines={1}>
                                        {item.entry.row.note}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.queueStatus, isDone && styles.queueStatusDone]}>
                                {isDone ? t("common.done") : isCurrent ? t("barber.in_chair") : t("barber.waiting")}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.bottomActions}>
                <Button
                    title={t("barber.add_walkin")}
                    variant="outline"
                    onPress={() => { }}
                    style={styles.walkInButton}
                />
                <Button
                    title={t("barber.take_a_break")}
                    variant="outline"
                    onPress={() => { }}
                    style={styles.breakButton}
                />
            </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        flex: 1,
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
    },
    counter: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.muted,
    },
    error: {
        color: colors.danger,
        fontSize: 13,
        textAlign: "center",
        marginBottom: spacing.sm,
    },
    noticePill: {
        backgroundColor: colors.primarySoft,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    noticeText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.primaryDark,
        textAlign: "center",
    },
    card: {
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        padding: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    nowServingPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        alignSelf: "flex-start",
        backgroundColor: colors.primarySoft,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    nowDot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    nowServingText: {
        fontSize: 11,
        fontWeight: "700",
        color: colors.primaryDark,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    customerName: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
    },
    serviceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    serviceText: {
        fontSize: 14,
        color: colors.muted,
    },
    timerContainer: {
        alignItems: "center",
        paddingVertical: spacing.md,
    },
    timerRing: {
        alignItems: "center",
        gap: 2,
    },
    timerTime: {
        fontSize: 56,
        fontWeight: "800",
        color: colors.text,
        fontVariant: ["tabular-nums"],
    },
    timerLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.muted,
    },
    noteBox: {
        backgroundColor: colors.surface,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        gap: 4,
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
    extendRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    extendButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    extendButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.text,
    },
    nextBox: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.md,
        gap: spacing.xs,
    },
    nextLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: colors.primaryDark,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    nextRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    nextName: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    nextTime: {
        fontSize: 13,
        color: colors.muted,
    },
    emptyCard: {
        alignItems: "center",
        paddingVertical: spacing.xl,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.muted,
    },
    queueHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
    },
    queueTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    queueList: {
        gap: spacing.xs,
        marginBottom: spacing.lg,
    },
    queueRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    queueDot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
        backgroundColor: colors.border,
    },
    queueDotActive: {
        backgroundColor: colors.primary,
    },
    queueInfo: {
        flex: 1,
        gap: 2,
    },
    queueName: {
        fontSize: 15,
        fontWeight: "500",
        color: colors.text,
    },
    queueNameDone: {
        color: colors.muted,
    },
    queueNote: {
        fontSize: 12,
        color: colors.muted,
        fontStyle: "italic",
    },
    queueStatus: {
        fontSize: 13,
        color: colors.muted,
    },
    queueStatusDone: {
        color: colors.success,
    },
    bottomActions: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    walkInButton: {
        flex: 1,
    },
    breakButton: {
        flex: 1,
    },
});