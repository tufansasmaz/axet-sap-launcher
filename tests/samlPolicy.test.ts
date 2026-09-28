import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:tls";
import type { AddressInfo } from "node:net";
import { X509Certificate, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

// O1 + O2: SAML penceresinin sertifika ve otomatik doldurma kararları ile
// kendinden imzalı sertifikanın artık Windows Root deposuna kurulmadığı.
// Hiçbir SAP/IdP'ye gidilmiyor; sertifika tarafı yerel sahte TLS sunucusu.

vi.mock("electron", () => ({ app: { getPath: () => "", getLocale: () => "tr" } }));

// Root kurulumu `certutil` ile yapılıyordu. Kod kaldırıldı; bu sahte, yolun
// bir gün geri gelmesini de yakalıyor.
const childCalls: string[] = [];
vi.mock("node:child_process", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:child_process")>();
  const record =
    (name: string, fn: (...a: never[]) => unknown) =>
    (...args: unknown[]) => {
      childCalls.push(`${name} ${String(args[0])} ${JSON.stringify(args[1] ?? "")}`);
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
  return {
    ...real,
    execFileSync: record("execFileSync", real.execFileSync),
    execSync: record("execSync", real.execSync),
    spawnSync: record("spawnSync", real.spawnSync)
  };
});

const {
  samlCertVerdict,
  CERT_ACCEPT,
  CERT_USE_CHROMIUM,
  firstHopOrigin,
  allowedAutofillOrigins,
  autofillDecision,
  rememberIdpOrigin,
  httpsOriginOf
} = await import("../app-electron/main/samlPolicy");
const { assessEndpointCertificate } = await import("../app-electron/main/adtDiscovery");

const FIX = path.join(__dirname, "fixtures", "tls");
const read = (name: string) => readFileSync(path.join(FIX, name), "utf8");
const SELF_CERT = read("selfsigned.crt");
const LEAF_CERT = read("leaf.crt");
const fp = (pem: string) => createHash("sha256").update(new X509Certificate(pem).raw).digest("hex");
const SELF_FP = fp(SELF_CERT);

describe("samlCertVerdict (O1 — Root yerine pin)", () => {
  const base = "https://sap.example.com:44300";
  const trusted = { "sap.example.com:44300": SELF_FP };

  it("SAP host'unda onaylı pin'le eşleşen sertifika kabul", () => {
    expect(
      samlCertVerdict({ hostname: "sap.example.com", certificatePem: SELF_CERT, sapBaseUrl: base, trustedCertificates: trusted })
    ).toBe(CERT_ACCEPT);
    expect(
      samlCertVerdict({ hostname: "SAP.example.com", certificatePem: SELF_CERT, sapBaseUrl: base, trustedCertificates: trusted })
    ).toBe(CERT_ACCEPT);
  });

  it("farklı sertifika, pin yok ya da başka host → Chromium'un kararı", () => {
    expect(
      samlCertVerdict({ hostname: "sap.example.com", certificatePem: LEAF_CERT, sapBaseUrl: base, trustedCertificates: trusted })
    ).toBe(CERT_USE_CHROMIUM);
    expect(
      samlCertVerdict({ hostname: "sap.example.com", certificatePem: SELF_CERT, sapBaseUrl: base, trustedCertificates: {} })
    ).toBe(CERT_USE_CHROMIUM);
    // IdP aynı sertifikayı sunsa bile pin SAP host'una ait.
    expect(
      samlCertVerdict({ hostname: "idp.example.com", certificatePem: SELF_CERT, sapBaseUrl: base, trustedCertificates: trusted })
    ).toBe(CERT_USE_CHROMIUM);
    // Pin başka portun: bu URL için kayıtlı değil.
    expect(
      samlCertVerdict({
        hostname: "sap.example.com",
        certificatePem: SELF_CERT,
        sapBaseUrl: "https://sap.example.com",
        trustedCertificates: trusted
      })
    ).toBe(CERT_USE_CHROMIUM);
  });

  it("http SAP ya da bozuk PEM → Chromium'un kararı", () => {
    expect(
      samlCertVerdict({ hostname: "sap.example.com", certificatePem: SELF_CERT, sapBaseUrl: "http://sap.example.com:44300", trustedCertificates: trusted })
    ).toBe(CERT_USE_CHROMIUM);
    expect(
      samlCertVerdict({ hostname: "sap.example.com", certificatePem: "bozuk", sapBaseUrl: base, trustedCertificates: trusted })
    ).toBe(CERT_USE_CHROMIUM);
  });
});

describe("firstHopOrigin (SAP'nin yönlendirdiği ilk IdP)", () => {
  const sap = "https://sap.example.com:44300";

  it("ilk dış ana çerçeve gezinmesi yakalanıyor, sonrakiler değiştiremiyor", () => {
    let hop: string | null = null;
    hop = firstHopOrigin(hop, sap, "https://sap.example.com:44300/sap/bc/adt/discovery", true);
    expect(hop).toBeNull();
    hop = firstHopOrigin(hop, sap, "https://tracker.example.net/pixel", false);
    expect(hop).toBeNull();
    hop = firstHopOrigin(hop, sap, "https://login.idp.example.com/saml2?SAMLRequest=x", true);
    expect(hop).toBe("https://login.idp.example.com");
    hop = firstHopOrigin(hop, sap, "https://evil.example.org/", true);
    expect(hop).toBe("https://login.idp.example.com");
  });

  it("aynı host başka port SAP değil, dış origin sayılıyor", () => {
    expect(firstHopOrigin(null, sap, "https://sap.example.com/x", true)).toBe("https://sap.example.com");
  });

  it("http ilk hop kaydediliyor ama izin listesine giremiyor", () => {
    const hop = firstHopOrigin(null, sap, "http://idp.example.com/login", true);
    expect(hop).toBe("http://idp.example.com");
    expect(allowedAutofillOrigins(sap, null, hop)).toEqual(["https://sap.example.com:44300"]);
  });
});

describe("allowedAutofillOrigins", () => {
  const sap = "https://sap.example.com:44300";

  it("kayıtlı liste yoksa SAP + ilk hop", () => {
    expect(allowedAutofillOrigins(sap, undefined, "https://idp.example.com")).toEqual([
      "https://sap.example.com:44300",
      "https://idp.example.com"
    ]);
  });

  it("kayıtlı liste varsa YALNIZCA o (yeni ilk hop'a güvenilmiyor)", () => {
    expect(allowedAutofillOrigins(sap, ["https://idp.example.com"], "https://other.example.com")).toEqual([
      "https://sap.example.com:44300",
      "https://idp.example.com"
    ]);
  });

  it("http SAP'de liste boş", () => {
    expect(allowedAutofillOrigins("http://sap.example.com:8000", ["https://idp.example.com"], null)).toEqual([]);
  });
});

describe("autofillDecision (O2)", () => {
  const sap = "https://sap.example.com:44300";
  const allowed = allowedAutofillOrigins(sap, null, "https://idp.example.com");

  it("ana çerçeve + izinli https origin → yaz", () => {
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "https://idp.example.com/login?x=1", isMainFrame: true, allowedOrigins: allowed })).toEqual({
      allow: true
    });
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "https://sap.example.com:44300/sap/public/bc/icf/logon", isMainFrame: true, allowedOrigins: allowed }).allow).toBe(true);
  });

  it("alt çerçeve reddediliyor (izinli origin'de bile)", () => {
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "https://idp.example.com/frame", isMainFrame: false, allowedOrigins: allowed })).toMatchObject({
      allow: false,
      reason: "subframe"
    });
  });

  it("https olmayan sayfa reddediliyor", () => {
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "http://idp.example.com/login", isMainFrame: true, allowedOrigins: allowed })).toMatchObject({
      allow: false,
      reason: "not-https"
    });
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "about:blank", isMainFrame: true, allowedOrigins: allowed }).allow).toBe(false);
  });

  it("izin listesinde olmayan origin reddediliyor", () => {
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "https://evil.example.org/login", isMainFrame: true, allowedOrigins: allowed })).toEqual({
      allow: false,
      reason: "origin-not-allowed",
      origin: "https://evil.example.org"
    });
    // Alt alan adı ya da port farkı ayrı origin.
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "https://x.idp.example.com/", isMainFrame: true, allowedOrigins: allowed }).allow).toBe(false);
    expect(autofillDecision({ sapBaseUrl: sap, frameUrl: "https://idp.example.com:8443/", isMainFrame: true, allowedOrigins: allowed }).allow).toBe(false);
  });

  it("düz http SAP'de doldurma tamamen kapalı", () => {
    expect(
      autofillDecision({
        sapBaseUrl: "http://sap.example.com:8000",
        frameUrl: "https://idp.example.com/login",
        isMainFrame: true,
        allowedOrigins: ["https://idp.example.com"]
      })
    ).toMatchObject({ allow: false, reason: "sap-not-https" });
  });
});

describe("rememberIdpOrigin / httpsOriginOf", () => {
  it("en yeni başta, tekrar yok, http giremiyor, en fazla 5", () => {
    expect(rememberIdpOrigin(["https://a.example.com"], "https://b.example.com/x")).toEqual([
      "https://b.example.com",
      "https://a.example.com"
    ]);
    expect(rememberIdpOrigin(["https://a.example.com"], "https://A.example.com")).toEqual(["https://a.example.com"]);
    expect(rememberIdpOrigin(["http://a.example.com", "javascript:alert(1)"], null)).toEqual([]);
    const many = ["1", "2", "3", "4", "5", "6"].map((n) => `https://h${n}.example.com`);
    expect(rememberIdpOrigin(many, "https://new.example.com")).toHaveLength(5);
    expect(httpsOriginOf("https://Idp.Example.com:443/a")).toBe("https://idp.example.com");
  });
});

describe("assessEndpointCertificate — Root deposuna kurulum yok (O1)", () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = createServer({ cert: SELF_CERT, key: read("selfsigned.key") }, (s) => s.end());
    server.on("tlsClientError", () => {});
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("ilk temasta kendinden imzalı sertifika: onay sorusu, pin yazılmıyor, certutil yok", async () => {
    childCalls.length = 0;
    const a = await assessEndpointCertificate("127.0.0.1", port, {});
    expect(a.prompt?.kind).toBe("untrusted");
    expect(a.prompt?.fingerprint).toBe(SELF_FP);
    expect(a.prompt?.selfSigned).toBe(true);
    expect(a.trustedCertificates).toEqual({});
    expect(childCalls.filter((c) => /certutil|addstore/i.test(c))).toEqual([]);
    expect(a.notes.join(" ")).toContain("EKLENMEDİ");
  });

  it("kullanıcı onayından sonra (pin kayıtlı) soru yok", async () => {
    const a = await assessEndpointCertificate("127.0.0.1", port, { [`127.0.0.1:${port}`]: SELF_FP });
    expect(a.prompt).toBeNull();
  });
});
