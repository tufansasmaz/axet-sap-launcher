// Tur 12: kabuk bölmesinde kullanıcının Enter'la gönderdiği satırın ilk
// sözcüğü bir ajan motoruysa renderer'a bildiriliyor; bölme o motorun
// okuyucusuyla ajan olarak kaydediliyor. Satırlar YALNIZ BELLEKTE (agentInput
// ile aynı kural): diske ve günlüğe gitmez, yalnız eşleşen satır bildiriliyor.
// Elle yakalama yok: yapıştırma da terminal:write'tan geçtiği için tamponda.

import type { AgentEngineId } from "../shared/agentTypes";
import { engineOfCommandLine } from "../shared/agentEngines";
import { InputLineBuffer } from "./agentInput";

export interface ShellAgentWatchDeps {
  /** O anki ek adlar (Claude başlatıcısı); her satırda okunuyor. */
  extraNames: () => Record<string, AgentEngineId>;
  onLaunch: (ptyId: string, engine: AgentEngineId, command: string) => void;
}

export interface ShellAgentWatch {
  feed(ptyId: string, data: string): void;
  forget(ptyId: string): void;
}

export function createShellAgentWatch(deps: ShellAgentWatchDeps): ShellAgentWatch {
  const buffers = new Map<string, InputLineBuffer>();
  return {
    feed(ptyId, data) {
      let buffer = buffers.get(ptyId);
      if (!buffer) {
        buffer = new InputLineBuffer();
        buffers.set(ptyId, buffer);
      }
      for (const line of buffer.feed(data)) {
        const engine = engineOfCommandLine(line, deps.extraNames());
        if (engine) deps.onLaunch(ptyId, engine, line.slice(0, 400));
      }
    },
    forget(ptyId) {
      buffers.delete(ptyId);
    }
  };
}
