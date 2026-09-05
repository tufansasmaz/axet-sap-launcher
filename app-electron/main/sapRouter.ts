import { Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";

export interface RouterHop {
  host: string;
  port: string;
  password?: string;
}

const HOP_REGEX = /\/[hH]\/([\w.\-]+)(?:\/[sS]\/(\w+))?(?:\/[pP][wW]?\/([\w.]+))?/g;

// TLS SNI'ya IP yazılamaz (RFC 6066). Node bunu DEP0123 ile uyarıyor ve
// ileride yok sayacağını söylüyor. Dört ayrı TLS/HTTPS çağrısı (buradaki
// `tlsConnectThroughRouter` + `adtDiscovery.ts`'teki üç istek) bunu ayrı ayrı
// düşünmek zorundaydı ve yalnızca ikisi düşünmüştü; ötekiler IP'li bir host'ta
// (SAP Logon kayıtlarında sık) uyarı üretiyordu. Artık tek yerden.
// IPv6 de kapsanıyor — iki nokta içeren bir host adı zaten geçerli bir DNS
// adı değil.
export function sniFor(host: string): string | undefined {
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  return isIp ? undefined : host;
}

export function parseRouteString(routeString: string): RouterHop[] {
  const hops: RouterHop[] = [];
  const re = new RegExp(HOP_REGEX);
  let match: RegExpExecArray | null;
  while ((match = re.exec(routeString)) !== null) {
    hops.push({ host: match[1], port: match[2] ?? "3299", password: match[3] });
  }
  return hops;
}

export function buildFullRoute(routerString: string, finalHost: string, finalPort: number): RouterHop[] {
  const hops = parseRouteString(routerString);
  hops.push({ host: finalHost, port: String(finalPort) });
  return hops;
}

interface RouterErrorInfo {
  returnCode: number | null;
  detail: string;
}

function parseRouterError(responsePayload: Buffer): RouterErrorInfo {
  try {
    const typeEnd = responsePayload.indexOf(0);
    let offset = typeEnd === -1 ? responsePayload.length : typeEnd + 1;
    offset += 1; // version
    offset += 1; // opcode
    offset += 1; // opcode_padd
    if (offset + 4 > responsePayload.length) return { returnCode: null, detail: "" };
    const returnCode = responsePayload.readInt32BE(offset);
    offset += 4;
    offset += 4; // err_text_length
    const rest = responsePayload.subarray(offset);
    const parts = rest
      .toString("latin1")
      .split("\0")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^\*ERR\*$/.test(s));
    const detail = parts.slice(0, 4).join(" | ");
    return { returnCode, detail };
  } catch {
    return { returnCode: null, detail: "" };
  }
}

// Marker: launcher.ts'teki isRouterPermissionDenied() (aslında artık
// isRouterPermissionDeniedMessage() re-export'u) bu string'i mesajda arayarak
// RFC bridge fallback'ini tetikler — tek doğruluk kaynağı burası.
const PERMISSION_DENIED_TAG = "ROUTER_PERM_DENIED";

// SAP resmi olarak -94'ü NIEROUT_PERM_DENIED olarak belgeliyor (SAP Note
// 63342), AMA canlı bulgular gösterdi ki bazı router sürümleri/build'leri
// AYNI izin-reddi durumunu farklı bir return_code (örn. -93) ile
// bildirebiliyor — kod farklı olsa da router'ın kendi metni ("route
// permission denied") aynı kalıyor. Bu yüzden kod numarasına değil, ayrıca
// yanıt metnine de bakıyoruz; sadece "-94 mü değil mi" kontrolü tek bir
// müşteride bile kırılgan çıktı (Limak'ta -94, başka bir sistemde -93).
function isPermissionDeniedDetail(returnCode: number | null, detail: string): boolean {
  return returnCode === -94 || /permission denied/i.test(detail);
}

function describeRouterFailure(type: string, responsePayload: Buffer): string {
  if (type !== "NI_RTERR") {
    return `SAProuter rotayı kabul etmedi (yanıt: ${type || "bilinmeyen"}).`;
  }
  const { returnCode, detail } = parseRouterError(responsePayload);
  if (isPermissionDeniedDetail(returnCode, detail)) {
    return (
      `SAProuter bu rotayı REDDETTİ (${PERMISSION_DENIED_TAG}, return_code=${returnCode ?? "?"} — izin tablosunda bu ` +
      `kaynak/hedef/port için kayıt yok; router sürümüne göre bu -94/NIEROUT_PERM_DENIED ya da -93 gibi farklı bir kodla ` +
      `dönebilir, ikisi de aynı "izin reddi" anlamına gelir). ` +
      `Bu bir yazılım hatası değil: router yöneticisinin (Basis/network ekibi) saprouttab izin tablosuna bu makinenin ` +
      `genel IP'sinden hedef host:port'a "ham/native" (raw) tünelleme izni eklemesi gerekiyor — SAP GUI'nin DIAG ` +
      `bağlantısı (native SAP NI protokolü) farklı bir izin kapsamında zaten çalışıyor olabilir, ama ADT/HTTPS trafiği ` +
      `için ayrı bir P/S saprouttab satırı gerekir. Detay: ${detail || "yok"}`
    );
  }
  return `SAProuter rotayı reddetti (return_code=${returnCode ?? "?"}). Detay: ${detail || "yok"}`;
}

// Üçüncü koşul geriye uyumluluk için duruyor (bu dosyanın kendi ürettiği
// mesajlarda zaten marker var), ama çıplak `includes("-94")` fazla genişti:
// mesajın içinde host adı da geçiyor ve `sapqas-94.firma.local` gibi bir ad
// -veya bir port/ID- bu testi geçiriyordu. Sonucu sessiz ve kafa karıştırıcı:
// router'ı sadece ERİŞİLEMEZ olan bir sistemde launcher "izin reddi" sanıp
// RFC bridge'i başlatmaya kalkıyor, kullanıcı da gerçek sebebi ("router'a
// bağlanılamadı") hiç görmüyordu. Artık `-94`'ün iki yanında da harf/rakam/
// nokta/tire olmaması gerekiyor: `return_code=-94` ve `(-94,` geçer,
// `sapqas-94` ve `-940` geçmez.
const BARE_94_REGEX = /(^|[^\w.\-])-94($|[^\w.\-])/;

export function isRouterPermissionDeniedMessage(message: string): boolean {
  return (
    message.includes(PERMISSION_DENIED_TAG) ||
    message.includes("NIEROUT_PERM_DENIED") ||
    BARE_94_REGEX.test(message)
  );
}

function buildHopEntry(hop: RouterHop): Buffer {
  const host = Buffer.from(`${hop.host}\0`, "ascii");
  const port = Buffer.from(`${hop.port || "3299"}\0`, "ascii");
  const password = Buffer.from(`${hop.password ?? ""}\0`, "ascii");
  return Buffer.concat([host, port, password]);
}

function buildRouteRequest(hops: RouterHop[], talkMode: number): Buffer {
  const entries = hops.map(buildHopEntry);
  const routeString = Buffer.concat(entries);
  const routeLength = routeString.length;
  const routeOffset = entries[0].length;

  const header = Buffer.alloc(24);
  let offset = 0;
  header.write("NI_ROUTE\0", offset, "ascii");
  offset += 9;
  header.writeUInt8(2, offset); // version
  offset += 1;
  header.writeUInt8(40, offset); // route_ni_version
  offset += 1;
  header.writeUInt8(hops.length, offset); // route_entries
  offset += 1;
  header.writeUInt8(talkMode, offset); // route_talk_mode
  offset += 1;
  header.writeUInt16BE(0, offset); // route_padd
  offset += 2;
  header.writeUInt8(hops.length - 1, offset); // route_rest_nodes
  offset += 1;
  header.writeUInt32BE(routeLength, offset); // route_length
  offset += 4;
  header.writeUInt32BE(routeOffset, offset); // route_offset
  offset += 4;

  const payload = Buffer.concat([header, routeString]);
  const frame = Buffer.alloc(4 + payload.length);
  frame.writeUInt32BE(payload.length, 0);
  payload.copy(frame, 4);
  return frame;
}

export const ROUTER_TALK_MODE_NI_MSG_IO = 0;
export const ROUTER_TALK_MODE_NI_RAW_IO = 1;

export function connectThroughRouter(
  hops: RouterHop[],
  timeoutMs = 8000,
  talkMode: number = ROUTER_TALK_MODE_NI_RAW_IO
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (hops.length < 2) {
      reject(new Error("Router rotası en az bir router hop'u ve bir hedef içermeli."));
      return;
    }
    const first = hops[0];
    const socket = new Socket();
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => fail(new Error(`SAProuter bağlantısı zaman aşımına uğradı (${first.host}:${first.port})`)));
    socket.once("error", (err) => fail(new Error(`SAProuter'a bağlanılamadı (${first.host}:${first.port}): ${err.message}`)));

    socket.connect(Number(first.port), first.host, () => {
      const request = buildRouteRequest(hops, talkMode);
      socket.write(request);

      let buffer = Buffer.alloc(0);
      const onData = (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length < 4) return;
        const len = buffer.readUInt32BE(0);
        if (buffer.length < len + 4) return;

        socket.removeListener("data", onData);
        socket.setTimeout(0);

        const responsePayload = buffer.subarray(4, 4 + len);
        const nullIdx = responsePayload.indexOf(0);
        const type = responsePayload.subarray(0, nullIdx === -1 ? responsePayload.length : nullIdx).toString("ascii");

        const leftover = buffer.subarray(4 + len);

        if (type === "NI_PONG") {
          settled = true;
          if (leftover.length > 0) socket.unshift(leftover);
          resolve(socket);
        } else {
          fail(new Error(describeRouterFailure(type, responsePayload)));
        }
      };
      socket.on("data", onData);
    });
  });
}

export async function tlsConnectThroughRouter(
  routerString: string,
  finalHost: string,
  finalPort: number,
  timeoutMs = 8000
): Promise<TLSSocket> {
  const hops = buildFullRoute(routerString, finalHost, finalPort);
  const rawSocket = await connectThroughRouter(hops, timeoutMs);

  return new Promise((resolve, reject) => {
    const tlsSocket = tlsConnect({
      socket: rawSocket,
      servername: sniFor(finalHost),
      rejectUnauthorized: false,
      timeout: timeoutMs
    });
    tlsSocket.once("secureConnect", () => resolve(tlsSocket));
    tlsSocket.once("error", (err) => reject(err));
    tlsSocket.once("timeout", () => {
      tlsSocket.destroy();
      reject(new Error("TLS handshake zaman aşımına uğradı (SAProuter üzerinden)."));
    });
  });
}

export interface RouterHttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export function httpRequestOverSocket(
  socket: TLSSocket,
  options: { method?: string; path: string; host: string; headers?: Record<string, string>; timeoutMs?: number }
): Promise<RouterHttpResponse> {
  return new Promise((resolve, reject) => {
    const method = options.method ?? "GET";
    const headerLines = Object.entries(options.headers ?? {}).map(([k, v]) => `${k}: ${v}\r\n`);
    const request =
      `${method} ${options.path} HTTP/1.1\r\n` +
      `Host: ${options.host}\r\n` +
      headerLines.join("") +
      `Connection: close\r\n\r\n`;

    let raw = Buffer.alloc(0);
    const timeoutMs = options.timeoutMs ?? 10000;
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error("HTTP isteği zaman aşımına uğradı (SAProuter üzerinden)."));
    }, timeoutMs);

    socket.on("data", (chunk: Buffer) => {
      raw = Buffer.concat([raw, chunk]);
    });
    socket.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    socket.once("close", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        const text = raw.toString("latin1");
        const headerEnd = text.indexOf("\r\n\r\n");
        if (headerEnd === -1) {
          reject(new Error("Geçersiz HTTP yanıtı (SAProuter üzerinden)."));
          return;
        }
        const headerText = text.slice(0, headerEnd);
        const bodyText = text.slice(headerEnd + 4);
        const lines = headerText.split("\r\n");
        const statusMatch = lines[0].match(/HTTP\/\d\.\d\s+(\d+)/);
        const statusCode = statusMatch ? Number(statusMatch[1]) : 0;
        const headers: Record<string, string> = {};
        for (let i = 1; i < lines.length; i++) {
          const idx = lines[i].indexOf(":");
          if (idx === -1) continue;
          headers[lines[i].slice(0, idx).trim().toLowerCase()] = lines[i].slice(idx + 1).trim();
        }
        resolve({ statusCode, headers, body: bodyText });
      } catch (err) {
        reject(err as Error);
      }
    });

    socket.write(request);
  });
}
