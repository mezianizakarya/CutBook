import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";

import { SafeAreaView } from "react-native-safe-area-context";

import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
};

export function PlaceholderScreen({ title, subtitle, footer }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, { paddingBottom: spacing.lg }]}>
        <View style={styles.body}>
          <AppText style={styles.title}>{title}</AppText>
          {!!subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
          <AppText style={styles.hint}>{t("placeholder.ready_to_build")}</AppText>
        </View>
        {!!footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.md,
  },
});
