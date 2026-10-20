// Tur 10, madde 5: Claude Code kesin okuyucusu (oturum dökümü ~/.claude/projects/<kodlanmış-cwd>/<oturum>.jsonl).
// Biçim ölçümü: .superpowers/olcum/tur10/claude-dokum.cjs (gerçek etkileşimli Claude Code 2.1.304):
//   - döküm Enter'dan ~300 ms sonra <uuid>.jsonl olarak açılıyor, her kayıtta cwd;
//   - kullanıcı istemi `user` + düz metin (sondaki boşluk kırpılmış);
//   - tur sonu `system/turn_duration` (+ asistan `stop_reason: end_turn`);
//   - AskUserQuestion kaydı CEVAPTAN SONRA yazılıyor → soru ekrandan (seçim altbilgisi).
import { describe, expect, it } from "vitest";
import {
  ClaudeReader,
  claudeProjectDir,
  deriveClaudeState,
  type ClaudeEntry,
  type ClaudeTranscriptPort
} from "../app-electron/main/agentClaudeReader";
import { GenericReader } from "../app-electron/main/agentGenericReader";
import { createSessionRegistry } from "../app-electron/main/agentAxetReader";

const T = (s: number) => new Date(1_700_000_000_000 + s * 1000).toISOString();
const user = (text: string, s: number, extra: Partial<ClaudeEntry> = {}): ClaudeEntry => ({ type: "user", timestamp: T(s), message: { role: "user", content: text }, ...extra });
const asst = (content: unknown[], s: number, stop: string | null = null, extra: Partial<ClaudeEntry> = {}): ClaudeEntry => ({
  type: "assistant",
  timestamp: T(s),
  message: { role: "assistant", content, stop_reason: stop },
  ...extra
});
const toolResult = (id: string, s: number): ClaudeEntry => ({ type: "user", timestamp: T(s), message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } });
const turnEnd = (s: number): ClaudeEntry => ({ type: "system", subtype: "turn_duration", timestamp: T(s) });

describe("claudeProjectDir", () => {
  it("harf/rakam dışı her karakter tire (ölçülen klasör adlarıyla)", () => {
    expect(claudeProjectDir("C:\\Users\\u", "C:\\workspace\\aXet-SAP-Launcher")).toBe("C:\\Users\\u\\.claude\\projects\\C--workspace-aXet-SAP-Launcher");
    expect(claudeProjectDir("C:\\Users\\u", "C:\\Users\\u\\Downloads\\New folder (2)")).toBe("C:\\Users\\u\\.claude\\projects\\C--Users-u-Downloads-New-folder--2-");
    expect(claudeProjectDir("C:\\Users\\u", "C:\\a", "D:\\cfg")).toBe("D:\\cfg\\projects\\C--a");
  });
});

describe("deriveClaudeState", () => {
  it("boş döküm boşta", () => {
    expect(deriveClaudeState([])).toMatchObject({ state: "idle", lastActivityMs: null });
  });

  it("istemden sonra düşünüyor; araç çağrısında araç aşaması; metin yazarken yazıyor", () => {
    expect(deriveClaudeState([user("merhaba", 1)])).toMatchObject({ state: "running", phase: { kind: "thinking" } });
    const tool = deriveClaudeState([user("x", 1), asst([{ type: "tool_use", id: "t1", name: "Bash", input: { command: "npm test" } }], 2, "tool_use")]);
    expect(tool).toMatchObject({ state: "running", phase: { kind: "tool", tool: "bash" } });
    expect(tool.phase?.target).toContain("npm test");
    expect(deriveClaudeState([user("x", 1), asst([{ type: "tool_use", id: "t1", name: "Read", input: {} }], 2, "tool_use"), toolResult("t1", 3)])).toMatchObject({
      state: "running",
      phase: { kind: "thinking" }
    });
    expect(deriveClaudeState([user("x", 1), asst([{ type: "text", text: "Yazıyorum" }], 2)])).toMatchObject({ state: "running", phase: { kind: "writing" } });
  });

  it("tur sonu: boşta + son cevap (gizli süzülmüş)", () => {
    const d = deriveClaudeState([user("x", 1), asst([{ type: "text", text: "Bitti. password=ABCDEFGHIJKLMNOPQRSTUVWXYZ012345" }], 2, "end_turn"), turnEnd(3)]);
    expect(d.state).toBe("idle");
    expect(d.reply).toContain("Bitti.");
    expect(d.reply).not.toContain("ABCDEFGHIJKLMNOP");
    expect(d.lastActivityMs).toBe(Date.parse(T(3)));
  });

  it("end_turn tek başına da tur sonu (turn_duration yazılmayan sürüm)", () => {
    expect(deriveClaudeState([user("x", 1), asst([{ type: "text", text: "Tamam" }], 2, "end_turn")])).toMatchObject({ state: "idle", reply: "Tamam" });
  });

  it("kullanıcının kestiği tur boşta", () => {
    expect(deriveClaudeState([user("x", 1), user("[Request interrupted by user]", 2)]).state).toBe("idle");
  });

  it("meta/yan zincir kayıtları istem sayılmıyor", () => {
    const d = deriveClaudeState([user("x", 1), asst([{ type: "text", text: "Tamam" }], 2, "end_turn"), turnEnd(3), user("<command>", 4, { isMeta: true }), asst([{ type: "text", text: "alt" }], 5, null, { isSidechain: true })]);
    expect(d.state).toBe("idle");
    expect(d.reply).toBe("Tamam");
  });

  it("API hatası: hata durumu, sınıf ve ayrıntı", () => {
    const d = deriveClaudeState([user("x", 1), asst([{ type: "text", text: "API Error: 429 Too many requests, please wait" }], 2, "stop_sequence", { isApiErrorMessage: true, error: "rate_limit" })]);
    expect(d.state).toBe("error");
    expect(d.error).toMatchObject({ source: "exact" });
    expect(d.error?.cls).toBe("rateLimit");
  });

  it("hatadan sonra yeni istem: yeniden çalışıyor", () => {
    const d = deriveClaudeState([user("x", 1), asst([{ type: "text", text: "API Error: 500" }], 2, null, { isApiErrorMessage: true }), user("devam", 3)]);
    expect(d.state).toBe("running");
  });
});

class FakePort implements ClaudeTranscriptPort {
  files = new Map<string, { mtimeMs: number; text: string }>();
  failList = false;
  list(dir: string) {
    if (this.failList) return null;
    return [...this.files.entries()].filter(([p]) => p.startsWith(dir + "\\")).map(([p, f]) => ({ path: p, mtimeMs: f.mtimeMs }));
  }
  read(file: string, offset: number) {
    const f = this.files.get(file);
    return f ? { text: f.text.slice(offset), size: f.text.length } : null;
  }
  put(name: string, entries: ClaudeEntry[], mtimeMs: number) {
    this.files.set(`C:\\h\\.claude\\projects\\C--p\\${name}`, { mtimeMs, text: entries.map((e) => JSON.stringify({ cwd: "C:\\p", ...e })).join("\n") + "\n" });
  }
  append(name: string, entries: ClaudeEntry[]) {
    const f = this.files.get(`C:\\h\\.claude\\projects\\C--p\\${name}`)!;
    f.text += entries.map((e) => JSON.stringify({ cwd: "C:\\p", ...e })).join("\n") + "\n";
  }
}

function setup(start = Date.parse(T(0))) {
  const clock = { ms: start };
  const port = new FakePort();
  const registry = createSessionRegistry();
  const generic = new GenericReader({ command: "claude", now: () => clock.ms });
  const make = (id: string) =>
    new ClaudeReader({ agentId: id, cwd: "C:\\p", home: "C:\\h", startedAtMs: start, port, registry, generic, now: () => clock.ms });
  const reader = make("A");
  // motor açıldı: komut yankısı ve TUI çıktısı
  generic.feedOutput("C:\\p>claude\r\nClaude Code v2\r\n");
  return { clock, port, registry, reader, make, generic };
}

describe("ClaudeReader — bağlama", () => {
  it("istem gönderilmeden kesin değil, boşta", () => {
    const { reader } = setup();
    expect(reader.status()).toMatchObject({ state: "idle", source: "estimated" });
  });

  it("gönderilen satırla başlayan kullanıcı mesajı olan tek döküme bağlanıyor", () => {
    const h = setup();
    h.reader.submitLine("README dosyasını güncelle lütfen");
    h.port.put("s1.jsonl", [user("README dosyasını güncelle lütfen (Ekip araci: ...)", 1)], Date.parse(T(1)));
    h.port.put("eski.jsonl", [user("README dosyasını güncelle lütfen", -500)], Date.parse(T(-400)));
    h.clock.ms = Date.parse(T(2));
    h.reader.poll();
    expect(h.reader.status()).toMatchObject({ state: "running", source: "exact" });
    h.port.append("s1.jsonl", [asst([{ type: "text", text: "Güncelledim." }], 3, "end_turn"), turnEnd(4)]);
    h.reader.poll();
    expect(h.reader.status()).toMatchObject({ state: "idle", source: "exact", reply: "Güncelledim." });
  });

  it("iki aday döküm: bağlanmıyor (belirsiz), tahmini kalıyor", () => {
    const h = setup();
    h.reader.submitLine("aynı istem burada");
    h.port.put("a.jsonl", [user("aynı istem burada", 1)], Date.parse(T(1)));
    h.port.put("b.jsonl", [user("aynı istem burada", 1)], Date.parse(T(1)));
    h.reader.poll();
    expect(h.reader.status().source).toBe("estimated");
    expect(h.reader.status().link).toBe("ambiguous");
  });

  it("başka ajanın dökümü alınmıyor", () => {
    const h = setup();
    const other = h.make("B");
    other.submitLine("ortak istem metni");
    h.port.put("a.jsonl", [user("ortak istem metni", 1)], Date.parse(T(1)));
    other.poll();
    expect(other.status().source).toBe("exact");
    h.reader.submitLine("ortak istem metni");
    h.reader.poll();
    expect(h.reader.status().source).toBe("estimated");
  });

  it("parça parça yazılan satırlar (yarım son satır) bozulmuyor", () => {
    const h = setup();
    h.reader.submitLine("parca testi istemi");
    h.port.put("s.jsonl", [user("parca testi istemi", 1)], Date.parse(T(1)));
    h.reader.poll();
    const file = "C:\\h\\.claude\\projects\\C--p\\s.jsonl";
    const line = JSON.stringify({ cwd: "C:\\p", ...asst([{ type: "text", text: "Son" }], 2, "end_turn") });
    h.port.files.get(file)!.text += line.slice(0, 20);
    h.reader.poll();
    expect(h.reader.status().state).toBe("running");
    h.port.files.get(file)!.text += line.slice(20) + "\n";
    h.reader.poll();
    expect(h.reader.status()).toMatchObject({ state: "idle", reply: "Son" });
  });

  it("dökümler okunamazsa tahmini (noDb), düşmüyor", () => {
    const h = setup();
    h.port.failList = true;
    h.reader.submitLine("okunamayan istem");
    expect(() => h.reader.poll()).not.toThrow();
    expect(h.reader.status().source).toBe("estimated");
  });
});

describe("ClaudeReader — ekrandaki seçim penceresi (soru/izin)", () => {
  it("seçim altbilgisi görülünce soruyor; çalışma altbilgisi ya da yeni kayıtla kapanıyor", () => {
    const h = setup();
    h.reader.submitLine("soru sorduran istem");
    h.port.put("s.jsonl", [user("soru sorduran istem", 1)], Date.parse(T(1)));
    h.reader.poll();
    h.reader.feedOutput(" 1. Kırmızı\r\n 2. Mavi\r\nEnter to select · ↑/↓ to navigate · Esc to cancel");
    expect(h.reader.status()).toMatchObject({ state: "asking", source: "exact" });
    expect(h.reader.status().question).toBeUndefined();
    h.reader.feedOutput("✻ Thinking… (esc to interrupt)");
    expect(h.reader.status().state).toBe("running");
  });

  it("izin sorusu (Do you want to proceed?) da soruyor sayılıyor", () => {
    const h = setup();
    h.reader.submitLine("izin isteyen istem");
    h.port.put("s.jsonl", [user("izin isteyen istem", 1), asst([{ type: "tool_use", id: "t1", name: "Bash", input: { command: "rm x" } }], 2, "tool_use")], Date.parse(T(2)));
    h.reader.poll();
    h.reader.feedOutput("Do you want to proceed?\r\n❯ 1. Yes\r\n  2. No\r\nEsc to cancel");
    expect(h.reader.status().state).toBe("asking");
    h.port.append("s.jsonl", [toolResult("t1", 5)]);
    h.reader.poll();
    expect(h.reader.status().state).toBe("running");
  });
});
