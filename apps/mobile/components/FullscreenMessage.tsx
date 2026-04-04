import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenBackdrop } from "./ScreenBackdrop";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

interface FullscreenMessageProps {
  title: string;
  detail?: string;
  loading?: boolean;
}

export function FullscreenMessage({
  title,
  detail,
  loading = false,
}: FullscreenMessageProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
        <View
          style={{
            borderRadius: 32,
            borderWidth: 1,
            borderColor: webTheme.border,
            backgroundColor: webTheme.surfaceRaised,
            paddingHorizontal: 28,
            paddingVertical: 36,
            alignItems: "center",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
          }}
        >
          {/* glass highlight */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.04)", "transparent"]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />

          {loading ? (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: webTheme.accentSoft,
                borderWidth: 1,
                borderColor: webTheme.accentBorder,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="small" color={webTheme.accent} />
            </View>
          ) : null}
          <Text
            style={{
              fontSize: loading ? 24 : 32,
              fontWeight: "900",
              marginTop: loading ? 22 : 0,
              color: webTheme.text,
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          {detail ? (
            <Text
              style={{
                fontSize: 14,
                marginTop: 12,
                textAlign: "center",
                color: webTheme.muted,
              }}
            >
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
