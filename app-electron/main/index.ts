import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from "electron";
import path from "node:path";
import { promises as fs } from "node:fs";
import { request as httpRequest } from "node:http";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { loadLandscape, getServiceCredentials, getServiceSapLogonNote } from "./sapLandscape";
import { checkConnectivity } from "./connectivity";
import { connectToSystem, computeProjectDir } from "./launcher";
import { loadConfig, saveConfig, saveLastCredential, saveTrustedCertificates, pushConnectionHistory, saveSystemTier, saveSystemComment } from "./store";
import { decryptSecret } from "./secureStorage";
import { loadManualSystems, addManualSystem, removeManualSystem, updateManualSystem, exportManualSystemsToFile, importManualSystemsFromFile } from "./manualSystems";
import { mergeManualSystems } from "./manualMerge";
import { createTerminal, writeTerminal, resizeTerminal, disposeTerminal, disposeAllTerminals, getTerminalBuffer } from "./terminalManager";
import { stopAllRfcBridges } from "./rfcBridgeManager";
import { stopAllReadonlyServers } from "./adtReadonlyServerManager";
import { isPathAllowed, listDir, readTextFile, readDocxFile, readImageDataUrl, openInExplorer, openExternal, importFiles } from "./fsExplorer";
import { checkForUpdates, downloadUpdate, installUpdate, getLastUpdateStatus } from "./updater";
import { openInSapLogon } from "./sapLogon";
import { listAxetModels, getAxetModelConfig, setAxetModel } from "./axetModels";
import { sendChatMessage, cancelChatMessage, cancelAllChatMessages } from "./axetChat";
import { readAttachmentPreview, saveClipboardAttachment } from "./chatAttachments";
import { loadChatSessions, saveChatSessions } from "./chatStore";
import { isDictationAvailable, transcribeAudio } from "./dictation";
import { runFlowsAgentStep } from "./axetFlowsAgent";
import { discoverAxetFlowsLiveUrl } from "./axetFlowsLiveDiscovery";
import { saveFlowToLiveHost } from "./axetFlowsLiveSave";
import { getEmbeddedGuiScriptRuntime } from "./embeddedRuntime";
import { startGuiScriptBridge, stopGuiScriptBridge, isGuiScriptBridgeRunning, getGuiScriptBridgePort } from "./sapGuiScriptManager";
import {
  guiScriptListConnections,
  guiScriptListSessions,
  guiScriptGetNode,
  guiScriptPerformAction,
  guiScriptPreflight,
  guiScriptGetScreen,
  guiScriptScreenshot
} from "./sapGuiScriptClient";
import { runSapGuiAgentStep, cancelSapGuiAgentStep, cancelAllSapGuiAgentSteps } from "./sapGuiScriptAgent";
import { FlowRuntime, validateFlow as validateFlowArray } from "./flowRuntime.js";
import { testConnector, cancelConnectorTest, cancelAllConnectorTests, mcpUrlFor } from "./agenticConnectors";
import type { AddManualSystemInput, AppConfig, ConnectRequest, SapService, CredentialDefaults, SystemCommentDefaults, SystemTier, TerminalMode, AxetModelKind, AxetModelEntry, AxetChatMessage, ChatSessionsState, FlowJsonValue, FlowTestRequestPayload, GuiScriptActionPayload, GuiScriptScreenshotMethod, ConnectorProvider } from "../shared/types";

const DEFAULT_GUI_SCRIPT_BRIDGE_PORT = 8790;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const APP_USER_MODEL_ID = "com.nttdata.axet.saplauncher";

// Genel kullanım için: aynı anda iki kopya açılıp landscape/manuel sistem
// dosyalarına çakışan yazma yapmasın — ikinci başlatma denemesi mevcut
// pencereyi öne getirir, yeni bir process açmaz.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

// Beklenmeyen hatalar sessizce process'i çökertip kullanıcıyı "uygulama
// birden kapandı" durumunda bırakmasın — en azından bir hata penceresi
// göster, log'a yaz.
process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
  dialog.showErrorBox("aXet SAP Launcher — Beklenmeyen Hata", err.stack ?? String(err));
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection", reason);
});

app.disableHardwareAcceleration();

// KÖK SEBEP ("axet.flows Canlı" ekranındaki gömülü <iframe> hiç yüklenmiyor,
// sonsuza kadar "Bağlanılıyor..." kalıyor sorunu — canlı Chrome DevTools
// Protocol izlemesiyle KANITLANDI): iframe'in üst çerçevesi `file://`
// (paketlenmiş build'de `dist/index.html`), iframe'in içeriği ise
// `http://localhost:PORT` — bu, Chromium'un Site Isolation mimarisinde
// FARKLI bir site sayıldığı için ayrı bir render sürecine (OOPIF) geçiş
// gerektiriyor. Sunucudan tam olarak doğru bir 200 yanıtı (doğru
// Content-Type ile) gelmesine RAĞMEN, bu süreç geçişi tamamlanamıyor ve
// Chromium isteği `net::ERR_ABORTED` (canceled:true) ile sessizce iptal
// ediyor — iframe'in `onLoad`'u HİÇBİR ZAMAN tetiklenmiyor (CDP Network
// izlemesinde HER denemede birebir aynı şekilde tekrarlandı, rastgele bir
// zamanlama sorunu DEĞİL). Bu, Electron'un bilinen bir davranışı: Site
// Isolation'ın OOPIF ile çapraz-origin iframe navigasyonu, `--disable-site-
// isolation-trials` anahtarıyla devre dışı bırakılmadığı sürece paketlenmiş
// (sandboxed olmayan renderer'lı) Electron uygulamalarında bu şekilde
// sessizce başarısız olabiliyor. Bu anahtar `app.whenReady()`'DEN ÖNCE
// eklenmeli.
app.commandLine.appendSwitch("disable-site-isolation-trials");
app.setAppUserModelId(APP_USER_MODEL_ID);

// NOT: Menu.setApplicationMenu(null) YAPMA — Electron'da Ctrl+C/Ctrl+V/Ctrl+X/Ctrl+A gibi
// standart klavye kısayolları, Chromium tarafında bir uygulama menüsündeki Edit rolleri
// (cut/copy/paste/selectAll) üzerinden accelerator olarak kayıt edilir. Menü null olunca
// bu kısayollar (özellikle Windows/Linux'ta) input alanlarında tamamen çalışmaz olur —
// kullanıcı adı/şifre kutularına yapıştırma yapılamamasının sebebi budur.
// frame:false olduğu için bu menü zaten görsel olarak hiçbir yerde render edilmez,
// sadece klavye kısayollarını canlı tutmak için var.
//
// "paste"/"pasteAndMatchStyle" rollerinde `registerAccelerator: false` AÇIKÇA
// belirtildi (Electron zaten bu rollerde varsayılan olarak böyle davranıyor —
// burada sadece niyeti dokümante ediyoruz). Chromium, native klavye tuşu ile
// tetiklenen Ctrl+V'yi (kaynak: kMenuOrKeyBinding) HER ZAMAN izin verir — bu
// menü accelerator'ından tamamen bağımsızdır, dolayısıyla gömülü terminaldeki
// (xterm.js) Ctrl+V sorunu bu menüden KAYNAKLANMIYORDU. Gerçek kök sebep
// EmbeddedTerminal.tsx'teki keydown handler'ın `preventDefault()` çağırıp
// tarayıcının native paste komutunu (ve dolayısıyla gerçek "paste" DOM
// event'ini) hiç tetiklenmeden iptal etmesiydi — bkz. o dosyadaki not.
Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste", registerAccelerator: false },
        { role: "pasteAndMatchStyle", registerAccelerator: false },
        { role: "delete" },
        { role: "selectAll" }
      ]
    }
  ])
);

let mainWindow: BrowserWindow | null = null;

// axet.flows'un mini deploy/debug motoru (bkz. flowRuntime.js) — tek bir
// örnek, uygulama ömrü boyunca yaşar (SAP Launcher'ın terminal/RFC-bridge
// süreçleriyle aynı desende — bkz. "before-quit"/"window-all-closed"
// altındaki `flowRuntime.stop()`). Event'ler (`onDebug`/`onStatus`/`onLog`/
// `onTrace`) doğrudan aktif pencereye push ediliyor; `onValidate` kasıtlı
// olarak bağlanmadı — `deploy()` invoke çağrısı zaten `{blocked, issues}`
// döndürüyor, ayrı bir push event'ine gerek yok (axetflow orijinalindeki
// gibi).
const flowRuntime = new FlowRuntime({
  onDebug: (entry: FlowJsonValue) => mainWindow?.webContents.send("flows:runtime:debug", entry),
  onStatus: (status: FlowJsonValue) => mainWindow?.webContents.send("flows:runtime:status", status),
  onLog: (entry: FlowJsonValue) => mainWindow?.webContents.send("flows:runtime:log", { ...entry, timestamp: Date.now() }),
  onTrace: (entry: FlowJsonValue) => mainWindow?.webContents.send("flows:runtime:trace", entry)
});

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

function resolveIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(app.getAppPath(), "build", "icon.png");
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#0b0d12",
    frame: false,
    show: false,
    icon: resolveIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      // Electron 32.3'ten itibaren document.execCommand("paste") (Ctrl+V'nin
      // ve sağ-tık "Yapıştır"ın dayandığı senkron pano okuma yolu) varsayılan
      // olarak DEVRE DIŞI (Chromium'un kendi güvenlik varsayılanıyla
      // hizalama) — Menu'deki role:"paste" accelerator'ı doğru kurulu olsa
      // bile bu olmadan hiçbir input'a (kullanıcı adı/şifre dahil) yapıştırma
      // çalışmaz. `deprecated-sync-clipboard-read` izniyle birlikte bu satır
      // eski davranışı geri getiriyor (bkz. session.setPermissionCheckHandler
      // aşağıda — son kullanıcı etkileşimi varsa otomatik izin veriliyor,
      // ama emin olmak için handler'ı da açıkça true döndürüyoruz).
      enableDeprecatedPaste: true
    }
  });

  // İzin listesi KAPALI UÇLU: burada adı geçmeyen her izin reddediliyor.
  // Yeni bir tarayıcı API'si (mikrofon, kamera, konum…) eklenirken bu listeye
  // de eklenmezse, çağrı renderer'da "Permission denied" ile düşer ve hata
  // Windows'un gizlilik ayarlarını işaret ediyormuş gibi okunur — mikrofonda
  // birebir bu yaşandı (2026-09-03): Windows'un üç ayarı da "Allow"du,
  // engelleyen BU satırlardı.
  //
  // - "deprecated-sync-clipboard-read" / "clipboard-read": gömülü terminaldeki
  //   (xterm.js) Ctrl+V için `navigator.clipboard.readText()` — xterm.js
  //   Ctrl+V'yi kendi terminal semantiğinde (readline "quoted-insert") ele
  //   aldığından tarayıcının native paste akışına hiç girmiyor, bu yüzden
  //   `EmbeddedTerminal.tsx` sadece kendi Terminal örneğine özel
  //   `attachCustomKeyEventHandler` ile bu API'yi çağırıyor (bkz. o dosyadaki
  //   not — global bir keydown/paste müdahalesi DEĞİL, sadece bu izin).
  // - "media": sohbet kutusundaki mikrofon (bkz. main/dictation.ts). Yalnızca
  //   kullanıcı mikrofon düğmesine bastığında isteniyor; kayıt bittiğinde
  //   `DictationRecorder.cleanup()` track'leri durduruyor.
  const ALLOWED_PERMISSIONS = new Set(["deprecated-sync-clipboard-read", "clipboard-read", "media"]);

  win.webContents.session.setPermissionCheckHandler((_webContents, permission) =>
    ALLOWED_PERMISSIONS.has(permission)
  );

  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });

  mainWindow = win;

  win.once("ready-to-show", () => {
    win.show();
    // Açılıştan biraz sonra sessizce güncelleme kontrolü — pencere
    // gösterilir gösterilmez değil, kullanıcı önce landscape'i görsün
    // diye 3 saniyelik bir gecikme var. Token yoksa/otomatik kontrol
    // kapalıysa `checkForUpdates` sessizce erken çıkar (Ayarlar'da
    // manuel kontrol hâlâ mümkün).
    setTimeout(() => {
      const config = loadConfig();
      if (config.autoCheckUpdates) {
        checkForUpdates(win).catch(() => {});
      }
    }, 3000);
  });

  win.on("maximize", () => win.webContents.send("window:state-changed", true));
  win.on("unmaximize", () => win.webContents.send("window:state-changed", false));
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  if (isDev) {
    win.webContents.on("console-message", (_event, _level, message) => {
      console.log("[renderer]", message);
    });
  }

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  if (isDev) {
    win.webContents.on("did-fail-load", (_e, code, desc, url) => {
      console.error("did-fail-load", code, desc, url);
    });
  }
}

// Şifre önceliği: bu sistemde daha önce BAŞARIYLA doğrulanmış bir şifre
// varsa (last.password) o kullanılır — kanıtlanmış/güncel. Yoksa SAP
// Logon'un Memo alanındaki şifreye (memo.password) düşülür (kullanıcının
// SAP Logon'a kendi elle yazdığı, doğrulanmamış bir değer olabilir).
// Hem "axet.code'da Aç" kimlik formu hem de "SAP Logon'da Aç" (client'ı
// login ekranı başlığına önceden yerleştirmek için) aynı mantığı
// paylaşıyor — iki yerde ayrı ayrı yaşamasın diye ortak fonksiyon.
async function resolveCredentialDefaults(config: AppConfig, serviceUuid: string): Promise<CredentialDefaults> {
  const memo = await getServiceCredentials(serviceUuid, config.landscapePathOverride);
  const last = config.lastCredentials[serviceUuid];
  // `last.password` diskte şifreli (`enc:v1:...`) tutuluyor (bkz.
  // store.ts saveLastCredential/secureStorage.ts) — burada, kullanıcıya
  // formu doldururken göstermeden ÖNCE çözülüyor. Eski/şifrelemeden ÖNCE
  // kaydedilmiş düz metin kayıtlar için `decryptSecret` olduğu gibi geri
  // döner (bkz. secureStorage.ts'teki geriye uyumluluk notu).
  return {
    username: last?.username ?? memo.username ?? "",
    password: decryptSecret(last?.password ?? "") || memo.password || "",
    client: last?.client ?? ""
  };
}

function registerIpc(): void {
  ipcMain.handle("landscape:get", async () => {
    const config = loadConfig();
    const landscape = await loadLandscape(config.landscapePathOverride);
    const manualSystems = loadManualSystems();
    return mergeManualSystems(landscape, manualSystems);
  });

  ipcMain.handle("manualSystems:add", (_event, input: AddManualSystemInput) => {
    return addManualSystem(input);
  });

  ipcMain.handle("manualSystems:remove", (_event, id: string) => {
    return removeManualSystem(id);
  });

  ipcMain.handle("manualSystems:update", (_event, id: string, input: AddManualSystemInput) => {
    return updateManualSystem(id, input);
  });

  ipcMain.handle("manualSystems:exportToFile", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win ?? (undefined as any), {
      title: "Manuel Sistemleri Dışa Aktar",
      defaultPath: "axet-manual-systems.json",
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }
    try {
      exportManualSystemsToFile(result.filePath);
      return { ok: true, filePath: result.filePath };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("manualSystems:importFromFile", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? (undefined as any), {
      title: "Manuel Sistemleri İçe Aktar",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true };
    }
    try {
      const summary = importManualSystemsFromFile(result.filePaths[0]);
      return { ok: true, ...summary };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("systemTiers:set", (_event, serviceUuid: string, tier: SystemTier | null) => {
    return saveSystemTier(serviceUuid, tier);
  });

  ipcMain.handle("systemComments:set", (_event, serviceUuid: string, comment: string) => {
    return saveSystemComment(serviceUuid, comment);
  });

  ipcMain.handle("systemComment:getDefault", async (_event, serviceUuid: string): Promise<SystemCommentDefaults> => {
    const config = loadConfig();
    const saved = config.systemComments[serviceUuid];
    if (saved) return { comment: saved, source: "saved" };
    // Henüz uygulama içinde bir yorum kaydedilmemişse, SAP Logon'un kendi
    // Memo alanındaki 3. satırdan itibaren varsa (kullanıcının SAP Logon'a
    // kendi elle yazdığı not) burada gösterilir — "sistem bazlı ordaki
    // veriler varsa getirsin" isteğinin karşılığı.
    const sapLogonNote = await getServiceSapLogonNote(serviceUuid, config.landscapePathOverride);
    if (sapLogonNote) return { comment: sapLogonNote, source: "sapLogon" };
    return { comment: "", source: "none" };
  });

  ipcMain.handle("connectivity:check", (_event, service: SapService) => {
    return checkConnectivity(service);
  });

  ipcMain.handle("credentials:getDefaults", async (_event, serviceUuid: string): Promise<CredentialDefaults> => {
    const config = loadConfig();
    return resolveCredentialDefaults(config, serviceUuid);
  });

  ipcMain.handle("system:connect", async (_event, req: ConnectRequest) => {
    const config = loadConfig();
    const result = await connectToSystem(config, req);
    if (result.trustedCertificates) {
      saveTrustedCertificates(result.trustedCertificates);
    }
    if (result.ok) {
      // Şifre de kullanıcı adı/client gibi otomatik doldurulsun diye
      // saklanıyor — bu, .conn_adt'ın kendisinin de aynı sistemde zaten düz
      // metin şifre tuttuğu bilinen/kabul edilmiş bir tasarım kararıyla
      // (bkz. PROJE-BILGI.md) aynı çizgide, ek bir güvenlik borcu değil.
      saveLastCredential(req.service.uuid, {
        username: req.credentials.username,
        password: req.credentials.password,
        client: result.effectiveClient ?? req.credentials.client
      });
      pushConnectionHistory(req.service.uuid);
    }
    return result;
  });

  ipcMain.handle("sapLogon:open", async (_event, service: SapService) => {
    try {
      const config = loadConfig();
      // Eclipse ADT'nin "Open SAP GUI"sine benzer bir deneyim: SAP Logon'a
      // kayıt olmadan doğru host/port/router'a bağlanıp gerçek klasik/büyük
      // SAP GUI logon ekranını açar (bkz. sapLogon.ts'teki canlı doğrulama
      // notu). Kullanıcı adı/şifre SAP GUI'nin kendi native davranışı
      // yüzünden otomatik dolmuyor (Eclipse'in kendisinde de aynı).
      return openInSapLogon(service, config.sapShcutPathOverride);
    } catch (err) {
      return { ok: false, reason: "spawnError", detail: (err as Error).message };
    }
  });

  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (_event, partial) => saveConfig(partial));

  ipcMain.handle("dialog:pickFolder", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined as any, {
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("window:toggleMaximize", () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  });

  ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });

  ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);

  ipcMain.handle(
    "terminal:create",
    (_event, cwd: string, cols: number, rows: number, shell: TerminalMode, initialCommand?: string) => {
      if (!mainWindow) throw new Error("Pencere hazır değil");
      const id = randomUUID();
      createTerminal(mainWindow, id, cwd, cols, rows, shell, initialCommand);
      return id;
    }
  );

  ipcMain.on("terminal:write", (_event, id: string, data: string) => {
    writeTerminal(id, data);
  });

  ipcMain.on("terminal:resize", (_event, id: string, cols: number, rows: number) => {
    resizeTerminal(id, cols, rows);
  });

  ipcMain.handle("terminal:dispose", (_event, id: string) => {
    disposeTerminal(id);
  });

  ipcMain.handle("terminal:getBuffer", (_event, id: string) => {
    return getTerminalBuffer(id);
  });

  ipcMain.handle("project:resolveDir", (_event, customerPath: string[], service: SapService) => {
    const config = loadConfig();
    return computeProjectDir(config, customerPath, service);
  });

  ipcMain.handle("fs:listDir", async (_event, dirPath: string) => {
    const config = loadConfig();
    if (!isPathAllowed(config, dirPath)) {
      return { ok: false, error: "Bu klasöre erişim izni yok." };
    }
    return listDir(dirPath);
  });

  ipcMain.handle("fs:readTextFile", async (_event, filePath: string) => {
    const config = loadConfig();
    if (!isPathAllowed(config, filePath)) {
      return { ok: false, error: "Bu dosyaya erişim izni yok." };
    }
    return readTextFile(filePath);
  });

  ipcMain.handle("fs:readDocx", async (_event, filePath: string) => {
    const config = loadConfig();
    if (!isPathAllowed(config, filePath)) {
      return { ok: false, error: "Bu dosyaya erişim izni yok." };
    }
    return readDocxFile(filePath);
  });

  ipcMain.handle("fs:readImageDataUrl", async (_event, filePath: string) => {
    const config = loadConfig();
    if (!isPathAllowed(config, filePath)) {
      return { ok: false, error: "Bu dosyaya erişim izni yok." };
    }
    return readImageDataUrl(filePath);
  });

  ipcMain.handle("fs:openInExplorer", async (_event, filePath: string) => {
    const config = loadConfig();
    if (!isPathAllowed(config, filePath)) return;
    return openInExplorer(filePath);
  });

  ipcMain.handle("fs:openExternal", async (_event, filePath: string) => {
    const config = loadConfig();
    if (!isPathAllowed(config, filePath)) return;
    return openExternal(filePath);
  });

  // axet.flows (Live) — kullanıcının gösterdiği harici bir Node-RED tabanlı
  // Designer host'unu (örn. http://localhost:49275) sistem tarayıcısında
  // açmak için. `fs:openExternal` (yukarıda) yalnızca whitelisted dosya
  // yollarını açar (isPathAllowed) — bu KASITLI OLARAK farklı bir kanal:
  // sadece http(s):// URL'lerine izin verir, dosya sistemi izin listesine
  // hiç bakmaz (URL bir dosya yolu değil).
  ipcMain.handle("shell:openUrl", async (_event, url: string) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return { ok: false, error: "Sadece http:// veya https:// URL'lerine izin verilir." };
    }
    await shell.openExternal(url);
    return { ok: true };
  });

  // Kullanıcının bu makinede ayrıca çalıştırdığı gerçek aXet.flows masaüstü
  // uygulamasının (rastgele, her başlatmada değişen) portunu otomatik bulur
  // — bkz. axetFlowsLiveDiscovery.ts'teki kök sebep notu.
  ipcMain.handle("axetFlowsLive:discoverUrl", async () => {
    return discoverAxetFlowsLiveUrl();
  });

  // Bizim gomulu editorde hazirlanan bir flow'u, ayni makinede calisan
  // GERCEK aXet.flows (Canlı) host'unun admin API'sine kaydeder — bkz.
  // axetFlowsLiveSave.ts'teki kok sebep notu.
  ipcMain.handle("axetFlowsLive:saveFlow", async (_event, flowArray: unknown[]) => {
    return saveFlowToLiveHost(flowArray);
  });

  ipcMain.handle("fs:importFiles", async (_event, destDir: string, sourcePaths: string[]) => {
    const config = loadConfig();
    if (!isPathAllowed(config, destDir)) {
      return { ok: false, error: "Bu klasöre erişim izni yok." };
    }
    return importFiles(destDir, sourcePaths);
  });

  ipcMain.handle("dialog:pickFiles", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? (undefined as any), {
      properties: ["openFile", "multiSelections"]
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return result.filePaths;
  });

  ipcMain.handle("app:getVersion", () => app.getVersion());

  ipcMain.handle("updates:check", async () => {
    if (!mainWindow) return;
    await checkForUpdates(mainWindow);
  });

  ipcMain.handle("updates:download", async () => {
    await downloadUpdate();
  });

  ipcMain.handle("updates:install", () => {
    installUpdate();
  });

  ipcMain.handle("updates:getLastStatus", () => getLastUpdateStatus());

  ipcMain.handle("axetModels:list", () => listAxetModels());
  ipcMain.handle("axetModels:getCurrent", () => getAxetModelConfig());
  ipcMain.handle("axetModels:setCurrent", (_event, kind: AxetModelKind, entry: AxetModelEntry) => setAxetModel(kind, entry));

  // Cevap ÜRETİLDİKÇE `axetChat:chunk` ile pencereye push ediliyor (flows
  // runtime event'leriyle aynı desen). invoke cevabı yine de tam metni
  // taşıyor — renderer akışı onunla sonlandırıyor, yani bir chunk kaybolsa
  // bile son metin doğru olur.
  ipcMain.handle(
    "axetChat:send",
    (_event, requestId: string, cwd: string, model: AxetModelEntry | null, history: AxetChatMessage[], message: string) =>
      sendChatMessage(requestId, cwd, model, history, message, (text) =>
        mainWindow?.webContents.send("axetChat:chunk", requestId, text)
      )
  );
  ipcMain.handle("axetChat:cancel", (_event, requestId: string) => {
    cancelChatMessage(requestId);
  });
  ipcMain.handle("chatAttachments:save", (_event, fileName: string, base64Data: string) =>
    saveClipboardAttachment(fileName, base64Data)
  );
  ipcMain.handle("chatAttachments:preview", (_event, filePath: string) => readAttachmentPreview(filePath));

  // Composer'daki mikrofon. Ses kaydı renderer'da yapılıyor, tanıma burada
  // GÖMÜLÜ whisper.cpp ile — ses makineden hiç çıkmıyor, API anahtarı yok
  // (gerekçe ve elenen yollar: dictation.ts başındaki not).
  ipcMain.handle("dictation:available", () => isDictationAvailable());
  ipcMain.handle("dictation:transcribe", (_event, base64Wav: string, language: string) =>
    transcribeAudio(base64Wav, language)
  );

  // Sohbet geçmişi kalıcılığı (Faz 2). Kaydetme senkron ve hızlı (tek JSON
  // dosyası + rename); renderer zaten debounce ediyor, burada ayrıca kuyruk
  // tutmaya gerek yok.
  ipcMain.handle("chatSessions:load", () => loadChatSessions());
  ipcMain.handle("chatSessions:save", (_event, state: ChatSessionsState) => saveChatSessions(state));

  // ---------------------------- Uygulama Bağlantıları (Outlook/SharePoint connector'ları) ----------------------------
  // Not: burada `mainWindow`'a push edilen bir device-code event'i YOK -
  // önceki turdaki @azure/msal-node akışı tamamen kaldırıldı (bkz.
  // agenticConnectors.ts'in başındaki not). Test isteği tek bir `axet-code
  // run -q` çağrısı, sonucu doğrudan invoke cevabıyla dönüyor.
  ipcMain.handle("connectors:test", async (_event, requestId: string, provider: ConnectorProvider) => {
    const config = loadConfig();
    return testConnector(requestId, provider, config.axetWorkspaceDir);
  });
  ipcMain.handle("connectors:cancelTest", (_event, requestId: string) => {
    cancelConnectorTest(requestId);
    return { ok: true };
  });
  ipcMain.handle("connectors:getMcpUrl", (_event, provider: ConnectorProvider) => mcpUrlFor(provider));

  // ---------------------------- axet.flows ----------------------------
  ipcMain.handle("flows:agentStep", async (_event, prompt: string, model: string | null) => {
    try {
      const text = await runFlowsAgentStep(prompt, model);
      return { ok: true, text };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("flows:runtime:deploy", async (_event, flowArray: FlowJsonValue[], mode?: string) => {
    try {
      const info = await flowRuntime.deploy(flowArray || [], mode || "full");
      return { ok: !info.blocked, ...info };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("flows:runtime:restart", async () => {
    try {
      const info: FlowJsonValue = await flowRuntime.restart();
      return { ok: !info.blocked && !info.error, ...info };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("flows:runtime:validate", (_event, flowArray: FlowJsonValue[]) => {
    try {
      return { ok: true, ...validateFlowArray(flowArray || []) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("flows:runtime:stop", async () => {
    await flowRuntime.stop();
    return { ok: true };
  });

  ipcMain.handle("flows:runtime:status", () => flowRuntime.getInfo());

  ipcMain.handle("flows:runtime:triggerInject", (_event, nodeId: string) => {
    try {
      const msgId = flowRuntime.triggerInject(nodeId);
      return { ok: true, msgId };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("flows:runtime:testRequest", async (_event, payload: FlowTestRequestPayload) => {
    if (!flowRuntime.isRunning() || !flowRuntime.port) {
      return { ok: false, error: "Flow deploy edilmemiş (çalışan bir HTTP sunucusu yok)." };
    }
    return new Promise((resolve) => {
      const bodyStr =
        payload.body !== undefined && payload.body !== null
          ? typeof payload.body === "string"
            ? payload.body
            : JSON.stringify(payload.body)
          : undefined;
      const reqHeaders: Record<string, string> = { ...(payload.headers || {}) };
      if (bodyStr && !reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
        reqHeaders["Content-Type"] = "application/json";
      }
      if (bodyStr) reqHeaders["Content-Length"] = String(Buffer.byteLength(bodyStr));

      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port: flowRuntime.port!,
          path: payload.path || "/",
          method: (payload.method || "GET").toUpperCase(),
          headers: reqHeaders,
          timeout: 17000
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => resolve({ ok: true, statusCode: res.statusCode, headers: res.headers, body: data }));
        }
      );
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "İstek zaman aşımına uğradı." });
      });
      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  });

  ipcMain.handle("flows:saveJson", async (_event, jsonText: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win ?? (undefined as any), {
      title: "aXet.flows JSON olarak kaydet",
      defaultPath: "flow.json",
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, jsonText, "utf-8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("flows:openJson", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? (undefined as any), {
      title: "aXet.flows JSON dosyası aç",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const content = await fs.readFile(result.filePaths[0], "utf-8");
    return { canceled: false, filePath: result.filePaths[0], content };
  });

  ipcMain.handle("flows:exportDebugLog", async (_event, jsonText: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win ?? (undefined as any), {
      title: "Debug kaydını JSON olarak dışa aktar",
      defaultPath: `debug-log-${Date.now()}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, jsonText, "utf-8");
    return { canceled: false, filePath: result.filePath };
  });

  // ---------------------------- SAP GUI Scripting ----------------------------
  // Bağımsız Activity (bkz. PROJE-BILGI.md "SAP GUI Scripting Ekranı") —
  // `connectToSystem()`/.conn_adt akışına HİÇ bağlı değil, kullanıcının o an
  // açık olan bir SAP Logon/SAP GUI penceresine `sap_gui_scripting_bridge.py`
  // (gömülü Python+pywin32, bkz. embeddedRuntime.ts/sapGuiScriptManager.ts)
  // üzerinden bağlanır. Bridge tek bir global process — proje/bağlantı
  // kavramına ihtiyacı yok.
  ipcMain.handle("sapGuiScript:start", async () => {
    const runtime = getEmbeddedGuiScriptRuntime();
    if (!runtime) {
      return {
        ok: false,
        running: false,
        port: null,
        message: "Gömülü SAP GUI Scripting runtime'ı (resources/guiscript-runtime) bulunamadı — uygulama kurulumu eksik/bozuk olabilir."
      };
    }
    const result = await startGuiScriptBridge({
      pythonPath: runtime.pythonPath,
      scriptPath: runtime.bridgeScriptPath,
      port: DEFAULT_GUI_SCRIPT_BRIDGE_PORT
    });
    return { ok: result.ok, running: result.ok, port: result.ok ? result.port : null, message: result.message };
  });

  ipcMain.handle("sapGuiScript:stop", async () => {
    stopGuiScriptBridge();
    return { ok: true };
  });

  ipcMain.handle("sapGuiScript:status", async () => {
    return { running: isGuiScriptBridgeRunning(), port: getGuiScriptBridgePort(), external: false };
  });

  // Teşhis — köprü ayaktaysa SAP GUI'nin gerçek durumunu ÖLÇER (Win32
  // pencere sayısı vs. scripting oturum sayısı). Ekran, "scripting kapalı"
  // ile "SAP açık değil" ayrımını buradan yapıyor.
  ipcMain.handle("sapGuiScript:preflight", async () => {
    const port = getGuiScriptBridgePort();
    if (!port) return { ok: false, error: "Bridge çalışmıyor — önce başlat." };
    return guiScriptPreflight(port);
  });

  ipcMain.handle("sapGuiScript:getScreen", async (_event, connIdx: number, sessIdx: number) => {
    const port = getGuiScriptBridgePort();
    if (!port) return { ok: false, error: "Bridge çalışmıyor — önce başlat." };
    return guiScriptGetScreen(port, connIdx, sessIdx);
  });

  ipcMain.handle("sapGuiScript:screenshot", async (_event, connIdx: number | null, sessIdx: number | null, method: GuiScriptScreenshotMethod) => {
    const port = getGuiScriptBridgePort();
    if (!port) return { ok: false, error: "Bridge çalışmıyor — önce başlat." };
    return guiScriptScreenshot(port, connIdx, sessIdx, method);
  });

  ipcMain.handle("sapGuiScript:listConnections", async () => {
    const port = getGuiScriptBridgePort();
    if (!port) return { ok: false, error: "Bridge çalışmıyor — önce başlat." };
    return guiScriptListConnections(port);
  });

  ipcMain.handle("sapGuiScript:listSessions", async (_event, connIdx: number) => {
    const port = getGuiScriptBridgePort();
    if (!port) return { ok: false, error: "Bridge çalışmıyor — önce başlat." };
    return guiScriptListSessions(port, connIdx);
  });

  ipcMain.handle("sapGuiScript:getNode", async (
    _event,
    connIdx: number,
    sessIdx: number,
    elementId: string | null,
    window?: { rows?: number; rowOffset?: number }
  ) => {
    const port = getGuiScriptBridgePort();
    if (!port) return { ok: false, error: "Bridge çalışmıyor — önce başlat." };
    return guiScriptGetNode(port, connIdx, sessIdx, elementId, window);
  });

  ipcMain.handle("sapGuiScript:performAction", async (_event, connIdx: number, sessIdx: number, payload: GuiScriptActionPayload) => {
    const port = getGuiScriptBridgePort();
    if (!port) return { ok: false, error: "Bridge çalışmıyor — önce başlat." };
    return guiScriptPerformAction(port, connIdx, sessIdx, payload);
  });

  // Faz 2 — Kayıt + Tekrar Oynatma: script'i JSON olarak diske kaydet/aç.
  // `flows:saveJson`/`flows:openJson` ile BİREBİR AYNI dialog-tabanlı desen
  // (bkz. yukarıdaki handler'lar) — sadece dosya adı/başlık metni farklı.
  // Tekrar oynatma (adımların sırayla `performAction`'a gönderilmesi) main
  // process'te değil, renderer'da (`SapGuiScriptingHome.tsx`) yapılıyor —
  // bu, her adımın sonucunu (başarılı/hatalı, hangi adımda durdu) UI'da
  // canlı göstermeyi kolaylaştırıyor, ekstra bir IPC/stream mekanizması
  // gerektirmiyor (mevcut `sapGuiScript:performAction` zaten tek-adımlık).
  // Diyalog SAHİBİ pencere: odaklı pencere yoksa ilk pencere. Eskiden
  // `undefined as any` geçiliyordu — o durumda diyalog sahipsiz açılıyor ve
  // uygulamanın ARKASINDA kalabiliyor; kullanıcı donmuş bir pencere görüyor.
  const dialogOwner = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;

  ipcMain.handle("sapGuiScript:saveScript", async (_event, jsonText: string, suggestedName?: string) => {
    // DOSYA İŞLEMİ TRY İÇİNDE. `GuiScriptJsonFileResult.error` alanı en baştan
    // vardı ve renderer onu okuyordu, ama buradan hiç doldurulmuyordu: yazma
    // hatasında (salt-okunur klasör, kilitli dosya) handler'ın promise'i
    // reddediyor, renderer'daki `await` yakalanmamış bir hataya dönüşüyor ve
    // kullanıcı HİÇBİR ŞEY görmüyordu.
    try {
      const owner = dialogOwner();
      const result = owner
        ? await dialog.showSaveDialog(owner, {
            title: "SAP GUI Scripting kaydını JSON olarak kaydet",
            defaultPath: suggestedName || "sap-gui-script.json",
            filters: [{ name: "JSON", extensions: ["json"] }]
          })
        : await dialog.showSaveDialog({
            title: "SAP GUI Scripting kaydını JSON olarak kaydet",
            defaultPath: suggestedName || "sap-gui-script.json",
            filters: [{ name: "JSON", extensions: ["json"] }]
          });
      if (result.canceled || !result.filePath) return { canceled: true };
      await fs.writeFile(result.filePath, jsonText, "utf-8");
      return { canceled: false, filePath: result.filePath };
    } catch (err) {
      return { canceled: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("sapGuiScript:openScript", async () => {
    try {
      const owner = dialogOwner();
      const options = {
        title: "SAP GUI Scripting kaydı aç",
        properties: ["openFile" as const],
        filters: [{ name: "JSON", extensions: ["json"] }]
      };
      const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) return { canceled: true };
      const content = await fs.readFile(result.filePaths[0], "utf-8");
      return { canceled: false, filePath: result.filePaths[0], content };
    } catch (err) {
      return { canceled: false, error: (err as Error).message };
    }
  });

  // Faz 3 — AI Agent ile doğal dil otomasyonu. `flows:agentStep` ile AYNI
  // desen (bkz. axetFlowsAgent.ts) — bu handler sadece CLI'yi spawn eder,
  // JSON ayrıştırması TAMAMEN renderer'da (src/lib/sapGuiAgent/agentRunner.ts).
  ipcMain.handle("sapGuiScript:agentStep", async (_event, requestId: string, prompt: string, model: string | null) => {
    try {
      const result = await runSapGuiAgentStep(requestId, prompt, model);
      return { ok: !result.cancelled, text: result.text, cancelled: result.cancelled };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("sapGuiScript:cancelAgentStep", async (_event, requestId: string) => {
    cancelSapGuiAgentStep(requestId);
    return { ok: true };
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  disposeAllTerminals();
  stopAllRfcBridges();
  stopAllReadonlyServers();
  stopGuiScriptBridge();
  cancelAllChatMessages();
  cancelAllSapGuiAgentSteps();
  cancelAllConnectorTests();
  flowRuntime.stop().catch(() => {});
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  disposeAllTerminals();
  stopAllRfcBridges();
  stopAllReadonlyServers();
  stopGuiScriptBridge();
  cancelAllChatMessages();
  cancelAllSapGuiAgentSteps();
  cancelAllConnectorTests();
  flowRuntime.stop().catch(() => {});
});
