// Ajan hatası: sınıf, kısa ayrıntı ve yeniden deneme kuralları (Tur 9). SAF.
//
// Ölçüm (.superpowers/olcum/hata/): axet-code sağlayıcı hatasını oturum
// kaydına `finish{reason:"error", message, details}` olarak yazıyor:
//   message "Too Many Requests"  details POST "<url>": 429 Too Many Requests {"message":"Too many tokens, please wait before trying again."}
//   message "Internal Server Error" (500) · "Forbidden" (403) · "Bad Request" (400: geçmiş bozuk / istem çok uzun)
//   message "Provider Error"  details "unexpected EOF" / "provider error after 4 attempts: unexpected EOF"
// axet-code 429'u kendisi 3 kez (2 sn, 4 sn) yeniliyor; Retry-After yok.
// Geçersiz model adıyla süreç hiç açılmıyor, terminale yazıp çıkıyor:
//   ERROR / Failed to override models: large model "x" not found.
// Claude Code / Codex / Gemini desenleri (ölçülmedi, yaygın çıktılar):
//   "API Error: 529 {...overloaded_error...}", "API Error (Request timed out.)",
//   "Invalid API key · Please run /login", "stream error: ...", "unexpected status 429",
//   "[API Error: ... RESOURCE_EXHAUSTED]".

export type AgentErrorClass = "unavailable" | "rateLimit" | "network" | "auth" | "model" | "context" | "history" | "policy" | "unknown";

export const AGENT_ERROR_CLASSES: readonly AgentErrorClass[] = ["unavailable", "rateLimit", "network", "auth", "model", "context", "history", "policy", "unknown"];

export function isAgentErrorClass(value: unknown): value is AgentErrorClass {
  return typeof value === "string" && (AGENT_ERROR_CLASSES as readonly string[]).includes(value);
}

export interface AgentErrorInfo {
  cls: AgentErrorClass;
  /** Ham iletinin gizlisi süzülmüş kısa hali (≤ ERROR_DETAIL_MAX). */
  detail: string;
  /** `exact`: motorun kaydından · `estimated`: terminalin son hata satırından. */
  source: "exact" | "estimated";
}

/** Otomatik deneme neden yapılmadı / durdu. */
export type RetryBlock = "permanent" | "exhausted" | "off" | "user" | "noPrompt" | "exited" | "cancelled" | "sendFailed";

/** Bekleyen otomatik deneme: `at` denemenin anı (ms). */
export interface AgentRetryInfo {
  attempt: number;
  max: number;
  at: number;
}

const RE_POLICY = /request_blocked|not allowed under the current security policy/i;
const RE_HISTORY = /tool_use[\s\S]{0,200}tool_result|tool_result[\s\S]{0,200}tool_use|No tool call found for function call output/i;
// HTTP kodu yalnız HTTP bağlamında ("…: 429 …", "status 429", "API Error: 529",
// "500 Internal"); çıplak sayı ("took 503 ms") başka bir şey olabilir.
const httpCode = (codes: string, words: string) =>
  new RegExp(
    `(?:status(?:[ _]?code)?|http(?:/[\\d.]+)?|API Error)\\s*[:=]?\\s*(?:${codes})\\b|:\\s*(?:${codes})(?=[\\s"'{}()[\\],.;]|$)|\\b(?:${codes})\\s+(?:${words})`,
    "i"
  );
const RE_RATE_CODE = httpCode("429", "too many");
const RE_AUTH_CODE = httpCode("401|403", "unauthori[sz]ed|forbidden");
const RE_UNAVAILABLE_CODE = httpCode("5\\d\\d", "internal|service|bad gateway|gateway|server");
const RE_RATE = /too many requests|too many tokens, please wait|please wait before trying again|rate.?limit|quota|resource.?exhausted|throttl/i;
const RE_CONTEXT = /prompt is too long|context (?:length|window)|maximum context|too many tokens/i;
const RE_MODEL =
  /model[^\n]{0,80}not found|not_found_error|model_not_found|unknown model|invalid model|no such model|Failed to override models|model[^\n]{0,40}does not exist/i;
const RE_AUTH =
  /unauthori[sz]ed|forbidden|invalid[_ ]?(?:api[_ ]?key|token|grant|x-api-key)|token (?:has )?expired|authentication|please run \/login|not logged in/i;
const RE_UNAVAILABLE =
  /overloaded|service unavailable|bad gateway|internal server error|gateway time-?out|server error|\bUNAVAILABLE\b|temporarily unavailable/i;
const RE_NETWORK =
  /\bEOF\b|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|timed? ?out|timeout|deadline exceeded|connection (?:error|refused|reset|closed)|network|socket hang up|stream disconnected|fetch failed|transport connection broken|no such host|tls handshake/i;

/** Hata metninin sınıfı. Sıra önemli: 429 "too many tokens" bağlam değil istek sınırı. */
export function classifyAgentError(text: string): AgentErrorClass {
  const s = text ?? "";
  if (RE_POLICY.test(s)) return "policy";
  if (RE_HISTORY.test(s)) return "history";
  if (RE_RATE.test(s) || RE_RATE_CODE.test(s)) return "rateLimit";
  if (RE_CONTEXT.test(s)) return "context";
  if (RE_MODEL.test(s)) return "model";
  if (RE_AUTH.test(s) || RE_AUTH_CODE.test(s)) return "auth";
  if (RE_UNAVAILABLE.test(s) || RE_UNAVAILABLE_CODE.test(s)) return "unavailable";
  if (RE_NETWORK.test(s)) return "network";
  return "unknown";
}

/** Kendiliğinden geçebilen hatalar: otomatik yeniden deneme yalnız bunlarda. */
export function isTransientError(cls: AgentErrorClass): boolean {
  return cls === "unavailable" || cls === "rateLimit" || cls === "network";
}

export const ERROR_DETAIL_MAX = 200;

/** Adres ve uzun jeton maskelenir, boşluk sıkıştırılır, kırpılır. Gizli süzgeç (redact) ana süreçte ayrıca. */
export function cleanErrorDetail(text: string): string {
  const s = String(text ?? "")
    .replace(/https?:\/\/[^\s"'<>]+/g, "<url>")
    .replace(/eyJ[\w-]{10,}(?:\.[\w-]+)*/g, "***")
    .replace(/[A-Za-z0-9_-]{32,}/g, "***")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > ERROR_DETAIL_MAX ? `${s.slice(0, ERROR_DETAIL_MAX - 1)}…` : s;
}

// Tur sonu (motor açık): yalnız motorların kendi hata biçimleri; cevap metnindeki
// sıradan "Error:" satırı (test çıktısı gibi) hata sayılmasın.
const RE_ERROR_TURN =
  /API Error|stream error|unexpected status \d{3}|Too Many Requests|overloaded_error|RESOURCE_EXHAUSTED|Invalid API key|Please run \/login|Request timed out|Connection error|[Qq]uota exceeded/;
// Motor kapandıysa (kabuk istemi döndü) "ERROR"/"Error:" başlığı da sayılır (axet-code biçimi).
const RE_ERROR_EXIT = new RegExp(`${RE_ERROR_TURN.source}|${/^\s*(?:[⎿✗✘×■!●]\s*)?(?:ERROR|Error)\b|Failed to override models/.source}`);
const SCAN_LINES = { turn: 8, exit: 10 } as const;

/**
 * Terminal metnindeki SON hata satırı (tahmini kaynak), yalnız son birkaç dolu
 * satırda. Yalnız başlık olan "ERROR" satırında ardından gelen ilk dolu satır
 * alınıyor (axet-code biçimi).
 */
export function scanTerminalError(text: string, mode: "turn" | "exit" = "exit"): string | null {
  const re = mode === "turn" ? RE_ERROR_TURN : RE_ERROR_EXIT;
  const lines = String(text ?? "")
    .split(/\r?\n|\r/)
    .map((l) => l.replace(/[│║┃╭╮╰╯─━]+/g, " ").trim())
    .filter(Boolean)
    .slice(-SCAN_LINES[mode]);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!re.test(lines[i])) continue;
    const line = /^(?:ERROR|Error):?$/.test(lines[i]) && lines[i + 1] ? lines[i + 1] : lines[i];
    return line.slice(0, 300);
  }
  return null;
}

/** Otomatik deneme bekleme süreleri (üstel); fazlası son değerin 3 katıyla büyür, 5 dk tavan. */
export const RETRY_DELAYS_MS = [10_000, 30_000, 90_000] as const;
const RETRY_DELAY_CAP_MS = 5 * 60_000;

/** `attempt` 1'den başlıyor. `rand` 0..1: ±%20 sapma (herkes aynı anda denemesin). */
export function retryDelayMs(attempt: number, rand: () => number = Math.random): number {
  const n = Math.max(1, Math.floor(attempt));
  const last = RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  const base = n <= RETRY_DELAYS_MS.length ? RETRY_DELAYS_MS[n - 1] : last * 3 ** (n - RETRY_DELAYS_MS.length);
  const jitter = 0.8 + 0.4 * Math.min(1, Math.max(0, rand()));
  return Math.round(Math.min(RETRY_DELAY_CAP_MS, base) * jitter);
}

export const RETRY_MAX_DEFAULT = 3;
export const RETRY_MAX_LIMIT = 5;

export function normalizeRetryMax(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= RETRY_MAX_LIMIT ? value : RETRY_MAX_DEFAULT;
}

export type RetryDecision = { auto: true; attempt: number } | { auto: false; reason: RetryBlock };

/** Yeni bir hata için karar. `attempts`: bu zincirde gönderilmiş deneme sayısı. */
export function decideRetry(input: { cls: AgentErrorClass; attempts: number; auto: boolean; max: number; alive: boolean }): RetryDecision {
  if (!input.alive) return { auto: false, reason: "exited" };
  if (!isTransientError(input.cls)) return { auto: false, reason: "permanent" };
  if (!input.auto) return { auto: false, reason: "off" };
  if (input.attempts >= input.max) return { auto: false, reason: "exhausted" };
  return { auto: true, attempt: input.attempts + 1 };
}

/**
 * Yeniden denemede ajana giden satır. axet-code oturumu korunuyor ve istem
 * kayıtta (ölçüm: hatadan sonra aynı oturuma yazılan mesajla tur sürüyor), aynı
 * istemi yinelemek yerine devam ettiriliyor. Öbür motorlarda son istem yineleniyor.
 */
export const AXET_CONTINUE_PROMPT = "Onceki adim bir servis hatasiyla kesildi; kaldigin yerden devam et.";

export function retryPromptFor(engine: string, lastPrompt: string | null | undefined): string | null {
  if (engine === "axet-code") return AXET_CONTINUE_PROMPT;
  const p = (lastPrompt ?? "").trim();
  return p ? p : null;
}

/** Aynı motor için aynı anda çalışan ajan sınırı (0 = sınırsız). Ölçüm: 429 anlarında 2–4 oturum çalışıyordu. */
export const CONCURRENCY_DEFAULT = 2;
export const CONCURRENCY_LIMIT = 8;

export function normalizeConcurrency(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= CONCURRENCY_LIMIT ? value : CONCURRENCY_DEFAULT;
}

/** Takılma bildirimi eşiği (dk; 0 = kapalı). */
export const STALL_MINUTES_DEFAULT = 10;
export const STALL_MINUTES_OPTIONS = [0, 5, 10, 20, 30] as const;

export function normalizeStallMinutes(value: unknown): number {
  return typeof value === "number" && (STALL_MINUTES_OPTIONS as readonly number[]).includes(value) ? value : STALL_MINUTES_DEFAULT;
}

/** Akış "error" olayının `detail` biçimi (kalıcı kayıtta şema değişmesin): `err|<sınıf>|<n>/<m>|<ayrıntı>`. */
const FLOW_ERR = "err|";

export function flowErrorDetail(info: { cls: AgentErrorClass; attempts?: number; max?: number; detail: string }): string {
  const tries = info.attempts && info.max ? `${info.attempts}/${info.max}` : "";
  return `${FLOW_ERR}${info.cls}|${tries}|${info.detail.replace(/\|/g, "/")}`;
}

export function parseFlowErrorDetail(detail: string): { cls: AgentErrorClass; attempts: number; max: number; detail: string } | null {
  if (!detail?.startsWith(FLOW_ERR)) return null;
  const [cls, tries, ...rest] = detail.slice(FLOW_ERR.length).split("|");
  if (!isAgentErrorClass(cls)) return null;
  const [a, m] = (tries ?? "").split("/").map((x) => Number.parseInt(x, 10));
  return { cls, attempts: Number.isFinite(a) ? a : 0, max: Number.isFinite(m) ? m : 0, detail: rest.join("|") };
}

/** Lidere giden satırlarda sınıf (ASCII; ajan istemleri ASCII). */
export const LEAD_ERROR_LABEL: Record<AgentErrorClass, string> = {
  unavailable: "servis gecici kapali",
  rateLimit: "istek siniri (429)",
  network: "ag / zaman asimi",
  auth: "kimlik / yetki",
  model: "model bulunamadi",
  context: "baglam doldu",
  history: "oturum gecmisi bozuk",
  policy: "guvenlik politikasi engeli",
  unknown: "bilinmeyen hata"
};

/** Lidere öneri: geçici tükendi → başka ajan; kalıcı → kullanıcı. */
export function leadErrorAdvice(cls: AgentErrorClass): string {
  if (cls === "rateLimit") return "Oneri: biraz bekleyip yeniden ata ya da bostaki baska ajana ver; ekip kalabaliksa yeni ajan acma, isleri sirayla calistir.";
  if (isTransientError(cls)) return "Oneri: gorevi bostaki baska ajana ver (ntt-team assign) ya da yeni ajan ac (ntt-team spawn).";
  if (cls === "model" || cls === "auth" || cls === "policy") return "Oneri: kalici hata; kullaniciya bildir (Ayarlar > axet-code modeli / oturum). Yeniden atama ise yaramaz.";
  if (cls === "history" || cls === "context") return "Oneri: bu ajanin oturumu kullanilamaz; gorevi bostaki baska ajana ya da yeni ajana ver.";
  return "Oneri: nedeni ntt-team status ile oku; yeniden ata, baska ajana ver ya da yeni ajan ac.";
}
