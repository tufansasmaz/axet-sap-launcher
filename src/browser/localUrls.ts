// Ajan çıktısındaki adresler (Tur 7): kesin kaynakta son cevap/aşama metni,
// terminal çıktısında ANSI temizlenmiş satırlar. SAF yardımcılar; React yok.
//
// Kurallar:
//   - Yalnız yerel geliştirme adresleri otomatik açılır: http(s)://localhost,
//     127.0.0.1, [::1]; 0.0.0.0 (dinleme adresi) localhost'a çevrilir.
//     Port isteğe bağlı ama varsa 1–65535; yol isteğe bağlı.
//   - Uzak adresler otomatik AÇILMAZ (yalnız Akış kartında "Tarayıcıda aç").
//   - Gizli parametreler (`?token=`, `#access_token=` …) `readBrowserUrl`
//     (browserLogic) üzerinden atılır; kimlik bilgili adres reddedilir.
//   - Aynı adres ajan oturumu (pty) başına bir kez.
import { readBrowserUrl } from "../../app-electron/shared/browserLogic";

export interface FoundUrl {
  url: string;
  local: boolean;
}

/** Bir satırdan/metinden en çok bu kadar adres (çıktı yağmuruna karşı). */
export const URLS_PER_TEXT = 5;
/** Terminal satır tamponunun taşınan yarım satırı (karakter). */
export const LINE_CARRY_MAX = 4_096;

// İmleç hareketi (CUP/CUU/CUD/CUF/CUB/CNL/CPL/CHA/VPA) satır sonu sayılıyor: TUI'ler
// satırları yeni satır karakteri yerine imleç konumlayarak çiziyor. Öbür CSI/OSC/tek
// karakterlik kaçışlar siliniyor.
export function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[A-HJdf]/g, "\n")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[@-_]/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

const URL_RE = /https?:\/\/(?:\[[0-9a-fA-F:.]+\](?::\d*)?|[^\s/?#"'<>`()[\]{}|\\^]+)(?:[/?#][^\s"'<>`{}|\\^]*)?/gi;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/** Cümle sonu noktalama ve kapanan parantez/tırnak adrese dahil değil. */
function trimTail(raw: string): string {
  let s = raw;
  for (;;) {
    const last = s.slice(-1);
    if (/[.,;:!?'"]/.test(last)) s = s.slice(0, -1);
    else if (last === ")" && (s.match(/\(/g)?.length ?? 0) < (s.match(/\)/g)?.length ?? 0)) s = s.slice(0, -1);
    else if (last === "]" && !/^https?:\/\/\[[^\]]*\]$/i.test(s) && (s.match(/\[/g)?.length ?? 0) < (s.match(/\]/g)?.length ?? 0)) s = s.slice(0, -1);
    else return s;
  }
}

/** Metindeki http(s) adresleri; gizli parametreleri atılmış, tekilleştirilmiş, sırayla. */
export function findUrls(text: string): FoundUrl[] {
  const out: FoundUrl[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(URL_RE)) {
    if (out.length >= URLS_PER_TEXT) break;
    const candidate = trimTail(match[0]);
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }
    // Açık port 0 (URL ayrıştırıcısı 65535 üstünü zaten reddediyor).
    const portMatch = /^https?:\/\/(?:\[[^\]]*\]|[^/:?#]+):(\d+)/i.exec(candidate);
    if (portMatch && (Number(portMatch[1]) < 1 || Number(portMatch[1]) > 65_535)) continue;
    const host = parsed.hostname.toLowerCase();
    const local = LOCAL_HOSTS.has(host);
    if (host === "0.0.0.0") parsed.hostname = "localhost";
    const url = readBrowserUrl(parsed.toString());
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, local });
  }
  return out;
}

/**
 * Bir pty'nin çıktısını satırlara böler (ANSI temizlenmiş). Yarım kalan son
 * satır taşınıyor (en çok LINE_CARRY_MAX); `feed` yalnız TAMAMLANAN satırları döndürür.
 */
export class LineSplitter {
  private carry = "";

  feed(data: string): string[] {
    const text = this.carry + stripAnsi(data);
    const parts = text.split(/\r\n|\r|\n/);
    this.carry = (parts.pop() ?? "").slice(-LINE_CARRY_MAX);
    return parts.filter((line) => line.trim() !== "");
  }
}

/** Ajan oturumu (pty) başına bir kez: ilk görüşte true. */
export class OncePerSession {
  private seen = new Set<string>();

  first(session: string, url: string): boolean {
    const key = `${session}\u0000${url}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }

  /** Oturum kapandı: kayıtlarını unut (bellek büyümesin). */
  forget(session: string): void {
    const prefix = `${session}\u0000`;
    for (const key of this.seen) if (key.startsWith(prefix)) this.seen.delete(key);
  }
}

export interface AutoOpenContext {
  /** Ayarlar → "Yerel adresleri tarayıcıda otomatik aç". */
  enabled: boolean;
  /** Ajanın ekibi seçili ekip mi ve Ajanlar ekranı görünüyor mu. */
  teamVisible: boolean;
  /** Kullanıcı şu an başka bir yerde yazıyor (odak düzenlenebilir alanda, son tuş yakın). */
  userTyping: boolean;
  /** Ekip zaten Tarayıcı görünümünde. */
  browserShown: boolean;
}

/**
 * `open`: sayfayı yükle. `switchView`: Tarayıcı görünümüne geç (yoksa rozet).
 * `card`: Akış kartı ("Tarayıcıda açıldı" ya da yalnız "Tarayıcıda aç" düğmesi).
 */
export interface AutoOpenPlan {
  open: boolean;
  switchView: boolean;
  badge: boolean;
  card: "opened" | "link" | null;
}

export function autoOpenPlan(found: FoundUrl, ctx: AutoOpenContext): AutoOpenPlan {
  if (!found.local || !ctx.enabled) return { open: false, switchView: false, badge: false, card: "link" };
  if (ctx.browserShown) return { open: true, switchView: false, badge: false, card: "opened" };
  const switchView = ctx.teamVisible && !ctx.userTyping;
  return { open: true, switchView, badge: !switchView, card: "opened" };
}

/** Odak düzenlenebilir bir alanda mı (input, textarea, contenteditable, xterm). */
/** DOM öğesinin yalnız gereken yüzü (testler DOM'suz çalışabilsin). */
export interface FocusLike {
  tagName: string;
  getAttribute(name: string): string | null;
  isContentEditable?: boolean;
}

export function isEditableFocus(el: FocusLike | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    return !["button", "checkbox", "radio", "submit", "reset", "range", "color", "file"].includes(type);
  }
  return el.isContentEditable === true;
}

/** Yazıyor sayılmak için son tuşun en çok bu kadar eski olması (ms). */
export const TYPING_WINDOW_MS = 4_000;

/** Yükleme bağlantı hatasıyla düştüyse (port henüz dinlemiyor) yeniden deneme planı. */
export const AUTO_RETRY_DELAYS_MS: readonly number[] = [1_500, 3_000, 5_000];
