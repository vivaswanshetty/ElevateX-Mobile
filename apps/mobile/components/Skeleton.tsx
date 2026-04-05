import { useEffect } from "react";
import { type ViewStyle, type DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { webTheme } from "../lib/webTheme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 10,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.65]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as DimensionValue,
          height,
          borderRadius,
          backgroundColor: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        },
        style,
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.0)",
          "rgba(255,255,255,0.04)",
          "rgba(255,255,255,0.0)",
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </Animated.View>
  );
}
