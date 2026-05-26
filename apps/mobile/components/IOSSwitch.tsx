import React, { useEffect, useRef } from "react";
import { Pressable, Animated, StyleSheet, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeStore } from "../stores/themeStore";

interface IOSSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function IOSSwitch({ value, onValueChange, disabled, style }: IOSSwitchProps) {
  const theme = useThemeStore((s) => s.theme);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // Color interpolation requires useNativeDriver: false in RN
    }).start();
  }, [value]);

  const toggle = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onValueChange(!value);
  };

  const inactiveTrackColor = theme === "dark" ? "#39393D" : "#E5E5EA";
  const activeTrackColor = "#34C759";

  const trackBgColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveTrackColor, activeTrackColor],
  });

  const knobPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // 51 (track width) - 27 (knob width) - 2 (padding) = 22
  });

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      style={[styles.container, style]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackBgColor }]}>
        <Animated.View style={[styles.knob, { left: knobPosition }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    justifyContent: "center",
  },
  track: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    position: "relative",
  },
  knob: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: "#FFFFFF",
    position: "absolute",
    top: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 2.2,
    elevation: 3,
  },
});
