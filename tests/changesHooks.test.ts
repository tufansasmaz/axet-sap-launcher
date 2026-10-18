// Değişiklikler kancaları (spec 2026-10-18 degisiklikler §4): izleyicinin
// istem satırı kancası. Okuyucu sahte; pano kancası boardManager.test.ts'te.
import { describe, expect, it, vi } from "vitest";
import { createAgentMonitor } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";

class FakeReader implements AgentReader {
  current: AgentStatus = { state: "idle", source: "exact", lastActivity: null };
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

const reg: AgentRegistration = {
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\kok",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "custom",
  sap: false,
  added: false,
  workspaceId: "w1"
};

function harness(onPromptLine: (r: AgentRegistration, line: string) => void) {
  const reader = new FakeReader();
  const monitor = createAgentMonitor({
    now: () => 10_000_000,
    createReader: () => reader,
    emit: () => {},
    notify: () => {},
    write: () => true,
    backlog: () => "",
    log: () => {},
    schedule: (fn) => fn(),
    onPromptLine
  });
  monitor.register(reg);
  return { monitor, reader };
}

describe("onPromptLine (spec §4.2)", () => {
  it("Enter ile biten satır kayıtla gidiyor; Enter'sız taslak gitmiyor", () => {
    const hook = vi.fn();
    const { monitor, reader } = harness(hook);
    monitor.onInput("t1", "testleri düzelt");
    expect(hook).not.toHaveBeenCalled();
    monitor.onInput("t1", "\r");
    expect(hook).toHaveBeenCalledWith(reg, "testleri düzelt");
    expect(reader.lines).toEqual(["testleri düzelt"]);
  });

  it("motor kapalıyken (kabuk istemi) yazılan satır istem sayılmıyor ama okuyucuya gidiyor", () => {
    const hook = vi.fn();
    const { monitor, reader } = harness(hook);
    reader.current = { state: "finished", source: "exact", lastActivity: 1 };
    monitor.tick();
    monitor.onInput("t1", "dir\r");
    expect(hook).not.toHaveBeenCalled();
    expect(reader.lines).toEqual(["dir"]);
  });

  it("onPromptLine fırlatsa da okuyucu satırı alıyor ve sonraki satırlar işleniyor", () => {
    const { monitor, reader } = harness(() => {
      throw new Error("değişiklik yöneticisi patladı");
    });
    expect(() => monitor.onInput("t1", "bir\riki\r")).not.toThrow();
    expect(reader.lines).toEqual(["bir", "iki"]);
  });

  it("pano istemi (sendPrompt) kancaya gitmiyor", () => {
    const hook = vi.fn();
    const { monitor, reader } = harness(hook);
    expect(monitor.sendPrompt("p1", "[Gorev a] iş")).toBe("ok");
    expect(reader.lines).toEqual(["[Gorev a] iş"]);
    expect(hook).not.toHaveBeenCalled();
  });
});
