import { Text, View } from "react-native";
import { fontFaces } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

export function Watermark() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 18, opacity: 0.32 }}>
      <Text
        style={{
          fontFamily: fontFaces.semibold,
          fontSize: 10,
          letterSpacing: 2,
          color: webTheme.faint,
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
          marginTop: 3,
        }}
      >
        by Vivaswan Shetty
      </Text>
    </View>
  );
}
