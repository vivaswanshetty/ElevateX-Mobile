import { useThemeStore } from "../stores/themeStore";
import { Platform } from "react-native";

const darkColors = {
  bg: "#000000",
  bgSoft: "#080808",
  surface: "#0D0D0D",
  surfaceRaised: "#121212",
  surfaceAlt: "#0A0A0A",

  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",
  borderSoft: "rgba(255,255,255,0.04)",

  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.85)",
  muted: "rgba(255,255,255,0.70)",
  faint: "rgba(255,255,255,0.52)",
  subtle: "rgba(255,255,255,0.18)",
};

const lightColors = {
  bg: "#F8F9FA",
  bgSoft: "#F1F3F5",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceAlt: "#F1F3F5",

  border: "rgba(0,0,0,0.08)",
  borderStrong: "rgba(0,0,0,0.14)",
  borderSoft: "rgba(0,0,0,0.04)",

  text: "#1A1A1A",
  textSecondary: "rgba(0,0,0,0.80)",
  muted: "rgba(0,0,0,0.65)",
  faint: "rgba(0,0,0,0.50)",
  subtle: "rgba(0,0,0,0.18)",
};

export const webTheme = {
  /* ── backgrounds ── */
  get bg() {
    return useThemeStore.getState().theme === "dark" ? darkColors.bg : lightColors.bg;
  },
  get bgSoft() {
    return useThemeStore.getState().theme === "dark" ? darkColors.bgSoft : lightColors.bgSoft;
  },
  get surface() {
    return useThemeStore.getState().theme === "dark" ? darkColors.surface : lightColors.surface;
  },
  get surfaceRaised() {
    return useThemeStore.getState().theme === "dark" ? darkColors.surfaceRaised : lightColors.surfaceRaised;
  },
  get surfaceAlt() {
    return useThemeStore.getState().theme === "dark" ? darkColors.surfaceAlt : lightColors.surfaceAlt;
  },

  /* ── borders ── */
  get border() {
    return useThemeStore.getState().theme === "dark" ? darkColors.border : lightColors.border;
  },
  get borderStrong() {
    return useThemeStore.getState().theme === "dark" ? darkColors.borderStrong : lightColors.borderStrong;
  },
  get borderSoft() {
    return useThemeStore.getState().theme === "dark" ? darkColors.borderSoft : lightColors.borderSoft;
  },

  /* ── text ── */
  get text() {
    return useThemeStore.getState().theme === "dark" ? darkColors.text : lightColors.text;
  },
  get textSecondary() {
    return useThemeStore.getState().theme === "dark" ? darkColors.textSecondary : lightColors.textSecondary;
  },
  get muted() {
    return useThemeStore.getState().theme === "dark" ? darkColors.muted : lightColors.muted;
  },
  get faint() {
    return useThemeStore.getState().theme === "dark" ? darkColors.faint : lightColors.faint;
  },
  get subtle() {
    return useThemeStore.getState().theme === "dark" ? darkColors.subtle : lightColors.subtle;
  },

  /* ── primary accent ── */
  accent: "#E5364B",
  accentSoft: "rgba(229,54,75,0.14)",
  accentBorder: "rgba(229,54,75,0.25)",
  accentGlow: "rgba(229,54,75,0.10)",

  /* kept for backward compat — maps to accent */
  red: "#E5364B",
  redDeep: "#B02A38",

  /* ── secondary accent — violet ── */
  violet: "#8B5CF6",
  violetSoft: "rgba(139,92,246,0.12)",
  violetBorder: "rgba(139,92,246,0.22)",

  /* ── semantic colors ── */
  green: "#34D399",
  greenSoft: "rgba(52,211,153,0.12)",
  orange: "#FB923C",
  orangeSoft: "rgba(251,146,60,0.12)",
  blue: "#60A5FA",
  blueSoft: "rgba(96,165,250,0.12)",
  purple: "#A78BFA",
  gold: "#FBBF24",
  goldSoft: "rgba(251,191,36,0.12)",

  /* ── glow ── */
  glow: "rgba(229,54,75,0.14)",
  glowSoft: "rgba(229,54,75,0.06)",

  /* ── helper background getters ── */
  get inputBg() {
    return useThemeStore.getState().theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  },
  get cardBg() {
    return useThemeStore.getState().theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  },
  get tintBg() {
    return useThemeStore.getState().theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  },
};

/* ── shared card style ── */
export const surfaceCardStyle = {
  get backgroundColor() {
    const theme = useThemeStore.getState().theme;
    if (theme === "dark") {
      return Platform.OS === "ios" ? "rgba(13, 13, 15, 0.45)" : "#121212";
    } else {
      return "#FFFFFF";
    }
  },
  borderWidth: 1,
  get borderColor() {
    return useThemeStore.getState().theme === "dark"
      ? "rgba(255, 255, 255, 0.12)"
      : "rgba(0, 0, 0, 0.08)";
  },
  borderRadius: 16,
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

/* ── glass card (translucent) ── */
export const glassCardStyle = {
  get backgroundColor() {
    const theme = useThemeStore.getState().theme;
    if (theme === "dark") {
      return Platform.OS === "ios" ? "rgba(18, 19, 23, 0.82)" : "#181818";
    } else {
      return "#FFFFFF";
    }
  },
  borderWidth: 1,
  get borderColor() {
    return useThemeStore.getState().theme === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)";
  },
  borderRadius: 16,
  shadowColor: "#000",
  shadowOpacity: 0.32,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 12,
};

/* ── pill / tag ── */
export const pillStyle = {
  borderRadius: 999,
  borderWidth: 1,
  get borderColor() {
    return webTheme.border;
  },
  get backgroundColor() {
    return useThemeStore.getState().theme === "dark"
      ? "rgba(255,255,255,0.04)"
      : "rgba(0,0,0,0.04)";
  },
};

/* ── premium button base ── */
export const premiumButtonStyle = {
  borderRadius: 999,
  paddingHorizontal: 24,
  paddingVertical: 16,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: webTheme.accent,
  shadowOpacity: 0.2,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

/* ── input field ── */
export const inputFieldStyle = {
  get backgroundColor() {
    return useThemeStore.getState().theme === "dark"
      ? "rgba(255,255,255,0.04)"
      : "rgba(0,0,0,0.04)";
  },
  borderWidth: 1,
  get borderColor() {
    return webTheme.border;
  },
  borderRadius: 16,
  paddingHorizontal: 18,
  paddingVertical: 15,
  get color() {
    return webTheme.text;
  },
};
