// Lider istemi ve plan ayrıştırıcı (spec 2026-10-18 gorev-panosu §3, §7, §10). Saf.
import { describe, expect, it } from "vitest";
import { buildLeadPrompt, extractFirstJsonObject, parseLeadPlan } from "../app-electron/shared/boardPlan";

const plan = (subtasks: unknown[]) => JSON.stringify({ subtasks });
const item = (over: Record<string, unknown> = {}) => ({ title: "Veri modeli", prompt: "İade tablosunu ekle.", role: "", dependsOn: [], ...over });

describe("extractFirstJsonObject", () => {
  it("düz metindeki ilk nesne; öncesi ve sonrası atılıyor", () => {
    expect(extractFirstJsonObject('Plan şu: {"a":1} bitti {"b":2}')).toBe('{"a":1}');
  });

  it("```json bloğu önce; dize içindeki süslü parantez sayılmıyor", () => {
    const text = 'Açıklama {değil}\n```json\n{"subtasks":[{"title":"a } b","prompt":"x \\" {"}]}\n```\n';
    expect(extractFirstJsonObject(text)).toBe('{"subtasks":[{"title":"a } b","prompt":"x \\" {"}]}');
  });

  it("nesne yoksa ya da kapanmıyorsa null", () => {
    expect(extractFirstJsonObject("JSON yok")).toBeNull();
    expect(extractFirstJsonObject('{"subtasks": [')).toBeNull();
  });
});

describe("parseLeadPlan", () => {
  it("geçerli plan: alanlar, bağımlılıklar tekilleşiyor, rol ve başlık kırpılıyor", () => {
    const result = parseLeadPlan(
      "```json\n" +
        plan([
          item({ title: "A".repeat(85), role: "  geliştirici  " }),
          item({ title: "Test", prompt: "Testleri yaz.", role: "R".repeat(45), dependsOn: [0, 0] })
        ]) +
        "\n```"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtasks[0]).toEqual({ title: "A".repeat(80), prompt: "İade tablosunu ekle.", roleHint: "geliştirici", dependsOn: [] });
    expect(result.subtasks[1].roleHint).toBe("R".repeat(40));
    expect(result.subtasks[1].dependsOn).toEqual([0]);
  });

  it("rol ve dependsOn yazılmamışsa boş", () => {
    const result = parseLeadPlan(plan([{ title: "A", prompt: "B" }]));
    expect(result).toEqual({ ok: true, subtasks: [{ title: "A", prompt: "B", roleHint: "", dependsOn: [] }] });
  });

  it("JSON yok / bozuk JSON", () => {
    expect(parseLeadPlan("Bu hedefi bölemem.")).toEqual({ ok: false, error: "noJson" });
    expect(parseLeadPlan("{subtasks: [}")).toEqual({ ok: false, error: "badJson" });
  });

  it("dizi yok, boş ya da 8'den fazla", () => {
    expect(parseLeadPlan('{"plan": []}')).toEqual({ ok: false, error: "noSubtasks" });
    expect(parseLeadPlan(plan([]))).toEqual({ ok: false, error: "noSubtasks" });
    expect(parseLeadPlan(plan(Array.from({ length: 9 }, () => item())))).toEqual({ ok: false, error: "tooMany" });
  });

  it("alan hataları: boş istem, 4000'i aşan istem, nesne olmayan öğe, sayı rol", () => {
    expect(parseLeadPlan(plan([item({ prompt: "   " })]))).toEqual({ ok: false, error: "badField" });
    expect(parseLeadPlan(plan([item({ prompt: "x".repeat(4001) })]))).toEqual({ ok: false, error: "badField" });
    expect(parseLeadPlan(plan(["metin"]))).toEqual({ ok: false, error: "badField" });
    expect(parseLeadPlan(plan([item({ role: 3 })]))).toEqual({ ok: false, error: "badField" });
  });

  it("geçersiz bağımlılık: aralık dışı, kendisi, dize indeks, dizi değil", () => {
    expect(parseLeadPlan(plan([item({ dependsOn: [1] })]))).toEqual({ ok: false, error: "badDependency" });
    expect(parseLeadPlan(plan([item(), item({ dependsOn: [1] })]))).toEqual({ ok: false, error: "badDependency" });
    expect(parseLeadPlan(plan([item(), item({ dependsOn: ["0"] })]))).toEqual({ ok: false, error: "badDependency" });
    expect(parseLeadPlan(plan([item({ dependsOn: 0 })]))).toEqual({ ok: false, error: "badDependency" });
  });

  it("döngü", () => {
    expect(parseLeadPlan(plan([item({ dependsOn: [1] }), item({ dependsOn: [0] })]))).toEqual({ ok: false, error: "cycle" });
  });
});

describe("buildLeadPrompt", () => {
  it("başlık, hedef, kurallar ve tekilleşmiş roller", () => {
    const text = buildLeadPrompt({ title: "İade", goal: "Ödeme modülüne iade akışı ekle", roles: ["coder", " coder ", "", "test"] });
    expect(text).toContain("İade");
    expect(text).toContain("Ödeme modülüne iade akışı ekle");
    expect(text).toContain("Dosya DEĞİŞTİRME, yalnız oku ve planla.");
    expect(text).toContain('{"subtasks":[{"title":"…","prompt":"…","role":"…","dependsOn":[0]}]}');
    expect(text).toContain("En fazla 8 alt görev");
    expect(text).toContain("rolleri: coder, test");
  });

  it("rol yoksa açıkça yazıyor", () => {
    expect(buildLeadPrompt({ title: "A", goal: "B", roles: [] })).toContain("(rol tanımlı değil)");
  });
});
