import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { connect as tlsConnect, checkServerIdentity, type PeerCertificate } from "node:tls";
import { tlsConnectThroughRouter, httpRequestOverSocket } from "./sapRouter";
import {
  certFingerprint,
  certKeyFor,
  isTlsTrustError,
  normalizeFingerprint,
  pinForUrl,
  sniFor,
  verifiedConnection,
  type TlsTrustError
} from "./tlsPin";
import { encodeBasicCredentials, nonAsciiChars } from "./basicAuth";
import type { AppLanguage, CertTrustPrompt } from "../shared/types";

// Kimlik doğrulama sonucunun kısa mesajı (`CredentialVerifyResult.message`)
// doğrudan renderer'da toast/hata metni olarak gösteriliyor (bkz.
// App.tsx handleCredentialsSubmit, CredentialsModal errorMessage) — bu
// yüzden config.language'a göre iki dilde tutuluyor. Uzun keşif notları
// (discoveryNotes/sap-context.md) buna dahil değil, onlar hâlâ Türkçe
// (esas olarak axet.code'un okuduğu teknik bir günlük, dil o akış için
// önemli değil).
/**
 * 401'de "initial şifre" ihtimali ayrıca yazılıyor, çünkü teşhis edilmesi en
 * zor olan ve kullanıcıya EN YANLIŞ görünen hâl bu: SU01'den ATANAN şifre
 * "initial" durumdadır, SAP GUI onu kabul eder (sadece değiştirme ekranını
 * gösterir) ama HTTP Basic reddeder — Basic'te şifre değiştirme diyaloğu
 * çalıştırılamadığı için. Kullanıcı "GUI'ye giriyorum, uygulamaya giremiyorum"
 * der ve eski metin onu "şifre yanlış" sanısına yollardı. Ölçüldü 2026-09-23
 * (DS4): GUI'nin kendi değiştirme ekranından bir kez değiştirmek düzeltti.
 */
const INITIAL_PASSWORD_HINT_TR =
  "Şifre SU01'den yeni atandıysa SAP GUI'ye girip GUI'nin kendi şifre değiştirme ekranından bir kez değiştirin — SU01'den yeniden atamak aynı sonucu verir.";
const INITIAL_PASSWORD_HINT_EN =
  "If the password was just assigned in SU01, log on with SAP GUI once and change it from GUI's own change-password dialog — re-assigning it in SU01 leads to the same result.";

function verifyMsg(
  language: AppLanguage,
  key:
    | "verified"
    | "verifiedRouter"
    | "unauthorized"
    | "unauthorizedWithSid"
    | "unexpectedStatus"
    | "unexpectedStatusWithBody"
    | "unexpectedStatusHtml"
    | "unexpectedStatusHtmlWithTitle"
    | "unexpectedStatusSicfInactive"
    | "invalidUrl"
    | "timeout"
    | "connectionError"
    | "connectionErrorRouter"
    | "unauthorizedNonAscii"
    | "samlLoginDetected"
    | "tlsUntrusted"
    | "tlsPinMismatch",
  params?: {
    sid?: string;
    client?: string;
    status?: number | null;
    message?: string;
    body?: string;
    title?: string;
    chars?: string;
    endpoint?: string;
  }
): string {
  const tr = {
    verified: "Kimlik bilgileri doğrulandı",
    verifiedRouter: "Kimlik bilgileri doğrulandı (SAProuter üzerinden)",
    unauthorized: `401 Unauthorized — kullanıcı adı/şifre yanlış, kullanıcı kilitli, ya da şifre "initial" durumda. ${INITIAL_PASSWORD_HINT_TR}`,
    unauthorizedWithSid: `401 Unauthorized (sistem: ${params?.sid}, client: ${params?.client}) — kullanıcı adı/şifre yanlış, kullanıcı kilitli, ya da şifre "initial" durumda. ${INITIAL_PASSWORD_HINT_TR}`,
    unauthorizedNonAscii: `401 Unauthorized (sistem: ${params?.sid}, client: ${params?.client}) — şifrende ASCII dışı karakter var: ${params?.chars}. SAP bu şifreyi GUI'de kabul edip HTTP/ADT kanalında reddedebiliyor; ölçüldü (2026-09-23, DS4): GUI giriyordu, aynı şifre HTTP'de hem UTF-8 hem ISO-8859-9 baytlarıyla 401 aldı, kullanıcı kilitli değildi. Şifreyi SAP GUI'nin kendi değiştirme ekranından SADECE ASCII karakterlerden oluşan bir şeyle değiştir (SU01'den atama "initial" durum yaratır, o da 401 verir). Şifre gerçekten yanlışsa ya da kullanıcı kilitliyse bu mesaj yine aynı görünür.`,
    unexpectedStatus: `Beklenmeyen HTTP durumu: ${params?.status}`,
    unexpectedStatusWithBody: `Beklenmeyen HTTP durumu: ${params?.status} — ${params?.body}`,
    unexpectedStatusHtml: `Beklenmeyen HTTP durumu: ${params?.status} (yanıt bir HTML sayfası — SAP bu durumda genelde ICM'in kendi hata sayfasını döndürür, ADT yanıtı değildir)`,
    unexpectedStatusHtmlWithTitle: `Beklenmeyen HTTP durumu: ${params?.status} — "${params?.title}" (SAP'ın kendi HTML hata sayfası, ADT yanıtı değil)`,
    unexpectedStatusSicfInactive: `HTTP ${params?.status} — "${params?.title}". Bu, SAP ICM'in kendi hata sayfası ve genelde şu anlama gelir: bu sistemde /sap/bc/adt servisi SICF'te henüz aktive edilmemiş (kullanıcı adı/şifre veya ağ/VPN sorunu DEĞİL). Basis ekibine SICF (t-code SICF) üzerinden default_host/sap/bc/adt düğümünü "Service/Host Activate" ile aktive etmesini iste.`,
    invalidUrl: "Geçersiz ADT URL",
    timeout: "Zaman aşımı",
    connectionError: `Bağlantı hatası: ${params?.message}`,
    connectionErrorRouter: `Bağlantı hatası (SAProuter): ${params?.message}`,
    samlLoginDetected: "HTTP 200 döndü ama yanıt beklenen ADT XML'i değil, bir SAML/SSO giriş sayfası (HTML) — kimlik bilgileri Basic Auth ile hiç kontrol edilmedi, bu sistem SAML SSO gerektiriyor. Kullanıcı adı/şifre doğru veya yanlış olsun bu sonuç aynı görünür; %sap-adt skill'indeki SAML giriş akışını (login_saml_sso.py) izlemen gerekiyor.",
    tlsUntrusted: `${params?.endpoint} sunucusunun sertifikası doğrulanamadı ve bu sistem için onaylanmış bir sertifika yok — kimlik bilgileri GÖNDERİLMEDİ. Bağlanmayı yeniden deneyin; uygulama sertifikayı size gösterip onayınızı isteyecek.`,
    tlsPinMismatch: `${params?.endpoint} sunucusunun sertifikası bu sistem için onaylanan sertifikayla eşleşmiyor — kimlik bilgileri GÖNDERİLMEDİ. Sunucuda sertifika yenilenmiş olabilir ya da araya giren bir taraf (MITM) olabilir. Bağlanmayı yeniden deneyin; uygulama yeni sertifikayı size onaylatacak.`
  };
  const en = {
    verified: "Credentials verified",
    verifiedRouter: "Credentials verified (via SAProuter)",
    unauthorized: `401 Unauthorized — wrong username/password, account locked, or the password is still "initial". ${INITIAL_PASSWORD_HINT_EN}`,
    unauthorizedWithSid: `401 Unauthorized (system: ${params?.sid}, client: ${params?.client}) — wrong username/password, account locked, or the password is still "initial". ${INITIAL_PASSWORD_HINT_EN}`,
    unauthorizedNonAscii: `401 Unauthorized (system: ${params?.sid}, client: ${params?.client}) — your password contains non-ASCII characters: ${params?.chars}. SAP can accept such a password in SAP GUI and still reject it over HTTP/ADT; measured (2026-09-23, DS4): GUI logged on fine while the same password got 401 over HTTP with both UTF-8 and ISO-8859-9 bytes, and the account was not locked. Change the password from SAP GUI's own change dialog to one made of ASCII characters only (assigning it in SU01 makes it "initial", which also returns 401). A genuinely wrong password or a locked account looks the same as this.`,
    unexpectedStatus: `Unexpected HTTP status: ${params?.status}`,
    unexpectedStatusWithBody: `Unexpected HTTP status: ${params?.status} — ${params?.body}`,
    unexpectedStatusHtml: `Unexpected HTTP status: ${params?.status} (response is an HTML page — SAP usually returns ICM's own error page in this case, not an ADT response)`,
    unexpectedStatusHtmlWithTitle: `Unexpected HTTP status: ${params?.status} — "${params?.title}" (SAP's own HTML error page, not an ADT response)`,
    unexpectedStatusSicfInactive: `HTTP ${params?.status} — "${params?.title}". This is SAP ICM's own error page and usually means the /sap/bc/adt service has not been activated in SICF on this system yet (not a username/password or network/VPN issue). Ask the Basis team to activate the default_host/sap/bc/adt node via SICF (t-code SICF, "Service/Host Activate").`,
    invalidUrl: "Invalid ADT URL",
    timeout: "Timed out",
    connectionError: `Connection error: ${params?.message}`,
    connectionErrorRouter: `Connection error (SAProuter): ${params?.message}`,
    samlLoginDetected: "Got HTTP 200 but the response is not the expected ADT XML — it's a SAML/SSO login page (HTML). Credentials were never actually checked via Basic Auth; this system requires SAML SSO. Right or wrong username/password produces the same result here — follow the SAML login flow (login_saml_sso.py) in the %sap-adt skill.",
    tlsUntrusted: `The certificate of ${params?.endpoint} could not be verified and no certificate has been approved for this system — credentials were NOT sent. Try connecting again; the app will show you the certificate and ask for your approval.`,
    tlsPinMismatch: `The certificate of ${params?.endpoint} does not match the one approved for this system — credentials were NOT sent. The server's certificate may have been renewed, or someone may be intercepting the connection (MITM). Try connecting again; the app will ask you to approve the new certificate.`
  };
  return (language === "en" ? en : tr)[key];
}

/**
 * 401'in metni şifrenin KENDİ karakterlerine bakarak seçiliyor.
 *
 * SAP 401'i gerekçesiz döndürüyor — yanlış şifre, kilit, "initial" durum ve
 * "GUI kabul ediyor ama HTTP etmiyor" hâli AYNI cevabı veriyor. Şifrede ASCII
 * dışı karakter varsa ölçülmüş olan (bkz. basicAuth.ts) bu son ihtimal en
 * üste çıkarılıyor, çünkü kullanıcı açısından en yanıltıcı olan o: GUI'ye
 * girebildiği için şifresinin doğru olduğunu biliyor.
 */
function unauthorizedMessage(
  language: AppLanguage,
  sid: string | null,
  client: string,
  nonAscii: string[]
): string {
  if (nonAscii.length > 0) {
    return verifyMsg(language, "unauthorizedNonAscii", { sid: sid ?? "?", client, chars: nonAscii.join(" ") });
  }
  return sid ? verifyMsg(language, "unauthorizedWithSid", { sid, client }) : verifyMsg(language, "unauthorized");
}

/**
 * Sertifika kabul kuralı tutmadığı için istek gönderilmediğinde dönen sonuç.
 * `tlsRejected` ayrı bir bayrak, çünkü `status: null` başka yerde "ağ hatası"
 * diye okunuyor (launcher.ts RFC köprüsüne düşme kararı) — sertifikası
 * reddedilen bir sunucu için başka kanala geçip aynı şifreyi denemek yanlış.
 */
function tlsRejectedResult(language: AppLanguage, err: TlsTrustError): CredentialVerifyResult {
  const endpoint = `${err.host}:${err.port}`;
  return {
    ok: false,
    status: null,
    sid: null,
    tlsRejected: true,
    message: verifyMsg(language, err.code === "TLS_PIN_MISMATCH" ? "tlsPinMismatch" : "tlsUntrusted", { endpoint })
  };
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

// KÖK SEBEP DÜZELTMESİ (canlı bulgu — müşteri G/SID-G2, 2026-09-02): bazı
// hata durumlarında (403/404 vb.) SAP'ın ICM'i kendi HTML hata sayfasını
// (örn. SICF'te aktive edilmemiş bir servise erişilince "Service cannot be
// reached") döndürüyor. Eski kod bu HTML'i olduğu gibi (etiketler dahil,
// 400 karaktere kadar) kullanıcıya gösteriyordu — okunamaz, kök sebebi
// gizleyen bir çıktıydı. Artık gövde HTML ise SADECE <title> etiketinin
// içeriği çıkarılıp gösteriliyor (SAP'ın kendi hata sayfalarında bu her
// zaman anlamlı bir özet taşır — "Service cannot be reached" gibi); ayrıca
// bu başlık SICF-servis-aktif-değil kalıbına uyuyorsa doğrudan Basis'e
// yönlendiren açıklayıcı bir not ekleniyor.
const HTML_BODY_START = /^\s*(<!doctype html|<html)/i;

function isHtmlBody(contentType: string | undefined, body: string): boolean {
  if (contentType && /html/i.test(contentType)) return true;
  return HTML_BODY_START.test(body.slice(0, 200));
}

function extractHtmlTitle(body: string): string {
  const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

const SICF_INACTIVE_TITLE_PATTERN = /service cannot be reached|resource\/service.*not (available|found)|404.*not found|service .* not (active|available)/i;

function unexpectedStatusMessage(language: AppLanguage, status: number | null, body: string, contentType?: string): string {
  if (isHtmlBody(contentType, body)) {
    const title = extractHtmlTitle(body);
    if (title && SICF_INACTIVE_TITLE_PATTERN.test(title)) {
      return verifyMsg(language, "unexpectedStatusSicfInactive", { status, title });
    }
    return title
      ? verifyMsg(language, "unexpectedStatusHtmlWithTitle", { status, title })
      : verifyMsg(language, "unexpectedStatusHtml", { status });
  }
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
    // Doğrulamasız OLMASI bilinçli: bu, hangi portun hangi sisteme çıktığını
    // (realm'deki SID) bulan ilk temas yoklaması ve üzerinden YALNIZCA
    // `Accept` başlığı gidiyor — Authorization/Cookie yok. Kimlik bilgisi
    // taşıyan istekler aşağıdaki `verifyCredentials`/`verifyWithCookies`'te
    // tlsPin.ts'in kabul kuralından geçiyor. Buraya bir kimlik başlığı
    // eklenirse o kural atlanmış olur.
    const req = httpsRequest(
      {
        host,
        port,
        path: "/sap/bc/adt/discovery",
        method: "GET",
        timeout: timeoutMs,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        servername: sniFor(host),
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
    // `probe`: kimlik bilgisi gitmiyor (bkz. probeRealm'deki not).
    const socket = await tlsConnectThroughRouter(routerString, host, port, { mode: "probe" }, timeoutMs);
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
  authorized: boolean;
  subjectCN: string | null;
  fingerprint: string;
  /** Issuer == Subject. Yalnızca onay penceresinde bilgi olarak gösteriliyor. */
  selfSigned: boolean;
  issuerCN: string | null;
  /**
   * Kabul kuralının (a) kolu: zincir doğrulandı VE host adı sertifikayla
   * eşleşiyor. `authorized` tek başına yetmiyor — geçerli bir sertifikası olan
   * başka bir alan adı da `authorized` görünür.
   */
  trustedByChain: boolean;
  /** Onay penceresinde gösterilecek hâl: zincir hatası kodu ya da host adı hatası. */
  reason: string | null;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
}

/** DN nesnesini karşılaştırılabilir tek bir dizeye indirger (anahtar sırası garanti değil). */
function dnString(dn: Record<string, unknown> | undefined | null): string {
  if (!dn) return "";
  return Object.keys(dn)
    .sort()
    .map((k) => `${k}=${Array.isArray(dn[k]) ? (dn[k] as unknown[]).join("+") : String(dn[k])}`)
    .join(",");
}

function firstCN(dn: Record<string, unknown> | undefined | null): string | null {
  const cn = dn?.CN;
  if (Array.isArray(cn)) return (cn[0] as string) ?? null;
  return (cn as string) ?? null;
}

/** Ham peer sertifikasından karar için gereken alanları çıkarır. Sertifika yoksa null. */
function describeCert(
  cert: PeerCertificate | null,
  authorized: boolean,
  authorizationError: unknown,
  host: string
): PeerCertInfo | null {
  if (!cert || !cert.raw || cert.raw.length === 0) return null;
  const subject = dnString(cert.subject as unknown as Record<string, unknown>);
  const issuer = dnString(cert.issuer as unknown as Record<string, unknown>);
  const hostError = authorized ? checkServerIdentity(host, cert) : undefined;
  return {
    authorized,
    subjectCN: firstCN(cert.subject as unknown as Record<string, unknown>),
    issuerCN: firstCN(cert.issuer as unknown as Record<string, unknown>),
    fingerprint: certFingerprint(cert.raw),
    selfSigned: subject !== "" && subject === issuer,
    trustedByChain: authorized && !hostError,
    reason: hostError ? hostError.message : authorized ? null : String(authorizationError ?? "UNKNOWN"),
    subject,
    issuer,
    validFrom: cert.valid_from ?? "",
    validTo: cert.valid_to ?? ""
  };
}

// Doğrulamasız OLMASI bilinçli: amaç sertifikayı OKUYUP kabul kuralına göre
// değerlendirmek ya da kullanıcıya göstermek. Bu soket üzerinden hiç uygulama
// verisi yazılmıyor (handshake biter bitmez `end()`), yani kimlik bilgisi
// gitmiyor.
function getPeerCertPem(host: string, port: number, timeoutMs = 5000, routerString?: string | null): Promise<PeerCertInfo | null> {
  if (routerString) {
    return getPeerCertPemThroughRouter(routerString, host, port, timeoutMs);
  }
  return new Promise((resolve) => {
    const socket = tlsConnect(
      {
        host,
        port,
        rejectUnauthorized: false,
        timeout: timeoutMs,
        servername: sniFor(host)
      },
      () => {
        resolve(describeCert(socket.getPeerCertificate(), socket.authorized, socket.authorizationError, host));
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
    const socket = await tlsConnectThroughRouter(routerString, host, port, { mode: "probe" }, timeoutMs);
    // authorized soketi kapatmadan ÖNCE okunmalı.
    const info = describeCert(socket.getPeerCertificate(), socket.authorized, socket.authorizationError, host);
    socket.destroy();
    return info;
  } catch {
    return null;
  }
}

// Kendinden imzalı sertifikalar eskiden ilk temasta, sorulmadan Windows
// kullanıcı "Trusted Root" deposuna kuruluyordu (`certutil -user -addstore
// Root`). O depoyu Chromium, .NET, PowerShell ve mergeTrust'lı Eclipse de
// okuyor; kendinden imzalı sertifikaların çoğu CA:TRUE taşıdığı için anahtarın
// sahibi kullanıcının makinesinde HER site adına geçerli sertifika
// üretebiliyordu. Kurulum artık yok: uygulamanın kendi bağlantılarının hepsi
// (Node `verifiedConnection`, adt-tool.ps1, Python `ntt_tls_pin`) ve SAML
// penceresi (`samlLogin.ts` `setCertificateVerifyProc`) kayıtlı pin'le
// doğruluyor, pin de yalnızca kullanıcı parmak izini onaylayınca yazılıyor.
// Daha önce kurulmuş sertifikalara dokunulmuyor (kullanıcının başka bir aracı
// onlara dayanıyor olabilir); temizliği PROJE-BILGI.md'de anlatılıyor.

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
  /** Doluysa kimlik bilgisi gönderilmeden önce kullanıcı onayı gerekiyor. */
  certPrompt: CertTrustPrompt | null;
}

export interface CertAssessment {
  notes: string[];
  trustedCertificates: Record<string, string>;
  prompt: CertTrustPrompt | null;
}

/**
 * Kimlik bilgisi gidecek uç noktanın sertifikasını, bağlanmadan ÖNCE kabul
 * kuralına göre değerlendirir. Kendisi hiçbir kimlik bilgisi göndermiyor.
 *
 *   - Kayıtlı pin eşleşiyor → hiçbir şey yapılmaz.
 *   - Zincir + host adı doğrulanıyor → pin yazılır/yenilenir. Yenileme
 *     sessiz, çünkü bu hâlde kural (a) zaten tutuyor; pin yalnızca
 *     adt-tool.ps1 ve Python sarmalayıcılarına aynı sertifikayı taşımak için.
 *   - Kayıtlı pin FARKLI ve zincir tutmuyor → `changed` sorusu, pin
 *     DEĞİŞMEZ. Sertifika yenilemesi ile MITM ağdan ayırt edilemiyor.
 *   - Pin yok ve zincir tutmuyor (kendinden imzalı, kurum içi CA ya da
 *     proxy) → `untrusted` sorusu; trust store'a hiçbir şey eklenmez, pin
 *     yalnızca kullanıcı onaylarsa (`certs:approve`) yazılır.
 */
export async function assessEndpointCertificate(
  host: string,
  port: number,
  trustedCertificates: Record<string, string>,
  routerString?: string | null
): Promise<CertAssessment> {
  const notes: string[] = [];
  const updated = { ...trustedCertificates };
  const certKey = certKeyFor(host, port);
  const stored = normalizeFingerprint(trustedCertificates[certKey]);
  const certInfo = await getPeerCertPem(host, port, undefined, routerString);

  if (!certInfo) {
    notes.push("TLS handshake başarısız oldu / sertifika alınamadı.");
    return { notes, trustedCertificates: updated, prompt: null };
  }

  const promptOf = (kind: CertTrustPrompt["kind"]): CertTrustPrompt => ({
    kind,
    key: certKey,
    host,
    port,
    fingerprint: certInfo.fingerprint,
    previousFingerprint: stored,
    subject: certInfo.subject,
    issuer: certInfo.issuer,
    validFrom: certInfo.validFrom,
    validTo: certInfo.validTo,
    selfSigned: certInfo.selfSigned,
    reason: certInfo.reason
  });

  if (stored && stored === certInfo.fingerprint) {
    notes.push("Sertifika daha önce onaylanmış (kayıtlı parmak iziyle eşleşti).");
    return { notes, trustedCertificates: updated, prompt: null };
  }

  if (certInfo.trustedByChain) {
    notes.push(
      stored
        ? "Sertifika değişmiş ama zinciri ve host adı doğrulanıyor — kayıtlı parmak izi yenilendi."
        : "Sertifika zaten güvenilir (zincir ve host adı doğrulandı)."
    );
    updated[certKey] = certInfo.fingerprint;
    return { notes, trustedCertificates: updated, prompt: null };
  }

  if (stored) {
    notes.push(
      `Sertifika, bu sistem için daha önce onaylanandan FARKLI (CN=${certInfo.subjectCN ?? "?"}, veren=${certInfo.issuerCN ?? "?"}) — ` +
        "kimlik bilgisi gönderilmeden durduruldu, kullanıcı onayı bekleniyor."
    );
    return { notes, trustedCertificates: updated, prompt: promptOf("changed") };
  }

  if (!certInfo.selfSigned) {
    // Güvenilmeyen AMA kendinden imzalı OLMAYAN sertifika: kurum içi bir CA
    // (Electron'un Node'u Windows deposunu okumuyor, kurumun kökünü bilmiyor)
    // ya da araya giren bir proxy. Köke kurmak, proxy'nin ürettiği HER sahte
    // sertifikayı güvenilir yapardı; bu yüzden yalnızca bu host:port için
    // pin, o da kullanıcı onayıyla.
    notes.push(
      `Sertifika güvenilir değil ve kendinden imzalı da değil (CN=${certInfo.subjectCN ?? "?"}, veren=${certInfo.issuerCN ?? "?"}) — ` +
        "trust store'a EKLENMEDİ; kimlik bilgisi gönderilmeden önce kullanıcı onayı bekleniyor."
    );
    return { notes, trustedCertificates: updated, prompt: promptOf("untrusted") };
  }

  // Kendinden imzalı, ilk temas: kurum içi CA'lı dalla aynı soru. İlk temasta
  // da sessiz kabul yok — aradaki biri tam bu anda kendi sertifikasını
  // sunuyorsa, pin'lenecek olan onunki olurdu.
  notes.push(
    `Sertifika güvenilir değil, kendinden imzalı (CN=${certInfo.subjectCN ?? "?"}) — ` +
      "trust store'a EKLENMEDİ; kimlik bilgisi gönderilmeden önce kullanıcının parmak izini onaylaması bekleniyor."
  );
  return { notes, trustedCertificates: updated, prompt: promptOf("untrusted") };
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

  const assessment = await assessEndpointCertificate(chosen.host, chosen.port, trustedCertificates, routerString);
  notes.push(...assessment.notes);

  return {
    url: chosen.url,
    alternateUrl: alternate?.url ?? null,
    sidVerified,
    notes,
    trustedCertificates: assessment.trustedCertificates,
    certPrompt: assessment.prompt
  };
}

export interface CredentialVerifyResult {
  ok: boolean;
  status: number | null;
  sid: string | null;
  message: string;
  // Dile/regex'e bağımlı fragile string-matching yerine yapısal bir bayrak
  // — launcher.ts'in "bu sistem SAML SSO gerektiriyor, .conn_adt'ı yine de
  // yaz ki kullanıcı login_saml_sso.py akışını takip edebilsin" kararı
  // artık İngilizce/Türkçe mesaj metnine bakmadan bu alana bakıyor.
  samlDetected?: boolean;
  /** Sertifika kabul kuralı tutmadı; istek (ve kimlik bilgisi) hiç gönderilmedi. */
  tlsRejected?: boolean;
}

/**
 * `trustedCertificates`: kayıtlı pin'ler (`host:port` → SHA-256). URL'nin
 * pin'i buradan bulunuyor; zincir + host adı doğrulanmıyorsa ve pin de
 * tutmuyorsa Authorization başlığı HİÇ yazılmadan bağlantı kesiliyor
 * (bkz. tlsPin.ts).
 */
export function verifyCredentials(
  url: string,
  username: string,
  password: string,
  client: string,
  timeoutMs = 15000,
  routerString?: string | null,
  language: AppLanguage = "tr",
  trustedCertificates: Record<string, string> = {}
): Promise<CredentialVerifyResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({ ok: false, status: null, sid: null, message: verifyMsg(language, "invalidUrl") });
  }
  const auth = encodeBasicCredentials(username, password);
  // 401 dönerse metni bu belirleyecek — ölçüm, ASCII dışı karakterli şifrenin
  // HTTP kanalında reddedildiğini gösterdi (bkz. basicAuth.ts).
  const nonAscii = nonAsciiChars(password);
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
  const pin = pinForUrl(trustedCertificates, url);

  if (routerString) {
    return verifyCredentialsThroughRouter(routerString, host, port, discoveryPath, auth, client, timeoutMs, language, nonAscii, pin);
  }

  return new Promise((resolve) => {
    const req = requestFn(
      {
        host,
        port,
        path: discoveryPath,
        method: "GET",
        timeout: timeoutMs,
        // Soket, `ClientRequest` başlıkları yazmadan önce kabul kuralından
        // geçiyor; tutmazsa `error` olayına TlsTrustError düşüyor.
        ...(isPlainHttp ? {} : { createConnection: verifiedConnection({ host, port, trust: { mode: "verify", pin }, timeoutMs }) }),
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
              resolve({ ok: false, status, sid, samlDetected: true, message: verifyMsg(language, "samlLoginDetected") });
              return;
            }
            resolve({ ok: true, status, sid, message: verifyMsg(language, "verified") });
          } else if (status === 401) {
            resolve({
              ok: false,
              status,
              sid,
              message: unauthorizedMessage(language, sid, client, nonAscii)
            });
          } else {
            const body = Buffer.concat(chunks).toString("utf-8");
            resolve({ ok: false, status, sid, message: unexpectedStatusMessage(language, status, body, contentType) });
          }
        });
      }
    );
    req.on("error", (err) =>
      resolve(
        isTlsTrustError(err)
          ? tlsRejectedResult(language, err)
          : { ok: false, status: null, sid: null, message: verifyMsg(language, "connectionError", { message: err.message }) }
      )
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: null, sid: null, message: verifyMsg(language, "timeout") });
    });
    req.end();
  });
}

/**
 * Basic Auth YERİNE oturum çereziyle doğrulama — SAML SSO akışı tamamlandıktan
 * sonra kullanılıyor (bkz. samlLogin.ts).
 *
 * `verifyCredentials`'a isteğe bağlı bir parametre olarak eklenmedi, çünkü o
 * fonksiyonun router dalı da var ve SAML'li sistemler tanım gereği cloud/BTP —
 * router'ın arkasında değiller. Ayrı ve dar tutmak, Basic Auth yolunu hiç
 * riske atmadan aynı yanıt yorumunu (SAML giriş sayfası hâlâ dönüyor mu?)
 * yeniden kullanmayı sağlıyor.
 */
export function verifyWithCookies(
  url: string,
  cookieHeader: string,
  client: string,
  timeoutMs = 15000,
  language: AppLanguage = "tr",
  trustedCertificates: Record<string, string> = {}
): Promise<CredentialVerifyResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({ ok: false, status: null, sid: null, message: verifyMsg(language, "invalidUrl") });
  }
  const discoveryPath = client.trim()
    ? `/sap/bc/adt/discovery?sap-client=${encodeURIComponent(client.trim())}`
    : "/sap/bc/adt/discovery";
  const host = parsed.hostname;
  const port = parsed.port ? Number(parsed.port) : 443;
  const pin = pinForUrl(trustedCertificates, url);

  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        host,
        port,
        path: discoveryPath,
        method: "GET",
        timeout: timeoutMs,
        // SAML oturum çerezi parola kadar değerli: aynı kabul kuralı.
        createConnection: verifiedConnection({ host, port, trust: { mode: "verify", pin }, timeoutMs }),
        headers: { Cookie: cookieHeader, Accept: "*/*" }
      },
      (res) => {
        const status = res.statusCode ?? null;
        const contentType = res.headers["content-type"];
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          if (chunks.length < 8) chunks.push(chunk);
        });
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (status === 200) {
            // Çerezle de HTML giriş sayfası dönüyorsa oturum tutmamış
            // demektir — 200 tek başına kanıt değil, SAML'in tuzağı tam olarak
            // bu (bkz. looksLikeSamlLoginPage'in başlığı).
            if (looksLikeSamlLoginPage(contentType, body)) {
              resolve({ ok: false, status, sid: null, samlDetected: true, message: verifyMsg(language, "samlLoginDetected") });
              return;
            }
            resolve({ ok: true, status, sid: null, message: verifyMsg(language, "verified") });
            return;
          }
          resolve({ ok: false, status, sid: null, message: unexpectedStatusMessage(language, status, body, contentType) });
        });
      }
    );
    req.on("error", (err) =>
      resolve(
        isTlsTrustError(err)
          ? tlsRejectedResult(language, err)
          : { ok: false, status: null, sid: null, message: verifyMsg(language, "connectionError", { message: err.message }) }
      )
    );
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
  language: AppLanguage = "tr",
  nonAscii: string[] = [],
  pin: string | null = null
): Promise<CredentialVerifyResult> {
  let socket;
  try {
    socket = await tlsConnectThroughRouter(routerString, host, port, { mode: "verify", pin }, timeoutMs);
  } catch (err) {
    if (isTlsTrustError(err)) return tlsRejectedResult(language, err);
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
        return { ok: false, status, sid, samlDetected: true, message: verifyMsg(language, "samlLoginDetected") };
      }
      return { ok: true, status, sid, message: verifyMsg(language, "verifiedRouter") };
    } else if (status === 401) {
      return {
        ok: false,
        status,
        sid,
        message: unauthorizedMessage(language, sid, client, nonAscii)
      };
    }
    return { ok: false, status, sid, message: unexpectedStatusMessage(language, status, res.body ?? "", res.headers["content-type"]) };
  } catch (err) {
    return { ok: false, status: null, sid: null, message: verifyMsg(language, "connectionErrorRouter", { message: (err as Error).message }) };
  } finally {
    socket.destroy();
  }
}
