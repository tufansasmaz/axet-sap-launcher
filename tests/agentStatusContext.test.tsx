// @vitest-environment jsdom
// Durum aboneliği: olaylar, anlık görüntü, motorlar, cevap (spec 2026-10-17 ajan-alani §4, §7).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { AgentStatusProvider, useAgentStatuses, type AgentStatusValue } from "../src/agents/agentStatusContext";
import type { AgentStatus, AgentStatusEvent } from "../app-electron/shared/agentTypes";

const idle: AgentStatus = { state: "idle", source: "exact", lastActivity: 1 };
const running: AgentStatus = { state: "running", source: "exact", lastActivity: 2 };

let listener: ((event: AgentStatusEvent) => void) | null;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let value: AgentStatusValue;

function Probe() {
  value = useAgentStatuses();
  return null;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  listener = null;
  api = {
    onAgentStatus: vi.fn((cb: (event: AgentStatusEvent) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
    agentSnapshot: vi.fn(async () => [
      { paneId: "p1", status: idle },
      { paneId: "p2", status: idle }
    ]),
    agentEngines: vi.fn(async () => [{ id: "claude", installed: true, blocked: false }]),
    agentAnswer: vi.fn(async () => ({ ok: true }))
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

describe("AgentStatusProvider", () => {
  it("olay ve anlık görüntü birleşiyor; yeni olay eski görüntüyle ezilmiyor; motorlar yükleniyor", async () => {
    render(
      <AgentStatusProvider>
        <Probe />
      </AgentStatusProvider>
    );
    act(() => listener?.({ paneId: "p1", status: running }));
    await flush();
    expect(value.statuses.p1).toEqual(running);
    expect(value.statuses.p2).toEqual(idle);
    expect(value.engines).toEqual([{ id: "claude", installed: true, blocked: false }]);
  });

  it("cevap ana sürece gidiyor; IPC hatası writeFailed oluyor", async () => {
    render(
      <AgentStatusProvider>
        <Probe />
      </AgentStatusProvider>
    );
    await flush();
    expect(await value.answer("p1", "c1", 1)).toEqual({ ok: true });
    expect(api.agentAnswer).toHaveBeenCalledWith("p1", "c1", 1);
    api.agentAnswer.mockRejectedValueOnce(new Error("ipc"));
    expect(await value.answer("p1", "c1", 1)).toEqual({ ok: false, reason: "writeFailed" });
  });

  it("kaldırılınca abonelik bırakılıyor", async () => {
    const r = render(
      <AgentStatusProvider>
        <Probe />
      </AgentStatusProvider>
    );
    await flush();
    r.unmount();
    expect(listener).toBeNull();
  });

  it("sağlayıcı yokken boş değer (sağlayıcısız bileşen testleri çalışsın)", () => {
    render(<Probe />);
    expect(value.statuses).toEqual({});
    expect(value.engines).toBeNull();
  });
});
