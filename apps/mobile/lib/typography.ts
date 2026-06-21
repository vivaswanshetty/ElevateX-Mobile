export const fontFaces = {
  regular: "Arimo_400Regular",
  medium: "Arimo_500Medium",
  semibold: "Arimo_600SemiBold",
  bold: "Arimo_700Bold",
  extrabold: "Arimo_700Bold",
  black: "Arimo_700Bold",
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
    letterSpacing: -1.2,
  },
  h1: {
    fontFamily: fontFaces.black,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  h2: {
    fontFamily: fontFaces.extrabold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  h3: {
    fontFamily: fontFaces.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
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
