// Akış'taki mesaj kutusu (spec 2026-10-18 ajanlar-yeniden §2). Electron'a
// dokunmuyor: alan, ajan ve istem kapıları bağımlılık olarak geliyor. Sıra:
// girdi → alan → ajan uygun mu (tarayıcının kapısı) → istem → Enter sonucu.
// Reddedilen istem yeniden denenmiyor; günlükte yalnız sonuç (içerik yok).
import type { AgentPromptResult } from "./agentMonitor";
import { isBoardId } from "../shared/boardCommands";
import { browserAgentGate, type BrowserAgentPresence } from "../shared/browserLogic";
import { agentMessagePrompt, type AgentSendFailure, type AgentSendResult } from "../shared/agentMessage";

/** Enter sonucunun en çok bekleneceği süre (bkz. browserSend PROMPT_SETTLE_TIMEOUT_MS). */
export const AGENT_SEND_SETTLE_MS = 2_000;

export interface AgentSenderDeps {
  workspace(id: string): boolean;
  agent(workspaceId: string, paneId: string): BrowserAgentPresence | null;
  /** agentMonitor.sendPrompt sözleşmesi: "ok" ise onSettled tam bir kez gelir. */
  sendPrompt(paneId: string, text: string, onSettled: (outcome: "sent" | "aborted") => void): AgentPromptResult;
  log(tag: string, fields: Record<string, string | number | boolean>): void;
}

export interface AgentSender {
  send(workspaceId: unknown, paneId: unknown, text: unknown): Promise<AgentSendResult>;
}

const PROMPT_FAILURE: Record<Exclude<AgentPromptResult, "ok">, AgentSendFailure> = {
  noAgent: "noAgent",
  notRunning: "notRunning",
  asking: "asking",
  typing: "typing",
  busy: "busy",
  invalid: "invalid",
  writeFailed: "writeFailed"
};

export function createAgentSender(deps: AgentSenderDeps): AgentSender {
  const finish = (result: AgentSendResult): AgentSendResult => {
    try {
      deps.log("ajan.mesaj", { sonuc: result.ok ? "tamam" : result.reason });
    } catch {
      // günlük hatası sonucu değiştirmesin
    }
    return result;
  };
  const fail = (reason: AgentSendFailure) => finish({ ok: false, reason });

  return {
    async send(workspaceId, paneId, text) {
      const line = agentMessagePrompt(text);
      if (!isBoardId(workspaceId) || !isBoardId(paneId) || line === null) return fail("invalid");
      try {
        if (!deps.workspace(workspaceId)) return fail("noWorkspace");
        const gate = browserAgentGate(deps.agent(workspaceId, paneId));
        if (gate) return fail(gate as AgentSendFailure);
        let settle: (outcome: "sent" | "aborted" | "timeout") => void = () => {};
        const settled = new Promise<"sent" | "aborted" | "timeout">((resolve) => {
          settle = resolve;
        });
        const sent = deps.sendPrompt(paneId, line, (outcome) => settle(outcome));
        if (sent !== "ok") return fail(PROMPT_FAILURE[sent] ?? "writeFailed");
        const timer = setTimeout(() => settle("timeout"), AGENT_SEND_SETTLE_MS);
        const outcome = await settled;
        clearTimeout(timer);
        // Zamanlayıcı hiç çalışmadıysa (kapanış) metin satırda: başarı sayılıyor.
        return outcome === "aborted" ? fail("notSubmitted") : finish({ ok: true });
      } catch {
        return fail("writeFailed");
      }
    }
  };
}
