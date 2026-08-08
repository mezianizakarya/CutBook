import { useRef } from "react";
import { Animated, PanResponder } from "react-native";

/**
 * Pan-to-dismiss behaviour for bottom-sheet modals. Drags the sheet down and
 * closes it past a threshold; otherwise springs back. Mirrors the drag pattern
 * used by the admin Users screen.
 */
export function useSheetDrag(onClose: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 80) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return { translateY, panResponder };
}
