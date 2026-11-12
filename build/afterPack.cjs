// afterPack.cjs — electron-builder'ın `signAndEditExecutable: false` ile
// atladığı ikon gömme adımını YERİNE koyuyor. Sebep: bu makinede
// electron-builder'ın kendi imzalama/rcedit adımı (signAndEditExecutable:
// true olunca) her zaman `winCodeSign` paketini indirip açmaya çalışıyor
// (macOS darwin dylib'leri içeren bir 7z arşivi — Windows kod imzalama ile
// alakasız görünse de electron-builder'ın signtool tespiti bu paketi
// gerektiriyor) ve bu makinede sembolik link oluşturma yetkisi olmadığı
// için (`ERROR: Cannot create symbolic link : A required privilege is not
// held by the client`) build tamamen patlıyor. `signAndEditExecutable:
// false` bu adımı (ve dolayısıyla ikon gömme kısmını da, ikisi aynı
// fonksiyonda birleşik) tamamen atlıyor — bu yüzden paketlenmiş exe hep
// Electron'un varsayılan ikonunu gösteriyordu.
//
// Çözüm: `pe-library` + `resedit` (saf JS, Wine/rcedit/winCodeSign
// gerektirmeyen, imzalamayla alakasız kütüphaneler — electron-builder'ın
// kendi transitive bağımlılığı, ayrıca kurulum gerekmedi) ile ikonu
// doğrudan paketlenmiş exe'ye PE kaynak düzeyinde gömüyoruz. Bu adım
// imzalama/sertifika/Wine'a hiç dokunmuyor, sadece ikon kaynak grubunu
// değiştiriyor.

const fs = require("fs");
const path = require("path");
const { NtExecutable, NtExecutableResource } = require("pe-library");
const ResEdit = require("resedit");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const productFilename = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  if (!fs.existsSync(exePath)) {
    console.warn(`[afterPack] exe bulunamadı, ikon gömme atlandı: ${exePath}`);
    return;
  }

  const icoPath = path.join(__dirname, "icon.ico");
  const exeData = fs.readFileSync(exePath);
  const icoData = fs.readFileSync(icoPath);

  const exe = NtExecutable.from(exeData, { ignoreCert: true });
  const res = NtExecutableResource.from(exe);
  const iconFile = ResEdit.Data.IconFile.from(icoData);

  const existingGroups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  if (existingGroups.length === 0) {
    console.warn(`[afterPack] exe'de mevcut ikon grubu bulunamadı, ikon gömme atlandı: ${exePath}`);
    return;
  }

  for (const group of existingGroups) {
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
      res.entries,
      group.id,
      group.lang,
      iconFile.icons.map((item) => item.data)
    );
  }

  // Sürüm bilgisi: aynı atlanan adım exe'nin VERSIONINFO'sunu da Electron'un
  // varsayılanında bırakıyordu (FileDescription/ProductName = "Electron").
  // Windows bildirimleri kısayol kaydı bulamadığında adı buradan aldığı için
  // bildirimlerde "Electron" yazıyordu; Görev Yöneticisi'nde de öyle görünüyordu.
  const productName = context.packager.appInfo.productName;
  const version = context.packager.appInfo.version;
  const parts = `${version}`.split(/[.+-]/).map((n) => Number.parseInt(n, 10) || 0);
  const [major = 0, minor = 0, patch = 0] = parts;
  const versionInfos = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  for (const vi of versionInfos) {
    vi.setFileVersion(major, minor, patch, 0);
    vi.setProductVersion(major, minor, patch, 0);
    for (const lang of vi.getAllLanguagesForStringValues()) {
      vi.setStringValues(lang, {
        FileDescription: productName,
        ProductName: productName,
        CompanyName: "NTT DATA Business Solutions",
        InternalName: productFilename,
        OriginalFilename: `${productFilename}.exe`,
        FileVersion: version,
        ProductVersion: version,
        LegalCopyright: `© ${new Date().getFullYear()} NTT DATA Business Solutions`
      });
    }
    vi.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  const newBinary = exe.generate();
  fs.writeFileSync(exePath, Buffer.from(newBinary));

  console.log(`[afterPack] Özel ikon ve sürüm bilgisi gömüldü: ${exePath}`);
};
