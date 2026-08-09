import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import { colors, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";

export function DeleteAccountButton() {
  const { user } = useUser();
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    count: confirmCount,
    start: startCountdown,
    cancel: cancelCountdown,
  } = useConfirmCountdown({
    onExpire: () => setConfirming(false),
  });

  async function handleDelete() {
    setConfirming(false);
    cancelCountdown();
    setError(null);
    setDeleting(true);
    try {
      await user?.delete();
      router.replace("/welcome");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
      setDeleting(false);
    }
  }

  function handlePress() {
    if (confirming) {
      void handleDelete();
    } else {
      setConfirming(true);
      startCountdown();
    }
  }

  return (
    <View style={styles.container}>
      <Button
        title={
          confirming ? `Confirm delete (${confirmCount})` : "Delete Account"
        }
        onPress={handlePress}
        variant={confirming ? "danger" : "dangerOutline"}
        loading={deleting}
        disabled={deleting}
        style={!confirming ? styles.button : undefined}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
