import type { Config } from "tailwindcss";

/**
 * Design system "Portfolio" — corporate ma giovanile.
 * - brand: indigo/iris (azione, accenti)
 * - ink: navy profondo (sidebar, superfici scure)
 * - gold: accento premium discreto
 * Semantiche positive/negative via emerald/rose di Tailwind.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF1FF",
          100: "#E0E5FF",
          200: "#C6CDFF",
          300: "#A3ADFB",
          400: "#7E87F6",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#2A2580",
          DEFAULT: "#4F46E5",
        },
        ink: {
          700: "#16203A",
          800: "#0E1730",
          900: "#0A1024",
          DEFAULT: "#0E1730",
        },
        gold: {
          400: "#E2B33C",
          500: "#C9A227",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
        soft: "0 6px 24px -8px rgba(16,24,40,.12)",
        lift: "0 16px 40px -12px rgba(79,70,229,.28)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 1px 1px, rgba(99,102,241,.10) 1px, transparent 0)",
        "brand-gradient": "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)",
        "ink-gradient": "linear-gradient(180deg, #0E1730 0%, #0A1024 100%)",
        "hero-gradient":
          "linear-gradient(120deg, #0E1730 0%, #312E81 55%, #4F46E5 100%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp .4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
