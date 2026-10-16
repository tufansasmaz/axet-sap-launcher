// Sohbet yüzü: bağlama, devam, yeniden deneme, soru akışı, iptal
// (spec 2026-10-16 basiz-kopru §4–§7). Tur çalıştırıcı sahte.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { HeadlessTurnArgs, HeadlessTurnResult } from "../app-electron/main/axetHeadless";

const h = vi.hoisted(() => ({
  bindings: new Map<string, { sessionId: string; cwd: string }>(),
  unanswered: new Set<string>(),
  status: { kind: "ok", version: "1.4.1" } as { kind: string; version?: string },
  logs: [] as { tag: string; fields: Record<string, unknown> }[],
  // surum denetimini bloke etmek icin: null = aninda don, Promise = bekleme
  statusBlock: null as Promise<void> | null
}));

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string, p?: unknown) => (p ? `${k} ${JSON.stringify(p)}` : k) }));
vi.mock("../app-electron/main/appLog", () => ({ appLog: (tag: string, fields: Record<string, unknown>) => h.logs.push({ tag, fields }) }));
vi.mock("../app-electron/main/activeContext", () => ({ buildContextPreamble: () => "" }));
vi.mock("../app-electron/main/connectorPolicy", () => ({ shouldUseConnectors: () => false }));
vi.mock("../app-electron/main/connectorHealth", () => ({ connectorGuidance: () => "" }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({
  axetBinaryStatus: async () => { if (h.statusBlock) await h.statusBlock; return h.status; },
  axetBinaryMessage: (s: { kind: string }) => (s.kind === "ok" ? null : `chat.axet:${s.kind}`)
}));
vi.mock("../app-electron/main/axetSessionBinding", () => ({
  readBinding: (id: string) => h.bindings.get(id) ?? null,
  writeBinding: (id: string, b: { sessionId: string; cwd: string }) => h.bindings.set(id, b),
  clearBinding: (id: string) => h.bindings.delete(id)
}));
vi.mock("../app-electron/main/axetSessionDb", () => ({
  resolveSessionDb: () => "C:/p/.axet-code/axet-code.db",
  sessionHasUnansweredToolCall: (_db: string, sid: string) => h.unanswered.has(sid)
}));

const chat = await import("../app-electron/main/axetChat");

type Script = (args: HeadlessTurnArgs) => Partial<HeadlessTurnResult> | Promise<Partial<HeadlessTurnResult>>;
const calls: HeadlessTurnArgs[] = [];
let cancels = 0;

function script(...steps: Script[]) {
  let i = 0;
  chat.__setTurnStarter(((args: HeadlessTurnArgs) => {
    calls.push(args);
    const step = steps[Math.min(i++, steps.length - 1)];
    let cancel: () => void = () => {};
    const done = new Promise<HeadlessTurnResult>((resolve) => {
      cancel = () => {
        cancels++;
        resolve({ ok: false, text: "", sessionId: args.resumeId, cancelled: true, timedOut: false, spawnFailed: false, toolCount: 0, ask: null, failure: null });
      };
      Promise.resolve(step(args)).then((r) =>
        resolve({ ok: true, text: "", sessionId: "S1", cancelled: false, timedOut: false, spawnFailed: false, toolCount: 0, ask: null, failure: null, ...r })
      );
    });
    return { done, cancel: () => cancel() };
  }) as never);
}

const send = (requestId = "r1", message = "merhaba", history = [] as { role: "user" | "assistant"; content: string }[]) =>
  chat.sendChatMessage(requestId, "chat-1", "C:/p", null, history, message, () => {}, (a) => activities.push(a as never));
let activities: Record<string, unknown>[] = [];

beforeEach(() => {
  h.bindings.clear();
  h.unanswered.clear();
  h.status = { kind: "ok", version: "1.4.1" };
  h.logs = [];
  h.statusBlock = null;
  calls.length = 0;
  cancels = 0;
  activities = [];
});

describe("sendChatMessage", () => {
  it("1.4'ten eski axet-code: tur başlamıyor, açık hata, chatBusy false", async () => {
    h.status = { kind: "old", version: "1.3.0" };
    script(() => ({ text: "x" }));
    const r = await send();
    expect(r).toMatchObject({ ok: false, error: "chat.axet:old" });
    expect(calls).toHaveLength(0);
    expect(chat.chatBusy("chat-1")).toBe(false);
  });

  it("ilk tur yeni oturum, kimlik bağlanıyor; ikinci tur --resume ve geçmiş tohumlanmıyor", async () => {
    script(
      (a) => {
        a.onSessionId("S1");
        return { text: "bir", sessionId: "S1" };
      },
      () => ({ text: "iki", sessionId: "S1" })
    );
    expect((await send("r1", "ilk")).text).toBe("bir");
    expect(calls[0].resumeId).toBeNull();
    expect(h.bindings.get("chat-1")).toMatchObject({ sessionId: "S1", cwd: "C:/p" });
    const r2 = await send("r2", "ikinci", [{ role: "user", content: "ilk" }, { role: "assistant", content: "bir" }]);
    expect(r2.text).toBe("iki");
    expect(calls[1].resumeId).toBe("S1");
    expect(calls[1].prompt).not.toContain("Önceki konuşma");
  });

  it("bağlı oturumda sonuçsuz araç çağrısı varsa yeni oturum + geçmiş tohumu (inceleme odağı 1)", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    h.unanswered.add("S0");
    script(() => ({ text: "tamam", sessionId: "S2" }));
    await send("r1", "devam", [{ role: "user", content: "eski soru" }, { role: "assistant", content: "eski cevap" }]);
    expect(calls[0].resumeId).toBeNull();
    expect(calls[0].prompt).toContain("Önceki konuşma");
    expect(calls[0].prompt).toContain("eski soru");
  });

  it("klasör değiştiyse bağlı oturum kullanılmıyor", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/baska" });
    script(() => ({ text: "x" }));
    await send();
    expect(calls[0].resumeId).toBeNull();
  });

  it("araçsız hatada tek yeniden deneme; başarılıysa sonuç tamam", async () => {
    script(
      () => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 0 }),
      () => ({ ok: true, text: "kurtardı" })
    );
    const r = await send();
    expect(calls).toHaveLength(2);
    expect(r).toMatchObject({ ok: true, text: "kurtardı", restartedReason: "provider" });
  });

  it("araçsız hatada tek yeniden deneme; ikincisi de düşerse hata döner", async () => {
    script(
      () => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 0 }),
      () => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 0 })
    );
    const r = await send();
    expect(calls).toHaveLength(2);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("529 overloaded");
  });

  it("araç çalıştıysa yeniden gönderme yok; canContinue", async () => {
    script(() => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 3, text: "yarım" }));
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r).toMatchObject({ ok: false, canContinue: true });
    expect(r.error).toContain("529 overloaded");
  });

  it("bağlam doldu: yeni oturum, geçmiş tohumlanıyor (araçsız)", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    script(
      () => ({ ok: false, error: "context length exceeded", failure: "context", toolCount: 0, sessionId: "S0" }),
      () => ({ ok: true, text: "yeni oturumda", sessionId: "S3" })
    );
    const r = await send("r1", "soru", [{ role: "user", content: "a" }, { role: "assistant", content: "b" }]);
    expect(calls[0].resumeId).toBe("S0");
    expect(calls[1].resumeId).toBeNull();
    expect(calls[1].prompt).toContain("Önceki konuşma");
    expect(r).toMatchObject({ ok: true, restartedReason: "context" });
  });

  it("secenekler bloğu: askUser olayı, cevap aynı oturuma yeni tur; renderer'a tek tur", async () => {
    const FENCE = "```";
    script(
      (a) => {
        a.onSessionId("S1");
        return { text: `Hangisi?\n\n${FENCE}secenekler\n- K1\n- K2\n${FENCE}`, sessionId: "S1" };
      },
      () => ({ text: "K2 ile devam ettim.", sessionId: "S1" })
    );
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    const ask = activities.find((a) => a.phase === "askUser")!;
    expect(ask.options).toEqual(["K1", "K2"]);
    expect(chat.answerChatQuestion("r1", 1)).toBe(true);
    const r = await pending;
    expect(calls[1].resumeId).toBe("S1");
    expect(calls[1].prompt).toContain("K2");
    expect(r.ok).toBe(true);
    expect(r.text).toBe("Hangisi?\n\nK2 ile devam ettim.");
  });

  it("ask_user ağı: tur öldürülmüş, soru gösteriliyor; serbest metin cevabı gidiyor", async () => {
    script(
      () => ({ text: "", sessionId: "S1", ask: { callId: "q1", question: "Paket?", header: "", options: ["ZA", "ZB"], multiSelect: false } }),
      () => ({ text: "ZC kullanıldı.", sessionId: "S1" })
    );
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", -1, "ZC");
    const r = await pending;
    expect(calls[1].prompt).toContain("ZC");
    expect(r.text).toBe("ZC kullanıldı.");
  });

  it("soru vazgeçilirse (-1, metinsiz) tur sorunun metniyle biter", async () => {
    script(() => ({ text: "", sessionId: "S1", ask: { callId: "q1", question: "Paket?", header: "", options: ["ZA", "ZB"], multiSelect: false } }));
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", -1);
    const r = await pending;
    expect(calls).toHaveLength(1);
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Paket?");
  });

  it("iptal: çalışan tur durduruluyor, karar hemen 'durdu'", async () => {
    script(() => new Promise(() => {}));
    const pending = send();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const verdicts: unknown[] = [];
    chat.cancelChatMessage("r1", (id, v) => verdicts.push([id, v]));
    const r = await pending;
    expect(cancels).toBe(1);
    expect(r.cancelled).toBe(true);
    expect(verdicts).toEqual([["chat-1", { stopped: true, reason: "canceled" }]]);
  });

  it("soru beklerken iptal: tur iptal olarak kapanıyor", async () => {
    script(() => ({ text: "", sessionId: "S1", ask: { callId: "q1", question: "?", header: "", options: ["A", "B"], multiSelect: false } }));
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.cancelChatMessage("r1");
    expect((await pending).cancelled).toBe(true);
  });

  it("resetChatHistory bağı düşürüyor; sonraki tur yeni oturum", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    expect(chat.resetChatHistory("chat-1")).toBe(true);
    script(() => ({ text: "x" }));
    await send();
    expect(calls[0].resumeId).toBeNull();
  });

  it("politika engeli: yeniden gönderme yok, açıklayıcı metin", async () => {
    script(() => ({ ok: false, error: "request_blocked", failure: "blocked", toolCount: 0 }));
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r.error).toBe("chatTui.policyBlocked");
  });

  it("403: 15 sn bekleyip bir kez yeniden; sürerse kalıcı 403 metni", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      script(() => ({ ok: false, error: "403 Forbidden", failure: "auth", toolCount: 0 }));
      const pending = send();
      await vi.waitFor(() => expect(calls).toHaveLength(1));
      await vi.advanceTimersByTimeAsync(chat.AUTH_RETRY_MS);
      const r = await pending;
      expect(calls).toHaveLength(2);
      expect(r.error).toBe("chatTui.restartStillFailingAuth");
    } finally {
      vi.useRealTimers();
    }
  });

  it("zorunlu güncelleme: yeniden gönderme yok, sürümlü metin", async () => {
    script(() => ({
      ok: false,
      error: "Mandatory update required. Installed version: 1.4.1 New version: 1.5.0",
      failure: null,
      toolCount: 0
    }));
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r.error).toContain("chatTui.updateRequiredVersions");
    expect(r.error).toContain("1.5.0");
  });

  it("günlük: kopru.tur, içerik yok", async () => {
    script(() => ({ text: "gizli cevap metni", sessionId: "S1" }));
    await send("r1", "gizli soru metni");
    const tur = h.logs.find((l) => l.tag === "kopru.tur");
    expect(tur).toBeTruthy();
    expect(JSON.stringify(h.logs)).not.toContain("gizli");
  });

  it("sürüm denetimi sırasında iptal: tur başlamıyor, karar 'iptal', karar geri bildirimi geldi", async () => {
    // Düzeltme 1: run, await axetBinaryStatus() ÖNCE kaydedilmeli ki iptal
    // pencerede kaybolmasın.
    let unblockStatus!: () => void;
    h.statusBlock = new Promise<void>((r) => { unblockStatus = r; });
    script(() => ({ text: "x" }));
    const verdicts: unknown[] = [];
    const pending = send("r1");
    // run kayıtlı olduğu için chatBusy hemen true dönmeli
    await vi.waitFor(() => expect(chat.chatBusy("chat-1")).toBe(true));
    chat.cancelChatMessage("r1", (id, v) => verdicts.push([id, v]));
    unblockStatus();
    const r = await pending;
    expect(r.cancelled).toBe(true);
    expect(calls).toHaveLength(0);
    expect(verdicts).toEqual([["chat-1", { stopped: true, reason: "canceled" }]]);
    expect(chat.chatBusy("chat-1")).toBe(false);
  });

  it("403 bekleme süresi iptal edilebiliyor: bekleme bitmeden sonuç iptal", async () => {
    // Düzeltme 2: AUTH_RETRY_MS beklentisi run.wakeDelay aracılığıyla iptal
    // çağrısında erken bitirilebilmeli; 15 s geçmeden promise kapanmalı.
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      script(
        () => ({ ok: false, error: "403 Forbidden", failure: "auth", toolCount: 0 }),
        () => ({ ok: true, text: "ikinci tur" })
      );
      const verdicts: unknown[] = [];
      const pending = send("r1");
      await vi.waitFor(() => expect(calls).toHaveLength(1));
      // 15 s geçmeden iptal ediyoruz
      chat.cancelChatMessage("r1", (id, v) => verdicts.push([id, v]));
      const r = await pending;
      // Zamanlayıcıyı ilerletmeden promise çözülmüş olmalı
      expect(r.cancelled).toBe(true);
      expect(calls).toHaveLength(1); // ikinci tur başlamamalı
      expect(verdicts).toEqual([["chat-1", { stopped: true, reason: "canceled" }]]);
    } finally {
      vi.useRealTimers();
    }
  });
});
