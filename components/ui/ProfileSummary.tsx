import { useUser } from "@clerk/expo";
import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { emailIsVerified } from "@/lib/auth";
import type { Role } from "@/lib/roles";
import { ACCOUNT_TYPE_LABELS } from "@/lib/roles";
import { colors, spacing } from "@/lib/theme";
import { formatUsername } from "@/lib/username";

type ProfileSummaryProps = {
  role: Role;
  username?: string | null;
};

export function ProfileSummary({ role, username }: ProfileSummaryProps) {
  const { user } = useUser();
  const name = user?.fullName ?? "Your name";
  const verified = emailIsVerified(user);

  async function handleCopyUsername() {
    if (!username) {
      return;
    }
    await Clipboard.setStringAsync(formatUsername(username));
  }

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.badgeRow}>
          <StatusBadge label={ACCOUNT_TYPE_LABELS[role]} tone="warning" />
          {verified && <StatusBadge label="Verified" tone="role" />}
        </View>
      </View>
      {!!username && (
        <Pressable
          onPress={handleCopyUsername}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Copy username"
          style={styles.usernameRow}
        >
          <Text style={styles.username}>{formatUsername(username)}</Text>
        </Pressable>
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
    marginLeft: "auto",
  },
});
