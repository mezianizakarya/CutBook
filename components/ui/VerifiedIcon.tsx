import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { colors } from "@/lib/theme";

type VerifiedIconProps = {
  size?: number;
};

export function VerifiedIcon({ size = 16 }: VerifiedIconProps) {
  return (
    <Image
      source={require("@/assets/images/verified.png")}
      style={[styles.icon, { width: size, height: size }]}
      tintColor={colors.blue}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    backgroundColor: "transparent",
  },
});
