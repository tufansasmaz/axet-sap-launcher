// Başsız tur çalıştırıcı (spec 2026-10-16 basiz-kopru §4–§6). Sahte süreç +
// sahte veritabanı okuyucu; gerçek axet-code ile ölçülen biçimler kullanılıyor.
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { AxetDbMessage } from "../app-electron/main/axetSessionDb";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({ noteUpdateLine: vi.fn() }));

const { buildRunArgs, classifyStderr, startHeadlessTurn } = await import("../app-electron/main/axetHeadless");

const SID = "90645781-855b-4e0e-aaae-8e5efdee112d";

class FakeChild extends EventEmitter {
  pid = 4242;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  written = "";
  ended = false;
  stdin = {
    write: (d: string) => {
      this.written += d;
      return true;
    },
    end: () => {
      this.ended = true;
    },
    on: () => undefined
  };
  exit(code: number | null, stdout = "") {
    if (stdout) this.stdout.emit("data", Buffer.from(stdout, "utf-8"));
    this.emit("close", code);
  }
  err(line: string) {
    this.stderr.emit("data", Buffer.from(line + "\n", "utf-8"));
  }
}

function msg(id: string, role: string, parts: unknown[], createdAt = 2_000_000_000): AxetDbMessage {
  return { id, role, parts: parts as AxetDbMessage["parts"], createdAt };
}
const text = (t: string) => ({ type: "text", data: { text: t } });
const finish = (reason: string, extra: Record<string, unknown> = {}) => ({ type: "finish", data: { reason, ...extra } });

function harness(db: Record<string, AxetDbMessage[]> = {}) {
  const child = new FakeChild();
  const spawned: { cmd: string; args: string[] }[] = [];
  const killed: number[] = [];
  const deps = {
    spawn: (cmd: string, args: string[]) => {
      spawned.push({ cmd, args });
      return child as never;
    },
    env: () => ({}),
    dbPath: () => "C:/p/.axet-code/axet-code.db",
    readMessages: (_p: string, sid: string) => db[sid] ?? [],
    readProgress: () => ({ todos: [], contextTokens: 0, contextLimit: 1_000_000 }),
    killTree: () => {
      killed.push(1);
      setTimeout(() => child.exit(null), 1);
    },
    now: () => Date.now(),
    pollMs: 5,
    progressMs: 1000,
    silenceMs: 60_000,
    hardCapMs: 60_000
  };
  const events = { chunks: [] as string[], activities: [] as Record<string, unknown>[], sessionIds: [] as string[] };
  const base = {
    cwd: "C:/p",
    model: null,
    prompt: "merhaba",
    resumeId: null,
    useConnectors: false,
    onSessionId: (id: string) => events.sessionIds.push(id),
    onChunk: (t: string) => events.chunks.push(t),
    onActivity: (a: Record<string, unknown>) => events.activities.push(a),
    onProgress: () => {}
  };
  return { child, spawned, killed, deps, events, base, db };
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe("buildRunArgs", () => {
  it("yeni oturum ve devam; istem argümanlarda yok", () => {
    expect(buildRunArgs({ cwd: "C:/p", model: null, resumeId: null })).toEqual([
      "run", "-v", "-q", "--output-format", "json", "-c", "C:/p"
    ]);
    expect(buildRunArgs({ cwd: "C:/p", model: { provider: "openai", model: "gpt-5.6-terra" } as never, resumeId: SID })).toEqual([
      "run", "-v", "-q", "--output-format", "json", "--resume", SID, "-c", "C:/p", "-m", "openai/gpt-5.6-terra"
    ]);
  });
});

describe("startHeadlessTurn", () => {
  it("ilk tur: oturum kimliği stderr'den, metin veritabanından (mesajlar arası boş satır), sonuç JSON'dan", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick();
    expect(h.events.sessionIds).toEqual([SID]);
    h.db[SID] = [
      msg("u1", "user", [text("merhaba"), finish("stop")]),
      msg("a1", "assistant", [text("Kontrol ediyorum."), finish("tool_use")]),
      msg("a2", "assistant", [text("Dosyada sorun yok."), finish("end_turn")])
    ];
    await tick();
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "Dosyada sorun yok.", is_error: false }) + "\n");
    const r = await turn.done;
    expect(r).toMatchObject({ ok: true, sessionId: SID, cancelled: false, toolCount: 0, ask: null });
    expect(r.text).toBe("Kontrol ediyorum.\n\nDosyada sorun yok.");
    expect(h.events.chunks.join("")).toBe("Kontrol ediyorum.\n\nDosyada sorun yok.");
  });

  it("devam turu: --resume; önceden var olan mesajlar yayılmıyor", async () => {
    const h = harness({ [SID]: [msg("eski", "assistant", [text("ESKI"), finish("end_turn")], 1)] });
    const turn = startHeadlessTurn({ ...h.base, resumeId: SID }, h.deps as never);
    await tick();
    h.db[SID] = [...h.db[SID], msg("a9", "assistant", [text("YENI"), finish("end_turn")])];
    await tick();
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "YENI", is_error: false }));
    const r = await turn.done;
    expect(h.spawned[0].args).toContain("--resume");
    expect(r.text).toBe("YENI");
    expect(h.events.chunks.join("")).not.toContain("ESKI");
  });

  it("başka oturumun mesajları görünmüyor (inceleme odağı 2)", async () => {
    const h = harness({ "baska-oturum": [msg("x", "assistant", [text("YABANCI")])] });
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick();
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "tamam", is_error: false }));
    const r = await turn.done;
    expect(h.events.chunks.join("")).not.toContain("YABANCI");
    expect(r.text).toBe("tamam");
  });

  it("araç çağrısı ve sonucu olay olarak; araç sayılıyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = [
      msg("a1", "assistant", [
        { type: "tool_call", data: { id: "c1", name: "view", input: '{"file_path":"C:/p/a.abap"}', finished: true } },
        finish("tool_use")
      ]),
      msg("t1", "tool", [{ type: "tool_result", data: { tool_call_id: "c1", content: "satir1\nsatir2", is_error: false } }])
    ];
    await tick(40);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    const r = await turn.done;
    expect(r.toolCount).toBe(1);
    const phases = h.events.activities.map((a) => a.phase);
    expect(phases).toContain("tool");
    expect(phases).toContain("toolResult");
  });

  it("ask_user: sonucu düşünce süreç öldürülüyor, soru dönüyor (spec §5)", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = [
      msg("a1", "assistant", [
        { type: "tool_call", data: { id: "q1", name: "ask_user", input: '{"question":"Hangi transport?","options":[{"label":"K1"},{"label":"K2"}]}', finished: true } },
        finish("tool_use")
      ])
    ];
    await tick(30);
    expect(h.killed).toHaveLength(0); // sonuç yokken öldürmek oturumu bozardı
    h.db[SID] = [
      ...h.db[SID],
      msg("t1", "tool", [{ type: "tool_result", data: { tool_call_id: "q1", content: "No interactive user", is_error: true } }])
    ];
    const r = await turn.done;
    expect(h.killed.length).toBeGreaterThan(0);
    expect(r.ok).toBe(true);
    expect(r.ask).toMatchObject({ question: "Hangi transport?", options: ["K1", "K2"] });
    expect(r.toolCount).toBe(0);
  });

  it("oturum kimliği gelmeden iptal: süreç öldürülüyor, tur iptal (inceleme odağı 3)", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    turn.cancel();
    const r = await turn.done;
    expect(h.killed).toHaveLength(1);
    expect(r).toMatchObject({ ok: false, cancelled: true, sessionId: null });
  });

  it("JSON yok, çıkış 1: temizlenmiş stderr hata, sınıf auth (inceleme odağı 4)", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err("INFO Running in non-interactive mode");
    h.child.err('ERROR provider request failed error="POST https://x/v1/messages: 403 Forbidden"');
    h.child.exit(1);
    const r = await turn.done;
    expect(r.ok).toBe(false);
    expect(r.error).toContain("403 Forbidden");
    expect(r.error).not.toContain("Running in non-interactive");
    expect(r.failure).toBe("auth");
  });

  it("is_error:true JSON → hata, metni sonuçtan", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "context length exceeded", is_error: true }));
    const r = await turn.done;
    expect(r).toMatchObject({ ok: false, sessionId: SID, failure: "context" });
    expect(r.error).toContain("context length exceeded");
  });

  it("Türkçe ve uzun istem stdin'e aynen gidiyor, argümanlarda yok (inceleme odağı 5)", async () => {
    const h = harness();
    const prompt = "Şu ABAP sınıfını incele: ğüşıöç ".repeat(5000);
    const turn = startHeadlessTurn({ ...h.base, prompt }, h.deps as never);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    await turn.done;
    expect(h.child.written).toBe(prompt);
    expect(h.child.ended).toBe(true);
    expect(h.spawned[0].args.join(" ")).not.toContain("ABAP");
  });

  it("süreç açılamazsa spawnFailed", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.emit("error", Object.assign(new Error("spawn axet-code ENOENT"), { code: "ENOENT" }));
    const r = await turn.done;
    expect(r).toMatchObject({ ok: false, spawnFailed: true });
  });

  it("sessizlikte stalled olayı, tur öldürülmüyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, { ...h.deps, silenceMs: 15 } as never);
    await tick(60);
    expect(h.events.activities.some((a) => a.phase === "stalled")).toBe(true);
    expect(h.killed).toHaveLength(0);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    await turn.done;
  });
});

describe("classifyStderr", () => {
  it("yetki, bağlam, sağlayıcı", () => {
    expect(classifyStderr(["ERROR x 401 Unauthorized"])).toBe("auth");
    expect(classifyStderr(["ERROR prompt is too long: context length exceeded"])).toBe("context");
    expect(classifyStderr(["ERROR 529 overloaded_error"])).toBe("provider");
    expect(classifyStderr(["INFO her şey yolunda"])).toBeNull();
    // bağlayıcı uyarısı yetki arızası sayılmıyor (analiz bulgu 10)
    expect(classifyStderr(["WARN connector.sync.failed unauthorized"])).toBeNull();
  });
});
