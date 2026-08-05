import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import { memo, useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ProfileTabAvatar } from "./ProfileTabAvatar";
import { TAB_BAR } from "./constants";
import { colors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type FloatingTabBarItemProps = {
  /** Accessible label, e.g. "Profile". */
  label: string;
  /** Ionicons name rendered for regular tabs without custom images. */
  icon: string;
  /** Custom image rendered for the inactive state. */
  iconImage?: number;
  /** Custom image rendered for the active state. */
  iconImageActive?: number;
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
  iconImage,
  iconImageActive,
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

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.94]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    color: colors.white,
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }],
  }));

  const inactiveImageStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.12]) }],
  }));

  const activeImageStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.88, 1]) }],
  }));

  const renderIcon = () => {
    if (iconImage) {
      return (
        <>
          <Animated.View style={[styles.iconLayer, inactiveImageStyle]}>
            <Image
              source={iconImage}
              style={styles.imageIcon}
              contentFit="contain"
              tintColor={colors.white}
            />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, activeImageStyle]}>
            <Image
              source={iconImageActive ?? iconImage}
              style={styles.imageIcon}
              contentFit="contain"
              tintColor={colors.white}
            />
          </Animated.View>
        </>
      );
    }
    return <AnimatedIonicons name={icon as IconName} size={TAB_BAR.iconSize} style={iconStyle} />;
  };

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
        {showAvatar ? <ProfileTabAvatar active={active} /> : renderIcon()}
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
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  imageIcon: {
    width: TAB_BAR.iconSize,
    height: TAB_BAR.iconSize,
  },
});
