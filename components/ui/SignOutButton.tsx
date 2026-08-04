import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import { colors, spacing } from "@/lib/theme";

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (signingOut) {
      return;
    }
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/welcome");
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.container}>
      <Button
        title="Sign Out"
        onPress={handleSignOut}
        variant="danger"
        loading={signingOut}
        disabled={signingOut}
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
