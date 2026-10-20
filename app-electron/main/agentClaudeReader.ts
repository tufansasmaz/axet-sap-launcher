// Claude Code KESİN okuyucusu (Tur 10, madde 5). Kaynak: Claude Code'un oturum
// dökümü ~/.claude/projects/<kodlanmış-cwd>/<oturum>.jsonl (CLAUDE_CONFIG_DIR
// varsa onun altında). Yalnız OKUNUR; dosyaya dokunulmaz.
//
// Ölçüm (.superpowers/olcum/tur10/claude-dokum.cjs, gerçek etkileşimli Claude Code 2.1.304):
//   - döküm Enter'dan ~300 ms sonra <uuid>.jsonl adıyla açılıyor; her kayıtta cwd;
//   - kullanıcı istemi `user` + düz metin (sondaki boşluk kırpılmış) → önekle eşleşiyor;
//   - tur sonu `system/turn_duration`, asistan `stop_reason: end_turn`;
//   - AskUserQuestion (ve izin sorusu) kaydı CEVAPTAN SONRA yazılıyor: açık soru
//     ancak ekrandan (seçim altbilgisi) görülebiliyor; ↓ + Enter seçimi çalışıyor.
//
// Bağlama kuralı axet-code okuyucusuyla aynı: ASLA yanlış dökümle eşleşme. Bölmeye
// yazılan satır (yalnız bellekte) aynı klasörün dökümlerinde aranıyor; birden çok
// aday ya da başka ajanın sahiplendiği döküm → bağ yok, kaynak "tahmini" kalıyor.
// Konuşma içeriği günlüğe ya da diske yazılmıyor; son cevap gizli süzgeçten geçiyor.
import { closeSync, fstatSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import path from "node:path";
import { clip, summarizeToolInput } from "./axetToolEvents";
import { matchKey } from "./axetSessionDb";
import type { AgentLinkIssue, AgentPhase, AgentState, AgentStatus } from "../shared/agentTypes";
import type { AgentErrorInfo } from "../shared/agentErrors";
import { redact } from "./support/redact";
import { replySnippet } from "./agentReply";
import { stripAnsi, type AgentReader, type GenericReader } from "./agentGenericReader";
import { agentErrorInfo } from "./agentErrorInfo";
import { NEEDLE_MAX, NEEDLE_MIN, PHASE_TARGET_MAX, PROMPT_MATCH_WINDOW_MS, type MatchOutcome, type SessionRegistry } from "./agentAxetReader";

/** Dökümün kaba kaydı (yalnız kullanılan alanlar; geri kalanı yok sayılıyor). */
export interface ClaudeEntry {
  type?: string;
  subtype?: string;
  timestamp?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
  error?: unknown;
  message?: { role?: string; content?: unknown; stop_reason?: string | null };
}

export interface ClaudeTranscriptPort {
  /** Klasördeki .jsonl dökümleri; okunamazsa null. */
  list(dir: string): { path: string; mtimeMs: number }[] | null;
  /** `offset`ten sonrası ve dosyanın boyu; okunamazsa null. */
  read(file: string, offset: number): { text: string; size: number } | null;
}

/** Claude Code'un proje klasörü: yoldaki harf/rakam dışı her karakter "-" (ölçüldü). */
export function claudeProjectDir(home: string, cwd: string, configDir?: string): string {
  const root = configDir?.trim() ? configDir.trim() : path.win32.join(home, ".claude");
  return path.win32.join(root, "projects", cwd.replace(/[^a-zA-Z0-9]/g, "-"));
}

export interface DerivedClaudeState {
  state: AgentState;
  reply?: string;
  phase?: AgentPhase;
  error?: AgentErrorInfo;
  detail?: string;
  lastActivityMs: number | null;
}

type Block = { type?: string; text?: string; name?: string; id?: string; input?: unknown; tool_use_id?: string };

const blocksOf = (e: ClaudeEntry): Block[] => (Array.isArray(e.message?.content) ? (e.message?.content as Block[]).filter((b) => b && typeof b === "object") : []);

/** Kullanıcının yazdığı istem metni (araç sonucu ve meta kayıt değil); yoksa null. */
export function promptText(e: ClaudeEntry): string | null {
  if (e.type !== "user" || e.isMeta || e.isSidechain) return null;
  const content = e.message?.content;
  if (typeof content === "string") return content;
  const blocks = blocksOf(e);
  if (blocks.some((b) => b.type === "tool_result")) return null;
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  return text || null;
}

const INTERRUPTED = /^\[Request interrupted by user/;

function toolName(raw: string): string {
  const mcp = /^mcp__(.+)$/.exec(raw);
  return mcp ? `mcp:${mcp[1]}` : raw.toLowerCase();
}

function toolPhase(block: Block): AgentPhase {
  const tool = toolName(String(block.name ?? ""));
  const raw = block.input && typeof block.input === "object" ? summarizeToolInput(JSON.stringify(block.input)) : "";
  const target = raw ? clip(redact(raw, []).text, PHASE_TARGET_MAX) : "";
  return { kind: "tool", ...(tool ? { tool } : {}), ...(target ? { target } : {}) };
}

/**
 * Döküm kayıtlarından durum (saf). Son kullanıcı isteminden sonra: tur sonu
 * (turn_duration ya da end_turn, bekleyen araç yok) → boşta + son cevap; API
 * hatası → hata; kesilen tur → boşta; yoksa çalışıyor + aşama.
 */
export function deriveClaudeState(entries: readonly ClaudeEntry[]): DerivedClaudeState {
  const main = entries.filter((e) => !e.isSidechain);
  let lastActivityMs: number | null = null;
  for (const e of main) {
    const ms = e.timestamp ? Date.parse(e.timestamp) : NaN;
    if (Number.isFinite(ms)) lastActivityMs = Math.max(lastActivityMs ?? 0, ms);
  }
  let start = -1;
  for (let i = main.length - 1; i >= 0; i -= 1) {
    if (promptText(main[i]) !== null) {
      start = i;
      break;
    }
  }
  if (start < 0) return { state: "idle", lastActivityMs };
  if (INTERRUPTED.test(promptText(main[start]) ?? "")) return { state: "idle", detail: "interrupted", lastActivityMs };
  const turn = main.slice(start + 1);
  const answered = new Set<string>();
  for (const e of turn) for (const b of blocksOf(e)) if (b.type === "tool_result" && b.tool_use_id) answered.add(b.tool_use_id);
  let pending: Block | null = null;
  let lastAssistant: ClaudeEntry | null = null;
  let ended = false;
  for (const e of turn) {
    if (e.type === "system" && e.subtype === "turn_duration") ended = true;
    if (e.type !== "assistant") continue;
    lastAssistant = e;
    for (const b of blocksOf(e)) if (b.type === "tool_use" && b.id && !answered.has(b.id)) pending = b;
  }
  if (lastAssistant?.isApiErrorMessage) {
    const text = blocksOf(lastAssistant).filter((b) => b.type === "text").map((b) => b.text ?? "").join(" ");
    const raw = `${text} ${typeof lastAssistant.error === "string" ? lastAssistant.error : ""}`.trim();
    return { state: "error", detail: "error", error: agentErrorInfo(raw || "API error", "exact"), lastActivityMs };
  }
  const stop = lastAssistant?.message?.stop_reason;
  if (!pending && (ended || stop === "end_turn" || stop === "stop_sequence")) {
    let reply = "";
    for (let i = turn.length - 1; i >= 0 && !reply; i -= 1) {
      if (turn[i].type !== "assistant") continue;
      reply = replySnippet(redact(blocksOf(turn[i]).filter((b) => b.type === "text").map((b) => b.text ?? "").join(""), []).text);
    }
    return { state: "idle", detail: "end_turn", ...(reply ? { reply } : {}), lastActivityMs };
  }
  // Çalışıyor: son kayıt aracın sonucu ise model düşünüyor; araç bekliyorsa araç; metinse yazıyor.
  const last = turn[turn.length - 1];
  let phase: AgentPhase = { kind: "thinking" };
  if (last?.type === "assistant") {
    const blocks = blocksOf(last);
    const tail = blocks[blocks.length - 1];
    if (pending) phase = toolPhase(pending);
    else if (tail?.type === "text" && (tail.text ?? "").trim()) phase = { kind: "writing" };
  }
  return { state: "running", phase, lastActivityMs };
}

// Ekrandaki seçim penceresi (soru ya da izin): Claude Code'un altbilgisi (ölçüldü).
const SELECT_MARK = /Enter to select|Esc to cancel|Do you want to (?:proceed|make this edit|create)/i;
// Çalışma altbilgisi: pencere kapandı, model çalışıyor.
const WORK_MARK = /esc to interrupt/i;
const TRANSCRIPT_MAX = 4 * 1024 * 1024;
const ENTRY_CAP = 600;

export interface ClaudeReaderOptions {
  agentId: string;
  cwd: string;
  home: string;
  configDir?: string;
  startedAtMs: number;
  port: ClaudeTranscriptPort;
  registry: SessionRegistry;
  generic: GenericReader;
  now: () => number;
  onMatch?: (outcome: MatchOutcome) => void;
  /** Özel komut (Claude başlatıcısı olabilir): bağ yoksa "desteklenmiyor" denir, "bulunamadı" değil. */
  optional?: boolean;
}

interface Bound {
  file: string;
  offset: number;
  carry: string;
  entries: ClaudeEntry[];
}

export class ClaudeReader implements AgentReader {
  private readonly dir: string;
  private needles: { key: string; atMs: number }[] = [];
  private bound: Bound | null = null;
  private prompted = false;
  private ambiguous = false;
  private failed = false;
  private missed = false;
  private derived: DerivedClaudeState | null = null;
  /** Ekranda seçim penceresi açık (soru/izin). */
  private selectOpen = false;
  private markCarry = "";

  constructor(private readonly opts: ClaudeReaderOptions) {
    this.dir = claudeProjectDir(opts.home, opts.cwd, opts.configDir);
  }

  noteRepaint(): void {
    this.opts.generic.noteRepaint();
  }

  feedOutput(data: string): void {
    this.opts.generic.feedOutput(data);
    const window = this.markCarry + stripAnsi(data);
    this.markCarry = window.slice(-64);
    const select = SELECT_MARK.exec(window);
    const work = WORK_MARK.exec(window);
    if (select && (!work || select.index > work.index)) {
      if (!this.selectOpen) this.selectSeenMs = this.opts.now();
      this.selectOpen = true;
    }
    else if (work) this.selectOpen = false;
  }

  submitLine(line: string): void {
    const trimmed = line.trim();
    // Seçim penceresinde yazılan satır cevaptır; istem değil.
    if (this.selectOpen) return;
    const key = matchKey(trimmed).slice(0, NEEDLE_MAX).trim();
    if (trimmed.startsWith("/") || key.length < NEEDLE_MIN) return;
    this.prompted = true;
    this.opts.generic.submitLine(trimmed);
    this.needles.push({ key, atMs: this.opts.now() });
    if (this.needles.length > 5) this.needles.shift();
    this.opts.registry.setPending(this.opts.agentId, this.dir, this.needles.map((n) => n.key));
  }

  poll(): void {
    try {
      const now = this.opts.now();
      // Süresi dolan iğne: istem dökümde görünmedi.
      const fresh = this.needles.filter((n) => now - n.atMs < PROMPT_MATCH_WINDOW_MS);
      if (fresh.length < this.needles.length && !this.bound) this.missed = true;
      this.needles = fresh;
      if (this.bound) this.readMore(this.bound);
      // Bağlıyken yeni istem dökümde görünmüyorsa (ör. /clear ile yeni oturum) yeniden aranıyor.
      if (this.bound && this.needles.length) {
        const seen = this.bound.entries.some((e) => {
          const t = promptText(e);
          return t !== null && this.needles.some((n) => matchKey(t).startsWith(n.key));
        });
        if (seen) this.needles = [];
        else if (this.needles.some((n) => now - n.atMs > 5_000)) this.search();
      } else if (!this.bound && this.needles.length) this.search();
      if (this.needles.length === 0) this.opts.registry.setPending(this.opts.agentId, null, []);
      this.derived = this.bound ? deriveClaudeState(this.bound.entries) : null;
      // Dökümde yeni kayıt (araç sonucu, cevap) → seçim penceresi kapanmış.
      if (this.bound && this.derived && this.lastEntryMs > this.selectSeenMs) this.selectOpen = false;
      this.failed = false;
    } catch {
      this.failed = true;
    }
  }

  private lastEntryMs = 0;
  private selectSeenMs = 0;

  private search(): void {
    const list = this.opts.port.list(this.dir);
    if (list === null) {
      this.failed = true;
      return;
    }
    const since = this.opts.startedAtMs - 2_000;
    const matches: string[] = [];
    for (const f of list) {
      if (f.mtimeMs < since || f.path === this.bound?.file) continue;
      if (this.opts.registry.owner(this.dir, f.path)) continue;
      const read = this.opts.port.read(f.path, 0);
      if (!read || read.size > TRANSCRIPT_MAX) continue;
      const hit = read.text.split("\n").some((line) => {
        if (!line.includes('"user"')) return false;
        let e: ClaudeEntry;
        try {
          e = JSON.parse(line) as ClaudeEntry;
        } catch {
          return false;
        }
        const t = promptText(e);
        const ms = e.timestamp ? Date.parse(e.timestamp) : NaN;
        if (t === null || (Number.isFinite(ms) && ms < since)) return false;
        const key = matchKey(t);
        return this.needles.some((n) => key.startsWith(n.key));
      });
      if (hit) matches.push(f.path);
    }
    const rival = this.needles.some((n) => this.opts.registry.rivalPending(this.dir, this.opts.agentId, n.key));
    if (matches.length === 1 && !rival) {
      this.opts.registry.claim(this.dir, matches[0], this.opts.agentId);
      this.bound = { file: matches[0], offset: 0, carry: "", entries: [] };
      this.readMore(this.bound);
      this.needles = [];
      this.ambiguous = false;
      this.missed = false;
      this.opts.onMatch?.("istem");
    } else if (matches.length > 1 || (matches.length === 1 && rival)) {
      this.ambiguous = true;
      this.opts.onMatch?.("belirsiz");
    }
  }

  private readMore(b: Bound): void {
    const read = this.opts.port.read(b.file, b.offset);
    if (!read) throw new Error("okunamadı");
    if (read.size < b.offset) {
      // Dosya kısaldı (yeniden yazıldı): baştan.
      b.offset = 0;
      b.carry = "";
      b.entries = [];
      return this.readMore(b);
    }
    b.offset = read.size;
    const text = b.carry + read.text;
    const lines = text.split("\n");
    b.carry = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as ClaudeEntry;
        if (e.type !== "user" && e.type !== "assistant" && e.type !== "system") continue;
        b.entries.push(e);
        const ms = e.timestamp ? Date.parse(e.timestamp) : NaN;
        if (Number.isFinite(ms)) this.lastEntryMs = Math.max(this.lastEntryMs, ms);
      } catch {
        // bozuk satır atlanıyor
      }
    }
    if (b.entries.length > ENTRY_CAP) b.entries = b.entries.slice(-ENTRY_CAP);
  }

  status(): AgentStatus {
    const generic = this.opts.generic;
    const exact = this.bound !== null && !this.failed && this.derived !== null;
    if (generic.engineExited()) {
      const line = generic.exitError();
      return {
        state: "finished",
        source: exact ? "exact" : "estimated",
        lastActivity: generic.status().lastActivity,
        ...(line ? { error: agentErrorInfo(line, "estimated") } : {})
      };
    }
    if (exact && this.derived) {
      const d = this.derived;
      if (this.selectOpen) return { state: "asking", source: "exact", lastActivity: d.lastActivityMs };
      return {
        state: d.state,
        source: "exact",
        lastActivity: d.lastActivityMs,
        ...(d.detail ? { detail: d.detail } : {}),
        ...(d.reply ? { reply: d.reply } : {}),
        ...(d.phase ? { phase: d.phase } : {}),
        ...(d.error ? { error: d.error } : {})
      };
    }
    if (!this.prompted && !this.opts.optional) return { state: "idle", source: "estimated", lastActivity: null };
    const fallback = generic.status();
    const link: AgentLinkIssue | undefined = this.opts.optional ? "unsupported" : this.failed ? "noDb" : this.ambiguous ? "ambiguous" : this.missed ? "notFound" : undefined;
    return link ? { ...fallback, link } : fallback;
  }

  engineReady(): boolean {
    return this.opts.generic.engineReady();
  }

  dispose(): void {
    this.opts.registry.release(this.opts.agentId);
  }
}

/** Gerçek dosya sistemi (salt okuma). */
export const liveClaudeTranscriptPort: ClaudeTranscriptPort = {
  list(dir) {
    try {
      return readdirSync(dir)
        .filter((name) => name.endsWith(".jsonl"))
        .map((name) => {
          const file = path.join(dir, name);
          return { path: file, mtimeMs: statSync(file).mtimeMs };
        });
    } catch (error) {
      // Klasör henüz yok (ilk istemden önce): boş liste; öteki hatalar okunamadı.
      return (error as NodeJS.ErrnoException)?.code === "ENOENT" ? [] : null;
    }
  },
  read(file, offset) {
    let fd: number | null = null;
    try {
      fd = openSync(file, "r");
      const size = fstatSync(fd).size;
      if (size <= offset) return { text: "", size };
      const length = Math.min(size - offset, TRANSCRIPT_MAX);
      const buf = Buffer.alloc(length);
      readSync(fd, buf, 0, length, offset);
      return { text: buf.toString("utf8"), size: offset + length };
    } catch {
      return null;
    } finally {
      if (fd !== null) closeSync(fd);
    }
  }
};
