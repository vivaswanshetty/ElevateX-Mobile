import type { ReactNode } from "react";
import { useEffect } from "react";
import type { ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface FadeSlideInProps {
  children: ReactNode;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Distance to slide up from (px) */
  distance?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** Optional extra styles for the container */
  style?: StyleProp<ViewStyle>;
}

export function FadeSlideIn({
  children,
  delay = 0,
  distance = 18,
  duration = 420,
  style,
}: FadeSlideInProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    const config = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    opacity.value = withDelay(delay, withTiming(1, config));
    translateY.value = withDelay(delay, withTiming(0, config));
  }, [delay, distance, duration, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
