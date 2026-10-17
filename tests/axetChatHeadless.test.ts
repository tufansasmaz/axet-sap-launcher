// Sohbet yüzü: bağlama, devam, yeniden deneme, soru akışı, iptal
// (spec 2026-10-16 basiz-kopru §4–§7). Tur çalıştırıcı sahte.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { HeadlessTurnArgs, HeadlessTurnResult } from "../app-electron/main/axetHeadless";

const h = vi.hoisted(() => ({
  bindings: new Map<string, { sessionId: string; cwd: string }>(),
  unanswered: new Set<string>(),
  // veritabanında artık bulunmayan oturumlar (sessionTitle null döner)
  missing: new Set<string>(),
  status: { kind: "ok", version: "1.4.1" } as { kind: string; version?: string },
  logs: [] as { tag: string; fields: Record<string, unknown> }[],
  // surum denetimini bloke etmek icin: null = aninda don, Promise = bekleme
  statusBlock: null as Promise<void> | null,
  // oturumda saklı mesajlar (yeniden denemede son mesaj bizim mi?)
  stored: new Map<string, { id: string; role: string; parts: unknown[]; createdAt: number }[]>()
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
  sessionHasUnansweredToolCall: (_db: string, sid: string) => h.unanswered.has(sid),
  sessionTitle: (_db: string, sid: string) => (h.missing.has(sid) ? null : "baslik"),
  readMessagesSince: (_db: string, sid: string) => h.stored.get(sid) ?? []
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
  h.missing.clear();
  h.status = { kind: "ok", version: "1.4.1" };
  h.logs = [];
  h.statusBlock = null;
  h.stored.clear();
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

  it("iptal: çalışan tur durduruluyor ve cancelled döner", async () => {
    script(() => new Promise(() => {}));
    const pending = send();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    chat.cancelChatMessage("r1");
    const r = await pending;
    expect(cancels).toBe(1);
    expect(r.cancelled).toBe(true);
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

  it("sürüm denetimi sırasında iptal: tur başlamıyor, cancelled döner", async () => {
    // Düzeltme 1: run, await axetBinaryStatus() ÖNCE kaydedilmeli ki iptal
    // pencerede kaybolmasın.
    let unblockStatus!: () => void;
    h.statusBlock = new Promise<void>((r) => { unblockStatus = r; });
    script(() => ({ text: "x" }));
    const pending = send("r1");
    // run kayıtlı olduğu için chatBusy hemen true dönmeli
    await vi.waitFor(() => expect(chat.chatBusy("chat-1")).toBe(true));
    chat.cancelChatMessage("r1");
    unblockStatus();
    const r = await pending;
    expect(r.cancelled).toBe(true);
    expect(calls).toHaveLength(0);
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
      const pending = send("r1");
      await vi.waitFor(() => expect(calls).toHaveLength(1));
      // 15 s geçmeden iptal ediyoruz
      chat.cancelChatMessage("r1");
      const r = await pending;
      // Zamanlayıcıyı ilerletmeden promise çözülmüş olmalı
      expect(r.cancelled).toBe(true);
      expect(calls).toHaveLength(1); // ikinci tur başlamamalı
    } finally {
      vi.useRealTimers();
    }
  });

  it("closeChatSession bağı siliyor (sohbet silindi)", () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    chat.closeChatSession("chat-1");
    expect(h.bindings.has("chat-1")).toBe(false);
  });

  const ASK = { callId: "q1", question: "Hangi paket?", header: "", options: ["ZA", "ZB"], multiSelect: false };

  it("C1: araç çalıştı, soru cevaplandı, cevap turu bağlamla düştü → yeniden gönderme yok, canContinue", async () => {
    script(
      () => ({ text: "Dosyayı yazdım.", sessionId: "S1", toolCount: 2, ask: ASK }),
      () => ({ ok: false, error: "context length exceeded", failure: "context", toolCount: 0, sessionId: "S1" }),
      () => ({ ok: true, text: "ORIJINAL ISTEK YENIDEN" })
    );
    const pending = send("r1", "dosyayı yaz ve paketi sor");
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", 1);
    const r = await pending;
    expect(calls).toHaveLength(2);
    expect(r.ok).toBe(false);
    expect(r.canContinue).toBe(true);
    expect(r.error).toContain("context length exceeded");
  });

  it("C1: araçsız soru-cevap sonrası bağlam hatası → yeni oturum tohumu cevabı da taşıyor", async () => {
    script(
      () => ({ text: "Önce sormam gerek.", sessionId: "S1", toolCount: 0, ask: ASK }),
      () => ({ ok: false, error: "context length exceeded", failure: "context", toolCount: 0, sessionId: "S1" }),
      () => ({ ok: true, text: "ZB ile tamam.", sessionId: "S4" })
    );
    const pending = send("r1", "ilk istek", [{ role: "user", content: "eski" }, { role: "assistant", content: "eski cevap" }]);
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", 1);
    const r = await pending;
    expect(calls).toHaveLength(3);
    expect(calls[2].resumeId).toBeNull();
    expect(calls[2].prompt).toContain("eski cevap");
    expect(calls[2].prompt).toContain("ilk istek");
    expect(calls[2].prompt).toContain("Önce sormam gerek.");
    expect(calls[2].prompt).toContain("Hangi paket?");
    expect(calls[2].prompt).toContain("ZB");
    expect(r).toMatchObject({ ok: true, restartedReason: "context" });
  });

  it("I2: cevaptan önce oturumda sonuçsuz araç çağrısı varsa cevap yeni oturuma tohumla gidiyor", async () => {
    script(
      () => ({ text: "Bakıyorum.", sessionId: "S1", toolCount: 0, ask: ASK }),
      () => ({ ok: true, text: "ZA ile devam.", sessionId: "S5" })
    );
    const pending = send("r1", "paket seç", [{ role: "user", content: "önceki" }, { role: "assistant", content: "önceki cevap" }]);
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    h.unanswered.add("S1");
    chat.answerChatQuestion("r1", 0);
    const r = await pending;
    expect(calls).toHaveLength(2);
    expect(calls[1].resumeId).toBeNull();
    expect(calls[1].prompt).toContain("Önceki konuşma");
    expect(calls[1].prompt).toContain("önceki cevap");
    expect(calls[1].prompt).toContain("paket seç");
    expect(calls[1].prompt).toContain("Bakıyorum.");
    expect(calls[1].prompt).toContain("Hangi paket?");
    expect(calls[1].prompt).toContain("ZA");
    expect(r.ok).toBe(true);
  });

  it("I4: bağlı oturum veritabanında yoksa bağ düşüyor, geçmiş tohumlanıyor", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    h.missing.add("S0");
    script(() => ({ text: "x", sessionId: "S6" }));
    await send("r1", "devam", [{ role: "user", content: "eski soru" }, { role: "assistant", content: "eski cevap" }]);
    expect(calls[0].resumeId).toBeNull();
    expect(calls[0].prompt).toContain("eski soru");
  });

  it("I1: araç sayısı bilinmiyorsa (veritabanı görülmedi) yeniden gönderme yok, canContinue", async () => {
    script(
      () => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 0, toolsUnknown: true }),
      () => ({ ok: true, text: "tekrar" })
    );
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r).toMatchObject({ ok: false, canContinue: true });
  });
});

describe("küçükler (2026-10-16)", () => {
  const ASK = { callId: "q1", question: "Hangi paket?", header: "", options: ["ZA", "ZB"], multiSelect: false };
  const NOW = () => Math.floor(Date.now() / 1000);

  it("7a: sağlayıcı hatası, mesajımız oturumda saklı → aynı oturuma kısa yeniden deneme istemi", async () => {
    script(
      () => {
        h.stored.set("S1", [{ id: "u1", role: "user", parts: [{ type: "text", data: { text: "merhaba" } }], createdAt: NOW() }]);
        return { ok: false, error: "529 overloaded", failure: "provider", toolCount: 0, sessionId: "S1" };
      },
      () => ({ ok: true, text: "kurtardı", sessionId: "S1" })
    );
    const r = await send("r1", "uzun mesajım");
    expect(calls).toHaveLength(2);
    expect(calls[1].resumeId).toBe("S1");
    expect(calls[1].prompt).toBe("chat.headlessRetryPrompt");
    expect(calls[1].prompt).not.toContain("uzun mesajım");
    expect(r).toMatchObject({ ok: true, text: "kurtardı" });
  });

  it("7b: sağlayıcı hatası, mesajımız saklanmamış → mesaj aynen yeniden gidiyor", async () => {
    script(
      () => {
        h.stored.set("S1", [
          { id: "u0", role: "user", parts: [], createdAt: NOW() },
          { id: "a0", role: "assistant", parts: [], createdAt: NOW() }
        ]);
        return { ok: false, error: "529 overloaded", failure: "provider", toolCount: 0, sessionId: "S1" };
      },
      () => ({ ok: true, text: "kurtardı", sessionId: "S1" })
    );
    await send("r1", "uzun mesajım");
    expect(calls).toHaveLength(2);
    expect(calls[1].resumeId).toBe("S1");
    expect(calls[1].prompt).toBe(calls[0].prompt);
    expect(calls[1].prompt).toContain("uzun mesajım");
  });

  it("8: soru sonrası tur hatayla biterse metinler boş satırla ayrılıyor", async () => {
    script(
      () => ({ text: "Önce sormam gerek.", sessionId: "S1", ask: ASK }),
      () => ({ ok: false, text: "Yarıda kaldı.", error: "request_blocked", failure: "blocked", sessionId: "S1" })
    );
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", 0);
    const r = await pending;
    expect(r.ok).toBe(false);
    expect(r.text).toBe("Önce sormam gerek.\n\nYarıda kaldı.");
  });

  it("9: boş cevap kopru.tur'a 'bos' olarak yazılıyor", async () => {
    script(() => ({ text: "", sessionId: "S1" }));
    const r = await send();
    expect(r.ok).toBe(false);
    expect(h.logs.find((l) => l.tag === "kopru.tur")?.fields.sonuc).toBe("bos");
  });

  it("9: dolu cevap 'ok'", async () => {
    script(() => ({ text: "cevap", sessionId: "S1" }));
    await send();
    expect(h.logs.find((l) => l.tag === "kopru.tur")?.fields.sonuc).toBe("ok");
  });

  it("10: secenekler sorusundan vazgeçilirse seçenekler metinde kalıyor", async () => {
    const FENCE = "```";
    script(() => ({ text: `Hangisi olsun?\n\n${FENCE}secenekler\n- K1\n- K2\n${FENCE}`, sessionId: "S1" }));
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", -1);
    const r = await pending;
    expect(r.ok).toBe(true);
    expect(r.text).toBe("Hangisi olsun?\n\n- K1\n- K2");
  });

  it("19: araç çalışmış turda cevap yeni oturuma tohumlanırsa tohum araçları tekrarlama diyor", async () => {
    script(
      () => ({ text: "Dosyayı yazdım.", sessionId: "S1", toolCount: 2, ask: ASK }),
      () => ({ ok: true, text: "ZA ile devam.", sessionId: "S7" })
    );
    const pending = send("r1", "dosyayı yaz ve paketi sor");
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    h.unanswered.add("S1");
    chat.answerChatQuestion("r1", 0);
    await pending;
    expect(calls[1].resumeId).toBeNull();
    expect(calls[1].prompt).toContain("ZATEN çalıştırıldı");
  });

  it("R1: zorunlu güncelleme + toolsUnknown → güncelleme hatası, Devam et yok", async () => {
    script(() => ({
      ok: false,
      error: "Mandatory update required. Installed version: 1.4.1 New version: 1.5.0",
      failure: null,
      toolCount: 0,
      toolsUnknown: true,
      sessionId: null
    }));
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/^chatTui\.updateRequired/);
    expect(r.canContinue).toBeUndefined();
  });

  it("R4: ask_user vazgeçildi, soru ve bazı seçenekler metinde → yalnız eksik seçenekler ekleniyor", async () => {
    script(() => ({
      text: "Hangi paket? ZA en uygunu görünüyor.",
      sessionId: "S1",
      ask: { callId: "q1", question: "Hangi paket?", header: "", options: ["ZA", "ZB"], multiSelect: false }
    }));
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", -1);
    const r = await pending;
    expect(r.text).toBe("Hangi paket? ZA en uygunu görünüyor.\n\n- ZB");
  });

  it("19: araçsız turda tohumda bu not yok", async () => {
    script(
      () => ({ text: "Bakıyorum.", sessionId: "S1", toolCount: 0, ask: ASK }),
      () => ({ ok: true, text: "ZA ile devam.", sessionId: "S7" })
    );
    const pending = send("r1", "paket seç");
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    h.unanswered.add("S1");
    chat.answerChatQuestion("r1", 0);
    await pending;
    expect(calls[1].resumeId).toBeNull();
    expect(calls[1].prompt).not.toContain("ZATEN çalıştırıldı");
  });
});

describe("ısınmış süreç (İş 1)", () => {
  type Warm = { pid: number; killed: boolean; stdin: null; stdout: null; stderr: null; on: () => void };
  let spawned: { args: string[] }[] = [];
  let warm: Warm[] = [];
  const MODEL = { provider: "openai", model: "gpt-5" } as never;

  beforeEach(() => {
    spawned = [];
    warm = [];
    chat.__setPrewarmDeps({
      spawn: (_cmd: string, args: string[]) => {
        spawned.push({ args });
        const w: Warm = { pid: 100 + warm.length, killed: false, stdin: null, stdout: null, stderr: null, on: () => {} };
        warm.push(w);
        return w as never;
      },
      env: () => ({}),
      killTree: (c: unknown) => {
        (c as Warm).killed = true;
      },
      setTimer: () => 0,
      clearTimer: () => {}
    });
  });

  const sendWith = (model: unknown, requestId = "r1", message = "merhaba") =>
    chat.sendChatMessage(requestId, "chat-1", "C:/p", model as never, [], message, () => {}, () => {});

  it("ısınmış süreç varken yeni spawn yok; tur o süreçle başlıyor; günlükte isinmis", async () => {
    await chat.prewarmChat("chat-1", "C:/p", MODEL, "merh", []);
    expect(spawned).toHaveLength(1);
    expect(spawned[0].args).toContain("openai/gpt-5");
    script(() => ({ text: "cevap", sessionId: "S1" }));
    await sendWith(MODEL);
    expect(spawned).toHaveLength(1);
    expect(calls[0].prewarmed).toBeTruthy();
    expect((calls[0].prewarmed as unknown as Warm).pid).toBe(100);
    expect(h.logs.find((l) => l.tag === "kopru.tur")?.fields.isinmis).toBe(true);
    const isitma = h.logs.filter((l) => l.tag === "kopru.isitma").map((l) => l.fields);
    expect(isitma).toEqual([{ sohbet: "chat-1", sonuc: "acildi" }, { sohbet: "chat-1", sonuc: "kullanildi" }]);
    expect(JSON.stringify(h.logs)).not.toContain("merh");
  });

  it("isinmis: soru-cevap akışında bile ilk tur ısınmışsa true kalıyor", async () => {
    const ASK = { callId: "q1", question: "Hangi paket?", header: "", options: ["ZA", "ZB"], multiSelect: false };
    await chat.prewarmChat("chat-1", "C:/p", MODEL, "merh", []);
    script(
      () => ({ text: "Sormam gerek.", sessionId: "S1", toolCount: 0, ask: ASK }),
      () => ({ ok: true, text: "ZA ile tamam.", sessionId: "S1" })
    );
    const warmActs: Record<string, unknown>[] = [];
    const pending = chat.sendChatMessage("r1", "chat-1", "C:/p", MODEL, [], "merhaba", () => {}, (a) => warmActs.push(a as never));
    await vi.waitFor(() => expect(warmActs.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", 0);
    await pending;
    expect(h.logs.find((l) => l.tag === "kopru.tur")?.fields.isinmis).toBe(true);
  });

  it("anahtar uyuşmazsa ısınmış süreç öldürülüyor, tur kendi sürecini açıyor", async () => {
    await chat.prewarmChat("chat-1", "C:/p", MODEL, "merh", []);
    script(() => ({ text: "cevap", sessionId: "S1" }));
    await sendWith(null);
    expect(calls[0].prewarmed ?? null).toBeNull();
    expect(warm[0].killed).toBe(true);
    expect(h.logs.find((l) => l.tag === "kopru.tur")?.fields.isinmis).toBe(false);
  });

  it("bağlı oturum: ısıtma --resume ile; ısıtma bağı silmiyor (sonuçsuz araçta bile)", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    expect(spawned[0].args).toContain("--resume");
    expect(spawned[0].args).toContain("S0");
    h.unanswered.add("S0");
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    expect(h.bindings.has("chat-1")).toBe(true);
    expect(spawned).toHaveLength(2);
    expect(spawned[1].args).not.toContain("--resume");
  });

  it("yeniden deneme turu havuzu kullanmıyor", async () => {
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    script(
      () => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 0 }),
      () => ({ ok: true, text: "kurtardı" })
    );
    // ilk tur ısınmış süreci aldı; yeniden deneme her zaman kendi sürecini açıyor
    const pending = sendWith(null);
    await pending;
    expect(calls).toHaveLength(2);
    expect(calls[0].prewarmed).toBeTruthy();
    expect(calls[1].prewarmed ?? null).toBeNull();
  });

  it("sürüm durumu ok değilse ısıtma yok", async () => {
    h.status = { kind: "old", version: "1.3.0" };
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    expect(spawned).toHaveLength(0);
  });

  it("meşgul sohbette ısıtma yok", async () => {
    script(() => new Promise(() => {}));
    const pending = sendWith(null);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    expect(spawned).toHaveLength(0);
    chat.cancelChatMessage("r1");
    await pending;
  });

  it("closeChatSession, resetChatHistory, iptal ve cancelAll havuzu boşaltıyor", async () => {
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    chat.closeChatSession("chat-1");
    expect(warm[0].killed).toBe(true);

    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    chat.resetChatHistory("chat-1");
    expect(warm[1].killed).toBe(true);

    script(() => new Promise(() => {}));
    const pending = sendWith(null, "r9");
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    // tur sürerken o sohbet ısıtılmıyor; başka sohbetinki kalıyor
    await chat.prewarmChat("chat-2", "C:/p", null, "", []);
    await chat.prewarmChat("chat-1", "C:/q", null, "", []);
    chat.cancelChatMessage("r9");
    await pending;
    expect(warm[2].killed).toBe(false);

    chat.cancelAllChatMessages();
    expect(warm[2].killed).toBe(true);
  });

  it("iptal o sohbetin ısıtmasını öldürüyor, başka sohbetinkini değil", async () => {
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    await chat.prewarmChat("chat-2", "C:/p", null, "", []);
    let unblock!: () => void;
    h.statusBlock = new Promise<void>((r) => { unblock = r; });
    script(() => ({ text: "x" }));
    const pending = sendWith(null, "r5");
    await vi.waitFor(() => expect(chat.chatBusy("chat-1")).toBe(true));
    chat.cancelChatMessage("r5");
    expect(warm[0].killed).toBe(true);
    expect(warm[1].killed).toBe(false);
    unblock();
    expect((await pending).cancelled).toBe(true);
    chat.cancelAllChatMessages();
  });

  it("sürüm beklenirken sohbet kapatılırsa ısıtma süreç açmıyor", async () => {
    let unblock!: () => void;
    h.statusBlock = new Promise<void>((r) => { unblock = r; });
    const pending = chat.prewarmChat("chat-1", "C:/p", null, "", []);
    chat.closeChatSession("chat-1");
    unblock();
    await pending;
    expect(spawned).toHaveLength(0);
  });

  it("sürüm beklenirken dropAll (yetenek değişikliği) olursa ısıtma süreç açmıyor; sonrakiler açıyor", async () => {
    let unblock!: () => void;
    h.statusBlock = new Promise<void>((r) => { unblock = r; });
    const pending = chat.prewarmChat("chat-1", "C:/p", null, "", []);
    chat.dropAllPrewarmed();
    unblock();
    await pending;
    expect(spawned).toHaveLength(0);
    h.statusBlock = null;
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    expect(spawned).toHaveLength(1);
  });

  it("kapanıştan (stopPrewarming) sonra hiçbir ısıtma süreç açmıyor, bekleyen de", async () => {
    await chat.prewarmChat("chat-1", "C:/p", null, "", []);
    let unblock!: () => void;
    h.statusBlock = new Promise<void>((r) => { unblock = r; });
    const pending = chat.prewarmChat("chat-2", "C:/p", null, "", []);
    chat.stopPrewarming();
    expect(warm[0].killed).toBe(true);
    unblock();
    await pending;
    h.statusBlock = null;
    await chat.prewarmChat("chat-3", "C:/p", null, "", []);
    expect(spawned).toHaveLength(1);
  });
});
