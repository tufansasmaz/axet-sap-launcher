// Tur 9: izleyicinin hata zinciri — otomatik yeniden deneme, iptal, el ile deneme,
// tek bildirim. Okuyucu sahte; zamanlayıcı elle çalıştırılıyor.
import { describe, expect, it, vi } from "vitest";
import { PROMPT_ENTER_DELAY_MS, createAgentMonitor } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";
import { AXET_CONTINUE_PROMPT, type AgentErrorClass } from "../app-electron/shared/agentErrors";

class FakeReader implements AgentReader {
  current: AgentStatus = { state: "idle", source: "exact", lastActivity: 1 };
  lines: string[] = [];
  feedOutput() {}
  submitLine(line: string) {
    this.lines.push(line);
  }
  poll() {}
  status() {
    return this.current;
  }
  engineReady() {
    return true;
  }
  dispose() {}
}

const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\p",
  command: "axet-code -y",
  name: "Ali",
  roleKind: "preset",
  sap: false,
  added: true,
  ...over
});

function harness(opts: { auto?: boolean; max?: number; gate?: () => "ok" | "cooldown" | "full" } = {}) {
  const clock = { ms: 1_000_000 };
  const timers: { at: number; fn: () => void }[] = [];
  const readers = new Map<string, FakeReader>();
  const deps = {
    now: () => clock.ms,
    createReader: (r: AgentRegistration) => {
      const reader = new FakeReader();
      readers.set(r.paneId, reader);
      return reader;
    },
    emit: vi.fn(),
    notify: vi.fn(),
    write: vi.fn((_pty: string, _data: string) => true),
    backlog: () => "",
    log: vi.fn(),
    schedule: (fn: () => void, ms: number) => {
      timers.push({ at: clock.ms + ms, fn });
    },
    rand: () => 0.5,
    retryPrefs: () => ({ auto: opts.auto ?? true, max: opts.max ?? 3 }),
    gate: vi.fn(opts.gate ?? (() => "ok" as const)),
    onRateLimit: vi.fn(),
    onFinalError: vi.fn()
  };
  const monitor = createAgentMonitor(deps);
  const advance = (ms: number) => {
    const target = clock.ms + ms;
    for (;;) {
      const due = timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers.splice(timers.indexOf(due), 1);
      clock.ms = Math.max(clock.ms, due.at);
      due.fn();
    }
    clock.ms = target;
  };
  const last = (): AgentStatus => deps.emit.mock.calls[deps.emit.mock.calls.length - 1][0].status;
  const fail = (cls: AgentErrorClass, at: number, id = "p1") => {
    readers.get(id)!.current = { state: "error", source: "exact", lastActivity: at, detail: "error", error: { cls, detail: `x ${cls}`, source: "exact" } };
    monitor.tick();
  };
  const run = (id = "p1") => {
    readers.get(id)!.current = { state: "running", source: "exact", lastActivity: clock.ms };
    monitor.tick();
  };
  const writes = () => deps.write.mock.calls.map((c) => c[1]);
  return { clock, deps, monitor, readers, advance, last, fail, run, writes, timers };
}

describe("otomatik yeniden deneme", () => {
  it("geçici hata: geri sayım, bildirim yok, süre dolunca devam istemi gider", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("rateLimit", 100);
    expect(h.deps.onRateLimit).toHaveBeenCalledTimes(1);
    expect(h.last().retry).toEqual({ attempt: 1, max: 3, at: h.clock.ms + 10_000 });
    expect(h.deps.notify).not.toHaveBeenCalled();
    h.advance(9_999);
    expect(h.writes()).toEqual([]);
    h.advance(1 + PROMPT_ENTER_DELAY_MS);
    expect(h.writes()).toEqual([AXET_CONTINUE_PROMPT, "\r"]);
    expect(h.last().attempts).toBe(1);
    expect(h.last().retry).toBeUndefined();
  });

  it("üstel bekleme, sınırda durur; tek bildirim", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("unavailable", 100);
    h.advance(10_000 + PROMPT_ENTER_DELAY_MS);
    h.run();
    h.fail("unavailable", 200);
    expect(h.last().retry?.attempt).toBe(2);
    expect(h.last().retry?.at).toBe(h.clock.ms + 30_000);
    h.advance(30_000 + PROMPT_ENTER_DELAY_MS);
    h.run();
    h.fail("unavailable", 300);
    expect(h.last().retry?.attempt).toBe(3);
    h.advance(90_000 + PROMPT_ENTER_DELAY_MS);
    h.run();
    h.fail("unavailable", 400);
    expect(h.last().retry).toBeUndefined();
    expect(h.last()).toMatchObject({ attempts: 3, maxAttempts: 3, retryBlocked: "exhausted" });
    expect(h.deps.notify).toHaveBeenCalledTimes(1);
    expect(h.deps.notify).toHaveBeenCalledWith("error", expect.objectContaining({ paneId: "p1" }), expect.objectContaining({ cls: "unavailable", attempts: 3 }));
    expect(h.deps.onFinalError).toHaveBeenCalledTimes(1);
    h.monitor.tick();
    expect(h.deps.notify).toHaveBeenCalledTimes(1);
  });

  it("başarılı tur zinciri sıfırlar", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("network", 100);
    h.advance(10_000 + PROMPT_ENTER_DELAY_MS);
    h.readers.get("p1")!.current = { state: "idle", source: "exact", lastActivity: 150 };
    h.monitor.tick();
    h.fail("network", 200);
    expect(h.last().retry?.attempt).toBe(1);
  });

  it("kalıcı hata: deneme yok, nedeni ve tek bildirim", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("model", 100);
    expect(h.last()).toMatchObject({ retryBlocked: "permanent" });
    expect(h.last().retry).toBeUndefined();
    h.advance(200_000);
    expect(h.writes()).toEqual([]);
    expect(h.deps.notify).toHaveBeenCalledTimes(1);
  });

  it("ayar kapalı: deneme yok", () => {
    const h = harness({ auto: false });
    h.monitor.register(reg());
    h.fail("rateLimit", 100);
    expect(h.last()).toMatchObject({ retryBlocked: "off" });
    h.advance(200_000);
    expect(h.writes()).toEqual([]);
  });

  it("iptal: deneme gitmez, bildirim yok", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("rateLimit", 100);
    expect(h.monitor.cancelRetry("p1")).toBe(true);
    expect(h.last()).toMatchObject({ retryBlocked: "cancelled" });
    h.advance(200_000);
    expect(h.writes()).toEqual([]);
    expect(h.deps.notify).not.toHaveBeenCalled();
    expect(h.monitor.cancelRetry("p1")).toBe(false);
  });

  it("kullanıcı terminalde yazdıysa otomatik deneme yapılmaz", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("rateLimit", 100);
    h.clock.ms += 1_000;
    h.monitor.onInput("t1", "a");
    h.advance(20_000);
    expect(h.writes()).toEqual([]);
    expect(h.last()).toMatchObject({ retryBlocked: "user" });
    expect(h.deps.notify).toHaveBeenCalledTimes(1);
  });

  it("ajan başka işe geçtiyse deneme gitmez", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("rateLimit", 100);
    h.readers.get("p1")!.current = { state: "running", source: "exact", lastActivity: 120 };
    h.advance(20_000);
    expect(h.writes()).toEqual([]);
  });

  it("kapı kapalıysa (429 beklemesi / sınır) deneme ertelenir, deneme hakkı yenmez", () => {
    let open: "ok" | "cooldown" = "cooldown";
    const h = harness({ gate: () => open });
    h.monitor.register(reg());
    h.fail("rateLimit", 100);
    h.advance(10_000);
    expect(h.writes()).toEqual([]);
    expect(h.last().retry?.attempt).toBe(1);
    open = "ok";
    h.advance(10_000);
    expect(h.writes()[0]).toBe(AXET_CONTINUE_PROMPT);
  });

  it("motor hata yazıp kapandı: deneme yok (kabuğa yazılmaz), bildirim bir kez", () => {
    const h = harness();
    h.monitor.register(reg());
    h.readers.get("p1")!.current = { state: "finished", source: "estimated", lastActivity: 5, error: { cls: "model", detail: "x", source: "estimated" } };
    h.monitor.tick();
    expect(h.last()).toMatchObject({ retryBlocked: "exited" });
    expect(h.monitor.retryNow("p1")).toBe("notRunning");
    expect(h.deps.notify).toHaveBeenCalledTimes(1);
  });
});

describe("el ile yeniden dene", () => {
  it("axet-code: devam istemi hemen; sayaç sıfırdan", () => {
    const h = harness();
    h.monitor.register(reg());
    h.fail("auth", 100);
    expect(h.monitor.retryNow("p1")).toBe("ok");
    h.advance(PROMPT_ENTER_DELAY_MS);
    expect(h.writes()).toEqual([AXET_CONTINUE_PROMPT, "\r"]);
    h.run();
    h.fail("rateLimit", 200);
    expect(h.last().retry?.attempt).toBe(1);
  });

  it("öbür motor: son istem yinelenir; istem yoksa noPrompt", () => {
    const h = harness();
    h.monitor.register(reg({ engine: "claude", command: "claude" }));
    h.fail("unknown", 100);
    expect(h.monitor.retryNow("p1")).toBe("noPrompt");
    h.readers.get("p1")!.current = { state: "idle", source: "estimated", lastActivity: 1 };
    h.monitor.tick();
    h.monitor.onInput("t1", "rapor yaz\r");
    h.clock.ms += 5_000;
    h.fail("unknown", 300);
    expect(h.monitor.retryNow("p1")).toBe("ok");
    expect(h.writes()).toContain("rapor yaz");
  });

  it("hata yokken notError", () => {
    const h = harness();
    h.monitor.register(reg());
    h.monitor.tick();
    expect(h.monitor.retryNow("p1")).toBe("notError");
    expect(h.monitor.retryNow("yok")).toBe("noAgent");
  });
});
