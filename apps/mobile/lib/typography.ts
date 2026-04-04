export const fontFaces = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
  black: "Inter_900Black",
} as const;

/* ── weight-only presets (original API — keep for compat) ── */
export const type = {
  regular: { fontFamily: fontFaces.regular },
  medium: { fontFamily: fontFaces.medium },
  semibold: { fontFamily: fontFaces.semibold },
  bold: { fontFamily: fontFaces.bold },
  extrabold: { fontFamily: fontFaces.extrabold },
  black: { fontFamily: fontFaces.black },

  /* ── semantic presets with sizing ── */
  hero: {
    fontFamily: fontFaces.black,
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: -2.5,
  },
  h1: {
    fontFamily: fontFaces.black,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.6,
  },
  h2: {
    fontFamily: fontFaces.extrabold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
  },
  h3: {
    fontFamily: fontFaces.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: fontFaces.regular,
    fontSize: 15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFaces.medium,
    fontSize: 15,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fontFaces.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: fontFaces.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  buttonLabel: {
    fontFamily: fontFaces.bold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
} as const;
