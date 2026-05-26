import React, { useEffect } from "react";
import { Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useTabStore } from "../stores/tabStore";

interface TabTransitionViewProps {
  children: React.ReactNode;
  index: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function TabTransitionView({ children, index }: TabTransitionViewProps) {
  const isFocused = useIsFocused();
  const { currentIndex, previousIndex } = useTabStore();
  
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      let startX = 0;
      
      // Only slide if we are switching between different tabs
      if (currentIndex !== previousIndex) {
        if (currentIndex > previousIndex) {
          // Sliding right (new screen comes from right)
          startX = SCREEN_WIDTH * 0.08; // Subtle 8% screen width translation for premium look
        } else {
          // Sliding left (new screen comes from left)
          startX = -SCREEN_WIDTH * 0.08;
        }
      }

      translateX.value = startX;
      opacity.value = 0.5;

      const duration = 240; // Quick snappy feel
      const easing = Easing.out(Easing.quad);

      translateX.value = withTiming(0, { duration, easing });
      opacity.value = withTiming(1, { duration, easing });
    }
  }, [isFocused, currentIndex, previousIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
