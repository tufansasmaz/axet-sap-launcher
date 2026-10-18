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
import { isListAnswerable, optionKeys } from "../shared/agentDecisions";
import {
  AGENT_ROLE_MAX,
  isAgentEngineId,
  type AgentAnswerResult,
  type AgentRegistration,
  type AgentRoleKind,
  type AgentStatus,
  type AgentStatusEvent
} from "../shared/agentTypes";
import { InputLineBuffer } from "./agentInput";
import type { AgentReader } from "./agentGenericReader";
import type { AgentNotificationKind } from "./agentNotification";

/** Son tuştan bu kadar süre geçmeden listeden cevap gönderilmiyor. */
export const TYPING_GUARD_MS = 2_000;

/**
 * Pano istemi yazıldıktan sonra Enter'a kadar beklenen süre. Bazı TUI'ler
 * tek parçada gelen "metin + Enter"i yapıştırma sayıp Enter'ı satır sonu
 * yapabiliyor; Enter ayrı yazılıyor ve o anda motor yeniden denetleniyor.
 */
export const PROMPT_ENTER_DELAY_MS = 150;

export type AgentPromptResult = "ok" | "noAgent" | "notRunning" | "asking" | "typing" | "busy" | "invalid" | "writeFailed";

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
  notify(kind: AgentNotificationKind, reg: AgentRegistration): void;
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
}

export interface AgentMonitor {
  register(reg: AgentRegistration): void;
  unregister(paneId: string): void;
  onOutput(ptyId: string, data: string): void;
  onInput(ptyId: string, data: string): void;
  onExit(ptyId: string): void;
  tick(): void;
  answer(paneId: string, callId: string, index: number): AgentAnswerResult;
  snapshot(): AgentStatusEvent[];
  agents(): AgentPresence[];
  sendPrompt(paneId: string, text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult;
  dispose(): void;
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
}

const SOURCE_LOG = { exact: "kesin", estimated: "tahmini" } as const;

/** Çalışırken son etkinlik sürekli değişiyor; o yüzden karşılaştırmaya girmiyor. */
function sameStatus(a: AgentStatus, b: AgentStatus): boolean {
  if (a.state !== b.state || a.source !== b.source || a.detail !== b.detail || a.reply !== b.reply) return false;
  if (a.question?.callId !== b.question?.callId) return false;
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

  function evaluate(entry: Entry): void {
    const next = entry.reader.status();
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
    const closedId = prev?.state === "asking" ? prev.question?.callId : undefined;
    const stillOpen = next.state === "asking" && next.question?.callId === closedId;
    if (closedId && !stillOpen && !entry.listAnswered.delete(closedId)) {
      deps.log("ajan.karar", { motor, yol: "terminal" });
    }
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
        promptInFlight: false
      };
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
      evaluate(entry);
    });
  }

  function answer(paneId: string, callId: string, index: number): AgentAnswerResult {
    const entry = byPane.get(paneId);
    if (!entry) return { ok: false, reason: "noAgent" };
    try {
      // Yeniden doğrula: soru aynı anda terminalden cevaplanmış olabilir (spec §7).
      entry.reader.poll();
      const status = entry.reader.status();
      const question = status.question;
      if (status.state !== "asking" || !question || question.callId !== callId) {
        evaluate(entry);
        return { ok: false, reason: "closed" };
      }
      if (entry.listAnswered.has(callId)) {
        return { ok: false, reason: "alreadyAnswered" };
      }
      // Yalnız kesin kaynakta listeden cevap (tahmini okuyucu soru üretmiyor ama sözleşme burada denetleniyor).
      if (status.source !== "exact") {
        return { ok: false, reason: "notAnswerable" };
      }
      if (
        !isListAnswerable(question) ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= question.options.length
      ) {
        return { ok: false, reason: "notAnswerable" };
      }
      // `askedAt` saniye çözünürlüklü: 1 sn pay, şüphede gönderme.
      const touched = entry.lastInputAt > 0 && entry.lastInputAt >= question.askedAt - 1_000;
      if (entry.input.hasDraft() || touched || deps.now() - entry.lastInputAt < TYPING_GUARD_MS) {
        return { ok: false, reason: "typing" };
      }
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
  function sendPrompt(
    paneId: string,
    text: string,
    onSettled?: (outcome: "sent" | "aborted") => void
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
    },
    onInput(ptyId, data) {
      const entry = entryOfPty(ptyId);
      if (!entry) return;
      entry.lastInputAt = deps.now();
      guard(() => {
        for (const line of entry.input.feed(data)) {
          // Motor kapalıyken (kabuk istemi ekranda) yazılan satır istem değil.
          // Kancanın hatası satırın okuyucuya gitmesini engellemiyor.
          if (entry.last?.state !== "finished") guard(() => deps.onPromptLine?.(entry.reg, line));
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
        guard(() => evaluate(entry));
      }
    },
    answer,
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
