import type { ReactNode } from "react";
import {
  Pressable,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { surfaceCardStyle, webTheme } from "../lib/webTheme";

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
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
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
  disabled = false,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: SurfaceCardProps) {
  const accentColor = getAccentColor(tone, accent);
  const isInteractive = typeof onPress === "function";

  const baseStyle: StyleProp<ViewStyle> = [
    surfaceCardStyle,
    {
      overflow: "hidden",
      borderColor: accentColor
        ? colorToRgba(accentColor, 0.18)
        : webTheme.border,
    },
    disabled && { opacity: 0.55 },
    style,
  ];

  const renderInner = (pressed = false) => (
    <>
      {/* top-lit glass gradient */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,0.05)",
          "rgba(255,255,255,0.015)",
          "rgba(255,255,255,0.005)",
        ]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />

      {/* top edge highlight */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 1,
          right: 1,
          height: 1,
          backgroundColor: "rgba(255,255,255,0.06)",
        }}
      />

      {/* accent wash */}
      {accentColor ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={[
              colorToRgba(accentColor, pressed ? 0.20 : 0.14),
              colorToRgba(accentColor, pressed ? 0.06 : 0.03),
              "transparent",
            ]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 140,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: accentColor,
              opacity: pressed ? 0.6 : 0.35,
            }}
          />
        </>
      ) : null}

      {/* content */}
      <View style={[{ padding: 22 }, contentStyle]}>
        {header ? <View style={{ marginBottom: 18 }}>{header}</View> : null}
        {children}
        {footer ? <View style={{ marginTop: 18 }}>{footer}</View> : null}
      </View>
    </>
  );

  if (!isInteractive) {
    return <View style={baseStyle}>{renderInner()}</View>;
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
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
  return (
    <LinearGradient
      colors={["transparent", "rgba(255,255,255,0.10)", "transparent"]}
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
