import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  AddManualSystemInput,
  AppConfig,
  ConnectRequest,
  SapService,
  SystemTier,
  TerminalMode,
  UpdateStatus
} from "../shared/types";

const api = {
  getLandscape: () => ipcRenderer.invoke("landscape:get"),
  checkConnectivity: (service: SapService) => ipcRenderer.invoke("connectivity:check", service),
  connect: (req: ConnectRequest) => ipcRenderer.invoke("system:connect", req),
  getCredentialDefaults: (serviceUuid: string) => ipcRenderer.invoke("credentials:getDefaults", serviceUuid),
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (partial: Partial<AppConfig>) => ipcRenderer.invoke("config:save", partial),
  pickFolder: () => ipcRenderer.invoke("dialog:pickFolder"),
  addManualSystem: (input: AddManualSystemInput) => ipcRenderer.invoke("manualSystems:add", input),
  removeManualSystem: (id: string) => ipcRenderer.invoke("manualSystems:remove", id),
  updateManualSystem: (id: string, input: AddManualSystemInput) => ipcRenderer.invoke("manualSystems:update", id, input),
  exportManualSystems: () => ipcRenderer.invoke("manualSystems:exportToFile"),
  importManualSystems: () => ipcRenderer.invoke("manualSystems:importFromFile"),
  setSystemTier: (serviceUuid: string, tier: SystemTier | null) => ipcRenderer.invoke("systemTiers:set", serviceUuid, tier),
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowToggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowIsMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onWindowStateChanged: (callback: (isMaximized: boolean) => void) => {
    const listener = (_event: unknown, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on("window:state-changed", listener);
    return () => ipcRenderer.removeListener("window:state-changed", listener);
  },
  createTerminal: (cwd: string, cols: number, rows: number, shell: TerminalMode, initialCommand?: string) =>
    ipcRenderer.invoke("terminal:create", cwd, cols, rows, shell, initialCommand),
  writeTerminal: (id: string, data: string) => ipcRenderer.send("terminal:write", id, data),
  resizeTerminal: (id: string, cols: number, rows: number) => ipcRenderer.send("terminal:resize", id, cols, rows),
  disposeTerminal: (id: string) => ipcRenderer.invoke("terminal:dispose", id),
  getTerminalBuffer: (id: string) => ipcRenderer.invoke("terminal:getBuffer", id),
  onTerminalData: (callback: (id: string, data: string) => void) => {
    const listener = (_event: unknown, id: string, data: string) => callback(id, data);
    ipcRenderer.on("terminal:data", listener);
    return () => ipcRenderer.removeListener("terminal:data", listener);
  },
  onTerminalExit: (callback: (id: string, exitCode: number) => void) => {
    const listener = (_event: unknown, id: string, exitCode: number) => callback(id, exitCode);
    ipcRenderer.on("terminal:exit", listener);
    return () => ipcRenderer.removeListener("terminal:exit", listener);
  },
  onTerminalReady: (callback: (id: string) => void) => {
    const listener = (_event: unknown, id: string) => callback(id);
    ipcRenderer.on("terminal:ready", listener);
    return () => ipcRenderer.removeListener("terminal:ready", listener);
  },
  // getPathForFile: sürükle-bırak ile atılan dosyaların gerçek disk yolunu
  // okumak için (Electron'un önerdiği webUtils API'si). Ctrl+V/sağ-tık
  // yapıştırma artık burada ELLE ele alınmıyor — xterm.js kendi native
  // `paste` event akışını kullanıyor (bkz. EmbeddedTerminal.tsx).
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  resolveProjectDir: (customerPath: string[], service: SapService) => ipcRenderer.invoke("project:resolveDir", customerPath, service),
  listDir: (dirPath: string) => ipcRenderer.invoke("fs:listDir", dirPath),
  readTextFile: (filePath: string) => ipcRenderer.invoke("fs:readTextFile", filePath),
  readDocxFile: (filePath: string) => ipcRenderer.invoke("fs:readDocx", filePath),
  readImageDataUrl: (filePath: string) => ipcRenderer.invoke("fs:readImageDataUrl", filePath),
  openInExplorer: (filePath: string) => ipcRenderer.invoke("fs:openInExplorer", filePath),
  openExternal: (filePath: string) => ipcRenderer.invoke("fs:openExternal", filePath),
  importFiles: (destDir: string, sourcePaths: string[]) => ipcRenderer.invoke("fs:importFiles", destDir, sourcePaths),
  pickFiles: () => ipcRenderer.invoke("dialog:pickFiles"),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  downloadUpdate: () => ipcRenderer.invoke("updates:download"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  getLastUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke("updates:getLastStatus"),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: unknown, status: UpdateStatus) => callback(status);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  }
};

contextBridge.exposeInMainWorld("api", api);

export type AxetApi = typeof api;
