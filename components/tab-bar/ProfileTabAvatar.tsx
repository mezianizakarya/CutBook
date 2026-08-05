import { useUser } from "@clerk/expo";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Avatar } from "@/components/ui/Avatar";
import { TAB_BAR } from "./constants";
import { colors, radius } from "@/lib/theme";

type ProfileTabAvatarProps = {
  active: boolean;
};

const BORDER_WIDTH = 2;
const WRAPPER_SIZE = TAB_BAR.avatarSize + BORDER_WIDTH * 2;

/**
 * Instagram-style profile tab. Shows the user's real avatar when one exists
 * and falls back to an initials avatar from the design system otherwise.
 * When selected, a 2px primary ring fades in and the avatar scales up.
 */
export function ProfileTabAvatar({ active }: ProfileTabAvatarProps) {
  const { user } = useUser();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

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

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], ["rgba(0, 0, 0, 0)", colors.primary]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }],
  }));

  return (
    <Animated.View style={[styles.wrapper, ringStyle]}>
      <Avatar
        fullName={user?.fullName}
        imageUrl={user?.hasImage ? user?.imageUrl : null}
        size={TAB_BAR.avatarSize}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: WRAPPER_SIZE,
    height: WRAPPER_SIZE,
    borderRadius: radius.full,
    borderWidth: BORDER_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
});
