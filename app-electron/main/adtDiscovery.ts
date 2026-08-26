import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { connect as tlsConnect } from "node:tls";
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { tlsConnectThroughRouter, httpRequestOverSocket } from "./sapRouter";
import type { AppLanguage } from "../shared/types";

// Kimlik doğrulama sonucunun kısa mesajı (`CredentialVerifyResult.message`)
// doğrudan renderer'da toast/hata metni olarak gösteriliyor (bkz.
// App.tsx handleCredentialsSubmit, CredentialsModal errorMessage) — bu
// yüzden config.language'a göre iki dilde tutuluyor. Uzun keşif notları
// (discoveryNotes/sap-context.md) buna dahil değil, onlar hâlâ Türkçe
// (esas olarak axet.code'un okuduğu teknik bir günlük, dil o akış için
// önemli değil).
function verifyMsg(
  language: AppLanguage,
  key:
    | "verified"
    | "verifiedRouter"
    | "unauthorized"
    | "unauthorizedWithSid"
    | "unexpectedStatus"
    | "unexpectedStatusWithBody"
    | "invalidUrl"
    | "timeout"
    | "connectionError"
    | "connectionErrorRouter"
    | "samlLoginDetected",
  params?: { sid?: string; client?: string; status?: number | null; message?: string; body?: string }
): string {
  const tr = {
    verified: "Kimlik bilgileri doğrulandı",
    verifiedRouter: "Kimlik bilgileri doğrulandı (SAProuter üzerinden)",
    unauthorized: "401 Unauthorized — kullanıcı adı/şifre yanlış veya kilitli",
    unauthorizedWithSid: `401 Unauthorized (sistem: ${params?.sid}, client: ${params?.client}) — kullanıcı adı/şifre yanlış veya kilitli`,
    unexpectedStatus: `Beklenmeyen HTTP durumu: ${params?.status}`,
    unexpectedStatusWithBody: `Beklenmeyen HTTP durumu: ${params?.status} — ${params?.body}`,
    invalidUrl: "Geçersiz ADT URL",
    timeout: "Zaman aşımı",
    connectionError: `Bağlantı hatası: ${params?.message}`,
    connectionErrorRouter: `Bağlantı hatası (SAProuter): ${params?.message}`,
    samlLoginDetected: "HTTP 200 döndü ama yanıt beklenen ADT XML'i değil, bir SAML/SSO giriş sayfası (HTML) — kimlik bilgileri Basic Auth ile hiç kontrol edilmedi, bu sistem SAML SSO gerektiriyor. Kullanıcı adı/şifre doğru veya yanlış olsun bu sonuç aynı görünür; %sap-adt-readonly skill'indeki SAML giriş akışını (login_saml_sso.py) izlemen gerekiyor."
  };
  const en = {
    verified: "Credentials verified",
    verifiedRouter: "Credentials verified (via SAProuter)",
    unauthorized: "401 Unauthorized — wrong username/password or account locked",
    unauthorizedWithSid: `401 Unauthorized (system: ${params?.sid}, client: ${params?.client}) — wrong username/password or account locked`,
    unexpectedStatus: `Unexpected HTTP status: ${params?.status}`,
    unexpectedStatusWithBody: `Unexpected HTTP status: ${params?.status} — ${params?.body}`,
    invalidUrl: "Invalid ADT URL",
    timeout: "Timed out",
    connectionError: `Connection error: ${params?.message}`,
    connectionErrorRouter: `Connection error (SAProuter): ${params?.message}`,
    samlLoginDetected: "Got HTTP 200 but the response is not the expected ADT XML — it's a SAML/SSO login page (HTML). Credentials were never actually checked via Basic Auth; this system requires SAML SSO. Right or wrong username/password produces the same result here — follow the SAML login flow (login_saml_sso.py) in the %sap-adt-readonly skill."
  };
  return (language === "en" ? en : tr)[key];
}

// Bir doğrulama isteği 200/401 dışında bir durum döndürdüğünde, yanıt
// gövdesini olduğu gibi atmak yerine kısa bir özet olarak mesaja ekliyoruz —
// özellikle yerel RFC bridge (adt_rfc_bridge.py) 502 döndürdüğünde gövde,
// başarısız olan gerçek pyrfc/RFC istisnasının metnini taşıyor (örn.
// "RFC_COMMUNICATION_FAILURE", "NIEROUT_PERM_DENIED", "Logon failed") — bu
// olmadan kullanıcı/agent sadece "502" görüyor ve kök sebebi tahmin etmek
// zorunda kalıyordu.
const MAX_BODY_SNIPPET = 400;

function summarizeBody(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return trimmed.length > MAX_BODY_SNIPPET ? `${trimmed.slice(0, MAX_BODY_SNIPPET)}…` : trimmed;
}

function unexpectedStatusMessage(language: AppLanguage, status: number | null, body: string): string {
  const snippet = summarizeBody(body);
  return snippet
    ? verifyMsg(language, "unexpectedStatusWithBody", { status, body: snippet })
    : verifyMsg(language, "unexpectedStatus", { status });
}

// KÖK SEBEP DÜZELTMESİ (canlı bulgu — BTP/Cloud + SAML SSO sistemleri):
// bazı SAML/IdP önündeki ADT endpoint'leri, Basic Auth kimlik bilgisi hiç
// kontrol edilmeden (doğru veya yanlış, farketmez) doğrudan bir HTML SSO
// giriş sayfasını HTTP 200 ile döndürüyor — eski kod sadece status===200'e
// bakıp bunu "doğrulandı" sayıyordu, yani bu sistemlerde kimlik bilgisi ne
// olursa olsun her zaman terminal açılıyordu. Gerçek ADT discovery yanıtı
// bir Atom Service Document'tır (XML, <app:service>/<atom:...> kökleriyle
// başlar) — content-type "html" içeriyorsa veya gövde bir HTML belgesiyse
// (content-type eksik/yanlış olsa bile) bunu SAML giriş sayfası olarak
// tanıyıp doğrulamayı BAŞARISIZ say.
function looksLikeSamlLoginPage(contentType: string | undefined, body: string): boolean {
  if (contentType && /html/i.test(contentType)) return true;
  const head = body.slice(0, 500).trim().toLowerCase();
  if (!head) return false;
  return head.startsWith("<!doctype html") || head.startsWith("<html") || (head.includes("<form") && head.includes("password"));
}

export function guessInstanceNumber(diagPort: number | null): string | null {
  if (!diagPort) return null;
  const str = String(diagPort);
  if (str.length !== 4 || !str.startsWith("32")) return null;
  return str.slice(2);
}

export function normalizeAdtBaseUrl(input: string): string {
  const trimmed = input.trim();
  try {
    const u = new URL(trimmed);
    return `${u.protocol}//${u.host}`;
  } catch {
    return trimmed;
  }
}

function followHttpRedirect(host: string, port: number, timeoutMs = 4000): Promise<string | null> {
  return new Promise((resolve) => {
    const req = httpRequest(
      { host, port, path: "/sap/bc/adt/discovery", method: "GET", timeout: timeoutMs },
      (res) => {
        const location = res.headers.location;
        res.resume();
        resolve(location ?? null);
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function extractSidFromRealm(wwwAuthHeader: string | undefined): string | null {
  if (!wwwAuthHeader) return null;
  const match = wwwAuthHeader.match(/\[([^/\]]+)(?:\/[^\]]*)?\]/);
  return match ? match[1].toUpperCase() : null;
}

interface ProbeResult {
  reachable: boolean;
  status: number | null;
  sid: string | null;
  error: string | null;
}

function probeRealm(host: string, port: number, timeoutMs = 6000, routerString?: string | null): Promise<ProbeResult> {
  if (routerString) {
    return probeRealmThroughRouter(routerString, host, port, timeoutMs);
  }
  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        host,
        port,
        path: "/sap/bc/adt/discovery",
        method: "GET",
        timeout: timeoutMs,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        headers: { Accept: "*/*" }
      },
      (res) => {
        const sid = extractSidFromRealm(res.headers["www-authenticate"]);
        res.resume();
        resolve({ reachable: true, status: res.statusCode ?? null, sid, error: null });
      }
    );
    req.on("error", (err) => resolve({ reachable: false, status: null, sid: null, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ reachable: false, status: null, sid: null, error: "timeout" });
    });
    req.end();
  });
}

async function probeRealmThroughRouter(
  routerString: string,
  host: string,
  port: number,
  timeoutMs: number
): Promise<ProbeResult> {
  try {
    const socket = await tlsConnectThroughRouter(routerString, host, port, timeoutMs);
    try {
      const res = await httpRequestOverSocket(socket, {
        path: "/sap/bc/adt/discovery",
        host,
        headers: { Accept: "*/*" },
        timeoutMs
      });
      const sid = extractSidFromRealm(res.headers["www-authenticate"]);
      return { reachable: true, status: res.statusCode, sid, error: null };
    } finally {
      socket.destroy();
    }
  } catch (err) {
    return { reachable: false, status: null, sid: null, error: (err as Error).message };
  }
}

interface PeerCertInfo {
  pem: string;
  authorized: boolean;
  subjectCN: string | null;
  fingerprint: string;
}

function getPeerCertPem(host: string, port: number, timeoutMs = 5000, routerString?: string | null): Promise<PeerCertInfo | null> {
  if (routerString) {
    return getPeerCertPemThroughRouter(routerString, host, port, timeoutMs);
  }
  return new Promise((resolve) => {
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
    const socket = tlsConnect(
      {
        host,
        port,
        rejectUnauthorized: false,
        timeout: timeoutMs,
        servername: isIp ? undefined : host
      },
      () => {
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.raw) {
          socket.end();
          resolve(null);
          return;
        }
        const b64 = cert.raw.toString("base64");
        const pem = `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----\n`;
        const cn = cert.subject?.CN;
        const fingerprint = createHash("sha256").update(cert.raw).digest("hex");
        resolve({ pem, authorized: socket.authorized, subjectCN: Array.isArray(cn) ? cn[0] ?? null : cn ?? null, fingerprint });
        socket.end();
      }
    );
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function getPeerCertPemThroughRouter(
  routerString: string,
  host: string,
  port: number,
  timeoutMs: number
): Promise<PeerCertInfo | null> {
  try {
    const socket = await tlsConnectThroughRouter(routerString, host, port, timeoutMs);
    const cert = socket.getPeerCertificate();
    if (!cert || !cert.raw) {
      socket.destroy();
      return null;
    }
    const b64 = cert.raw.toString("base64");
    const pem = `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----\n`;
    const cn = cert.subject?.CN;
    const fingerprint = createHash("sha256").update(cert.raw).digest("hex");
    const authorized = socket.authorized;
    socket.destroy();
    return { pem, authorized, subjectCN: Array.isArray(cn) ? cn[0] ?? null : cn ?? null, fingerprint };
  } catch {
    return null;
  }
}

function trustCertInWindowsStore(pem: string): boolean {
  if (process.platform !== "win32") return false;
  const tmpFile = path.join(os.tmpdir(), `axet-sap-cert-${Date.now()}.cer`);
  try {
    writeFileSync(tmpFile, pem, "utf-8");
    execFileSync("certutil", ["-user", "-addstore", "Root", tmpFile], { timeout: 10000, windowsHide: true });
    return true;
  } catch {
    return false;
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // best effort
    }
  }
}

export interface AdtCandidate {
  host: string;
  port: number;
  url: string;
}

export interface AdtDiscoveryResult {
  url: string;
  alternateUrl: string | null;
  sidVerified: boolean;
  notes: string[];
  trustedCertificates: Record<string, string>;
}

export async function discoverAdtEndpoint(
  ipHost: string,
  diagPort: number | null,
  expectedSid: string,
  trustedCertificates: Record<string, string>,
  routerString?: string | null
): Promise<AdtDiscoveryResult> {
  const notes: string[] = [];
  const instanceNr = guessInstanceNumber(diagPort);
  const httpPort = instanceNr ? Number(`80${instanceNr}`) : null;
  const computedHttpsPort = instanceNr ? Number(`443${instanceNr}`) : null;
  const expectedSidUpper = expectedSid.toUpperCase();

  // Olası ADT/ICM HTTPS portları — DIAG porttan hesaplanan standart port
  // (443<instance no>) her zaman doğru olmayabilir: bazı Basis ekipleri
  // ICM'i reverse-proxy/firewall ardında standart olmayan bir porta (443,
  // 8443, 50000 vb.) bağlıyor. Bu yüzden tek bir tahmine güvenmek yerine
  // bilinen tüm olası portlar PARALEL denenir, ilk SID eşleşen kazanır.
  const candidatePorts: number[] = [];
  const addPort = (p: number | null | undefined) => {
    if (p && !candidatePorts.includes(p)) candidatePorts.push(p);
  };
  addPort(computedHttpsPort);
  addPort(44300);
  addPort(443);
  addPort(8443);
  addPort(50000);
  addPort(4443);

  const candidates: AdtCandidate[] = candidatePorts.map((port) => ({
    host: ipHost,
    port,
    url: `https://${ipHost}:${port}`
  }));

  if (routerString) {
    notes.push(
      `SAProuter üzerinden bağlanılıyor (${routerString}) — HTTP redirect keşfi atlandı, ${candidatePorts.length} olası port paralel deneniyor (${candidatePorts.join(", ")}).`
    );
  } else if (httpPort) {
    const location = await followHttpRedirect(ipHost, httpPort);
    if (location) {
      try {
        const u = new URL(location);
        const redirectPort = u.port ? Number(u.port) : 443;
        if (u.hostname !== ipHost) {
          candidates.unshift({ host: u.hostname, port: redirectPort, url: `https://${u.hostname}:${redirectPort}` });
          notes.push(`HTTP redirect ile hostname bulundu: ${u.hostname}:${redirectPort}`);
        } else if (!candidatePorts.includes(redirectPort)) {
          candidates.unshift({ host: ipHost, port: redirectPort, url: `https://${ipHost}:${redirectPort}` });
          notes.push(`HTTP redirect ile port bulundu: ${ipHost}:${redirectPort}`);
        }
      } catch {
        notes.push("Redirect Location parse edilemedi.");
      }
    } else {
      notes.push(`Port ${httpPort} üzerinden redirect alınamadı, ${candidatePorts.length} olası HTTPS portu paralel deneniyor (${candidatePorts.join(", ")}).`);
    }
  } else {
    notes.push(`DIAG port formatından instance no çözümlenemedi, ${candidatePorts.length} olası HTTPS portu paralel deneniyor (${candidatePorts.join(", ")}).`);
  }

  // Tüm candidate'lar SIRAYLA değil PARALEL probe ediliyor — 7+ port
  // sırayla denense (her biri saniyelerce timeout'a kadar bekleyebilir)
  // bağlantı denemesi dakikalar sürebilirdi; paralelde toplam süre en
  // yavaş tekil probe kadardır.
  const probeResults = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      probe: await probeRealm(candidate.host, candidate.port, 4000, routerString)
    }))
  );

  let chosen: AdtCandidate | null = null;
  let sidVerified = false;

  for (const { candidate, probe } of probeResults) {
    if (!probe.reachable) {
      notes.push(`${candidate.host}:${candidate.port} → erişilemedi (${probe.error ?? "bilinmeyen hata"})`);
      continue;
    }
    if (probe.sid) {
      const match = probe.sid === expectedSidUpper;
      notes.push(
        `${candidate.host}:${candidate.port} → sistem kimliği "${probe.sid}" ${match ? "✓ eşleşti" : `✗ beklenen "${expectedSidUpper}" ile eşleşmedi — bu host yanlış sisteme çıkıyor olabilir (DNS hatası)`}`
      );
      if (match && !chosen) {
        chosen = candidate;
        sidVerified = true;
      }
    } else {
      notes.push(`${candidate.host}:${candidate.port} → HTTP ${probe.status}, sistem kimliği header'da yok`);
    }
  }

  if (!chosen) {
    const firstReachable = probeResults.find((r) => r.probe.reachable);
    if (firstReachable) {
      chosen = firstReachable.candidate;
      notes.push(`Hiçbir port SID doğrulamasını geçemedi, erişilebilir ilk port kullanılıyor: ${chosen.host}:${chosen.port}`);
    }
  }

  if (!chosen) {
    chosen = candidates[0];
    notes.push("Hiçbir porta erişilemedi, ilk seçenek kullanılıyor — bağlantı büyük olasılıkla başarısız olacak.");
  }

  const alternate = probeResults.find((r) => r.candidate !== chosen && r.probe.reachable)?.candidate ?? candidates.find((c) => c !== chosen) ?? null;

  const certKey = `${chosen.host}:${chosen.port}`;
  const updatedTrustedCertificates = { ...trustedCertificates };
  const certInfo = await getPeerCertPem(chosen.host, chosen.port, undefined, routerString);
  if (certInfo && trustedCertificates[certKey] === certInfo.fingerprint) {
    notes.push("Sertifika daha önce zaten güvenilir listesine eklenmiş, tekrar kurulmuyor.");
  } else if (certInfo && !certInfo.authorized) {
    notes.push(`Sertifika sistem tarafından güvenilir değil (CN=${certInfo.subjectCN ?? "?"}) — kullanıcı trust store'una ekleniyor.`);
    const trusted = trustCertInWindowsStore(certInfo.pem);
    notes.push(trusted ? "Sertifika Windows kullanıcı trust store'una eklendi." : "Sertifika trust store'a eklenemedi.");
    if (trusted) updatedTrustedCertificates[certKey] = certInfo.fingerprint;
  } else if (certInfo && certInfo.authorized) {
    notes.push("Sertifika zaten güvenilir.");
    updatedTrustedCertificates[certKey] = certInfo.fingerprint;
  } else {
    notes.push("TLS handshake başarısız oldu / sertifika alınamadı.");
  }

  return {
    url: chosen.url,
    alternateUrl: alternate?.url ?? null,
    sidVerified,
    notes,
    trustedCertificates: updatedTrustedCertificates
  };
}

export interface CredentialVerifyResult {
  ok: boolean;
  status: number | null;
  sid: string | null;
  message: string;
}

export function verifyCredentials(
  url: string,
  username: string,
  password: string,
  client: string,
  timeoutMs = 15000,
  routerString?: string | null,
  language: AppLanguage = "tr"
): Promise<CredentialVerifyResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({ ok: false, status: null, sid: null, message: verifyMsg(language, "invalidUrl") });
  }
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const discoveryPath = client.trim()
    ? `/sap/bc/adt/discovery?sap-client=${encodeURIComponent(client.trim())}`
    : "/sap/bc/adt/discovery";
  const host = parsed.hostname;
  // http:// şeması (yalnızca yerel RFC bridge — 127.0.0.1 — için kullanılır,
  // gerçek SAP sistemleri her zaman https) düz http modülüyle istek atar,
  // aksi halde TLS handshake bekleyip zaman aşımına düşer.
  const isPlainHttp = parsed.protocol === "http:";
  const port = parsed.port ? Number(parsed.port) : isPlainHttp ? 80 : 443;
  const requestFn = isPlainHttp ? httpRequest : httpsRequest;

  if (routerString) {
    return verifyCredentialsThroughRouter(routerString, host, port, discoveryPath, auth, client, timeoutMs, language);
  }

  return new Promise((resolve) => {
    const req = requestFn(
      {
        host,
        port,
        path: discoveryPath,
        method: "GET",
        timeout: timeoutMs,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        headers: { Authorization: `Basic ${auth}`, Accept: "*/*" }
      },
      (res) => {
        const sid = extractSidFromRealm(res.headers["www-authenticate"]);
        const status = res.statusCode ?? null;
        const contentType = res.headers["content-type"];
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          if (chunks.length < 8) chunks.push(chunk);
        });
        res.on("end", () => {
          if (status === 200) {
            const body = Buffer.concat(chunks).toString("utf-8");
            if (looksLikeSamlLoginPage(contentType, body)) {
              resolve({ ok: false, status, sid, message: verifyMsg(language, "samlLoginDetected") });
              return;
            }
            resolve({ ok: true, status, sid, message: verifyMsg(language, "verified") });
          } else if (status === 401) {
            resolve({
              ok: false,
              status,
              sid,
              message: sid
                ? verifyMsg(language, "unauthorizedWithSid", { sid, client })
                : verifyMsg(language, "unauthorized")
            });
          } else {
            const body = Buffer.concat(chunks).toString("utf-8");
            resolve({ ok: false, status, sid, message: unexpectedStatusMessage(language, status, body) });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, status: null, sid: null, message: verifyMsg(language, "connectionError", { message: err.message }) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: null, sid: null, message: verifyMsg(language, "timeout") });
    });
    req.end();
  });
}

async function verifyCredentialsThroughRouter(
  routerString: string,
  host: string,
  port: number,
  discoveryPath: string,
  auth: string,
  client: string,
  timeoutMs: number,
  language: AppLanguage = "tr"
): Promise<CredentialVerifyResult> {
  let socket;
  try {
    socket = await tlsConnectThroughRouter(routerString, host, port, timeoutMs);
  } catch (err) {
    return { ok: false, status: null, sid: null, message: verifyMsg(language, "connectionErrorRouter", { message: (err as Error).message }) };
  }
  try {
    const res = await httpRequestOverSocket(socket, {
      path: discoveryPath,
      host,
      headers: { Authorization: `Basic ${auth}`, Accept: "*/*" },
      timeoutMs
    });
    const sid = extractSidFromRealm(res.headers["www-authenticate"]);
    const status = res.statusCode;
    if (status === 200) {
      if (looksLikeSamlLoginPage(res.headers["content-type"], res.body ?? "")) {
        return { ok: false, status, sid, message: verifyMsg(language, "samlLoginDetected") };
      }
      return { ok: true, status, sid, message: verifyMsg(language, "verifiedRouter") };
    } else if (status === 401) {
      return {
        ok: false,
        status,
        sid,
        message: sid
          ? verifyMsg(language, "unauthorizedWithSid", { sid, client })
          : verifyMsg(language, "unauthorized")
      };
    }
    return { ok: false, status, sid, message: unexpectedStatusMessage(language, status, res.body ?? "") };
  } catch (err) {
    return { ok: false, status: null, sid: null, message: verifyMsg(language, "connectionErrorRouter", { message: (err as Error).message }) };
  } finally {
    socket.destroy();
  }
}
