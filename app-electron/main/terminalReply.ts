// Tur 11: kesin kaynak yokken ajanın SON cevabı terminal ekranından (tahmini, ≈).
// Girdi: TerminalScreen satırları (ANSI zaten yok). Motor ekranın kendisinden tanınıyor
// (özel komut herhangi bir motor olabilir); düzenler ölçüldü (.superpowers/olcum/tur11):
//   Claude Code 2.1: istem "❯ …", cevap "● …" bloğu (devamı 2 boşluk girintili), araç
//     "● Ad(…)" + "  ⎿ …", tur sonu "✻ <fiil> for Ns", altta kurallar arasında giriş kutusu.
//   axet-code 1.4.1: istem "│ …", araç "✓ …" (+ girintili çıktı), cevap 3 boşluk girintili,
//     altında "◇ <model> via <sağlayıcı> Ns ───"; sağda yan panel (geniş boşlukla ayrılmış).
// Ölçülmemiş motorlarda genel kural: istem satırından sonraki son anlamlı blok.
// Çıktı gizli süzgeçten geçer (replySnippet), en çok REPLY_MAX; yalnız bellekte.
import { replySnippet } from "./agentReply";

const RULE_ONLY = /^[\s─━═╭╮╰╯│┃┌┐└┘├┤┬┴┼╱╲▔▁▏▕\-_=~·•.:]*$/;
const CLAUDE_DONE = /^✻ ?\S+ for \d/;
const CLAUDE_TOOL = /^● [\w.:-]+\(.*\)?\s*$/;
const AXET_FOOTER = /^\s*◇ .{1,80}? via \S+ +\d+(?:\.\d+)?(?:ms|s|m)\b/;
const AXET_MARK = /^\s*(?:[✓✗✔✘⚙●◇]|│ )/;
/** Spinner, altbilgi, kip ipuçları (genel). */
const DECOR = [
  /esc to (?:interrupt|cancel)/i,
  /\? for shortcuts/i,
  /shift\+tab to cycle/i,
  /bypass permissions/i,
  /tab focus chat/i,
  /ctrl\+[a-z] (?:commands|models|quit|newline)/i,
  /enter to (?:send|confirm|select)/i,
  /^[⠀-⣿✶✻✽✢·*◐◓◑◒|/\\-]\s*\S*(?:ing|ing…|…)\b/,
  /^\s*[>❯›]\s*$/,
  /yolo mode/i,
  /^\s*:::\s*$/
];

function norm(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** İstemin başı (ilk 24 karakter) ekranda geçen SON satır; yoksa -1. */
function lastPromptLine(lines: readonly string[], prompt: string | null, mark: RegExp): number {
  const key = prompt ? norm(prompt).slice(0, 24) : "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!mark.test(line)) continue;
    const body = norm(line.replace(mark, ""));
    if (!body) continue;
    if (!key || body.startsWith(key.slice(0, Math.min(key.length, body.length)))) return i;
  }
  return -1;
}

function finish(block: string[]): string | null {
  while (block.length && !block[0].trim()) block.shift();
  while (block.length && !block[block.length - 1].trim()) block.pop();
  if (!block.length) return null;
  const text = replySnippet(block.join("\n"));
  return text || null;
}

function dedent(block: string[]): string[] {
  const indents = block.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length);
  const min = indents.length ? Math.min(...indents) : 0;
  return block.map((l) => l.slice(Math.min(min, l.length - l.trimStart().length)));
}

function claudeReply(lines: readonly string[], prompt: string | null): string | null {
  const start = lastPromptLine(lines, prompt, /^❯ /);
  if (start < 0) return null;
  let answer: string[] | null = null;
  let current: string[] | null = null;
  let tool = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (CLAUDE_DONE.test(line) || /^─{8,}/.test(line) || /^❯/.test(line)) break;
    if (line.startsWith("● ")) {
      if (current && !tool) answer = current;
      tool = CLAUDE_TOOL.test(line) || (lines[i + 1] ?? "").startsWith("  ⎿");
      current = [line.slice(2)];
      continue;
    }
    if (!current) continue;
    if (line.startsWith("  ⎿")) {
      tool = true;
      continue;
    }
    // Bloğun devamı (2 boşluk girintili) ya da paragraf arası boş satır; girintisiz satır bitirir.
    if (!line.trim() || line.startsWith("  ")) current.push(line.startsWith("  ") ? line.slice(2) : "");
    else {
      if (!tool) answer = current;
      current = null;
    }
  }
  if (current && !tool) answer = current;
  if (!answer) return null;
  // Bloğun sonundaki "Read 1 file" gibi daraltılmış araç özetleri cevap değil.
  return finish(answer);
}

/** axet-code yan paneli: ekrandaki "AXET ──" başlığının sütunundan sağı kesilir. */
function cropSidebar(lines: readonly string[]): string[] {
  let col = -1;
  for (const l of lines) {
    const m = /\S\s{6,}(AXET ─|Modified Files ─|Connectors ─|Code Graph ─)/.exec(l) ?? /^(\s{20,})(AXET ─)/.exec(l);
    if (m) {
      const at = l.indexOf(m[m.length - 1]);
      if (at > 20) col = col < 0 ? at : Math.min(col, at);
    }
  }
  if (col < 0) return [...lines];
  return lines.map((l) => l.slice(0, col).replace(/\s+$/, ""));
}

function axetReply(raw: readonly string[], prompt: string | null): string | null {
  const lines = cropSidebar(raw);
  let footer = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (AXET_FOOTER.test(lines[i])) {
      footer = i;
      break;
    }
  }
  if (footer < 0) return null;
  const start = lastPromptLine(lines.slice(0, footer), prompt, /^\s*│ /);
  const block: string[] = [];
  for (let i = footer - 1; i > start; i--) {
    const line = lines[i];
    if (AXET_MARK.test(line)) break;
    block.unshift(line);
  }
  // Araç çıktısı (cevaptan daha girintili) baştan atılıyor: cevabın girintisi son satırınki.
  const body = block.filter((l) => l.trim());
  if (!body.length) return null;
  const base = body[body.length - 1].length - body[body.length - 1].trimStart().length;
  while (block.length && (!block[0].trim() || block[0].length - block[0].trimStart().length > base)) block.shift();
  return finish(dedent(block));
}

function genericReply(lines: readonly string[], prompt: string | null): string | null {
  if (!prompt) return null;
  const start = lastPromptLine(lines, prompt, /^[\s│┃>❯›$]*/);
  if (start < 0) return null;
  const kept: string[] = [];
  for (const raw of lines.slice(start + 1)) {
    const line = raw.replace(/^\s*[│┃]\s?/, "").replace(/\s?[│┃]\s*$/, "");
    if (RULE_ONLY.test(line) && line.trim()) continue;
    if (DECOR.some((re) => re.test(line))) continue;
    kept.push(line);
  }
  // Son anlamlı blok: sondaki boşlukları at, geriye doğru ilk boş satıra kadar değil — paragraf
  // aralarını koru; kutu çizgileri zaten ayıklandı.
  return finish(dedent(kept));
}

/** Ekrandan son cevap; çıkarılamazsa null. */
export function extractTerminalReply(lines: readonly string[], prompt: string | null): string | null {
  try {
    if (lines.some((l) => CLAUDE_DONE.test(l) || l.startsWith("● ")) && lines.some((l) => l.startsWith("❯ "))) return claudeReply(lines, prompt);
    if (lines.some((l) => AXET_FOOTER.test(l))) return axetReply(lines, prompt);
    return genericReply(lines, prompt);
  } catch {
    return null;
  }
}
