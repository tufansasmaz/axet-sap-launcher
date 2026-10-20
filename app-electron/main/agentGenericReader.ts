// Genel okuyucu: durumu terminal hareketinden TAHMİN eder (spec 2026-10-17
// ajan-alani §6.3). Claude Code / Codex / Gemini / özel komut için; axet-code
// okuyucusu da eşleme kurulana kadar buna yaslanıyor.
//
//   - Çıktı akıyorsa çalışıyor, 20 sn sessizse boşta (eşik testte enjekte).
//   - Motorun komutu kabukta yankılandıktan SONRA son satır yine kabuk
//     istemiyse motor kapanmış: bitti. Yankıdan önceki istem (bölme yeni
//     açılırken) sayılmıyor.
//   - Soru algılamıyor; soru kartı çıkmıyor.
//
// Bilinen sınır: dönen imleç ya da saat çizen bir TUI hep "çalışıyor"
// görünür. Bu yüzden kaynak hep "tahmini" ve kartta "≈".
import type { AgentStatus, AgentTurn } from "../shared/agentTypes";
import { scanTerminalError } from "../shared/agentErrors";
import { agentErrorInfo } from "./agentErrorInfo";

/** İzleyicinin (agentMonitor.ts) bildiği tek yüz. Yöntemler hata fırlatmamalı. */
export interface AgentReader {
  feedOutput(data: string): void;
  submitLine(line: string): void;
  poll(): void;
  status(): AgentStatus;
  /**
   * Tur 10: bölme yeniden boyutlandı (terminal ekranı görünür oldu ya da boyut değişti);
   * ardından gelen yeniden çizim iş sayılmasın.
   */
  noteRepaint?(): void;
  /** Motor açıldı: komut yankısından sonra motorun kendi çıktısı görüldü (Görev Panosu dağıtım koşulu). */
  engineReady(): boolean;
  dispose(): void;
}

export const IDLE_AFTER_MS = 20_000;
/**
 * Tur 10 (ölçüldü): yeniden boyuttan sonra ConPTY + TUI ekranı yeniden çiziyor
 * (Claude Code'da ilk parça ~50 ms, son parça <1 sn). Bu pencerede gelen çıktı iş değil.
 */
export const REPAINT_QUIET_MS = 1_500;
const TAIL_MAX = 4_000;
/** Tur 9: tur çıktısından taranan kuyruk (son hata satırı için). */
const TURN_TEXT_MAX = 3_000;

export function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[@-_=>]/g, "");
}

// cmd: `C:\proje>`, PowerShell: `PS C:\proje>` (Task 1 Karar B).
// Bilinen sınır: özel istem (`PROMPT` ortam değişkeni, PowerShell profilinde
// oh-my-posh/starship vb.) ve UNC yolu tanınmıyor; o bölmede motor kapanınca
// `finished` görülmez. Görev Panosu rehberinde yazılı; tahmini ajana elle
// atamada kullanıcıdan onay isteniyor.
const RE_PROMPT = /^(?:PS )?[A-Za-z]:\\[^<>|"]*>$/;

export function isShellPromptLine(line: string): boolean {
  return RE_PROMPT.test(line.replace(/\s+$/, ""));
}

export function lastLine(text: string): string {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? "";
}

/** Komutun ilk parçası (tırnaklı yol olabilir); yankı bununla aranıyor. */
export function commandToken(command: string): string {
  const match = /^\s*"([^"]+)"|^\s*(\S+)/.exec(command);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface GenericReaderOptions {
  command: string;
  now: () => number;
  idleAfterMs?: number;
  /** Tur 9: tur bitince son hata satırı taransın (kesin okuyucusu olmayan motorlar). */
  scanErrors?: boolean;
}

export class GenericReader {
  private tail = "";
  private lastOutputAt: number | null = null;
  /** Tur 10: bu ana kadar gelen çıktı yeniden çizim (iş sayılmıyor). */
  private repaintUntil = 0;
  private sawEcho = false;
  private sawEngineOutput = false;
  /** Motor kapandıktan sonra yeniden başlatma bekleniyor. */
  private exitSeen = false;
  /** Tur 6: son gönderilen istemin anı ve ondan sonra çıktı gelip gelmediği. */
  private promptAt: number | null = null;
  private turnOutput = false;
  private turnDone = false;
  private turnText = "";
  private readonly echo: RegExp | null;

  constructor(private readonly opts: GenericReaderOptions) {
    const token = commandToken(opts.command);
    this.echo = token ? new RegExp(`>\\s?"?${escapeRegExp(token)}`, "i") : null;
  }

  /**
   * Tur 6: bölmede Enter'la gönderilen satır. Motor açık değilken (kabuk
   * istemi) ya da `/` komutuysa tur sayılmıyor.
   */
  submitLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("/") || !this.engineReady()) return;
    this.promptAt = this.opts.now();
    this.turnOutput = false;
    this.turnDone = false;
    this.turnText = "";
  }

  noteRepaint(): void {
    this.repaintUntil = this.opts.now() + REPAINT_QUIET_MS;
  }

  feedOutput(data: string): void {
    const now = this.opts.now();
    const clean = stripAnsi(data);
    // Tur 10 (ölçüldü): görünür karakter taşımayan parça (odak/fare cevabı, imleç,
    // kip anahtarı) ve yeniden boyut sonrası yeniden çizim iş değil: etkinlik anı ilerlemiyor.
    const activity = /\S/.test(clean) && now >= this.repaintUntil;
    if (activity && this.promptAt !== null && !this.turnDone) {
      // Sakinleşmeden sonra gelen çıktı (tuş yankısı, yenileme) biten turu geri açmasın.
      if (this.turnOutput && this.lastOutputAt !== null && now - this.lastOutputAt >= this.idleAfter()) this.turnDone = true;
      else if (/\S/.test(clean) && now >= this.promptAt) this.turnOutput = true;
      if (!this.turnDone) this.turnText = (this.turnText + clean).slice(-TURN_TEXT_MAX);
    }
    // İlk çıktı (komutu olmayan kayıtta motor açıldı işareti) her zaman sayılıyor.
    if (activity || this.lastOutputAt === null) this.lastOutputAt = now;

    if (this.exitSeen) {
      // Motor kapalı; yeni echo gelince oturum sıfırlanıyor.
      if (this.echo?.test(clean)) {
        // Yeni komut başlatıldı; eski echo ile karışmaması için tail temizleniyor.
        this.tail = clean;
        this.sawEcho = false;
        this.sawEngineOutput = false;
        this.exitSeen = false;
        // Echo bu parçada; aşağıdaki tespit bloğuna düşüyor.
      } else {
        // Motor hâlâ kapalı; tail güncelleniyor, engineReady false kalıyor.
        this.tail = (this.tail + clean).slice(-TAIL_MAX);
        return;
      }
    } else {
      // Tail önce güncelleniyor; engineExited() güncel tail'e bakıyor.
      this.tail = (this.tail + clean).slice(-TAIL_MAX);
      if (this.sawEcho && this.engineExited()) {
        this.exitSeen = true;
        // sawEngineOutput burada true olsa da engineReady() engineExited() ile
        // zaten false dönüyor; sıfırlama yeniden başlatmada (yukarıda) yapılıyor.
      }
    }

    const echoedBefore = this.sawEcho;
    if (echoedBefore) {
      // Yankıdan sonraki görünür her çıktı motorun (yalnız denetim dizisi sayılmıyor).
      if (/\S/.test(clean)) this.sawEngineOutput = true;
      return;
    }
    const match = this.echo?.exec(this.tail);
    if (!match) return;
    this.sawEcho = true;
    // Yankıyla aynı parçada gelen çıktı: yankı satırının sonundan sonrası.
    const rest = this.tail.slice(match.index);
    const lineEnd = rest.search(/\r|\n/);
    if (lineEnd >= 0 && /\S/.test(rest.slice(lineEnd))) this.sawEngineOutput = true;
  }

  /**
   * Motorun açıldığı görüldü mü. Açılış penceresinde (yankı geldi, TUI henüz
   * ekranı almadı) yazılan istem konsol tamponuna düşer; motor açılırken
   * çökerse cmd onu komut olarak okur. Komutu olmayan kayıtta ilk çıktı yeter.
   * Motor kapandıktan sonra (kabuk istemi döndükten sonra) yeniden açılıp
   * çıktı görülene kadar false döner.
   */
  engineReady(): boolean {
    if (this.engineExited()) return false;
    return this.echo === null ? this.lastOutputAt !== null : this.sawEngineOutput;
  }

  engineExited(): boolean {
    return this.sawEcho && isShellPromptLine(lastLine(this.tail));
  }

  /** Tur 9: motor kapandıysa kabuk isteminden önceki son hata satırı. */
  exitError(): string | null {
    if (!this.engineExited()) return null;
    const lines = this.tail.split(/\r?\n|\r/);
    return scanTerminalError(lines.slice(0, -1).join("\n"));
  }

  /** Tur 9: biten turun son hata satırı. */
  turnError(): string | null {
    const turn = this.turn();
    return turn?.done ? scanTerminalError(this.turnText, "turn") : null;
  }

  private idleAfter(): number {
    return this.opts.idleAfterMs ?? IDLE_AFTER_MS;
  }

  /** Tur 6: istem + ardından çıktı varsa tur; istem yoksa yok. */
  turn(): AgentTurn | undefined {
    if (this.promptAt === null || !this.turnOutput) return undefined;
    const quiet = this.lastOutputAt !== null && this.opts.now() - this.lastOutputAt >= this.idleAfter();
    return { at: this.promptAt, done: this.turnDone || quiet || this.engineExited() };
  }

  status(): AgentStatus {
    const at = this.lastOutputAt;
    const turn = this.turn();
    const withTurn = turn ? { turn } : {};
    if (this.engineExited()) {
      const line = this.opts.scanErrors ? this.exitError() : null;
      return { state: "finished", source: "estimated", lastActivity: at, ...withTurn, ...(line ? { error: agentErrorInfo(line, "estimated") } : {}) };
    }
    if (at === null) return { state: "unknown", source: "estimated", lastActivity: null };
    const line = this.opts.scanErrors ? this.turnError() : null;
    if (line) return { state: "error", source: "estimated", lastActivity: at, ...withTurn, error: agentErrorInfo(line, "estimated") };
    const quiet = this.opts.now() - at >= this.idleAfter();
    return { state: quiet ? "idle" : "running", source: "estimated", lastActivity: at, ...withTurn };
  }
}

/** Kesin okuyucusu olmayan motorlar için izleyici yüzü. */
export function genericAgentReader(reader: GenericReader): AgentReader {
  return {
    feedOutput: (data) => reader.feedOutput(data),
    submitLine: (line) => reader.submitLine(line),
    poll: () => {},
    noteRepaint: () => reader.noteRepaint(),
    // Tur 6: kesin kaynağı olmayan motor; Akış bunu ilk turda bir kez söylüyor.
    status: () => ({ ...reader.status(), link: "unsupported" }),
    engineReady: () => reader.engineReady(),
    dispose: () => {}
  };
}
