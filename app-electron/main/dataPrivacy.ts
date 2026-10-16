// Veri ve gizlilik özeti: dosya boyutları, oturum sayıları, temizleme.
//
// SAFI HESAPLAMA (FsAdapter + enjeksiyon): bütün dosya sistemi çağrıları
// ve Electron bağımlılıkları enjeksiyonla geliyor; testler sahte nesne geçiriyor.
//
// Yol renderer'a GÖNDERİLMEZ: `data:reveal` yalnızca shell.openPath çağırır;
// ekranda kullanıcı adı geçen tam yol görünmez.

import { existsSync, readFileSync, statSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { shell } from "electron";
import { appLogPath, appLog } from "./appLog";
import { loadConfig } from "./store";
import { loadChatSessions, saveChatSessions } from "./chatStore";
import { cancelAllChatMessages, dropAllPrewarmed } from "./axetChat";
import { clearAllBindings } from "./axetSessionBinding";
import { LOG_FILE as SAP_LOG_FILE } from "./sapWrite/log";
import type { ChatSessionsState } from "../shared/types";

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

// Tarama: proje klasörünün içindeki sap-yazma-gunlugu ve axet-code db'sini
// bulmak için. Proje hiyerarşisi şöyle:
//   projectsBaseDir / [müşteri] / sistem /
// Müşteri katmanı isteğe bağlı olduğundan MAKS_DERINLIK = 3 ile geziyor.
// node_modules her seviyede atlanıyor. Nokta-klasörler de atlanıyor,
// .axet-code hariç (axet-code db'si orada).

const MAX_SCAN_DEPTH = 3;

/**
 * `base` altındaki tüm proje klasörlerini MAX_SCAN_DEPTH seviyeye kadar toplayan
 * özyinelemeli yardımcı. node_modules ve nokta-klasörler (axet-code hariç) atlanır.
 */
function collectProjectDirs(
  base: string,
  fs: FsAdapter,
  depth: number,
  seen: Set<string>,
  results: string[]
): void {
  if (depth > MAX_SCAN_DEPTH) return;
  let children: string[];
  try {
    children = fs.readdir(base);
  } catch {
    return;
  }
  for (const child of children) {
    if (child === "node_modules") continue;
    if (child.startsWith(".") && child !== ".axet-code") continue;
    const childPath = path.join(base, child);
    const key = childPath.toLowerCase();
    if (seen.has(key)) continue;
    // Yalnızca klasörler geziniliyor; dosyalar atlanıyor.
    let isDir = false;
    try {
      isDir = fs.stat(childPath).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    seen.add(key);
    results.push(childPath);
    // Bir alt seviye daha tara (müşteri/sistem hiyerarşisi için)
    if (depth < MAX_SCAN_DEPTH) {
      collectProjectDirs(childPath, fs, depth + 1, seen, results);
    }
  }
}

/**
 * SAP yazma günlüklerini proje klasörlerinde arar.
 * node_modules ve dot-klasörler atlanır; maks derinlik MAX_SCAN_DEPTH.
 */
export function computeSapWriteSummary(
  baseDirs: string[],
  fs: FsAdapter = realFs
): SapWriteSummary {
  let bytes = 0;
  let projects = 0;
  const seen = new Set<string>();

  for (const base of baseDirs) {
    if (!fs.exists(base)) continue;
    const allDirs: string[] = [];
    collectProjectDirs(base, fs, 1, seen, allDirs);
    for (const dir of allDirs) {
      const logFile = path.join(dir, SAP_LOG_FILE);
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
 * node_modules ve dot-klasörler atlanır; maks derinlik MAX_SCAN_DEPTH.
 */
export function computeAxetDbSummary(
  baseDirs: string[],
  fs: FsAdapter = realFs
): AxetDbSummary {
  let count = 0;
  let bytes = 0;
  const seen = new Set<string>();

  for (const base of baseDirs) {
    if (!fs.exists(base)) continue;
    const allDirs: string[] = [];
    collectProjectDirs(base, fs, 1, seen, allDirs);
    for (const dir of allDirs) {
      const dbPath = path.join(dir, ".axet-code", "axet-code.db");
      if (!fs.exists(dbPath)) continue;
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

/** chatPath: app.getPath("userData") + "/chat-sessions.json". Dışarıdan enjekte edilebilir. */
export function chatFilePath(): string {
  // Lazy import: sadece gerçek çalışmada Electron bağlamı lazım.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require("electron") as typeof import("electron");
  return path.join(app.getPath("userData"), "chat-sessions.json");
}

export function buildSummary(): DataSummary {
  const chatPath = chatFilePath();
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
// Temizleme (saf çekirdek — enjeksiyonlu, test edilebilir)
// ─────────────────────────────────────────────────────────────

/** `saveChatSessions` ile aynı imza; test edilebilir enjeksiyon için. */
type SaveFn = (state: ChatSessionsState) => { ok: boolean; error?: string };

/**
 * Sohbet geçmişini temizleyen SAF çekirdek.
 *
 * Güvenlik: dosya VARSA ama OKUNAMAZ/BOZUKSA → abort, ok:false.
 * Projeler korunur, sessions boş yapılır, `save` atomik yazımı üstlenir.
 */
export function clearChatHistoryCore(
  chatPath: string,
  readFile: (p: string) => string,
  save: SaveFn,
  cancelAll: () => void,
  dropPool: () => void,
  clearBindings: () => void,
  fs: FsAdapter = realFs
): { ok: boolean; error?: string } {
  // Çalışan turları durdur ve havuzu bırak — bu kısım her zaman çalışır.
  cancelAll();
  dropPool();
  clearBindings();

  // Projeleri koruyarak oku — ama dosya varsa ve okunamıyorsa ABORT.
  let projects: unknown[] = [];
  if (fs.exists(chatPath)) {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(readFile(chatPath)) as Record<string, unknown>;
    } catch {
      // Bozuk/okunamaz → geri al: projeleri yok etme riski var.
      return { ok: false, error: "veri.chat.oku-hatasi" };
    }
    if (Array.isArray(raw.projects)) projects = raw.projects;
  }

  const state: ChatSessionsState = { activeId: null, sessions: [], projects: projects as ChatSessionsState["projects"] };
  const result = save(state);
  if (!result.ok) {
    // Ham hata mesajı yol içerebilir; sabit kod döndür.
    return { ok: false, error: "veri.chat.kaydet-hatasi" };
  }
  return { ok: true };
}

/** Gerçek çalışmada: Electron + chatStore.saveChatSessions. */
export function clearChatHistory(): { ok: boolean; error?: string } {
  return clearChatHistoryCore(
    chatFilePath(),
    (p) => readFileSync(p, "utf8"),
    saveChatSessions,
    cancelAllChatMessages,
    dropAllPrewarmed,
    clearAllBindings,
    realFs
  );
}

// ─────────────────────────────────────────────────────────────
// Günlük temizleme (saf çekirdek — enjeksiyonlu)
// ─────────────────────────────────────────────────────────────

interface LogFsOps {
  exists(p: string): boolean;
  unlink(p: string): void;
}

/**
 * Günlük temizleyen saf çekirdek.
 * Hata kodu yol barındırmaz.
 */
export function clearAppLogCore(
  logPath: string,
  ops: LogFsOps
): { ok: boolean; error?: string } {
  const errors: string[] = [];
  for (const p of [logPath, `${logPath}.1`]) {
    if (!ops.exists(p)) continue;
    try {
      ops.unlink(p);
    } catch {
      errors.push(p);
    }
  }
  if (errors.length > 0) return { ok: false, error: "veri.gunluk.sil-hatasi" };
  return { ok: true };
}

/** Gerçek çalışmada: node:fs. */
export function clearAppLog(): { ok: boolean; error?: string } {
  const logPath = appLogPath();
  const result = clearAppLogCore(logPath, {
    exists: (p) => existsSync(p),
    unlink: (p) => unlinkSync(p)
  });
  if (result.ok) {
    // Temizleme kaydı: çok kısa bir satır, kurala uygun.
    try { appLog("veri.gunluk-temizlendi"); } catch { /* devam */ }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Reveal (shell.openPath) — yol renderer'a gönderilmez
// ─────────────────────────────────────────────────────────────

export async function revealData(kind: "chat" | "log" | "sapWrite" | "axetDb"): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require("electron") as typeof import("electron");
    let target = "";
    if (kind === "chat") {
      target = app.getPath("userData");
    } else if (kind === "log") {
      const lp = appLogPath();
      target = lp ? path.dirname(lp) : app.getPath("userData");
    } else if (kind === "sapWrite" || kind === "axetDb") {
      const cfg = loadConfig();
      target = cfg.projectsBaseDir;
    }
    if (target) await shell.openPath(target);
  } catch {
    // shell.openPath başarısız olursa sessizce geç.
  }
}
