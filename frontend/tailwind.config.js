/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Brand primary = the logo's red ("2Fest"), now driving every
        // existing bg-primary-*/text-primary-* class across the app.
        primary: {
          50:  "#fdecec",
          100: "#fbd0d2",
          200: "#f5a3a8",
          300: "#ee747c",
          400: "#e8454e",
          500: "#e8192c",
          600: "#c81322",
          700: "#9e0f1b",
          800: "#7a0c15",
          900: "#5c0910"
        },
        // Logo navy - used for headings, sidebar, dark surfaces
        navy: {
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
        // Kept as an alias so any existing accent-* class still resolves
        accent: {
          50:  "#fdecec",
          100: "#fbd0d2",
          200: "#f5a3a8",
          300: "#ee747c",
          400: "#e8454e",
          500: "#e8192c",
          600: "#c81322",
          700: "#9e0f1b"
        },
        gold: {
          50:  "#fef8ee",
          100: "#fdedd0",
          400: "#f8c976",
          500: "#f5a623",
          600: "#d38a10"
        },
        paper: "#faf9fc"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,14,28,0.04), 0 8px 24px -12px rgba(11,14,28,0.10)",
        nav: "0 -4px 20px rgba(11,14,28,0.06)"
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)"
      },
      keyframes: {
        slotIn: {
          "0%": { opacity: "0", transform: "translateY(18px) rotate(var(--slot-rot, 0deg))" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(var(--slot-rot, 0deg))" }
        }
      },
      animation: {
        "slot-in": "slotIn 0.55s cubic-bezier(0.22,1,0.36,1) both"
      }
    }
  },
  plugins: []
};