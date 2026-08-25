import type { ComponentProps } from "react";
import { I18nManager, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type RTLIconProps = {
  name: ComponentProps<typeof Ionicons>["name"];
  size: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function RTLIcon({ name, size, color, style }: RTLIconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={[I18nManager.isRTL ? styles.rtlFlip : undefined, style]}
    />
  );
}

const styles = {
  rtlFlip: { transform: [{ scaleX: -1 }] },
};
