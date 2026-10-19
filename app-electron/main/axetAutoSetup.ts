// Tur 8: axet-code açılış penceresinin otomatik seçimi (kullanıcı isteği
// 2026-10-19: "axet.code açıldığında tool select kısmı otomatik seçilmiyor").
//
// Ölçüm (.superpowers/olcum/arac-secim/OLCUM.md, axet-code 1.4.1):
//   - "Select Tool / Choose your development tool": aXet.Code (vurgulu) ve
//     Codex (OpenAI). Enter → aXet.Code; ↓ + Enter → Codex.
//   - "Switch Model / To start, let's choose a provider and model": vurgulu
//     "Recently used" ilki; Enter onu seçiyor ("large model changed to X").
//     Süzgece yazılan metin listeyi daraltıyor, Enter ilk eşleşmeyi seçiyor.
//   - TUI'de model bayrağı YOK (`-m`: "Unknown shorthand flag"); seçimi
//     atlatan bayrak/ayar yok. Bu yüzden tuşla seçiliyor.
//   - Pencere metni görüldüğü an (0 ms) ve 400 ms sonra gönderilen Enter
//     alındı; yine de altbilgi ("enter confirm") görülmeden gönderilmiyor.
//
// Kurallar: yalnız açılışta (sohbet altbilgisi görülünce iş biter), kullanıcı
// o an yazıyorsa beklenir, pencereye dokunduysa çekilinir; aynı pencere için
// en çok 2 deneme, sonra bir kez "başarısız".

import { AXET_AUTO_MODEL_MAX, AXET_TOOL_LABEL, type AxetAutoSetupPrefs } from "../shared/axetSetupPrefs";

export {
  AXET_TOOL_CHOICES,
  AXET_TOOL_LABEL,
  normalizeAutoModel,
  normalizeAutoTool,
  type AxetAutoSetupPrefs,
  type AxetToolChoice
} from "../shared/axetSetupPrefs";

export type AxetDialog = "tool" | "model" | "chat";

export type AutoSetupOutcome = { ok: true; tool: string; model: string } | { ok: false; dialog: "tool" | "model" };

/** Altbilgi görüldükten sonra ilk tuşa kadar. */
export const AUTO_SETUP_SEND_DELAY_MS = 300;
/** Tuştan sonra pencere hâlâ açıksa yeniden deneme / başarısızlık. Model yüklemesi ~5 sn sürdü. */
export const AUTO_SETUP_RETRY_MS = 10_000;
export const AUTO_SETUP_MAX_ATTEMPTS = 2;
/** Son tuştan bu kadar süre geçmeden gönderilmiyor (agentMonitor.TYPING_GUARD_MS ile aynı). */
const TYPING_GUARD_MS = 2_000;
const BUFFER_MAX = 8_000;

const TOOL_MARK = /Choose your development tool/gi;
const MODEL_MARK = /choose a provider and model/gi;
const CHAT_MARK = /ctrl\+j newline|tab focus chat|ctrl\+p commands/gi;
const FOOTER_MARK = /enter confirm/gi;

function lastIndex(re: RegExp, text: string): number {
  let at = -1;
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) at = m.index;
  return at;
}

/** Metinde en son görünen ekran; pencere ancak altbilgisi de çizildiyse sayılıyor. */
export function detectAxetDialog(text: string): AxetDialog | null {
  const tool = lastIndex(TOOL_MARK, text);
  const model = lastIndex(MODEL_MARK, text);
  const chat = lastIndex(CHAT_MARK, text);
  const top = Math.max(tool, model, chat);
  if (top < 0) return null;
  if (top === chat) return "chat";
  return lastIndex(FOOTER_MARK, text) > top ? (top === tool ? "tool" : "model") : null;
}

export interface KeyStep {
  data: string;
  /** Bir önceki adımdan sonra beklenecek süre. */
  delayMs: number;
}

export function setupKeySteps(kind: "tool" | "model", prefs: AxetAutoSetupPrefs): KeyStep[] {
  if (kind === "tool") {
    return prefs.tool === "codex" ? [{ data: "\x1b[B", delayMs: 0 }, { data: "\r", delayMs: 150 }] : [{ data: "\r", delayMs: 0 }];
  }
  return prefs.model ? [{ data: prefs.model, delayMs: 0 }, { data: "\r", delayMs: 400 }] : [{ data: "\r", delayMs: 0 }];
}

/** axet-code'un seçimden sonra yazdığı "large model changed to X" satırından X. */
export function changedModel(text: string): string | null {
  const m = /large model changed to (.+?)(?:\s*ctrl\+|\s{2,}|[\r\n]|$)/.exec(text);
  const name = m?.[1]?.trim();
  return name ? name.slice(0, AXET_AUTO_MODEL_MAX) : null;
}

// Terminalin kendi cevapları (DA, imleç konumu, odak, renk sorgusu, fare):
// xterm bunları onData ile yolluyor; kullanıcı yazısı sayılmamalı.
const REPORT = /^(?:\x1b\[[?>]?[\d;]*[cnRIO]|\x1b\[<[\d;]*[Mm]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[\?[\d;]*\$y)+$/;

export function isTerminalReport(data: string): boolean {
  return data.length > 1 && REPORT.test(data);
}

export interface PilotDeps {
  now(): number;
  write(data: string): boolean;
  schedule(fn: () => void, ms: number): void;
  /** Kullanıcının son tuşu (terminal cevapları hariç); hiç yoksa 0. */
  lastUserInputAt(): number;
  hasDraft(): boolean;
  onSettled(outcome: AutoSetupOutcome): void;
}

type DialogKind = "tool" | "model";

export class AxetSetupPilot {
  private buffer = "";
  private kind: DialogKind | null = null;
  private seenAt = 0;
  private attempts: Record<DialogKind, number> = { tool: 0, model: 0 };
  private sentAt = 0;
  private pending = false;
  private model: string | null = null;
  private done = false;

  constructor(
    private readonly prefs: AxetAutoSetupPrefs,
    private readonly deps: PilotDeps
  ) {}

  get finished(): boolean {
    return this.done;
  }

  feed(text: string): void {
    if (this.done || !text) return;
    this.buffer = (this.buffer + text).slice(-BUFFER_MAX);
    const name = changedModel(this.buffer);
    if (name) this.model = name;
    const seen = detectAxetDialog(this.buffer);
    if (seen === "chat") {
      this.settle();
      return;
    }
    if (seen && seen !== this.kind) {
      this.kind = seen;
      this.seenAt = this.deps.now();
    }
    this.consider();
  }

  tick(): void {
    if (this.done || this.pending || !this.kind) return;
    const tries = this.attempts[this.kind];
    if (tries === 0) {
      this.consider();
      return;
    }
    if (this.deps.now() - this.sentAt < AUTO_SETUP_RETRY_MS) return;
    if (tries >= AUTO_SETUP_MAX_ATTEMPTS) {
      this.finish({ ok: false, dialog: this.kind });
      return;
    }
    this.consider();
  }

  private finish(outcome: AutoSetupOutcome | null): void {
    if (this.done) return;
    this.done = true;
    this.buffer = "";
    if (outcome) this.deps.onSettled(outcome);
  }

  private settle(): void {
    const tool = this.attempts.tool > 0;
    if (!tool && this.attempts.model === 0) {
      this.finish(null);
      return;
    }
    this.finish({ ok: true, tool: tool ? AXET_TOOL_LABEL[this.prefs.tool] : "", model: this.model ?? this.prefs.model });
  }

  /** Pencere açıldıktan (ya da son denemeden) sonra kullanıcı dokundu mu. */
  private touchedSince(at: number): boolean {
    return this.deps.lastUserInputAt() >= at;
  }

  private consider(): void {
    if (this.done || this.pending || !this.kind) return;
    const kind = this.kind;
    const tries = this.attempts[kind];
    if (tries >= AUTO_SETUP_MAX_ATTEMPTS) return;
    if (tries > 0 && this.deps.now() - this.sentAt < AUTO_SETUP_RETRY_MS) return;
    // Kullanıcı pencereyle ilgileniyor: onun seçimini ezme, çekil (kart yok).
    if (this.touchedSince(tries > 0 ? this.sentAt : this.seenAt)) {
      this.finish(null);
      return;
    }
    if (this.deps.hasDraft() || this.deps.now() - this.deps.lastUserInputAt() < TYPING_GUARD_MS) return;
    this.pending = true;
    this.deps.schedule(() => this.send(kind), AUTO_SETUP_SEND_DELAY_MS);
  }

  private send(kind: DialogKind): void {
    if (this.done || this.kind !== kind) {
      this.pending = false;
      return;
    }
    if (this.touchedSince(this.attempts[kind] > 0 ? this.sentAt : this.seenAt)) {
      this.pending = false;
      this.finish(null);
      return;
    }
    this.attempts[kind] += 1;
    const startAt = this.deps.now();
    const steps = setupKeySteps(kind, this.prefs);
    const run = (index: number): void => {
      if (this.done) {
        this.pending = false;
        return;
      }
      // Arada kullanıcı yazdıysa kalan tuş onun yazdığını onaylardı.
      if (index > 0 && this.touchedSince(startAt)) {
        this.pending = false;
        this.finish(null);
        return;
      }
      const ok = this.deps.write(steps[index].data);
      if (!ok || index === steps.length - 1) {
        this.pending = false;
        this.sentAt = this.deps.now();
        this.buffer = "";
        return;
      }
      this.deps.schedule(() => run(index + 1), steps[index + 1].delayMs);
    };
    run(0);
  }
}
