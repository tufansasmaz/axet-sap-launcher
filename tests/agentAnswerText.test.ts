// Tur 7: Akış soru kartında serbest cevap. Tuş dizisi gerçek axet-code 1.4.x
// oturumunda ölçüldü: ↓ × seçenek sayısı ("Other") + metin, ayrı Enter.
import { describe, expect, it, vi } from "vitest";
import { createAgentMonitor, PROMPT_ENTER_DELAY_MS, TYPING_GUARD_MS } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import { cleanCustomAnswer, CUSTOM_ANSWER_MAX, customAnswerKeys } from "../app-electron/shared/agentDecisions";
import type { AgentQuestion, AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";

class FakeReader implements AgentReader {
  current: AgentStatus = { state: "idle", source: "estimated", lastActivity: null };
  feedOutput() {}
  feedInput() {}
  submitLine() {}
  poll() {}
  status() {
    return this.current;
  }
  engineReady() {
    return true;
  }
  dispose() {}
}

const question = (over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId: "c1",
  question: "Hangi renk?",
  header: "",
  options: ["Kırmızı", "Mavi", "Yeşil"],
  multiSelect: false,
  askedAt: 900_000,
  ...over
});
const asking = (q = question(), source: "exact" | "estimated" = "exact"): AgentStatus => ({ state: "asking", source, lastActivity: q.askedAt, question: q });

function harness(engine: AgentRegistration["engine"] = "axet-code") {
  const clock = { ms: 1_000_000 };
  const reader = new FakeReader();
  const scheduled: (() => void)[] = [];
  const write = vi.fn((_pty: string, _data: string) => true);
  const log = vi.fn();
  const monitor = createAgentMonitor({
    now: () => clock.ms,
    createReader: () => reader,
    emit: vi.fn(),
    notify: vi.fn(),
    write,
    backlog: () => "",
    log,
    schedule: (fn, ms) => {
      expect(ms).toBe(PROMPT_ENTER_DELAY_MS);
      scheduled.push(fn);
    }
  });
  monitor.register({
    paneId: "p1",
    ptyId: "t1",
    engine,
    cwd: "C:\\p",
    command: "axet-code -y",
    name: "Ayşe",
    roleKind: "axetAgent",
    sap: false,
    added: false
  });
  const flush = () => scheduled.splice(0).forEach((fn) => fn());
  return { clock, reader, write, log, monitor, flush };
}

describe("serbest cevap metni", () => {
  it("tek satıra indirgenir, kırpılır; boş ya da uzun reddedilir", () => {
    expect(cleanCustomAnswer("  Yeşil\r\n  zeytin\t ")).toBe("Yeşil zeytin");
    expect(cleanCustomAnswer("a\x1b[2Jb")).toBe("a [2Jb");
    expect(cleanCustomAnswer("   ")).toBeNull();
    expect(cleanCustomAnswer(42)).toBeNull();
    expect(cleanCustomAnswer("x".repeat(CUSTOM_ANSWER_MAX))).toHaveLength(CUSTOM_ANSWER_MAX);
    expect(cleanCustomAnswer("x".repeat(CUSTOM_ANSWER_MAX + 1))).toBeNull();
  });

  it("tuş dizisi: seçenek sayısı kadar aşağı ok + metin, Enter yok", () => {
    expect(customAnswerKeys(2, "Mor")).toBe("\x1b[B\x1b[BMor");
    expect(customAnswerKeys(3, "a")).toBe("\x1b[B\x1b[B\x1b[Ba");
  });
});

describe("izleyici answerText", () => {
  it("↓×n + metin yazar, Enter'ı ayrı ve gecikmeli yazar; günlükte metin yok", () => {
    const h = harness();
    h.reader.current = asking();
    expect(h.monitor.answerText("p1", "c1", "Yeşil\nzeytin")).toEqual({ ok: true });
    expect(h.write).toHaveBeenCalledTimes(1);
    expect(h.write).toHaveBeenLastCalledWith("t1", "\x1b[B\x1b[B\x1b[BYeşil zeytin");
    h.flush();
    expect(h.write).toHaveBeenLastCalledWith("t1", "\r");
    expect(h.log).toHaveBeenCalledWith("ajan.karar", { motor: "axet-code", yol: "serbest" });
    expect(JSON.stringify(h.log.mock.calls)).not.toContain("zeytin");
  });

  it("tek seferlik: ikinci gönderim reddedilir", () => {
    const h = harness();
    h.reader.current = asking();
    h.monitor.answerText("p1", "c1", "bir");
    expect(h.monitor.answerText("p1", "c1", "iki")).toEqual({ ok: false, reason: "alreadyAnswered" });
    expect(h.monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: "alreadyAnswered" });
  });

  it("arada kullanıcı yazdıysa ya da soru kapandıysa Enter gönderilmez", () => {
    const h = harness();
    h.reader.current = asking();
    h.monitor.answerText("p1", "c1", "metin");
    h.clock.ms += 50;
    h.monitor.onInput("t1", "x");
    h.flush();
    expect(h.write).toHaveBeenCalledTimes(1);

    const k = harness();
    k.reader.current = asking();
    k.monitor.answerText("p1", "c1", "metin");
    k.reader.current = { state: "running", source: "exact", lastActivity: 1 };
    k.flush();
    expect(k.write).toHaveBeenCalledTimes(1);
  });

  it("yazarken kilidi: son tuş yakınsa ya da soruya dokunulduysa yazılmaz", () => {
    const h = harness();
    h.reader.current = asking();
    h.monitor.onInput("t1", "a");
    expect(h.monitor.answerText("p1", "c1", "metin")).toEqual({ ok: false, reason: "typing" });
    h.clock.ms += TYPING_GUARD_MS + 1;
    // Soru açıldıktan sonra terminale dokunulmuş: imleç yer değiştirmiş olabilir.
    expect(h.monitor.answerText("p1", "c1", "metin")).toEqual({ ok: false, reason: "typing" });
    expect(h.write).not.toHaveBeenCalled();
  });

  it("yalnız axet-code, kesin kaynak, tek seçimli, açık soru", () => {
    const claude = harness("claude");
    claude.reader.current = asking();
    expect(claude.monitor.answerText("p1", "c1", "x")).toEqual({ ok: false, reason: "notAnswerable" });
    const est = harness();
    est.reader.current = asking(question(), "estimated");
    expect(est.monitor.answerText("p1", "c1", "x")).toEqual({ ok: false, reason: "notAnswerable" });
    const multi = harness();
    multi.reader.current = asking(question({ multiSelect: true }));
    expect(multi.monitor.answerText("p1", "c1", "x")).toEqual({ ok: false, reason: "notAnswerable" });
    const closed = harness();
    closed.reader.current = asking();
    expect(closed.monitor.answerText("p1", "baska", "x")).toEqual({ ok: false, reason: "closed" });
    expect(closed.monitor.answerText("yok", "c1", "x")).toEqual({ ok: false, reason: "noAgent" });
    expect(closed.monitor.answerText("p1", "c1", "  ")).toEqual({ ok: false, reason: "notAnswerable" });
  });

  it("gizli süzgeç: anahtar/parola desenleri ajana yazılmaz", () => {
    const h = harness();
    h.reader.current = asking();
    h.monitor.answerText("p1", "c1", "password=SuperGizli123 kullan");
    const written = String(h.write.mock.calls[0][1]);
    expect(written).not.toContain("SuperGizli123");
    expect(written).toContain("«gizli»");
  });
});
