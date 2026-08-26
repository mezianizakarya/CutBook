import type { ComponentProps } from "react";
import { Text, type TextStyle } from "react-native";

type AppTextProps = ComponentProps<typeof Text> & {
  weight?: TextStyle["fontWeight"];
};

export function AppText({ children, style, weight, ...rest }: AppTextProps) {
    return (
        <Text {...rest} style={style}>
            {children}
        </Text>
    );
}
