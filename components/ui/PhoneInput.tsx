import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  findCountryByDialCode,
  type Country,
} from "@/lib/countries";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useKeyboardHeight } from "@/lib/useKeyboardHeight";

type PhoneInputProps = {
  label?: string;
  /** The full number including the dialing code, e.g. "+2135550001234". */
  value: string;
  onChangeValue: (value: string) => void;
  error?: string | null;
};

export function PhoneInput({
  label = t("phone.phone"),
  value,
  onChangeValue,
  error,
}: PhoneInputProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [country, setCountry] = useState<Country>(() => {
    const parsed = findCountryByDialCode(value);
    return parsed.country ?? DEFAULT_COUNTRY;
  });
  const [localNumber, setLocalNumber] = useState(() => {
    const parsed = findCountryByDialCode(value);
    return parsed.local;
  });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [query, setQuery] = useState("");

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return COUNTRIES;
    }
    return COUNTRIES.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.dialCode.includes(q) ||
        entry.code.toLowerCase().includes(q)
    );
  }, [query]);

  function handleChangeText(text: string) {
    const digits = text.replace(/\D/g, "");
    setLocalNumber(digits);
    onChangeValue(`${country.dialCode}${digits}`);
  }

  function handleSelectCountry(next: Country) {
    setCountry(next);
    onChangeValue(`${next.dialCode}${localNumber}`);
    closePicker();
  }

  function closePicker() {
    Keyboard.dismiss();
    setPickerVisible(false);
    setQuery("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, !!error && styles.rowError]}>
        <Pressable
          onPress={() => setPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t("phone.country_code")}
          style={({ pressed }) => [
            styles.codeButton,
            pressed && styles.codeButtonPressed,
          ]}
        >
          <Text style={styles.codeText}>
            {country.flag} {country.dialCode}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={localNumber}
          onChangeText={handleChangeText}
          placeholder="5 55 00 12 34"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          autoCorrect={false}
          textContentType="telephoneNumber"
          maxLength={country.maxDigits}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closePicker}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closePicker}
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: spacing.xl + insets.bottom },
            ]}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>{t("phone.select_country")}</Text>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={t("phone.search_country")}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <FlatList
              style={styles.list}
              contentContainerStyle={{
                paddingBottom: Platform.OS === "android" ? keyboardHeight : 0,
              }}
              data={filteredCountries}
              keyExtractor={(entry) => entry.code}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.empty}>{t("phone.no_countries")}</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectCountry(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.countryRow,
                    pressed && styles.countryRowPressed,
                    item.code === country.code && styles.countryRowActive,
                  ]}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryDial}>{item.dialCode}</Text>
                </Pressable>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  row: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    paddingEnd: spacing.md,
  overflow: "hidden",
  },
  rowError: {
    borderColor: colors.danger,
  },
  codeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: "100%",
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    borderEndWidth: 1,
    borderEndColor: colors.border,
  },
  codeButtonPressed: {
    opacity: 0.7,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopStartRadius: 28,
    borderTopEndRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    maxHeight: "85%",
    overflow: "hidden",
  },
  dragHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  search: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 360,
  },
  empty: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  countryRowPressed: {
    opacity: 0.7,
  },
  countryRowActive: {
    backgroundColor: colors.primarySoft,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  countryDial: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: "500",
  },
});
