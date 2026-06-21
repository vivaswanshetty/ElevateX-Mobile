import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  View,
  StyleSheet,
  Platform,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { surfaceCardStyle, webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";

export type SurfaceCardTone = "default" | "info" | "success" | "danger" | "muted";

interface SurfaceCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
  footer?: ReactNode;
  accent?: string;
  tone?: SurfaceCardTone;
  onPress?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  shimmer?: boolean;
}

const toneAccentMap: Record<Exclude<SurfaceCardTone, "default">, string> = {
  info: "#60A5FA",
  success: "#34D399",
  danger: "#FB7185",
  muted: "#94A3B8",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeHex(input: string): string | null {
  const clean = input.trim().replace(/^#/, "");

  if (/[^0-9a-f]/i.test(clean)) {
    return null;
  }

  if (clean.length === 3 || clean.length === 4) {
    return clean
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }

  if (clean.length === 6 || clean.length === 8) {
    return clean;
  }

  return null;
}

function colorToRgba(
  color: string,
  alpha: number,
  fallback = "rgba(255,255,255,0.07)"
): string {
  const trimmed = color.trim();

  if (/^(rgba?|hsla?)\(/i.test(trimmed) || trimmed.toLowerCase() === "transparent") {
    return trimmed;
  }

  const normalized = normalizeHex(trimmed);
  if (!normalized) {
    return fallback;
  }

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  const baseAlpha =
    normalized.length === 8 ? parseInt(normalized.substring(6, 8), 16) / 255 : 1;

  return `rgba(${r},${g},${b},${clamp(alpha * baseAlpha, 0, 1)})`;
}

function getAccentColor(tone: SurfaceCardTone, accent?: string): string | undefined {
  if (accent) {
    return accent;
  }

  if (tone === "default") {
    return undefined;
  }

  return toneAccentMap[tone];
}

export function SurfaceCard({
  children,
  style,
  contentStyle,
  header,
  footer,
  accent,
  tone = "default",
  onPress,
  onLayout,
  disabled = false,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  testID,
  shimmer = false,
}: SurfaceCardProps) {
  const accentColor = getAccentColor(tone, accent);
  const isInteractive = typeof onPress === "function";

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  // Card width tracking for shimmer translation range
  const [cardWidth, setCardWidth] = useState(300);
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    if (shimmer) {
      shimmerTranslate.value = -1;
      shimmerTranslate.value = withRepeat(
        withTiming(1.8, {
          duration: 3200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        -1,
        false
      );
    } else {
      shimmerTranslate.value = -1;
    }
  }, [shimmer]);

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: shimmerTranslate.value * (cardWidth + 120),
        },
      ],
    };
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
    if (onLayout) {
      onLayout(e);
    }
  };

  // Flatten styles to extract padding and border styles
  const flatStyle = StyleSheet.flatten(style) || {};
  const {
    padding,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingHorizontal,
    paddingVertical,
    ...remainingStyle
  } = flatStyle;

  const forwardedPadding: ViewStyle = {};
  if (padding !== undefined) forwardedPadding.padding = padding;
  if (paddingTop !== undefined) forwardedPadding.paddingTop = paddingTop;
  if (paddingBottom !== undefined) forwardedPadding.paddingBottom = paddingBottom;
  if (paddingLeft !== undefined) forwardedPadding.paddingLeft = paddingLeft;
  if (paddingRight !== undefined) forwardedPadding.paddingRight = paddingRight;
  if (paddingHorizontal !== undefined) forwardedPadding.paddingHorizontal = paddingHorizontal;
  if (paddingVertical !== undefined) forwardedPadding.paddingVertical = paddingVertical;

  const cardBorderRadius = remainingStyle.borderRadius !== undefined ? remainingStyle.borderRadius : 16;
  const cardBorderTopLeftRadius = remainingStyle.borderTopLeftRadius !== undefined ? remainingStyle.borderTopLeftRadius : cardBorderRadius;
  const cardBorderTopRightRadius = remainingStyle.borderTopRightRadius !== undefined ? remainingStyle.borderTopRightRadius : cardBorderRadius;
  const cardBorderBottomLeftRadius = remainingStyle.borderBottomLeftRadius !== undefined ? remainingStyle.borderBottomLeftRadius : cardBorderRadius;
  const cardBorderBottomRightRadius = remainingStyle.borderBottomRightRadius !== undefined ? remainingStyle.borderBottomRightRadius : cardBorderRadius;

  const baseStyle: StyleProp<ViewStyle> = [
    { ...surfaceCardStyle },
    {
      overflow: "hidden",
      borderColor: accentColor
        ? colorToRgba(accentColor, 0.18)
        : shimmer
          ? isDark
            ? "rgba(255, 255, 255, 0.22)" // crisp metallic border
            : "rgba(0, 0, 0, 0.16)"
          : isDark
            ? "rgba(255, 255, 255, 0.22)" // subtle white border style (matching stats card)
            : "rgba(0, 0, 0, 0.15)",
    },
    disabled && { opacity: 0.55 },
    remainingStyle,
  ];

  const glassColors = (isDark
    ? ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.005)"]
    : ["rgba(0,0,0,0.01)", "rgba(0,0,0,0.005)", "rgba(0,0,0,0.0)"]) as [string, string, string];

  const edgeHighlightColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)";

  const renderInner = (pressed = false) => (
    <>
      {/* backing iOS-style blur */}
      {Platform.OS === "ios" && isDark ? (
        <BlurView
          intensity={45}
          tint="dark"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: cardBorderRadius as number,
            borderTopLeftRadius: cardBorderTopLeftRadius as number,
            borderTopRightRadius: cardBorderTopRightRadius as number,
            borderBottomLeftRadius: cardBorderBottomLeftRadius as number,
            borderBottomRightRadius: cardBorderBottomRightRadius as number,
            overflow: "hidden",
          }}
        />
      ) : null}

      {/* top-lit glass gradient */}
      {isDark ? (
        <LinearGradient
          pointerEvents="none"
          colors={glassColors}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: cardBorderRadius as number,
            borderTopLeftRadius: cardBorderTopLeftRadius as number,
            borderTopRightRadius: cardBorderTopRightRadius as number,
            borderBottomLeftRadius: cardBorderBottomLeftRadius as number,
            borderBottomRightRadius: cardBorderBottomRightRadius as number,
            overflow: "hidden",
          }}
        />
      ) : null}

      {/* top edge highlight */}
      {isDark ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 1,
            right: 1,
            height: 1,
            backgroundColor: edgeHighlightColor,
          }}
        />
      ) : null}

      {/* metallic shimmer linear gradient overlay */}
      {shimmer ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            shimmerAnimatedStyle,
            {
              width: "100%",
              height: "100%",
              opacity: isDark ? 0.7 : 0.45,
            }
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              "rgba(255, 255, 255, 0)",
              "rgba(255, 255, 255, 0.02)",
              "rgba(255, 255, 255, 0.12)",
              "rgba(255, 255, 255, 0.22)",
              "rgba(255, 255, 255, 0.12)",
              "rgba(255, 255, 255, 0.02)",
              "rgba(255, 255, 255, 0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
            }}
          />
        </Animated.View>
      ) : null}

      {/* content */}
      <View style={[{ padding: 22 }, forwardedPadding, contentStyle]}>
        {header ? <View style={{ marginBottom: 18 }}>{header}</View> : null}
        {children}
        {footer ? <View style={{ marginTop: 18 }}>{footer}</View> : null}
      </View>
    </>
  );

  if (!isInteractive) {
    return <View style={baseStyle} onLayout={handleLayout}>{renderInner()}</View>;
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      onLayout={handleLayout}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        baseStyle,
        pressed && !disabled
          ? {
              transform: [{ scale: 0.98 }],
              opacity: 0.94,
            }
          : null,
      ]}
    >
      {({ pressed }) => renderInner(pressed)}
    </Pressable>
  );
}

export function SectionRule() {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const ruleColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";

  return (
    <LinearGradient
      colors={["transparent", ruleColor, "transparent"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{
        alignSelf: "center",
        width: 240,
        height: 1,
      }}
    />
  );
}

