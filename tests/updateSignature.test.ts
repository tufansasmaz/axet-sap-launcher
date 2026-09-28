// Güncelleme imzası: uygulama tarafı doğrulayıcı (updateSignature.ts) ve
// derleme kancası (build/signUpdate.cjs) birlikte.
//
// Kapatılan açık: kurulum exe'si Authenticode ile imzalanmıyor ve
// `latest.yml`'deki SHA-512 bir imza değil — GitHub sürümüne yazabilen biri
// exe'yi ve `latest.yml`'i birlikte değiştirirse uygulama sahte kurulumu
// çalıştırıyordu. Artık yalnızca depo dışındaki özel anahtarla üretilmiş bir
// `.sig` kabul ediliyor.
//
// Gerçek özel anahtar testte KULLANILMIYOR; her koşuda geçici bir çift
// üretiliyor. Kancayla doğrulayıcının manifest biçiminde anlaşması, kancanın
// ürettiği `.sig`'in doğrulayıcıdan geçmesiyle sınanıyor — biçimler ayrışırsa
// bu test kırılıyor.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, createPublicKey, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  SIGNATURE_MAX_BYTES,
  UPDATE_PUBLIC_KEY_PEM,
  buildUpdateManifest,
  isSafeAssetName,
  pickInstallerFile,
  readCappedText,
  sha512FileBase64,
  signatureUrl,
  verifyDownloadedUpdate,
  verifyUpdateSignature
} from "../app-electron/main/updateSignature";

interface SignHook {
  (buildResult: unknown, options?: { env?: Record<string, string | undefined>; argv?: string[]; pkg?: unknown }): Promise<string[]>;
  buildUpdateManifest: (version: string, fileName: string, sha512: string) => string;
  publishedAssetName: (filePath: string) => string;
  isReleaseBuild: (argv: string[], env: Record<string, string | undefined>) => boolean;
}

const hook = createRequire(import.meta.url)("../build/signUpdate.cjs") as SignHook;

let privateKey: KeyObject;
let publicKeyPem: string;
let privateKeyPath: string;
const tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ntt-update-sig-"));
  tempDirs.push(dir);
  return dir;
}

beforeAll(() => {
  const pair = generateKeyPairSync("ed25519");
  privateKey = pair.privateKey;
  publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  privateKeyPath = path.join(tempDir(), "test-key.pem");
  writeFileSync(privateKeyPath, pair.privateKey.export({ type: "pkcs8", format: "pem" }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

const VERSION = "1.7.0";
const FILE = "NTT-Studio-Setup-1.7.0.exe";
const SHA = createHash("sha512").update("sahte kurulum").digest("base64");

function signManifest(version = VERSION, fileName = FILE, sha = SHA): string {
  return sign(null, Buffer.from(buildUpdateManifest(version, fileName, sha), "utf8"), privateKey).toString("base64");
}

function check(overrides: Partial<Parameters<typeof verifyUpdateSignature>[0]>): boolean {
  return verifyUpdateSignature({
    version: VERSION,
    fileName: FILE,
    sha512Base64: SHA,
    signatureText: signManifest(),
    publicKeyPem,
    ...overrides
  });
}

describe("verifyUpdateSignature", () => {
  it("dogru imza geciyor (sondaki satir sonu dahil)", () => {
    expect(check({})).toBe(true);
    expect(check({ signatureText: signManifest() + "\n" })).toBe(true);
  });

  it("version, fileName ya da sha512 degisince reddediliyor", () => {
    expect(check({ version: "1.7.1" })).toBe(false);
    expect(check({ fileName: "NTT-Studio-Setup-1.7.0.exe.bak" })).toBe(false);
    expect(check({ sha512Base64: createHash("sha512").update("baska").digest("base64") })).toBe(false);
  });

  it("imzanin tek bayti degisince reddediliyor", () => {
    const bytes = Buffer.from(signManifest(), "base64");
    bytes[10] ^= 0x01;
    expect(check({ signatureText: bytes.toString("base64") })).toBe(false);
  });

  it("baska anahtarla atilmis imza reddediliyor", () => {
    const other = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }).toString();
    expect(check({ publicKeyPem: other })).toBe(false);
  });

  it("bozuk base64, bos ve yanlis uzunlukta imza reddediliyor", () => {
    expect(check({ signatureText: "" })).toBe(false);
    expect(check({ signatureText: "   \n" })).toBe(false);
    expect(check({ signatureText: "!!!bu-base64-degil!!!" })).toBe(false);
    // Buffer.from bozuk karakteri sessizce atlar; katı kontrol olmasa bu
    // "neredeyse geçerli" imza verify'a giderdi.
    expect(check({ signatureText: signManifest().slice(0, 40) + "$" + signManifest().slice(40) })).toBe(false);
    expect(check({ signatureText: Buffer.alloc(32).toString("base64") })).toBe(false);
  });

  it("gomulu genel anahtar gecerli bir Ed25519 SPKI", () => {
    expect(createPublicKey(UPDATE_PUBLIC_KEY_PEM).asymmetricKeyType).toBe("ed25519");
  });
});

describe("yardimcilar", () => {
  it("varlik adi yalnizca GitHub'in kabul ettigi karakterlerden olusabilir", () => {
    expect(isSafeAssetName(FILE)).toBe(true);
    expect(isSafeAssetName("../evil.exe")).toBe(false);
    expect(isSafeAssetName("https://evil.example/x.exe")).toBe(false);
    expect(isSafeAssetName("NTT Studio Setup 1.7.0.exe")).toBe(false);
    expect(isSafeAssetName("..")).toBe(false);
  });

  it("imza adresi v onekli etiketi ve yayinlanan adi kullaniyor", () => {
    expect(signatureUrl("tufansasmaz", "axet-sap-launcher", VERSION, FILE)).toBe(
      "https://github.com/tufansasmaz/axet-sap-launcher/releases/download/v1.7.0/NTT-Studio-Setup-1.7.0.exe.sig"
    );
  });

  it("kurulum dosyasi electron-updater gibi ilk .exe olarak seciliyor", () => {
    expect(
      pickInstallerFile({ version: VERSION, files: [{ url: "x.blockmap", sha512: "a" }, { url: FILE, sha512: SHA }] })
    ).toEqual({ url: FILE, sha512: SHA });
    expect(pickInstallerFile({ version: VERSION, path: FILE, sha512: SHA })).toEqual({ url: FILE, sha512: SHA });
    expect(pickInstallerFile({ version: VERSION, files: [] })).toBeNull();
  });

  it("imza govdesi 4 KB sinirini asinca okunmuyor", async () => {
    const big = "A".repeat(SIGNATURE_MAX_BYTES + 1);
    await expect(readCappedText(new Response(big), SIGNATURE_MAX_BYTES)).rejects.toThrow();
    // Content-Length yokken de (akışla gelen gövde) sınır tutuyor.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 5; i++) controller.enqueue(new Uint8Array(1024));
        controller.close();
      }
    });
    await expect(readCappedText(new Response(stream), SIGNATURE_MAX_BYTES)).rejects.toThrow();
    await expect(readCappedText(new Response("kisa"), SIGNATURE_MAX_BYTES)).resolves.toBe("kisa");
  });
});

describe("verifyDownloadedUpdate", () => {
  function setup(content = "indirilen kurulum") {
    const dir = tempDir();
    const file = path.join(dir, "installer.exe");
    writeFileSync(file, content);
    const sha = createHash("sha512").update(content).digest("base64");
    return { file, sha };
  }

  const deps = (fetchSignature: (url: string) => Promise<string | null>) => ({
    publicKeyPem,
    hashFile: sha512FileBase64,
    fetchSignature,
    owner: "tufansasmaz",
    repo: "axet-sap-launcher"
  });

  it("imzasi dogru dosya kabul ediliyor", async () => {
    const { file, sha } = setup();
    const fetchSignature = vi.fn(async () => signManifest(VERSION, FILE, sha));
    const result = await verifyDownloadedUpdate(
      { info: { version: VERSION, files: [{ url: FILE, sha512: sha }] }, downloadedFile: file },
      deps(fetchSignature)
    );
    expect(result).toEqual({ ok: true, fileName: FILE, sha512: sha });
    expect(fetchSignature).toHaveBeenCalledWith(
      "https://github.com/tufansasmaz/axet-sap-launcher/releases/download/v1.7.0/NTT-Studio-Setup-1.7.0.exe.sig"
    );
  });

  it("imza dosyasi yoksa (eski/imzasiz yayin) reddediliyor", async () => {
    const { file, sha } = setup();
    const result = await verifyDownloadedUpdate(
      { info: { version: VERSION, files: [{ url: FILE, sha512: sha }] }, downloadedFile: file },
      deps(async () => null)
    );
    expect(result).toMatchObject({ ok: false, reason: "signature-missing" });
  });

  it("imza indirilemezse reddediliyor", async () => {
    const { file, sha } = setup();
    const result = await verifyDownloadedUpdate(
      { info: { version: VERSION, files: [{ url: FILE, sha512: sha }] }, downloadedFile: file },
      deps(async () => {
        throw new Error("net::ERR_CONNECTION_RESET");
      })
    );
    expect(result).toMatchObject({ ok: false, reason: "signature-unavailable" });
  });

  it("latest.yml ile birlikte degistirilmis exe: ozet tutsa da imza tutmuyor", async () => {
    // Saldırganın senaryosu: sahte exe + ona uyan latest.yml, ama eski .sig.
    const genuine = setup("gercek kurulum");
    const forged = setup("sahte kurulum");
    const result = await verifyDownloadedUpdate(
      { info: { version: VERSION, files: [{ url: FILE, sha512: forged.sha }] }, downloadedFile: forged.file },
      deps(async () => signManifest(VERSION, FILE, genuine.sha))
    );
    expect(result).toMatchObject({ ok: false, reason: "signature-invalid" });
  });

  it("diskteki dosya latest.yml'deki ozete uymuyorsa imzaya bakilmadan reddediliyor", async () => {
    const { file, sha } = setup();
    const other = createHash("sha512").update("baska").digest("base64");
    const fetchSignature = vi.fn(async () => signManifest(VERSION, FILE, sha));
    const result = await verifyDownloadedUpdate(
      { info: { version: VERSION, files: [{ url: FILE, sha512: other }] }, downloadedFile: file },
      deps(fetchSignature)
    );
    expect(result).toMatchObject({ ok: false, reason: "hash-mismatch" });
    expect(fetchSignature).not.toHaveBeenCalled();
  });

  it("guvensiz ad ya da surum imza adresine hic gitmiyor", async () => {
    const { file, sha } = setup();
    const fetchSignature = vi.fn(async () => "x");
    for (const info of [
      { version: VERSION, files: [{ url: "../../evil.exe", sha512: sha }] },
      { version: "1.7.0/../../x", files: [{ url: FILE, sha512: sha }] },
      { version: VERSION, files: [] }
    ]) {
      const result = await verifyDownloadedUpdate({ info, downloadedFile: file }, deps(fetchSignature));
      expect(result.ok).toBe(false);
    }
    expect(fetchSignature).not.toHaveBeenCalled();
  });
});

describe("build/signUpdate.cjs", () => {
  it("manifest bicimi uygulama tarafiyla birebir ayni", () => {
    expect(hook.buildUpdateManifest(VERSION, FILE, SHA)).toBe(buildUpdateManifest(VERSION, FILE, SHA));
  });

  it("yayinlanan ad electron-builder gibi bosluklari tireye ceviriyor", () => {
    expect(hook.publishedAssetName("C:/r/NTT Studio Setup 1.7.0.exe")).toBe(FILE);
  });

  it("yayin derlemesi --publish always ya da NTT_STUDIO_RELEASE=1 ile taniniyor", () => {
    expect(hook.isReleaseBuild(["node", "electron-builder", "--win", "--publish", "always"], {})).toBe(true);
    expect(hook.isReleaseBuild(["node", "electron-builder", "--publish=always"], {})).toBe(true);
    expect(hook.isReleaseBuild(["node", "electron-builder", "--win", "--publish", "never"], {})).toBe(false);
    expect(hook.isReleaseBuild(["node", "electron-builder", "--win"], {})).toBe(false);
    expect(hook.isReleaseBuild([], { NTT_STUDIO_RELEASE: "1" })).toBe(true);
  });

  function fakeRelease() {
    const outDir = tempDir();
    const version = "9.9.9";
    const installer = path.join(outDir, `NTT Studio Setup ${version}.exe`);
    writeFileSync(installer, "MZ sahte nsis kurulumu " + "x".repeat(10000));
    const portable = path.join(outDir, `aXet-Studio-${version}-portable.exe`);
    writeFileSync(portable, "MZ tasinabilir");
    const sha = createHash("sha512").update(readFileSync(installer)).digest("base64");
    // electron-builder'ın yazdığı biçim (release/latest.yml'den).
    writeFileSync(
      path.join(outDir, "latest.yml"),
      `version: ${version}\nfiles:\n  - url: NTT-Studio-Setup-${version}.exe\n    sha512: ${sha}\n    size: 10023\n` +
        `path: NTT-Studio-Setup-${version}.exe\nsha512: ${sha}\nreleaseDate: '2026-09-28T00:00:00.000Z'\n`
    );
    const buildResult = {
      outDir,
      artifactPaths: [installer, `${installer}.blockmap`, portable],
      configuration: { productName: "NTT Studio" }
    };
    return { outDir, version, installer, buildResult, pkg: { name: "axet-sap-launcher", productName: "NTT Studio", version } };
  }

  it("NSIS kurulumunu imzaliyor ve uretilen .sig uygulama tarafinda gecerli", async () => {
    const release = fakeRelease();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const extra = await hook(release.buildResult, {
      env: { NTT_STUDIO_UPDATE_KEY: privateKeyPath },
      argv: ["node", "electron-builder", "--win", "--publish", "always"],
      pkg: release.pkg
    });
    const sigPath = path.join(release.outDir, "NTT-Studio-Setup-9.9.9.exe.sig");
    expect(extra).toEqual([sigPath]);

    // Uygulamanın gördüğü tek kaynak latest.yml: sürüm, ad ve özet oradan.
    const yml = readFileSync(path.join(release.outDir, "latest.yml"), "utf8");
    const url = /- url: (.+)/.exec(yml)![1].trim();
    const sha512 = /^\s+sha512: (.+)$/m.exec(yml)![1].trim();
    const version = /^version: (.+)$/m.exec(yml)![1].trim();

    const result = await verifyDownloadedUpdate(
      { info: { version, files: [{ url, sha512 }] }, downloadedFile: release.installer },
      {
        publicKeyPem,
        hashFile: sha512FileBase64,
        fetchSignature: async (requested) => {
          expect(requested.endsWith(`/v${version}/${path.basename(sigPath)}`)).toBe(true);
          return readFileSync(sigPath, "utf8");
        },
        owner: "tufansasmaz",
        repo: "axet-sap-launcher"
      }
    );
    expect(result.ok).toBe(true);

    // .sig yalnızca imza taşıyor; anahtarın hiçbir parçası dosyaya sızmıyor.
    const sigText = readFileSync(sigPath, "utf8");
    expect(sigText).not.toContain("PRIVATE");
    expect(Buffer.from(sigText.trim(), "base64").length).toBe(64);
  });

  it("anahtar yoksa yerel derlemede uyarip atliyor", async () => {
    const release = fakeRelease();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const extra = await hook(release.buildResult, {
      env: { NTT_STUDIO_UPDATE_KEY: path.join(release.outDir, "yok.pem") },
      argv: ["node", "electron-builder", "--win"],
      pkg: release.pkg
    });
    expect(extra).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it("anahtar yoksa yayin derlemesini basarisiz kiliyor", async () => {
    const release = fakeRelease();
    await expect(
      hook(release.buildResult, {
        env: { NTT_STUDIO_UPDATE_KEY: path.join(release.outDir, "yok.pem") },
        argv: ["node", "electron-builder", "--win", "--publish", "always"],
        pkg: release.pkg
      })
    ).rejects.toThrow(/anahtar/);
  });
});
