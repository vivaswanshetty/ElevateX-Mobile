import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";

interface ScreenBackdropProps {
  accent?: string;
  secondaryAccent?: string;
}

export function ScreenBackdrop({
  accent = webTheme.accent,
  secondaryAccent = webTheme.violet,
}: ScreenBackdropProps) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  // Use absolute black gradients for dark mode and soft light-grey gradients for light mode
  const gradientColors = (isDark
    ? ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.45)", webTheme.bg]
    : ["rgba(248,249,250,0.0)", "rgba(248,249,250,0.45)", webTheme.bg]) as [string, string, string];

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
        colors={[isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1 }}
      />

      {/* premium, minimal backdrop wash gradient */}
      <LinearGradient
        colors={isDark ? ["rgba(229,54,75,0.03)", "rgba(139,92,246,0.02)", "transparent"] : ["rgba(229,54,75,0.02)", "rgba(139,92,246,0.015)", "transparent"]}
        start={{ x: 0.9, y: 0.1 }}
        end={{ x: 0.1, y: 0.9 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* full-screen fade overlay */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  );
}
