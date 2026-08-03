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
        background: "#F7F4EF",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#A8927C",
          light: "#BCA98F",
          dark: "#8A7560",
        },
        accent: {
          DEFAULT: "#98AF94",
          light: "#AEC0A9",
          dark: "#7C9477",
        },
        ink: {
          DEFAULT: "#4A423A",
          soft: "#6B6258",
          faint: "#9A9188",
        },
        line: "#ECE6DD",
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
        soft: "0 6px 20px rgba(168,146,124,0.18)",
        card: "0 2px 12px rgba(74,66,58,0.06)",
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
