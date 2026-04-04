export const webTheme = {
  /* ── backgrounds ── */
  bg: "#07080A",
  bgSoft: "#0C0D10",
  surface: "#101114",
  surfaceRaised: "#151619",
  surfaceAlt: "#131416",

  /* ── borders ── */
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",
  borderSoft: "rgba(255,255,255,0.04)",

  /* ── text ── */
  text: "#F5F5F7",
  textSecondary: "rgba(245,245,247,0.72)",
  muted: "rgba(255,255,255,0.50)",
  faint: "rgba(255,255,255,0.30)",
  subtle: "rgba(255,255,255,0.18)",

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
};

/* ── shared card style ── */
export const surfaceCardStyle = {
  backgroundColor: webTheme.surfaceRaised,
  borderWidth: 1,
  borderColor: webTheme.border,
  borderRadius: 28,
  shadowColor: "#000",
  shadowOpacity: 0.28,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 12,
};

/* ── glass card (translucent) ── */
export const glassCardStyle = {
  backgroundColor: "rgba(18,19,23,0.82)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  borderRadius: 28,
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
  borderColor: webTheme.border,
  backgroundColor: "rgba(255,255,255,0.04)",
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
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: webTheme.border,
  borderRadius: 16,
  paddingHorizontal: 18,
  paddingVertical: 15,
  color: webTheme.text,
};
