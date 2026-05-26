import { Text, View } from "react-native";
import { fontFaces } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";
import versionInfo from "../version.json";

export function Watermark() {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  return (
    <View style={{ alignItems: "center", paddingVertical: 20 }}>
      <Text
        style={{
          fontFamily: fontFaces.semibold,
          fontSize: 10,
          letterSpacing: 2,
          color: isDark ? "rgba(255, 255, 255, 0.38)" : "rgba(0, 0, 0, 0.44)",
          textTransform: "uppercase",
        }}
      >
        Built for progress
      </Text>
      <Text
        style={{
          fontFamily: fontFaces.bold,
          fontSize: 10,
          letterSpacing: 1.4,
          color: webTheme.accent,
          opacity: isDark ? 0.75 : 0.88,
          marginTop: 3,
        }}
      >
        by Vivaswan Shetty
      </Text>
      <Text
        style={{
          fontFamily: fontFaces.semibold,
          fontSize: 8.5,
          letterSpacing: 0.5,
          color: isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.32)",
          marginTop: 5,
        }}
      >
        v{versionInfo.version}
      </Text>
    </View>
  );
}
