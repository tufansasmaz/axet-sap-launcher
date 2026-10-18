// Ekip köprüsü (Tur 4): bölme başına jeton, ekip listesi, soru → cevap, kapılar, yerel HTTP.
import { describe, expect, it, vi } from "vitest";
import { createTeamBridge, startTeamBridgeServer, waitForReply, type TeamBridgeDeps } from "../app-electron/main/teamBridge";
import { withTeamEnv } from "../app-electron/main/terminalManager";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

vi.mock("node-pty", () => ({ spawn: vi.fn() }));

const SECRET = Buffer.alloc(32, 7);

function harness(statusSeq: (AgentStatus | null)[] = [], sendResult: { ok: true } | { ok: false; reason: string } = { ok: true }) {
  let clock = 1_000;
  let i = 0;
  const deps: TeamBridgeDeps = {
    caller: vi.fn((ptyId: string) => (ptyId === "pty-a" ? { workspaceId: "w1", paneId: "a", name: "Ayşe" } : null)),
    members: vi.fn(() => [
      { paneId: "a", name: "Ayşe", role: "Lider", engine: "axet-code", state: "running", exact: true },
      { paneId: "b", name: "Ali", role: "Geliştirici", engine: "axet-code", state: "idle", exact: true }
    ]),
    send: vi.fn(async () => sendResult),
    status: vi.fn(() => statusSeq[Math.min(i++, statusSeq.length - 1)] ?? null),
    feed: vi.fn(() => [{ at: 5, kind: "message" as const, paneId: "a", name: "Ayşe", detail: "selam" }]),
    relay: vi.fn(),
    now: () => clock,
    sleep: vi.fn(async (ms: number) => {
      clock += ms;
    }),
    log: vi.fn()
  };
  const bridge = createTeamBridge(deps, SECRET);
  const headers = (pty = "pty-a", token = bridge.tokenFor(pty)) => ({ "x-ntt-pty": pty, authorization: `Bearer ${token}` });
  return { deps, bridge, headers };
}

describe("teamBridge", () => {
  it("jeton bölmeye özgü; yanlış jeton, başka bölmenin jetonu ve tarayıcı isteği reddediliyor", async () => {
    const { bridge, headers } = harness();
    expect(bridge.tokenFor("pty-a")).not.toBe(bridge.tokenFor("pty-b"));
    expect((await bridge.handle("GET", "/team", headers("pty-a", "x"), "")).status).toBe(401);
    expect((await bridge.handle("GET", "/team", headers("pty-a", bridge.tokenFor("pty-b")), "")).status).toBe(401);
    expect((await bridge.handle("GET", "/team", { ...headers(), origin: "http://kotu" }, "")).status).toBe(401);
    // Kayıtlı ajan olmayan terminal.
    expect((await bridge.handle("GET", "/team", headers("pty-z"), "")).status).toBe(404);
  });

  it("list: ekip üyeleri ve 'sen'; feed: son olaylar", async () => {
    const { bridge, headers } = harness();
    const team = await bridge.handle("GET", "/team", headers(), "");
    expect(team.status).toBe(200);
    expect(team.body.you).toBe("Ayşe");
    expect((team.body.members as { name: string; you: boolean }[]).map((m) => [m.name, m.you])).toEqual([
      ["Ayşe", true],
      ["Ali", false]
    ]);
    const feed = await bridge.handle("GET", "/feed", headers(), "");
    expect((feed.body.events as { detail: string }[])[0].detail).toBe("selam");
  });

  it("ask: hedefe yazıyor, çalışıp boşa düşünce cevabını döndürüyor; akışa iki kart", async () => {
    const { bridge, headers, deps } = harness([
      { state: "idle", source: "exact", lastActivity: 500 },
      { state: "running", source: "exact", lastActivity: 1_500 },
      { state: "idle", source: "exact", lastActivity: 3_000, reply: "Rapor hazır." }
    ]);
    const r = await bridge.handle("POST", "/ask", headers(), JSON.stringify({ to: "ali", message: "Rapor ne durumda?" }));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, from: "Ali", reply: "Rapor hazır." });
    expect(deps.send).toHaveBeenCalledWith("w1", "b", "Ayşe (ekip arkadaşın) soruyor: Rapor ne durumda?");
    expect((deps.relay as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].name)).toEqual(["Ayşe → Ali", "Ali → Ayşe"]);
  });

  it("ask: bilinmeyen ajan, kendine, meşgul hedef, zaman aşımı", async () => {
    const h = harness([{ state: "running", source: "exact", lastActivity: 1 }]);
    expect((await h.bridge.handle("POST", "/ask", h.headers(), JSON.stringify({ to: "Veli", message: "x" }))).status).toBe(404);
    expect((await h.bridge.handle("POST", "/ask", h.headers(), JSON.stringify({ to: "Ayşe", message: "x" }))).status).toBe(400);
    const busy = harness([], { ok: false, reason: "busy" });
    const r = await busy.bridge.handle("POST", "/ask", busy.headers(), JSON.stringify({ to: "Ali", message: "x" }));
    expect(r.status).toBe(409);
    expect(busy.deps.relay).not.toHaveBeenCalled();
    const slow = await h.bridge.handle("POST", "/ask", h.headers(), JSON.stringify({ to: "Ali", message: "x", timeout: 10 }));
    expect(slow.status).toBe(504);
  });

  it("waitForReply: tahmini ajanda yalnız çalışma görüldükten sonra; metin yok", async () => {
    let clock = 0;
    const seq: AgentStatus[] = [
      { state: "idle", source: "estimated", lastActivity: 5 },
      { state: "running", source: "estimated", lastActivity: 6 },
      { state: "idle", source: "estimated", lastActivity: 7 }
    ];
    let i = 0;
    const out = await waitForReply(
      { status: () => seq[Math.min(i++, seq.length - 1)], now: () => clock, sleep: async (ms) => void (clock += ms) },
      "b",
      0,
      60_000
    );
    expect(out).toEqual({ done: true, reply: null });
    expect(i).toBe(3);
  });

  it("yerel HTTP: yalnız 127.0.0.1, JSON cevap", async () => {
    const { bridge, headers } = harness();
    const server = await startTeamBridgeServer(bridge);
    expect(server).not.toBeNull();
    try {
      const res = await fetch(`http://127.0.0.1:${server!.port}/team`, { headers: headers() });
      expect(res.status).toBe(200);
      expect(((await res.json()) as { you: string }).you).toBe("Ayşe");
    } finally {
      server!.close();
    }
  });

  it("withTeamEnv: ek değişkenler ve PATH öneki (Windows 'Path' anahtarı tekil kalır)", () => {
    const env = withTeamEnv({ Path: "C:\\Windows", X: "1" }, { env: { NTT_TEAM_PTY: "p" }, pathPrepend: "C:\\ntt" });
    expect(env.Path).toBe("C:\\ntt;C:\\Windows");
    expect(env.PATH).toBeUndefined();
    expect(env.NTT_TEAM_PTY).toBe("p");
    expect(withTeamEnv({ A: "1" }, {})).toEqual({ A: "1" });
  });
});
