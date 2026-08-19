/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "var(--base-950)",
          900: "var(--base-900)",
          800: "var(--base-800)",
          700: "var(--base-700)",
          600: "var(--base-600)"
        },
        accent: {
          500: "#6d5efc",
          400: "#8b7dff"
        },
        slate: {
          100: "var(--ink-100)",
          200: "var(--ink-200)",
          300: "var(--ink-300)",
          400: "var(--ink-400)",
          500: "var(--ink-500)"
        },
        white: "var(--ink-strong)"
      }
    }
  },
  plugins: []
};
