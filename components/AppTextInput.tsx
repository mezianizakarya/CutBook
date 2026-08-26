import type { ComponentProps, Ref } from "react";
import { I18nManager, TextInput, type TextStyle } from "react-native";

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
    return (
        <TextInput
            {...rest}
            value={value}
            placeholder={placeholder}
            defaultValue={defaultValue}
            style={[{ writingDirection: I18nManager.isRTL ? "rtl" : "ltr" }, style]}
        />
    );
}
