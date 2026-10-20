// Sohbet turu + SAP yazma onayı (kullanıcı şikâyeti 2026-10-20: "yazma onaylarını
// verdikten sonra chat bitiyor; 'onayladım devam et' deyince devam ediyor").
// Kök neden: onay ucu "bekliyor"u hemen döndürüyor, başsız `run` turu bitiyor ve
// onay verilince kimse ajanı uyandırmıyordu. Tur çalıştırıcı ve onay olayları sahte;
// SAP'a ya da HTTP onay ucuna dokunulmuyor.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { HeadlessTurnArgs, HeadlessTurnResult } from "../app-electron/main/axetHeadless";
import { emitApprovalEvent, ApprovalTracker } from "../app-electron/main/sapWrite/approvalEvents";

const h = vi.hoisted(() => ({
  bindings: new Map<string, { sessionId: string; cwd: string }>(),
  logs: [] as { tag: string; fields: Record<string, unknown> }[]
}));

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));
vi.mock("../app-electron/main/appLog", () => ({ appLog: (tag: string, fields: Record<string, unknown>) => h.logs.push({ tag, fields }) }));
vi.mock("../app-electron/main/activeContext", () => ({ buildContextPreamble: () => "" }));
vi.mock("../app-electron/main/connectorPolicy", () => ({ shouldUseConnectors: () => false }));
vi.mock("../app-electron/main/connectorHealth", () => ({ connectorGuidance: () => "" }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({
  axetBinaryStatus: async () => ({ kind: "ok", version: "1.4.1" }),
  axetBinaryMessage: () => null
}));
vi.mock("../app-electron/main/axetSessionBinding", () => ({
  readBinding: (id: string) => h.bindings.get(id) ?? null,
  writeBinding: (id: string, b: { sessionId: string; cwd: string }) => h.bindings.set(id, b),
  clearBinding: (id: string) => h.bindings.delete(id)
}));
vi.mock("../app-electron/main/axetSessionDb", () => ({
  resolveSessionDb: () => "C:/p/.axet-code/axet-code.db",
  sessionHasUnansweredToolCall: () => false,
  sessionTitle: () => "baslik",
  readMessagesSince: () => []
}));

const chat = await import("../app-electron/main/axetChat");

type Script = (args: HeadlessTurnArgs) => Partial<HeadlessTurnResult>;
const calls: HeadlessTurnArgs[] = [];
let activities: Record<string, unknown>[] = [];

function script(...steps: Script[]) {
  let i = 0;
  chat.__setTurnStarter(((args: HeadlessTurnArgs) => {
    calls.push(args);
    const step = steps[Math.min(i++, steps.length - 1)];
    let cancel: () => void = () => {};
    const done = new Promise<HeadlessTurnResult>((resolve) => {
      cancel = () =>
        resolve({ ok: false, text: "", sessionId: "S1", cancelled: true, timedOut: false, spawnFailed: false, toolCount: 0, ask: null, failure: null });
      const r = step(args);
      resolve({ ok: true, text: "", sessionId: "S1", cancelled: false, timedOut: false, spawnFailed: false, toolCount: 1, ask: null, failure: null, ...r });
    });
    return { done, cancel: () => cancel() };
  }) as never);
}

const DIR = "C:/p";
const send = (requestId = "r1") =>
  chat.sendChatMessage(requestId, "chat-1", DIR, null, [], "ZCL_A yaz", () => {}, (a) => activities.push(a as never));
const asked = (id: string, projectDir = DIR) => emitApprovalEvent({ tur: "soruldu", id, projectDir });
const resolved = (id: string, durum: "onaylandi" | "reddedildi" | "sure_doldu" | "kapandi") =>
  emitApprovalEvent({ tur: "sonuclandi", id, projectDir: DIR, durum });
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  h.bindings.clear();
  h.logs = [];
  calls.length = 0;
  activities = [];
});

describe("sohbet turu SAP yazma onayını bekliyor", () => {
  it("onay istenince tur açık kalıyor; onaylanınca aynı oturum TEK kez 'devam et' ile sürüyor", async () => {
    script(
      () => {
        asked("A1");
        return { text: "Onay penceresi açıldı, onaylayın." };
      },
      () => ({ text: "Yazıldı ve aktive edildi." })
    );
    let done = false;
    const p = send().then((r) => {
      done = true;
      return r;
    });
    await tick();
    await tick();
    expect(done).toBe(false);
    expect(chat.chatBusy("chat-1")).toBe(true);
    expect(activities.some((a) => a.phase === "sapApproval")).toBe(true);
    resolved("A1", "onaylandi");
    const r = await p;
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ resumeId: "S1", prompt: "chat.sapApprovalContinue" });
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Onay penceresi açıldı");
    expect(r.text).toContain("Yazıldı ve aktive edildi.");
    // Aynı onayın ikinci sonucu ikinci bir devam turu açmıyor.
    resolved("A1", "onaylandi");
    await tick();
    expect(calls).toHaveLength(2);
    expect(h.logs.some((l) => l.tag === "kopru.onay" && l.fields.sonuc === "devam")).toBe(true);
  });

  it("reddedilirse ajan sürdürülmüyor; cevaba 'reddedildi' notu ekleniyor", async () => {
    script(() => {
      asked("A1");
      return { text: "Onaylayın." };
    });
    const p = send();
    await tick();
    await tick();
    resolved("A1", "reddedildi");
    const r = await p;
    expect(calls).toHaveLength(1);
    expect(r.ok).toBe(true);
    expect(r.text).toContain("chat.sapApprovalDenied");
  });

  it("süre dolarsa (10 dk) sürdürülmüyor; 'süre doldu' notu", async () => {
    script(() => {
      asked("A1");
      return { text: "Onaylayın." };
    });
    const p = send();
    await tick();
    await tick();
    resolved("A1", "sure_doldu");
    const r = await p;
    expect(calls).toHaveLength(1);
    expect(r.text).toContain("chat.sapApprovalExpired");
  });

  it("kullanıcı arada yeni mesaj yazdıysa (sıraya koydu) otomatik devam gönderilmiyor", async () => {
    script(
      () => {
        asked("A1");
        return { text: "Onaylayın." };
      },
      () => ({ text: "x" })
    );
    const p = send("r9");
    await tick();
    await tick();
    expect(chat.releaseApprovalWait("r9")).toBe(true);
    const r = await p;
    expect(r.ok).toBe(true);
    resolved("A1", "onaylandi");
    await tick();
    expect(calls).toHaveLength(1);
  });

  it("onay beklerken Durdur: tur iptal olarak kapanıyor, devam yok", async () => {
    script(() => {
      asked("A1");
      return { text: "Onaylayın." };
    });
    const p = send("r2");
    await tick();
    await tick();
    chat.cancelChatMessage("r2");
    const r = await p;
    expect(r.cancelled).toBe(true);
    resolved("A1", "onaylandi");
    await tick();
    expect(calls).toHaveLength(1);
  });

  it("tur sürerken onaylanıp ajan tekrar göndermediyse beklemeden bir kez sürüyor; kullandıysa sürmüyor", async () => {
    script(
      () => {
        asked("A1");
        resolved("A1", "onaylandi");
        return { text: "a" };
      },
      () => ({ text: "b" })
    );
    await send();
    expect(calls).toHaveLength(2);

    calls.length = 0;
    script(() => {
      asked("A2");
      resolved("A2", "onaylandi");
      emitApprovalEvent({ tur: "kullanildi", id: "A2", projectDir: DIR });
      return { text: "yazıldı" };
    });
    await send();
    expect(calls).toHaveLength(1);
  });

  it("başka klasörün onayı ya da onaysız tur beklemiyor", async () => {
    script(() => {
      asked("B1", "C:/baska");
      return { text: "a" };
    });
    const r = await send();
    expect(r.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(activities.some((a) => a.phase === "sapApproval")).toBe(false);
  });
});

describe("ApprovalTracker", () => {
  it("zaman aşımı: bekleyen kalırsa 'zaman_asimi' döner", async () => {
    vi.useFakeTimers();
    try {
      const t = new ApprovalTracker(DIR);
      asked("Z1");
      const p = t.wait(1000, () => {});
      vi.advanceTimersByTime(1001);
      await expect(p).resolves.toBe("zaman_asimi");
      expect(t.summary().pending).toEqual(["Z1"]);
      t.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("Windows'ta klasör büyük/küçük harf ve ayraç farkı aynı proje sayılıyor", () => {
    const t = new ApprovalTracker("C:\\P\\");
    asked("W1", "c:/p");
    expect(t.summary().pending).toEqual(process.platform === "win32" ? ["W1"] : []);
    t.dispose();
  });
});

describe("relatedProjectDirs", () => {
  it("aynı, iç içe eşleşir; kardeş ve ilgisiz eşleşmez", async () => {
    const { relatedProjectDirs } = await import("../app-electron/main/sapWrite/approvalEvents");
    expect(relatedProjectDirs("C:/p", "C:/p/")).toBe(true);
    expect(relatedProjectDirs("C:/p/alt", "C:/p")).toBe(true);
    expect(relatedProjectDirs("C:/p", "C:/p/alt")).toBe(true);
    expect(relatedProjectDirs("C:/p", "C:/pq")).toBe(false);
    expect(relatedProjectDirs("C:/p/a", "C:/p/b")).toBe(false);
  });
});
