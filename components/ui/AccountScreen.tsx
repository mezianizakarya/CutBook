import { StyleSheet, View } from "react-native";

import { ProfilePicture } from "@/components/ui/ProfilePicture";
import { ProfileSummary } from "@/components/ui/ProfileSummary";
import { Screen } from "@/components/ui/Screen";
import { SignOutButton } from "@/components/ui/SignOutButton";
import type { Role } from "@/lib/roles";
import { spacing } from "@/lib/theme";

type AccountScreenProps = {
  role: Role;
};

export function AccountScreen({ role }: AccountScreenProps) {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <ProfilePicture />
        <ProfileSummary role={role} />
      </View>
      <View style={styles.footer}>
        <SignOutButton />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: spacing.xl,
  },
});
