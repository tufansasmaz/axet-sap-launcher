// axet-code kesin okuyucusu: oturum veritabanından durum ve istem→oturum
// eşleme (spec 2026-10-17 ajan-alani §6.1). Veritabanı sahte; better-sqlite3
// vitest'te yüklenmiyor.
import { describe, expect, it, vi } from "vitest";
import type { AxetDbMessage, AxetPart } from "../app-electron/main/axetSessionDb";
import type { AgentRegistration } from "../app-electron/shared/agentTypes";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));

const { AxetReader, createSessionRegistry, deriveAxetState, keysOverlap, UNCONFIRMED_LIMIT_MS, ASKING_FREEZE_MAX_MS } = await import(
  "../app-electron/main/agentAxetReader"
);
const { createAgentReader } = await import("../app-electron/main/agentReaders");
const { GenericReader } = await import("../app-electron/main/agentGenericReader");
const { promptStartsWith } = await import("../app-electron/main/axetSessionDb");

const T0 = 1_700_000_000; // sn
const DB = "C:\\p\\.axet-code\\axet-code.db";

type Row = AxetDbMessage & { sessionId: string };
interface FakeDb {
  rows: Row[];
  broken: boolean;
  throws: boolean;
  missing: boolean;
}

let seq = 0;
const text = (t: string): AxetPart => ({ type: "text", data: { text: t } });
const finish = (reason: string): AxetPart => ({ type: "finish", data: { reason } });
const askCall = (id: string, options = ["Kırmızı", "Mavi"], multi = false): AxetPart => ({
  type: "tool_call",
  data: { id, name: "ask_user", finished: true, input: JSON.stringify({ question: "Hangi renk?", options: options.map((label) => ({ label })), multi_select: multi }) }
});
const result = (callId: string): AxetPart => ({ type: "tool_result", data: { tool_call_id: callId, content: "ok" } });
const msg = (sessionId: string, role: string, parts: AxetPart[], sec: number): Row => ({
  id: `m${++seq}`,
  sessionId,
  role,
  parts,
  createdAt: sec
});
const textOf = (m: AxetDbMessage) => m.parts.filter((p) => p.type === "text").map((p) => p.data?.text ?? "").join("");

function fakeDb(): FakeDb {
  return { rows: [], broken: false, throws: false, missing: false };
}

function port(db: FakeDb) {
  return {
    resolveDb: () => (db.missing ? null : DB),
    findSessions: (_path: string, since: number, needle: string) => {
      if (db.throws) throw new Error("database is locked");
      if (db.broken) return null;
      const ids = new Set<string>();
      for (const m of db.rows) if (m.role === "user" && m.createdAt >= since && promptStartsWith(textOf(m), needle)) ids.add(m.sessionId);
      return [...ids];
    },
    readMessages: (_path: string, sessionId: string, since: number) => {
      if (db.throws) throw new Error("database is locked");
      if (db.broken) return null;
      return db.rows.filter((m) => m.sessionId === sessionId && m.createdAt >= since);
    }
  };
}

function scenario() {
  const db = fakeDb();
  const registry = createSessionRegistry();
  const clock = { ms: (T0 + 10) * 1000 };
  const make = (agentId: string, override: Partial<ReturnType<typeof port>> = {}) => {
    const onMatch = vi.fn();
    const generic = new GenericReader({ command: "axet-code -y", now: () => clock.ms });
    const dbPort = { ...port(db), ...override };
    const reader = new AxetReader({ agentId, cwd: "C:\\p", startedAtMs: T0 * 1000, port: dbPort, registry, generic, now: () => clock.ms, onMatch });
    return { reader, onMatch };
  };
  return { db, registry, clock, make };
}

describe("deriveAxetState", () => {
  it("son mesaj kullanıcıdan ya da araç sonucuysa çalışıyor", () => {
    expect(deriveAxetState([msg("S", "user", [text("iş")], T0)]).state).toBe("running");
    expect(deriveAxetState([msg("S", "tool", [result("c0")], T0)]).state).toBe("running");
  });

  it("finish yok ya da tool_use ise çalışıyor; end_turn boşta; error hata", () => {
    expect(deriveAxetState([msg("S", "assistant", [text("yazıyor")], T0)]).state).toBe("running");
    expect(deriveAxetState([msg("S", "assistant", [finish("tool_use")], T0)]).state).toBe("running");
    expect(deriveAxetState([msg("S", "assistant", [text("bitti"), finish("end_turn")], T0 + 5)])).toEqual({
      state: "idle",
      detail: "end_turn",
      // Ajanlar-ux §3: boşta durumu son cevabın özetini de taşıyor.
      reply: "bitti",
      lastActivitySec: T0 + 5
    });
    expect(deriveAxetState([msg("S", "assistant", [finish("error")], T0)])).toMatchObject({ state: "error", detail: "error" });
  });

  it("son cevap: son kullanıcı mesajından sonraki metinli asistan mesajı; gizli süzülüyor; eskisi taşınmıyor", () => {
    const d = deriveAxetState([
      msg("S", "user", [text("eski iş")], T0),
      msg("S", "assistant", [text("eski cevap"), finish("end_turn")], T0 + 1),
      msg("S", "user", [text("yeni iş")], T0 + 2),
      msg("S", "assistant", [text("Rapor hazır. password=Gizli12345"), finish("tool_use")], T0 + 3),
      msg("S", "tool", [result("c9")], T0 + 4),
      msg("S", "assistant", [finish("end_turn")], T0 + 5)
    ]);
    expect(d.state).toBe("idle");
    expect(d.reply).toContain("Rapor hazır.");
    expect(d.reply).not.toContain("Gizli12345");
    const none = deriveAxetState([msg("S", "user", [text("iş")], T0), msg("S", "assistant", [finish("end_turn")], T0 + 1)]);
    expect(none.reply).toBeUndefined();
  });

  it("sonucu gelmemiş tamamlanmış ask_user soru soruyor; seçenekler ve zaman", () => {
    const d = deriveAxetState([msg("S", "user", [text("iş")], T0), msg("S", "assistant", [askCall("c1"), finish("tool_use")], T0 + 3)]);
    expect(d.state).toBe("asking");
    expect(d.question).toEqual({ callId: "c1", question: "Hangi renk?", header: "", options: ["Kırmızı", "Mavi"], multiSelect: false, askedAt: (T0 + 3) * 1000 });
  });

  it("cevaplanmış ya da arkasından kullanıcı mesajı gelmiş soru açık sayılmıyor", () => {
    const asked = msg("S", "assistant", [askCall("c1"), finish("tool_use")], T0);
    expect(deriveAxetState([asked, msg("S", "tool", [result("c1")], T0 + 1)]).state).toBe("running");
    expect(deriveAxetState([asked, msg("S", "user", [text("yeni iş")], T0 + 9)]).state).toBe("running");
  });

  it("boş liste boşta", () => {
    expect(deriveAxetState([])).toEqual({ state: "idle", lastActivitySec: null });
  });
});

describe("AxetReader — eşleme", () => {
  it("ilk istemden önce boşta ve tahmini", () => {
    const { make } = scenario();
    const { reader } = make("A");
    reader.poll();
    expect(reader.status()).toEqual({ state: "idle", source: "estimated", lastActivity: null });
  });

  it("engineReady genel okuyucudan: açılışta 'boşta ≈' olsa da motor çıktısı görülene kadar hazır değil", () => {
    const { make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("C:\\p>axet-code -y\r\n");
    expect(reader.status().state).toBe("idle");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("\x1b[2J axet-code v1.4");
    expect(reader.engineReady()).toBe(true);
  });

  // Ölçüm (Tur 2, .superpowers/olcum/gonder.cjs): axet-code 1.4.1 açılışta "Select
  // Tool / Choose your development tool" (yeni klasörde model seçimi de) gösteriyor.
  // O pencere açıkken yazılan istem kayboluyor: veritabanına hiç düşmüyor, okuyucu
  // bağlanamıyor ve ajan hep "tahmini" kalıyor. Pencere açıkken motor hazır değil.
  it("açılış seçim penceresi açıkken engineReady false; sohbet ekranı gelince true", () => {
    const { make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("C:\\p>axet-code -y\r\n");
    reader.feedOutput("\x1b[2J Select Tool \x1b[3;1H Choose your development tool \x1b[4;1H aXet.Code \x1b[9;1H enter confirm");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("\x1b[5;1H Codex (OpenAI) not installed");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("\x1b[2J To start, let's choose a provider and model. \x1b[3;1H > Find your fave");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("\x1b[2J New Session \x1b[40;1H tab focus chat • ctrl+j newline • ctrl+p commands");
    expect(reader.engineReady()).toBe(true);
  });

  // Tur 4: pencere açıkken durumda işaret (Akış mesajı kuyrukta bekler).
  it("seçim penceresi açıkken durum 'setup' işaretli; sohbet ekranı gelince kalkıyor", () => {
    const { make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("C:\\p>axet-code -y\r\n");
    reader.feedOutput("\x1b[2J Select Tool \x1b[3;1H Choose your development tool");
    expect(reader.status()).toMatchObject({ state: "idle", detail: "setup" });
    reader.feedOutput("\x1b[2J New Session \x1b[40;1H tab focus chat • ctrl+j newline • ctrl+p commands");
    expect(reader.status().detail).toBeUndefined();
  });

  it("seçim penceresi ve sohbet ekranı aynı parçadaysa sonuncusu geçerli; parça sınırı bölse de", () => {
    const { make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("C:\\p>axet-code -y\r\n");
    reader.feedOutput("ctrl+j newline \x1b[2J Choose your development ");
    reader.feedOutput("tool enter confirm");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("Choose your development tool \x1b[2J ctrl+p comm");
    reader.feedOutput("ands");
    expect(reader.engineReady()).toBe(true);
  });

  it("istem yazılınca oturuma bağlanıyor; durum kesin", () => {
    const { db, make } = scenario();
    const { reader, onMatch } = make("A");
    reader.submitLine("Raporu hazırla — lütfen");
    db.rows.push(msg("S1", "user", [text("Raporu hazırla lütfen")], T0 + 11), msg("S1", "assistant", [text("tamam"), finish("end_turn")], T0 + 12));
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(onMatch).toHaveBeenCalledWith("istem");
    expect(reader.status()).toEqual({ state: "idle", source: "exact", lastActivity: (T0 + 12) * 1000, detail: "end_turn", reply: "tamam" });
  });

  it("aynı klasörde iki ajan: her biri kendi oturumuna", () => {
    const { db, make } = scenario();
    const a = make("A");
    const b = make("B");
    a.reader.submitLine("Birinci işi yap");
    b.reader.submitLine("İkinci işi yap");
    db.rows.push(
      msg("S1", "user", [text("Birinci işi yap")], T0 + 11),
      msg("S2", "user", [text("İkinci işi yap")], T0 + 11),
      msg("S2", "assistant", [askCall("c9"), finish("tool_use")], T0 + 12)
    );
    a.reader.poll();
    b.reader.poll();
    expect(a.reader.binding()).toBe("S1");
    expect(b.reader.binding()).toBe("S2");
    expect(a.reader.status()).toMatchObject({ state: "running", source: "exact" });
    expect(b.reader.status()).toMatchObject({ state: "asking", source: "exact", question: { callId: "c9" } });
  });

  it("aynı istem iki ajanda: hiçbirine bağlanmıyor; ayrışan istemle ikisi de doğru oturuma", () => {
    const { db, make } = scenario();
    const a = make("A");
    const b = make("B");
    a.reader.submitLine("Testleri çalıştır");
    b.reader.submitLine("Testleri çalıştır");
    db.rows.push(msg("S1", "user", [text("Testleri çalıştır")], T0 + 11), msg("S2", "user", [text("Testleri çalıştır")], T0 + 11));
    a.reader.poll();
    b.reader.poll();
    expect(a.reader.binding()).toBeNull();
    expect(b.reader.binding()).toBeNull();
    expect(a.reader.status().source).toBe("estimated");
    expect(a.onMatch).toHaveBeenCalledWith("belirsiz");

    a.reader.submitLine("Yalnız birinci modül");
    db.rows.push(msg("S1", "user", [text("Yalnız birinci modül")], T0 + 20));
    a.reader.poll();
    b.reader.poll();
    expect(a.reader.binding()).toBe("S1");
    expect(b.reader.binding()).toBe("S2");
  });

  it("rakibin aynı istemi bekliyorsa tek aday görünse bile bağlanmıyor (mesajı henüz düşmemiş rakip)", () => {
    const { db, make } = scenario();
    const a = make("A");
    const b = make("B");
    a.reader.submitLine("Merhaba ajan");
    b.reader.submitLine("Merhaba ajan");
    // Yalnız B'nin mesajı düştü; A'nınki henüz yazılmadı.
    db.rows.push(msg("SB", "user", [text("Merhaba ajan")], T0 + 11));
    a.reader.poll();
    expect(a.reader.binding()).toBeNull();
    expect(a.reader.status().source).toBe("estimated");
  });

  it("başka ajanın sahiplendiği oturum aday sayılmıyor", () => {
    const { db, make } = scenario();
    const a = make("A");
    a.reader.submitLine("Ortak başlık uzun");
    db.rows.push(msg("S1", "user", [text("Ortak başlık uzun")], T0 + 11));
    a.reader.poll();
    expect(a.reader.binding()).toBe("S1");
    const b = make("B");
    b.reader.submitLine("Ortak başlık uzun");
    db.rows.push(msg("S2", "user", [text("Ortak başlık uzun")], T0 + 12));
    b.reader.poll();
    expect(b.reader.binding()).toBe("S2");
  });

  it("defter dışı sohbet oturumunda istemi İÇEREN mesaj önce düşse de bağ kurulmuyor", () => {
    // Sohbet ekranı aynı veritabanına yazıyor; mesajı ajanın istemini içeriyor
    // ama onunla başlamıyor.
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("devam et");
    db.rows.push(msg("SC", "user", [text("lütfen devam et ve raporu yaz")], T0 + 11));
    reader.poll();
    expect(reader.binding()).toBeNull();
    expect(reader.status().source).toBe("estimated");
  });

  it("ajanın kendi mesajı düşünce, aynı anda istemi içeren sohbet mesajı olsa da kendi oturumuna bağlanıyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("devam et");
    db.rows.push(msg("SC", "user", [text("lütfen devam et ve raporu yaz")], T0 + 11), msg("S1", "user", [text("devam et")], T0 + 11));
    reader.poll();
    expect(reader.binding()).toBe("S1");
  });

  it("em-dash içeren istem hâlâ eşleşiyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Raporu hazırla — hemen");
    db.rows.push(msg("S1", "user", [text("Raporu hazırla — hemen, ayrıntılı")], T0 + 11));
    reader.poll();
    expect(reader.binding()).toBe("S1");
  });

  it("bağı kuran istem bağlı oturumda doğrulanamazsa 30 sn sonra bağ çözülüyor", () => {
    // Arama ile okuma tutarsızsa (aday oturumda istem kullanıcı mesajı olarak
    // yok) bağ kalıcı olmamalı.
    const { db, clock, make } = scenario();
    const { reader } = make("A", { findSessions: () => ["SX"] });
    reader.submitLine("Bir şey yap");
    db.rows.push(msg("SX", "assistant", [text("bitti"), finish("end_turn")], T0 + 11));
    reader.poll();
    expect(reader.binding()).toBe("SX");
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBeNull();
    expect(reader.status().source).toBe("estimated");
  });

  it("eğik çizgi komutları ve kısa satırlar istem sayılmıyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("/model");
    reader.submitLine("ok");
    db.rows.push(msg("S1", "user", [text("/model ok")], T0 + 11));
    reader.poll();
    expect(reader.binding()).toBeNull();
    expect(reader.status()).toEqual({ state: "idle", source: "estimated", lastActivity: null });
  });
});

describe("AxetReader — bağdan sonra", () => {
  it("soru kutusuna yazılan cevap soruyu kapatınca bağ bozulmuyor", () => {
    // Serbest metin cevap tool_result olarak düşer; soru kapanınca satır düşer.
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Renk sor bana");
    db.rows.push(msg("S1", "user", [text("Renk sor bana")], T0 + 11), msg("S1", "assistant", [askCall("c1"), finish("tool_use")], T0 + 12));
    reader.poll();
    reader.submitLine("Turuncu olsun");
    db.rows.push(msg("S1", "tool", [result("c1")], T0 + 13));
    reader.poll();
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(reader.status().source).toBe("exact");
  });

  it("soru açıkken yazılan satır oturumda görünmez ve soru açık kalırsa 30 sn sonra bağ çözülüyor (Ctrl+N)", () => {
    const { db, clock, make } = scenario();
    const { reader, onMatch } = make("A");
    reader.submitLine("Renk sor bana");
    db.rows.push(msg("S1", "user", [text("Renk sor bana")], T0 + 11), msg("S1", "assistant", [askCall("c1"), finish("tool_use")], T0 + 12));
    reader.poll();
    expect(reader.status()).toMatchObject({ state: "asking", source: "exact" });
    clock.ms = (T0 + 13) * 1000;
    reader.submitLine("Yeni oturumda iş yap");
    db.rows.push(msg("S2", "user", [text("Yeni oturumda iş yap")], T0 + 14));
    clock.ms = (T0 + 13) * 1000 + UNCONFIRMED_LIMIT_MS - 1_000;
    reader.poll();
    expect(reader.binding()).toBe("S1");
    clock.ms = (T0 + 13) * 1000 + UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBeNull();
    expect(reader.status().source).toBe("estimated");
    expect(onMatch).toHaveBeenCalledWith("belirsiz");
    // Satır yeniden aranıyor: yeni oturuma bağlanıyor.
    reader.poll();
    expect(reader.binding()).toBe("S2");
  });

  it("soru açıkken yazılan serbest metin bağlı oturumda kullanıcı mesajı olarak görünürse bağ korunuyor", () => {
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Renk sor bana");
    db.rows.push(msg("S1", "user", [text("Renk sor bana")], T0 + 11), msg("S1", "assistant", [askCall("c1"), finish("tool_use")], T0 + 12));
    reader.poll();
    clock.ms = (T0 + 13) * 1000;
    reader.submitLine("Mavi olsun lütfen");
    db.rows.push(msg("S1", "user", [text("Mavi olsun lütfen")], T0 + 14));
    reader.poll();
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(reader.status().source).toBe("exact");
  });

  it("bağlı oturumda görünmeyen istem 30 sn sonra bağı çözüyor ve yeni oturuma bağlanıyor (Ctrl+N)", () => {
    const { db, clock, make } = scenario();
    const { reader, onMatch } = make("A");
    reader.submitLine("Eski konu burada");
    db.rows.push(msg("S1", "user", [text("Eski konu burada")], T0 + 11), msg("S1", "assistant", [finish("end_turn")], T0 + 12));
    reader.poll();
    expect(reader.binding()).toBe("S1");
    reader.submitLine("Yeni konu başlasın");
    db.rows.push(msg("S3", "user", [text("Yeni konu başlasın")], T0 + 20));
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(onMatch).toHaveBeenCalledWith("belirsiz");
    reader.poll();
    expect(reader.binding()).toBe("S3");
  });

  it("ajan çalışırken bekleyen istem süre saymıyor", () => {
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Uzun iş başlat");
    db.rows.push(msg("S1", "user", [text("Uzun iş başlat")], T0 + 11), msg("S1", "assistant", [text("çalışıyor")], T0 + 12));
    reader.poll();
    reader.submitLine("Sıradaki istem");
    clock.ms += UNCONFIRMED_LIMIT_MS * 3;
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(reader.status()).toMatchObject({ state: "running", source: "exact" });
  });

  it("motor kapandı: bağlıysa kesin 'bitti'", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("C:\\p>axet-code -y\r\n");
    reader.submitLine("Bir iş yap");
    db.rows.push(msg("S1", "user", [text("Bir iş yap")], T0 + 11), msg("S1", "assistant", [finish("end_turn")], T0 + 12));
    reader.poll();
    reader.feedOutput("\r\nC:\\p>");
    expect(reader.status()).toMatchObject({ state: "finished", source: "exact", detail: "end_turn" });
  });
});

describe("AxetReader — veritabanı arızası", () => {
  it("veritabanı okunamıyor: tahmini, hata fırlatmıyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("x");
    reader.submitLine("Bir şey yap");
    db.broken = true;
    expect(() => reader.poll()).not.toThrow();
    expect(reader.status()).toMatchObject({ state: "running", source: "estimated" });
  });

  it("sorgu hata fırlatıyor (kilit) ya da veritabanı yok: tahmini, hata fırlatmıyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Bir şey yap");
    db.throws = true;
    expect(() => reader.poll()).not.toThrow();
    expect(reader.status().source).toBe("estimated");
    db.throws = false;
    db.missing = true;
    expect(() => reader.poll()).not.toThrow();
    expect(reader.status().source).toBe("estimated");
  });

  it("bağlandıktan sonra okuma bozulursa tahminiye düşüyor, düzelince kesine dönüyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Bir şey yap");
    db.rows.push(msg("S1", "user", [text("Bir şey yap")], T0 + 11), msg("S1", "assistant", [finish("end_turn")], T0 + 12));
    reader.poll();
    db.broken = true;
    reader.poll();
    expect(reader.status().source).toBe("estimated");
    db.broken = false;
    reader.poll();
    expect(reader.status().source).toBe("exact");
  });

  it("dispose sahipliği bırakıyor", () => {
    const { db, registry, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Bir şey yap");
    db.rows.push(msg("S1", "user", [text("Bir şey yap")], T0 + 11));
    reader.poll();
    expect(registry.owner(DB, "S1")).toBe("A");
    reader.dispose();
    expect(registry.owner(DB, "S1")).toBeNull();
  });
});

describe("AxetReader — zaman penceresi düzeltmeleri", () => {
  it("(a) yabancı oturumda istemden ÖNCE yazılmış aynı metin bağ kurmaz", () => {
    // Registry dışı (sohbet ekranı / başka axet-code) eski oturum: ajanın
    // iğneyi yazdığı andan ÖNCE yazılmış → sinceSec = needle.submitMs/1000 - 2
    // ile dışarıda kalmalı; tek aday görünse bile bağlanılmıyor.
    const { db, make } = scenario();
    const { reader } = make("A");
    // Yabancı oturum iğneden 5 sn önce yazılmış
    db.rows.push(msg("S_FOREIGN", "user", [text("yabanci istem uzun")], T0 + 5));
    // clock.ms = (T0+10)*1000; needle.submitMs = (T0+10)*1000; sinceSec = T0+8
    // S_FOREIGN mesajı T0+5 < T0+8 → bulunamaz → bağlanmıyor
    reader.submitLine("yabanci istem uzun");
    reader.poll();
    expect(reader.binding()).toBeNull();
    expect(reader.status().source).toBe("estimated");
  });

  it("(b) eski oturumdaki metin tekrar yazılınca bağ çözülür", () => {
    // Bağlı oturumda daha önce yazılmış aynı metni tekrar yazan kullanıcı:
    // doğrulama yalnız istemin YAZILDIĞI ANDAN sonraki mesajlarla yapılmalı.
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("baslat uzun mesaj");
    db.rows.push(
      msg("S1", "user", [text("baslat uzun mesaj")], T0 + 11),
      msg("S1", "assistant", [finish("end_turn")], T0 + 12)
    );
    reader.poll();
    expect(reader.binding()).toBe("S1");
    // Bağlı iken kullanıcı aynı metni tekrar yazıyor (T0+20, clock=(T0+20)*1000)
    clock.ms = (T0 + 20) * 1000;
    reader.submitLine("baslat uzun mesaj");
    // Bu metin S1'de T0+11'de var; ama istem T0+20'de yazıldı → sinceSec=T0+18
    // T0+11 < T0+18 → eski mesaj doğrulama sayılmaz → UNCONFIRMED_LIMIT_MS sonra bağ çözülür
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBeNull();
  });

  it("(c) asking durumunda bekleyen istem 30 sn geçse de bağı çözMEZ", () => {
    // Açık soru varken unconfirmed istemin sayacı işlememeli.
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("asil istem burada");
    db.rows.push(
      msg("S1", "user", [text("asil istem burada")], T0 + 11),
      msg("S1", "assistant", [askCall("c5"), finish("tool_use")], T0 + 12)
    );
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(reader.status().state).toBe("asking");
    // Asking durumundayken yeni bir istem geldi (soru kutusunda değil, henüz running değil)
    clock.ms = (T0 + 13) * 1000;
    // submitLine asking'te return ediyor; unconfirmed oluşturmak için önce
    // geçici running'e geçelim, ardından askCall yeniden açılsın
    db.rows.push(msg("S1", "tool", [result("c5")], T0 + 13));
    reader.poll(); // running
    reader.submitLine("siradaki uzun istem");
    // Şimdi tekrar asking'e geç
    db.rows.push(msg("S1", "assistant", [askCall("c6"), finish("tool_use")], T0 + 14));
    clock.ms = (T0 + 14) * 1000;
    reader.poll(); // asking
    expect(reader.status().state).toBe("asking");
    // 30+ sn asking'te kal → bağ bozulmamalı
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(reader.status().state).toBe("asking");
  });

  it("asking'te 4 dk bağ korunur, 5 dk+1 sn sonra çözülür (ASKING_FREEZE_MAX_MS)", () => {
    // ASKING_FREEZE_MAX_MS aşılınca dondurma sona erer ve bağ çözülür.
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("ilk istem uzun");
    db.rows.push(
      msg("S1", "user", [text("ilk istem uzun")], T0 + 11),
      msg("S1", "assistant", [askCall("c20"), finish("tool_use")], T0 + 12)
    );
    reader.poll();
    expect(reader.binding()).toBe("S1");
    // Asking'e geçmeden önce bir unconfirmed iğne oluşturmak gerekiyor:
    // soru cevaplanıp running'e geçilsin, submitLine çağrılsın, tekrar asking
    clock.ms = (T0 + 13) * 1000;
    db.rows.push(msg("S1", "tool", [result("c20")], T0 + 13));
    reader.poll(); // running
    reader.submitLine("sira bekleyen uzun"); // submitMs = (T0+13)*1000
    db.rows.push(msg("S1", "assistant", [askCall("c21"), finish("tool_use")], T0 + 14));
    clock.ms = (T0 + 14) * 1000;
    reader.poll(); // asking, unconfirmed iğne var
    expect(reader.status().state).toBe("asking");

    // 4 dakika → bağ korunmalı (240 sn < ASKING_FREEZE_MAX_MS/1000 = 300 sn)
    clock.ms = (T0 + 13) * 1000 + ASKING_FREEZE_MAX_MS - 60_000;
    reader.poll();
    expect(reader.binding()).toBe("S1");

    // 5 dakika + 1 saniye → bağ çözülmeli
    clock.ms = (T0 + 13) * 1000 + ASKING_FREEZE_MAX_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBeNull();
  });
});

describe("oturum kaydı ve okuyucu seçimi", () => {
  it("keysOverlap iki yönlü önek", () => {
    expect(keysOverlap("Merhaba ajan", "Merhaba")).toBe(true);
    expect(keysOverlap("Merhaba", "Merhaba ajan")).toBe(true);
    expect(keysOverlap("Birinci", "İkinci")).toBe(false);
    expect(keysOverlap("lütfen devam et", "devam et")).toBe(false);
  });

  it("axet-code kesin okuyucu, öteki motorlar genel okuyucu alıyor", () => {
    const deps = { now: () => 0, port: port(fakeDb()), registry: createSessionRegistry(), onMatch: vi.fn() };
    const reg = (engine: AgentRegistration["engine"]): AgentRegistration => ({
      paneId: "p",
      ptyId: "t",
      engine,
      cwd: "C:\\p",
      command: engine,
      name: "x",
      roleKind: "custom",
      sap: false,
      added: false
    });
    expect(createAgentReader(reg("axet-code"), deps)).toBeInstanceOf(AxetReader);
    expect(createAgentReader(reg("claude"), deps)).not.toBeInstanceOf(AxetReader);
  });
});
