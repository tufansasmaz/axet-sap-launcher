// Tur 13: "Kimlik ve kurallar" — kullanıcının yazdığı ekip ve ajan kuralları;
// ajan açılışında başlangıç bağlamına kısa ve sınırlı ekleniyor.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RULES_DIGEST_MAX, RULES_TEXT_MAX, rulesDigest, sanitizeRules } from "../app-electron/shared/memoryRules";
import { createRulesStore } from "../app-electron/main/memoryRulesStore";

describe("sanitizeRules", () => {
  it("metinleri kırpar, bozuk ajan kayıtlarını atar, boş ajan metnini düşürür", () => {
    const r = sanitizeRules({ team: "  Türkçe yaz.  ", agents: { p1: "Test yaz", p2: "   ", "../x": "a", p3: 5 } });
    expect(r).toEqual({ team: "Türkçe yaz.", agents: { p1: "Test yaz" } });
    expect(sanitizeRules(null)).toEqual({ team: "", agents: {} });
    expect(sanitizeRules({ team: "x".repeat(RULES_TEXT_MAX + 50) }).team).toHaveLength(RULES_TEXT_MAX);
  });

  it("gizli süzgeç uygulanıyor", () => {
    const r = sanitizeRules({ team: "anahtar sk-abc" }, (t) => t.replace(/sk-[a-z]+/g, "[gizli]"));
    expect(r.team).toBe("anahtar [gizli]");
  });
});

describe("rulesDigest", () => {
  it("ekip + ajana özel; tek satır; yoksa boş", () => {
    const d = rulesDigest({ team: "Türkçe yaz.\nSAP'ye yazma.", agents: { p1: "Yalnız test yaz." } }, "p1");
    expect(d).toBe("[Kimlik ve kurallar] Ekip: Türkçe yaz. SAP'ye yazma. | Sana ozel: Yalnız test yaz.");
    expect(rulesDigest({ team: "", agents: { p2: "x" } }, "p1")).toBe("");
    expect(rulesDigest({ team: "A", agents: {} }, "p1")).toBe("[Kimlik ve kurallar] Ekip: A");
  });

  it("sınırı aşınca kırpılıyor (…)", () => {
    const d = rulesDigest({ team: "k".repeat(2_000), agents: {} }, "p1");
    expect(d.length).toBeLessThanOrEqual(RULES_DIGEST_MAX);
    expect(d.endsWith("…")).toBe(true);
  });
});

describe("rules store", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "rules-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("kaydet → oku aynı; geçici dosya yok; gizli süzgeçli yazım", () => {
    const store = createRulesStore(() => dir);
    expect(store.set("w1", { team: "Kural", agents: { p1: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U" } })).toBe("ok");
    expect(readdirSync(dir)).toEqual(["w1.json"]);
    expect(readFileSync(path.join(dir, "w1.json"), "utf-8")).not.toContain("eyJhbGciOiJIUzI1NiJ9.eyJzdWIi");
    expect(createRulesStore(() => dir).get("w1").team).toBe("Kural");
  });

  it("geçersiz alan kimliği, bozuk dosya: boş kurallar, fırlatmıyor", () => {
    const store = createRulesStore(() => dir);
    expect(store.set("../x", { team: "a", agents: {} })).toBe("invalid");
    writeFileSync(path.join(dir, "w2.json"), "{bozuk", "utf-8");
    expect(store.get("w2")).toEqual({ team: "", agents: {} });
    expect(store.get("yok")).toEqual({ team: "", agents: {} });
  });
});
