import { useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { redeemShopInvitation } from "@/lib/invitations";
import { colors, radius, spacing } from "@/lib/theme";

type JoinShopFormProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the joined shop's name after a successful redemption. */
  onJoined: (shopName: string) => void;
};

/**
 * Lets a barber redeem a single-use invitation code to join a shop. Redemption
 * is atomic and single-use on the database side; this form just surfaces the
 * result.
 */
export function JoinShopForm({ visible, onClose, onJoined }: JoinShopFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);

  function reset() {
    setCode("");
    setError(null);
    setJoined(null);
  }

  async function handleRedeem() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the invitation code from your shop owner.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await redeemShopInvitation(trimmed);
      setJoined(result.shop_name);
      Keyboard.dismiss();
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (joined) {
      onJoined(joined);
    }
    reset();
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      {joined ? (
        <View style={styles.success}>
          <Text style={styles.successTitle}>You&apos;re in!</Text>
          <Text style={styles.successText}>
            Welcome to {joined}. Your schedule and clients will appear on your
            dashboard.
          </Text>
          <Button title="Done" onPress={handleClose} style={styles.doneButton} />
        </View>
      ) : (
        <>
          <Text style={styles.title}>Join a shop</Text>
          <Text style={styles.subtitle}>
            Enter the invitation code your shop owner shared with you. Each code
            can only be used once.
          </Text>
          <TextField
            label="Invitation code"
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError(null);
            }}
            placeholder="CUT-XXXXXX"
            autoCapitalize="characters"
            error={error}
          />
          <Button
            title={busy ? "Joining…" : "Join shop"}
            onPress={() => void handleRedeem()}
            loading={busy}
            disabled={busy}
          />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  success: {
    gap: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  successTitle: {
    backgroundColor: "#dcfce7",
    color: colors.success,
    fontSize: 17,
    fontWeight: "700",
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  successText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  doneButton: {
    alignSelf: "stretch",
  },
});
