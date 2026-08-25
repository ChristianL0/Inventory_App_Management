/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Tailwind's default opacity scale only ships multiples of 5 (plus a few
      // extras); this project also uses /8 and /12 for subtler borders.
      opacity: { 8: "0.08", 12: "0.12" },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0D1117",
          soft: "#151B23",
          elevated: "#1C2430",
        },
        paper: {
          DEFAULT: "#F6F7F9",
          soft: "#FFFFFF",
          elevated: "#FFFFFF",
        },
        signal: {
          50: "#EEF1FF",
          100: "#DCE2FF",
          300: "#A9B7FF",
          500: "#4C6FFF",
          600: "#3B57E0",
          700: "#2C42B8",
        },
        tag: {
          50: "#FFF7E8",
          300: "#F6CA7C",
          500: "#F5A623",
          600: "#D6890F",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,17,23,0.06), 0 1px 1px rgba(13,17,23,0.04)",
        "card-dark": "0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.3)",
      },
      backgroundImage: {
        "grid-light": "linear-gradient(to right, rgba(13,17,23,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(13,17,23,0.04) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
