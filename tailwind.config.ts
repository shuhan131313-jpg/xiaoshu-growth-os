import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FA",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#1A3F90",
          light: "#3A5DA8",
          dark: "#122C66",
        },
        accent: {
          DEFAULT: "#1A3F90",
          light: "#3A5DA8",
          dark: "#122C66",
        },
        gold: {
          DEFAULT: "#E6C260",
          light: "#EFD58A",
          dark: "#C9A43F",
        },
        ink: {
          DEFAULT: "#2C2C2C",
          soft: "#666666",
          faint: "#9AA1A8",
        },
        line: "#E2E5EC",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Noto Sans CJK SC"',
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", '"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        soft: "0 6px 20px rgba(26,63,144,0.14)",
        card: "0 2px 12px rgba(44,44,44,0.06)",
      },
      transitionDuration: {
        DEFAULT: "250ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
