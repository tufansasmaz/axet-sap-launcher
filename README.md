# aXet SAP Launcher

SAP Logon Workspaces müşteri/sistem ağacını okuyup, seçtiğin sisteme tek
tıkla bağlanmanı ve o sistem için hazırlanmış bir **axet.code** terminali
açmanı sağlayan masaüstü uygulaması.

> Hazırlayan: **tsasmaz**

## Özellikler

- SAP Logon'un `SAPUILandscape.xml` dosyasını otomatik okuyup müşteri/sistem
  ağacını gösterir (network include dosyaları dahil).
- Sisteme tıklayınca ADT (SAP REST API) endpoint'ini otomatik keşfeder,
  girilen kimlik bilgilerini gerçek bir HTTP isteğiyle doğrular.
- SAProuter üzerinden bağlanan sistemler için native NI_ROUTE protokol
  desteği + RFC bridge fallback'i.
- Doğrulanmış bağlantı bilgilerini bir proje klasörüne yazar
  (`.conn_adt`, `adt-tool.ps1`, `sap-context.md`).
- SAP toolkit skill'lerini (abapGit bridge, ADT read-only araçları, Office
  doküman araçları) otomatik olarak proje klasörüne kopyalar.
- Uygulama içine gömülü bir terminal panelinde `axet.code`'u başlatır
  (harici pencere açılmaz, `node-pty` tabanlı gerçek bir PowerShell/cmd
  pseudo-terminal).
- VS Code tarzı Dosya Gezgini + dosya önizleme (`.docx`, metin, resim).
- Manuel sistem ekleme/düzenleme/silme, JSON dışa/içe aktarma.
- Sistem önem derecesi etiketleme (DEV/QA/PRD) ve otomatik tahmin.
- Bağlantı geçmişi, açılışta toplu erişilebilirlik taraması.
- Otomatik güncelleme (GitHub Releases üzerinden, `electron-updater`).

## Teknoloji Yığını

Electron 33 + React 18 + TypeScript, Tailwind CSS, `electron-vite` build
sistemi, `@lydell/node-pty` + `@xterm/xterm` (gömülü terminal),
`fast-xml-parser`, `mammoth` (docx önizleme).

## Geliştirme

```bash
npm install
npm run dev          # electron-vite dev (hot reload)
npm run typecheck    # tsc --noEmit, web + node projeleri ayrı ayrı
npm run build         # sadece derle
npm run build:win      # derle + electron-builder --win (dir + portable + nsis)
```

## Kurulum (kullanıcılar için)

En son sürümü [Releases](https://github.com/tufansasmaz/axet-sap-launcher/releases)
sayfasından indir:

- **`aXet-SAP-Launcher-Setup-X.Y.Z.exe`** — kurulum dosyası, masaüstü/başlat
  menüsü kısayolu oluşturur. **Otomatik güncelleme sadece bu yolla kurulan
  sürümlerde çalışır.**
- **`aXet-SAP-Launcher-X.Y.Z-portable.exe`** — kurulum gerektirmeyen tek
  dosya (güncelleme almaz).

Detaylı kullanım için [`KULLANIM-REHBERI.md`](./KULLANIM-REHBERI.md)'ye,
mimari/geliştirici notları için [`PROJE-BILGI.md`](./PROJE-BILGI.md)'ye bak.

## Lisans

Bu proje NTT DATA bünyesinde geliştirilmiştir, dahili kullanım
amaçlıdır.
