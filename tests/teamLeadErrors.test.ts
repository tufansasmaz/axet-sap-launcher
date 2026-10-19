// Tur 9: lider görevlerinde hata — otomatik deneme sürerken bekleme, kesin hatada
// lidere tek bildirim, takılma, kullanıcı işinde bilgi, yeniden atama sınırı, kapı.
import { describe, expect, it, vi } from "vitest";
import { createTeamLead, type LeadMember, type LeadRelay, type TeamLeadDeps } from "../app-electron/main/teamLead";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import { leadHint, leadTaskPrompt, type LeadSpawnRequest } from "../app-electron/shared/leadCommands";

const WS = "w1";
const lead: LeadMember = { paneId: "L", name: "Ayse", role: "Lider", engine: "axet-code" };
const dev: LeadMember = { paneId: "D", name: "Ali", role: "Geliştirici", engine: "axet-code" };
const dev2: LeadMember = { paneId: "E", name: "Veli", role: "Geliştirici", engine: "axet-code" };
const caller = { workspaceId: WS, paneId: "L", name: "Ayse" };
const idle = (over: Partial<AgentStatus> = {}): AgentStatus => ({ state: "idle", source: "exact", lastActivity: 0, ...over });

function harness(over: Partial<TeamLeadDeps> = {}, opts: { members?: LeadMember[]; stallMs?: number } = {}) {
  let clock = 1_000;
  const members: LeadMember[] = [...(opts.members ?? [lead, dev, dev2])];
  const statuses: Record<string, AgentStatus | null> = { L: idle(), D: idle(), E: idle() };
  const relays: LeadRelay[] = [];
  const sent: Array<{ paneId: string; text: string }> = [];
  let ids = 0;
  const deps: TeamLeadDeps = {
    members: () => members,
    paneCount: () => members.length,
    settings: () => ({ enabled: true, approval: false, max: 4, lang: "tr", stallMs: opts.stallMs ?? 10 * 60_000 }),
    status: (p) => statuses[p] ?? null,
    send: vi.fn(async (_w, paneId, text) => {
      sent.push({ paneId, text });
      return { ok: true as const };
    }),
    output: () => "",
    openPane: vi.fn(async (req: LeadSpawnRequest) => {
      members.push({ paneId: req.paneId, name: req.name, role: req.role, engine: "axet-code", spawnedBy: req.leaderPaneId });
      statuses[req.paneId] = idle();
      return { ok: true as const, engine: "axet-code" as const };
    }),
    closePane: vi.fn(async () => true),
    approve: vi.fn(async () => true),
    relay: (e) => relays.push(e),
    newPaneId: () => `P${++ids}`,
    newTaskId: () => `G-t00${++ids}`,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    log: () => {},
    ...over
  };
  const team = createTeamLead(deps);
  const flush = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };
  const tick = async () => {
    team.tick();
    await flush();
  };
  const toLeader = () => sent.filter((s) => s.paneId === "L").map((s) => s.text);
  return { team, deps, members, statuses, relays, sent, flush, tick, toLeader, advance: (ms: number) => (clock += ms), now: () => clock };
}

async function assign(h: ReturnType<typeof harness>, to = "Ali", text = "README yaz") {
  const r = await h.team.handle(caller, ["assign", to, text]);
  await h.tick();
  return String(r.body.id);
}

const failing = (h: ReturnType<typeof harness>, over: Partial<AgentStatus>): AgentStatus => ({
  state: "error",
  source: "exact",
  lastActivity: h.now(),
  detail: "error",
  error: { cls: "rateLimit", detail: "429 Too Many Requests", source: "exact" },
  ...over
});

describe("otomatik deneme sürerken", () => {
  it("görev düşmez; wait sınıf ve denemeyi söyler; lidere mesaj yok", async () => {
    const h = harness();
    const id = await assign(h);
    h.statuses.D = { state: "running", source: "exact", lastActivity: h.now() };
    await h.tick();
    h.statuses.D = failing(h, { attempts: 0, maxAttempts: 3, retry: { attempt: 1, max: 3, at: h.now() + 10_000 } });
    await h.tick();
    const w = await h.team.handle(caller, ["wait", id, "--sure", "1"]);
    expect(w.status).toBe(202);
    expect(w.body).toMatchObject({ state: "retrying", errorClass: "rateLimit", attempt: 1, max: 3 });
    expect(h.toLeader()).toEqual([]);
  });
});

describe("kesin hata", () => {
  it("denemeler tükendi: görev düşer, lidere tek bildirim + Akış kartı; wait sınıf/deneme döndürür", async () => {
    const h = harness();
    const id = await assign(h);
    h.statuses.D = { state: "running", source: "exact", lastActivity: h.now() };
    await h.tick();
    h.statuses.L = { state: "running", source: "exact", lastActivity: h.now() };
    h.statuses.D = failing(h, { attempts: 3, maxAttempts: 3, retryBlocked: "exhausted" });
    await h.tick();
    expect(h.relays.find((r) => r.act === "error")).toMatchObject({ paneId: "D", toPaneId: "L" });
    expect(h.toLeader()).toEqual([]); // lider meşgul: kuyrukta
    h.statuses.L = idle({ lastActivity: h.now() });
    await h.tick();
    await h.tick();
    expect(h.toLeader()).toHaveLength(1);
    expect(h.toLeader()[0]).toContain(id);
    expect(h.toLeader()[0]).toContain("istek siniri");
    expect(h.toLeader()[0]).toContain("3/3");
    expect(h.toLeader()[0]).toMatch(/Oneri:.*yeni ajan acma/);
    const w = await h.team.handle(caller, ["wait", id]);
    expect(w.body).toMatchObject({ ok: false, state: "failed", errorClass: "rateLimit", attempts: 3, max: 3 });
  });

  it("kalıcı hata (model): kullanıcıya bildir önerisi", async () => {
    const h = harness();
    await assign(h);
    h.statuses.D = failing(h, { error: { cls: "model", detail: "model not found", source: "exact" }, retryBlocked: "permanent" });
    await h.tick();
    await h.tick();
    expect(h.toLeader()[0]).toMatch(/model bulunamadi.*kullaniciya bildir/);
  });

  it("yeniden deneme satırı lider görevinin istemi", async () => {
    const h = harness();
    const id = await assign(h);
    expect(h.team.retryText("D")).toBe(leadTaskPrompt("Ayse", id, "README yaz"));
    expect(h.team.retryText("E")).toBeNull();
  });
});

describe("takılma", () => {
  it("aşama değişmeden eşik geçince lidere bir kez", async () => {
    const h = harness({}, { stallMs: 60_000 });
    const id = await assign(h);
    const running = { state: "running" as const, source: "exact" as const, lastActivity: h.now(), phase: { kind: "tool" as const, tool: "bash" } };
    h.statuses.D = running;
    await h.tick();
    h.advance(59_000);
    await h.tick();
    expect(h.toLeader()).toEqual([]);
    h.advance(2_000);
    await h.tick();
    await h.tick();
    await h.tick();
    expect(h.toLeader()).toHaveLength(1);
    expect(h.toLeader()[0]).toContain(id);
    expect(h.toLeader()[0]).toContain("ntt-team ask Ali");
    expect(h.relays.filter((r) => r.act === "stall")).toHaveLength(1);
  });
  it("aşama değişirse sayaç sıfırlanır; 0 kapalı", async () => {
    const h = harness({}, { stallMs: 60_000 });
    await assign(h);
    h.statuses.D = { state: "running", source: "exact", lastActivity: h.now(), phase: { kind: "thinking" } };
    await h.tick();
    h.advance(50_000);
    h.statuses.D = { state: "running", source: "exact", lastActivity: h.now(), phase: { kind: "writing" } };
    await h.tick();
    h.advance(50_000);
    await h.tick();
    expect(h.toLeader()).toEqual([]);
    const off = harness({}, { stallMs: 0 });
    await assign(off);
    off.statuses.D = { state: "running", source: "exact", lastActivity: off.now(), phase: { kind: "thinking" } };
    await off.tick();
    off.advance(3_600_000 - 1);
    await off.tick();
    expect(off.toLeader()).toEqual([]);
  });
});

describe("kullanıcının kendi işi", () => {
  it("lider varsa yalnız bilgi; lider kendisi ya da lider yoksa mesaj yok", async () => {
    const h = harness();
    h.team.onAgentError(WS, "D", failing(h, { retryBlocked: "exhausted", attempts: 3, maxAttempts: 3 }));
    h.team.onAgentError(WS, "D", failing(h, { retryBlocked: "exhausted", attempts: 3, maxAttempts: 3 }));
    h.team.onAgentError(WS, "L", failing(h, {}));
    await h.tick();
    await h.tick();
    expect(h.toLeader()).toHaveLength(1);
    expect(h.toLeader()[0]).toMatch(/Bilgi: Ali.*karisma/);
    const solo = harness({}, { members: [dev, dev2] });
    solo.team.onAgentError(WS, "D", failing(solo, {}));
    await solo.tick();
    expect(solo.sent).toEqual([]);
  });
  it("lider görevi olan ajanda bilgi gitmez (görev yolu söyler)", async () => {
    const h = harness();
    await assign(h);
    h.team.onAgentError(WS, "D", failing(h, { retryBlocked: "permanent" }));
    await h.tick();
    expect(h.toLeader().filter((t) => t.includes("Bilgi"))).toEqual([]);
  });
});

describe("yeniden atama", () => {
  async function failTask(h: ReturnType<typeof harness>, paneId: "D" | "E") {
    h.statuses[paneId] = failing(h, { retryBlocked: "exhausted", attempts: 3, maxAttempts: 3, lastActivity: h.now() });
    await h.tick();
    h.statuses[paneId] = idle({ lastActivity: h.now() });
    h.advance(1_000);
  }
  it("düşen görevin aynısı başka ajana: 'yeniden atadı' kartı; en çok 2 kez", async () => {
    const h = harness();
    await assign(h, "Ali");
    await failTask(h, "D");
    const r1 = await h.team.handle(caller, ["assign", "Veli", "README yaz"]);
    expect(r1.status).toBe(200);
    expect(h.relays.at(-1)).toMatchObject({ act: "reassign", toPaneId: "E" });
    await h.tick();
    await failTask(h, "E");
    const r2 = await h.team.handle(caller, ["assign", "Ali", "README yaz"]);
    expect(r2.status).toBe(200);
    await h.tick();
    await failTask(h, "D");
    const r3 = await h.team.handle(caller, ["assign", "Veli", "README yaz"]);
    expect(r3.status).toBe(429);
    expect(String(r3.body.error)).toContain("kullaniciya");
  });
});

describe("eşzamanlılık kapısı", () => {
  it("kapı kapalıyken görev sırada bekler, bir kez 'sırada' kartı; açılınca gider", async () => {
    let gate: "ok" | "full" = "full";
    const h = harness({ gate: vi.fn(() => gate) });
    await h.team.handle(caller, ["assign", "Ali", "README yaz"]);
    await h.tick();
    await h.tick();
    expect(h.sent).toEqual([]);
    expect(h.relays.filter((r) => r.act === "queued")).toHaveLength(1);
    gate = "ok";
    await h.tick();
    expect(h.sent).toHaveLength(1);
  });
  it("lider bildirimleri lider önceliğiyle kapıdan geçer", async () => {
    const gate = vi.fn((_p: string, _e: string, isLead: boolean) => (isLead ? ("ok" as const) : ("full" as const)));
    const h = harness({ gate });
    h.team.onAgentError(WS, "D", failing(h, {}));
    await h.tick();
    expect(h.toLeader()).toHaveLength(1);
    expect(gate).toHaveBeenCalledWith("L", "axet-code", true);
  });
});

describe("lider rehberi", () => {
  it("hata ve 429 yönergesi", () => {
    const hint = leadHint(4, true);
    expect(hint).toContain("ntt-team status");
    expect(hint).toMatch(/gecici/);
    expect(hint).toMatch(/429/);
    expect(hint).toMatch(/kullaniciya bildir/);
  });
});
