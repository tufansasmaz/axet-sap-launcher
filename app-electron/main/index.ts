import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { loadLandscape, getServiceCredentials, getServiceSapLogonNote } from "./sapLandscape";
import { checkConnectivity } from "./connectivity";
import { connectToSystem, computeProjectDir } from "./launcher";
import { loadConfig, saveConfig, saveLastCredential, saveTrustedCertificates, pushConnectionHistory, saveSystemTier, saveSystemComment } from "./store";
import { loadManualSystems, addManualSystem, removeManualSystem, updateManualSystem, exportManualSystemsToFile, importManualSystemsFromFile } from "./manualSystems";
import { mergeManualSystems } from "./manualMerge";
import { createTerminal, writeTerminal, resizeTerminal, disposeTerminal, disposeAllTerminals, getTerminalBuffer } from "./terminalManager";
import { stopAllRfcBridges } from "./rfcBridgeManager";
import { stopAllReadonlyServers } from "./adtReadonlyServerManager";
import { isPathAllowed, listDir, readTextFile, readDocxFile, readImageDataUrl, openInExplorer, openExternal, importFiles } from "./fsExplorer";
import { checkForUpdates, downloadUpdate, installUpdate, getLastUpdateStatus } from "./updater";
import { openInSapLogon } from "./sapLogon";
import type { AddManualSystemInput, AppConfig, ConnectRequest, SapService, CredentialDefaults, SystemCommentDefaults, SystemTier, TerminalMode } from "../shared/types";

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

  win.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    // "clipboard-read": gömülü terminaldeki (xterm.js) Ctrl+V için
    // `navigator.clipboard.readText()` — xterm.js Ctrl+V'yi kendi terminal
    // semantiğinde (readline "quoted-insert") ele aldığından tarayıcının
    // native paste akışına hiç girmiyor, bu yüzden `EmbeddedTerminal.tsx`
    // sadece kendi Terminal örneğine özel `attachCustomKeyEventHandler` ile
    // bu API'yi çağırıyor (bkz. o dosyadaki not — global bir keydown/paste
    // müdahalesi DEĞİL, sadece bu izin).
    return permission === "deprecated-sync-clipboard-read" || permission === "clipboard-read";
  });

  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "clipboard-read");
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
  return {
    username: last?.username ?? memo.username ?? "",
    password: last?.password ?? memo.password ?? "",
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
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  disposeAllTerminals();
  stopAllRfcBridges();
  stopAllReadonlyServers();
});
