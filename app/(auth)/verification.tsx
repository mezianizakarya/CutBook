import { RTLIcon } from "@/components/ui/RTLIcon";
import { useUser } from "@clerk/expo";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { FullScreenLoader } from "@/lib/auth";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";
import { useNotice } from "@/lib/useNotice";
import {
  fetchVerificationState,
  submitVerificationRequest,
  withdrawVerificationRequest,
  type VerificationState,
} from "@/lib/verification";

export default function VerificationScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const { notice, showNotice } = useNotice();

  const [state, setState] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  const { count, start, cancel } = useConfirmCountdown({
    onExpire: () => setConfirmingWithdraw(false),
  });

  const load = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVerificationState(user.id);
      setState(data);
      setShowForm(false);
      setNote("");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSubmit() {
    setError(null);
    if (!note.trim()) {
      setError(t("verification.add_note_error"));
      return;
    }
    setSubmitting(true);
    try {
      const request = await submitVerificationRequest(note);
      setState((previous) => ({
        isVerified: previous?.isVerified ?? false,
        request,
      }));
      setShowForm(false);
      setNote("");
      showNotice(t("verification.request_sent"), "success");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function performWithdraw() {
    const request = state?.request;
    if (!request) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await withdrawVerificationRequest(request.id);
      await load();
      showNotice(t("verification.request_withdrawn"), "success");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleWithdrawPress() {
    if (confirmingWithdraw) {
      setConfirmingWithdraw(false);
      cancel();
      performWithdraw();
    } else {
      setConfirmingWithdraw(true);
      start();
    }
  }

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/welcome" />;
  }

  const isVerified = state?.isVerified ?? false;
  const request = state?.request ?? null;
  const pending = request?.status === "pending";
  const rejected = request?.status === "rejected";

  return (
    <Screen scroll paddingHorizontal={14}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <RTLIcon name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("verification.request_verification")}</Text>
      </View>
      <Text style={styles.subtitle}>
        {t("verification.get_badge_info")}
      </Text>

      {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading && !state ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          {isVerified ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("verification.youre_verified")}</Text>
              <Text style={styles.cardText}>
                {t("verification.badge_shown")}
              </Text>
            </View>
          ) : pending ? (
            <View style={styles.card}>
              <View style={styles.cardBadge}>
                <StatusBadge label={t("verification.pending_review")} tone="warning" />
              </View>
              <Text style={styles.cardTitle}>{t("verification.request_under_review")}</Text>
              <Text style={styles.cardText}>
                {t("verification.requested_on", { date: formatDate(request.created_at) })}
              </Text>
              {!!request.note && (
                <View style={styles.quote}>
                  <Text style={styles.quoteText}>{request.note}</Text>
                </View>
              )}
              <Button
                title={
                  confirmingWithdraw
                    ? t("verification.confirm_withdraw", { count })
                    : t("verification.withdraw_request")
                }
                onPress={handleWithdrawPress}
                variant={confirmingWithdraw ? "danger" : "dangerOutline"}
                loading={submitting}
                disabled={submitting}
              />
            </View>
          ) : showForm || rejected ? (
            rejected && !showForm ? (
              <View style={styles.card}>
                <View style={styles.cardBadge}>
                  <StatusBadge label={t("verification.rejected")} tone="danger" />
                </View>
                <Text style={styles.cardTitle}>{t("verification.request_rejected")}</Text>
                <Text style={styles.cardText}>
                  {t("verification.request_not_approved")}
                </Text>
                {!!request?.review_note && (
                  <View style={styles.quote}>
                    <Text style={styles.quoteText}>{request.review_note}</Text>
                  </View>
                )}
                <Button
                  title={t("verification.request_again")}
                  onPress={() => setShowForm(true)}
                />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("verification.request_verification")}</Text>
                <Text style={styles.cardText}>
                  {t("verification.tell_about_self")}
                </Text>
                <TextField
                  label={t("verification.why_verified")}
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. I'm a licensed barber with 5 years of experience"
                  multiline
                  autoCapitalize="sentences"
                />
                <Button
                  title={t("verification.request_verification_button")}
                  onPress={handleSubmit}
                  loading={submitting}
                />
              </View>
            )
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("verification.get_verified")}</Text>
              <Text style={styles.cardText}>
                {t("verification.verified_badge_info")}
              </Text>
              <Button title={t("verification.request_verification_button")} onPress={() => setShowForm(true)} />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  loading: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardBadge: {
    alignSelf: "flex-start",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  cardText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  quote: {
    backgroundColor: colors.background,
    borderStartWidth: 3,
    borderStartColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  quoteText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
