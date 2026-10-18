// axet-code KESİN okuyucusu (spec 2026-10-17 ajan-alani §6.1).
//
// Aynı klasördeki ajanlar AYNI oturum veritabanını kullanıyor; "en yeni
// oturum" yetmiyor. Bölmeye yazılan satır (yalnız bellekte) veritabanında
// aranıyor ve ajanın oturumu böyle bulunuyor. Kural: ASLA yanlış oturuma
// bağlanma. Şunlardan biri varsa bağ kurulmuyor, kaynak "tahmini" kalıyor:
//   - birden çok aday oturum,
//   - aynı (ya da biri öbürünün öneki olan) istemi bekleyen başka bir ajan — onun
//     mesajı henüz yazılmamış olabilir, tek aday yanıltıcı,
//   - veritabanı yok/okunamıyor.
// Bağdan sonra yazılan bir istem, ajan çalışmıyorken 30 sn içinde bağlı
// oturumda görünmezse (kullanıcı Ctrl+N ile yeni oturuma geçmiş olabilir)
// bağ çözülüyor ve istem yeniden aranıyor (plan sapması 1). Soru açıkken
// yazılan satır da böyle: soru kapanırsa düşer, aynı soru 30 sn sonra hâlâ
// açıksa ve satır oturumda görünmediyse bağ çözülür.
import { ASK_USER_TOOL, parseAskUser } from "./axetToolEvents";
import { matchKey, promptStartsWith, type AxetDbMessage, type AxetPart } from "./axetSessionDb";
import type { AgentQuestion, AgentState, AgentStatus } from "../shared/agentTypes";
import type { AgentReader, GenericReader } from "./agentGenericReader";

export interface AxetDbPort {
  resolveDb(cwd: string): string | null;
  /** Bu andan sonra iğneyle BAŞLAYAN kullanıcı mesajlarının oturumları; okunamazsa null. */
  findSessions(dbPath: string, sinceSec: number, needle: string): string[] | null;
  /** Okunamazsa null. */
  readMessages(dbPath: string, sessionId: string, sinceSec: number): AxetDbMessage[] | null;
}

export function keysOverlap(a: string, b: string): boolean {
  // Eşleme "ile başlıyor" olduğundan çakışma da önek ilişkisi: biri öbürünün
  // önekiyse ikisi aynı mesajla eşleşebilir.
  return a.startsWith(b) || b.startsWith(a);
}

/** Ajanlar arası ortak defter: hangi oturum kimin, kim hangi istemi bekliyor. */
export interface SessionRegistry {
  owner(dbPath: string, sessionId: string): string | null;
  claim(dbPath: string, sessionId: string, agentId: string): void;
  setPending(agentId: string, dbPath: string | null, keys: string[]): void;
  rivalPending(dbPath: string, agentId: string, key: string): boolean;
  release(agentId: string): void;
}

export function createSessionRegistry(): SessionRegistry {
  const owners = new Map<string, string>();
  const pending = new Map<string, { dbPath: string; keys: string[] }>();
  const slot = (dbPath: string, sessionId: string) => `${dbPath}\n${sessionId}`;
  const dropOwned = (agentId: string) => {
    for (const [key, owner] of owners) if (owner === agentId) owners.delete(key);
  };
  return {
    owner: (dbPath, sessionId) => owners.get(slot(dbPath, sessionId)) ?? null,
    claim(dbPath, sessionId, agentId) {
      dropOwned(agentId);
      owners.set(slot(dbPath, sessionId), agentId);
    },
    setPending(agentId, dbPath, keys) {
      if (!dbPath || keys.length === 0) pending.delete(agentId);
      else pending.set(agentId, { dbPath, keys });
    },
    rivalPending(dbPath, agentId, key) {
      for (const [other, entry] of pending) {
        if (other === agentId || entry.dbPath !== dbPath) continue;
        if (entry.keys.some((k) => keysOverlap(k, key))) return true;
      }
      return false;
    },
    release(agentId) {
      dropOwned(agentId);
      pending.delete(agentId);
    }
  };
}

export const PROMPT_MATCH_WINDOW_MS = 60_000;
export const UNCONFIRMED_LIMIT_MS = 30_000;
/** Asking dondurmasının üst sınırı: bu süreden uzun soru açık kalırsa bağ çözülür. */
export const ASKING_FREEZE_MAX_MS = 5 * 60_000;
export const NEEDLE_MAX = 80;
export const NEEDLE_MIN = 4;
const MESSAGE_CAP = 400;
const PENDING_CAP = 5;

export type MatchOutcome = "istem" | "belirsiz";

export interface DerivedAxetState {
  state: AgentState;
  question?: AgentQuestion;
  detail?: string;
  lastActivitySec: number | null;
}

function textOf(message: AxetDbMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.data?.text ?? "")
    .join("");
}

/**
 * Mesaj listesinden durum. Açık soru: son kullanıcı mesajından SONRA,
 * tamamlanmış (`finished`) ama sonucu gelmemiş `ask_user`. Arkasından
 * kullanıcı mesajı gelmiş eski bir soru (süreç soru açıkken kapanmış) açık
 * sayılmıyor.
 */
export function deriveAxetState(messages: AxetDbMessage[]): DerivedAxetState {
  const last = messages[messages.length - 1];
  if (!last) return { state: "idle", lastActivitySec: null };
  const lastActivitySec = last.createdAt;
  const answered = new Set<string>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "tool_result" && part.data?.tool_call_id) answered.add(part.data.tool_call_id);
    }
  }
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role === "user") break;
    for (const part of message.parts) {
      const id = part.data?.id;
      if (part.type !== "tool_call" || part.data?.name !== ASK_USER_TOOL || part.data?.finished !== true || !id || answered.has(id)) continue;
      const ask = parseAskUser(id, part.data?.input);
      if (ask) return { state: "asking", question: { ...ask, askedAt: message.createdAt * 1000 }, lastActivitySec };
    }
  }
  if (last.role !== "assistant") return { state: "running", lastActivitySec };
  let finish: AxetPart | undefined;
  for (const part of last.parts) if (part.type === "finish") finish = part;
  if (!finish) return { state: "running", lastActivitySec };
  const reason = finish.data?.reason ?? "";
  if (reason === "error") return { state: "error", detail: "error", lastActivitySec };
  if (reason === "tool_use") return { state: "running", lastActivitySec };
  return { state: "idle", ...(reason ? { detail: reason } : {}), lastActivitySec };
}

export interface AxetReaderOptions {
  agentId: string;
  cwd: string;
  startedAtMs: number;
  port: AxetDbPort;
  registry: SessionRegistry;
  generic: GenericReader;
  now: () => number;
  onMatch?: (outcome: MatchOutcome) => void;
}

interface Needle {
  key: string;
  /** Pencerenin başlangıcı (60 sn dolunca iğne düşer). unbind'de şimdiye sıfırlanır. */
  atMs: number;
  /** Veritabanı sorgusunun alt sınırı: istemin özgün yazılma anı. Hiç değişmez. */
  submitMs: number;
  /**
   * Satır bağlı oturumda soru açıkken yazıldıysa o sorunun kimliği. Soru
   * kapanınca (cevap geldi) satır düşer; soru açık kalır ve satır oturumda
   * görünmezse sayaç dondurulmadan işler, 30 sn sonra bağ çözülür (kullanıcı
   * soru açıkken yeni oturuma geçmiş olabilir).
   */
  askCallId?: string;
}

export class AxetReader implements AgentReader {
  private needles: Needle[] = [];
  private unconfirmed: Needle[] = [];
  private session: { dbPath: string; id: string } | null = null;
  private prompted = false;
  private ambiguous = false;
  private dbFailed = false;
  private messages = new Map<string, AxetDbMessage>();
  private lastSec = 0;
  private derived: DerivedAxetState | null = null;

  constructor(private readonly opts: AxetReaderOptions) {}

  feedOutput(data: string): void {
    this.opts.generic.feedOutput(data);
  }

  submitLine(line: string): void {
    const trimmed = line.trim();
    const key = matchKey(trimmed).slice(0, NEEDLE_MAX).trim();
    // TUI komutları (`/model`) ve çok kısa satırlar istem değil.
    if (trimmed.startsWith("/") || key.length < NEEDLE_MIN) return;
    this.prompted = true;
    const nowMs = this.opts.now();
    // Soru açıkken yazılan satır büyük olasılıkla soruya serbest cevap; yine de
    // atılmıyor (yeni oturuma geçilmiş olabilir), sorunun kimliğiyle saklanıyor.
    const askCallId = this.session && this.derived?.state === "asking" ? this.derived.question?.callId : undefined;
    const needle: Needle = { key, atMs: nowMs, submitMs: nowMs, ...(askCallId ? { askCallId } : {}) };
    if (this.session) this.unconfirmed = [...this.unconfirmed, needle].slice(-PENDING_CAP);
    else this.needles = [...this.needles, needle].slice(-PENDING_CAP);
    this.publishPending();
  }

  poll(): void {
    try {
      const now = this.opts.now();
      if (!this.session) this.tryBind(now);
      if (this.session) this.refresh(now);
    } catch {
      // Kilitli/bozuk veritabanı: tahminiye düş, ana süreci düşürme (spec §10).
      this.dbFailed = true;
    }
  }

  status(): AgentStatus {
    const exact = this.session !== null && !this.dbFailed && this.derived !== null;
    const generic = this.opts.generic;
    if (generic.engineExited()) {
      return {
        state: "finished",
        source: exact ? "exact" : "estimated",
        lastActivity: generic.status().lastActivity,
        ...(exact && this.derived?.detail ? { detail: this.derived.detail } : {})
      };
    }
    if (exact && this.derived) {
      const d = this.derived;
      return {
        state: d.state,
        source: "exact",
        lastActivity: d.lastActivitySec === null ? null : d.lastActivitySec * 1000,
        ...(d.question ? { question: d.question } : {}),
        ...(d.detail ? { detail: d.detail } : {})
      };
    }
    // İlk istemden önce: boşta (motorun kaydı henüz okunmadı → tahmini).
    if (!this.prompted) return { state: "idle", source: "estimated", lastActivity: null };
    return generic.status();
  }

  /** Motorun açıldığı genel okuyucunun yankı/çıktı bilgisinden. */
  engineReady(): boolean {
    return this.opts.generic.engineReady();
  }

  binding(): string | null {
    return this.session?.id ?? null;
  }

  dispose(): void {
    this.opts.registry.release(this.opts.agentId);
  }

  private dbPath(): string | null {
    return this.opts.port.resolveDb(this.opts.cwd);
  }

  private publishPending(): void {
    const keys = [...this.needles, ...this.unconfirmed].map((n) => n.key);
    this.opts.registry.setPending(this.opts.agentId, keys.length ? this.dbPath() : null, keys);
  }

  private tryBind(now: number): void {
    const before = this.needles.length;
    this.needles = this.needles.filter((n) => now - n.atMs < PROMPT_MATCH_WINDOW_MS);
    if (this.needles.length !== before) this.publishPending();
    if (this.needles.length === 0) return;
    const dbPath = this.dbPath();
    if (!dbPath) {
      this.dbFailed = true;
      return;
    }
    for (const needle of [...this.needles].reverse()) {
      // İstemin özgün yazılma anından itibaren ara (submitMs): ajanın başlangıcından
      // bu yana açılmış yabancı (sohbet ekranı / başka axet-code) oturumlarını
      // dışarıda bırakır ve Ctrl+N öncesindeki mesajların eşleşmesini önler.
      const sinceSec = Math.floor(needle.submitMs / 1000) - 2;
      const found = this.opts.port.findSessions(dbPath, sinceSec, needle.key);
      if (found === null) {
        this.dbFailed = true;
        return;
      }
      this.dbFailed = false;
      const free = found.filter((id) => {
        const owner = this.opts.registry.owner(dbPath, id);
        return owner === null || owner === this.opts.agentId;
      });
      if (free.length === 0) continue;
      if (free.length === 1 && !this.opts.registry.rivalPending(dbPath, this.opts.agentId, needle.key)) {
        this.bind(dbPath, free[0], needle, now);
        return;
      }
      if (!this.ambiguous) {
        this.ambiguous = true;
        this.opts.onMatch?.("belirsiz");
      }
    }
  }

  private bind(dbPath: string, id: string, needle: Needle, now: number): void {
    this.session = { dbPath, id };
    this.opts.registry.claim(dbPath, id, this.opts.agentId);
    this.needles = [];
    // Bağı kuran istem de doğrulanmalı: bağlı oturumda kullanıcı mesajı olarak
    // görünmezse olağan 30 sn kuralıyla bağ çözülür.
    this.unconfirmed = [...this.unconfirmed, { key: needle.key, atMs: now, submitMs: needle.submitMs }].slice(-PENDING_CAP);
    this.ambiguous = false;
    this.messages.clear();
    this.lastSec = 0;
    this.derived = null;
    this.publishPending();
    this.opts.onMatch?.("istem");
  }

  private unbind(now: number): void {
    this.opts.registry.release(this.opts.agentId);
    this.session = null;
    this.derived = null;
    this.messages.clear();
    this.lastSec = 0;
    // submitMs (DB sorgusu için) özgün zamanda kalır; atMs pencereyi şimdiden yeniler.
    this.needles = this.unconfirmed.map((n) => ({ key: n.key, atMs: now, submitMs: n.submitMs }));
    this.unconfirmed = [];
    this.ambiguous = true;
    this.publishPending();
    this.opts.onMatch?.("belirsiz");
  }

  private refresh(now: number): void {
    if (!this.session) return;
    const { dbPath, id } = this.session;
    const since = this.lastSec > 0 ? this.lastSec - 2 : Math.floor(this.opts.startedAtMs / 1000) - 2;
    const fresh = this.opts.port.readMessages(dbPath, id, since);
    if (fresh === null) {
      this.dbFailed = true;
      return;
    }
    this.dbFailed = false;
    for (const message of fresh) {
      this.messages.set(message.id, message);
      if (message.createdAt > this.lastSec) this.lastSec = message.createdAt;
    }
    while (this.messages.size > MESSAGE_CAP) {
      const oldest = this.messages.keys().next().value;
      if (oldest === undefined) break;
      this.messages.delete(oldest);
    }
    const ordered = [...this.messages.values()].sort((a, b) => a.createdAt - b.createdAt);
    this.derived = deriveAxetState(ordered);
    this.confirm(ordered, now);
  }

  private confirm(ordered: AxetDbMessage[], now: number): void {
    if (this.unconfirmed.length === 0) return;
    const before = this.unconfirmed.length;
    const state = this.derived?.state;
    const openCallId = state === "asking" ? this.derived?.question?.callId : undefined;
    this.unconfirmed = this.unconfirmed
      // Soru açıkken yazılan satır: o soru kapandıysa cevap yerine ulaşmış, düşür.
      .filter((n) => n.askCallId === undefined || n.askCallId === openCallId)
      .filter((n) => {
        // Yalnız istemin özgün yazılma anından (submitMs) sonraki kullanıcı
        // mesajlarıyla doğrula: eski oturumdaki aynı metin doğrulama sayılmasın.
        const cutSec = Math.floor(n.submitMs / 1000) - 2;
        return !ordered.some((m) => m.role === "user" && m.createdAt >= cutSec && promptStartsWith(textOf(m), n.key));
      })
      .map((n) => {
        // Çalışırken ya da asking'te (üst sınır dahilinde) sayaç dondurulur.
        // Asking üst sınırı aşılırsa dondurma sona erer, normal 30 sn devreye girer.
        // Soru açıkken yazılan satırın sayacı dondurulmaz: aynı soru hâlâ açıksa
        // satır ne soruya ne bu oturuma ulaşmış demek.
        const frozen =
          n.askCallId === undefined &&
          (state === "running" || (state === "asking" && now - n.submitMs < ASKING_FREEZE_MAX_MS));
        return frozen ? { ...n, atMs: now } : n;
      });
    const shouldUnbind = this.unconfirmed.some((n) => {
      // Asking'te ASKING_FREEZE_MAX_MS geçmişse hemen çöz (sayaç bekleme).
      if (state === "asking" && now - n.submitMs >= ASKING_FREEZE_MAX_MS) return true;
      return now - n.atMs >= UNCONFIRMED_LIMIT_MS;
    });
    if (shouldUnbind) {
      this.unbind(now);
      return;
    }
    if (this.unconfirmed.length !== before) this.publishPending();
  }
}
