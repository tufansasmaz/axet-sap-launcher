import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server, type TLSSocket } from "node:tls";
import { connect as netConnect, type AddressInfo } from "node:net";
import { request as httpsRequest } from "node:https";
import { X509Certificate, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

// adtDiscovery → sapRouter → i18n zinciri `electron`'u içe aktarıyor; testte
// yalnızca uygulama yolunu soran kısmı gerekiyor.
vi.mock("electron", () => ({ app: { getPath: () => "", getLocale: () => "tr" } }));

const {
  openTls,
  evaluatePeer,
  verifiedConnection,
  normalizeFingerprint,
  pinForUrl,
  TlsTrustError
} = await import("../app-electron/main/tlsPin");
const { verifyCredentials } = await import("../app-electron/main/adtDiscovery");

// Sahte sunucular YEREL ve yalnızca bu test için: sabit test sertifikaları
// (tests/fixtures/tls — CA'nın özel anahtarı üretimden sonra silindi).
//   selfsigned: CN=localhost, SAN localhost + 127.0.0.1, kendinden imzalı
//   leaf:       CN=localhost, SAN YALNIZCA DNS:localhost, "NTT Studio Test CA" imzalı
const FIX = path.join(__dirname, "fixtures", "tls");
const read = (name: string) => readFileSync(path.join(FIX, name), "utf8");
const SELF_CERT = read("selfsigned.crt");
const LEAF_CERT = read("leaf.crt");
const CA_CERT = read("ca.crt");

const fingerprintOf = (pem: string) => createHash("sha256").update(new X509Certificate(pem).raw).digest("hex");
const SELF_FP = fingerprintOf(SELF_CERT);
const LEAF_FP = fingerprintOf(LEAF_CERT);
const WRONG_FP = "00".repeat(32);

interface FakeServer {
  server: Server;
  port: number;
  /** Her bağlantıda sunucunun ALDIĞI uygulama verisi. */
  received: string[];
}

// Uygulama verisi gelirse kaydediyor ve basit bir HTTP 200 dönüyor. Kimlik
// bilgisinin GİTMEDİĞİNİ kanıtlamanın yolu bu kayıt: reddedilen her
// bağlantıda sunucu tek bayt görmemeli.
function startFakeServer(certFile: string, keyFile: string): Promise<FakeServer> {
  const received: string[] = [];
  const server = createServer({ cert: read(certFile), key: read(keyFile) }, (socket: TLSSocket) => {
    let buf = "";
    const idx = received.push("") - 1;
    socket.on("data", (chunk) => {
      buf += chunk.toString("latin1");
      received[idx] = buf;
      if (buf.includes("\r\n\r\n")) {
        socket.end("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok");
      }
    });
    socket.on("error", () => {});
  });
  server.on("tlsClientError", () => {});
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: (server.address() as AddressInfo).port, received });
    });
  });
}

const settle = () => new Promise((r) => setTimeout(r, 150));
const totalBytes = (s: FakeServer) => s.received.reduce((n, x) => n + x.length, 0);

let selfSrv: FakeServer;
let leafSrv: FakeServer;

beforeAll(async () => {
  selfSrv = await startFakeServer("selfsigned.crt", "selfsigned.key");
  leafSrv = await startFakeServer("leaf.crt", "leaf.key");
});

afterAll(async () => {
  await new Promise((r) => selfSrv.server.close(r));
  await new Promise((r) => leafSrv.server.close(r));
});

async function expectTrustError(p: Promise<unknown>, code: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e
  );
  expect(err).toBeInstanceOf(TlsTrustError);
  expect((err as InstanceType<typeof TlsTrustError>).code).toBe(code);
  return err as InstanceType<typeof TlsTrustError>;
}

describe("normalizeFingerprint / pinForUrl", () => {
  it("iki noktalı büyük harfli parmak izini aynı pin sayar", () => {
    const colon = (SELF_FP.match(/.{2}/g) ?? []).join(":").toUpperCase();
    expect(normalizeFingerprint(colon)).toBe(SELF_FP);
    expect(normalizeFingerprint("abcd")).toBeNull();
    expect(normalizeFingerprint("")).toBeNull();
  });

  it("pin'i host:port'tan bulur, https dışında pin yok", () => {
    const trusted = { "sap.example:44300": SELF_FP, "sap.example:443": LEAF_FP };
    expect(pinForUrl(trusted, "https://sap.example:44300/sap/bc/adt")).toBe(SELF_FP);
    expect(pinForUrl(trusted, "https://sap.example/sap/bc/adt")).toBe(LEAF_FP);
    expect(pinForUrl(trusted, "http://sap.example:44300")).toBeNull();
    expect(pinForUrl(trusted, "https://other:44300")).toBeNull();
  });
});

describe("openTls kabul kuralı", () => {
  it("(b) pin eşleşiyor → bağlanır", async () => {
    const s = await openTls({ host: "127.0.0.1", port: selfSrv.port, trust: { mode: "verify", pin: SELF_FP } });
    expect(s.authorized).toBe(false); // zincir tutmuyor, kabul pin'den
    s.destroy();
  });

  it("pin eşleşmiyor → TLS_PIN_MISMATCH, sunucu tek bayt almıyor", async () => {
    const before = totalBytes(selfSrv);
    const err = await expectTrustError(
      openTls({ host: "127.0.0.1", port: selfSrv.port, trust: { mode: "verify", pin: WRONG_FP } }),
      "TLS_PIN_MISMATCH"
    );
    expect(err.fingerprint).toBe(SELF_FP);
    await settle();
    expect(totalBytes(selfSrv)).toBe(before);
  });

  it("kendinden imzalı + pin yok → TLS_UNTRUSTED", async () => {
    const err = await expectTrustError(
      openTls({ host: "localhost", port: selfSrv.port, trust: { mode: "verify", pin: null } }),
      "TLS_UNTRUSTED"
    );
    expect(err.chainError).toBeTruthy();
  });

  it("(a) zincir + host adı geçerli → pin'siz bağlanır", async () => {
    const s = await openTls({ host: "localhost", port: leafSrv.port, trust: { mode: "verify", pin: null }, ca: CA_CERT });
    expect(s.authorized).toBe(true);
    s.destroy();
  });

  it("zincir geçerli ama host adı tutmuyor → TLS_UNTRUSTED", async () => {
    // leaf'in SAN'ında 127.0.0.1 yok. Ölçüm: Node `rejectUnauthorized: false`
    // iken de host adını denetleyip `authorized`'ı false yapıyor.
    const err = await expectTrustError(
      openTls({ host: "127.0.0.1", port: leafSrv.port, trust: { mode: "verify", pin: null }, ca: CA_CERT }),
      "TLS_UNTRUSTED"
    );
    expect(err.chainError).toBe("ERR_TLS_CERT_ALTNAME_INVALID");
  });

  it("evaluatePeer host adını Node'a bırakmadan kendisi de denetliyor", async () => {
    // Node'un kendi denetimi başka bir adla yapılmış olsa (ör. SAProuter
    // üzerinden hazır soket) bile: zincir "geçerli" görünen bir soket, host
    // adı tutmuyorsa kabul edilmemeli.
    const real = await openTls({ host: "localhost", port: leafSrv.port, trust: { mode: "probe" }, ca: CA_CERT });
    const cert = real.getPeerCertificate(false);
    real.destroy();
    const stub = { authorized: true, authorizationError: null, getPeerCertificate: () => cert } as unknown as TLSSocket;
    const bad = evaluatePeer(stub, "evil.example", null);
    expect(bad.ok).toBe(false);
    expect(bad.failure).toBe("untrusted");
    expect(bad.hostError).toMatch(/evil\.example/);
    expect(evaluatePeer(stub, "localhost", null).via).toBe("chain");
    expect(evaluatePeer(stub, "evil.example", LEAF_FP).via).toBe("pin");
  });

  it("host adı tutmuyor ama kullanıcı o sertifikayı sabitlemiş → bağlanır", async () => {
    const s = await openTls({ host: "127.0.0.1", port: leafSrv.port, trust: { mode: "verify", pin: LEAF_FP }, ca: CA_CERT });
    s.destroy();
  });

  it("probe modu doğrulamaz (kimlik bilgisi gitmeyen ilk temas)", async () => {
    const s = await openTls({ host: "127.0.0.1", port: selfSrv.port, trust: { mode: "probe" } });
    s.destroy();
  });

  it("hazır soket üzerinde (SAProuter yolu) de aynı kural", async () => {
    const raw1 = netConnect(selfSrv.port, "127.0.0.1");
    await expectTrustError(
      openTls({ host: "sap.internal", port: 44300, socket: raw1, trust: { mode: "verify", pin: WRONG_FP } }),
      "TLS_PIN_MISMATCH"
    );
    const raw2 = netConnect(selfSrv.port, "127.0.0.1");
    const s = await openTls({ host: "sap.internal", port: 44300, socket: raw2, trust: { mode: "verify", pin: SELF_FP } });
    s.destroy();
  });
});

describe("https.request + verifiedConnection: kimlik bilgisi yalnızca kabulden sonra", () => {
  const send = (port: number, pin: string | null) =>
    new Promise<number>((resolve, reject) => {
      const req = httpsRequest({
        host: "127.0.0.1",
        port,
        path: "/sap/bc/adt/discovery",
        headers: { Authorization: "Basic dGVzdDp0ZXN0" },
        createConnection: verifiedConnection({ host: "127.0.0.1", port, trust: { mode: "verify", pin } })
      });
      req.on("response", (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode ?? 0));
      });
      req.on("error", reject);
      req.end();
    });

  it("pin eşleşmiyor → istek hata verir, sunucu başlık almaz", async () => {
    const before = totalBytes(selfSrv);
    await expectTrustError(send(selfSrv.port, WRONG_FP), "TLS_PIN_MISMATCH");
    await settle();
    expect(totalBytes(selfSrv)).toBe(before);
  });

  it("pin eşleşiyor → Authorization sunucuya ulaşır", async () => {
    const status = await send(selfSrv.port, SELF_FP);
    expect(status).toBe(200);
    expect(selfSrv.received.some((r) => r.includes("Authorization: Basic dGVzdDp0ZXN0"))).toBe(true);
  });
});

describe("verifyCredentials uçtan uca (sahte yerel sunucu)", () => {
  const url = () => `https://127.0.0.1:${selfSrv.port}`;

  it("pin yok + kendinden imzalı → tlsRejected, sunucu tek bayt almaz", async () => {
    const before = totalBytes(selfSrv);
    const r = await verifyCredentials(url(), "USER", "secret", "100", 5000, undefined, "en", {});
    expect(r.ok).toBe(false);
    expect(r.tlsRejected).toBe(true);
    await settle();
    expect(totalBytes(selfSrv)).toBe(before);
  });

  it("pin değişmiş → tlsRejected, sunucu tek bayt almaz", async () => {
    const before = totalBytes(selfSrv);
    const r = await verifyCredentials(url(), "USER", "secret", "100", 5000, undefined, "en", {
      [`127.0.0.1:${selfSrv.port}`]: WRONG_FP
    });
    expect(r.tlsRejected).toBe(true);
    await settle();
    expect(totalBytes(selfSrv)).toBe(before);
  });

  it("pin eşleşiyor → istek gider (Authorization sunucuda)", async () => {
    const before = selfSrv.received.length;
    const r = await verifyCredentials(url(), "USER", "secret", "100", 5000, undefined, "en", {
      [`127.0.0.1:${selfSrv.port}`]: SELF_FP
    });
    expect(r.tlsRejected).toBeFalsy();
    const fresh = selfSrv.received.slice(before);
    expect(fresh.some((x) => /authorization: basic /i.test(x))).toBe(true);
  });
});
