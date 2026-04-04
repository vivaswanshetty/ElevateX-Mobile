import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

interface AppStackHeaderProps {
  title: string;
  detail?: string;
  hideWorkspaceButton?: boolean;
}

export function AppStackHeader({ title, detail, hideWorkspaceButton }: AppStackHeaderProps) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <Pressable
        onPress={() => router.back()}
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
        })}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.05)", "transparent"]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <Feather name="arrow-left" size={18} color={webTheme.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...type.label,
            color: webTheme.accent,
            fontSize: 10,
          }}
        >
          ElevateX
        </Text>
        <Text style={{ ...type.h2, color: webTheme.text, marginTop: 2, fontSize: 26 }}>{title}</Text>
        {detail ? (
          <Text style={{ ...type.body, color: webTheme.textSecondary, fontSize: 13, marginTop: 3 }}>
            {detail}
          </Text>
        ) : null}
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
