/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // NAVY = brand base (from logo "In"/"Fest" text)  - used for headings, nav, structure
        navy: {
          50:  "#f2f3f6",
          100: "#e3e5ec",
          200: "#c3c7d6",
          300: "#9aa0b8",
          400: "#6d7591",
          500: "#454d6c",
          600: "#2a3151",
          700: "#1a2035", // exact logo navy
          800: "#12172a",
          900: "#0b0e1c"
        },
        // PRIMARY is aliased to navy so every existing `primary-*` class
        // (nav actives, headings, structural accents) retones automatically.
        primary: {
          50:  "#f2f3f6",
          100: "#e3e5ec",
          200: "#c3c7d6",
          300: "#9aa0b8",
          400: "#6d7591",
          500: "#454d6c",
          600: "#2a3151",
          700: "#1a2035",
          800: "#12172a",
          900: "#0b0e1c"
        },
        // ACCENT = brand red (from the logo's "2")  - used for primary CTAs, badges
        accent: {
          50:  "#fdecec",
          100: "#fbd0d2",
          200: "#f5a3a8",
          300: "#ee747c",
          400: "#e8454e",
          500: "#e8192c", // exact logo red
          600: "#c81322",
          700: "#9e0f1b"
        },
        // GOLD = brand gold (from the logo's arch)  - used for highlight badges,
        // trust points, and combined with accent for the website-builder CTA
        gold: {
          400: "#f8c976",
          500: "#f5a623", // exact logo gold
          600: "#d38a10"
        }
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"]
      },
      animation: {
        "fade-up":    "fadeUp 0.6s ease-out forwards",
        "fade-in":    "fadeIn 0.4s ease-out forwards",
        "slide-in-left":  "slideInLeft 0.5s ease-out forwards",
        "slide-in-right": "slideInRight 0.5s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "bounce-slow":"bounce 2s infinite"
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        },
        fadeIn: {
          "0%":   { opacity: 0 },
          "100%": { opacity: 1 }
        },
        slideInLeft: {
          "0%":   { opacity: 0, transform: "translateX(-30px)" },
          "100%": { opacity: 1, transform: "translateX(0)" }
        },
        slideInRight: {
          "0%":   { opacity: 0, transform: "translateX(30px)" },
          "100%": { opacity: 1, transform: "translateX(0)" }
        }
      }
    }
  },
  plugins: []
};