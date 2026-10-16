// SAP yazma geçmişini okuma ve CSV'ye kaydetme (spec 2026-10-16
// sap-yazma-gecmisi §5). Kayıt YALNIZ okunuyor; silme/düzenleme yok.
// Kayıt proje klasöründe, sistemin kendi klasöründe: bağlı olmak gerekmiyor.

import { existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BrowserWindow, dialog } from "electron";
import type { AppConfig, SapService } from "../../shared/types";
import {
  buildWriteHistory,
  toCsv,
  type CsvLanguage,
  type WriteOp,
  type WriteCsvResult,
  type WriteHistoryResult
} from "../../shared/sapWriteHistory";
import { mt } from "../i18n";
import { computeProjectDir } from "../launcher";
import { loadConfig } from "../store";
import { readTail } from "../support/bundle";
import { LOG_FILE } from "./log";

export const MAX_HISTORY_BYTES = 5 * 1024 * 1024;

export function readWriteHistory(projectDir: string, max = MAX_HISTORY_BYTES): WriteHistoryResult {
  const file = path.join(projectDir, LOG_FILE);
  if (!existsSync(file)) return { ok: true, ops: [], skipped: 0, truncated: false };
  try {
    const stat = statSync(file);
    // Windows'ta klasör "dosya gibi" açılıp boş okunuyor: boş liste değil, okunamadı.
    if (!stat.isFile()) return { ok: false, reason: "okunamadi" };
    const size = stat.size;
    const { ops, skipped } = buildWriteHistory(readTail(file, max).split(/\r?\n/));
    return { ok: true, ops, skipped, truncated: size > max };
  } catch {
    // OneDrive kilidi, izin, klasör: panel çökmesin, "okunamadı" desin.
    return { ok: false, reason: "okunamadi" };
  }
}

/**
 * Birden fazla proje klasöründen geçmiş okuyup id'ye göre tekilleştirir.
 * Birincil klasör hata verirse hata döner; önceki klasörler yoksa atlanır.
 */
export function readWriteHistoryMerged(primaryDir: string, extraDirs: string[], max = MAX_HISTORY_BYTES): WriteHistoryResult {
  const primary = readWriteHistory(primaryDir, max);
  if (!primary.ok) return primary;

  // Önceki klasörlerden sessizce okuyup birleştir.
  const allOps: WriteOp[] = [...primary.ops];
  let totalSkipped = primary.skipped;
  let anyTruncated = primary.truncated;

  for (const dir of extraDirs) {
    const r = readWriteHistory(dir, max);
    if (!r.ok) continue;
    totalSkipped += r.skipped;
    if (r.truncated) anyTruncated = true;
    allOps.push(...r.ops);
  }

  // id'ye göre tekilleştir (ilk görülen kazanır — primary önce eklendiği için öncelikli).
  const seen = new Set<string>();
  const unique: WriteOp[] = [];
  for (const op of allOps) {
    if (!seen.has(op.key)) {
      seen.add(op.key);
      unique.push(op);
    }
  }

  // Tarihe göre azalan sıra (en yeni üstte).
  unique.sort((a, b) => b.zaman.localeCompare(a.zaman));

  return { ok: true, ops: unique, skipped: totalSkipped, truncated: anyTruncated };
}

export function csvFileName(sid: string, now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const safe = sid.replace(/[^A-Za-z0-9_-]/g, "_") || "sistem";
  return `sap-yazma-${safe}-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.csv`;
}

export async function exportWriteHistoryCsv(
  projectDir: string,
  sid: string,
  language: CsvLanguage,
  deps: { pickPath: (defaultName: string) => Promise<string | null>; now?: Date; extraDirs?: string[] }
): Promise<WriteCsvResult> {
  // Sınırsız: denetçiye giden dosya tam olmalı; 5 MB sınırı yalnız panel için.
  const history = readWriteHistoryMerged(projectDir, deps.extraDirs ?? [], Number.POSITIVE_INFINITY);
  if (!history.ok) return { ok: false, message: history.reason };
  const target = await deps.pickPath(csvFileName(sid, deps.now ?? new Date()));
  if (!target) return { ok: false, canceled: true };
  try {
    // BOM: Excel UTF-8'i ancak onunla tanıyor, yoksa Türkçe harfler bozuk açılıyor.
    writeFileSync(target, "\uFEFF" + toCsv(history.ops, language), "utf-8");
    return { ok: true, path: target, count: history.ops.length };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

const DOTS_ONLY = /^\s*\.+\s*$/;

/**
 * Renderer'dan gelen seçim: yol parçaları ve sistem; biçim tutmuyorsa null.
 * `..` gibi parçalar proje kökünün dışına çıkamasın (sanitizeSegment noktaları
 * ayıklamıyor); sonuç yine de kökün altında mı diye ayrıca bakılıyor.
 */
export function projectDirFrom(
  customerPath: unknown,
  service: unknown,
  config: Pick<AppConfig, "projectsBaseDir"> = loadConfig()
): { dir: string; sid: string } | null {
  if (!Array.isArray(customerPath) || !customerPath.every((s) => typeof s === "string")) return null;
  if (typeof service !== "object" || service === null) return null;
  const s = service as Partial<SapService>;
  if (typeof s.systemId !== "string" || typeof s.name !== "string") return null;
  if ([...customerPath, s.systemId || s.name].some((seg) => DOTS_ONLY.test(seg))) return null;
  const dir = computeProjectDir(config as AppConfig, customerPath, { systemId: s.systemId, name: s.name });
  const rel = path.relative(config.projectsBaseDir, dir);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return { dir, sid: s.systemId || s.name };
}

/**
 * Geçerli taban + önceki tabanlar için proje klasörlerini döndürür.
 * Her taban kendi içinde yol güvenliği denetiminden geçirilir.
 */
function extraDirsFrom(
  customerPath: string[],
  service: Partial<SapService>,
  config: Pick<AppConfig, "projectsBaseDir" | "previousProjectsBaseDirs">
): string[] {
  const prev = config.previousProjectsBaseDirs ?? [];
  const out: string[] = [];
  for (const base of prev) {
    const fakeConfig = { ...config, projectsBaseDir: base };
    const r = projectDirFrom(customerPath, service, fakeConfig);
    if (r) out.push(r.dir);
  }
  return out;
}

export function registerWriteHistoryIpc(ipc: { handle(channel: string, fn: (...args: any[]) => unknown): void }): void {
  ipc.handle("sapWrite:history", (_event: unknown, customerPath: unknown, service: unknown): WriteHistoryResult => {
    const config = loadConfig();
    const target = projectDirFrom(customerPath, service, config);
    if (!target) return { ok: false, reason: "okunamadi" };
    const extras = extraDirsFrom(customerPath as string[], service as Partial<SapService>, config);
    return readWriteHistoryMerged(target.dir, extras);
  });
  ipc.handle("sapWrite:exportCsv", async (_event: unknown, customerPath: unknown, service: unknown): Promise<WriteCsvResult> => {
    const config = loadConfig();
    const target = projectDirFrom(customerPath, service, config);
    if (!target) return { ok: false, message: "okunamadi" };
    const extras = extraDirsFrom(customerPath as string[], service as Partial<SapService>, config);
    return exportWriteHistoryCsv(target.dir, target.sid, config.language === "en" ? "en" : "tr", {
      extraDirs: extras,
      pickPath: async (defaultName) => {
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showSaveDialog(win ?? (undefined as any), {
          title: mt("dialog.exportWriteHistory"),
          defaultPath: defaultName,
          filters: [{ name: "CSV", extensions: ["csv"] }]
        });
        return result.canceled || !result.filePath ? null : result.filePath;
      }
    });
  });
}
