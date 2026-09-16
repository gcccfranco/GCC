import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  // Les variantes `hover:` ne s'appliquent que sur un appareil réellement
  // capable de survol (souris) — évite le « hover collant » sur tactile
  // (téléphone/tablette) où l'état de survol restait figé après un tap.
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chord: "#2563EB",
        section: "#EA580C",
        jianpu: "#B91C1C",
      },
      // Police du système (décision Q8 du 15/09/2026) : SF sur iPhone et Mac,
      // Roboto sur Android, Segoe sur Windows ; PingFang / Noto pour le 中文.
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "PingFang SC",
          "Noto Sans CJK SC",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      // Échelle de texte de l'interface (hors chants) : six crans, interligne
      // et interlettrage liés à la taille (audit F1). Les chants gardent
      // --lyric-size.
      fontSize: {
        xs: ["11px", { lineHeight: "14px", letterSpacing: "0.01em" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["15px", { lineHeight: "21px" }],
        lg: ["17px", { lineHeight: "23px", letterSpacing: "-0.01em" }],
        xl: ["22px", { lineHeight: "27px", letterSpacing: "-0.015em" }],
        "2xl": ["30px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
