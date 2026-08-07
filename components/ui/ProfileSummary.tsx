import { useUser } from "@clerk/expo";
import { StyleSheet, Text, View } from "react-native";

import type { Role } from "@/lib/roles";
import { ACCOUNT_TYPE_LABELS } from "@/lib/roles";
import { colors, spacing } from "@/lib/theme";
import { formatUsername } from "@/lib/username";

type ProfileSummaryProps = {
  role: Role;
  username?: string | null;
  phone?: string | null;
  city?: string | null;
};

export function ProfileSummary({
  role,
  username,
  phone,
  city,
}: ProfileSummaryProps) {
  const { user } = useUser();
  const name = user?.fullName ?? "Your name";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      {!!username && <Text style={styles.username}>{formatUsername(username)}</Text>}
      <Text style={styles.role}>{ACCOUNT_TYPE_LABELS[role]}</Text>
      {!!email && <Text style={styles.meta}>{email}</Text>}
      {!!phone && <Text style={styles.meta}>{phone}</Text>}
      {!!city && <Text style={styles.meta}>{city}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  username: {
    fontSize: 15,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  role: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
  },
});
