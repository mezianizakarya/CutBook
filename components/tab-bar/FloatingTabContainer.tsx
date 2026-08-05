import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { colors, radius } from "@/lib/theme";

type FloatingTabContainerProps = {
  children: ReactNode;
};

/**
 * The floating capsule behind every tab bar. Handles the frosted glass
 * background, subtle border and soft shadow so all role navigators share
 * the exact same look.
 */
export function FloatingTabContainer({ children }: FloatingTabContainerProps) {
  return (
    <View style={styles.shadow}>
      <View style={styles.surface}>
        <BlurView intensity={70} tint="systemThinMaterialLight" style={styles.blur}>
          {children}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 16,
  },
  surface: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
  },
  blur: {
    flex: 1,
    // Android blur is experimental and disabled by default, so the bar keeps
    // a nearly opaque white surface there for the same frosted-glass result.
    backgroundColor:
      Platform.OS === "android" ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.6)",
  },
});
