import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { memo, useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ProfileTabAvatar } from "./ProfileTabAvatar";
import { TAB_BAR } from "./constants";
import { colors, radius } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type FloatingTabBarItemProps = {
  /** Accessible label, e.g. "Profile". */
  label: string;
  /** Ionicons name rendered for regular tabs. */
  icon: string;
  /** Whether this tab is currently selected. */
  active: boolean;
  /** Renders the real profile avatar instead of the icon. */
  showAvatar: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/** Pill that wraps the active icon. Fixed size so the layout never shifts. */
const PILL_WIDTH = 52;
const PILL_HEIGHT = 44;

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

function FloatingTabBarItemBase({
  label,
  icon,
  active,
  showAvatar,
  onPress,
  onLongPress,
}: FloatingTabBarItemProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = active ? 1 : 0;
      return;
    }
    progress.value = withTiming(active ? 1 : 0, {
      duration: TAB_BAR.animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, progress, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.9, 1]) }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.94]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.muted, colors.primary]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) });
      }}
      style={styles.slot}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.visualBox, pressStyle]}>
        {!showAvatar && <Animated.View style={[styles.pill, pillStyle]} />}
        {showAvatar ? (
          <ProfileTabAvatar active={active} />
        ) : (
          <AnimatedIonicons name={icon as IconName} size={TAB_BAR.iconSize} style={iconStyle} />
        )}
      </Animated.View>
    </Pressable>
  );
}

export const FloatingTabBarItem = memo(FloatingTabBarItemBase);

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  visualBox: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
});
