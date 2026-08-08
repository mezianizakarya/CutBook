import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { radius } from "@/lib/theme";

type FloatingTabContainerProps = {
  children: ReactNode;
};

/**
 * The floating capsule behind every tab bar. Translucent dark surface with a
 * frosted-glass blur, subtle border and soft shadow. The area around the
 * capsule stays transparent so screen content remains visible underneath it.
 */
export function FloatingTabContainer({ children }: FloatingTabContainerProps) {
  return (
    <View style={styles.shadow}>
      <View style={styles.surface}>
        <BlurView intensity={80} tint="dark" style={styles.blur}>
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
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
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
  blur: {
    flex: 1,
    // Android blur is experimental and disabled by default, so the bar keeps
    // a nearly opaque dark surface there for the same frosted-glass result.
    backgroundColor: Platform.OS === "android" ? "rgba(0, 0, 0, 0.55)" : "rgba(0, 0, 0, 0.25)",
  },
});
