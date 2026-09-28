// better-sqlite3'ün paketlenecek ikilisinin yerinde olduğunu garantiler.
//
// NEDEN AYRI BİR ADIM: bu makinede iki kısıt birden var — kurumsal npm
// kurulum script'lerini engelliyor (`allowScripts`) ve Visual Studio derleme
// araçları YOK (node-gyp `find-visualstudio.js`de patlıyor). Paketler bu
// yüzden `--ignore-scripts` ile kuruluyor.
//
// better-sqlite3 13'ten beri ikili N-API'li ve npm paketinin İÇİNDE geliyor
// (`prebuilds/<platform>-<mimari>.node`): ne indirme ne derleme gerekiyor,
// Electron ABI'sine de bağlı değil — Electron yükseltmesi ikiliyi
// değiştirmiyor. 12.x'teki gibi Electron sürümüne göre prebuild indirmek bu
// yüzden artık yok.
//
// Kontrol yine de derlemenin İÇİNDE duruyor, çünkü eksik ikilinin bedeli
// SESSİZ: uygulama açılır, sohbet çalışır, sadece kalıcı oturum kipi
// (axetChatTui.ts) hiç devreye girmez ve her mesaj yavaş `run` yoluna düşer.
// Kimse fark etmez. Yarım kalmış bir kurulum ya da prebuild'i olmayan bir
// sürüme geçiş burada derlemeyi durduruyor.

const { existsSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const pkgDir = join(root, "node_modules", "better-sqlite3");
const target = `${process.platform}-${process.arch}`;
const binding = join(pkgDir, "prebuilds", `${target}.node`);

if (existsSync(binding)) {
  process.exit(0);
}

let version = "?";
try {
  version = require(join(pkgDir, "package.json")).version;
} catch {
  console.error("[ensureSqlite] better-sqlite3 kurulu degil. `npm ci --ignore-scripts` calistirin.");
  process.exit(1);
}

// Derlemeyi DURDURUYORUZ. Uyarip devam etmek, kalici oturum kipi olmayan bir
// kurulum paketini kimsenin fark etmeden yayinlamasi demekti.
console.error(
  `[ensureSqlite] better-sqlite3 ${version} icinde ${target} ikilisi yok: ${binding}\n` +
    "  13.x ikiliyi paketin icinde getirir; yoksa kurulum yarim kalmistir ya da surum prebuild'siz."
);
process.exit(1);
