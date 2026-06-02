import { Pressable, type PressableProps } from "react-native";
import { useHaptic } from "../lib/useHaptic";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

export interface HapticPressableProps extends PressableProps {
  hapticType?: HapticType;
  onPress?: (e: any) => void;
}

export function HapticPressable({ hapticType = "light", onPress, ...rest }: HapticPressableProps) {
  const trigger = useHaptic();

  return (
    <Pressable
      accessible={rest.accessible ?? true}
      accessibilityRole={rest.accessibilityRole ?? "button"}
      {...rest}
      onPress={(e) => {
        trigger(hapticType);
        onPress?.(e);
      }}
    />
  );
}
