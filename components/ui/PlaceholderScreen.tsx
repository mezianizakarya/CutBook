import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/lib/theme";

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
};

export function PlaceholderScreen({ title, subtitle, footer }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.hint}>This screen is ready for you to build.</Text>
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
