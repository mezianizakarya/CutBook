import { useUser } from "@clerk/expo";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { ReputationBadge } from "@/components/ui/ReputationBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { t } from "@/lib/i18n";
import type { Role } from "@/lib/roles";
import { getAccountTypeLabel } from "@/lib/roles";
import { colors, spacing } from "@/lib/theme";
import { formatUsername } from "@/lib/username";

type ProfileSummaryProps = {
  role: Role;
  username?: string | null;
  verified?: boolean;
};

export function ProfileSummary({
  role,
  username,
  verified = false,
}: ProfileSummaryProps) {
  const { user } = useUser();
  const name = user?.fullName ?? t("profile.your_name");
  const isCustomer = role === "customer";

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <AppText style={styles.name} numberOfLines={1}>
          {name}
        </AppText>
        {verified && <VerifiedIcon size={17} />}
        <View style={styles.badgeRow}>
          <StatusBadge label={getAccountTypeLabel(role)} tone="warning" />
          {isCustomer ? <ReputationBadge /> : null}
        </View>
      </View>
      {!!username && (
        <View style={styles.usernameRow}>
          <AppText style={styles.username}>{formatUsername(username)}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "flex-start",
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  name: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  usernameRow: {
    marginTop: 2,
  },
  username: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
    marginStart: "auto",
  },
});
