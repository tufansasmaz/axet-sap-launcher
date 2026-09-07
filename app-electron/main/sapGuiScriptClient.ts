import { request as httpRequest } from "node:http";
import type {
  GuiScriptActionPayload,
  GuiScriptActionResult,
  GuiScriptComponentDetail,
  GuiScriptConnectionInfo,
  GuiScriptPreflightResult,
  GuiScriptScreenResult,
  GuiScriptScreenshotMethod,
  GuiScriptScreenshotResult,
  GuiScriptSessionInfo
} from "../shared/types";
import { mt } from "./i18n";

// `sap_gui_scripting_bridge.py` (bkz. sapGuiScriptManager.ts, resources/
// sap-gui-scripting) yerel HTTP+JSON sunucusuna konuşan ince istemci —
// `axetFlowsLiveSave.ts`'teki `httpJson()` yardımcısıyla AYNI desen (bu
// dosyaya taşındı çünkü burada da POST gövdesi/timeout/JSON parse aynı
// ihtiyaç, kod iki yerde ayrı yaşamasın diye tek bir kopya tutulmadı ama
// mantık birebir aynı — bilerek küçük bir kopya, iki modülün birbirine
// bağımlı olmaması için).

interface HttpJsonOptions {
  port: number;
  path: string;
  method: "GET" | "POST";
  // Ekran görüntüsü base64 PNG olarak dönüyor ve HardCopy SAP tarafında
  // diske yazma turu içeriyor — varsayılan 8 sn onun için dar kalabiliyor.
  timeoutMs?: number;
}

function httpJson(options: HttpJsonOptions, body?: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port: options.port,
        path: options.path,
        method: options.method,
        timeout: options.timeoutMs ?? 8000,
        headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : undefined
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          let json: any = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(mt("guiScriptClient.requestTimeout")));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function errorFrom(json: any, fallback: string): string {
  return (json && typeof json.error === "string" && json.error) || fallback;
}

// Teşhis. Diğer uç noktalardan farklı olarak bridge tarafında COM guard'ının
// DIŞINDA — scripting tamamen kapalıyken de cevap verir, zaten asıl işi bu.
export async function guiScriptPreflight(port: number): Promise<GuiScriptPreflightResult> {
  try {
    const { json } = await httpJson({ port, path: "/preflight", method: "GET" });
    if (!json?.ok) return { ok: false, error: errorFrom(json, mt("guiScriptClient.diagnosticsFailed")) };
    return { ok: true, preflight: json.preflight };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function guiScriptGetScreen(port: number, connIdx: number, sessIdx: number): Promise<GuiScriptScreenResult> {
  try {
    const { json } = await httpJson({ port, path: `/session/${connIdx}/${sessIdx}/screen`, method: "GET" });
    if (!json?.ok) return { ok: false, error: errorFrom(json, mt("guiScriptClient.screenStateFailed")) };
    return { ok: true, screen: json.screen };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// connIdx/sessIdx `null` ise oturumsuz rota kullanılır: `window` yakalama
// COM'a dokunmadığı için scripting kapalıyken de çalışır, ve tam o durumda
// kullanıcının canlı SAP ekranını görebildiği TEK yol odur. Oturum çözmeyi
// şart koşmak, yeteneği tam ihtiyaç duyulduğu anda erişilemez kılıyordu.
export async function guiScriptScreenshot(
  port: number,
  connIdx: number | null,
  sessIdx: number | null,
  method: GuiScriptScreenshotMethod
): Promise<GuiScriptScreenshotResult> {
  const sessionless = connIdx === null || sessIdx === null;
  try {
    const { json } = await httpJson({
      port,
      path: sessionless
        ? "/screenshot?method=window"
        : `/session/${connIdx}/${sessIdx}/screenshot?method=${encodeURIComponent(method)}`,
      method: "GET",
      timeoutMs: 20000
    });
    if (!json?.ok) return { ok: false, error: errorFrom(json, mt("guiScriptClient.screenshotFailed")) };
    return {
      ok: true,
      dataUrl: json.dataUrl,
      method: json.method,
      bytes: json.bytes,
      originLeft: json.originLeft,
      originTop: json.originTop,
      width: json.width,
      height: json.height
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function guiScriptListConnections(port: number): Promise<{ ok: boolean; connections?: GuiScriptConnectionInfo[]; error?: string }> {
  try {
    const { json } = await httpJson({ port, path: "/connections", method: "GET" });
    if (!json?.ok) return { ok: false, error: errorFrom(json, mt("guiScriptClient.connectionListFailed")) };
    return { ok: true, connections: json.connections };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function guiScriptListSessions(port: number, connIdx: number): Promise<{ ok: boolean; sessions?: GuiScriptSessionInfo[]; error?: string }> {
  try {
    const { json } = await httpJson({ port, path: `/connections/${connIdx}/sessions`, method: "GET" });
    if (!json?.ok) return { ok: false, error: errorFrom(json, mt("guiScriptClient.sessionListFailed")) };
    return { ok: true, sessions: json.sessions };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function guiScriptGetNode(
  port: number,
  connIdx: number,
  sessIdx: number,
  elementId: string | null,
  // Grid satır penceresi. Verilmezse köprünün küçük varsayılanı geçerli —
  // büyük bir ALV'yi her seferinde baştan sona okumak 16 saniye sürüyordu.
  window?: { rows?: number; rowOffset?: number }
): Promise<{ ok: boolean; node?: GuiScriptComponentDetail; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (elementId) params.set("id", elementId);
    if (window?.rows !== undefined) params.set("rows", String(window.rows));
    if (window?.rowOffset) params.set("rowOffset", String(window.rowOffset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const { json } = await httpJson({ port, path: `/session/${connIdx}/${sessIdx}/node${qs}`, method: "GET" });
    if (!json?.ok) return { ok: false, error: errorFrom(json, mt("guiScriptClient.elementReadFailed")) };
    return { ok: true, node: json.node };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function guiScriptPerformAction(
  port: number,
  connIdx: number,
  sessIdx: number,
  payload: GuiScriptActionPayload
): Promise<GuiScriptActionResult> {
  try {
    // `navigate`/`sendVKey` sunucu turu tetikleyebiliyor; bridge aksiyondan
    // sonra oturum meşgul olduğu sürece bekliyor (`_settle`, 3 sn tavan) —
    // varsayılan 8 sn'lik timeout buna dar kalabilir.
    const { json } = await httpJson(
      { port, path: `/session/${connIdx}/${sessIdx}/action`, method: "POST", timeoutMs: 20000 },
      payload
    );
    if (!json?.ok) return { ok: false, error: errorFrom(json, mt("guiScriptClient.actionFailed")) };
    return { ok: true, screen: json.screen, settle: json.settle };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
