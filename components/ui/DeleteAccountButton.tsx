import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import { colors, spacing } from "@/lib/theme";

export function DeleteAccountButton() {
  const { user } = useUser();
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(5);
  const [confirmCount, setConfirmCount] = useState(5);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  function cancelCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  function startCountdown() {
    countRef.current = 5;
    setConfirmCount(5);
    cancelCountdown();
    countdownRef.current = setInterval(() => {
      countRef.current -= 1;
      setConfirmCount(countRef.current);
      if (countRef.current <= 0) {
        cancelCountdown();
        setConfirming(false);
      }
    }, 1000);
  }

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
