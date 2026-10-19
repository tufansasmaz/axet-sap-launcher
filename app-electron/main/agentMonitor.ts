// Ajan Alanı'nın ana süreç izleyicisi (spec 2026-10-17 ajan-alani §6, §7,
// §9, §11). Her ajan bölmesi için bir okuyucu tutuyor; terminal çıktısını ve
// yazılan tuşları ona veriyor, saniyede bir yokluyor, durum DEĞİŞİNCE
// renderer'a gönderiyor.
//
// Kurallar:
//   - Hiçbir yol hata fırlatmıyor (ana süreçte yakalanmamış istisna yok).
//   - Bildirim yalnız KESİN durumda: tahmini "bitti" yanlış alarm olurdu.
//   - Günlüğe yalnız etiket ve kısa alanlar; soru, seçenek, yazılan metin asla.
//   - Kararlar cevabı, soru hâlâ açıksa VE kullanıcı o soruya terminalde
//     dokunmadıysa gönderiliyor: dokunduysa imleç yer değiştirmiş olabilir,
//     `↓ × i` yanlış seçeneği onaylardı.
import { cleanCustomAnswer, customAnswerKeys, isCustomAnswerable, isListAnswerable, optionKeys } from "../shared/agentDecisions";
import {
  AGENT_ROLE_MAX,
  isAgentEngineId,
  type AgentAnswerResult,
  type AgentQuestion,
  type AgentRegistration,
  type AgentRoleKind,
  type AgentStatus,
  type AgentStatusEvent
} from "../shared/agentTypes";
import { InputLineBuffer } from "./agentInput";
import { AxetSetupPilot, isTerminalReport, type AutoSetupOutcome, type AxetAutoSetupPrefs } from "./axetAutoSetup";
import { stripAnsi } from "./agentGenericReader";
import { redact } from "./support/redact";
import type { AgentReader } from "./agentGenericReader";
import type { AgentNotificationKind } from "./agentNotification";
import { decideRetry, retryDelayMs, retryPromptFor, type AgentErrorClass, type RetryBlock } from "../shared/agentErrors";
import type { GateResult } from "./agentGate";

/** Son tuştan bu kadar süre geçmeden listeden cevap gönderilmiyor. */
export const TYPING_GUARD_MS = 2_000;

/**
 * Pano istemi yazıldıktan sonra Enter'a kadar beklenen süre. Bazı TUI'ler
 * tek parçada gelen "metin + Enter"i yapıştırma sayıp Enter'ı satır sonu
 * yapabiliyor; Enter ayrı yazılıyor ve o anda motor yeniden denetleniyor.
 */
export const PROMPT_ENTER_DELAY_MS = 150;

export type AgentPromptResult = "ok" | "noAgent" | "notRunning" | "asking" | "typing" | "busy" | "invalid" | "writeFailed";

/** Tur 9: el ile "Yeniden dene" sonucu. */
export type AgentRetryResult = AgentPromptResult | "notError" | "noPrompt";

/** Kapı kapalıyken (429 beklemesi / eşzamanlılık) bekleyen deneme bu kadar sonra yeniden bakar. */
export const RETRY_GATE_RECHECK_MS = 5_000;

/** Bildirime giden hata özeti. */
export interface AgentErrorNotice {
  cls: AgentErrorClass;
  attempts: number;
  max: number;
}

/** Görev panosunun gördüğü ajan (spec 2026-10-18 gorev-panosu §5). */
export interface AgentPresence {
  reg: AgentRegistration;
  status: AgentStatus | null;
  /** Taslak yok ve son tuş TYPING_GUARD_MS'den eski. */
  inputIdle: boolean;
  /** Komut yankısından sonra motorun çıktısı görüldü; okuyucu hatasında false. */
  engineReady: boolean;
}

export type LogFields = Record<string, string | number | boolean>;

export interface MonitorDeps {
  now(): number;
  createReader(reg: AgentRegistration): AgentReader;
  emit(event: AgentStatusEvent): void;
  notify(kind: AgentNotificationKind, reg: AgentRegistration, error?: AgentErrorNotice): void;
  write(ptyId: string, data: string): boolean;
  /** Kayıttan önce bölmeye düşmüş çıktı (komut yankısı kaçmasın). */
  backlog(ptyId: string): string;
  log(tag: string, fields: LogFields): void;
  /** Gecikmeli iş (Enter). Yoksa setTimeout; testte enjekte. */
  schedule?(fn: () => void, ms: number): void;
  /**
   * Değişiklikler (spec 2026-10-18 degisiklikler §4.2): kullanıcı bölmede bir
   * satırı Enter ile gönderdi ve motor açık. Senkron dönmeli; iş arka planda.
   */
  onPromptLine?(reg: AgentRegistration, line: string): void;
  /**
   * Tur 8: axet-code açılış penceresinin otomatik seçimi. Ayar kapalıysa null
   * (eski davranış: kullanıcı terminalde seçer). Yalnız axet-code kaydında sorulur.
   */
  axetAutoSetup?(reg: AgentRegistration): AxetAutoSetupPrefs | null;
  /** Otomatik seçim bitti (bir kez): başarı ya da iki denemeden sonra başarısızlık. */
  onAutoSetup?(reg: AgentRegistration, outcome: AutoSetupOutcome): void;
  /** Tur 9: "Ajan hatalarında otomatik yeniden dene" ve en çok deneme. Yoksa kapalı. */
  retryPrefs?(): { auto: boolean; max: number };
  /** Tur 9: yeniden denemede gidecek satır (lider görevi gibi özel durum); null → motor kuralı. */
  retryText?(reg: AgentRegistration, lastPrompt: string | null): string | null;
  /** Tur 9: eşzamanlılık / 429 kapısı (otomatik deneme). Yoksa açık. */
  gate?(reg: AgentRegistration): GateResult;
  /** Tur 9: ajan istek sınırına (429) takıldı. */
  onRateLimit?(reg: AgentRegistration): void;
  /** Tur 9: hata kesinleşti (otomatik deneme yok/bitti); zincir başına bir kez. */
  onFinalError?(reg: AgentRegistration, status: AgentStatus): void;
  /** Sapma için (test). */
  rand?(): number;
}

export interface AgentMonitor {
  register(reg: AgentRegistration): void;
  unregister(paneId: string): void;
  onOutput(ptyId: string, data: string): void;
  onInput(ptyId: string, data: string): void;
  onExit(ptyId: string): void;
  tick(): void;
  answer(paneId: string, callId: string, index: number): AgentAnswerResult;
  /**
   * Tur 7: serbest cevap (yalnız axet-code, kesin kaynak, tek seçimli soru).
   * `↓ × seçenek sayısı` + metin tek yazım, Enter PROMPT_ENTER_DELAY_MS sonra ayrı;
   * arada kullanıcı yazdıysa ya da soru kapandıysa Enter gönderilmiyor. Tek seferlik.
   */
  answerText(paneId: string, callId: string, text: string): AgentAnswerResult;
  snapshot(): AgentStatusEvent[];
  agents(): AgentPresence[];
  sendPrompt(paneId: string, text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult;
  /** Tur 9: kartın "Yeniden dene"si: son istem (axet-code'da devam) hemen; sayaç sıfırlanır. */
  retryNow(paneId: string): AgentRetryResult;
  /** Tur 9: bekleyen otomatik denemeyi iptal et. */
  cancelRetry(paneId: string): boolean;
  /** Tur 9: bölmeye en son gönderilen istem (kullanıcı ya da pano). */
  lastPrompt(paneId: string): string | null;
  dispose(): void;
}

/** Tur 9: bir hatadan başlayıp başarıyla ya da vazgeçişle biten zincir. */
interface RetryChain {
  key: string;
  attempts: number;
  max: number;
  errorAt: number;
  pending: { attempt: number; at: number; token: number } | null;
  /** Deneme gönderildi; sonraki hata aynı zincirde sayılır. */
  sentAt: number | null;
  blocked: RetryBlock | null;
  notifiedKey: string | null;
}

interface Entry {
  reg: AgentRegistration;
  reader: AgentReader;
  input: InputLineBuffer;
  lastInputAt: number;
  last: AgentStatus | null;
  /** Listeden cevaplanan soru kimlikleri: kapanınca "terminal" yazılmasın. */
  listAnswered: Set<string>;
  /** "asking" bildirimi gönderilen soru kimlikleri: dalgalanmada ikinci bildirim çıkmasın. */
  notifiedQuestions: Set<string>;
  /** Pano istemi Enter bekliyor: ikinci sendPrompt reddedilsin. */
  promptInFlight: boolean;
  /** Tur 8: kullanıcının son tuşu (terminalin kendi cevapları hariç). */
  userInputAt: number;
  pilot: AxetSetupPilot | null;
  lastPrompt: string | null;
  chain: RetryChain | null;
}

const SOURCE_LOG = { exact: "kesin", estimated: "tahmini" } as const;

/** Çalışırken son etkinlik sürekli değişiyor; o yüzden karşılaştırmaya girmiyor. */
function sameStatus(a: AgentStatus, b: AgentStatus): boolean {
  if (a.state !== b.state || a.source !== b.source || a.detail !== b.detail || a.reply !== b.reply) return false;
  // Tur 6: aşama, tahmini tur ve bağ sebebi değişince de yayınla.
  if (a.link !== b.link || a.turn?.at !== b.turn?.at || a.turn?.done !== b.turn?.done) return false;
  if (a.phase?.kind !== b.phase?.kind || a.phase?.tool !== b.phase?.tool || a.phase?.target !== b.phase?.target) return false;
  if (a.question?.callId !== b.question?.callId) return false;
  // Tur 9: hata, deneme sayacı ve geri sayım değişince de yayınla.
  if (a.error?.cls !== b.error?.cls || a.error?.detail !== b.error?.detail || a.attempts !== b.attempts || a.retryBlocked !== b.retryBlocked) return false;
  if (a.retry?.at !== b.retry?.at || a.retry?.attempt !== b.retry?.attempt) return false;
  return a.state === "running" || a.lastActivity === b.lastActivity;
}

export function createAgentMonitor(deps: MonitorDeps): AgentMonitor {
  const byPane = new Map<string, Entry>();
  const paneOfPty = new Map<string, string>();

  const guard = (fn: () => void): void => {
    try {
      fn();
    } catch {
      // İzleyici hatası ana süreci düşürmesin (spec §10).
    }
  };

  const entryOfPty = (ptyId: string): Entry | undefined => {
    const paneId = paneOfPty.get(ptyId);
    return paneId ? byPane.get(paneId) : undefined;
  };

  let retryToken = 0;
  const schedule = (fn: () => void, ms: number) => {
    const run = () => guard(fn);
    if (deps.schedule) deps.schedule(run, ms);
    else setTimeout(run, ms);
  };
  const errorKey = (s: AgentStatus) => `${s.error?.cls}|${s.state}|${s.lastActivity ?? ""}`;

  function scheduleRetry(entry: Entry, chain: RetryChain, attempt: number, delay: number): void {
    const token = ++retryToken;
    chain.pending = { attempt, at: deps.now() + delay, token };
    schedule(() => fireRetry(entry, token), delay);
  }

  /** Tur 9: durumun hata zinciri alanları; yeni hatada karar. */
  function decorate(entry: Entry, input: AgentStatus): AgentStatus {
    // Kesin hata ayrıntısız gelirse (eski biçim) bilinmeyen sınıf: yine tek bildirim.
    const raw: AgentStatus =
      input.state === "error" && input.source === "exact" && !input.error ? { ...input, error: { cls: "unknown", detail: "", source: "exact" } } : input;
    if (!raw.error || (raw.state !== "error" && raw.state !== "finished")) {
      const chain = entry.chain;
      // Deneme gönderildi ve ajan çalışıyor/soru soruyor: zincir sürüyor. Başka her şey zinciri bitirir.
      if (chain && !(chain.sentAt !== null && (raw.state === "running" || raw.state === "asking"))) entry.chain = null;
      return raw;
    }
    const error = raw.error;
    const key = errorKey(raw);
    let chain = entry.chain;
    if (!chain || chain.key !== key) {
      const continuing = chain !== null && chain.sentAt !== null;
      let prefs = { auto: false, max: 0 };
      try {
        prefs = deps.retryPrefs?.() ?? prefs;
      } catch {
        // ayar okunamazsa otomatik deneme yok
      }
      chain = entry.chain = {
        key,
        attempts: continuing && chain ? chain.attempts : 0,
        max: prefs.max,
        errorAt: deps.now(),
        pending: null,
        sentAt: null,
        blocked: null,
        notifiedKey: chain?.notifiedKey ?? null
      };
      if (error.cls === "rateLimit") guard(() => deps.onRateLimit?.(entry.reg));
      const decision = decideRetry({ cls: error.cls, attempts: chain.attempts, auto: prefs.auto, max: prefs.max, alive: raw.state === "error" });
      if (decision.auto) {
        scheduleRetry(entry, chain, decision.attempt, retryDelayMs(decision.attempt, deps.rand ?? Math.random));
        guard(() => deps.log("ajan.hata", { motor: entry.reg.engine, sinif: error.cls, deneme: decision.attempt }));
      } else {
        chain.blocked = decision.reason;
        guard(() => deps.log("ajan.hata", { motor: entry.reg.engine, sinif: error.cls, sonuc: decision.reason }));
      }
    }
    return {
      ...raw,
      ...(chain.max > 0 ? { attempts: chain.attempts, maxAttempts: chain.max } : {}),
      ...(chain.pending ? { retry: { attempt: chain.pending.attempt, max: chain.max, at: chain.pending.at } } : {}),
      ...(chain.blocked ? { retryBlocked: chain.blocked } : {})
    };
  }

  function blockRetry(entry: Entry, chain: RetryChain, reason: RetryBlock, silent = false): void {
    chain.pending = null;
    chain.blocked = reason;
    if (silent) chain.notifiedKey = chain.key;
    evaluate(entry);
  }

  function retryTextFor(entry: Entry): string | null {
    let custom: string | null = null;
    try {
      custom = deps.retryText?.(entry.reg, entry.lastPrompt) ?? null;
    } catch {
      custom = null;
    }
    return custom ?? retryPromptFor(entry.reg.engine, entry.lastPrompt);
  }

  function fireRetry(entry: Entry, token: number): void {
    const chain = entry.chain;
    if (!chain?.pending || chain.pending.token !== token || byPane.get(entry.reg.paneId) !== entry) return;
    entry.reader.poll();
    const current = entry.reader.status();
    // Ajan başka işe geçti (çalışıyor / yeni durum): deneme gereksiz.
    if (current.state !== "error" || errorKey(current) !== chain.key) {
      chain.pending = null;
      evaluate(entry);
      return;
    }
    // Kullanıcı hatadan sonra terminale yazdıysa otomatik deneme yok.
    if (entry.userInputAt > chain.errorAt || entry.input.hasDraft()) return blockRetry(entry, chain, "user");
    let gate: GateResult = "ok";
    try {
      gate = deps.gate?.(entry.reg) ?? "ok";
    } catch {
      gate = "ok";
    }
    if (gate !== "ok") {
      // Deneme hakkı yenmiyor; kapı açılınca gider.
      scheduleRetry(entry, chain, chain.pending.attempt, RETRY_GATE_RECHECK_MS);
      return;
    }
    const text = retryTextFor(entry);
    if (!text) return blockRetry(entry, chain, "noPrompt");
    const attempt = chain.pending.attempt;
    const result = sendPromptInner(entry.reg.paneId, text, undefined, true);
    if (result !== "ok") return blockRetry(entry, chain, result === "typing" ? "user" : "sendFailed");
    chain.pending = null;
    chain.attempts = attempt;
    chain.sentAt = deps.now();
    guard(() => deps.log("ajan.yenidenDeneme", { motor: entry.reg.engine, deneme: attempt, yol: "otomatik" }));
    evaluate(entry);
  }

  function evaluate(entry: Entry): void {
    const next = decorate(entry, entry.reader.status());
    const prev = entry.last;
    if (prev && sameStatus(prev, next)) return;
    entry.last = next;
    const motor = entry.reg.engine;
    deps.emit({ paneId: entry.reg.paneId, status: next });
    if (!prev || prev.state !== next.state || prev.source !== next.source) {
      deps.log("ajan.durum", { motor, durum: next.state, kaynak: SOURCE_LOG[next.source] });
    }
    if (next.source === "exact") {
      const askCallId = next.state === "asking" ? next.question?.callId : undefined;
      if (askCallId && !entry.notifiedQuestions.has(askCallId)) {
        entry.notifiedQuestions.add(askCallId);
        deps.notify("asking", entry.reg);
      }
      // Yalnız gerçek tur bitişi (idle): motor çıkışı/çökmesi (finished) duyurulmuyor.
      const finishedWork =
        next.state === "idle" &&
        prev?.state === "running" &&
        prev.source === "exact";
      if (finishedWork) deps.notify("done", entry.reg);
    }
    // Tur 9: hata bildirimi yalnız kesinleşince (otomatik deneme yok/bitti), zincir başına bir kez.
    const chain = entry.chain;
    if (chain && next.error && !chain.pending && chain.blocked && chain.notifiedKey !== chain.key) {
      chain.notifiedKey = chain.key;
      deps.notify("error", entry.reg, { cls: next.error.cls, attempts: chain.attempts, max: chain.max });
      guard(() => deps.onFinalError?.(entry.reg, next));
    }
    const closedId = prev?.state === "asking" ? prev.question?.callId : undefined;
    const stillOpen = next.state === "asking" && next.question?.callId === closedId;
    if (closedId && !stillOpen && !entry.listAnswered.delete(closedId)) {
      deps.log("ajan.karar", { motor, yol: "terminal" });
    }
  }

  function createPilot(entry: Entry): AxetSetupPilot | null {
    if (entry.reg.engine !== "axet-code" || !deps.axetAutoSetup) return null;
    let prefs: AxetAutoSetupPrefs | null = null;
    try {
      prefs = deps.axetAutoSetup(entry.reg);
    } catch {
      prefs = null;
    }
    if (!prefs) return null;
    const paneId = entry.reg.paneId;
    return new AxetSetupPilot(prefs, {
      now: deps.now,
      write: (data) => byPane.get(paneId) === entry && deps.write(entry.reg.ptyId, data),
      schedule: (fn, ms) => {
        const run = () => guard(fn);
        if (deps.schedule) deps.schedule(run, ms);
        else setTimeout(run, ms);
      },
      lastUserInputAt: () => entry.userInputAt,
      hasDraft: () => entry.input.hasDraft(),
      onSettled: (outcome) => {
        guard(() => deps.log("ajan.aracSecimi", { motor: entry.reg.engine, sonuc: outcome.ok ? "otomatik" : "basarisiz" }));
        guard(() => deps.onAutoSetup?.(entry.reg, outcome));
      }
    });
  }

  function unregister(paneId: string): void {
    const entry = byPane.get(paneId);
    if (!entry) return;
    byPane.delete(paneId);
    if (paneOfPty.get(entry.reg.ptyId) === paneId) paneOfPty.delete(entry.reg.ptyId);
    guard(() => entry.reader.dispose());
  }

  function register(reg: AgentRegistration): void {
    guard(() => {
      unregister(reg.paneId);
      const entry: Entry = {
        reg,
        reader: deps.createReader(reg),
        input: new InputLineBuffer(),
        lastInputAt: 0,
        last: null,
        listAnswered: new Set(),
        notifiedQuestions: new Set(),
        promptInFlight: false,
        userInputAt: 0,
        pilot: null,
        lastPrompt: null,
        chain: null
      };
      entry.pilot = createPilot(entry);
      byPane.set(reg.paneId, entry);
      paneOfPty.set(reg.ptyId, reg.paneId);
      if (reg.added) {
        deps.log("ajan.eklendi", {
          motor: reg.engine,
          rol: reg.roleKind === "custom" ? "serbest" : "hazir",
          sap: reg.sap ? "evet" : "hayir"
        });
      }
      const backlog = deps.backlog(reg.ptyId);
      if (backlog) entry.reader.feedOutput(backlog);
      if (backlog && entry.pilot) guard(() => entry.pilot?.feed(stripAnsi(backlog)));
      evaluate(entry);
    });
  }

  /** Cevaptan önceki ortak denetim: soru hâlâ açık, cevaplanmamış, kesin kaynakta. */
  function openQuestion(entry: Entry, callId: string): AgentQuestion | AgentAnswerResult {
    // Yeniden doğrula: soru aynı anda terminalden cevaplanmış olabilir (spec §7).
    entry.reader.poll();
    const status = entry.reader.status();
    const question = status.question;
    if (status.state !== "asking" || !question || question.callId !== callId) {
      evaluate(entry);
      return { ok: false, reason: "closed" };
    }
    if (entry.listAnswered.has(callId)) return { ok: false, reason: "alreadyAnswered" };
    // Yalnız kesin kaynakta listeden cevap (tahmini okuyucu soru üretmiyor ama sözleşme burada denetleniyor).
    if (status.source !== "exact") return { ok: false, reason: "notAnswerable" };
    return question;
  }

  // `askedAt` saniye çözünürlüklü: 1 sn pay, şüphede gönderme.
  const touchedSince = (entry: Entry, question: AgentQuestion): boolean => {
    const touched = entry.lastInputAt > 0 && entry.lastInputAt >= question.askedAt - 1_000;
    return entry.input.hasDraft() || touched || deps.now() - entry.lastInputAt < TYPING_GUARD_MS;
  };

  function answer(paneId: string, callId: string, index: number): AgentAnswerResult {
    const entry = byPane.get(paneId);
    if (!entry) return { ok: false, reason: "noAgent" };
    try {
      const question = openQuestion(entry, callId);
      if ("ok" in question) return question;
      if (
        !isListAnswerable(question) ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= question.options.length
      ) {
        return { ok: false, reason: "notAnswerable" };
      }
      if (touchedSince(entry, question)) return { ok: false, reason: "typing" };
      if (!deps.write(entry.reg.ptyId, optionKeys(index))) return { ok: false, reason: "writeFailed" };
      entry.listAnswered.add(callId);
      try {
        deps.log("ajan.karar", { motor: entry.reg.engine, yol: "liste" });
      } catch {
        // Log hatası sonucu değiştirmez: yazma başardı.
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "writeFailed" };
    }
  }

  function answerText(paneId: string, callId: string, raw: string): AgentAnswerResult {
    const clean = cleanCustomAnswer(raw);
    if (clean === null) return { ok: false, reason: "notAnswerable" };
    const entry = byPane.get(paneId);
    if (!entry) return { ok: false, reason: "noAgent" };
    try {
      const question = openQuestion(entry, callId);
      if ("ok" in question) return question;
      // Tuş dizisi yalnız axet-code'da ölçüldü (Tur 7).
      if (entry.reg.engine !== "axet-code" || !isCustomAnswerable(question)) return { ok: false, reason: "notAnswerable" };
      if (touchedSince(entry, question)) return { ok: false, reason: "typing" };
      // Gizli süzgeç: anahtar/parola/JWT desenleri ajana yazılmıyor.
      const text = cleanCustomAnswer(redact(clean, []).text);
      if (text === null) return { ok: false, reason: "notAnswerable" };
      if (!deps.write(entry.reg.ptyId, customAnswerKeys(question.options.length, text))) return { ok: false, reason: "writeFailed" };
      // Tek seferlik: Enter gitmese de ikinci gönderim yok (metin kutuda; kullanıcı terminalde tamamlar).
      entry.listAnswered.add(callId);
      const sentAt = deps.now();
      const enter = () =>
        guard(() => {
          if (byPane.get(paneId) !== entry) return;
          // Arada kullanıcı yazdıysa Enter onun düzenlemesini de onaylardı.
          if (entry.lastInputAt >= sentAt || entry.input.hasDraft()) return;
          entry.reader.poll();
          const current = entry.reader.status();
          if (current.state !== "asking" || current.question?.callId !== callId) return;
          deps.write(entry.reg.ptyId, "\r");
        });
      if (deps.schedule) deps.schedule(enter, PROMPT_ENTER_DELAY_MS);
      else setTimeout(enter, PROMPT_ENTER_DELAY_MS);
      guard(() => deps.log("ajan.karar", { motor: entry.reg.engine, yol: "serbest" }));
      return { ok: true };
    } catch {
      return { ok: false, reason: "writeFailed" };
    }
  }

  const inputIdle = (entry: Entry): boolean =>
    !entry.input.hasDraft() && deps.now() - entry.lastInputAt >= TYPING_GUARD_MS;

  // Kapalı-güvenli: okuyucu hata verirse motor görülmemiş sayılıyor.
  const engineReady = (entry: Entry): boolean => {
    try {
      return entry.reader.engineReady();
    } catch {
      return false;
    }
  };

  // Görev panosunun istemi (spec 2026-10-18 gorev-panosu §5). Motor
  // çalışmıyorsa (kabuk istemi ekranda) HİÇBİR ŞEY yazılmıyor: yapay zekâ
  // metni asla cmd/PowerShell komutu olmamalı. Enter'dan önce yeniden bakılıyor.
  function sendPrompt(paneId: string, text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult {
    return sendPromptInner(paneId, text, onSettled, false);
  }

  function sendPromptInner(
    paneId: string,
    text: string,
    onSettled: ((outcome: "sent" | "aborted") => void) | undefined,
    retry: boolean
  ): AgentPromptResult {
    const entry = byPane.get(paneId);
    if (!entry) return "noAgent";
    // C0 + DEL + C1 + Unicode satır/paragraf ayırıcıları denetim karakteri sayılıyor.
    if (!text || text.length > 4_000 || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text)) return "invalid";
    // Ba\u015ftaki `!` TUI'yi kabuk kipine al\u0131r (sat\u0131r modeli ve izni atlay\u0131p kabukta
    // \u00e7al\u0131\u015f\u0131r), `/` motor komutu \u00e7al\u0131\u015ft\u0131r\u0131r. Pano \u00f6nek ekliyor; bu savunma derinli\u011fi.
    if (/^[!/]/.test(text.trim())) return "invalid";
    if (entry.promptInFlight) return "busy";
    let sentAt = 0;
    try {
      entry.reader.poll();
      const state = entry.reader.status().state;
      if (state === "finished") return "notRunning";
      // Kararlar listesi ekranda: yazma yanlış seçeneği onaylardı (savunma derinliği).
      if (state === "asking") return "asking";
      if (!inputIdle(entry)) return "typing";
      if (!deps.write(entry.reg.ptyId, text)) return "writeFailed";
      sentAt = deps.now();
    } catch {
      return "writeFailed";
    }
    entry.promptInFlight = true;
    const enter = () =>
      guard(() => {
        // settled: onSettled tam bir kez çağrılsın (poll/write/submitLine fırlatırsa finally yakalasın).
        let settled = false;
        const settle = (outcome: "sent" | "aborted") => {
          if (settled) return;
          settled = true;
          try { onSettled?.(outcome); } catch { /* geri çağrı hatası sonucu değiştirmez */ }
        };
        try {
          if (byPane.get(paneId) !== entry) { settle("aborted"); return; }
          // Arada kullanıcı yazdıysa Enter onun satırını da gönderirdi.
          // Motor da aynı pencerede çıktıysa istem metni kabuk satırında kalır;
          // \x1b ile temizle ki kullanıcının sonraki Enter'ı onu komut olarak çalıştırmasın.
          if (entry.lastInputAt >= sentAt || entry.input.hasDraft()) {
            entry.reader.poll();
            if (entry.reader.status().state === "finished") deps.write(entry.reg.ptyId, "\x1b");
            settle("aborted");
            return;
          }
          entry.reader.poll();
          if (entry.reader.status().state === "finished") {
            deps.write(entry.reg.ptyId, "\x1b");
            settle("aborted");
            return;
          }
          if (deps.write(entry.reg.ptyId, "\r")) {
            // Enter gitti: istem ajanda. Okuyucu hatası bunu "aborted"a çevirmemeli.
            settle("sent");
            // Tur 9: yeniden denemenin kendi satırı "son istem" sayılmıyor.
            if (!retry) entry.lastPrompt = text;
            guard(() => entry.reader.submitLine(text));
          } else {
            settle("aborted");
          }
        } finally {
          entry.promptInFlight = false;
          // poll/write/submitLine fırlattıysa ve settle henüz çağrılmadıysa "aborted".
          settle("aborted");
        }
      });
    try {
      if (deps.schedule) deps.schedule(enter, PROMPT_ENTER_DELAY_MS);
      else setTimeout(enter, PROMPT_ENTER_DELAY_MS);
    } catch {
      if (entry.promptInFlight) {
        // Zamanlayıcı enter'ı çalıştırmadan fırlattı: metin TUI'de yarım kaldı, temizle.
        entry.promptInFlight = false;
        guard(() => deps.write(entry.reg.ptyId, "\x1b"));
        return "writeFailed";
      }
      // enter eşzamanlı çalıştı (onSettled çağrıldı, kilit bırakıldı); sonuç geçerli.
    }
    return "ok";
  }

  return {
    register,
    unregister,
    onOutput(ptyId, data) {
      const entry = entryOfPty(ptyId);
      if (entry) guard(() => entry.reader.feedOutput(data));
      if (entry?.pilot && !entry.pilot.finished) guard(() => entry.pilot?.feed(stripAnsi(data)));
    },
    onInput(ptyId, data) {
      const entry = entryOfPty(ptyId);
      if (!entry) return;
      entry.lastInputAt = deps.now();
      if (!isTerminalReport(data)) entry.userInputAt = entry.lastInputAt;
      guard(() => {
        for (const line of entry.input.feed(data)) {
          // Motor kapalıyken (kabuk istemi ekranda) yazılan satır istem değil.
          // Kancanın hatası satırın okuyucuya gitmesini engellemiyor.
          if (entry.last?.state !== "finished") guard(() => deps.onPromptLine?.(entry.reg, line));
          const typed = line.trim();
          if (entry.last?.state !== "finished" && typed && !typed.startsWith("/")) entry.lastPrompt = typed.slice(0, 4_000);
          entry.reader.submitLine(line);
        }
      });
    },
    onExit(ptyId) {
      const paneId = paneOfPty.get(ptyId);
      if (paneId) unregister(paneId);
    },
    tick() {
      for (const entry of [...byPane.values()]) {
        guard(() => entry.reader.poll());
        if (entry.pilot && !entry.pilot.finished) guard(() => entry.pilot?.tick());
        guard(() => evaluate(entry));
      }
    },
    answer,
    answerText,
    snapshot() {
      const out: AgentStatusEvent[] = [];
      for (const entry of byPane.values()) {
        if (entry.last) out.push({ paneId: entry.reg.paneId, status: entry.last });
      }
      return out;
    },
    agents() {
      const out: AgentPresence[] = [];
      for (const entry of byPane.values()) {
        out.push({ reg: entry.reg, status: entry.last, inputIdle: inputIdle(entry), engineReady: engineReady(entry) });
      }
      return out;
    },
    sendPrompt,
    retryNow(paneId) {
      const entry = byPane.get(paneId);
      if (!entry) return "noAgent";
      try {
        entry.reader.poll();
        const current = entry.reader.status();
        if (current.state === "finished") return "notRunning";
        if (current.state !== "error") return "notError";
        const text = retryTextFor(entry);
        if (!text) return "noPrompt";
        const result = sendPromptInner(paneId, text, undefined, true);
        if (result !== "ok") return result;
        // El ile deneme sayacı sıfırlar; zincir sürer (sonraki geçici hata yine otomatik denenir).
        const key = errorKey(current);
        let max = 0;
        try {
          max = deps.retryPrefs?.().max ?? 0;
        } catch {
          max = 0;
        }
        entry.chain = { key, attempts: 0, max, errorAt: deps.now(), pending: null, sentAt: deps.now(), blocked: null, notifiedKey: key };
        guard(() => deps.log("ajan.yenidenDeneme", { motor: entry.reg.engine, yol: "elle" }));
        evaluate(entry);
        return "ok";
      } catch {
        return "writeFailed";
      }
    },
    cancelRetry(paneId) {
      const entry = byPane.get(paneId);
      const chain = entry?.chain;
      if (!entry || !chain?.pending) return false;
      guard(() => blockRetry(entry, chain, "cancelled", true));
      return true;
    },
    lastPrompt: (paneId) => byPane.get(paneId)?.lastPrompt ?? null,
    dispose() {
      for (const paneId of [...byPane.keys()]) unregister(paneId);
    }
  };
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Renderer'dan gelen kaydı doğrular; bozuksa null (IPC işleyicisi yok sayar). */
export function readAgentRegistration(raw: unknown): AgentRegistration | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const paneId = text(record.paneId, 100);
  const ptyId = text(record.ptyId, 100);
  const cwd = text(record.cwd, 1_000);
  if (!paneId || !ptyId || !isAgentEngineId(record.engine) || !cwd.trim()) return null;
  const roleKind: AgentRoleKind =
    record.roleKind === "preset" || record.roleKind === "axetAgent" ? record.roleKind : "custom";
  const workspaceIdRaw = text(record.workspaceId, 100).trim();
  const workspaceId = /^[A-Za-z0-9_-]{1,100}$/.test(workspaceIdRaw) ? workspaceIdRaw : "";
  const role = text(record.role, 200).trim().slice(0, AGENT_ROLE_MAX).trim();
  return {
    paneId,
    ptyId,
    engine: record.engine,
    cwd,
    command: text(record.command, 400),
    name: text(record.name, 60),
    roleKind,
    sap: record.sap === true,
    added: record.added === true,
    ...(workspaceId ? { workspaceId } : {}),
    ...(role ? { role } : {})
  };
}
