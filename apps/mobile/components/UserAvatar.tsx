import React, { useState, useEffect } from "react";
import { View, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getImageUrl } from "../lib/media";
import { webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";

interface UserAvatarProps {
  avatar?: string | null;
  size?: number;
  borderWidth?: number;
  borderColor?: string;
  style?: any;
}

export function UserAvatar({ avatar, size = 44, borderWidth = 1, borderColor, style }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  // Reset error state when avatar changes
  useEffect(() => {
    setHasError(false);
  }, [avatar]);

  const avatarUrl = getImageUrl(avatar);
  const showImage = avatarUrl && !hasError;
  const computedBorderColor = borderColor || webTheme.border;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderWidth: borderWidth,
          borderColor: computedBorderColor,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl! }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <Feather
          name="user"
          size={Math.max(14, Math.floor(size * 0.45))}
          color={webTheme.faint}
        />
      )}
    </View>
  );
}
