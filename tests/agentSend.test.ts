// Akış'taki mesaj kutusu (spec 2026-10-18 ajanlar-yeniden §2): seçili ajana
// Görev Panosu'nun yolundan tek satır istem. Meşgul/soru/yazıyor gibi
// retlerde sebep döner, yeniden denenmez.
import { describe, expect, it, vi } from "vitest";
import { createAgentSender, type AgentSenderDeps } from "../app-electron/main/agentSend";
import { AGENT_MESSAGE_MAX, agentMessagePrompt } from "../app-electron/shared/agentMessage";
import type { BrowserAgentPresence } from "../app-electron/shared/browserLogic";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const status = (state: AgentStatus["state"]): AgentStatus => ({ state, source: "exact", lastActivity: null });

describe("agentMessagePrompt", () => {
  it("nötr önek, boşluklar sadeleşir", () => {
    expect(agentMessagePrompt("  testleri   çalıştır ")).toBe("[Mesaj] testleri çalıştır");
  });

  it("boş, çok satırlı, denetim karakterli, çok uzun, ! ile başlayan ya da metin olmayan reddedilir", () => {
    expect(agentMessagePrompt("")).toBeNull();
    expect(agentMessagePrompt("   ")).toBeNull();
    expect(agentMessagePrompt("bir\niki")).toBeNull();
    expect(agentMessagePrompt("a\u0007b")).toBeNull();
    expect(agentMessagePrompt("x".repeat(AGENT_MESSAGE_MAX + 1))).toBeNull();
    expect(agentMessagePrompt("!dir")).toBeNull();
    expect(agentMessagePrompt("  !dir")).toBeNull();
    expect(agentMessagePrompt(42)).toBeNull();
    expect(agentMessagePrompt("x".repeat(AGENT_MESSAGE_MAX))).toBe(`[Mesaj] ${"x".repeat(AGENT_MESSAGE_MAX)}`);
  });
});

function harness(over: Partial<AgentSenderDeps> = {}) {
  const presence: BrowserAgentPresence = { status: status("idle"), inputIdle: true, engineReady: true };
  const logs: [string, Record<string, unknown>][] = [];
  const deps: AgentSenderDeps = {
    workspace: vi.fn((id: string) => id === "w1"),
    agent: vi.fn((ws: string, pane: string) => (ws === "w1" && pane === "p1" ? presence : null)),
    sendPrompt: vi.fn((_pane: string, _text: string, onSettled: (outcome: "sent" | "aborted") => void) => {
      queueMicrotask(() => onSettled("sent"));
      return "ok" as const;
    }),
    log: (tag, fields) => logs.push([tag, fields]),
    ...over
  };
  return { sender: createAgentSender(deps), deps, presence, logs };
}

describe("createAgentSender", () => {
  it("önekli tek satır gönderilir; günlükte içerik yok", async () => {
    const { sender, deps, logs } = harness();
    await expect(sender.send("w1", "p1", "derle")).resolves.toEqual({ ok: true });
    expect(deps.sendPrompt).toHaveBeenCalledWith("p1", "[Mesaj] derle", expect.any(Function));
    expect(JSON.stringify(logs)).not.toContain("derle");
    expect(logs[0]?.[0]).toBe("ajan.mesaj");
  });

  it("geçersiz girdi hiçbir şey göndermez", async () => {
    const { sender, deps } = harness();
    await expect(sender.send("w1", "p1", "!dir")).resolves.toEqual({ ok: false, reason: "invalid" });
    await expect(sender.send(1, "p1", "a")).resolves.toEqual({ ok: false, reason: "invalid" });
    await expect(sender.send("w1", null, "a")).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(deps.sendPrompt).not.toHaveBeenCalled();
  });

  it("alan ya da ajan yoksa sebep döner", async () => {
    const { sender } = harness();
    await expect(sender.send("w2", "p1", "a")).resolves.toEqual({ ok: false, reason: "noWorkspace" });
    await expect(sender.send("w1", "p9", "a")).resolves.toEqual({ ok: false, reason: "noAgent" });
  });

  it.each([
    ["running", true, "busy"],
    ["asking", true, "asking"],
    ["finished", true, "notRunning"],
    ["idle", false, "typing"]
  ] as const)("ajan %s (girdi boş: %s) → %s, yeniden denenmez", async (state, idle, reason) => {
    const { sender, deps, presence } = harness();
    presence.status = status(state);
    presence.inputIdle = idle;
    await expect(sender.send("w1", "p1", "a")).resolves.toEqual({ ok: false, reason });
    expect(deps.sendPrompt).not.toHaveBeenCalled();
  });

  it("izleyicinin reddi ve Enter iptali sebep olarak döner", async () => {
    const busy = harness({ sendPrompt: vi.fn(() => "busy" as const) });
    await expect(busy.sender.send("w1", "p1", "a")).resolves.toEqual({ ok: false, reason: "busy" });
    expect(busy.deps.sendPrompt).toHaveBeenCalledTimes(1);
    const aborted = harness({
      sendPrompt: vi.fn((_p: string, _t: string, onSettled: (o: "sent" | "aborted") => void) => {
        onSettled("aborted");
        return "ok" as const;
      })
    });
    await expect(aborted.sender.send("w1", "p1", "a")).resolves.toEqual({ ok: false, reason: "notSubmitted" });
  });

  it("bağımlılık fırlatırsa writeFailed", async () => {
    const { sender } = harness({
      sendPrompt: vi.fn(() => {
        throw new Error("x");
      })
    });
    await expect(sender.send("w1", "p1", "a")).resolves.toEqual({ ok: false, reason: "writeFailed" });
  });
});
