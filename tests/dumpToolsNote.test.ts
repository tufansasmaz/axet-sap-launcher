// Dump araçları (kucukler-3 madde 4). Ölçüm (2026-11-12, SAP'siz, iki ayrıştırıcı
// aynı örneklerle): yukarı akışın `adt_dumps(dump=...)`'ı bölüm seçimi ve
// `available` listesi veriyor ama hatanın düştüğü include + satırı yapısal
// vermiyor ve "Chosen variables"ı QA/PRD'de onay sormadan döndürüyor; ölçülen
// düz metin biçiminde hiç bölüm bulamıyor. `adt_dump_detail` (ntt_dump_detail.py)
// tutuluyor; notlar hangisinin ne zaman kullanılacağını söylüyor. Aynı gün: QA/PRD'de
// varsayılan dışı bölümler (Chosen variables, Contents of system fields…) kodla GR_PII'ye
// bağlandı (ntt_dump_detail.gate_adt_dumps); notlar artık "kodla zorlanıyor" diyor.
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
    // 2026-11-12: adt_dumps'ın değer bölümleri artık kodla GR_PII'ye bağlı (ntt_dump_detail.gate_adt_dumps).
    expect(ro).not.toContain("with no `GR_PII` approval");
    expect(ro).toContain("needs the same `GR_PII` approval (enforced in code)");
  });

  it("sap-adt tablosu ve sap-incident notu varsayılanı adt_dump_detail, ek bölüm için adt_dumps(dump=...) diyor", () => {
    const adt = read("sap-adt", "SKILL.md");
    expect(adt).toContain("| Inside one dump (NTT Studio default): error analysis, source extract, include + line | `adt_dump_detail`");
    const inc = read("sap-incident", "SKILL.md");
    expect(inc).toContain("Başka bir bölüm gerekirse `adt_dumps(dump=...)`");
    expect(adt).not.toContain("without the `GR_PII` approval");
    expect(adt).toContain("needs the same `GR_PII` approval (enforced in code)");
    expect(inc).not.toContain("onay sormadan döndürür");
    expect(inc).toContain("aynı `GR_PII` onayını ister (kodla zorlanıyor)");
  });

  it("kullanım rehberi dump alan değerlerinin QA/PRD'de onaya bağlı olduğunu söylüyor", () => {
    const guide = readFileSync(path.join(__dirname, "..", "KULLANIM-REHBERI.md"), "utf8");
    expect(guide).toContain("**Dump'taki alan değerleri (QA/PRD)**");
  });

  it("salt okunur yüzeyde dump okuma her kademede açık kalıyor (kullanıcı kararı 2026-10-15)", () => {
    const manager = readFileSync(path.join(__dirname, "..", "app-electron", "main", "adtReadonlyServerManager.ts"), "utf8");
    expect(manager).toContain('env.ADT_RO_ALLOW_DUMPS = "true";');
    expect(manager).toContain('env.ADT_RO_ALLOW_DUMP_DETAIL = "true";');
  });
});
