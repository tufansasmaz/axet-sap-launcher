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
          cyan: withOpacity("--accent-cyan-rgb"),
          // Accent ZEMİN üzerindeki metin/ikon rengi (`text-accent-on`).
          // Neden `text-white` olmadığı için bkz. src/index.css'teki
          // --accent-on-rgb açıklaması (açık temada 2.89:1 kontrast hatası).
          on: withOpacity("--accent-on-rgb")
        },
        slate: {
          100: withOpacity("--ink-100-rgb"),
          200: withOpacity("--ink-200-rgb"),
          300: withOpacity("--ink-300-rgb"),
          400: withOpacity("--ink-400-rgb"),
          500: withOpacity("--ink-500-rgb"),
          // 600 tanımlı DEĞİLDİ — `text-slate-600` yazan yerler sessizce
          // Tailwind'in kendi #475569'unu alıyor, yani tema değişkenlerini
          // tamamen atlıyordu (açık temada yanlış tonda görünüyordu).
          600: withOpacity("--ink-600-rgb")
        },
        white: withOpacity("--ink-strong-rgb")
      },

      // KÖŞE YARIÇAPI ÖLÇEĞİ — tasarım dilinin tek kaynağı (2026-09-06).
      //
      // "Modern SaaS" dilinin kuralı 6px'lik sakin bir köşe. Ama uygulamada
      // yarıçap 36 bileşene dağılmış durumdaydı: `rounded-sm` 52, bare
      // `rounded` 49, `rounded-md` 104, `rounded-lg` 41, `rounded-xl` 19 kez.
      // Yani aynı ekranda 2px'lik keskin bir kutu ile 12px'lik yuvarlak bir
      // kart yan yana durabiliyordu.
      //
      // Bunları tek tek değiştirmek yerine ÖLÇEĞİN KENDİSİ daraltıldı:
      // Tailwind'in varsayılan 2/4/6/8/12/16/24 merdiveni 4/6/6/8/10/12/16'ya
      // çekildi. Sonuç: hiçbir bileşene dokunmadan tüm uygulama aynı dile
      // geçti ve bundan sonra hangi sınıf yazılırsa yazılsın sonuç dilin
      // içinde kalıyor. `rounded` ile `rounded-md`nin AYNI değeri vermesi
      // kasıtlı — ikisi arasındaki seçim artık görsel bir fark yaratmıyor.
      //
      // `full` dokunulmadı: rozetler, avatarlar ve durum noktaları hap
      // biçiminde kalmalı.
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
        "3xl": "16px"
      }
    }
  },
  plugins: []
};
