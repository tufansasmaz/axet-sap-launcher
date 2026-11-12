// Dump araçları (kucukler-3 madde 4). Ölçüm (2026-11-12, SAP'siz, iki ayrıştırıcı
// aynı örneklerle): yukarı akışın `adt_dumps(dump=...)`'ı bölüm seçimi ve
// `available` listesi veriyor ama hatanın düştüğü include + satırı yapısal
// vermiyor ve "Chosen variables"ı QA/PRD'de onay sormadan döndürüyor; ölçülen
// düz metin biçiminde hiç bölüm bulamıyor. `adt_dump_detail` (ntt_dump_detail.py)
// tutuluyor; notlar hangisinin ne zaman kullanılacağını söylüyor.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SKILLS = path.join(__dirname, "..", "resources", "sap-toolkit", "sap-consultant", "skills");
const read = (...p: string[]) => readFileSync(path.join(SKILLS, ...p), "utf8").replace(/\r\n/g, "\n");

describe("dump araçları — hangisi ne zaman", () => {
  it("sap-adt-readonly notu iki aracın aynı şeyi okuduğunu söylemiyor, farkı söylüyor", () => {
    const ro = read("sap-adt-readonly", "SKILL.md");
    expect(ro).not.toContain("reads the same chapters");
    expect(ro).toContain("Use `adt_dump_detail` first");
  });

  it("sap-adt tablosu ve sap-incident notu varsayılanı adt_dump_detail, ek bölüm için adt_dumps(dump=...) diyor", () => {
    const adt = read("sap-adt", "SKILL.md");
    expect(adt).toContain("| Inside one dump (NTT Studio default): error analysis, source extract, include + line | `adt_dump_detail`");
    const inc = read("sap-incident", "SKILL.md");
    expect(inc).toContain("Başka bir bölüm gerekirse `adt_dumps(dump=...)`");
    expect(inc).toContain("QA/PRD'de `sections` ile alan değeri okuma");
  });

  it("salt okunur yüzeyde dump okuma her kademede açık kalıyor (kullanıcı kararı 2026-10-15)", () => {
    const manager = readFileSync(path.join(__dirname, "..", "app-electron", "main", "adtReadonlyServerManager.ts"), "utf8");
    expect(manager).toContain('env.ADT_RO_ALLOW_DUMPS = "true";');
    expect(manager).toContain('env.ADT_RO_ALLOW_DUMP_DETAIL = "true";');
  });
});
