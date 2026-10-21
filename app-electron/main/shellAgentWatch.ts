// Tur 12: kabuk bölmesinde kullanıcının Enter'la gönderdiği satırın ilk
// sözcüğü bir ajan motoruysa renderer'a bildiriliyor; bölme o motorun
// okuyucusuyla ajan olarak kaydediliyor. Satırlar YALNIZ BELLEKTE (agentInput
// ile aynı kural): diske ve günlüğe gitmez, yalnız eşleşen satır bildiriliyor.
// Elle yakalama yok: yapıştırma da terminal:write'tan geçtiği için tamponda.
//
// Tur 13: ↑/↓ ile geçmişten çağrılan komut tamponda görünmüyor (metni kabuk
// basıyor). O satır Enter'la gidince kısa süre çıktıda motorun açılış imzası
// aranıyor (ikinci sinyal). Ölçüm (2026-10-21, axet-code 1.4.1, cmd /c ile
// pty'de): başlık "NTT DATA, Inc." + boşluk + renk kodu + sürüm. Claude Code
// karşılama kutusu "Welcome to Claude Code" / "Claude Code vX.Y" (bu makinede
// claude PATH'te yok; imza sürüm notlarından). Geçmiş çağrısı olmadan imza
// yok sayılıyor (ör. `type` ile dosya basmak). Tek başına Esc satırı siliyor
// (cmd ve PowerShell'in Windows kipi).

import type { AgentEngineId } from "../shared/agentTypes";
import { engineOfCommandLine } from "../shared/agentEngines";
import { InputLineBuffer } from "./agentInput";

export interface ShellAgentWatchDeps {
  /** O anki ek adlar (Claude başlatıcısı); her satırda okunuyor. */
  extraNames: () => Record<string, AgentEngineId>;
  onLaunch: (ptyId: string, engine: AgentEngineId, command: string) => void;
  now?: () => number;
}

export interface ShellAgentWatch {
  feed(ptyId: string, data: string): void;
  /** Tur 13: bölmenin çıktısı (yalnız geçmişten çağrı sonrası kısa süre inceleniyor). */
  output(ptyId: string, data: string): void;
  forget(ptyId: string): void;
}

/** Geçmişten çağrı sonrası imzanın bekleneceği süre. */
export const SIGNATURE_WAIT_MS = 30_000;
const TAIL_MAX = 4_096;
// ↑/↓ (CSI ve SS3), F3 (son komut), F8 (geçmiş araması): satırı kabuk dolduruyor.
const RECALL = /\x1b(?:\[[AB]|O[ABR]|\[19~)/;
const ANSI = /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-_])/g;

/** Çıktıdaki açılış imzası → motor; yoksa null. Renk kodları süzülmüş metinde aranıyor. */
export function engineOfBanner(text: string): AgentEngineId | null {
  const plain = text.replace(ANSI, "");
  if (/NTT DATA, Inc\.\s+\d+\.\d+/.test(plain)) return "axet-code";
  if (/Welcome to Claude Code|Claude Code v\d+\.\d+/.test(plain)) return "claude";
  return null;
}

export function createShellAgentWatch(deps: ShellAgentWatchDeps): ShellAgentWatch {
  const now = deps.now ?? Date.now;
  const buffers = new Map<string, InputLineBuffer>();
  /** Satırda geçmiş çağrısı var (Enter beklemede). */
  const recalled = new Set<string>();
  /** Geçmişten çağrılan satır gönderildi: imza bu ana kadar bekleniyor. */
  const armed = new Map<string, { until: number; tail: string }>();
  return {
    feed(ptyId, data) {
      let buffer = buffers.get(ptyId);
      if (!buffer) {
        buffer = new InputLineBuffer(true);
        buffers.set(ptyId, buffer);
      }
      if (RECALL.test(data)) recalled.add(ptyId);
      // Esc / Ctrl+C / Ctrl+U satırı siliyor: çağrılan satır da gitti.
      if (data === "\x1b" || data.includes("\x03") || data.includes("\x15")) recalled.delete(ptyId);
      let launched = false;
      for (const line of buffer.feed(data)) {
        const engine = engineOfCommandLine(line, deps.extraNames());
        if (engine) {
          launched = true;
          deps.onLaunch(ptyId, engine, line.slice(0, 400));
        }
      }
      if (data.includes("\r")) {
        if (launched) armed.delete(ptyId);
        else if (recalled.has(ptyId)) armed.set(ptyId, { until: now() + SIGNATURE_WAIT_MS, tail: "" });
        recalled.delete(ptyId);
      }
    },
    output(ptyId, data) {
      const wait = armed.get(ptyId);
      if (!wait) return;
      if (now() > wait.until) {
        armed.delete(ptyId);
        return;
      }
      wait.tail = (wait.tail + data).slice(-TAIL_MAX);
      const engine = engineOfBanner(wait.tail);
      if (!engine) return;
      armed.delete(ptyId);
      deps.onLaunch(ptyId, engine, engine);
    },
    forget(ptyId) {
      buffers.delete(ptyId);
      recalled.delete(ptyId);
      armed.delete(ptyId);
    }
  };
}
