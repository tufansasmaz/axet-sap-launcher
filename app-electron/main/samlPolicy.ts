import { X509Certificate } from "node:crypto";
import { certFingerprint, pinForUrl } from "./tlsPin";

// ============================================================================
// SAML penceresinin iki güvenlik kararı, Electron'a dokunmadan test
// edilebilsin diye burada saf fonksiyon olarak duruyor (bkz. samlLogin.ts,
// tests/samlPolicy.test.ts):
//
//   1. Sertifika: kendinden imzalı sertifikalı bir SAP sistemi artık Windows
//      Root deposuna kurulmuyor (bkz. adtDiscovery.ts). Chromium penceresi o
//      sertifikayı ancak kullanıcının onayladığı pin'le eşleşiyorsa kabul
//      ediyor.
//   2. Otomatik doldurma: parola yalnızca ana çerçeveye ve yalnızca izinli
//      bir https origin'ine yazılıyor. Eskiden sayfadaki HER çerçeveye (üçüncü
//      taraf reklam/analitik iframe'leri dahil) enjekte ediliyordu.
// ============================================================================

/** Chromium'un `setCertificateVerifyProc` sonuç kodları. */
export const CERT_ACCEPT = 0;
export const CERT_USE_CHROMIUM = -3;

export interface SamlCertInput {
  /** Chromium'un verdiği host adı — port YOK. */
  hostname: string;
  /** Sunucu sertifikası, PEM (`Electron.Certificate.data`). */
  certificatePem: string;
  sapBaseUrl: string;
  trustedCertificates?: Record<string, string> | null;
}

/**
 * SAP host'u için kullanıcının onayladığı pin'le eşleşen sertifikayı kabul
 * eder; geri kalan her şeyde Chromium'un kendi kararı geçerli. Reddetmek (-2)
 * yerine -3: zincirle doğrulanan her sertifika (IdP'ler, kurumsal CA'lı SAP)
 * eskisi gibi çalışmalı, pin yalnızca EK bir kabul yolu.
 *
 * Chromium port vermediği için eşleşme host adı + parmak izi üzerinden:
 * aynı host'un başka bir portu AYNI sertifikayı sunuyorsa o da kabul
 * ediliyor. Kabul edilen şey kullanıcının onayladığı sertifikanın ta
 * kendisi olduğu için bu bir gevşeme değil.
 */
export function samlCertVerdict(input: SamlCertInput): number {
  let sapHost: string;
  try {
    sapHost = new URL(input.sapBaseUrl).hostname.toLowerCase();
  } catch {
    return CERT_USE_CHROMIUM;
  }
  if (input.hostname.toLowerCase() !== sapHost) return CERT_USE_CHROMIUM;
  const pin = pinForUrl(input.trustedCertificates, input.sapBaseUrl);
  if (!pin) return CERT_USE_CHROMIUM;
  let fingerprint: string;
  try {
    fingerprint = certFingerprint(new X509Certificate(input.certificatePem).raw);
  } catch {
    return CERT_USE_CHROMIUM;
  }
  return fingerprint === pin ? CERT_ACCEPT : CERT_USE_CHROMIUM;
}

/** Yalnızca https origin'i; başka her şeyde null. Karşılaştırma bu biçimle yapılıyor. */
export function httpsOriginOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.origin.toLowerCase() : null;
  } catch {
    return null;
  }
}

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.origin === "null" ? null : parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * SAP'nin kullanıcıyı gönderdiği İLK dış origin'i yakalar (302 `Location`,
 * ya da SAML HTTP-POST bağlamasında kendiliğinden gönderilen form). Yalnızca
 * ana çerçevenin gezinmeleri sayılıyor: iframe'ler SAP'nin yönlendirmesi
 * değil, sayfanın gömdüğü şeyler.
 *
 * Döndürdüğü değer: yakalanan origin (https değilse de kaydediliyor; karar
 * fonksiyonu https olmayanı zaten reddediyor — ama "ilk hop" yeri bir kez
 * dolunca sonraki bir https sayfası onun yerine geçemesin diye).
 */
export function firstHopOrigin(
  current: string | null,
  sapBaseUrl: string,
  navigationUrl: string,
  isMainFrame: boolean
): string | null {
  if (current !== null || !isMainFrame) return current;
  const sap = originOf(sapBaseUrl);
  const target = originOf(navigationUrl);
  if (!sap || !target || target === sap) return current;
  return target;
}

/**
 * Otomatik doldurmanın yazabileceği origin'ler. SAP'nin kendisi her zaman
 * içeride (ICF'in kendi giriş formu; kimlik bilgisi zaten oraya gidiyor).
 * Bu sistem için daha önce başarılı bir girişte kaydedilmiş IdP origin'leri
 * varsa YALNIZCA onlar; yoksa bu akışta SAP'nin yönlendirdiği ilk origin.
 * Kayıtlı liste varken yeni bir ilk hop'a güvenilmiyor: IdP değişmişse
 * kullanıcı bir kez elle giriyor, başarılı giriş yeni origin'i listeye ekliyor.
 */
export function allowedAutofillOrigins(
  sapBaseUrl: string,
  knownIdpOrigins: readonly string[] | null | undefined,
  firstHop: string | null
): string[] {
  const out = new Set<string>();
  const sap = httpsOriginOf(sapBaseUrl);
  if (!sap) return [];
  out.add(sap);
  const known = (knownIdpOrigins ?? []).map((o) => httpsOriginOf(o)).filter((o): o is string => !!o);
  if (known.length > 0) {
    for (const o of known) out.add(o);
  } else {
    const hop = httpsOriginOf(firstHop);
    if (hop) out.add(hop);
  }
  return [...out];
}

export interface AutofillDecisionInput {
  sapBaseUrl: string;
  frameUrl: string;
  isMainFrame: boolean;
  allowedOrigins: readonly string[];
}

export type AutofillDecision =
  | { allow: true }
  | { allow: false; reason: "sap-not-https" | "subframe" | "not-https" | "origin-not-allowed"; origin: string | null };

/** Parolanın bu çerçeveye yazılıp yazılamayacağı. Sıra önemli: en genel ret önce. */
export function autofillDecision(input: AutofillDecisionInput): AutofillDecision {
  // Düz http SAP'de doldurma yok: akışın ilk halkası zaten açık metin,
  // yönlendirmeyi değiştiren biri IdP'yi de seçebilir.
  if (!httpsOriginOf(input.sapBaseUrl)) return { allow: false, reason: "sap-not-https", origin: null };
  if (!input.isMainFrame) return { allow: false, reason: "subframe", origin: originOf(input.frameUrl) };
  const origin = httpsOriginOf(input.frameUrl);
  if (!origin) return { allow: false, reason: "not-https", origin: originOf(input.frameUrl) };
  if (!input.allowedOrigins.includes(origin)) return { allow: false, reason: "origin-not-allowed", origin };
  return { allow: true };
}

/** Kayıtlı IdP listesine yeni origin ekler; en yeni başta, en fazla `max` tane. */
export function rememberIdpOrigin(existing: readonly string[] | null | undefined, origin: string | null, max = 5): string[] {
  const clean = (existing ?? []).map((o) => httpsOriginOf(o)).filter((o): o is string => !!o);
  const hop = httpsOriginOf(origin);
  if (!hop) return clean.slice(0, max);
  return [hop, ...clean.filter((o) => o !== hop)].slice(0, max);
}
