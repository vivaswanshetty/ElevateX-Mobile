import React, { useEffect, useRef } from "react";
import { Animated, Text, View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { webTheme } from "../lib/webTheme";
import { type as typography } from "../lib/typography";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  onHide: () => void;
}

export function Toast({ message, type = "success", onHide }: ToastProps) {
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
        gradient: ["rgba(255, 68, 68, 0.15)", "rgba(255,68,68,0)"]
      };
      case "info": return { 
        name: "info", 
        color: "#60A5FA",
        gradient: ["rgba(96, 165, 250, 0.15)", "rgba(96, 165, 250, 0)"]
      };
      case "success": default: return { 
        name: "check-circle", 
        color: webTheme.accent,
        gradient: ["rgba(235, 255, 0, 0.12)", "rgba(235, 255, 0, 0)"]
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
        shadowColor: config.color,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      <BlurView
        intensity={100}
        tint="dark"
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(12, 12, 12, 0.90)",
          paddingHorizontal: 20,
          paddingVertical: 18,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={config.gradient as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        
        <View style={{
          backgroundColor: `${config.color}20`,
          borderRadius: 14,
          padding: 8,
          marginRight: 14,
          borderWidth: 1,
          borderColor: `${config.color}30`
        }}>
          <Feather name={config.name as any} size={20} color={config.color} />
        </View>
        
        <Text 
          style={{ 
            ...typography.semibold, 
            color: webTheme.text, 
            fontSize: 15,
            flex: 1,
            letterSpacing: 0.2
          }}
          numberOfLines={2}
        >
          {message}
        </Text>
      </BlurView>
    </Animated.View>
  );
}
