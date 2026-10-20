// Ajanlar bölmesinde SAP yazma onayı (madde 1): onaylanınca ve ajan onayı
// aynı çağrıda kullanmadıysa bölmeye TEK kez devam satırı; meşgul/yazıyorsa
// kuyrukta bekler; ret ve belirsizde gönderim yok. Olaylar ve gönderim sahte.
import { afterEach, describe, expect, it } from "vitest";
import { emitApprovalEvent, type ApprovalOwnership } from "../app-electron/main/sapWrite/approvalEvents";
import {
  createPaneApprovalRouter,
  PANE_GRACE_MS,
  PANE_RETRY_MS,
  PANE_SEND_DEADLINE_MS,
  type PaneApprovalDeps,
} from "../app-electron/main/sapWrite/paneApprovals";

const PANE = { tur: "bolme" as const, id: "b1", workspaceId: "w1", name: "Geliştirici" };

function harness(replies: ({ ok: true } | { ok: false; reason: string })[] = [{ ok: true }]) {
  let now = 0;
  const timers: { at: number; fn: () => void; live: boolean }[] = [];
  const sent: string[] = [];
  const relays: { paneId: string; detail: string }[] = [];
  const deps: PaneApprovalDeps = {
    send: async (_w, paneId, text) => {
      sent.push(`${paneId}:${text}`);
      return replies.length > 1 ? replies.shift()! : replies[0];
    },
    relay: (e) => relays.push({ paneId: e.paneId, detail: e.detail }),
    text: (n, p) => (p?.adaylar ? `${n}(${p.adaylar})` : n),
    continueText: () => "devam-et",
    schedule: (fn, ms) => {
      const t = { at: now + ms, fn, live: true };
      timers.push(t);
      return () => {
        t.live = false;
      };
    },
    now: () => now,
    log: () => {},
  };
  const router = createPaneApprovalRouter(deps);
  const advance = async (ms: number) => {
    const end = now + ms;
    for (;;) {
      const next = timers.filter((t) => t.live && t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      now = next.at;
      next.live = false;
      next.fn();
      await new Promise((r) => setTimeout(r, 0));
    }
    now = end;
  };
  return { router, sent, relays, advance };
}

const asked = (id: string, sahiplik: ApprovalOwnership) => emitApprovalEvent({ tur: "soruldu", id, projectDir: "C:/p", sahiplik });
const decided = (id: string, durum: "onaylandi" | "reddedildi" | "sure_doldu" | "kapandi") =>
  emitApprovalEvent({ tur: "sonuclandi", id, projectDir: "C:/p", durum });

let current: ReturnType<typeof harness> | null = null;
afterEach(() => {
  current?.router.dispose();
  current = null;
});

describe("bölme onay yönlendirici", () => {
  it("bekliyor kartı bir kez; onaylanınca kısa beklemeden sonra TEK kez devam satırı", async () => {
    const h = (current = harness());
    asked("A1", { tur: "tam", sahip: PANE });
    asked("A1", { tur: "tam", sahip: PANE });
    expect(h.relays.map((r) => r.detail)).toEqual(["bekliyor"]);
    decided("A1", "onaylandi");
    expect(h.sent).toEqual([]);
    await h.advance(PANE_GRACE_MS);
    expect(h.sent).toEqual(["b1:devam-et"]);
    expect(h.relays.map((r) => r.detail)).toEqual(["bekliyor", "devam"]);
    await h.advance(PANE_SEND_DEADLINE_MS);
    expect(h.sent).toHaveLength(1);
  });

  it("ajan onayı aynı çağrıda kullandıysa (uzun yoklama) gönderim yok", async () => {
    const h = (current = harness());
    asked("A2", { tur: "klasor", sahip: PANE });
    decided("A2", "onaylandi");
    emitApprovalEvent({ tur: "kullanildi", id: "A2", projectDir: "C:/p" });
    await h.advance(PANE_GRACE_MS * 2);
    expect(h.sent).toEqual([]);
    expect(h.relays.map((r) => r.detail)).toEqual(["bekliyor", "kullanildi"]);
  });

  it("ajan meşgul/kullanıcı yazıyorken kuyrukta bekliyor, sonra bir kez gidiyor", async () => {
    const h = (current = harness([{ ok: false, reason: "busy" }, { ok: false, reason: "typing" }, { ok: true }]));
    asked("A3", { tur: "tam", sahip: PANE });
    decided("A3", "onaylandi");
    await h.advance(PANE_GRACE_MS);
    expect(h.sent).toHaveLength(1);
    await h.advance(PANE_RETRY_MS);
    await h.advance(PANE_RETRY_MS);
    expect(h.sent).toHaveLength(3);
    expect(h.relays.at(-1)?.detail).toBe("devam");
    await h.advance(PANE_RETRY_MS * 5);
    expect(h.sent).toHaveLength(3);
  });

  it("kuyruktayken ajan onayı kendisi kullandı: gönderim durur", async () => {
    const h = (current = harness([{ ok: false, reason: "busy" }]));
    asked("A4", { tur: "tam", sahip: PANE });
    decided("A4", "onaylandi");
    await h.advance(PANE_GRACE_MS);
    emitApprovalEvent({ tur: "kullanildi", id: "A4", projectDir: "C:/p" });
    await h.advance(PANE_RETRY_MS * 5);
    expect(h.sent).toHaveLength(1);
  });

  it("bölme kapalıysa vazgeçiyor, Akış'ta 'gönderilemedi'; süre sınırında da", async () => {
    const h = (current = harness([{ ok: false, reason: "noAgent" }]));
    asked("A5", { tur: "tam", sahip: PANE });
    decided("A5", "onaylandi");
    await h.advance(PANE_GRACE_MS + PANE_RETRY_MS * 3);
    expect(h.sent).toHaveLength(1);
    expect(h.relays.at(-1)?.detail).toBe("gonderilemedi");

    const k = harness([{ ok: false, reason: "busy" }]);
    try {
      asked("A6", { tur: "tam", sahip: PANE });
      decided("A6", "onaylandi");
      await k.advance(PANE_SEND_DEADLINE_MS + PANE_GRACE_MS + PANE_RETRY_MS);
      expect(k.relays.at(-1)?.detail).toBe("gonderilemedi");
      const n = k.sent.length;
      await k.advance(PANE_RETRY_MS * 3);
      expect(k.sent).toHaveLength(n);
    } finally {
      k.router.dispose();
    }
  });

  it("ret, süre dolması, kapanış: yalnız Akış notu, gönderim yok", async () => {
    const h = (current = harness());
    for (const [id, d] of [["R1", "reddedildi"], ["R2", "sure_doldu"], ["R3", "kapandi"]] as const) {
      asked(id, { tur: "tam", sahip: PANE });
      decided(id, d);
    }
    await h.advance(PANE_GRACE_MS * 3);
    expect(h.sent).toEqual([]);
    expect(h.relays.map((r) => r.detail)).toEqual(["bekliyor", "reddedildi", "bekliyor", "sure_doldu", "bekliyor", "kapandi"]);
  });

  it("belirsiz: 'hangi oturum' notu, onaylansa da gönderim yok; sohbetin ya da başkasının isteği yok sayılıyor", async () => {
    const h = (current = harness());
    asked("B1", { tur: "belirsiz", adaylar: [{ tur: "sohbet", id: "r1" }, PANE] });
    asked("B1", { tur: "belirsiz", adaylar: [{ tur: "sohbet", id: "r1" }, PANE] });
    decided("B1", "onaylandi");
    asked("C1", { tur: "tam", sahip: { tur: "sohbet", id: "r1" } });
    asked("C2", { tur: "yok" });
    emitApprovalEvent({ tur: "soruldu", id: "C3", projectDir: "C:/p" });
    decided("C1", "onaylandi");
    await h.advance(PANE_GRACE_MS * 3);
    expect(h.sent).toEqual([]);
    expect(h.relays).toEqual([{ paneId: "b1", detail: "belirsiz(Sohbet, Geliştirici)" }]);
  });
});
