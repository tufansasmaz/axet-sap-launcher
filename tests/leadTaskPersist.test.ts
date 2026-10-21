// Tur 13: lider görevleri kalıcı (leadTaskStore.ts + teamLead.ts). Uygulama
// kapanınca bekleyen görevler kaybolmuyor; açılışta "yeniden başladı — durum
// bilinmiyor" olarak işaretleniyor, lidere tek satır, Akış'ta kart.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTeamLead, type LeadMember, type LeadRelay, type LeadTask, type TeamLeadDeps } from "../app-electron/main/teamLead";
import { createLeadTaskStore, LEAD_TASKS_PER_TEAM } from "../app-electron/main/leadTaskStore";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const WS = "w1";
const lead: LeadMember = { paneId: "L", name: "Ayşe", role: "Lider", engine: "axet-code" };
const dev: LeadMember = { paneId: "D", name: "Ali", role: "Geliştirici", engine: "axet-code" };
const caller = { workspaceId: WS, paneId: "L", name: "Ayşe" };
const idle = (over: Partial<AgentStatus> = {}): AgentStatus => ({ state: "idle", source: "exact", lastActivity: 0, ...over });

const task = (over: Partial<LeadTask> = {}): LeadTask => ({
  id: "G-aaaa",
  workspaceId: WS,
  leaderPaneId: "L",
  leaderName: "Ayşe",
  targetPaneId: "D",
  targetName: "Ali",
  text: "Raporu yaz",
  state: "sent",
  createdAt: 10,
  sentAt: 20,
  ...over
});

function harness(loaded: LeadTask[] = [], statuses: Record<string, AgentStatus | null> = { L: idle(), D: idle() }) {
  let clock = 1_000;
  const relays: LeadRelay[] = [];
  const sent: Array<{ paneId: string; text: string }> = [];
  const saved: Array<{ workspaceId: string; tasks: LeadTask[] }> = [];
  const ids = ["G-aaaa", "G-bbbb", "G-cccc"];
  const deps: TeamLeadDeps = {
    members: () => [lead, dev],
    paneCount: () => 2,
    settings: () => ({ enabled: true, approval: false, max: 4, lang: "tr" }),
    status: (p) => statuses[p] ?? null,
    send: vi.fn(async (_w, paneId, text) => {
      sent.push({ paneId, text });
      return { ok: true as const };
    }),
    output: () => "",
    openPane: vi.fn(async () => ({ ok: false as const, reason: "x" })),
    closePane: vi.fn(async () => true),
    approve: vi.fn(async () => true),
    relay: (e) => relays.push(e),
    newPaneId: () => "P1",
    newTaskId: () => ids.shift() ?? "G-zzzz",
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    log: () => {},
    store: { load: () => loaded, save: (workspaceId, tasks) => saved.push({ workspaceId, tasks: tasks.map((t) => ({ ...t })) }) }
  };
  const team = createTeamLead(deps);
  const flush = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };
  return { team, relays, sent, saved, statuses, flush, advance: (ms: number) => (clock += ms) };
}

describe("lider görevleri kalıcı", () => {
  it("görev değişince ekip başına kaydediliyor; değişmeyince yeniden yazılmıyor", async () => {
    const h = harness();
    await h.team.handle(caller, ["assign", "Ali", "Raporu yaz"]);
    h.team.tick();
    await h.flush();
    h.team.tick();
    const last = h.saved.at(-1);
    expect(last?.workspaceId).toBe(WS);
    expect(last?.tasks.map((t) => t.id)).toContain("G-aaaa");
    expect(last?.tasks[0].state).toBe("sent");
    const count = h.saved.length;
    h.team.tick();
    h.team.tick();
    expect(h.saved.length).toBe(count);
  });

  it("açılışta bitmemiş görev 'yeniden başladı' olarak düşüyor; bitmiş olduğu gibi kalıyor", async () => {
    const h = harness([task(), task({ id: "G-dddd", state: "done", result: "tamam" })]);
    h.team.tick();
    await h.flush();
    const restored = h.team.tasks().find((t) => t.id === "G-aaaa");
    expect(restored?.state).toBe("failed");
    expect(restored?.restarted).toBe(true);
    expect(restored?.note).toMatch(/yeniden basladi/i);
    expect(h.team.tasks().find((t) => t.id === "G-dddd")?.state).toBe("done");
    const r = await h.team.handle(caller, ["wait", "G-aaaa", "--sure", "1"]);
    expect(r.body.state).toBe("failed");
    expect(String(r.body.error)).toMatch(/yeniden basladi/i);
  });

  it("lidere tek satır bilgi ve Akış'ta tek kart (birden çok görev de olsa)", async () => {
    const h = harness([task(), task({ id: "G-eeee", state: "queued" })]);
    h.team.tick();
    await h.flush();
    h.team.tick();
    await h.flush();
    const toLeader = h.sent.filter((s) => s.paneId === "L");
    expect(toLeader).toHaveLength(1);
    expect(toLeader[0].text).toContain("G-aaaa");
    expect(toLeader[0].text).toContain("G-eeee");
    expect(toLeader[0].text).toContain("ntt-team status");
    const cards = h.relays.filter((r) => r.act === "restart");
    expect(cards).toHaveLength(1);
    expect(cards[0].workspaceId).toBe(WS);
  });

  it("lider henüz kayıtlı değilse bildirim bekliyor; kaydolunca gidiyor", async () => {
    const h = harness([task()], { L: null, D: null });
    h.team.tick();
    await h.flush();
    expect(h.sent).toHaveLength(0);
    expect(h.relays.filter((r) => r.act === "restart")).toHaveLength(0);
    h.statuses.L = idle();
    h.team.tick();
    await h.flush();
    h.team.tick();
    await h.flush();
    expect(h.sent.filter((s) => s.paneId === "L")).toHaveLength(1);
    expect(h.relays.filter((r) => r.act === "restart")).toHaveLength(1);
  });

  it("status yeniden başlatmada kesilen görevleri listeliyor", async () => {
    const h = harness([task()]);
    h.team.tick();
    const r = await h.team.handle(caller, ["status"]);
    expect(String(r.body.text)).toMatch(/G-aaaa/);
    expect(String(r.body.text)).toMatch(/yeniden basladi/i);
  });

  it("görev kimliği yüklenen görevlerle çakışmıyor", async () => {
    const h = harness([task({ id: "G-aaaa", state: "done" })]);
    h.team.tick();
    const r = await h.team.handle(caller, ["assign", "Ali", "Yeni iş"]);
    expect(r.body.id).toBe("G-bbbb");
  });
});

describe("leadTaskStore", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "lead-tasks-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("yaz → oku aynı; geçici dosya kalmıyor; ekip başına dosya", () => {
    const store = createLeadTaskStore(() => dir);
    store.save(WS, [task(), task({ id: "G-bbbb", workspaceId: WS, state: "done", result: "ok", matched: true })]);
    store.save("w2", [task({ id: "G-cccc", workspaceId: "w2" })]);
    expect(readdirSync(dir).sort()).toEqual(["w1.json", "w2.json"]);
    const all = createLeadTaskStore(() => dir).load();
    expect(all.map((t) => t.id).sort()).toEqual(["G-aaaa", "G-bbbb", "G-cccc"]);
    expect(all.find((t) => t.id === "G-bbbb")).toMatchObject({ state: "done", result: "ok", matched: true });
  });

  it("gizli süzgeç yazarken", () => {
    const store = createLeadTaskStore(() => dir);
    store.save(WS, [task({ text: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U" })]);
    expect(readFileSync(path.join(dir, "w1.json"), "utf-8")).not.toContain("eyJhbGciOiJIUzI1NiJ9.eyJzdWIi");
  });

  it("sınır: ekip başına en çok LEAD_TASKS_PER_TEAM; bitmemişler önce korunuyor", () => {
    const store = createLeadTaskStore(() => dir);
    const many = Array.from({ length: LEAD_TASKS_PER_TEAM + 10 }, (_, i) => task({ id: `G-d${String(i).padStart(3, "0")}`, state: "done", createdAt: i + 100 }));
    store.save(WS, [task({ id: "G-open", createdAt: 1 }), ...many]);
    const back = store.load();
    expect(back).toHaveLength(LEAD_TASKS_PER_TEAM);
    expect(back.some((t) => t.id === "G-open")).toBe(true);
  });

  it("bozuk dosya, geçersiz kimlik ve ad: yok sayılıyor, fırlatmıyor", () => {
    writeFileSync(path.join(dir, "w1.json"), "{bozuk", "utf-8");
    writeFileSync(path.join(dir, "w2.json"), JSON.stringify({ version: 1, tasks: [{ id: "x" }, task({ id: "G-ffff", workspaceId: "w2" })] }), "utf-8");
    writeFileSync(path.join(dir, "..bad.json"), "[]", "utf-8");
    const back = createLeadTaskStore(() => dir).load();
    expect(back.map((t) => t.id)).toEqual(["G-ffff"]);
    expect(() => createLeadTaskStore(() => path.join(dir, "yok")).load()).not.toThrow();
  });
});
