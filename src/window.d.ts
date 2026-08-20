import type {
  AddManualSystemInput,
  AppConfig,
  ConnectRequest,
  ConnectResult,
  ConnectivityResult,
  CredentialDefaults,
  FsImportFilesResult,
  FsListDirResult,
  FsReadDocxResult,
  FsReadImageResult,
  FsReadTextResult,
  ManualSystem,
  ManualSystemsExportResult,
  ManualSystemsImportResult,
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
  readDocxFile: (filePath: string) => Promise<FsReadDocxResult>;
  readImageDataUrl: (filePath: string) => Promise<FsReadImageResult>;
  openInExplorer: (filePath: string) => Promise<void>;
  openExternal: (filePath: string) => Promise<void>;
  importFiles: (destDir: string, sourcePaths: string[]) => Promise<FsImportFilesResult>;
  pickFiles: () => Promise<string[]>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getLastUpdateStatus: () => Promise<UpdateStatus>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    api: AxetApi;
  }
}

export {};
