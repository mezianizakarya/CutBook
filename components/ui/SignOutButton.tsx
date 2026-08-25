import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    count: confirmCount,
    start: startCountdown,
    cancel: cancelCountdown,
  } = useConfirmCountdown({
    onExpire: () => setConfirming(false),
  });

  async function handleSignOut() {
    setConfirming(false);
    cancelCountdown();
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/welcome");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
      setSigningOut(false);
    }
  }

  function handlePress() {
    if (confirming) {
      void handleSignOut();
    } else {
      setConfirming(true);
      startCountdown();
    }
  }

  return (
    <View style={styles.container}>
      <Button
        title={confirming ? t("account.confirm_sign_out", { count: confirmCount }) : t("account.sign_out")}
        onPress={handlePress}
        variant={confirming ? "danger" : "dangerOutline"}
        loading={signingOut}
        disabled={signingOut}
        style={!confirming ? styles.button : undefined}
      />
      {error && <AppText style={styles.errorText}>{error}</AppText>}
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
