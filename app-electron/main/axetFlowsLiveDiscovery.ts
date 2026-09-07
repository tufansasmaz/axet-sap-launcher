import { execFile } from "node:child_process";
import { request as httpRequest } from "node:http";
import { mt } from "./i18n";

// axet.flows (Live) ekranı için: kullanıcının bu makinede AYRICA çalıştırdığı
// (bizim uygulamamızdan tamamen bağımsız bir süreç olan) gerçek "aXet.flows"
// masaüstü uygulamasının HTTP portunu otomatik bulmak için.
//
// KÖK SEBEP (bkz. o uygulamanın kendi main.js'i, elle incelendi):
//   process.env.PORT = process.env.PORT || await getPort();
// yani `get-port` paketiyle HER başlatmada rastgele boş bir port seçiliyor,
// hiçbir yapılandırma dosyasına yazılmıyor — sadece o process'in kendi
// belleğinde yaşıyor ve "Environment info..." menüsünden okunabiliyor. Bu
// yüzden dosya tabanlı bir keşif YOK; tek güvenilir yol, işletim sisteminden
// "aXet.flows.exe" adlı process'in hangi TCP port(lar)ında LISTEN durumunda
// olduğunu sormak (PowerShell `Get-NetTCPConnection`), sonra bulunan her
// portu gerçekten bu uygulama mı diye HTTP `/settings` uç noktasına (Node-RED
// admin API'sinin standart, kimlik doğrulaması gerektirmeyen bir GET'i)
// istek atıp doğrulamak. Aynı exe adı altında birden fazla Electron alt
// süreci (main/renderer/GPU) çalışır ama sadece asıl (main) süreç bir TCP
// soketi dinler — bu yüzden PID listesindeki HERHANGİ birinin dinlediği
// portu bulmak yeterli, hangi PID olduğunu ayırt etmemize gerek yok.
const AXET_FLOWS_PROCESS_NAME = "aXet.flows.exe";

function runPowerShell(command: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
      { timeout: timeoutMs, windowsHide: true },
      (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stdout);
      }
    );
  });
}

async function findListeningPortsForProcess(exeName: string): Promise<number[]> {
  if (process.platform !== "win32") return [];
  // -InputObject ile açıkça bir dizi geçiyoruz - pipeline üzerinden tek
  // elemanlı bir dizi geçseydik PowerShell diziyi "unroll" edip
  // ConvertTo-Json'a TEK bir sayı (dizi değil) gönderirdi, JSON.parse
  // tarafında array/number ayrımı gerektirirdi. Bu şekilde her zaman dizi.
  const script = `
$procs = Get-CimInstance Win32_Process -Filter "Name='${exeName}'" -ErrorAction SilentlyContinue
if (-not $procs) { Write-Output '[]'; exit }
$pids = @($procs.ProcessId)
$conns = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
if (-not $conns) { Write-Output '[]'; exit }
$ports = @($conns | Where-Object { $pids -contains $_.OwningProcess } | Select-Object -ExpandProperty LocalPort -Unique)
ConvertTo-Json -InputObject $ports -Compress
`.trim();
  try {
    const raw = await runPowerShell(script);
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed);
    const values = Array.isArray(parsed) ? parsed : [parsed];
    return values.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0 && n < 65536);
  } catch {
    return [];
  }
}

function probeIsAxetFlowsSettings(port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const req = httpRequest(
      { host: "localhost", port, path: "/settings", method: "GET", timeout: timeoutMs },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf-8");
            const json = JSON.parse(body);
            const version = String(json?.version ?? "");
            resolve(
              json !== null &&
                typeof json === "object" &&
                ("httpNodeRoot" in json || /node-red/i.test(version) || json?.diagnostics !== undefined)
            );
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

export interface AxetFlowsLiveDiscoveryResult {
  ok: boolean;
  url: string | null;
  port: number | null;
  error?: string;
}

export async function discoverAxetFlowsLiveUrl(): Promise<AxetFlowsLiveDiscoveryResult> {
  if (process.platform !== "win32") {
    return { ok: false, url: null, port: null, error: mt("flowsLive.windowsOnly") };
  }
  const ports = await findListeningPortsForProcess(AXET_FLOWS_PROCESS_NAME);
  if (ports.length === 0) {
    return {
      ok: false,
      url: null,
      port: null,
      error: mt("flowsLive.appNotRunning")
    };
  }
  const probes = await Promise.all(ports.map(async (port) => ({ port, valid: await probeIsAxetFlowsSettings(port) })));
  const found = probes.find((p) => p.valid);
  if (!found) {
    return {
      ok: false,
      url: null,
      port: null,
      error: mt("flowsLive.portUnverified")
    };
  }
  // KÖK SEBEP (kullanıcı canlı test ile doğruladı): "127.0.0.1" DEĞİL,
  // "localhost" host adı kullanılmalı. Node-RED'in editör istemcisi
  // (main.min.js) sayfayı ilk yüklediğinde çeşitli admin API çağrılarını
  // AYNI origin (location.origin) üzerinden yapıyor; kullanıcı tarayıcıda
  // "127.0.0.1:PORT" ile açtığında bu istekler CORS/eşit-origin
  // beklentileriyle tutarsız kalıp editörün Monaco/palet bootstrap'ı hiç
  // tamamlanmıyor (ekran "Bağlanılıyor..." adımında sonsuza kadar asılı
  // kalıyor) — "localhost:PORT" ile açıldığında ise sorunsuz çalışıyor.
  return { ok: true, url: `http://localhost:${found.port}/`, port: found.port };
}
