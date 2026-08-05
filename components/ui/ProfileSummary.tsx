import { useUser } from "@clerk/expo";
import { StyleSheet, Text, View } from "react-native";

import type { Role } from "@/lib/roles";
import { ACCOUNT_TYPE_LABELS } from "@/lib/roles";
import { colors, spacing } from "@/lib/theme";

type ProfileSummaryProps = {
  role: Role;
};

export function ProfileSummary({ role }: ProfileSummaryProps) {
  const { user } = useUser();
  const name = user?.fullName ?? "Your name";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.role}>{ACCOUNT_TYPE_LABELS[role]}</Text>
      {!!email && <Text style={styles.email}>{email}</Text>}
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
  role: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
  email: {
    fontSize: 13,
    color: colors.muted,
  },
});
