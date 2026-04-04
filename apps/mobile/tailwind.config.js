/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E5364B",
          dark: "#07080A",
          card: "#151619",
          border: "rgba(255,255,255,0.07)",
          muted: "rgba(255,255,255,0.50)",
          violet: "#8B5CF6",
        },
      },
    },
  },
  plugins: [],
};
