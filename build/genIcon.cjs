// build/icon.svg'den build/icon.png (512) ve build/icon.ico (16–256) üretir.
//
// Makinede SVG'yi resme çeviren bir araç yok (sharp, resvg, ImageMagick
// kurulu değil). Electron'un kendi Chromium'u var: SVG görünmez bir
// pencerede her boyut için yeniden çiziliyor, ekran görüntüsü PNG oluyor.
// Küçük boyutlar büyük resmin küçültülmüşü değil, kendi boyutunda çizilmiş
// SVG; 16 piksellik simgede çizgiler bu yüzden bulanıklaşmıyor.
//
// ICO içine PNG gömülüyor (Windows Vista'dan beri destekleniyor). Önceki
// simge BMP gömüyordu; electron-builder ikisini de kabul ediyor.
//
// Çalıştır: npx electron build/genIcon.cjs
// Logo değişince elle çalıştırılır; derlemenin bir adımı değil.

const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const BUILD = __dirname;
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// Tek görünmez pencere (512×512); her boyut için resim yeniden boyutlanıp
// sol üst köşeden o kadarlık alan kesiliyor. Her boyuta ayrı pencere açmak
// 16 pikselde sayfa yüklemesini düşürüyordu (ERR_FAILED, ölçüldü).
async function renderAll(svg, sizes) {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    useContentSize: true,
    webPreferences: { offscreen: true }
  });
  const html =
    `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">` +
    `<img id="i" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" style="display:block">` +
    `</body></html>`;
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString("base64")}`);
  const out = new Map();
  for (const size of sizes) {
    await win.webContents.executeJavaScript(
      `(() => { const i = document.getElementById("i"); i.width = ${size}; i.height = ${size}; return i.decode(); })()`
    );
    // Offscreen pencerede yeni kare, boyutlamadan hemen sonra hazır olmayabiliyor.
    await new Promise((r) => setTimeout(r, 200));
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
    const png = image.resize({ width: size, height: size }).toPNG();
    if (png.length === 0) throw new Error(`${size}px boş çıktı`);
    out.set(size, png);
  }
  win.destroy();
  return out;
}

function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, png }, i) => {
    const o = 16 * i;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  try {
    const svg = fs.readFileSync(path.join(BUILD, "icon.svg"), "utf8");
    const pngs = await renderAll(svg, [...SIZES, 512]);
    fs.writeFileSync(path.join(BUILD, "icon.png"), pngs.get(512));
    const entries = SIZES.map((size) => ({ size, png: pngs.get(size) }));
    fs.writeFileSync(path.join(BUILD, "icon.ico"), ico(entries));
    console.log(`icon.png 512 · icon.ico ${SIZES.join(", ")}`);
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
