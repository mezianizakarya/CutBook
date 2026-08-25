import type { ComponentProps, Ref } from "react";
import { StyleSheet, TextInput, type TextStyle } from "react-native";
import { containsArabicText, resolveFontFamily } from "@/lib/fonts";

type AppTextInputProps = Omit<ComponentProps<typeof TextInput>, "ref"> & {
  ref?: Ref<TextInput>;
  weight?: TextStyle["fontWeight"];
};

export function AppTextInput({
  style,
  value,
  placeholder,
  defaultValue,
  weight,
  ...rest
}: AppTextInputProps) {
  const sample = value ?? placeholder ?? defaultValue;
  const flat = StyleSheet.flatten([style]) as Partial<TextStyle> | undefined;
  const fontFamily = resolveFontFamily(
    containsArabicText(sample),
    weight ?? flat?.fontWeight,
  );
  const restStyle: Partial<TextStyle> = { ...flat };
  delete restStyle.fontWeight;
  return (
    <TextInput
      {...rest}
      value={value}
      placeholder={placeholder}
      defaultValue={defaultValue}
      style={[{ fontFamily }, restStyle]}
    />
  );
}
