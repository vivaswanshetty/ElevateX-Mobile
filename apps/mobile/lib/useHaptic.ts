import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const impactMap: Record<string, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const notificationMap: Record<string, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export function useHaptic() {
  const trigger = useCallback((type: HapticType = "light") => {
    if (Platform.OS === "web") return;

    if (type === "selection") {
      Haptics.selectionAsync();
      return;
    }

    const impact = impactMap[type];
    if (impact !== undefined) {
      Haptics.impactAsync(impact);
      return;
    }

    const notification = notificationMap[type];
    if (notification !== undefined) {
      Haptics.notificationAsync(notification);
      return;
    }
  }, []);

  return trigger;
}
