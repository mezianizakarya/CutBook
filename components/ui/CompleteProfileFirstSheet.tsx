import { StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";

type CompleteProfileFirstSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Navigates to the barber complete-profile page. */
  onCompleteProfile: () => void;
};

/**
 * Shown when a barber whose required profile fields are incomplete tries to
 * join a shop. Points them at the complete-profile page before the code entry
 * is ever offered.
 */
export function CompleteProfileFirstSheet({
  visible,
  onClose,
  onCompleteProfile,
}: CompleteProfileFirstSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("onboarding.complete_profile_first")}</Text>
        <Text style={styles.subtitle}>
          {t("onboarding.need_specialty")}
        </Text>
        <Button title={t("onboarding.complete_profile_button")} onPress={onCompleteProfile} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
});
