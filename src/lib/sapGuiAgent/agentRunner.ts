import { buildSapGuiSystemPrompt } from "./systemPrompt";
import type { ToolResult } from "./tools";

// `src/flows/agent/agentRunner.js`'in AYNI döngü şekli — TEK yapısal fark:
// `executeTool` burada ASENKRON (her aksiyon gerçek bir IPC round-trip'i)
// ve her tur için bir `requestId` üretilip iptal (Faz 3'ün "Durdur" butonu)
// için main process'e geçiriliyor (`window.api.cancelGuiScriptAgentStep`).
// "ref" mekanizması BİLEREK YOK — flow builder'da yeni oluşturulan node'lar
// için gerekliydi (henüz id yok), SAP GUI element ID'leri zaten SAP'ın
// kendi verdiği sabit string'ler, agent hiçbir zaman "yeni bir id üretmiyor".

const MAX_ITERATIONS = 15;
const MAX_INVALID_RETRIES = 3;
const MAX_ACTIONS_PER_BATCH = 6;

export type AgentEvent =
  | { kind: "user"; text: string }
  | { kind: "error"; text: string }
  | { kind: "tool_call"; name: string; args: Record<string, unknown> }
  | { kind: "tool_result"; name: string; text: string; error: boolean }
  | { kind: "question"; text: string; options: string[] }
  | { kind: "finish"; text: string }
  | { kind: "cancelled"; text: string };

export function createTranscript(): string[] {
  return [];
}

function extractJson(rawText: string): unknown {
  const trimmed = (rawText || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  return null;
}

interface RawAction {
  action: string;
  args?: Record<string, unknown>;
}

function normalizeActions(parsed: unknown): RawAction[] | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.actions)) {
    const valid = (obj.actions as unknown[]).filter(
      (a): a is RawAction => Boolean(a) && typeof a === "object" && typeof (a as RawAction).action === "string"
    );
    return valid.length ? valid : null;
  }
  if (typeof obj.action === "string") return [obj as unknown as RawAction];
  return null;
}

export interface SapGuiUiContext {
  connIdx: number | null;
  sessIdx: number | null;
  sessionInfo?: Record<string, unknown>;
  selectedElementId?: string;
  selectedElementSummary?: { id: string; type: string; name: string } | null;
}

function buildPrompt(transcript: string[], uiContext: SapGuiUiContext): string {
  return [
    buildSapGuiSystemPrompt(),
    "",
    "MEVCUT OTURUM BAGLAMI (JSON):",
    JSON.stringify(uiContext),
    "",
    "SOHBET / YAPILAN AKSIYONLARIN GECMISI:",
    transcript.length ? transcript.join("\n") : "(henuz yok)",
    "",
    'Simdi bir sonraki aksiyonu/aksiyonlari don: {"action":"...","args":{...}} VEYA {"actions":[{"action":"...","args":{...}}, ...]}.'
  ].join("\n");
}

export interface RunAgentTurnOptions {
  model: string | null;
  transcript: string[];
  userMessage: string | null;
  uiContext: SapGuiUiContext;
  executeTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  onEvent?: (event: AgentEvent) => void;
  onRequestIdChange?: (requestId: string | null) => void;
  isCancelled?: () => boolean;
}

export type AgentStopReason = "error" | "invalid_output" | "ask_user" | "finish" | "max_iterations" | "cancelled";

export async function runAgentTurn(opts: RunAgentTurnOptions): Promise<{ stopped: AgentStopReason }> {
  const { model, transcript, userMessage, uiContext, executeTool, onEvent, onRequestIdChange, isCancelled } = opts;

  if (userMessage) {
    transcript.push(`KULLANICI: ${userMessage}`);
    onEvent?.({ kind: "user", text: userMessage });
  }

  let invalidRetries = 0;

  // "Durdur"a basıldığında tur sessizce sonlanıyordu: `AgentEvent`'te
  // `kind: "cancelled"` TANIMLIYDI, `AgentLogRow` onu ÇİZİYORDU da — ama
  // üç `return { stopped: "cancelled" }` noktasının hiçbiri olayı ATEŞLEMİYORDU.
  // Sonuç: spinner kayboluyor, log'da hiçbir iz kalmıyor; kullanıcı "durdu mu,
  // yoksa bitti mi, yarım kalan aksiyon var mı" sorusunun cevabını ekranda
  // bulamıyor — ki bu agent GERÇEK SAP GUI aksiyonları uyguluyor. Canlı
  // tıklamayla yakalandı (2026-09-04): 30 sn'lik bir tur iptal edildi, IPC
  // iptali gitti, ekranda hiçbir şey yazmadı.
  const cancel = (): { stopped: AgentStopReason } => {
    onEvent?.({ kind: "cancelled", text: "Tur kullanici tarafindan durduruldu." });
    return { stopped: "cancelled" };
  };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (isCancelled?.()) return cancel();

    const prompt = buildPrompt(transcript, uiContext);
    const requestId = crypto.randomUUID();
    onRequestIdChange?.(requestId);

    let raw: string;
    try {
      const stepResult = await window.api.guiScriptAgentStep(requestId, prompt, model || null);
      onRequestIdChange?.(null);
      if (stepResult.cancelled) return cancel();
      if (!stepResult.ok) throw new Error(stepResult.error || "axet-code çağrısı başarısız oldu.");
      raw = stepResult.text || "";
    } catch (err) {
      onRequestIdChange?.(null);
      onEvent?.({ kind: "error", text: (err as Error).message || String(err) });
      return { stopped: "error" };
    }

    const parsed = extractJson(raw);
    const actions = normalizeActions(parsed);
    if (!actions) {
      invalidRetries += 1;
      onEvent?.({ kind: "error", text: `Gecersiz cikti (JSON action bulunamadi):\n${raw}` });
      if (invalidRetries > MAX_INVALID_RETRIES) {
        return { stopped: "invalid_output" };
      }
      transcript.push(
        `SISTEM: onceki cevap gecersizdi, sadece {"action":"...","args":{...}} veya {"actions":[...]} formatinda JSON don. Alinan cikti: ${raw.slice(0, 300)}`
      );
      continue;
    }

    let control: { kind: "ask_user" | "finish"; payload: any } | null = null;

    for (const act of actions.slice(0, MAX_ACTIONS_PER_BATCH)) {
      if (isCancelled?.()) return cancel();
      const args = act.args || {};
      onEvent?.({ kind: "tool_call", name: act.action, args });
      const result = await executeTool(act.action, args);
      onEvent?.({ kind: "tool_result", name: act.action, text: result.text, error: Boolean(result.error) });
      transcript.push(`AKSIYON: ${act.action}(${JSON.stringify(args)}) => SONUC: ${result.text}`);

      if (result.control === "ask_user") {
        control = { kind: "ask_user", payload: result.payload };
        break;
      }
      if (result.control === "finish") {
        control = { kind: "finish", payload: result.payload };
        break;
      }
    }

    if (control?.kind === "ask_user") {
      onEvent?.({ kind: "question", text: control.payload.question, options: control.payload.options || [] });
      return { stopped: "ask_user" };
    }
    if (control?.kind === "finish") {
      onEvent?.({ kind: "finish", text: control.payload });
      return { stopped: "finish" };
    }
  }

  onEvent?.({ kind: "error", text: "Maksimum adim sayisina ulasildi, tur durduruldu." });
  return { stopped: "max_iterations" };
}
