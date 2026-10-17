// Görev panosunun ortak türleri (spec 2026-10-18 gorev-panosu §2).
//
// Ana süreç (yönetici, depo) ve renderer (pano ekranı) aynı türleri
// kullanıyor; bu yüzden `shared` altında. Pano alan başına; diskte
// `userData/boards/<workspaceId>.json`. Proje klasörüne dosya yazılmaz.

export type TaskState = "draft" | "awaitingApproval" | "running" | "done" | "stuck";

export type SubtaskState = "waiting" | "ready" | "running" | "asking" | "verifying" | "done" | "failed";

export const SUBTASK_STATES: readonly SubtaskState[] = ["waiting", "ready", "running", "asking", "verifying", "done", "failed"];

/** Kartın küçük notu. Metin renderer'da i18n'den (spec §2 `note`). */
export type SubtaskNote = "agentClosed" | "restarted" | "agentError" | "timeout" | "sentBack" | "promptAborted";

export const SUBTASK_NOTES: readonly SubtaskNote[] = ["agentClosed", "restarted", "agentError", "timeout", "sentBack", "promptAborted"];

/** Lider neden plan üretemedi (spec §3, §7). */
export type LeadErrorCode =
  | "binary"
  | "failed"
  | "timeout"
  | "noJson"
  | "badJson"
  | "noSubtasks"
  | "tooMany"
  | "badField"
  | "badDependency"
  | "cycle";

export const LEAD_ERROR_CODES: readonly LeadErrorCode[] = [
  "binary",
  "failed",
  "timeout",
  "noJson",
  "badJson",
  "noSubtasks",
  "tooMany",
  "badField",
  "badDependency",
  "cycle"
];

export interface ProofCommand {
  command: string;
  exitCode: number | null;
  durationMs: number;
  /** Çıktının son 40 satırı, ≤ 8 KB. */
  tail: string;
  timedOut?: boolean;
  /** Komut hiç başlamadı: klasör yok ya da süreç açılamadı. */
  error?: "missingDir" | "spawn";
}

export interface Proof {
  kind: "commands" | "manual";
  commands: ProofCommand[];
  /** `manual` için her zaman true; ekranda yeşil onay gibi gösterilmez. */
  ok: boolean;
  at: number;
}

export interface Subtask {
  id: string;
  title: string;
  /** Ajana gidecek istem; gönderilirken tek satıra indiriliyor. */
  prompt: string;
  roleHint: string;
  /** Aynı görevdeki alt görev kimlikleri. */
  dependsOn: string[];
  state: SubtaskState;
  /** Atanan ajanın bölmesi. */
  paneId: string | null;
  note?: SubtaskNote;
  proof?: Proof;
  /** Ajana kaç kez gönderildi. */
  attempts: number;
  /** true iken dağıtıcı atlıyor (ajan kapandı / uygulama yeniden başladı). */
  held?: boolean;
  /** Son gönderim anı (ms); "iş bitti" tanımada kullanılıyor. */
  dispatchedAt?: number;
  /** Gönderimden sonra ajan bir kez çalışırken/soru sorarken görüldü. */
  sawBusy?: boolean;
}

export interface BoardTask {
  id: string;
  title: string;
  /** Kullanıcının yazdığı hedef. */
  goal: string;
  state: TaskState;
  createdAt: number;
  subtasks: Subtask[];
  /** Onay anı; tanımsızsa görev taslakta (plan ekledi: stuck onaydan önce de olabiliyor). */
  approvedAt?: number;
  leadError?: LeadErrorCode;
  /** Ana süreçten gelen açıklama (axet-code sürüm mesajı, hata metni), ≤ 500. */
  leadDetail?: string;
  /** Lider cevabı, ≤ 8 KB; yalnız hata ayıklama için, katlı. */
  leadRaw?: string;
  /** Lider planlarken depoda dosya değişti (git status farkı). */
  leadChangedFiles?: boolean;
  /** Lider şu an çalışıyor. Yalnız bellekte; diske yazılmaz. */
  planning?: boolean;
}

export interface Board {
  workspaceId: string;
  tasks: BoardTask[];
  /** Pano dosyası bozuktu ve bu adla kenara alındı (spec §7). */
  recoveredFrom?: string;
  /** Dosya okunamadı ve kenara da alınamadı: üzerine yazılmıyor, komutlar reddediliyor. */
  unreadable?: boolean;
}

export const TASK_TITLE_MAX = 80;
export const TASK_GOAL_MAX = 2000;
export const SUBTASK_TITLE_MAX = 80;
export const SUBTASK_PROMPT_MAX = 4000;
export const ROLE_HINT_MAX = 40;
export const MAX_SUBTASKS = 8;
export const LEAD_RAW_MAX = 8192;
export const LEAD_DETAIL_MAX = 500;
/** Pano başına görev sınırı (plan ekledi; dosya sınırsız büyümesin). */
export const MAX_TASKS = 50;
