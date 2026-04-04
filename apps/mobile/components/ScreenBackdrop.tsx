import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { webTheme } from "../lib/webTheme";

interface ScreenBackdropProps {
  accent?: string;
  secondaryAccent?: string;
}

export function ScreenBackdrop({
  accent = webTheme.accent,
  secondaryAccent = webTheme.violet,
}: ScreenBackdropProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
      }}
    >
      {/* top edge highlight */}
      <LinearGradient
        colors={["rgba(255,255,255,0.04)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1 }}
      />

      {/* primary accent blob — top right */}
      <View
        style={{
          position: "absolute",
          top: -160,
          right: -110,
          width: 340,
          height: 340,
          borderRadius: 999,
          backgroundColor: accent,
          opacity: 0.06,
        }}
      />

      {/* secondary accent blob — left */}
      <View
        style={{
          position: "absolute",
          top: 80,
          left: -140,
          width: 300,
          height: 300,
          borderRadius: 999,
          backgroundColor: secondaryAccent,
          opacity: 0.04,
        }}
      />

      {/* subtle bottom accent */}
      <View
        style={{
          position: "absolute",
          bottom: -80,
          right: 40,
          width: 200,
          height: 200,
          borderRadius: 999,
          backgroundColor: accent,
          opacity: 0.03,
        }}
      />

      {/* full-screen fade overlay */}
      <LinearGradient
        colors={["rgba(7,8,10,0.0)", "rgba(7,8,10,0.4)", webTheme.bg]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  );
}
