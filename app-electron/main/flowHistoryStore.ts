// Akış geçmişinin diskteki kaydı (Tur 4): userData/flow-history/<alan>.json.
// Çalışma alanı başına son FLOW_HISTORY_MAX olay; metinler gizli süzgecinden
// (destek paketinin redact'ı) geçerek yazılıyor. Yazım atomik (tmp + rename).
// Hiçbir yol fırlatmıyor: okunamayan dosya boş geçmiş, yazılamayan false.
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import { parseFlowHistory, sanitizeFlowEvents, type StoredFlowEvent } from "../shared/flowHistory";
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

export function loadFlowHistory(dir: string, workspaceId: unknown): StoredFlowEvent[] {
  const file = fileOf(dir, workspaceId);
  if (!file) return [];
  try {
    if (!existsSync(file)) return [];
    return parseFlowHistory(readFileSync(file, "utf-8"), scrubFlowText);
  } catch {
    return [];
  }
}

export function saveFlowHistory(dir: string, workspaceId: unknown, events: unknown): boolean {
  const file = fileOf(dir, workspaceId);
  if (!file) return false;
  const list = sanitizeFlowEvents(events, scrubFlowText);
  const tmp = `${file}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, JSON.stringify({ version: 1, events: list }), "utf-8");
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
