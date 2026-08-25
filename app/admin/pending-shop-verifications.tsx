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
import { adminReviewShopVerificationRequest } from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  loadPendingShopVerificationRequests,
  type PendingShopVerificationRequest,
} from "@/lib/shop-verification";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

export default function PendingShopVerificationsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingShopVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    const rows = await loadPendingShopVerificationRequests();
    setRequests(rows);
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

  async function quickVerify(req: PendingShopVerificationRequest) {
    setVerifyingId(req.id);
    try {
      await adminReviewShopVerificationRequest(req.id, true);
      setRequests((previous) => previous.filter((row) => row.id !== req.id));
      showNotice(t("admin.shop_verified_named", { name: req.shops?.name ?? t("shop.barber") }), "success");
    } catch (e) {
      showNotice(errorMessageFromUnknown(e), "danger");
    } finally {
      setVerifyingId(null);
    }
  }

  if (loading && requests.length === 0) {
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
          <AppText style={styles.title}>{t("admin.shop_verification_title")}</AppText>
        </View>
        <AppText style={styles.subtitle}>
          {t("admin.shops_waiting_verified")}
        </AppText>

        {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
        {!!error && <AppText style={styles.error}>{error}</AppText>}

        <SectionHeader
          title={t("admin.requests")}
          actionLabel={requests.length > 0 ? t("admin.waiting_count", { count: requests.length }) : undefined}
        />
        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyTitle}>{t("admin.nothing_to_review")}</AppText>
            <AppText style={styles.emptySubtitle}>
              {t("admin.no_shop_verification_requests")}
            </AppText>
          </View>
        ) : (
          requests.map((req) => {
            const owner = ownerName(req);
            return (
              <View key={req.id} style={styles.row}>
                <Avatar
                  fullName={req.shops?.name ?? t("shop.page_title")}
                  imageUrl={req.shops?.logo_url ?? null}
                  size={44}
                />
                <View style={styles.rowInfo}>
                  <AppText style={styles.rowName} numberOfLines={1}>
                    {req.shops?.name ?? t("shop.page_title")}
                  </AppText>
                  <AppText style={styles.rowSubtitle} numberOfLines={1}>
                    {[req.shops?.city, formatDate(req.created_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </AppText>
                  {!!owner && (
                    <AppText style={styles.rowOwner} numberOfLines={1}>
                      {t("admin.requested_by")} {owner}
                    </AppText>
                  )}
                  {!!req.note && (
                    <AppText style={styles.requestNote} numberOfLines={2}>
                      {req.note}
                    </AppText>
                  )}
                </View>
                <Button
                  title={t("admin.approve")}
                  variant="successOutline"
                  loading={verifyingId === req.id}
                  disabled={verifyingId !== null}
                  onPress={() => void quickVerify(req)}
                  style={styles.approveButton}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function ownerName(req: PendingShopVerificationRequest): string {
  const name = [
    req.shops?.profiles?.first_name ?? "",
    req.shops?.profiles?.last_name ?? "",
  ]
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();
  return name;
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
    alignItems: "center",
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
  rowOwner: {
    fontSize: 12,
    color: colors.muted,
  },
  requestNote: {
    fontSize: 13,
    color: colors.muted,
  },
  approveButton: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
});
