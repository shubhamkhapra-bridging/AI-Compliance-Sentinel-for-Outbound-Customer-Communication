/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Bricolage Grotesque"', "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Surfaces & neutrals (cool, layered)
        canvas: "#F5F6F9",
        surface: "#FFFFFF",
        line: "#E6E8EF",
        ink: {
          DEFAULT: "#0C111D",
          soft: "#384152",
          muted: "#69718A",
          faint: "#98A0B4",
        },
        sidebar: {
          DEFAULT: "#0A0E1A",
          elev: "#121829",
          line: "#1E2536",
        },
        // Primary accent — iris, used with discipline against neutrals.
        // `brand` kept as an alias so existing pages upgrade automatically.
        brand: {
          50:  "#F1F1FE",
          100: "#E5E5FC",
          200: "#CDCEF8",
          300: "#ABACF2",
          400: "#8385E9",
          500: "#5B5BD6",
          600: "#4B4BC4",
          700: "#3E3EA3",
          900: "#28285F",
        },
        primary: {
          50:  "#F1F1FE",
          100: "#E5E5FC",
          200: "#CDCEF8",
          300: "#ABACF2",
          400: "#8385E9",
          500: "#5B5BD6",
          600: "#4B4BC4",
          700: "#3E3EA3",
          900: "#28285F",
        },
        // Semantics
        success: { 50: "#ECFDF5", 100: "#D1FAE5", 500: "#10B981", 600: "#059669", 700: "#047857" },
        warn:    { 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B", 600: "#D97706", 700: "#B45309" },
        danger:  { 50: "#FFF1F3", 100: "#FFE4E8", 500: "#F43F5E", 600: "#E11D48", 700: "#BE123C" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(12,17,29,0.04), 0 1px 3px rgba(12,17,29,0.06)",
        "card-hover": "0 10px 34px -10px rgba(12,17,29,0.18)",
        glow: "0 0 0 1px rgba(91,91,214,0.16), 0 14px 40px -12px rgba(91,91,214,0.45)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 0.55s cubic-bezier(0.16,1,0.3,1) both",
        "glow-pulse": "glow-pulse 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
