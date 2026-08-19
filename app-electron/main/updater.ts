import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import type { UpdateStatus } from "../shared/types";

// GitHub reposu (tufansasmaz/axet-sap-launcher) PRIVATE — bu yüzden hem
// `npm run release` (electron-builder'ın .exe/.blockmap dosyalarını GitHub
// Releases'e YÜKLEMESİ, build-time, GH_TOKEN env var'ı ile) hem de burası
// (electron-updater'ın çalışan uygulamada güncelleme VAR MI diye kontrol
// etmesi/İNDİRMESİ, runtime, kullanıcının Ayarlar'a girdiği token ile) genel
// GitHub API'sinin kimliksiz/anonim rate-limit'ine değil, bir Personal
// Access Token'a ihtiyaç duyar. Public bir repo olsaydı bu token hiç
// gerekmezdi (bkz. PROJE-BILGI.md "Otomatik Güncelleme" bölümü).
//
// Token BURADA (kaynak kodda) hardcode edilmiyor — kullanıcı kendi salt-okunur
// (fine-grained, sadece bu repo, "Contents: Read-only") kişisel erişim
// anahtarını Ayarlar penceresine yapıştırıyor, `AppConfig.updateToken` olarak
// diskte (userData/config.json) saklanıyor. Bu, imzasız/dahili bir kurumsal
// araç için makul bir tercih — token'ın sızması sadece bu TEK repoyu
// salt-okunur ifşa eder, hesabın tamamını değil.
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

// Private repo'ya karşı token'sız çağrı yapılırsa electron-updater "404
// Not Found" hatası döner (repo'yu görebilecek yetkisi yoktur) — bu,
// token eksik/yanlış olduğunda kullanıcıya net bir mesaj vermek için
// burada özel olarak ele alınıyor.
function configureFeed(token: string | null): void {
  autoUpdater.setFeedURL({
    provider: "github",
    owner: REPO_OWNER,
    repo: REPO_NAME,
    private: true,
    token: token ?? undefined
  });
}

export async function checkForUpdates(window: BrowserWindow, token: string | null): Promise<void> {
  if (!app.isPackaged) {
    sendStatus({ phase: "error", message: "Güncelleme kontrolü sadece paketlenmiş uygulamada çalışır (dev modda değil)." });
    return;
  }
  currentWindow = window;
  ensureListeners();
  if (!token) {
    sendStatus({
      phase: "error",
      message: "Güncelleme kontrolü için Ayarlar'dan bir GitHub erişim anahtarı (token) girilmesi gerekiyor (repo private)."
    });
    return;
  }
  try {
    configureFeed(token);
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
