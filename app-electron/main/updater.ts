import { app, BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
import type { UpdateStatus } from "../shared/types";

// electron-updater CommonJS bir modül — named export (`import { autoUpdater }
// from "electron-updater"`) paketlenmiş/ESM ortamda "Named export
// 'autoUpdater' not found" hatasıyla patlıyor (Node'un CJS/ESM interop'u
// tüm CJS export'larını otomatik "named" olarak tanımıyor). Bunun yerine
// default import + destructure kullanılıyor — Node'un kendi resmi
// önerdiği yol.
const { autoUpdater } = electronUpdater;

// GitHub reposu (tufansasmaz/axet-sap-launcher) PUBLIC — bu yüzden hem
// yayınlama (`npm run release`, GH_TOKEN env var'ı gerektirir — sadece o
// komutu çalıştıran geliştiricinin makinesinde) hem de burada güncelleme
// KONTROLÜ/İNDİRME tamamen anonim/token'sız çalışır (GitHub'ın public repo
// releases API'si kimlik doğrulama istemez). Repo daha önce private
// tutulmuştu ve kullanıcı tarafında bir erişim anahtarı (token) girme
// gerekliliği vardı — bkz. PROJE-BILGI.md, repo public'e çevrilince bu
// karmaşıklık tamamen kaldırıldı.
const REPO_OWNER = "tufansasmaz";
const REPO_NAME = "axet-sap-launcher";

let currentWindow: BrowserWindow | null = null;
let listenersRegistered = false;
let lastStatus: UpdateStatus = { phase: "idle" };

function sendStatus(status: UpdateStatus): void {
  lastStatus = status;
  if (currentWindow && !currentWindow.isDestroyed()) {
    currentWindow.webContents.send("updates:status", status);
  }
}

export function getLastUpdateStatus(): UpdateStatus {
  return lastStatus;
}

function ensureListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({
    provider: "github",
    owner: REPO_OWNER,
    repo: REPO_NAME
  });

  autoUpdater.on("checking-for-update", () => {
    sendStatus({ phase: "checking" });
  });
  autoUpdater.on("update-available", (info) => {
    sendStatus({ phase: "available", version: info.version });
  });
  autoUpdater.on("update-not-available", () => {
    sendStatus({ phase: "not-available" });
  });
  autoUpdater.on("download-progress", (progress) => {
    sendStatus({ phase: "downloading", percent: Math.round(progress.percent) });
  });
  autoUpdater.on("update-downloaded", (info) => {
    sendStatus({ phase: "downloaded", version: info.version });
  });
  autoUpdater.on("error", (err) => {
    sendStatus({ phase: "error", message: err?.message ?? String(err) });
  });
}

export async function checkForUpdates(window: BrowserWindow): Promise<void> {
  if (!app.isPackaged) {
    sendStatus({ phase: "error", message: "Güncelleme kontrolü sadece paketlenmiş uygulamada çalışır (dev modda değil)." });
    return;
  }
  currentWindow = window;
  ensureListeners();
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    sendStatus({ phase: "error", message: (err as Error).message });
  }
}

export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    sendStatus({ phase: "error", message: (err as Error).message });
  }
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
