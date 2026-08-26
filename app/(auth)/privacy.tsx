import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";

import { RTLIcon } from "@/components/ui/RTLIcon";
import { Screen } from "@/components/ui/Screen";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

const SECTIONS: [string, string][] = [
  ["legal.p_collect_title", "legal.p_collect_body"],
  ["legal.p_use_title", "legal.p_use_body"],
  ["legal.p_location_title", "legal.p_location_body"],
  ["legal.p_share_title", "legal.p_share_body"],
  ["legal.p_retention_title", "legal.p_retention_body"],
  ["legal.p_rights_title", "legal.p_rights_body"],
];

export default function PrivacyScreen() {
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
        <AppText style={styles.title}>{t("legal.privacy_title")}</AppText>
      </View>

      <View style={styles.content}>
        <AppText style={styles.updated}>{t("legal.updated")}</AppText>
        <AppText style={styles.intro}>{t("legal.p_intro")}</AppText>

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
