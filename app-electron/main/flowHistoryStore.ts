// Akış geçmişinin diskteki kaydı (Tur 4): userData/flow-history/<alan>.json.
// 2026-10-21: kayıt zaman tabanlı (version 2) — son N gün (Ayarlar), en çok
// FLOW_STORE_MAX olay ve FLOW_STORE_BYTES, hangisi önce. Renderer yalnız
// bellekteki son 500'ü gönderiyor; bellekten düşmüş eski olaylar diskte
// korunuyor (mergeStoredFlow). Açılış yüklemesi yalnız son 500 (görünür liste);
// Pano/Raporlar aralığı readFlowRange ile okuyor. Eski version 1 dosyası aynı
// biçimde okunuyor. Metinler gizli süzgecinden (destek paketinin redact'ı)
// geçerek yazılıyor. Yazım atomik (tmp + rename). Hiçbir yol fırlatmıyor:
// okunamayan dosya boş geçmiş, yazılamayan false.
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import {
  FLOW_HISTORY_MAX,
  FLOW_STORE_BYTES,
  FLOW_STORE_MAX,
  mergeStoredFlow,
  parseFlowHistory,
  sanitizeFlowEvents,
  type FlowRange,
  type FlowStoreOptions,
  type StoredFlowEvent
} from "../shared/flowHistory";
import { redact } from "./support/redact";

export const scrubFlowText = (text: string): string => {
  try {
    return redact(text, []).text;
  } catch {
    return text;
  }
};

function fileOf(dir: string, workspaceId: unknown): string | null {
  return isBoardId(workspaceId) ? path.join(dir, `${workspaceId}.json`) : null;
}

function readText(file: string): string | null {
  try {
    return existsSync(file) ? readFileSync(file, "utf-8") : null;
  } catch {
    return null;
  }
}

function readCapped(text: string | null): boolean {
  if (!text) return false;
  try {
    return (JSON.parse(text) as { capped?: unknown })?.capped === true;
  } catch {
    return false;
  }
}

/** Açılış yüklemesi: yalnız son FLOW_HISTORY_MAX olay (bellekteki görünür liste). */
export function loadFlowHistory(dir: string, workspaceId: unknown): StoredFlowEvent[] {
  const file = fileOf(dir, workspaceId);
  if (!file) return [];
  return parseFlowHistory(readText(file), scrubFlowText, FLOW_HISTORY_MAX);
}

/** Pano/Raporlar: kayıttan `from` (dahil) .. `to` (hariç) aralığı. */
export function readFlowRange(dir: string, workspaceId: unknown, from: unknown, to?: unknown): FlowRange {
  const file = fileOf(dir, workspaceId);
  if (!file) return { events: [], total: 0, oldest: null, full: false };
  const text = readText(file);
  const all = parseFlowHistory(text, scrubFlowText, FLOW_STORE_MAX);
  const lo = typeof from === "number" && Number.isFinite(from) ? from : 0;
  const hi = typeof to === "number" && Number.isFinite(to) ? to : Infinity;
  return {
    events: all.filter((e) => e.at >= lo && e.at < hi),
    total: all.length,
    oldest: all[0]?.at ?? null,
    full: readCapped(text) || all.length >= FLOW_STORE_MAX
  };
}

/** Boyut tavanı: sondan geriye sığanlar kalıyor (en eskiler atılıyor). */
function fitBytes(events: StoredFlowEvent[], maxBytes: number): { events: StoredFlowEvent[]; trimmed: boolean } {
  let total = 64;
  let start = events.length;
  while (start > 0) {
    const size = Buffer.byteLength(JSON.stringify(events[start - 1]), "utf-8") + 1;
    if (total + size > maxBytes) break;
    total += size;
    start--;
  }
  return { events: start === 0 ? events : events.slice(start), trimmed: start > 0 };
}

export interface FlowSaveOptions extends FlowStoreOptions {
  maxBytes?: number;
}

/** Bellekteki son listeyi diskteki kayıtla birleştirip yazar. */
export function saveFlowHistory(dir: string, workspaceId: unknown, events: unknown, opts: FlowSaveOptions = {}): boolean {
  const file = fileOf(dir, workspaceId);
  if (!file) return false;
  const incoming = sanitizeFlowEvents(events, scrubFlowText, FLOW_STORE_MAX);
  // Diskteki kayıt zaten süzülmüş: her kayıtta 5000 olayı yeniden süzmüyoruz.
  const disk = parseFlowHistory(readText(file), (t) => t, FLOW_STORE_MAX);
  const max = opts.max ?? FLOW_STORE_MAX;
  const merged = mergeStoredFlow(disk, incoming, { ...opts, max });
  const fitted = fitBytes(merged, opts.maxBytes ?? FLOW_STORE_BYTES);
  const capped = fitted.trimmed || merged.length >= max;
  const tmp = `${file}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, JSON.stringify({ version: 2, ...(capped ? { capped: true } : {}), events: fitted.events }), "utf-8");
    renameSync(tmp, file);
    return true;
  } catch {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      // temizlik başarısız olsa da sonuç false
    }
    return false;
  }
}

export function clearFlowHistory(dir: string, workspaceId: unknown): boolean {
  const file = fileOf(dir, workspaceId);
  if (!file) return false;
  try {
    if (existsSync(file)) unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}
