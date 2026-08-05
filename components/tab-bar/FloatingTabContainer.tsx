import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/lib/theme";

type FloatingTabContainerProps = {
  children: ReactNode;
};

/**
 * The floating capsule behind every tab bar. Solid primary surface,
 * subtle border and soft shadow so all role navigators share the
 * exact same look.
 */
export function FloatingTabContainer({ children }: FloatingTabContainerProps) {
  return (
    <View style={styles.shadow}>
      <View style={styles.surface}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: colors.black,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  surface: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.25)",
    overflow: "hidden",
  },
});
