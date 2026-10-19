// Tur 8: izleyici açılış penceresini otomatik seçiyor (yalnız axet-code, ayar açıkken).
import { describe, expect, it, vi } from "vitest";
import { createAgentMonitor } from "../app-electron/main/agentMonitor";
import { AUTO_SETUP_RETRY_MS, AUTO_SETUP_SEND_DELAY_MS, type AxetAutoSetupPrefs } from "../app-electron/main/axetAutoSetup";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";

const TOOL = "\x1b[38;2;1;2;3m│ Choose your development tool │\r\n│\x1b[48;2;33;158;188m aXet.Code│\r\n│ ↑/↓ choose • enter confirm│";
const MODEL = "│ To start, let's choose a provider and model. ││ Recently used ││ ↑/↓ choose • enter confirm│";
const CHAT = " large model changed to Claude Sonnet 5 ctrl+p commands • ctrl+j newline";

function fakeReader(): AgentReader {
  const status: AgentStatus = { state: "idle", source: "estimated", lastActivity: null };
  return {
    feedOutput: () => undefined,
    submitLine: () => undefined,
    poll: () => undefined,
    status: () => status,
    engineReady: () => true,
    dispose: () => undefined
  } as unknown as AgentReader;
}

function harness(prefs: AxetAutoSetupPrefs | null) {
  const clock = { ms: 1_000_000 };
  const timers: { at: number; fn: () => void }[] = [];
  const deps = {
    now: () => clock.ms,
    createReader: vi.fn(() => fakeReader()),
    emit: vi.fn(),
    notify: vi.fn(),
    write: vi.fn((_ptyId: string, _data: string) => true),
    backlog: vi.fn((_ptyId: string) => ""),
    log: vi.fn(),
    schedule: (fn: () => void, ms: number) => timers.push({ at: clock.ms + ms, fn }),
    axetAutoSetup: vi.fn((_reg: AgentRegistration) => prefs),
    onAutoSetup: vi.fn()
  };
  const advance = (ms: number) => {
    const end = clock.ms + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      timers.shift();
      clock.ms = next.at;
      next.fn();
    }
    clock.ms = end;
  };
  return { clock, deps, advance, monitor: createAgentMonitor(deps) };
}

const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\p",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "axetAgent",
  sap: false,
  added: false,
  ...over
});

describe("agentMonitor — otomatik açılış seçimi", () => {
  it("araç ve model penceresinde Enter, sonra bir kez bildirim + günlük", () => {
    const h = harness({ tool: "axet", model: "" });
    h.monitor.register(reg());
    h.monitor.onOutput("t1", TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    h.monitor.onOutput("t1", MODEL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    h.monitor.onOutput("t1", CHAT);
    expect(h.deps.write.mock.calls).toEqual([["t1", "\r"], ["t1", "\r"]]);
    expect(h.deps.onAutoSetup).toHaveBeenCalledTimes(1);
    expect(h.deps.onAutoSetup).toHaveBeenCalledWith(expect.objectContaining({ paneId: "p1" }), { ok: true, tool: "aXet.Code", model: "Claude Sonnet 5" });
    expect(h.deps.log).toHaveBeenCalledWith("ajan.aracSecimi", { motor: "axet-code", sonuc: "otomatik" });
  });

  it("ayar kapalıysa (null) eski davranış: hiçbir şey yazılmıyor", () => {
    const h = harness(null);
    h.monitor.register(reg());
    h.monitor.onOutput("t1", TOOL);
    h.advance(AUTO_SETUP_RETRY_MS * 3);
    h.monitor.tick();
    expect(h.deps.write).not.toHaveBeenCalled();
    expect(h.deps.onAutoSetup).not.toHaveBeenCalled();
  });

  it("axet-code dışı motorda pilot yok", () => {
    const h = harness({ tool: "axet", model: "" });
    h.monitor.register(reg({ engine: "claude", command: "claude" }));
    h.monitor.onOutput("t1", TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.deps.write).not.toHaveBeenCalled();
    expect(h.deps.axetAutoSetup).not.toHaveBeenCalled();
  });

  it("kayıttan önceki çıktı (backlog) da tanınıyor", () => {
    const h = harness({ tool: "axet", model: "" });
    h.deps.backlog.mockReturnValue(TOOL);
    h.monitor.register(reg());
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.deps.write).toHaveBeenCalledWith("t1", "\r");
  });

  it("kullanıcı yazıyorsa göndermiyor; terminal cevapları yazı sayılmıyor", () => {
    const h = harness({ tool: "axet", model: "" });
    h.monitor.register(reg());
    h.monitor.onInput("t1", "\x1b[?1;2c");
    h.monitor.onOutput("t1", TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.deps.write).toHaveBeenCalledTimes(1);

    const h2 = harness({ tool: "axet", model: "" });
    h2.monitor.register(reg());
    h2.monitor.onInput("t1", "x");
    h2.monitor.onOutput("t1", TOOL);
    h2.advance(AUTO_SETUP_SEND_DELAY_MS);
    h2.monitor.tick();
    expect(h2.deps.write).not.toHaveBeenCalled();
  });

  it("iki denemeden sonra bir kez başarısız bildirimi", () => {
    const h = harness({ tool: "axet", model: "" });
    h.monitor.register(reg());
    h.monitor.onOutput("t1", TOOL);
    for (let i = 0; i < 5; i++) {
      h.advance(AUTO_SETUP_RETRY_MS);
      h.monitor.tick();
    }
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.deps.write).toHaveBeenCalledTimes(2);
    expect(h.deps.onAutoSetup).toHaveBeenCalledTimes(1);
    expect(h.deps.onAutoSetup).toHaveBeenCalledWith(expect.objectContaining({ paneId: "p1" }), { ok: false, dialog: "tool" });
    expect(h.deps.log).toHaveBeenCalledWith("ajan.aracSecimi", { motor: "axet-code", sonuc: "basarisiz" });
  });
});
