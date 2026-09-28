// signUpdate.cjs — NSIS kurulum exe'sini kendi Ed25519 anahtarımızla imzalar.
//
// Neden: kurulum Authenticode ile imzalanmıyor (`signAndEditExecutable:
// false`, bkz. afterPack.cjs) ve `latest.yml`'deki SHA-512 bir imza değil;
// GitHub sürümüne yazabilen biri exe ile `latest.yml`'i birlikte değiştirir.
// Uygulama (app-electron/main/updateSignature.ts) her güncellemede
// `<yayınlanan ad>.sig` dosyasını indirip gömülü genel anahtarla doğruluyor;
// imza yoksa ya da tutmuyorsa kurmuyor. Bu betik o `.sig`'i üretiyor.
//
// İki yoldan çağrılıyor:
//   - electron-builder `afterAllArtifactBuild` kancası (package.json `build`).
//     Dönüş değeri ek yayın dosyalarıdır: `--publish always` ile `.sig`
//     exe'nin yanına kendiliğinden yüklenir.
//   - `node build/signUpdate.cjs --check-key`: `npm run release` derlemeye
//     başlamadan ÖNCE anahtarı yokluyor. Kanca en sonda çalıştığı için, anahtar
//     yoksa electron-builder exe'yi GitHub'a çoktan yüklemiş olurdu.
//
// Özel anahtarın içeriği hiçbir yere yazılmıyor, yalnızca yolu.
//
// Manifest biçimi updateSignature.ts'teki `buildUpdateManifest` ile BİREBİR
// aynı olmalı — tests/updateSignature.test.ts ikisini birlikte sınıyor.

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_KEY_PATH = path.join(os.homedir(), ".ntt-studio-keys", "update-ed25519.pem");

function buildUpdateManifest(version, fileName, sha512Base64) {
  return `ntt-studio-update\n${version}\n${fileName}\n${sha512Base64}`;
}

// electron-builder `latest.yml`'deki `url`'i ve GitHub'a yüklenen adı bu
// kuralla üretiyor (`computeSafeArtifactNameIfNeeded`: yalnızca boşluk sorunsa
// boşlukları tireye çevir). `NTT Studio Setup 1.7.0.exe` → `NTT-Studio-Setup-1.7.0.exe`.
// Kanca çalıştığında `latest.yml` henüz yazılmamış oluyor (PublishManager onu
// kancadan SONRA yazıyor), o yüzden ad dosyadan okunamıyor, aynı kuralla kuruluyor.
function publishedAssetName(filePath) {
  return path.basename(filePath).replace(/ /g, "-");
}

function sha512FileBase64(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha512");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("base64")));
  });
}

function resolveKeyPath(env) {
  return env.NTT_STUDIO_UPDATE_KEY || DEFAULT_KEY_PATH;
}

// Anahtar okunamazsa null — çağıran yerel/yayın derlemesine göre karar veriyor.
function loadPrivateKey(keyPath) {
  if (!fs.existsSync(keyPath)) return null;
  const key = crypto.createPrivateKey(fs.readFileSync(keyPath));
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error(`[signUpdate] anahtar Ed25519 değil (${key.asymmetricKeyType}): ${keyPath}`);
  }
  return key;
}

// `npm run release` = `electron-builder --win --publish always`. Yayın olmayan
// her derlemede (`build:win`) anahtar yoksa derleme sürüyor, `.sig` üretilmiyor;
// o kurulum yayınlanırsa yeni sürümler onu zaten reddeder.
function isReleaseBuild(argv, env) {
  if (env.NTT_STUDIO_RELEASE === "1") return true;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--publish" || arg === "-p") {
      const value = argv[i + 1];
      if (value && value !== "never") return true;
    } else if (arg.startsWith("--publish=")) {
      if (arg.slice("--publish=".length) !== "never") return true;
    }
  }
  return false;
}

// NSIS'in varsayılan adı `${productName} Setup ${version}.exe`; taşınabilir
// sürümün adı farklı (`aXet-Studio-…-portable.exe`) ve otomatik güncelleme
// almıyor, imzalanmıyor.
function findNsisInstaller(artifactPaths, productName, version) {
  const expected = `${productName} Setup ${version}.exe`;
  return artifactPaths.find((artifact) => path.basename(artifact) === expected) || null;
}

async function signInstaller({ installerPath, version, privateKey, outDir }) {
  const fileName = publishedAssetName(installerPath);
  const sha512 = await sha512FileBase64(installerPath);
  const manifest = buildUpdateManifest(version, fileName, sha512);
  const signature = crypto.sign(null, Buffer.from(manifest, "utf8"), privateKey);
  const sigPath = path.join(outDir, `${fileName}.sig`);
  fs.writeFileSync(sigPath, signature.toString("base64") + "\n", "utf8");
  return { sigPath, fileName, sha512 };
}

async function afterAllArtifactBuild(buildResult, options = {}) {
  const env = options.env || process.env;
  const argv = options.argv || process.argv;
  const pkg = options.pkg || require(path.join(__dirname, "..", "package.json"));
  const release = isReleaseBuild(argv, env);

  const productName = (buildResult.configuration && buildResult.configuration.productName) || pkg.productName || pkg.name;
  const installerPath = findNsisInstaller(buildResult.artifactPaths || [], productName, pkg.version);
  if (!installerPath) {
    if (release) throw new Error(`[signUpdate] NSIS kurulumu artefaktlar arasında yok (${productName} Setup ${pkg.version}.exe)`);
    console.warn("[signUpdate] NSIS kurulumu bu derlemede yok, imza atlandı.");
    return [];
  }

  const keyPath = resolveKeyPath(env);
  const privateKey = loadPrivateKey(keyPath);
  if (!privateKey) {
    if (release) {
      throw new Error(`[signUpdate] güncelleme imza anahtarı bulunamadı: ${keyPath} — yayın imzasız çıkamaz.`);
    }
    console.warn(`[signUpdate] UYARI: imza anahtarı yok (${keyPath}); .sig üretilmedi. Bu kurulum otomatik güncelleme olarak YAYINLANAMAZ.`);
    return [];
  }

  const { sigPath, fileName } = await signInstaller({
    installerPath,
    version: pkg.version,
    privateKey,
    outDir: path.dirname(installerPath)
  });
  console.log(`[signUpdate] imzalandı: ${fileName} → ${path.basename(sigPath)}`);
  return [sigPath];
}

module.exports = afterAllArtifactBuild;
module.exports.default = afterAllArtifactBuild;
module.exports.buildUpdateManifest = buildUpdateManifest;
module.exports.publishedAssetName = publishedAssetName;
module.exports.sha512FileBase64 = sha512FileBase64;
module.exports.resolveKeyPath = resolveKeyPath;
module.exports.loadPrivateKey = loadPrivateKey;
module.exports.isReleaseBuild = isReleaseBuild;
module.exports.findNsisInstaller = findNsisInstaller;
module.exports.signInstaller = signInstaller;
module.exports.DEFAULT_KEY_PATH = DEFAULT_KEY_PATH;

if (require.main === module && process.argv.includes("--check-key")) {
  const keyPath = resolveKeyPath(process.env);
  try {
    if (!loadPrivateKey(keyPath)) {
      console.error(`[signUpdate] güncelleme imza anahtarı bulunamadı: ${keyPath}`);
      process.exit(1);
    }
    console.log(`[signUpdate] imza anahtarı hazır: ${keyPath}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
