import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { COUNTRIES } from "@/lib/countries";
import { getCurrencyForCountry } from "@/lib/currency";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

export function useRegionSheet(countryCode: string) {
  const [visible, setVisible] = useState(false);

  const countryInfo = COUNTRIES.find((c) => c.code === countryCode);
  const currency = getCurrencyForCountry(countryCode);

  function openSheet() {
    setVisible(true);
  }

  const sheetContent = (
    <BottomSheet visible={visible} onClose={() => setVisible(false)}>
      <AppText style={styles.title}>{t("settings.account_region")}</AppText>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <View style={styles.infoTextGroup}>
            <AppText style={styles.infoLabel}>{t("settings.country")}</AppText>
            <AppText style={styles.infoValue}>
              {countryInfo?.flag} {countryInfo?.name ?? "Unknown"}
            </AppText>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Ionicons name="cash" size={20} color={colors.primary} />
          <View style={styles.infoTextGroup}>
            <AppText style={styles.infoLabel}>{t("settings.currency")}</AppText>
            <AppText style={styles.infoValue}>
              {currency.symbol} ({currency.code})
            </AppText>
          </View>
        </View>
      </View>

      <AppText style={styles.note}>
        {t("settings.region_note")}
      </AppText>

      <Pressable
        onPress={() => setVisible(false)}
        style={({ pressed }) => [styles.doneButton, pressed && styles.donePressed]}
      >
        <AppText style={styles.doneText}>{t("common.done")}</AppText>
      </Pressable>
    </BottomSheet>
  );

  return { sheetVisible: visible, openSheet, sheetContent };
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  note: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  donePressed: {
    opacity: 0.6,
  },
  doneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
