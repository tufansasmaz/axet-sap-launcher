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
  | "link"
  /** Tur 10: konuşmadan belleğe otomatik eklenen/güncellenen not; `detail` başlık, `noteId` geri alma için. */
  | "memory";

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
  "link",
  "memory"
];

/**
 * Çalışma alanı başına BELLEKTEKİ (görünür Akış listesi) en çok olay; açılışta
 * diskten de yalnız bu kadarı yükleniyor (performans).
 */
export const FLOW_HISTORY_MAX = 500;
/**
 * Kalıcı kayıt (2026-10-21): 500 sınırı yoğun ekipte Pano'nun 7 günlük
 * grafiklerini ve eski raporların adımlarını boş bırakıyordu. Disk artık zaman
 * tabanlı: son N gün (Ayarlar: 7/14/30) ya da en çok FLOW_STORE_MAX olay ya da
 * FLOW_STORE_BYTES — hangisi önce dolarsa. Pano/Raporlar aralığı diskten okur.
 */
export const FLOW_STORE_MAX = 5_000;
export const FLOW_STORE_BYTES = 4_000_000;
export const FLOW_HISTORY_DAYS_OPTIONS = [7, 14, 30] as const;
export const FLOW_HISTORY_DAYS_DEFAULT = 14;
const DAY_MS = 86_400_000;

export function normalizeFlowHistoryDays(value: unknown): number {
  return typeof value === "number" && (FLOW_HISTORY_DAYS_OPTIONS as readonly number[]).includes(value) ? value : FLOW_HISTORY_DAYS_DEFAULT;
}

/** "flow:range" cevabı (Pano/Raporlar). */
export interface FlowRange {
  /** Aralıktaki olaylar, eskiden yeniye. */
  events: StoredFlowEvent[];
  /** Kayıttaki toplam olay. */
  total: number;
  /** Kayıttaki en eski olayın anı. */
  oldest: number | null;
  /** Kayıt olay ya da boyut tavanına dayandı (gün sınırından önce eskiler atıldı). */
  full: boolean;
}

export interface FlowStoreOptions {
  now?: number;
  /** Verilmezse gün sınırı yok (yalnız olay tavanı). */
  days?: number;
  max?: number;
}
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
  /** Tur 10 ("memory"): notun kimliği (geri al). */
  noteId?: string;
  /** Tur 10 ("memory"): var olan not güncellendi (yeni eklenmedi). */
  updated?: boolean;
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
    // Tur 11: tahmini kart (≈) yeniden yüklenince de tahmini kalsın.
    if (typeof r.exact === "boolean") event.exact = r.exact;
    if (isLeadAct(r.act)) event.act = r.act;
    if (typeof r.toPaneId === "string" && r.toPaneId.length > 0 && r.toPaneId.length <= ID_MAX) event.toPaneId = r.toPaneId;
    if (typeof r.noteId === "string" && /^[\w-]{1,64}$/.test(r.noteId)) event.noteId = r.noteId;
    if (r.updated === true) event.updated = true;
    out.push(event);
  }
  return out;
}

/**
 * Diskteki kayıt + bellekteki son liste. Bellekteki liste en yeni pencerenin
 * TAMAMI (kart katlama dahil): en eski olayından itibaren diskin yerine geçiyor;
 * ondan eski disk olayları (bellekten düşmüş olanlar) korunuyor.
 */
export function mergeStoredFlow(disk: readonly StoredFlowEvent[], incoming: readonly StoredFlowEvent[], opts: FlowStoreOptions = {}): StoredFlowEvent[] {
  let cutoff = Infinity;
  for (const e of incoming) if (e.at < cutoff) cutoff = e.at;
  const merged = [...disk.filter((e) => e.at < cutoff), ...incoming].sort((a, b) => a.at - b.at);
  const since = opts.days ? (opts.now ?? Date.now()) - opts.days * DAY_MS : -Infinity;
  return merged.filter((e) => e.at >= since).slice(-(opts.max ?? FLOW_STORE_MAX));
}

/**
 * Dosya içeriğini okur; bozuksa boş liste. Biçim: version 1 (≤500 olay) ya da
 * 2 (zaman tabanlı, ≤FLOW_STORE_MAX); ikisi de `{ version, events }`.
 */
export function parseFlowHistory(text: string | null, scrub?: (text: string) => string, max = FLOW_HISTORY_MAX): StoredFlowEvent[] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as { version?: unknown; events?: unknown };
    return sanitizeFlowEvents(parsed?.events, scrub, max);
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
