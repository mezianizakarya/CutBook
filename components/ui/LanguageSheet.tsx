import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useI18n } from "@/lib/I18nProvider";
import type { SupportedLocale } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const LANGUAGES: { value: SupportedLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

export function LanguageSheet({ visible, onClose }: Props) {
  const { locale, setLocale } = useI18n();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Language</Text>
      {LANGUAGES.map((lang) => (
        <Pressable
          key={lang.value}
          style={[
            styles.option,
            locale === lang.value && styles.optionActive,
          ]}
          onPress={async () => {
            await setLocale(lang.value);
            onClose();
          }}
        >
          <Text
            style={[
              styles.label,
              locale === lang.value && styles.labelActive,
            ]}
          >
            {lang.label}
          </Text>
          {locale === lang.value && (
            <Ionicons name="checkmark" size={20} color={colors.primary} />
          )}
        </Pressable>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  labelActive: {
    color: colors.primaryDark,
  },
});
