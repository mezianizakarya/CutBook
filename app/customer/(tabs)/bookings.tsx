import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import { BookingCard } from "@/components/ui/BookingCard";
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge";
import { Button } from "@/components/ui/Button";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { ReviewSheet } from "@/components/ui/ReviewSheet";
import { Screen } from "@/components/ui/Screen";
import { StarRating } from "@/components/ui/StarRating";
import {
  cancelBooking,
  isCancellable,
  patchBookingRow,
  toBookingCard,
  type BookingRow,
} from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDateTime } from "@/lib/format";
import { loadMyShopReview, type ReviewRow } from "@/lib/reviews";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";
import { useNotice } from "@/lib/useNotice";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { useNow } from "@/lib/workSession";
import {
  customerProgress,
  formatCountdown,
  staffDaySchedule,
  type CustomerProgress,
} from "@/lib/workSession";

const PAGE_SIZE = 50;

type BookingFilter = "all" | "upcoming" | "past";

const BOOKING_FILTERS: BookingFilter[] = ["all", "upcoming", "past"];

export default function BookingsScreen() {
  const { user } = useUser();
  const customerId = user?.id;
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingFilter>("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const { notice, showNotice } = useNotice();

  const query = useCallback(
    (start: number, count: number) =>
      supabase
        .from("bookings")
        .select(
          "id, status, starts_at, ends_at, started_at, extended_minutes, paused_at, paused_minutes, service_name, service_price_cents, service_duration_minutes, note, cancel_reason, cancelled_at, applied_reward_title, shop:shops(id, name, logo_url), staff:shop_members(id, display_name, avatar_url)"
        )
        .eq("customer_id", customerId ?? "")
        .order("starts_at", { ascending: false })
        .range(start, start + count - 1),
    [customerId]
  );

  const load = useCallback(async () => {
    if (!customerId) {
      return;
    }
    setError(null);
    const { data, error } = await query(0, PAGE_SIZE);
    if (error) {
      setError(errorMessageFromUnknown(error));
      setBookings((previous) => previous ?? []);
      return;
    }
    const rows = (data ?? []) as unknown as BookingRow[];
    setBookings(rows);
    setHasMore(rows.length === PAGE_SIZE);
  }, [customerId, query]);

  const loadMore = useCallback(async () => {
    if (!customerId || loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    const start = bookings?.length ?? 0;
    const { data, error } = await query(start, PAGE_SIZE);
    if (error) {
      setError(errorMessageFromUnknown(error));
    } else {
      const rows = (data ?? []) as unknown as BookingRow[];
      setBookings((previous) => {
        const existing = new Set((previous ?? []).map((row) => row.id));
        return [
          ...(previous ?? []),
          ...rows.filter((row) => !existing.has(row.id)),
        ];
      });
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [customerId, loadingMore, hasMore, bookings?.length, query]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load().finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const filtered = useMemo(() => {
    const rows = bookings ?? [];
    const now = new Date().getTime();
    if (filter === "upcoming") {
      return rows.filter(
        (row) =>
          new Date(row.starts_at).getTime() >= now &&
          (row.status === "pending" || row.status === "confirmed")
      );
    }
    if (filter === "past") {
      return rows.filter(
        (row) =>
          new Date(row.starts_at).getTime() < now ||
          row.status === "cancelled" ||
          row.status === "no_show"
      );
    }
    return rows;
  }, [bookings, filter]);

  const counts = useMemo(() => {
    const rows = bookings ?? [];
    const now = new Date().getTime();
    return {
      all: rows.length,
      upcoming: rows.filter(
        (row) =>
          new Date(row.starts_at).getTime() >= now &&
          (row.status === "pending" || row.status === "confirmed")
      ).length,
      past: rows.filter(
        (row) =>
          new Date(row.starts_at).getTime() < now ||
          row.status === "cancelled" ||
          row.status === "no_show"
      ).length,
    };
  }, [bookings]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCancel(row: BookingRow) {
    try {
      const updated = await cancelBooking(row.id);
      setBookings((previous) => patchBookingRow(previous ?? [], updated));
      setSelected((previous) =>
        previous && previous.id === updated.id ? updated : previous
      );
      showNotice("Booking cancelled", "success");
    } catch (e) {
      Alert.alert("Couldn't cancel booking", errorMessageFromUnknown(e));
    }
  }

  const handleRowUpdate = useCallback((updated: BookingRow) => {
    setBookings((previous) => patchBookingRow(previous ?? [], updated));
    setSelected((previous) =>
      previous && previous.id === updated.id ? updated : previous
    );
  }, []);

  if (loading && !bookings) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.subtitle}>
          {counts.upcoming} upcoming · {counts.past} past
        </Text>
      </View>

      {notice ? (
        <NoticeBanner notice={notice} style={styles.noticeSpacing} />
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {BOOKING_FILTERS.map((value) => {
          const isActive = filter === value;
          return (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {value === "all" ? "All" : value === "upcoming" ? "Upcoming" : "Past"} (
                {counts[value]})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        style={styles.list}
        data={filtered.map(toBookingCard)}
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
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {filter === "all" ? "No bookings yet" : "Nothing here"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === "all"
                ? "Discover a barbershop and book your first appointment."
                : "Try a different filter."}
            </Text>
            {filter === "all" && (
              <Button
                title="Discover shops"
                variant="outline"
                onPress={() => router.push("/customer/discover")}
                style={styles.resetButton}
              />
            )}
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.listFooter}>
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Button
                  title="Load more"
                  variant="outline"
                  onPress={loadMore}
                  style={styles.loadMoreButton}
                />
              )}
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={(card) => {
              const row = bookings?.find((booking) => booking.id === card.id) ?? null;
              setSelected(row);
            }}
          />
        )}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setSelected(null)}
      >
        {!!selected && (
          <BookingDetailSheet
            row={selected}
            customerId={customerId ?? ""}
            onClose={() => setSelected(null)}
            onCancel={handleCancel}
            onRowUpdate={handleRowUpdate}
          />
        )}
      </Modal>
    </Screen>
  );
}

type BookingDetailSheetProps = {
  row: BookingRow;
  customerId: string;
  onClose: () => void;
  onCancel: (row: BookingRow) => void;
  onRowUpdate: (row: BookingRow) => void;
};

function BookingDetailSheet({
  row,
  customerId,
  onClose,
  onCancel,
  onRowUpdate,
}: BookingDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { translateY, panResponder } = useSheetDrag(onClose);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { notice, showNotice } = useNotice();
  const {
    count: confirmCount,
    start: startCountdown,
    cancel: cancelCountdown,
  } = useConfirmCountdown({
    onExpire: () => setConfirmingCancel(false),
  });
  const cancellable = isCancellable(row);

  const [staffSchedule, setStaffSchedule] = useState<BookingRow[] | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const now = useNow();

  const [myReview, setMyReview] = useState<ReviewRow | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);

  useEffect(() => {
    if (row.status !== "completed" || !row.shop?.id || !customerId) {
      setMyReview(null);
      return;
    }
    let active = true;
    setReviewLoading(true);
    loadMyShopReview(row.shop.id, customerId)
      .then((review) => {
        if (active) {
          setMyReview(review);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setReviewLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [row.id, row.status, row.shop?.id, customerId]);

  function handleReviewSaved(review: ReviewRow) {
    const editing = myReview !== null;
    setMyReview(review);
    showNotice(editing ? "Review updated" : "Review submitted", "success");
  }

  function handleReviewDeleted() {
    setMyReview(null);
    showNotice("Review removed", "success");
  }

  const loadSchedule = useCallback(async () => {
    if (row.status !== "pending" && row.status !== "confirmed") {
      return;
    }
    try {
      const rows = await staffDaySchedule(row.id);
      setStaffSchedule(rows);
      setLiveError(null);
      const mine = rows.find((item) => item.id === row.id);
      if (mine && mine.status !== row.status) {
        onRowUpdate(mine);
      }
    } catch (e) {
      setLiveError(errorMessageFromUnknown(e));
    }
  }, [row.id, row.status, onRowUpdate]);

  useEffect(() => {
    if (row.status !== "pending" && row.status !== "confirmed") {
      return;
    }
    let active = true;
    setStaffSchedule(null);
    setLiveError(null);
    void loadSchedule();
    const channel = supabase
      .channel(`customer-booking-${row.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${row.id}`,
        },
        () => {
          if (active) {
            void loadSchedule();
          }
        }
      )
      .subscribe();
    const poll = setInterval(() => {
      if (active) {
        void loadSchedule();
      }
    }, 20_000);
    return () => {
      active = false;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [row.id, row.status, loadSchedule]);

  const live = useMemo(
    () => (staffSchedule ? customerProgress(staffSchedule, row.id, now) : null),
    [staffSchedule, row.id, now]
  );

  function handleCancelPress() {
    if (confirmingCancel) {
      setConfirmingCancel(false);
      cancelCountdown();
      setCancelling(true);
      onCancel(row);
      setCancelling(false);
      onClose();
    } else {
      setConfirmingCancel(true);
      startCountdown();
    }
  }

  const staffName = row.staff?.display_name ?? "—";
  const shopName = row.shop?.name ?? "—";

  return (
    <>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable onPress={() => undefined}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              transform: [{ translateY }],
              paddingBottom: spacing.xl + insets.bottom,
            },
          ]}
        >
          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>
          <View style={styles.modalHeader}>
            <Avatar
              fullName={staffName}
              imageUrl={row.staff?.avatar_url ?? row.shop?.logo_url}
              size={48}
            />
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalName} numberOfLines={1}>
                {row.service_name || "—"}
              </Text>
              <Text style={styles.modalUsername} numberOfLines={1}>
                {staffName} · {shopName}
              </Text>
            </View>
            <BookingStatusBadge status={row.status} />
          </View>

          {notice ? <NoticeBanner notice={notice} /> : null}

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>When</Text>
              <Text style={styles.detailValue}>{formatDateTime(row.starts_at)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Barber</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {staffName}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Shop</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {shopName}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                {formatCents(row.service_price_cents)}
              </Text>
            </View>
            {!!row.note && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Note</Text>
                <Text style={styles.detailValue}>{row.note}</Text>
              </View>
            )}
            {!!row.cancel_reason && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason</Text>
                <Text style={styles.detailValue}>{row.cancel_reason}</Text>
              </View>
            )}
          </View>

          {(row.status === "pending" || row.status === "confirmed") && (
            <LiveProgressCard live={live} error={liveError} />
          )}

          {row.status === "completed" && !!row.shop?.id && !!customerId && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>Your review</Text>
                {!!myReview && (
                  <Pressable
                    onPress={() => setReviewVisible(true)}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.reviewEditLabel}>Edit</Text>
                  </Pressable>
                )}
              </View>
              {reviewLoading ? (
                <Text style={styles.reviewHint}>Loading…</Text>
              ) : myReview ? (
                <View style={styles.yourReviewCard}>
                  <StarRating value={myReview.rating} />
                  {myReview.status === "pending" && (
                    <Text style={styles.reviewPending}>Awaiting approval</Text>
                  )}
                  {!!myReview.comment && (
                    <Text style={styles.reviewComment} numberOfLines={2}>
                      {myReview.comment}
                    </Text>
                  )}
                </View>
              ) : (
                <Button
                  title="Leave a review"
                  variant="outline"
                  onPress={() => setReviewVisible(true)}
                  style={styles.reviewButton}
                />
              )}
            </View>
          )}

          {cancellable && (
            <Button
              title={
                confirmingCancel ? `Confirm cancel (${confirmCount})` : "Cancel booking"
              }
              onPress={handleCancelPress}
              variant={confirmingCancel ? "danger" : "dangerOutline"}
              loading={cancelling}
              disabled={cancelling}
              style={styles.modalActionSpacer}
            />
          )}
          <Button
            title="Close"
            variant="outline"
            onPress={() => {
              if (confirmingCancel) {
                setConfirmingCancel(false);
                cancelCountdown();
                return;
              }
              onClose();
            }}
            style={styles.cancelButton}
          />
        </Animated.View>
        </Pressable>
      </Pressable>
      <ReviewSheet
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        shopId={row.shop?.id ?? 0}
        shopName={row.shop?.name ?? "—"}
        customerId={customerId}
        bookingId={row.id}
        existing={myReview}
        onSaved={handleReviewSaved}
        onDeleted={handleReviewDeleted}
      />
    </>
  );
}

type LiveProgressCardProps = {
  live: CustomerProgress | null;
  error: string | null;
};

function LiveProgressCard({ live, error }: LiveProgressCardProps) {
  if (error) {
    return null;
  }
  if (!live) {
    return (
      <View style={styles.liveCard}>
        <Text style={styles.liveLabel}>Live status</Text>
        <Text style={styles.liveSubtitle}>Checking your barber schedule…</Text>
      </View>
    );
  }
  let tone: string = colors.primaryDark;
  let title = `You're up next`;
  let subtitle = `Appointment ${live.position} of ${live.total} today`;
  if (live.beingServed) {
    tone = colors.success;
    title = "You're being served now";
    subtitle =
      live.activeRemainingMs >= 0
        ? `Roughly ${formatCountdown(live.activeRemainingMs)} left`
        : "Running over the estimated time";
  } else if (live.delayed) {
    tone = colors.warning;
    title = "Running a bit late";
    subtitle = `Appointment ${live.position} of ${live.total} today`;
  }
  return (
    <View style={styles.liveCard}>
      <View style={styles.liveBadge} />
      <Text style={[styles.liveTitle, { color: tone }]}>{title}</Text>
      <Text style={styles.liveSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 0,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  noticeSpacing: {
    marginBottom: spacing.md,
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
    marginLeft: 0,
    marginRight: -14,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: 4,
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
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: 98,
  },
  empty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  resetButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  listFooter: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  loadMoreButton: {
    backgroundColor: colors.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dragHandleArea: {
    alignSelf: "center",
    marginTop: -spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  modalHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  modalName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  modalUsername: {
    fontSize: 13,
    color: colors.muted,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailLabel: {
    width: 62,
    fontSize: 13,
    color: colors.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  modalActionSpacer: {
    marginBottom: -spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.surface,
  },
  reviewSection: {
    gap: spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reviewEditLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  reviewHint: {
    fontSize: 13,
    color: colors.muted,
  },
  yourReviewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reviewPending: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  reviewComment: {
    fontSize: 13,
    color: colors.text,
  },
  reviewButton: {
    backgroundColor: colors.surface,
  },
  liveCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  liveBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  liveTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  liveLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  liveSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
});
