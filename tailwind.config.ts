import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "void-ink":       "#0B0B10",
        "obsidian":       "#14141C",
        "parchment":      "#EFE4D0",
        "sealed-gold":    "#C9A35B",
        "signal-violet":  "#7D5FFF",
        "clause-blue":    "#7EA7C9",
        "redaction-rose": "#B85C70",
        "verdict-green":  "#6E9F7E",
        "bone-border":    "rgba(239,228,208,0.18)",
        "muted-parchment":"rgba(239,228,208,0.64)",
      },
      fontFamily: {
        heading: ["var(--font-bebas)", "sans-serif"],
        body:    ["var(--font-inter)",  "sans-serif"],
        mono:    ["var(--font-ibm-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "dossier-grain": "url('/grain.svg')",
      },
    },
  },
  plugins: [],
};

export default config;
