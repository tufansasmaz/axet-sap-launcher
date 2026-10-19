// Akış geçmişi (Tur 4): olay türleri ve kalıcı kaydın doğrulaması. Ana süreç
// (dosya) ve renderer (FlowProvider) aynı türleri kullanıyor. Dosya elle
// bozulabilir: okuyan hiçbir şey fırlatmıyor, geçersiz satır atılıyor.
import { isLeadAct, type LeadAct } from "./leadCommands";

export type FlowKind =
  | "started"
  | "finished"
  | "error"
  | "asked"
  | "assigned"
  | "verified"
  | "failed"
  | "checkpoint"
  | "message"
  /** Ajandan ajana (ekip köprüsü): `name` "A → B", `detail` soru ya da cevap. */
  | "relay"
  /** Öğrenme görevi (Bellek): `detail` konu ve sonuç (yerelleştirilmiş). */
  | "learn"
  /** Tur 6: kesin bağ kurulamadı; `detail` sebep kodu (AgentLinkIssue). */
  | "note"
  /** Tur 7: ajanın çıktısındaki yerel adres Tarayıcı'da açıldı; `detail` adres (gizlisi atılmış). */
  | "browser"
  /** Tur 7: ajanın cevabında adres (uzak ya da otomatik açma kapalı); yalnız "Tarayıcıda aç" düğmesi. */
  | "link";

export const FLOW_KINDS: readonly FlowKind[] = [
  "started",
  "finished",
  "error",
  "asked",
  "assigned",
  "verified",
  "failed",
  "checkpoint",
  "message",
  "relay",
  "learn",
  "note",
  "browser",
  "link"
];

/** Çalışma alanı başına saklanan en çok olay. */
export const FLOW_HISTORY_MAX = 500;
const NAME_MAX = 120;
const DETAIL_MAX = 2_000;
const REPLY_MAX = 2_000;
const ID_MAX = 100;

export interface StoredFlowEvent {
  at: number;
  kind: FlowKind;
  paneId: string | null;
  name: string;
  detail: string;
  reply?: string;
  exact?: boolean;
  /** Tur 7 ("relay"): lider kartı türü. */
  act?: LeadAct;
  /** Tur 7 ("relay"): kartın hedef bölmesi. */
  toPaneId?: string;
}

const str = (value: unknown, max: number): string | null => (typeof value === "string" ? value.slice(0, max) : null);

/**
 * Gelen listeyi (IPC ya da dosya) doğrular, son `max` olayı tutar. `scrub` gizli
 * süzgeci (ana süreçte redact); metin alanlarına uygulanıyor.
 */
export function sanitizeFlowEvents(raw: unknown, scrub: (text: string) => string = (t) => t, max = FLOW_HISTORY_MAX): StoredFlowEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredFlowEvent[] = [];
  for (const item of raw.slice(-max)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.at !== "number" || !Number.isFinite(r.at) || r.at <= 0) continue;
    if (!(FLOW_KINDS as readonly unknown[]).includes(r.kind)) continue;
    const name = str(r.name, NAME_MAX);
    const detail = str(r.detail, DETAIL_MAX);
    if (name === null || detail === null) continue;
    const paneId = typeof r.paneId === "string" && r.paneId.length > 0 && r.paneId.length <= ID_MAX ? r.paneId : null;
    const event: StoredFlowEvent = { at: Math.floor(r.at), kind: r.kind as FlowKind, paneId, name: scrub(name), detail: scrub(detail) };
    const reply = str(r.reply, REPLY_MAX);
    if (reply) event.reply = scrub(reply);
    if (r.exact === true) event.exact = true;
    if (isLeadAct(r.act)) event.act = r.act;
    if (typeof r.toPaneId === "string" && r.toPaneId.length > 0 && r.toPaneId.length <= ID_MAX) event.toPaneId = r.toPaneId;
    out.push(event);
  }
  return out;
}

/** Dosya içeriğini okur; bozuksa boş liste. */
export function parseFlowHistory(text: string | null, scrub?: (text: string) => string): StoredFlowEvent[] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as { version?: unknown; events?: unknown };
    return sanitizeFlowEvents(parsed?.events, scrub);
  } catch {
    return [];
  }
}

/** Ana süreçten "team:relay": ajandan ajana mesaj ya da cevap (Akış'ta "A → B"). */
export interface TeamRelayMessage {
  workspaceId: string;
  paneId: string;
  name: string;
  detail: string;
  at: number;
  act?: LeadAct;
  toPaneId?: string;
}
