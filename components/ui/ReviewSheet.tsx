import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { createReview, deleteReview, updateReview, type ReviewRow } from "@/lib/reviews";
import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";

type ReviewSheetProps = {
  visible: boolean;
  onClose: () => void;
  shopId: number;
  shopName: string;
  customerId: string;
  bookingId?: number;
  existing?: ReviewRow | null;
  onSaved?: (review: ReviewRow) => void;
  onDeleted?: () => void;
};

/**
 * Leave / edit / delete a shop review. Creating inserts a `pending` review
 * (visible only to the author until an admin publishes it).
 */
export function ReviewSheet({
  visible,
  onClose,
  shopId,
  shopName,
  customerId,
  bookingId,
  existing,
  onSaved,
  onDeleted,
}: ReviewSheetProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const {
    count: deleteCount,
    start: startDeleteCountdown,
    cancel: cancelDeleteCountdown,
  } = useConfirmCountdown({ onExpire: () => setConfirmingDelete(false) });

  useEffect(() => {
    if (visible) {
      setRating(existing?.rating ?? 0);
      setComment(existing?.comment ?? "");
      setError(null);
      setConfirmingDelete(false);
      cancelDeleteCountdown();
    }
  }, [visible, existing, cancelDeleteCountdown]);

  async function handleSubmit() {
    if (rating < 1) {
      setError(t("review.select_rating_first"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = existing
        ? await updateReview(existing.id, rating, comment)
        : await createReview({
            shopId,
            customerId,
            bookingId,
            rating,
            comment,
          });
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeletePress() {
    if (!existing) {
      return;
    }
    if (confirmingDelete) {
      setConfirmingDelete(false);
      cancelDeleteCountdown();
      setDeleting(true);
      setError(null);
      deleteReview(existing.id)
        .then(() => {
          onDeleted?.();
          onClose();
        })
        .catch((e) => setError(errorMessageFromUnknown(e)))
        .finally(() => setDeleting(false));
    } else {
      setConfirmingDelete(true);
      startDeleteCountdown();
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{existing ? t("review.edit_review") : t("review.leave_review")}</Text>
      <Text style={styles.subtitle}>{shopName}</Text>

      <Text style={styles.step}>{t("review.your_rating")}</Text>
      <StarRating value={rating} onChange={setRating} size={36} />

      <TextField
        label={t("review.your_review")}
        value={comment}
        onChangeText={setComment}
        placeholder={t("review.tell_others")}
        autoCapitalize="sentences"
        multiline
        style={styles.commentField}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={existing ? t("review.save_changes") : t("review.submit_review")}
        onPress={handleSubmit}
        loading={submitting}
        disabled={rating < 1}
      />
      {!!existing && (
        <Button
          title={confirmingDelete ? t("review.confirm_delete", { count: deleteCount }) : t("review.delete_review")}
          variant="dangerOutline"
          onPress={handleDeletePress}
          loading={deleting}
          disabled={deleting}
        />
      )}
      <Button title={t("common.cancel")} variant="outline" onPress={onClose} style={styles.cancel} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: -spacing.sm,
  },
  step: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm,
  },
  commentField: {
    marginTop: spacing.sm,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  cancel: {
    backgroundColor: colors.surface,
  },
});
