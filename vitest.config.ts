import { defineConfig } from "vitest/config";

// Vitest bugüne kadar yapılandırmasız çalışıyordu: testlerin tamamı ana süreç
// modülleriydi, düz TypeScript'ti, varsayılanlar yetiyordu.
//
// Bileşen testi iki şey ekliyor:
//
//   - JSX. Vitest kendi başına `tsconfig.web.json`'ı OKUMUYOR, o yüzden
//     `jsx: "react-jsx"` ayarı ona geçmiyordu ve esbuild klasik dönüşümü
//     seçip `React is not defined` diye patlıyordu. Uygulamanın kendisi
//     otomatik dönüşüm kullanıyor (hiçbir bileşen React'i import etmiyor),
//     test de aynısını kullanmak zorunda.
//   - jsdom. YALNIZCA bileşen testlerinde: dosya başındaki
//     `// @vitest-environment jsdom` satırıyla. Genel varsayılan node
//     kalıyor, çünkü ana süreç testlerinin her birine bir tarayıcı ortamı
//     kurmak onları yavaşlatır ve `node:fs` testlerine hiçbir şey katmaz.
export default defineConfig({
  esbuild: { jsx: "automatic" }
});
