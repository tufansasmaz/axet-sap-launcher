export interface SapService {
  uuid: string;
  systemId: string;
  name: string;
  type: string;
  host: string | null;
  port: number | null;
  raw: string;
  routerId: string | null;
  routerString: string | null;
  username: string | null;
  manualAdtUrl?: string | null;
  isManual?: boolean;
}

export interface SapItem {
  uuid: string;
  service: SapService | null;
}

export interface SapNode {
  uuid: string;
  name: string;
  nodes: SapNode[];
  items: SapItem[];
}

export interface SapLandscape {
  customers: SapNode[];
  sourceFile: string;
  loadedAt: string;
}

export type ConnectivityState = "unknown" | "checking" | "reachable" | "unreachable";

export interface ConnectivityResult {
  serviceUuid: string;
  state: ConnectivityState;
  message: string;
  latencyMs?: number;
}

export interface LastCredential {
  username: string;
  password: string;
  client: string;
}

export interface ConnectionHistoryEntry {
  uuid: string;
  connectedAt: string;
}

export type SystemTier = "DEV" | "QA" | "PRD";

export type TerminalMode = "cmd" | "powershell";

export type AppTheme = "dark" | "light";

export interface AppConfig {
  projectsBaseDir: string;
  axetCommand: string;
  terminal: TerminalMode;
  landscapePathOverride: string | null;
  lastCredentials: Record<string, LastCredential>;
  trustedCertificates: Record<string, string>;
  connectionHistory: ConnectionHistoryEntry[];
  systemTiers: Record<string, SystemTier>;
  theme: AppTheme;
  autoCheckUpdates: boolean;
}

export interface SystemCredentials {
  username: string;
  password: string;
  client: string;
}

export interface ConnectRequest {
  customerPath: string[];
  service: SapService;
  credentials: SystemCredentials;
}

export interface ConnectResult {
  ok: boolean;
  projectDir: string;
  message: string;
  verified: boolean;
  trustedCertificates?: Record<string, string>;
  effectiveClient?: string;
}

export interface CredentialDefaults {
  username: string;
  password: string;
  client: string;
}

export type ManualSystemType = "onprem" | "cloud";

export interface ManualSystem {
  id: string;
  name: string;
  systemId: string;
  type: ManualSystemType;
  host: string | null;
  diagPort: number | null;
  adtUrl: string | null;
  createdAt: string;
}

export interface AddManualSystemInput {
  name: string;
  systemId: string;
  type: ManualSystemType;
  host: string | null;
  diagPort: number | null;
  adtUrl: string | null;
}

export interface ManualSystemsExportResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

export interface ManualSystemsImportResult {
  ok: boolean;
  canceled?: boolean;
  imported?: number;
  skipped?: number;
  total?: number;
  error?: string;
}

export interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedAt: string;
}

export interface FsListDirResult {
  ok: boolean;
  entries?: FsEntry[];
  error?: string;
}

export interface FsReadTextResult {
  ok: boolean;
  content?: string;
  truncated?: boolean;
  error?: string;
}

export interface FsReadDocxResult {
  ok: boolean;
  html?: string;
  error?: string;
}

export interface FsReadImageResult {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

export interface FsImportFilesResult {
  ok: boolean;
  imported?: number;
  skippedDirs?: string[];
  error?: string;
}

export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatus {
  phase: UpdatePhase;
  version?: string;
  percent?: number;
  message?: string;
}
