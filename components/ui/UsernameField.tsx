import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { TextField } from "@/components/ui/TextField";
import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";
import {
  isUsernameTaken,
  sanitizeUsernameInput,
  USERNAME_MIN_LENGTH,
  validateUsername,
} from "@/lib/username";

export type UsernameAvailability = "checking" | "available" | "taken";

type UsernameFieldProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Server/submit-level error shown alongside the field, e.g. a duplicate clash. */
  error?: string | null;
  /** Reports the live availability so the parent can gate the save button. */
  onAvailabilityChange?: (availability: UsernameAvailability | null) => void;
};

/**
 * A username input that sanitizes as you type, validates against the shared
 * rules in lib/username.ts and checks availability (debounced, via the
 * is_username_taken RPC) once the value is syntactically valid.
 */
export function UsernameField({
  label = "Username",
  value,
  onChangeText,
  placeholder,
  error,
  onAvailabilityChange,
}: UsernameFieldProps) {
  const validationErrors = useMemo(() => validateUsername(value), [value]);
  const [availability, setAvailability] = useState<UsernameAvailability | null>(
    null
  );

  useEffect(() => {
    if (validationErrors.length > 0 || value.length < USERNAME_MIN_LENGTH) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setAvailability("checking");
    const timeout = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(value);
        if (!cancelled) {
          setAvailability(taken ? "taken" : "available");
        }
      } catch {
        if (!cancelled) {
          setAvailability(null);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [value, validationErrors]);

  useEffect(() => {
    onAvailabilityChange?.(availability);
  }, [availability, onAvailabilityChange]);

  const fieldError = validationErrors[0] ?? error ?? null;
  const extraErrors = validationErrors.slice(1);
  const showAvailability =
    validationErrors.length === 0 && !error && availability !== null;

  return (
    <View style={styles.container}>
      <TextField
        label={label}
        value={value}
        onChangeText={(text) => onChangeText(sanitizeUsernameInput(text))}
        placeholder={placeholder}
        autoCapitalize="none"
        prefix="@"
        error={fieldError}
      />
      {extraErrors.map((message) => (
        <AppText key={message} style={styles.error}>
          {message}
        </AppText>
      ))}
      {showAvailability && (
        <AppText
          style={
            availability === "available"
              ? styles.available
              : availability === "taken"
                ? styles.error
                : styles.checking
          }
        >
          {availability === "available"
            ? t("username.available")
            : availability === "taken"
              ? t("username.already_taken")
              : t("username.checking")}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  available: {
    fontSize: 13,
    color: colors.success,
    fontWeight: "500",
  },
  checking: {
    fontSize: 13,
    color: colors.muted,
  },
});
