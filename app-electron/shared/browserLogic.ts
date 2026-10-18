// Yerlesik tarayicinin saf mantigi (spec 2026-10-18 tarayici §2-§7). Ana
// surec, preload ve renderer ayni fonksiyonlari kullaniyor; Electron'a ve
// Node'a dokunmuyor.
import type { AgentStatus } from "./agentTypes";
import type { SavedTerminalWorkspace } from "./types";

/** Uygulamanin varsayilan oturum undan, SAML'den ve Node-RED'den ayri oturum (§4.2). */
export const BROWSER_PARTITION = "persist:ntt-tarayici";
export const BROWSER_URL_MAX = 2048;
export const BROWSER_TITLE_MAX = 120;
export const BROWSER_SELECTION_MAX = 2000;
/** agentMonitor.sendPrompt'un ust siniri (UTF-16 birimi); asan istemi "invalid" diye reddediyor. */
export const BROWSER_PROMPT_MAX = 4000;
export const SCREENSHOT_MAX_BYTES = 10 * 1024 * 1024;
export const SCREENSHOT_DIR = ".ntt-studio/tarayici";
export const SCREENSHOT_NAME_TRIES = 20;
export const SELECTION_TIMEOUT_MS = 2_000;
export const CAPTURE_TIMEOUT_MS = 5_000;
/** Secili metin sayfanin kendi betiklerinden ayri bir dunyada okunuyor (getSelection'i degistiremesın). */
export const BROWSER_SELECTION_WORLD = 1999;

export type AddressFailure = "empty" | "scheme" | "invalid" | "tooLong";
export type AddressResult = { ok: true; url: string } | { ok: false; reason: AddressFailure };

export type BrowserShortcut = "focusAddress" | "back" | "forward";
export interface KeyInput {
  type?: string;
  key: string;
  control: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export type BrowserSendFailure =
  | "invalid"
  | "noWorkspace"
  | "noAgent"
  | "notRunning"
  | "busy"
  | "asking"
  | "typing"
  | "noPage"
  | "pageBusy"
  | "noRoot"
  | "captureFailed"
  | "tooLarge"
  | "writeFailed"
  // Metin ajanin istem satirina yazildi ama Enter basilmadi (kullanici arada yazdi):
  // metin satirda duruyor, ekran goruntusu bu yuzden silinmiyor.
  | "notSubmitted";
export const BROWSER_SEND_FAILURES: readonly BrowserSendFailure[] = [
  "invalid",
  "noWorkspace",
  "noAgent",
  "notRunning",
  "busy",
  "asking",
  "typing",
  "noPage",
  "pageBusy",
  "noRoot",
  "captureFailed",
  "tooLarge",
  "writeFailed",
  "notSubmitted"
];
export type BrowserSendResult = { ok: true; screenshot: string | null } | { ok: false; reason: BrowserSendFailure };

export type LoadErrorKind = "dns" | "connection" | "certificate" | "other";

export interface BrowserAgentPresence {
  status: AgentStatus | null;
  inputIdle: boolean;
  engineReady: boolean;
}

export interface BrowserPromptInput {
  title: string;
  url: string;
  selection: string;
  screenshot: string | null;
}

const WEB = /^https?:\/\//i;
// "localhost:5173" sema degil: iki noktadan sonra rakam port demek.
const SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseWeb(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname ? url : null;
  } catch {
    return null;
  }
}

/** §4.4: ana cerceve yalniz ana makinesi olan http/https adresine gidebilir. */
export function isBrowserNavAllowed(raw: unknown): raw is string {
  return typeof raw === "string" && parseWeb(raw) !== null;
}

/**
 * §2: adres alani. http(s) oldugu gibi; semasiz girdi bosluksuzsa ve nokta ya
 * da localhost iceriyorsa tamamlaniyor (localhost/127.0.0.1/[::1] -> http,
 * gerisi https). Baska sema, bosluklu girdi, yol: "scheme". Arama motoruna
 * yonlendirme YOK.
 */
export function normalizeAddress(input: string): AddressResult {
  const text = input.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > BROWSER_URL_MAX) return { ok: false, reason: "tooLong" };
  let candidate = text;
  if (!WEB.test(text)) {
    if (/\s/.test(text) || SCHEME.test(text) || /^[\\/]/.test(text)) return { ok: false, reason: "scheme" };
    const host = text.split(/[/?#]/, 1)[0].toLowerCase();
    const hostName = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
    const local = LOCAL_HOSTS.has(hostName);
    if (!local && !hostName.includes(".")) return { ok: false, reason: "scheme" };
    candidate = `${local ? "http" : "https"}://${text}`;
  }
  const url = parseWeb(candidate);
  if (!url) return { ok: false, reason: WEB.test(text) ? "invalid" : "scheme" };
  if (url.href.length > BROWSER_URL_MAX) return { ok: false, reason: "tooLong" };
  return { ok: true, url: url.href };
}

/** §2, §5: kayittaki son adres. Kullanici adi/parola tasıyan adres config'e yazilmiyor. */
export function readBrowserUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length > BROWSER_URL_MAX) return undefined;
  const url = parseWeb(raw);
  if (!url || url.username || url.password) return undefined;
  return withoutSecrets(raw, url);
}

// Erişim anahtarı, giriş kodu, parola, imza taşıyan parametreler: son adrese ve
// ajana giden isteme yazılmıyor (OAuth dönüşü `?code=`, `#access_token=` gibi).
// Fiori rotası (`#Nesne-eylem?Alan=1`) korunur, yalnız hassas parametre atılır.
const SECRET_PARAM =
  /^(access_token|id_token|refresh_token|token|code|password|passwd|pwd|secret|client_secret|sig|signature|samlrequest|samlresponse|assertion|api[_-]?key|sap-password|mysapsso2)$/i;

function dropSecretParams(query: string): { query: string; changed: boolean } {
  const parts = query.split("&");
  const kept = parts.filter((part) => {
    const key = part.split("=")[0];
    let name = key;
    try {
      name = decodeURIComponent(key);
    } catch {
      // bozuk kodlama: adı olduğu gibi denetle
    }
    return !SECRET_PARAM.test(name);
  });
  return { query: kept.join("&"), changed: kept.length !== parts.length };
}

function withoutSecrets(raw: string, url: URL): string {
  let changed = false;
  if (url.search) {
    const q = dropSecretParams(url.search.slice(1));
    if (q.changed) {
      url.search = q.query ? `?${q.query}` : "";
      changed = true;
    }
  }
  if (url.hash) {
    const hash = url.hash.slice(1);
    const at = hash.indexOf("?");
    // `#a=1&b=2` (parametre listesi) ya da `#Rota?a=1` (Fiori).
    const route = at >= 0 ? hash.slice(0, at) : hash.includes("=") ? "" : hash;
    const params = at >= 0 ? hash.slice(at + 1) : hash.includes("=") ? hash : "";
    if (params) {
      const q = dropSecretParams(params);
      if (q.changed) {
        const next = q.query ? (route ? `${route}?${q.query}` : q.query) : route;
        url.hash = next ? `#${next}` : "";
        changed = true;
      }
    }
  }
  return changed ? url.href : raw;
}

function withoutCredentials(raw: string): string {
  const url = parseWeb(raw);
  if (!url) return raw;
  url.username = "";
  url.password = "";
  return withoutSecrets(url.href, url);
}

// C0, DEL, C1 ve Unicode satir/paragraf ayiricilari: sendPrompt bunlari reddediyor.
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2028\u2029\u2060-\u2064\u2066-\u2069\ufeff]/g;

/** Denetim karakterleri bosluga, bosluklarteklestir, `max` kod noktasinda "…" ile kirpilir. */
export function cleanText(text: string, max: number): string {
  const flat = text.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  const points = Array.from(flat);
  if (points.length <= max) return flat;
  return `${points.slice(0, max - 1).join("").trimEnd()}…`;
}

/** Sayfadan gelen metinde `\` -> `\\`, `"` -> `\"`: `Secili metin: "..."` cercevesi kirilmasin. */
const escapePiece = (ch: string): string => (ch === "\\" || ch === '"' ? `\\${ch}` : ch);
const escapeQuotes = (text: string): string => text.replace(/[\\"]/g, escapePiece);

/**
 * Kacislanmis metni UTF-16 butcesine sigdirir: kod noktasi ve kacis cifti
 * (`\"`, `\\`) bolunmuyor; sigmazsa bos.
 */
function fitEscaped(text: string, room: number): string {
  const escaped = escapeQuotes(text);
  if (escaped.length <= room) return escaped;
  if (room < 2) return "";
  let out = "";
  for (const ch of text) {
    const piece = escapePiece(ch);
    if (out.length + piece.length > room - 1) break;
    out += piece;
  }
  return `${out.trimEnd()}…`;
}

const SELECTION_FRAME = ' Secili metin: ""'.length;

/**
 * §3: ajanin istem satirina yazilacak TEK satir. `[Tarayici]` oneki `!`/`/`
 * ile baslama yi engelliyor. Toplam BROWSER_PROMPT_MAX'i asmıyor: sigmazsa
 * secili metin kisaliyor. Baslik ve secili metindeki `"` ve `\` kacislaniyor.
 */
export function buildBrowserPrompt(input: BrowserPromptInput): string {
  const title = escapeQuotes(cleanText(input.title, BROWSER_TITLE_MAX));
  const url = cleanText(withoutCredentials(input.url), BROWSER_URL_MAX);
  let text = `[Tarayici] ${title ? `${title} ` : ""}${url}`;
  const tail = input.screenshot ? ` Ekran goruntusu: ${input.screenshot}` : "";
  const selection = fitEscaped(cleanText(input.selection, BROWSER_SELECTION_MAX), BROWSER_PROMPT_MAX - text.length - tail.length - SELECTION_FRAME);
  if (selection) text += ` Secili metin: "${selection}"`;
  return text + tail;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** §3: alan kokune goreli `.ntt-studio/tarayici/<yyyyMMdd-HHmmss>[-n].png` (yerel saat). */
export function screenshotRelPath(now: Date, n = 1): string {
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${SCREENSHOT_DIR}/${stamp}${n > 1 ? `-${n}` : ""}.png`;
}

const CONNECTION_CODES = new Set([-7, -100, -101, -102, -104, -106, -109, -118, -130, -324]);

/** §6: Chromium ag hata kodu -> govdedeki mesaj. ERR_ABORTED (-3) yeni gezinme ya da Dur: mesaj yok. */
export function loadErrorKind(code: number): LoadErrorKind | null {
  if (code === -3) return null;
  if (code === -105 || code === -137) return "dns";
  if (code <= -200 && code > -300) return "certificate";
  if (CONNECTION_CODES.has(code)) return "connection";
  return "other";
}

/** §7: Ctrl+L adres alani, Alt+Sol/Sag geri/ileri. Baska hicbir tus (Ctrl+V dahil) yakalanmiyor. */
export function browserShortcutOf(input: KeyInput): BrowserShortcut | null {
  if (input.type !== undefined && input.type !== "keyDown") return null;
  if (input.shift || input.meta) return null;
  if (input.control && !input.alt && input.key.toLowerCase() === "l") return "focusAddress";
  if (input.alt && !input.control) {
    if (input.key === "ArrowLeft") return "back";
    if (input.key === "ArrowRight") return "forward";
  }
  return null;
}

/**
 * §3: ajan su an istem alabilir mi? sendPrompt "calisiyor" durumunu
 * denetlemiyor (pano kendi kuralini uyguluyor); tarayici calisan ajana yazmiyor.
 */
export function browserAgentGate(agent: BrowserAgentPresence | null): BrowserSendFailure | null {
  if (!agent) return "noAgent";
  if (!agent.engineReady || !agent.status || agent.status.state === "finished") return "notRunning";
  if (agent.status.state === "asking") return "asking";
  if (agent.status.state === "running") return "busy";
  if (!agent.inputIdle) return "typing";
  return null;
}

/** §3: ekran goruntusunun koku alan kayitindaki `root` (yedek klasor DEGIL); alan yoksa null. */
export function browserWorkspace(workspaces: readonly SavedTerminalWorkspace[], id: string): { root: string | null } | null {
  const workspace = workspaces.find((w) => w.id === id);
  if (!workspace) return null;
  return { root: workspace.root?.trim() || null };
}
