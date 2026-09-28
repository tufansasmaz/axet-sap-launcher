import { app, BrowserWindow, net } from "electron";
import electronUpdater from "electron-updater";
import type { UpdateDownloadedEvent } from "electron-updater";
import type { UpdateStatus } from "../shared/types";
import { mt } from "./i18n";
import {
  SIGNATURE_MAX_BYTES,
  UPDATE_PUBLIC_KEY_PEM,
  readCappedText,
  sha512FileBase64,
  verifyDownloadedUpdate,
  type UpdateVerifyResult
} from "./updateSignature";

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

// İmzası doğrulanmış indirilen dosya ve doğrulama anındaki özeti. `installUpdate`
// yalnızca bu doluysa ve dosya hâlâ aynı özeti veriyorsa kuruyor.
let verifiedUpdate: { file: string; sha512: string } | null = null;
// Her yeni indirme/doğrulama bir öncekini geçersiz kılıyor: geç biten eski bir
// doğrulamanın sonucu yenisinin yerine yazılmasın.
let verifyGeneration = 0;

// İmza dosyası birkaç yüz bayt; yanıt vermeyen bir bağlantı doğrulamayı ve
// dolayısıyla "indirildi" durumunu sonsuza kadar askıda bırakmasın.
const SIGNATURE_FETCH_TIMEOUT_MS = 30_000;

function sendStatus(status: UpdateStatus): void {
  lastStatus = status;
  if (currentWindow && !currentWindow.isDestroyed()) {
    currentWindow.webContents.send("updates:status", status);
  }
}

export function getLastUpdateStatus(): UpdateStatus {
  return lastStatus;
}

// Electron'un `net.fetch`'i Chromium ağ yığınını (sistem vekil sunucusu dahil)
// kullanıyor ve GitHub'ın indirme adresinden depolama adresine giden
// yönlendirmeyi izliyor. 404 "imza yok" demek; diğer her hata "indirilemedi".
async function fetchSignatureText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIGNATURE_FETCH_TIMEOUT_MS);
  try {
    const response = await net.fetch(url, { signal: controller.signal, redirect: "follow" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await readCappedText(response, SIGNATURE_MAX_BYTES);
  } finally {
    clearTimeout(timer);
  }
}

function verifyFailureMessage(result: Extract<UpdateVerifyResult, { ok: false }>): string {
  switch (result.reason) {
    case "signature-missing":
      return mt("updater.signatureMissing");
    case "signature-unavailable":
      return mt("updater.signatureUnavailable", {
        detail: result.detail ? mt("common.detailSuffix", { tail: result.detail.slice(-200) }) : ""
      });
    default:
      return mt("updater.signatureInvalid");
  }
}

async function verifyAfterDownload(info: UpdateDownloadedEvent): Promise<void> {
  const generation = ++verifyGeneration;
  verifiedUpdate = null;
  let result: UpdateVerifyResult;
  try {
    result = await verifyDownloadedUpdate(
      { info, downloadedFile: info.downloadedFile },
      {
        publicKeyPem: UPDATE_PUBLIC_KEY_PEM,
        hashFile: sha512FileBase64,
        fetchSignature: fetchSignatureText,
        owner: REPO_OWNER,
        repo: REPO_NAME
      }
    );
  } catch {
    // Dosya okunamadı vb. — doğrulanamayan her şey reddediliyor.
    result = { ok: false, reason: "signature-invalid" };
  }
  if (generation !== verifyGeneration) return;
  if (!result.ok) {
    sendStatus({ phase: "error", message: verifyFailureMessage(result) });
    return;
  }
  verifiedUpdate = { file: info.downloadedFile, sha512: result.sha512 };
  sendStatus({ phase: "downloaded", version: info.version });
}

function ensureListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  autoUpdater.autoDownload = false;
  // Kapanışta kurulum electron-updater'ın kendi yolundan gidiyor ve bizim
  // imza doğrulamamızı hiç görmüyor: indirilmiş ama imzası tutmayan bir dosya
  // uygulama kapanırken sessizce kurulurdu. Kurulum yalnızca `installUpdate`
  // üzerinden, doğrulamadan sonra.
  autoUpdater.autoInstallOnAppQuit = false;
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
  // "downloaded" durumu renderer'da kendiliğinden kurulumu tetikliyor
  // (App.tsx), o yüzden imza doğrulanana kadar gönderilmiyor; bu arada
  // ilerleme %100'de kalıyor.
  autoUpdater.on("update-downloaded", (info) => {
    sendStatus({ phase: "downloading", percent: 100 });
    void verifyAfterDownload(info);
  });
  autoUpdater.on("error", (err) => {
    sendStatus({ phase: "error", message: err?.message ?? String(err) });
  });
}

export async function checkForUpdates(window: BrowserWindow): Promise<void> {
  if (!app.isPackaged) {
    sendStatus({ phase: "error", message: mt("updater.devModeOnly") });
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
  verifiedUpdate = null;
  verifyGeneration++;
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    sendStatus({ phase: "error", message: (err as Error).message });
  }
}

// Doğrulama ile kurulum arasında dosya değişmiş olabilir (aynı sürüm yeniden
// indirildi, biri üzerine yazdı); özet kurulumdan hemen önce bir kez daha
// alınıyor.
export async function installUpdate(): Promise<void> {
  const verified = verifiedUpdate;
  if (!verified) {
    sendStatus({ phase: "error", message: mt("updater.notVerified") });
    return;
  }
  let currentSha512: string | null;
  try {
    currentSha512 = await sha512FileBase64(verified.file);
  } catch {
    currentSha512 = null;
  }
  if (verifiedUpdate !== verified || currentSha512 !== verified.sha512) {
    verifiedUpdate = null;
    sendStatus({ phase: "error", message: mt("updater.notVerified") });
    return;
  }
  autoUpdater.quitAndInstall();
}
