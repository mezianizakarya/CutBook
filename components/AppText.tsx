import type { ComponentProps } from "react";
import { StyleSheet, Text, type TextStyle } from "react-native";
import { containsArabicText, resolveFontFamily } from "@/lib/fonts";

type AppTextProps = ComponentProps<typeof Text> & {
  weight?: TextStyle["fontWeight"];
};

export function AppText({ children, style, weight, ...rest }: AppTextProps) {
  const flat = StyleSheet.flatten([style]) as Partial<TextStyle> | undefined;
  const fontFamily = resolveFontFamily(
    containsArabicText(children),
    weight ?? flat?.fontWeight,
  );
  const restStyle: Partial<TextStyle> = { ...flat };
  delete restStyle.fontWeight;
  return (
    <Text {...rest} style={[{ fontFamily }, restStyle]}>
      {children}
    </Text>
  );
}
