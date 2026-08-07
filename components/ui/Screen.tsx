import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useContext, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/lib/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = false, centered = false, style }: ScreenProps) {
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const hasTabBar = tabBarHeight > 0;
  const bottomPadding = hasTabBar ? 0 : spacing.lg;

  return (
    <SafeAreaView style={styles.safe} edges={hasTabBar ? ["top"] : ["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPadding },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.column, centered && styles.centered, style]}>
              {children}
            </View>
          </ScrollView>
        ) : (
          <View
            style={[
              styles.content,
              centered && styles.centered,
              { paddingBottom: bottomPadding },
              style,
            ]}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  column: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: spacing.lg,
  },
  centered: {
    justifyContent: "center",
  },
});
