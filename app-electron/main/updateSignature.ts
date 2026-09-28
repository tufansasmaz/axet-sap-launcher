// Güncelleme dosyasının kendi Ed25519 imzamızla doğrulanması — saf kısım.
//
// Neden gerekli: kurulum exe'si Authenticode ile imzalanmıyor
// (`win.signAndEditExecutable: false`, bilinçli — bkz. build/afterPack.cjs).
// electron-updater'ın tek kontrolü `latest.yml`'deki SHA-512; ama o bir imza
// değil, yalnızca bir özet. GitHub sürümüne yazabilen biri exe'yi de
// `latest.yml`'i de birlikte değiştirir, özet yine tutar ve uygulama sahte
// kurulumu çalıştırır. Burada doğrulanan imza ise yalnızca depo dışında duran
// özel anahtarla üretilebiliyor; sürüme yazma yetkisi onu taklit etmeye yetmez.
//
// Bu dosya Electron'a dokunmuyor (yalnızca `node:crypto` / `node:fs`), çünkü
// imza mantığı testte gerçek anahtar çiftiyle sınanabilmeli. Ağ ve
// electron-updater bağlantısı `updater.ts`'te.
//
// Manifest biçimi `build/signUpdate.cjs` ile BİREBİR aynı olmalı: biri
// değişirse ötekinin ürettiği imza doğrulanmaz ve güncellemeler reddedilir
// (kapalı hata — güvenli ama kullanıcıyı eski sürümde bırakır).

import { createHash, createPublicKey, verify } from "node:crypto";
import { createReadStream } from "node:fs";

// Özel anahtarı yalnızca yayını yapan geliştirici tutuyor (depo dışında,
// `~/.ntt-studio-keys/update-ed25519.pem`). Burada genel yarısı var; bu
// değer değişirse eski anahtarla imzalanmış hiçbir yayın bu sürümde kurulmaz.
export const UPDATE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAZXS1HRvs9NpI33IB76NSiHBy1ybhqxd7i36xmbGOSis=
-----END PUBLIC KEY-----
`;

// Ed25519 imzası 64 bayt, base64'ü 88 karakter. 4 KB, sunucunun ya da araya
// girenin büyük bir gövdeyle belleği şişirmesine izin vermeyecek kadar küçük,
// satır sonu/boşluk payı için de yeterince büyük.
export const SIGNATURE_MAX_BYTES = 4096;

const ED25519_SIGNATURE_BYTES = 64;

// GitHub'ın varlık adında kabul ettiği karakterler — electron-builder da aynı
// kümeyi kullanıyor (`computeSafeArtifactNameIfNeeded`). Bunun dışında bir ad
// (`/`, `..`, tam URL) imza adresini başka bir yere yönlendirebilirdi.
const SAFE_ASSET_NAME = /^[0-9A-Za-z._-]+$/;
const SAFE_VERSION = /^[0-9A-Za-z.+-]+$/;
const STRICT_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function buildUpdateManifest(version: string, fileName: string, sha512Base64: string): string {
  return `ntt-studio-update\n${version}\n${fileName}\n${sha512Base64}`;
}

export function isSafeAssetName(name: string): boolean {
  return SAFE_ASSET_NAME.test(name) && name !== "." && name !== "..";
}

export function isSafeVersion(version: string): boolean {
  return SAFE_VERSION.test(version);
}

// Etiketler `v` önekli (`v1.6.8`): electron-builder'ın GitHub yayıncısı
// etiketi böyle açıyor, depodaki bütün sürüm etiketleri de öyle.
export function signatureUrl(owner: string, repo: string, version: string, fileName: string): string {
  return `https://github.com/${owner}/${repo}/releases/download/v${version}/${fileName}.sig`;
}

export interface UpdateFileEntry {
  url: string;
  sha512: string;
}

export interface UpdateInfoLike {
  version: string;
  files?: ReadonlyArray<UpdateFileEntry>;
  path?: string;
  sha512?: string;
}

// electron-updater'ın NSIS tarafı indireceği dosyayı `files` içindeki ilk
// `.exe` olarak seçiyor (`findFile(..., "exe")`). Aynı dosya seçilmezse
// imzası doğrulanan dosya ile kurulan dosya ayrışabilirdi.
export function pickInstallerFile(info: UpdateInfoLike): UpdateFileEntry | null {
  const exe = info.files?.find((file) => file.url.toLowerCase().endsWith(".exe"));
  if (exe) return { url: exe.url, sha512: exe.sha512 };
  if (info.path && info.sha512) return { url: info.path, sha512: info.sha512 };
  return null;
}

export function verifyUpdateSignature(args: {
  version: string;
  fileName: string;
  sha512Base64: string;
  signatureText: string;
  publicKeyPem: string;
}): boolean {
  const signature = args.signatureText.trim();
  // `Buffer.from(..., "base64")` bozuk girdiyi sessizce kırpıp kalanını
  // çözüyor; katı bir kontrol olmadan "yarım" bir imza bile verify'a gidiyor.
  if (!STRICT_BASE64.test(signature)) return false;
  const signatureBytes = Buffer.from(signature, "base64");
  if (signatureBytes.length !== ED25519_SIGNATURE_BYTES) return false;
  try {
    const manifest = buildUpdateManifest(args.version, args.fileName, args.sha512Base64);
    return verify(null, Buffer.from(manifest, "utf8"), createPublicKey(args.publicKeyPem), signatureBytes);
  } catch {
    return false;
  }
}

// Kurulum dosyası ~115 MB; akışla okunuyor ki ana süreç belleğe tamamını
// almasın.
export function sha512FileBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha512");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("base64")));
  });
}

export class SignatureTooLargeError extends Error {}

// `Content-Length` yalan söyleyebilir ya da hiç gelmeyebilir; sınır okunan
// bayt üzerinden de uygulanıyor.
export async function readCappedText(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new SignatureTooLargeError(`signature larger than ${maxBytes} bytes`);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new SignatureTooLargeError(`signature larger than ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export type UpdateVerifyFailure =
  | "no-file-info"
  | "unsafe-name"
  | "hash-mismatch"
  | "signature-missing"
  | "signature-unavailable"
  | "signature-invalid";

export type UpdateVerifyResult =
  | { ok: true; fileName: string; sha512: string }
  | { ok: false; reason: UpdateVerifyFailure; detail?: string };

// `fetchSignature` null dönerse imza dosyası yok (404) demek. İmzasız bir
// sürüm — imzalamadan önceki bir yayın ya da imzayı silen biri — kurulmuyor.
export async function verifyDownloadedUpdate(
  input: { info: UpdateInfoLike; downloadedFile: string },
  deps: {
    publicKeyPem: string;
    hashFile: (filePath: string) => Promise<string>;
    fetchSignature: (url: string) => Promise<string | null>;
    owner: string;
    repo: string;
  }
): Promise<UpdateVerifyResult> {
  const entry = pickInstallerFile(input.info);
  if (!entry) return { ok: false, reason: "no-file-info" };
  const version = input.info.version;
  const fileName = entry.url;
  if (!isSafeVersion(version) || !isSafeAssetName(fileName)) return { ok: false, reason: "unsafe-name" };

  // Manifest `latest.yml`'deki özeti değil diskteki dosyanın GERÇEK özetini
  // taşıyor; ikisinin eşitliği ayrıca şart, yoksa imzalı bir manifest ile
  // başka bir dosya yan yana kurulabilirdi.
  const actualSha512 = await deps.hashFile(input.downloadedFile);
  if (actualSha512 !== entry.sha512) return { ok: false, reason: "hash-mismatch" };

  let signatureText: string | null;
  try {
    signatureText = await deps.fetchSignature(signatureUrl(deps.owner, deps.repo, version, fileName));
  } catch (err) {
    return { ok: false, reason: "signature-unavailable", detail: (err as Error)?.message ?? String(err) };
  }
  if (signatureText === null) return { ok: false, reason: "signature-missing" };

  const valid = verifyUpdateSignature({
    version,
    fileName,
    sha512Base64: actualSha512,
    signatureText,
    publicKeyPem: deps.publicKeyPem
  });
  return valid ? { ok: true, fileName, sha512: actualSha512 } : { ok: false, reason: "signature-invalid" };
}
