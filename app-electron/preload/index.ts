import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { AdtCapabilities } from "../shared/adtCapabilities";
import type { DataClearError } from "../shared/types";
import type {
  ActiveContext,
  ActiveGuiContext,
  AddManualSystemInput,
  AppConfig,
  AxetChatMessage,
  AxetChatActivity,
  AxetChatProgress,
  AxetChatSendResult,
  AxetModelConfigResult,
  AxetModelEntry,
  AxetModelKind,
  AxetModelsListResult,
  ChatAttachmentPreviewResult,
  ChatAttachmentSaveResult,
  ChatExportPayload,
  ChatExportResult,
  ChatSessionsLoadResult,
  ChatSessionsState,
  ConnectRequest,
  FlowAgentStepResult,
  FlowDeployResult,
  FlowJsonFileResult,
  FlowJsonValue,
  FlowTestRequestPayload,
  FlowTestRequestResult,
  FlowTriggerInjectResult,
  FlowValidateResult,
  GuiScriptActionPayload,
  GuiScriptActionResult,
  GuiScriptAgentStepResult,
  GuiScriptBridgeStatus,
  GuiScriptComponentDetail,
  GuiScriptConnectionInfo,
  GuiScriptJsonFileResult,
  GuiScriptPreflightResult,
  GuiScriptScreenResult,
  GuiScriptScreenshotMethod,
  GuiScriptScreenshotResult,
  GuiScriptSessionInfo,
  GuiScriptStartResult,
  ConnectorProvider,
  ConnectorTestResult,
  DoctorReport,
  ProjectBrief,
  SapContextPreview,
  ConnectorInventory,
  SapService,
  SapLogonOpenResult,
  SkillPlanEntry,
  SkillProfile,
  CatalogSkillList,
  CatalogInstallOutcome,
  GlobalSkillList,
  SkillStatus,
  SupportCreateResult,
  SystemTier,
  SystemCommentDefaults,
  TerminalMode,
  UpdateStatus
} from "../shared/types";
import type { WriteCsvResult, WriteHistoryResult } from "../shared/sapWriteHistory";
import type { Choice, SapWriteState, WorkMode } from "../shared/sapWriteTypes";
import type { AgentAnswerResult, AgentEngineInfo, AgentRegistration, AgentStatusEvent, AxetAgentEntry } from "../shared/agentTypes";
import type { Board } from "../shared/boardTypes";
import type { BoardCommand, BoardCommandResult } from "../shared/boardCommands";
import type {
  ChangesCommandResult,
  ChangesState,
  DiffResult,
  PrepareRevertResult,
  RangeResult,
  RevertResult,
  SnapshotResult
} from "../shared/changesTypes";
import type { BrowserSendResult, BrowserShortcut } from "../shared/browserLogic";
import type { AgentSendResult } from "../shared/agentMessage";
import type { StoredFlowEvent, TeamRelayMessage } from "../shared/flowHistory";
import type { MemoryReadResult, MemoryWriteResult } from "../shared/memoryLogic";

const api = {
  getLandscape: () => ipcRenderer.invoke("landscape:get"),
  checkConnectivity: (service: SapService) => ipcRenderer.invoke("connectivity:check", service),
  connect: (req: ConnectRequest) => ipcRenderer.invoke("system:connect", req),
  // Sertifika onayı: yalnızca ana sürecin bağlanırken ölçtüğü parmak izi
  // kaydedilebiliyor (bkz. main/index.ts "certs:approve").
  approveCertificate: (key: string, fingerprint: string): Promise<boolean> =>
    ipcRenderer.invoke("certs:approve", key, fingerprint),
  getCredentialDefaults: (serviceUuid: string) => ipcRenderer.invoke("credentials:getDefaults", serviceUuid),
  // Aktif bağlam — üç ekranın ortak "neredeyiz" bilgisi (bkz.
  // main/activeContext.ts). Renderer SAP tarafını YAZAMIYOR, sadece okuyor
  // ve temizleyebiliyor; tek yazar başarılı bağlantının kendisi.
  getActiveContext: (): Promise<ActiveContext> => ipcRenderer.invoke("context:get"),
  // Bağlı sistemde ajanın neyi yapabildiği; 8787'nin araç listesinden. Bağlantı yoksa null.
  getAdtCapabilities: (): Promise<AdtCapabilities | null> => ipcRenderer.invoke("adt:capabilities"),
  // "Sorun bildir": pakete girecek dosyalar ve paketi oluşturma (bkz. support/ipc.ts).
  supportPreview: (req: { note: string; chatMarkdown: string | null }): Promise<string[]> =>
    ipcRenderer.invoke("support:preview", req),
  supportCreate: (req: { note: string; chatMarkdown: string | null }): Promise<SupportCreateResult> =>
    ipcRenderer.invoke("support:create", req),
  // "SAP'ye yazılanlar" (sistem paneli): kayıt okuma ve CSV (bkz. sapWrite/history.ts).
  getWriteHistory: (customerPath: string[], service: SapService): Promise<WriteHistoryResult> =>
    ipcRenderer.invoke("sapWrite:history", customerPath, service),
  exportWriteHistoryCsv: (customerPath: string[], service: SapService): Promise<WriteCsvResult> =>
    ipcRenderer.invoke("sapWrite:exportCsv", customerPath, service),
  clearActiveSapContext: (): Promise<ActiveContext> => ipcRenderer.invoke("context:clearSap"),
  setActiveGuiContext: (gui: ActiveGuiContext | null): Promise<ActiveContext> => ipcRenderer.invoke("context:setGui", gui),
  onActiveContextChanged: (callback: (context: ActiveContext) => void) => {
    const listener = (_e: unknown, context: ActiveContext) => callback(context);
    ipcRenderer.on("context:changed", listener);
    return () => ipcRenderer.removeListener("context:changed", listener);
  },
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (partial: Partial<AppConfig>) => ipcRenderer.invoke("config:save", partial),
  pickFolder: () => ipcRenderer.invoke("dialog:pickFolder"),
  validateOverridePaths: (input: {
    landscapePath?: string | null;
    sapShcutPath?: string | null;
  }): Promise<{ landscape: boolean | null; sapShcut: boolean | null }> =>
    ipcRenderer.invoke("config:validateOverridePaths", input),
  addManualSystem: (input: AddManualSystemInput) => ipcRenderer.invoke("manualSystems:add", input),
  removeManualSystem: (id: string) => ipcRenderer.invoke("manualSystems:remove", id),
  updateManualSystem: (id: string, input: AddManualSystemInput) => ipcRenderer.invoke("manualSystems:update", id, input),
  exportManualSystems: () => ipcRenderer.invoke("manualSystems:exportToFile"),
  importManualSystems: () => ipcRenderer.invoke("manualSystems:importFromFile"),
  setSystemTier: (serviceUuid: string, tier: SystemTier | null) => ipcRenderer.invoke("systemTiers:set", serviceUuid, tier),
  setSystemComment: (serviceUuid: string, comment: string) => ipcRenderer.invoke("systemComments:set", serviceUuid, comment),
  planSkills: (profile: SkillProfile, tier: SystemTier | null): Promise<SkillPlanEntry[]> =>
    ipcRenderer.invoke("skills:plan", profile, tier),
  getSkillStatus: (projectDir: string): Promise<SkillStatus> =>
    ipcRenderer.invoke("skills:status", projectDir),
  reinstallSkills: (projectDir: string, serviceUuid: string | null): Promise<SkillStatus> =>
    ipcRenderer.invoke("skills:reinstall", projectDir, serviceUuid),
  listGlobalSkills: (): Promise<GlobalSkillList> =>
    ipcRenderer.invoke("skills:global:list"),
  setGlobalSkill: (name: string, enabled: boolean): Promise<GlobalSkillList> =>
    ipcRenderer.invoke("skills:global:set", name, enabled),
  listCatalogSkills: (projectDir: string): Promise<CatalogSkillList> =>
    ipcRenderer.invoke("catalogSkills:list", projectDir),
  installCatalogSkill: (projectDir: string, id: string): Promise<CatalogInstallOutcome> =>
    ipcRenderer.invoke("catalogSkills:install", projectDir, id),
  removeCatalogSkill: (projectDir: string, name: string): Promise<CatalogInstallOutcome> =>
    ipcRenderer.invoke("catalogSkills:remove", projectDir, name),
  runDoctor: (): Promise<DoctorReport> => ipcRenderer.invoke("doctor:run"),
  installPythonPackages: (packages: string[]): Promise<{ ok: boolean; output: string }> =>
    ipcRenderer.invoke("doctor:install", packages),
  getProjectBrief: (projectDir: string): Promise<ProjectBrief> =>
    ipcRenderer.invoke("projectBrief:get", projectDir),
  getConnectorInventory: (projectDir: string): Promise<ConnectorInventory> =>
    ipcRenderer.invoke("connectors:inventory", projectDir),
  getSapContext: (projectDir: string): Promise<SapContextPreview> =>
    ipcRenderer.invoke("sapContext:get", projectDir),
  saveProjectBrief: (projectDir: string, brief: ProjectBrief): Promise<ProjectBrief> =>
    ipcRenderer.invoke("projectBrief:save", projectDir, brief),
  getSystemCommentDefault: (serviceUuid: string): Promise<SystemCommentDefaults> => ipcRenderer.invoke("systemComment:getDefault", serviceUuid),
  openInSapLogon: (service: SapService): Promise<SapLogonOpenResult> => ipcRenderer.invoke("sapLogon:open", service),
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowToggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowIsMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onWindowStateChanged: (callback: (isMaximized: boolean) => void) => {
    const listener = (_event: unknown, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on("window:state-changed", listener);
    return () => ipcRenderer.removeListener("window:state-changed", listener);
  },
  createTerminal: (
    cwd: string,
    cols: number,
    rows: number,
    shell: TerminalMode,
    initialCommand?: string,
    options?: { createDir?: boolean }
  ) => ipcRenderer.invoke("terminal:create", cwd, cols, rows, shell, initialCommand, options),
  disposeAllTerminals: () => ipcRenderer.invoke("terminal:disposeAll"),
  writeTerminal: (id: string, data: string) => ipcRenderer.send("terminal:write", id, data),
  resizeTerminal: (id: string, cols: number, rows: number) => ipcRenderer.send("terminal:resize", id, cols, rows),
  disposeTerminal: (id: string) => ipcRenderer.invoke("terminal:dispose", id),
  getTerminalBuffer: (id: string) => ipcRenderer.invoke("terminal:getBuffer", id),
  agentEngines: (force?: boolean): Promise<AgentEngineInfo[]> => ipcRenderer.invoke("agents:engines", force === true),
  axetAgents: (cwd: string): Promise<AxetAgentEntry[]> => ipcRenderer.invoke("agents:axetAgents", cwd),
  agentWhich: (binary: string): Promise<boolean> => ipcRenderer.invoke("agents:which", binary),
  agentRegister: (reg: AgentRegistration): Promise<void> => ipcRenderer.invoke("agents:register", reg),
  agentUnregister: (paneId: string): Promise<void> => ipcRenderer.invoke("agents:unregister", paneId),
  agentSend: (workspaceId: string, paneId: string, text: string): Promise<AgentSendResult> =>
    ipcRenderer.invoke("agents:send", workspaceId, paneId, text),
  agentAnswer: (paneId: string, callId: string, index: number): Promise<AgentAnswerResult> =>
    ipcRenderer.invoke("agents:answer", paneId, callId, index),
  agentSnapshot: (): Promise<AgentStatusEvent[]> => ipcRenderer.invoke("agents:snapshot"),
  onAgentStatus: (callback: (event: AgentStatusEvent) => void) => {
    const listener = (_event: unknown, event: AgentStatusEvent) => callback(event);
    ipcRenderer.on("agents:status", listener);
    return () => ipcRenderer.removeListener("agents:status", listener);
  },
  boardGet: (workspaceId: string): Promise<Board | null> => ipcRenderer.invoke("board:get", workspaceId),
  boardCommand: (workspaceId: string, command: BoardCommand): Promise<BoardCommandResult> =>
    ipcRenderer.invoke("board:command", workspaceId, command),
  // Yalnız kullanıcının alan kapatmasından: o alanın panosu silinir.
  boardDropWorkspace: (workspaceId: string): Promise<void> => ipcRenderer.invoke("board:dropWorkspace", workspaceId),
  onBoardChanged: (callback: (board: Board) => void) => {
    const listener = (_event: unknown, board: Board) => callback(board);
    ipcRenderer.on("board:changed", listener);
    return () => ipcRenderer.removeListener("board:changed", listener);
  },
  // Pano bildirimine tıklanınca (spec 2026-10-18 gorev-panosu §8): o alanın panosu.
  onBoardOpen: (callback: (workspaceId: string) => void) => {
    const listener = (_event: unknown, workspaceId: string) => callback(workspaceId);
    ipcRenderer.on("board:open", listener);
    return () => ipcRenderer.removeListener("board:open", listener);
  },
  // Değişiklikler (spec 2026-10-18 degisiklikler §5): yol yalnız ana sürecin verdiği listeden.
  changesState: (workspaceId: string): Promise<ChangesState | null> => ipcRenderer.invoke("changes:state", workspaceId),
  changesLive: (workspaceId: string): Promise<RangeResult> => ipcRenderer.invoke("changes:live", workspaceId),
  changesRange: (workspaceId: string, checkpointId: string): Promise<RangeResult> =>
    ipcRenderer.invoke("changes:range", workspaceId, checkpointId),
  changesDiff: (workspaceId: string, checkpointId: string, path: string): Promise<DiffResult> =>
    ipcRenderer.invoke("changes:diff", workspaceId, checkpointId, path),
  changesCheckpoint: (workspaceId: string): Promise<SnapshotResult> => ipcRenderer.invoke("changes:checkpoint", workspaceId),
  changesAccept: (workspaceId: string, checkpointId: string): Promise<ChangesCommandResult> =>
    ipcRenderer.invoke("changes:accept", workspaceId, checkpointId),
  changesPrepareRevert: (workspaceId: string, checkpointId: string): Promise<PrepareRevertResult> =>
    ipcRenderer.invoke("changes:prepareRevert", workspaceId, checkpointId),
  changesRevert: (workspaceId: string, checkpointId: string, paths: string[]): Promise<RevertResult> =>
    ipcRenderer.invoke("changes:revert", workspaceId, checkpointId, paths),
  // Akış geçmişi ve ekip köprüsü (Tur 4).
  flowLoad: (workspaceId: string): Promise<StoredFlowEvent[]> => ipcRenderer.invoke("flow:load", workspaceId),
  flowSave: (workspaceId: string, events: StoredFlowEvent[]): Promise<boolean> => ipcRenderer.invoke("flow:save", workspaceId, events),
  flowClear: (workspaceId: string): Promise<boolean> => ipcRenderer.invoke("flow:clear", workspaceId),
  onTeamRelay: (callback: (event: TeamRelayMessage) => void) => {
    const listener = (_event: unknown, payload: TeamRelayMessage) => callback(payload);
    ipcRenderer.on("team:relay", listener);
    return () => ipcRenderer.removeListener("team:relay", listener);
  },
  onChangesChanged: (callback: (state: ChangesState) => void) => {
    const listener = (_event: unknown, state: ChangesState) => callback(state);
    ipcRenderer.on("changes:changed", listener);
    return () => ipcRenderer.removeListener("changes:changed", listener);
  },
  // Yerleşik tarayıcı (spec 2026-10-18 tarayici §3, §4.6): hedef webview
  // kimliğiyle; ana süreç onu ana pencereye bağlı ve bizim bölümde mi diye doğruluyor.
  browserSend: (workspaceId: string, paneId: string, webContentsId: number, withScreenshot: boolean): Promise<BrowserSendResult> =>
    ipcRenderer.invoke("browser:send", workspaceId, paneId, webContentsId, withScreenshot),
  onBrowserDownloadBlocked: (callback: (webContentsId: number | null) => void) => {
    const listener = (_event: unknown, webContentsId: number | null) => callback(webContentsId);
    ipcRenderer.on("browser:downloadBlocked", listener);
    return () => ipcRenderer.removeListener("browser:downloadBlocked", listener);
  },
  onBrowserShortcut: (callback: (webContentsId: number, action: BrowserShortcut) => void) => {
    const listener = (_event: unknown, webContentsId: number, action: BrowserShortcut) => callback(webContentsId, action);
    ipcRenderer.on("browser:shortcut", listener);
    return () => ipcRenderer.removeListener("browser:shortcut", listener);
  },
  memoryRead: (workspaceId: string, paneId: string): Promise<MemoryReadResult> => ipcRenderer.invoke("memory:read", workspaceId, paneId),
  memoryWrite: (workspaceId: string, paneId: string, content: string, stamp: string): Promise<MemoryWriteResult> =>
    ipcRenderer.invoke("memory:write", workspaceId, paneId, content, stamp),
  memoryReveal: (workspaceId: string, paneId: string): Promise<boolean> => ipcRenderer.invoke("memory:reveal", workspaceId, paneId),
  memoryRenotify: (workspaceId: string, paneId: string): Promise<boolean> => ipcRenderer.invoke("memory:renotify", workspaceId, paneId),
  // Ajan bildirimine tıklanınca (spec §9): Ajanlar ekranı ve o bölme.
  onAgentOpen: (callback: (paneId: string) => void) => {
    const listener = (_event: unknown, paneId: string) => callback(paneId);
    ipcRenderer.on("agents:open", listener);
    return () => ipcRenderer.removeListener("agents:open", listener);
  },
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
  // Composer'daki `@` bahsi için — ağaçta ada göre arama (bkz. searchFiles).
  searchFiles: (root: string, query: string) => ipcRenderer.invoke("fs:searchFiles", root, query),
  readTextFile: (filePath: string) => ipcRenderer.invoke("fs:readTextFile", filePath),
  // `allowCreate`: yalnızca yönerge kutusu geçiyor (olmayan AGENTS.md'yi
  // oluşturmak için). Bkz. fsExplorer.writeTextFile.
  writeTextFile: (filePath: string, content: string, allowCreate?: boolean) =>
    ipcRenderer.invoke("fs:writeTextFile", filePath, content, allowCreate),
  // Klasör izleme: `id` çağıranın ürettiği bir anahtar, kapatırken aynısı
  // veriliyor. Olay yalnızca "bu kökün altında bir şey değişti" diyor.
  watchDir: (id: string, dirPath: string) => ipcRenderer.invoke("fs:watchDir", id, dirPath),
  unwatchDir: (id: string) => ipcRenderer.invoke("fs:unwatchDir", id),
  onFsChanged: (callback: (id: string) => void) => {
    const listener = (_e: unknown, id: string) => callback(id);
    ipcRenderer.on("fs:changed", listener);
    return () => ipcRenderer.removeListener("fs:changed", listener);
  },
  readDocxFile: (filePath: string) => ipcRenderer.invoke("fs:readDocx", filePath),
  readImageDataUrl: (filePath: string) => ipcRenderer.invoke("fs:readImageDataUrl", filePath),
  openInExplorer: (filePath: string) => ipcRenderer.invoke("fs:openInExplorer", filePath),
  openExternal: (filePath: string) => ipcRenderer.invoke("fs:openExternal", filePath),
  openExternalUrl: (url: string) => ipcRenderer.invoke("shell:openUrl", url),
  writeClipboard: (text: string) => ipcRenderer.invoke("clipboard:writeText", text),
  discoverAxetFlowsLiveUrl: () => ipcRenderer.invoke("axetFlowsLive:discoverUrl"),
  saveFlowToLiveHost: (flowArray: unknown[]) => ipcRenderer.invoke("axetFlowsLive:saveFlow", flowArray),
  importFiles: (destDir: string, sourcePaths: string[]) => ipcRenderer.invoke("fs:importFiles", destDir, sourcePaths),
  pickFiles: () => ipcRenderer.invoke("dialog:pickFiles"),
  // Dosya gezgininin gezebildiği kökler ve onlara yeni bir tane ekleme.
  // Ekleme İŞLETİM SİSTEMİNİN klasör penceresinden geçiyor: izni veren
  // kullanıcı, isteyen renderer değil (bkz. fsExplorer.ts `grantUserRoot`).
  getAllowedRoots: (): Promise<string[]> => ipcRenderer.invoke("fs:allowedRoots"),
  pickExplorerRoot: (): Promise<string | null> => ipcRenderer.invoke("dialog:pickExplorerRoot"),
  // Seçilen kökü ajanın çalışma klasörü yapmadan önce yetenekleri oraya kurar.
  adoptWorkDir: (dirPath: string, systemUuid: string | null) =>
    ipcRenderer.invoke("axet:adoptWorkDir", dirPath, systemUuid),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  downloadUpdate: () => ipcRenderer.invoke("updates:download"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  getLastUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke("updates:getLastStatus"),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: unknown, status: UpdateStatus) => callback(status);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  },
  listAxetModels: (): Promise<AxetModelsListResult> => ipcRenderer.invoke("axetModels:list"),
  getAxetModelConfig: (): Promise<AxetModelConfigResult> => ipcRenderer.invoke("axetModels:getCurrent"),
  setAxetModel: (kind: AxetModelKind, entry: AxetModelEntry): Promise<AxetModelConfigResult> =>
    ipcRenderer.invoke("axetModels:setCurrent", kind, entry),
  // `chatId` sohbetin kalıcı kimliği — main process kalıcı axet-code
  // oturumlarını bununla eşliyor (bkz. axetChat.ts). `requestId` tek bir
  // mesaja ait ve iptal onunla yapılıyor.
  sendChatMessage: (
    requestId: string,
    chatId: string,
    cwd: string,
    model: AxetModelEntry | null,
    history: AxetChatMessage[],
    message: string
  ): Promise<AxetChatSendResult> =>
    ipcRenderer.invoke("axetChat:send", requestId, chatId, cwd, model, history, message),
  cancelChatMessage: (requestId: string): Promise<void> => ipcRenderer.invoke("axetChat:cancel", requestId),
  // Yarıda kalmış turun cevabını axet-code'un veritabanından geri getirir.
  // `null` normal bir sonuç: kurtarılacak bir şey yok demek.
  recoverChatAnswer: (
    cwd: string,
    prompt: string,
    promptAtMs: number,
    chatId?: string
  ): Promise<{ text: string; finished: boolean } | null> =>
    ipcRenderer.invoke("axetChat:recoverAnswer", cwd, prompt, promptAtMs, chatId),
  // `optionIndex` DİZİ olabiliyor: çoklu seçimli soru kutusunda birden fazla
  // şık işaretlenebiliyor (bkz. axetChat.ts).
  answerChatQuestion: (
    requestId: string,
    optionIndex: number | number[],
    customText?: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("axetChat:answerQuestion", requestId, optionIndex, customText),
  closeChatSession: (chatId: string): Promise<void> => ipcRenderer.invoke("axetChat:closeSession", chatId),
  // İstemsiz `run` süreci (bkz. axetPrewarm.ts); ateşle-unut.
  prewarmChat: (
    chatId: string,
    cwd: string,
    model: AxetModelEntry | null,
    draft: string,
    history: AxetChatMessage[]
  ): Promise<void> => ipcRenderer.invoke("axetChat:prewarm", chatId, cwd, model, draft, history),
  // axet-code'un kendi güncelleme duyurusu (bizim uygulamamızınki AYRI, o
  // electron-updater'dan `onUpdateStatus` ile geliyor).
  axetUpdateAvailable: (): Promise<{ installed: string; latest: string } | null> =>
    ipcRenderer.invoke("axetChat:updateAvailable"),
  resetChatHistory: (chatId: string): Promise<boolean> =>
    ipcRenderer.invoke("axetChat:resetHistory", chatId),
  // Cevap metni üretildikçe gelen parçalar (yalnızca YENİ parça, birikmiş
  // metin değil). `requestId` ile hangi sohbete ait olduğu ayırt ediliyor.
  onChatChunk: (callback: (requestId: string, text: string) => void) => {
    const listener = (_event: unknown, requestId: string, text: string) => callback(requestId, text);
    ipcRenderer.on("axetChat:chunk", listener);
    return () => ipcRenderer.removeListener("axetChat:chunk", listener);
  },
  // Cevap beklenirken alt süreçte olup bitenler: aşama, araç çağrıları ve
  // sonuçları (bkz. AxetChatActivity).
  onChatActivity: (callback: (requestId: string, activity: AxetChatActivity) => void) => {
    const listener = (_event: unknown, requestId: string, activity: AxetChatActivity) =>
      callback(requestId, activity);
    ipcRenderer.on("axetChat:activity", listener);
    return () => ipcRenderer.removeListener("axetChat:activity", listener);
  },
  // Ajanın kendi yapılacaklar listesi ve bağlam doluluğu. Etkinlikten farkı:
  // her olay TAM DURUM taşıyor, birikmiyor.
  onChatProgress: (callback: (requestId: string, progress: AxetChatProgress) => void) => {
    const listener = (_event: unknown, requestId: string, progress: AxetChatProgress) =>
      callback(requestId, progress);
    ipcRenderer.on("axetChat:progress", listener);
    return () => ipcRenderer.removeListener("axetChat:progress", listener);
  },
  saveChatAttachment: (fileName: string, base64Data: string): Promise<ChatAttachmentSaveResult> =>
    ipcRenderer.invoke("chatAttachments:save", fileName, base64Data),
  readChatAttachmentPreview: (filePath: string): Promise<ChatAttachmentPreviewResult> =>
    ipcRenderer.invoke("chatAttachments:preview", filePath),
  loadChatSessions: (): Promise<ChatSessionsLoadResult> => ipcRenderer.invoke("chatSessions:load"),
  saveChatSessions: (state: ChatSessionsState): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("chatSessions:save", state),
  // Her iki biçim de BİRLİKTE gönderiliyor: hangisinin yazılacağına kaydetme
  // kutusunda seçilen uzantı karar veriyor ve o seçim ana süreçte öğreniliyor.
  exportChat: (suggestedName: string, payload: ChatExportPayload): Promise<ChatExportResult> =>
    ipcRenderer.invoke("chat:export", suggestedName, payload),

  // ---------------------------- Uygulama Bağlantıları (Outlook/SharePoint connector'ları) ----------------------------
  testConnector: (requestId: string, provider: ConnectorProvider): Promise<ConnectorTestResult> =>
    ipcRenderer.invoke("connectors:test", requestId, provider),
  cancelConnectorTest: (requestId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("connectors:cancelTest", requestId),
  getConnectorMcpUrl: (provider: ConnectorProvider): Promise<string> =>
    ipcRenderer.invoke("connectors:getMcpUrl", provider),
  // Yalnızca KESMEK için — bağlamak `testConnector`'dan geçiyor, çünkü
  // doğrulanmamış bir "bağlı" hâli olmamalı.
  setConnectorEnabled: (provider: ConnectorProvider, enabled: boolean): Promise<{ ok: boolean; config: AppConfig }> =>
    ipcRenderer.invoke("connectors:setEnabled", provider, enabled),

  // ---------------------------- axet.flows ----------------------------
  flowsAgentStep: (prompt: string, model: string | null, userText?: string): Promise<FlowAgentStepResult> =>
    ipcRenderer.invoke("flows:agentStep", prompt, model, userText),
  flowsDeploy: (flowArray: FlowJsonValue[], mode?: string): Promise<FlowDeployResult> =>
    ipcRenderer.invoke("flows:runtime:deploy", flowArray, mode),
  flowsRestart: (): Promise<FlowDeployResult> => ipcRenderer.invoke("flows:runtime:restart"),
  flowsValidate: (flowArray: FlowJsonValue[]): Promise<FlowValidateResult> =>
    ipcRenderer.invoke("flows:runtime:validate", flowArray),
  flowsStop: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("flows:runtime:stop"),
  flowsGetRuntimeStatus: () => ipcRenderer.invoke("flows:runtime:status"),
  flowsTriggerInject: (nodeId: string): Promise<FlowTriggerInjectResult> =>
    ipcRenderer.invoke("flows:runtime:triggerInject", nodeId),
  flowsSendTestRequest: (payload: FlowTestRequestPayload): Promise<FlowTestRequestResult> =>
    ipcRenderer.invoke("flows:runtime:testRequest", payload),
  flowsSaveJson: (jsonText: string): Promise<FlowJsonFileResult> => ipcRenderer.invoke("flows:saveJson", jsonText),
  flowsOpenJson: (): Promise<FlowJsonFileResult> => ipcRenderer.invoke("flows:openJson"),
  reportsSaveMarkdown: (text: string, suggestedName: string): Promise<FlowJsonFileResult> => ipcRenderer.invoke("reports:saveMarkdown", text, suggestedName),
  flowsExportDebugLog: (jsonText: string): Promise<FlowJsonFileResult> =>
    ipcRenderer.invoke("flows:exportDebugLog", jsonText),
  onFlowsRuntimeDebug: (callback: (entry: FlowJsonValue) => void) => {
    const listener = (_event: unknown, entry: FlowJsonValue) => callback(entry);
    ipcRenderer.on("flows:runtime:debug", listener);
    return () => ipcRenderer.removeListener("flows:runtime:debug", listener);
  },
  onFlowsRuntimeStatus: (callback: (status: FlowJsonValue) => void) => {
    const listener = (_event: unknown, status: FlowJsonValue) => callback(status);
    ipcRenderer.on("flows:runtime:status", listener);
    return () => ipcRenderer.removeListener("flows:runtime:status", listener);
  },
  onFlowsRuntimeLog: (callback: (entry: FlowJsonValue) => void) => {
    const listener = (_event: unknown, entry: FlowJsonValue) => callback(entry);
    ipcRenderer.on("flows:runtime:log", listener);
    return () => ipcRenderer.removeListener("flows:runtime:log", listener);
  },
  onFlowsRuntimeTrace: (callback: (entry: FlowJsonValue) => void) => {
    const listener = (_event: unknown, entry: FlowJsonValue) => callback(entry);
    ipcRenderer.on("flows:runtime:trace", listener);
    return () => ipcRenderer.removeListener("flows:runtime:trace", listener);
  },

  // ---------------------------- SAP GUI Scripting ----------------------------
  startGuiScriptBridge: (): Promise<GuiScriptStartResult> => ipcRenderer.invoke("sapGuiScript:start"),
  stopGuiScriptBridge: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("sapGuiScript:stop"),
  getGuiScriptBridgeStatus: (): Promise<GuiScriptBridgeStatus> => ipcRenderer.invoke("sapGuiScript:status"),
  guiScriptPreflight: (): Promise<GuiScriptPreflightResult> => ipcRenderer.invoke("sapGuiScript:preflight"),
  getGuiScriptScreen: (connIdx: number, sessIdx: number): Promise<GuiScriptScreenResult> =>
    ipcRenderer.invoke("sapGuiScript:getScreen", connIdx, sessIdx),
  captureGuiScriptScreenshot: (connIdx: number | null, sessIdx: number | null, method: GuiScriptScreenshotMethod): Promise<GuiScriptScreenshotResult> =>
    ipcRenderer.invoke("sapGuiScript:screenshot", connIdx, sessIdx, method),
  listGuiScriptConnections: (): Promise<{ ok: boolean; connections?: GuiScriptConnectionInfo[]; error?: string }> =>
    ipcRenderer.invoke("sapGuiScript:listConnections"),
  listGuiScriptSessions: (connIdx: number): Promise<{ ok: boolean; sessions?: GuiScriptSessionInfo[]; error?: string }> =>
    ipcRenderer.invoke("sapGuiScript:listSessions", connIdx),
  getGuiScriptNode: (connIdx: number, sessIdx: number, elementId: string | null, window?: { rows?: number; rowOffset?: number }): Promise<{ ok: boolean; node?: GuiScriptComponentDetail; error?: string }> =>
    ipcRenderer.invoke("sapGuiScript:getNode", connIdx, sessIdx, elementId, window),
  performGuiScriptAction: (connIdx: number, sessIdx: number, payload: GuiScriptActionPayload): Promise<GuiScriptActionResult> =>
    ipcRenderer.invoke("sapGuiScript:performAction", connIdx, sessIdx, payload),
  saveGuiScriptScript: (jsonText: string, suggestedName?: string): Promise<GuiScriptJsonFileResult> =>
    ipcRenderer.invoke("sapGuiScript:saveScript", jsonText, suggestedName),
  openGuiScriptScript: (): Promise<GuiScriptJsonFileResult> => ipcRenderer.invoke("sapGuiScript:openScript"),
  guiScriptAgentStep: (
    requestId: string,
    prompt: string,
    model: string | null,
    userText?: string
  ): Promise<GuiScriptAgentStepResult> => ipcRenderer.invoke("sapGuiScript:agentStep", requestId, prompt, model, userText),
  cancelGuiScriptAgentStep: (requestId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("sapGuiScript:cancelAgentStep", requestId),
  // SAP DEV yazma onayı (main/sapWrite): oturumların modu ve bekleyen istekler.
  // Karar yalnızca bu iki çağrıyla veriliyor; pencere gösterimi `onSapWriteChanged`.
  getSapWriteState: (): Promise<SapWriteState> => ipcRenderer.invoke("sap-write:state"),
  setSapWriteMode: (sessionId: string, mode: WorkMode): Promise<boolean> =>
    ipcRenderer.invoke("sap-write:set-mode", sessionId, mode),
  respondSapWrite: (id: string, choice: Choice): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("sap-write:respond", id, choice),
  onSapWriteChanged: (callback: (state: SapWriteState) => void) => {
    const listener = (_event: unknown, state: SapWriteState) => callback(state);
    ipcRenderer.on("sap-write:changed", listener);
    return () => ipcRenderer.removeListener("sap-write:changed", listener);
  },

  // Veri ve gizlilik (Is A — 2026-10-17)
  dataPrivacySummary: (): Promise<{
    chat: { count: number; bytes: number };
    log: { bytes: number };
    sapWrite: { projects: number; bytes: number };
    axetDb: { count: number; bytes: number };
  }> => ipcRenderer.invoke("data:summary"),
  dataPrivacyReveal: (kind: "chat" | "log" | "sapWrite" | "axetDb"): Promise<void> =>
    ipcRenderer.invoke("data:reveal", kind),
  dataPrivacyClear: (kind: "chat" | "log"): Promise<{ ok: boolean; error?: DataClearError }> =>
    ipcRenderer.invoke("data:clear", kind),

  // İş B — bildirim tıklandığında ana süreç bu olayı gönderir (chat:open).
  // Renderer'da AxetCodeHome dinleyip sohbeti seçiyor.
  onChatOpen: (callback: (chatId: string) => void) => {
    const listener = (_event: unknown, chatId: string) => callback(chatId);
    ipcRenderer.on("chat:open", listener);
    return () => ipcRenderer.removeListener("chat:open", listener);
  }
};

contextBridge.exposeInMainWorld("api", api);

export type AxetApi = typeof api;
