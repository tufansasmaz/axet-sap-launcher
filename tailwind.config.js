/** @type {import('tailwindcss').Config} */

// Renkler CSS'te "R G B" (boşluk ayrılmış triplet, bkz. src/index.css) olarak
// tanımlı — bu fonksiyon Tailwind'in resmi CSS-variable+opacity deseni
// (https://tailwindcss.com/docs/customizing-colors#using-css-variables):
// `rgb(var(--x-rgb) / <alpha>)` üretir, böylece `bg-accent-500/20`,
// `ring-accent-400/70`, `bg-base-900/40` gibi opacity varyantları düzgün
// derlenir (renk düz "var(--x)" hex string olsaydı Tailwind bu varyantları
// HİÇ üretemezdi — projede bir süre fark edilmeden bu şekilde kırık kaldı).
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variableName}))`;
    }
    return `rgb(var(${variableName}) / ${opacityValue})`;
  };
}

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: withOpacity("--base-950-rgb"),
          900: withOpacity("--base-900-rgb"),
          850: withOpacity("--base-850-rgb"),
          800: withOpacity("--base-800-rgb"),
          700: withOpacity("--base-700-rgb"),
          600: withOpacity("--base-600-rgb")
        },
        accent: {
          600: withOpacity("--accent-600-rgb"),
          500: withOpacity("--accent-500-rgb"),
          400: withOpacity("--accent-400-rgb"),
          cyan: withOpacity("--accent-cyan-rgb")
        },
        slate: {
          100: withOpacity("--ink-100-rgb"),
          200: withOpacity("--ink-200-rgb"),
          300: withOpacity("--ink-300-rgb"),
          400: withOpacity("--ink-400-rgb"),
          500: withOpacity("--ink-500-rgb")
        },
        white: withOpacity("--ink-strong-rgb")
      }
    }
  },
  plugins: []
};
