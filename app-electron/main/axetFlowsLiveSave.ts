import { request as httpRequest } from "node:http";
import { discoverAxetFlowsLiveUrl } from "./axetFlowsLiveDiscovery";

// "Cloud'a Kaydet" — kullanıcının bizim gömülü (embedded) axet.flows
// motorumuzda hazırladığı bir flow'u, aynı makinede AYRICA çalışan GERÇEK
// aXet.flows masaüstü uygulamasının (aXet.flows.exe / axet.flows Canlı
// ekranının bağlandığı AYNI Node-RED tabanlı host) çalışma alanına
// KAYDETMESİ için. Kullanıcının isteği: "canlıda cloud'a kaydet butonu var,
// bizde de olsun, birebir olsun" — yani bu SADECE bizim kendi
// dosya/uygulama depolamamıza (electron-store vb.) kaydetmek DEĞİL, gerçek
// çalışan host'un admin API'sine (aynı Node-RED Admin HTTP API — GET/POST
// /flows) network isteğiyle YAZMAK anlamına geliyor.
//
// Node-RED Admin API iki surumu destekler (bkz. resmi dokumantasyon):
//   v1: GET /flows  -> duz flow node dizisi;  POST /flows <duz dizi>
//   v2: GET /flows (header Node-RED-API-Version: v2) -> { rev, flows };
//       POST /flows (ayni header) <{ rev, flows }> — optimistic locking
// Gercek editor (yeni Node-RED surumlerinde) v2 kullanir; biz de rev'i
// GET'ten okuyup AYNI rev'i POST'a geri gonderiyoruz (409 "Version
// mismatch" almamak icin). Sunucu v2'yi TANIMIYORSA header'i sessizce
// yok sayar ve v1 (duz dizi) doner — bu durumda rev'siz v1 POST yapiyoruz.

interface HttpJsonOptions {
  host: string;
  port: number;
  path: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
}

function httpJson(options: HttpJsonOptions, body?: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = httpRequest(
      {
        host: options.host,
        port: options.port,
        path: options.path,
        method: options.method,
        timeout: 8000,
        headers: {
          ...(options.headers || {}),
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {})
        }
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
      reject(new Error("İstek zaman aşımına uğradı."));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

// Gelen (bizim editörümüzden export edilen) tek-tab flow dizisini, gerçek
// host'tan çekilen TÜM çalışma alanına birleştirir: aynı id'li eski
// tab/node/config'ler (bu tab'a ait ne varsa) çıkarılır, yenileriyle
// değiştirilir — host'taki DİĞER tab'lara/flow'lara dokunulmaz (tam bir
// "Full deploy" gibi her şeyi silip yeniden yazmak DEĞİL, sadece bu flow'u
// upsert etmek — gerçek Node-RED editöründe bir flow sekmesini
// içeri/dışarı aktarırken beklenen davranışın aynısı).
function mergeFlowIntoWorkspace(existingFlows: any[], incomingArray: any[]): any[] {
  const incomingIds = new Set(incomingArray.map((n) => n.id));
  const incomingContainerIds = new Set(incomingArray.filter((n) => n.type === "tab" || n.type === "subflow").map((n) => n.id));
  const filtered = existingFlows.filter((n) => {
    if (incomingIds.has(n.id)) return false; // ayni id'li eski surumu at (upsert)
    if (n.z && incomingContainerIds.has(n.z)) return false; // bu tab'in eski cocuklarini at
    return true;
  });
  return [...filtered, ...incomingArray];
}

export interface SaveFlowToLiveHostResult {
  ok: boolean;
  port?: number | null;
  error?: string;
}

export async function saveFlowToLiveHost(flowArray: any[]): Promise<SaveFlowToLiveHostResult> {
  const disc = await discoverAxetFlowsLiveUrl();
  if (!disc.ok || !disc.port) {
    return { ok: false, error: disc.error || "Çalışan bir aXet.flows Canlı örneği bulunamadı." };
  }
  const host = "localhost";
  const port = disc.port;

  let getRes: { status: number; json: any };
  try {
    getRes = await httpJson({ host, port, path: "/flows", method: "GET", headers: { "Node-RED-API-Version": "v2" } });
  } catch (err: any) {
    return { ok: false, port, error: `Mevcut flow'lar okunamadı: ${err?.message || err}` };
  }
  if (getRes.status < 200 || getRes.status >= 300 || !getRes.json) {
    return { ok: false, port, error: `Mevcut flow'lar okunamadı (HTTP ${getRes.status}).` };
  }

  const isV2 = Array.isArray(getRes.json?.flows);
  const existingFlows: any[] = isV2 ? getRes.json.flows : Array.isArray(getRes.json) ? getRes.json : [];
  const rev = isV2 ? getRes.json.rev : undefined;

  const merged = mergeFlowIntoWorkspace(existingFlows, flowArray || []);

  const postHeaders: Record<string, string> = { "Node-RED-Deployment-Type": "full" };
  const postBody = isV2 ? { rev, flows: merged } : merged;
  if (isV2) postHeaders["Node-RED-API-Version"] = "v2";

  let postRes: { status: number; json: any };
  try {
    postRes = await httpJson({ host, port, path: "/flows", method: "POST", headers: postHeaders }, postBody);
  } catch (err: any) {
    return { ok: false, port, error: `Canlıya kaydedilemedi: ${err?.message || err}` };
  }
  if (postRes.status < 200 || postRes.status >= 300) {
    const detail = postRes.json?.message ? ` (${postRes.json.message})` : "";
    return { ok: false, port, error: `Canlı host kaydı reddetti (HTTP ${postRes.status})${detail}.` };
  }
  return { ok: true, port };
}
