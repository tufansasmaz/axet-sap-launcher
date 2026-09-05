import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  ActiveContext,
  ActiveGuiContext,
  AddManualSystemInput,
  AppConfig,
  AxetChatMessage,
  AxetChatActivity,
  AxetChatCancelVerdict,
  AxetChatProgress,
  AxetChatSendResult,
  AxetModelConfigResult,
  AxetModelEntry,
  AxetModelKind,
  AxetModelsListResult,
  ChatAttachmentPreviewResult,
  ChatAttachmentSaveResult,
  ChatExportResult,
  ChatSessionsLoadResult,
  ChatSessionsState,
  ConnectRequest,
  DictationResult,
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
  SapService,
  SapLogonOpenResult,
  SystemTier,
  SystemCommentDefaults,
  TerminalMode,
  UpdateStatus
} from "../shared/types";

const api = {
  getLandscape: () => ipcRenderer.invoke("landscape:get"),
  checkConnectivity: (service: SapService) => ipcRenderer.invoke("connectivity:check", service),
  connect: (req: ConnectRequest) => ipcRenderer.invoke("system:connect", req),
  getCredentialDefaults: (serviceUuid: string) => ipcRenderer.invoke("credentials:getDefaults", serviceUuid),
  // Aktif bağlam — üç ekranın ortak "neredeyiz" bilgisi (bkz.
  // main/activeContext.ts). Renderer SAP tarafını YAZAMIYOR, sadece okuyor
  // ve temizleyebiliyor; tek yazar başarılı bağlantının kendisi.
  getActiveContext: (): Promise<ActiveContext> => ipcRenderer.invoke("context:get"),
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
  addManualSystem: (input: AddManualSystemInput) => ipcRenderer.invoke("manualSystems:add", input),
  removeManualSystem: (id: string) => ipcRenderer.invoke("manualSystems:remove", id),
  updateManualSystem: (id: string, input: AddManualSystemInput) => ipcRenderer.invoke("manualSystems:update", id, input),
  exportManualSystems: () => ipcRenderer.invoke("manualSystems:exportToFile"),
  importManualSystems: () => ipcRenderer.invoke("manualSystems:importFromFile"),
  setSystemTier: (serviceUuid: string, tier: SystemTier | null) => ipcRenderer.invoke("systemTiers:set", serviceUuid, tier),
  setSystemComment: (serviceUuid: string, comment: string) => ipcRenderer.invoke("systemComments:set", serviceUuid, comment),
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
  // oturumlarını bununla eşliyor (bkz. axetChatTui.ts). `requestId` tek bir
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
    promptAtMs: number
  ): Promise<{ text: string; finished: boolean } | null> =>
    ipcRenderer.invoke("axetChat:recoverAnswer", cwd, prompt, promptAtMs),
  // `optionIndex` DİZİ olabiliyor: çoklu seçimli soru kutusunda birden fazla
  // şık işaretlenebiliyor (bkz. axetChatTui.ts `answerTuiQuestion`).
  answerChatQuestion: (
    requestId: string,
    optionIndex: number | number[],
    customText?: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("axetChat:answerQuestion", requestId, optionIndex, customText),
  closeChatSession: (chatId: string): Promise<void> => ipcRenderer.invoke("axetChat:closeSession", chatId),
  resetChatHistory: (chatId: string): Promise<boolean> =>
    ipcRenderer.invoke("axetChat:resetHistory", chatId),
  // Kullanıcı yazmaya başlayınca: oturumu/süreci şimdiden açtır. Sonucu YOK,
  // beklemek de gerekmiyor — kazanç tamamen zamanlamada.
  // `draft` = o an yazılmakta olan metin. Bağlayıcıların ısıtma sırasında
  // kurulup kurulmayacağı buna bakılarak kararlaştırılıyor.
  prewarmChat: (cwd: string, model: AxetModelEntry | null, chatId?: string, draft?: string): Promise<void> =>
    ipcRenderer.invoke("axetChat:prewarm", cwd, model, chatId, draft),
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
  // "Durdur"un sonucu. `requestId` DEĞİL `chatId` taşıyor: karar iptalden
  // 1–4 saniye sonra geliyor ve o noktada istek kimliği ölü (bkz.
  // axetChatTui.ts `cancelTui`).
  onChatCancelResult: (callback: (chatId: string, verdict: AxetChatCancelVerdict) => void) => {
    const listener = (_event: unknown, chatId: string, verdict: AxetChatCancelVerdict) =>
      callback(chatId, verdict);
    ipcRenderer.on("axetChat:cancelResult", listener);
    return () => ipcRenderer.removeListener("axetChat:cancelResult", listener);
  },
  saveChatAttachment: (fileName: string, base64Data: string): Promise<ChatAttachmentSaveResult> =>
    ipcRenderer.invoke("chatAttachments:save", fileName, base64Data),
  readChatAttachmentPreview: (filePath: string): Promise<ChatAttachmentPreviewResult> =>
    ipcRenderer.invoke("chatAttachments:preview", filePath),
  // Mikrofon (bkz. main/dictation.ts). Ses renderer'da 16kHz mono WAV olarak
  // kaydedilip base64 ile buradan geçiyor, metin geri dönüyor. Tanıma gömülü
  // whisper.cpp ile YEREL — ses makineden çıkmıyor.
  isDictationAvailable: (): Promise<boolean> => ipcRenderer.invoke("dictation:available"),
  transcribeDictation: (base64Wav: string, language: string): Promise<DictationResult> =>
    ipcRenderer.invoke("dictation:transcribe", base64Wav, language),
  loadChatSessions: (): Promise<ChatSessionsLoadResult> => ipcRenderer.invoke("chatSessions:load"),
  saveChatSessions: (state: ChatSessionsState): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("chatSessions:save", state),
  exportChatMarkdown: (suggestedName: string, markdown: string): Promise<ChatExportResult> =>
    ipcRenderer.invoke("chat:exportMarkdown", suggestedName, markdown),

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
    ipcRenderer.invoke("sapGuiScript:cancelAgentStep", requestId)
};

contextBridge.exposeInMainWorld("api", api);

export type AxetApi = typeof api;
