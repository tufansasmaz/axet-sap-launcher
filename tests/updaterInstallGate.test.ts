// updater.ts: imzası doğrulanmamış bir güncelleme kurulmuyor.
//
// electron-updater ve Electron sahte; imza mantığı gerçek (updateSignature.ts),
// yalnızca gömülü genel anahtar testin geçici anahtarıyla değiştiriliyor.
// Sınanan sözleşme: "downloaded" durumu (renderer bunu görünce kendiliğinden
// kuruyor) ve `quitAndInstall` ancak imza tuttuktan sonra; kapanışta sessiz
// kurulum kapalı.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, sign } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const keys = await vi.hoisted(async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const pair = generateKeyPairSync("ed25519");
  return {
    privateKey: pair.privateKey,
    publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString()
  };
});

const fetchMock = vi.hoisted(() => ({ fn: null as null | ((url: string) => Promise<Response>) }));

vi.mock("electron", () => ({
  app: { isPackaged: true },
  BrowserWindow: class {},
  net: { fetch: (url: string) => fetchMock.fn!(url) }
}));

// Tek örnek: her testte updater modülü yeniden yükleniyor ama sahte
// autoUpdater aynı kalıyor, dinleyicileri ve sayaçları load() temizliyor.
const autoUpdater = await vi.hoisted(async () => {
  const { EventEmitter: Emitter } = await import("node:events");
  return Object.assign(new Emitter(), {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(async () => undefined),
    downloadUpdate: vi.fn(async () => undefined),
    quitAndInstall: vi.fn()
  });
});

vi.mock("electron-updater", () => ({ default: { autoUpdater } }));

vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string) => key
}));

vi.mock("../app-electron/main/updateSignature", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../app-electron/main/updateSignature")>()),
  UPDATE_PUBLIC_KEY_PEM: keys.publicKeyPem
}));

const VERSION = "1.7.1";
const FILE = "NTT-Studio-Setup-1.7.1.exe";

function signFor(sha: string): string {
  const manifest = `ntt-studio-update\n${VERSION}\n${FILE}\n${sha}`;
  return sign(null, Buffer.from(manifest, "utf8"), keys.privateKey).toString("base64");
}

async function load() {
  autoUpdater.removeAllListeners();
  autoUpdater.quitAndInstall.mockClear();
  autoUpdater.autoInstallOnAppQuit = true;
  vi.resetModules();
  const updater = await import("../app-electron/main/updater");
  const send = vi.fn();
  const window = { isDestroyed: () => false, webContents: { send } };
  await updater.checkForUpdates(window as never);
  const statuses = () => send.mock.calls.map((call) => call[1] as { phase: string; message?: string });
  return { updater, autoUpdater, statuses };
}

function downloaded(content = "indirilen kurulum") {
  const dir = mkdtempSync(path.join(tmpdir(), "ntt-updater-gate-"));
  const file = path.join(dir, "installer.exe");
  writeFileSync(file, content);
  const sha = createHash("sha512").update(readFileSync(file)).digest("base64");
  return { file, sha, info: { version: VERSION, files: [{ url: FILE, sha512: sha }], downloadedFile: file } };
}

async function settle(statuses: () => { phase: string }[]) {
  await vi.waitFor(() => {
    const last = statuses().at(-1);
    expect(last && (last.phase === "downloaded" || last.phase === "error")).toBe(true);
  });
}

beforeEach(() => {
  fetchMock.fn = null;
});

describe("updater kurulum kapisi", () => {
  it("kapanista sessiz kurulum kapali", async () => {
    const { autoUpdater } = await load();
    expect(autoUpdater.autoInstallOnAppQuit).toBe(false);
  });

  it("imza tutarsa 'downloaded' gidiyor ve kurulum calisiyor", async () => {
    const { updater, autoUpdater, statuses } = await load();
    const update = downloaded();
    const requested: string[] = [];
    fetchMock.fn = async (url) => {
      requested.push(url);
      return new Response(signFor(update.sha));
    };
    autoUpdater.emit("update-downloaded", update.info);
    await settle(statuses);
    expect(statuses().at(-1)).toEqual({ phase: "downloaded", version: VERSION });
    expect(requested).toEqual([
      `https://github.com/tufansasmaz/axet-sap-launcher/releases/download/v${VERSION}/${FILE}.sig`
    ]);
    await updater.installUpdate();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it("imza dosyasi yoksa (404) hata gidiyor, kurulum calismiyor", async () => {
    const { updater, autoUpdater, statuses } = await load();
    const update = downloaded();
    fetchMock.fn = async () => new Response("Not Found", { status: 404 });
    autoUpdater.emit("update-downloaded", update.info);
    await settle(statuses);
    expect(statuses().at(-1)).toEqual({ phase: "error", message: "updater.signatureMissing" });
    expect(statuses().some((s) => s.phase === "downloaded")).toBe(false);
    await updater.installUpdate();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it("imza tutmazsa hata gidiyor, kurulum calismiyor", async () => {
    const { updater, autoUpdater, statuses } = await load();
    const update = downloaded();
    fetchMock.fn = async () => new Response(signFor(createHash("sha512").update("baska").digest("base64")));
    autoUpdater.emit("update-downloaded", update.info);
    await settle(statuses);
    expect(statuses().at(-1)).toEqual({ phase: "error", message: "updater.signatureInvalid" });
    await updater.installUpdate();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it("dogrulamadan sonra dosya degisirse kurulum calismiyor", async () => {
    const { updater, autoUpdater, statuses } = await load();
    const update = downloaded();
    fetchMock.fn = async () => new Response(signFor(update.sha));
    autoUpdater.emit("update-downloaded", update.info);
    await settle(statuses);
    expect(statuses().at(-1)?.phase).toBe("downloaded");
    writeFileSync(update.file, "sonradan degistirilmis");
    await updater.installUpdate();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    expect(statuses().at(-1)).toEqual({ phase: "error", message: "updater.notVerified" });
  });

  it("hic indirme/dogrulama olmadan installUpdate hicbir sey kurmuyor", async () => {
    const { updater, autoUpdater } = await load();
    await updater.installUpdate();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });
});
