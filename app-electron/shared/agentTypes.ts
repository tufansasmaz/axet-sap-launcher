// Ajan Alanı'nın ortak türleri (spec 2026-10-17 ajan-alani §3).
import { isMemoryKey } from "./memoryLogic";
import type { AgentErrorInfo, AgentRetryInfo, RetryBlock } from "./agentErrors";
//
// Ana süreç ve renderer aynı türleri kullanıyor; bu yüzden `shared` altında.
// Ajanın ADI, RENGİ ve KLASÖRÜ burada değil: ajan bir terminal bölmesi ve bu
// üçü bölmenin kendi alanları (`title`, `color`, `cwd`). Burada yalnız
// bölmeyi ajan yapan şey var: hangi motor, hangi rol.

export type AgentEngineId = "axet-code" | "claude" | "codex" | "gemini" | "ozel";

export const AGENT_ENGINE_IDS: readonly AgentEngineId[] = ["axet-code", "claude", "codex", "gemini", "ozel"];

export function isAgentEngineId(value: unknown): value is AgentEngineId {
  return typeof value === "string" && (AGENT_ENGINE_IDS as readonly string[]).includes(value);
}

/**
 * Rol nereden geldi: hazır listeden (`preset`), kullanıcının yazdığı metin
 * (`custom`) ya da axet-code'un kendi ajanı (`axetAgent`, `--agent <ad>` ile
 * başlatılıyor; spec §14.2).
 */
export type AgentRoleKind = "preset" | "custom" | "axetAgent";

export interface AgentSpec {
  engine: AgentEngineId;
  role: string;
  roleKind: AgentRoleKind;
  /** Yalnız model bayrağı bilinen motorlarda kullanılıyor (bkz. agentEngines.ts). */
  model?: string;
  /** Yalnız `ozel` motorda: kullanıcının yazdığı komut satırı. */
  command?: string;
  /** Kalıcı bellek anahtarı (spec 2026-10-18 ajan-bellegi §2, §5); yoksa bellek kapalı. */
  memory?: string;
  /** Tur 7: bu ajanı açan Lider bölmesi; yalnız o lider kapatabilir. Kullanıcının açtıklarında yok. */
  spawnedBy?: string;
}

/** Bölme kimliği (crypto.randomUUID) biçimi. */
const PANE_REF = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/;

export const AGENT_ROLE_MAX = 40;
export const AGENT_MODEL_MAX = 80;
export const AGENT_COMMAND_MAX = 300;

/** Eski `axet` bölmesinin dönüştüğü ajan: rolsüz axet-code. */
export const LEGACY_AXET_AGENT: AgentSpec = { engine: "axet-code", role: "", roleKind: "custom" };

/**
 * Kayıttan (config dosyası, IPC) gelen ajan alanını doğrular. Bozuksa `null`;
 * çağıran bölmeyi atlıyor. Dosya elle düzenlenebilir: hata fırlatmıyor.
 */
export function readAgentSpec(raw: unknown): AgentSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isAgentEngineId(record.engine)) return null;
  const roleKind: AgentRoleKind =
    record.roleKind === "preset" || record.roleKind === "axetAgent" ? record.roleKind : "custom";
  const role = typeof record.role === "string" ? record.role.trim().slice(0, AGENT_ROLE_MAX).trim() : "";
  const spec: AgentSpec = { engine: record.engine, role, roleKind };
  const model = typeof record.model === "string" ? record.model.trim().slice(0, AGENT_MODEL_MAX) : "";
  if (model) spec.model = model;
  // Geçersiz anahtar atılıyor (bellek kapalı sayılır); dosyaya dokunulmaz.
  if (isMemoryKey(record.memory)) spec.memory = record.memory;
  if (typeof record.spawnedBy === "string" && PANE_REF.test(record.spawnedBy)) spec.spawnedBy = record.spawnedBy;
  if (record.engine === "ozel") {
    const command = typeof record.command === "string" ? record.command.trim().slice(0, AGENT_COMMAND_MAX) : "";
    if (!command) return null;
    spec.command = command;
  }
  return spec;
}

/**
 * Motoru kurulu olmayan ajan bölmesinin başlatma hatası. Renderer bu işareti
 * görünce "Başlatılamadı" yerine "kurulu değil" yazıyor (spec §10).
 */
export const AGENT_ENGINE_MISSING = "AGENT_ENGINE_MISSING";

/**
 * `AgentStatus.detail`: axet-code açılışta araç/model seçim penceresinde
 * (Tur 4). Pencere açıkken yazılan istem kayboluyor; Akış mesajı kuyrukta bekler.
 */
export const AXET_SETUP_DETAIL = "setup";

export type AgentState ="running" | "idle" | "asking" | "finished" | "error" | "unknown";

/** `exact`: motorun kendi kaydından · `estimated`: terminal hareketinden (spec §2.5). */
export type AgentStatusSource = "exact" | "estimated";

/** Ajanın cevap bekleyen sorusu. `askedAt`: sorunun kayda düştüğü an (ms). */
export interface AgentQuestion {
  callId: string;
  question: string;
  header: string;
  options: string[];
  multiSelect: boolean;
  askedAt: number;
}

export interface AgentStatus {
  state: AgentState;
  source: AgentStatusSource;
  /** Son etkinlik (ms); bilinmiyorsa null. */
  lastActivity: number | null;
  question?: AgentQuestion;
  /** Kısa sebep (`end_turn`, `error`); içerik değil. */
  detail?: string;
  /**
   * Yalnız kesin kaynakta, boşta: ajanın son cevabının gizlisi süzülmüş özeti
   * (≤ 2000 karakter, Tur 6; spec 2026-10-18 ajanlar-ux §3). Bellek içi, diske yazılmaz.
   */
  reply?: string;
  /** Yalnız kesin kaynakta, çalışırken: ajanın şu anki aşaması (Tur 6). */
  phase?: AgentPhase;
  /**
   * Yalnız tahmini kaynakta: gönderilmiş bir istem ve ARDINDAN gelen çıktı
   * (Tur 6). `at` istemin anı; `done` istemden sonraki çıktı sakinleşti.
   * İstem yoksa yok: açılış ekranı, tuş yankısı, ekran yenilemesi tur değil.
   */
  turn?: AgentTurn;
  /** Kesin bağ neden yok (yalnız tahmini kaynakta; Tur 6). */
  link?: AgentLinkIssue;
  /** Tur 9: hatanın sınıfı ve kısa ayrıntısı (state "error"; motor hata yazıp kapandıysa "finished"). */
  error?: AgentErrorInfo;
  /** Tur 9: bu hata zincirinde gönderilmiş yeniden deneme ve sınır (izleyici ekliyor). */
  attempts?: number;
  maxAttempts?: number;
  /** Tur 9: bekleyen otomatik deneme (geri sayım). */
  retry?: AgentRetryInfo;
  /** Tur 9: otomatik deneme neden yok / durdu. */
  retryBlocked?: RetryBlock;
}

export type AgentPhaseKind = "thinking" | "tool" | "writing";

/** `tool`: normalize edilmiş araç adı; `target`: girdinin gizlisi süzülmüş kısa özeti. */
export interface AgentPhase {
  kind: AgentPhaseKind;
  tool?: string;
  target?: string;
}

export interface AgentTurn {
  at: number;
  done: boolean;
}

/**
 * `ambiguous`: istem birden çok oturumda · `noDb`: oturum kaydı yok/okunamıyor ·
 * `notFound`: istem 60 sn içinde kayda düşmedi · `unsupported`: motorun kesin okuyucusu yok.
 */
export type AgentLinkIssue = "ambiguous" | "noDb" | "notFound" | "unsupported";

export interface AgentStatusEvent {
  paneId: string;
  status: AgentStatus;
}

/** Renderer'ın bir ajan bölmesini izleyiciye kaydettirmesi (bkz. agentMonitor.ts). */
export interface AgentRegistration {
  paneId: string;
  ptyId: string;
  engine: AgentEngineId;
  cwd: string;
  /** Bölmeye ilk satır olarak yazılan komut (yankısı "motor kapandı" tespitinde aranıyor). */
  command: string;
  /** Bildirim başlığı: ajanın adı ya da motorun adı. */
  name: string;
  roleKind: AgentRoleKind;
  /** Alan bir SAP sistemine bağlı mı (yalnız günlük için). */
  sap: boolean;
  /** "+ Ajan" ile yeni eklendi mi (yeniden başlatma ya da geri yükleme değil). */
  added: boolean;
  /** Bölmenin çalışma alanı (Görev Panosu dağıtımı; spec 2026-10-18 gorev-panosu §5). */
  workspaceId?: string;
  /** Ajanın rolü (rol ipucu eşleşmesi). */
  role?: string;
}

export type AgentAnswerFailure = "noAgent" | "closed" | "notAnswerable" | "typing" | "writeFailed" | "alreadyAnswered";

export type AgentAnswerResult = { ok: true } | { ok: false; reason: AgentAnswerFailure };

export interface AgentEngineInfo {
  id: AgentEngineId;
  installed: boolean;
  /** Bölme açılmasın: kurulu değil ya da program bozuk. */
  blocked: boolean;
  /** Kartta gösterilecek kısa uyarı (ör. axet-code sürümü eski). */
  note?: string;
  /** Bulunan programın yolu (`where` ilk sonucu); bilinmiyorsa yok. */
  path?: string;
  /** `--version` (ya da npm kabuğunun package.json'u) okunabildiyse sürüm. */
  version?: string;
}

/** `axet-code agent list --json` satırı (spec §14.2). */
export interface AxetAgentEntry {
  name: string;
  scope: string;
  permissions: string;
  description: string;
}
