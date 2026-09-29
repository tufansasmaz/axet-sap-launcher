// JetBrains Mono gömülü geliyor (grafit spec §4.1).
//
// Inter'deki düzenin aynısı: iki woff2 (latin + latin-ext; Türkçe'nin ğ/ş/İ
// harfleri latin-ext'te), yanında lisans, npm bağımlılığı yok. Terminal
// (xterm) BİLEREK Consolas'ta: hücre genişliğini açılışta ölçüyor, yazı tipi
// geç yüklenirse karakterler kayar.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");

describe("JetBrains Mono", () => {
  const css = read("src", "index.css");
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
    .map((m) => m[1])
    .filter((body) => body.includes('"JetBrains Mono Variable"'));

  it("iki @font-face kuralı var ve dosyaları diskte", () => {
    expect(faces).toHaveLength(2);
    for (const body of faces) {
      const url = /url\("\.\/([^"]+)"\)/.exec(body);
      expect(url).not.toBeNull();
      expect(existsSync(path.join(ROOT, "src", url![1]))).toBe(true);
      expect(body).toContain("font-display: swap");
      expect(body).toContain("unicode-range");
    }
    expect(faces.some((b) => b.includes("jetbrains-mono-latin-ext-wght-normal.woff2"))).toBe(true);
  });

  it("lisans dosyası yanında", () => {
    expect(read("src", "assets", "fonts", "JetBrainsMono-LICENSE.txt")).toContain("SIL Open Font License");
  });

  it("Tailwind mono yığını JetBrains Mono ile başlıyor", () => {
    expect(read("tailwind.config.js")).toMatch(/mono:\s*\[\s*"JetBrains Mono Variable"/);
  });

  it("paket bağımlılığı bırakılmadı", () => {
    expect(read("package.json")).not.toContain("@fontsource");
  });

  it("terminal Consolas'ta kalıyor", () => {
    const terminal = read("src", "components", "EmbeddedTerminal.tsx");
    expect(terminal).toContain("Consolas");
    expect(terminal).not.toContain("JetBrains");
  });
});
