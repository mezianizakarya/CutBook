import { RTLIcon } from "@/components/ui/RTLIcon";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { adminSetReviewStatus } from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";
import {
  loadPendingReviews,
  type PendingAdminReview,
} from "@/lib/reviews";

export default function PendingReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<PendingAdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: number; action: "publish" | "remove" } | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    const rows = await loadPendingReviews();
    setReviews(rows);
  }, []);

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

  async function act(
    review: PendingAdminReview,
    action: "publish" | "remove"
  ) {
    setBusy({ id: review.id, action });
    try {
      await adminSetReviewStatus(
        review.id,
        action === "publish" ? "published" : "removed"
      );
      setReviews((previous) => previous.filter((row) => row.id !== review.id));
      showNotice(
        t(action === "publish" ? "admin.review_published" : "admin.review_removed"),
        "success"
      );
    } catch (e) {
      showNotice(errorMessageFromUnknown(e), "danger");
    } finally {
      setBusy(null);
    }
  }

  if (loading && reviews.length === 0) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen paddingHorizontal={14}>
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
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
          >
            <RTLIcon name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <AppText style={styles.title}>{t("admin.pending_reviews_title")}</AppText>
        </View>
        <AppText style={styles.subtitle}>
          {t("admin.reviews_waiting_approval")}
        </AppText>

        {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
        {!!error && <AppText style={styles.error}>{error}</AppText>}

        <SectionHeader
          title={t("admin.reviews")}
          actionLabel={reviews.length > 0 ? t("admin.waiting_count", { count: reviews.length }) : undefined}
        />
        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyTitle}>{t("admin.nothing_to_review")}</AppText>
            <AppText style={styles.emptySubtitle}>
              {t("admin.no_pending_reviews")}
            </AppText>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.row}>
              <Avatar
                fullName={customerName(review)}
                imageUrl={review.profiles?.avatar_url ?? null}
                size={44}
              />
              <View style={styles.rowInfo}>
                <AppText style={styles.rowName} numberOfLines={1}>
                  {customerName(review)}
                </AppText>
                <AppText style={styles.rowSubtitle} numberOfLines={1}>
                  {review.shops?.name ?? "—"} · {formatDate(review.created_at)}
                </AppText>
                <AppText style={styles.rating} numberOfLines={1}>
                  {"★".repeat(review.rating)}
                </AppText>
                {!!review.comment && (
                  <AppText style={styles.comment} numberOfLines={3}>
                    {review.comment}
                  </AppText>
                )}
                <View style={styles.actions}>
                  <Button
                    title={t("admin.publish")}
                    variant="successOutline"
                    loading={busy?.id === review.id && busy.action === "publish"}
                    disabled={busy !== null}
                    onPress={() => void act(review, "publish")}
                    style={styles.actionButton}
                  />
                  <Button
                    title={t("admin.remove_review")}
                    variant="dangerOutline"
                    loading={busy?.id === review.id && busy.action === "remove"}
                    disabled={busy !== null}
                    onPress={() => void act(review, "remove")}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function customerName(review: PendingAdminReview): string {
  const name = [review.profiles?.first_name ?? "", review.profiles?.last_name ?? ""]
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();
  return name || "—";
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: 32,
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
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  notice: {
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
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
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  rating: {
    fontSize: 13,
    color: colors.warning,
  },
  comment: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
});
