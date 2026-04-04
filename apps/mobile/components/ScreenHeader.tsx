import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { type } from "../lib/typography";
import { pillStyle, webTheme } from "../lib/webTheme";

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  accent?: string;
  description: string;
  badge?: string;
  hideWorkspaceButton?: boolean;
}

export function ScreenHeader({
  eyebrow,
  title,
  accent,
  description,
  badge,
  hideWorkspaceButton,
}: ScreenHeaderProps) {
  const accentColor = accent || webTheme.accent;

  return (
    <View style={{ paddingTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
      <View style={{ flex: 1 }}>
        {/* eyebrow pill */}
        <View
          style={[
            pillStyle,
            {
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginBottom: 20,
            },
          ]}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: accentColor,
              shadowColor: accentColor,
              shadowOpacity: 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <Text
            style={{
              ...type.label,
              color: accentColor,
              fontSize: 10,
            }}
          >
            {eyebrow}
          </Text>
        </View>

        {/* title */}
        <Text
          style={{
            ...type.h1,
            color: webTheme.text,
          }}
        >
          {title}
          {badge ? <Text style={{ color: accentColor }}> {badge}</Text> : null}
        </Text>

        {/* description */}
        <Text
          style={{
            ...type.body,
            marginTop: 14,
            maxWidth: 340,
            color: webTheme.muted,
          }}
        >
          {description}
        </Text>
      </View>

      {!hideWorkspaceButton && (
        <Pressable
          onPress={() => router.push("/hub")}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: webTheme.borderStrong,
            backgroundColor: "rgba(255,255,255,0.04)",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            opacity: pressed ? 0.8 : 1,
            marginTop: 2,
            marginLeft: 12,
            flexShrink: 0,
          })}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.05)", "transparent"]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <Feather name="layers" size={18} color={webTheme.text} />
        </Pressable>
      )}
    </View>
  );
}
