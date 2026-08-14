import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { adminReviewVerificationRequest } from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";
import {
  loadPendingVerificationRequests,
  type PendingVerificationRequest,
} from "@/lib/verification";

export default function PendingVerificationsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    const rows = await loadPendingVerificationRequests();
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

  async function quickVerify(req: PendingVerificationRequest) {
    setVerifyingId(req.id);
    try {
      await adminReviewVerificationRequest(req.id, true);
      setRequests((previous) => previous.filter((row) => row.id !== req.id));
      showNotice(`${applicantName(req)} verified`, "success");
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
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Verification requests</Text>
          <Text style={styles.subtitle}>
            Barbers and shop owners who asked to be verified.
          </Text>
        </View>

        {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
        {!!error && <Text style={styles.error}>{error}</Text>}

        <SectionHeader
          title="Requests"
          actionLabel={requests.length > 0 ? `${requests.length} waiting` : undefined}
        />
        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing to review</Text>
            <Text style={styles.emptySubtitle}>
              No verification requests are waiting right now.
            </Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.row}>
              <Avatar
                fullName={applicantName(req)}
                imageUrl={req.profiles?.avatar_url ?? null}
                size={44}
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {applicantName(req)}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {req.profiles?.role ? ROLE_LABELS[req.profiles.role] : "—"} ·{" "}
                  {formatDate(req.created_at)}
                </Text>
                {!!req.note && (
                  <Text style={styles.requestNote} numberOfLines={2}>
                    {req.note}
                  </Text>
                )}
              </View>
              <Button
                title="Approve"
                variant="successOutline"
                loading={verifyingId === req.id}
                disabled={verifyingId !== null}
                onPress={() => void quickVerify(req)}
                style={styles.approveButton}
              />
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function applicantName(req: PendingVerificationRequest): string {
  const name = [req.profiles?.first_name ?? "", req.profiles?.last_name ?? ""]
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();
  return name || req.profiles?.email || "—";
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: 32,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  requestNote: {
    fontSize: 13,
    color: colors.muted,
  },
  approveButton: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
});
