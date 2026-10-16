// axet-code oturum veritabanındaki araç çağrılarını ve sonuçlarını sohbet
// olaylarına çeviren SAF yardımcılar. Başsız köprü (axetHeadless.ts) ve
// axetChat.ts tarafından paylaşılıyor (spec 2026-10-16 basiz-kopru).
import { mt } from "./i18n";

// ---------------------------------------------------------------------------
// Araç adları
// ---------------------------------------------------------------------------
// Ham ad renderer'a olduğu gibi gidiyor; Türkçe/İngilizce karşılığı orada
// (i18n sözlüğünde) bulunuyor. Bilinmeyen bir araç adı da olduğu gibi
// gösterilebilsin diye burada çeviri YAPILMIYOR.
export function normalizeToolName(raw: string): string {
  // MCP araçları `mcp_conn_<uuid>_<ad>` biçiminde geliyor; uuid'nin arayüzde
  // hiçbir anlamı yok.
  const mcp = /^mcp_conn_[0-9a-f-]{8,}_(.+)$/i.exec(raw);
  if (mcp) return `mcp:${mcp[1]}`;
  return raw;
}

// ---------------------------------------------------------------------------
// Araç girdisi ve sonucu — "ne üstünde çalışıyor" ve "ne çıktı"
// ---------------------------------------------------------------------------
// Kullanıcı isteği (2026-09-04): gösterge terminaldeki gibi olsun —
//
//   ● Searching for textarea|composer|rows=|scrollHeight
//     ⎿  "textarea|composer|rows=|scrollHeight"
//
// Yani sadece aracın adı değil, ÜZERİNDE ÇALIŞTIĞI ŞEY de görünmeli. Bilgi
// zaten elimizde: axet-code her `tool_call`'un girdisini oturum veritabanına
// JSON metni olarak yazıyor, biz o kayıtları turda zaten okuyoruz.
//
// Alan adları araca göre değişiyor ve SÜRÜME BAĞLI. Bu yüzden sabit bir şema
// beklemiyoruz: bilinen adlar sırayla deneniyor, hiçbiri tutmazsa girdideki
// ilk anlamlı metin alınıyor. Böylece yarın eklenecek bir araç "adsız" değil,
// sadece daha kaba bir özetle görünür.
export const TARGET_KEYS = [
  "command",
  "pattern",
  "file_path",
  "filePath",
  "path",
  "filename",
  "file",
  "url",
  "query",
  "user_prompt",
  "prompt",
  "description"
];

/** Göstergedeki tek satır için üst sınır. Uzun bir bash komutu satırı taşırmasın. */
export const TARGET_MAX = 90;

export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** `tool_call` girdisinden gösterilecek tek satırlık hedef. Çıkarılamazsa boş. */
export function summarizeToolInput(input: string | undefined): string {
  if (!input) return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    // Girdi her zaman JSON olmayabilir; ham hâli de bir şey söylüyor.
    return clip(input, TARGET_MAX);
  }
  if (typeof parsed === "string") return clip(parsed, TARGET_MAX);
  if (!parsed || typeof parsed !== "object") return "";
  const record = parsed as Record<string, unknown>;
  for (const key of TARGET_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return clip(value, TARGET_MAX);
  }
  // Bilinen alan yok — girdideki ilk metin değeri. Boolean/sayı atlanıyor:
  // "true" tek başına hiçbir şey anlatmaz.
  for (const value of Object.values(record)) {
    if (typeof value === "string" && value.trim()) return clip(value, TARGET_MAX);
  }
  return "";
}

// Sonucun hata olup olmadığı. `is_error` GÜVENİLİR DEĞİL — canlı ölçümde
// (2026-09-04) bir MCP çağrısı HTTP 500 döndürdüğü hâlde `is_error: false`
// yazıyordu, bkz. connectorHealth.ts.
export const RE_TOOL_FAILED = /^\s*(error|traceback|exception)\b|error calling tool|\bhttp error \d{3}\b/i;

export interface ResultSummary {
  result: string;
  extraLines: number;
  failed: boolean;
  output: string;
}

/**
 * Araç çıktısının tam metni sohbet geçmişine de yazıldığı için üst sınır var.
 * ÖLÇÜM (2026-09-05, canlı veritabanındaki 2100 sonuç): medyan 255, p90 4554,
 * p99 33.526, en büyük 139.744 karakter. 4000, sonuçların ~%90'ını olduğu gibi
 * taşıyor; kuyruğu uzun birkaç dev çıktı için geçmiş dosyasını megabaytlarca
 * şişirmenin anlamı yok.
 */
export const OUTPUT_MAX = 4000;

/**
 * axet-code araç çıktılarını `<result>…</result>` içine sarıyor (ölçüm,
 * 2026-09-05). Bu sarmalayıcı ATILMAK ZORUNDA: ilk satır olduğu gibi
 * alındığında göstergedeki sonuç satırı düpedüz `<result>` yazıyordu — yani
 * araç sonucu diye gösterilen şey aracın çıktısı bile değildi.
 */
export function stripResultWrapper(body: string): string {
  const match = body.match(/^<result>\s*([\s\S]*?)\s*<\/result>\s*$/);
  return (match ? match[1] : body).trim();
}

export function summarizeToolResult(content: string | undefined, isError: boolean | undefined): ResultSummary {
  const raw = (content ?? "").trim();
  if (!raw) return { result: "", extraLines: 0, failed: isError === true, output: "" };
  const body = stripResultWrapper(raw);
  const lines = body.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return {
    result: clip(lines[0] ?? "", TARGET_MAX),
    extraLines: Math.max(0, lines.length - 1),
    // Hata tespiti HAM metinde: sarmalayıcı dışında kalan bir hata satırı da
    // yakalansın.
    failed: isError === true || RE_TOOL_FAILED.test(body) || RE_TOOL_FAILED.test(raw),
    output: body.length > OUTPUT_MAX ? `${body.slice(0, OUTPUT_MAX)}\n…` : body
  };
}

// ---------------------------------------------------------------------------
// Dosya değişikliği farkı
// ---------------------------------------------------------------------------
//
// Araç SONUCU bir şey anlatmıyor: `edit` "Content replaced in file: …", `write`
// "File successfully written: …" diyor, yani NE değiştiği hiçbir yerde yok.
// Ama araç GİRDİSİ tam olarak bunu taşıyor (ölçüm, 2026-09-05):
//   edit      -> { file_path, old_string, new_string }
//   multiedit -> { file_path, edits: [{ old_string, new_string }, …] }
//   write     -> { file_path, content }
// Farkı bu yüzden sonuçtan değil girdiden üretiyoruz.
//
// Gerçek bir satır-satır fark algoritması (Myers vb.) BİLİNÇLİ OLARAK YOK:
// elimizdeki zaten "şu blok gitti, bu blok geldi" biçiminde, yani hangi
// satırların değiştiği belli. Blokları `-`/`+` ile göstermek hem doğru hem de
// bir fark kütüphanesi bağımlılığı getirmiyor.

/** Fark metninin üst sınırı — geçmiş dosyası şişmesin. */
export const DIFF_MAX = 4000;

export function diffBlock(oldText: string, newText: string): string {
  const out: string[] = [];
  for (const line of (oldText ?? "").split(/\r?\n/)) out.push(`-${line}`);
  for (const line of (newText ?? "").split(/\r?\n/)) out.push(`+${line}`);
  return out.join("\n");
}

/** Düzenleme araçlarının girdisinden `-`/`+` satırlarından oluşan bir fark metni. */
export function buildDiff(tool: string, input: string | undefined): string {
  if (!input) return "";
  let parsed: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(input);
    if (!value || typeof value !== "object") return "";
    parsed = value as Record<string, unknown>;
  } catch {
    return "";
  }
  const blocks: string[] = [];
  if (tool === "write") {
    const content = parsed.content;
    if (typeof content !== "string") return "";
    for (const line of content.split(/\r?\n/)) blocks.push(`+${line}`);
  } else if (tool === "edit") {
    const oldText = parsed.old_string;
    const newText = parsed.new_string;
    if (typeof oldText !== "string" && typeof newText !== "string") return "";
    blocks.push(diffBlock(String(oldText ?? ""), String(newText ?? "")));
  } else if (tool === "multiedit") {
    const edits = parsed.edits;
    if (!Array.isArray(edits)) return "";
    for (const edit of edits) {
      if (!edit || typeof edit !== "object") continue;
      const e = edit as Record<string, unknown>;
      blocks.push(diffBlock(String(e.old_string ?? ""), String(e.new_string ?? "")));
    }
  } else {
    return "";
  }
  const text = blocks.join("\n");
  return text.length > DIFF_MAX ? `${text.slice(0, DIFF_MAX)}\n…` : text;
}

// ---------------------------------------------------------------------------
// ask_user aracı
// ---------------------------------------------------------------------------
// axet-code'un `ask_user` aracı kullanıcıya bir soru kutusu gösteriyor;
// seçenekler liste hâlinde veriliyor. TUI'de bu kutu PTY üzerinden açılıyor,
// çoklu seçim için `space toggle` satırı. `space`, imlecin ÜSTÜNDEKİ satırı
// işaretliyor; `enter` işaretli olanların HEPSİNİ onaylıyor.
export const ASK_USER_TOOL = "ask_user";

export interface AskUserRequest {
  callId: string;
  question: string;
  header: string;
  options: string[];
  multiSelect: boolean;
}

/** `ask_user` girdisini ayrıştırır; ayrıştırılamazsa `null`. */
export function parseAskUser(callId: string, input: string | undefined): AskUserRequest | null {
  let parsed: { question?: unknown; header?: unknown; options?: unknown; multi_select?: unknown };
  try {
    parsed = JSON.parse(input ?? "") as typeof parsed;
  } catch {
    return null;
  }
  const options = Array.isArray(parsed.options)
    ? parsed.options
        .map((opt) => (typeof opt === "string" ? opt : (opt as { label?: unknown })?.label))
        .filter((label): label is string => typeof label === "string" && label.trim() !== "")
    : [];
  return {
    callId,
    question: typeof parsed.question === "string" ? parsed.question.trim() : "",
    header: typeof parsed.header === "string" ? parsed.header.trim() : "",
    options,
    multiSelect: parsed.multi_select === true
  };
}

/** Soruyu, cevaplanamadığında sohbete yazılacak düz metne çevirir. */
export function askUserAsText(ask: AskUserRequest): string {
  const question = ask.question || mt("chatTui.askFallbackQuestion");
  return ask.options.length
    ? `${question}\n\n${ask.options.map((opt) => `- ${opt}`).join("\n")}`
    : question;
}

/**
 * Başsız modda `ask_user` kullanıcıya ulaşmıyor: axet-code "No interactive
 * user… use your best judgment" dönüyor ve ajan kendi seçiyor (ölçüm
 * 2026-10-16). Bu yüzden ajandan soruyu turun SONUNDA şu blokla vermesi
 * isteniyor (bkz. axetChat.ts `ASK_RULE`):
 *
 *     ```secenekler
 *     - Seçenek 1
 *     - Seçenek 2
 *     ```
 *
 * Blok yalnızca METNİN SONUNDAYSA soru sayılıyor: ortadaki bir örnek, ajanın
 * kullanıcıya biçimi anlatması olabilir. En az iki seçenek gerekiyor; daha
 * azında basılacak düğme yok, blok yine de metinden atılıyor.
 */
const OPTIONS_BLOCK = /\n?```secenekler[ \t]*\r?\n([\s\S]*?)\r?\n?```[ \t]*\s*$/;

export function splitOptionsBlock(text: string): { text: string; ask: AskUserRequest | null } {
  const m = OPTIONS_BLOCK.exec(text);
  if (!m) return { text, ask: null };
  const rest = text.slice(0, m.index).trim();
  const options = m[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);
  if (options.length < 2) return { text: rest, ask: null };
  return {
    text: rest,
    ask: { callId: "secenekler", question: rest, header: "", options, multiSelect: false }
  };
}
