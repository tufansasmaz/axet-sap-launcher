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

// Agent'a giden grid ÖNİZLEMESİ kaç satır taşısın. Denetçideki (insan)
// tablo bundan etkilenmiyor — orası tam veriyi görmeye devam ediyor.
const AGENT_GRID_PREVIEW_ROWS = 15;

function nodeToText(node: GuiScriptComponentDetail): string {
  // GRID KIRPILIR. Kırpılmadan gönderildiğinde canlı bir ALV (500×42)
  // `get_node` cevabını **104.699 karaktere** çıkardı; prompt 10 binden 115
  // bine fırladı ve transcript biriktiği için sonraki HER tur o boyutta
  // kaldı — bir tur 99 saniye sürdü (canlı ölçüm, 2026-09-03). Agent bir
  // satıra tıklamak için 200 satırın içeriğini bilmek zorunda değil;
  // ihtiyacı olan sütun adları ve gerçek boyut. Gerçek sayılar
  // (`rowCount`/`columnCount`) korunuyor ki agent kırpılmış önizlemeyi tam
  // liste sanmasın.
  const offset = node.grid?.rowOffset ?? 0;
  const grid = node.grid
    ? {
        ...node.grid,
        rows: node.grid.rows.slice(0, AGENT_GRID_PREVIEW_ROWS),
        // KAÇINCI SATIRLARA BAKTIĞI YAZILIR. Köprü artık pencere pencere
        // okuyor; agent bunu bilmezse ikinci sayfanın ilk satırını "0.
        // satır" sanar ve `double_click(row: 0)` BAŞKA bir satırı açar.
        previewNote:
          node.grid.rowCount > offset + node.grid.rows.length
            ? `${offset}. satirdan itibaren ${Math.min(node.grid.rows.length, AGENT_GRID_PREVIEW_ROWS)} satir gosteriliyor ` +
              `(gercek satir sayisi: ${node.grid.rowCount}). "row" degerleri BU MUTLAK numaralardir. ` +
              `Sonraki satirlar icin get_node'u "row_offset": ${offset + node.grid.rows.length} ile tekrar cagir.`
            : undefined
      }
    : undefined;
  return JSON.stringify({
    id: node.id,
    type: node.type,
    name: node.name,
    text: node.text,
    tooltip: node.tooltip,
    changeable: node.changeable,
    children: node.children,
    grid
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
  // `row`/`column`/`by` BU LİSTEDE OLMAK ZORUNDA. Yoksa agent'ın gönderdiği
  // argümanlar buraya kadar gelip SESSİZCE düşüyor: canlı testte agent
  // `double_click` için row=0/column="RUUID"'i DOĞRU üretti, köprü yine
  // "'row' gerekli" diye reddetti ve agent aynı hataya sonsuz takıldı
  // (2026-09-03). Agent haklıydı, tesisat eksikti.
  extra: { value?: string; vkey?: number; row?: number; column?: string; by?: "text" | "code" | "position" },
  recordStep: RecordStepFn | undefined,
  label: string
): Promise<ToolResult> {
  const result = await window.api.performGuiScriptAction(connIdx, sessIdx, { action, id, ...extra });
  if (!result.ok) {
    return { text: `HATA: ${result.error ?? "bilinmeyen hata"}`, error: true };
  }
  recordStep?.({ action, id, value: extra.value, vkey: extra.vkey, row: extra.row, column: extra.column, by: extra.by, label });
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
          // Agent SADECE ihtiyacı kadar satır okur. Önceden köprü 200 satır
          // okuyor (canlı ALV'de 16,4 sn), sonra `nodeToText` bunun ilk
          // 15'i dışındakini ATIYORDU — yani her tur, kullanılmayan veri
          // için 15 saniye bekleniyordu. `row_offset` ile agent ilerideki
          // satırları isteyebilir; `rowOffset` cevapta döndüğü için satır
          // numaraları kayarsa fark eder.
          const rowOffset = typeof rawArgs.row_offset === "number" ? rawArgs.row_offset : 0;
          const result = await window.api.getGuiScriptNode(session.connIdx, session.sessIdx, elementId, {
            rows: AGENT_GRID_PREVIEW_ROWS,
            rowOffset
          });
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
          const row = typeof rawArgs.row === "number" ? rawArgs.row : undefined;
          const column = typeof rawArgs.column === "string" ? rawArgs.column : undefined;
          const label = row !== undefined ? `doubleClick(${row}, "${column ?? ""}") → ${id ?? "wnd[0]"}` : `doubleClick() → ${id ?? "wnd[0]"}`;
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "doubleClick", id, { row, column }, recordStep, label);
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
          const by = rawArgs.by === "text" || rawArgs.by === "code" || rawArgs.by === "position" ? rawArgs.by : undefined;
          return performAndMaybeRecord(session.connIdx, session.sessIdx, "selectContextMenuItem", id, { value, by }, recordStep, `selectContextMenuItem("${value}"${by ? `, ${by}` : ""}) → ${id ?? "wnd[0]"}`);
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
