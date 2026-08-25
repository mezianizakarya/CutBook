import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";

import type { StyleProp, ViewStyle } from "react-native";

import type { Notice } from "@/lib/useNotice";
import { colors, radius, spacing } from "@/lib/theme";

type NoticeBannerProps = {
  notice: Notice | null;
  variant?: "bordered" | "soft";
  style?: StyleProp<ViewStyle>;
};

export function NoticeBanner({
  notice,
  variant = "bordered",
  style,
}: NoticeBannerProps) {
  if (!notice) {
    return null;
  }
  const styles = variant === "soft" ? soft : bordered;
  return (
    <View style={[styles.notice, styles[notice.tone], style]}>
      <AppText style={[styles.noticeText, styles[`${notice.tone}Text`]]}>
        {notice.message}
      </AppText>
    </View>
  );
}

const bordered = StyleSheet.create({
  notice: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  role: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDark,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  successText: {
    color: colors.success,
  },
  dangerText: {
    color: colors.danger,
  },
  roleText: {
    color: colors.primaryDark,
  },
});

const soft = StyleSheet.create({
  notice: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  role: {
    backgroundColor: colors.primarySoft,
  },
  noticeText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "600",
  },
  successText: {
    color: colors.success,
  },
  dangerText: {
    color: colors.danger,
  },
  roleText: {
    color: colors.primaryDark,
  },
});
