import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Geist is self-hosted by the `geist` package (variables set in src/app/layout.tsx), so the build
        // never fetches fonts from Google.
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono],
      },
      animation: {
        spotlight: "spotlight 2s ease .75s 1 forwards",
      },
      keyframes: {
        spotlight: {
          "0%": { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%,-40%) scale(1)" },
        },
      },
      colors: {
        nimbus: {
          DEFAULT: "#047857", // emerald-700: 5.5:1 against white text
          dark: "#065f46", // emerald-800
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
