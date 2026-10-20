// Ajan izleyicisi: kayıt, girdi/çıktı, yoklama, Kararlar cevabı, bildirim ve
// günlük (spec 2026-10-17 ajan-alani §6, §7, §9, §11). Okuyucular sahte.
import { describe, expect, it, vi } from "vitest";
import { PROMPT_ENTER_DELAY_MS, TYPING_GUARD_MS, createAgentMonitor, readAgentRegistration } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import { LIST_ANSWER_ENABLED } from "../app-electron/shared/agentDecisions";
import type { AgentQuestion, AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";

class FakeReader implements AgentReader {
  current: AgentStatus = { state: "idle", source: "estimated", lastActivity: null };
  ready = true;
  lines: string[] = [];
  output: string[] = [];
  polls = 0;
  disposed = false;
  failPoll = false;
  failSubmit = false;
  feedOutput(data: string) {
    this.output.push(data);
  }
  submitLine(line: string) {
    if (this.failSubmit) throw new Error("okuyucu patladı");
    this.lines.push(line);
  }
  poll() {
    this.polls += 1;
    if (this.failPoll) throw new Error("okuyucu patladı");
  }
  status() {
    return this.current;
  }
  engineReady() {
    return this.ready;
  }
  dispose() {
    this.disposed = true;
  }
}

function harness() {
  const clock = { ms: 1_000_000 };
  const readers = new Map<string, FakeReader>();
  const deps = {
    now: () => clock.ms,
    createReader: vi.fn((reg: AgentRegistration): AgentReader => {
      const reader = new FakeReader();
      readers.set(reg.paneId, reader);
      return reader;
    }),
    emit: vi.fn(),
    notify: vi.fn(),
    write: vi.fn((_ptyId: string, _data: string) => true),
    backlog: vi.fn((_ptyId: string) => ""),
    log: vi.fn()
  };
  const monitor = createAgentMonitor(deps);
  return { clock, readers, deps, monitor, reader: (id = "p1") => readers.get(id)! };
}

const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\p",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "axetAgent",
  sap: true,
  added: true,
  ...over
});
const question = (over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId: "c1",
  question: "Hangi renk?",
  header: "",
  options: ["Kırmızı", "Mavi"],
  multiSelect: false,
  askedAt: 900_000,
  ...over
});
const asking = (q: AgentQuestion = question()): AgentStatus => ({ state: "asking", source: "exact", lastActivity: q.askedAt, question: q });
const runningExact: AgentStatus = { state: "running", source: "exact", lastActivity: 1 };
// Task 1 Karar A "YOK" ise listeden cevap hiç gönderilmiyor.
const BLOCKED = LIST_ANSWER_ENABLED ? "typing" : "notAnswerable";

describe("kayıt ve akış", () => {
  it("ilk durum gönderiliyor; yeni eklenen günlüğe düşüyor; önceki çıktı okuyucuya veriliyor", () => {
    const { deps, monitor, reader } = harness();
    deps.backlog.mockReturnValue("C:\\p>axet-code -y");
    monitor.register(reg());
    expect(reader().output).toEqual(["C:\\p>axet-code -y"]);
    expect(deps.emit).toHaveBeenCalledWith({ paneId: "p1", status: { state: "idle", source: "estimated", lastActivity: null } });
    expect(deps.log).toHaveBeenCalledWith("ajan.eklendi", { motor: "axet-code", rol: "hazir", sap: "evet" });
    monitor.register(reg({ paneId: "p2", ptyId: "t2", added: false, roleKind: "custom", sap: false }));
    expect(deps.log.mock.calls.filter(([tag]) => tag === "ajan.eklendi")).toHaveLength(1);
  });

  it("girdi satırları ve çıktı doğru okuyucuya; bilinmeyen pty yok sayılıyor", () => {
    const { monitor, reader } = harness();
    monitor.register(reg());
    monitor.onInput("t1", "Rapor");
    monitor.onInput("t1", "u yaz\r");
    monitor.onOutput("t1", "çıktı");
    expect(() => monitor.onOutput("yok", "x")).not.toThrow();
    expect(() => monitor.onInput("yok", "x\r")).not.toThrow();
    expect(reader().lines).toEqual(["Raporu yaz"]);
    expect(reader().output).toContain("çıktı");
  });

  it("yoklama yalnız değişimde gönderiyor; durum günlüğe kaynağıyla düşüyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    deps.emit.mockClear();
    deps.log.mockClear();
    monitor.tick();
    expect(deps.emit).not.toHaveBeenCalled();
    reader().current = runningExact;
    monitor.tick();
    expect(deps.emit).toHaveBeenCalledTimes(1);
    expect(deps.log).toHaveBeenCalledWith("ajan.durum", { motor: "axet-code", durum: "running", kaynak: "kesin" });
    reader().current = { ...runningExact, lastActivity: 2 };
    monitor.tick();
    expect(deps.emit).toHaveBeenCalledTimes(1);
  });

  it("bir okuyucu patlasa da öteki okunuyor; kayıt hatası fırlatmıyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    monitor.register(reg({ paneId: "p2", ptyId: "t2" }));
    reader("p1").failPoll = true;
    reader("p2").current = runningExact;
    expect(() => monitor.tick()).not.toThrow();
    expect(deps.emit).toHaveBeenCalledWith({ paneId: "p2", status: runningExact });
    deps.createReader.mockImplementationOnce(() => {
      throw new Error("okuyucu kurulamadı");
    });
    expect(() => monitor.register(reg({ paneId: "p3", ptyId: "t3" }))).not.toThrow();
  });

  it("çıkış ve kayıt silme okuyucuyu bırakıyor; anlık görüntü", () => {
    const { monitor, reader } = harness();
    monitor.register(reg());
    expect(monitor.snapshot()).toEqual([{ paneId: "p1", status: { state: "idle", source: "estimated", lastActivity: null } }]);
    monitor.onExit("t1");
    expect(reader().disposed).toBe(true);
    expect(monitor.snapshot()).toEqual([]);
    monitor.register(reg());
    monitor.unregister("p1");
    expect(monitor.snapshot()).toEqual([]);
  });
});

describe("bildirim (yalnız kesin)", () => {
  it("kesin soru bir kez, kesin çalışmadan boşa geçiş 'bitti'", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = runningExact;
    monitor.tick();
    reader().current = asking();
    monitor.tick();
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenLastCalledWith("asking", expect.objectContaining({ paneId: "p1" }));
    reader().current = { ...runningExact, lastActivity: 5 };
    monitor.tick();
    reader().current = { state: "idle", source: "exact", lastActivity: 6, detail: "end_turn" };
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(2);
    expect(deps.notify).toHaveBeenLastCalledWith("done", expect.objectContaining({ paneId: "p1" }));
  });

  it("tahmini durumda bildirim yok (tahmini bitiş dahil)", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg({ engine: "claude", command: "claude" }));
    reader().current = { state: "running", source: "estimated", lastActivity: 1 };
    monitor.tick();
    reader().current = { state: "finished", source: "estimated", lastActivity: 1 };
    monitor.tick();
    reader().current = { ...asking(), source: "estimated" };
    monitor.tick();
    expect(deps.notify).not.toHaveBeenCalled();
  });
});

describe("Kararlar cevabı", () => {
  it("soru hâlâ açıksa i kez aşağı + Enter yazılıyor; günlüğe 'liste'; kapanınca 'terminal' yazılmıyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking();
    monitor.tick();
    const result = monitor.answer("p1", "c1", 1);
    expect(reader().polls).toBeGreaterThan(0);
    if (!LIST_ANSWER_ENABLED) {
      expect(result).toEqual({ ok: false, reason: "notAnswerable" });
      expect(deps.write).not.toHaveBeenCalled();
      return;
    }
    expect(result).toEqual({ ok: true });
    expect(deps.write).toHaveBeenCalledWith("t1", "\x1b[B\r");
    expect(deps.log).toHaveBeenCalledWith("ajan.karar", { motor: "axet-code", yol: "liste" });
    reader().current = runningExact;
    monitor.tick();
    expect(deps.log.mock.calls.filter(([tag, f]) => tag === "ajan.karar" && (f as { yol: string }).yol === "terminal")).toHaveLength(0);
  });

  it("soru kapanmışsa ya da başka soruysa tuş gönderilmiyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = { state: "idle", source: "exact", lastActivity: 1 };
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: "closed" });
    reader().current = asking(question({ callId: "c2" }));
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: "closed" });
    expect(monitor.answer("yok", "c1", 0)).toEqual({ ok: false, reason: "noAgent" });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("kullanıcı yazıyorsa ya da soru açıldıktan sonra terminalde dokunduysa tuş gönderilmiyor", () => {
    const { clock, deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking(question({ askedAt: clock.ms - 10_000 }));
    monitor.tick();
    monitor.onInput("t1", "yarım");
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: BLOCKED });
    monitor.onInput("t1", "\x1b[B\x15"); // ok tuşu + taslağı sil: imleç yer değiştirmiş olabilir
    clock.ms += TYPING_GUARD_MS + 1;
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: BLOCKED });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("soru açılmadan önceki yazım engel değil", () => {
    const { clock, deps, monitor, reader } = harness();
    monitor.register(reg());
    monitor.onInput("t1", "renk sor\r");
    clock.ms += 10_000;
    reader().current = asking(question({ askedAt: clock.ms - 5_000 }));
    monitor.tick();
    const result = monitor.answer("p1", "c1", 0);
    expect(result).toEqual(LIST_ANSWER_ENABLED ? { ok: true } : { ok: false, reason: "notAnswerable" });
    if (LIST_ANSWER_ENABLED) expect(deps.write).toHaveBeenCalledWith("t1", "\r");
  });

  it("çok seçimli ve aralık dışı dizin listeden cevaplanmıyor; yazılamazsa writeFailed", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking(question({ multiSelect: true }));
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: "notAnswerable" });
    reader().current = asking();
    expect(monitor.answer("p1", "c1", 5)).toEqual({ ok: false, reason: "notAnswerable" });
    expect(monitor.answer("p1", "c1", -1)).toEqual({ ok: false, reason: "notAnswerable" });
    deps.write.mockReturnValue(false);
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: LIST_ANSWER_ENABLED ? "writeFailed" : "notAnswerable" });
  });

  it("terminalden cevaplanan karar günlüğe 'terminal' olarak düşüyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking();
    monitor.tick();
    reader().current = runningExact;
    monitor.tick();
    expect(deps.log).toHaveBeenCalledWith("ajan.karar", { motor: "axet-code", yol: "terminal" });
  });

  it("günlüğe soru, seçenek ya da yazılan metin girmiyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    monitor.onInput("t1", "Gizli müşteri verisi\r");
    reader().current = asking(question({ question: "Gizli soru?", options: ["Gizli A", "Gizli B"] }));
    monitor.tick();
    monitor.answer("p1", "c1", 1);
    reader().current = { state: "idle", source: "exact", lastActivity: 9 };
    monitor.tick();
    expect(JSON.stringify(deps.log.mock.calls)).not.toMatch(/Gizli/);
  });
});

describe("readAgentRegistration", () => {
  it("geçerli kayıt okunuyor; bozuk alanlar reddediliyor", () => {
    expect(readAgentRegistration(reg())).toEqual(reg());
    expect(readAgentRegistration(null)).toBeNull();
    expect(readAgentRegistration({ ...reg(), engine: "bash" })).toBeNull();
    expect(readAgentRegistration({ ...reg(), paneId: "" })).toBeNull();
    expect(readAgentRegistration({ ...reg(), cwd: "  " })).toBeNull();
    expect(readAgentRegistration({ ...reg(), roleKind: "x", sap: "evet", added: 1 })).toMatchObject({ roleKind: "custom", sap: false, added: false });
  });
});

describe("düzeltme turu 1", () => {
  it("aynı callId'e ikinci cevap reddediliyor; write bir kez çağrılıyor", () => {
    if (!LIST_ANSWER_ENABLED) return;
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking();
    monitor.tick();
    const r1 = monitor.answer("p1", "c1", 0);
    expect(r1).toEqual({ ok: true });
    expect(deps.write).toHaveBeenCalledTimes(1);
    const r2 = monitor.answer("p1", "c1", 0);
    expect(r2).toEqual({ ok: false, reason: "alreadyAnswered" });
    expect(deps.write).toHaveBeenCalledTimes(1);
  });

  it("log patlarsa writeFailed dönmez", () => {
    if (!LIST_ANSWER_ENABLED) return;
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking();
    monitor.tick();
    deps.log.mockImplementation((tag: string) => {
      if (tag === "ajan.karar") throw new Error("log patladı");
    });
    const result = monitor.answer("p1", "c1", 0);
    expect(result).toEqual({ ok: true });
    expect(deps.write).toHaveBeenCalledTimes(1);
  });

  it("tahmini kaynakta listeden cevap reddediliyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = { ...asking(), source: "estimated" };
    const result = monitor.answer("p1", "c1", 0);
    expect(result).toEqual({ ok: false, reason: "notAnswerable" });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("motor çıkışı/çökmesi 'bitti' bildirimi çıkarmıyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = runningExact;
    monitor.tick();
    reader().current = { state: "finished", source: "exact", lastActivity: 5 };
    monitor.tick();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("kesin→tahmini→kesin dalgalanmasında soru bildirimi bir kez", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking();
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(1);
    reader().current = { state: "running", source: "estimated", lastActivity: 2 };
    monitor.tick();
    reader().current = asking();
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(1);
  });

  it("aynı bölme yeniden register edilince eski okuyucu dispose ediliyor", () => {
    const { monitor, reader } = harness();
    monitor.register(reg());
    const firstReader = reader("p1");
    monitor.register(reg());
    expect(firstReader.disposed).toBe(true);
    const secondReader = reader("p1");
    expect(secondReader).not.toBe(firstReader);
    expect(secondReader.disposed).toBe(false);
  });
});

describe("Görev Panosu yüzü: agents() ve sendPrompt()", () => {
  function boardHarness() {
    const clock = { ms: 1_000_000 };
    const readers = new Map<string, FakeReader>();
    const scheduled: { fn: () => void; ms: number }[] = [];
    const write = vi.fn((_ptyId: string, _data: string) => true);
    const monitor = createAgentMonitor({
      now: () => clock.ms,
      createReader: (r: AgentRegistration): AgentReader => {
        const reader = new FakeReader();
        readers.set(r.paneId, reader);
        return reader;
      },
      emit: vi.fn(),
      notify: vi.fn(),
      write,
      backlog: () => "",
      log: vi.fn(),
      schedule: (fn, ms) => {
        scheduled.push({ fn, ms });
      }
    });
    const flushEnter = () => {
      for (const s of scheduled.splice(0)) s.fn();
    };
    return { clock, scheduled, write, monitor, flushEnter, reader: (id = "p1") => readers.get(id)! };
  }
  const finished: AgentStatus = { state: "finished", source: "estimated", lastActivity: 1 };

  it("agents(): kayıt, alan, rol, son durum; taslak ya da yeni tuş varken yazmaya kapalı", () => {
    const h = boardHarness();
    h.monitor.register(reg({ workspaceId: "w1", role: "coder" }));
    const [a] = h.monitor.agents();
    expect(a.reg).toMatchObject({ paneId: "p1", workspaceId: "w1", role: "coder" });
    expect(a.status).toEqual({ state: "idle", source: "estimated", lastActivity: null });
    expect(a.inputIdle).toBe(true);
    h.monitor.onInput("t1", "ya");
    expect(h.monitor.agents()[0].inputIdle).toBe(false);
    h.monitor.onInput("t1", "\x15");
    expect(h.monitor.agents()[0].inputIdle).toBe(false);
    h.clock.ms += TYPING_GUARD_MS;
    expect(h.monitor.agents()[0].inputIdle).toBe(true);
  });

  it("agents(): engineReady okuyucudan; okuyucu fırlatırsa false (kapalı-güvenli)", () => {
    const h = boardHarness();
    h.monitor.register(reg({ workspaceId: "w1" }));
    expect(h.monitor.agents()[0].engineReady).toBe(true);
    h.reader().ready = false;
    expect(h.monitor.agents()[0].engineReady).toBe(false);
    h.reader().engineReady = () => {
      throw new Error("okuyucu patladı");
    };
    expect(h.monitor.agents()[0].engineReady).toBe(false);
  });

  it("sendPrompt: önce metin, 150 ms sonra Enter; satır okuyucuya Enter'da veriliyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "Tabloyu ekle.")).toBe("ok");
    expect(h.write.mock.calls).toEqual([["t1", "Tabloyu ekle."]]);
    expect(h.scheduled[0].ms).toBe(PROMPT_ENTER_DELAY_MS);
    expect(h.reader().lines).toEqual([]);
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([
      ["t1", "Tabloyu ekle."],
      ["t1", "\r"]
    ]);
    expect(h.reader().lines).toEqual(["Tabloyu ekle."]);
  });

  it("kabuk istemi ekrandayken yazmıyor (motor kapandı)", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.reader().current = finished;
    expect(h.monitor.sendPrompt("p1", "dir")).toBe("notRunning");
    expect(h.write).not.toHaveBeenCalled();
    expect(h.scheduled).toEqual([]);
  });

  it("Enter anında motor kapandı → Enter yerine Esc, okuyucuya satır yok", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "del dosya")).toBe("ok");
    h.reader().current = finished;
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([
      ["t1", "del dosya"],
      ["t1", "\x1b"]
    ]);
    expect(h.reader().lines).toEqual([]);
  });

  it("arada kullanıcı tuşa bastıysa Enter gönderilmiyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.monitor.sendPrompt("p1", "istem");
    h.clock.ms += 50;
    h.monitor.onInput("t1", "a");
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([["t1", "istem"]]);
  });

  it("bölme arada kapandıysa Enter gönderilmiyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.monitor.sendPrompt("p1", "istem");
    h.monitor.unregister("p1");
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([["t1", "istem"]]);
  });

  it("yazıyor / geçersiz / ajan yok / yazılamadı", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("yok", "x")).toBe("noAgent");
    expect(h.monitor.sendPrompt("p1", "a\nb")).toBe("invalid");
    expect(h.monitor.sendPrompt("p1", "")).toBe("invalid");
    h.write.mockReturnValueOnce(false);
    expect(h.monitor.sendPrompt("p1", "x")).toBe("writeFailed");
    h.monitor.onInput("t1", "abc");
    expect(h.monitor.sendPrompt("p1", "x")).toBe("typing");
  });

  it("baştaki ! (kabuk kipi) ve / (motor komutu) reddediliyor, hiçbir şey yazılmıyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "!x")).toBe("invalid");
    expect(h.monitor.sendPrompt("p1", "   !del /s /q src")).toBe("invalid");
    expect(h.monitor.sendPrompt("p1", "/exit")).toBe("invalid");
    expect(h.monitor.sendPrompt("p1", " /share")).toBe("invalid");
    expect(h.write).not.toHaveBeenCalled();
    expect(h.monitor.sendPrompt("p1", "[Gorev a1] !x")).toBe("ok");
  });

  it("readAgentRegistration alan ve rolü taşıyor; boş/bozuk olanı atıyor", () => {
    expect(readAgentRegistration({ ...reg(), workspaceId: "w1", role: "  coder  " })).toMatchObject({ workspaceId: "w1", role: "coder" });
    const r = readAgentRegistration({ ...reg(), workspaceId: 5, role: "" })!;
    expect("workspaceId" in r || "role" in r).toBe(false);
  });
});

describe("düzeltme turu 1: pano yüzü güvenlik ve sözleşme", () => {
  function boardHarness() {
    const clock = { ms: 1_000_000 };
    const readers = new Map<string, FakeReader>();
    const scheduled: { fn: () => void; ms: number }[] = [];
    const write = vi.fn((_ptyId: string, _data: string) => true);
    const monitor = createAgentMonitor({
      now: () => clock.ms,
      createReader: (r: AgentRegistration): AgentReader => {
        const reader = new FakeReader();
        readers.set(r.paneId, reader);
        return reader;
      },
      emit: vi.fn(),
      notify: vi.fn(),
      write,
      backlog: () => "",
      log: vi.fn(),
      schedule: (fn, ms) => {
        scheduled.push({ fn, ms });
      }
    });
    const flushEnter = () => {
      for (const s of scheduled.splice(0)) s.fn();
    };
    return { clock, scheduled, write, monitor, flushEnter, reader: (id = "p1") => readers.get(id)! };
  }
  const finished: AgentStatus = { state: "finished", source: "estimated", lastActivity: 1 };

  // 1: uçuştaki istem kilidi
  it("uçuştaki istem kilidi: ikinci sendPrompt 'busy' döndürür, yazılmaz", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "a")).toBe("ok");
    expect(h.monitor.sendPrompt("p1", "b")).toBe("busy");
    expect(h.write.mock.calls).toEqual([["t1", "a"]]);
    h.flushEnter();
    expect(h.monitor.sendPrompt("p1", "b")).toBe("ok");
  });

  // 2: C1 denetim karakterleri
  it("C1 denetim karakterleri geçersiz: \\x9b, \\x85, \\u2028", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "a\x9b2J")).toBe("invalid");
    expect(h.monitor.sendPrompt("p1", "a\x85b")).toBe("invalid");
    expect(h.monitor.sendPrompt("p1", "a\u2028b")).toBe("invalid");
    expect(h.write).not.toHaveBeenCalled();
  });

  // 3: kullanıcı yazdı + motor kapandı → \x1b
  it("arada kullanıcı yazdı ve motor kapandı → \\x1b yazılıyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.monitor.sendPrompt("p1", "istem");
    h.clock.ms += 50;
    h.monitor.onInput("t1", "a");
    h.reader().current = finished;
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([["t1", "istem"], ["t1", "\x1b"]]);
    expect(h.reader().lines).toEqual([]);
  });

  // 4: workspaceId desen denetimi
  it("readAgentRegistration: workspaceId desene uymuyorsa atılıyor", () => {
    const bad = readAgentRegistration({ ...reg(), workspaceId: "../x" })!;
    expect("workspaceId" in bad).toBe(false);
    const good = readAgentRegistration({ ...reg(), workspaceId: "valid-id_1" })!;
    expect(good.workspaceId).toBe("valid-id_1");
  });

  // 5: writeFailed ve typing yollarında zamanlama/yazım yok
  it("writeFailed yolunda scheduled boş kalıyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.write.mockReturnValueOnce(false);
    expect(h.monitor.sendPrompt("p1", "x")).toBe("writeFailed");
    expect(h.scheduled).toEqual([]);
    expect(h.write).toHaveBeenCalledTimes(1);
  });

  it("typing yolunda hiçbir şey yazılmıyor, scheduled boş", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.monitor.onInput("t1", "abc");
    expect(h.monitor.sendPrompt("p1", "x")).toBe("typing");
    expect(h.write).not.toHaveBeenCalled();
    expect(h.scheduled).toEqual([]);
  });

  // 6: onSettled geri bildirimi
  it("onSettled: Enter yazılınca 'sent'", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    const settled: string[] = [];
    h.monitor.sendPrompt("p1", "istem", (o) => settled.push(o));
    expect(settled).toEqual([]);
    h.flushEnter();
    expect(settled).toEqual(["sent"]);
  });

  it("onSettled: bölme kapandıysa 'aborted'", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    const settled: string[] = [];
    h.monitor.sendPrompt("p1", "istem", (o) => settled.push(o));
    h.monitor.unregister("p1");
    h.flushEnter();
    expect(settled).toEqual(["aborted"]);
  });

  it("onSettled: kullanıcı yazdıysa 'aborted'", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    const settled: string[] = [];
    h.monitor.sendPrompt("p1", "istem", (o) => settled.push(o));
    h.clock.ms += 50;
    h.monitor.onInput("t1", "a");
    h.flushEnter();
    expect(settled).toEqual(["aborted"]);
  });

  it("onSettled: Enter anında motor kapandıysa 'aborted'", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    const settled: string[] = [];
    h.monitor.sendPrompt("p1", "istem", (o) => settled.push(o));
    h.reader().current = finished;
    h.flushEnter();
    expect(settled).toEqual(["aborted"]);
  });

  // kesin asking durumu
  it("sendPrompt: kesin asking durumunda 'asking' döndürür, yazılmaz", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.reader().current = asking();
    expect(h.monitor.sendPrompt("p1", "x")).toBe("asking");
    expect(h.write).not.toHaveBeenCalled();
    expect(h.scheduled).toEqual([]);
  });

  // metin uzunluğu sınırı
  it("metin > 4000 karakter → invalid", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "x".repeat(4001))).toBe("invalid");
    expect(h.write).not.toHaveBeenCalled();
  });

  // düzeltme turu 2 - Enter içi istisna → onSettled aborted
  it("Enter içinde poll fırlatırsa onSettled aborted tam bir kez, kilit bırakılıyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    const settled: string[] = [];
    expect(h.monitor.sendPrompt("p1", "istem", (o) => settled.push(o))).toBe("ok");
    h.reader().failPoll = true; // Enter anında poll fırlatsın
    h.flushEnter();
    expect(settled).toEqual(["aborted"]);
    // Kilit bırakıldı: bir sonraki sendPrompt çalışmalı
    h.reader().failPoll = false;
    expect(h.monitor.sendPrompt("p1", "x")).toBe("ok");
  });

  // Enter yazıldıktan sonra submitLine fırlatırsa istem gitmiştir: sonuç "sent" olmalı,
  // "aborted" yönetici alt görevi geri alıp çalışan işi ikinci kez dağıtırdı.
  it("Enter yazıldıktan sonra submitLine fırlatırsa onSettled sent tam bir kez", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    const settled: string[] = [];
    expect(h.monitor.sendPrompt("p1", "istem", (o) => settled.push(o))).toBe("ok");
    h.reader().failSubmit = true;
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([["t1", "istem"], ["t1", "\r"]]);
    expect(settled).toEqual(["sent"]);
  });

  // aynı milisaniyede tuş → >= koruması
  it("aynı milisaniyede tuş → Enter ve submit yok", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.monitor.sendPrompt("p1", "istem"); // sentAt = clock.ms = 1_000_000
    h.monitor.onInput("t1", "a");       // lastInputAt = clock.ms = 1_000_000 (aynı ms)
    h.flushEnter();
    // >= ile: 1_000_000 >= 1_000_000 → true → Enter gönderilmez
    expect(h.write.mock.calls).toEqual([["t1", "istem"]]);
    expect(h.reader().lines).toEqual([]);
  });

  // zamanlayıcı fn'yi eşzamanlı çalıştırıp sonra fırlatırsa
  it("zamanlayıcı fn eşzamanlı çalıştırıp fırlatırsa 'ok', onSettled bir kez çağrılıyor", () => {
    const readers = new Map<string, FakeReader>();
    const write = vi.fn((_ptyId: string, _data: string) => true);
    let callEnterSync = false;
    const monitor = createAgentMonitor({
      now: () => 1_000_000,
      createReader: (r: AgentRegistration): AgentReader => {
        const reader = new FakeReader();
        readers.set(r.paneId, reader);
        return reader;
      },
      emit: vi.fn(),
      notify: vi.fn(),
      write,
      backlog: () => "",
      log: vi.fn(),
      schedule: (fn) => {
        if (callEnterSync) { fn(); throw new Error("zamanlayıcı patladı"); }
        fn();
      }
    });
    monitor.register(reg());
    const settled: string[] = [];
    callEnterSync = true;
    const result = monitor.sendPrompt("p1", "istem", (o) => settled.push(o));
    expect(result).toBe("ok");
    expect(settled).toEqual(["sent"]);
    // \x1b yazılmamalı (Enter zaten gitti)
    expect(write.mock.calls).toEqual([["t1", "istem"], ["t1", "\r"]]);
  });
});

describe("Tur 10: onResize", () => {
  it("bölmenin okuyucusuna yeniden çizim bildiriliyor; okuyucu hatası düşürmüyor", () => {
    const h = harness();
    h.monitor.register(reg());
    const r = h.reader() as FakeReader & { noteRepaint?: () => void };
    const calls: number[] = [];
    r.noteRepaint = () => calls.push(1);
    h.monitor.onResize("t1");
    h.monitor.onResize("yok");
    expect(calls).toEqual([1]);
    r.noteRepaint = () => {
      throw new Error("patladı");
    };
    expect(() => h.monitor.onResize("t1")).not.toThrow();
  });
});
