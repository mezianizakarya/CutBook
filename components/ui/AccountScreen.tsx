import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DeleteAccountButton } from "@/components/ui/DeleteAccountButton";
import { ProfilePicture } from "@/components/ui/ProfilePicture";
import { ProfileSummary } from "@/components/ui/ProfileSummary";
import { Screen } from "@/components/ui/Screen";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { UsernameEditModal } from "@/components/ui/UsernameEditModal";
import type { Role } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/lib/theme";

type AccountScreenProps = {
  role: Role;
};

type ProfileData = {
  username: string | null;
  phone: string | null;
  city: string | null;
};

export function AccountScreen({ role }: AccountScreenProps) {
  const { user } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (!user?.id) {
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("username, phone, city")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled && !error && data) {
          setProfile(data as ProfileData);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ProfilePicture />
        <ProfileSummary
          role={role}
          username={profile?.username}
          phone={profile?.phone}
          city={profile?.city}
        />
        <Button
          title="Edit username"
          variant="outline"
          onPress={() => setShowUsernameEdit(true)}
          style={styles.editButton}
        />
      </View>
      <View style={styles.footer}>
        <SignOutButton />
        <DeleteAccountButton />
      </View>
      <UsernameEditModal
        visible={showUsernameEdit}
        currentUsername={profile?.username ?? null}
        onClose={() => setShowUsernameEdit(false)}
        onSaved={(username) => {
          setProfile((previous) =>
            previous ? { ...previous, username } : previous
          );
          setShowUsernameEdit(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  editButton: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
