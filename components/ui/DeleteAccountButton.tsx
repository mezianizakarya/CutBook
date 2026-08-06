import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import { colors, spacing } from "@/lib/theme";

export function DeleteAccountButton() {
  const { user } = useUser();
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account. Your bookings, reviews and shop history are kept but can no longer be accessed by you. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    if (deleting || !user) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      await user.delete();
      router.replace("/welcome");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Button
        title="Delete Account"
        onPress={confirmDelete}
        variant="danger"
        loading={deleting}
        disabled={deleting}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
