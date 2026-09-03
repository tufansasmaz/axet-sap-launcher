import type {
  GuiScriptActionKind,
  GuiScriptComponentDetail,
  GuiScriptRecordedStep
} from "../../../app-electron/shared/types";

// `src/flows/agent/tools.js#createExecutor`'ın AYNI sonuç sözleşmesi
// ({text, id?, error?, control?, payload?}) ama ASENKRON — burada
// mutasyon yapılacak bir in-memory model yok, her aksiyon gerçek bir IPC
// round-trip'i (main process → sap_gui_scripting_bridge.py). Hata YÖNETİMİ
// de flows'la AYNI ilke: hiçbir hata yukarı fırlatılmaz (try/catch), LLM
// bir sonraki turda "HATA: ..." metnini transcript'te görüp kendi kendine
// düzeltebilsin.

export interface ToolResult {
  text: string;
  id?: string;
  error?: boolean;
  control?: "ask_user" | "finish";
  payload?: unknown;
}

export interface DefaultSession {
  connIdx: number;
  sessIdx: number;
}

function resolveSession(args: Record<string, unknown>, fallback: DefaultSession | null): { connIdx: number; sessIdx: number } | null {
  const connIdx = typeof args.conn_idx === "number" ? args.conn_idx : fallback?.connIdx;
  const sessIdx = typeof args.sess_idx === "number" ? args.sess_idx : fallback?.sessIdx;
  if (connIdx === undefined || sessIdx === undefined) return null;
  return { connIdx, sessIdx };
}

function nodeToText(node: GuiScriptComponentDetail): string {
  return JSON.stringify({
    id: node.id,
    type: node.type,
    name: node.name,
    text: node.text,
    tooltip: node.tooltip,
    changeable: node.changeable,
    children: node.children,
    grid: node.grid
  });
}

// Faz 2'nin (Kayıt) `steps` listesine, agent'ın gerçek aksiyonlarını da
// aynı formatta eklemek için — kayıt açıkken hem manuel hem agent-tetiklemeli
// aksiyonlar AYNI script'e karışır (tutarlı bir kayıt deneyimi). Opsiyonel:
// kayıt kapalıysa `recordStep` hiç çağrılmaz.
export type RecordStepFn = (step: GuiScriptRecordedStep) => void;

async function performAndMaybeRecord(
  connIdx: number,
  sessIdx: number,
  action: GuiScriptActionKind,
  id: string | undefined,
  extra: { value?: string; vkey?: number },
  recordStep: RecordStepFn | undefined,
  label: string
): Promise<ToolResult> {
  const result = await window.api.performGuiScriptAction(connIdx, sessIdx, { action, id, ...extra });
  if (!result.ok) {
    return { text: `HATA: ${result.error ?? "bilinmeyen hata"}`, error: true };
  }
  recordStep?.({ action, id, value: extra.value, vkey: extra.vkey, label });
  return { text: `${label} basarili` };
}

export function createExecutor(defaultSession: DefaultSession | null, recordStep?: RecordStepFn) {
  return async function executeTool(name: string, rawArgs: Record<string, unknown> = {}): Promise<ToolResult> {
    try {
      switch (name) {
        case "list_connections": {
          const result = await window.api.listGuiScriptConnections();
          if (!result.ok) return { text: `HATA: ${result.error ?? "?"}`, error: true };
          return { text: JSON.stringify(result.connections) };
        }
        case "list_sessions": {
          const connIdx = typeof rawArgs.conn_idx === "number" ? rawArgs.conn_idx : defaultSession?.connIdx;
          if (connIdx === undefined) return { text: "HATA: conn_idx belirtilmedi", error: true };
          const result = await window.api.listGuiScriptSessions(connIdx);
          if (!result.ok) return { text: `HATA: ${result.error ?? "?"}`, error: true };
          return { text: JSON.stringify(result.sessions) };
        }
        case "get_node": {
          const session = resolveSession(rawArgs, defaultSession);
          if (!session) return { text: "HATA: conn_idx/sess_idx belirtilmedi", error: true };
          const elementId = typeof rawArgs.id === "string" && rawArgs.id ? rawArgs.id : null;
          const result = await window.api.getGuiScriptNode(session.connIdx, session.sessIdx, elementId);
          if (!result.ok || !result.node) return { text: `HATA: ${result.error ?? "?"}`, error: true };
          return { text: nodeToText(result.node) };
        }
        case "set_text": {
          const session = resolveSession(rawArgs, defaultSession);
          if (!session) return { text: "HATA: conn_idx/sess_idx belirtilmedi", error: true };
          const id = typeof rawArgs.id === "string" ? rawArgs.id : undefined;
          const value = typeof rawArgs.value === "string" ? rawArgs.value : "";
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "setText", id, { value }, recordStep, `setText("${value}") → ${id ?? "wnd[0]"}`);
        }
        case "press": {
          const session = resolveSession(rawArgs, defaultSession);
          if (!session) return { text: "HATA: conn_idx/sess_idx belirtilmedi", error: true };
          const id = typeof rawArgs.id === "string" ? rawArgs.id : undefined;
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "press", id, {}, recordStep, `press() → ${id ?? "wnd[0]"}`);
        }
        case "select": {
          const session = resolveSession(rawArgs, defaultSession);
          if (!session) return { text: "HATA: conn_idx/sess_idx belirtilmedi", error: true };
          const id = typeof rawArgs.id === "string" ? rawArgs.id : undefined;
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "select", id, {}, recordStep, `select() → ${id ?? "wnd[0]"}`);
        }
        case "double_click": {
          const session = resolveSession(rawArgs, defaultSession);
          if (!session) return { text: "HATA: conn_idx/sess_idx belirtilmedi", error: true };
          const id = typeof rawArgs.id === "string" ? rawArgs.id : undefined;
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "doubleClick", id, {}, recordStep, `doubleClick() → ${id ?? "wnd[0]"}`);
        }
        case "send_vkey": {
          const session = resolveSession(rawArgs, defaultSession);
          if (!session) return { text: "HATA: conn_idx/sess_idx belirtilmedi", error: true };
          const id = typeof rawArgs.id === "string" && rawArgs.id ? rawArgs.id : undefined;
          const vkey = typeof rawArgs.vkey === "number" ? rawArgs.vkey : 0;
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "sendVKey", id, { vkey }, recordStep, `sendVKey(${vkey}) → ${id ?? "wnd[0]"}`);
        }
        case "select_context_menu_item": {
          const session = resolveSession(rawArgs, defaultSession);
          if (!session) return { text: "HATA: conn_idx/sess_idx belirtilmedi", error: true };
          const id = typeof rawArgs.id === "string" ? rawArgs.id : undefined;
          const value = typeof rawArgs.value === "string" ? rawArgs.value : "";
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "selectContextMenuItem", id, { value }, recordStep, `selectContextMenuItem("${value}") → ${id ?? "wnd[0]"}`);
        }
        case "ask_user": {
          const question = typeof rawArgs.question === "string" ? rawArgs.question : "?";
          const options = Array.isArray(rawArgs.options) ? (rawArgs.options as unknown[]).slice(0, 4).map(String) : [];
          return { text: `Kullaniciya soruldu: ${question}`, control: "ask_user", payload: { question, options } };
        }
        case "finish": {
          const summary = typeof rawArgs.summary === "string" ? rawArgs.summary : "Tamamlandi.";
          return { text: summary, control: "finish", payload: summary };
        }
        default:
          return { text: `bilinmeyen tool: ${name}`, error: true };
      }
    } catch (err) {
      return { text: `HATA: ${(err as Error).message}`, error: true };
    }
  };
}
