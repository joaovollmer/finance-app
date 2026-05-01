import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-dark)",
          pastel: "var(--brand-pastel)",
          border: "var(--brand-border)",
        },
        positive: {
          DEFAULT: "var(--positive)",
          pastel: "var(--positive-pastel)",
          border: "var(--positive-border)",
        },
        negative: {
          DEFAULT: "var(--negative)",
          pastel: "var(--negative-pastel)",
          border: "var(--negative-border)",
        },
        ink: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--bg)",
          border: "var(--border)",
          "border-light": "var(--border-light)",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(13, 21, 37, 0.04)",
        glow: "0 0 0 3px var(--brand-glow)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.3s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
