import { useUser } from "@clerk/expo";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import {
  UsernameField,
  type UsernameAvailability,
} from "@/components/ui/UsernameField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { useKeyboardHeight } from "@/lib/useKeyboardHeight";
import {
  formatUsername,
  isUsernameTaken,
  validateUsername,
} from "@/lib/username";

type UsernameEditModalProps = {
  visible: boolean;
  currentUsername: string | null;
  onClose: () => void;
  onSaved: (username: string) => void;
};

export function UsernameEditModal({
  visible,
  currentUsername,
  onClose,
  onSaved,
}: UsernameEditModalProps) {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [username, setUsername] = useState(currentUsername ?? "");
  const [availability, setAvailability] = useState<UsernameAvailability | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setUsername(currentUsername ?? "");
      setAvailability(null);
      setServerError(null);
      setSaving(false);
    }
  }, [visible, currentUsername]);

  const validationErrors = validateUsername(username);
  const unchanged = username === currentUsername;
  const canSave =
    !unchanged &&
    validationErrors.length === 0 &&
    availability === "available" &&
    !saving;

  const previewUsername = username.trim()
    ? username.trim().toLowerCase()
    : currentUsername ?? "yourusername";

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }
    setServerError(null);
    const chosen = username.trim().toLowerCase();
    const errors = validateUsername(chosen);
    if (errors.length > 0) {
      setServerError(errors[0]);
      return;
    }
    setSaving(true);
    try {
      const taken = await isUsernameTaken(chosen);
      if (taken) {
        setServerError("This username is already taken.");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ username: chosen })
        .eq("id", user.id);
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("duplicate") || message.includes("unique")) {
          setServerError("This username is already taken.");
          return;
        }
        throw error;
      }
      Keyboard.dismiss();
      onSaved(chosen);
    } catch (e) {
      setServerError(errorMessageFromUnknown(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.card}>
          <View style={styles.dragHandle} />
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={[
              styles.cardContent,
              {
                paddingBottom:
                  spacing.xl +
                  insets.bottom +
                  (Platform.OS === "android" ? keyboardHeight : 0),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Edit username</Text>
            <Text style={styles.subtitle}>
              Choose a unique username others can use to find you.
            </Text>
            <UsernameField
              value={username}
              onChangeText={setUsername}
              error={serverError}
              onAvailabilityChange={setAvailability}
            />
            <Text style={styles.urlHint}>
              Your profile URL: cutbook.app/{formatUsername(previewUsername)}
            </Text>
            <Button
              title="Save username"
              onPress={handleSave}
              loading={saving}
              disabled={!canSave}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleClose}
              style={styles.cancelButton}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    maxHeight: "92%",
    overflow: "hidden",
  },
  cardScroll: {
    flexShrink: 1,
  },
  cardContent: {
    gap: spacing.md,
  },
  dragHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: -spacing.sm,
  },
  urlHint: {
    fontSize: 13,
    color: colors.muted,
  },
  cancelButton: {
    backgroundColor: colors.surface,
  },
});
