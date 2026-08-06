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
        background: "#F7F1EC",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#548C70",
          light: "#6E9F82",
          dark: "#3F6E56",
        },
        accent: {
          DEFAULT: "#548C70",
          light: "#6E9F82",
          dark: "#3F6E56",
        },
        ink: {
          DEFAULT: "#2C2C2C",
          soft: "#75706B",
          faint: "#A89E94",
        },
        line: "#B8A38C",
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
        soft: "0 6px 20px rgba(84,140,112,0.18)",
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
