import type {
  ActiveContext,
  ActiveGuiContext,
  AddManualSystemInput,
  AppConfig,
  AxetChatMessage,
  AxetChatActivityPhase,
  AxetChatSendResult,
  AxetModelConfigResult,
  AxetModelEntry,
  AxetModelKind,
  AxetModelsListResult,
  ChatAttachmentPreviewResult,
  ChatAttachmentSaveResult,
  ChatSessionsLoadResult,
  ChatSessionsState,
  ConnectRequest,
  ConnectResult,
  ConnectivityResult,
  CredentialDefaults,
  DictationResult,
  FlowAgentStepResult,
  FlowDeployResult,
  FlowJsonFileResult,
  FlowJsonValue,
  FlowRuntimeStatus,
  FlowTestRequestPayload,
  FlowTestRequestResult,
  FlowTriggerInjectResult,
  FlowValidateResult,
  FsImportFilesResult,
  FsListDirResult,
  FsReadDocxResult,
  FsReadImageResult,
  FsReadTextResult,
  FsWriteTextResult,
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
  ManualSystem,
  ManualSystemsExportResult,
  ManualSystemsImportResult,
  ConnectorProvider,
  ConnectorTestResult,
  SapLandscape,
  SapService,
  SapLogonOpenResult,
  SystemTier,
  SystemCommentDefaults,
  TerminalMode,
  UpdateStatus
} from "../app-electron/shared/types";

export interface AxetApi {
  getLandscape: () => Promise<SapLandscape>;
  checkConnectivity: (service: SapService) => Promise<ConnectivityResult>;
  connect: (req: ConnectRequest) => Promise<ConnectResult>;
  getCredentialDefaults: (serviceUuid: string) => Promise<CredentialDefaults>;
  // Aktif bağlam — üç ekranın ortak "neredeyiz" bilgisi
  // (bkz. app-electron/main/activeContext.ts).
  getActiveContext: () => Promise<ActiveContext>;
  clearActiveSapContext: () => Promise<ActiveContext>;
  setActiveGuiContext: (gui: ActiveGuiContext | null) => Promise<ActiveContext>;
  onActiveContextChanged: (callback: (context: ActiveContext) => void) => () => void;
  getConfig: () => Promise<AppConfig>;
  saveConfig: (partial: Partial<AppConfig>) => Promise<AppConfig>;
  pickFolder: () => Promise<string | null>;
  addManualSystem: (input: AddManualSystemInput) => Promise<ManualSystem>;
  removeManualSystem: (id: string) => Promise<ManualSystem[]>;
  updateManualSystem: (id: string, input: AddManualSystemInput) => Promise<ManualSystem | null>;
  exportManualSystems: () => Promise<ManualSystemsExportResult>;
  importManualSystems: () => Promise<ManualSystemsImportResult>;
  setSystemTier: (serviceUuid: string, tier: SystemTier | null) => Promise<AppConfig>;
  setSystemComment: (serviceUuid: string, comment: string) => Promise<AppConfig>;
  getSystemCommentDefault: (serviceUuid: string) => Promise<SystemCommentDefaults>;
  openInSapLogon: (service: SapService) => Promise<SapLogonOpenResult>;
  windowMinimize: () => Promise<void>;
  windowToggleMaximize: () => Promise<boolean>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onWindowStateChanged: (callback: (isMaximized: boolean) => void) => () => void;
  createTerminal: (cwd: string, cols: number, rows: number, shell: TerminalMode, initialCommand?: string) => Promise<string>;
  writeTerminal: (id: string, data: string) => void;
  resizeTerminal: (id: string, cols: number, rows: number) => void;
  disposeTerminal: (id: string) => Promise<void>;
  getTerminalBuffer: (id: string) => Promise<string>;
  onTerminalData: (callback: (id: string, data: string) => void) => () => void;
  onTerminalExit: (callback: (id: string, exitCode: number) => void) => () => void;
  onTerminalReady: (callback: (id: string) => void) => () => void;
  getPathForFile: (file: File) => string;
  resolveProjectDir: (customerPath: string[], service: SapService) => Promise<string>;
  listDir: (dirPath: string) => Promise<FsListDirResult>;
  readTextFile: (filePath: string) => Promise<FsReadTextResult>;
  writeTextFile: (filePath: string, content: string) => Promise<FsWriteTextResult>;
  watchDir: (id: string, dirPath: string) => Promise<{ ok: boolean; error?: string }>;
  unwatchDir: (id: string) => Promise<{ ok: boolean }>;
  onFsChanged: (callback: (id: string) => void) => () => void;
  readDocxFile: (filePath: string) => Promise<FsReadDocxResult>;
  readImageDataUrl: (filePath: string) => Promise<FsReadImageResult>;
  openInExplorer: (filePath: string) => Promise<void>;
  openExternal: (filePath: string) => Promise<void>;
  openExternalUrl: (url: string) => Promise<{ ok: boolean; error?: string }>;
  discoverAxetFlowsLiveUrl: () => Promise<{ ok: boolean; url: string | null; port: number | null; error?: string }>;
  saveFlowToLiveHost: (flowArray: unknown[]) => Promise<{ ok: boolean; port?: number | null; error?: string }>;
  importFiles: (destDir: string, sourcePaths: string[]) => Promise<FsImportFilesResult>;
  pickFiles: () => Promise<string[]>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getLastUpdateStatus: () => Promise<UpdateStatus>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
  listAxetModels: () => Promise<AxetModelsListResult>;
  getAxetModelConfig: () => Promise<AxetModelConfigResult>;
  setAxetModel: (kind: AxetModelKind, entry: AxetModelEntry) => Promise<AxetModelConfigResult>;
  sendChatMessage: (
    requestId: string,
    chatId: string,
    cwd: string,
    model: AxetModelEntry | null,
    history: AxetChatMessage[],
    message: string
  ) => Promise<AxetChatSendResult>;
  cancelChatMessage: (requestId: string) => Promise<void>;
  closeChatSession: (chatId: string) => Promise<void>;
  prewarmChat: (cwd: string, model: AxetModelEntry | null, chatId?: string) => Promise<void>;
  // Abonelikten çıkma fonksiyonu döner (diğer `on*` köprüleriyle aynı desen).
  onChatChunk: (callback: (requestId: string, text: string) => void) => () => void;
  onChatActivity: (
    callback: (requestId: string, phase: AxetChatActivityPhase, detail?: string) => void
  ) => () => void;
  saveChatAttachment: (fileName: string, base64Data: string) => Promise<ChatAttachmentSaveResult>;
  readChatAttachmentPreview: (filePath: string) => Promise<ChatAttachmentPreviewResult>;
  isDictationAvailable: () => Promise<boolean>;
  transcribeDictation: (base64Wav: string, language: string) => Promise<DictationResult>;
  loadChatSessions: () => Promise<ChatSessionsLoadResult>;
  saveChatSessions: (state: ChatSessionsState) => Promise<{ ok: boolean; error?: string }>;

  testConnector: (requestId: string, provider: ConnectorProvider) => Promise<ConnectorTestResult>;
  cancelConnectorTest: (requestId: string) => Promise<{ ok: boolean }>;
  getConnectorMcpUrl: (provider: ConnectorProvider) => Promise<string>;
  setConnectorEnabled: (provider: ConnectorProvider, enabled: boolean) => Promise<{ ok: boolean; config: AppConfig }>;

  flowsAgentStep: (prompt: string, model: string | null, userText?: string) => Promise<FlowAgentStepResult>;
  flowsDeploy: (flowArray: FlowJsonValue[], mode?: string) => Promise<FlowDeployResult>;
  flowsRestart: () => Promise<FlowDeployResult>;
  flowsValidate: (flowArray: FlowJsonValue[]) => Promise<FlowValidateResult>;
  flowsStop: () => Promise<{ ok: boolean }>;
  flowsGetRuntimeStatus: () => Promise<FlowRuntimeStatus>;
  flowsTriggerInject: (nodeId: string) => Promise<FlowTriggerInjectResult>;
  flowsSendTestRequest: (payload: FlowTestRequestPayload) => Promise<FlowTestRequestResult>;
  flowsSaveJson: (jsonText: string) => Promise<FlowJsonFileResult>;
  flowsOpenJson: () => Promise<FlowJsonFileResult>;
  flowsExportDebugLog: (jsonText: string) => Promise<FlowJsonFileResult>;
  onFlowsRuntimeDebug: (callback: (entry: FlowJsonValue) => void) => () => void;
  onFlowsRuntimeStatus: (callback: (status: FlowJsonValue) => void) => () => void;
  onFlowsRuntimeLog: (callback: (entry: FlowJsonValue) => void) => () => void;
  onFlowsRuntimeTrace: (callback: (entry: FlowJsonValue) => void) => () => void;

  // ---------------------------- SAP GUI Scripting ----------------------------
  startGuiScriptBridge: () => Promise<GuiScriptStartResult>;
  stopGuiScriptBridge: () => Promise<{ ok: boolean }>;
  getGuiScriptBridgeStatus: () => Promise<GuiScriptBridgeStatus>;
  guiScriptPreflight: () => Promise<GuiScriptPreflightResult>;
  getGuiScriptScreen: (connIdx: number, sessIdx: number) => Promise<GuiScriptScreenResult>;
  /** connIdx/sessIdx `null` → oturumsuz `window` yakalama (scripting kapalıyken tek yol). */
  captureGuiScriptScreenshot: (connIdx: number | null, sessIdx: number | null, method: GuiScriptScreenshotMethod) => Promise<GuiScriptScreenshotResult>;
  listGuiScriptConnections: () => Promise<{ ok: boolean; connections?: GuiScriptConnectionInfo[]; error?: string }>;
  listGuiScriptSessions: (connIdx: number) => Promise<{ ok: boolean; sessions?: GuiScriptSessionInfo[]; error?: string }>;
  getGuiScriptNode: (connIdx: number, sessIdx: number, elementId: string | null, window?: { rows?: number; rowOffset?: number }) => Promise<{ ok: boolean; node?: GuiScriptComponentDetail; error?: string }>;
  performGuiScriptAction: (connIdx: number, sessIdx: number, payload: GuiScriptActionPayload) => Promise<GuiScriptActionResult>;
  saveGuiScriptScript: (jsonText: string, suggestedName?: string) => Promise<GuiScriptJsonFileResult>;
  openGuiScriptScript: () => Promise<GuiScriptJsonFileResult>;
  guiScriptAgentStep: (
    requestId: string,
    prompt: string,
    model: string | null,
    userText?: string
  ) => Promise<GuiScriptAgentStepResult>;
  cancelGuiScriptAgentStep: (requestId: string) => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    api: AxetApi;
  }
}

export {};
