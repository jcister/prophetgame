import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#1b1d2b",
        panel: "#2b2e3f",
        accent: "#f7c948",
        danger: "#ff5c8a",
        success: "#6de08d"
      },
      boxShadow: {
        pixel: "0 0 0 2px #000, 4px 4px 0 0 #000"
      },
      fontFamily: {
        pixel: ["var(--font-press-start)", ...defaultTheme.fontFamily.sans]
      },
      animation: {
        "press-start": "press-start 1.2s steps(2, start) infinite"
      },
      keyframes: {
        "press-start": {
          "0%": { opacity: "0.3" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.3" }
        }
      }
    }
  },
  plugins: []
};

export default config;
