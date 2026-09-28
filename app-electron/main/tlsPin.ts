import { connect as tlsConnect, checkServerIdentity, type PeerCertificate, type TLSSocket } from "node:tls";
import type { Duplex } from "node:stream";
import { createHash } from "node:crypto";

/**
 * Kimlik bilgisi taşıyan TLS bağlantılarının TEK kabul kuralı.
 *
 * Bağlantı yalnızca şu iki hâlden birinde kullanılır:
 *   (a) zincir Node'un güven deposuna göre doğrulanıyor VE host adı eşleşiyor,
 *   (b) sunucu sertifikasının SHA-256 parmak izi (DER üzerinden) o sistem için
 *       kayıtlı pin'e (`trustedCertificates[host:port]`) eşit.
 *
 * Neden `rejectUnauthorized: true` değil de elle: SAP sistemlerinin çoğu kurum
 * içi CA'lı ya da kendinden imzalı sertifika kullanıyor. Electron'un Node'u
 * Windows deposunu değil, kendi gömülü Mozilla köklerini okuyor; yani (a) bu
 * sistemlerde neredeyse hiç tutmuyor ve (b) şart. `rejectUnauthorized: true`
 * (b)'yi imkânsız kılardı; Node da `checkServerIdentity`'yi yalnızca zincir
 * doğrulandığında çağırıyor. İkisini birden `secureConnect`'te, soket henüz
 * tek bayt uygulama verisi taşımamışken kontrol etmenin tek yolu bu.
 *
 * Bu modül bilinçli olarak Electron'a ve i18n'e bağımlı değil — vitest'te
 * yerel sahte TLS sunucusuyla doğrudan sınanıyor (tests/tlsPin.test.ts).
 */

// TLS SNI'ya IP yazılamaz (RFC 6066). Node bunu DEP0123 ile uyarıyor ve
// ileride yok sayacağını söylüyor. Dört ayrı TLS/HTTPS çağrısı (sapRouter'daki
// `tlsConnectThroughRouter` + `adtDiscovery.ts`'teki üç istek) bunu ayrı ayrı
// düşünmek zorundaydı ve yalnızca ikisi düşünmüştü; ötekiler IP'li bir host'ta
// (SAP Logon kayıtlarında sık) uyarı üretiyordu. Artık tek yerden.
// IPv6 de kapsanıyor — iki nokta içeren bir host adı zaten geçerli bir DNS
// adı değil. (sapRouter.ts eski adıyla yeniden dışa veriyor.)
export function sniFor(host: string): string | undefined {
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  return isIp ? undefined : host;
}

/**
 * Parmak izini karşılaştırılabilir biçime indirger: yalnızca onaltılık
 * karakterler, küçük harf. Kullanıcı ya da eski bir sürüm pin'i
 * "AB:CD:..." biçiminde yazmış olabilir; biçim farkı yüzünden meşru bir pin'in
 * reddedilmesi, kullanıcıyı "her seferinde onayla" alışkanlığına iter.
 * SHA-256 olmayan (64 hane tutmayan) değer pin sayılmaz.
 */
export function normalizeFingerprint(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = value.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  return hex.length === 64 ? hex : null;
}

export function certFingerprint(raw: Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** `trustedCertificates`'ın anahtarı — keşifte yazılanla birebir aynı biçim. */
export function certKeyFor(host: string, port: number): string {
  return `${host}:${port}`;
}

/** URL için kayıtlı pin. Yalnızca https; port yazılmamışsa 443. */
export function pinForUrl(trusted: Record<string, string> | null | undefined, url: string): string | null {
  if (!trusted) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const port = parsed.port ? Number(parsed.port) : 443;
  return normalizeFingerprint(trusted[certKeyFor(parsed.hostname, port)]);
}

/**
 * `verify`: kimlik bilgisi gidecek — kabul kuralı uygulanır.
 * `probe`: yalnızca sertifika/realm okuma — hiçbir kimlik bilgisi GİTMEYEN
 * ilk temas yoklaması. Doğrulamasız kalması bilinçli: kullanıcıya "bu sunucu
 * şu sertifikayı gösteriyor, güveniyor musun?" diye sorabilmek için önce
 * sertifikayı görmek gerekiyor.
 */
export type TlsTrustPolicy = { mode: "verify"; pin: string | null } | { mode: "probe" };

export type TlsTrustFailure = "untrusted" | "pinMismatch" | "noCertificate";

export interface PeerEvaluation {
  ok: boolean;
  via: "chain" | "pin" | null;
  failure: TlsTrustFailure | null;
  fingerprint: string | null;
  /** Zincir hatası (Node'un `authorizationError`'ı) — ör. SELF_SIGNED_CERT_IN_CHAIN. */
  chainError: string | null;
  /** Zincir tuttu ama host adı tutmadıysa onun metni. */
  hostError: string | null;
}

/**
 * Handshake bitmiş bir soketi kabul kuralına göre değerlendirir. Soketin
 * üzerinden henüz uygulama verisi gitmemiş olmalı — bu fonksiyon hiçbir şey
 * yazmıyor, yalnızca bakıyor.
 */
export function evaluatePeer(socket: TLSSocket, host: string, pin: string | null): PeerEvaluation {
  const cert = socket.getPeerCertificate(false) as PeerCertificate | null;
  if (!cert || !cert.raw || cert.raw.length === 0) {
    return { ok: false, via: null, failure: "noCertificate", fingerprint: null, chainError: null, hostError: null };
  }
  const fingerprint = certFingerprint(cert.raw);
  const chainError = socket.authorized ? null : String(socket.authorizationError ?? "UNKNOWN");
  let hostError: string | null = null;
  if (socket.authorized) {
    // Node host adını kendisi de denetliyor ve tutmazsa `authorized`'ı false,
    // `authorizationError`'ı ERR_TLS_CERT_ALTNAME_INVALID yapıyor (ölçüldü,
    // tests/tlsPin.test.ts). Yine de burada AÇIKÇA denetleniyor: sokete
    // `servername` verilmediğinde (IP'li host, SAProuter üzerinden hazır soket)
    // Node'un hangi adı denetlediği bizim `host`'umuz olmayabilir; geçerli
    // sertifikası olan başka bir sitenin kabul edilmemesi ona bırakılmıyor.
    const err = checkServerIdentity(host, cert);
    hostError = err ? err.message : null;
  }
  if (socket.authorized && !hostError) {
    return { ok: true, via: "chain", failure: null, fingerprint, chainError, hostError };
  }
  const expected = normalizeFingerprint(pin);
  if (expected && expected === fingerprint) {
    // Pin, kullanıcının bu sisteme ait olduğunu onayladığı sertifikanın
    // kendisi; host adı ve zincir o onayın içinde zaten var. IP ile bağlanılan
    // (SAP Logon kayıtlarında sık) ve SAN'ında IP olmayan sertifikalar ancak
    // bu yoldan geçebiliyor.
    return { ok: true, via: "pin", failure: null, fingerprint, chainError, hostError };
  }
  return {
    ok: false,
    via: null,
    failure: expected ? "pinMismatch" : "untrusted",
    fingerprint,
    chainError,
    hostError
  };
}

export type TlsTrustErrorCode = "TLS_UNTRUSTED" | "TLS_PIN_MISMATCH" | "TLS_NO_CERT";

/** Kabul kuralı tutmadı; soket kimlik bilgisi gönderilmeden kapatıldı. */
export class TlsTrustError extends Error {
  readonly code: TlsTrustErrorCode;
  readonly host: string;
  readonly port: number;
  readonly fingerprint: string | null;
  readonly chainError: string | null;
  readonly hostError: string | null;

  constructor(host: string, port: number, evaluation: PeerEvaluation) {
    const code: TlsTrustErrorCode =
      evaluation.failure === "pinMismatch" ? "TLS_PIN_MISMATCH" : evaluation.failure === "noCertificate" ? "TLS_NO_CERT" : "TLS_UNTRUSTED";
    const detail = evaluation.hostError ?? evaluation.chainError ?? code;
    super(`${code} ${host}:${port} (${detail})`);
    this.name = "TlsTrustError";
    this.code = code;
    this.host = host;
    this.port = port;
    this.fingerprint = evaluation.fingerprint;
    this.chainError = evaluation.chainError;
    this.hostError = evaluation.hostError;
  }
}

export function isTlsTrustError(err: unknown): err is TlsTrustError {
  return err instanceof TlsTrustError;
}

export interface OpenTlsOptions {
  host: string;
  port: number;
  trust: TlsTrustPolicy;
  timeoutMs?: number;
  /** SAProuter üzerinden açılmış ham soket; verilirse onun üzerinde TLS kurulur. */
  socket?: Duplex;
  /**
   * Ek güvenilir kökler. YALNIZCA testler için: sahte CA'yı Node'un deposuna
   * eklemeden (a) yolunu sınamanın yolu. Üretim kodu geçmiyor — geçerse
   * Node'un varsayılan kökleri tamamen devre dışı kalır.
   */
  ca?: string | Buffer | Array<string | Buffer>;
  timeoutMessage?: string;
}

/**
 * TLS bağlantısı açar; `verify` politikasında kabul kuralı tutmazsa soketi
 * uygulama verisi yazılmadan yok eder ve `TlsTrustError` ile reddeder.
 */
export function openTls(options: OpenTlsOptions): Promise<TLSSocket> {
  const timeoutMs = options.timeoutMs ?? 8000;
  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = tlsConnect({
      host: options.socket ? undefined : options.host,
      port: options.socket ? undefined : options.port,
      socket: options.socket,
      servername: sniFor(options.host),
      rejectUnauthorized: false,
      ca: options.ca,
      timeout: timeoutMs
    });
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };
    socket.once("secureConnect", () => {
      if (settled) return;
      if (options.trust.mode === "verify") {
        const evaluation = evaluatePeer(socket, options.host, options.trust.pin);
        if (!evaluation.ok) {
          fail(new TlsTrustError(options.host, options.port, evaluation));
          return;
        }
      }
      settled = true;
      // Bağlantı kurulduktan sonraki boşta kalma denetimi çağıranın işi
      // (ör. http isteğinin kendi `timeout`'u); kurulum zaman aşımı burada
      // bitiyor, yoksa uzun bir yanıt okunurken soket bu sayaçla kesilirdi.
      socket.setTimeout(0);
      resolve(socket);
    });
    socket.once("error", (err) => fail(err));
    socket.once("timeout", () => fail(new Error(options.timeoutMessage ?? "TLS handshake timeout")));
  });
}

/**
 * `http(s).request`'in `createConnection` seçeneğine verilecek fonksiyon.
 *
 * `ClientRequest`, soket `oncreate` ile teslim edilene kadar başlıkları
 * (Authorization/Cookie) belleğinde tutuyor; soket ancak kabul kuralı
 * tuttuktan sonra teslim edildiği için kimlik bilgisi doğrulanmamış bir
 * bağlantıya hiç yazılmıyor. Kural tutmazsa hata isteğin `error` olayına
 * düşüyor ve çağıranın mevcut hata yolu aynen çalışıyor.
 */
export function verifiedConnection(options: OpenTlsOptions) {
  return (_opts: unknown, oncreate: (err: Error | null, socket: Duplex) => void): undefined => {
    openTls(options).then(
      (socket) => oncreate(null, socket),
      // @types/node soketi zorunlu yazıyor, ama Node'un kendisi hata
      // durumunda soketi hiç okumuyor (_http_client.js: err varsa yalnızca
      // 'error' yayınlanıyor). Tip için boş değer geçiliyor.
      (err: Error) => oncreate(err, undefined as unknown as Duplex)
    );
    return undefined;
  };
}
