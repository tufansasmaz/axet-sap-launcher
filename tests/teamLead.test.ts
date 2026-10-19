// Tur 7: lider ekip yönetimi (teamLead.ts) — yetki, sınırlar, onay, görev eşleşmesi, kapatma.
import { describe, expect, it, vi } from "vitest";
import { createTeamLead, QUEUE_MAX_MS, type LeadMember, type LeadRelay, type TeamLeadDeps } from "../app-electron/main/teamLead";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { LeadSpawnRequest } from "../app-electron/shared/leadCommands";

const WS = "w1";
const lead: LeadMember = { paneId: "L", name: "Ayşe", role: "Lider", engine: "axet-code" };
const dev: LeadMember = { paneId: "D", name: "Ali", role: "Geliştirici", engine: "axet-code" };
const caller = { workspaceId: WS, paneId: "L", name: "Ayşe" };
const idle = (over: Partial<AgentStatus> = {}): AgentStatus => ({ state: "idle", source: "exact", lastActivity: 0, ...over });

function harness(over: Partial<TeamLeadDeps> = {}, opts: { members?: LeadMember[]; approval?: boolean; max?: number; enabled?: boolean } = {}) {
  let clock = 1_000;
  const members: LeadMember[] = [...(opts.members ?? [lead, dev])];
  const statuses: Record<string, AgentStatus | null> = { L: idle(), D: idle() };
  const outputs: Record<string, string> = {};
  const relays: LeadRelay[] = [];
  const sent: Array<{ paneId: string; text: string }> = [];
  const opened: LeadSpawnRequest[] = [];
  let ids = 0;
  const deps: TeamLeadDeps = {
    members: () => members,
    paneCount: () => members.length,
    settings: () => ({ enabled: opts.enabled !== false, approval: opts.approval === true, max: opts.max ?? 4, lang: "tr" }),
    status: (p) => statuses[p] ?? null,
    send: vi.fn(async (_w, paneId, text) => {
      sent.push({ paneId, text });
      return { ok: true as const };
    }),
    output: (p) => outputs[p] ?? "",
    openPane: vi.fn(async (req: LeadSpawnRequest) => {
      opened.push(req);
      members.push({ paneId: req.paneId, name: req.name, role: req.role, engine: req.engine ?? "axet-code", spawnedBy: req.leaderPaneId });
      statuses[req.paneId] = idle();
      return { ok: true as const, engine: req.engine ?? ("axet-code" as const) };
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
  return { team, deps, members, statuses, outputs, relays, sent, opened, flush, advance: (ms: number) => (clock += ms), now: () => clock };
}

describe("yetki", () => {
  it("yalnız Lider rolündeki bölme; ekip üyesi 403", async () => {
    const h = harness();
    const r = await h.team.handle({ workspaceId: WS, paneId: "D", name: "Ali" }, ["status"]);
    expect(r.status).toBe(403);
  });

  it("lider açımı (Lider etiketli olsa da) ekip kuramaz", async () => {
    const h = harness({}, { members: [lead, { paneId: "X", name: "Kopya", role: "Lider", engine: "axet-code", spawnedBy: "L" }] });
    const r = await h.team.handle({ workspaceId: WS, paneId: "X", name: "Kopya" }, ["spawn", "--rol", "Test"]);
    expect(r.status).toBe(403);
  });

  it("Lider rolünde ajan açılamaz (kendini çoğaltamaz)", async () => {
    const h = harness();
    const r = await h.team.handle(caller, ["spawn", "--rol", "Lead"]);
    expect(r.status).toBe(403);
    expect(h.opened).toHaveLength(0);
  });

  it("ayar kapalıyken spawn yok; assign yine çalışır", async () => {
    const h = harness({}, { enabled: false });
    expect((await h.team.handle(caller, ["spawn", "--rol", "Test"])).status).toBe(403);
    expect((await h.team.handle(caller, ["assign", "Ali", "x"])).status).toBe(200);
  });

  it("yetki yükseltme yok: claude lideri axet-code (-y) açamaz, ozel hiç", async () => {
    const h = harness({}, { members: [{ ...lead, engine: "claude" }, dev] });
    expect((await h.team.handle(caller, ["spawn", "--rol", "Test", "--motor", "axet-code"])).status).toBe(403);
    expect((await h.team.handle(caller, ["spawn", "--rol", "Test", "--motor", "ozel"])).status).toBe(403);
    expect(h.opened).toHaveLength(0);
  });
});

describe("spawn", () => {
  it("açar, Akış'a kart, ilk görevi kuyruğa alır; hazır olunca gönderir", async () => {
    const h = harness();
    const r = await h.team.handle(caller, ["spawn", "--rol", "Test", "--gorev", "basit test yaz"]);
    expect(r.status).toBe(200);
    expect(h.opened[0]).toMatchObject({ workspaceId: WS, name: "Test", role: "Test", roleKind: "preset", leaderPaneId: "L", leaderEngine: "axet-code", engine: null });
    expect(h.relays[0]).toMatchObject({ act: "spawn", paneId: "L", toPaneId: h.opened[0].paneId, detail: "Test (Test)" });
    expect(String(r.body.text)).toMatch(/G-t00\d+ kuyrukta/);
    h.team.tick();
    await h.flush();
    expect(h.sent[0].paneId).toBe(h.opened[0].paneId);
    expect(h.sent[0].text).toContain("basit test yaz");
    expect(h.relays.at(-1)).toMatchObject({ act: "assign", name: "Ayşe → Test" });
  });

  it("aynı görevle yinelenen spawn yeni bölme açmıyor (kabuk zaman aşımı / model yeniden denemesi)", async () => {
    const h = harness();
    await h.team.handle(caller, ["spawn", "--rol", "Test", "--gorev", "test yaz"]);
    const again = await h.team.handle(caller, ["spawn", "--rol", "Test", "--gorev", "test yaz"]);
    expect(again.status).toBe(200);
    expect(String(again.body.text)).toContain("zaten acildi: Test");
    expect(h.opened).toHaveLength(1);
    // farklı görev yeni ajan
    await h.team.handle(caller, ["spawn", "--rol", "Test", "--gorev", "baska"]);
    expect(h.opened).toHaveLength(2);
  });

  it("aynı adda üye varsa sayı eklenir", async () => {
    const h = harness({}, { members: [lead, { ...dev, name: "Geliştirici" }] });
    await h.team.handle(caller, ["spawn", "--rol", "Geliştirici"]);
    expect(h.opened[0].name).toBe("Geliştirici 2");
  });

  it("ekip başına sınır ve toplam bölme sınırı", async () => {
    const h = harness({}, { max: 1 });
    expect((await h.team.handle(caller, ["spawn", "--rol", "Test"])).status).toBe(200);
    expect((await h.team.handle(caller, ["spawn", "--rol", "Analist"])).status).toBe(429);
    const full = harness({ paneCount: () => 9 });
    expect((await full.team.handle(caller, ["spawn", "--rol", "Test"])).status).toBe(429);
  });

  it("eşzamanlı açılış sınırı (2)", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const h = harness({ approve: vi.fn(async () => (await gate, true)) }, { approval: true });
    const a = h.team.handle(caller, ["spawn", "--rol", "Test"]);
    const b = h.team.handle(caller, ["spawn", "--rol", "Analist"]);
    await h.flush();
    expect((await h.team.handle(caller, ["spawn", "--rol", "İnceleme"])).status).toBe(429);
    release();
    expect((await a).status).toBe(200);
    expect((await b).status).toBe(200);
  });

  it("onay açıkken reddedilirse açılmıyor, Akış'a 'reddedildi'", async () => {
    const h = harness({ approve: vi.fn(async () => false) }, { approval: true });
    const r = await h.team.handle(caller, ["spawn", "--rol", "Test", "--gorev", "x"]);
    expect(r.status).toBe(403);
    expect(h.opened).toHaveLength(0);
    expect(h.relays[0]).toMatchObject({ act: "denied" });
    expect(h.deps.approve).toHaveBeenCalledWith(expect.objectContaining({ leader: "Ayşe", name: "Test", role: "Test", task: "x" }));
  });

  it("renderer açamazsa sebep döner", async () => {
    const h = harness({ openPane: vi.fn(async () => ({ ok: false as const, reason: "full" })) });
    const r = await h.team.handle(caller, ["spawn", "--rol", "Test"]);
    expect(r.status).toBe(409);
    expect(h.relays).toHaveLength(0);
  });
});

describe("görev ve sonuç eşleşmesi", () => {
  async function assigned(h: ReturnType<typeof harness>) {
    const r = await h.team.handle(caller, ["assign", "Ali", "README yaz"]);
    const id = String(r.body.id);
    h.team.tick();
    await h.flush();
    return id;
  }

  it("kesin cevaptaki GOREV-SONUC satırı kimlikle eşleşir; wait özeti döndürür", async () => {
    const h = harness();
    const id = await assigned(h);
    expect(h.sent[0].text).toContain(`[${id}]`);
    h.statuses.D = { state: "running", source: "exact", lastActivity: h.now() };
    h.team.tick();
    h.statuses.D = idle({ lastActivity: h.now(), reply: `bitti\nGOREV-SONUC ${id}: README.md yazildi` });
    h.team.tick();
    const w = await h.team.handle(caller, ["wait", id]);
    expect(w.body).toMatchObject({ ok: true, state: "done", matched: true });
    expect(String(w.body.text)).toContain("README.md yazildi");
    expect(h.relays.at(-1)).toMatchObject({ act: "result", paneId: "D", toPaneId: "L", name: "Ali → Ayşe" });
  });

  it("başka görevin cevabı (kimliği yok) eşleşmiş sayılmıyor", async () => {
    const h = harness();
    const id = await assigned(h);
    h.statuses.D = { state: "running", source: "exact", lastActivity: h.now() };
    h.team.tick();
    h.statuses.D = idle({ lastActivity: h.now(), reply: "GOREV-SONUC G-baska: eski is" });
    h.team.tick();
    const w = await h.team.handle(caller, ["wait", id]);
    expect(w.body).toMatchObject({ state: "done", matched: false });
    expect(String(w.body.text)).toContain("ozet satiri yok");
  });

  it("tahmini motor: terminal çıktısındaki satırdan sonuç", async () => {
    const h = harness({}, { members: [lead, { ...dev, engine: "claude" }] });
    const id = await assigned(h);
    h.statuses.D = { state: "running", source: "estimated", lastActivity: h.now() };
    h.outputs.D = `${h.sent[0].text}\r\n...\r\nGOREV-SONUC ${id}: test yazildi\r\n`;
    h.team.tick();
    const w = await h.team.handle(caller, ["wait", id]);
    expect(w.body).toMatchObject({ state: "done", matched: true });
  });

  it("meşgul hedefe gönderilmez, kuyrukta bekler; süresi dolunca başarısız", async () => {
    const h = harness();
    h.statuses.D = { state: "running", source: "exact", lastActivity: 1 };
    const r = await h.team.handle(caller, ["assign", "Ali", "x"]);
    h.team.tick();
    await h.flush();
    expect(h.sent).toHaveLength(0);
    h.advance(QUEUE_MAX_MS + 1);
    h.team.tick();
    const w = await h.team.handle(caller, ["wait", String(r.body.id)]);
    expect(w.body).toMatchObject({ ok: false, state: "failed" });
  });

  it("soru sorarsa wait erken döner (202)", async () => {
    const h = harness();
    const id = await assigned(h);
    h.statuses.D = { state: "asking", source: "exact", lastActivity: h.now(), question: { callId: "c", question: "Hangi klasör?", header: "", options: [], multiSelect: false, askedAt: 1 } };
    h.team.tick();
    const w = await h.team.handle(caller, ["wait", id]);
    expect(w.status).toBe(202);
    expect(String(w.body.text)).toContain("Hangi klasör?");
  });

  it("wait zaman aşımı 202, başkasının görevi 404", async () => {
    const h = harness();
    const id = await assigned(h);
    expect((await h.team.handle(caller, ["wait", id, "--sure", "5"])).status).toBe(202);
    const other = harness({}, { members: [lead, dev, { paneId: "L2", name: "Can", role: "Lead", engine: "axet-code" }] });
    const oid = await assigned(other);
    expect((await other.team.handle({ workspaceId: WS, paneId: "L2", name: "Can" }, ["wait", oid])).status).toBe(404);
  });

  it("kendine görev yok; olmayan ajan 404", async () => {
    const h = harness();
    expect((await h.team.handle(caller, ["assign", "Ayşe", "x"])).status).toBe(400);
    expect((await h.team.handle(caller, ["assign", "Veli", "x"])).status).toBe(404);
  });
});

describe("close ve status", () => {
  it("yalnız kendi açtığını kapatır; kullanıcının açtığına dokunamaz", async () => {
    const h = harness();
    expect((await h.team.handle(caller, ["close", "Ali"])).status).toBe(403);
    await h.team.handle(caller, ["spawn", "--rol", "Test", "--ad", "Tes"]);
    const r = await h.team.handle(caller, ["close", "Tes"]);
    expect(r.status).toBe(200);
    expect(h.deps.closePane).toHaveBeenCalledWith(WS, h.opened[0].paneId, "L");
    expect(h.relays.at(-1)).toMatchObject({ act: "close", detail: "Tes" });
  });

  it("başka liderin açtığını kapatamaz", async () => {
    const h = harness({}, { members: [lead, { paneId: "Z", name: "Zeki", role: "Test", engine: "claude", spawnedBy: "L9" }] });
    expect((await h.team.handle(caller, ["close", "Zeki"])).status).toBe(403);
  });

  it("status: üyeler, işaret, aktif görev, kalan hak", async () => {
    const h = harness();
    await h.team.handle(caller, ["spawn", "--rol", "Analist"]);
    await h.team.handle(caller, ["assign", "Ali", "rapor"]);
    const r = await h.team.handle(caller, ["status"]);
    const text = String(r.body.text);
    expect(text).toContain("Ayşe (sen)");
    expect(text).toContain("Analist [senin actigin]");
    expect(text).toMatch(/G-t00\d+ → Ali: kuyrukta \| rapor/);
    expect(text).toContain("Acilabilecek ajan: 3");
  });
});
