import React, { useEffect, useRef } from "react";
import { Modal, Pressable, Text, View, Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { fontFaces } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";

interface SignOutModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SignOutModal({ visible, onConfirm, onCancel }: SignOutModalProps) {
  const scale = useRef(new Animated.Value(1.15)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isDark = useThemeStore((s) => s.theme) === "dark";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 280,
          mass: 0.9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(1.15);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  const dividerColor = isDark ? "rgba(84, 84, 88, 0.38)" : "rgba(60, 60, 67, 0.18)";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.40)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} onPress={onCancel} />

        <Animated.View
          style={{
            transform: [{ scale }],
            opacity,
            borderRadius: 13,
            overflow: "hidden",
            width: 270,
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.45 : 0.15,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 14 },
            elevation: 20,
          }}
        >
          <BlurView
            intensity={95}
            tint={isDark ? "dark" : "light"}
            style={{
              width: 270,
              backgroundColor: isDark ? "rgba(24, 24, 28, 0.70)" : "rgba(255, 255, 255, 0.80)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.65)",
            }}
          >
            {/* glass highlight */}
            <LinearGradient
              pointerEvents="none"
              colors={
                isDark
                  ? ["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)", "transparent"]
                  : ["rgba(255, 255, 255, 0.65)", "rgba(255, 255, 255, 0.20)", "transparent"]
              }
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
            />

            <View style={{ paddingTop: 22, paddingHorizontal: 16, paddingBottom: 20, alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: fontFaces.semibold,
                  fontSize: 17,
                  color: webTheme.text,
                  textAlign: "center",
                  letterSpacing: -0.4,
                }}
              >
                Sign Out
              </Text>
              
              <Text
                style={{
                  fontFamily: fontFaces.regular,
                  fontSize: 13,
                  color: isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(60, 60, 67, 0.75)",
                  textAlign: "center",
                  lineHeight: 17,
                  marginTop: 6,
                  letterSpacing: -0.08,
                }}
              >
                Are you sure you want to sign out? You'll need to sign back in next time.
              </Text>
            </View>

            {/* Horizontal Separator */}
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: dividerColor, width: "100%" }} />

            {/* Grid Buttons */}
            <View style={{ flexDirection: "row", width: "100%" }}>
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                })}
              >
                <Text
                  style={{
                    fontFamily: fontFaces.regular,
                    fontSize: 17,
                    color: "#007AFF",
                    letterSpacing: -0.4,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: dividerColor, height: 44 }} />

              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                })}
              >
                <Text
                  style={{
                    fontFamily: fontFaces.semibold,
                    fontSize: 17,
                    color: "#FF3B30",
                    letterSpacing: -0.4,
                  }}
                >
                  Sign Out
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

