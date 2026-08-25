import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { colors } from "@/lib/theme";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.title}>{title}</AppText>
      {!!actionLabel && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText style={styles.action}>{actionLabel}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  action: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
  },
});
