import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/lib/theme";

type EmptyStateProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.subtitle}>{subtitle}</AppText>
      {!!actionLabel && (
        <Button
          title={actionLabel}
          variant="outline"
          onPress={() => onAction?.()}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
});
