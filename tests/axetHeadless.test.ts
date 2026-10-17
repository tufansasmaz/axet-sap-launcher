// Başsız tur çalıştırıcı (spec 2026-10-16 basiz-kopru §4–§6). Sahte süreç +
// sahte veritabanı okuyucu; gerçek axet-code ile ölçülen biçimler kullanılıyor.
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { AxetDbMessage } from "../app-electron/main/axetSessionDb";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({ noteUpdateLine: vi.fn() }));
const parseSpy = vi.hoisted(() => ({ calls: 0 }));
vi.mock("../app-electron/main/axetToolEvents", async (orig) => {
  const real = await orig<typeof import("../app-electron/main/axetToolEvents")>();
  return {
    ...real,
    parseAskUser: (...a: Parameters<typeof real.parseAskUser>) => {
      parseSpy.calls++;
      return real.parseAskUser(...a);
    }
  };
});

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

  const toolTurn = () => [
    msg("a1", "assistant", [
      text("Yazıyorum."),
      { type: "tool_call", data: { id: "c1", name: "write", input: '{"file_path":"C:/p/a.abap"}', finished: true } },
      finish("tool_use")
    ])
  ];

  it("I1: veritabanı ilk yoklamalarda yok, sonra oluşuyor → metin ve araç görülüyor", async () => {
    const h = harness();
    let asked = 0;
    // Yeni klasörde ilk tur: `.axet-code` axet-code açıldıktan sonra kuruluyor.
    const deps = { ...h.deps, dbPath: () => (++asked <= 3 ? null : "C:/p/.axet-code/axet-code.db") };
    const turn = startHeadlessTurn(h.base, deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = toolTurn();
    await tick(60);
    expect(h.events.chunks.join("")).toContain("Yazıyorum.");
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    const r = await turn.done;
    expect(r.toolCount).toBe(1);
    expect(r.toolsUnknown).toBeFalsy();
  });

  it("I1: oturum kimliği yalnız JSON'da → onSessionId çağrılıyor, son yoklama araçları sayıyor", async () => {
    const h = harness({ [SID]: toolTurn() });
    const turn = startHeadlessTurn(h.base, h.deps as never);
    await tick();
    h.child.exit(1, JSON.stringify({ type: "result", session_id: SID, result: "529 overloaded", is_error: true }));
    const r = await turn.done;
    expect(h.events.sessionIds).toEqual([SID]);
    expect(r.toolCount).toBe(1);
    expect(r.ok).toBe(false);
  });

  it("I1: oturum belli ama veritabanı hiç bulunamadı → toolsUnknown", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, { ...h.deps, dbPath: () => null } as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick();
    h.child.exit(1);
    const r = await turn.done;
    expect(r.toolsUnknown).toBe(true);
  });

  it("I3a: gösterilen hata bağlayıcı uyarılarını atıyor ve SONU tutuyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    for (let i = 0; i < 5; i++) h.child.err(`WARN connector.sync failed name=outlook-${i} error="token yok"`);
    for (let i = 0; i < 40; i++) h.child.err(`ERROR adim ${i} ${"x".repeat(60)}`);
    h.child.err("ERROR panic: asıl sebep burada");
    h.child.exit(2);
    const r = await turn.done;
    expect(r.error).toContain("asıl sebep burada");
    expect(r.error).not.toContain("connector.sync");
  });

  it("I3b: bağlayıcının unauthorized uyarısı turu yetki arızası yapmıyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err('WARN connector.sync failed name=outlook error="401 unauthorized"');
    h.child.err("ERROR panic: runtime error: invalid memory address");
    h.child.exit(2);
    const r = await turn.done;
    expect(r.failure).not.toBe("auth");
    expect(r.error).toContain("invalid memory address");
  });

  it("I3c: JSON olmayan stdout (zorunlu güncelleme) hata metnine giriyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.exit(1, "Mandatory update required. Installed version: 1.4.1 New version: 1.5.0\n");
    const r = await turn.done;
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Mandatory update required");
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

describe("veritabanı okuma hatası (zamanlayıcıdan kaçmamalı)", () => {
  it("readMessages her seferinde atıyor: tur JSON'dan tamamlanıyor, atma yok, toolsUnknown", async () => {
    const h = harness();
    const deps = {
      ...h.deps,
      readMessages: () => {
        throw new Error("SQLITE_BUSY");
      }
    };
    const turn = startHeadlessTurn(h.base, deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick(40);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "tamam", is_error: false }));
    const r = await turn.done;
    expect(r).toMatchObject({ ok: true, text: "tamam", sessionId: SID });
    expect(r.toolsUnknown).toBe(true);
  });

  it("devam turunda ilk okuma atıyor: startHeadlessTurn atmıyor", async () => {
    const h = harness();
    const deps = {
      ...h.deps,
      readMessages: () => {
        throw new Error("SQLITE_CORRUPT");
      }
    };
    const turn = startHeadlessTurn({ ...h.base, resumeId: SID }, deps as never);
    await tick();
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "tamam", is_error: false }));
    const r = await turn.done;
    expect(r.ok).toBe(true);
    expect(r.toolsUnknown).toBe(true);
  });

  it("readProgress atıyor: yoklama sürüyor, metin akıyor", async () => {
    const h = harness();
    const deps = {
      ...h.deps,
      progressMs: 0,
      readProgress: () => {
        throw new Error("SQLITE_BUSY");
      }
    };
    const turn = startHeadlessTurn(h.base, deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = [msg("a1", "assistant", [text("Akıyor."), finish("end_turn")])];
    await tick(40);
    expect(h.events.chunks.join("")).toBe("Akıyor.");
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "Akıyor.", is_error: false }));
    expect((await turn.done).ok).toBe(true);
  });
});

describe("toolsUnknown: sayım güvenilmez", () => {
  it("oturum kimliği de JSON da yok, hiçbir çıktı da yok (sessiz çöküş) → toolsUnknown", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.exit(2);
    const r = await turn.done;
    expect(r.sessionId).toBeNull();
    expect(r.toolsUnknown).toBe(true);
  });

  it("açılış hatası (oturum yok, stderr'de hata): hiçbir şey çalışmadı, toolsUnknown yok", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err("INFO Running in non-interactive mode");
    h.child.err('ERROR failed to start error="unknown model: openai/yok-boyle"');
    h.child.exit(1);
    const r = await turn.done;
    expect(r.ok).toBe(false);
    expect(r.error).toContain("unknown model");
    expect(r.toolsUnknown).toBeFalsy();
  });

  it("zorunlu güncelleme (oturum yok, düz stdout): toolsUnknown yok", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.exit(1, "Mandatory update required. Installed version: 1.4.1 New version: 1.5.0\n");
    const r = await turn.done;
    expect(r.toolsUnknown).toBeFalsy();
  });

  it("tur ortasında bir okuma başarısız olduysa sonraki başarılı okuma toolsUnknown'u silmiyor", async () => {
    const h = harness();
    let n = 0;
    const deps = {
      ...h.deps,
      readMessages: (p: string, sid: string) => {
        if (++n === 2) throw new Error("SQLITE_BUSY");
        return h.deps.readMessages(p, sid);
      }
    };
    const turn = startHeadlessTurn(h.base, deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = [msg("a1", "assistant", [text("tamam"), finish("end_turn")])];
    await tick(60);
    expect(n).toBeGreaterThan(2);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "tamam", is_error: false }));
    const r = await turn.done;
    expect(r.ok).toBe(true);
    expect(r.toolsUnknown).toBe(true);
  });

  it("süreç hiç açılamadıysa toolsUnknown yok", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.emit("error", Object.assign(new Error("spawn axet-code ENOENT"), { code: "ENOENT" }));
    const r = await turn.done;
    expect(r.toolsUnknown).toBeFalsy();
  });
});

describe("ayrıştırılamayan ask_user", () => {
  it("sıradan araç satırı olarak gösteriliyor, sonucu yetim değil, bir kez ayrıştırılıyor", async () => {
    parseSpy.calls = 0;
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = [
      msg("a1", "assistant", [
        { type: "tool_call", data: { id: "q1", name: "ask_user", input: "{bozuk", finished: true } },
        finish("tool_use")
      ]),
      msg("t1", "tool", [{ type: "tool_result", data: { tool_call_id: "q1", content: "No interactive user", is_error: true } }])
    ];
    await tick(60);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "kendim seçtim", is_error: false }));
    const r = await turn.done;
    expect(r.ask).toBeNull();
    expect(h.killed).toHaveLength(0);
    const forQ1 = h.events.activities.filter((a) => a.callId === "q1");
    expect(forQ1.map((a) => a.phase)).toEqual(["tool", "toolResult"]);
    expect(forQ1[0].tool).toBe("ask_user");
    expect(parseSpy.calls).toBe(1);
  });
});

describe("classifyStderr", () => {
  it("HTTP durum kodu yalnız HTTP bağlamında sayılıyor", () => {
    // yanlış pozitifler: sıradan sayılar
    expect(classifyStderr(["ERROR parse failed at line 403"])).toBeNull();
    expect(classifyStderr(["ERROR request took 503 ms"])).toBeNull();
    expect(classifyStderr(["ERROR retried 429 times, giving up"])).toBeNull();
    expect(classifyStderr(["ERROR file has 401 entries"])).toBeNull();
    // doğru pozitifler
    expect(classifyStderr(["ERROR upstream status 403"])).toBe("auth");
    expect(classifyStderr(['ERROR provider request failed error="POST https://x/v1/messages: 403 Forbidden"'])).toBe("auth");
    expect(classifyStderr(["ERROR status code: 401"])).toBe("auth");
    expect(classifyStderr(["ERROR HTTP 503"])).toBe("provider");
    expect(classifyStderr(["ERROR HTTP/1.1 502 Bad Gateway"])).toBe("provider");
    expect(classifyStderr(['ERROR POST https://x/v1/messages: 529 {"type":"error"}'])).toBe("provider");
    expect(classifyStderr(["ERROR got status=429"])).toBe("provider");
    // JSON gövdesi ve cümle sonu
    expect(classifyStderr(['ERROR body={"code":403}'])).toBe("auth");
    expect(classifyStderr(['ERROR body={"status":529}'])).toBe("provider");
    expect(classifyStderr(["ERROR upstream (code: 503)"])).toBe("provider");
    expect(classifyStderr(["ERROR codes [x: 429]"])).toBe("provider");
    expect(classifyStderr(["ERROR request failed: 401."])).toBe("auth");
    expect(classifyStderr(["ERROR request failed: 502; retrying"])).toBe("provider");
    expect(classifyStderr(["WARN 500 Internal Server Error"])).toBe("provider");
  });

  it("yetki, bağlam, sağlayıcı", () => {
    expect(classifyStderr(["ERROR x 401 Unauthorized"])).toBe("auth");
    expect(classifyStderr(["ERROR prompt is too long: context length exceeded"])).toBe("context");
    expect(classifyStderr(["ERROR 529 overloaded_error"])).toBe("provider");
    expect(classifyStderr(["INFO her şey yolunda"])).toBeNull();
    // bağlayıcı uyarısı yetki arızası sayılmıyor (analiz bulgu 10)
    expect(classifyStderr(["WARN connector.sync.failed unauthorized"])).toBeNull();
  });
});

describe("thinking fazı yayımı (hızlı ilk cevap)", () => {
  it("yeni tur: Created session satırında thinking yayımlanıyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick();
    const phases = h.events.activities.map((a) => a.phase);
    expect(phases).toContain("thinking");
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    await turn.done;
  });

  it("devam turu (--resume): stdin yazılır yazılmaz thinking yayımlanıyor, Created session gelmeden", async () => {
    const h = harness({ [SID]: [msg("eski", "assistant", [text("ESKI"), finish("end_turn")], 1)] });
    const turn = startHeadlessTurn({ ...h.base, resumeId: SID }, h.deps as never);
    // Henüz hiçbir stderr satırı gelmedi; stdin yazılır yazılmaz thinking bekliyoruz.
    await tick();
    const phases = h.events.activities.map((a) => a.phase);
    expect(phases).toContain("thinking");
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "YENI", is_error: false }));
    await turn.done;
  });

  it("ısınmış süreçte: tampondan gelen Created session satırından thinking yayımlanıyor", async () => {
    const { createPrewarmPool } = await import("../app-electron/main/axetPrewarm");
    const real = new FakeChild();
    const pool = createPrewarmPool({
      spawn: () => real as never,
      env: () => ({}),
      killTree: () => {},
      setTimer: () => 0,
      clearTimer: () => {}
    });
    const key = { chatId: "c2", cwd: "C:/p", model: null, resumeId: null, useConnectors: false };
    pool.prewarm(key);
    // Created session tampona düşüyor (sahiplenilmeden önce)
    real.err(`INFO Created session for non-interactive run session_id=${SID}`);
    const prewarmed = pool.take(key)!;
    const h = harness();
    const turn = startHeadlessTurn({ ...h.base, prewarmed }, h.deps as never);
    await tick();
    const phases = h.events.activities.map((a) => a.phase);
    expect(phases).toContain("thinking");
    real.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "tamam", is_error: false }));
    const r = await turn.done;
    expect(r.ok).toBe(true);
  });
});

describe("ısınmış süreç (İş 1)", () => {
  it("prewarmed: spawn yok, tampondaki stderr satırları (güncelleme satırı dahil) işleniyor, istem yazılıyor", async () => {
    const { noteUpdateLine } = await import("../app-electron/main/axetCodeVersion");
    const { createPrewarmPool } = await import("../app-electron/main/axetPrewarm");
    vi.mocked(noteUpdateLine).mockClear();
    const real = new FakeChild();
    const pool = createPrewarmPool({
      spawn: () => real as never,
      env: () => ({}),
      killTree: () => {},
      setTimer: () => 0,
      clearTimer: () => {}
    });
    const key = { chatId: "c1", cwd: "C:/p", model: null, resumeId: null, useConnectors: false };
    pool.prewarm(key);
    real.err("WARN A new version of aXet.Code is available: 1.5.0");
    const prewarmed = pool.take(key)!;
    const h = harness();
    const turn = startHeadlessTurn({ ...h.base, prewarmed }, h.deps as never);
    expect(h.spawned).toHaveLength(0);
    expect(real.written).toBe("merhaba");
    expect(real.ended).toBe(true);
    real.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick();
    expect(noteUpdateLine).toHaveBeenCalledWith("WARN A new version of aXet.Code is available: 1.5.0");
    expect(h.events.sessionIds).toEqual([SID]);
    real.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "tamam", is_error: false }));
    const r = await turn.done;
    expect(r).toMatchObject({ ok: true, text: "tamam", sessionId: SID });
  });
});
