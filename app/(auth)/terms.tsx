import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";

import { RTLIcon } from "@/components/ui/RTLIcon";
import { Screen } from "@/components/ui/Screen";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

const SECTIONS: [string, string][] = [
  ["legal.t_accounts_title", "legal.t_accounts_body"],
  ["legal.t_bookings_title", "legal.t_bookings_body"],
  ["legal.t_loyalty_title", "legal.t_loyalty_body"],
  ["legal.t_shops_title", "legal.t_shops_body"],
  ["legal.t_region_title", "legal.t_region_body"],
  ["legal.t_conduct_title", "legal.t_conduct_body"],
  ["legal.t_changes_title", "legal.t_changes_body"],
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <RTLIcon name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <AppText style={styles.title}>{t("legal.terms_title")}</AppText>
      </View>

      <View style={styles.content}>
        <AppText style={styles.updated}>{t("legal.updated")}</AppText>
        <AppText style={styles.intro}>{t("legal.t_intro")}</AppText>

        {SECTIONS.map(([titleKey, bodyKey]) => (
          <View key={titleKey} style={styles.section}>
            <AppText style={styles.sectionTitle}>{t(titleKey)}</AppText>
            <AppText style={styles.sectionBody}>{t(bodyKey)}</AppText>
          </View>
        ))}
      </View>
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
    fontWeight: "800",
    color: colors.text,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  updated: {
    fontSize: 12,
    color: colors.muted,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
});
