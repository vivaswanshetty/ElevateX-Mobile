import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { LinearGradient } from "expo-linear-gradient";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, marginTop: 40 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: webTheme.surfaceRaised, alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
        <LinearGradient
          colors={["rgba(255,255,255,0.06)", "transparent"]}
          style={{ position: "absolute", borderRadius: 40, width: "100%", height: "100%" }}
        />
        <Feather name={icon} size={32} color={webTheme.red} />
      </View>
      <Text style={{ ...type.h3, color: webTheme.text, textAlign: "center", marginBottom: 12 }}>{title}</Text>
      <Text style={{ ...type.regular, color: webTheme.muted, textAlign: "center", fontSize: 15, lineHeight: 22, marginBottom: 28 }}>{description}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={{ backgroundColor: webTheme.red, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999, shadowColor: webTheme.red, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          <Text style={{ ...type.bold, color: "white", fontSize: 14, letterSpacing: 0.5 }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}