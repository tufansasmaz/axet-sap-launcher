# NTT Studio (aXet SAP Launcher)

SAP sistemlerine bağlanmayı, bağlandığın sistem üzerinde **axet.code** ile
sohbet ederek çalışmayı ve SAP GUI'yi otomatikleştirmeyi tek pencerede
toplayan masaüstü uygulaması.

> Hazırlayan: **tsasmaz**
>
> Depo adı hâlâ `axet-sap-launcher`; uygulamanın kendisi **NTT Studio**
> adıyla paketleniyor. İkisi aynı proje.

## Modüller

Soldaki dikey rayda üç modül var:

| Modül | Ne yapar |
| --- | --- |
| **axet.code** | Bağlandığın sistem bağlamında sohbet — asıl çalışma ekranı |
| **SAP Launcher** | Müşteri/sistem ağacı, bağlanma, proje klasörü |
| **SAP GUI Scripting** | SAP GUI ekranlarını gezme, kayıt/tekrar oynatma, doğal dille otomasyon |

Rayın altında: **Uygulama Bağlantıları** (Outlook/SharePoint gibi aXet
bağlayıcıları), tema, dil ve ayarlar.

## Özellikler

**Bağlantı**

- SAP Logon'un `SAPUILandscape.xml` dosyasını otomatik okuyup müşteri/sistem
  ağacını gösterir (network include dosyaları dahil).
- Sisteme tıklayınca ADT (SAP REST API) endpoint'ini otomatik keşfeder,
  girilen kimlik bilgilerini gerçek bir HTTP isteğiyle doğrular.
- SAProuter üzerinden bağlanan sistemler için native NI_ROUTE protokol
  desteği + RFC bridge fallback'i.
- SAML SSO ile giren Cloud/BTP sistemlerde tarayıcı girişi otomatik yürür,
  oturum çerezi uygulamaya geri alınır.
- Doğrulanmış bağlantı bilgilerini bir proje klasörüne yazar
  (`.conn_adt`, `adt-tool.ps1`, `sap-context.md`).
- SAP toolkit skill'lerini (abapGit bridge, ADT read-only araçları, Office
  doküman araçları) otomatik olarak proje klasörüne kopyalar.
- Manuel sistem ekleme/düzenleme/silme, JSON dışa/içe aktarma.
- Sistem önem derecesi etiketleme (DEV/QA/PRD) ve otomatik tahmin.
- Bağlantı geçmişi, açılışta toplu erişilebilirlik taraması.

**Sohbet (axet.code)**

- Bağlandığın sistem için doğrudan sohbet açılır; her sohbet kendi kalıcı
  axet-code oturumunu (`node-pty` üzerinden gerçek TUI) kullanır.
- Oturumlar sıcak tutulur (en fazla 5 oturum, 60 dakika boşta) — ikinci ve
  sonraki mesajlar süreç başlatma maliyeti ödemez.
- Sohbetler sisteme göre gruplanır, projelere ayrılabilir, PDF olarak dışa
  aktarılabilir.
- Sohbetin yanında canlı dosya paneli: ajanın dokunduğu dosyaları görürsün.
- Ajanın hangi aracı çalıştırdığı, kaçıncı adımda olduğu ve ne kadar
  sürdüğü canlı göstergede yazar.

**Genel**

- Uygulama içine gömülü terminal (harici pencere açılmaz, `node-pty`
  tabanlı gerçek bir PowerShell/cmd pseudo-terminal).
- VS Code tarzı Dosya Gezgini + dosya önizleme (`.docx`, metin, resim).
- Türkçe/İngilizce arayüz.
- Otomatik güncelleme (GitHub Releases üzerinden, `electron-updater`) —
  depo public olduğu için **token gerekmez**.

## Teknoloji Yığını

Electron 33 + React 18 + TypeScript, Tailwind CSS, `electron-vite` build
sistemi, `@lydell/node-pty` + `@xterm/xterm` (gömülü terminal),
`better-sqlite3` (axet-code oturum veritabanını okumak için),
`fast-xml-parser`, `mammoth` (docx önizleme), `reactflow`.

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

- **`NTT-Studio-Setup-X.Y.Z.exe`** — kurulum dosyası, masaüstü/başlat
  menüsü kısayolu oluşturur. **Otomatik güncelleme sadece bu yolla kurulan
  sürümlerde çalışır.**
- **`aXet-Studio-X.Y.Z-portable.exe`** — kurulum gerektirmeyen tek
  dosya (güncelleme almaz).

Dosyalar imzalanmıyor; Windows SmartScreen ilk çalıştırmada uyarı
gösterebilir ("Daha fazla bilgi" → "Yine de çalıştır").

Detaylı kullanım için [`KULLANIM-REHBERI.md`](./KULLANIM-REHBERI.md)'ye,
mimari/geliştirici notları için [`PROJE-BILGI.md`](./PROJE-BILGI.md)'ye bak.

## Lisans

Bu proje NTT DATA bünyesinde geliştirilmiştir, dahili kullanım
amaçlıdır.
