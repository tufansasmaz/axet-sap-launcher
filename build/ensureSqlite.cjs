// better-sqlite3'ün Electron ABI'sine uygun ikilisini garantiler.
//
// NEDEN AYRI BİR ADIM: bu makinede iki kısıt birden var — kurumsal npm
// kurulum script'lerini engelliyor (`allowScripts`) ve Visual Studio derleme
// araçları YOK (node-gyp `find-visualstudio.js`de patlıyor). Yani
// `npm install better-sqlite3` ikiliyi ne indirebiliyor ne derleyebiliyor;
// paket `--ignore-scripts` ile kuruluyor ve `build/Release/*.node` boş kalıyor.
//
// Eksik ikilinin bedeli SESSİZ: uygulama açılır, sohbet çalışır, sadece kalıcı
// oturum kipi (axetChatTui.ts) hiç devreye girmez ve her mesaj yavaş `run`
// yoluna düşer. Kimse fark etmez. Bu yüzden kontrol derlemenin İÇİNDE —
// `npm run build` her seferinde bakıyor, eksikse Electron ABI'si için hazır
// ikiliyi indiriyor (derleme yok, indirme var).
//
// ABI, `electron` sürümüne bağlı: Electron 33.4.11 -> electron-v130. Sürümü
// buradan sabit yazmıyoruz, kurulu electron'dan okuyoruz — yükseltmede
// güncellenmesi unutulacak ikinci bir yer olmasın.

const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const pkgDir = join(root, "node_modules", "better-sqlite3");
const binding = join(pkgDir, "build", "Release", "better_sqlite3.node");

if (existsSync(binding)) {
  process.exit(0);
}

let electronVersion;
try {
  electronVersion = require(join(root, "node_modules", "electron", "package.json")).version;
} catch {
  console.error("[ensureSqlite] electron kurulu degil; better-sqlite3 ikilisi indirilemedi.");
  process.exit(1);
}

console.log(`[ensureSqlite] better_sqlite3.node yok, Electron ${electronVersion} icin indiriliyor...`);
const result = spawnSync(
  process.execPath,
  [
    join(root, "node_modules", "prebuild-install", "bin.js"),
    "--runtime=electron",
    `--target=${electronVersion}`,
    "--dist-url=https://electronjs.org/headers"
  ],
  { cwd: pkgDir, stdio: "inherit" }
);

if (result.status !== 0 || !existsSync(binding)) {
  // Derlemeyi DURDURUYORUZ. Uyarip devam etmek, kalici oturum kipi olmayan bir
  // kurulum paketini kimsenin fark etmeden yayinlamasi demekti.
  console.error("[ensureSqlite] Indirme basarisiz. Aginiz proxy arkasindaysa prebuild-install'i elle calistirin.");
  process.exit(1);
}

console.log("[ensureSqlite] hazir.");
