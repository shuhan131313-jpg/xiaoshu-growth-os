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
        background: "#F8F1E5",
        surface: "#ECE1CE",
        card: "#ECE1CE",
        primary: {
          DEFAULT: "#AD8A63",
          light: "#C6A47E",
          dark: "#8A6A47",
        },
        accent: {
          DEFAULT: "#58A874",
          light: "#84C597",
          dark: "#3C8759",
        },
        ink: {
          DEFAULT: "#463E35",
          soft: "#6B6258",
          faint: "#9A9188",
        },
        line: "#DDD0BB",
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
        soft: "0 6px 20px rgba(173,138,99,0.20)",
        card: "0 2px 12px rgba(70,62,53,0.06)",
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
