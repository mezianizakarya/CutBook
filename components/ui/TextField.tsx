import { StyleSheet, Text, TextInput, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  error?: string | null;
  /** Text rendered inside the left edge of the input, e.g. "@" for a username. */
  prefix?: string;
  /** Renders a taller, top-aligned multi-line input instead of a 50px pill. */
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "go" | "next" | "search" | "send" | "default";
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType = "default",
  error,
  prefix,
  multiline = false,
  style,
}: TextFieldProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          !!error && styles.inputRowError,
        ]}
      >
        {!!prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
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
  inputRow: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    height: "auto",
    minHeight: 50,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.md,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  inputRowMultiline: {
    height: "auto",
    minHeight: 50,
    alignItems: "flex-start",
    borderRadius: radius.md,
    overflow: "hidden",
  },
  prefix: {
    fontSize: 16,
    color: colors.muted,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: colors.text,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
});
