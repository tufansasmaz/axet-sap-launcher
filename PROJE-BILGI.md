# PROJE-BILGI.md — aXet SAP Launcher (AI/Geliştirici Bağlamı)

Bu dosya, bu projeye tekrar dönen bir AI asistanının (veya geliştiricinin)
mimariyi hızlıca kavraması için yazıldı. Kod okumadan önce burayı oku.

## Ne Bu Proje

`axet-sap-launcher` — Electron + React + TypeScript masaüstü uygulaması.
SAP Logon Workspaces'in `SAPUILandscape.xml` dosyasını okuyup müşteri/sistem
ağacını gösterir; kullanıcı bir sistem seçtiğinde ADT (SAP REST API)
endpoint'ini otomatik keşfeder, kimlik bilgilerini gerçek bir HTTP isteğiyle
doğrular, doğrulanmış bağlantı bilgilerini bir proje klasörüne yazar, SAP
toolkit skill'lerini o klasöre kopyalar ve `axet.code`'u çalıştıran bir
terminal açar.

`package.json:2-4` → `name: axet-sap-launcher`, açıklama Türkçe.

## Teknoloji Yığını

- **Electron 33** (main + preload + renderer üç ayrı build hedefi,
  `electron-vite` ile derleniyor — `electron.vite.config.ts`).
- **React 18 + TypeScript**, Tailwind CSS (CSS custom property tabanlı
  dark/light tema — `src/index.css`, `tailwind.config.js`).
- **fast-xml-parser** — SAPUILandscape.xml parse (tek gerçek runtime
  dependency, main process'te externalize edilmiyor —
  `electron.vite.config.ts:6`).
- **lucide-react** — ikonlar.
- **electron-builder** — Windows portable + unpacked dir hedefi
  (`package.json:35-55`, `win.target: ["dir","portable"]`).

## Klasör Yapısı

```
app-electron/
  main/            # Electron main process (Node.js tarafı)
    index.ts        # app lifecycle, BrowserWindow, TÜM ipcMain.handle kayıtları
    sapLandscape.ts  # SAPUILandscape.xml + include'ları parse eder
    adtDiscovery.ts  # host:port -> ADT HTTPS URL keşfi, SID doğrulama,
                     # sertifika trust, kimlik doğrulama (verifyCredentials)
    connectivity.ts  # basit TCP/TLS ping (yeşil/kırmızı nokta için)
    launcher.ts      # connectToSystem(): asıl "bağlan" akışının orkestrasyonu
    manualSystems.ts # elle eklenen sistemler (JSON persist, userData altında)
    manualMerge.ts   # manuel sistemleri SapLandscape ağacına enjekte eder
    sapToolkit.ts    # resources/sap-toolkit içindeki skill'leri proje
                     # klasörüne kopyalar
    fsExplorer.ts    # Dosya Gezgini paneli için listDir/readTextFile/
                     # readDocxFile/readImageDataUrl/openExternal — hepsi
                     # projectsBaseDir altına kilitli (isPathAllowed)
    store.ts         # AppConfig persist (userData/config.json)
  preload/index.ts   # contextBridge ile window.api yüzeyini tanımlar
  shared/types.ts     # main + renderer arasında paylaşılan TÜM tipler
                       # (tek gerçek kaynak — burayı değiştirince window.d.ts
                       # ve preload'u da güncelle)
src/
  App.tsx             # üst düzey state ve orkestrasyon (landscape, config,
                       # seçim, toast, modal açık/kapalı state'leri)
  window.d.ts          # window.api'nin TypeScript tarafı (preload'un aynası)
  components/
    Tree.tsx           # sol panel — özyinelemeli müşteri/sistem ağacı
    SystemPanel.tsx     # sağ panel — seçili sistem detayı + bağlan butonu
    CredentialsModal.tsx # kullanıcı adı/şifre/client formu
    AddSystemModal.tsx   # manuel sistem ekle/düzenle formu (aynı component)
    SettingsModal.tsx    # AppConfig formu
    TitleBar.tsx          # frame:false pencere için özel başlık çubuğu
    StatusDot.tsx          # erişilebilirlik renkli nokta
    Toast.tsx               # başarı/hata bildirimleri
    FileExplorer.tsx         # sağ panelde, VS Code tarzı proje klasörü ağacı
    FileViewer.tsx            # dosya önizleme (txt/docx/resim/fallback)
resources/sap-toolkit/    # abapGit bridge, ADT read-only Python server,
                           # office-tools skilleri — connectToSystem sırasında
                           # hedef proje klasörüne kopyalanır (sapToolkit.ts)
```

## Veri Akışı — "Sisteme Bağlan" Tam Akış

1. **Renderer**: `App.tsx handleCredentialsSubmit` → `window.api.connect(req)`
2. **Preload** (`preload/index.ts`) → `ipcMain.invoke("system:connect", req)`
3. **Main** (`main/index.ts` → `connectToSystem()` in `launcher.ts`):
   a. `sanitizeSegment()` ile müşteri path + sistem ID'den güvenli bir
      proje klasör yolu üretilir (`config.projectsBaseDir/.../SID`).
   b. **Cloud/BTP tespiti**: `manualAdtUrl` varsa veya `service.type ===
      "BTP/CLOUD"` ise ve kullanıcı client'ı boş bıraktıysa
      `DEFAULT_CLOUD_CLIENT = "100"` otomatik atanır (`launcher.ts:349-357`).
   c. **URL çözümü**:
      - Manuel URL varsa: `normalizeAdtBaseUrl()` ile Fiori/UI path'leri
        temizlenir (sadece `scheme://host[:port]` kalır), doğrudan kullanılır.
      - Değilse: `discoverAdtEndpoint()` (`adtDiscovery.ts`) DIAG portundan
        (`32XX` formatı) HTTPS ICM portunu tahmin eder (`443XX`), HTTP
        redirect'i takip eder, `WWW-Authenticate` header'ından SID'i okuyup
        beklenen SID ile eşleştirir (yanlış host/DNS'i böyle yakalar), TLS
        sertifikasını alır ve güvenilir değilse Windows kullanıcı sertifika
        deposuna (`certutil -user -addstore Root`) ekler.
   d. **Kimlik doğrulama**: `verifyCredentials()` — gerçek bir
      `GET /sap/bc/adt/discovery` isteği, Basic Auth ile. 200 = başarılı,
      401 = kimlik hatası, diğer = beklenmeyen. Birincil URL ağ hatası
      verirse (401 değil) alternatif URL denenir.
   e. Doğrulama başarısızsa burada durur, terminal AÇILMAZ, hata mesajı
      renderer'a döner.
   f. Başarılıysa: `.conn_adt` (plaintext kimlik + doğrulanmış URL) ve
      `adt-tool.ps1` (PowerShell ADT client, TLS bypass + CSRF token
      otomatik) yazılır, `.gitignore`'a `.conn_adt` eklenir.
   g. `testAdtToolScript()` — yazılan PS script'i gerçekten çalıştırıp
      self-test yapar (Node.js'in TLS doğrulamasıyla PowerShell'in TLS
      davranışı farklı olabildiği için).
   h. `installSkillsIntoProject()` (`sapToolkit.ts`) — `resources/sap-toolkit`
      altındaki sabit `SKILLS` map'inde listelenen skill klasörlerini
      (`SKILL.md` içerenleri) proje klasöründeki `.axet-code/skills/`'e
      kopyalar.
   i. `buildContextMarkdown()` — tüm bu bilgiyi (müşteri, sistem, doğrulama
      notları, kullanılabilir skiller, cloud/SAML özel notları) `sap-context.md`
      olarak yazar. **`mergeWithExistingNotes()`** ile dosyanın en altındaki
      kullanıcı notları (`NOTES_MARKER`'dan sonrası) her yeniden bağlanışta
      korunur, üstündeki otomatik bilgi güncellenir.
   j. `launchTerminal()` — `config.terminal` "wt" ise Windows Terminal
      (`wt.exe`) yeni tab, başarısız olursa veya "cmd" ise `cmd.exe /k`
      ile proje klasöründe `config.axetCommand` (varsayılan `axet-code -y`)
      çalıştırılır.
4. **Main → Renderer**: `ConnectResult { ok, verified, projectDir, message,
   trustedCertificates?, effectiveClient? }` döner.
5. `index.ts`de `result.ok` ise `saveLastCredential()` ile kullanıcı adı ve
   **gerçekte kullanılan client** (`effectiveClient` — cloud default
   uygulanmışsa "100") persist edilir; bir dahaki bağlanışta otomatik dolar.
   `trustedCertificates` varsa `store.ts`'e kaydedilir (aynı sertifikayı
   tekrar trust store'a eklemeye çalışmamak için).

## Önemli Tasarım Kararları / Gotcha'lar

- **`Menu.setApplicationMenu(null)` KULLANILMAZ.** Daha önce böyleydi ve
  Windows'ta Ctrl+V (yapıştır) input alanlarında çalışmıyordu — çünkü
  Electron'da klavye kısayolları (cut/copy/paste/selectAll) bir uygulama
  menüsündeki Edit-rol accelerator'larına bağlıdır, menü `null` olunca bu
  kısayollar da kaybolur. Şu an `main/index.ts`de sadece Edit rollerini
  içeren, görsel olarak hiçbir yerde render edilmeyen (frame:false zaten
  pencereyi gizliyor) bir `Menu.buildFromTemplate([...])` kayıtlı. **Bunu
  tekrar `null` yapma.**
- **`.conn_adt` düz metin şifre içerir.** Bilerek — yerel makine, tek
  kullanıcı senaryosu. `.gitignore`'a otomatik ekleniyor ama şifreleme
  (Electron `safeStorage` / Windows Credential Manager) yapılmıyor. Bu
  bilinen bir güvenlik borcu — kullanıcıya önerildi, henüz uygulanmadı.
- **Cloud sistem tespiti** iki yerde ayrı ayrı yapılıyor: `launcher.ts:353`
  (`connectToSystem` içinde, client default'u için) ve `launcher.ts:178`
  (`buildContextMarkdown` içinde, not metni için). Aynı mantık
  (`Boolean(manualAdtUrl) || type === "BTP/CLOUD"`) — biri değişirse
  diğerini de güncelle.
- **`DEFAULT_CLOUD_CLIENT = "100"`** (`launcher.ts:10`) — kullanıcı client
  alanını boş bırakırsa cloud/BTP sistemlerde otomatik atanır. Sebep: bazı
  ADT endpoint'leri `sap-client` parametresi olmadan 400/404 dönüyor. Bu
  sistemin gerçek client'ı DEĞİL, sadece ADT isteklerinin geçmesi için.
- **Manuel sistemler** `manual-systems.json`'da (`app.getPath("userData")`)
  saklanır, SAP Logon'un XML'inden bağımsızdır. `mergeManualSystems()`
  (`manualMerge.ts`) bunları her `landscape:get` çağrısında sentetik bir
  `"manual-systems-root"` uuid'li köke sarıp gerçek ağacın **başına** ekler;
  `Tree.tsx:113-117`de bu kök özel olarak pinlenip her zaman en üstte
  gösterilir (alfabetik sıralamaya girmez).
- **Manuel sistem düzenleme**: `AddSystemModal` tek component, `editing?:
  EditingManualSystem | null` prop'una göre ekleme/düzenleme modu arasında
  geçiş yapar (`isEditing = Boolean(editing)`). `App.tsx handleEditManual`
  seçili `SapService`'i `EditingManualSystem` şekline çevirip modalı açar.
  IPC: `manualSystems:update` (`main/index.ts`, `manualSystems.ts
  updateManualSystem`).
- **`SapService.isManual`** flag'i, Düzenle/Sil butonlarının SystemPanel'de
  gösterilip gösterilmeyeceğini belirler — SAP Logon'dan gelen gerçek
  sistemlerde bu flag yok, silinemez/düzenlenemezler (kaynak dosya SAP
  Logon'un kendisi).
- **`shared/types.ts` tek doğruluk kaynağı.** Yeni bir IPC endpoint/tip
  eklerken sırasıyla: `shared/types.ts` → `main/index.ts` (ipcMain.handle)
  → `preload/index.ts` (api yüzeyi) → `src/window.d.ts` (renderer tip
  tanımı) → gerçek component. Bu zinciri atlarsan `npm run typecheck`
  patlar.
- **SAPUILandscape.xml otomatik konum**: `sapLandscape.ts:36-38` —
  `homedir()/AppData/Roaming/SAP/Common/SAPUILandscape.xml`. Her bilgisayarda
  o bilgisayarın kendi SAP Logon listesini okur, taşınabilir/hardcode değil.
  `<Includes><Include url="...">` üzerinden merkezi/network landscape
  dosyalarını da otomatik birleştirir (`includePaths()`). Kullanıcı farklı
  bir yol kullanıyorsa `AppConfig.landscapePathOverride` ile ayarlardan
  override edilebilir.
- **SAP Logon Memo alanı**: `getServiceCredentials()` (`sapLandscape.ts:197`)
  SAP Logon XML'indeki `<Service Memo="...">` alanını satır satır okuyup
  1. satırı kullanıcı adı, 2. satırı şifre olarak kabul eder — bu SAP
  Logon'un kendi konvansiyonu, biz icat etmedik.

## Build / Çalıştırma Komutları

```bash
npm run dev          # electron-vite dev (hot reload)
npm run build         # sadece derle (dist/ + dist-electron/)
npm run build:win      # derle + electron-builder --win (release/ altına
                        # win-unpacked/ klasörü VE portable .exe üretir)
npm run typecheck       # tsc --noEmit, web + node projeleri ayrı ayrı
npm run preview          # electron-vite preview
```

`package.json:51-54` → `win.target: ["dir", "portable"]` — build:win her
ikisini de üretir. `dir` hedefi (`release/win-unpacked/`) tamamen
self-contained, kopyala-çalıştır tarzı dağıtım için; `portable` tek
`.exe` dosyası.

## Değişiklik Yaparken Kontrol Listesi

1. `shared/types.ts`'te tip değişikliği yaptıysan main + preload +
   window.d.ts zincirini güncelle (yukarı bakınız).
2. Yeni bir IPC handler eklediysen `npm run typecheck` çalıştır — main ve
   web projeleri ayrı tsconfig ile derleniyor, ikisi de geçmeli.
3. UI'da yeni bir tıklanabilir eleman eklersen `cursor-pointer` class'ını
   unutma (proje genelinde bilinçli olarak her button'a ekleniyor, tarayıcı
   varsayılanı `cursor: default` bırakıyor çünkü Tailwind preflight
   button'ları resetliyor).
4. `launcher.ts`'teki `connectToSystem()`'a dokunuyorsan hem başarı hem
   hata path'lerindeki `return` ifadelerinin `ConnectResult` şeklini tam
   karşıladığından emin ol (özellikle yeni alan eklediysen).
5. Değişiklik sonrası `npm run build:win` ile gerçek bir portable/dir
   build alıp `release/win-unpacked/aXet SAP Launcher.exe`'yi manuel test
   etmek, sadece typecheck'ten daha güvenilir (Electron-spesifik native
   davranışlar — pencere, terminal açma, sertifika store gibi şeyler
   derleme zamanında yakalanmaz).

## SAProuter Üzerinden Bağlanan Sistemler

SAP Logon'da bazı sistemler doğrudan değil, bir **SAProuter**
(`<Landscape><Routers><Router router="/H/.../S/3299">`) üzerinden
tanımlıdır — `Service`'in `@_routerid` alanı bu router'a işaret eder
(`sapLandscape.ts` `collectRouters`/`toService`), ve `SapService.routerString`
alanında ham `/H/host/S/port/...` rota string'i taşınır.

**Kök sebep (eski davranış, artık düzeltildi)**: `adtDiscovery.ts` /
`connectivity.ts` bu `routerString`'i **hiç okumuyordu** — sadece
`sap-context.md`'ye not olarak yazılıyordu; gerçek TCP/TLS bağlantısı her
zaman `service.host:port`'a **doğrudan** açılmaya çalışılıyordu. SAP Logon
(SAPGUI) bu sistemlere kendi NI protokolü içinde router'ı tünelleyerek
bağlanabildiği için kullanıcı "SAP Logon'da girebiliyorum" diyordu, ama
launcher düz TCP/HTTPS denediği ve hedef host VPN/ağdan doğrudan erişilemez
olduğu için bağlanamıyordu.

**Çözüm — `app-electron/main/sapRouter.ts` (yeni dosya)**: SAProuter'ın
"NI_ROUTE" tel protokolünü (pysap/SecureAuthCorp'un `SAPRouter.py`
implementasyonuyla aynı format — 4 byte big-endian NI length framing +
`NI_ROUTE\0` header + hop listesi `hostname\0 port\0 password\0`) elle
implemente eder:
- `parseRouteString(routerString)` — `/H/host/S/port/P/pass` segmentlerini
  hop listesine çevirir (birden fazla router hop'u zincirlenebilir).
- `buildFullRoute(routerString, finalHost, finalPort)` — router zincirinin
  sonuna gerçek hedefi (`service.host:port`, veya ADT keşfinde hesaplanan
  `443xx` ICM portu) ekler.
- `connectThroughRouter(hops)` — ilk hop'a (router'ın kendisi) TCP bağlanır,
  `route_talk_mode = NI_RAW_IO` ile route isteği gönderir, `NI_PONG` yanıtını
  bekler; kabul edilirse soket bundan sonra **hedefe şeffaf bir byte
  pipe'ıdır** (router artık her şeyi ham TCP gibi ileri-geri iletir).
- `tlsConnectThroughRouter(...)` — bu ham soketi `tls.connect({ socket })`
  ile TLS'e yükseltir (SNI = gerçek hedef host).
- `httpRequestOverSocket(...)` — bu TLS soketi üzerinden elle yazılmış basit
  bir HTTP/1.1 istemci (Node'un `https.request`'i kendi soketini açtığı için
  var olan tünellenmiş bir soketi kullanamıyor — bu yüzden minimal, tek
  seferlik, `Connection: close` tabanlı bir istemci elle yazıldı).

`adtDiscovery.ts`'teki `discoverAdtEndpoint`, `verifyCredentials`,
`probeRealm`, `getPeerCertPem` fonksiyonlarına opsiyonel bir `routerString`
parametresi eklendi — varsa yukarıdaki router-tünelli yol kullanılır (ve
HTTP redirect üzerinden hostname keşfi, router varken atlanır — o da ayrıca
tünellenmesi gereken bir istektir ve router tanımlı sistemlerde host zaten
belirli/sabit). `connectivity.ts`'teki `checkConnectivity` de
`service.routerString` varsa yeşil/kırmızı nokta kontrolünü router üzerinden
yapar (`checkRouter`). `launcher.ts` `connectToSystem()` bu parametreyi
`req.service.routerString`'den geçirir.

**Önemli**: `route_talk_mode = NI_RAW_IO` (ham mod) kullanılıyor —
`NI_MSG_IO` (varsayılan) seçilseydi router sonrası trafiğin de 4-byte NI
length prefix'i taşıması gerekirdi, bu da düz HTTPS/TLS için uygun değildir.
Bu detayı değiştirme.

### Gerçek BONY müşterisiyle canlı doğrulama (2026-08-07) — bulgu ve KESİN sınır

BONY sistemleri (`BED`/`BEP`, router `/H/185.201.212.226`) üzerinde gerçek,
canlı bir SAProuter'a karşı bizzat test edildi (VPN kapalı, ofis ağından).
Sonuç **kod tarafında bir hata değil, altyapı/izin (ACL) kısıtı**:

- `NI_RAW_IO` (talk_mode=1) ile `10.6.11.2:3200` VE `10.6.11.2:44300`
  (ADT'nin gerçek HTTPS/ICM hedefi) rotası router tarafından **`-94`
  (`NIEROUT_PERM_DENIED`) ile REDDEDİLDİ** — router paketi doğru parse etti
  (temiz, doğru host/port'lu bir `NI_RTERR` döndü), yani protokol
  implementasyonu doğru; router'ın `saprouttab` izin tablosunda bu
  makinenin genel IP'sinden o hedefe **ham tünelleme** izni yok.
- `NI_MSG_IO` (talk_mode=0) ile rota **kabul edildi** (`NI_PONG`) — SAP
  GUI'nin DIAG bağlantısının neden hatasız çalıştığı da bu: DIAG, SAP'ın
  kendi NI-mesaj tabanlı protokolü olduğu için bu mod altında native olarak
  akar ve router'ın ACL'i (muhtemelen bilinçli olarak) bunu ayrı/daha gevşek
  bir kuralla izin veriyor.
- Ama `NI_MSG_IO` kabul edilse bile **ADT/HTTPS için kullanılamaz**: bu
  modda router client↔router hattında NI 4-byte length framing zorunlu
  kılıyor (test edilip doğrulandı — framesiz gönderilen ham TLS
  ClientHello `ECONNRESET` ile koptu). Framing eklenip tekrar denendiğinde
  router paketi client'tan doğru aldı ama **hedefe (ICM'nin düz
  HTTPS dinleyicisi) ilettiğinde hedef bağlantıyı kopardı**
  (`NI_RTERR -95 "connection to partner ... broken"`, `NiIRead` hatası) —
  çünkü ICM'nin HTTPS portu SAP NI protokolünü anlamıyor, sadece dispatcher/
  gateway/message server gibi gerçek SAP kernel servisleri NI-framed
  mesajları anlar. Yani `NI_MSG_IO` sadece SAP-native servislere (DIAG,
  RFC, message server) rota açar, düz TLS/HTTP'ye asla açamaz.

**Sonuç (o anki bilgiyle)**: Bu router konfigürasyonunda **ADT/HTTPS trafiği
NI protokolü seviyesinde tünellenemez** (`NI_RAW_IO` → -94, `NI_MSG_IO` →
hedefe iletilince -95) — asıl kalıcı çözüm hâlâ router'da (`saprouttab`'a
ayrı bir `P` satırı), ama pratik bir workaround bulundu, aşağıya bak.

`sapRouter.ts`'e bu yüzden `parseRouterError()`/`describeRouterFailure()`
eklendi — `NI_RTERR` yanıtındaki `return_code`'u (özellikle `-94`) ayrıştırıp
kullanıcıya "bu router seni engelliyor, Basis'e ADT portu için raw-tünel
izni ekletmen gerekiyor" mesajını net biçimde veriyor; kod tekrar `NI_MSG_IO`
fallback'ine **geçmiyor** çünkü yukarıda kanıtlandığı gibi bu HTTPS için
kesin olarak işe yaramıyor ve zaman kaybettirir.

## RFC Bridge — pratik workaround (Basis'i beklemeden bağlanma)

Yukarıdaki `-94` durumunda kalıcı çözüm Basis'in `saprouttab`'a satır
eklemesi olsa da, kullanıcı bunu beklemek istemedi ("SAP Logon'da
bağlanabiliyorum, bizim uygulamamız da bir yolunu bulsun"). Çözüm: SAP
Logon'un DIAG bağlantısı zaten `NI_MSG_IO` (native SAP protokolü) ile
çalışıyor ve router bunu engellemiyor — **RFC bağlantısı da aynı native SAP
protokolü ailesinden**, dolayısıyla router'ın izin verdiği kanaldan geçer.
SAP'ın resmi olarak dokümante etmediği ama Eclipse ADT'nin de kullandığı
`SADT_REST_RFC_ENDPOINT` fonksiyon modülü, ADT REST isteklerini RFC
üzerinden proxy'ler (topluluk projesi referansı:
`github.com/enricoandreoli/adt-rfc-bridge`).

**Mimari**: `resources/sap-toolkit/abaper/skills/sap-adt-readonly/scripts/`
altına iki yeni Python script eklendi:
- **`adt_rfc_probe.py`** — RFC bağlantısını (pyrfc + `saprouter` parametresi)
  açar, `RFC_PING` ile kanalı doğrular, `RFC_GET_FUNCTION_INTERFACE` ile
  `SADT_REST_RFC_ENDPOINT`'in gerçek parametre/alan adlarını bastırır (bu
  alan adları — `REQUEST_LINE`/`HEADER_FIELDS`/`MESSAGE_BODY`,
  `STATUS_LINE` — resmi API olmadığı için SAP sürümüne göre değişebilir,
  probe bunu doğrulamadan bridge'e güvenme).
- **`adt_rfc_bridge.py`** — `127.0.0.1:8788`'de yerel bir HTTP server açar,
  her isteği `SADT_REST_RFC_ENDPOINT` RFC çağrısına çevirip cevabı gerçek
  bir HTTP response'a geri çevirir. **Kilit tasarım kararı**: mevcut
  `sap_adt_lib.py`/`adt_readonly_server.py` kodu **hiç değiştirilmedi** —
  onlar zaten sadece `ADT_SAP_URL`'e düz `requests` HTTP isteği atıyor;
  `.conn_adt`'ta `ADT_SAP_URL=http://127.0.0.1:8788` yazınca bu bridge'e
  gidiyorlar, aradaki farkı hiç bilmiyorlar. Bu yüzden 20 read-only tool
  sıfır ek kodla RFC üzerinden de çalışıyor.

**Launcher entegrasyonu (`launcher.ts`)**: `connectToSystem()` router
üzerinden `verifyCredentials` çağırdığında `-94`/`NIEROUT_PERM_DENIED`
mesajını (`isRouterPermissionDenied()`) tespit ederse, **hard-fail
etmiyor** — `rfcBridge` config'i (ashost, sysnr, saprouter, bridgePort)
hesaplıyor, `.conn_adt`'a normal alanların yanına `ADT_RFC_MODE=true` +
`ADT_RFC_ASHOST`/`ADT_RFC_SYSNR`/`ADT_RFC_SAPROUTER`/`ADT_RFC_BRIDGE_PORT`
yazıyor, `ADT_SAP_URL`'i yerel bridge adresine çeviriyor, terminali açıyor
ve `sap-context.md`'ye ("SAProuter RFC Bridge Modu" bölümü) tam kurulum
adımlarını yazıyor. `ConnectResult.verified: false` döner (bu launcher HTTP
ile doğrulayamıyor — gerçek doğrulama `adt_rfc_probe.py` ile RFC seviyesinde
yapılır) ama `ok: true` — terminal açılır, kullanıcı/agent kuruluma devam
edebilir. `adt-tool.ps1` bu modda yazılmaz (düz HTTPS kullanıyor, bu
sistemde işe yaramaz).

**Bilinçli dış bağımlılık (kod tarafında çözülemez)**: RFC bağlantısı
**lisanslı SAP NW RFC SDK** gerektirir — bu asistan/launcher bunu kullanıcı
adına indiremez (SAP S-user kimlik doğrulaması zorunlu, SAP'ın lisansı
yeniden dağıtımı yasaklıyor). Kullanıcı kendi S-user'ıyla
`support.sap.com/en/product/connectors/nwrfcsdk.html`'den indirip
`SAPNWRFC_HOME` ayarlayıp `pip install pyrfc` yapmalı — bu adımlar
`SKILL.md`'nin "Router-only sistemler (RFC bridge)" bölümünde detaylı.

**Test durumu**: `sapRouter.ts`/`adtDiscovery.ts`/`connectivity.ts` gerçek
BONY router'ına karşı canlı test edildi (yukarıdaki bulgu). `launcher.ts`'in
RFC-bridge dallanması da BONY'nin gerçek parametreleriyle (`tsx` +
geçici `electron` stub'ıyla, Electron çalışma zamanı dışında) end-to-end
çalıştırılıp `.conn_adt`/`sap-context.md` çıktısı doğrulandı. **Ancak
`adt_rfc_bridge.py`/`adt_rfc_probe.py`'nin kendisi gerçek bir SAP NW RFC
SDK + pyrfc kurulumuna karşı test edilmedi** (bu makinede SDK yok, lisanslı
— kullanıcı kendi S-user'ıyla kurup ilk denemeyi yapmalı). Alan adları
(`REQUEST_LINE` vb.) resmi olmayan bir API'den geldiği için `adt_rfc_probe.py`
ile doğrulanmadan `adt_rfc_bridge.py`'ye güvenilmemeli.

### AÇIK DURUM / BEKLEYEN İŞ (2026-08-07 itibarıyla) — sonraki oturum buradan devam etsin

**GÜNCEL DURUM (2026-08-23)**: Aşağıdaki blokaj kullanıcı tarafındaki resmi
"Software Download" yetkisi açısından hâlâ çözülmedi, AMA bunun uygulamanın
kullanıcı deneyimini bloklaması artık gerekmiyor — kullanıcı elinde bulunan
çalışan bir SDK+pyrfc kopyası uygulamaya gömüldü (bkz. "Gömülü RFC Runtime"
bölümü, en altta). Yani "Sonraki oturumda yapılacaklar" altındaki Yol 1/Yol 2
hâlâ geçerli birer organizasyonel iyileştirme ama artık **launcher'ın RFC
bridge özelliğinin çalışması bunlara bağımlı değil**.

**Blokaj**: Kullanıcının SAP S-user'ı var ama SAP Support Portal'da
"Software Download" yetkisi yok — sadece SAP NetWeaver Developer Studio
(NWDS) indirebiliyor. Araştırıldı: NWDS'nin eski sürümleri plugin
klasöründe rastlantısal bir `sapjco.jar` (JCo 2.x, native `.dll` YOK)
barındırabiliyor ama bu resmi/lisanslı bir dağıtım kanalı değil, RFC bridge
için güvenilir/yeterli değil. JCo'nun kendisi de NW RFC SDK ile **aynı
S-user "Software Download" yetkisini** gerektiriyor — NWDS üzerinden bir
kısayol yok. Tek resmi bypass, SAP BTP Cloud Foundry trial + Java
Buildpack + Connectivity/Destination servisleri (JCo native runtime'ı
otomatik sağlar) — ama bu ayrı bir Java uygulaması + Cloud Connector +
BTP subaccount kurulumu gerektiren, bu launcher'ın kapsamı dışında ayrı bir
altyapı projesi; henüz başlanmadı.

**Kullanıcıya önerilen, paralel yürütülebilecek iki yol** (ikisi de
organizasyonel — kod tarafında bekleyen bir şey yok):
1. Şirketin SAP kullanıcı yöneticisinden (Basis/IT) S-user'a "Software
   Download" yetkisi ekletmek (SAP Note 1037575 sürecine göre) — gelince
   `support.sap.com/en/product/connectors/nwrfcsdk.html`'den SAP NW RFC
   SDK indirilip `pip install pyrfc` yapılabilir, `adt_rfc_probe.py` zaten
   hazır ve bekliyor.
2. Basis/network ekibine BONY router'ının `saprouttab`'ına bu makinenin
   genel IP'sinden hedef `host:44300`'e (ADT/ICM HTTPS portu) bir **`P`
   (permit, `S` DEĞİL)** satırı ekletmek — bu muhtemelen RFC SDK
   zincirinden daha hızlı, tek config satırı. Eklenirse `.conn_adt`'ta
   `ADT_RFC_MODE=false` yapıp `ADT_SAP_URL`'i doğrudan keşfedilen HTTPS
   adresine (`https://10.6.11.2:44300` gibi, `sap-context.md`'de yazılı)
   çevirmek yeterli — RFC bridge'e hiç ihtiyaç kalmaz.

**Şu anki kod durumu** (her ikisi de tam çalışır, hiçbir şeyin
tamamlanmasını beklemiyor):
- `sapRouter.ts`, `adtDiscovery.ts`, `connectivity.ts` — router NI_ROUTE
  protokolü, `-94` tespiti, açıklayıcı hata mesajları: TAMAMLANDI, canlı
  test edildi.
- `launcher.ts` — `-94` tespit edilince RFC bridge moduna otomatik geçiş,
  `.conn_adt`/`sap-context.md` yazımı: TAMAMLANDI, canlı test edildi
  (BONY parametreleriyle end-to-end).
- `adt_rfc_probe.py`, `adt_rfc_bridge.py` — yazıldı, syntax-check geçti,
  **ama gerçek pyrfc/SAP NW RFC SDK kurulumuna karşı hiç çalıştırılmadı**
  (kullanıcıda SDK yok). `SADT_REST_RFC_ENDPOINT`'in alan adları
  (`REQUEST_LINE`/`HEADER_FIELDS`/`MESSAGE_BODY`/`STATUS_LINE`) topluluk
  kaynağından (`adt-rfc-bridge` GitHub projesi) alındı, resmi SAP API'si
  değil — `adt_rfc_probe.py`'nin `RFC_GET_FUNCTION_INTERFACE` çıktısıyla
  BONY sisteminde doğrulanması gerekiyor, henüz yapılamadı.

**Sonraki oturumda yapılacaklar (kullanıcı yetki/izin haberi verince)**:
- Yol 1 gerçekleşirse: kullanıcıya SDK indirme + `SAPNWRFC_HOME` +
  `pip install pyrfc` adımlarını yaptır, `adt_rfc_probe.py`'yi çalıştır,
  çıkan `SADT_REST_RFC_ENDPOINT` parametre isimlerini
  `adt_rfc_bridge.py`'nin marshalling kısmıyla (yaklaşık satır 130-160,
  `RfcAdtClient.request()`) karşılaştır, uyumsuzsa düzelt, sonra
  `adt_rfc_bridge.py`'yi başlatıp `%sap-adt-readonly` ile gerçek bir
  `adt_get_source`/`adt_search` çağrısı dene.
- Yol 2 gerçekleşirse: `launcher.ts`'e dokunmadan, kullanıcıya elle
  `.conn_adt`'ta `ADT_RFC_MODE=false` + `ADT_SAP_URL=<gerçek https url>`
  yapmasını söyle (veya bir "tekrar bağlan" akışı ekleyip
  `discoverAdtEndpoint`'i router olmadan tekrar dene — bu henüz
  otomatikleştirilmedi, launcher şu an ilk `-94` sonrası bir daha ham HTTPS
  denemiyor).

## Bilinen Eksikler / Gelecek İşler (kullanıcıya önerildi, henüz yapılmadı)

- `.conn_adt` şifre şifrelemesi (Electron `safeStorage`).
- Otomatik güncelleme (`electron-updater`).
- Aktivite/audit log (kim ne zaman hangi sisteme bağlandı) — sadece son 10 bağlantı `AppConfig.connectionHistory`'de tutuluyor, kalıcı/detaylı bir audit log değil.

## Kullanılabilirlik İyileştirmeleri (2026-08-14 itibarıyla, TAMAMLANDI)

- **Bağlantı geçmişi / "Son Bağlanılanlar"** — `AppConfig.connectionHistory`
  (`{ uuid, connectedAt }[]`, en fazla 10 kayıt, en yeni başta) her başarılı
  `system:connect` sonrası `store.ts` `pushConnectionHistory()` ile
  güncellenir (`index.ts`'teki `system:connect` handler'ında
  `saveLastCredential`'ın yanına eklendi). Renderer'da `App.tsx`
  `recentEntries` (useMemo) bu geçmişi `flattenLandscape()`
  (`src/lib/landscape.ts`, yeni dosya — Tree'nin path/onSelect
  konvansiyonunu birebir taklit eden bir düzleştirme yardımcı fonksiyonu)
  ile o anki landscape'teki gerçek `SapService`'lere eşleyip
  `RecentSystems.tsx` (yeni component) ile sol panelin en üstünde, arama
  kutusu boşken gösterir. Silinmiş/artık bulunamayan uuid'ler otomatik
  filtrelenir (stale veri sorunu yok — landscape her zaman güncel kaynak).
- **Açılışta toplu connectivity taraması** — `App.tsx`'te landscape
  yüklendiğinde (`flatSystems` değiştiğinde) otomatik tetiklenen bir
  `useEffect`: tüm benzersiz servisleri (`Map` ile uuid'e göre dedup)
  `CONNECTIVITY_SCAN_CONCURRENCY=5` paralel "worker" ile tarar (basit bir
  cursor + `Promise.all(workers)` deseni, ek kütüphane yok), her sonucu
  `connectivity` state'ine progressive olarak yazar. `scanGenerationRef`
  ile eski bir tarama (örn. kullanıcı hızlıca tekrar refresh'e bastıysa)
  devam ederken yeni bir tarama başlarsa öncekinin sonuçları state'i
  ezmeye çalışmaz (generation kontrolü). Router'lı sistemler zaten
  `connectivity.ts`'teki `checkConnectivity()` üzerinden native NI_MSG_IO
  ile taranıyor — bu davranış değişmedi, sadece tetikleme otomatikleşti.
- Bu iki özellik ekstra IPC endpoint gerektirmedi — mevcut
  `landscape:get`/`config:get`/`connectivity:check`/`system:connect`
  üzerine inşa edildi. `AppConfig`'e alan eklerken izlenen standart zincir
  (`shared/types.ts` → `store.ts` `defaultConfig`/`loadConfig` merge →
  ilgili IPC handler) burada da uygulandı, `npm run typecheck` ve
  `npm run build` temiz geçti.
- **Sistem etiketleme/renklendirme (DEV/QA/PRD)** — `AppConfig.systemTiers:
  Record<uuid, SystemTier>` (`SystemTier = "DEV" | "QA" | "PRD"`) kullanıcının
  elle atadığı override'ları tutar; `store.ts` `saveSystemTier(uuid, tier|null)`
  (yeni fonksiyon, `lastCredentials`/`trustedCertificates` ile aynı
  "oku-birleştir-kaydet" deseni) ve `index.ts`'teki yeni `systemTiers:set` IPC
  handler'ı ile persist edilir (`preload/index.ts` `setSystemTier`,
  `window.d.ts`'e eklendi). Kullanıcı hiçbir şey atamadıysa
  `src/lib/tier.ts` `guessTier()` sistem adı/ID'sindeki basit regex
  kalıplarına (PRD/PROD/PRODUCTION, QA/QAS/TEST/TST/UAT, DEV/DEVELOPMENT/
  SBX/SANDBOX) bakıp bir tahmin döner — `resolveTier(service, overrides)`
  önce override'a, yoksa tahmine bakar. `TierBadge.tsx` (yeni component)
  bu üçünü renkli bir rozet olarak gösterir; `Tree.tsx`, `RecentSystems.tsx`
  ve `SystemPanel.tsx`'e entegre edildi. `SystemPanel`'de kullanıcı
  DEV/QA/PRD butonlarından birine tıklayıp elle override atayabilir/
  kaldırabilir ("Temizle"); override yoksa rozetin yanında "(otomatik
  tahmin)" notu görünür. **Tier PRD ise "axet.code'da Aç" butonunun
  üzerinde net bir uyarı banner'ı** çıkar ("Bu bir PRODUCTION sistemi —
  dikkatli ol"). Bu tamamen görsel bir uyarı — bağlantı akışını
  (`launcher.ts`) hiç değiştirmiyor, `ADT_SAP_TIER` (`.conn_adt`'taki
  yorumlu satır) ile şu an bağlı değil, istenirse ileride bağlanabilir.
- **Manuel sistem listesi export/import (JSON)** — `manualSystems.ts`'e
  `exportManualSystemsToFile(filePath)` (mevcut `manual-systems.json`
  içeriğini olduğu gibi JSON'a yazar) ve `importManualSystemsFromFile(filePath)`
  (dosyayı okur, dizi olduğunu doğrular, her kaydı `dedupeKey()` — ad+SID+
  host/adtUrl birleşimi, case-insensitive — ile mevcut listeye karşı
  kontrol edip çakışanları atlar, yenilere taze `id`/`createdAt` üretir,
  `{ imported, skipped, total }` özet döner) eklendi. `index.ts`'te iki
  yeni IPC handler: `manualSystems:exportToFile` (`dialog.showSaveDialog`,
  varsayılan ad `axet-manual-systems.json`) ve `manualSystems:importFromFile`
  (`dialog.showOpenDialog`, `.json` filtresi) — ikisi de dosya seçim
  diyaloğunu Electron main'de açar, renderer'ın dosya sistemine erişimi
  yok. `App.tsx`'te `handleExportManualSystems`/`handleImportManualSystems`
  sonucu toast olarak gösterir, import başarılıysa `refresh()` çağırıp
  landscape'i yeniden yükler (yeni sistemler ağaçta hemen görünür).
  UI girişi `SettingsModal.tsx`'e "Manuel Sistemler" bölümü olarak eklendi
  (Dışa Aktar / İçe Aktar butonları) — export/import `AppConfig`'in bir
  parçası değil, bu yüzden `onSave`'den ayrı, doğrudan `window.api`'ye
  giden iki callback prop olarak tasarlandı.

## Kullanılabilirlik İyileştirmeleri — İkinci Tur (2026-08-14, TAMAMLANDI)

Saf UI/etkileşim iyileştirmeleri, hiçbir IPC/`AppConfig` şeması değişikliği
gerektirmedi (tek istisna: `AddSystemModal.onAdded` imzası):

- **Silme onayı** — `ConfirmDialog.tsx` (yeni, generic component) eklendi;
  `handleDeleteManual` artık direkt silmiyor, `deleteTarget` state'ine
  yazıp dialog açıyor, `handleConfirmDelete` onaydan sonra gerçek
  `removeManualSystem` çağrısını yapıyor. Tek tık ile kalıcı veri kaybı
  riski ortadan kalktı.
- **Panoya kopyalama** — `CopyButton.tsx` (yeni, generic component,
  `navigator.clipboard.writeText` + 1.5s "✓" geri bildirimi) `SystemPanel`'de
  ADT URL/host:port ve UUID satırlarına eklendi.
- **Şifre göster/gizle** — `CredentialsModal`'da göz ikonu (`Eye`/`EyeOff`)
  ile `type="password"` ↔ `type="text"` arasında geçiş; modal her yeni
  sistem için `showPassword`'ü otomatik `false`'a resetler (bir önceki
  sistemin şifresi yanlışlıkla açık kalmasın diye).
- **Aranabilir/temizlenebilir arama kutusu** — sağda bir X butonu (arama
  boşken gizli) tek tıkla temizler; kutu içinde Esc de temizler. Ayrıca
  global bir `keydown` listener'ı (`App.tsx`) **Ctrl/Cmd+F**'i yakalayıp
  arama input'una `focus()` çağırıyor (input placeholder'ında da
  "(Ctrl+F)" ipucu var) — tarayıcı/OS'in kendi bul çubuğuyla çakışmıyor
  çünkü `frame:false` + `contextIsolation` altında bu bir Electron
  penceresi, native "sayfada bul" yok.
- **Modallerde Esc ile kapatma** — `CredentialsModal`, `AddSystemModal`,
  `SettingsModal`, `ConfirmDialog`'un hepsine `onKeyDown` ile `Escape` →
  `onClose`/`onCancel` eklendi (form için zaten Enter=submit vardı, artık
  simetrik).
- **Yeni/düzenlenen manuel sistemi otomatik seçme** — `AddSystemModal`'ın
  `onAdded` imzası `() => void`'den `(id: string | null) => void`'e
  değişti; `addManualSystem`/`updateManualSystem`'ın döndürdüğü gerçek
  `ManualSystem.id`'yi App'e taşıyor. `App.tsx`'te `pendingSelectUuid`
  state'i + `flatSystems` değiştiğinde bu uuid'i arayan bir `useEffect` —
  `refresh()` sonrası landscape yeniden yüklenip o sistem ağaçta
  belirdiğinde otomatik olarak `selection`'a atanıyor (kullanıcı ekleme/
  düzenleme sonrası sistemi tekrar ağaçta arayıp tıklamak zorunda değil).
- Bu iyileştirmeler için `src/lib/tier.ts`/`landscape.ts` gibi mevcut
  yardımcı dosya yapısı korundu, yeni component'ler (`ConfirmDialog.tsx`,
  `CopyButton.tsx`) tek amaçlı ve bağımsız — başka modallerde de tekrar
  kullanılabilir. `npm run typecheck` ve `npm run build` temiz geçti.

## Kullanılabilirlik + Performans + Açılış Hızı — Üçüncü Tur (2026-08-14, TAMAMLANDI)

- **Tree'de klavye navigasyonu** — `Tree.tsx` baştan yazıldı: her
  `TreeNode`'un kendi içinde tuttuğu `expanded` local state'i, `Tree`
  seviyesine `expandedOverrides: Record<uuid, boolean>` olarak taşındı
  (`isExpandedFn(uuid, depth) => expandedOverrides[uuid] ?? depth < 1` —
  varsayılan davranış aynı: üst seviye açık, alt seviyeler kapalı).
  Bu, render sırasıyla **birebir aynı** bir düz liste (`FlatRow[]`)
  üretmemizi sağlıyor (`buildFlatRows()` — `getVisibleChildren`/
  `getVisibleItems` helper'ları TreeNode'un kendisiyle de paylaşılıyor,
  filtreleme/sıralama mantığı iki yerde ayrı yaşamıyor). Klavye:
  - **↑/↓**: bir önceki/sonraki satıra `focusedUuid`'i taşır, gerekirse
    `rowRefs` (uuid → DOM element `Map`) üzerinden `scrollIntoView`.
  - **→/←**: odaktaki klasörü aç/kapat.
  - **Enter/Space**: klasörse aç/kapat, sistemse `onSelect` (bağlı
    davranış `handleSelect` ile aynı, `path`/`itemUuid` sözleşmesi
    korunuyor).
  - Fare tıklamaları da `focusedUuid`'i güncelliyor (`handleSelectRow`/
    `toggleExpand` sarmalayıcıları) — mouse ve klavye navigasyonu
    birbirini kesintisiz devam ettirebiliyor. Odaktaki satır `ring-1
    ring-accent-400/70` ile görsel olarak belirtiliyor (seçili satırın
    `bg-accent-500/20` arka planından ayrı bir gösterge).
  - Kapsam dışı bırakıldı: `RecentSystems` listesi (küçük, 5 öğe,
    öncelik değil).
- **SystemPanel'de "Son bağlantı" satırı** — `App.tsx`'te `lastConnectedAt`
  (useMemo, seçili sistemin `config.connectionHistory`'deki kaydı)
  hesaplanıp `SystemPanel`'e prop olarak geçiliyor; `src/lib/time.ts`
  `formatRelativeTime()` (yeni, bağımlılıksız — Intl.RelativeTimeFormat
  kullanmadan basit eşik tabanlı Türkçe biçimlendirme: "az önce", "X
  dakika/saat/gün/ay/yıl önce") ile gösteriliyor. Hiç bağlanılmamışsa
  "Henüz bağlanılmadı" yazıyor.
- **Toast'larda tıkla-kapat + tekrar mesaj gruplama** — `Toast.tsx`:
  toast'a tıklamak artık `onDismiss`'i hemen tetikliyor (4.5s beklemeden).
  `ToastMsg`'e `count`/`version` alanları eklendi; `App.tsx` `pushToast()`
  art arda **aynı kind+text** ile çağrılırsa yeni bir toast eklemek yerine
  mevcut olanın `count`'unu artırıp `version`'ını bump'lıyor (Toast'ın
  `useEffect` timer'ı `[toast.id, toast.version]`'a bağlı olduğu için bu
  otomatik olarak 4.5s'lik geri sayımı sıfırlıyor). Sağ altta "×3" gibi bir
  rozet gösteriliyor — art arda "yeniden yükleniyor" gibi tekrar eden
  mesajlerin ekranı toast yığınıyla doldurmasını önlüyor.
- **Performans — connectivity taraması render fırtınası düzeltmesi** —
  Kök sebep: her sistemin connectivity sonucu için ayrı bir
  `setConnectivity(prev => ...)` çağrısı, App'in (ve altındaki TÜM
  ağacın) o sonuçta bir kez yeniden render olmasına yol açıyordu — 100+
  sistemli bir landscape'te açılışta 100+ art arda, çoğu birbirine çok
  yakın zamanlı render demekti. Çözüm: `App.tsx`'e
  `pendingConnectivityRef` (mutable ref, anlık state değil) +
  `setConnectivityBatched(uuid, state)` eklendi — sonuçlar bu ref'te
  biriktirilip **150ms'lik bir pencerede tek bir `setState` çağrısıyla**
  flush ediliyor (`flushConnectivity`, `window.setTimeout` ile debounce).
  Render sayısı O(sistem sayısı)'ndan O(toplam tarama süresi / 150ms)'e
  düşüyor — pratikte onlarca render yerine birkaç render. `handleCheck`
  (manuel "Yeniden Kontrol Et" — tek sistem, düşük frekans) kasıtlı olarak
  eski doğrudan `setConnectivity` davranışında bırakıldı, oradaki gecikme
  hissedilmez ve basitlik tercih edildi.
- **Açılış hızı — ana sebep: senkron ağ dosya okuması** — `sapLandscape.ts`
  `readFileSync` ile SAPUILandscape.xml'i VE onun `<Includes>` altındaki
  **her bir network Include dosyasını sırayla, senkron** okuyordu.
  Electron main process tek thread'lidir — bu okuma bir ağ paylaşımına
  (SAP Common merkezi landscape dosyası, kurumsal ortamlarda çok yaygın)
  işaret ediyorsa ve VPN kapalı/yavaşsa, Windows'un varsayılan UNC
  timeout'u onlarca saniyeye kadar çıkabilir — bu süre boyunca **TÜM
  uygulama** (pencere sürükleme, buton tıklamaları, IPC, her şey) donar.
  Bu, "uygulama çok yavaş/geç açılıyor" şikayetinin en olası kök sebebiydi.
  Çözüm (`sapLandscape.ts` baştan yazıldı):
  1. Tüm `fs` okumaları `node:fs/promises` ile **async**'e çevrildi
     (`safeReadXml`, `loadRawServices`, `loadLandscape`,
     `getServiceCredentials` artık `Promise` döndürüyor) — main process'in
     event loop'unu artık bloklamıyor, okuma sürerken pencere/IPC/diğer
     her şey tepkimeye devam ediyor.
  2. Her include dosyası için **4 saniyelik sabit bir üst sınır**
     (`INCLUDE_TIMEOUT_MS`, `withTimeout()` — `Promise.race` benzeri bir
     saf-JS timeout wrapper) eklendi: bir include bu süre içinde
     okunamazsa sessizce yoksayılıyor (asıl I/O arka planda tamamlanmaya
     devam eder ama sonucu artık beklenmiyor) — tek bir ulaşılamayan ağ
     yolu artık tüm landscape yüklemesini kilitleyemez.
  3. Include dosyaları artık **sırayla değil `Promise.all` ile paralel**
     okunuyor — N adet include varsa toplam süre (yaklaşık) en yavaş
     tekil okuma kadar, N × okuma süresi değil.
  4. `index.ts`'teki `landscape:get`/`credentials:getDefaults` IPC
     handler'ları `async`'e çevrildi (`ipcMain.handle` zaten Promise
     dönen handler'ları destekliyor, ek bir değişiklik gerekmedi).
  - **Not**: `app.disableHardwareAcceleration()` (`index.ts:35`)
    kasıtlı olarak dokunulmadı — bu satırın kaldırılması bazı
    VDI/Citrix/uzak masaüstü ortamlarında (SAP danışmanlarının sık
    kullandığı bir kurulum türü) GPU sürücüsü sorunlarına bağlı
    kararsızlık/siyah ekran riskini geri getirebilir; kanıtlanmış bir
    fayda olmadan bu riski almadık. Asıl darboğaz (senkron ağ I/O) zaten
    yukarıdaki değişikliklerle çözüldü.
  - `npm run typecheck` ve `npm run build` bu turun tamamı için temiz
    geçti.

## Gömülü Terminal — DENENDİ VE TAMAMEN KALDIRILDI (2026-08-14)

Uygulama içinde (VS Code benzeri) bir terminal paneli denendi: önce
`child_process` pipe tabanlı sahte bir terminal, ardından `koffi` ile Win32
ConPTY API'sine (`CreatePseudoConsole`) doğrudan FFI çağrıları. Standalone
Node test script'lerinde ConPTY akışı (`CreatePipe` → `CreatePseudoConsole`
→ `UpdateProcThreadAttribute` → `CreateProcessW` → `ReadFile.async`) her
denemede çalışıp gerçek `cmd.exe` çıktısı üretti — ama gerçek Electron main
process'i içinde çalıştırıldığında panel her zaman simsiyah kaldı (`ReadFile`
hiçbir zaman veri/EOF döndürmedi, process `pid`'i oluşuyordu ama hiçbir I/O
yapmıyordu). Birden fazla kök sebep denendi ve düzeltildi
(`UpdateProcThreadAttribute`'a handle'ın adresi değil kendisi geçirilmeli;
`bInheritHandles=FALSE` olmalı; `CREATE_NO_WINDOW` eklenmemeli — Microsoft'un
resmi örneğiyle tam eşleştirildi) ve her düzeltme standalone test
script'inde doğrulandı, AMA gerçek uygulamada sorun kullanıcı tarafından
tekrar tekrar "hâlâ siyah ekran" olarak bildirildi — kök sebep bu ortamda
(sandbox, GUI etkileşimi olmadan) kesin olarak teşhis edilemedi.

**(2026-08-14, İKİNCİ DENEME — `node-pty` ile TEKRAR EKLENDİ, bkz. alt bölüm)**
bu bölümün altındaki geri-alma anlatımı hâlâ geçerli bir **kök sebep dersi**:
elle yazılmış FFI/ConPTY kodu (o zamanki `koffi` yaklaşımı) gerçek Electron
main process'inde asla veri akıtmadı. Aşağıdaki yeni deneme bunu **elle FFI
yazmadan**, VS Code'un da kullandığı endüstri standardı `node-pty` (N-API,
`node-addon-api` ile derlenmiş, ABI'ye bağımlı olmayan prebuilt binary)
kütüphanesiyle yapıyor — gerçek Electron 33 main process içinde `pty.spawn()`
ile açılan bir `cmd.exe`'nin `echo` çıktısı gerçekten okunup doğrulandı
(bkz. altta "node-pty ile gömülü terminal — YENİDEN EKLENDİ" bölümü).

Kullanıcı talebiyle özellik daha önce TAMAMEN GERİ ALINMIŞTI (aşağıdaki
anlatım o dönemin kaydıdır):
- Silinen dosyalar: `app-electron/main/terminalManager.ts`,
  `src/components/EmbeddedTerminal.tsx`, `src/components/TerminalPanel.tsx`,
  `src/lib/terminalInstances.ts`, `src/lib/terminalTheme.ts`.
- `shared/types.ts`/`preload/index.ts`/`window.d.ts`/`App.tsx`/
  `SettingsModal.tsx`/`store.ts`/`launcher.ts`'teki tüm terminal IPC/state/UI
  parçaları kaldırıldı (`TerminalMode` artık sadece `"wt" | "cmd"`,
  `ConnectResult.title` kaldırıldı, `AppConfig.embeddedTerminalMigrationDone`
  kaldırıldı).
- `koffi`, `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
  `package.json`'dan çıkarıldı.

**Terminal artık her zaman harici bir pencerede açılıyor**
(`TerminalMode = "wt" | "cmd"`, varsayılan Windows Terminal varsa `"wt"`
yoksa `"cmd"`) — bu, özellik eklenmeden önceki, kanıtlanmış çalışan
davranış. **(GÜNCEL DEĞİL — bkz. altta "node-pty ile gömülü terminal —
YENİDEN EKLENDİ" bölümü, bu davranış 2026-08-14'te tekrar değiştirildi.)**

**Eğer ileride gömülü terminal tekrar denenirse (elle FFI/ConPTY ile)**:
gerçek bir Electron GUI penceresinde elle test etme imkanı olmadan (bu
ortamda mümkün değil) bu özelliğe TEKRAR GİRİŞİLMESİN — standalone script
başarısı burada YETERLİ KANIT değil, gerçek uygulamada tekrar tekrar
başarısız oldu. **Bu uyarı sadece elle yazılmış FFI/ConPTY yaklaşımı için
geçerlidir** — `node-pty` (N-API tabanlı, prebuilt) ile deneme headless
Electron main process testinde gerçek veri akıtarak doğrulandı (aşağıya
bak), bu yüzden tekrar denendi ve bu sefer main process seviyesinde
kanıtlandı.

## node-pty ile gömülü terminal — YENİDEN EKLENDİ (2026-08-14, TAMAMLANDI)

Kullanıcı "harici terminal açılmasın, tamamen uygulama içine gömülü olsun"
talebiyle özelliği tekrar istedi. Önceki başarısızlığın kök nedeni **elle
yazılmış Win32 ConPTY FFI kodu** (`koffi`) olduğu için bu sefer **hiçbir
FFI/ConPTY kodu elle yazılmadı** — VS Code'un/Hyper'ın da kullandığı
endüstri standardı **`@lydell/node-pty`** (Microsoft'un resmi `node-pty`
paketinin, platforma göre ayrılmış prebuilt binary'lerle dağıtılan forku)
kullanıldı:

- **Neden `node-gyp` ile derleme değil**: Bu makinede Visual Studio Build
  Tools kurulu değil, `npm install node-pty` doğrudan `node-gyp rebuild`
  ile patladı (`Could not find any Visual Studio installation`).
  `@lydell/node-pty` bunun yerine platforma özel prebuilt `.node`
  binary'lerini ayrı `optionalDependencies` paketleri olarak dağıtıyor
  (`@lydell/node-pty-win32-x64` gibi) — derleme gerektirmiyor, `npm install`
  sırasında doğrudan indirilip kopyalanıyor.
- **Neden Electron'da rebuild gerekmiyor**: `node-pty` (ve dolayısıyla
  `@lydell/node-pty`) **N-API** (`node-addon-api`, `NODE_API_MODULE`) ile
  derleniyor — bu, V8/NAN'e bağlı eski native modüllerin aksine ABI'ye
  bağımlı değil, context-aware'dir. Aynı prebuilt binary Node.js'te de
  Electron'un gömülü Node'unda da değişiklik gerektirmeden çalışır. Bu,
  önceki `koffi` denemesinden **temel farkı** — `koffi` de teknik olarak
  FFI kullanıyordu ama ConPTY çağrılarının kendisi elle (yanlış/eksik
  bir şekilde, kök sebebi asla teşhis edilemeyen) yazılmıştı; burada
  ConPTY'yi çağıran C++ kodu Microsoft'un kendi, yıllarca üretimde test
  edilmiş `node-pty` kaynağı.
- **Gerçek doğrulama (bu turun en kritik adımı)**: Sadece "standalone Node
  script'inde çalıştı" demekle YETİNİLMEDİ (önceki turun tam olarak
  düştüğü tuzak buydu). Paketlenmiş bir `electron-builder --win dir` build
  alındı, `.node` binary'lerinin `app.asar.unpacked/` altına doğru
  paketlendiği doğrulandı (`asarUnpack: ["node_modules/@lydell/**/*"]`
  gerekli — asar içine sıkıştırılmış native binary Node tarafından
  `dlopen` edilemez), ve **gerçek `electron` runtime'ı ile** (`npx electron
  <script>.cjs`, `app.whenReady()` içinde) bir `.cjs` test script'i
  çalıştırılıp `pty.spawn("cmd.exe", ...)` ile açılan process'e `echo
  HELLO_FROM_PTY` yazılıp çıktıda gerçekten göründüğü teyit edildi
  (`CONTAINS_HELLO true`, `PTY_EXIT 0`) — yani gerçek Electron main
  process'inde ConPTY üzerinden veri **hem yazılabildi hem okunabildi**,
  önceki `koffi` denemesinin tam olarak başarısız olduğu nokta bu.
  Test dosyası doğrulama sonrası silindi, kalıcı bir parça değil.
- **`package.json:"type":"module"` gotcha'sı**: Test script'i önce `.js`
  uzantısıyla yazılıp `npx electron` ile çalıştırılınca "require is not
  defined in ES module scope" hatası verdi (proje `"type": "module"`) —
  `.cjs` uzantısına çevrilince sorunsuz çalıştı. Bu, gerçek uygulama
  kodunu etkilemiyor (electron-vite zaten doğru module formatında derliyor)
  ama ileride benzer bir ad-hoc Node/Electron test script'i yazılırsa bu
  gotcha'yı tekrar keşfetmeye gerek yok.

### Mimari

- **`app-electron/main/terminalManager.ts`** (yeni) — `Map<sessionId,
  pty.IPty>` tutar. `createTerminal(window, id, cwd, cols, rows, shell,
  initialCommand)` bir `pty.spawn()` açar, `onData`'yı
  `window.webContents.send("terminal:data", id, data)` ile renderer'a
  akıtır, `onExit`'i `"terminal:exit"` ile bildirir. `writeTerminal`,
  `resizeTerminal`, `disposeTerminal`, `disposeAllTerminals` (pencere/app
  kapanırken tüm process'leri temizler — zombi `cmd.exe` kalmasın diye).
- **IPC** (`main/index.ts`): `terminal:create` (invoke, id döner),
  `terminal:write`/`terminal:resize` (`ipcMain.on`, fire-and-forget — her
  tuş vuruşunda `invoke` round-trip'i gereksiz), `terminal:dispose`
  (invoke). `window-all-closed`/`before-quit`'te `disposeAllTerminals()`
  çağrılıyor.
- **`preload/index.ts`** → **`src/window.d.ts`** zincirine
  `createTerminal`/`writeTerminal`/`resizeTerminal`/`disposeTerminal`/
  `onTerminalData`/`onTerminalExit` eklendi (standart `shared/types.ts`
  zinciri kontrol listesi burada da uygulandı).
- **`src/components/EmbeddedTerminal.tsx`** (yeni) — `@xterm/xterm` +
  `@xterm/addon-fit`. `ResizeObserver` ile container boyutu değiştiğinde
  `fit()` + `resizeTerminal` IPC çağrısı; `onData`/`onTerminalData`
  event'leri iki yönlü veri akışını kurar.
- **`src/components/TerminalPanel.tsx`** (yeni) — VS Code tarzı alt panel:
  birden fazla terminal sekmesi (`TerminalSessionInfo[]`), aç/kapat
  toggle'ı, `onMouseDown` ile sürüklenebilir yeniden boyutlandırma
  (`MIN_TERMINAL_HEIGHT=160`, `MAX_TERMINAL_HEIGHT=720`,
  `DEFAULT_TERMINAL_HEIGHT=320`). Her sekme kendi `EmbeddedTerminal`
  instance'ını `display: none` ile arka planda canlı tutuyor (unmount
  edilmiyor) — sekme değiştirince xterm.js state'i (scrollback, vs.)
  kaybolmasın diye.
- **`App.tsx`**: `openTerminalForConnection(projectDir, title)` —
  `connectToSystem` başarılı `ConnectResult` döndürdüğünde artık
  **harici terminal açmıyor**, bunun yerine `window.api.createTerminal()`
  çağırıp dönen `sessionId`'yi `terminalSessions`'a ekliyor ve paneli
  otomatik açıyor. `handleCloseTerminal`, `handleToggleTerminalPanel`,
  `handleTerminalResizeStart` (mouse sürükleme, `window.addEventListener`
  ile global mousemove/mouseup, `MAX/MIN_TERMINAL_HEIGHT` clamp).
- **`launcher.ts`**: `launchTerminal()`/`launchWithCmd()`
  (`spawn("wt.exe"/"cmd.exe", ...)` ile harici pencere açan kod)
  **tamamen kaldırıldı** — `connectToSystem()` artık hiçbir terminal
  açmıyor, sadece `.conn_adt`/`sap-context.md`/skill kurulumu yapıp
  `ConnectResult`'ı döndürüyor; terminali açma sorumluluğu tamamen
  renderer'a (`App.tsx`) taşındı.
- **`shared/types.ts`**: `TerminalMode` `"wt" | "cmd"` → `"cmd" |
  "powershell"` oldu (artık harici pencere programı değil, gömülü
  terminalin kullanacağı **kabuk** seçimi). `store.ts`'teki
  `detectWindowsTerminal()` (wt.exe varlığını arayan kod) kaldırıldı —
  gömülü terminalin `wt.exe`'ye ihtiyacı yok, varsayılan artık düz
  `"cmd"`. Eski config dosyalarında `terminal: "wt"` kalmışsa
  `loadConfig()` bunu sessizce `"cmd"`ya düşürüyor
  (`VALID_TERMINAL_MODES` allow-list kontrolü).
- **`SettingsModal.tsx`**: "Terminal" seçici artık "Windows Terminal/
  cmd.exe" (harici pencere) değil, "cmd.exe/PowerShell" (gömülü terminalin
  kabuğu) sunuyor; açıklama metni güncellendi.

### Build/paketleme detayı (kritik — atlanırsa native modül çalışmaz)

`package.json` `build.files`'a `"node_modules/@lydell/**/*"` ve
`build.asarUnpack`'e aynı glob eklendi. **Sebep**: electron-builder
varsayılan olarak tüm `app`'i `app.asar` içine sıkıştırır; Node'un
`dlopen`/`process.dlopen` çağrısı asar içindeki bir `.node` dosyasını
doğrudan açamaz (asar salt-okunur bir sanal dosya sistemidir, native
binary'ler gerçek bir dosya tanıtıcısı ister). `asarUnpack` bu belirli
yolları asar'ın yanına `app.asar.unpacked/` altına **gerçek dosya olarak**
kopyalar — `require("@lydell/node-pty")` çalışma zamanında oraya
yönleniyor. Bu adım atlanırsa paketlenmiş (`build:win`) uygulamada
"Cannot find module" veya native binary yükleme hatası alınır (dev'de
`npm run dev` asar kullanmadığı için bu hata **sadece paketlenmiş build'de
ortaya çıkar** — bu yüzden bu adım özellikle kolay unutulur/atlanır).

**Test durumu**: `npm run typecheck`, `npm run build`, ve
`npx electron-builder --win dir` (native modülün gerçek `@electron/rebuild`
adımından geçip `app.asar.unpacked/node_modules/@lydell/node-pty/
node_modules/@lydell/node-pty-win32-x64/conpty.node` olarak paketlendiği
doğrulandı) hepsi temiz geçti. Gerçek Electron runtime'ında (headless,
GUI olmadan) `pty.spawn` + veri okuma/yazma canlı test edildi (yukarıda
detaylı). **Gerçek bir GUI penceresinde xterm.js render'ının görsel olarak
doğru göründüğü** (font, renk, resize, scrollback) bu ortamda test
edilemedi — kullanıcının `release/win-unpacked/aXet SAP Launcher.exe`'yi
çalıştırıp bir sisteme bağlanarak görsel olarak doğrulaması gerekiyor.
Ancak önceki turun tam olarak düştüğü "process açılıyor ama I/O hiç
akmıyor" tuzağı bu sefer **main process seviyesinde kanıtlanarak** aşıldı
— bu, kalan riski "kozmetik/render" seviyesine indiriyor, "hiç çalışmıyor"
seviyesinden çok daha düşük bir risk.

## Uygulama İkonu / Logo (2026-08-14, TAMAMLANDI) — özgün tasarım + gömme bug'ı

**Logo**: `build/icon.svg` özgün bir tasarımla değiştirildi (Electron'un
jenerik varsayılan ikonu ya da lucide-react "Sparkles" ikonu değil) —
motif: SAP sistem ağacını temsil eden iki "yaprak" düğüm, merkezdeki
amber/aktif düğüme bağlı, oradan yukarı fırlayan bir "launch" oku
(indigo→cyan→amber gradyan, `#0b1024`→`#1d2a5e` koyu zemin). `build/icon.png`
(512×512) ve `build/icon.ico` (16/24/32/48/64/128/256 multi-res) bu SVG'den
`sharp` + `png-to-ico` ile yeniden üretildi (geçici araçlar, kalıcı bağımlılık
değil — üretim script'i kullanım sonrası silindi). Uygulama içi başlık
çubuğunda (`TitleBar.tsx`) da **aynı** logo (`src/assets/logo.svg`, `.svg`
olarak Vite üzerinden import ediliyor, `src/assets.d.ts`'te `declare module
"*.svg"` tip tanımı eklendi) gösteriliyor — daha önce burada gerçek logo
değil, lucide-react'in "Sparkles" ikonu vardı, kullanıcı "uygulama içindeki
logo ile taskbar'daki aynı değil" diye fark etti, düzeltildi.

**Bug — paketlenmiş exe'de hep Electron'un varsayılan ikonu görünüyordu**:
`package.json`'da `win.signAndEditExecutable: false` ayarlıydı (muhtemelen
daha önce bir build hatasını atlatmak için eklenmiş). electron-builder'ın
kaynak kodunda (`app-builder-lib/out/winPackager.js`) ikon gömme (`rcedit
--set-icon`) ve kod imzalama **aynı fonksiyonda birleşik**
(`signAndEditResources`, sadece `signApp()` üzerinden çağrılıyor) — bu
bayrak `false` olunca ikisi birden atlanıyor, imzalama sertifikası
olmasa bile ikon hiç gömülmüyor. `dir`/`portable`/`nsis` hedeflerinin
hepsi bu ortak adımı paylaşıyor, `dir` hedefine özgü bir davranış değil.

**Neden bu bayrak `false` bırakıldı (kaldırılamaz)**: `signAndEditExecutable:
true` yapılınca electron-builder Windows'ta bile `winCodeSign` paketini
(macOS darwin dylib'leri içeren bir 7z arşivi — Windows imzalamayla
alakasız görünse de signtool tespit mantığı bunu indirmeye çalışıyor)
indirip açmaya çalışıyor; bu makinede sembolik link oluşturma yetkisi
olmadığı için (`ERROR: Cannot create symbolic link : A required privilege
is not held by the client`) 7z çıkarma adımı düzenli olarak patlıyor,
build tamamen başarısız oluyor. Bu ortamda (ve muhtemelen kısıtlı
yetkili kurumsal Windows makinelerinde genel olarak) `signAndEditExecutable:
true` **kullanılamaz**.

**Çözüm — `build/afterPack.cjs` (yeni, `package.json`'da `build.afterPack`
hook'u olarak kayıtlı)**: electron-builder'ın imzalama/rcedit adımından
**tamamen bağımsız**, saf JS `pe-library` + `resedit` (ikisi de
electron-builder'ın zaten transitive bağımlılığıydı, `package.json`
devDependencies'e açıkça eklendi — Wine/winCodeSign/signtool'a hiç
dokunmuyorlar) ile paketlenmiş `.exe`'nin PE kaynak bölümündeki mevcut
ikon grubunu (`ResEdit.Resource.IconGroupEntry.fromEntries` ile bulunup,
her grup id/lang için `replaceIconsForResource` ile) doğrudan
`build/icon.ico`'daki ikonlarla değiştiriyor, `exe.generate()` ile
binary'yi yeniden yazıyor. Bu hook `dir` hedefinin çıkardığı ana app exe'sine
çalışıyor; `portable`/`nsis` stub'ları electron-builder'ın **ayrı bir**
ikon mekanizmasını (7z/NSIS `%ICON%` substitution) kullandığı için zaten
`signAndEditExecutable`'dan etkilenmiyorlardı ve düzeltmeden önce de doğru
ikonu gösteriyorlardı — sadece ana uygulama exe'si (`dir` çıktısı, ve
`portable`/`nsis`'in içine paketlediği asıl app) yanlıştı.

**Doğrulama**: `npm run build:win` (dir+portable+nsis üçü birden) baştan
sona hatasız tamamlandı, `[afterPack] Özel ikon gömüldü: ...` logu
görüldü, imzalama adımı sertifika olmadığı için beklenen şekilde
"no signing info identified, signing is skipped" ile sessizce atlandı
(hata değil). Üç çıktının hepsinden (`win-unpacked/*.exe`,
`*-portable.exe`, NSIS installer'ın paketlediği app) PowerShell
`System.Drawing.Icon.ExtractAssociatedIcon` ile ikon çıkarılıp görsel
olarak bizim logomuz olduğu (Electron'un varsayılanı değil) doğrulandı.

**Gelecekte dokunma/genişletme notu**: `win.signAndEditExecutable`'ı tekrar
`true` yapmayı DENEME — bu ortamda garanti patlıyor. İkon/versiyon
metadata'sını değiştirmek gerekirse `build/afterPack.cjs`'i genişlet
(`resedit`'in `Resource.VersionInfo` API'siyle ProductName/FileDescription
de aynı hook'ta ayarlanabilir, henüz yapılmadı çünkü gerek yoktu).

## Dosya Gezgini + Dosya Önizleme Paneli (2026-08-19, TAMAMLANDI)

Kullanıcı talebi: "VS Code'daki explorer gibi bir dosya ağacı ve dosyaları
(docx, txt vb.) uygulama içinde önizleme". Mimari:

- **`app-electron/main/launcher.ts`**: `connectToSystem()`'ın başındaki
  proje klasörü path hesaplama mantığı (`customerPath`+`systemId` →
  `sanitizeSegment` → `path.join`) saf bir fonksiyona çıkarıldı:
  **`computeProjectDir(config, customerPath, service)`** (export edildi,
  `connectToSystem` da artık bunu çağırıyor — mantık iki yerde yaşamıyor).
  Bu, Dosya Gezgini'nin bir sisteme **henüz bağlanılmamış olsa bile** o
  sistemin proje klasör yolunu (gerçek bağlantı/doğrulama yapmadan)
  bilmesini sağlıyor.
- **`app-electron/main/fsExplorer.ts`** (yeni) — tüm dosya sistemi
  IPC'lerinin gerçek implementasyonu:
  - `isPathAllowed(config, targetPath)` — **güvenlik sınırı**: renderer'dan
    gelen HERHANGİ bir path, `config.projectsBaseDir`'in altında değilse
    reddedilir (`path.relative` ile `..` kontrolü). Bu, contextIsolation
    altında olsa da renderer'a bilgisayardaki *rastgele* dosyaları okuma
    yetkisi vermemek için — Dosya Gezgini kasıtlı olarak sadece bu
    uygulamanın kendi oluşturduğu proje klasörleriyle sınırlı.
  - `listDir(dirPath)` — tek seviye listeleme (klasörler önce, sonra
    dosyalar, TR locale sıralama) — VS Code tarzı **lazy/tembel** yükleme
    için (tüm alt ağacı önceden taramaz, sadece açılan klasörün içeriği
    çekilir).
  - `readTextFile(filePath)` — ilk 8000 byte'ta null byte var mı kontrolü
    ile binary/text ayrımı yapar (binary ise düzgün bir hata döner, çökmez);
    2MB üstü dosyalarda `truncated: true` ile ilk 2MB gösterilir.
  - `readDocxFile(filePath)` — **`mammoth`** (yeni npm bağımlılığı, pure JS,
    native binding YOK) ile `.docx`'i HTML'e çevirir
    (`mammoth.convertToHtml({path})`). Native olmadığı için `@lydell/node-pty`
    gibi `asarUnpack` gerekmiyor — `app.asar` içinden direkt çalışıyor
    (paketli build'de doğrulandı, bkz. altta).
  - `readImageDataUrl(filePath)` — resmi base64 data URL'e çevirir (15MB üst
    sınır), renderer'da `<img src="data:...">` ile gösterilir.
  - `openInExplorer`/`openExternal` — `shell.showItemInFolder`/
    `shell.openPath` (PDF/Excel/PowerPoint/zip gibi uygulama içinde
    önizlenemeyen türler için).
- **IPC** (`main/index.ts`): `project:resolveDir`, `fs:listDir`,
  `fs:readTextFile`, `fs:readDocx`, `fs:readImageDataUrl`,
  `fs:openInExplorer`, `fs:openExternal` — hepsi `isPathAllowed` kontrolünden
  geçiyor (dosya okuyan/açan handler'lar, `project:resolveDir` sadece path
  hesapladığı için istisna). Standart zincir (`shared/types.ts` →
  `preload/index.ts` → `src/window.d.ts`) burada da uygulandı.
- **`src/components/FileExplorer.tsx`** (yeni) — `Tree.tsx`'in SAP
  landscape'ine özgü veri modelinden tamamen bağımsız, genel amaçlı bir
  dosya ağacı: her klasörün içeriği `childrenByPath: Record<path,
  FsEntry[] | "loading" | "error">` cache'inde tutulur, sadece açılan
  klasör için `fs:listDir` çağrılır. Kök klasör yoksa (sisteme henüz
  bağlanılmamış) kullanıcıya "önce axet.code'da Aç" mesajı gösterilir.
- **`src/components/FileViewer.tsx`** (yeni) — uzantıya göre dallanma:
  `.docx` → mammoth HTML'i (`dangerouslySetInnerHTML`, sadece yerel/güvenilir
  içerik olduğu için risk yok), resim uzantıları → `<img>`, `.pdf`/`.xlsx`/
  `.pptx`/`.zip`/`.exe` → kasıtlı olarak "unsupported" (Chromium'un iframe
  içinde PDF render davranışı ortama göre değişken olduğu için güvenli
  tarafta kalındı, harici aç önerilir), her şey başka (kaynak kodu, `.conn_adt`,
  uzantısız dosyalar dahil) → önce metin olarak denenir, ikiliyse
  `readTextFile` kendisi hata döner ve "unsupported" görünümüne düşülür.
- **`App.tsx`**: `projectDir` state'i (seçili sistem değişince
  `resolveProjectDir` ile yeniden hesaplanır), `openFiles`/`activeFilePath`
  (dosya sekmeleri — sistem değişince otomatik temizlenir). Layout: sağ
  panelin İÇİNE, sistem detayının SOLUNA yeni bir resizable `FileExplorer`
  sidebar'ı eklendi (mevcut sol SAP-sistem sidebar'ından ayrı, bağımsız
  genişlik state'i — `explorerWidth`/`MIN_EXPLORER_WIDTH`/
  `MAX_EXPLORER_WIDTH`, sol sidebar'ın resize deseniyle birebir aynı).
  Dosya seçilince üstte VS Code tarzı bir sekme çubuğu belirir ("Sistem
  Detayı" + açık dosyalar), sekme kapatma/seçme mevcut `TerminalPanel`
  sekme desenine bilinçli olarak benzetildi (tutarlılık için).
- **Paketleme**: `mammoth` `package.json`'a normal bir `dependencies` girişi
  olarak eklendi (native binding yok, `@lydell/node-pty` gibi özel
  `asarUnpack`/`files` girişine ihtiyacı yok — `fast-xml-parser` gibi
  electron-builder'ın node_modules'ü otomatik toplama mekanizmasına
  güvenildi). `npx asar list` ile paketlenmiş `app.asar` içinde
  `node_modules/mammoth`'un gerçekten var olduğu doğrulandı; `main/index.ts`
  içinde `await import("mammoth")` (dinamik import, `externalizeDepsPlugin`
  tarafından bundle'a gömülmeden "external" bırakılıyor — `fast-xml-parser`
  hariç tüm dependencies'in varsayılan davranışı) çalışma zamanında gerçek
  Node `import()` ile çözülüyor, doğrulandı (`node -e "import('mammoth')..."`
  başarılı).
- **Test durumu**: `npm run typecheck`, `npm run build`, ve
  `npm run build:win` (dir+portable+nsis) hepsi temiz geçti. Gerçek bir GUI
  penceresinde dosya ağacında gezinme/dosya önizleme **görsel olarak**
  bu ortamda test edilemedi — kullanıcının paketlenmiş exe'yi çalıştırıp
  bir sisteme bağlanarak (veya zaten bağlanmış bir sistemi seçerek)
  Dosya Gezgini'nde `.docx`/`.txt`/resim dosyalarını açması gerekiyor.

## Gömülü Terminalde Ctrl+V Yapıştırma — Kalan Hata Düzeltildi (devam)

Önceki tur (yukarıdaki node-pty bölümü) Ctrl+V'yi `attachCustomKeyEventHandler`
ile yakalayıp `preload`'ın kendi izole dünyasında `clipboard.readText()`
çağırarak `term.paste()`'e veriyordu; kod içinde bunu ana süreçteki
`debug:clipboardMain` ile karşılaştıran debug log'ları bırakılmıştı — bu,
preload-taraflı okumanın ara sıra güncel olmayan/boş sonuç verdiğinden
şüphelenildiğinin bir işaretiydi ve kullanıcı yapıştırmanın hâlâ çalışmadığını
bildirdi. Çözüm: pano okuma tamamen **ana sürece** taşındı —
`clipboard:readText` IPC handler'ı (`main/index.ts`, eski `debug:clipboardMain`
yeniden adlandırıldı) tek okuma kaynağı; `preload/index.ts`'teki
`readClipboardText` artık senkron `clipboard.readText()` değil, bu IPC'yi
`invoke` eden bir `Promise<string>`. `EmbeddedTerminal.tsx`'teki
`pasteFromClipboard` `async`'e çevrildi, tüm debug `console.log`'ları
kaldırıldı. Ayrıca `isPasteCombo` tespiti artık sadece `event.key === "v"`'ye
değil, `event.code === "KeyV"`'ye de bakıyor (bazı klavye düzeni/IME
durumlarında `key` beklenmedik değer üretebiliyor, `code` fiziksel tuş
konumuna dayandığı için ek güvence sağlıyor). `shared/types.ts`/`window.d.ts`
zinciri güncellendi (`debugClipboardMain` kaldırıldı, `readClipboardText`
tipi `Promise<string>` oldu). `npm run typecheck` ve `npm run build` temiz
geçti. **Not**: Bu değişiklik henüz gerçek bir GUI penceresinde canlı test
edilmedi (bu ortamda mümkün değil) — kullanıcının paketlenmiş/dev build'de
gerçek bir Ctrl+V denemesi yapması gerekiyor; sorun tekrar ederse
`clipboard:readText` IPC'sinin main process konsol log'una (varsa) veya
`pasteFromClipboard`'daki `catch` bloğuna bakılmalı.

## GÖMÜLÜ TERMİNAL CTRL+V — GERÇEK KÖK SEBEP VE KALICI ÇÖZÜM (2026-08-19, canlı test edildi, TAMAMLANDI)

Yukarıdaki tur hâlâ **yanlış teşhisti** — kullanıcı canlı testte bildirdi:
uygulama İÇİNDE kopyalanan bir metin terminale/normal input'lara
yapıştırılabiliyordu, ama Notepad/tarayıcı gibi uygulama DIŞINDAN kopyalanan
hiçbir şey **hiçbir yere** (ne terminale ne Ayarlar'daki düz bir `<input>`'a)
yapıştırılamıyordu. Bu, "Windows delayed rendering" veya "Electron native
clipboard binding bozuk" teorilerinin YANLIŞ olduğunu kanıtladı — sorun ne
xterm.js'te ne Electron'un `clipboard` modülünde, çünkü Ayarlar'daki sıradan
bir `<input>` da aynı native tarayıcı paste akışını kullanıyor ve o da
etkilendi. Sistem geneli bir OS/Electron sorunu değildi çünkü PowerShell
`Get-Clipboard` panoyu her zaman doğru okuyabiliyordu.

**Gerçek kök sebep**: Kullanıcı Windows 11'in **Pano Geçmişi (Clipboard
History / Win+V)** özelliğini kapatınca native yapıştırma (normal
input'lar) HEMEN düzeldi. Bu, bu makinede/Windows sürümünde bilinen bir
`cbdhsvc` (Clipboard User Service) davranışıyla eşleşiyor — pano geçmişi
etkinken bazı Chromium/Electron sürümlerinin dış kaynaklı pano
güncellemelerini (`WM_CLIPBOARDUPDATE`) doğru şekilde göremediği bir durum.

**Ama terminal hâlâ çalışmıyordu** — pano geçmişi kapatıldıktan SONRA bile.
Sebep: `EmbeddedTerminal.tsx`'teki ÖZEL Ctrl+V/sağ-tık kodu (bu turdan önceki
tüm turlarda birikte gelen "düzeltmeler") xterm.js'in **kendi native paste
event zincirini** (`node_modules/@xterm/xterm/src/browser/Clipboard.ts` —
`textarea`'ya bağlı standart bir DOM `paste` ClipboardEvent'i, tarayıcının
normal `execCommand`/clipboard izin sisteminden geçen, tıpkı normal bir
`<input>` gibi çalışan bir mekanizma) `event.preventDefault()` + `return
false` ile TAMAMEN ENGELLİYORDU, sonra bunun yerine Electron'un `clipboard`
modülünü (main process IPC üzerinden, retry'lı) manuel çağırıyordu. Native
input'larda yapıştırma düzelirken terminalde düzelmemesinin sebebi tam
buydu — terminal kendi native yolunu hiç kullanamıyordu, hep bizim (bozuk
olduğu ayrıca kanıtlanmamış, sadece gereksiz) manuel köprümüze düşüyordu.

**Kesin çözüm**: `EmbeddedTerminal.tsx`'teki TÜM özel clipboard kodu
(`attachCustomKeyEventHandler`, `pasteFromClipboard`, `handleContextMenu`
override'ı) silindi — component artık Ctrl+V/sağ-tık'a hiç dokunmuyor,
xterm.js kendi native `paste` event'ini (ve sağ tıkta tarayıcının native
context menüsünü) kullanıyor, aynı normal bir `<input>` gibi. Bununla
birlikte kaldırılanlar: `main/index.ts`'teki `clipboard:readText` IPC
handler'ı (retry mantığıyla birlikte) ve `win.on("focus", ...)` "pano ısıtma"
hack'i, `preload/index.ts`'teki `readClipboardText`/`writeClipboardText`,
`window.d.ts`'teki karşılık gelen tipler. **Doğrulandı**: kullanıcı canlı
testte Ctrl+V'nin artık terminalde çalıştığını onayladı.

**Ayrıca bu turda**: `store.ts` `defaultConfig().terminal` `"cmd"`'den
`"powershell"`'e çevrildi (kullanıcı isteği: "sıfırdan tertemiz powershell"),
`terminalManager.ts`'e `resolveShellArgs()` eklendi — PowerShell açılırken
`-NoLogo` ile telif/versiyon banner'ı bastırılıyor (kullanıcının
`$PROFILE`'ına dokunulmuyor, sadece görsel gürültü kaldırılıyor).

**Ders (ileride benzer bir "yapıştırma çalışmıyor" şikayeti gelirse)**: Önce
native bir `<input>`'da da aynı sorun var mı diye sor — cevap "evet" ise
sorun uygulamaya özel değildir (OS/Windows Pano Geçmişi ayarına bak), "hayır,
sadece X bileşeninde" ise o bileşenin native event akışına elle müdahale
edip etmediğini kontrol et. Bu projede iki kez de bu sıra tersten izlendi
(önce "Electron clipboard API bozuk" varsayılıp saatlerce native modül
retry/timing teorileri kovalandı) ve gerçek sebep ikisinde de çok daha
basitti.

## GitHub'a Taşınma + Otomatik Güncelleme (`electron-updater`) (2026-08-19, TAMAMLANDI)

Proje ilk kez git'e alındı ve **`https://github.com/tufansasmaz/axet-sap-launcher`**
(PRIVATE repo) adresine push edildi (`main` branch, ilk commit v1.3.0'ı
içeriyor). Bu makinede git kurulu olmadığı için **PortableGit** (git-for-
windows'un kurulum gerektirmeyen self-extracting arşivi) geçici olarak
`C:\workspace\tools\`'a indirilip açıldı, işlem bitince silindi — sistem
genelinde bir git kurulumu yapılmadı. Repo, GitHub REST API'sine
(`POST /user/repos`) kullanıcının kendi oluşturduğu bir Personal Access
Token ile PowerShell `Invoke-RestMethod` üzerinden (bash tool'daki `curl`
yasağı yüzünden) çağrı yapılarak oluşturuldu; push sonrası token remote
URL'den temizlendi ve kullanıcıya token'ı GitHub ayarlarından **revoke
etmesi** söylendi (konuşma geçmişinde açığa çıktığı için).

**Neden `electron-updater` + GitHub provider**: `electron-builder` (zaten
proje bağımlılığı, v25.1.8) "auto update" desteğini kutudan çıkar destekler
ama bunu tetikleyen çalışma-zamanı tarafı ayrı bir paket, `electron-updater`
— bu tur eklendi (`package.json` dependencies).

**Repo PRIVATE olmasının getirdiği ek karmaşıklık (bilinçli bir tercih,
kaldırılamaz bir kısıtlama DEĞİL)**: GitHub'ın "generic"/anonim release
indirme akışı sadece PUBLIC repolarda kimliksiz çalışır. Repo private
olduğu için hem (a) **build-time**: `electron-builder`'ın release
dosyalarını (`*.exe`, `*.blockmap`, `latest.yml`) GitHub Releases'e
YÜKLEMESİ hem de (b) **runtime**: çalışan uygulamanın yeni sürüm VAR MI diye
GitHub API'sini SORGULAMASI ve indirmesi bir **Personal Access Token**
gerektiriyor. İkisi birbirinden bağımsız, farklı token'lar/farklı zamanlarda
kullanılıyor:

- **(a) Yayınlama (build-time)** — `npm run release` (yeni script,
  `electron-vite build && electron-builder --win --publish always`) çalışan
  kişinin makinesinde `GH_TOKEN` ortam değişkeni set edilmiş olmalı (`repo`
  yetkili bir PAT — release yükleyebilmek için). Bu token KAYNAK KODA hiç
  yazılmıyor, sadece o komutu çalıştıran shell'in ortam değişkeni.
- **(b) Güncelleme kontrolü (runtime)** — `app-electron/main/updater.ts`
  `autoUpdater.setFeedURL({ provider: "github", owner, repo, private: true,
  token })` ile GitHub'a sorguluyor; bu token **KULLANICININ Ayarlar
  penceresine yapıştırdığı**, `AppConfig.updateToken` olarak diskte
  (`userData/config.json`, düz metin — `.conn_adt` ile aynı bilinen güvenlik
  borcu deseni) saklanan, kendi salt-okunur (fine-grained, sadece bu repo,
  "Contents: Read-only") kişisel erişim anahtarı. Kaynak kodda hiçbir token
  hardcode EDİLMEDİ — bu bilinçli bir tercih, imzasız/dahili bir kurumsal
  araç için "kullanıcı kendi token'ını girer" makul bir taviz (sızarsa sadece
  bu tek repoyu salt-okunur ifşa eder).

**Mimari**:
- **`app-electron/main/updater.ts`** (yeni) — `autoUpdater` sarmalayıcısı:
  `checkForUpdates(window, token)`, `downloadUpdate()`, `installUpdate()`
  (`quitAndInstall`), `getLastUpdateStatus()`. `autoUpdater.autoDownload =
  false` — kullanıcı önce "yeni sürüm var" bilgisini görüp bilinçli olarak
  indirmeyi başlatıyor, sessizce arka planda büyük bir dosya inmiyor.
  Event'ler (`checking-for-update`/`update-available`/`update-not-available`/
  `download-progress`/`update-downloaded`/`error`) `UpdateStatus` (yeni
  `shared/types.ts` tipi) şekline çevrilip `webContents.send("updates:status",
  ...)` ile renderer'a akıyor.
- **`main/index.ts`**: `app:getVersion`, `updates:check`, `updates:download`,
  `updates:install`, `updates:getLastStatus` IPC handler'ları eklendi.
  `win.once("ready-to-show", ...)` içinde, pencere gösterildikten 3 saniye
  sonra `config.autoCheckUpdates && config.updateToken` ise sessizce
  `checkForUpdates` tetikleniyor (token yoksa/kapalıysa sessizce hiçbir şey
  yapmıyor — kullanıcıyı token girmeden rahatsız etmiyor).
- **`shared/types.ts`**: `AppConfig`'e `autoCheckUpdates: boolean` (varsayılan
  `true`) ve `updateToken: string | null` (varsayılan `null`) eklendi; yeni
  `UpdatePhase`/`UpdateStatus` tipleri. Standart zincir (`store.ts`
  `defaultConfig` → IPC → `preload` → `window.d.ts`) burada da uygulandı.
- **`SettingsModal.tsx`**: yeni "Güncellemeler" bölümü — mevcut sürüm
  (`window.api.getAppVersion()`), token input'u (`type="password"`, açıklama
  metniyle "Contents: Read-only, bu repoya özel" önerisi), "açılışta otomatik
  kontrol et" checkbox'ı, "Şimdi Kontrol Et" butonu (token'ı önce `onSave`
  ile diske yazıp sonra `checkForUpdates` çağırıyor — kullanıcı token'ı
  yapıştırıp "Kaydet"e basmadan direkt kontrol edebilsin diye), ve
  `onUpdateStatus` event'ine göre değişen bir durum satırı (checking/
  available/downloading %/downloaded → "Şimdi Yeniden Başlat ve Kur" butonu/
  error mesajı).
- **`package.json`**: `repository` alanı eklendi, `build.publish` (`provider:
  "github"`, `owner: "tufansasmaz"`, `repo: "axet-sap-launcher"`, `private:
  true`) eklendi, yeni `"release"` script'i.

**Bilinen kısıtlama (electron-builder/electron-updater'ın kendi mimarisi,
bizim kodumuzdan kaynaklı değil)**: Windows'ta NSIS tabanlı auto-update
sadece **NSIS installer (`Setup.exe`) ile kurulmuş** uygulamalarda çalışır
— `portable`/`dir` hedefleriyle dağıtılan kopyalar auto-update alamaz (bu
electron-updater'ın belgelenmiş bir sınırı, `win.target` listesi zaten
`["dir","portable","nsis"]` olarak üçünü de üretiyor, kullanıcıya güncelleme
almak istiyorsa NSIS installer'ı kullanması gerektiği söylenmeli).

**Yeni bir sürüm yayınlamak için (sonraki oturum/geliştirici için adımlar)**:
1. `package.json`'da `version` alanını artır.
2. `GH_TOKEN` ortam değişkenini `repo` yetkili bir PAT ile set et.
3. `npm run release` çalıştır — bu hem build alır hem GitHub Releases'e
   yükler (repo private olduğu için `GH_TOKEN`'ın bu repoya erişimi olmalı).
4. Kullanıcılar Ayarlar'daki "Şimdi Kontrol Et" ile (veya otomatik açılış
   kontrolüyle) yeni sürümü görüp indirip kurabilir.

**Test durumu**: `npm run typecheck` ve `npm run build` temiz geçti. Gerçek
bir GitHub Release yayınlanıp uçtan uca bir güncelleme indirme/kurma akışı
bu oturumda test edilmedi (henüz hiçbir sürüm GitHub Releases'e
yayınlanmadı) — `npm run release` ilk kez çalıştırıldığında bu akış
doğrulanmalı.

## ADT Keşfinde Çoklu Port Denemesi (v1.3.2, TAMAMLANDI) — "Ev Yap" müşterisi canlı bulgusu

**Şikayet**: "Ev Yap" müşterisinin `HNP` sistemine bağlanılamıyor,
`Bağlantı hatası: connect ECONNREFUSED 10.10.20.61:44300` hatası alınıyordu
— guide (sap-context.md) açılıyordu ama gerçek ADT bağlantısı kurulamıyordu.

**Kök sebep**: `discoverAdtEndpoint()` (`adtDiscovery.ts`) DIAG portundan
(`3200` → instance no `00`) SAP'ın standart kuralıyla tek bir HTTPS/ICM
portu (`443` + instance no = `44300`) **tahmin ediyordu** ve sadece bunu
deniyordu. Canlı testte doğrulandı: bu müşteride Basis, ICM'nin HTTPS
dinleyicisini standart olmayan şekilde doğrudan **443**'e konfigüre etmiş
(ICM monitörü: `HTTP 8003`, `HTTPS 443`, port `44300` hiç tanımlı değil) —
VPN/ağ sorunu değil, port tahmininin bu spesifik sistemde yanlış çıkması.
`Test-NetConnection` ile doğrulandı: `10.10.20.61:3200` ✓, `:443` ✓, `:8003`
✓, `:50000` ✓, ama `:44300` ✗ (ECONNREFUSED).

**Çözüm — tek tahmin yerine paralel çoklu port deneme (genel, tüm
müşteriler için, host+DIAG port'lu HER sistemde otomatik)**:
`discoverAdtEndpoint()` artık tek bir hesaplanan portu denemek yerine bilinen
tüm olası ADT/ICM HTTPS portlarını **`Promise.all` ile paralel** (4sn
timeout'lu) deniyor: hesaplanan `443<instance no>`, `44300` (en yaygın
varsayılan), `443` (Fiori/reverse-proxy ile aynı porta konmuş ICM'ler — Ev
Yap'ın durumu), `8443`, `50000` (AS Java tipik portu), `4443`. Her port için
`WWW-Authenticate` header'ından okunan sistem ID beklenenle eşleştirilir
(`probeResults` üzerinden), eşleşen ilk port kazanır; hiçbiri SID
doğrulamasını geçemezse erişilebilir olan ilk port fallback olarak kullanılır.
Sertifika trust işlemi (`getPeerCertPem`/`trustCertInWindowsStore`) seçilen
portun gerçek adresine karşı çalışır — davranışı değişmedi.

- **Neden paralel, sıralı değil**: 6 port sırayla denense her biri timeout'a
  kadar bekleyebileceği için toplam bağlantı denemesi dakikalarca sürebilirdi
  — paralelde toplam süre en yavaş tekil probe kadardır (~4sn üst sınır),
  önceki tek-port davranışından fark edilir şekilde daha uzun sürmez.
- **`addPort()` yardımcı fonksiyonu** tekrarlı portları (örn. hesaplanan port
  zaten `44300`'se) listeye ikinci kez eklemiyor, `candidatePorts` sırası
  önceliği belirliyor (SAP'ın kendi kuralı önce, sonra bilinen yaygın
  alternatifler).
- **Gotcha (test sırasında yakalandı)**: `8443<instance no>` gibi bir
  birleşim denendi ama instance no `00` iken `844300` gibi 6 haneli, TCP
  port aralığının (0–65535) dışında bir sayı üretebiliyor
  (`ERR_SOCKET_BAD_PORT`) — bu port kaldırıldı, sabit portlar listesi (443,
  8443, 44300, 50000, 4443) instance no ile birleştirilmeden sabit
  tutuluyor.
- HTTP redirect keşfi (`followHttpRedirect`, port hesaplanan `80<instance
  no>` üzerinden) hâlâ önce denenir — redirect farklı bir host/port
  bulursa o candidate listenin başına eklenir, çoklu port denemesi sadece
  redirect bulunamadığında/routerlı sistemlerde devreye giriyor.
- Router üzerinden bağlanan sistemlerde (`routerString` varsa) de aynı çoklu
  port listesi kullanılıyor — her port `probeRealmThroughRouter` ile router
  tünelinden denenir.

**Canlı doğrulama**: `10.10.20.61`/`HNP` (Ev Yap) parametreleriyle gerçek bir
`tsx` script'i çalıştırıldı (geçici, test sonrası silindi) —
`44300`/`8443`/`50000`/`4443` reddedildi, **`443` doğru bulundu**, sertifika
otomatik Windows kullanıcı trust store'una eklendi. `npm run typecheck` ve
`npm run build` temiz geçti.

**Bilinen kısıtlama**: Bu 6 port de yanlışsa (çok nadir, ör. çok özel bir
firewall/NAT konfigürasyonu) hâlâ "Sistem Ekle → BTP/Cloud" ile manuel ADT
URL girme seçeneği (`normalizeAdtBaseUrl`, keşif tamamen atlanır) fallback
olarak kalıyor — kod tarafında ek bir otomasyon gerekmiyor, kullanıcı gerçek
portu biliyorsa (ör. ICM monitöründen) direkt girebilir.

## Şifre Otomatik Doldurma (v1.3.3, TAMAMLANDI)

Kullanıcı adı/client zaten `AppConfig.lastCredentials` ile otomatik
dolduruluyordu, şifre dolmuyordu (kullanıcı SAP Logon Memo alanında şifre
yoksa her bağlanışta elle yazmak zorundaydı). Artık **başarıyla doğrulanmış
bir bağlantının şifresi de aynı mekanizmayla saklanıp otomatik dolduruluyor**:

- **`shared/types.ts`**: `LastCredential`'a `password: string` eklendi
  (username/client'ın yanına).
- **`index.ts` `system:connect` handler'ı**: `result.ok` olduğunda
  `saveLastCredential()`'a artık `req.credentials.password` da geçiliyor.
- **`index.ts` `credentials:getDefaults` handler'ı**: şifre önceliği
  `last?.password ?? memo.password ?? ""` — yani önce bu sistemde daha önce
  **başarıyla doğrulanmış** bir şifre varsa o kullanılır (kanıtlanmış/güncel),
  yoksa SAP Logon'un Memo alanındaki şifreye düşülür (kullanıcının SAP
  Logon'a kendi elle yazdığı, doğrulanmamış bir değer olabilir — bu öncelik
  sırası bilerek böyle: launcher'ın kendi doğruladığı değer her zaman daha
  güvenilir kaynak).
- Ekstra bir IPC endpoint/tip zinciri gerekmedi — `CredentialDefaults` tipi
  zaten `password` alanına sahipti (önceden sadece SAP Logon memo'sundan
  geliyordu), `preload`/`window.d.ts`/`CredentialsModal.tsx` hiç değişmedi.
- **Bilinçli güvenlik kararı (yeni bir borç DEĞİL, mevcut desenle aynı
  çizgide)**: `config.json`'da şifre düz metin saklanıyor — ama bu proje
  zaten `.conn_adt` dosyasında da aynı şekilde düz metin şifre tutuyor (bkz.
  yukarıdaki "Önemli Tasarım Kararları" bölümü) ve bu bilinen/kabul edilmiş
  bir tercih. Şifreleme (Electron `safeStorage`) hâlâ "Bilinen Eksikler"
  listesinde, bu turda ele alınmadı.
- **Geriye uyumluluk**: Eski `config.json`'larda `lastCredentials` kayıtları
  `password` alanı olmadan kaydedilmiş olabilir — `loadConfig()`'teki generic
  merge bunu değiştirmedi (nested obje merge yapmıyor, sadece dict seviyesi),
  okurken `last?.password` `undefined` gelir, `?? memo.password ?? ""` zinciri
  bunu güvenle ele alıyor, çökme/hata riski yok. İlk başarılı bağlanıştan
  sonra o sistemin kaydı şifreyle güncellenir.
- `npm run typecheck` ve `npm run build` temiz geçti.

## Gömülü Terminal Tam Ekran (v1.3.3, TAMAMLANDI)

VS Code'un "Maximize Panel" davranışına benzer bir tam ekran modu eklendi —
kullanıcı terminali büyütüp sidebar + SystemPanel/FileViewer alanını
kapatabiliyor, terminal App'in kalan tüm dikey/yatay alanını kaplıyor.

- **`TerminalPanel.tsx`**: yeni `fullscreen: boolean` + `onToggleFullscreen:
  () => void` prop'ları. Tam ekranda dış container `style={{height}}` yerine
  `flex-1` class'ı alıyor (piksel yükseklik state'i devre dışı), sürükle-
  boyutlandır tutamacı ve panel aç/kapat oku gizleniyor (tam ekranda anlamsız).
  Sekme çubuğunun sağına `Maximize2`/`Minimize2` (lucide-react) ikonlu bir
  toggle butonu eklendi — tam ekrandan çıkış SADECE bu buton üzerinden
  (kasıtlı olarak Escape tuşuna bağlanMADI: terminaldeki kabuk/vim/nano gibi
  programlar Escape'i kendi amaçları için kullanıyor, global bir `keydown`
  listener'ı bunu yakalayıp paneli kapatsaydı terminal içindeki gerçek
  Escape kullanımıyla çakışırdı).
- **`App.tsx`**: yeni `terminalFullscreen` state'i +
  `handleToggleTerminalFullscreen` (kapalıyken tam ekrana geçilirse önce
  paneli de açar, aksi halde boş bir alan gösterirdi). Tam ekranken JSX'te
  `<aside>` (sol sidebar), sidebar resize tutamacı ve `<main>` (SystemPanel/
  FileViewer + dosya sekmesi çubuğu) hiç render edilMİyor — `{!terminalFullscreen
  && (...)}` ile şartlı. Üstteki `<header>` (arama, Sistem Ekle, Ayarlar vb.)
  bilerek görünür bırakıldı — sadece panel alanı büyütülüyor, pencere kontrolleri
  kaybolmuyor.
- State kaybı riski yok: `<aside>`/`<main>` unmount olsa da onların state'i
  (`selection`, `search`, açık dosya sekmeleri) App seviyesinde tutulduğu için
  tam ekrandan çıkınca aynen geri geliyor; terminal instance'ları zaten
  `TerminalPanel` içinde ayrıca hiç unmount olmuyor (mevcut "her session bir
  kez mount olur" tasarımı, bkz. component başındaki yorum), bu yüzden tam
  ekrana geçiş/çıkış sırasında da scrollback/bağlantı kaybı olmuyor.
- Ek bir IPC/`AppConfig` değişikliği gerekmedi — tamamen renderer-local UI
  state'i.
- `npm run typecheck` ve `npm run build` temiz geçti. Gerçek bir GUI
  penceresinde görsel doğrulama (buton konumu, geçiş animasyonu yokluğu vb.)
  bu ortamda yapılamadı.

## Güncelleme "Bulundu Ama İndirmiyor" Hatası (v1.3.4, TAMAMLANDI)

**Şikayet**: Yeni sürüm bulunuyor ("Yeni sürüm bulundu: vX.Y.Z" mesajı
görünüyor) ama uygulama kendiliğinden güncellenmiyordu.

**Kök sebep**: Bu bir bug değil, eksik bir buton — `autoUpdater.autoDownload
= false` (`updater.ts`) kasıtlı bir tasarım kararı (kullanıcı bilinçli olarak
indirmeyi başlatsın, arka planda sessizce büyük bir dosya inmesin). Bu yüzden
`update-available` event'inden sonra indirmeyi tetiklemek için
`window.api.downloadUpdate()`'in bir yerden ÇAĞRILMASI gerekiyordu —
`SettingsModal.tsx`'teki `renderUpdateStatus()`'un `"available"` case'i
sadece bilgi metni gösteriyordu, bu çağrıyı yapan bir buton hiç yoktu. Yani
kullanıcı "bulundu" mesajını görüyor ama onu indirmeye çevirecek hiçbir
etkileşim mevcut değildi — `"downloaded"` case'indeki "Şimdi Yeniden Başlat
ve Kur" butonu asla tetiklenmiyordu çünkü indirme hiç başlamıyordu.

**Çözüm**: `"available"` case'ine `"downloaded"` case'iyle aynı desende
(mesaj + buton, `flex items-center justify-between`) bir **İndir** butonu
eklendi — `onClick={() => window.api.downloadUpdate()}`. `updater.ts`'e
hiç dokunulmadı (mantık zaten doğruydu, `downloadUpdate()` IPC/preload/
window.d.ts zinciri de zaten tamdı) — sadece UI'da eksik olan tetikleyici
eklendi. Akış artık: bulundu → **İndir** (yeni) → ilerleme % → indirildi →
"Şimdi Yeniden Başlat ve Kur" (zaten vardı).
- `npm run typecheck` ve `npm run build` temiz geçti.

## Dil Desteği — TR/EN (v1.3.5, TAMAMLANDI)

Uygulama arayüzü artık tamamen iki dilli: Türkçe (varsayılan) ve İngilizce,
başlık çubuğundaki **Languages ikonlu TR/EN butonu** ile anında değiştirilir,
tercih `AppConfig.language` olarak diskte kalıcı.

- **`shared/types.ts`**: `AppLanguage = "tr" | "en"`, `AppConfig.language`.
  `store.ts` `defaultConfig().language = "tr"`, `loadConfig()`'te
  `VALID_LANGUAGES` allow-list ile eski/bozuk değerler sessizce `"tr"`'ye
  düşürülüyor (standart zincir, `terminal`/`axetCommand` ile aynı desen).
- **`src/i18n/`** (yeni dizin) — `tr.ts`/`en.ts`: aynı `TranslationKey`
  union'ına sahip, 1:1 eşlenen iki sözlük (biri eksik anahtar eklerse
  TypeScript diğerinde de zorunlu kılıyor — sözlükler asenkron kayamaz).
  `index.tsx`: `translate(language, key, params?)` saf fonksiyonu (basit
  `{param}` interpolasyonu), `LanguageProvider`/`useLanguage`/`useT`/
  `useTranslations` — bileşenler prop drilling yapmadan `const t = useT()`
  ile erişiyor.
- **`App.tsx`**: `language = config?.language ?? "tr"`, tüm ağacı
  `<LanguageProvider language={language}>` ile sarıyor;
  `handleToggleLanguage()` `saveConfig({ language: next })` ile kalıcı
  kaydediyor. Header'da tema toggle'ının yanına `Languages` ikonlu, aktif
  dili ("TR"/"EN") gösteren bir buton eklendi.
- **Tüm renderer bileşenleri** (`Tree`, `SystemPanel`, `CredentialsModal`,
  `AddSystemModal`, `SettingsModal`, `ConfirmDialog`, `Toast`,
  `TerminalPanel`, `FileExplorer`, `FileViewer`, `RecentSystems`,
  `StatusDot`, `TierBadge`, `CopyButton`, `TitleBar`, `ErrorBoundary` vb.)
  `useT()` üzerinden çevrildi — sabit Türkçe metin (buton/label/placeholder/
  tooltip/boş durum mesajı) kalmadı, doğrulama: `grep` ile bilinen Türkçe
  kelime kalıpları (Kaydet/İptal/Sil/Düzenle/Yükleniyor/...) `src/components`
  altında sıfır sonuç veriyor.
- **Backend'den gelen KISA/kullanıcıya doğrudan görünen mesajlar da
  çevrildi** — `adtDiscovery.ts` `verifyCredentials()`/
  `verifyCredentialsThroughRouter()`'a `language: AppLanguage = "tr"`
  parametresi eklendi (`verifyMsg()` yardımcı sözlüğü: doğrulandı/401/
  beklenmeyen durum/geçersiz URL/zaman aşımı/bağlantı hatası — bunlar
  `CredentialsModal`'da hata metni veya toast olarak DOĞRUDAN görünüyor,
  çevrilmemesi "TR arayüz + İngilizce hata" gibi tutarsız bir deneyime yol
  açardı). `launcher.ts`'e `connectMsg()`/`skillNoteFor()` eklendi —
  `connectToSystem()`'ın tüm üst seviye `ConnectResult.message` dönüşleri
  (proje klasörü hatası, host/URL eksik, `.conn_adt`/context yazma hatası,
  RFC bridge/başarılı bağlantı mesajları) `config.language`'a göre seçiliyor.
  `index.ts`'teki `system:connect` handler'ı zaten `loadConfig()` sonucunu
  `connectToSystem(config, req)`'e geçirdiği için ek bir IPC parametresi
  gerekmedi — `config.language` otomatik akışa dahil.
- **Kasıtlı olarak çevrilmeyen kısım**: `discoverAdtEndpoint()`'in
  `allNotes` listesi ve bunların yazıldığı `sap-context.md` (ADT keşif
  adımları, sertifika/SID eşleşme notları, RFC bridge kurulum talimatları)
  hâlâ tamamen Türkçe. Bu içerik kullanıcıya toast/hata olarak
  gösterilmiyor — `axet.code`'un (AI asistanının) session başında okuduğu
  teknik bir günlük/rehber dosyası; dilin bu dosya için işlevsel bir önemi
  yok (asistan hangi dilde olursa olsun aynı şekilde anlıyor), bu yüzden
  devasa markdown üretici fonksiyonun (`buildContextMarkdown`, ~150 satır)
  ikinci bir dile taşınması kapsam dışı bırakıldı.
- `ConnectivityResult.message` (`connectivity.ts` — "Sistem erişilebilir"
  vb.) da çevrilmedi çünkü hiçbir UI bileşeni bu alanı GÖSTERMİYOR —
  `StatusDot.tsx` sadece `state` enum'ını kendi ayrı `useT()` çevirisiyle
  (`statusDot.reachable` vb.) render ediyor, `connectivity.ts`'in mesaj
  string'i şu an ölü kod/sadece debug amaçlı.
- `npm run typecheck` ve `npm run build` temiz geçti.

## RFC Bridge Otomatik Başlatma — Router-only Sistemler (2026-08-21, TAMAMLANDI) — Limak canlı doğrulaması

Kullanıcı, Enrico Andreoli'nin SAP Community blog yazısındaki
("Using Claude for SAP ABAP development on RFC-only/SAProuter systems",
`community.sap.com/t5/abap-blog-posts/.../ba-p/14414381`, aynı yazarın
`github.com/enricoandreoli/adt-rfc-bridge` deposu) yaklaşımı elle izleyerek
**Limak** müşterisinin router-only bir sistemine gerçekten bağlanabildi —
bu, `adt_rfc_bridge.py`/`adt_rfc_probe.py`'nin (`SADT_REST_RFC_ENDPOINT`
üzerinden RFC-over-SAProuter, HEAD→GET dönüşümü, sahte X-CSRF-Token —
zaten bizim koddaki tasarımla birebir aynı) canlı bir müşteride ilk kez
çalıştığının kanıtı. Önceki tur (bkz. yukarıdaki "SAProuter Üzerinden
Bağlanan Sistemler" / "RFC Bridge — pratik workaround" bölümleri) bu
scriptleri yazmış ama SDK erişimi olmadığı için hiç canlı test edememişti.

**Bu turda yapılan**: Kullanıcı elle izlediği adımları (SDK kurulumu, bridge
başlatma) launcher'ın kendisinin yapması istendi — "sadece manuel adımları
otomatikleştir" kapsamı seçildi (alan adları/format sorunu çıkmadı, yazma/
aktivasyon ihtiyacı yok, sadece elle `py adt_rfc_bridge.py --port ...`
çalıştırma adımı ortadan kalksın).

- **`app-electron/main/rfcBridgeManager.ts`** (yeni) — `startRfcBridge(opts)`:
  proje klasörü başına (`Map<projectDir, RunningBridge>`) tek bir
  `adt_rfc_bridge.py` process'i `child_process.spawn` ile açar (stdout/stderr
  proje klasöründeki `rfc-bridge.log`'a append edilir), `/health` endpoint'ini
  600ms aralıklarla en fazla 20s polling ile bekler. Zaten sağlıklı çalışan bir
  bridge varsa (aynı proje, aynı port) yeniden başlatmaz. Health-check
  başarısız olursa stderr tail'inden basit pattern matching ile anlamlı bir
  hata ipucu üretir (`pyrfc` yok / `SAPNWRFC_HOME` yok / `python-dotenv` yok /
  RFC logon hatası / process erken sonlandı). `stopRfcBridge`/
  `stopAllRfcBridges` — ikincisi `main/index.ts`'teki `window-all-closed`/
  `before-quit`'e eklendi (zombi `python.exe` kalmasın diye, `disposeAllTerminals()`
  ile aynı noktada çağrılıyor).
- **`launcher.ts` `attemptRfcBridgeAutoStart()`** (yeni) — router `-94` tespit
  edilip `.conn_adt` (RFC bloğuyla) yazıldıktan SONRA, skill kurulumu
  (`installSkillsIntoProject`, artık RFC dalından ÖNCE — proje klasöründeki
  `.axet-code/skills/sap-adt-readonly/scripts/adt_rfc_bridge.py`'nin diskte
  hazır olması gerekiyor) tamamlandıktan sonra çalışır: script'i proje
  klasöründen (yoksa toolkit kök yolundan fallback) bulur, `startRfcBridge`
  çağırır, health-check geçerse **bridge üzerinden gerçek bir kimlik
  doğrulama isteği** atar (`verifyCredentials("http://127.0.0.1:<port>", ...)`
  — router/TLS'siz düz HTTP, RFC lazy-connect'i bu istekte tetiklenir, yani
  bu an itibarıyla RFC/router zincirinin **uçtan uca** çalıştığı kanıtlanır,
  sadece HTTP server'ın ayakta olduğu değil). Üç sonuç: `verified` (bridge
  başlatıldı + 200 OK), `started ama unverified` (bridge çalışıyor ama
  doğrulama tamamlanamadı — yine de terminal açılır), `credentialsInvalid`
  (bridge 401 döndürdü — bu artık GERÇEK bir yanlış şifre kanıtı, bu yüzden
  `ok:false` ile normal 401 akışıyla aynı şekilde davranılır, terminal
  AÇILMAZ) veya `başlatma başarısız` (pyrfc/SDK yok — `ok:true` ile terminal
  yine açılır, `sap-context.md`'deki elle kurulum adımlarına düşülür).
- **`adtDiscovery.ts` `verifyCredentials()`** artık `http://` şemasını da
  destekliyor (önceden URL şeması ne olursa olsun hep `https.request`
  kullanıyordu — yerel bridge'e `http://127.0.0.1:8788` ile TLS handshake
  denemesi zaman aşımına düşerdi). `parsed.protocol === "http:"` ise
  `node:http`'in `request`'i kullanılıyor, port varsayılanı 80'e düşüyor.
- **`shared/types.ts`**: `AppConfig.pythonPath: string | null` (varsayılan
  `null` → çalışma zamanında `"py"`'a düşer — **GÜNCEL DEĞİL**, bkz. "Gömülü
  RFC Runtime" bölümü: 2026-08-23'ten itibaren `null` iken gömülü runtime
  kullanılır, `"py"`'a düşmek sadece gömülü runtime paketlenmemişse gerçekleşen
  bir son çare) — Ayarlar'da "Python çalıştırıcısı (RFC bridge için)" alanı
  olarak eklendi (`SettingsModal.tsx`, `store.ts` `defaultConfig`, i18n
  `tr.ts`/`en.ts`).
  Ekstra bir IPC handler gerekmedi — `config:get`/`config:save` zaten generic
  `Partial<AppConfig>` alıyor.
- **`sap-context.md`** artık RFC bridge modunda otomatik başlatmanın gerçek
  sonucunu yazıyor (`buildContextMarkdown`'a yeni `rfcOutcome` parametresi) —
  "otomatik doğrulandı ✓" / "başlatıldı ama doğrulanamadı" / "otomatik
  başlatma başarısız, elle kurulum adımları" olarak üç ayrı anlatım; agent
  artık her router-only bağlantıda körlemesine 4 adımlı elle kurulumu
  önermek zorunda değil, önce bu bölümü okuyup gerçek durumu görüyor.
- **`SKILL.md`** ("Router-only sistemler" bölümü) güncellendi: elle kurulum
  artık "sadece otomatik başlatma başarısız olursa" başlığı altında,
  otomatik başlatmanın varlığı ve Limak'ta canlı doğrulandığı not edildi.
- **Bilinçli olarak DEĞİŞTİRİLMEYEN**: `adt_rfc_bridge.py`/`adt_rfc_probe.py`
  scriptlerinin kendisi (SADT_REST_RFC_ENDPOINT marshalling, HEAD→GET,
  placeholder CSRF) — Limak'ta blogdaki yaklaşımla birebir aynı mantıkla
  çalıştığı için hiç dokunulmadı, sadece başlatma/yaşam döngüsü
  otomatikleştirildi.
- `npm run typecheck` ve `npm run build` temiz geçti. Gerçek bir GUI
  penceresinde/Limak'ın kendi router'ına karşı bu otomatik başlatma akışının
  ucuca testi bu ortamda yapılamadı (SDK/pyrfc bu makinede yok) —
  kullanıcının bir dahaki Limak bağlantısında doğrulaması gerekiyor; scriptin
  kendisi zaten elle çalıştırıldığında doğrulanmıştı, değişen sadece
  process'in kim tarafından/ne zaman başlatıldığı.

## Git Geçmişi — Kök Commit Mesajı Sürüm Numarasız Hale Getirildi (v1.3.5)

`5cc824c "Initial commit: aXet SAP Launcher v1.3.0"` kök commit'i, uygulama
ilerledikçe GitHub'da o commit'ten sonra hiç değişmemiş dosyalarda hâlâ
"v1.3.0" olarak görünüyordu (bu git/GitHub'ın normal davranışı — bir
dosyanın "son commit"i, onu son değiştiren commit'tir; sürüm numarası orada
sabit kalır, uygulamanın güncel sürümüyle otomatik güncellenmez). Kullanıcı
isteğiyle kök commit mesajı `git rebase -i --root` ile **sürüm numarası
içermeyen** "Initial commit: aXet SAP Launcher" olarak reword edildi ve
`git push --force` ile origin/main'e yazıldı.

- **Yan etki (bilinçli, kabul edildi)**: Kök commit'in mesajı değiştiği için
  ondan sonraki TÜM commit'lerin SHA'sı değişti — bu normal/beklenen bir
  durum (rebase her zaman böyle çalışır), tek maintainer'lı bu repo için
  risk düşük. Force-push öncesi yerel `backup-before-reword-root` branch'i
  oluşturuldu (push edilmedi, sadece yerel geri dönüş için).
- Bu bir kerelik bir düzeltmeydi — ileride benzer bir "eski commit mesajı
  güncel değil" şikayeti gelirse aynı yaklaşım (kısa açıklama, sürüm
  numarası koymadan) izlenmeli; commit mesajlarına sürüm numarası
  yazıldığında bu numara o an geçerli anlamına gelir, dosya sonradan
  değişmezse GitHub'da kalıcı olarak o numarayla görünür.

## pyrfc/SAP NW RFC SDK — Windows'ta gerçek kurulum sorunları ve kalıcı düzeltme (2026-08-22, bu makinede canlı doğrulandı)

Bu geliştirme makinesinde (Windows, Python 3.14 sistem varsayılanı) `pyrfc`'yi
gerçekten kurup çalıştırmaya çalışırken üç ayrı, birbirinden bağımsız engel
çıktı — hepsi çözüldü, sırasıyla:

1. **PyRFC projesi SAP tarafından terk edildi** (GitHub'da arşivlendi,
   `SAP/PyRFC#372`). Son sürüm 3.3.1, prebuilt wheel'leri sadece Python
   3.8–3.12 için var, **3.13/3.14 için hiç wheel yok**. Çözüm: sistem
   Python'una dokunmadan, **ayrı bir Python 3.12 kurulumuyla venv**
   (`C:\Users\<user>\AppData\Local\axet-rfc-venv`) oluşturup `pip install
   pyrfc==3.3.1 python-dotenv` (yanked sürüm olduğu için `pip` uyarı verir,
   engel değil). `AppConfig.pythonPath`'i (`config.json`, Ayarlar → "Python
   çalıştırıcısı") bu venv'in `Scripts\python.exe`'sine çevir — sistem `py`
   komutu asla pyrfc göremeyecek.
2. **SAP NW RFC SDK dosyaları eksikse `import pyrfc` "DLL load failed"
   verir, hangi DLL eksik olduğunu SÖYLEMEZ.** Tam SDK (7.53 patch 814, Windows
   x64: `sapnwrfc.dll`, `libsapucum.dll`, `icudt50.dll`, `icuin50.dll`,
   `icuuc50.dll`, `libicudecnumber.dll`, `include/*.h`) `SAPNWRFC_HOME`
   altına yerleştirilmeli. **Kaynak seçimi önemli**: support.sap.com'un resmi
   SDK'sı S-user + "Software Download" yetkisi gerektiriyor (bkz. yukarıdaki
   "AÇIK DURUM" bölümü); bu oturumda kullanıcının kendi temin ettiği bir SDK
   kopyası kullanıldı — `SIGNATURE.SMF` manifestindeki SHA256 hash'leri
   dosyaların gerçek içeriğiyle (`certutil -hashfile`) tek tek karşılaştırılıp
   PKCS7 imzasının SAP'nin kendi "SAP Code Signing CA"sına ait olduğu
   doğrulandı — içerik orijinal/bozulmamış. **Dikkat**: bulunan bazı SDK
   kopyaları **Linux** SDK'sıydı (`.so`/`.so.50` dosyaları) — Windows'ta işe
   yaramaz, mimari/platformu (dosya uzantısına bakarak: `.dll`=Windows,
   `.so`=Linux) her zaman kontrol et. Ayrıca çok eski bir sürüm (7.20 patch
   610, 2014, ICU 34) da bulundu ama kullanılmadı — zaten canlı çalıştığı
   kanıtlanmış 7.53 patch 814 tercih edildi.
3. **VC++ 2013 Redistributable (x64) eksikse SDK DLL'leri yine yüklenemez**
   (`msvcr120.dll`/`msvcp120.dll` — SAP Note 2573790'da belgeli bağımlılık).
   Bu makinede yönetici/UAC yetkisi verilmediği için standart
   `vcredist_x64.exe /install /quiet` **admin gerektirdiği için başarısız
   oldu** (`0x80070005 Access Denied`). **Admin gerektirmeyen çözüm**: bu
   bootstrapper aslında iç içe geçmiş PE→CAB→CAB→(CAB+MSI) katmanları — 7-Zip
   ile katman katık sökülüp içindeki `F_CENTRAL_msvcr120_x64`/
   `F_CENTRAL_msvcp120_x64` dosyaları (binary olarak `msvcr120.dll`/
   `msvcp120.dll`'in kendisi) doğrudan `SAPNWRFC_HOME/lib/` klasörüne
   kopyalandı — sistem kurulumu/registry değişikliği YOK, sadece dosya kopyası.
   (7z ile: `l`/`x` komutları PE'nin ilk CAB'ını buluyor ama gerçek MSI
   payload'ları içeren ikinci, daha büyük CAB dosyayı atlıyor —
   `re.finditer(b'MSCF', data)` ile ikinci `MSCF` imzasını bulup dosyayı o
   offset'ten itibaren ayrı bir `.cab` olarak kesip 7z'ye tekrar vermek
   gerekti; içindeki `a0`/`a1` MSI veritabanları, `a2`/`a3` ise gerçek
   DLL'leri taşıyan iç içe CAB'lardı.)
4. **Asıl kod hatası — `import pyrfc` geçse bile `pyrfc.Connection(...)`
   çağrısı native seviyede tekrar patlıyordu**: "Could not open the ICU
   common library... icuuc50.dll, icudt50.dll, icuin50.dll [nlsui0.c]"
   (SAP Note 519753). Kök sebep: Python 3.8+ `os.add_dll_directory()` sadece
   **Python'un kendi extension-module yükleyicisini** (pyrfc'nin `_cyrfc.pyd`
   dosyası) kapsıyor — `sapnwrfc.dll`'in KENDİ içindeki, `Connection` açılırken
   tetiklenen ayrı `LoadLibrary` çağrıları (ICU bağımlılıkları için) hâlâ
   klasik **PATH** taramasına bakıyor, `add_dll_directory` bunu etkilemiyor.
   **Düzeltme (`adt_rfc_bridge.py` ve `adt_rfc_probe.py`, her ikisine de
   eklendi)**: yeni `_ensure_sapnwrfc_dll_dir()` fonksiyonu artık HEM
   `os.add_dll_directory(SAPNWRFC_HOME/lib)` HEM DE `os.environ["PATH"]`'e
   aynı klasörü prepend ediyor — `import pyrfc`'den (ve her `pyrfc.Connection(...)`
   açılışından) ÖNCE çağrılıyor (`_ensure_connection()` içinde ve `main()`'in
   başında). Bu fonksiyon `sys.platform != "win32"` veya `SAPNWRFC_HOME` set
   değilse sessizce no-op — Linux/macOS'ta veya SDK kurulu değilken davranış
   değişmiyor.
- **Canlı doğrulama**: yukarıdaki tüm adımlardan sonra `adt_rfc_probe.py`
  gerçek (fake IP'li, `.conn_adt` sahte alanlarıyla) bir `pyrfc.Connection`
  denemesi yaptı — ICU hatası tamamen gitti, hata artık gerçek bir ağ
  seviyesi hata oldu (`RFC_COMMUNICATION_FAILURE`, `WSAETIMEDOUT`, fake IP'ye
  ulaşılamadığı için beklenen). Bu, DLL/import/native-loading zincirinin
  **uçtan uca çalıştığının** kanıtı — gerçek bir router-only müşteri
  sisteminde artık yalnızca gerçek ağ/kimlik bilgisi sorunları kalır, DLL
  sorunu kalmaz.
- **`AppConfig.pythonPath`'i venv'e çevirmeyi unutma**: `rfcBridgeManager.ts`
  `spawn(opts.pythonPath, [...])` ile çalışır — `opts.pythonPath` sistem
  `py`/`python`'a işaret ediyorsa (pyrfc kurulu değilse) otomatik başlatma
  hep "pyrfc kurulu değil" hatasıyla başarısız olur, kullanıcı Ayarlar'dan
  bu alanı venv'in `python.exe`'sine çevirmeli.
- **`SAPNWRFC_HOME` kalıcılığı ile ilgili Windows gotcha'sı**: `setx` sadece
  registry'ye yazar, **çalışan process'lerin (ve onların spawn ettiği
  child'ların) environment block'unu güncellemez** — Electron uygulaması
  zaten açık bir Explorer/oturumdan başlatıldıysa yeni `SAPNWRFC_HOME`'u
  göremeyebilir. Kullanıcıya, `setx`'ten sonra en azından **oturumu kapat-aç
  veya yeniden başlat** gerektiğini söyle (log off/on Explorer'ın master
  environment block'unu registry'den yeniden okumasını sağlar).
- **Lisans notu (bilerek göz ardı edilmedi, kullanıcıya bildirildi)**: SAP NW
  RFC SDK, SAP'nin lisanslı ürünüdür; resmi indirme S-user + "Software
  Download" yetkisi gerektirir. Bu oturumda kullanıcının kendi temin ettiği
  bir SDK kopyası (içerik olarak orijinal — imzası doğrulandı — ama resmi
  S-user indirme kanalından değil) kullanıldı; kullanıcı bunu açıkça
  onayladı ("kendi sorumluluğumda"). **Güncel durum (bkz. aşağıdaki "Gömülü
  RFC Runtime" bölümü)**: bu SDK kopyası artık uygulamanın kendi build
  paketine gömülüyor — kalıcı/tam uyumlu çözüm hâlâ kullanıcının kendi
  S-user'ına "Software Download" yetkisi ekletmesi olsa da, mevcut durumda
  uygulama zaten çalışan bir kopyayla dağıtılıyor.

## Gömülü RFC Runtime — kullanıcı için sıfır kurulum (2026-08-23, TAMAMLANDI)

Yukarıdaki bölümde bu makinede elle kurulup canlı doğrulanan Python 3.12 +
pyrfc 3.3.1 + SAP NW RFC SDK 7.53 patch 814 üçlüsü, kullanıcı isteğiyle artık
**uygulamanın kendi build paketine gömülü** — RFC bridge gerektiren
router-only sistemlere bağlanırken kullanıcının ayrıca Python/pyrfc/SDK
kurması, `SAPNWRFC_HOME` ayarlaması veya `pip install` çalıştırması **hiç
gerekmiyor**.

- **`resources/rfc-runtime/`** (yeni, **repoya commit edilmiyor** —
  `.gitignore`'a eklendi, bkz. aşağıdaki "build önkoşulu" notu) iki alt
  klasör içeriyor:
  - **`python/`** — makinedeki `AppData\Local\Programs\Python312`
    kurulumunun budanmış bir kopyası (Doc/tcl/Scripts/include/libs/idlelib/
    tkinter/turtledemo/lib2to3/ensurepip/pydoc_data/test/`__pycache__`
    klasörleri çıkarıldı — sadece çalışma zamanı için gereken interpreter +
    stdlib kaldı, ~114MB'tan ~46MB'a indi) + `Lib/site-packages/`'e elle
    kopyalanan **`pyrfc`** ve **`dotenv`** (zaten kurulu olan
    `axet-rfc-venv`'den, tekrar `pip install` çalıştırmadan — venv'in
    kendisi taşınabilir değil çünkü `Scripts\python.exe`'si base
    `Python312` kurulumuna bağımlı, ama site-packages içeriği saf Python +
    derlenmiş `.pyd` olduğu için doğrudan kopyalanabiliyor).
  - **`sdk/lib/`** — `AppData\Local\nwrfcsdk-750\lib`'in içeriği (SAP NW RFC
    SDK 7.53 patch 814 runtime DLL'leri: `sapnwrfc.dll`, `libsapucum.dll`,
    `icudt50.dll`, `icuin50.dll`, `icuuc50.dll`, `libicudecnumber.dll`,
    `msvcr120.dll`, `msvcp120.dll`) — `.lib`/`include` gibi sadece derleme
    zamanında gereken dosyalar dahil edilmedi (pyrfc zaten önceden
    derlenmiş bir `.pyd`, runtime'da sadece DLL'lere ihtiyaç var).
  - Bu yapı standart `SAPNWRFC_HOME` sözleşmesiyle (`$SAPNWRFC_HOME/lib/*.dll`)
    birebir eşleşiyor — `adt_rfc_bridge.py`'nin var olan
    `_ensure_sapnwrfc_dll_dir()` fonksiyonuna hiç dokunulmadı, sadece
    `SAPNWRFC_HOME` artık `resources/rfc-runtime/sdk`'ya işaret ediyor.
- **`app-electron/main/embeddedRuntime.ts`** (yeni) — `getEmbeddedRfcRuntime()`:
  `app.isPackaged`'e göre (paketli: `process.resourcesPath/rfc-runtime`,
  dev: `<proje>/resources/rfc-runtime`, `sapToolkit.ts`'teki
  `getToolkitRoot()`'un aynı deseni) `python/python.exe` ve `sdk/lib/
  sapnwrfc.dll`'in gerçekten var olduğunu kontrol edip
  `{ pythonPath, sapnwrfcHome }` döner, yoksa `null` (paketleme
  bozuk/eksikse sessizce fallback'e düşülür, çökme olmaz).
- **`launcher.ts`** `connectToSystem()`'daki RFC bridge dalı artık önce
  `getEmbeddedRfcRuntime()`'ı dener: `config.pythonPath` (Ayarlar'daki
  "Özel Python çalıştırıcısı") **boşsa** gömülü runtime kullanılır
  (`pythonPath` + `sapnwrfcHome` ikisi de embedded'den), kullanıcı elle bir
  yol girmişse (ileri seviye override — kendi pyrfc/SDK kurulumunu
  kullanmak isteyenler için) o yol kullanılır ve `sapnwrfcHome`
  **geçirilmez** (kullanıcının kendi ortam değişkenlerine/`SAPNWRFC_HOME`'una
  güvenilir — eski davranışla birebir aynı).
- **`rfcBridgeManager.ts`** `startRfcBridge()`'e `sapnwrfcHome?: string`
  opsiyonel alanı eklendi — verilirse spawn edilen process'in `env`'ine
  `SAPNWRFC_HOME` ve `PATH` (sdk `lib` klasörü prepend) enjekte edilir
  (önceden sadece `process.env` düz geçiliyordu, kullanıcının kendi sistem
  `SAPNWRFC_HOME`'una güveniliyordu — artık gömülü mod için bunu biz
  sağlıyoruz). `describeFailure()` embedded/override ayrımına göre farklı
  hata ipuçları veriyor (embedded modda "pyrfc bulunamadı" artık "SDK indir"
  değil "uygulamayı yeniden kur" öneriyor, çünkü kullanıcının yapabileceği
  bir kurulum adımı yok).
- **`package.json`** `build.extraResources`'a `resources/rfc-runtime` →
  `rfc-runtime` eklendi (sap-toolkit ile aynı desen). **Build önkoşulu**:
  `resources/rfc-runtime` klasörü repoya commit edilmiyor (SAP'nin lisanslı
  SDK'sını git geçmişine/uzak repoya taşımamak için, `axet-rfc-venv`/
  `nwrfcsdk-750`'nin de repo dışında `AppData\Local`'da tutulmasıyla aynı
  mantık) — her build makinesinde bir kere elle hazırlanmalı (yukarıdaki
  `python/`+`sdk/lib/` içeriğini bu makinedeki `Python312`/`axet-rfc-venv`/
  `nwrfcsdk-750`'den kopyalayarak, veya kendi lisanslı SDK/pyrfc
  kurulumunuzdan aynı yapıyla). Bu klasör yoksa `build:win`
  (`extraResources`) build makinesinde HATA verir — bilerek böyle, sessizce
  eksik bir RFC özelliğiyle paketlemek yerine.
- **Doğrulama**: hem dev konumundan (`resources/rfc-runtime/python/
  python.exe`) hem de gerçek bir `electron-builder --win dir` paketleme
  çıktısından (`release/win-unpacked/resources/rfc-runtime/python/
  python.exe`) izole bir Python süreci başlatılıp `import pyrfc` +
  `pyrfc.Connection(...)` denemesi yapıldı — ikisinde de ICU/DLL zinciri
  hatasız yüklendi, sahte bir IP'ye gerçek bir ağ seviyesi timeout
  (`RFC_COMMUNICATION_FAILURE`/`WSAETIMEDOUT`) alındı (yani DLL/import
  sorunu YOK, sadece beklenen ağ hatası). `npm run typecheck`, `npm run
  build` ve `npx electron-builder --win dir` hepsi temiz geçti.
- **Ayarlar/i18n**: `settingsModal.pythonPathLabel`/`pythonPathHelper`
  (`tr.ts`/`en.ts`) "RFC bridge için Python yolu" çerçevesinden "gelişmiş,
  opsiyonel override — normalde boş bırak" çerçevesine güncellendi;
  placeholder `"py"` yerine `"(boş = gömülü Python/pyrfc/SDK kullanılır)"`.
  `SKILL.md`'nin "Router-only sistemler (RFC bridge)" bölümü ve
  `adt_rfc_bridge.py`/`adt_rfc_probe.py`'nin docstring'leri de bu yeni
  varsayılan davranışı (gömülü = varsayılan, elle kurulum = sadece override/
  bozuk paket durumunda fallback) yansıtacak şekilde güncellendi.
- **Bilinçli olarak DEĞİŞTİRİLMEYEN**: `adt_rfc_bridge.py`/
  `adt_rfc_probe.py`'nin kendisi (marshalling, `_ensure_sapnwrfc_dll_dir()`
  dahil) — bu fonksiyon zaten sadece `SAPNWRFC_HOME` ortam değişkenine
  bakıyor, biz onu nereye işaret ettireceğimizi (embedded ya da kullanıcının
  kendi kurulumu) `rfcBridgeManager.ts`'ten env enjeksiyonuyla kontrol
  ediyoruz — Python script'lerinin içine "embedded mi değil mi" mantığı
  hiç sızmadı.
- **Gelecekte dokunma notu**: `resources/rfc-runtime`'ı asla `git add`
  etme — bu klasör SAP'nin lisanslı SDK'sını içeriyor, private bile olsa
  bir uzak repoya taşınmaması bilinçli bir tercih. Yeni bir build
  makinesine geçerken bu klasörü elle (güvenli bir dosya paylaşımıyla,
  git'in dışında) taşı.

## "Özel Python çalıştırıcısı" ayarı kaldırıldı (2026-08-23, TAMAMLANDI)

Gömülü RFC runtime'ı geldikten sonra bu alan artık gereksiz bir kafa
karışıklığı kaynağıydı (kullanıcı "her bilgisayarda çalışacak" beklerken
gelişmiş/opsiyonel bir override görüyordu) — kaldırıldı:

- `AppConfig.pythonPath` (`shared/types.ts`, `store.ts` `defaultConfig`)
  silindi. `launcher.ts`'teki RFC bridge dalı artık HER ZAMAN
  `getEmbeddedRfcRuntime()`'ı kullanıyor, sadece paket bozuksa/eksikse
  (`resources/rfc-runtime` yoksa) son çare olarak sistem `"py"`'a düşüyor —
  kullanıcının elle bir yol girme seçeneği tamamen kaldırıldı.
- `rfcBridgeManager.ts` `describeFailure()`'daki "Ayarlar'dan Python yolu
  gir" önerileri "uygulamayı yeniden kur" mesajına çevrildi (artık
  kullanıcının yapabileceği bir ayar adımı yok).
- `SettingsModal.tsx`, `KULLANIM-REHBERI.md`, `sap-adt-readonly/SKILL.md`
  içindeki ilgili tüm metinler kaldırıldı/güncellendi.

## RFC Bridge 502 Hatalarında Gerçek Sebep Artık Görünür (2026-08-23, TAMAMLANDI) — canlı bulgu

**Şikayet (canlı sistem, router-only)**: RFC bridge (`127.0.0.1:8788`) ve ADT
read-only server (`127.0.0.1:8787`) ayaktaydı, ama `adt_logon` (gerçek bir
`SADT_REST_RFC_ENDPOINT` çağrısı) **502** ile başarısız oluyordu. Kullanıcı
doğru teşhis etti: bu bir kimlik bilgisi sorunu değil, RFC bridge'in kendisi
SAP'a gerçek bir RFC bağlantısı kuramıyordu — muhtemelen Basis'in
`saprouttab`'ında raw HTTPS için izin verilmiş olsa da RFC/gateway trafiği
için ayrı bir izin satırı eksikti.

**Kök sebep (kod tarafında, teşhisi zorlaştıran gerçek bir bug)**:
`adt_rfc_bridge.py`'nin 502 yanıtı gövdesinde başarısız olan gerçek pyrfc/RFC
istisnasının metnini taşıyordu (`adt-rfc-bridge error calling
SADT_REST_RFC_ENDPOINT: <gerçek hata>`) — AMA `adtDiscovery.ts`'teki
`verifyCredentials()` bu gövdeyi **hiç okumuyordu**, sadece `res.resume()`
ile atıp "Beklenmeyen HTTP durumu: 502" diyordu. Yani en kritik teşhis bilgisi
(gerçek istisna — `RFC_COMMUNICATION_FAILURE`, `NIEROUT_PERM_DENIED`, logon
hatası vb.) kullanıcıya/agent'a **hiçbir zaman ulaşmıyordu**, sadece çıplak
"502" görünüyordu — kullanıcı bunu ancak elle `curl`/log inceleyerek
öğrenebilirdi (bu oturumda tam olarak öyle yaptı).

**Düzeltme**:
- `verifyCredentials()`'ın hem doğrudan (non-router) hem router üzerinden
  giden dalı artık 200/401 dışındaki durumlarda yanıt gövdesini okuyup
  (`unexpectedStatusMessage()`, max 400 karakterlik özet) mesaja ekliyor —
  `CredentialVerifyResult.message` artık "Beklenmeyen HTTP durumu: 502 —
  adt-rfc-bridge error calling SADT_REST_RFC_ENDPOINT: <gerçek pyrfc hatası>"
  şeklinde, gerçek kök sebebi taşıyor.
- `launcher.ts`'e `describeRfcEndpointFailure()` eklendi — bu mesajdaki
  yaygın kalıpları (`NIEROUT_PERM_DENIED`/route izni, `RFC_COMMUNICATION_
  FAILURE`/ağ-parametre, logon hatası) tanıyıp elle teşhis yapmadan aynı
  sonuca (Basis/saprouttab RFC izni mi, yanlış ashost/sysnr mi, yoksa RFC
  logon'un kendisi mi reddedildi) otomatik ulaşan bir not ekliyor —
  `attemptRfcBridgeAutoStart()`'ın `detailNote`'una (sap-context.md'ye
  yazılan) ekleniyor.
- Bu sistemdeki gerçek durum (kullanıcının teşhisi doğrulandı): 502 gövdesi
  büyük olasılıkla `NIEROUT_PERM_DENIED`/`RFC_COMMUNICATION_FAILURE` taşıyor
  — **kalıcı çözüm Basis'in `saprouttab`'a bu ashost:sysnr için ayrı bir RFC/
  gateway `P` (permit) satırı eklemesi**, kod tarafında ek bir şey
  yapılamaz (raw HTTPS izni ile RFC izni SAProuter'da ayrı kurallardır).
- `npm run typecheck` ve `npm run build` temiz geçti. Gerçek bir 502 gövdesine
  karşı canlı doğrulama bu oturumda yapılamadı (bu makinede pyrfc/SDK yok) —
  kullanıcının bir dahaki router-only bağlantısında `sap-context.md`'deki
  yeni notu ve toast mesajını görmesi gerekiyor.

## ADT Read-Only Sunucusu (%sap-adt-readonly, port 8787) da RFC Bridge ile Aynı Desende Otomatik Başlatılıyor (2026-08-23, TAMAMLANDI) — Limak canlı oturumundan çıkan istek

**İstek**: Limak sisteminde RFC bridge'in (8788) canlı olarak çalıştığı
doğrulandıktan sonra kullanıcı şunu istedi: "bu bağlantının routerli olan her
sistemde otomatik olarak işliyor olması lazım, routerli olmayan sistemlerde ise
varolan process ile otomatik axet açılınca sisteme bağlı açılması gerekiyor."
Yani iki madde:
1. Router'lı sistemlerde RFC bridge otomatik başlatması zaten **genel** bir
   mekanizma (`isRouterPermissionDenied()` her sistemde tetiklenir, Limak'a
   özel bir kod yolu yok) — bu zaten karşılanıyordu, ek bir değişiklik
   gerekmedi.
2. **Eksik olan kısım**: `%sap-adt-readonly`'nin arkasındaki gerçek Python
   sunucusu (`adt_readonly_server.py`, port 8787) hiçbir bağlantı türünde
   (router'lı VEYA router'sız) launcher tarafından başlatılmıyordu — kullanıcı/
   agent HER bağlanışta terminalde elle `ADT_CWD=$(pwd) py
   adt_readonly_server.py --port 8787` çalıştırmak zorundaydı (bkz.
   `sap-context.md`'nin eski "Yöntem 1" bölümü ve `SKILL.md`'nin "Step 2"si).
   RFC bridge zaten otomatikleşmişken bu adımın hâlâ elle yapılması tutarsızdı.

**Çözüm — `attemptRfcBridgeAutoStart()`'ın BİREBİR AYNI deseni, ikinci bir
process için**:
- **`app-electron/main/adtReadonlyServerManager.ts`** (yeni,
  `rfcBridgeManager.ts`'in birebir kopyası/uyarlaması) — `startReadonlyServer()`
  proje klasörü başına (`Map<projectDir, RunningServer>`) `adt_readonly_
  server.py`'yi spawn eder, `/health`'i 500ms aralıklarla en fazla 15s polling
  ile bekler, log'u `adt-readonly.log`'a yazar. **Ek bir davranış (RFC bridge
  manager'da yok)**: spawn etmeden ÖNCE portu doğrudan `healthCheck` ile
  probe'luyor — kullanıcı zaten elle (veya önceki bir launcher oturumundan)
  8787'de bir sunucu çalıştırıyorsa bunu **`external: true`** olarak kabul
  ediyor, ikinci bir process açıp `EADDRINUSE`'a düşmüyor (ve `stopReadonlyServer`
  bu `external` process'i öldürmüyor — sadece kendi başlattığı process'i
  yönetiyor). `describeFailure()` bu sunucuya özgü hataları (
  `requests`/`mcp`/`python-dotenv` eksik, port çakışması) tanıyor — RFC/pyrfc/
  SDK'yla hiç ilgisi yok, çünkü bu sunucu **pyrfc/SAP NW RFC SDK'ya hiç ihtiyaç
  duymuyor** (düz `requests` ile HTTP'ye konuşuyor — router-only sistemlerde
  bile hedefi zaten yerel RFC bridge'in kendisi olan `http://127.0.0.1:8788`,
  pyrfc'siz). Bu yüzden gömülü RFC runtime'ı (`getEmbeddedRfcRuntime()`)
  kullanılmıyor — sistemdeki `"py"` çalıştırıcısı kullanılıyor (mevcut elle
  kurulum dokümantasyonuyla aynı varsayım; `requests`/`mcp`/`python-dotenv`'in
  kurulu olması gerekiyor, `pip install -r requirements.txt`).
- **`launcher.ts` `attemptReadonlyServerAutoStart()`** (yeni) — `.conn_adt`
  yazıldıktan ve (varsa) RFC bridge outcome'u belirlendikten SONRA,
  **`DEFAULT_READONLY_SERVER_PORT = 8787`** ile çağrılır. Script yolu RFC
  bridge ile birebir aynı öncelik sırasıyla bulunur (`scriptRel = ["sap-adt-
  readonly", "scripts", "adt_readonly_server.py"]`, önce proje klasöründeki
  kopya, yoksa toolkit kökü). Tek atlama koşulu: `rfcBridge && rfcOutcome.
  credentialsInvalid` — bu durumda `connectToSystem()` zaten `ok:false` ile
  terminal açmadan dönüyor, sunucu başlatmanın anlamı yok. **Diğer TÜM
  durumlarda** (router'sız direkt bağlantı, router'lı+doğrulanmış RFC bridge,
  router'lı+doğrulanamamış-ama-çalışan RFC bridge) sunucu başlatılmaya
  çalışılır — RFC bridge modunda `.conn_adt`'taki `ADT_SAP_URL` zaten yerel
  bridge'e (8788) işaret ettiği için read-only sunucusu (8787) otomatik olarak
  bridge üzerinden SAP'a konuşur, ekstra bir yönlendirme kodu gerekmedi.
- **`buildContextMarkdown()`**'a yeni `readonlyOutcome` parametresi eklendi —
  "Yöntem 1" bölümündeki eski sabit "başlat" komutu, artık gerçek otomatik
  başlatma durumunu (başlatıldı ✓ / zaten çalışıyordu ✓ / BAŞARISIZ + detay)
  söyleyen dinamik bir satıra (`readonlyServerStatusLine`) çevrildi; elle
  başlatma komutu hâlâ orada ama artık "SADECE yukarıdaki durum BAŞARISIZ ise"
  notuyla ikinci plana düştü — agent artık körlemesine her seferinde "sunucu
  ayakta mı" diye kontrol edip elle başlatmayı denemek zorunda değil, önce
  bu durumu okuyabilir.
- **`main/index.ts`**: `stopAllReadonlyServers()` (yeni export) `window-all-
  closed`/`before-quit`'te `stopAllRfcBridges()`'in yanına eklendi — zombi
  `python.exe` kalmasın diye, mevcut temizlik noktasıyla aynı yer.
- **`SKILL.md`** ("Step 1"/"Step 2") güncellendi: aXet SAP Launcher içindeyken
  önce `sap-context.md`'deki otomatik başlatma durumuna bakılması, elle
  başlatmanın (Step 2) sadece "BAŞARISIZ" durumunda gerekli olduğu not edildi
  (bu SKILL.md launcher dışında/tek başına klonlanmış repo olarak da
  kullanılabildiği için elle adımlar kaldırılmadı, sadece ikincil plana
  alındı).
- **Bilinçli tasarım kararı — neden RFC bridge'inkinden farklı python
  seçimi**: RFC bridge embedded runtime kullanıyor çünkü pyrfc/SDK'ya
  ihtiyacı var ve bunlar lisanslı/büyük bağımlılıklar (gömülü olmaları
  kullanıcı deneyimini kurtarıyor). Read-only sunucusu sadece `requests`/`mcp`/
  `python-dotenv` istiyor — bunlar embedded Python'a eklenmedi (embedded
  runtime sadece pyrfc+dotenv taşıyor, bkz. "Gömülü RFC Runtime" bölümü) ve
  `mcp` paketi nispeten büyük/sık güncellenen bir bağımlılık olduğu için
  şimdilik gömülmedi — kullanıcının sistem Python'una `pip install -r
  requirements.txt` yapmış olması hâlâ gerekiyor. Bu, gelecekte embedded
  runtime'a `requests`/`mcp`/`python-dotenv` eklenip bu sunucunun da tam
  sıfır-kurulum hale getirilebileceği bir genişletme noktası (henüz
  yapılmadı, kapsam dışı bırakıldı — kullanıcı bunu istemedi, sadece
  "otomatik başlatma" istedi, "kurulum gerektirmesin" değil).
- `npm run typecheck` ve `npm run build` temiz geçti. Gerçek bir GUI
  penceresinde/Limak'ın kendi router'ına karşı bu otomatik başlatmanın
  (özellikle RFC bridge + read-only server'ın birlikte, doğru sırada, aynı
  proje klasöründe ayağa kalkması) ucuca canlı testi bu oturumda yapılamadı —
  kullanıcının bir dahaki bağlantısında (router'lı VEYA router'sız herhangi
  bir sistemde) doğrulaması gerekiyor; `%sap-adt-readonly`'ye ilk soru
  sorulduğunda artık "NOT RUNNING" değil doğrudan bir yanıt beklenir.
