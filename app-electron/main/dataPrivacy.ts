// Veri ve gizlilik özeti: dosya boyutları, oturum sayıları, temizleme.
//
// SAFI HESAPLAMA (FsAdapter): dosya sistemi bağımlılığı enjeksiyonla geliyor;
// testler sahte bir adaptör geçiriyor, gerçek çalışma node:fs kullanıyor.
//
// Yol renderer'a GÖNDERİLMEZ: `data:reveal` yalnızca shell.openPath çağırır;
// ekranda kullanıcı adı geçen tam yol görünmez.

import { existsSync, readFileSync, statSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { shell } from "electron";
import { appLogPath, appLog } from "./appLog";
import { loadConfig } from "./store";
import { cancelAllChatMessages, dropAllPrewarmed } from "./axetChat";
import { clearAllBindings } from "./axetSessionBinding";
import { LOG_FILE as SAP_LOG_FILE } from "./sapWrite/log";

// ─────────────────────────────────────────────────────────────
// Dosya sistemi adaptörü (birim testler için ayrıştırılmış)
// ─────────────────────────────────────────────────────────────

export interface FsStat {
  size: number;
  isDirectory(): boolean;
  isFile(): boolean;
}

export interface FsAdapter {
  exists(p: string): boolean;
  stat(p: string): FsStat;
  readdir(p: string): string[];
}

/** Gerçek `node:fs` üzerinden çalışan adaptör. */
export const realFs: FsAdapter = {
  exists: (p) => existsSync(p),
  stat: (p) => statSync(p),
  readdir: (p) => readdirSync(p) as string[]
};

// ─────────────────────────────────────────────────────────────
// Özet veri tipleri
// ─────────────────────────────────────────────────────────────

export interface ChatSummary { count: number; bytes: number }
export interface LogSummary { bytes: number }
export interface SapWriteSummary { projects: number; bytes: number }
export interface AxetDbSummary { count: number; bytes: number }

export interface DataSummary {
  chat: ChatSummary;
  log: LogSummary;
  sapWrite: SapWriteSummary;
  axetDb: AxetDbSummary;
}

// ─────────────────────────────────────────────────────────────
// Saf hesaplama fonksiyonları
// ─────────────────────────────────────────────────────────────

/**
 * Sohbet geçmişi özeti.
 * `readContent`: dosyanın metin içeriğini döndüren fonksiyon (test için enjekte edilebilir).
 */
export function computeChatSummary(
  filePath: string,
  readContent: (p: string) => string,
  fs: FsAdapter = realFs
): ChatSummary {
  if (!fs.exists(filePath)) return { count: 0, bytes: 0 };
  let bytes = 0;
  try {
    bytes = fs.stat(filePath).size;
  } catch {
    // boyut alınamazsa 0
  }
  let count = 0;
  try {
    const text = readContent(filePath);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (Array.isArray(parsed.sessions)) count = parsed.sessions.length;
  } catch {
    // bozuk JSON: sayı 0
  }
  return { count, bytes };
}

/** Uygulama günlüğü özeti (ana + .1 rotasyon). */
export function computeLogSummary(logPath: string, fs: FsAdapter = realFs): LogSummary {
  let bytes = 0;
  for (const p of [logPath, `${logPath}.1`]) {
    if (!fs.exists(p)) continue;
    try {
      bytes += fs.stat(p).size;
    } catch {
      // erişilemezse atla
    }
  }
  return { bytes };
}

/**
 * SAP yazma günlüklerini proje klasörlerinde arar.
 * Derinlik: yalnızca proje klasörünün DOĞRUDAN alt klasörleri taranır.
 * `node_modules` atlanır.
 */
export function computeSapWriteSummary(
  baseDirs: string[],
  fs: FsAdapter = realFs
): SapWriteSummary {
  let bytes = 0;
  let projects = 0;
  const seenProjectDirs = new Set<string>();

  for (const base of baseDirs) {
    if (!fs.exists(base)) continue;
    let children: string[];
    try {
      children = fs.readdir(base);
    } catch {
      continue;
    }
    for (const child of children) {
      if (child === "node_modules") continue;
      const projectDir = path.join(base, child);
      if (seenProjectDirs.has(projectDir)) continue;
      seenProjectDirs.add(projectDir);
      const logFile = path.join(projectDir, SAP_LOG_FILE);
      if (!fs.exists(logFile)) continue;
      projects++;
      try {
        bytes += fs.stat(logFile).size;
      } catch {
        // erişilemezse atla
      }
    }
  }

  return { projects, bytes };
}

/**
 * axet-code veritabanlarını proje klasörlerinde arar.
 * Arama: baseDir → proje alt klasörü → .axet-code/axet-code.db
 * `node_modules` atlanır.
 */
export function computeAxetDbSummary(
  baseDirs: string[],
  fs: FsAdapter = realFs
): AxetDbSummary {
  let count = 0;
  let bytes = 0;
  const seenDbs = new Set<string>();

  for (const base of baseDirs) {
    if (!fs.exists(base)) continue;
    let children: string[];
    try {
      children = fs.readdir(base);
    } catch {
      continue;
    }
    for (const child of children) {
      if (child === "node_modules") continue;
      const projectDir = path.join(base, child);
      const dbPath = path.join(projectDir, ".axet-code", "axet-code.db");
      if (seenDbs.has(dbPath)) continue;
      if (!fs.exists(dbPath)) continue;
      seenDbs.add(dbPath);
      count++;
      try {
        bytes += fs.stat(dbPath).size;
      } catch {
        // erişilemezse boyut eklenmez
      }
    }
  }
  return { count, bytes };
}

// ─────────────────────────────────────────────────────────────
// Gerçek özet (Electron bağlamı)
// ─────────────────────────────────────────────────────────────

function allProjectDirs(): string[] {
  const cfg = loadConfig();
  const dirs: string[] = [cfg.projectsBaseDir];
  if (Array.isArray(cfg.previousProjectsBaseDirs)) {
    dirs.push(...cfg.previousProjectsBaseDirs);
  }
  return [...new Set(dirs.filter(Boolean))];
}

export function buildSummary(): DataSummary {
  // Chat
  const { app } = require("electron") as typeof import("electron");
  const chatPath = path.join(app.getPath("userData"), "chat-sessions.json");
  const chat = computeChatSummary(
    chatPath,
    (p) => readFileSync(p, "utf8"),
    realFs
  );

  // Log
  const log = computeLogSummary(appLogPath(), realFs);

  // Proje bazlı
  const baseDirs = allProjectDirs();
  const sapWrite = computeSapWriteSummary(baseDirs, realFs);
  const axetDb = computeAxetDbSummary(baseDirs, realFs);

  return { chat, log, sapWrite, axetDb };
}

// ─────────────────────────────────────────────────────────────
// Temizleme
// ─────────────────────────────────────────────────────────────

/** Sohbet geçmişini temizle: çalışan turları durdur, havuzu bırak, bağları sil, dosyayı boşalt. */
export function clearChatHistory(): { ok: boolean; error?: string } {
  try {
    cancelAllChatMessages();
    dropAllPrewarmed();
    clearAllBindings();

    const { app } = require("electron") as typeof import("electron");
    const chatPath = path.join(app.getPath("userData"), "chat-sessions.json");
    // Projeleri KORUYARAK yalnız sohbetleri sil.
    let projects: unknown[] = [];
    try {
      const raw = JSON.parse(readFileSync(chatPath, "utf8")) as Record<string, unknown>;
      if (Array.isArray(raw.projects)) projects = raw.projects;
    } catch {
      // Okunamadıysa projeler kaybolmaz: boş dizi yeterli.
    }
    const empty = JSON.stringify({ version: 1, activeId: null, sessions: [], projects }, null, 2);
    writeFileSync(chatPath, empty, "utf8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Uygulama günlüğünü temizle: ana ve rotasyon dosyasını sil. */
export function clearAppLog(): { ok: boolean; error?: string } {
  const logPath = appLogPath();
  const errors: string[] = [];
  for (const p of [logPath, `${logPath}.1`]) {
    if (!existsSync(p)) continue;
    try {
      unlinkSync(p);
    } catch (err) {
      errors.push((err as Error).message);
    }
  }
  if (errors.length > 0) return { ok: false, error: errors.join("; ") };
  // Temizleme kaydı: çok kısa bir satır, kurala uygun.
  try {
    appLog("veri.gunluk-temizlendi");
  } catch {
    // Günlük açılamazsa devam et.
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Reveal (shell.openPath)
// ─────────────────────────────────────────────────────────────

export async function revealData(kind: "chat" | "log" | "sapWrite"): Promise<void> {
  try {
    const { app } = require("electron") as typeof import("electron");
    let target = "";
    if (kind === "chat") {
      target = app.getPath("userData");
    } else if (kind === "log") {
      const lp = appLogPath();
      target = lp ? path.dirname(lp) : app.getPath("userData");
    } else if (kind === "sapWrite") {
      const cfg = loadConfig();
      target = cfg.projectsBaseDir;
    }
    if (target) await shell.openPath(target);
  } catch {
    // shell.openPath başarısız olursa sessizce geç.
  }
}
