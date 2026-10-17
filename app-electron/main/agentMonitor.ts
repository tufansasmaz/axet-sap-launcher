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

export type AgentPromptResult = "ok" | "noAgent" | "notRunning" | "typing" | "invalid" | "writeFailed";

/** Görev panosunun gördüğü ajan (spec 2026-10-18 gorev-panosu §5). */
export interface AgentPresence {
  reg: AgentRegistration;
  status: AgentStatus | null;
  /** Taslak yok ve son tuş TYPING_GUARD_MS'den eski. */
  inputIdle: boolean;
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
  sendPrompt(paneId: string, text: string): AgentPromptResult;
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
}

const SOURCE_LOG = { exact: "kesin", estimated: "tahmini" } as const;

/** Çalışırken son etkinlik sürekli değişiyor; o yüzden karşılaştırmaya girmiyor. */
function sameStatus(a: AgentStatus, b: AgentStatus): boolean {
  if (a.state !== b.state || a.source !== b.source || a.detail !== b.detail) return false;
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
        notifiedQuestions: new Set()
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

  // Görev panosunun istemi (spec 2026-10-18 gorev-panosu §5). Motor
  // çalışmıyorsa (kabuk istemi ekranda) HİÇBİR ŞEY yazılmıyor: yapay zekâ
  // metni asla cmd/PowerShell komutu olmamalı. Enter'dan önce yeniden bakılıyor.
  function sendPrompt(paneId: string, text: string): AgentPromptResult {
    const entry = byPane.get(paneId);
    if (!entry) return "noAgent";
    if (!text || /[\u0000-\u001f\u007f]/.test(text)) return "invalid";
    let sentAt = 0;
    try {
      entry.reader.poll();
      if (entry.reader.status().state === "finished") return "notRunning";
      if (!inputIdle(entry)) return "typing";
      if (!deps.write(entry.reg.ptyId, text)) return "writeFailed";
      sentAt = deps.now();
    } catch {
      return "writeFailed";
    }
    const enter = () =>
      guard(() => {
        if (byPane.get(paneId) !== entry) return;
        // Arada kullanıcı yazdıysa Enter onun satırını da gönderirdi: bırak.
        if (entry.lastInputAt > sentAt || entry.input.hasDraft()) return;
        entry.reader.poll();
        if (entry.reader.status().state === "finished") {
          deps.write(entry.reg.ptyId, "\x1b");
          return;
        }
        if (deps.write(entry.reg.ptyId, "\r")) entry.reader.submitLine(text);
      });
    if (deps.schedule) deps.schedule(enter, PROMPT_ENTER_DELAY_MS);
    else setTimeout(enter, PROMPT_ENTER_DELAY_MS);
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
        for (const line of entry.input.feed(data)) entry.reader.submitLine(line);
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
      for (const entry of byPane.values()) out.push({ reg: entry.reg, status: entry.last, inputIdle: inputIdle(entry) });
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
  const workspaceId = text(record.workspaceId, 100).trim();
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
