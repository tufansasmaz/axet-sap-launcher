import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * electron-vite'ın CommonJS gölgesi (`esmShimPlugin`) demetteki SON statik
 * `import` eşleşmesinin bittiği yere `import __cjs_mod__ from 'node:module'`
 * bloğunu ekliyor. Eşleşmeyi bulan düzenli ifade AST'ye bakmıyor — düz metinde
 * arıyor. Dolayısıyla bir METİN İÇİNDE geçen
 *
 *     ...relative `lib/redact.py` import'u kurulu yolda da çözülüyor...
 *
 * gibi bir Türkçe ek de "statik import" sayılıyor: `import` + kesme işareti,
 * ardından bir sonraki kesme işaretine kadar her şey "specifier" oluyor.
 * Blok o yüzden bir dizge literalinin ORTASINA giriyor ve build
 *
 *     [vite:esbuild-transpile] Unterminated string literal
 *
 * ile patlıyor — hem de bizim satırımızı değil, çok uzaktaki başka bir satırı
 * göstererek. 2026-09-08'de tam olarak bu oldu ve teşhis ara demeti diske
 * döküp bulmayı gerektirdi.
 *
 * Kural bu yüzden basit tutuluyor: gerçek bir çıplak `import "..."` HER ZAMAN
 * satır başındadır. Satırın ortasında `import` + tırnak/kesme gören her şey
 * bir metnin içindedir ve tuzaktır.
 *
 * Ön koşul eklentinin kendi düzenli ifadesinden birebir alınıyor: `import`in
 * HEMEN ÖNÜNDE boşluk, `;` ya da satır başı olmalı. Bu şart olmadan
 * `["import", "in"]` gibi bir anahtar kelime listesi de yakalanırdı — oysa
 * eklenti orayı hiç görmüyor.
 */
const TRAP = /(?<=[\s;]|^)import\s*["'’]/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe("electron-vite CommonJS golgesi tuzagi", () => {
  const files = [...sourceFiles("app-electron"), ...sourceFiles("src")];

  it("taranacak dosya bulur", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("hicbir kaynakta satir ortasinda `import` + tirnak yok", () => {
    const hits: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        const match = TRAP.exec(line);
        if (!match) return;
        // Gerçek çıplak import: satırın başında (yalnızca boşluk önünde).
        if (/^\s*import\s*["']/.test(line)) return;
        hits.push(`${file}:${index + 1} — ${line.trim().slice(0, 80)}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
