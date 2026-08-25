import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { ReviewRow } from "@/lib/reviews";
import { colors, radius, spacing } from "@/lib/theme";

type ReviewCardProps = {
  review: ReviewRow;
};

/** A single published review: author, stars, comment and any owner response. */
export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar fullName={review.author_name} size={36} />
        <View style={styles.headerInfo}>
          <AppText style={styles.author} numberOfLines={1}>
            {review.author_name || t("review.customer")}
          </AppText>
          <AppText style={styles.date}>{formatDate(review.created_at)}</AppText>
        </View>
        <StarRating value={review.rating} />
      </View>

      {!!review.comment && <AppText style={styles.comment}>{review.comment}</AppText>}

      {!!review.owner_response && (
        <View style={styles.response}>
          <AppText style={styles.responseLabel}>
            {review.responded_at
              ? t("review.shop_response_date", { date: formatDate(review.responded_at) })
              : t("review.shop_response")}
          </AppText>
          <AppText style={styles.responseText}>{review.owner_response}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    gap: 1,
  },
  author: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.muted,
  },
  comment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  response: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 2,
  },
  responseLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  responseText: {
    fontSize: 13,
    color: colors.text,
  },
});
