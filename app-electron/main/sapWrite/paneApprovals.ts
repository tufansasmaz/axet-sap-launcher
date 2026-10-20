// Ajanlar bölmelerinde SAP yazma onayı (madde 1). Sohbet turunun karşılığı
// (bkz. axetChat.ts `waitApprovals`): etkileşimli terminal ajanı aynı onay
// ucunu kullanıyor; onay "bekliyor" dönünce ajan turunu bitiriyor ve kullanıcı
// pencereden onaylasa da bölmeye "devam et" yazılana kadar duruyordu.
//
// Burada yalnız SAHİBİ BU BÖLME olan istekler (süreç zinciri ya da tek aday
// klasör; bkz. approvalEvents.ts resolveOwnership) izlenir:
//   - soruldu    → Akış'ta "onay bekleniyor" kartı (istek başına bir kez)
//   - onaylandı  → kısa bir bekleme: ajan aynı çağrıda (gated sunucunun uzun
//                  yoklaması) onayı kullandıysa gönderim yok. Kullanmadıysa
//                  bölmeye TEK kez devam satırı, Akış mesaj kutusunun yolundan
//                  (`send` = agentSender: kullanıcı yazıyorsa, ajan meşgulse ya
//                  da soru soruyorsa gitmez; o zaman kuyrukta bekler, tekrar denenir)
//   - reddedildi / süre doldu / oturum kapandı → yalnız Akış notu, gönderim yok
// Belirsiz eşleşmede (birden çok aday) otomatik devam YOK; aday bölmelerin
// Akış'ına "hangi oturum?" notu düşer. Onay asla burada verilmez.

import { onApprovalEvent, type ApprovalEvent, type ApprovalOwnerRef } from "./approvalEvents";

type PaneRef = Extract<ApprovalOwnerRef, { tur: "bolme" }>;

export type PaneApprovalNote =
  | "bekliyor"
  | "belirsiz"
  | "kullanildi"
  | "devam"
  | "gonderilemedi"
  | "reddedildi"
  | "sure_doldu"
  | "kapandi";

export interface PaneApprovalDeps {
  send(workspaceId: string, paneId: string, text: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Akış kartı (team:relay). */
  relay(event: { workspaceId: string; paneId: string; name: string; detail: string }): void;
  text(note: PaneApprovalNote, params?: { adaylar?: string }): string;
  continueText(): string;
  schedule(fn: () => void, ms: number): () => void;
  now(): number;
  log(tag: string, fields: Record<string, string | number | boolean>): void;
}

/** Onay sonrası ajanın aynı çağrıda onayı kullanması için tanınan süre. */
export const PANE_GRACE_MS = 3_000;
/** Ajan meşgul/kullanıcı yazıyorken tekrar deneme aralığı. */
export const PANE_RETRY_MS = 3_000;
/** Devam satırının en çok bekletileceği süre. */
export const PANE_SEND_DEADLINE_MS = 10 * 60_000;

// Satır hiç yazılmadan dönen geçici sebepler: ajan meşgul, soru soruyor, kullanıcı
// yazıyor. Bekle, tekrar dene. Diğerleri (bölme yok, motor kapalı, yazıldı ama
// gönderilemedi) vazgeç: satır yarım kalmış olabilir, ikinci kez yazılmaz.
const RETRYABLE = new Set(["busy", "typing", "asking"]);

type State = "bekliyor" | "onaylandi" | "gonderiliyor" | "bitti";

interface Tracked {
  pane: PaneRef;
  state: State;
  cancel: (() => void) | null;
}

export function createPaneApprovalRouter(deps: PaneApprovalDeps): { dispose(): void } {
  const tracked = new Map<string, Tracked>();
  const ambiguousNoted = new Set<string>();

  const note = (pane: PaneRef, n: PaneApprovalNote, params?: { adaylar?: string }) => {
    try {
      deps.relay({ workspaceId: pane.workspaceId, paneId: pane.id, name: pane.name, detail: deps.text(n, params) });
    } catch {
      // Akış kapalı olabilir; onay akışını bozma.
    }
  };

  const finish = (id: string, t: Tracked) => {
    t.cancel?.();
    t.cancel = null;
    t.state = "bitti";
    // Kayıt tutuluyor (tekrar "soruldu" yeni kart açmasın); büyümesin diye sınırlı.
    if (tracked.size > 200) {
      for (const [k, v] of tracked) {
        if (v.state === "bitti" && k !== id) tracked.delete(k);
        if (tracked.size <= 100) break;
      }
    }
  };

  const trySend = (id: string, t: Tracked, deadline: number) => {
    if (t.state !== "gonderiliyor") return;
    void deps
      .send(t.pane.workspaceId, t.pane.id, deps.continueText())
      .catch(() => ({ ok: false as const, reason: "writeFailed" }))
      .then((r) => {
        if (t.state !== "gonderiliyor") return;
        if (r.ok) {
          deps.log("sap.onay.bolme", { sonuc: "devam" });
          note(t.pane, "devam");
          finish(id, t);
          return;
        }
        if (RETRYABLE.has(r.reason) && deps.now() < deadline) {
          t.cancel = deps.schedule(() => trySend(id, t, deadline), PANE_RETRY_MS);
          return;
        }
        deps.log("sap.onay.bolme", { sonuc: "gonderilemedi", sebep: r.reason });
        note(t.pane, "gonderilemedi");
        finish(id, t);
      });
  };

  const handle = (e: ApprovalEvent) => {
    if (e.tur === "soruldu") {
      const own = e.sahiplik;
      if (!own) return;
      if (own.tur === "belirsiz") {
        const panes = own.adaylar.filter((a): a is PaneRef => a.tur === "bolme");
        if (panes.length === 0 || ambiguousNoted.has(e.id)) return;
        ambiguousNoted.add(e.id);
        const adaylar = own.adaylar.map((a) => (a.tur === "bolme" ? a.name : "Sohbet")).join(", ");
        const seen = new Set<string>();
        for (const p of panes) {
          if (seen.has(p.workspaceId)) continue;
          seen.add(p.workspaceId);
          note(p, "belirsiz", { adaylar });
        }
        deps.log("sap.onay.bolme", { sonuc: "belirsiz", aday: own.adaylar.length });
        return;
      }
      if ((own.tur !== "tam" && own.tur !== "klasor") || own.sahip.tur !== "bolme") return;
      if (tracked.has(e.id)) return;
      const t: Tracked = { pane: own.sahip, state: "bekliyor", cancel: null };
      tracked.set(e.id, t);
      deps.log("sap.onay.bolme", { sonuc: "bekliyor", eslesme: own.tur });
      note(t.pane, "bekliyor");
      return;
    }
    const t = tracked.get(e.id);
    if (!t || t.state === "bitti") return;
    if (e.tur === "kullanildi") {
      // Ajan onayı kendisi kullandı (aynı çağrıda ya da kendi tekrarıyla): gönderim yok.
      deps.log("sap.onay.bolme", { sonuc: "kullanildi" });
      note(t.pane, "kullanildi");
      finish(e.id, t);
      return;
    }
    if (t.state !== "bekliyor") return;
    if (e.durum === "onaylandi") {
      t.state = "onaylandi";
      const deadline = deps.now() + PANE_SEND_DEADLINE_MS;
      t.cancel = deps.schedule(() => {
        if (t.state !== "onaylandi") return;
        t.state = "gonderiliyor";
        trySend(e.id, t, deadline);
      }, PANE_GRACE_MS);
      return;
    }
    deps.log("sap.onay.bolme", { sonuc: e.durum });
    note(t.pane, e.durum);
    finish(e.id, t);
  };

  const off = onApprovalEvent(handle);
  return {
    dispose() {
      off();
      for (const t of tracked.values()) t.cancel?.();
      tracked.clear();
    }
  };
}
