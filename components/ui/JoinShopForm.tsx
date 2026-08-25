import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { redeemShopInvitation } from "@/lib/invitations";
import { t } from "@/lib/i18n";
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
      setError(t("shop.enter_code_from_owner"));
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
          <AppText style={styles.successTitle}>{t("shop.youre_in")}</AppText>
          <AppText style={styles.successText}>
            {t("shop.welcome_to_shop", { shopName: joined })}
          </AppText>
          <Button title={t("common.done")} onPress={handleClose} style={styles.doneButton} />
        </View>
      ) : (
        <>
          <AppText style={styles.title}>{t("shop.join_shop")}</AppText>
          <AppText style={styles.subtitle}>
            {t("shop.enter_invitation")}
          </AppText>
          <TextField
            label={t("shop.invitation_code")}
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError(null);
            }}
            placeholder={t("shop.cut_xxxx")}
            autoCapitalize="characters"
            error={error}
          />
          <Button
            title={busy ? t("shop.joining") : t("shop.join_shop_button")}
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
