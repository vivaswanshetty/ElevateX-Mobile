import React, { useEffect, useRef } from "react";
import { Animated, Text, View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";
import { type as typography } from "../lib/typography";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  onHide: () => void;
}

export function Toast({ message, type = "success", onHide }: ToastProps) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const translateY = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (message) {
      Animated.spring(translateY, {
        toValue: Platform.OS === "ios" ? 65 : 45, // Account for dynamic notches/header
        useNativeDriver: true,
        speed: 14,
        bounciness: 8,
      }).start();
      
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onHide());
      }, 3500); // Give it a little more time on screen
      
      return () => clearTimeout(timer);
    }
  }, [message, translateY, onHide]);

  if (!message) return null;

  const getThemeConfig = () => {
    switch (type) {
      case "error": return { 
        name: "x-octagon", 
        color: "#FF4444",
        gradient: ["rgba(255, 68, 68, 0.08)", "rgba(255, 68, 68, 0)"]
      };
      case "info": return { 
        name: "info", 
        color: "#60A5FA",
        gradient: ["rgba(96, 165, 250, 0.08)", "rgba(96, 165, 250, 0)"]
      };
      case "success": default: return { 
        name: "check-circle", 
        color: webTheme.accent,
        gradient: ["rgba(229, 54, 75, 0.08)", "rgba(229, 54, 75, 0)"]
      };
    }
  };

  const config = getThemeConfig();

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        transform: [{ translateY }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 18,
        elevation: 8,
      }}
    >
      <BlurView
        intensity={95}
        tint={isDark ? "dark" : "light"}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "rgba(24, 24, 28, 0.72)" : "rgba(255, 255, 255, 0.82)",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.65)",
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={config.gradient as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Specular sheen highlight */}
        <LinearGradient
          pointerEvents="none"
          colors={isDark ? ["rgba(255,255,255,0.06)", "transparent"] : ["rgba(255,255,255,0.50)", "transparent"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        />
        
        <View style={{
          backgroundColor: `${config.color}20`,
          borderRadius: 10,
          padding: 7,
          marginRight: 12,
          borderWidth: 1,
          borderColor: `${config.color}30`
        }}>
          <Feather name={config.name as any} size={18} color={config.color} />
        </View>
        
        <Text 
          style={{ 
            ...typography.semibold, 
            color: webTheme.text, 
            fontSize: 14,
            flex: 1,
            letterSpacing: -0.2
          }}
          numberOfLines={2}
        >
          {message}
        </Text>
      </BlurView>
    </Animated.View>
  );
}
