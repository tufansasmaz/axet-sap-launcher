// Tur 6: tahmini kaynakta "tur" kanıtı, kesin kaynakta aşama, bağ kurulamama
// sebebi ve izleyicide hata bildirimi. Ölçüm (uygulama günlüğü 2026-10-19):
// claude bölmesi kaydedildikten 0,5 sn sonra, hiçbir istem gönderilmeden
// "çalışıyor ≈" oldu; Akış'a "başladı" düştü, 20 sn sessizlikte "bitirdi".
import { describe, expect, it, vi } from "vitest";
import type { AxetDbMessage, AxetPart } from "../app-electron/main/axetSessionDb";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));

const { AxetReader, createSessionRegistry, deriveAxetState, PROMPT_MATCH_WINDOW_MS } = await import("../app-electron/main/agentAxetReader");
const { GenericReader, IDLE_AFTER_MS, genericAgentReader } = await import("../app-electron/main/agentGenericReader");
const { createAgentMonitor } = await import("../app-electron/main/agentMonitor");
const { agentNotificationFor } = await import("../app-electron/main/agentNotification");

const T0 = 1_700_000_000;
let seq = 0;
const text = (t: string): AxetPart => ({ type: "text", data: { text: t } });
const finish = (reason: string): AxetPart => ({ type: "finish", data: { reason } });
const reasoning: AxetPart = { type: "reasoning", data: { text: "..." } };
const call = (id: string, name: string, input: unknown, finished = true): AxetPart => ({
  type: "tool_call",
  data: { id, name, finished, input: typeof input === "string" ? input : JSON.stringify(input) }
});
const result = (id: string): AxetPart => ({ type: "tool_result", data: { tool_call_id: id, content: "ok" } });
const msg = (role: string, parts: AxetPart[], sec = T0): AxetDbMessage => ({ id: `m${++seq}`, role, parts, createdAt: sec });

describe("GenericReader — tur kanıtı (tahmini)", () => {
  function setup() {
    const clock = { ms: 1_000_000 };
    const reader = new GenericReader({ command: "claude", now: () => clock.ms });
    reader.feedOutput("C:\\p>claude\r\n");
    reader.feedOutput("Welcome to Claude Code");
    return { clock, reader };
  }

  it("istem yokken açılış çıktısı ve ekran yenilemesi tur değil", () => {
    const { clock, reader } = setup();
    expect(reader.status().state).toBe("running");
    expect(reader.status().turn).toBeUndefined();
    clock.ms += IDLE_AFTER_MS;
    reader.feedOutput("\x1b[2J redraw");
    expect(reader.status().turn).toBeUndefined();
  });

  it("istem + ardından çıktı = tur başladı; sessizlik = tur bitti; sonraki çıktı bitişi geri almıyor", () => {
    const { clock, reader } = setup();
    clock.ms += 30_000;
    reader.submitLine("raporu yaz");
    expect(reader.status().turn).toBeUndefined();
    clock.ms += 100;
    reader.feedOutput("● Thinking…");
    expect(reader.status().turn).toEqual({ at: 1_030_000, done: false });
    clock.ms += IDLE_AFTER_MS;
    expect(reader.status().turn).toEqual({ at: 1_030_000, done: true });
    reader.feedOutput("k");
    expect(reader.status().turn).toEqual({ at: 1_030_000, done: true });
  });

  it("motor açılmadan ya da kapandıktan sonra yazılan satır ve / komutları tur değil", () => {
    const clock = { ms: 1 };
    const reader = new GenericReader({ command: "claude", now: () => clock.ms });
    reader.submitLine("dir");
    reader.feedOutput("x");
    expect(reader.status().turn).toBeUndefined();
    const { reader: open } = setup();
    open.submitLine("/help");
    open.feedOutput("help text");
    expect(open.status().turn).toBeUndefined();
  });

  it("genel okuyucu yüzü satırı iletiyor ve 'kesin kaynak yok' diyor", () => {
    const { clock, reader } = setup();
    const face = genericAgentReader(reader);
    face.submitLine("raporu yaz");
    clock.ms += 10;
    face.feedOutput("çalışıyor");
    expect(face.status()).toMatchObject({ source: "estimated", link: "unsupported", turn: { done: false } });
  });
});

describe("deriveAxetState — aşama (kesin)", () => {
  const user = msg("user", [text("iş")]);
  it("kullanıcı mesajı / araç sonucu / akıl yürütme → düşünüyor", () => {
    expect(deriveAxetState([user]).phase).toEqual({ kind: "thinking" });
    expect(deriveAxetState([user, msg("assistant", [reasoning])]).phase).toEqual({ kind: "thinking" });
    expect(deriveAxetState([user, msg("assistant", [call("c1", "view", { file_path: "a.ts" }), finish("tool_use")]), msg("tool", [result("c1")])]).phase).toEqual({
      kind: "thinking"
    });
  });

  it("sonucu gelmemiş araç → araç adı ve hedef (süzülmüş, kısa)", () => {
    const d = deriveAxetState([user, msg("assistant", [reasoning, call("c1", "view", { file_path: "src/x.ts" }), finish("tool_use")])]);
    expect(d.state).toBe("running");
    expect(d.phase).toEqual({ kind: "tool", tool: "view", target: "src/x.ts" });
    const bash = deriveAxetState([user, msg("assistant", [call("c2", "bash", { command: "curl -H 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789' x" })])]);
    expect(bash.phase?.kind).toBe("tool");
    expect(bash.phase?.target).not.toContain("abcdefghijklmnopqrstuvwxyz0123456789");
    expect((bash.phase?.target ?? "").length).toBeLessThanOrEqual(60);
  });

  it("yarım (akan) araç girdisi hedef vermiyor; MCP adı sadeleşiyor", () => {
    const d = deriveAxetState([user, msg("assistant", [call("c3", "mcp_conn_0123456789ab_search", '{"query": "ya', false)])]);
    expect(d.phase).toEqual({ kind: "tool", tool: "mcp:search" });
  });

  it("finish'siz metin → cevap yazıyor; boşta/soru durumunda aşama yok", () => {
    expect(deriveAxetState([user, msg("assistant", [text("Rapor")])]).phase).toEqual({ kind: "writing" });
    expect(deriveAxetState([user, msg("assistant", [text("bitti"), finish("end_turn")])]).phase).toBeUndefined();
  });
});

describe("AxetReader — bağ sebebi ve seçim penceresi", () => {
  const DB = "C:\\p\\.axet-code\\axet-code.db";
  function make(db: { rows: (AxetDbMessage & { sessionId: string })[]; missing?: boolean }) {
    const clock = { ms: (T0 + 10) * 1000 };
    const generic = new GenericReader({ command: "axet-code -y", now: () => clock.ms });
    const reader = new AxetReader({
      agentId: "A",
      cwd: "C:\\p",
      startedAtMs: T0 * 1000,
      registry: createSessionRegistry(),
      generic,
      now: () => clock.ms,
      port: {
        resolveDb: () => (db.missing ? null : DB),
        findSessions: (_p, since, needle) => [
          ...new Set(db.rows.filter((m) => m.role === "user" && m.createdAt >= since && m.parts.some((p) => (p.data?.text ?? "").startsWith(needle))).map((m) => m.sessionId))
        ],
        readMessages: (_p, id, since) => db.rows.filter((m) => m.sessionId === id && m.createdAt >= since)
      }
    });
    reader.feedOutput("C:\\p>axet-code -y\r\n");
    return { clock, reader };
  }

  it("seçim penceresi açıkken yazılan satır iğne olmuyor (kaybolan istem 'bulunamadı' üretmesin)", () => {
    const { clock, reader } = make({ rows: [] });
    reader.feedOutput("\x1b[2J Select Tool Choose your development tool");
    reader.submitLine("raporu hazırla");
    clock.ms += PROMPT_MATCH_WINDOW_MS + 1_000;
    reader.feedOutput("\x1b[2J New Session tab focus chat ctrl+j newline");
    reader.poll();
    expect(reader.status().link).toBeUndefined();
    expect(reader.status().state).toBe("idle");
  });

  it("istem 60 sn içinde kayda düşmezse sebep 'notFound'; veritabanı yoksa 'noDb'", () => {
    const { clock, reader } = make({ rows: [] });
    reader.feedOutput("\x1b[2J New Session tab focus chat");
    reader.submitLine("raporu hazırla");
    reader.poll();
    expect(reader.status().link).toBeUndefined();
    clock.ms += PROMPT_MATCH_WINDOW_MS + 1;
    reader.poll();
    expect(reader.status()).toMatchObject({ source: "estimated", link: "notFound" });
    const { reader: noDb } = make({ rows: [], missing: true });
    noDb.feedOutput("\x1b[2J New Session tab focus chat");
    noDb.submitLine("raporu hazırla");
    noDb.poll();
    expect(noDb.status().link).toBe("noDb");
  });

  it("bağ kurulunca sebep kalkıyor, aşama geliyor", () => {
    const rows: (AxetDbMessage & { sessionId: string })[] = [];
    const { clock, reader } = make({ rows });
    reader.feedOutput("\x1b[2J New Session tab focus chat");
    reader.submitLine("raporu hazırla");
    rows.push({ ...msg("user", [text("raporu hazırla")], T0 + 10), sessionId: "S" });
    rows.push({ ...msg("assistant", [call("c1", "glob", { pattern: "**/*.ts" })], T0 + 11), sessionId: "S" });
    clock.ms += 1_000;
    reader.poll();
    const s: AgentStatus = reader.status();
    expect(s).toMatchObject({ source: "exact", state: "running", phase: { kind: "tool", tool: "glob", target: "**/*.ts" } });
    expect(s.link).toBeUndefined();
  });
});

describe("izleyici — hata bildirimi ve aşama değişimi yayını", () => {
  const reg: AgentRegistration = { paneId: "p1", ptyId: "t1", engine: "axet-code", cwd: "C:\\p", command: "axet-code -y", name: "Ayşe", roleKind: "axetAgent", sap: false, added: false };
  function harness() {
    let current: AgentStatus = { state: "idle", source: "exact", lastActivity: 1 };
    const deps = {
      now: () => 1,
      createReader: () => ({ feedOutput() {}, submitLine() {}, poll() {}, status: () => current, engineReady: () => true, dispose() {} }),
      emit: vi.fn(),
      notify: vi.fn(),
      write: () => true,
      backlog: () => "",
      log: vi.fn()
    };
    const monitor = createAgentMonitor(deps);
    monitor.register(reg);
    return { deps, monitor, set: (s: AgentStatus) => (current = s) };
  }

  it("kesin hata bir kez bildiriliyor; tahmini hata bildirilmiyor", () => {
    const { deps, monitor, set } = harness();
    set({ state: "running", source: "exact", lastActivity: 2 });
    monitor.tick();
    set({ state: "error", source: "exact", lastActivity: 3, detail: "error" });
    monitor.tick();
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenLastCalledWith("error", expect.objectContaining({ paneId: "p1" }));
    set({ state: "error", source: "estimated", lastActivity: 3 });
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(1);
  });

  it("çalışırken aşama değişince yeni durum yayınlanıyor", () => {
    const { deps, monitor, set } = harness();
    set({ state: "running", source: "exact", lastActivity: 2, phase: { kind: "thinking" } });
    monitor.tick();
    const before = deps.emit.mock.calls.length;
    set({ state: "running", source: "exact", lastActivity: 3, phase: { kind: "tool", tool: "bash", target: "npm test" } });
    monitor.tick();
    expect(deps.emit.mock.calls.length).toBe(before + 1);
  });

  it("masaüstü bildiriminde hata metni var", () => {
    expect(agentNotificationFor("error", false, true, "Ayşe", "tr")).toEqual({ title: "Ayşe", body: "Ajan hata verdi" });
    expect(agentNotificationFor("error", false, true, "Ayşe", "en")?.body).toBe("The agent hit an error");
  });
});

describe("cevap kartı — uzunluk (Tur 6)", () => {
  // Ölçüm: gerçek oturumdaki son cevap 729 karakterdi; 600 sınırı onu kesiyordu.
  it("1500 karakterlik cevap kartta ve kalıcı akışta kesilmeden kalıyor", async () => {
    const { replySnippet } = await import("../app-electron/main/agentReply");
    const { sanitizeFlowEvents } = await import("../app-electron/shared/flowHistory");
    const reply = "a".repeat(1500);
    expect(replySnippet(reply)).toBe(reply);
    expect(sanitizeFlowEvents([{ at: 1, kind: "finished", paneId: "p", name: "A", detail: "", reply }])[0].reply).toBe(reply);
  });
});
