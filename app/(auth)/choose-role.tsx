import { useUser } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { FullScreenLoader } from "@/lib/auth";
import { SELF_SELECTABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/roles";
import { colors, radius, spacing } from "@/lib/theme";

export default function ChooseRoleScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [submitting, setSubmitting] = useState<Role | null>(null);

  if (!isLoaded) {
    return <FullScreenLoader />;
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/welcome" />;
  }

  if (user.unsafeMetadata?.role) {
    return <Redirect href="/loading" />;
  }

  const currentUser = user;

  async function handleSelect(role: Role) {
    setSubmitting(role);
    try {
      await currentUser.updateMetadata({
        unsafeMetadata: { role, roleUpdatedAt: Date.now() },
      });
      router.replace("/complete-profile");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Screen scroll centered>
      <View style={styles.header}>
        <Text style={styles.title}>How will you use Kutz?</Text>
        <Text style={styles.subtitle}>
          Pick the role that best fits you. You can only choose one.
        </Text>
      </View>

      <View style={styles.list}>
        {SELF_SELECTABLE_ROLES.map((role) => {
          const isSelected = submitting === role;
          return (
            <Pressable
              key={role}
              onPress={() => handleSelect(role)}
              disabled={submitting !== null}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
                isSelected && styles.cardSelected,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{ROLE_LABELS[role]}</Text>
                {isSelected && <Text style={styles.savingText}>Saving…</Text>}
              </View>
              <Text style={styles.cardDescription}>{ROLE_DESCRIPTIONS[role]}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#fff7ed",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  savingText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 14,
    color: colors.muted,
  },
});
