import { Ionicons } from "@expo/vector-icons";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { Image } from "expo-image";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useSheetDrag } from "@/lib/useSheetDrag";

type LocationSheetProps = {
  visible: boolean;
  currentLabel: string | null;
  currentSelected: boolean;
  onSelectCurrent: () => void;
  onSelectAnother: () => void;
  onClose: () => void;
};

export function LocationSheet({
  visible,
  currentLabel,
  currentSelected,
  onSelectCurrent,
  onSelectAnother,
  onClose,
}: LocationSheetProps) {
  const insets = useSafeAreaInsets();
  const { translateY, panResponder } = useSheetDrag(onClose);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close location sheet"
        />
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY }],
              paddingBottom: spacing.xl + insets.bottom,
            },
          ]}
        >
          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>
          <AppText style={styles.title}>{t("location.your_location")}</AppText>
          <Pressable
            onPress={onSelectCurrent}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.rowIcon,
                currentSelected ? styles.rowIconActive : styles.rowIconInactive,
              ]}
            >
              <Image
                source={require("@/assets/images/location.png")}
                style={styles.rowIconImage}
                contentFit="contain"
                tintColor={currentSelected ? colors.primaryDark : colors.muted}
              />
            </View>
            <View style={styles.rowInfo}>
              <AppText style={styles.rowTitle}>{t("location.current_location")}</AppText>
              {!!currentLabel && (
                <AppText style={styles.rowSubtitle} numberOfLines={1}>
                  {currentLabel}
                </AppText>
              )}
            </View>
            {currentSelected && (
              <Ionicons name="checkmark" size={20} color={colors.primaryDark} />
            )}
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={onSelectAnother}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.rowIcon, styles.rowIconInactive]}>
              <Ionicons name="map-outline" size={20} color={colors.muted} />
            </View>
            <View style={styles.rowInfo}>
              <AppText style={styles.rowTitle}>{t("location.select_another")}</AppText>
              <AppText style={styles.rowSubtitle}>
                {t("location.search_description")}
              </AppText>
            </View>
            <RTLIcon name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.background,
    borderTopStartRadius: 28,
    borderTopEndRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  dragHandleArea: {
    alignSelf: "center",
    marginTop: -spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconActive: {
    backgroundColor: colors.primarySoft,
  },
  rowIconImage: {
    width: 20,
    height: 20,
  },
  rowIconInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
