// Tur 7: lider komutlarının saf kuralları (ayrıştırma, rol, motor yetkisi, görev kimliği, sonuç satırı).
import { describe, expect, it } from "vitest";
import {
  engineRank,
  extractLeadResult,
  isLeadRole,
  isLeadTaskId,
  leadHint,
  leadTaskPrompt,
  newLeadTaskId,
  normalizeLeadMax,
  parseLeadArgs,
  pickSpawnEngine,
  roleKeyOf,
  spawnRoleLabel
} from "../app-electron/shared/leadCommands";
import { sanitizeFlowEvents } from "../app-electron/shared/flowHistory";
import { readAgentSpec } from "../app-electron/shared/agentTypes";

describe("parseLeadArgs", () => {
  it("spawn: rol, ad, motor, görev; Türkçe harfsiz bayraklar da", () => {
    expect(parseLeadArgs(["spawn", "--rol", "Geliştirici", "--ad", "Ali", "--motor", "claude", "--gorev", "README yaz"])).toEqual({
      cmd: "spawn",
      role: "developer",
      roleText: "Geliştirici",
      name: "Ali",
      engine: "claude",
      task: "README yaz"
    });
    // PowerShell tırnaksız metni böler: bayrak değeri bir sonraki bayrağa kadar birleşir.
    const r = parseLeadArgs(["spawn", "--görev", "basit", "bir", "test", "yaz", "--rol", "test"]);
    expect(r).toMatchObject({ cmd: "spawn", role: "test", task: "basit bir test yaz", engine: null, name: "" });
  });

  it("spawn rolsüz: kullanım hatası", () => {
    expect(parseLeadArgs(["spawn", "--ad", "x"])).toHaveProperty("error");
  });

  it("assign / wait / status / close", () => {
    expect(parseLeadArgs(["assign", "Ali", "testleri", "yaz"])).toEqual({ cmd: "assign", to: "Ali", text: "testleri yaz" });
    expect(parseLeadArgs(["assign", "Ali", '"README yaz"'])).toEqual({ cmd: "assign", to: "Ali", text: "README yaz" });
    expect(parseLeadArgs(["assign", "Ali"])).toHaveProperty("error");
    expect(parseLeadArgs(["wait", "G-ab12"])).toEqual({ cmd: "wait", id: "G-ab12", timeoutS: 25 });
    expect(parseLeadArgs(["wait", "G-ab12", "--sure", "9999"])).toEqual({ cmd: "wait", id: "G-ab12", timeoutS: 600 });
    expect(parseLeadArgs(["wait", "G-ab12", "--sure", "1"])).toEqual({ cmd: "wait", id: "G-ab12", timeoutS: 5 });
    expect(parseLeadArgs(["wait", "rm -rf"])).toHaveProperty("error");
    expect(parseLeadArgs(["status"])).toEqual({ cmd: "status" });
    expect(parseLeadArgs(["close", "Test", "2"])).toEqual({ cmd: "close", to: "Test 2" });
    expect(parseLeadArgs(["close"])).toHaveProperty("error");
  });

  it("bilinmeyen komut ve bozuk girdi: kullanım", () => {
    expect(parseLeadArgs(["format"])).toHaveProperty("error");
    expect(parseLeadArgs("spawn")).toHaveProperty("error");
    expect(parseLeadArgs([1, 2])).toHaveProperty("error");
  });
});

describe("roller", () => {
  it("Lider iki dilde ve harf farkı gözetmeden", () => {
    for (const r of ["Lider", "LİDER", "lead", "Lead", " leader "]) expect(isLeadRole(r)).toBe(true);
    for (const r of ["", "Geliştirici", "Liderlik", undefined, null]) expect(isLeadRole(r)).toBe(false);
    expect(roleKeyOf("GELİŞTİRİCİ")).toBe("developer");
    expect(roleKeyOf("inceleme")).toBe("review");
  });

  it("lider kendini çoğaltamaz; hazır rol dile göre etiket, serbest rol olduğu gibi", () => {
    expect(spawnRoleLabel({ role: "lead", roleText: "Lider" }, "tr")).toHaveProperty("error");
    expect(spawnRoleLabel({ role: "developer", roleText: "dev" }, "tr")).toEqual({ label: "Geliştirici", preset: true });
    expect(spawnRoleLabel({ role: "developer", roleText: "dev" }, "en")).toEqual({ label: "Developer", preset: true });
    expect(spawnRoleLabel({ role: null, roleText: "Veri göçü" }, "tr")).toEqual({ label: "Veri göçü", preset: false });
  });
});

describe("motor yetkisi (yalnız aşağı)", () => {
  it("sıralama: axet-code (-y) > öteki motorlar; ozel yok", () => {
    expect(engineRank("axet-code")).toBe(2);
    expect(engineRank("claude")).toBe(1);
    expect(engineRank("ozel")).toBeNull();
  });

  it("axet-code lideri her motoru açar; claude lideri axet-code (-y) açamaz", () => {
    expect(pickSpawnEngine("axet-code", "claude", null)).toEqual({ ok: true, engine: "claude" });
    expect(pickSpawnEngine("claude", "axet-code", null)).toMatchObject({ ok: false });
    expect(pickSpawnEngine("axet-code", "ozel", null)).toMatchObject({ ok: false });
    expect(pickSpawnEngine("axet-code", "bash", null)).toMatchObject({ ok: false });
  });

  it("istenmezse Araçlar'daki varsayılan; o yetkiyi aşıyorsa liderin motoru", () => {
    expect(pickSpawnEngine("axet-code", null, "gemini")).toEqual({ ok: true, engine: "gemini" });
    expect(pickSpawnEngine("claude", null, "axet-code")).toEqual({ ok: true, engine: "claude" });
    expect(pickSpawnEngine("claude", null, "ozel")).toEqual({ ok: true, engine: "claude" });
    expect(pickSpawnEngine("ozel", null, null)).toMatchObject({ ok: false });
  });
});

describe("görev kimliği ve sonuç satırı", () => {
  it("kimlik biçimi", () => {
    let i = 0;
    const seq = [0, 0.5, 0.99, 0.1];
    const id = newLeadTaskId(() => seq[i++ % seq.length]);
    expect(isLeadTaskId(id)).toBe(true);
    expect(id).toBe("G-as9d");
  });

  it("istemin yankısı sonuç sayılmıyor; ajanın yazdığı satır sayılıyor", () => {
    const prompt = leadTaskPrompt("Ayşe", "G-ab12", "README yaz");
    expect(prompt).toContain("[G-ab12]");
    expect(extractLeadResult(prompt, "G-ab12")).toBeNull();
    const out = `${prompt}\r\n\u001b[32mtamam\u001b[0m\r\nGOREV-SONUC G-ab12: README.md yazildi, 3 bolum\r\n`;
    expect(extractLeadResult(out, "G-ab12")).toBe("README.md yazildi, 3 bolum");
  });

  it("başka görevin kimliği eşleşmiyor; son satır kazanır", () => {
    const text = "GOREV-SONUC G-zz99: yanlis\nGOREV-SONUC G-ab12: ilk\nGOREV-SONUC G-ab12 : son │";
    expect(extractLeadResult(text, "G-ab12")).toBe("son");
    expect(extractLeadResult(text, "G-qq11")).toBeNull();
    expect(extractLeadResult(null, "G-ab12")).toBeNull();
  });
});

describe("rehber ve ayar", () => {
  it("rehber tek satır, komutları ve sınırı anıyor; kapalıyken spawn yok", () => {
    const on = leadHint(4, true);
    expect(on).not.toMatch(/[\r\n]/);
    expect(on).toContain("ntt-team spawn");
    expect(on).toContain("en cok 4");
    expect(leadHint(4, false)).not.toContain("ntt-team spawn");
    expect(on.length).toBeLessThan(1000);
  });

  it("rehber iş bitince ajanları kapattırmıyor; önce boştaki ajanı kullandırıyor", () => {
    const on = leadHint(4, true);
    expect(on).not.toMatch(/is bitince[^;.]*close/);
    expect(on).toContain("kapatma");
    expect(on).toContain("bostaki");
    // Kapatma yalnız kullanıcı isterse.
    expect(on).toContain("kullanici isterse");
    expect(on.length).toBeLessThan(1000);
  });

  it("sınır 1..8, değilse 4", () => {
    expect(normalizeLeadMax(6)).toBe(6);
    expect(normalizeLeadMax(0)).toBe(4);
    expect(normalizeLeadMax(9)).toBe(4);
    expect(normalizeLeadMax("3")).toBe(4);
  });
});

describe("kalıcılık alanları", () => {
  it("Akış olayı act ve toPaneId'yi taşıyor, geçersizini atıyor", () => {
    const [a, b] = sanitizeFlowEvents([
      { at: 1, kind: "relay", paneId: "p1", name: "Ayşe", detail: "Ali (Test)", act: "spawn", toPaneId: "p2" },
      { at: 2, kind: "relay", paneId: "p1", name: "x", detail: "y", act: "hack", toPaneId: 5 }
    ]);
    expect(a).toMatchObject({ act: "spawn", toPaneId: "p2" });
    expect(b.act).toBeUndefined();
    expect(b.toPaneId).toBeUndefined();
  });

  it("ajan kaydı spawnedBy'ı geçerliyse tutuyor", () => {
    expect(readAgentSpec({ engine: "claude", role: "Test", roleKind: "preset", spawnedBy: "abc-123" })?.spawnedBy).toBe("abc-123");
    expect(readAgentSpec({ engine: "claude", role: "Test", roleKind: "preset", spawnedBy: "../x" })?.spawnedBy).toBeUndefined();
  });
});
