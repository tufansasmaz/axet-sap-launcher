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
import type { AgentStatus } from "../shared/agentTypes";

/** İzleyicinin (agentMonitor.ts) bildiği tek yüz. Yöntemler hata fırlatmamalı. */
export interface AgentReader {
  feedOutput(data: string): void;
  submitLine(line: string): void;
  poll(): void;
  status(): AgentStatus;
  /** Motor açıldı: komut yankısından sonra motorun kendi çıktısı görüldü (Görev Panosu dağıtım koşulu). */
  engineReady(): boolean;
  dispose(): void;
}

export const IDLE_AFTER_MS = 20_000;
const TAIL_MAX = 4_000;

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
}

export class GenericReader {
  private tail = "";
  private lastOutputAt: number | null = null;
  private sawEcho = false;
  private sawEngineOutput = false;
  private readonly echo: RegExp | null;

  constructor(private readonly opts: GenericReaderOptions) {
    const token = commandToken(opts.command);
    this.echo = token ? new RegExp(`>\\s?"?${escapeRegExp(token)}`, "i") : null;
  }

  feedOutput(data: string): void {
    this.lastOutputAt = this.opts.now();
    const clean = stripAnsi(data);
    const echoedBefore = this.sawEcho;
    this.tail = (this.tail + clean).slice(-TAIL_MAX);
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
   */
  engineReady(): boolean {
    return this.echo === null ? this.lastOutputAt !== null : this.sawEngineOutput;
  }

  engineExited(): boolean {
    return this.sawEcho && isShellPromptLine(lastLine(this.tail));
  }

  status(): AgentStatus {
    const at = this.lastOutputAt;
    if (this.engineExited()) return { state: "finished", source: "estimated", lastActivity: at };
    if (at === null) return { state: "unknown", source: "estimated", lastActivity: null };
    const quiet = this.opts.now() - at >= (this.opts.idleAfterMs ?? IDLE_AFTER_MS);
    return { state: quiet ? "idle" : "running", source: "estimated", lastActivity: at };
  }
}

/** Kesin okuyucusu olmayan motorlar için izleyici yüzü. */
export function genericAgentReader(reader: GenericReader): AgentReader {
  return {
    feedOutput: (data) => reader.feedOutput(data),
    submitLine: () => {},
    poll: () => {},
    status: () => reader.status(),
    engineReady: () => reader.engineReady(),
    dispose: () => {}
  };
}
