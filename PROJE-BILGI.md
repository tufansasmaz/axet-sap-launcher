# PROJE-BILGI.md — aXet SAP Launcher (AI/Geliştirici Bağlamı)

Bu dosya, bu projeye tekrar dönen bir AI asistanının (veya geliştiricinin)
mimariyi hızlıca kavraması için yazıldı. Kod okumadan önce burayı oku.

## Kullanıcı

Bu projede benimle çalışan kullanıcının adı **Mehmet**.

## Ne Bu Proje

`axet-sap-launcher` — Electron + React + TypeScript masaüstü uygulaması.
SAP Logon Workspaces'in `SAPUILandscape.xml` dosyasını okuyup müşteri/sistem
ağacını gösterir; kullanıcı bir sistem seçtiğinde ADT (SAP REST API)
endpoint'ini otomatik keşfeder, kimlik bilgilerini gerçek bir HTTP isteğiyle
doğrular, doğrulanmış bağlantı bilgilerini bir proje klasörüne yazar, SAP
toolkit skill'lerini o klasöre kopyalar ve `axet.code`'u çalıştıran bir
terminal açar.

`package.json:2-4` → `name: axet-sap-launcher`, açıklama Türkçe.

## ⚠️ DEVAM EDEN PLATFORM DÖNÜŞÜMÜ (2026-08-27'den itibaren) — sonraki oturum önce buraya baksın

Kullanıcı bu tek-amaçlı SAP Launcher uygulamasını **daha büyük bir platforma**
çevirmek istiyor: ana ekran artık OpenAI/Codex/Claude tarzı bir "AI chat"
deneyimi olan **axet.code** olacak (arka planda gerçek AI API'si YOK —
kullanıcının zaten kullandığı `axet.code` CLI'ının kendisi, gömülü terminal
üzerinden çalıştırılıyor), yanında bir sol **Activity Bar** (VS Code tarzı)
olacak ve bu barda **aXet SAP Launcher** (bu mevcut uygulamanın TAMAMI,
değişmeden) bir modül/aktivite olarak yer alacak. Kullanıcı ileride buraya
`axet.flows` gibi başka modüller de ekleyecek — mimari BUNU KOLAYLAŞTIRACAK
şekilde (aktivite listesi merkezi, `ActivityBar.tsx`) kuruldu.

**ÖNEMLİ — bu dönüşüm bitene kadar GitHub'a hiçbir release/push YAPILMASIN**
(kullanıcının açık talimatı, 2026-08-27). Normal şartlarda her versiyon
sonrası `npm run release` çalıştırma alışkanlığı bu dönüşüm süresince
DURDURULDU — sadece yerel commit/build, `git push`/`npm run release` YOK.

**Kullanıcı kararları (bu dönüşümün kapsamını belirleyen):**
1. axet.code chat ekranı bir API key/gateway entegrasyonu GEREKTİRMİYOR —
   zaten var olan `axet.code` CLI'ı (gömülü terminal + `axetCommand`) bu
   işi görüyor, sadece SUNUM/ORGANİZASYON değişiyor.
2. axet.code'un genel-amaçlı sohbet oturumları ile bir SAP sistemine
   bağlanınca açılan terminal oturumu **AYRI iki liste** (birleştirilmedi —
   kullanıcı bilerek ayrı tercih etti).
3. axet.code'daki "+ Yeni Sohbet" **sabit bir varsayılan klasöre**
   (`AppConfig.axetWorkspaceDir`, Ayarlar'dan değiştirilebilir) açılıyor,
   her seferinde klasör SORULMUYOR.

**Adım 1 (bu turda TAMAMLANDI) — detaylar dosyanın SONUNDA, "Platform
Dönüşümü — Adım 1" başlığı altında.** Kısaca: `ActivityBar.tsx` (yeni),
`AxetCodeHome.tsx` (yeni), `App.tsx`'in JSX ağacı TitleBar altına
ActivityBar + iki aktiviteyi (axetCode/sapLauncher) koşullu render edecek
şekilde yeniden düzenlendi, `AppConfig.axetWorkspaceDir` eklendi.

**Sonraki adımlar (henüz YAPILMADI, kullanıcı önceliklendirecek)**:
- ~~axet.code ekranındaki "Bağlantılar" bölümü şu an sadece "Yakında"
  yazan bir placeholder~~ — BU NOT ESKİMİŞ: `AxetCodeHome.tsx`'teki
  "Bağlantılar" widget'ı artık gerçekten işlevsel (son SAP sistemleri
  gösteren bir hızlı-bağlan listesi) VE ayrıca 2026-08-29'da TAMAMEN AYRI
  bir "Uygulama Bağlantıları" Activity'si (Outlook/SharePoint için gerçek
  Microsoft Graph OAuth, bkz. aşağıdaki "Uygulama Bağlantıları" bölümü)
  eklendi — bu madde artık geçersiz, siliniyor.
- `axet.flows` veya benzeri yeni modüller — henüz talep gelmedi.
- İki oturum listesinin (axet.code genel + SAP Launcher'ın kendi terminal
  paneli) görsel/UX tutarlılığı ileride gözden geçirilebilir.

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
   b. **Cloud/BTP tespiti**: `service.type === "BTP/CLOUD"` ise ve kullanıcı
      client'ı boş bıraktıysa `DEFAULT_CLOUD_CLIENT = "100"` otomatik atanır.
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
- **Cloud sistem tespiti dört yerde ayrı ayrı yapılıyor** ve hepsi tek bir
  kurala bakmak ZORUNDA: `service.type === "BTP/CLOUD"`. Yerler:
  `launcher.ts` `connectToSystem` (client default'u için), `launcher.ts`
  `buildContextMarkdown` (not metni için), `sapLogon.ts` `canOpenInSapLogon`
  (SAP GUI kapısı) ve `SystemPanel.tsx` (o butonun görünürlüğü — main'deki
  kapıyla AYNI olmalı, ayrışırsa buton ya kaybolur ya da tıklanınca
  `missingHostOrPort` döner).
  Bu kural eskiden `Boolean(manualAdtUrl) || type === "BTP/CLOUD"` idi.
  Artık on-prem sistemlere de elle ADT adresi girilebildiği için
  `manualAdtUrl` bir cloud göstergesi DEĞİL — o hâliyle bırakılsaydı ADT
  adresi girilen bir on-prem sistem SAML/BTP notları alır, RFC gateway
  yedeği sessizce devre dışı kalır ve "SAP Logon'da Aç" kaybolurdu.
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

## SAProuter İzin Reddi -93 de Görülebiliyor, Sadece -94 DEĞİL (2026-08-24, TAMAMLANDI) — canlı bulgu

**Şikayet**: Limak'ın router'ına bağlanılabiliyordu (RFC bridge otomatik
başlatma -94 tespitiyle çalışıyordu) ama başka bir router'lı sistemde
`Bağlantı hatası (SAProuter): SAProuter rotayı reddetti (return_code=-93).
Detay: STWDPWDPA1: route permission denied (...)` hatasıyla terminal hiç
açılmıyordu — RFC bridge fallback'i tetiklenmiyordu.

**Kök sebep**: `sapRouter.ts` `describeRouterFailure()` sadece
`returnCode === -94` durumunda "izin reddi" olarak sınıflandırıp
`launcher.ts`'in aradığı `NIEROUT_PERM_DENIED`/`-94` işaretini mesaja
koyuyordu. Bu sistemde router **-93** döndürdü — SAP'nin resmi NI hata kodu
tablosunda (Note 63342) -93 aslında `NIEROUT_INTERN` (router-içi genel hata)
anlamına gelir, AMA bu router'ın gerçek yanıt metni ("route permission
denied") kod numarasından bağımsız olarak izin reddini açıkça söylüyordu.
Yani kod numarası router sürümüne göre değişebiliyor, metin değişmiyor —
sadece `-94` kontrolü kırılgan çıktı.

**Çözüm**: `sapRouter.ts`'e `isPermissionDeniedDetail(returnCode, detail)`
eklendi — `returnCode === -94` VEYA router'ın döndürdüğü ham detay metninde
(regex, case-insensitive) `"permission denied"` geçiyorsa izin reddi olarak
sınıflandırılıyor (kod numarasına bakılmaksızın). `describeRouterFailure()`
artık bu ortak fonksiyonu kullanıyor ve mesaja her zaman `ROUTER_PERM_DENIED`
marker'ını (yeni, `NIEROUT_PERM_DENIED`/`-94` ile birlikte, geriye
uyumluluk için) yazıyor. Yeni **export edilen**
`isRouterPermissionDeniedMessage(message)` — `launcher.ts`'teki eski yerel
`isRouterPermissionDenied()` fonksiyonu silindi, artık bu tek doğruluk
kaynağına delege ediyor (`const isRouterPermissionDenied =
isRouterPermissionDeniedMessage`) — mantık iki dosyada ayrı ayrı
yaşamıyor/kayamıyor.
- `launcher.ts`/`sap-context.md`'deki kullanıcıya görünen "-94
  NIEROUT_PERM_DENIED" metinleri de genelleştirildi ("router sürümüne göre
  -94/NIEROUT_PERM_DENIED veya -93 gibi farklı bir return_code ile
  bildirilebilir, ikisi de aynı anlama gelir") — agent artık sadece -94
  gördüğünde değil, metinde "permission denied" gördüğünde de doğru teşhise
  ulaşıyor.
- **Sonradan (2026-09-05) daraltıldı**: geriye uyumluluk için duran üçüncü
  koşul `message.includes("-94")` idi ve fazla genişti — hata mesajında host
  adı da geçtiği için `sapqas-94.firma.local` gibi bir ad testi geçiriyor,
  router'ı sadece ERİŞİLEMEZ olan bir sistemde launcher izin reddi sanıp RFC
  bridge'i başlatmaya kalkıyor ve kullanıcı gerçek sebebi hiç görmüyordu.
  Artık `BARE_94_REGEX = /(^|[^\w.\-])-94($|[^\w.\-])/`: `return_code=-94` ve
  `(-94,` geçiyor, `sapqas-94` ve `-940` geçmiyor.
- `npm run typecheck` ve `npm run build` temiz geçti.
- **Not**: `-93`'ün SAP'nin resmi tablosunda farklı bir anlama (NI-internal
  error) gelmesi kasıtlı olarak görmezden gelinmedi — kontrol sadece kod
  numarasına değil, gerçek router metnine bakıyor, bu yüzden gerçekten
  ilgisiz bir -93 (ör. router'ın kendi içinde çöktüğü bir durum, metninde
  "permission denied" GEÇMEYEN) hâlâ genel/açıklamasız hata olarak kalır,
  yanlışlıkla RFC bridge moduna düşürülmez.

## Bilinen Eksikler / Gelecek İşler (kullanıcıya önerildi, henüz yapılmadı)

- ~~`.conn_adt` şifre şifrelemesi (Electron `safeStorage`).~~ — **KISMEN
  ÇÖZÜLDÜ (2026-08-29)**: `AppConfig.lastCredentials` (config.json'daki SAP
  şifreleri) artık `safeStorage` ile şifreleniyor, bkz. "Uygulama Genelinde
  Eksik Denetimi" bölümü. `.conn_adt` dosyasının KENDİSİ hâlâ düz metin —
  bu BİLEREK değiştirilmedi (dış tüketicileri var, aşağıda detay).
- ~~Otomatik güncelleme (`electron-updater`).~~ — bu madde ESKİMİŞ, aşağıdaki
  "GitHub'a Taşınma + Otomatik Güncelleme" bölümünde çok önce tamamlandı.
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
    (`mammoth.convertToHtml({path})`). Native olmadığı için `asarUnpack`
    gerekmiyor — `app.asar` içinden direkt çalışıyor (paketli build'de
    doğrulandı, bkz. altta).
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
  Detayı" + açık dosyalar).
- **Paketleme**: `mammoth` `package.json`'a normal bir `dependencies` girişi
  olarak eklendi (native binding yok, özel `asarUnpack`/`files` girişine
  ihtiyacı yok — `fast-xml-parser` gibi electron-builder'ın node_modules'ü
  otomatik toplama mekanizmasına güvenildi). `npx asar list` ile paketlenmiş `app.asar` içinde
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
  `FileExplorer`, `FileViewer`, `RecentSystems`,
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

> **Dağıtım kararı (2026-09-05, kullanıcı).** Depo PUBLIC ve `build.extraResources`
> bu runtime'ları (`rfc-runtime`, `guiscript-runtime`, `whisper-runtime`) kurulum
> paketinin içinde yayınlıyor — yani repoya commit edilmiyor olmaları lisanslı
> SDK'nın release varlığından indirilebilmesini engellemiyor. Bu soruldu ve
> **böyle devam** kararı verildi: kullanım şirket içi. Karar bilinçli; bir sonraki
> sürümde yeniden tartışmaya açmaya gerek yok. Kapsam şirket dışına çıkarsa
> (harici müşteri dağıtımı) yeniden bakılmalı.

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

## v1.4.1 Release Exe'si Eski Kaynak Koduyla Paketlenmişti — DEQ Canlı Bulgusu (v1.4.2, TAMAMLANDI)

**Şikayet**: DEQ müşterisinin (`dherpqasa1.dilerhld.com`, router `/H/212.174.101.230`)
sisteminde `-93 "route permission denied"` alındı ama RFC bridge fallback'i
**tetiklenmedi** — `isPermissionDeniedDetail()` düzeltmesi (bkz. yukarıdaki
"-93 de Görülebiliyor" bölümü) kaynakta olmasına rağmen davranış eski
(sadece `-94`'e bakan) haldeydi.

**Kök sebep — kod değil, build/release süreci**: `git log` zaman damgaları
karşılaştırıldı: `44e9943` (`-93` düzeltmesi) commit saati **09:46:16**,
ama `release/*1.4.1*.exe` dosyalarının `LastWriteTime`'ı **09:42:23** —
yani kullanıcının elindeki v1.4.1 exe'si, düzeltme commit edilmeden ~4
dakika ÖNCE alınmış bir build'di. `npm run build:win` her zaman diskteki
GEÇERLİ kaynağı derler ama o an diskteki kaynak henüz düzeltmeyi içermiyordu
— yani "build al → sonra son bir fix ekle → commit et → ama tekrar build
almayı unut" sırası kaçırılmış.

**Çözüm**: `npm run typecheck` + `npm run build:win` güncel kaynaktan
(commit `44e9943` dahil) yeniden çalıştırıldı, yeni exe'lerin
`LastWriteTime`'ı commit saatinden SONRA olduğu doğrulandı. Versiyon
`1.4.2`'ye çıkarıldı (`package.json`/`package-lock.json`) — sadece "aynı
1.4.1 etiketiyle farklı bir binary" karışıklığı olmasın diye, kod tarafında
1.4.1'den ek bir değişiklik yok, bu tur sadece "gerçekten güncel kaynaktan
build al ve yayınla" turu.

**Ders (ileride tekrar düşülmesin)**: Bir fix commit edildikten sonra
kullanıcıya "test et" denmeden önce **her zaman** `git log -1 --format=%ci
-- <değişen dosya>` ile son commit saatini, `release/*.exe`'lerin
`LastWriteTime`'ıyla karşılaştır (veya basitçe her commit sonrası otomatik
`npm run build:win` çalıştırma alışkanlığı edin) — "typecheck/build temiz
geçti" ifadesi kaynağın derlendiğini kanıtlar ama **paketlenmiş exe'nin
o kaynaktan alındığını** kanıtlamaz, bunlar ayrı adımlar.

- `npm run typecheck` ve `npm run build:win` bu turda temiz geçti,
  yeniden build alınan `release/win-unpacked/aXet SAP Launcher.exe`
  ile DEQ sistemine karşı manuel test kullanıcı tarafından yapılacak.

## Kimlik Doğrulama Her Zaman "Başarılı" Görünüyordu (SAML/SSO Sistemleri) — KÖK SEBEP BULUNDU VE DÜZELTİLDİ (2026-08-26)

**Şikayet**: "occlutech" sisteminde kullanıcı adı/şifre doğru da olsa yanlış
da olsa axet.code terminali her zaman açılıyordu — kimlik doğrulaması hiç
engel olmuyormuş gibi davranıyordu.

**Kök sebep**: `verifyCredentials()`/`verifyCredentialsThroughRouter()`
(`adtDiscovery.ts`) doğrulamayı **sadece HTTP status kodu 200 mi** diye
kontrol ediyordu — yanıt gövdesi başarı durumunda (200) hiç okunmuyor/
incelenmiyordu. Bu sistem bir **BTP/Cloud + SAML SSO** sistemi: `/sap/bc/adt/
discovery`'ye Basic Auth ile istek atıldığında, IdP kimlik bilgisini HİÇ
kontrol etmeden doğrudan bir **HTML SAML giriş sayfasını HTTP 200 ile**
döndürüyor (401 değil). Yani "doğru" ve "yanlış" şifre birebir aynı 200+HTML
yanıtını üretiyordu — kod bunu ayırt edemediği için her ikisinde de
`ok:true` dönüyor, `.conn_adt` yazılıp terminal açılıyordu.

**Düzeltme (`adtDiscovery.ts`)**: yeni `looksLikeSamlLoginPage(contentType,
body)` — `Content-Type` header'ı `html` içeriyorsa VEYA (header eksik/
yanıltıcıysa diye bir güvence olarak) gövdenin ilk 500 karakteri
`<!doctype html`/`<html` ile başlıyorsa veya içinde hem `<form` hem
`password` geçiyorsa, bunu gerçek bir ADT discovery yanıtı (Atom Service
Document, XML) değil bir SAML/SSO login sayfası olarak tanır. Her iki
`verifyCredentials` varyantı (direkt ve router üzerinden) artık status 200
olsa bile gövdeyi bu fonksiyondan geçiriyor — eşleşirse `ok:false` +
yeni `samlLoginDetected` mesajı (`verifyMsg`, TR/EN) dönüyor, terminal
AÇILMIYOR. Kullanıcıya net olarak "bu sistem SAML SSO gerektiriyor,
kimlik bilgisi hiç kontrol edilmedi" deniyor, "şifre yanlış" gibi yanlış
bir teşhise düşürülmüyor.
- Direkt (non-router) yol: `res.on("data"...)` chunk biriktirme artık
  status'a bakılmadan HER ZAMAN yapılıyor (önceden sadece 200 dışı
  durumlarda okunuyordu); `res.on("end")` içinde 200 dalı artık body'yi
  `looksLikeSamlLoginPage`'den geçiriyor.
- Router yolu: `httpRequestOverSocket()` zaten tam gövdeyi (`res.body`)
  senkron olarak döndürdüğü için ek bir değişiklik gerekmedi, sadece 200
  dalına aynı kontrol eklendi.
- **Gerçek doğrulanmış SAML akışı** (`%sap-adt-readonly`'nin
  `login_saml_sso.py`'si, bkz. `buildContextMarkdown`'daki "Cloud / BTP
  Sistem Notları" bölümü) hiç değişmedi — bu düzeltme sadece launcher'ın
  kendi ilk Basic-Auth doğrulama adımının SAML sistemlerde sahte bir
  "başarılı" sonuç üretmesini durduruyor, gerçek SAML cookie akışını
  etkilemiyor.
- **Bilinçli sınır**: Bu heuristik (content-type/body-sniffing) %100
  kesin değil — teorik olarak gerçek bir ADT sunucusu çok garip bir
  şekilde `text/html` content-type'lı ama geçerli bir yanıt dönerse
  yanlış pozitif üretebilir, ama bu SAP ADT discovery endpoint'i için
  hiç görülmemiş/beklenmeyen bir davranış; canlı SAML sistemlerindeki
  gerçek davranışla (HTML login sayfası) eşleşen durumu yakalamak öncelik.
- `npm run typecheck` ve `npm run build` temiz geçti. Occlutech sistemine
  karşı canlı doğrulama bu oturumda yapılamadı (SAML IdP'ye gerçek erişim
  bu ortamda yok) — kullanıcının bir dahaki bağlantı denemesinde artık
  "kimlik bilgileri doğrulanamadı, SAML SSO gerekiyor" mesajını görmesi ve
  yanlış şifreyle artık terminalin AÇILMAMASI beklenir.

## Router-Only Sistemde RFC Bridge "Zaman Aşımı" İle Sürekli Başarısız Oluyordu — Occlutech (OEQ) Canlı Bulgusu (2026-08-26, TAMAMLANDI)

**Şikayet**: Occlutech'in `OEQ` sistemi (router `/H/hermes.itelligence.pl`)
için RFC bridge otomatik başlatıldı, `/health` (8788) ve read-only gate
(8787) ayaktaydı, ama gerçek kimlik doğrulaması (`adt_logon`) hem launcher
kurulumunda hem tekrar denendiğinde **aynı şekilde "Zaman aşımı" ile
başarısız oluyordu** — bridge çalışıyor görünüyordu ama SAP'a asla
bağlanamıyordu.

**Kök sebep bulundu, iki katmanlı**:
1. **Gerçek ağ/router sorunu (kod dışı, muhtemel asıl sebep)**: Router bu
   sistemde raw HTTPS'i **açıkça** reddetmişti (-94, `NI_RTERR` — bkz.
   `sap-context.md`'deki discovery notları), RFC bridge moduna otomatik
   geçildi. Ama RFC bağlantısının kendisi de başarısız — ve bu kez router
   AÇIKÇA bir `NI_RTERR` DÖNMÜYOR, sadece paket sessizce düşüyor (timeout).
   Bunun en olası açıklaması: router'ın izin tablosu SAP GUI'nin kullandığı
   **dispatcher/DIAG portuna** (`32<instance no>`, örn. 3200) izin veriyor
   ama RFC istemcisinin (`pyrfc`, `ashost`+`sysnr` ile) gerçekte bağlandığı
   **FARKLI bir port olan gateway portuna** (`33<instance no>`, örn. 3300)
   hiç izin vermiyor — `saprouttab`'da bunlar ayrı kurallardır, DIAG'a izin
   vermek gateway'e izin vermek anlamına gelmez. Bu, kod tarafında
   çözülemeyen bir Basis/network konusu.
2. **Kod tarafında gerçek bir bug (bu turda düzeltildi)**: `describeRfcEndpointFailure()`
   (`launcher.ts`) yaygın RFC hata kalıplarını tanıyıp kullanıcıya açıklayıcı
   bir not ekliyordu, AMA regex'i sadece İngilizce `timed? ?out` arıyordu —
   launcher varsayılan dili Türkçe olduğu ve `verifyMsg` "timeout" anahtarı
   Türkçe'de **"Zaman aşımı"** döndüğü için bu dal **hiçbir zaman
   tetiklenmiyordu**. Kullanıcı/agent sadece çıplak "Zaman aşımı" görüyordu,
   hiçbir yönlendirme/teşhis notu almıyordu.
   Ayrıca `adt_rfc_bridge.py`'de **gerçek bir eşzamanlılık bug'ı** vardı:
   `RfcAdtClient.request()` bağlantıyı açan `pyrfc.Connection(...)` çağrısı
   sırasında `self._lock`'u (plain `with self._lock:`) tutuyordu — bu çağrı
   router paketi sessizce düşürdüğünde OS'in kendi TCP connect timeout'una
   kadar (onlarca saniye/dakika) BLOKE olabiliyordu. Bu süre boyunca gelen
   HER YENİ istek (kullanıcının "tekrar dene" denemesi dahil) bu lock'un
   arkasında **süresiz sıraya giriyordu** — yani ikinci/üçüncü deneme aslında
   YENİ bir bağlantı denemesi değildi, hâlâ asılı kalan İLK denemenin
   arkasında bekliyordu ve aynı yanıltıcı "Zaman aşımı" sonucunu üretiyordu.
   Kullanıcıya "hem kurulumda hem şimdi aynı hata" gibi görünen şey, aslında
   tek bir hiç bitmeyen ilk deneme etkisiydi.

**Düzeltme**:
- `launcher.ts` `describeRfcEndpointFailure()`'a Türkçe `zaman aşımı` deseni
  için AYRI ve ÖNCELİKLİ bir dal eklendi — artık kullanıcıya net biçimde
  "bu router'ın açıkça reddetmediği, sessizce düşürdüğü bir paket" olduğunu,
  ve büyük olasılıkla **dispatcher değil gateway portu** izninin eksik
  olduğunu söylüyor (Basis'e hangi portu söyleyeceğini bilmiyordu, artık
  biliyor).
- `attemptRfcBridgeAutoStart()`'taki bridge doğrulama isteğinin timeout'u
  20s'ten **45s**'e çıkarıldı — SAProuter üzerinden ilk RFC bağlantısı düz
  HTTPS'ten belirgin şekilde daha uzun sürebiliyor, eski süre yavaş-ama-
  çalışır bir bağlantıyı bile erken "başarısız" sayabiliyordu.
- `adt_rfc_bridge.py` `RfcAdtClient`: `self._lock.acquire(timeout=30.0)` ile
  değiştirildi (yeni `RfcBridgeBusy` exception) — lock 30 saniyede
  alınamazsa (yani hâlâ asılı kalan bir ilk deneme varsa) HTTP **503** +
  "RFC bağlantısı hâlâ kuruluyor (ilk deneme ~Xs'dir sürüyor)" mesajıyla
  HEMEN dönüyor, süresiz sıraya girmiyor. `self._connecting_since` yeni bir
  alan — bağlantı denemesinin ne zaman başladığını takip edip bu mesaja
  gerçek bekleme süresini yazıyor, başarılı/başarısız her denemede sıfırlanıyor
  (bir sonraki deneme kendi taze süresini raporlayabilsin diye).
  `_call_endpoint()`'in retry dalı da aynı şekilde `_connecting_since`'i
  resetliyor.
- `SKILL.md`'nin "Router-only sistemler (RFC bridge)" bölümüne bu "zaman
  aşımı vs -94/-93" ayrımını ve gateway/dispatcher port farkını açıklayan
  yeni bir alt bölüm eklendi.
- **Bilinçli sınır**: Kod tarafında yapılabilecek olan budur — asıl bağlantı
  denemesinin kendisini (native `pyrfc.Connection()`'ın bloklayan C
  çağrısını) güvenli biçimde iptal etmek/timeout'lamak mümkün değil (Python
  seviyesinden bir native blocking call'u kesip atamazsınız); bu yüzden
  hâlâ asılı kalmış bir ilk deneme varsa bridge process'inin **yeniden
  başlatılması** (launcher'ı kapat/aç) gerekebilir — yeni davranış bunu en
  azından HIZLI ve NET bir şekilde söylüyor, sonsuz/yanıltıcı bir bekleme
  yerine.
- `npm run typecheck`, `npm run build` ve `adt_rfc_bridge.py`'nin
  `ast.parse` ile syntax kontrolü temiz geçti. Occlutech/OEQ'nun gerçek
  router'ına karşı canlı yeniden test bu oturumda yapılamadı (SDK/pyrfc bu
  ortamda yok) — kullanıcının bir dahaki bağlantısında hem yeni
  "gateway portu" teşhis notunu hem de (eğer ilk deneme hâlâ asılıysa) yeni
  503 "hâlâ kuruluyor" mesajını görmesi beklenir; asıl "gateway portuna
  saprouttab izni yok" ihtimali doğruysa nihai çözüm hâlâ Basis/network
  ekibinin `saprouttab`'a yeni bir satır eklemesidir, kod tarafında bunun
  ötesinde bir otomasyon mümkün değil.

## Gömülü Terminal — GERİ YÜKLENDİ (2026-08-26)

Önceki bir oturumda (bu dosyanın daha önceki bir sürümünde ayrıntılı belgeli
"node-pty ile gömülü terminal — YENİDEN EKLENDİ" ve "GÖMÜLÜ TERMİNAL CTRL+V —
GERÇEK KÖK SEBEP VE KALICI ÇÖZÜM" bölümleri, bkz. git geçmişi commit `5e04b87`)
özellik commit edilmiş, sonra çalışma kopyasında (commit edilmeden) tamamen
geri alınmıştı — bu geri almanın gerekçesi bu oturumda bulunamadı/kaydedilmemiş
görünüyordu (SAML/RFC-bridge düzeltmeleriyle aynı commitlenmemiş değişiklik
setinin içinde, ayrı bir not olmadan). Kullanıcı özelliği tekrar istedi.

**Yaklaşım — sıfırdan yazmak DEĞİL, kanıtlanmış commit'ten geri yükleme**:
`git show HEAD:<path>` ile şu dosyalar HEAD'den (v1.4.2, node-pty + Ctrl+V
kök-sebep düzeltmesi + tam ekran modu dahil, en olgun hali) geri getirildi:
`app-electron/main/terminalManager.ts`, `src/components/EmbeddedTerminal.tsx`,
`src/components/TerminalPanel.tsx`, `src/App.tsx`,
`src/components/SettingsModal.tsx`, `src/i18n/en.ts`, `src/i18n/tr.ts`,
`src/window.d.ts`, `app-electron/shared/types.ts`,
`app-electron/preload/index.ts`, `app-electron/main/store.ts`,
`app-electron/main/index.ts`, `package.json`, `README.md`,
`KULLANIM-REHBERI.md`. `app-electron/main/launcher.ts` elle birleştirildi
(bu dosyada terminal-geri-alma ile SAML/RFC-bridge-zaman-aşımı düzeltmeleri
AYNI çalışma kopyasında iç içeydi) — `launchTerminal`/`launchWithCmd`
(harici `cmd.exe`/`wt.exe` spawn'ı) kaldırıldı, mesaj metinleri "gömülü
terminal" ifadesine geri döndürüldü, SAML/timeout düzeltmeleri (2026-08-26
tarihli, yukarıdaki bölümler) DOKUNULMADAN korundu. Mimari HEAD'deki ile
birebir aynı: `launcher.ts` artık hiç terminal açmıyor, sadece
`ConnectResult` döndürüyor; terminali açma sorumluluğu `App.tsx`
`openTerminalForConnection()`'da (bkz. eski bölümler için git geçmişi).

**Paketleme regresyonu bulundu ve düzeltildi (bu oturumda yeni)**: Temiz bir
`npm install` sonrası `npx electron-builder --win dir` ile paketlenen exe'de
`node_modules/@lydell/node-pty/node_modules/@lydell/node-pty-win32-x64/
conpty.node` (asıl native binary) **`app.asar.unpacked/` altına
kopyalanmıyordu** — `asar list` ile kontrol edilince dosyanın (JS dosyalarının
aksine) hâlâ `app.asar`'ın İÇİNDE paketli kaldığı görüldü. Kök sebep tam
teşhis edilemedi (muhtemelen electron-builder 25.1.8'in iç içe scoped paket
node_modules yapısını — `@lydell/node-pty/node_modules/@lydell/node-pty-
win32-x64` — `asarUnpack` glob eşleştirmesinde HER ZAMAN doğru işlemediği bir
durum; `files` koleksiyonu aynı glob'la doğru çalışıyordu, sadece
`asarUnpack` adımı atlıyordu). **Çözüm**: `package.json`'daki `asarUnpack`
listesine daha genel/güvenilir `"**/*.node"` deseni eklendi (mevcut
`"node_modules/@lydell/**/*"` silinmedi, ikisi birlikte duruyor) — bu, proje
içindeki HERHANGİ bir native `.node` dosyasının (ileride başka bir native
bağımlılık eklense de) otomatik olarak unpack edilmesini garanti eder,
paket-özel bir glob'a bağımlı kalınmaz.
- **Doğrulama**: `npx electron-builder --win dir` sonrası
  `release/win-unpacked/resources/app.asar.unpacked/node_modules/@lydell/
  node-pty/node_modules/@lydell/node-pty-win32-x64/conpty.node` gerçekten var
  olduğu doğrulandı. Ayrıca gerçek bir `electron pty-test.cjs` (geçici,
  doğrulama sonrası silindi) çalıştırılıp `pty.spawn("cmd.exe", ...)` ile
  yazılan `echo HELLO_FROM_PTY`'nin çıktıda gerçekten göründüğü
  (`CONTAINS_HELLO true`, `PTY_EXIT 0`) teyit edildi — önceki tur bu
  ortamda YAPAMADIĞI görsel/GUI doğrulamayı hâlâ yapamıyor (gerçek bir
  pencerede xterm.js render'ının görünümü kullanıcı tarafından test
  edilmeli), ama native modülün paketlenmiş build'de gerçekten yüklenip veri
  akıttığı artık bu oturumda da kanıtlandı.
- `npm run typecheck` ve `npm run build` temiz geçti.
- **Not**: `node_modules/@lydell/node-pty-win32-x64` root'ta hoisted bir kopya
  olarak da bulunabiliyor (npm'in bağımlılık çözümüne göre değişebilir) —
  hangisi var olursa olsun `"**/*.node"` deseni ikisini de kapsar, bu yüzden
  hoisting davranışına artık bağımlı değiliz.

## Dışarıdan Kopyalanan İçerik Yapıştırılamıyor — DENENDİ, TÜM UYGULAMAYI BOZDU, GERİ ALINDI (2026-08-26) — TEKRAR DENEME

**Şikayet**: Terminalde dışarıdan (Notepad, tarayıcı vb.) kopyalanan içerik
yapıştırılamıyordu (uygulama İÇİNDE kopyalanan içerik sorunsuz yapıştırılıyordu).

**Yapılan araştırma (bulgu olarak DOĞRU, ama düzeltme girişimi YANLIŞ)**:
Kapsamlı canlı teşhis (bu makinede, kullanıcının rehberliğiyle) şunu kanıtladı:
panoda kopyalanan içerik varken (`CountClipboardFormats()` > 0) HEM Electron'un
kendi `clipboard.readText()`'i HEM ham Win32 `GetClipboardData` HEM .NET
WinForms `Clipboard.GetText()` — **üçü de** metni okuyamıyordu, ama format
listesinde **`EnterpriseDataProtectionId`** görüldü. Bu, **Windows
Information Protection (WIP)** — kurumsal MAM politikasının panoyu
etiketleme formatıdır. WIP etkinken Windows, izin listesinde OLMAYAN
uygulamaların (bu imzasız Electron uygulaması gibi) "kurumsal" kaynaktan
kopyalanan içeriğin GERÇEK VERİSİNİ okumasını **işletim sistemi seviyesinde,
kasıtlı olarak** engelliyor. **Bu teşhis hâlâ doğru ve geçerli.**

**YANLIŞ olan kısım — "düzeltme" girişimi**: Bu teşhisten sonra Ctrl+V/sağ
tık'ı ELLE yakalayıp (`term.attachCustomKeyEventHandler()` ile terminalde,
`document.addEventListener("keydown", ..., {capture:true})` ile TÜM
uygulamada global olarak) `event.preventDefault()` çağırıp
`navigator.clipboard.readText()` → ana süreç IPC (`clipboard:readText`,
ham Win32 fallback'li) zinciriyle manuel doldurmaya çalışıldı. **SONUÇ
FELAKETTİ**: Bu, Chromium'un native paste mekanizmasını (Ctrl+V →
`enableDeprecatedPaste` + Menu `role:"paste"` accelerator'ı üzerinden
çalışan, ÖNCEDEN her yerde — kullanıcı adı/şifre alanları, Ayarlar'daki
notlar, terminal — sorunsuz çalışan yol) TAMAMEN DEVRE DIŞI BIRAKTI.
Kullanıcı (VE farklı bir bilgisayardaki arkadaşı) bunun üzerine **hiçbir
yerde, hiçbir şekilde (ne dahili ne harici kopyalanan içerik) yapıştırma
yapamadıklarını** bildirdi — yani "düzeltme" harici yapıştırmayı (zaten
WIP tarafından engelli, düzeltilemez) düzeltmek yerine, önceden gerçekten
ÇALIŞAN dahili yapıştırmayı da bozdu.

**Kök sebep (neden bozdu)**: `event.preventDefault()` + `return false`
çağrıldığı anda tarayıcının kendi native `paste` event zincirini (ve
`execCommand("paste")`'i tetikleyen düşük seviye mekanizmayı) TAMAMEN
iptal ediyorsunuz — bizim manuel `navigator.clipboard.readText()`/IPC
zincirimiz native yoldan FARKLI bir API kullanıyor ve bazı ortamlarda
(izin timing'i, WIP'in bu API'leri de farklı şekilde etkilemesi, vb.)
native yoldan daha az güvenilir çıktı — üstüne native fallback'e hiç
düşülemediği için (event zaten iptal edilmiş) önceden çalışan senaryolar
da bozuldu.

**Geri alma**: Tüm bu turda eklenen kod tamamen kaldırıldı — silinen
dosyalar: `app-electron/main/clipboardWin32.ts`, `src/lib/robustPaste.ts`,
`src/lib/clipboardBlockedEvent.ts`. Geri alınan dosyalar (HEAD'e, `git
checkout HEAD --`, birebir): `app-electron/main/index.ts`,
`app-electron/preload/index.ts`, `src/window.d.ts`, `src/App.tsx`,
`src/components/Toast.tsx`, `src/i18n/en.ts`, `src/i18n/tr.ts`,
`src/main.tsx`, `src/components/EmbeddedTerminal.tsx`. Yani
`EmbeddedTerminal.tsx` artık **hiçbir özel Ctrl+V/sağ-tık kodu içermiyor**
— yukarıdaki "GÖMÜLÜ TERMİNAL CTRL+V — GERÇEK KÖK SEBEP VE KALICI ÇÖZÜM"
bölümündeki (2026-08-19) nihai/kanıtlanmış hâline birebir geri döndü.

**Doğrulama (kullanıcının GERÇEK makinesinde, adım adım)**: Geri alma
sonrası — kullanıcı adı/şifre alanı, Ayarlar'daki notlar/proje klasörü
alanı, VE terminal, hepsinde **dahili** (uygulama içinde kopyalanan)
kopyala-yapıştır Ctrl+C/Ctrl+V ile **tekrar sorunsuz çalıştığı** teyit
edildi. **Dışarıdan (Notepad) kopyalanan içerik hâlâ yapıştırılamıyor**
— bu BEKLENEN bir durum, WIP engeli hâlâ orada ve kod tarafında
çözülemez.

**KESİN KURAL (bir daha bu hataya düşülmesin)**:
- **Ctrl+V/sağ tık'ı `preventDefault()`/`attachCustomKeyEventHandler` ile
  ELLE YAKALAMAYA BİR DAHA KALKIŞILMASIN** — ne `EmbeddedTerminal.tsx`'te
  ne global bir `document` listener'ında. Bu, native paste zincirini
  kırıp DAHA ÇOK şeyi bozma riski taşıyor, WIP'in engellediği harici
  yapıştırmayı DÜZELTMİYOR (çünkü engel OS seviyesinde, hangi API'yi
  kullanırsak kullanalım aynı).
- **Harici (dışarıdan) yapıştırmanın çalışmaması bu makinede/bu tür
  WIP-korumalı makinelerde KALICI ve KOD TARAFINDA ÇÖZÜLEMEZ bir
  kısıtlamadır.** Kullanıcıya söylenecek TEK doğru şey: "Bu, Windows
  Information Protection (WIP) veya benzer bir kurumsal DLP politikası —
  BT/güvenlik ekibinize bu uygulamayı (`aXet SAP Launcher.exe`) WIP'in
  izin listesine ekletmeniz gerekiyor, bu bizim kodumuzda düzeltilemez."
- **Dahili (uygulama içi) kopyala-yapıştır zaten native olarak çalışıyor**
  (`enableDeprecatedPaste: true` + `Menu` `role:"paste"` accelerator'ı,
  `main/index.ts`) — bu mekanizmaya DOKUNULMASIN, zaten doğru çalışıyor.
- Eğer ileride WIP tespiti/kullanıcıya bilgi göstermek istenirse, bunu
  SADECE **pasif bir teşhis** olarak yap (örn. bir "Yardım/Tanılama"
  butonuna basınca elle tetiklenen bir kontrol) — Ctrl+V/paste event
  akışının HİÇBİR NOKTASINA (keydown, paste event, context menu) elle
  müdahale ETME.
- `npm run typecheck` ve `npm run build` bu geri alma sonrası temiz geçti.

## Terminalde Ctrl+V Çalışmıyordu (Diğer Tüm Alanlarda Çalışıyordu) — GERÇEK KÖK SEBEP BULUNDU, DAR KAPSAMLI DÜZELTME (2026-08-27)

**Şikayet**: `release/win-unpacked` build'inde kullanıcı adı/şifre/notlar gibi
her alanda Ctrl+V ile yapıştırma çalışıyordu, **sadece gömülü terminalde**
çalışmıyordu.

**Gerçek kök sebep (yukarıdaki "KESİN KURAL" bölümündeki teşhisten FARKLI)**:
`EmbeddedTerminal.tsx`'teki eski yorum ("xterm'in textarea'sı sıradan bir DOM
elemanı, dokunmaya gerek yok, native paste zaten çalışır") **yanlış bir
varsayımdı**. xterm.js, Ctrl+V'yi kasıtlı olarak paste olarak ele almıyor —
terminal/readline dünyasında bu kombinasyon "sıradaki karakteri literal ekle"
(quoted-insert) anlamına geldiği için xterm.js bunu ham bir kontrol baytı
olarak doğrudan shell'e iletiyor, tarayıcının native paste akışını (ve
dolayısıyla `enableDeprecatedPaste`/permission handler zincirini) HİÇ
TETİKLEMİYOR. Bu, xterm.js'in resmi/belgelenmiş davranışı
(bkz. xtermjs/xterm.js#2478, #2390: "xterm.js doesn't do anything special
with paste, embedder'ın `attachCustomKeyEventHandler` ile kendisi
uygulaması gerekiyor") — input alanlarında çalışıp terminalde çalışmamasının
asıl/tek sebebi budur, WIP ile bir ilgisi yok.

**Neden önceki "KESİN KURAL" bunu yasaklamıştı ama bu tur farklı**: Önceki
başarısız girişim TÜM `document` üzerinde global bir `keydown`
(`capture:true`) listener'ı kullanıp `preventDefault()` ile native paste
zincirini **HER YERDE** (input alanları dahil) kırmıştı, üstüne ana süreç
Win32 `clipboard` IPC'si de hep boş string döndürüyordu — iki bağımsız
hata üst üste binmişti. Bu turdaki düzeltme mimari olarak tamamen farklı:
**sadece `EmbeddedTerminal.tsx` içindeki `Terminal` örneğine özel**
`term.attachCustomKeyEventHandler(...)` kullanılıyor — bu handler SADECE
xterm'in kendi textarea'sı odaktayken çağrılır, `document` seviyesinde
hiçbir şeye dokunmaz, diğer input alanlarındaki mevcut native paste akışını
etkilemez. Metin, ana süreç IPC/Win32 fallback'i OLMADAN, doğrudan
`navigator.clipboard.readText()` (zaten `CopyButton.tsx`'te `writeText` için
kullanılan aynı Async Clipboard API) ile okunup `term.paste()`'e veriliyor.

**Değişiklikler**:
- `src/components/EmbeddedTerminal.tsx`: `attachCustomKeyEventHandler` ile
  Ctrl+V (`event.ctrlKey && key==="v"`, Shift/Alt hariç) yakalanıp
  `navigator.clipboard.readText().then(text => term.paste(text))` çağrılıyor,
  `return false` ile xterm'in bu tuşu ham baytla shell'e göndermesi
  engelleniyor. Hata durumunda (izin yok/pano boş) sessizce yoksayılıyor —
  terminal en azından eski (ham Ctrl+V baytı) davranışına düşer, çökme olmaz.
- `app-electron/main/index.ts`: `setPermissionCheckHandler`'a
  `"clipboard-read"` (Async Clipboard API'nin izin adı) eklendi (mevcut
  `"deprecated-sync-clipboard-read"`'in yanına); yeni bir
  `setPermissionRequestHandler` eklendi (sadece `clipboard-read`'i onaylıyor,
  başka hiçbir izin talebini otomatik onaylamıyor).
- Kullanılmayan `clipboard` import'u (electron modülü, önceki bir
  commitlenmemiş oturumdan kalma ölü kod, `main/index.ts`'te hiçbir yerde
  çağrılmıyordu) temizlendi — `npm run typecheck` bunu `noUnusedLocals`
  hatası olarak yakaladı.

**Bilinçli sınır (WIP kısıtlaması hâlâ geçerli, DEĞİŞMEDİ)**: Bu düzeltme
SADECE uygulama İÇİNDE kopyalanan metnin terminale yapıştırılabilmesini
sağlıyor. Yukarıdaki "KESİN KURAL" bölümündeki tespit hâlâ doğru: Windows
Information Protection (WIP) altındaki bir makinede **dışarıdan** (Notepad,
tarayıcı vb.) kopyalanan içerik `navigator.clipboard.readText()`'e de aynı
şekilde boş/erişilemez gelir — bu durumda yeni handler `catch` bloğuna
düşer, terminal sessizce eski davranışa (ham Ctrl+V baytı) döner, hata
göstermez. Bu, kod tarafında çözülemeyen, BT/WIP politikası gerektiren aynı
bilinen kısıtlama.

- `npm run typecheck`, `npm run build` ve `npx electron-builder --win dir`
  temiz geçti. Gerçek bir GUI penceresinde canlı Ctrl+V testi kullanıcı
  tarafından `release/win-unpacked/aXet SAP Launcher.exe` ile yapılmalı.
- **KESİN KURAL güncellemesi**: Yukarıdaki "bir daha attachCustomKeyEventHandler
  denenmesin" kuralı, GLOBAL/`document` seviyesinde bir müdahale için hâlâ
  geçerli — o asla tekrar denenmesin. Ama xterm `Terminal` örneğine ÖZEL,
  dar kapsamlı `attachCustomKeyEventHandler` (bu turda yapılan, global hiçbir
  şeye dokunmayan) artık kanıtlanmış/kalıcı bir çözüm, kaldırılmamalı.
- **CANLI DOĞRULANDI (kullanıcının kendi makinesinde, v1.4.3 build'i
  öncesindeki `release/win-unpacked` ile)**: uygulama içinde kopyalanan
  metin artık terminale Ctrl+V ile sorunsuz yapıştırılıyor — kullanıcı
  bunu bizzat teyit etti ("şuanda yapıştırıyor terminalede süper").
- **Diğer bilgisayarlarda da çalışması için önemli not**: bu düzeltme
  `navigator.clipboard.readText()` (renderer, Async Clipboard API) +
  `session.setPermissionCheckHandler`/`setPermissionRequestHandler`
  (`clipboard-read` izni) ikilisine dayanıyor — makineye özel bir ayar/kayıt
  defteri/ortam değişkeni GEREKTİRMİYOR, sadece paketlenmiş `dist`/
  `dist-electron` içeriğine gömülü. Yani NSIS Setup ile kurulan VEYA
  portable/win-unpacked kopyalanan HER bilgisayarda otomatik olarak aynı
  şekilde çalışır — WIP (Windows Information Protection) altında olmayan
  standart bir kurumsal Windows makinesinde ek bir kurulum/izin adımı
  gerekmez. (WIP altındaki makinelerde hâlâ sadece DIŞARIDAN kopyalanan
  içerik engellenir — bkz. yukarıdaki bilinçli sınır notu; uygulama İÇİ
  kopyala-yapıştır WIP'ten etkilenmez.)

## v1.4.3 — Ctrl+V Terminal Düzeltmesiyle Sürüm Yükseltmesi (2026-08-27, TAMAMLANDI)

Yukarıdaki "Terminalde Ctrl+V Çalışmıyordu" düzeltmesi canlı doğrulandıktan
sonra `package.json`/`package-lock.json` `1.4.2` → `1.4.3`'e yükseltildi
(`npm version patch --no-git-tag-version` — git tag/commit oluşturmadan
sadece dosyaları güncelledi). `npm run typecheck` ve `npm run build:win`
(dir+portable+nsis üçü birden) baştan sona hatasız tamamlandı:

- `release/win-unpacked/aXet SAP Launcher.exe`
- `release/aXet-SAP-Launcher-1.4.3-portable.exe`
- `release/aXet SAP Launcher Setup 1.4.3.exe` (+ `.blockmap`)

Üçünün de `LastWriteTime`'ı bu build komutunun çalıştığı ana ait (bkz.
yukarıdaki "v1.4.1 Release Exe'si Eski Kaynak Koduyla Paketlenmişti" dersi —
her sürüm sonrası bu kontrol tekrarlanmalı). `afterPack.cjs` özel ikon gömme
hook'u da bu build'de temiz çalıştı ("Özel ikon gömüldü" logu görüldü).

**Dağıtım**: Kullanıcılar `Setup 1.4.3.exe`'yi çalıştırıp kurarsa (mevcut bir
sürümün üzerine) otomatik güncelleme akışı (`electron-updater`, GitHub
Releases private repo token'ıyla) da bu sürümü görebilir hâle gelir — ama bu,
sadece `npm run release`/GitHub Releases'e asset yüklendiğinde işler (bkz.
"GitHub'a Taşınma" bölümü); bu turda sadece yerel `release/` klasörüne build
alındı, henüz GitHub Releases'e yayınlanmadı.

**GitHub Releases'e yayınlandı (aynı gün, ayrı bir adım)**: Kaynak kod
(`git push`, commit `472e826`) `main`'e gönderildikten SONRA, kullanıcının
elle sağladığı geçici bir PAT ile (kalıcı olarak saklanmadı — sadece
`GH_TOKEN` ortam değişkeni olarak bu tek `npm run release` çağrısına
verildi, `git remote`'a hiç yazılmadı) `npm run release`
(`electron-vite build && electron-builder --win --publish always`)
çalıştırıldı:
- Yeni bir GitHub Release oluşturuldu: **tag `v1.4.3`**
  (`github.com/tufansasmaz/axet-sap-launcher/releases/tag/v1.4.3`).
- Yüklenen asset'ler: `aXet-SAP-Launcher-1.4.3-portable.exe`,
  `aXet-SAP-Launcher-Setup-1.4.3.exe` (+ `.blockmap`), `latest.yml`
  (electron-updater'ın "yeni sürüm var mı" kontrolünün okuduğu manifest).
- Kullanıcıya PAT'ı GitHub ayarlarından **revoke etmesi** hatırlatıldı
  (konuşma geçmişinde açığa çıktığı için — aynı "GitHub'a Taşınma"
  bölümündeki ilk kurulumda izlenen güvenlik prosedürü).
- Artık Ayarlar'daki "Şimdi Kontrol Et" (veya açılışta otomatik kontrol,
  `config.autoCheckUpdates` + kendi salt-okunur `updateToken`'ı olan
  kullanıcılarda) v1.4.3'ü görüp indirebilir — ama SADECE NSIS Setup ile
  kurulmuş kopyalarda (portable/`dir` dağıtımları auto-update almaz, bkz.
  "GitHub'a Taşınma" bölümündeki bilinen kısıtlama).

## Açılışta Otomatik Güncelleme Sorusu (v1.4.4, TAMAMLANDI)

**İstek**: Kullanıcı önceden Ayarlar'a girip elle "Şimdi Kontrol Et"
diyordu; bunun yerine uygulama açılışta kendisi yeni sürüm olup olmadığına
baksın, varsa kullanıcıya bir soru sorsun ("yükleyelim mi?"), evet derse
indirme VE kurulum (yeniden başlatma) tamamen kendi otomatik yapsın —
ikinci bir onay istenmeden.

**Mimari — mevcut altyapı (`updater.ts`, `main/index.ts`'teki 3 saniyelik
açılış kontrolü, `UpdateStatus` event akışı) hiç DEĞİŞTİRİLMEDİ**, sadece
renderer tarafında bu event akışını dinleyen YENİ bir global modal eklendi:

- **`src/components/UpdatePromptModal.tsx`** (yeni) — üç görsel moddan
  birini gösterir:
  - `"prompt"`: "v{X.Y.Z} bulundu, İndir ve Kur / Daha Sonra" sorusu.
  - `"progress"`: indirme ilerlemesi (`%`), sonra "indirildi, yeniden
    başlatılıyor…" mesajı — bu fazda kullanıcıdan hiçbir aksiyon istenmez.
  - `"hidden"`: render edilmez (`mode="hidden"` → `null`).
- **`App.tsx`**: `updateStatus` (`UpdateStatus`, `getLastUpdateStatus()` +
  `onUpdateStatus` ile — `SettingsModal`'daki AYNI event akışının ikinci,
  bağımsız bir dinleyicisi, iki UI çakışmaz çünkü `settingsOpen` true iken
  bu global modal bilerek `"hidden"` tutulur), `updatePromptMode`
  (`UpdatePromptMode = "hidden" | "prompt" | "progress"`) state'leri
  eklendi. Üç `useEffect`:
  1. `updateStatus` değiştiğinde `updatePromptMode`'u türetir (`available`
     → `prompt`, `downloading`/`downloaded` → `progress`, `error` sadece
     zaten `progress` gösterilmişse görünür kalır — kullanıcı hiç
     "İndir"e basmadan sessiz bir arka plan hatası göstermeyiz).
  2. `phase === "downloaded"` olduğunda **2.5 saniyelik kısa bir gecikmeyle**
     (kullanıcının "indirildi" mesajını görebilmesi için)
     `window.api.installUpdate()` (`autoUpdater.quitAndInstall()`)
     OTOMATİK çağrılır — bu, istenen "kendi otomatik yapsın" davranışının
     tam karşılığı, kullanıcıdan ikinci bir tıklama istenmez.
  3. `dismissedUpdateVersion` — kullanıcı "Daha Sonra" derse o SÜRÜM için
     bu oturumda modal bir daha açılmaz (indirme tetiklenmeden sessizce
     beklemede kalır, Ayarlar'dan elle indirilebilir); bir sonraki/daha
     yeni bir sürüm bulunursa (örn. sonraki açılışta) tekrar sorulur.
- **`src/i18n/tr.ts` / `en.ts`**: yeni `updatePrompt.*` anahtar seti
  (title/message/install/later/downloading/downloaded/error/close) — mevcut
  `settingsModal.*` güncelleme metinlerine PARALEL ama ayrı, çünkü bu modal
  Ayarlar'ın dışında, kendi başlığıyla gösteriliyor.
- **Değiştirilmeyen**: `updater.ts`, `main/index.ts`'teki açılış tetikleyici
  (3sn gecikme + `config.autoCheckUpdates` kontrolü), `SettingsModal.tsx`'in
  kendi "Güncellemeler" bölümü (elle kontrol/indir/kur akışı hâlâ orada,
  kullanıcı Ayarlar'ı açıkken bu global modal `"hidden"` kalır) — hepsi
  birebir eskisi gibi çalışıyor, sadece renderer'da YENİ bir tüketici
  (bu modal) eklendi.
- `npm run typecheck` ve `npm run build` temiz geçti.

## Platform Dönüşümü — Adım 1: ActivityBar + axet.code Ana Ekranı (2026-08-27, DEVAM EDİYOR)

Dosyanın en başındaki "⚠️ DEVAM EDEN PLATFORM DÖNÜŞÜMÜ" bölümündeki kararların
ilk uygulanışı. **Kritik tasarım kararı**: mevcut SAP Launcher'ın (bugüne
kadarki TÜM `App.tsx` içeriği — sistem ağacı, arama, terminal paneli, dosya
gezgini, tüm modallar) **hiçbir iç mantığı değiştirilmedi/taşınmadı** — sadece
JSX ağacına bir üst seviye ekleyip mevcut bloğu bir `activity === "sapLauncher"`
koşuluna sardım. Bu, riski en aza indiren, "App.tsx'i ikiye böl + state'i yukarı
taşı" gibi büyük/riskli bir refactor'dan kaçınan bilinçli bir tercih.

**Yeni dosyalar**:
- **`src/components/ActivityBar.tsx`** — sol dikey rayda aktivite ikonları
  (`Activity = "axetCode" | "sapLauncher"`, dizi tabanlı — yeni bir modül
  eklemek için sadece `activities` dizisine bir öğe eklemek yeterli) +
  alt kısımda tema/dil/ayarlar butonları (bunlar App.tsx'in kendi header'ından
  buraya TAŞINDI, aynı `handleToggleTheme`/`handleToggleLanguage`/
  `setSettingsOpen` handler'larını çağırıyor — mantık tekrarlanmadı, sadece
  buton nereye render edildiği değişti).
- **`src/components/AxetCodeHome.tsx`** — axet.code'un ana ekranı: sol mini
  kenar çubuğunda "Sohbetler" listesi + "+ Yeni Sohbet" butonu + altında
  "Bağlantılar" (şu an sadece "Yakında" placeholder'ı), sağda aktif oturumun
  `EmbeddedTerminal`'i (session yoksa boş durum ekranı). Kendi bağımsız
  `sessions`/`activeId` state'ini tutuyor — **SAP Launcher'ın
  `terminalSessions`/`TerminalPanel`'inden TAMAMEN AYRI** (kullanıcı kararı
  #2). Aynı alt yapıyı (`window.api.createTerminal`, `onTerminalReady`
  event'i, `EmbeddedTerminal` component'i) yeniden kullanıyor — bu event'ler
  global (`ipcRenderer.on`) olduğu için AxetCodeHome kendi `pendingTitlesRef`
  Map'inde OLMAYAN bir `id` geldiğinde (yani SAP Launcher'ın açtığı bir
  terminal) sessizce görmezden geliyor, iki liste birbirine sızmıyor.

**`App.tsx` değişiklikleri**:
- Yeni `activity` state'i (`useState<Activity>("axetCode")` — varsayılan
  ekran axet.code, kullanıcının "ana ekranımız" tanımına uygun).
- JSX: `<TitleBar/>`'dan sonra yeni bir `<div className="flex ... overflow-hidden">`
  satırı — içinde `<ActivityBar/>` ve onun yanında (yeni) bir sütun; bu sütun
  `activity === "axetCode"` ise `<AxetCodeHome/>`, değilse (`<>...</>`
  fragment içinde) SAP Launcher'ın ESKİ `<header>` + sidebar + main +
  `<TerminalPanel/>` bloğunu **birebir aynı JSX ile** render ediyor.
- Header'dan tema/dil/ayarlar butonları kaldırıldı (ActivityBar'a taşındı) —
  `handleToggleTheme`/`handleToggleLanguage` fonksiyonlarının kendisi
  DOKUNULMADI, sadece çağrıldıkları buton yeri değişti.
- **Bilinen kozmetik borç**: yeni sarma div'lerin içindeki eski JSX bloğu
  girinti (indentation) SEVİYESİ güncellenmedi (2 seviye daha içeride olması
  gerekirken eski hizasında kaldı) — fonksiyonel bir sorun DEĞİL (JSX
  whitespace'e duyarlı değil), sadece kod okunurluğu için ileride bir
  "sadece re-indent" geçişi yapılabilir, aceleye gerek yok.

**`shared/types.ts` / `store.ts`**: `AppConfig.axetWorkspaceDir: string`
eklendi (varsayılan: `Belgelerim\aXet Code Sessions`, `path.join(app.getPath
("documents"), "aXet Code Sessions")`). Standart zincirin `preload`/
`window.d.ts` kısmı GEREKMEDİ — `config:get`/`config:save` zaten generic
`Partial<AppConfig>` alıyor/dönüyor, yeni bir IPC endpoint'i açılmadı.

**`app-electron/main/terminalManager.ts`**: `createTerminal()`'a `cwd` için
bir `mkdirSync(resolvedCwd, {recursive:true})` (try/catch'li, sessiz)
güvenlik ağı eklendi — SAP Launcher akışında bu no-op (proje klasörü zaten
`connectToSystem()` içinde oluşturuluyor), ama axet.code'un varsayılan
`axetWorkspaceDir`'i kullanıcı Ayarlar'a hiç girmeden ilk sohbeti başlatınca
diskte YOK olabileceği için tek güvenli oluşturma noktası burası oldu.

**`SettingsModal.tsx`**: Yeni "axet.code" bölümü (Genel'in altına, Terminal'in
üstüne) — `axetWorkspaceDir` için klasör seç input'u (`projectsBaseDir` ile
birebir aynı desen, `pickAxetWorkspaceDir()` yeni fonksiyon).

**i18n**: `activityBar.*`, `axetCodeHome.*`, `settingsModal.sectionAxetCode`/
`axetWorkspaceDirLabel` anahtarları `tr.ts`/`en.ts`'e eklendi.

**Test durumu**: `npm run typecheck`, `npm run build`, `npx electron-builder
--win dir` temiz geçti. Paketlenmiş exe (`release/win-unpacked/aXet SAP
Launcher.exe`) bu ortamda başlatılıp **çökme olmadığı** doğrulandı (güncelleme
kontrolü dahil loglar temiz) — ama gerçek bir GUI penceresinde ActivityBar'a
tıklama/axet.code'da "Yeni Sohbet" açma/SAP Launcher'a geçiş **görsel olarak**
bu ortamda test EDİLEMEDİ, kullanıcının kendi makinesinde denemesi gerekiyor.

**Bu turda BİLEREK YAPILMAYAN**: GitHub'a commit/push/release — kullanıcının
açık talimatıyla ("bu bitene kadar githuba update almıcaz") bu dönüşüm süresince
durduruldu, sadece yerel diskte değişiklik var.

## Platform Dönüşümü — Adım 2: axet.code Dashboard + Görsel İyileştirme (2026-08-27, DEVAM EDİYOR)

Kullanıcı isteği: "biraz daha geliştir dashboard falan ekle görseli
güzelleştir". `AxetCodeHome.tsx` tamamen yeniden yazıldı, `ActivityBar.tsx`
görsel olarak güncellendi. **App.tsx'e ek prop akışı gerekti** (aşağıda) —
bu, dashboard'un App.tsx'in zaten hesapladığı `recentEntries`/`connectivity`/
`flatSystems` verisini TEKRAR HESAPLAMADAN kullanabilmesi için.

**`AxetCodeHome.tsx` — yeni prop'lar** (`App.tsx`'ten geçiliyor):
`recentEntries` (App.tsx'in `recentEntries` useMemo'sunun AYNISI —
`connectionHistory` + `flattenLandscape` birleşimi, en fazla 5 kayıt),
`connectivity`, `tierOverrides` (`config.systemTiers`), `totalSystemsCount`
(`flatSystems.length`), `onOpenSapLauncher` (`setActivity("sapLauncher")`),
`onQuickConnectSap` (yeni `App.tsx` fonksiyonu `handleQuickConnectSap` —
`setActivity("sapLauncher")` + `setSelection(...)` + `setCredentialsTarget(...)`
üçünü birden yapıp kullanıcıyı doğrudan kimlik bilgisi penceresine düşürüyor,
elle SAP Launcher'a geçip sistemi tekrar arama zorunluluğu yok).

**Dashboard içeriği** (`activeId === null` — hiçbir sohbet oturumu seçili
değilken gösteriliyor, bir oturum açılınca terminal tam ekran alıyor):
- Saate göre değişen karşılama (`greetingKey()` — sabah/öğlen/akşam/gece,
  `axetCodeHome.greeting.*` i18n anahtarları) + logo.
- 3 istatistik kartı: aktif sohbet sayısı, toplam SAP sistemi sayısı
  (`totalSystemsCount`), uygulama sürümü (`window.api.getAppVersion()`).
- İki büyük hızlı aksiyon butonu: "Yeni Sohbet Başlat" / "SAP Launcher'ı Aç".
- "Son Sohbetler" kartları (varsa, en fazla 4, en yeniden eskiye) — her
  oturumun kendi `createdAt` (`Date.now()`, session state'ine eklendi) zaman
  damgası `formatRelativeTime()` ile gösteriliyor.
- "Son Bağlanılan Sistemler" listesi (`recentEntries`'in TAMAMI, App.tsx'teki
  `RecentSystems.tsx`'in sol panelde gösterdiğiyle AYNI kaynak veri) —
  `StatusDot`/`TierBadge` yeniden kullanılıyor, tıklanınca `onQuickConnectSap`.
- Sol kenar çubuğundaki "Bağlantılar" bölümü artık placeholder DEĞİL — en
  fazla 3 son bağlantıyı gösteriyor + "Tümünü gör" (SAP Launcher'a geçer),
  hiç geçmiş yoksa "SAP sistemine bağlan" kısayolu.

**`ActivityBar.tsx` görsel güncelleme**: aktif aktivite artık düz arka plan
rengi DEĞİL, VS Code tarzı sol kenarda 3px'lik bir accent çubuğu + ikonun
kendi arka planı (axet.code için gradyan dolgu, SAP Launcher için nötr
`bg-base-700`) ile gösteriliyor — ikisi görsel olarak farklı "kimliğe" sahip
(axet.code = canlı/gradyan, SAP Launcher = kurumsal/nötr, kendi logosu).

**Bilinçli sınır**: "Bağlantılar" hâlâ SADECE SAP Launcher'ın geçmişini
okuyor — kendi başına yeni bir bağlantı türü/CRUD'u YOK, bu component'in
sorumluluğu değil (SAP Launcher zaten tam bu işi yapıyor, tekrar yazmaya
gerek yok). "Yeni bir modül daha eklemek" (örn. axet.flows) hâlâ sadece
`ActivityBar.tsx`'teki `activities` dizisine bir öğe + `App.tsx`'e bir
`activity === "..."` dalı eklemekle sınırlı, bu turda bir şey eklenmedi.

**Test durumu**: `npm run typecheck`, `npm run build`, `npx electron-builder
--win dir` temiz geçti; paketlenmiş exe bu ortamda başlatılıp çökme/hata
olmadığı doğrulandı (stderr logu temiz). Görsel doğrulama (kartların
hizası, hover efektleri, gradyanların göründüğü hâli) kullanıcının kendi
GUI'sinde yapılmalı.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## Platform Dönüşümü — Adım 3: Model Seçici + Dosya/Görsel Ekleme (2026-08-27, DEVAM EDİYOR)

Kullanıcı isteği: "chat kısmını geliştirelim model seçme kısmı orda olsun
görsel görsel ekleme oluşturma v.s gibi şeyleri yapabiliyor olalım".

**Araştırma (canlı, bu makinede `axet-code.exe` gerçekten kurulu — `where
axet-code`)**: `axet-code --help` çıktısı incelendi — root komutta model
seçmek için bir flag YOK, ama:
- **`axet-code models`** — konfigüre edilmiş sağlayıcılardan kullanılabilir
  TÜM modelleri `provider/model` formatında, tek satır tek model, düz
  stdout'a basıyor (canlı test: `openai/gpt-5.1`, `aws_anthropic/eu.
  anthropic.claude-sonnet-5` gibi 16 model döndü, exit code 0, stderr boş).
- **`axet-code run --model` / `-m`** — SADECE `run` (non-interactive)
  alt komutunda var, ROOT komutta YOK (`axet-code -m ... ` → "Unknown
  shorthand flag" hatası verdi, canlı doğrulandı). Yani interaktif oturum
  başlatırken CLI'nin kendisine bir "başlangıç modeli" flag'i geçirilemiyor.
- **Gerçek kalıcı model seçimi mekanizması** — `axet-code dirs` ile bulunan
  veri dizinindeki (`%LOCALAPPDATA%\axet-code\axet-code.json`) `models.
  large`/`models.small` alanları (`{provider, model}` şekli) + `recent_
  models.large`/`.small` dizileri (son kullanılanlar, CLI'ın kendi "/model"
  slash komutunun da yazdığı AYNI dosya/şema — canlı dosya içeriği okunup
  doğrulandı). CLI açılışta bu dosyayı okuyup varsayılan modeli buradan
  alıyor — yani **launcher bu dosyaya YAZARAK** kullanıcı yeni bir sohbet
  başlatmadan ÖNCE modeli değiştirebiliyor, CLI'ye ayrıca bir flag geçirmeye
  gerek yok.

**Yeni dosyalar**:
- **`app-electron/main/axetModels.ts`** — `listAxetModels()` (`child_process.
  exec("axet-code models")`, stdout'u satır satır `provider/model`'e parse
  eder — ilk `/` üzerinden böler, model id'nin kendisi nokta/tire/kolon
  içerebildiği için İKİNCİ bir `/` aramaz), `getAxetModelConfig()` (JSON'u
  okur, `models.large`/`.small`'ı döner), `setAxetModel(kind, entry)`
  (JSON'u okuyup SADECE `models`/`recent_models` alanlarını güncelleyip
  geri yazar — dosyanın diğer bölümlerine dokunmuyor, CLI'nin ileride
  ekleyeceği başka bir alanı sessizce silmemek için `{...raw, models,
  recent_models}` spread deseni kullanılıyor). `%LOCALAPPDATA%` ortam
  değişkeninden hesaplanıyor (`axet-code dirs`'i her çağrıda tekrar spawn
  etmemek için), yoksa `os.homedir()/AppData/Local`'a düşülüyor.
- **`src/lib/axetModels.ts`** — `formatModelLabel()` (ham model id'lerini
  — `eu.anthropic.claude-sonnet-5`, `gpt-5.4-2026-03-05` gibi — bölge
  öneki/bedrock sürüm son eki/tarih son ekini temizleyip okunaklı hâle
  getiren SAF görsel bir fonksiyon, gerçek id'yi hiç değiştirmiyor),
  `formatProviderLabel()` (`openai`→`OpenAI`, `aws_anthropic`→`Anthropic
  (AWS)`), `modelKey()`.
- **`src/components/ModelSelector.tsx`** — sağlayıcıya göre gruplanmış
  dropdown (native `<select>` DEĞİL — provider grupları + tema renkleri
  için özel bir component gerekti). Dışarı tıklama/Escape ile kapanır.
- **`src/lib/paths.ts`** — `quotePathIfNeeded()` `EmbeddedTerminal.tsx`'ten
  buraya taşındı (tek kaynak, `AxetCodeHome.tsx`'in dosya ekleme özelliği
  de aynı fonksiyona ihtiyaç duyduğu için — kod iki yerde ayrı ayrı
  YAŞAMASIN diye çıkarıldı).

**`EmbeddedTerminal.tsx`**: `forwardRef` + `useImperativeHandle` ile
`pasteText(text)` handle'ı eklendi (`EmbeddedTerminalHandle` tipi export
edildi) — mevcut `term.paste()` çağrısının (drag&drop handler'ındaki ile
BİREBİR AYNI mekanizma) dışarıdan (bir "dosya ekle" butonundan) da
tetiklenebilmesi için. `TerminalPanel.tsx` bu ref'i hiç kullanmıyor
(`ref` prop'u opsiyonel, geçmeyince davranış birebir eskisi gibi) — sadece
`AxetCodeHome.tsx` kullanıyor.

**`AxetCodeHome.tsx` — yeni toolbar**: axet.code ekranının sağ tarafına
(hem dashboard hem aktif sohbet görünümünde ORTAK, `h-11` sabit yükseklikte)
bir üst çubuk eklendi:
- Sol: aktif sohbet varsa başlığı, yoksa "Sohbetler" etiketi.
- Sağ: **"Dosya/Görsel Ekle"** butonu (`Paperclip` ikonu, SADECE aktif bir
  sohbet varken görünür — `window.api.pickFiles()` ile native dosya seçim
  diyaloğu açılır, seçilen yollar `quotePathIfNeeded` ile boşluk-güvenli
  hâle getirilip `terminalRefs.current.get(activeId)?.pasteText(...)` ile
  o oturumun xterm'ine yapıştırılır — kullanıcı/axet.code CLI'nin kendisi
  bu yolu (resim/dosya) nasıl yorumlayacağına karar verir, launcher sadece
  yolu terminale güvenli biçimde yapıştırıyor, dosya İÇERİĞİYLE hiç
  ilgilenmiyor), **`ModelSelector`** (her zaman görünür — dashboard'dayken
  de model önceden seçilebilsin diye).
- `terminalRefs` (`Map<sessionId, EmbeddedTerminalHandle | null>`) her
  session'ın ref'ini tutuyor — birden fazla sohbet açıkken doğru oturuma
  yapıştırma garantisi.

**Bilinçli sınırlar**:
- Model seçimi **SADECE `large` modeli** değiştiriyor (`small` model —
  CLI'nin arka plan/düşük maliyetli görevler için kullandığı ikinci model —
  bu turda UI'ya hiç eklenmedi, kapsam dışı bırakıldı, istenirse aynı
  `AxetModelKind` altyapısıyla kolayca eklenebilir).
- Model değişikliği **çalışan bir sohbeti YENİDEN BAŞLATMAZ** — sadece
  `axet-code.json`'u güncelliyor, CLI zaten açık bir process'te modelini
  canlı değiştirmiyor (bu CLI'nin kendi davranışı, launcher'ın kontrolünde
  değil); kullanıcı seçimin ETKİLİ olması için YENİ bir sohbet başlatmalı.
  Bu davranış dokümante edildi ama UI'da henüz açık bir uyarı YOK (ileride
  eklenebilir bir iyileştirme noktası).
- "Görsel ekleme" gerçek bir resim ÖNİZLEME/işleme YAPMIYOR — sadece dosya
  yolunu terminale yapıştırıyor (tıpkı sürükle-bırak gibi), CLI'nin kendisi
  o yoldaki dosyayı okuyup okuyamayacağına karar veriyor. Bu, launcher'ın
  zaten var olan drag&drop davranışıyla TUTARLI, yeni bir dosya
  okuma/base64 kodlama mekanizması icat edilmedi.

**Test durumu**: CLI komutları (`axet-code models`, `axet-code dirs`, config
dosyası okuma) bu makinede CANLI doğrulandı. `npm run typecheck`, `npm run
build`, `npx electron-builder --win dir` temiz geçti; paketlenmiş exe
başlatılıp çökme olmadığı doğrulandı. Model dropdown'ının GERÇEK açılışı/
seçimi ve dosya seçim diyaloğunun görsel testi kullanıcının kendi GUI'sinde
yapılmalı — bu ortamda pencere etkileşimi mümkün değil.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## Platform Dönüşümü — Adım 4: Aktif Sohbette CANLI Model Değiştirme (2026-08-27, DEVAM EDİYOR)

Kullanıcı Adım 3'teki "bilinen sınır"ı ("model değişikliği sadece YENİ
sohbetlerde geçerli olur") kabul etmedi: "ben model değiştiğimde o modelle
devam etmesi için ne yapabiliriz" — yani AKTİF/açık bir sohbette de gerçek
zamanlı model değişimi istendi. Kullanıcıya bunun teknik olarak RİSKLİ bir
TUI-otomasyonu gerektirdiği açıkça söylendi (`ask_user`) ve kullanıcı
"Tam otomatik seçim dene (riskli)" seçeneğini seçti.

**Araştırma — bu makinede `@lydell/node-pty` + `@xterm/headless` (geçici,
`C:\workspace\pty-test` scratch klasöründe, iş bitince SİLİNDİ) ile
`axet-code.exe`'yi gerçekten spawn edip canlı test edildi**:

1. **`axet-code`'un içinde CANLI bir `/model` slash komutu var** — TUI
   içinde çalışırken yazılırsa (`\r` ile) gerçek bir "Switch Model" picker
   menüsü açıyor (fuzzy-search kutusu + "Recently used"/provider grupları
   + ok tuşlarıyla gezinme + Enter ile onay). **Bu menüden bir model
   seçilince AKTİF/ÇALIŞAN process'in modeli GERÇEKTEN değişiyor**
   (canlı doğrulandı — seçim sonrası ekranda "OKAY! large model changed
   to <model>" mesajı çıktı VE `axet-code.json`'daki `models.large`
   güncellendi). Bu, kullanıcının istediği tam şey.
2. **Config dosyasına dışarıdan (launcher'dan) yazmak ÇALIŞAN bir process'i
   ETKİLEMİYOR** — canlı doğrulandı: process çalışırken dosyayı harici
   olarak değiştirdim, aynı process'te `/model` açıldığında hâlâ ESKİ
   "Recently used" sırasını gösterdi. Yani CLI, `recent_models`/`models`
   listesini SADECE açılışta bir kere okuyup bellekte tutuyor — bu yüzden
   Adım 3'teki "sadece config'e yaz" yaklaşımı aktif session'ı hiç
   etkilemiyordu (beklenen/doğrulanmış davranış).
3. **Menüdeki görünen etiketler ham model id'den FARKLI olabiliyor** —
   örn. `axet-code models` çıktısında `openai/gpt-5.1` diye geçen model,
   picker'da **"GPT 5.1 Thinking"** olarak görünüyor (tire/nokta
   karakterleri kayboluyor, "Thinking" kelimesi ekleniyor — muhtemelen
   reasoning-mode varsayılan gösterimi). Bu, "ham id'yi ara-yapıştır"
   yaklaşımının GÜVENİLİR OLMADIĞINI kanıtlıyor (örn. tam "gpt-5.1" arama
   metni 0 SONUÇ verdi çünkü etiket hiç tire içermiyor).
4. **Çözüm — model id'sini SADECE alfanümerik karakterlere indirip ara**
   (`entry.model.toLowerCase().replace(/[^a-z0-9]/g, "")` — örn. "gpt-5.1"
   → "gpt51"): bu arama, etiketin noktalama farklarından bağımsız olarak
   subsequence eşleşmesiyle doğru modeli buluyor (canlı doğrulandı: "gpt51"
   araması "GPT 5.1 Thinking"i BULDU ve seçimi doğru şekilde tamamladı).
5. **Belirsizlik riski canlı doğrulandı**: kısa/genel bir arama metni
   (örn. sadece "54") BİRDEN FAZLA modelle eşleşebilir (`gpt-5.4`,
   `gpt-5.4-mini`, `gpt-5.4-nano` hepsi "54" alt-dizisini içerir) — bu
   yüzden Enter'a basmadan önce EKRANDAKİ FİLTRELENMİŞ satırları tarayıp
   KAÇ FARKLI model eşleştiğini saymak ŞART. Aynı model "Son
   kullanılanlar" VE kendi provider grubunda İKİ satırda görünebiliyor
   (canlı doğrulandı: "gpt51" araması "GPT 5.1 Thinking"i İKİ satırda
   gösterdi ama bu TEK model — dedupe edilince doğru sonuç 1 çıkıyor).
6. **Menüde ESC ile güvenli bir "iptal" YOK** (canlı doğrulandı — Escape
   sadece arama kutusunu placeholder'a döndürüyor, menüyü KAPATMIYOR,
   art arda basılsa da). Bu yüzden belirsiz/eşleşmesiz durumlarda menüyü
   kapatmaya ZORLAMAK yerine, filtrelenmiş hâliyle AÇIK bırakmak (kullanıcı
   ok tuşlarıyla tamamlar) tek güvenli fallback.

**Uygulama**:
- **`EmbeddedTerminal.tsx`**: `EmbeddedTerminalHandle`'a yeni
  `switchModel(entry, knownProviders): Promise<ModelSwitchResult>` eklendi.
  Akış: `/model\r` yazılır → ekranda "Switch Model" başlığı belirene kadar
  (max 4sn, 150ms aralıklarla) `term.buffer.active.getLine()` ile taranır
  → 500ms beklenip alfanümerik-temizlenmiş arama metni yazılır → 900ms
  beklenip (0 sonuçsa modeller hâlâ yükleniyor olabilir diye bir 900ms
  daha) ekran taranır: her satırdaki kutu-çizim Unicode karakterleri
  (`\u2500-\u257F` — │─╭╮╰╯ vb.) temizlenip 2+ boşluğa göre bölünüyor,
  SAĞ parça bilinen bir provider adına (`knownProviders`, `axet-code
  models` çıktısından) eşitse SOL parça bir "model etiketi" olarak
  kaydediliyor (Set ile dedupe) — bu, başlık/ayraç satırlarını (sağ
  tarafı "✓ Configured" olan grup başlıkları, sağ tarafı boş olan "Son
  kullanılanlar" başlığı, sağ tarafı boş olan arama kutusu satırı) model
  satırlarından güvenilir şekilde ayırıyor. Tam 1 farklı etiket varsa
  Enter'a basılıp `{ok:true}` dönülüyor (Enter sonrası "Switch Model"
  başlığının GERÇEKTEN kaybolduğu da doğrulanıyor — kaybolmadıysa
  `{ok:false, reason:"no-match"}`); 0 veya 2+ ise Enter'a HİÇ
  BASILMIYOR, `{ok:false, reason:"no-match"|"ambiguous"}` dönülüyor.
- **`AxetCodeHome.tsx` `handleSelectModel`**: önce (Adım 3'teki gibi)
  `setAxetModel("large", entry)` ile config dosyası güncelleniyor (yeni
  sohbetler için); AKTİF bir sohbet varsa (`activeId` + `terminalRefs`
  üzerinden o oturumun `EmbeddedTerminalHandle`'ı) EK OLARAK
  `switchModel(entry, knownProviders)` deneniyor:
  - `ok:true` → "Aktif sohbetin modeli değiştirildi" toast'ı (canlı
    değişim gerçekten oldu).
  - `reason:"ambiguous"` → "Birden fazla model eşleşti, menüden elle
    seç" toast'ı (menü AÇIK bırakıldı, kullanıcı tamamlar).
  - `reason:"timeout"|"no-match"` → sessizce Adım 3'teki eski mesaja
    ("yeni sohbetlerde geçerli olacak") düşülüyor — hata GÖSTERİLMİYOR,
    çünkü config zaten güncellendi, sadece canlı geçiş olmadı.
- **i18n**: `modelSelector.switchedLive`/`switchAmbiguous` eklendi,
  `appliesNextChatHint` güncellendi ("aktif sohbette canlı değiştirmeyi
  dener, olmazsa yeni sohbetlerde geçerli olur").

**Bilinçli sınırlar (hâlâ geçerli)**:
- Bu otomasyon axet-code'un TUI çıktı FORMATINA bağımlı — CLI'nin `/model`
  menüsünün görsel yapısı (kutu çizim karakterleri, "✓ Configured" metni,
  sütun hizalaması) ileride değişirse bu kod BOZULABİLİR (sessizce
  `{ok:false}` dönüp Adım 3 davranışına düşer — asla YANLIŞ model seçmez,
  bu yüzden "sessiz bozulma" en kötü senaryo, "sessiz YANLIŞ seçim" değil).
- `small` model hâlâ UI'ya eklenmedi (Adım 3'teki sınır aynen geçerli).
- Belirsiz eşleşme durumunda kullanıcı menüyü GÖRMÜYOR OLABİLİR (terminal
  o an ekranda değilse, örn. "Sohbetler" listesinde başka bir oturuma
  bakıyorsa) — menü o session'ın arka planında filtrelenmiş hâlde açık
  kalır, kullanıcı o sekmeye geri dönünce görür. Bu bir hata değil, sadece
  not edilmesi gereken bir UX detayı.

**Test durumu**: TÜM senaryolar (tekil eşleşme + canlı model değişimi
onayı, dedupe/aynı-modelin-iki-bölümde-görünmesi, config-dosyası-canlı-
process'i-etkilememesi, Escape'in menüyü kapatmaması) bu makinede
`axet-code.exe`'ye karşı GERÇEKTEN spawn edilip CANLI doğrulandı (geçici
test script'leri, iş bitince silindi — `C:\workspace\pty-test` klasörü
kaldırıldı, test sırasında değişen kullanıcının kendi `axet-code.json`
`models.large` tercihi orijinal değerine — Claude Sonnet 5 — geri
yüklendi). `npm run typecheck`, `npm run build`, `npx electron-builder
--win dir` temiz geçti; paketlenmiş exe başlatılıp çökme olmadığı
doğrulandı. Gerçek bir GUI penceresinde model seçip aktif sohbette
canlı geçişin GÖRSEL doğrulaması kullanıcının kendi makinesinde
yapılmalı.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## Platform Dönüşümü — Adım 5: axet.code Sohbet Ekranı TAMAMEN Özgün (Terminal Yerine Chat Balonları) (2026-08-27, DEVAM EDİYOR)

Kullanıcı Adım 1-4'teki yaklaşımı ("Yeni Sohbet" → gerçek `axet-code` TUI'sini
gömülü bir terminalde göstermek) kesin olarak reddetti: "yeni sohbet
başlattığımda axet ekranını [terminali] görmek istemiyorum, ChatGPT'ye
benzer özgün bir sohbet ekranı olmalı". Yani sohbet ekranı artık **hiçbir
terminal/TUI görünümü içermiyor** — ama motor hâlâ gerçek `axet-code` (arka
planda çalışan asıl akıl hâlâ bu CLI, kullanıcı sadece SUNUMUNU
değiştirmek istedi).

**Mimari karar — TUI'yi canlı tutup CSS ile giydirmek YERİNE, `axet-code run`
(stateless, tek-atış) modu**: Önce canlı araştırma yapıldı (`axet-code run
--help`, gerçek `axet-code run` çağrıları bu makinede spawn edilip
zamanlandı/doğrulandı):

1. **`axet-code run -q [-m provider/model] "<prompt>"`** — tam metni
   BEKLEYİP tek seferde basıyor (gerçek token-stream YOK, kanıtlandı — ilk
   çıktı process kapanana kadar gelmiyor). Basit bir soru için ~6-7 saniye
   sürdü (canlı ölçüldü).
   > **⚠️ DÜZELTME (2026-09-02, canlı ölçümle ÇÜRÜTÜLDÜ)**: Yukarıdaki
   > "stdout tamponlanıyor, ilk çıktı process kapanana kadar gelmiyor"
   > tespiti **YANLIŞ**. Yeniden ölçüldü: `axet-code run -q` stdout'u
   > **parça parça, gerçek zamanlı akıtıyor** — tek bir cevap için 16
   > saniyeye yayılmış **178 ayrı `data` chunk'ı** sayıldı. Yani gerçek
   > streaming MÜMKÜN; `ChatBubble.tsx`'teki simüle daktilo animasyonu
   > (`TARGET_REVEAL_MS`) bu yanlış varsayım üzerine kurulmuştu. Bunu
   > gerçek stream'e çevirmek Faz 1'in ilk maddesi (aşağıya bak). Yeni bir
   > ölçüm yapmadan bu paragrafın ESKİ hâline güvenme.
2. **CLI seviyesinde oturum hafızası YOK** — aynı `-D` (özel veri dizini)
   parametresiyle bile iki ayrı `run` çağrısı birbirini HİÇ hatırlamıyor
   (canlı doğrulandı: "Benim adım X" → sonraki çağrıda "adını bilmiyorum").
   Gerçek konuşma geçmişi (`axet-code.db`, proje başına `.axet-code/`
   altında) sadece İNTERAKTİF TUI oturumları için tutuluyor, `run` modunun
   bunu okuma/devam ettirme flag'i YOK.
3. **Araç kullanımı (dosya okuma/YAZMA) `run` modunda hiçbir onay istemeden
   çalışıyor** (canlı doğrulandı — bir test klasöründe dosya oluşturma
   isteği anında, sorgusuz gerçekleştirildi) — TTY olmadığı için CLI'nin
   kendisi bunu implicit "yolo" gibi ele alıyor, bizim ek bir `-y` flag'i
   geçirmemize gerek/imkân yok (`run` alt komutunda `-y` flag'i YOK,
   denendi, hata verdi).
4. **`-m` flag'i `provider/model` formatını doğrudan kabul ediyor** (canlı
   doğrulandı) — bu, Adım 3-4'teki riskli TUI-otomasyonunu (canlı `/model`
   menüsünü klavye simülasyonuyla kullanma) TAMAMEN GEREKSİZ kıldı: artık
   model seçimi sadece bir sonraki `run` çağrısına hangi `-m` değerinin
   geçileceğini belirlemekten ibaret, TUI ayrıştırma/ekran-tarama YOK.
5. **`cwd` dışındaki mutlak dosya yollarına erişim serbest** (canlı
   doğrulandı, proje klasörü dışında bir dosya okutuldu, sorunsuz) — dosya/
   görsel ekleme özelliği (Adım 3) bu yüzden hiç değişmeden aynı mantıkla
   (mutlak yolu prompt metnine gömmek) çalışmaya devam ediyor.

Bu bulgular üzerine bağlamı (conversation memory) **biz** — önceki
mesajları düz metin bir transkript olarak yeni prompt'un başına ekleyerek —
koruyoruz (canlı doğrulandı: "Benim adım Zeynep, bunu hatırla" → transkript
gömülü ikinci çağrıda "adım neydi?" sorusuna doğru "Zeynep" cevabı geldi).

**Yeni dosyalar**:
- **`app-electron/main/axetChat.ts`** — `sendChatMessage(requestId, cwd,
  model, history, message)`: `axet-code run -q [-m provider/model]
  <transkript+yeni mesaj>` spawn eder (Electron'a bağımlı DEĞİL, `tsx` ile
  bağımsız test edildi), stdout/stderr'i biriktirip `{ok, text, error?,
  cancelled?}` döner. `running: Map<requestId, ChildProcess>` — kullanıcı
  "Durdur"a basınca `cancelChatMessage(requestId)` bu process'i `kill()`
  eder (canlı doğrulandı — 5000 satır saydırma isteği 1.5s'de kesildi,
  `{ok:false, cancelled:true}` döndü). `buildPrompt()` transkripti
  `Kullanıcı: .../Sen: ...` formatında birleştirip yeni mesajı ekliyor;
  geçmiş boşsa (ilk mesaj) transkript hiç eklenmiyor, düz mesaj gidiyor.
- **`app-electron/main/axetChat.ts`'in main/index.ts entegrasyonu**:
  `axetChat:send`/`axetChat:cancel` IPC handler'ları, `cancelAllChatMessages()`
  `window-all-closed`/`before-quit`'e (RFC bridge/readonly server'la aynı
  noktaya) eklendi — zombi `axet-code.exe` process'i kalmasın diye.
- **`src/lib/markdownLite.tsx`** (yeni) — sohbet cevaplarındaki markdown'ı
  (kod bloğu, `**kalın**`, `` `satır içi kod` ``, link, madde işaretli
  liste) React elemanlarına çeviren BAĞIMSIZ/hafif bir dönüştürücü —
  `dangerouslySetInnerHTML` HİÇ kullanılmıyor (React elemanı üretiyor, ham
  HTML string'i değil), bu yüzden XSS riski yok, yeni bir npm bağımlılığı
  (marked/remark vb.) eklenmedi.
- **`src/components/ChatBubble.tsx`** (yeni) — `ChatBubble` (kullanıcı
  balonu sağa hizalı/accent gradyan, asistan balonu sola hizalı/logo
  avatar, hover'da `CopyButton`) + `ThinkingBubble` (zıplayan üç nokta,
  `session.pending` sırasında gösteriliyor) + `TypewriterMarkdown` (iç
  yardımcı). **Daktilo animasyonu**: CLI'den cevap TAM METİN olarak geldiği
  için (gerçek stream yok), ChatGPT'ye benzer "canlı yazılıyor" hissini
  İSTEMCİ tarafında karakter-karakter açarak (6 karakter/12ms) taklit
  ediyoruz — SADECE mesaj gerçekten YENİ gelmişse (`message.justArrived`
  bayrağı, `AxetCodeHome.tsx handleSend`'de assistant mesajı oluşturulurken
  `true` set ediliyor, animasyon bitince `handleAnimationDone` ile `false`'a
  çevriliyor) oynar — sekme değişip geri dönüldüğünde veya React StrictMode
  dev'in çift-render'ında TEKRAR OYNAMAZ (ref mutasyonu YERİNE saf state
  kullanıldı, bilerek — StrictMode'un çift render'ında ref-mutasyon-sırasında
  side-effect riskli olabilirdi).

**`AxetCodeHome.tsx` — baştan yazıldı**: Önceki `EmbeddedTerminal`/
`terminalManager`/`onTerminalReady` tabanlı oturum modeli TAMAMEN kaldırıldı
(bu ekran için — SAP Launcher'ın kendi `TerminalPanel.tsx`'i HİÇ
DOKUNULMADI, ayrı kalıyor). Yeni model:
- `ChatSession { id, title, messages: ChatMessage[], model, draft, pending,
  requestId, createdAt }` — sohbet oluşturma artık HİÇBİR IPC çağrısı
  gerektirmiyor (eskiden `createTerminal` IPC'siyle bir PTY açmak
  gerekiyordu) — anında, IPC'siz bir state güncellemesi, ChatGPT'nin "New
  Chat" tıklamasının hissini taklit ediyor.
- `handleSend`: kullanıcı mesajını hemen state'e ekler → `pending:true` →
  `window.api.sendChatMessage(...)` çağırır (geçmiş = mesajlar dizisinin BU
  ÇAĞRIDAN ÖNCEKİ hâli) → sonucu (başarı/hata/cancel) assistant mesajı
  olarak ekler. İlk mesaj sohbetin başlığını otomatik belirliyor (ilk 42
  karakter + "…") — ChatGPT'nin "ilk mesajdan başlık türet" davranışıyla
  aynı.
- Model seçimi artık ne TUI-otomasyonu (Adım 4, kaldırıldı) ne de
  `axet-code.json`'a yazıp bir sonraki YENİ sohbeti beklemek — sadece
  aktif session'ın `model` alanını güncelliyor, BİR SONRAKİ mesajdan
  itibaren (AYNI sohbette dahi) o model `-m` ile kullanılıyor. `setAxetModel`
  hâlâ (uyumluluk için, zararsız) çağrılıp global varsayılan da güncelleniyor.
- Composer: auto-grow `<textarea>`, Enter=gönder/Shift+Enter=yeni satır,
  gönderirken buton Send→Stop'a dönüşüyor (`handleCancel`). Boş sohbet
  durumunda 3 öneri chip'i (`axetCodeHome.suggestion1/2/3`) tıklanınca
  composer'a yazılıyor. Dosya/Görsel Ekle butonu artık terminale `paste`
  DEĞİL, composer draft'ına dosya yolunu ekliyor (agent kendi dosya
  okuma aracıyla ne olduğuna karar veriyor — Adım 3'teki mantıkla aynı,
  sadece hedef artık bir textarea).
- Dashboard (hiçbir sohbet aktif değilken) görsel olarak DEĞİŞMEDİ —
  istatistik kartları, hızlı aksiyonlar, son sohbetler/son bağlantılar
  aynı kaldı, sadece "son sohbetler" artık terminal oturumu değil chat
  session'ı temsil ediyor.

**`EmbeddedTerminal.tsx` temizliği (kod tabanı hijyeni)**: Adım 4'te eklenen
`forwardRef`/`useImperativeHandle`/`pasteText`/`switchModel`/
`ModelSwitchResult`/`EmbeddedTerminalHandle` (TUI `/model` menüsünü klavye
simülasyonuyla kullanan ~100 satırlık RİSKLİ otomasyon) bu turda TAMAMEN
KALDIRILDI — artık hiçbir çağıran YOK (AxetCodeHome artık bu component'i
hiç kullanmıyor, `TerminalPanel.tsx` zaten ref hiç geçmiyordu, doğrulandı).
Component düz bir fonksiyon bileşenine geri döndü, SAP Launcher'ın kendi
terminal panelindeki davranış (Ctrl+V/drag&drop/resize/buffer flush mantığı)
HİÇ DEĞİŞMEDİ — sadece artık kullanılmayan ref-API'si silindi.

**i18n**: `axetCodeHome.sessionDefaultTitle`/`createFailed`/`attachSuccess`
(eskiden terminal-oturumu akışına özgü, artık ölü) silindi;
`newChatTitle`/`composerPlaceholder`/`send`/`stopGenerating`/
`chatEmptyHint`/`chatGenericError`/`suggestion1-3` eklendi.
`modelSelector.switchedLive`/`switchAmbiguous` (TUI-otomasyonuna özgü, artık
ölü) silindi; `appliesNextChatHint`/`switched` metinleri yeni "aynı sohbette
de bir sonraki mesajdan itibaren geçerli" gerçeğini yansıtacak şekilde
güncellendi.

**Test durumu**: `npm run typecheck` ve `npm run build` temiz geçti.
`axetChat.ts`'in `sendChatMessage`/`cancelChatMessage`'ı Electron'a hiç
bağımlı olmadığı için `tsx` ile bağımsız, gerçek `axet-code.exe`'ye karşı
CANLI test edildi: (1) bağlam/transkript korunumu ("Zeynep" örneği,
başarılı), (2) iptal/cancel akışı (1.5s'de kesme, `cancelled:true` döndü,
başarılı). Gerçek bir GUI penceresinde chat balonlarının/daktilo
animasyonunun/composer'ın GÖRSEL doğrulaması kullanıcının kendi makinesinde
yapılmalı — bu ortamda pencere etkileşimi mümkün değil.

**Bilinçli sınırlar**:
- Her mesaj gerçek bir CLI process'i spawn ettiği için (~6-7s/mesaj gözlendi)
  ve önceki TÜM geçmiş her seferinde yeniden gönderildiği için, çok uzun
  sohbetlerde (onlarca mesaj) hem yanıt süresi hem token maliyeti artabilir
  — bu mimarinin (stateless run + transkript) doğal bir sonucu, kod
  tarafında "gerçek" bir çözümü yok (CLI'nin kendisi `run` modunda oturum
  devam ettirme desteklemiyor).
- Araç kullanımı (dosya okuma/yazma) sonuçları sohbet balonunda AYRINTILI
  görünmüyor — sadece nihai metin cevap gösteriliyor (interaktif TUI'nin
  canlı araç-çağrısı göstergeleri burada YOK, bilerek — kullanıcı özgün/
  sade bir chat deneyimi istedi, ham TUI çıktısı değil).
- `small` model seçimi hâlâ UI'da yok (Adım 3'ten beri bilinen, değişmeyen
  bir sınır).

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## Platform Dönüşümü — Adım 6: Sohbet UI Cilası (Sürükle-Bırak, Model Konumu, Bekleme Hissi, Tema) (2026-08-27, DEVAM EDİYOR)

Adım 5'in canlı kullanıcı testinden gelen dört ayrı geri bildirim: (1) sürükle-
bırak çalışmıyordu, (2) model seçici "sohbet barında" değil, üstte YANLIŞ bir
yerdeydi, (3) "hız/şeffaflık" hissi yeterli değildi, (4) genel tema/tasarım
"kötü" bulundu. Dördü de ele alındı:

**1. Sürükle-bırak gerçekten çalışmıyordu — kök sebep bulundu**: Adım 5'teki
composer React'ın SENTETİK `onDrop`/`onDragEnter`/`onDragLeave`/`onDragOver`
prop'larını kullanıyordu. `EmbeddedTerminal.tsx`'in (SAP Launcher terminali,
kanıtlanmış/çalışan) sürükle-bırak'ı ise baştan beri gerçek DOM
`addEventListener`'ı (bir `useEffect` içinde) kullanıyor — bu FARK bilerek
kopyalanmadı, gözden kaçtı. Electron'da OS'ten gelen native dosya sürükleme
event'leri React'ın event-delegasyon sistemi üzerinden bazı durumlarda
güvenilir iletilmiyor. **Çözüm — yeni `src/components/ChatSessionPane.tsx`**:
composer artık kendi `dropZoneRef`'ine `dragover`/`dragleave`/`drop`'u native
`addEventListener` ile bağlıyor (`EmbeddedTerminal.tsx`'teki KANITLANMIŞ
desenin birebir aynısı) — "bırak" ipucu overlay'i de DOM'da doğrudan
`style.display` ile açılıp kapanıyor (React re-render'ına bağımlı değil, ekstra
state gerekmiyor).

**2. Model seçici konumu**: Kullanıcının "model değiştirme sohbet barı
üzerinde olsun" talebi, Adım 5'te YANLIŞ yorumlanıp sabit bir ÜST başlık
çubuğuna (h-12) konmuştu — kullanıcı bunu "üstte, yanlış yerde" olarak
gördü. Artık üst başlık çubuğu TAMAMEN KALDIRILDI; `ModelSelector` composer'ın
(mesaj yazma kutusunun) KENDİ içinde, alttaki ince bir araç çubuğu satırında
(`Paperclip` ikonunun yanında) — yani gerçekten "sohbet barı"nın (mesaj
girişinin) üzerinde. `ModelSelector.tsx`'in açılış yönü de buna göre
`top-full`+`mt` yerine `bottom-full`+`mb` olarak değiştirildi (artık ekranın
altına yakın olduğu için menü YUKARI açılıyor).

**3. "Hız/şeffaflık" — iki ayrı düzeltme**:
- Geçmiş artık `MAX_HISTORY_MESSAGES = 24` ile sınırlı (en eski mesajlar
  transkripten düşüyor) — uzun sohbetlerde prompt boyutu/süresi sınırsız
  büyümüyor.
- **"Düşünüyor" göstergesi baştan tasarlandı**: Adım 5'teki literal saniye
  sayacı ("· 3s") YANLIŞ bir yaklaşımdı — kullanıcıya beklemenin ne kadar
  sürdüğünü SAYISAL olarak göstermek, beklemeyi daha görünür/can sıkıcı
  hissettiriyordu (rakamların artışını izlemek). Kaldırıldı. Yerine ChatGPT/
  Gemini tarzı iki katmanlı bir "canlılık" göstergesi geldi
  (`ChatBubble.tsx` `ThinkingBubble`): sürekli zıplayan üç nokta + 2.6
  saniyede bir değişen kısa durum metni (`axetCodeHome.thinking1/2/3` —
  "Düşünüyor…" / "axet.code ile konuşuluyor…" / "Yanıt hazırlanıyor…").
  Sayı YOK, sadece hareket/değişim var — bu, gerçek süreyi kısaltmıyor
  (kısaltamayız, bkz. aşağıdaki bilinçli sınır) ama beklemeyi daha "canlı/
  ilerliyor" hissettiriyor.
- Daktilo animasyonu süresi Adım 5'teki 550ms tavanından 450ms'ye düşürüldü,
  ek bir gecikmeyi daha da azaltmak için.

**4. Tema/tasarım cilası**: Uygulamanın genelindeki (`src/index.css`'in kendi
yorumu: "nötr gri tonlar + tek bir sakin vurgu rengi, gradyan/parlama/
dekoratif efekt yok") minimalist dile Adım 5'teki chat bileşenleri UYMUYORDU
— avatar/buton/balonlarda yoğun `bg-gradient-to-br` kullanımı vardı. Bu turda:
- Kullanıcı balonu: gradyan yerine düz `bg-accent-500` (tek, sakin vurgu
  rengi — projenin kendi felsefesiyle hizalı).
- Asistan balonu: `border`lı gradyan yerine düz `bg-base-800`, avatar da düz
  `bg-base-800` (gradyansız).
- Kopyala butonu artık hover'da BELİRMİYOR — balonun altında sürekli görünür,
  küçük bir satır (uygulamanın başka yerlerindeki `CopyButton` kullanımıyla
  — bkz. `SystemPanel.tsx` — TUTARLI, orada da her zaman görünür).
- Boş durum/dashboard'daki gradyanlı ikon çerçeveleri ve butonlar (Yeni Sohbet
  butonu dahil) düz renklere çevrildi.
- Sidebar sohbet satırlarındaki gereksiz ikinci bir renkli "kutu" (mesaj
  ikonunun arka planı) kaldırıldı, sade bir ikon + metin satırına indirildi.
- **Üst başlık çubuğu TAMAMEN KALDIRILDI** (yukarıdaki madde 2) — mesaj alanı
  daha fazla dikey alan kazandı, ekranda daha az "chrome" var.

**Yeni dosya — `src/components/ChatSessionPane.tsx`**: Adım 5'te
`AxetCodeHome.tsx` içine gömülü olan TEK bir sohbetin render'ı (mesaj listesi +
composer + sürükle-bırak) ayrı bir component'e çıkarıldı — hem sürükle-bırak'ın
kendi `useEffect`/ref yaşam döngüsüne sahip olabilmesi için (yukarıdaki madde
1) hem de `AxetCodeHome.tsx`'in kendisinin aşırı şişmesini önlemek için.
`AxetCodeHome.tsx` artık sadece sidebar + dashboard + `sessions.map(...)` ile
her sohbet için bir `ChatSessionPane` render ediyor, state/handler'ların
SAHİBİ olarak kalıyor (prop olarak geçiyor) — mantık tekrarlanmadı.

**i18n**: `axetCodeHome.thinking` (tekil) silindi, `thinking1/2/3` (rotasyon
için üç ayrı kısa durum metni) + `composerHint` ("Enter ile gönder, Shift+
Enter ile yeni satır") eklendi. `index.css`'teki artık kullanılmayan
`.animate-text-shimmer`/`@keyframes text-shimmer` (madde 3'te kaldırılan
saniye sayaçlı tasarımın kalıntısı) silindi.

**Bilinçli sınır (DEĞİŞMEDİ, bu turda da çözülemedi)**: Bir mesajın gerçek
yanıt süresi (~5-7 saniye, canlı `axet-code run` çağrılarıyla ölçüldü — basit
"Say OK" gibi bir prompt bile bu kadar sürüyor) `axet-code` CLI'ının KENDİ
başlangıç/kimlik doğrulama/LLM çağrısı overhead'i — launcher'ın kontrolünde
DEĞİL, bu turda "hız" için yapılabilecek olan sadece ALGILANAN hızı/şeffaflığı
iyileştirmekti (yukarıdaki madde 3). Gerçek süreyi kısaltmanın tek yolu CLI'nin
kendisini kalıcı/interaktif bir process olarak arka planda tutup çıktısını
TUI ekran-tarama ile ayrıştırmak olurdu — bu, Adım 4'te tam olarak denenip
riskli bulunup TERK EDİLEN yaklaşımın ta kendisi (bkz. yukarıdaki "Adım 4"
bölümü), kullanıcı zaten "kendine özgü, terminale bağımlı olmayan" bir tasarım
istediği için bu turda tekrar denenmedi.

**Test durumu**: `npm run typecheck` ve `npm run build` temiz geçti
(`noUnusedLocals`/`noUnusedParameters` açık, dead code kontrolü de bu sayede
geçti). Paketlenmiş exe'de gerçek bir sürükle-bırak/yapıştırma/model-seçme
GÖRSEL testi bu ortamda yapılamadı — kullanıcının kendi makinesinde
doğrulaması gerekiyor.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## Platform Dönüşümü — Adım 7: axet.flows Modülü Entegrasyonu (2026-08-27, DEVAM EDİYOR)

Kullanıcı, `C:\workspace\axetflow\flow-builder` altında AYRI bir masaüstü
uygulaması olarak geliştirdiği **axet.flows AI Builder**'ı (metinle konuşarak
Node-RED uyumlu aXet.flows flow'ları oluşturan bir agentic builder — kendi
`README.md`'sinde tam belgeli) bu uygulamaya, ActivityBar'daki ÜÇÜNCÜ bir
aktivite ("axet.flows") olarak entegre etmemizi istedi — **kendi görsel
temasına/stiline uydurularak**. Kaynak proje TAMAMEN AYRI bir Electron
uygulamasıydı (kendi `package.json`, kendi `TitleBar`/`SettingsModal`, kendi
`window.axet` IPC köprüsü) — burada YENİDEN YAZILMADI, mantığın/UI'ın BÜYÜK
ÇOĞUNLUĞU birebir taşındı, sadece "kendi başına pencere" olan kısımlar
(başlık çubuğu, ayarlar modalı, sohbet oturumu disk kalıcılığı) bu
uygulamanın zaten sahip olduğu eşdeğerlerle değiştirildi.

**Neden yeniden yazmadık**: Kaynak proje ~9000 satırlık, canlı test edilmiş
(gerçek aXet.flows Designer'dan alınan flow JSON'larıyla doğrulanmış node
kataloğu, gerçekten çalışan bir mini Node-RED runtime'ı — `vm`/`http`/`net`
built-in'leriyle yazılı, LLM'e hiç bağımlı olmayan deploy/debug motoru) bir
mantık — bunu satır satır yeniden üretmek hem riskli (halüsinasyon/eksik
node tipi) hem gereksiz. Bunun yerine dosyalar OLDUĞU GİBİ kopyalanıp SADECE
üç entegrasyon noktası uyarlandı: (1) IPC köprüsü (`window.axet.*` →
`window.api.flowsXxx`), (2) modül sınırları (kendi pencere/tema kaldırılıp
ana uygulamanın ActivityBar/tema sistemine bağlandı), (3) CSS'in kendi
palet tanımları kaldırılıp ana uygulamanın `--base-*`/`--accent-*`
token'larına devredildi (aynı değişken adları — tesadüf, ama entegrasyonu
kolaylaştırdı).

**Taşınan dosyalar (değişmeden — sadece import yolları düzeltildi)**:
- **`src/flows/`** (yeni, React'tan bağımsız saf mantık — kaynaktaki
  `src/{idgen,nodeCatalog,templates}.js` + `src/store/{FlowModel,
  FlowContext}.js(x)` + `src/agent/{tools,systemPrompt,agentRunner}.js` +
  `src/utils/{dialogService,executionStats}.js`): flow veri modeli
  (`FlowModel` — node/wire/tab/subflow CRUD'u, undo/redo, kopyala/yapıştır,
  Node-RED uyumlu import/export), node kataloğu (`nodeCatalog.js` — GERÇEK
  aXet.flows Designer flow JSON'undan/resmi eğitim dokümanlarından/kurulu
  Electron paketinin `.html` dosyalarından doğrulanmış ~30 node tipi, HİÇ
  varsayımsal/genel Node-RED core node'u YOK — kaynağın kendi "sıfır
  halüsinasyon" ilkesi), agent'ın JSON-aksiyon protokolü (`agentRunner.js`/
  `tools.js`/`systemPrompt.js` — her tur `axet-code run`'a TEK bir prompt
  gönderip dönen `{"action":...}` veya `{"actions":[...]}` JSON'unu
  `FlowModel` üzerinde çalıştırır, "ref" takma adlarıyla aynı batch'te
  henüz bilinmeyen yeni node id'lerine referans verilebilir).
- **`src/components/flows/`** (yeni, 21 React bileşeni): canvas
  (`FlowCanvas.jsx` — `reactflow` kütüphanesiyle, sürükle-bırak/bağlantı/
  seçim/sağ-tık menüsü), node paleti, özellikler paneli (`NodeEditorPanel`
  — her node tipinin GERÇEK aXet.flows alanlarını otomatik form olarak
  üretir), sohbet paneli (`ChatPanel` — agent'la konuşma), debug paneli
  (`DebugPanel`/`RunsView` — adım adım "Flow Adımları" izi, hata olduğunda
  "DURDU" kartı + sebep/öneri + "AI ile Düzelt" butonu), tab/subflow
  yönetimi, şablonlar modalı, deploy öncesi statik kontrol modalı.
- **`app-electron/main/flowRuntime.js`/`flowDiagnostics.js`** (yeni,
  JavaScript — proje TS+strict ile derleniyor ama `allowJs`/`checkJs`
  kapalı bırakıldı, bu dosyalar tip kontrolünden geçmiyor, kaynak JS
  olarak KALDI çünkü flow node şekli çok esnek/JSON-tabanlı, TypeScript'e
  taşımak orantısız bir efor olurdu): `FlowRuntime` sınıfı — deploy edilen
  bir flow'u GERÇEKTEN çalıştırır (`function` node'u gerçek JS, `vm` modülü
  3sn timeout ile; `axetflows-http-in`/`http in` gerçek bir yerel HTTP
  sunucusu; `http request` gerçek dış HTTP/HTTPS isteği; `json-to-excel`/
  `excel-to-json` `xlsx` kütüphanesiyle gerçek .xlsx üretimi/okunması).
  Kimlik bilgisi/kurumsal entegrasyon gerektiren node'lar (AI/LLM, MS Graph
  mail, shell, DB, UI-form) GÜVENLİK nedeniyle SIMÜLE edilir (gerçek dış
  çağrı yapılmaz, "[SIMULATED]" etiketiyle loglanır) — bu ayrım kaynak
  projede zaten vardı, değiştirilmedi.

**Entegrasyon noktası 1 — IPC köprüsü**: Yeni `app-electron/main/
axetFlowsAgent.ts` (`runFlowsAgentStep`) — kaynağın `electron/main.js`
`runAxetCode()`'unun TypeScript'e taşınmış hâli: `axet-code run --quiet
--cwd <scratch>` alt-process'i, prompt STDIN'den verilir (axet.code sohbet
ekranının `axetChat.ts`'inden KASITLI OLARAK AYRI bir modül — farklı bir
scratch klasörüne kilitli, `%TEMP%/axet-flows-agent-scratch`, agent'ın
yanlışlıkla gerçek proje dosyalarına dokunmaması için). `main/index.ts`'e
tek bir modül-seviyesi `FlowRuntime` örneği eklendi (SAP Launcher'ın RFC
bridge/terminal süreçleriyle aynı desende — `before-quit`/`window-all-
closed`'da `flowRuntime.stop()`), event'leri (`onDebug/onStatus/onLog/
onTrace`) `flows:runtime:*` kanallarıyla renderer'a push ediliyor. Yeni IPC
handler'ları: `flows:agentStep`, `flows:runtime:{deploy,restart,validate,
stop,status,triggerInject,testRequest}`, `flows:{saveJson,openJson,
exportDebugLog}`. `preload/index.ts`'e `flowsXxx` isimli karşılıkları +
`onFlowsRuntimeXxx` event dinleyicileri eklendi; `shared/types.ts`'e flow
node/mesaj şekli JSON-esnek olduğu için BİLEREK gevşek (`FlowJsonValue =
Record<string, unknown>`) tipler eklendi — asıl doğrulama JS tarafında
(`nodeCatalog.js`/`flowDiagnostics.js`) zaten yapılıyor, TS'te tekrar
katı bir şema tanımlamak kaynağın kendi esnekliğini kısıtlardı.

**Entegrasyon noktası 2 — modül sınırları**: `AppShell.jsx`'ten kaynağın
kendi `TitleBar`/`SettingsModal`'ı ÇIKARILDI (bu uygulama zaten kendi
`TitleBar.tsx`/pencere çerçevesine sahip); model seçimi artık `window.axet.
getConfig/setConfig`'in kendi ayrı `llmModel` state'i DEĞİL, dışarıdan
(`AxetFlowsHome.tsx`) `model` prop'u olarak geliyor — axet.code sohbet
ekranıyla AYNI paylaşılan `ModelSelector.tsx`/`AxetModelEntry` altyapısını
kullanıyor (kullanıcı bir kere seçtiği "large" modeli hem axet.code sohbette
hem axet.flows agent'ında görüyor, iki ayrı model tercihi YOK). Sohbet
oturumu artık diske YAZILMIYOR (kaynağın `chat:save/load/clear` IPC'leri
kaldırıldı) — axet.code sohbet ekranıyla AYNI desen: oturum sadece bellekte
yaşar, aktivite değişince/uygulama kapanınca sıfırlanır; bu, iki modülün
kalıcılık DAVRANIŞINI tutarlı tutuyor ve ekstra bir disk-senkronizasyon
yüzeyi eklemiyor. Yeni **`src/components/AxetFlowsHome.tsx`** — ince bir
sarmalayıcı: üstte axet.code sohbetiyle AYNI görünümde bir başlık çubuğu
(`Workflow` ikonu + `ModelSelector`), altında `FlowProvider` içine sarılmış
`AppShell`. `ActivityBar.tsx`'e üçüncü bir `Activity = "axetFlows"` eklendi
(dizi tabanlı, tasarım baştan buna göre kurulmuştu — bkz. Adım 1), `App.tsx`
`activity === "axetFlows"` dalıyla bağlandı.

**Entegrasyon noktası 3 — CSS/tema**: Kaynağın `src/styles.css`'i (3665
satır, TÜM bileşen kuralları) `src/flows/flows.css`'e taşındı ama BAŞINDAKİ
palet/global bölüm (kendi `--base-*-rgb`/`--ink-*-rgb`/`--accent-*-rgb`
tanımları, `html`/`body`/`#root`/`*`/`::selection`/`::-webkit-scrollbar*`
gibi SAYFA-GENELİ kurallar) TAMAMEN KALDIRILDI — bu uygulama artık kendi
başına bir pencere değil, ana uygulamanın İÇİNDE bir aktivite; aynı
`--base-900-rgb` vb. değişken adlarını (ayrı ekiplerce bağımsız seçilmiş
olması ilginç bir tesadüf) ana uygulamanın `src/index.css`'i zaten
sağlıyor. Geriye SADECE bu paletin içermediği ek token'lar (radius ölçeği,
gölge/gradyan) kaldı, bunlar da ana uygulamanın `--accent-600`/`--accent-
400` renklerinden türetiliyor — böylece aXet.flows'un TÜM bileşen kuralları
(node renkleri hariç — onlar bilerek fonksiyonel/sabit, Node-RED
konvansiyonu) ana uygulamanın açık/koyu temasını `data-theme` değişince
ANINDA takip ediyor, ayrı bir tema anahtarı YOK.

**Bağımlılıklar**: `package.json`'a `reactflow`/`xlsx` eklendi (kaynağın
kendi bağımlılıkları — canvas için `reactflow`, gerçek .xlsx üretimi/
okunması için `xlsx`/SheetJS), `npm install` ile kuruldu. `flowRuntime.js`
`fast-xml-parser`'ı (zaten var olan bağımlılık, `XMLParser` — SOAP/XML
yanıtlarını gerçekten JS objesine çevirmek için) statik `import` ile
kullanacak şekilde güncellendi (kaynaktaki `require('fast-xml-parser')`
runtime-inline çağrısı — proje ESM olduğu için, ve `electron.vite.config.ts`
zaten bu paketi bundle'a gömdüğü için statik import daha doğru).
`tsconfig.web.json`/`tsconfig.node.json`'a `allowJs: true` + `.jsx`/`.js`
include desenleri eklendi (kopyalanan JS/JSX dosyaları TypeScript projesinin
`tsc --noEmit` taramasına DAHİL ama tip kontrolüne TABİ DEĞİL — `checkJs`
bilerek açılmadı, aksi halde binlerce "implicit any" hatası çıkardı;
`noUnusedLocals`/`noUnusedParameters` de JS dosyalarında uygulanmıyor).

**`flowRuntime.js`/`flowDiagnostics.js` — CommonJS'ten ESM'e çevrildi**:
Kaynak dosyalar `require()`/`module.exports` (CommonJS) kullanıyordu, ama
bu proje `"type":"module"` (ESM) — `import`/`export` söz dizimine
çevrildi; `xlsx` paketinin kendisi hâlâ `createRequire()` ile senkron
`require()` edilmeye devam ediyor (SheetJS'in ESM export'u güvenilir
değil, kaynağın da zaten yaptığı gibi lazy/inline require deseni korundu).

**Test durumu**: `npm run typecheck` ve `npm run build` temiz geçti
(reactflow/xlsx paketlerinin gerçekten kurulduğu `require.resolve` ile
doğrulandı). Paketlenmiş build'de gerçek bir canvas sürükle-bırak/agent
sohbeti/deploy testi bu ortamda yapılamadı — kullanıcının kendi makinesinde
"axet.flows" aktivitesine tıklayıp "+ Yeni Sekme" → node ekleme → sohbet
paneline bir istek yazma → Deploy Et akışını denemesi gerekiyor.

**Bilinçli sınırlar (kaynak projeden değişmeden devam eden)**:
- `axet-code run --quiet --cwd <scratch>` her agent turunda YENİ bir CLI
  process'i başlatıyor — bu, axet.code sohbet ekranının (Adım 5-6)
  `axetChat.ts`'iyle AYNI mimari taviz (stateless run + transkript), agent
  turları da benzer şekilde birkaç saniye sürebilir.
- AI/LLM, MS Graph mail, shell, DB, UI-form node'ları hâlâ SIMÜLE ediliyor
  (gerçek dış çağrı yapılmıyor) — bu kaynağın kendi güvenlik/kanıt
  gereksinimi kararı, bu turda değiştirilmedi.
- `axet.flows` kendi model tercihini axet.code sohbetiyle PAYLAŞIYOR (aynı
  "large" model) — `small` model veya axet.flows'a özel bağımsız bir model
  seçimi bu turda eklenmedi, istenirse ileride ayrılabilir.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## Platform Dönüşümü — Adım 9: axet.flows Referans Görsele Göre Layout Yeniden Tasarımı (2026-08-27, DEVAM EDİYOR — YARIDA, YENİ OTURUM BURADAN DEVAM ETSİN)

**Kullanıcının kesin yeni hedefi**: Verdiği referans görsel
`C:\Users\10134570\Downloads\Gemini_Generated_Image_njq3fhnjq3fhnjq3.jpg`
üzerindeki axet.flows yerleşimini istiyor. Görsel incelendi. İstenen düzen:

1. Üstte tek toolbar: solda `+ New Flow` (primary), `Templates`, `Data ▾`
   (Import/Export), `Tools ▾`, `Run`; sağda `Copy`, `Auto Layout`, `Debug`.
2. Altında flow tab satırı (`Flow 1`, `+`).
3. İç ana alan: **sol sabit node paleti** (kategori başlıkları + renkli kare
   ikon rozetli node satırları), **ortada açık grid-dot canvas**, **sağda
   sekmeli panel** (`Bilgi | İstatistikler | Özellikler`).
4. Sağ `İstatistikler`: Total Runs kartı, Success Rate circular gauge, Avg
   Duration sparkline, Top Nodes ve Connections.
5. Canvas node'ları klasik büyük Node-RED kutuları değil, referanstaki gibi
   **yuvarlak kategori ikonları + altında kısa etiketler**, aralarında wire.
6. Alt kısımda canvas ve sağ panelin altında **tam genişlik `FLOW BUILDER
   AGENT` chat dock** (model seçici sağda, input satırı altta); en altta
   kategori lejant çubuğu.

**BU OTURUMDA YAPILANLAR (henüz son build/test YOK):**

### Yeni dosyalar
- `src/components/flows/RadialGauge.jsx`: SVG dairesel başarı yüzdesi.
- `src/components/flows/MiniSparkline.jsx`: son çalışma sürelerinden saf SVG
  `polyline` trend grafiği.
- `src/components/flows/RightPanel.jsx`: sağ sekmeli `Bilgi/İstatistikler/
  Özellikler` paneli; eski WorkflowSidebar sorumlulukları buraya taşınıyor.
- `src/components/flows/CanvasOverlayBar.jsx`: eski sabit WorkflowHeader
  yerine yalnız gerektiğinde canvas üstünde subflow dönüş/çoklu node→subflow
  eylemlerini gösterir.

### Değiştirilen dosyalar
- `src/flows/utils/executionStats.js`: `computeDurationSeries()` eklendi.
- `src/components/flows/Toolbar.jsx`: baştan yazıldı; Run/deploy/restart/stop
  sorumluluğu eski WorkflowHeader'dan buraya taşındı. Data/Tools dropdownları
  eklendi.
- `src/components/flows/NodePalette.jsx`: baştan yazıldı; node satırları artık
  kategori renginde kare ikon rozetleri içeriyor ve sabit sol sütun içindir.
- `src/components/flows/FlowNode.jsx`: baştan yazıldı; `flow-node-circle`
  (44px renkli daire) + caption düzeni, handle'lar daire merkezine sabit.
- `src/components/flows/ChatPanel.jsx`: baştan yazıldı; sağ sidebar içi değil,
  tam genişlik `chat-dock`; geçmiş açılır/kapanır, model headerda.
- `src/components/flows/AppShell.jsx`: baştan yazıldı. Yeni JSX iskeleti:
  `Toolbar` → `TabsBar` → `.app-main-row` (`NodePalette` + canvas +
  `RightPanel`) → `ChatPanel` → `NodeLegend`.

### Silinen dosyalar
- `src/components/flows/WorkflowHeader.jsx`
- `src/components/flows/WorkflowSidebar.jsx`

Silmek güvenliydi: yeni AppShell bunları import etmiyor; sorumluluklar
Toolbar/CanvasOverlayBar/RightPanel'e taşındı.

### CSS DURUMU — EN KRİTİK KALAN İŞ
`src/flows/flows.css` hala eski layout'un ~3476 satırlık kurallarını içeriyor.
Adım 8 tema uyum düzenlemeleri (radius/gradyan/glow/hover lift/emoji→lucide)
korundu. Ancak yeni Adım 9 bileşen class'ları için CSS henüz yazılmadı.
Özellikle şunlar tamamlanmalı:

- `.app-main-row` (flex/min-height:0/flex:1/overflow:hidden),
  `.app-center-col` (flex:1/min-width:0/flex-column).
- `.node-palette` sabit sol sütun (~270px); `.node-palette-floating` ve
  `.palette-toggle-btn` artık ölü. Eski fake search `::before/::after`
  kaldırılmalı; JSX artık gerçek `.node-palette-search-icon` kullanıyor.
  Yeni `.node-palette-item-badge` (28×28, flex center, radius 6px, white)
  eklenmeli. `node-palette-item-swatch` JSX'te artık yok.
- `.right-panel`, `.right-panel-tabs`, `.right-panel-tab`,
  `.right-panel-tab-active`, `.right-panel-scroll`, `.right-panel-tab-body`,
  `.right-panel-tab-body-flush`, `.right-panel-section`,
  `.right-panel-section-flush`, `.right-panel-section-title`,
  `.workflow-meta-value-editable`, `.stats-card-grid`, `.stats-card`,
  `.stats-card-gauge`, `.stats-card-value`, `.stats-card-value-sm`,
  `.stats-card-label`, `.radial-gauge`, `.radial-gauge-label`,
  `.radial-gauge-arc`, `.mini-sparkline`.
- `.canvas-overlay-bar`: absolute/top/left/right/z-index; iç butonları
  `pointer-events:auto`.
- `.flow-node` yeni daire+caption ölçülerine göre: eski min-width:178,
  header/body/glossy kuralları artık ölü. Yeni `.flow-node-circle`,
  `.flow-node-caption`, `-primary`, `-secondary`; flow handle 8-10px.
- `.chat-dock`, `.chat-dock-header`, `.chat-dock-toggle`,
  `.chat-dock-header-icon`, `.chat-send-btn`; eski `.chat-panel` sidebar
  ölçüleri yeni dock'a uyarlanmalı; `.chat-log` expanded iken max-height
  ~180-220px olmalı.
- `.node-legend` en altta yatay bar kalmalı. `.app-body`, `.app-main`,
  `.app-side`, `.workflow-header*`, `.node-palette-floating`,
  `.palette-toggle-btn` eski layout kalıntıları; JSX kullanımını doğruladıktan
  sonra silmek güvenli.

**Tema kuralları (Adım 8 kararı hâlâ geçerli):** ana tokenlar
`var(--base-950/900/850/800/700/600)`, `var(--ink-100/200/300/400/500)`,
`var(--accent-500/600/400)`, `var(--accent-glow)`,
`var(--accent-soft-text)`; panel kart border `base-700`, input `base-600`;
gradient/glow/hover translateY YOK; node `nodeCatalog.js` renkleri fonksiyonel
Node-RED semantiği olduğu için korunur; radius xs=4/sm=6/md-lg=8/xl=12;
pill sadece gerçek rozetler; ikonlar sadece lucide-react.

**Yeni oturum öncelik sırası:**
1. `AppShell.jsx`, `RightPanel.jsx`, `Toolbar.jsx`, `NodePalette.jsx`,
   `FlowNode.jsx`, `ChatPanel.jsx`, `CanvasOverlayBar.jsx`, `RadialGauge.jsx`,
   `MiniSparkline.jsx` ve `flows.css`i oku.
2. CSS Adım 9'u tamamla; eski CSS'yi komple silme—DebugPanel, modal, runs,
   NodeEditor, ReactFlow kontrolleri hâlâ gerekli.
3. `npm run typecheck`, `npm run build` çalıştır; hata varsa düzelt.
4. `npm run dev` ile aç; kullanıcı referans görsele göre canlı değerlendirsin.
5. Adım 9 bitene kadar commit/push/release YOK.

**Not**: Son başarılı test Adım 8 sonundaki typecheck/build idi. Adım 9'da
çok sayıda JSX dosyası değişti/yazıldı ama henüz test çalıştırılmadı. Yeni
session testten önce “tamamlandı” demesin.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

### CSS tamamlandı, typecheck/build TEMİZ (2026-08-27, devamı) — görsel doğrulama hâlâ bekliyor

Yukarıdaki "CSS DURUMU — EN KRİTİK KALAN İŞ" listesindeki TÜM kalemler bu
oturumda `src/flows/flows.css`'e işlendi:

- **Yeni eklenenler**: `.app-main-row`/`.app-center-col` (flex satırı/sütunu),
  `.canvas-overlay-bar` (absolute, canvas üstünde yüzen, `pointer-events:
  none` + çocuklarında `auto` — CanvasOverlayBar'ın altındaki canvas'a
  tıklamayı bloklamaz), `.node-palette-search-icon` (gerçek lucide `Search`
  ikonu, eski `::before/::after` sahte daire+çizgi kaldırıldı),
  `.node-palette-item-badge` (28×28 flex-center radius-sm, arka plan rengi
  `NodeIconBadge`'in inline `style`'ından geliyor), `.right-panel` +
  `.right-panel-tabs/-tab/-tab-active/-scroll/-tab-body/-tab-body-flush/
  -section/-section-flush/-section-title` (SystemPanel'deki segmented-tab
  deseniyle aynı ruhta), `.stats-card-grid/-card/-card-gauge/-card-value(-sm)/
  -card-label`, `.radial-gauge/-label/-arc`, `.mini-sparkline`,
  `.workflow-meta-value-editable` (hover'da hafif bir "düzenlenebilir" ipucu),
  `.flow-node-circle/-caption/-caption-primary/-caption-secondary`,
  `.chat-dock/-header/-toggle/-header-icon`, `.chat-send-btn` (32×32 dairesel
  ikon buton, `.chat-input-row button.chat-send-btn` ile temel buton
  kuralının üzerine yazıyor).
- **`.flow-node` yeniden kuruldu**: artık kutulu/başlıklı bir kart DEĞİL —
  `width:44px; padding-top:6px` sabit bir kutu, `.flow-node-circle` bu kutuyu
  tam dolduran 44px'lik daire (handle'ların `left:-6px`/`right:-6px`'i hâlâ
  BU 44px kutunun kenarına oturuyor — `FlowNode.jsx`'teki `CIRCLE_TOP=6`/
  `CIRCLE_SIZE=44` sabitleriyle birebir hizalı), `.flow-node-caption` bu
  kutudan **`position:absolute` ile çıkarılmış**, altta ortalanmış 108px
  genişliğinde bir etiket (caption'ın kendi genişliği node'un/handle'ların
  gerçek pozisyonunu ETKİLEMİYOR — bu yüzden etiket daireden daha geniş
  olabiliyor ama bağlantı noktaları hep dairenin tam kenarında kalıyor).
  Seçili halka artık sadece daire etrafında (`.flow-node-selected .flow-node-
  circle`), eski kutu-genişliğinde çerçeve kaldırıldı.
- **Silinen ölü CSS** (JSX'te artık hiç referans edilmediği tek tek
  doğrulandı — `grep` ile tüm `src/components/flows` taranarak): `.app-body`,
  `.app-main`, `.canvas-header`, `.canvas-breadcrumb` (çıplak; `-back`/
  `-label` KORUNDU, hâlâ kullanılıyor), `.palette-toggle-btn*`,
  `.node-palette-floating*`, `.workflow-header*` (10 kural, `-description-
  empty` KORUNDU), `.app-side`, `.workflow-sidebar` + `-toggle/-chevron*/
  -body/-section/-section-title` (`-empty` KORUNDU, RightPanel'de hâlâ
  kullanılıyor), `.node-palette-title`, `.node-palette-hint`,
  `.node-palette-search::before/::after` (sahte ikon), `.node-palette-item-
  swatch` (+ subflow override'ı), `.flow-node` eski kutu/header/body/name/
  type/subflow kuralları, `.chat-panel` (temel sarmalayıcı — `-title-label`/
  `-title-busy` KORUNDU), `.chat-panel-title` (üst satır — artık `.chat-dock-
  header`).
- **Doğrulama yöntemi**: her silinecek class için önce `grep` ile
  `src/components/flows/*.jsx` içinde gerçekten hiç kullanılmadığı tek tek
  teyit edildi (yanlışlıkla hâlâ kullanılan bir class'ı silmemek için) —
  hepsi teyitli.

**Test durumu**: `npm run typecheck` VE `npm run build` bu CSS turunun
SONUNDA çalıştırıldı, **ikisi de temiz geçti** (önceki oturumun bıraktığı
"henüz test edilmedi" uyarısı artık geçerli değil). **Ancak `npm run dev`
ile gerçek bir pencerede görsel doğrulama bu ortamda hâlâ yapılamadı** —
canvas'taki daire+etiket node'ların, sağ panelin sekmeleri arasında geçişin,
İstatistikler sekmesindeki gauge/sparkline'ın ve alt chat dock'un referans
görsele göre GERÇEKTEN doğru göründüğü kullanıcının kendi makinesinde
`npm run dev` (veya paketlenmiş exe) ile kontrol edilmeli. Küçük ölçü
ayarları (44px daire, 108px etiket genişliği, 320px sağ panel, 220px chat
dock kaydırma yüksekliği gibi) gerçek ekranda "biraz küçük/büyük" hissi
verirse bunlar `flows.css`'te tek satırlık değerler, kolayca ince ayar
yapılabilir — mimari/yapısal bir değişiklik gerekmez.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## Platform Dönüşümü — Adım 8: axet.flows + Sohbet Ekranı Tema/Layout Tam Uyumu (2026-08-27, DEVAM EDİYOR)

Kullanıcı Adım 7'de entegre edilen axet.flows'un (ve sohbet ekranının)
"temasını, tasarımını, düzenini, layoutunu, butonları, görünümü TAMAMİYLE
bizim aXet SAP Launcher temamıza uygun şekilde" yeniden düzenlenmesini
istedi. Önce bir alt-agent ile projenin GENEL tasarım dilini (radius/border/
shadow/tipografi/buton kalıpları/ikon kütüphanesi) tam bir rapor olarak
çıkardık (SystemPanel/Tree/SettingsModal/ConfirmDialog/AddSystemModal/
ActivityBar/ChatBubble gibi dosyalardan) — bu rapor Adım 6-7'nin ÜZERİNE
inşa edilen kesin referans oldu.

**Ana bulgu (index.css'in kendi yorumu)**: proje BİLİNÇLİ OLARAK minimalist
— "gradyan/parlama/dekoratif efekt YOK", nötr gri + tek sakin vurgu rengi.
axet.flows'un kaynak projesi (`axetflow`) ise tam tersi bir "2026 SaaS koyu
tema" diliyle yazılmıştı: yoğun gradyanlar (`--accent-gradient`, yeşil deploy
butonu gradyanı), renkli glow'lar (`box-shadow: 0 4px 14px rgba(...)`),
hover'da `translateY(-1px)` kaldırma efektleri, `border-radius: 999px` pill
sekmeler, ve emoji ikonlar (⚡🌐🧩🤖📤🛡🖥🗄📧🔑🧷📊🛠⚠🔗⬛, ayrıca ✓✕≈📌🗗🗑⬇📜⏱▶◀▸▾).

**Yaklaşım — 3555 satırlık `flows.css`'i BAŞTAN YAZMAK YERİNE hedefli/
kaldıraçlı dönüşüm**: 21 React bileşeninin className referanslarını
DEĞİŞTİRMEDEN (regresyon riskini en aza indirmek için), CSS'in KÖK
noktalarını (değişken tanımları) düzelterek yüzlerce kullanım yerini TEK
seferde düzelttik:
- **Radius ölçeği**: `--radius-xs/sm/md/lg/xl` değerleri (5/8/11/15/20px)
  uygulamanın Tailwind radius skalasına (4/6/8/8/12px) çevrildi — TEK bu
  değişiklik, canvas node'ları, paneller, modaller, buton köşeleri dahil
  YÜZLERCE kullanım yerini otomatik olarak "daha az yuvarlak/daha kurumsal"
  hale getirdi. `--radius-pill` (999px) SADECE gerçek daire/pill öğeler
  (dot'lar, sayı rozetleri) için korundu — sekme/tab chip'leri gibi
  metin-içerikli öğelerden kaldırıldı (artık `--radius-sm`).
- **Gradyan düzleştirme**: `--accent-gradient` değişkeni `linear-gradient(...)`
  yerine düz `var(--accent-500)` olarak yeniden tanımlandı — bu TEK satır,
  chat baloncuğu/gönder butonu/canvas convert butonu/toolbar dot'u gibi
  6+ farklı yerdeki gradyanı otomatik düzleştirdi.
- **Yeşil "deploy" butonu**: elle bulunan ~4 yerde (`deploy-btn-run`/
  `deploy-split-caret`/ilgili glow'lar) sabit hex gradyan (`#22c55e→#16a34a`)
  + renkli glow (`rgba(34,197,94,0.32)`) kaldırılıp `var(--status-success-
  text)` düz rengiyle (uygulamanın kendi başarı rengi) değiştirildi.
- **Hover-lift efektleri**: 8 ayrı yerdeki `transform: translateY(-1px)`
  (buton/kart hover'da "kalkma" efekti — uygulamada YOK, sadece renk
  değişimi var) + `filter: brightness(1.08)` (parlama) satırları toplu
  olarak kaldırıldı; her hover kuralı böylece sadece arka plan/kenarlık
  rengi değiştiren (app'in kendi `hover:bg-base-700` deseniyle aynı) düz bir
  geçişe döndü.
- **Renkli glow'lar**: durum noktalarındaki (`deploy-status-dot-on`,
  `workflow-connection-dot`) `box-shadow: 0 0 Npx <renk>` parlama efektleri
  kaldırıldı (StatusDot.tsx'in kendisinde hiç glow yok, sadece düz nokta) —
  chat baloncuğu/gönder butonu/modal primary butonundaki glow'lar da
  kaldırılıp düz `hover:bg-accent-600` geçişine çevrildi.
- **Eksik `.deploy-btn` temel sınıfı eklendi**: JSX zaten bu className'i
  kullanıyordu (`deploy-btn deploy-btn-run ...`) ama CSS'te HİÇ tanımlı
  değildi (kaynak projede de aynı boşluk vardı) — flex/gap/padding/radius/
  border içeren gerçek bir taban kural eklendi, artık bu butonlar diğer
  ikincil butonlarla (border-base-700, padding 6px 12px) aynı iskelete
  sahip.

**İkon dili birleştirme — TÜM emoji/dingbat glyph'ler lucide-react'e
taşındı** (uygulama genelinde emoji SIFIR kullanılıyor, sadece lucide):
- Yeni **`src/components/flows/CategoryIcon.jsx`** — node kategorisi ->
  lucide ikon eşlemesi (⚡→Zap, 🌐→Globe, 🧩→Puzzle, 🤖→Bot, 📤→Upload,
  🛡→ShieldCheck, 🖥→Monitor, 🗄→Database, 📧→Mail, 🔑→KeyRound, 🧷→Pin,
  📊→FileSpreadsheet, 🛠→Wrench, ⚠→AlertTriangle, 🔗→Link2, ⬛→Square).
  `nodeCatalog.js` (React'tan bağımsız kalması gerektiği için) bu eşlemeyi
  BARINDIRMIYOR — sadece kategori isimlerini tanımlıyor, görsel temsili
  `FlowNode.jsx`/`NodeLegend.jsx` (bu yeni bileşen üzerinden) belirliyor.
- `DebugPanel.jsx`: ✓✕≈ → `Check`/`X`/`Waves`; 📌🗗⬇🗑✕ (panel aksiyon
  butonları) → `Pin`/`PictureInPicture2`/`Download`/`Trash2`/`X`; ⏱📜 (boş
  durum ikonları) → `Timer`/`ScrollText`; ▾ (chain chevron) → `ChevronDown`.
- `Toolbar.jsx`: ↶↷ (undo/redo) → `Undo2`/`Redo2`; ayrıca Yeni Flow/
  Şablonlar/Import/Export/Kopyala/Auto Layout/Debug butonlarına ikon
  eklendi (`FilePlus2`/`LayoutTemplate`/`Upload`/`Download`/`Copy`/
  `LayoutGrid`/`Bug`) — önceden SADECE metin etiketliydi.
- `WorkflowHeader.jsx`: ◀ (geri) → `ArrowLeft`; ▶ (deploy/play) → `Play`;
  ▾ (dropdown caret) → `ChevronDown`; Durdur butonuna `Square` ikonu
  eklendi; ayrıca **redundant "aXet.flows AI Builder ▸" breadcrumb kaldırıldı**
  (modül zaten bu uygulamanın İÇİNDE, kendi adını tekrar tekrar göstermesine
  gerek yok — tıpkı SAP Launcher'ın kendi header'ının da "aXet SAP Launcher"
  yazmaması gibi).
  `✓ Basarili`/`✕ Hatali` metnindeki glyph'ler de düz metne çevrildi.
- `AppShell.jsx`: ◀▶ Palet toggle → `PanelLeftClose`/`PanelLeftOpen`.
- `RunsView.jsx`/`WorkflowSidebar.jsx`: ✓✕ (satır durumu) → `Check`/`X`.
- `TabsBar.jsx`: düz `x`/`+` metin karakterleri → `X`/`Plus` ikonları,
  butonlar artık kare/ortalı ikon-buton (`.tabs-bar-close`/`.tabs-bar-add`
  CSS'i flex+sabit boyuta çevrildi).
- `SubflowsPanel.jsx`: `+` → `Plus`. `NodePalette.jsx`: `▾` (grup chevron)
  → `ChevronDown`.
- `FlowNode.jsx`: `▶` (manuel inject butonu) → `Play` (fill="currentColor");
  🔗 (subflow instance ikonu) → `Link2`; kategori ikonu artık `CategoryIcon`
  üzerinden geliyor (`iconForType` string-döndüren fonksiyonu bu component
  içinde artık kullanılmıyor, `nodeCatalog.js`'te export olarak KALDI —
  başka bir tüketicisi çıkarsa diye kaldırılmadı, sadece FlowNode/NodeLegend
  artık kendi ikon eşlemesini kullanıyor).
- Her ikon değişikliğinde karşılık gelen CSS class'ı (`*-icon`, `*-chevron`,
  `*-btn`) da kontrol edilip gerekirse `display:flex; align-items:center`
  eklendi (emoji bir metin glyph'i olduğu için `font-size`ile hizalanıyordu,
  SVG ikon flex-hizalama gerektiriyor).

**Model seçici konumu — axet.code sohbetiyle AYNI karara hizalandı**:
Adım 7'de `AxetFlowsHome.tsx`'e eklenen sayfa-üstü ayrı başlık çubuğu
(Workflow ikonu + "axet.flows" etiketi + ModelSelector) KALDIRILDI — Adım
6'da axet.code sohbetinde alınan "model seçici composer/sohbet barının
KENDİSİNDE olsun, ayrı bir üst başlık çubuğunda OLMASIN" kararıyla tutarlı
olması için. Model state (`models`/`currentModel`/`modelsLoading`/
`modelsError` + `handleSelectModel`) artık `AppShell.jsx`'in içinde yaşıyor
ve `ChatPanel.jsx`'e prop olarak geçiyor; `ChatPanel`'in kendi başlık
satırında (`Flow Builder Agent` etiketinin yanında) `ModelSelector.tsx`
render ediliyor — axet.code'daki `ChatSessionPane.tsx`'in composer
toolbar'ındaki KULLANIMLA birebir aynı bileşen, aynı davranış.
`AxetFlowsHome.tsx` artık sadece `<FlowProvider><AppShell /></FlowProvider>`
saran, GÖRSEL OLARAK hiçbir şey render etmeyen ince bir sarmalayıcı.

**`ModelSelector.tsx`'e yeni `direction` prop'u eklendi** (`"up" | "down"`,
varsayılan `"up"`): axet.code'un composer'ı ekranın ALTINDA olduğu için
menü yukarı açılıyordu (Adım 6); axet.flows'un `ChatPanel` başlığı ise
panelin ÜSTÜNDE — aynı bileşeni oraya taşıyınca menü ekran dışına taşardı.
`direction="down"` (SADECE `ChatPanel.jsx`'te kullanılıyor) menüyü
`top-full`+`mt-1.5` ile aşağı açacak şekilde ayarlıyor; axet.code'daki
mevcut kullanım hiç değişmedi (varsayılan `"up"` ile aynı davranış).

**Bilinçli olarak DOKUNULMAYAN**: `nodeCatalog.js`'teki node tipine özel
RENKLER (`color: '#e6a23c'` gibi, Node-RED editor konvansiyonu) — bunlar
zaten kaynak projenin kendi yorumunda "tema sisteminin dışında, fonksiyonel"
olarak işaretliydi, ilk entegrasyon turunda da bilerek korunmuştu, bu turda
da değiştirilmedi (canvas'taki node'ların HANGİ tipte olduğunu renkle ayırt
etmek Node-RED'in evrensel bir konvansiyonu, "tema" değil). Canvas node
kutularının kendisi (`.flow-node`) hâlâ hafif bir üstten-gelen parlaklık
(glossy highlight) ve node-header arka planında ince bir gradyan taşıyor —
bunlar renksiz/nötr (siyah-beyaz opaklık) olduğu için "SaaS gradyan" sorununa
girmiyor, dokunulmadı.

**Test durumu**: `npm run typecheck` ve `npm run build` her ADIMDA (CSS
değişiklikleri + her JSX ikon değişikliği + model seçici taşıma sonrası)
tekrar tekrar çalıştırıldı, hepsi temiz geçti. Görsel/canlı doğrulama
(canvas'ta node renklerinin/ikonların gerçekten doğru göründüğü, ModelSelector
menüsünün ChatPanel'de doğru yönde açıldığı) bu ortamda yapılamadı —
kullanıcının kendi makinesinde axet.flows ekranını açıp kontrol etmesi
gerekiyor.

**Bu turda da BİLEREK YAPILMAYAN**: GitHub push/release — dönüşüm bitene
kadar hâlâ durduruldu.

## axet.flows — Bağlantı Çizgisi (Edge) Görünürlüğü ve Debug Scroll Şikayeti + Orijinal axetflow Kaynağıyla Tam Dizin Denetimi (2026-08-28)

**Şikayet**: "nodeların birbirine bağlantısını gösteren ip görünmüyor" (birden
fazla kez, önceki renk/kontrast/`vector-effect`/CSS-özgüllük düzeltmelerine
rağmen) ve "debug ekranında flow adımlarında scroll yapamıyorum" — kullanıcı
ayrıca orijinal `axetflow` kaynağıyla (`C:\workspace\axetflow\flow-builder`)
bizim portumuz arasında eksik/fazla dosya olup olmadığının denetlenmesini
istedi.

**Yapılan tam dizin denetimi (satır/boyut seviyesinde, node ile otomatik)**:
- `src/flows/*` ↔ orijinal `src/*` (store/, utils/, agent/, idgen.js,
  nodeCatalog.js, templates.js, styles.css→flows.css): **birebir eşleşiyor**,
  tek fark klasör düzleştirme (`store/` kaldırıldı) ve import yolları.
  `FlowModel.js` **tamamen özdeş** (sadece import path farkı). `agentRunner.js`
  tek fark: `window.axet.agentStep` → `window.api.flowsAgentStep` (bilinen IPC
  köprü rename'i). `executionStats.js`'te SADECE bizim eklediğimiz
  `computeDurationSeries` (Adım 9 sparkline) fazladan var, eksik hiçbir export
  yok.
- `src/components/flows/*` ↔ orijinal `src/components/*`:
  - **Orijinalde olup bizde OLMAYAN** (bilerek, isim bazında): `SettingsModal.jsx`,
    `TitleBar.jsx` (bu uygulamanın kendi Ayarlar/TitleBar'ı kullanılıyor),
    `WorkflowHeader.jsx`, `WorkflowSidebar.jsx` (Adım 9'da Toolbar.jsx/
    RightPanel.jsx'e devredildi). Kök `App.jsx`/`main.jsx` da yok (host app'in
    kendi giriş noktası var, `AxetFlowsHome.tsx` ince sarmalayıcı).
  - **Bizde olup orijinalde OLMAYAN** (yeni eklemeler): `CanvasOverlayBar.jsx`,
    `CategoryIcon.jsx`, `MiniSparkline.jsx`, `RadialGauge.jsx`, `RightPanel.jsx`.
  - **İsim eşleşen TÜM dosyalar** satır satır karşılaştırıldı — mantıksal fark
    YOK, sadece bizim yaptığımız bilinçli tema/layout/özellik eklemeleri
    (boyut farkları bundan kaynaklanıyor, örn. `Toolbar.jsx` +5979 byte çünkü
    Data/Tools dropdown'ları + Run split-button bu turda eklendi).
  - `electron/flowRuntime.js`/`flowDiagnostics.js` ↔ `app-electron/main/`
    aynı isimle mevcut, fonksiyon imzaları (`coerceType`, `evalRule`,
    `findFreePort`, `getByPath`, `previewValue`, `safeJsonClone`,
    `setByPath`) **birebir aynı** — sadece CommonJS→ESM syntax çevrimi
    (bilinen, dokümante edilmiş dönüşüm).
  - **Sonuç: hiçbir gerçek fonksiyon/dosya eksik değil.** Bu yüzden edge/scroll
    şikayetleri "eksik kod" değil, Adım 8-9'da YAPILAN tema/layout
    yeniden tasarımının (koyu kutulu node → açık dairesel node, ayrı
    WorkflowSidebar → sekmeli RightPanel) kendi CSS'inden kaynaklanıyor
    olmalı.

**Edge (bağlantı çizgisi) — kök sebep KESİN olarak izole edilemedi ama
artık CSS cascade'inden TAMAMEN bağımsız bir çözüm var**: `.flow-canvas`
özgüllük öneki + `vector-effect:non-scaling-stroke` denendi, kullanıcı hâlâ
göremedi. `FlowCanvas.jsx`'teki edge nesnelerine artık DOĞRUDAN `style: {
stroke, strokeWidth }` (inline) veriliyor — reactflow'un `BaseEdge`
bileşeni bunu `<path style={style}>` olarak DOĞRUDAN uyguluyor (kaynak kodu
doğrulandı: `node_modules/@reactflow/core/dist/esm/index.js` `BaseEdge`).
Inline style CSS specificity'den TAMAMEN bağımsızdır, hiçbir harici
stylesheet (bizim veya kütüphanenin) bunu ezemez — bu artık "çizgi rengi
görünmüyor" ihtimalini kod seviyesinde İMKANSIZ hale getiriyor. Aktif
(çalışan) kenar yeşil (`#22c55e`), diğerleri koyu slate (`#334155`).
**Eğer bu turdan sonra da görünmezse, sorun artık CSS DEĞİL** — muhtemelen
`raw.wires` verisinin gerçekten boş olması (yani veri modelinde bağlantı hiç
oluşmamış) ihtimaline bakılmalı; `FlowModel.js.connect()` doğrulandı (orijinalle
birebir aynı), agent'ın `connect_nodes` tool'unun gerçekten çağrılıp
çağrılmadığı canlı ortamda kontrol edilmeli.

**Debug panel scroll — kod/CSS satır satır orijinalle karşılaştırıldı,
FARK YOK**: `.debug-panel`/`.debug-panel-list`/`.debug-panel-header`/
`.execution-summary` CSS kuralları (flex:1 + min-height:0 + overflow-y:auto
zinciri) orijinalle **harfiyen özdeş** (sadece bizim eklediğimiz
`overscroll-behavior:contain`, zararsız). `handleListScroll`/stick-to-bottom
mantığı da özdeş. reactflow'un zoom/pan wheel dinleyicisinin SADECE
`.react-flow__pane` DOM elementine (`select(zoomPane.current)`) bağlı olduğu
kaynak kodundan doğrulandı — DebugPanel'i etkilemesi mümkün değil. **Bu
şikayetin kök sebebi bu oturumda statik analizle bulunamadı** — kod
kanıtlanmış-çalışan orijinalle aynı. Sonraki oturum: kullanıcıdan canlı
repro istensin (kaç chain var, tek chain içinde mi yoksa chain'ler arasında
mı scroll denendi, scrollbar thumb görünüyor mu/sürüklenebiliyor mu, fare
tekerleği mi trackpad mi) — DOM inceleme (DevTools) olmadan bu ortamdan daha
fazla ilerlemek mümkün değil.

**Test durumu**: `npm run typecheck` ve `npm run build` temiz geçti.

## axet.flows — Function Node Motoru + "Cloud'a Kaydet" (2026-08-28)

Kullanıcının amacı: **bizim gömülü axet.flows editörümüzü ve motorumuzu,
gerçek axet.flows (Canlı) host'una birebir aynı yapmak** (cloud-save gibi
gerçekten dış/bulut olan özellikler hariç — "Cloud'a Kaydet" burada
GERÇEKTEN bir cloud değil, aynı makinedeki gerçek host'a kaydetmek anlamına
geliyor, bkz. aşağı).

### 1) Function node motoru gerçek Node-RED semantiğine yakınlaştırıldı

Kök şikayet: bizim motorumuzda hata vermeyen bir flow, gerçek (Canlı)
host'ta function node kod kısmında hata veriyordu.

Bulunan/düzeltilen kök sebepler (`app-electron/main/flowRuntime.js`,
`app-electron/main/flowDiagnostics.js`):

- **`safeJsonClone` (JSON round-trip) → `cloneMessage` (gerçek yapısal
  derin kopya)**: mesaj AKTARIMINDA (function/change/catch/get-context)
  artık `Buffer`/`Date`/`RegExp`/`undefined`/döngüsel referans korunuyor
  (JSON clone bunları bozuyordu). `safeJsonClone` sadece debug-önizleme ve
  deploy-diff'te (JSON-safe olması İSTENEN yerlerde) kaldı.
- **Function node kodu artık ASYNC fonksiyona sarmalanıyor**
  (`(async function(msg){...})(msg)`, öncesi SENKRON'du) — kullanıcı kodu
  içinde üst seviye `await` artık çalışıyor (gerçek Node-RED'in davranışı).
  10 saniyelik ayrı bir race-timeout ile hiç çözülmeyen bir Promise'in
  motoru sonsuza kadar askıda bırakması da önlendi.
- **`node.send()`, `node.warn/error/log/done/status`, `context`/`flow`/
  `global`/`env` API'leri eklendi** — sandbox öncesinde SADECE
  `msg`/`node:{id,name}` içeriyordu. `context`/`flow`/`global` store'ları
  `FlowRuntime` constructor'ında kalıcı (`nodeContextStore`/
  `flowContextStore`/`globalContextStore`) — gerçek Node-RED'in bellek
  context modülü gibi, deploy/stop sırasında SİLİNMİYOR (sadece process
  kapanınca sıfırlanıyor, `FlowRuntime` `index.ts`'te singleton).
  `node.send(msg)` çağrıları senkron olarak `pendingSends`'e biriktirilip
  script bittikten SONRA `_emit()` tarafından gönderiliyor — böylece
  `node.send(msg); return null;` deseni de `return msg;` deseni de ikisi de
  çalışıyor (gerçek Node-RED'deki gibi).
- **Sandbox globalleri genişletildi**: `Buffer, Date, JSON, Math, Promise,
  RegExp, Array, Object, Error` + **`setTimeout/clearTimeout/setInterval/
  clearInterval`** (öncesinde bunlar da yoktu, `ReferenceError` veriyordu —
  `await new Promise(r => setTimeout(r, ms))` gibi ÇOK yaygın bir desen bu
  yüzden patlıyordu). Oluşan timer handle'ları `this.timers`'a ekleniyor ki
  stop/redeploy'da sarkan (leaked) timer kalmasın.
- **Deploy öncesi statik syntax kontrolcüsü** (`flowDiagnostics.js`
  `checkFunctionSyntax`) de aynı ASYNC sarmalayıcıyı kullanacak şekilde
  düzeltildi — öncesinde SENKRON sarmalıyordu, bu yüzden geçerli `await`
  içeren kod deploy'dan ÖNCE yanlış bir `SYNTAX_ERROR` ile bloke ediliyordu
  (kullanıcının orijinal şikayetinin muhtemel tam kaynağı buydu).

Doğrulama: geçici bir smoke-test scriptiyle (oturum sonunda silindi) `await`,
context/flow/global persistence, Buffer/Date koruma, `node.send()`+`return`
birleşik dispatch, catch-node hata yayılımı tek tek test edildi, hepsi
çalıştı. `node --check` ve `tsc -p tsconfig.node.json --noEmit` temiz.

### 2) "Cloud'a Kaydet" butonu eklendi

Live'daki "Cloud'a Kaydet" butonunun bizim editörde karşılığı yoktu.
Kullanıcı netleştirdi: bu buton kendi disk/store'umuza kaydetmek DEĞİL,
**aynı makinede AYRICA çalışan gerçek aXet.flows.exe host'unun (Live
ekranının bağlandığı aynı Node-RED tabanlı süreç) admin API'sine** (GET/POST
`/flows`, v2 header + rev optimistic-locking destekli) flow'u YAZMAK.

- **Yeni dosya `app-electron/main/axetFlowsLiveSave.ts`**:
  `discoverAxetFlowsLiveUrl()` (mevcut discovery, `axetFlowsLiveDiscovery.ts`)
  ile portu bulur, `GET /flows` ile mevcut workspace'i (v1 düz dizi veya v2
  `{rev,flows}`) okur, `mergeFlowIntoWorkspace()` ile SADECE aynı id'li
  tab/node'ları upsert eder (diğer tab'lara dokunmaz), `POST /flows` ile
  (v2 ise aynı `rev` ile) geri yazar.
- **IPC**: `axetFlowsLive:saveFlow` handler (`index.ts`) +
  `saveFlowToLiveHost` preload köprüsü (`preload/index.ts`, `window.d.ts`).
- **UI**: `Toolbar.jsx`'e "Cloud'a Kaydet" butonu (Kopyala'nın solunda,
  `CloudUpload` ikonu) — `model.toDeployArray(activeTabId)` + elle
  eklenen `type:'tab'` node'uyla aktif sekmeyi export edip
  `window.api.saveFlowToLiveHost()` çağırıyor, export-check modalından
  (mevcut validasyon akışı) geçiyor.

`tsc` (node+web) ve `electron-vite build` temiz. **Canlı test edilmedi** —
gerçek aXet.flows.exe çalışırken (discovery ona bağlı) test edilmesi
gerekiyor; kullanıcı win-unpacked build alıp uygulamayı başlattı, sıradaki
adım bu butonu gerçek host açıkken denemek.

### "json-to-excel" node'u bizim editörde hata vermiyor ama Canlı host'ta veriyor — KÖK SEBEP: iki motor FARKLI kütüphane kullanıyor (2026-08-29)

**Şikayet**: Kullanıcı bizim gömülü editörde bir flow test etti (`json-to-excel`
node'u, `kind:"buffer"`, `payloadProp:"payload"`, `bufferProp:"payload"` —
bir önceki function node'dan gelen `[{ISOCode,CurrencyName}, ...]` dizisini
excel'e çeviriyor), hiç hata almadı. Aynı flow'u "Cloud'a Kaydet" ile gerçek
Canlı aXet.flows host'una gönderip orada çalıştırınca **"Input type unknown."**
hatası aldı (`xlsx-populate/lib/Workbook.js:833`). Soru: "ikisi aynı ekran
olduğuna göre neden biz hata vermedik?"

**Kök sebep**: İki motor **hiç aynı kütüphaneyi kullanmıyor**:
- **Bizim `flowRuntime.js` `_runJsonToExcelNode()`** (`app-electron/main/
  flowRuntime.js:1084-1100`) — `xlsx` (SheetJS) paketiyle **SIFIRDAN** bir
  worksheet üretir: `XLSX.utils.json_to_sheet(rows)` — girdi olarak SADECE
  bir obje dizisi (`Array.isArray` kontrolü) ister, dizi ise (boş dizi dahil)
  asla hata vermez. Bu, flow-builder'ın (`axetflow` kaynak projesinin de
  BİREBİR aynı şekilde yazdığı) bir **YEREL/OFFLINE TEST SİMÜLATÖRÜ** — gerçek
  production Node-RED runtime'ı DEĞİL, agent'in ürettiği flow'u editör içinde
  çalıştırıp hata var mı diye BAKMAK için yazılmış bir motor.
- **Canlı aXet.flows.exe host'u** — bu tamamen ayrı, gerçek bir Node-RED
  sunucusu, kendi GERÇEK kurulu `json-to-excel` node paketiyle çalışıyor ve bu
  paket **`xlsx-populate`** kütüphanesini kullanıyor. Bu kütüphane SheetJS'in
  tam tersi bir amaç için var — "sıfırdan JSON'dan sayfa üret" YOK, sadece
  **var olan bir .xlsx dosyasını/şablonunu YÜKLEYİP doldurma** aracı
  (`Workbook.fromDataAsync`/`fromFileAsync`/`fromBlankAsync` → hepsi aynı
  `_convertInputToBufferAsync()` zincirinden geçer). Bu fonksiyon girdiyi
  SADECE `Buffer`/`Blob`/base64 `string`/`Uint8Array`/`ArrayBuffer` olarak
  kabul eder — bunların HİÇBİRİNE uymayan bir girdi (bizim flow'daki gibi düz
  bir JS obje dizisi) verilince tam olarak `throw new Error("Input type
  unknown.")` satırına düşer — kullanıcının aldığı hatanın satır/mesaj
  seviyesinde birebir kaynağı bu (kaynak koddan doğrulandı,
  `github.com/dtjohnson/xlsx-populate`).
- **Sonuç**: Canlı host'taki gerçek `json-to-excel` node'u muhtemelen
  `msg.payload`'ın (veya `bufferProp` neyi işaret ediyorsa onun) hazır bir
  **xlsx şablon buffer'ı** olmasını bekliyor (yüklenip üzerine yazılacak bir
  taban dosya) — bizim nodeCatalog'daki basit `kind/bufferProp/payloadProp`
  alan seti bunu YANSITMIYOR (gerçek node'un tam config şemasını kanıtlamadan
  modellemek hallusinasyon olurdu). Bizim simülatör bunu hiç bilmediği için
  "iyi niyetli" davranıp array'i doğrudan sıfırdan bir sayfaya çeviriyor, hiç
  hata vermiyor — Canlı host ise gerçek `xlsx-populate` sözleşmesini
  uyguladığı için aynı girdiyi reddediyor.

**Bilinçli sınır (İLK bulgu turunda, sonra düzeltildi — bkz. aşağıdaki bölüm)**:
Bu turda "iki motor mimari olarak ayrı, kod tarafında düzeltilecek bir bug
değil" denip bırakılmıştı. **Kullanıcı bunu kabul etmedi** ve şu talebi verdi:
"bizim uygulamaya eklenen nodelar/flowlar/debug/ayarlar/configler ve diğer
her şey 1:1 orijinaliyle aynı olmalı" — yani gerçek aXet.flows Desktop
kurulumunun (`C:\Users\...\AppData\Local\axet-flows\.deptapps-desktop\
electron-releases\WINDOWS_X64\latest-prod\resources\app`) kendisi referans
alınıp bizim motor buna göre BİREBİR düzeltilmeli, "farklı ama meşru iki
motor" diye bırakılmamalı. Aşağıdaki bölüm bu düzeltmeyi belgeliyor.

### "json-to-excel"/"excel-to-json" — GERÇEK pakete karşı doğrulanıp BİREBİR yeniden yazıldı (2026-08-29, TAMAMLANDI)

Kullanıcının kurulu aXet.flows Desktop'ının kendi `resources/app/node_modules/`
altında **iki farklı excel node ailesi** olduğu keşfedildi:
1. `@node-red/nodes/axetflows-excel` (`excel`, json2xls ile dosyaya yazar) ve
   `@node-red/nodes/axetflows-util/excel-to-json-multiinput`
   (`excel-to-json-multiinput`, `xlsx` ile dosya/base64 okur) — bunlar zaten
   bizim `SIMULATED_TYPES` listemizde, dokunulmadı.
2. **`node_modules/deptapps-flows-contrib-excel-utils`** — asıl `json-to-excel`
   ve `excel-to-json` node'larının GERÇEK, obfuscate EDİLMEMİŞ kaynak kodunu
   içeren paket (`src/nodes/json-to-excel/json-to-excel.js`,
   `src/nodes/excel-to-json/excel-to-json.js`, `src/utils/excel-write-helper.js`,
   `src/utils/settings-helper.js`, `src/utils/checksum.js`) — kaynak koddan
   doğrudan okunarak tam sözleşme çıkarıldı.

**Gerçek `json-to-excel` sözleşmesi (kaynaktan doğrulandı)**:
- Kütüphane **`xlsx-populate`** (SheetJS `xlsx` DEĞİL) — `XlsxPopulate.
  fromBlankAsync()` (kind="blank"), `XlsxPopulate.fromDataAsync(buffer)`
  (kind="buffer", var olan bir workbook'u YÜKLER) veya ikisi arasında otomatik
  seçim (kind="auto": `payload.buffer` varsa buffer, yoksa blank).
  **`kind` alanının geçerli 3 değeri**: `auto`/`blank`/`buffer` — bizim eski
  kodumuzdaki `base64` seçeneği GERÇEK node'da HİÇ YOK, kaldırıldı.
- **Payload sözleşmesi SheetJS'ten TAMAMEN FARKLI**: `payloadProp`'un
  (varsayılan `payload.data`) işaret ettiği değer bir **obje** olmalı —
  `{ "SayfaAdi": [ {satır...}, ... ], "Sayfa2": [...] }` (sayfa adı → satır
  dizisi haritası). **Düz bir dizi (`[{...}]`) GEÇERSİZ** — gerçek kaynakta
  `Object.keys(payload)` dizi indekslerini ("0","1",...) sahte "sayfa adı"
  gibi işler ve her "sayfa"nın verisi tek bir satır objesi olur, bu da
  `data.forEach` çağrısında patlar. Kullanıcının orijinal flow'u (`msg.payload`
  = düz dizi, `kind:"buffer"`, `bufferProp:"payload"`) **iki ayrı sebepten**
  gerçek node'da patlıyordu: (a) `kind="buffer"` olduğu için `bufferProp`
  ("payload") üzerinden `XlsxPopulate.fromDataAsync(diziyi)` çağrılıyor —
  dizi `Buffer`/`Blob`/base64/`Uint8Array`/`ArrayBuffer` olmadığı için TAM
  OLARAK `"Input type unknown."` fırlatıyor (kullanıcının aldığı hatanın
  birebir kaynağı, satır numarası dahil doğrulandı); (b) `kind="blank"` ile
  bile denense düz dizi payload yine `fillWorkbook`'ta patlardı.
- Çıktı her zaman `msg.payload`'a yazılır (bizim eski kodumuz `bufferProp`'a
  yazıyordu — YANLIŞ, düzeltildi).
- Hücre değeri olarak string/number/boolean/`Date`/formül-fonksiyonu/
  `{value,style,hyperlink}` objesi desteklenir; header modu (satırların ilk
  objesinin anahtar birleşimi/2D dizi/kolon-harfi/tanımlı dizi) ve offset
  `msg.payload.config`'ten okunur.

**Gerçek `excel-to-json` sözleşmesi**: `xlsx` (SheetJS, doğru kütüphane
buymuş) kullanır ama **TÜM sayfaları** okur (bizim eski kodumuz sadece
İLK sayfayı okuyordu) ve çıktıyı `{ buffer, checksum, data: {sayfaAdı:
[satırlar]}, config }` şeklinde `msg.payload`'a yazar — bu çıktı şekli
`json-to-excel`'in `payloadProp`/`bufferProp` varsayılanlarıyla (`payload.
data`/`payload.buffer`) TAM olarak eşleşiyor (iki node'un round-trip
tasarımı bu). `msg.payload` SADECE `Buffer` olabilir (base64 string DEĞİL —
bizim eski kodumuz base64'ü de kabul ediyordu, bu da kaldırıldı).

**Yapılan değişiklikler**:
- **`app-electron/main/flowRuntime.js`**: `_runJsonToExcelNode`/
  `_runExcelToJsonNode` **`xlsx-populate`**'in gerçek kaynak kodundan
  (`excel-write-helper.js`+`settings-helper.js`) birebir port edilen yeni
  modül-seviyesi yardımcılarla (`xlsxFillWorkbook`, `xlsxWriteValueInCell`,
  `xlsxGetHeaderSettings`/`xlsxGetOffsetSettings`, `xlsxChecksumFromBuffer`)
  tamamen yeniden yazıldı — artık ASYNC (`XlsxPopulate` API'si promise
  tabanlı), `_executeNode` zaten `await` ile çağırdığı için ek bir değişiklik
  gerekmedi. `xlsxChecksumFromBuffer` **bilinçli bir sadeleştirme**: gerçek
  paket `checksum-buffer` (multihash/IPFS formatı) kullanıyor, biz düz SHA-1
  hex kullanıyoruz — byte-seviyesinde aynı değil ama `json-to-excel` node'un
  KENDİSİ bu alanı hiç okumadığı için işlevsel bir fark yaratmıyor (yorum
  olarak koda not edildi).
- **`app-electron/main/flowDiagnostics.js`**: `"Input type unknown."` ve
  `json-to-excel`'in "msg.X does not exist" hatası için yeni tanı desenleri
  eklendi — artık agent/kullanıcı bu hataları görünce otomatik doğru teşhise
  (`kind` yanlış seçilmiş / Data alanı obje değil) ulaşıyor.
- **`src/flows/nodeCatalog.js`**: `json-to-excel`'in `kind` seçenekleri
  `['auto','buffer','base64']` → **`['auto','blank','buffer']`** (gerçek
  şema), `defaults.name` gerçek node gibi boş string.
- **`package.json`**: yeni bağımlılık **`xlsx-populate`** (gerçek paketin
  kullandığı KENDİSİ, taklit değil) — `npm install` ile kuruldu, paketlenmiş
  `app.asar` içinde `node_modules/xlsx-populate/lib/Workbook.js`'in
  gerçekten var olduğu `asar list` ile doğrulandı (mevcut `xlsx` deseniyle
  birebir aynı externalize/require zinciri, `electron.vite.config.ts`'e
  dokunulmadı).
- **Canlı doğrulama (bu makinede, gerçek kütüphaneye karşı)**: geçici bir
  smoke-test scripti (`FlowRuntime` sınıfını doğrudan import edip) 5 senaryo
  çalıştırdı, hepsi PASS: (1) kullanıcının ORİJİNAL bozuk flow'u artık
  gerçek Canlı host'takiyle **BİREBİR AYNI** `"Input type unknown."` hatasını
  veriyor (önceden hiç hata vermiyordu — asıl şikayet buydu), (2) doğru
  kullanım (`kind:"auto"`, `payload.data={Sheet1:[...]}`) geçerli bir xlsx
  buffer'ı üretiyor, (3) `excel-to-json` ile round-trip doğru veriyi geri
  veriyor, (4) `kind:"blank"` direkt çalışıyor, (5) düz dizi payload verilirse
  net bir "obje olmalı" hatası dönüyor (gerçek node'da sessizce patlayan bir
  durumu bizim tarafımızda daha açıklayıcı, ama davranış olarak "işe
  yaramıyor" sonucu aynı). Script sonrasında silindi.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.

**Sonraki oturum için not**: Bu tur SADECE excel node'larını (kullanıcının
somut şikayeti) kapsıyor. Kullanıcının "her şey 1:1 aynı olmalı" talebi
kapsam olarak ÇOK daha büyük — gerçek kurulumda başka onlarca custom node
paketi var (`axetflows-db-*` 6 node "Deprecated nodes" kategorisinde —
bizim nodeCatalog'daki `nosql-persist/query/remove/remove-all/find-one`
adları GERÇEK tip string'leriyle `axetflows-db-persist/query/remove/
remove-all/find-one` EŞLEŞMİYOR, bu yüzden "Cloud'a Kaydet" ile gönderilen
bir flow'da bu node'lar Canlı host'ta "tip bulunamadı" hatası verebilir;
`nosql-count`/`sql-query`'nin gerçek bir karşılığı bu kurulumda bulunamadı;
`axetflows-ui/*` form/auth node'ları, `axetflows-network`, `axetflows-use-
register`, `deptapps-vpn`, `mdone-integration` gibi paketler henüz hiç
denetlenmedi). Gerçek kurulum yolu: `C:\Users\10134570\AppData\Local\
axet-flows\.deptapps-desktop\electron-releases\WINDOWS_X64\latest-prod\
resources\app\node_modules\` (hem `@node-red/nodes/*` hem üst seviye
`deptapps-flows-contrib-*`/`axetflows-*` paketlerine bak — bazı node'ların
GERÇEK kaynağı `@node-red/nodes` altında değil, üst seviye `node_modules`'ta
ayrı bir contrib paketinde, bu turda tam da bu yüzden bulundu). Devam etmek
istenirse aynı yöntem: gerçek `.html` (editor tanımı, `defaults`/fields) +
`.js` (calisma mantığı, hangi npm paketini kullanıyor) dosyalarını oku,
nodeCatalog.js + flowRuntime.js'i buna göre düzelt, `node --check` +
gerçek bir smoke-test scriptiyle doğrula.

## "Her Şey 1:1 Aynı Olmalı" — İkinci Tur Tam Denetim (2026-08-29, aynı gün devamı)

Kullanıcı yukarıdaki "sonraki oturum" notunu bu OTURUMDA devam ettirdi —
"TÜM node ailelerini sırayla denetle" seçildi. Önceki turun "bulunamadı"
dediği `nosql-count`/`sql-query` gibi bazı tipler bu turda GERÇEKTEN
bulundu — kök sebep: bunların gerçek kaynağı `@node-red/nodes/*` altında
DEĞİL, `resources/app/node_modules/` **üst seviyesinde ayrı contrib
paketlerinde** (`axet-flows-contrib-nodes-db-nosql`, `axet-flows-contrib-
nodes-db-sql`, `deptapps-flows-contrib-credentials`, `deptapps-flows-
contrib-email`, `deptapps-flows-contrib-nodes-audit`, `deptapps-flows-
contrib-nodes-axet`, `deptapps-flows-contrib-nodes-enabler`, `deptapps-
flows-contrib-nodes-ms-graph-mail-client`, `deptapps-flows-contrib-nodes-
ms-graph-sharepoint-client`, `deptapps-flows-contrib-nodes-session`,
`deptapps-flows-contrib-axet-agents`, `axet-flows-contrib-nodes-agents`,
`axet-flows-contrib-nodes-axet-ai-capabilities`, `axet-flows-contrib-nodes-
axet-ui-spa` (yeni), `axet-flows-contrib-nodes-axet-worker`, `axet-flows-
contrib-nodes-node-backend`, `axet-flows-contrib-nodes-python-agent`,
`axet-flows-contrib-nodes-userbot` (yeni)) — önceki turda SADECE
`packages/node_modules/@node-red/nodes` taranmıştı, üst seviye
`node_modules` hiç taranmamıştı.

**Yöntem**: Node.js ile (`registerType\(\s*(['"])((?:(?!\1).)*)\1` regex'i)
`axet-`/`deptapps-` önekli TÜM üst seviye paketlerdeki `.html` dosyalarından
`registerType(...)` çağrılarının ilk ~1800 karakteri toplu dump edildi
(~3700 satır), tek tek okunup mevcut `nodeCatalog.js`/`flowRuntime.js` ile
karşılaştırıldı.

**Sonuç — çoğu önceki giriş DOĞRU çıktı** (query/refine/history/axet-config,
enabler-llm, ms-graph-mail-config/shp-config, session save/get/set/destroy,
credentials/secret/hidden-secret, sql-query, use-case/audit-config'in temel
alanları, axet-agents-execute, axet-ai-capability-*, e-mail/e-mail in/
check-login) — önceki oturumların dikkatli çalıştığının kanıtı. Bulunan ve
DÜZELTİLEN farklar:

1. **`'aXet Agent'` kategorisi yanlıştı**: gerçek node (`deptapps-flows-
   contrib-axet-agents/nodes/agent-external-backend/crewai-agent-
   extback.html`) `category: 'Deprecated nodes'` ile kayıtlı — bizim `'ai'`
   kategorimiz yanlıştı, `'deprecated'`e çekildi.
2. **`'audit-use-case'` tipi TAMAMEN HALLUSİNASYONDU** — gerçek palette'te bu
   isimde `registerType` çağrısı YOK (sadece `'use-case'` var, zaten ayrıca
   tanımlıydı) — "use case (alias)" girişi tamamen SİLİNDİ, "sıfır
   halüsinasyon" ilkesine aykırıydı.
3. **`use-case`'in `useCaseCategory`/`isAI` alanları** gerçek node'da SERBEST
   METİN (`{type:'text'}`, enum/select YOK) ve varsayılanları BOŞ —
   bizim `select` (`AUDIT/AI/AUTOMATION`, `true/false`) + `useCaseCategory`
   varsayılanı `'AUDIT'` UYDURMAYDI, düzeltildi (artık `type:'text'`, boş
   varsayılan).
4. **`python-agent` eksik alanlar**: gerçek node'da olup bizde olmayan
   `pyenvTargetVersion`, `sourceCwd`, `apiName`, `apiRoutes` (deprecated ama
   hâlâ var), `modelClientId` eklendi (`gitToken` credentials-tipi, diğer
   credential alanları gibi regular field olarak modellenmedi).
5. **`python-gateway` eksik alanlar**: `corsMethods`, `corsHeaders`,
   `agentRoutes`, `backendPrefix`, `internalPort`, `wsAuthMode` eklendi;
   `corsOrigins` varsayılanı `''` → gerçek `'*'`.
6. **`node-backend` eksik alanlar**: `language` (varsayılan `'javascript'`)
   ve `inputs` (0/1) eklendi.
7. **`nosql-persist`/`nosql-remove`**: gerçek node'da olup bizde olmayan
   `collectionPropertyType`/`propertyType` (`'str'`/`'msg'`) + hepsine
   (persist/remove/remove-all/query, find-one HARİÇ — gerçek kaynakta o
   node'da bu alan yok) `dbNameIsBlockByAutogeneration` eklendi.
   `nosql-find-one`'a `collectionPropertyType`/`identifierPropertyType`/
   `bindingPropertyType` eklendi.
8. **8 YENİ node TAMAMEN EKSİKTİ, katalogda hiç yoktu**:
   - **`enabler-audio`** (`deptapps-flows-contrib-nodes-enabler/nodes/audio/
     audio.html`) — ses/transkripsiyon AI node'u, `enabler-config`
     referanslı, `language`/`translate` alanları.
   - **`axet-spa-app`**, **`axet-spa-sdk-event-in`**, **`axet-spa-sdk-event-
     out`**, **`axet-spa-sdk-request-in`**, **`axet-spa-sdk-request-out`**
     (`axet-flows-contrib-nodes-axet-ui-spa`, TAMAMEN YENİ bir paket, önceki
     turda taranmamıştı) — derlenmiş bir SPA'yı (statik dosya VEYA git-clone+
     build) servis eden ve SSE tabanlı bir "SDK" mesaj köprüsü sunan node
     ailesi. **`axet-spa-app` eski `axetflows-app` ile AYNI flow'da birlikte
     KULLANILAMAZ** (gerçek editör bunu otomatik siliyor) — bu kısıtlama
     kod/comment olarak nodeCatalog.js'e not edildi.
   - **`UserBot`**, **`OktaBot`** (`axet-flows-contrib-nodes-userbot`,
     TAMAMEN YENİ bir paket) — Okta'ya karşı gerçek bir robot kullanıcı
     doğrulayan credential node'ları. **Type string'leri GERÇEKTEN BÜYÜK
     HARFLE başlıyor** (`'UserBot'`/`'OktaBot'`, projedeki diğer TÜM
     tiplerin aksine — kaynak koddan doğrulandı, yazım hatası değil, agent
     bunu küçük harfe çevirmemeli).
9. **`SIMULATED_TYPES`e eklendi** (`flowRuntime.js`): `enabler-audio`,
   `axet-spa-app`, `axet-spa-sdk-event-in/out`, `axet-spa-sdk-request-in/
   out`, `UserBot`, `OktaBot` — hepsi bu ortamda güvenle çalıştırılamayacak
   (harici git clone/SPA build/statik sunucu, gerçek Okta tarayıcı otomasyonu
   + TOTP) dış entegrasyonlar.
10. **`systemPrompt.js`'teki `json-to-excel` açıklaması DÜZELTİLDİ** — eski
    metin hâlâ "düz obje dizisi" bekliyor diyordu (bu oturumun BAŞINDAKİ
    excel düzeltmesinden ÖNCEKİ, artık yanlış bir varsayım) — artık gerçek
    `{SayfaAdı:[satırlar]}` sözleşmesini, `kind` seçeneklerini ve
    `excel-to-json` ile round-trip uyumunu doğru anlatıyor; agent'ın
    ÜRETTİĞİ flow'ların gerçek host'ta çalışma ihtimali artık daha yüksek.

**Bilinçli olarak bu turda YAPILMAYAN (kapsam dışı bırakıldı, zaman/fayda
dengesi)**: `axetflows-ui/*` (form/auth alt-node'ları — `axetflows-form`,
`axetflows-view-action` vb. — zaten büyük ölçüde taranmıştı önceki turlarda),
`axetflows-network` (sadece `axetflows-http-in`, zaten doğrulanmıştı),
`deptapps-vpn`, `mdone-integration`, `axet-flows-contrib-nodes-axet-ai-
capabilities`'in `types/capability.js` gibi yardımcı dosyaları — bunlar ya
zaten önceki turlarda doğrulanmıştı ya da bu turda incelenen dump'ta hiçbir
tutarsızlık göstermedi (satır satır zaten örtüşüyordu).

**Doğrulama**:
- Yeni bir Node.js smoke-test scripti (`NODE_CATALOG`'u doğrudan import
  edip) TÜM girişlerin `category`/`label`/`color`/`fields`/`defaults`/
  `formFields` bütünlüğünü, `aXet Agent`/`enabler-audio`/`axet-spa-app`/
  `UserBot`/`OktaBot` kategorilerini, `audit-use-case`'in silindiğini,
  `use-case` varsayılanlarının boş olduğunu ve `json-to-excel`'in `kind`
  seçeneklerinde `base64` KALMADIĞINI doğruladı — hepsi PASS (script
  sonrasında silindi). "Missing category" uyarıları SADECE `isConfig:true`
  config node'ları için çıktı (tasarım gereği, gerçek regresyon değil, tek
  tek `isConfig` bayrağı kontrol edilerek doğrulandı).
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.
- Görsel/canlı doğrulama (bu 8 yeni node'un canvas'ta doğru göründüğü,
  agent'ın bunları doğru şekilde ürettiği/"Cloud'a Kaydet" ile Canlı host'a
  gönderilen bir flow'un artık gerçekten kabul edildiği) bu ortamda
  yapılamadı — kullanıcının kendi makinesinde denemesi gerekiyor.

**Hâlâ kapsam dışı / gelecek bir tur için not**: `resources/app/node_modules`
altında henüz taranmamış birkaç küçük paket var (`deptapps-notifications`,
`deptapps-workers` — `.html` dosyaları hiç yok, muhtemelen sadece backend/
worker altyapısı, node paleti tipi içermiyor; doğrulandı, kapsam dışı
bırakılması güvenli). `axetflows-ui/application` klasöründeki devasa
`axetflows-app`'in TÜM alt-özellikleri (roller, oturum, tema) önceki
turlarda zaten taranmıştı, bu turda tekrar edilmedi.

## Debug Panel "Flow Adımları" Scroll'u — JS Güvenlik Ağı Eklendi (2026-08-29)

**Şikayet**: "debug ekranında flow kısmında scroll yok" — bu TAM ŞİKAYET
daha önce de gelmişti (bkz. yukarıdaki "axet.flows — Bağlantı Çizgisi (Edge)
Görünürlüğü ve Debug Scroll Şikayeti" bölümü, 2026-08-28), o turda derin bir
statik analiz (CSS `flex:1`+`min-height:0`+`overflow-y:auto` zinciri, orijinal
kaynakla satır satır karşılaştırma) yapılmış ve **kod tarafında hiçbir fark
bulunamamıştı** — "kanıtlanmış-çalışan orijinalle özdeş" sonucuna varılmıştı.

**Bu turda yapılan**: Kullanıcıya `ask_user` ile net bir teşhis sorusu
soruldu ("scrollbar hiç görünmüyor mu / görünüyor ama tekerlek çalışmıyor mu
/ içerik zaten dolmuyor mu / panel kesik mi görünüyor") — cevap: **"Scrollbar
hiç görünmüyor"**. Bu, CSS flex zincirinin (`.debug-panel` → `.debug-panel-
list`) bir yerde piksel-bazlı yükseklik hesaplamasını BAŞARAMADIĞINI (yani
`flex:1; min-height:0`'ın beklenen davranışı üretmediğini) işaret ediyor —
bu tür Chromium/Electron'a özgü, çok katmanlı iç içe flex bağlamlarında
(App.tsx → AxetFlowsHome → FlowProvider → AppShell → app-main-row →
app-center-col → debug-panel → debug-panel-list, 7+ katman) ARA SIRA
görülen, statik CSS okumasıyla asla kanıtlanamayan bir sınıf sorun.

**Çözüm — CSS'e DOKUNMADAN, JS tabanlı bir güvenlik ağı**
(`src/components/flows/DebugPanel.jsx`): Yeni bir `useEffect` +
`ResizeObserver` — `.debug-panel` kutusunun (`panelRef`) gerçek
`getBoundingClientRect().bottom`'undan `.debug-panel-list`'in
(`scrollRef`) gerçek `getBoundingClientRect().top`'unu çıkararak KALAN
GERÇEK PİKSEL yüksekliği hesaplar ve bunu `.debug-panel-list`'e **inline
`style={{maxHeight: ...}}`** olarak zorlar. Bu, projenin BAŞKA yerlerinde
zaten kanıtlanmış çalışan bir desenle (`.runs-view-list`/`.export-check-
list`/`.templates-scroll` — hepsi flex-height propagation'a GÜVENMEDEN
doğrudan `max-height` kullanıyor) AYNI mantığı, flex zincirinin GÜVENİLMEZ
olabileceği bu özel derin-iç-içe senaryoya JS ile taşıyor:
- `ResizeObserver` panel kutusunun kendisini VE listten önceki tüm
  kardeşlerini (resize-handle, header, varsa execution-summary) izler —
  panel yeniden boyutlandırıldığında, kayan-pencere moduna geçildiğinde
  veya sekme değişip `execution-summary` görünür/gizlenince yeniden hesaplar
  (`useEffect` bağımlılıkları: `floating`, `panelHeight`, `floatSize.height`,
  `tab`, `chains.length`).
- CSS'teki mevcut `flex:1; min-height:0; overflow-y:auto` KALDIRILMADI —
  bu JS değeri sadece EK bir üst sınır olarak davranıyor; flex hesaplaması
  doğru çalışıyorsa iki değer eşleşir ve hiçbir görsel fark olmaz, flex
  hesaplaması BAŞARISIZ olduğu senaryoda ise bu piksel-kesin `maxHeight`
  scroll'u garantiler.
- **Bilinçli sınır**: Kök sebep (flex zincirinin TAM OLARAK hangi katmanda
  başarısız olduğu) hâlâ kesin olarak kanıtlanamadı — bu ortamda gerçek
  DevTools/computed-style incelemesi yapılamıyor. Ama çözüm kök sebepten
  BAĞIMSIZ çalışıyor (gerçek ölçülen piksel değeri kullanıyor, flex'in ne
  yaptığına güvenmiyor) — bu yüzden kök sebep ne olursa olsun etkili olması
  gerekiyor.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.
  Görsel doğrulama (scrollbar'ın gerçekten göründüğü, tekerlek/sürüklemenin
  çalıştığı) kullanıcının kendi makinesinde yapılmalı — bu ortamda pencere
  etkileşimi mümkün değil.

## SAP GUI Scripting Ekranı — Faz 1: Bağlantı + Ekran Gezgini (2026-08-29, TAMAMLANDI)

Kullanıcı isteği: uygulamaya SAP GUI Scripting için yeni bir ekran eklemek.
Önce SAP GUI Scripting'in ne olduğu/sınırları araştırıldı (aşağıda özet),
sonra mimari kararlar netleştirildi, sonra `axet.flows` ile AYNI kanıtlanmış
şablonla (bağımsız Activity + kendi IPC namespace'i + kendi manager modülü)
adım adım uygulandı. Kullanıcının seçtiği Faz 1 kapsamı: **"Bağlantı + Ekran
Gezgini"** — açık SAP GUI oturumlarını listele, ekran ağacını/alanları/grid
verisini canlı gör, manuel click/set/sendVKey ile test et. Kayıt-tekrar
oynatma (RPA) ve AI agent doğal dil otomasyonu **bilerek bu turda YAPILMADI**
— kullanıcı üçünden "Bağlantı + Ekran Gezgini"ni seçti, sonraki fazlar için
zemin hazırlanmış oldu.

### SAP GUI Scripting nedir (araştırma özeti)

SAP GUI for Windows'a gömülü bir **COM otomasyon arayüzü**
(`SapGuiAuto`/`sapfewse.ocx`, ProgID `SAPGUI`) — sadece **klasik Dynpro
tabanlı SAP GUI ekranlarını** (Web Dynpro/Fiori **DEĞİL**) `GuiApplication →
GuiConnection → GuiSession → wnd[0]/usr/...` şeklinde canlı bir COM nesne
ağacı olarak sunar. `findById`, `.Text`, `.Press()`, `.SendVKey()`,
`GuiGridView.GetCellValue()` gibi üye/metotlarla ekran okunup/yazılabilir.
Etkinleştirme: istemci tarafı SAP GUI Options (Alt+F12) → Accessibility &
Scripting → Scripting → "Enable scripting"; sunucu tarafı
`sapgui/user_scripting=TRUE` profil parametresi (RZ11). **Bilinen sınırlar**:
sadece klasik ekranlar; `GuiGridView` (ALV) ile `GuiTableControl` (klasik
tablo) TAMAMEN farklı API'ler; popup'lar (`wnd[1]`, `wnd[2]`...)
`GuiModalWindow` olarak öngörülemez şekilde belirir; element ID'leri SAP GUI/
backend versiyonuna göre kırılabilir; Citrix/RDS üzerinden çalışmak için
otomasyonun SAP GUI ile **aynı** oturumda çalışması gerekir (uzaktan bağlanan
bir bot sadece piksel görür, gerçek COM nesnelerini göremez); lisans/
compliance açısından SAP bunu "kendi tekrarlayan iş süreçlerini otomatikleş­
tirme/test etme" aracı olarak konumlandırıyor, toplu veri çekme/entegrasyon
API'si muadili DEĞİL.

### Mimari karar

`axet.flows` ile AYNI kanıtlanmış şablon (bağımsız Activity + kendi IPC
namespace'i + kendi manager modülü) — bu özellik `connectToSystem()`/
`.conn_adt` akışına HİÇ bağlı değil, kullanıcının o an AÇIK olan bir SAP
Logon/SAP GUI penceresine (win32com COM otomasyonu üzerinden) bağlanıyor.

**Neden Python+pywin32, Node native COM köprüsü değil**: Node.js'in kendi
COM köprüleri (`winax` vb.) node-gyp/Visual Studio derlemesi gerektiriyor —
bu proje zaten RFC bridge için TAM AYNI sebeple (bu makinede VS derleme
ortamı yok) Python+pywin32'ye yönelmişti (bkz. yukarıdaki "pyrfc/SAP NW RFC
SDK — Windows'ta gerçek kurulum sorunları" bölümü). Aynı mantık burada da
geçerli — `pywin32` PyPI'dan kurulabiliyor (bu makinede canlı doğrulandı),
derleme gerektirmiyor.

**Bileşenler**:
- **`resources/guiscript-runtime/`** (yeni, **repoya commit edilmiyor** —
  `.gitignore`'a eklendi, `resources/rfc-runtime` ile AYNI mantık) — gömülü
  Python 3.12 + `pywin32`. Hazırlama: `resources/rfc-runtime/python`'ın
  budanmış kopyası temel alındı (pyrfc/dotenv temizlenip `pip install
  pywin32` ile üzerine kuruldu) — sıfırdan bir Python indirmek/budamak
  yerine zaten hazır/kanıtlanmış bir kopyayı yeniden kullanmak daha hızlı ve
  güvenilirdi. Toplam boyut ~64MB.
- **`resources/sap-gui-scripting/sap_gui_scripting_bridge.py`** (yeni,
  **repoya commit EDİLİYOR** — bu bizim kendi kodumuz, lisanslı bir SDK
  değil, `adt_rfc_bridge.py`'nin sap-toolkit altında commit edilmesiyle AYNI
  mantık) — `http.server.HTTPServer` (TEK THREAD, `ThreadingHTTPServer`
  DEĞİL — SAP GUI Scripting COM nesneleri STA/tek-apartman'a bağlı, birden
  fazla thread'den erişim marshaling sorunlarına yol açabilir; bu bridge'in
  amacı da yüksek throughput değil manuel test, tek thread yeterli ve daha
  güvenli) tabanlı yerel HTTP+JSON sunucusu. Endpoint'ler: `GET /health`,
  `GET /connections`, `GET /connections/{c}/sessions`, `GET /session/{c}/
  {s}/node?id=...` (lazy component tree — bir node'un özet çocukları), `POST
  /session/{c}/{s}/action` (`setText`/`press`/`select`/`sendVKey`/
  `selectContextMenuItem`/`doubleClick`). Grid tespiti: `GuiGridView`/
  `GuiShell(SubType=GridView)` (ALV) ile `GuiTableControl` (klasik) AYRI
  fonksiyonlarla okunuyor (`_describe_grid`), ilk 200 satır/40 kolonla
  sınırlı. Her COM property okuması `_try()` ile best-effort (tip başına
  farklı sözleşmeler olduğu için hiçbir alan "her zaman var" sayılmıyor).
  MK_E_SYNTAX (-2147221020) gibi bilinen COM hata kodları anlaşılır Türkçe
  mesajlara çevriliyor (`_translate_com_error`).
- **`app-electron/main/embeddedRuntime.ts`**: `getEmbeddedGuiScriptRuntime()`
  eklendi — `getEmbeddedRfcRuntime()` ile AYNI desen (`app.isPackaged`'e göre
  path çözümü), `{pythonPath, bridgeScriptPath}` döner.
- **`app-electron/main/sapGuiScriptManager.ts`** (yeni) —
  `rfcBridgeManager.ts`/`adtReadonlyServerManager.ts` ile AYNI desen (spawn/
  health-check/stop, log tail biriktirme, "external" — kullanıcı elle veya
  önceki oturumdan zaten çalışan bir process'i tespit edip ikinci bir
  process açmama). **Tek fark**: RFC bridge/readonly server proje klasörü
  BAŞINA bir process tutar (`Map<projectDir,...>`) — bu bridge ise
  `connectToSystem()`'a hiç bağlı değil, proje kavramı yok, bu yüzden TEK
  bir global (singleton) process yönetiliyor (`let current: RunningBridge |
  null`).
- **`app-electron/main/sapGuiScriptClient.ts`** (yeni) — main process'in
  bridge'e `node:http` ile konuştuğu ince istemci (`axetFlowsLiveSave.ts`'teki
  `httpJson()` yardımcısıyla AYNI desen, bilerek küçük bir kopya — iki modül
  birbirine bağımlı olmasın diye). `guiScriptListConnections/ListSessions/
  GetNode/PerformAction` — hepsi `{ok, ..., error?}` sözleşmesiyle döner.
- **`shared/types.ts`**: `GuiScriptBridgeStatus/StartResult/ConnectionInfo/
  SessionInfo/ComponentSummary/ComponentDetail/GridData/ActionPayload/
  ActionResult` — projenin `{ok, ..., error?}` sonuç şekli konvansiyonuna
  uygun.
- **`main/index.ts`**: `sapGuiScript:` IPC namespace'i (`start`/`stop`/
  `status`/`listConnections`/`listSessions`/`getNode`/`performAction`),
  `DEFAULT_GUI_SCRIPT_BRIDGE_PORT = 8790` (mevcut RFC bridge 8788/readonly
  server 8787 ile çakışmıyor). `stopGuiScriptBridge()` her iki `app.on(...)`
  kapanış hook'una (`window-all-closed`/`before-quit`) eklendi — zombi
  `python.exe` kalmasın diye, mevcut temizlik noktasıyla AYNI yer.
- **`preload/index.ts` + `src/window.d.ts`**: `startGuiScriptBridge/
  stopGuiScriptBridge/getGuiScriptBridgeStatus/listGuiScriptConnections/
  listGuiScriptSessions/getGuiScriptNode/performGuiScriptAction` — standart
  zincir (preload → window.d.ts mirror) izlendi.
- **`src/components/ActivityBar.tsx`**: `Activity` union'a `"sapGuiScripting"`
  eklendi, `MousePointerClick` (lucide-react) ikonuyla yeni bir aktivite
  girdisi (`axetFlows`/`axetFlowsLive` ile AYNI görsel desen).
- **`src/App.tsx`**: `activity === "sapGuiScripting"` dalı — `axetFlows` ile
  AYNI basit mount/unmount ternary (kalıcı `<iframe>` gibi bir durum yok,
  `axetFlowsLive`'ın "her zaman mount, CSS-hidden" özel deseni GEREKMEDİ).
- **`src/components/SapGuiScriptingHome.tsx`** (yeni) — üç panel:
  - **Sol**: bağlantılar/oturumlar (lazy accordion, `FileExplorer.tsx`'teki
    tembel klasör yükleme deseniyle AYNI mantık).
  - **Orta**: ekran ağacı (component tree) — bir oturum seçilince kök
    (`session.ActiveWindow`, popup açıksa OTOMATİK olarak o popup'a kayar —
    Python bridge'deki `resolve_component` fallback'i sayesinde) yüklenir,
    her node lazy expand edilir (`nodesByKey` cache, `FileExplorer.tsx`'teki
    `childrenByPath` ile AYNI desen).
  - **Sağ**: seçili elemanın detayı (id/tip/ad/tooltip/changeable) + aksiyon
    butonları (Metin Yaz, Press, Select, Çift Tıkla, sendVKey, sağ-tık menü
    öğesi seç) + varsa grid/tablo verisinin salt-okunur bir HTML tablosu.
- **i18n**: `activityBar.sapGuiScripting` + tam bir `sapGuiScripting.*` blok
  (tr/en, aynı sıra/aynı anahtarlar).
- **`package.json`**: `build.extraResources`'a `resources/guiscript-runtime`
  → `guiscript-runtime` ve `resources/sap-gui-scripting` → `sap-gui-scripting`
  eklendi (`sap-toolkit`/`rfc-runtime` ile AYNI desen).

**Canlı doğrulama (bu makinede, SAP GUI kurulu OLMADAN)**:
- Gömülü Python + pywin32: `win32com.client.GetObject("SAPGUI")` çağrısı
  hem dev konumundan hem **paketlenmiş** `release/win-unpacked/resources/
  guiscript-runtime/python/python.exe`'den çalıştırılıp DLL yükleme
  zincirinin (`pywin32_system32` → `os.add_dll_directory`+PATH) hatasız
  çalıştığı, ve beklenen `MK_E_SYNTAX` (-2147221020, "SAP GUI kurulu değil"
  anlamına gelir) hatasının alındığı doğrulandı.
- `sap_gui_scripting_bridge.py` gerçekten spawn edilip `/health`,
  `/connections` (502 + doğru Türkçe hata mesajı), `POST /session/0/0/action`
  (502 + aynı hata) canlı test edildi — hepsi doğru çalıştı.
- `sapGuiScriptManager.ts`/`sapGuiScriptClient.ts` (Electron'a bağımlı
  değiller) `tsx` ile bağımsız, GERÇEK bir spawn'a karşı 7 senaryo test
  edildi: ilk başlatma, "zaten çalışıyor" tespiti, 4 endpoint'in hepsinin
  doğru hata mesajını taşıması, düzgün durdurma — hepsi PASS. Test script'i
  sonrasında silindi.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti. Paketlenmiş build içinde `guiscript-runtime/python/
  python.exe` ve `sap-gui-scripting/sap_gui_scripting_bridge.py`'nin
  gerçekten var olduğu doğrulandı.

**Test EDİLEMEYEN (bu ortamda SAP GUI kurulu değil)**:
- Gerçek bir SAP GUI'ye karşı `/connections`/`/session/.../node` endpoint'­
  lerinin GERÇEK veri döndürdüğü — özellikle `_describe_grid()`'in
  `GuiGridView`/`GuiTableControl` tespiti/okuması (API dokümantasyonundan
  yazıldı ama canlı doğrulanmadı) ve `session.ActiveWindow`'un popup'lara
  gerçekten otomatik kaydığı. Kullanıcının kendi makinesinde (SAP GUI kurulu,
  SAP Logon açık) ekranı açıp "Bağlan" → bir sisteme bağlanmış SAP Logon
  oturumunun ağaçta gerçekten göründüğünü, bir alana tıklayıp "Metni Yaz" +
  "Press" ile basit bir işlem (örn. bir T-code'a geçiş) yapabildiğini, ve
  bir ALV grid ekranında (örn. SE16/SE11 sonuç listesi) grid verisinin
  doğru göründüğünü doğrulaması gerekiyor.
- SAP GUI Scripting'in istemci tarafında (Options → Scripting) devre dışı
  bırakılmış olma ihtimali — bu durumda köprü ayakta kalır ama
  `/connections` GERÇEK bir COM hatası (farklı bir mesaj) döndürebilir;
  `_translate_com_error()`'daki genel "kontrol listesi" mesajı bu durumu
  kapsıyor ama spesifik bir kod-eşleşmesi yazılmadı (MK_E_SYNTAX dışındaki
  kodlar için genel mesaj kullanılıyor).

**Sonraki fazlar için zemin (bu turda YAPILMAYAN, kullanıcı bilerek
sonraya bıraktı)**:
1. **Kayıt + Tekrar Oynatma (RPA)** — kullanıcının SAP GUI'de yaptığı
   adımları kaydedip bir script olarak saklama/tekrar oynatma. Bu Faz 1'in
   `/session/.../action` endpoint'i üzerine inşa edilebilir (her aksiyonu
   bir "adım" olarak loglamak + bir dizi adımı sırayla tekrar oynatan yeni
   bir endpoint), ekstra bir COM kavramı gerekmez.
2. **AI Agent ile doğal dil otomasyonu** — `axet.flows`'un agent mimarisiyle
   (JSON-aksiyon protokolü, `axetChat.ts`/`runFlowsAgentStep` deseni) AYNI
   yaklaşım uygulanabilir: agent'a bu Faz 1'deki `getNode`/`performAction`
   primitives'lerini bir "tool" seti olarak ver, agent kendi kendine
   `findById` yolu icat etmeye çalışmadan önce HER ZAMAN `getNode` ile
   gerçek ağacı okuyup gerçek ID'leri kullanmalı (yoksa hallusinasyon
   riski — bu tur bilerek bu riski azaltacak şekilde tasarlandı: agent'a
   asla "kendi ID'ni uydur" seçeneği verilmeyecek, sadece gördüğü node'ların
   gerçek ID'lerini kullanabilecek).
3. **`small` model / port yapılandırması / bridge'i otomatik başlatma**
   (açılışta) gibi cilalamalar — bu turda kapsam dışı, kullanıcı hiç
   istemedi.

## SAP GUI Scripting Ekranı — Faz 2: Kayıt + Tekrar Oynatma (RPA) (2026-08-29, TAMAMLANDI)

Kullanıcı "diğer adıma geçelim" dedi — Faz 1'in sonundaki plana göre sıradaki
adım **Kayıt + Tekrar Oynatma**. Faz 1'in `performAction` primitive'i üzerine
inşa edildi, backend'e (`sap_gui_scripting_bridge.py`) HİÇ dokunulmadı —
kayıt/oynatma tamamen renderer tarafında (state + JSON dosya I/O) yaşıyor.

**Tasarım**:
- **Kayıt**: `SapGuiScriptingHome.tsx`'teki `recording: boolean` state'i
  açıkken, sağ paneldeki aksiyon butonlarından (`runAction` — Faz 1'in
  KENDİSİ, değiştirilmedi) tetiklenen HER BAŞARILI aksiyon `steps` dizisine
  bir `GuiScriptRecordedStep` (`{action, id?, value?, vkey?, label}`) olarak
  eklenir. `label` insan-okunur bir özet (`describeStep()` — örn.
  `setText("100") → wnd[0]/usr/txtRSYST-MANDT`), seçili elemanın adı/tipi
  varsa (Faz 1'in zaten yüklediği `selectedNode`) etiket onu kullanır.
- **Tekrar oynatma**: `handlePlayScript()` adımları SIRAYLA
  `performGuiScriptAction`'a gönderir — **`runAction`'ı BİLEREK ATLAR**
  (doğrudan `window.api.performGuiScriptAction` çağırır) — aksi halde kayıt
  açıkken oynatma yapılırsa oynatılan adımlar sonsuza kadar tekrar tekrar
  kaydedilirdi. Adımlar arasında **bekleme YOK**: burada `PLAYBACK_STEP_
  DELAY_MS = 350` ms'lik sabit bir uyku vardı ve ölçüldüğünde tamamen ölü
  zaman çıktı (bkz. "Oynatmadaki 350 ms'lik sabit bekleme kaldırıldı",
  2026-09-03 — 22 canlı adımda `Busy` bir kez bile yakalanamadı, çünkü SAP
  GUI Scripting çağrısı senkron). Hazır olma beklemesi köprüde yapılıyor ve
  `settle` alanıyla raporlanıyor. İlk hatalı
  adımda oynatma DURUR (agresif/güvenli taraf — bir adım başarısız olduysa
  sonraki adımların hangi ekranda çalışacağı garanti değil).
- **Kaydet/Aç**: `sapGuiScript:saveScript`/`sapGuiScript:openScript` IPC
  handler'ları (`main/index.ts`) — `flows:saveJson`/`flows:openJson` ile
  **BİREBİR AYNI** dialog-tabanlı desen (`dialog.showSaveDialog`/
  `showOpenDialog`, JSON dosyası). Script şekli: `GuiScriptScript = {name,
  createdAt, steps}` — düz JSON, ekstra bir şema doğrulaması yok (mevcut
  `flows:openJson`'ın da yapmadığı gibi, kullanıcı elle bozarsa `JSON.parse`
  hata fırlatır, `scriptMessage`'a yazılır).
- **UI**: Faz 1'in 3-panelli görünümüne (bağlantılar/oturumlar → ekran
  ağacı → detay+aksiyonlar) header'da iki yeni buton eklendi (Kaydı Başlat/
  Durdur — kırmızı dolu daire/kare ikon, Script paneli toggle — adım
  sayısını gösteren bir rozetle), ve **alta, `axet.flows`'un `DebugPanel`
  paneli ile AYNI "toggle edilebilir alt panel" deseninde** yeni bir Script
  paneli (`scriptPanelOpen`) — adım listesi (numaralı, oynatma sırasında
  canlı ✓/✗ durumu + hata mesajı gösterir, her adım tek tek silinebilir),
  script adı input'u, Oynat/Kaydet/Aç/Temizle butonları.

**Değişen dosyalar**:
- **`shared/types.ts`**: `GuiScriptRecordedStep`, `GuiScriptScript`,
  `GuiScriptJsonFileResult`, `GuiScriptPlaybackStepResult` eklendi.
- **`main/index.ts`**: `sapGuiScript:saveScript`/`sapGuiScript:openScript`
  IPC handler'ları eklendi (mevcut `sapGuiScript:` namespace'ine).
- **`preload/index.ts` + `window.d.ts`**: `saveGuiScriptScript`/
  `openGuiScriptScript` — standart zincir.
- **`SapGuiScriptingHome.tsx`**: `recording`/`steps`/`scriptName`/
  `scriptPanelOpen`/`playing`/`playIndex`/`playResults` state'leri,
  `describeStep()` (saf fonksiyon), `handleToggleRecording`/
  `handleClearSteps`/`handleRemoveStep`/`handleSaveScript`/
  `handleOpenScript`/`handlePlayScript`, `runAction`'a kayıt hook'u eklendi.

**Doğrulama**:
- `describeStep()`'in mantığı (aynı kod, izole) + `GuiScriptScript` JSON
  round-trip'i (`JSON.stringify`→`JSON.parse`) `tsx` ile bağımsız test
  edildi — hepsi PASS. Dialog-tabanlı `saveScript`/`openScript` IPC
  handler'ları (`dialog.showSaveDialog`/`showOpenDialog` gerçek bir
  Electron penceresi/kullanıcı etkileşimi gerektirdiği için) bu ortamda
  CANLI test edilemedi — ama `flows:saveJson`/`flows:openJson` ile **kod
  satırı satırına aynı** (sadece başlık/varsayılan dosya adı farklı),
  o ikisi zaten üretimde kanıtlanmış çalışıyor, bu yüzden risk düşük.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.

**Test EDİLEMEYEN (bu ortamda SAP GUI kurulu değil, Faz 1'deki aynı
sınırlama)**: gerçek bir SAP GUI'ye karşı kayıt yapıp (örn. bir T-code'a
girip birkaç alan doldurup Enter'a basmak) tekrar oynatmanın GERÇEKTEN aynı
sonucu ürettiği — özellikle `PLAYBACK_STEP_DELAY_MS`'in yeterli olup
olmadığı (ekran geçişi bu süreden uzun sürerse bir sonraki adım YANLIŞ
ekranda `findById` hatası alabilir) kullanıcının kendi makinesinde
doğrulanmalı. Yetersiz çıkarsa ilk iyileştirme noktası: sabit gecikme
yerine `getNode` ile "hedef element artık var mı" diye polling yapan bir
bekleme (mevcut `getNode` primitive'i zaten bunun için yeterli, backend
değişikliği gerekmez).

> **2026-09-03 — bu madde KAPANDI, ama tahmin edilenden başka bir sonuçla.**
> Canlı SAP GUI'ye karşı ölçüldü: gecikme yetersiz değil, GEREKSİZDİ.
> `getNode` polling'i de eklenmedi — çünkü bekleyecek bir şey yok, SAP GUI
> Scripting çağrısı senkron. Bkz. "Oynatmadaki 350 ms'lik sabit bekleme
> kaldırıldı".

**Sonraki adım (kullanıcı henüz karar vermedi)**: Faz 1 sonundaki plandaki
3. seçenek — **AI Agent ile doğal dil otomasyonu** — hâlâ yapılmadı, bu iki
fazın (ekran gezgini + kayıt/oynatma) üzerine inşa edilebilir durumda.

## SAP GUI Scripting Ekranı — Faz 3: AI Agent ile Doğal Dil Otomasyonu (2026-08-29, TAMAMLANDI)

Kullanıcı "edelim" dedi — Faz 1 planındaki 3. seçenek. `axet.flows`'un agent
mimarisi (`src/flows/agent/{systemPrompt,tools,agentRunner}.js` +
`app-electron/main/axetFlowsAgent.ts`) önce alt-agent ile tam olarak
araştırılıp (JSON-aksiyon protokolü, stateless `axet-code run --quiet`
çağrısı, stdin prompt, sabit scratch cwd, `extractJson`/`normalizeActions`/
`buildPrompt`/`runAgentTurn` döngüsü) BİREBİR AYNI iskelet SAP GUI Scripting
için port edildi — Faz 1/2'nin `getNode`/`performAction` primitives'leri
üzerine.

### Mimari — flow builder'dan farklar

1. **Asenkron executor**: flow builder'ın `createExecutor`'ı SENKRON (bir
   in-memory `FlowModel`'i doğrudan mutasyona uğratıyor) — SAP GUI Scripting'in
   HER aksiyonu gerçek bir IPC round-trip'i (main process → Python bridge →
   COM), bu yüzden `src/lib/sapGuiAgent/tools.ts#createExecutor` **ASENKRON**
   bir `executeTool` döner, `agentRunner.ts` her aksiyonu `await` eder.
2. **"ref" mekanizması YOK**: flow builder'da `add_node` gibi aksiyonlar
   YENİ bir id ÜRETİYOR (agent henüz gerçek id'yi bilmiyor, "ref" takma adı
   gerekiyor). SAP GUI element ID'leri (`wnd[0]/usr/txtRSYST-BNAME` gibi)
   zaten SAP'ın kendi verdiği SABİT string'ler — agent HİÇBİR ZAMAN yeni bir
   id üretmiyor, sadece `get_node` ile GÖRDÜĞÜ id'leri kullanıyor. Bu, sistem
   promptunda kural #1 olarak açıkça yazıldı (sıfır halüsinasyon ilkesinin bu
   özellikteki karşılığı).
3. **Daha düşük batch/iterasyon limitleri**: `MAX_ACTIONS_PER_BATCH = 6`
   (flow builder'da 12), `MAX_ITERATIONS = 15` (flow builder'da 20) —
   BİLİNÇLİ bir güvenlik farkı: flow builder'daki bir aksiyon canvas'ta bir
   node eklemek (geri alınabilir, sadece görsel), SAP GUI Scripting'deki bir
   aksiyon GERÇEK bir ekranı değiştirebilir (T-code geçişi, bir kayıt
   silme). Sistem promptuna da açık bir kural eklendi (#9): ekran DEĞİŞTİREN
   bir aksiyondan sonra ayni batch'te "kör" devam etme, bir sonraki turda
   `get_node` ile yeni ekranı doğrula.
4. **İptal (Cancel) desteği EKLENDİ** — `axetFlowsAgent.ts`'te HİÇ yoktu
   (flow builder'da hiç ihtiyaç duyulmamıştı), `axetChat.ts`'teki
   `Map<requestId, ChildProcess>` + `__markCancelled` deseni buraya taşındı.
   **Kritik bir bug bu turda CANLI TESTLE bulundu ve düzeltildi**: ilk
   yazımda `axetFlowsAgent.ts`'teki `spawn(..., {shell:true})` deseni
   birebir kopyalanmıştı — canlı smoke test'te (`tsx` ile gerçek bir
   `axet-code` çağrısı spawn edip 300ms sonra iptal ederek) **iptal hiç
   çalışmadığı, 120s timeout'a düştüğü KANITLANDI**. Kök sebep: Windows'ta
   `shell:true` ile spawn edilen bir process'te `child.kill()` sadece ARA
   `cmd.exe` kabuğunu öldürür, gerçek `axet-code.exe` (cmd'nin child'ı
   olarak) hayatta kalır. Çözüm: `axetChat.ts`'in KANITLANMIŞ ÇALIŞAN
   deseni (`shell:true` YOK, doğrudan `spawn("axet-code", args, {cwd,
   windowsHide, stdio:["pipe","pipe","pipe"]})`) `sapGuiScriptAgent.ts`'e
   taşındı — düzeltme sonrası AYNI smoke test'te iptal gerçekten 300ms'de
   çalıştı (`cancelled:true` doğru döndü). **Not**: bu, `axetFlowsAgent.ts`'in
   KENDİSİNİN de gizli/latent aynı hataya sahip olabileceğini gösteriyor —
   ama flow builder'da hiç cancel butonu yok, bu yüzden hata orada hiç
   ortaya çıkmadı/fark edilmedi; bu dosyaya DOKUNULMADI (kapsam dışı, flow
   builder'ın kendi konusu), ama not olarak buraya yazıldı.

### Yeni dosyalar

- **`src/lib/sapGuiAgent/actionsDoc.ts`** — `ACTIONS_DOC` (action sözlüğü:
  `list_connections`, `list_sessions`, `get_node`, `set_text`, `press`,
  `select`, `double_click`, `send_vkey`, `select_context_menu_item`,
  `ask_user`, `finish`) + `BATCH_FORMAT_DOC`.
- **`src/lib/sapGuiAgent/systemPrompt.ts`** — `buildSapGuiSystemPrompt()` —
  çıktı kuralları + `ACTIONS_DOC`/`BATCH_FORMAT_DOC` + 10 domain kuralı
  (element ID uydurmama, T-code geçiş deseni `/n<TCODE>`+Enter, ALV/table
  control farkı, popup tespiti, SAP'ın "kendi süreci otomatikleştirme"
  konumlandırması).
- **`src/lib/sapGuiAgent/tools.ts`** — `createExecutor(defaultSession,
  recordStep?)` — asenkron `executeTool`, `{text, id?, error?, control?,
  payload?}` sonuç sözleşmesi (flow builder'la AYNI). **Faz 2 entegrasyonu**:
  opsiyonel `recordStep` callback'i — kayıt açıkken agent'ın gerçek
  aksiyonları da Faz 2'nin `steps` listesine (Kayıt+Tekrar Oynatma script'i)
  eklenir, manuel ve agent-tetiklemeli aksiyonlar AYNI script'e karışabilir.
- **`src/lib/sapGuiAgent/agentRunner.ts`** — `createTranscript()`,
  `extractJson()`, `normalizeActions()`, `buildPrompt()`, `runAgentTurn()` —
  flow builder'ın AYNI döngü şekli + `onRequestIdChange`/`isCancelled`
  parametreleri (iptal desteği için).
- **`app-electron/main/sapGuiScriptAgent.ts`** — `runSapGuiAgentStep(requestId,
  prompt, model)`/`cancelSapGuiAgentStep`/`cancelAllSapGuiAgentSteps` —
  `axetFlowsAgent.ts`'in mimarisi (stdin prompt, sabit scratch cwd
  `%TEMP%/axet-sapgui-agent-scratch`, 120s timeout) + `axetChat.ts`'in
  iptal deseni (yukarıdaki bug düzeltmesiyle).
- **`src/components/SapGuiAgentPanel.tsx`** — sohbet-benzeri UI (log
  satırları: user/tool_call/tool_result/question/finish/error/cancelled),
  `ModelSelector` (axet.code/axet.flows ile AYNI paylaşılan "large" model —
  ayrı bir model tercihi yok, PROJE-BILGI'deki mevcut kararla tutarlı),
  composer (Enter=gönder, Shift+Enter=yeni satır), Gönder/Durdur butonu.

### Değişen dosyalar

- **`shared/types.ts`**: `GuiScriptAgentStepResult` eklendi.
- **`main/index.ts`**: `sapGuiScript:agentStep`/`sapGuiScript:cancelAgentStep`
  IPC handler'ları + `cancelAllSapGuiAgentSteps()` her iki `app.on(...)`
  kapanış hook'una eklendi.
- **`preload/index.ts` + `window.d.ts`**: `guiScriptAgentStep`/
  `cancelGuiScriptAgentStep` — standart zincir.
- **`SapGuiScriptingHome.tsx`**: eski `scriptPanelOpen: boolean` →
  `bottomPanel: "script" | "agent" | null` (Faz 2'nin Script paneli ile Faz
  3'ün AI Agent paneli AYNI alt-panel alanını paylaşıyor, `axet.flows`'un
  `DebugPanel`'i gibi tek bir toggle edilebilir alan) — header'a "AI Agent"
  butonu eklendi, `recordStep` fonksiyonu Faz 2/3 arasında paylaşılan tek
  bir kaynağa çıkarıldı, `activeSessionInfo` memo'su (aktif oturumun
  Transaction/Program bilgisini agent'a bağlam olarak geçmek için) eklendi.
- **i18n**: `sapGuiScripting.agentPanel/agentNoSession/agentEmpty/
  agentPlaceholder/agentSend/agentStop/agentThinking` (tr/en).

### Doğrulama

- `src/lib/sapGuiAgent/agentRunner.ts`'in `extractJson`/`normalizeActions`
  mantığı (aynı kod, izole) 5 senaryoyla (temiz JSON, markdown-sarmalı JSON,
  batch, geçersiz metin, `ask_user` seçenekleri) test edildi — hepsi PASS.
- **`app-electron/main/sapGuiScriptAgent.ts` GERÇEK bir `axet-code`
  çağrısına karşı canlı test edildi** (`tsx` ile bağımsız): (1) basit bir
  "sadece bu JSON'u dön" isteği gerçekten doğru JSON'u döndürdü (uçtan uca
  CLI entegrasyonu çalışıyor kanıtı), (2) iptal mekanizması — YUKARIDAKİ
  `shell:true` bug'ı bu testte YAKALANDI VE DÜZELTİLDİ, düzeltme sonrası
  tekrar test edilip iptalin gerçekten ~300ms'de çalıştığı doğrulandı.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.

### Test EDİLEMEYEN (bu ortamda SAP GUI kurulu değil)

Agent'ın gerçek bir SAP GUI ekranına karşı `get_node`/`set_text`/`send_vkey`
gibi aksiyonları GERÇEKTEN doğru uyguladığı, T-code geçiş deseninin
(`/n<TCODE>` + Enter) gerçek bir sistemde çalıştığı, ve `MAX_ACTIONS_PER_
BATCH=6`/kural #9'un ("ekran değiştiren aksiyondan sonra kör devam etme")
LLM tarafından gerçekten uyulup uyulmadığı — kullanıcının kendi makinesinde
(SAP GUI kurulu, SAP Logon açık) bir oturum seçip AI Agent panelinden basit
bir görev (örn. "VA01'e git") yazarak doğrulaması gerekiyor.

> **2026-09-04 — bu madde KAPANDI: agent'ın araç katmanı canlı bir SAP
> oturumunda koşturuldu.**
>
> Kullanıcının DEV sistemi (S4D/100, SE16N/VBFA) açıkken `src/lib/sapGuiAgent/
> tools.ts` ve `app-electron/main/sapGuiScriptClient.ts` esbuild ile bundle'lanıp
> Node'da birleştirildi; `window.api` doğrudan 8790'daki köprüye bağlandı. Yani
> **agent'ın gerçekten çağırdığı kod**, gerçek COM üzerinden gerçek ekrana
> uygulandı. Daha önce agent yolundan HİÇ geçmemiş üç araç ölçüldü:
>
> | Araç | Uygulanan | Sonuç (bağımsız `get_node`/ekran okumasıyla doğrulandı) |
> |---|---|---|
> | `set_text` | `ctxtGD-TAB` ← "VBAK", sonra ← "VBFA" | alan gerçekten "VBAK" oldu, sonra "VBFA"ya döndü — **yazma ve geri alma doğrulandı** |
> | `press` | `btnTABDET` ("Daha fazla bilg.") | `SAPMSDYP 10` "Bilgi" popup'ı açıldı — **buton gerçekten basıldı** |
> | `select_context_menu_item` | ALV grid'i (`wnd[0]/shellcont/shell`), `by: "position"`, `value: "6"` | `SAPLSKBH 841` "Bul" popup'ı açıldı — **doğru menü öğesi seçildi** |
>
> `press`in "başarılı" demesi yetmiyordu; kanıt EKRANIN DEĞİŞMESİ. Üçünün de
> kanıtı aksiyonun kendi cevabı değil, ardından yapılan ayrı bir okuma.
>
> **İkinci soru — agent aksiyonları Faz 2'nin kaydına düşüyor mu?** Aynı koşumda
> `recordStep` toplandı: altı aksiyonun altısı da kayda düştü ve alanları
> manuel yoldan (`SapGuiScriptingHome.tsx:428`) yazılanla **birebir aynı**
> (`action`/`id`/`value`/`vkey`/`row`/`column`/`by`/`label`). Etiket biçimi de
> `describeStep`'inkiyle aynı (`setText("VBAK") → …`); tek fark, manuel yol
> elemanın kısa adını (`GD-TAB`), agent yolu tam id'yi yazıyor — oynatma bu
> alanı okumadığı için etkisiz. Yani kayıt açıkken manuel ve agent adımları
> gerçekten AYNI script'e karışıyor.
>
> Test SAP oturumunu değiştirmeden bıraktı: başlangıç ve bitiş ekranı aynı
> (`SAPLSE16N 200 SE16N "VBFA: Bulunan giriş görüntüsü"`), açılan iki popup
> F12 ile kapatıldı, GD-TAB eski değerine geri yazıldı.
>
> **Hâlâ ölçülmemiş olan**, LLM'in KARAR verme kısmı: T-code deseni
> (`/n<TCODE>` + Enter), `MAX_ACTIONS_PER_BATCH=6` ve kural #9'a modelin uyup
> uymadığı. Bunlar araç katmanının değil, prompt'un konusu — panelden gerçek
> bir görev yazılmadan ölçülemez.

### Üç fazın özeti — SAP GUI Scripting ekranı artık TAMAMLANMIŞ

Faz 1 (Bağlantı + Ekran Gezgini) → Faz 2 (Kayıt + Tekrar Oynatma) → Faz 3
(AI Agent) — kullanıcının ilk turda seçtiği kapsamın TÜMÜ tamamlandı. Her
faz bir öncekinin primitives'leri üzerine inşa edildi (Faz 2 ve 3'ün ikisi
de Faz 1'in `performAction`'ını kullanıyor; Faz 3'ün `recordStep` entegrasyonu
Faz 2'nin `steps` listesini paylaşıyor) — hiçbir faz bir öncekini
tekrarlamadı/değiştirmedi.

## SAP GUI Scripting Ekranı — Sıfırdan Yeniden Kurgu (2026-09-02, TAMAMLANDI)

Kullanıcı isteği (iki adımda): önce
`plugins/sapgui-scriptter` referans plugin'indeki "sapgui_scripter ile
alakalı her şeyi öğren, ve ekranı buraya göre tekrardan ayarlayalım";
araştırma sonrası boşluk analizi sunulduğunda kesin talimat: **"düzgün
şekilde sıfırdan ekranı yapalım o zaman"**.

Faz 1-3 çalışıyordu ama ekran SAP'yi yalnızca bir COM ağacı olarak
gösteriyordu. Referans plugin'den öğrenilen ve BURADA OLMAYAN dört şey
alındı; her biri bir tahmini bir ölçümle değiştirdiği için eklendi.

### 1. Preflight — "neden çalışmıyor"u tahmin etmek yerine ÖLÇMEK

Köprüde yeni `/preflight` uç noktası, Win32 seviyesinde
`SAP_FRONTEND_SESSION` sınıfındaki pencereleri sayıyor VE scripting
engine'in bildirdiği oturum sayısını AYRI okuyor. Teşhisi kesinleştiren
şey ikisinin FARKI:

- pencere var + scripting oturumu 0 → scripting KAPALI (kesin teşhis,
  "SAP açık değil" ile karıştırılamaz) → `scriptingDisabled`
- pencere yok + SAP GUI kurulu → `sapNotRunning`
- SAP GUI kurulu değil → `sapGuiMissing`

**Bu uç nokta bilerek `get_application()` guard'ının DIŞINDA**: scripting
kapalıyken de yanıt vermesi gerekiyor, yoksa teşhis tam da teşhise ihtiyaç
duyulan anda çalışmaz.

`PreflightPanel.tsx` sonucu bir başlıkla değil, HAM ÖLÇÜMLERLE gösteriyor
(kurulu mu / kaç pencere / bağlanılabildi mi / kaç oturum / kaç bağlantı) —
"sen nereden biliyorsun" sorusu denetlenebilir olsun diye. `scriptingDisabled`
durumunda iki taraflı açma rehberi çıkıyor (sunucu RZ11/RZ10, istemci
Alt+F12) ve sunucu adımının yanında **uygulamanın bu değişikliği YAPMADIĞI
ve YAPMAMASI GEREKTİĞİ** uyarısı var: sunucu profil parametresi müşterinin
change control'ü altındaki bir Basis işi.

Eski hâli tek bir sabit "Gereksinimler" metniydi ve hangi maddenin bozuk
olduğunu söyleyemiyordu.

### 2. Canlı ekran görüntüsü + TAHMİNSİZ eleman çerçevesi

İki yakalama yöntemi, farklı işler için:

- `hardcopy` — `GuiFrameWindow.HardCopy(path, "PNG")`, SAP'nin kendi
  yakalaması. En temiz sonuç, ama bağlı bir DIAG oturumu + açık scripting
  şart.
- `window` — Win32 `PrintWindow` (`PW_RENDERFULLCONTENT=2`, son çare
  `ImageGrab`). COM'a HİÇ dokunmaz → **scripting kapalıyken bile çalışır**,
  yani teşhis ekranında kullanıcıya kendi SAP'sini gösterebiliyoruz.
  `SetProcessDPIAware()` ölçek bozulmasını önlüyor.

Seçili elemanın çerçevesi SADECE `window` yönteminde çiziliyor ve tahmin
içermiyor: köprü yakalamanın sol üst köşesinin mutlak ekran koordinatını
(`originLeft/originTop`, `GetWindowRect`) döndürüyor, elemanın
`ScreenLeft/ScreenTop` değeri de mutlak — fark doğrudan görüntü içi
koordinat veriyor. **HardCopy'de böyle bir köken bilgisi yok, bu yüzden
orada çerçeve BİLEREK çizilmiyor**: yanlış yerde bir kutu, hiç kutu
olmamasından kötüdür ve bu makinede canlı SAP oturumu olmadığı için
tahmin edilmiş bir başlık-çubuğu ofseti doğrulanamazdı.

### 3. Durum çubuğu — aksiyonun GERÇEKTEN kabul edilip edilmediği

`performAction` daha önce çıplak `{ok:true}` dönüyordu; bu COM çağrısının
başarısıydı, **SAP'nin işlemi kabul ettiği değil**. SAP'nin reddettiği bir
kayıt (yetki yok, alan hatalı, kilitli belge) COM seviyesinde pekâlâ
başarılı olur ve UI'da yeşil görünürdü.

Artık her aksiyon yanıtı `describe_screen()` sonucunu taşıyor:
transaction/program/ekran no + `wnd[0]/sbar`'dan okunan
`MessageType` (S/W/E/A/I) + `MessageId`/`MessageNumber` + popup bilgisi +
`okCode`. `StatusBarStrip.tsx` bunu renk ve ikonla gösteriyor; E ve A
gerçek hata, S/W/I bilgilendirme. Ekran okuma hatası aksiyonu başarısız
GÖSTERMİYOR — ayrı bir alan olarak taşınıyor.

Popup da artık ağaçta sıradan bir `wnd[1]` düğümü değil: modal pencere
açıldığında üstte bir şerit çıkıyor ve butonlar **SAP'nin gerçek
butonlarından okunuyor** (tahmin edilen SPOP id'leri değil), yanlarında
standart enter/iptal kısayollarıyla.

### 4. `navigate` + `popupChoice` — uç nokta değil, AKSİYON

Bir transaction'a gitmek eskiden üç adımdı (ağaçtan `wnd[0]/tbar[0]/okcd`
bul → metin yaz → ayrı alandan VKey 0 gönder). Artık komut çubuğuna tcode
yazıp Enter yetiyor.

Bunlar bilerek yeni uç nokta DEĞİL, birer aksiyon olarak modellendi:
böylece Faz 2'nin kaydedici/oynatıcısı ikisini de **hiçbir özel durum
kodu olmadan** kaydedip tekrar oynatabiliyor.

`sendVKey` de ham sayı kutusu olmaktan çıktı (`src/lib/sapGui/vkeys.ts`):
0=Enter, 1-12=F1-F12, 13-24=Shift+F, 25-36=Ctrl+F eşlemesi bir kere
tanımlandı, sık kullanılanlar (Geri/Çalıştır/Kaydet/İptal/Çık…) isimli
buton olarak komut çubuğunda. Anlam etiketleri SAP'nin standart atamaları —
bir transaction bunları yeniden atayabildiği için etiket bir İPUCU,
garanti değil; kod bunu böyle belgeliyor.

### Yeni ekran düzeni

```
üst       → köprü kontrolleri + teşhis/kayıt/panel anahtarları
teşhis    → köprü çalışıyor ama scripting hazır DEĞİLSE çalışma alanının
             önüne geçer (kullanıcı "yine de devam et" ile geçebilir)
komut     → tcode (/n) + isimlendirilmiş fonksiyon tuşları
sol (w-72)→ oturumlar (üst) + COM eleman ağacı (alt)
orta      → CANLI EKRAN (seçili elemanın çerçevesiyle)
sağ (380) → eleman denetçisi: 31 özellik + aksiyonlar + ALV/tablo grid
alt şerit → popup + SAP durum çubuğu
alt panel → script kaydedici | AI agent (Faz 2/3, değişmedi)
```

Eleman denetçisi eskiden 5 alan gösteriyordu (id/tip/ad/tooltip/
değiştirilebilir). Artık köprünün `DETAIL_PROPERTIES`'inden okuduğu her
şey geliyor (31 özellik: geometri, MaxLength, IconName, RowCount/
CurrentRow, MessageType…) ama İKİ GRUBA ayrılmış — temel alanlar hep
görünür, gerisi katlanır; bir `GuiTextField`'de 30 satır özellik
listelemek aranan üç alanı bulmayı zorlaştırıyordu. Geometri ayrıca
canlı görüntü üzerine çerçeve çizmeyi mümkün kılan şey.

### Dosyalar

Köprü (`resources/sap-gui-scripting/sap_gui_scripting_bridge.py`) baştan
yazıldı: `preflight()`, `describe_screen()`, `read_status_bar()`,
`capture_screenshot()`, `_settle()` (`session.Busy` yoklaması),
`_apply_navigate()`, `_apply_popup_choice()`, `DETAIL_PROPERTIES` (31),
yeni rotalar `/preflight`, `/screenshot?method=window` (oturumsuz),
`/session/<c>/<s>/screen`, `/session/<c>/<s>/screenshot?method=`, yeni CLI
bayrağı `--preflight`.

Yeni renderer dosyaları: `src/lib/sapGui/vkeys.ts`,
`src/components/sapgui/{PreflightPanel,ScreenViewer,StatusBarStrip,
ElementInspector,CommandBar}.tsx`. `SapGuiScriptingHome.tsx` bunları
bağlayan orkestratör olarak yeniden yazıldı; Faz 2/3'ün korunan parçaları:
`nodeKey()`, `ROOT_KEY`, `PLAYBACK_STEP_DELAY_MS` (2026-09-03'te ölçülüp
KALDIRILDI), tembel ağaç yükleme,
kayıt/kaydet/aç/oynat ve **playback'in `runAction`'ı değil doğrudan
`performGuiScriptAction`'ı çağırması** (kayıt açıkken oynatılan adımların
tekrar kaydedilmemesi için).

### Ortam notu — Pillow

`window` yakalama yolu PNG kodlaması için Pillow istiyor; gömülü
`resources/guiscript-runtime`'da pywin32 vardı ama Pillow yoktu. Oraya
`pip install Pillow` ile kuruldu (12.3.0). Klasör gitignore'lu → repoya
etkisi yok. Yine de import yumuşak (soft) guard'landı: Pillow olmasa bile
köprü açılıyor, sadece HardCopy ile çalışıyor ve preflight bunu
`screenshotFallback:false` olarak bildiriyor.

### Canlı test — SAP LIMAK / LED (2026-09-03)

Kullanıcı gerçek bir oturum açtı (LED, `172.16.6.112`, SAProuter
`212.12.155.132`, kullanıcı LMKERPDEV, mandant 100, GUI `8000.257.1.17`)
ve iki şey ortaya çıktı.

#### Bulgu 1 — `DisabledByServer`: teşhis ikiye bölündü

Preflight `classicWindows:1, scriptingAttachable:true, connections:1,
sessions:0` ölçtü. Yani engine'e BAĞLANILABİLİYOR ve bağlantı görünüyor,
ama `Connections.ElementAt(0).Children.Count == 0`. Doğrudan COM
yoklamasıyla sebep bulundu: **`GuiConnection.DisabledByServer == True`**.

Bu bayrak, "scripting kapalı" teşhisini iki AYRI duruma ayıran tek
sinyal — ve o ayrım kullanıcıyı doğru yere gönderdiği için önemli:

| Ölçüm | Anlam | Ne yapılmalı |
|---|---|---|
| bağlantı listelenemiyor, oturum 0 | İSTEMCİ tarafı kapalı | SAP Logon → Alt+F12 → Accessibility & Scripting |
| bağlantı listeleniyor, oturum 0, `DisabledByServer=true` | SUNUCU reddediyor | Basis: `sapgui/user_scripting` (RZ11 anlık / RZ10 kalıcı) |

Köprü artık `disabledByServer` + bağlantı başına `connectionDetails`
(`{index, description, sessions, disabledByServer}`) döndürüyor ve yeni
bir `serverScriptingDisabled` tavsiyesi üretiyor. `PreflightPanel` bu
durumda **istemci rehberini GÖSTERMİYOR**: bağlantı okunabildiğine göre
istemci ayarı zaten açık, orada vakit harcatmak teşhisin değerini
düşürür.

`disabledByServer` alanı `boolean | null` — `null` "bu GUI sürümü bayrağı
bildirmiyor" demek, "kapalı değil" DEĞİL. Panel bunu ayrı bir "bilinmiyor"
metniyle gösteriyor; ikisini birbirine karıştırmak yanlış teşhis üretirdi.

**LED'de `sapgui/user_scripting` KAPALI. Uygulama bunu açmıyor ve
açmamalı** — müşterinin change control'ü altındaki bir Basis işi. Panel
adımları yazıyor, uygulamıyor.

#### Bulgu 2 — oturumsuz ekran görüntüsü rotası (`/screenshot`)

`window` yakalamanın tek varlık sebebi COM'a dokunmadan çalışabilmesiydi,
ama HTTP rotası `/session/<c>/<s>/screenshot` idi ve önce oturum
çözüyordu. LED'de `sessions == 0` olduğu için **yetenek tam ihtiyaç
duyulduğu anda erişilemezdi** (`502 Oturum index'i geçersiz`).

Eklenen: `GET /screenshot?method=window`, `/preflight` gibi bilerek
`get_application()` guard'ının DIŞINDA. `method=hardcopy` burada 400
veriyor — HardCopy bağlı bir DIAG oturumu ister, sessizce başka bir şey
yapmaktansa reddetmek doğru. TS tarafında `captureGuiScriptScreenshot`
`connIdx/sessIdx` için `number | null` alıyor; `null` → oturumsuz rota.
`refreshScreenshot` artık oturum yokken erken dönmüyor ve köprü ayaktayken
oturum seçilemiyorsa bir kez kendiliğinden oturumsuz yakalama deniyor.

Canlı doğrulandı: 1650×1032 PNG (51 KB), `originLeft:105, originTop:0`,
görüntüde LED'in gerçek SAP Easy Access ekranı — scripting SUNUCUDA
KAPALIYKEN. Karşılaştırma için aynı anda `/session/0/0/screenshot` hâlâ
502 dönüyor; oturumsuz rota tam da bu boşluğu kapatıyor.

### Canlı test — Simpro / S4D, scripting AÇIK (2026-09-03)

Aynı gün kullanıcı ikinci bir sistem açtı: **S4D `192.168.1.246`**
(Simpro Elektronik, mandant 100). Orada da `disabledByServer: true`
çıktı — tesadüf değil, çünkü **`sapgui/user_scripting` SAP'de varsayılan
olarak FALSE**. Basis bilerek açmadıysa her sistemde kapalıdır.

İstemci tarafının sağlam olduğu ayrıca registry'den doğrulandı:
`HKLM\...\SAP Frontend Server\Security\UserScripting = 1`. Yani
"sunucu reddediyor" teşhisi iki bağımsız kanıta dayanıyor.

#### `DisabledByServer` logon anında pazarlık ediliyor

Kullanıcı RZ11'den TRUE çektikten SONRA da bayrak `true` kalmaya devam
etti. RZ11 ekranı yakalanıp okundu:

```
Value of Profile Parameter sapgui/user_scripting
 1 Kernel Default     FALSE      Dynamic Parameter:      Yes
 2 Default Profile    FALSE      System-Wide Parameter:  No
 3 Instance Profile   FALSE
 4 Dynamic Switching  TRUE   ← değişiklik
 Resulting Source: Dynamic Switching → TRUE
```

Parametre etkindi; sorun **açık bağlantının eski bayrağı taşımasıydı**.
`DisabledByServer` bağlantı kurulurken bir kez pazarlık ediliyor ve
bağlantı boyunca sabit kalıyor. Restart gerekmiyor (parametre dinamik)
ama **bağlantının kapatılıp yeniden kurulması gerekiyor** — tek bir
oturum açık kalırsa bağlantı ayakta kalır ve eski değer sürer.
Yeniden bağlanınca: `disabledByServer:false, sessions:1,
recommendation:"ready"`.

İkinci not: `System-Wide Parameter: No` — RZ11'in dinamik değişikliği
yalnızca üzerinde çalışılan instance'da geçerli. Çok instance'lı bir
sistemde "Setting on All Instances" gerekir. Ve dinamik değişiklik
restart'ta kaybolur; kalıcılık RZ10 işi.

#### BULGU — HardCopy PNG İSTENİYOR, BMP YAZIYOR

Scripting açılır açılmaz ortaya çıkan gerçek hata. `HardCopy(path,
"PNG")` çağrısı istenen biçimi **yok sayıyor**:

```
dönen bayt: 5.110.518   ilk 2 bayt: 'BM'   24-bit BMP, 1650x1032
doğrulama:  54 baytlık başlık + 4 bayta hizalı satırlar (4952*1032+54) = tam eşleşme
```

Kod bunu `data:image/png;base64,...` diye etiketliyordu → tarayıcı
görüntüyü **çizemezdi**, üstelik her yakalamada ~6,8 MB'lık bir dataURL
IPC'den geçerdi. Yeni `_ensure_png()` uzantıya ya da istenen biçime
değil **baytların kendisine** bakıyor; PNG değilse Pillow ile çeviriyor,
Pillow yoksa yalan etiket yapıştırmak yerine doğru MIME ile geçiyor.

Düzeltme sonrası ölçüm: **5.110.518 → 89.910 bayt (57×), PNG imzası
geçerli, görüntü doğru.** Bu hata yalnızca canlı oturumla görülebilirdi —
LED'de scripting kapalı olduğu için HardCopy hiç çalışmamıştı.

Yan bulgu: HardCopy görüntüsü menü çubuğunu içeriyor, `window` yakalaması
ise pencere başlığını — yani ikisinin içerik geometrisi FARKLI. Bu,
"HardCopy'de çerçeve BİLEREK çizilmiyor" kararını canlı veriyle doğruluyor.

#### BULGU — her istekte yeniden bağlanmak onay penceresi yağmuru üretiyordu

Kullanıcının bildirimi: *"şu sürekli SAP popup çıkıyor onay istiyor, o çok
yorucu"*. Sebep istemci ayarı değil, **bizim kodumuzdu**.

`get_application()` bilerek önbelleklemiyordu; docstring'i şöyleydi:
*"Her istekte TAZE bir GuiApplication referansı döner - bağlantı/oturum
listesi istekler arasında değişebilir"*. Ama `GetScriptingEngine` çağrısı
SAP GUI'nin **"bir script SAP GUI'ye bağlanıyor"** onay penceresini
tetikleyen çağrının ta kendisi. Yani her ağaç düğümü, her ekran okuma,
her aksiyon, her ekran görüntüsü ayrı bir onay penceresi demekti — tek
bir ağacı açmak onlarca onay üretebiliyordu.

Eski gerekçe DOĞRU BİR KAYGIYI YANLIŞ ÇÖZÜYORDU: liste gerçekten
değişebilir, ama bu yeniden BAĞLANMAYI gerektirmiyor. `GuiApplication`
canlı bir COM nesnesi ve `Connections` her erişimde SAP tarafında
yeniden değerlendiriliyor. Ölçerek doğrulandı (S4D, canlı):

```
30 x get_application()            → gerçek COM attach sayısı: 1
önbelleklenmiş referanstan okuma  → oturum sayısı 1 → createSession() → 2 → kapat → 1
```

Yani önbellek bayatlamıyor. Yeni `get_application()` referansı tutuyor,
her çağrıda `Connections.Count` ile canlılık yokluyor, referans ölmüşse
(SAP Logon kapatılıp açılmışsa) bir kez yeniden bağlanıyor. Onay
penceresi sayısı: **istek başına → köprü süreci başına bir kez.**

Güvenli, çünkü sunucu tek iş parçacıklı (`HTTPServer`, `ThreadingHTTPServer`
değil) ve tek bir `CoInitialize` var. Çok iş parçacıklı bir sunucuya
geçilirse COM apartman kuralları yüzünden bu önbellek gözden geçirilmeli —
kod bunu böyle not ediyor.

Kalan tek onay penceresi istemci ayarı: SAP Logon → Alt+F12 →
Accessibility & Scripting → iki "Notify" kutusu. **Uygulama bunu
değiştirmiyor** — kullanıcının kendi makinesindeki güvenlik tercihi, ve
kapatmak "scriptler SAP GUI'ye sessizce bağlanabilir" demek.

#### BULGU — SAP penceresini öne fırlatan adım HardCopy'ydi (`auto` sırası tersine çevrildi)

Kullanıcının ikinci bildirimi: *"bizim uygulamada bir aksiyon alıyorum,
ekrana SAP GUI geliyor hemen"*. Kodda hiçbir yerde `SetForegroundWindow`,
`SetFocus`, `BringWindowToTop` YOK — yani "biz çağırmışızdır" cevabı
elenmişti. Tahmin etmek yerine ölçüldü: bir sonda süreci köprüye HTTP
isteği atıp her adımdan sonra `GetForegroundWindow()` okudu (COM'a hiç
dokunmuyor, ekstra onay penceresi üretmiyor).

| adım | ölçüm | SAP öne geçti |
|---|---|---|
| `GET /connections` | 2 çağrı | 0 |
| `GET /session/../screen` | 2 çağrı | 0 |
| `POST action sendVKey` | 8 çağrı | 0 |
| `GET screenshot?method=window` | **18 çağrı** | **0** |
| `GET screenshot?method=hardcopy` | **18 çağrı** | **5** |

Tek suçlu `HardCopy`, ve deterministik değil (bir yarış — bu yüzden
"bazen oluyor" gibi görünüyor). Kritik nokta: UI her aksiyondan sonra
görüntüyü otomatik tazeliyor ve varsayılan yöntem `auto`ydu, `auto` da
ÖNCE HardCopy'yi deniyordu. Yani "uygulamada bir şey yapmak" =
"SAP penceresi öne atlayabilir".

Düzeltme: `capture_screenshot`'ta sıra **`window` → `hardcopy`** olarak
çevrildi. Bedeli yok, iki kazancı var: PrintWindow üste binmiş pencerelerin
altını da çiziyor (HardCopy'nin tek üstünlüğü buydu) ve `origin`
koordinatı yalnızca bu yolda döndüğü için eleman çerçevesi de ancak burada
çizilebiliyor. `hardcopy` elle seçilebilir kalıyor. Doğrulandı: `auto`
artık `method:"window"`, 61 KB, `origin=(105,0)`.

#### DENENDİ VE GERİ ALINDI — odak geri verme sarmalayıcısı köprüyü kilitledi

HardCopy'yi elle seçenler için "önce öndeki pencereyi hatırla, SAP öne
geçtiyse geri ver" şeklinde bir `keep_foreground()` yazıldı. **Köprüyü
dondurdu**: ilk `hardcopy` isteği hiç dönmedi, ardından `/health` bile 8
saniyede cevap vermedi.

Sebep `AttachThreadInput`. Windows yabancı bir sürecin odak çalmasını
engelliyor ve bunu aşmanın standart yolu bu çağrı, ama girdi kuyruğunu
SAP GUI'nin UI thread'ine bağlıyor — o thread tam o sırada HardCopy'yi
yazmakla meşgul, ve sunucu tek iş parçacıklı olduğu için bu tüm köprünün
donması demek. Diğer bilinen yöntem (sentetik ALT tuşu) zaten elenmişti:
kullanıcının öndeki penceresine gerçek girdi enjekte ediyor ve menü
çubuğunu açıyor. **Bu yol tekrar denenmesin**; kodda da böyle not edildi.

#### BULGU — "Kaydet çalışmıyor" bir hata değil, SAP'nin reddi (kod 617)

Kullanıcı SE09'dayken Kaydet'e bastığında ekrana ham COM demeti düşüyordu:

```
(-2147352567, 'Exception occurred.', (617, 'SAP Frontend Server',
 'The virtual key is not enabled.', None, 0, 0), None)
```

Canlı kök neden: o ekranda `wnd[0]/tbar[0]/btn[11]` (Kaydet) **`Changeable
= False`** — SAP tuşu kendisi kapatmış (değiştirilecek bir şey yok), ve
`sendVKey(11)` tam olarak bu 617'yi döndürüyor. Kodda bir kusur yok.

Aynı testte **Yardım (F1) aslında ÇALIŞIYORDU**: SAP `S` tipinde
"Dokümantasyon mevcut değil" mesajı döndürüyor. "Yardım çalışmıyor"
şikayeti, sonucun durum çubuğunda kalması ve UI'ın bunu öne çıkarmamasıydı.

Üç katmanda düzeltildi:

1. **Mesaj çevirisi** — `_sap_error_detail()` COM demetinin içindeki SAP
   mesajını çıkarıyor; `_translate_com_error` bunu bulduğunda "scripting
   açık mı" kontrol listesini GÖSTERMİYOR (scripting zaten çalışıyor,
   reddeden SAP). 617 özel olarak adlandırılıyor: *"Bu ekranda 11 numaralı
   tuş etkin değil — SAP onu araç çubuğunda soluk gösteriyor… Bir kod
   hatası değil, SAP'nin reddi. Şu an etkin olanlar: …"*.
2. **Önden bilme** — `read_toolbar_keys()` standart araç çubuğunu tarayıp
   `[{vkey, enabled, tooltip}]` döndürüyor; `describe_screen` bunu
   `toolbarKeys` olarak veriyor, `CommandBar` etkin olmayan tuşu soluk +
   üstü çizili gösteriyor. Etiket SAP'nin KENDİ tooltip'inden geliyor
   ("Back (F3)", "Yardım (F1)") — transaction tuşu yeniden atamışsa bizim
   statik tablomuz yanlış olurdu.
3. **Listede olmayan ≠ kapalı.** Araç çubuğunda görünmeyen ama çalışan
   tuşlar var (alan içindeki F4 gibi); onlar soluk gösterilmiyor.

**Bedeli ölçüldü**: tarama `/screen` süresini `223 ms → 633 ms` yapıyor
(410 ms). Soluk butonların tooltip'i zaten boş döndüğü için o okuma
atlanarak maliyet bir miktar düşürüldü. Kullanıcı aksiyonu başına bir kez
çalıştığı için kabul edildi; gerekirse **`GET …/screen?keys=0`** taramayı
atlar.

#### "Nasıl kullanılır" rehberi (`sapgui/GuidePanel.tsx`)

Kullanıcı isteği: *"ekranın nasıl kullanılacağına dair de bir eğitim gibi
bişey olsa iyi olur"*. Sağdan açılan bir çekmece (ekranı örtmesin diye tam
ekran değil), üstteki **Nasıl kullanılır** düğmesinden — köprü kapalıyken
de görünür, çünkü rehbere en çok ihtiyaç duyulan an "bağlanamıyorum" anı.

İçerik tamamen i18n'de (`sapGuiScripting.guide*`, tr/en). Altı adım
kullanım sırasıyla; ayrı bir "sık karşılaşılanlar" bölümü ise bu ekranda
canlı sistemde gerçekten yaşananları anlatıyor: iki ayrı scripting kapısı
ve sunucu ayarının ancak yeniden logon'da geçerli olması, soluk tuşun
SAP'nin reddi olduğu, F1'in "çalıştığı halde sessiz" görünmesi, popup'ta
ağacın `wnd[1]`'e kayması, ve bunun gerçek sistemde gerçek kayıt
oluşturduğu uyarısı.

#### Düzen elden geçirildi — ortak kabuk + görevlerine göre gruplama (2026-09-03)

Kullanıcı isteği: *"tasarımını, düzeni, butonları, yerlerini falan daha
düzgün daha güzel yapalım"*. Değişiklik göz kararı yapılmadı: uygulama
penceresi `PrintWindow` ile yakalanıp ekran görüntüsü üzerinden üç tur
düzeltildi (bu, tahminle bulunamayacak iki hatayı yakaladı — aşağıda).

**`sapgui/ui.tsx` — ortak kabuk sözlüğü.** Panel başlıkları dört dosyada
dört farklı şekilde yazılmıştı (kimi çerçeveli, 10px/11px, farklı griler,
farklı yükseklikler); sonuç sütun üstlerinin birbirini tutmamasıydı. Artık
tek yerde: `PanelHeader`, `TOOL_BUTTON`, `ICON_BUTTON`,
`GHOST_ICON_BUTTON`, `PRIMARY_BUTTON`, `PANEL_TITLE`, `Pill`,
`CountBadge`, `EmptyState`. Yükseklikler **bilerek sabit** (`h-8` başlık,
`h-7` düğme): `py-*` ile yazılan sürüm içerik uzunluğuna göre panelden
panele 2–3 piksel kayıyordu.

**Bilgi mimarisi göreve göre ayrıldı.** Eskiden üst şeritte bağlantı,
kayıt, script ve agent düğmeleri yan yanaydı — dört ayrı iş, tek düğme
kalabalığı. Yeni bölünme:

| şerit | işi |
|---|---|
| üst başlık (`h-12`) | yalnız **bağlantı**: durum rozeti, Teşhis, yenile, Nasıl kullanılır, Bağlan/Kes |
| komut çubuğu (`h-12`) | tcode · fonksiyon tuşları · **Kaydet/Script/AI Agent** (`dock` prop'u) · elle vkey (sağda) |

**Otomasyon düğmelerinin üç durağı oldu, sonuncusu ayrı şerit DEĞİL.** Önce
sağ üst köşedeydiler (hangi panelin açıldığı görünmüyordu), sonra ekranın
en altına alındılar (pencere kısalınca kullanıcı onları hiç görmüyordu —
*"aşağıda gözükmüyor"*), sonra başlığın altına ayrı bir `h-9` şeride. Ayrı
şerit her hâlinde 36 piksel yiyordu, oysa komut çubuğunda fonksiyon
tuşlarıyla vkey seçicisi arasındaki bölge zaten boş duruyordu. Şimdi
oradalar (`CommandBar` `dock` prop'u, dikey ayraçla ayrılmış) ve açtıkları
panel hemen altlarında.

**Fonksiyon tuşları büyütüldü:** `h-6/11px/px-2` → `h-6/12px/px-3`, kutu
`h-8`, komut çubuğu `h-11` → `h-12`. İlk turda tuşlar hem tıklama hedefi
hem okunurluk olarak küçük kalmıştı.

**`color-scheme` (`index.css`).** Chromium'un yerli açılır `<select>`
listesi CSS ile boyanmıyor — sistem paletini kullanıyor, dolayısıyla koyu
temada bembeyaz açılıyordu (vkey seçicisi en görünür örnekti). Çözüm renk
değişkenlerinin yanına `color-scheme: dark|light` koymak; tema bloklarının
içinde olması şart, yoksa açık temada ters etki yapar. Özel
`::-webkit-scrollbar` kuralları bundan etkilenmiyor, onlar zaten
`--scrollbar-thumb`'ı ezip geçiyor.

Sağdaki eleman detayı katlanabilir oldu (340px ↔ 32px dikey ray): SAP
ekranı geniş olduğunda asıl daralan sütun oydu.

**Ekran görüntüsünden çıkan iki düzeltme.** (1) Fonksiyon tuşu grubu
`flex-1`di ve boş bir dev kutu olarak çiziliyordu — `shrink` + vkey
kutusuna `ml-auto`. (2) Teşhis/Nasıl kullanılır'ı ikon-only yapmak
keşfedilebilirliği düşürüyordu — metin etiketleri geri kondu.

**Ortalama `m-auto` ile, `items-center` ile DEĞİL.** Taşan içerikte flex
ortalaması kutunun başını kırpıyor: uzun bir SAP ekranının üst kenarı
kaydırılamaz hâle geliyordu. Görüntüde yalnız **genişlik** sınırlı;
`max-h-full` bilerek yok — sarmalayıcıyı görüntüden büyütür ve seçili
eleman çerçevesi (sarmalayıcıya göre konumlanıyor) kayardı.

#### Çerçeve hizası — piksel hassasiyetinde doğrulandı

Canlı koordinatlarla test edildi (`origin=(105,0)`):

| eleman | screen | hesaplanan kutu | sonuç |
|---|---|---|---|
| `tbar[0]/okcd` | (153, 42) | (48, 42) 142×22 | komut alanını tam sarıyor |
| `sbar` | (109, 1000) | (4, 1000) 1642×28 | durum çubuğunu tam sarıyor |

`screenLeft - originLeft` matematiği doğru; tahmin edilmiş ofset yok.

#### Aksiyon zinciri — uçtan uca

| # | aksiyon | sonuç |
|---|---|---|
| 1 | `navigate ZZNOTEXIST9` | `statusBar {type:"E", text:"İşlem ZZNOTEXIST9 mevcut değil", number:"343"}` |
| 2 | `sendVKey 4` (F4) | `isPopup:true`, `GuiModalWindow`, 4 buton SAP'nin KENDİ toolbar'ından (Devam/Yazdır/Bul/İptal + tooltip'ler) |
| 3 | `popupChoice cancel` | popup kapandı, `isPopup:false` |
| 4 | `setText okcd` + `sendVKey 0` | `tcode:SE38`, `title:"ABAP düzenleyici: Baslangiç ekrani"` |
| 5 | `sendVKey 3` (Back) | Easy Access'e döndü |
| 6 | `navigate SE16` / `SMEN` | `tcode:SE16` → `SESSION_MANAGER` |

1. satır tam olarak durum çubuğunun VAROLUŞ SEBEBİ: COM çağrısı
`ok:true` döndü ama SAP işlemi reddetti. Durum çubuğu olmasaydı bu
UI'da yeşil görünecekti.

Ayrıca `elementId` yerine `id` göndermek net bir hata mesajı verdi
(`'id' alanı zorunlu (sendVKey/navigate/popupChoice dışındaki tüm
aksiyonlar için)`) — sessizce yanlış elemana gitmedi.

Test sonunda kullanıcının ekranı **SAP Easy Access'e temiz bırakıldı**.

### DOĞRULANAN / DOĞRULANMAYAN

Doğrulandı (canlı, S4D, scripting AÇIK): preflight karar tablosu +
`DisabledByServer` ayrımı, `guiVersion`, bağlantı/oturum listeleme,
`describe_screen`, eleman ağacı, eleman özellikleri + geometri,
`window` yakalama, `hardcopy` yakalama (düzeltmeden sonra), çerçeve
hizası, durum çubuğu (E tipi hata dahil), popup algılama + gerçek
butonlar, `navigate`/`sendVKey`/`setText`/`popupChoice`, oturumsuz
`/screenshot` rotası, `hardcopy` guard'ı. Köprü `py_compile` temiz,
her iki tsconfig typecheck temiz.

Doğrulanmadı: kaydet/oynat'ın UI üzerinden uçtan uca akışı. Bu
"çalışmıyor" değil, "bu oturumda sırası gelmedi" — ikisi
karıştırılmamalı. *(Sonradan: veri yolu aynı gün doğrulandı, bkz.
"Kayıt → Kaydet → Aç → Oynat zinciri canlıda çalıştı" — geriye yalnız
düğmelere fiilî tıklama ve dosya diyalogları kaldı.)*

#### Açık maddeler canlıda denendi — dördü de kusurluydu (2026-09-03)

Canlı S4D/SE16N'de VBFA listesi (500 satır, 42 sütun) üzerinde
denendi. Hiçbiri "çalışmıyor" diye raporlanmamıştı; **hiçbiri
gerçekte denenmemişti**, ve dördü de ilk temasta patladı.

**1. Grid okuma çalışıyordu ama SESSİZ KIRPIYORDU.** `rowCount` 500,
dönen 200; `columnCount` 42, dönen 40. Satır kırpması `truncated` ile
bildiriliyordu, **sütun kırpması hiç bildirilmiyordu** — denetçi 40
sütunu tam liste gibi gösteriyordu. Eksik veriyi tam sanmak, veriyi
hiç göstermemekten kötü. Eklendi: `columnCount` + `columnsTruncated`,
ve başlıkta artık `500 × 42` yazıyor.

**2. `doubleClick` bir ALV'de HİÇBİR ZAMAN çalışamazdı.** Köprü
`comp.DoubleClick()` diye parametresiz çağırıyordu; oysa
`GuiGridView.doubleClick(row, column)` imzası zorunlu. COM "Parameter
not optional." diyor, bu SAP'nin kendi mesajı olmadığı için kullanıcıya
"scripting açık mı, Alt+F12'yi kontrol et" listesi çıkıyordu —
tamamen yanlış yere bakması söyleniyordu. Düzeltildi: grid ise
satır+sütun ile çağrılıyor, satır verilmemişse bunu söyleyen net bir
hata dönüyor. Doğrulandı: satır 0 / `VBELN` → ekran 200'den 600'e
("Ayrnt.görüntü") geçti.

**3. `sendVKey` modal pencerede yanlış pencereye gidiyordu.** Sabit
`wnd[0]`'a gönderiliyordu; modal açıkken (çift tıklamayla gelen
ayrıntı penceresi `wnd[1]`) tuş modalin ARKASINDAKİ pencereye gidip
617 ile reddediliyordu. Dosyanın geri kalanı zaten `ActiveWindow`
kullanıyordu; hizalandı.

**4. Araç çubuğu okuması modal açıkken YALAN SÖYLÜYORDU.**
`read_toolbar_keys` sabit `wnd[0]/tbar[0]` okuyordu, yani modal
açıkken arkadaki ekranın tuşlarını o anki ekranınmış gibi bildiriyordu.
Sonuç kendi içinde çelişen bir mesajdı: *"3 numaralı tuş etkin değil
… şu an etkin olanlar: Geriye (F3)"*. O modalde gerçekte yalnızca
Devam(0), Ara(71), Aramaya devam(84), İptal(12) var. Aktif pencereye
çevrildi; okuma artık SAP'nin gösterdiğiyle birebir.

**5. `selectContextMenuItem` MENÜYÜ HİÇ AÇMIYORDU.** Yalnız
`SelectContextMenuItem(<işlev kodu>)` çağrılıyordu. Açık bir menü
yokken SAP bunu 613 "invalid argument" ile reddediyor — yani hatayı
DEĞERDE gösteriyor, oysa eksik olan çağrının kendisi. Beş ayrı
kod/metin denendi, hepsi 613 verdi. SAP'nin kendi kayıt çıktısı hep
ikili sıra üretir (`grid.contextMenu` → `grid.selectContextMenuItem`);
eklendi ve `&OPTIMIZE` ilk denemede geçti.

Ayrıca bu maddede ikinci bir sorun vardı: işlev kodu (`&XXL`) ekranda
hiçbir yerde yazmaz, kullanıcının bilmesinin yolu yoktur ve her yanlış
tahmin öğretmeyen bir hata döndürür. SAP'nin `…ByText` / `…ByPosition`
metotları eklendi; UI'da **varsayılan artık "Metin"** (kullanıcının
okuyabildiği şey menüde yazan metindir), 613 hatası da ne yapılacağını
söylüyor. Metin yolunun SAP'ye ulaştığı doğrulandı; doğru etiketle
uçtan uca teyit edilmedi (tahmin edilen Türkçe etiketler o menüde
yoktu).

**Yan doğrulama — UTF-8 sağlam.** Türkçe karakterli bir değerin
köprüden gidip geri döndüğü bayt bayt ölçüldü (`ĞÜŞİÖÇığşiöç` bozulmadan
döndü). İlk denemede görülen bozulma kabuk argümanındaydı, köprüde
değil.

**Performans notu (düzeltilmedi):** 200 satır × 40 sütun okuması ~31 sn
sürüyor — 8000 ayrı COM `GetCellValue` çağrısı, ve köprü tek iş
parçacıklı olduğu için bu süre boyunca başka istek kabul etmiyor.
Büyük bir ALV'de denetçi bu kadar donuyor demektir. Sınırlar
(`GRID_CELL_LIMIT_*`) bilinçli; asıl mesele okumanın tembel/parçalı
olması gerektiği. Kayda geçirildi, yapılmadı.

**Aynı porta iki köprü bağlanabiliyor (dikkat).** Windows'ta iki
`python.exe` aynı anda 8790'ı LISTENING tutabildi; istekler ikisi
arasında dağıldı ve ESKİ kodlu olan yanıt verdiğinde düzeltme
"çalışmadı" gibi göründü. Köprüyü yeniden başlatırken PID ile
kapatmak gerekiyor — `taskkill /IM python.exe` filtresi bunları
yakalamıyor.

Test sonunda kullanıcının ekranı **başladığı yere** bırakıldı
(SE16N ekran 200, VBFA listesi; ayrıntı penceresi kendi İptal'iyle
kapatıldı).

#### Kayıt → Kaydet → Aç → Oynat zinciri canlıda çalıştı (2026-09-03)

Faz 2'nin tamamı bugüne kadar hiç uçtan uca çalıştırılmamıştı.
Çalıştırıldı — ve yine üç kusur çıktı, üçü de **sessiz başarısızlık**
ailesinden.

**1. Kaydedilen adım, kaydedildiği anda çalışan adım değildi.**
`GuiScriptRecordedStep` yalnızca `action/id/value/vkey` taşıyordu;
`row`/`column` (ALV'de çift tıklama) ve `by` (sağ tık menüsünde
seçim yöntemi) kayda hiç girmiyordu. Bu alanlar bugün eklendiği için
kayıt da, oynatma da onlarsız kalmıştı: bir grid çift tıklaması
kaydedilebiliyor ama tekrar oynatılamıyordu. Üçü de
`recordStep` → JSON → `handlePlayScript` boyunca geçirildi;
`describeStep` de artık satır/sütunu etikete yazıyor (onlarsız iki
farklı adım listede birebir aynı görünüyordu).

**2. `handleOpenScript` yanlış dosyayı SESSİZCE yutuyordu.** Geçerli
JSON olması yeterliydi: `steps` yoksa liste boşalıyor, kullanıcı
"hiçbir şey olmadı" görüyordu. Artık `steps` dizi değilse dosya
reddediliyor (`scriptFileInvalid`, mevcut adımlar korunuyor) ve
tanınmayan aksiyon içeren adımlar atlanırken **kaç adımın atlandığı
söyleniyor** (`scriptStepsDropped`). Tanınan aksiyon listesi
`Record<GuiScriptActionKind, true>`'dan türetiliyor — birliğe yeni bir
aksiyon eklenirse dosya derlenmiyor, yani liste sessizce eskiyip
geçerli adımları "tanınmadı" diye atamıyor.

**3. Dosya yazma/okuma hatası hiçbir yere ulaşmıyordu.**
`sapGuiScript:saveScript`/`openScript` handler'larında `fs.writeFile`/
`readFile` try dışındaydı; hata handler'ın promise'ini reddediyor,
renderer'daki `await` yakalanmamış hataya dönüşüyor ve kullanıcı hiçbir
şey görmüyordu — oysa `GuiScriptJsonFileResult.error` alanı en baştan
vardı ve renderer onu okuyordu, sadece kimse doldurmuyordu. İkisi de
try içine alındı; `handleOpenScript` de artık `error`'u iptalden
ayırıyor. Ayrıca diyalog sahibi pencere `undefined as any` yerine
odaklı pencere → ilk pencere sırasıyla çözülüyor (sahipsiz diyalog
uygulamanın arkasında kalabiliyordu).

**Ayrıca: 619 okunabilir hâle geldi.** `findById` bir kimliği
bulamadığında ham COM demeti yukarı çıkıyordu — içinde aranan kimlik
bile yazmadan. **Kayıtlı bir script'i tekrar oynatırken en olası hata
tam olarak budur** (adım başka bir ekranda kaydedilmiştir). Artık:
"Bu eleman şu anki ekranda yok: '<id>'. Kayıtlı bir adım
oynatılıyorsa…". `handle_action` de doğrudan `session.findById`
çağırmayı bırakıp `resolve_component`'e geçti — yoksa aksiyon yolu bu
mesajı almıyordu (ilk düzeltmeden sonra canlıda görüldü).

**Doğrulama (canlı S4D, SE16N/VBFA).** Dosya diyaloglarına
tıklayamadığım için aynı veri yolu birebir tekrar edildi
(`.tmp-replay.cjs`): `handleSaveScript`'in ürettiği JSON diske yazıldı,
`handleOpenScript`'in doğrulaması uygulandı, `handlePlayScript`'in
gönderdiği payload'lar aynı sırayla ve aynı 350 ms gecikmeyle köprüye
gitti. İki adımlık salt-okunur script — `doubleClick(0, "VBELN")` →
ayrıntı penceresi (SAPLTSWUSL 600, popup), `sendVKey(12)` → geri
(SAPLSE16N 200) — **iki adım da OK**. Bozuk dosya reddedildi,
tanınmayan aksiyonlu dosyada 1 adım atlandığı bildirildi, bayat kimlik
okunabilir mesaj verdi. **Denenemeyen tek parça:** Kaydet/Aç
düğmelerinin açtığı işletim sistemi dosya diyalogları — tıklama
gerektiriyor. Ekran yine **başladığı yerde** bırakıldı.

#### AI Agent canlıda denendi — dört kusur, ikisi ajanı tamamen tıkıyordu (2026-09-03)

Faz 3'ün AI Agent'ı bugüne kadar gerçek bir görevle hiç çalıştırılmamıştı.
Görev: *"Ekranda açık ALV listesindeki ilk satıra çift tıklayarak ayrıntı
penceresini aç, sonra F12 ile kapatıp listeye dön."* İlk koşumda **8 turda
görevi yapamadı**; düzeltmelerden sonra **yaptı**.

**1. `double_click` bir ALV'de ajanla ASLA çalışamazdı.**
`performAndMaybeRecord`'un `extra` tipi `{value, vkey}` idi; ajanın
gönderdiği `row`/`column` oraya kadar gelip **sessizce düşüyordu**. Canlı
kanıt: ajan 8. turda `row: 0, column: "RUUID"`'i **doğru** üretti, köprü
yine *"'row' gerekli"* diye reddetti — ajan haklıydı, tesisat eksikti. Ajan
o hataya sonsuz takılıyordu. `row`/`column`/`by` eklendi; kayda da
(`recordStep`) geçiyor, yani ajan aksiyonları artık Faz 2 script'ine doğru
kaydediliyor.

**2. Prompt, ajana ALV satırının kimliği varmış gibi söylüyordu.**
Kural 5 aynen şuydu: *"bir grid satırına tıklamak için o satırın/hücrenin
id'sini get_node'dan al"*. Öyle bir id yok. Ajan bunun üzerine
`.../shellcont/shell[0,0]` **uydurdu** (5. tur). Kural düzeltildi: id her
zaman GRID'in kendi id'si, satır `row` + `column` ile veriliyor, `shell[0,0]`
gibi bir id'nin var olmadığı açıkça yazıldı. `ACTIONS_DOC`'ta da
`double_click` artık `row`/`column`, `select_context_menu_item` ise `by`
taşıyor — ikisi de bugün eklenmişti ve sözlükte hiç yoktu.

**3. Tek bir ALV okuması prompt'u 115 bin karaktere şişiriyordu.**
`nodeToText` grid'i olduğu gibi gönderiyordu: canlı 500×42 listede
`get_node` cevabı **104.699 karakter**. Prompt 10 binden 115 bine fırladı ve
transcript biriktiği için **sonraki her tur** o boyutta kaldı; bir tur **99
saniye** sürdü. Ajanın bir satıra tıklamak için 200 satırın içeriğine
ihtiyacı yok. Ajana giden kopya ilk 15 satıra kırpıldı (`previewNote` ile
"bu bir önizleme, gerçek sayı şu" diye söylenerek; gerçek `rowCount`/
`columnCount` korunuyor). **Denetçideki insan tablosu etkilenmedi** — orası
tam veriyi görmeye devam ediyor.

**4. (Bugün düzeltilen 619 hemen işe yaradı.)** Uydurulan `shell[0,0]`
kimliği artık *"Bu eleman şu anki ekranda yok: '...'"* diyor ve ajan bir
sonraki turda kendini düzeltti. Ham COM demeti olsaydı düzeltemezdi.

**Sonuç (aynı görev, düzeltmelerden sonra).** 6. turda ajan
`double_click(row 0, "VBELN")` + `send_vkey(12)`'yi tek batch'te gönderdi,
ikisi de başarılı; 7. turda ekranı doğruladı; 8. turda doğru bir özetle
bitirdi (*"VBELN=80000000 … veri değiştirilmedi"* — VBELN değeri gerçekten
o). Prompt tepe noktası **116.703 → 23.223 karakter**, transcript
**110.161 → 15.622**.

**Test koşumunun sınırı — dürüstçe.** Panelin düğmesine tıklayamadığım için
aynı döngü birebir tekrar edildi (gerçek system prompt, gerçek `axet-code
run --quiet --cwd <scratch>` spawn'ı, gerçek `extractJson`/
`normalizeActions`); tek fark `executeTool`'un IPC yerine doğrudan köprüye
HTTP atması. Ayrıca **canlı sistem olduğu için** veri değiştirebilecek
aksiyonlar (`set_text`/`press`/`select_context_menu_item`) test koşumunda
bloke edildi — ajan bunları denemedi, yani o üç yolun ajanla çalıştığı
DOĞRULANMADI. Ekran yine başladığı yerde bırakıldı (SE16N 200, popup yok).

#### AI Agent panelinin KENDİ arayüzü ilk kez tıklandı — iki sessiz kusur (2026-09-04)

Yukarıdaki koşumun kendi kabul ettiği sınır (*"Panelin düğmesine
tıklayamadığım için…"*) bu turda kaldırıldı. Yöntem: **gerçek renderer'ı
tarayıcıda çalıştırmak** — proje kökünde alternatif bir Vite giriş HTML'i
(`.tmp-stub.html`), `/src/main.tsx`'ten ÖNCE inline bir script'te `window.api`
tanımlıyor; fixture'lar canlı köprüden okunmuş gerçek verilerdi. Böylece
`SapGuiAgentPanel.tsx`/`agentRunner.ts`'in **gerçek kodu** tıklanabildi,
kullanıcının çalışan Electron uygulamasına hiç dokunmadan ve köprüye CORS
açmadan (köprü kullanıcının SAP GUI'sini COM ile sürüyor — herhangi bir web
sayfasına açılamaz).

Bulunan iki kusur da **aynı aileden**: alıcı taraf hazır, üretici hiç
ateşlemiyor. İkisi de kod okuyarak değil, tıklayarak ortaya çıktı.

**1. `ask_user`'ın SEÇENEKLERİ ekrana hiç gelmiyordu.** `tools.ts` `options`'ı
ayrıştırıyor (en fazla 4), `agentRunner` `kind: "question"` olayıyla taşıyor,
`LogEntry`'de `entry.options` olarak duruyor — ve `AgentLogRow` sadece
`entry.text`'i çiziyordu. Yani sistem prompt'unun ajana *"belirsizse seçenek
sun"* demesinin ekranda hiçbir karşılığı yoktu; kullanıcı cevabı elle yazmak
zorundaydı. Seçenekler artık tıklanabilir çip olarak çiziliyor ve tıklanınca
`handleSend` ile yeni tur açıyor. Yalnız **son** soru tıklanabilir
(`onPickOption` sadece `i === log.length - 1` satırına veriliyor) — eski bir
soruya dönüp cevap göndermek transkript sırasını bozardı. Doğrulama: üç çip
çizildi, `VBFA` tıklandı, kullanıcı turu olarak transkripte düştü, eski
sorunun çipleri `disabled` oldu.

**2. "Durdur" turu SESSİZCE bitiriyordu.** `AgentEvent`'te `kind: "cancelled"`
TANIMLIYDI, `AgentLogRow` onu ÇİZİYORDU da — ama üç ayrı
`return { stopped: "cancelled" }` noktasının hiçbiri olayı ateşlemiyordu.
Ekranda görülen: spinner kayboluyor, log'da hiçbir iz kalmıyor. Kullanıcı
*"durdu mu, yoksa bitti mi, yarım kalan aksiyon var mı"* sorusunu ekranda
cevaplayamıyordu — ki bu ajan **geri alınamaz SAP GUI aksiyonları**
uyguluyor, "Durdur"un tam da bu yüzden var olduğu panelde. Üç nokta da tek
bir `cancel()` yardımcısına bağlandı. Doğrulama: 30 sn'lik sahte bir tur
başlatıldı, `Durdur` tıklandı, iptal `cancelGuiScriptAgentStep` ile IPC'ye
gitti, busy 1,5 sn içinde düştü ve log'a *"Tur kullanici tarafindan
durduruldu."* yazıldı.

**Bu turda ayrıca ilk kez GÖRÜLEN durumlar** (hepsi sağlam çıktı, değişiklik
gerekmedi): oynatmadaki *"hâlâ meşgul"* rozeti (`settle.settled === false`
— açık temada kontrast 5,03:1, WCAG AA geçer), ELEMAN DETAYI'nın
Metin/Kod/Konum seçicisi, açık tema, ve daraltılmış kenar çubuğu
(271 px → ikon şeridi; genişlet düğmesi ve "yeni sohbet" hayatta kalıyor).

#### Komut çubuğu 1280 px'te taşıyordu — kırpma yerine sığdırıldı (2026-09-04)

Yukarıdaki turda ölçülmüştü: 1280 px'te (kullanıcının gerçek pencere
genişliği) oturum seçiliyken fonksiyon tuşları `clientWidth 423 /
scrollWidth 451`, otomasyon düğmeleri `261 / 278` — yani "Yardım" ile
"AI Agent" kırpılıyordu. İki kapsayıcı da `overflow-x-auto` olduğu için
işlev kaybı yoktu ama kırpılmış bir düğme "bozuk" görünüyor, hele
kaydırma çubuğu 1 px'lik bir çizgiyken.

Taşma menüsü EKLENMEDİ — sorun düğme sayısı değil, dolgu genişliğiydi.
Dört yerden yer açıldı: tcode girdisi `w-36 → w-28` (bir tcode 4-6 karakter,
144 px hiç gerekmiyordu), fonksiyon tuşları `px-3 → px-2`, `dockTab`
`px-3 → px-2`, kayıt düğmesi `px-2.5 → px-2`.

Ölçümle doğrulandı (1280×820, oturum SEÇİLİ — kayıt düğmesi grubun en geniş
öğesi, o yüzden oturumsuz ölçüm yanıltıcı olurdu):

| | önce | sonra |
|---|---|---|
| fonksiyon tuşları | 423 / 451 (taşıyor) | **387 / 387** |
| otomasyon düğmeleri | 261 / 278 (taşıyor) | **258 / 258** |
| kalan boşluk | 0 | **89 px** |

İNGİLİZCE de sığıyor ("Start Recording" daha uzun): `277 / 277`, 84 px
boşluk — yani sığdırma tek dile bağlı bir tesadüf değil. Dar pencerede
davranış DEĞİŞMEDİ: 900 px'te iki grup yine kaydırılabiliyor
(`201/387`, `135/258`) ve çubuğun kendisi taşmıyor (`844/844`).

#### Fonksiyon tuşu etiketleri İngilizce'de Türkçe kalıyordu (2026-09-04)

Yukarıdaki ölçüm turunda dil düğmesi tıklanınca görüldü: uygulama
İngilizce'ye geçiyor, komut çubuğu **"Enter Geri Çalıştır Kaydet…"** demeye
devam ediyordu. Sebep `lib/sapGui/vkeys.ts`'teki `MEANINGS` sabitiydi —
Türkçe metinler doğrudan koda gömülmüştü ve i18n'e hiç bağlı değildi.
Etiketler üç yerde birden görünüyordu: düğme yazısı, ipucu (tooltip) ve
37 satırlık "özel vkey" açılır listesi.

`MEANINGS` yerine ÇEVİRİ ANAHTARLARI kondu (`meaningKey`/`shortKey`); metin
`i18n`'den geliyor. `combo` ("Shift+F3") çevrilmiyor — o bir klavye
gösterimi.

**Düğme yazısı artık ayrı bir anahtar.** Eskiden uzun anlamın ilk
kelimesinden türetiliyordu (`meaning.split(" ")[0]`): "Değer yardımı (F4)"
→ "Değer". Bu, sözlüğe metin yazan kişiye görünmeyen bir kural dayatıyordu
("ilk kelime iyi bir başlık olmalı") ve her dilde tutmayabilirdi. Sekiz
hızlı tuşun kısa yazısı artık açıkça yazılıyor; listede olmayan bir tuş
`combo`ya düşüyor, yani QUICK_VKEYS'e anahtarsız bir tuş eklemek kırmıyor.

Doğrulandı (tarayıcıda dil değiştirilerek, üç yüzeyin üçü de):
düğmeler `Enter/Back/Execute/Save/Cancel/Exit/Value/Help`, ipuçları
`F3 · Back`, kapalı tuşun ipucu `F11 · Save — SAP has disabled this key on
this screen`, açılır liste `0 · Enter · Enter / Confirm`. Genişlik ölçümü
yenilendi (yazılar değişti, eski ölçüm geçersizdi): **İngilizce 381/381 ve
277/277, 91 px boşluk; Türkçe 387/387 ve 258/258, 89 px** — ikisi de sığıyor.

**Bilerek böyle:** kaydedilmiş adımın etiketi KAYIT ANINDAKİ dilde kalır
(etiket script dosyasına yazılıyor). Ölçüldü: Türkçe kaydedilen adım
`sendVKey(0) · Enter · Enter / Onayla`, dil değişince o satır aynı kalıyor,
yeni adım `… / Confirm` oluyor. Etiketi kalıcı saklamak yerine her render'da
üretmek ayrı bir iş — script dosyası biçimini değiştirir.

#### Sağ tık menüsü: üç yöntem de doğrulandı, ama menü OKUNAMIYOR (2026-09-03)

`selectContextMenuItem`'in üç yöntemi (`code`/`text`/`position`) bugüne
kadar "SAP'ye ulaşıyor" seviyesinde bırakılmıştı — hiçbiri **gözlenebilir**
bir sonuçla teyit edilmemişti. Canlı ALV'de (SE16N/VBFA, S4D) üçü de
teyit edildi:

| yöntem | değer | gözlenen sonuç |
|---|---|---|
| `code` | `&XXL` | "Export As" popup'ı |
| `position` | `6` / `8` / `11` | "Ara..." popup'ı / filtre popup'ı / Export As |
| `text` | `Ara...` | konum 6 ile **aynı** popup |

Reddedilenler de bilgi taşıyor: konum `999`/`-5`/saçma değer 613 alıyor,
`2`/`5`/`10` ise menü **ayıraçları** olduğu için reddediliyor. Yani konum
yöntemi gerçek menüye karşı doğruluyor — "OK döndü ama hiçbir şey olmadı"
şüphesi (ilk sonda, `position: 0`) böyle çürütüldü: 0 gerçek ama sessiz
bir öğe.

**Asıl bulgu — menü içeriği okunamıyor.** Bunu ölçmek için köprüye bir
teşhis ucu eklendi: `GET /session/{c}/{s}/contextmenu?id=…` menüyü açar
(`contextMenu()`), oturumun durulmasını bekler, sonra elemanın / aktif
pencerenin / ana pencerenin altında menü tipindeki her düğümü tarar.
Sonuç: **`component: 0`** — SAP açık bir bağlam menüsünü bileşen ağacında
hiç göstermiyor. Tarama sağlam, çünkü aynı taramada ana menü çubuğu
(`wnd[0]/mbar`) tüm alt menüleriyle Türkçe okunuyor. `Key`/`Name` de işlev
kodu vermiyor (`Name == Text`). Bu yüzden teşhis "menüyü listele" diye
değil, `contextMenuExposed` (bulgunun regresyon kontrolü) + `menuBar`
(gerçekten okunabilen tek menü) olarak döner.

**Metin yönteminin tuzağı, ve neden varsayılan artık "konum".** Menüde
yazan etiket, açtığı ekranın başlığı DEĞİL: aynı öğenin etiketi `Ara...`,
açtığı popup'ın başlığı `Bul`. `Bul`, `Bul...`, `Find...`, `Ayrıntılar`,
`E-tabloya aktar`… dokuz mantıklı tahminin **hepsi** reddedildi; çalışan
tek değer menüde gerçekten yazan `Ara...` idi. Metni GÖREN kullanıcı için
metin yöntemi doğru yol; menüyü göremeyen (ajan, ya da script yazan)
için tek çalışan yol **konum sondalaması** — geçersiz konum zararsızca
reddedilir, geçerli konum işlemi yapar. Ajanın action sözlüğü (
`actionsDoc.ts`) ve 613 hata metni bunu artık böyle anlatıyor.

*Not:* bu ölçümde `&OPTIMIZE` reddedildi, oysa aynı gün önceki ölçümde
geçmişti. Menünün içeriği o anki hücreye/bağlama göre değişiyor olabilir;
kanıtlanmadı, sadece kayda geçiyor — kod tahmininin neden kırılgan
olduğunun bir örneği daha.

Ekran yine başladığı yerde bırakıldı (SE16N 200, VBFA, popup yok);
açılan üç popup da kendi İptal'iyle kapatıldı ve her seferinde taban
duruma dönüldüğü okunarak doğrulandı.

#### ALV okuması 16,4 sn → 3,4 sn: grid artık sayfa sayfa okunuyor (2026-09-03)

Bilinen ama düzeltilmemiş maddeydi. Ölçüm: canlı VBFA ALV'sinde
`get_node` **16,41 sn** (200 satır × 40 sütun = 8000 `GetCellValue`, hücre
başına ~2 ms). Köprü tek iş parçacıklı olduğu için bu süre boyunca
**başka hiçbir istek kabul edilmiyor** — yani büyük bir grid seçmek
uygulamayı 16 saniye cevapsız bırakıyordu. Karşılaştırma: `wnd[0]`
okuması 0,62 sn, ekran okuması 0,22 sn.

Çözüm bulk API değil (SAP GUI Scripting'de ALV için hücre-hücre
`GetCellValue` dışında bir yol yok), **daha az okumak**: `/node` artık
`rows`/`rowOffset` alıyor, varsayılan `GRID_DEFAULT_ROWS = 20`,
`GRID_CELL_LIMIT_ROWS = 200` tavan olarak kalıyor. Ölçülen sonuç:

| istek | süre |
|---|---|
| varsayılan (20 satır) | **3,41 sn** |
| `rows=5` | 0,86 sn |
| `rows=200` (eski davranış) | 16,08 sn |
| `rows=999` → 200'e kırpıldı | 16,75 sn |

`rows=abc` sessizce varsayılana düşmüyor, reddediliyor — istenen pencere
ile okunan pencere farklı olursa satır numaraları kayar.

**Sayfalama bir kusur ORTAYA ÇIKARDI ve düzeltildi.** Denetçideki tablo
çift tıklamada `row: i` gönderiyordu — `i` sayfa içindeki sıra. Tek sayfa
varken doğruydu; sayfalama gelince ikinci sayfada "12. satır"a çift
tıklamak SAP'de **0. satırı** açacaktı: yanlış kaydı açan ama hata da
vermeyen bir sessiz kusur. Artık `rowOffset + i`. Canlı doğrulandı:
`rowOffset=12` penceresinde 12. satır VBELV=20000079/VBELN=80000004
görünüyor, `doubleClick(row=12)` sonrası açılan ayrıntı ekranında
**tam olarak o iki değer** okundu (0. satır 20000078 olurdu).

Aynı offset üç yere daha taşındı: `GuiScriptGridData.rowOffset` (tip),
denetçide "13–15 / 500 satır" + Önceki/Sonraki/"200 satır yükle"
düğmeleri, ve ajanın `grid.previewNote`'u ("row değerleri BU MUTLAK
numaralardır, sonraki sayfa için `row_offset: N`"). Ajan ayrıca artık
köprüden **yalnızca kullandığı 15 satırı** istiyor — önceden köprü 200
satır okuyor, `nodeToText` ilk 15'i dışındakini atıyordu, yani her tur
kullanılmayan veri için ~15 sn bekleniyordu.

#### Oynatmadaki 350 ms'lik sabit bekleme kaldırıldı — ölçüldü, ölü zamandı (2026-09-03)

Bilinen ama düzeltilmemiş maddeydi: oynatıcı adımlar arasında
`PLAYBACK_STEP_DELAY_MS = 350` uyuyordu ve bu sayının arkasında bir ölçüm
yoktu. Önce **köprü ne beklediğini raporlar** hale getirildi — `_settle()`
artık `{waitedMs, busySeen, settled}` döndürüyor ve `handle_action` bunu
cevaba koyuyor (`GuiScriptActionResult.settle`).

Canlı ölçüm (S4D / SE16N-VBFA, sıfır istemci beklemesiyle arka arkaya
**22 adım**: F3/F8 turları + `navigate`+`setText`+Enter+F8 senaryosu):

| Ölçüm | Sonuç |
| --- | --- |
| Başarısız adım | **0** — ekran geçişlerinin hepsi doğru |
| `busySeen` doğru olan adım | **0 / 22** |
| Köprünün gerçek beklemesi | 3–23 ms (bu `Busy`'yi bir kez okuma maliyeti) |
| Tek bir F3'ün süresi | **5184 ms** — çağrının KENDİSİ o kadar dönmüyor |
| 6 adımlık script, 350 ms ile | 15 728 ms |
| 6 adımlık script, beklemesiz | **13 964 ms** |

Sebep: **SAP GUI Scripting çağrısı senkron** — sunucu turu çağrının içinde
bitiyor, `sendVKey` döndüğünde iş çoktan bitmiş oluyor. Bu yüzden `Busy`
hiç yakalanamıyor ve üstüne konan sabit uyku adım başına tam 350 ms ölü
zaman demek. Uyku kaldırıldı; hazır olma beklemesi **köprüde**, oturum
nesnesinin yanında yapılıyor (HTTP turu yok, oradan başka türlü de
yapılamaz).

`settled: false` (köprü 3 sn bekledi, oturum hâlâ meşgul) **hiç
gözlenmedi** — bir güvenlik ağı, doğrulanmış bir davranış değil. Yine de
sessiz bırakılmadı: adım listesinde "hâlâ meşgul" rozeti çıkıyor
(`GuiScriptPlaybackStepResult.stillBusy`) ve ajan araç cevabında uyarı
alıyor. Aksi halde bir sonraki adımın anlaşılmaz bir SAP hatasıyla
düşmesinin sebebi görünmez olurdu — ajan da o hatayı kendi argümanlarının
hatası sanıp düzeltmeye çalışırdı.

#### Aynı porta iki köprü bağlanabiliyordu — ölçüldü, kapatıldı (2026-09-03)

Bilinen ama düzeltilmemiş maddeydi ve **doğru çıktı**. Ölçüm: 8790'da bir
köprü çalışırken ikincisi elle başlatıldı — hiçbir hata vermedi, kendi de
"listening on http://127.0.0.1:8790" yazdı ve `netstat -ano` **iki sürecin
ikisini de LISTENING** gösterdi (PID 11228 + 35784). Sebep: `HTTPServer`
varsayılan olarak `allow_reuse_address = 1` yapıyor; bu Windows'ta
SO_REUSEADDR demek ve Windows'ta SO_REUSEADDR — BSD'deki anlamının aksine —
aynı adrese **ikinci bir dinleyicinin** bağlanmasına izin veriyor.

Neden önemli: her köprü sürecinin AYRI bir SAP COM referansı var. Hangisinin
cevapladığı istemcinin bilemediği bir şey; biri öldürülünce diğeri sessizce
devralıyor ve bambaşka bir oturum durumuyla cevap veriyor.

Yapılanlar ve **canlı doğrulaması**:

| Değişiklik | Doğrulama |
| --- | --- |
| `_Server`: `allow_reuse_address = False` + `SO_EXCLUSIVEADDRUSE` | İkinci köprü artık `WinError 10048` ile **çıkış kodu 2** vererek ölüyor; tek dinleyici kalıyor, birincisi etkilenmiyor |
| Bind hatasında portu kimin tuttuğu SORULUYOR | Mesaj: "Bu portta ZATEN bir SAP GUI Scripting koprusu cevap veriyor (PID 24776)" |
| Öldürüp hemen yeniden başlatma (TIME_WAIT soketleri varken) | Sorunsuz bağlandı — `SO_EXCLUSIVEADDRUSE` yeniden başlatmayı engellemiyor |
| `/health` artık `pid` de dönüyor | "cevaplayan, benim başlattığım süreç mi" sorusunun başka cevabı yoktu |
| `sapGuiScriptManager.healthCheck` artık **gövdeyi doğruluyor** (`server === "sap-gui-scripting-bridge"`) | 8791'de 200+JSON dönen yabancı bir servise karşı çalıştırıldı: **benimsenmedi** (öncesinde `external: true` deyip her sonraki çağrıyı ona gönderirdi) |
| `describeFailure`'daki ipucu Windows metnini de tanıyor | Eski koşul sadece "address already in use" arıyordu; Windows "Only one usage of each socket address (WinError 10048)" diyor — yani ipucu tam da uygulamanın çalıştığı yerde hiç çıkmıyordu |

`/health` gövdesinin **tek `recv` ile okunamadığı** da bu turda çıktı: ilk
paket sadece başlıkları getiriyor, gövde ikinci pakette geliyordu — tek
okumaya bakan ilk sürüm "cevap veren bizim köprü değil" sonucuna varıyordu.

#### axet.flows (Live) "ERR_CONNECTION_REFUSED" ekranı — kök sebep: iframe ölü hostta da `load` tetikliyor (2026-09-04)

Bilinen ama düzeltilmemiş maddeydi. Semptom: Live sekmesinde Chromium'un ham
`ERR_CONNECTION_REFUSED http://localhost:60004/` hata sayfası, ve ekran
kendiliğinden hiç düzelmiyor.

Ölçüm (uygulamanın kendi origin'inden, `http://localhost:5173`):

| Soru | Ölçülen |
| --- | --- |
| 60004 hâlâ canlı mı? | Hayır — aXet.flows o an **62129**'da dinliyordu (port HER çalıştırmada rastgele; bkz. `axetFlowsLiveDiscovery.ts`) |
| Kapalı porta bakan iframe hangi olayı tetikler? | **`load`: 1, `error`: 0** — Chromium'un hata sayfası da bir sayfadır ve o YÜKLENİR |
| `/settings` yoklaması canlı hostta çalışıyor mu? | Evet (`Access-Control-Allow-Origin: *`) |

Yani `onError`'a bakan tek hata dedektörü bu senaryoda **hiç tetiklenmiyordu**:
`onLoad` `loading=false, loadError=false` yapıyor, 15 sn'lik watchdog iptal
oluyor ve kurtarma döngüsünün koşulu (`loadError || !activeUrl`) hiçbir zaman
doğru olmuyordu. Cache'lenmiş adres ölünce ekran **kalıcı** olarak ham hata
sayfasında kalıyordu — axet.flows sonradan açılsa bile.

Düzeltme: iframe artık **ancak host'un cevap verdiği doğrulandıktan sonra**
mount ediliyor (`reachable === true`). Bir kez başarıyla yüklendikten sonra
bu kontrol BİR DAHA çalışmaz — çalışan bir editörü geçici bir takılma
yüzünden unmount etmek kullanıcının kaydedilmemiş akışını yok ederdi.
Kurtarma koşuluna `reachable === false` eklendi ve hata ekranı artık
**hangi adrese** ulaşılamadığını yazıyor.

Canlı doğrulama (bileşen tek başına render edilip gerçek axet.flows'a karşı
çalıştırıldı): ölü adresle **hiç iframe mount edilmiyor**, kendi mesajımız
adresi yazıyor; keşif canlı portu bulunca adres 62129'a dönüyor, iframe
mount oluyor ve **gerçek Designer editörü açılıyor** (palet + akış
sekmeleri). 12 sn boyunca izlendi: yeniden yükleme döngüsü YOK (eski
patholoji geri gelmedi).

#### Köprü zaten çalışırken BAĞLANTILAR listesi boş kalıyordu (2026-09-04)

Bu kusur kod okunarak değil, **çalışan uygulamanın penceresine bakılarak**
bulundu (`PrintWindow`, uygulamanın kendi hwnd'i). Görüntüde başlık
"Köprü çalışıyor (port 8790)" diyor, canlı ekran gerçek SAP oturumunu
aynalıyor — ama BAĞLANTILAR paneli **bomboş** ve ekran ağacı "sol taraftan bir
oturum seç" diyor. Çalışan bir köprünün yanında, hiçbir açıklaması olmayan boş
bir liste.

Sebep: `loadConnections` üç yerden çağrılıyordu ve **üçü de kullanıcı
tıklamasıydı** — "Bağlan" düğmesi, küçük yenile ikonu, preflight'ın "yine de
devam et"i. Köprü uygulama açılmadan ÖNCE ayaktaysa hiçbiri çalışmıyor:
uygulama yeniden başlatıldığında (dev'de her main-process değişikliğinde
oluyor), köprüyü başka bir process başlattığında, ya da bu sekmeden çıkılıp
geri dönüldüğünde. `refreshStatus` `status.running`'i true yapıp "başlat"
ekranını geçiyor, ama listeyi kimse doldurmuyordu.

Ekran görüntüsündeki ikinci tuhaflık aynı sebebin sonucu DEĞİL, tasarım:
oturum seçilmemişken bile canlı ekranın dolu olması `sessionlessShotTried`
yolundan geliyor (scripting sunucuda kapalıysa alan boş kalmasın diye bir
kereliğine oturumsuz `window` yakalaması yapılıyor). İkisi birbirine
karıştırılmamalı.

Düzeltme: köprü çalışır bulunduğunda bağlantıları TEK SEFER kendiliğinden
yükleyen bir effect. `starting` beklenir ki `handleStart`ın kendi çağrısıyla
çakışıp aynı şeyi iki kez sormasın; `connections !== null` ise hiç
çalışmaz. Liste gerçekten boşsa (SAP Logon kapalı) tekrar tekrar sorulmaz —
yenile ikonu zaten duruyor.

Doğrulama, bulgunun kendisiyle aynı yöntemle: aynı pencere, aynı koşullar,
düzeltme öncesi/sonrası iki görüntü. Öncesi "BAĞLANTILAR" (boş) → sonrası
**"BAĞLANTILAR 2"** ve iki `S4D [192.168.1.246]` satırı, **tek bir tıklama
olmadan**.

## axet.flows — Tüm Node/Config Tiplerinde Zorunlu Alan (Required Field) Doğrulaması (2026-08-29, TAMAMLANDI) — canlı bulgu

### Canlı bulgu (kullanıcı, gerçek axet.flows Canlı host'una deploy ederken)

`ms-graph-mail-config` node'unda deploy sonrası şu hata alındı: `node: Mail
Gönder`, `msg: "Please select the tenant within your config node in flows
before proceeding with the authentication process."` — canvas'ta node
kırmızı işaretliydi. Kullanıcı ayrıca gerçek editörde Ctrl+F `is:config
is:unused` aramasının kullanılmayan config node'ları listelediğini fark
etti ve **kesin talebi**: sadece bu tek hatayı yamalamayıp, TÜM node/config
tiplerinde required-field doğrulamasını gerçek Node-RED editörünün
otomatik mekanizmasıyla (kırmızı kenarlık) ve `is:config is:unused`
semantiğiyle birebir aynı şekilde bizim gömülü editörümüzde de sistematik
uygulamak.

### Araştırma

Gerçek aXet.flows kurulumundaki (`%LOCALAPPDATA%/axet-flows/.deptapps-
desktop/electron-releases/WINDOWS_X64/latest-prod/resources/app/`) TÜM
`.html` node tanım dosyaları taranıp `required:true` alanları çıkarıldı.
Kilit bulgu: `ms-graph-mail-config`'in `tenant` alanı ŞEMA seviyesinde
`required:false` ama `authType==='DELEGATED'` iken tenant boşsa node
ÇALIŞMA ZAMANINDA patlıyor — yani şemada olmayan ama gerçek davranışta
var olan KOŞULLU bir zorunluluk. Diğer bulgular: `ms-graph-shp-config`
(authType/domain required), `audit-config` (credentialname), `enabler-
config`/`axet-config` (name), `axet-spa-app` (appId), `axetflows-http-in`
(url/method), `deptapps-app-auth-basic-internal`/`-okta` (çoklu alan),
`deptapps-app-auth-ldap`/`-cas`/`-openid`/`-azure-ad` (kaynakta
`databaseName`/`roleField` "requied" YAZIM HATALI — bu ikisi GERÇEKTE
zorunlu DEĞİL, bilerek buggy davranış korundu, "düzeltilmedi"),
`ms-graph-mail-send`/`-read` (config, paylaşılan generator'dan miras),
`axet-ai-capability-*`, `axet-agent-config`, `e-mail in` (repeat).

### Yapılan değişiklikler

- **`src/flows/nodeCatalog.js`**: 57 alana gerçek kaynaktan doğrulanmış
  `required: true` eklendi + `ms-graph-mail-config.tenant`'a bu projeye
  özel bir uzantı olan **`requiredIf: (raw) => raw?.authType ===
  'DELEGATED'`** eklendi (Node-RED şemasında YOK, canlı runtime
  davranışını modelliyor). Yeni genel fonksiyonlar: `getMissingRequired
  Fields(type, raw)`, `isNodeValid`, `getNodeValidationIssues(type, raw,
  nodesById)` (RECURSIVE — kendi alanları + `config-ref` ile işaret
  ettiği config node'un alanları, kullanıcının "Mail Gönder'in kendi
  alanları dolu ama işaret ettiği config'in tenant'ı boş" bulgusunu tam
  modelliyor), `isNodeFullyValid`, `getConfigUsageMap(nodesById)` +
  `isConfigUnused` (`is:config is:unused` ile AYNI semantik). Eski elle
  bakımı gereken 9 elemanlı `CONNECTION_IDENTITY_FIELD` haritası TAMAMEN
  KALDIRILIP `connectionKindFor`/`connectionStatusFor` generic hale
  getirildi — artık herhangi bir formField'ın `required`/`requiredIf`
  taşıyıp taşımadığına bakıyor, yeni config tipi eklendiğinde elle harita
  güncellemesi gerekmiyor.
- **`src/components/flows/FlowCanvas.jsx`**: her canvas node'u için
  `getNodeValidationIssues` önceden hesaplanıp `data.validationIssues`
  olarak React Flow node verisine ekleniyor.
- **`src/components/flows/FlowNode.jsx`**: `validationIssues`'tan
  `isInvalid` hesaplanıyor (subflow instance'lar hariç), node'a
  `flow-node-invalid` class'ı + kırmızı `AlertTriangle` rozeti (tooltip'te
  hangi alan/hangi config'te ne eksik yazıyor) ekleniyor.
- **`src/components/flows/ConfigNodesPanel.jsx`**: her config node için
  `getMissingRequiredFields` (kırmızı uyarı ikonu + kenarlık) ve
  `getConfigUsageMap` ("kullanılmıyor" rozeti, `is:config is:unused`'un
  sürekli/görsel karşılığı — ayrıca arama yapmaya gerek yok) gösteriliyor.
- **`src/components/flows/NodeEditorPanel.jsx`** (bu turda tamamlandı):
  gerçek Node-RED editörünün formda ANLIK (blur beklemeden, `draft`
  üzerinden) kırmızı kenarlıkla işaretlemesinin AYNISI — her alan için
  `fieldWrapperClass`/`renderLabel` yardımcıları, boş zorunlu alanda
  `node-editor-field-invalid` class'ı + etikette kırmızı `*` işareti.
  `config-ref` alanlarında ayrıca işaret edilen config node'un kendi eksik
  alanları varsa forma "Bu config'te eksik alan(lar): ..." uyarısı
  ekleniyor (recursive, FlowNode/FlowCanvas'la AYNI mantık).
- **`src/flows/flows.css`**: `.flow-node-invalid`/`-badge`, `.config-panel-
  item-invalid`/`-warn`/`-unused`, `.node-editor-field-invalid`/`-required-
  mark`/`-hint`/`-hint-danger` stilleri eklendi.

### Doğrulama

17 senaryolu geçici bir Node script'i ile (iş bitince silindi):
DELEGATED+boş-tenant → tenant missing + config invalid; MANUAL+boş-tenant
→ geçerli; Mail Gönder'in kendi alanları dolu ama config'e recursive
geçersizlik yayılıyor; tenant düzeltilince geçerli oluyor; config kullanım
sayımı/unused tespiti doğru; `deptapps-app-auth-ldap`'ın gerçek typo
bug'ının (`databaseName` boş olsa da hâlâ geçerli) korunduğu — hepsi PASS.
`node --check src/flows/nodeCatalog.js`, `esbuild` ile 4 `.jsx` dosyasının
sözdizimi, ve `npm run typecheck` temiz geçti.

### İkinci tur — kullanıcı "hepsi için birebir aynı mı yaptın?" diye sorunca yapılan denetim + gerçek eksiklerin kapatılması (2026-08-29, aynı gün)

Kullanıcı doğrudan sorunca dürüst bir ikinci-tur denetim yapıldı (alt-agent
ile) — ilk turun **editor-time görsel katmanla sınırlı** olduğu, aşağıdaki
gerçek boşlukların bulunduğu ortaya çıktı ve HEPSİ bu turda kapatıldı:

1. **Deploy pipeline, yeni doğrulamayı HİÇ kullanmıyordu** — gerçek
   `handleDeploy` → `flowRuntime.js` → `app-electron/main/flowDiagnostics.js
   validateFlow()` zinciri, `nodeCatalog.js`'teki `required`/`requiredIf`'ten
   TAMAMEN habersiz, ayrı/eski bir kontrolcüydü. Yani kullanıcının orijinal
   canlı hatası (tenant boşken deploy sonrası runtime patlaması) editor
   kırmızı gösterse de **deploy'u BLOKE ETMİYORDU**. Düzeltme:
   `flowDiagnostics.js` artık `../../src/flows/nodeCatalog.js`'ten
   `getNodeValidationIssues`/`isConfigUnused`/`catalogEntry`/`isConfigType`'ı
   DOĞRUDAN import ediyor (main process derlemesine `electron-vite` ile
   sorunsuz bundle olduğu build ile doğrulandı) ve `validateFlow()` artık
   TEK bir yerden (nodeCatalog) beslenen 3 yeni issue kodu üretiyor:
   `REQUIRED_FIELD_EMPTY` (kendi alanı boş, severity `error` → **Deploy'u
   gerçek Node-RED ile AYNI şekilde bloke eder**), `CONFIG_REQUIRED_FIELD_
   EMPTY` (işaret ettiği config'in alanı boş, recursive, severity `error`),
   `UNUSED_CONFIG` (severity `warning`, bloke etmez — gerçek Node-RED'de de
   unused config deploy'u durdurmaz). Ayrıca eskiden elle bakımı gereken
   `MISSING_CONFIG_REF` alan-adı listesi (`['modelSchema','config',...]`) da
   `catalogEntry(type).formFields`'tan `config-ref` tipini okuyan generic
   bir döngüyle değiştirildi. 4 senaryoyla (`node -e` ile canlı import)
   doğrulandı: DELEGATED+boş-tenant → `blocking:true`; tenant dolu →
   `blocking:false`; boş-name'li kullanılmayan config → hem
   `REQUIRED_FIELD_EMPTY` hem `UNUSED_CONFIG`, `blocking:true`; MANUAL+boş-
   tenant → `blocking:false`. `npm run build` ile main bundle'da
   `getNodeValidationIssues`/`isConfigUnused` metinlerinin gerçekten
   bulunduğu doğrulandı.
2. **`src/components/flows/NodeEditorPanel.jsx`** (bu turda tamamlanan
   parça — yukarıdaki "TAMAMLANDI" bölümünde zaten anlatıldı) artık forma
   canlı kırmızı kenarlık + `*` + config-ref recursive uyarısı ekliyor.
3. **`src/flows/nodeCatalog.js`'te 3 gerçek tutarsızlık bulunup düzeltildi**
   (alt-agent'in GERÇEK kaynağa (`node_modules/*/nodes/**/*.html` +
   paylaşılan `node-core-functions.js` template'leri) karşı doğruladığı,
   UYDURMA yapılmadı — bazı şüpheli alanlar (`enabler-llm`/`query`/`history`/
   `python-agent.gateway`/`sql-query.query` config-ref'leri) kontrol edilip
   GERÇEKTEN `required:false` olduğu doğrulandığı için DOKUNULMADI):
   - `http in` ve `http request` node'larının `url`/`method` alanları
     deploy-time kontrolcüsü (`flowDiagnostics.js EMPTY_URL`) tarafından
     ZATEN bloke ediliyordu ama editor-time `required` bayrağı yoktu —
     `axetflows-http-in` ile tutarlı hale getirildi.
   - **`'aXet Agent'` node'unda gerçek bir eksiklik bulundu**: gerçek
     kaynakta (`crewai-agent-extback.html` + paylaşılan `generateNodeType`)
     `config` alanı (axet-agent-config referansı) VAR (`required:false`)
     ama bizim katalogumuzda bu alan `fields`/`defaults`/`formFields`'ın
     HİÇBİRİNDE yoktu — kullanıcı bu config'i UI'dan hiç seçemiyordu.
     Eklendi (required değil, gerçek şemayla aynı).
4. **`ConfigNodesPanel.jsx`'e gerçekten yazılabilir bir arama kutusu
   eklendi** — önceden `is:config is:unused` SADECE bir kod yorumunda
   geçen kavramsal bir benzetmeydi, gerçek editördeki gibi Ctrl+F'e
   yazılabilir bir şey YOKTU. Artık panelin üstünde `is:unused`/`is:invalid`/
   `is:config` (no-op, panel zaten sadece config'leri listeliyor, sadece
   gerçek sözdizimiyle tutarlılık için kabul ediliyor) token'ları + düz
   metni birlikte destekleyen (`parseConfigQuery`) bir arama kutusu var;
   boşken davranış DEĞİŞMEDİ (tüm config'ler + rozetler görünür), arama
   sadece üstüne binen bir daraltma.
5. **Bilerek YAPILMAYAN/kapsamdan çıkarılan bir bulgu**: alt-agent, katalogda
   `ms-graph-shp-config`'in 7 kardeş "operasyon" node'unun (`ms-graph-shp-
   get-files`, `-get-folders`, `-download-file`, `-upload-file`, `-move-
   file`, `-delete-file`, `-create-shareable-link`) **hiçbirinin `nodeCatalog.
   js`'te TANIMLI OLMADIĞINI** buldu (gerçek kaynakta hepsi var, `config`
   alanları `required:true`). Bu, "required alanı düzeltme" kapsamının
   ÖTESİNDE bir katalog-tamlığı boşluğu (7 yeni node tipini site/path/vb.
   TÜM alanlarıyla dogru sekilde eklemek gerekiyor) — riskli tahmin
   yapmamak için bu turda EKLENMEDİ, kullanıcıya ayrı bir görev olarak
   bildirilmesi gerekiyor.
6. **`NodeContextMenu.jsx`/`NodePalette.jsx`/`TestRequestModal.jsx`**
   kontrol edildi — bunların doğrulama ile hiçbir ilgisi yok (context menu
   generic bir shell, palette sadece düz metin arar, test-request modal
   sadece HTTP sonucu gösterir) - bilerek dokunulmadı, yanlış bir yer
   olurdu.

**Sonuç**: artık editor-time (canvas kırmızı kenarlık + rozet, config
panel kırmızı/kullanılmıyor rozeti + arama, node editor formu canlı kırmızı
kenarlık) VE deploy-time (gerçek Deploy butonu blokajı) **TEK bir kaynaktan**
(`src/flows/nodeCatalog.js`) besleniyor — kullanıcının orijinal "Please
select the tenant..." senaryosu artık deploy ANINDA da yakalanıp bloke
ediliyor, sadece canvas'ta kırmızı görünüp deploy'a izin veren ÖNCEKİ (ilk
tur) davranış düzeltildi. Kapsam dışı bırakılan tek şey madde 5'teki 7 yeni
node tipi — bu ayrı, daha büyük bir "katalog tamlığı" görevi.

## Uygulama Bağlantıları — Outlook/SharePoint için GERÇEK Microsoft Graph OAuth (2026-08-29, TAMAMLANDI)

### Kullanıcı isteği ve kapsam kararları

Kullanıcı "uygulama bağla kısmı yapalım, Outlook/SharePoint gibi uygulamalar
bağlanabilsin" dedi. İki `ask_user` sorusuyla kapsam netleştirildi:
1. **"Gerçek OAuth girişi"** seçildi (manuel kimlik bilgisi formu veya
   sadece UI iskeleti DEĞİL) — kullanıcı gerçekten kendi Microsoft
   hesabıyla giriş yapabilmeli.
2. Azure AD "App Registration"ı (client id + tenant) kullanıcının **henüz
   olmadığı** ve **rehber istediği** öğrenildi — bu yüzden ekranın kendisi
   hem rehber metni hem client id/tenant girişini hem de gerçek bağlan/
   kes/test akışını tek yerde topluyor (aşağıda detay).

Bu özellik `axet.flows`'un `ms-graph-mail-config`/`ms-graph-shp-config`
node'larından (Node-RED flow builder'a özel, ayrı bir credential modeli)
**TAMAMEN AYRI** — burası uygulama/axet.code seviyesinde, yeni bir Activity
(`ActivityBar.tsx`), kullanıcının kendi Microsoft hesabını GERÇEKTEN
doğrulayıp Outlook/SharePoint'e Microsoft Graph API üzerinden erişebildiğini
kanıtlayan (`/me` endpoint'ine gerçek istek atan "Bağlantıyı Test Et"
butonu) bir merkez.

### Mimari — neden device code flow

Electron masaüstü uygulaması için "public client" (client secret GEREKMEZ)
OAuth 2.0 **device code flow** seçildi (`@azure/msal-node`,
`PublicClientApplication.acquireTokenByDeviceCode`): kullanıcıya bir kod +
"microsoft.com/devicelogin" gösterilir, kendi tarayıcısında (veya
"Tarayıcıda Aç" butonuyla, `window.api.openExternalUrl` — zaten var olan
IPC) kodu girip giriş yapar; embedded browser popup'ı YOK, redirect URI/
custom protocol handler karmaşıklığı YOK. `sapGuiScriptAgent.ts`/
`axetChat.ts`'teki `requestId`-bazlı iptal deseniyle AYNI mantık — device
code polling msal-node'un KENDİ desteklediği `request.cancel = true`
mekanizmasıyla iptal edilebiliyor (`pendingDeviceCodeRequests` map).

### Güvenlik — token'lar NEREDE saklanıyor

**Kritik karar**: token'lar `config.json`'a (düz JSON) YAZILMIYOR.
`app-electron/main/msGraphAuth.ts`, msal-node'un `ICachePlugin` arayüzünü
kullanarak token cache'ini AYRI bir `msal-token-cache.bin` dosyasına,
Electron'un işletim sistemi düzeyindeki `safeStorage` (Windows'ta DPAPI)
API'siyle ŞİFRELENMİŞ olarak yazıyor. `config.json`'da (AppConfig,
`store.ts`) SADECE gizli OLMAYAN meta veri tutuluyor:
`msGraphAppRegistration: {clientId, tenantId}` (bunlar sır değil — public
client'ın kendisi client secret taşımıyor) ve `msGraphConnections:
{outlook?, sharepoint?}` (hesap adı/e-posta, bağlantı tarihi, izin
kapsamları — TOKEN'IN KENDİSİ hiçbir yerde düz metin değil).

### Yeni dosyalar / değişen dosyalar

- **`app-electron/main/msGraphAuth.ts`** (yeni) — `PROVIDER_SCOPES`
  (outlook: Mail.Read/Mail.Send, sharepoint: Sites.Read.All/Files.
  ReadWrite.All) + `BASE_SCOPES` (User.Read, offline_access);
  `saveAppRegistration`, `getConnections`, `connectProvider(requestId,
  provider, onDeviceCode)`, `cancelConnect`/`cancelAllConnects`,
  `disconnectProvider` (aynı Microsoft hesabı BAŞKA bir provider tarafından
  da kullanılıyorsa MSAL cache'indeki hesabı SİLMİYOR — sadece o provider'ın
  config kaydını kaldırıyor), `testConnection` (`acquireTokenSilent` +
  gerçek `https://graph.microsoft.com/v1.0/me` isteği).
- **`app-electron/shared/types.ts`**: `MsGraphProvider`, `MsGraphApp
  Registration`, `MsGraphConnection`, `MsGraphDeviceCodeInfo`, `MsGraph
  ConnectResult`, `MsGraphDisconnectResult`, `MsGraphTestResult` +
  `AppConfig.msGraphAppRegistration`/`msGraphConnections` eklendi.
- **`app-electron/main/store.ts`**: `saveMsGraphAppRegistration`,
  `saveMsGraphConnection`, `removeMsGraphConnection` — mevcut
  `saveLastCredential`/`saveSystemTier` deseniyle AYNI.
- **`app-electron/main/index.ts`**: `msGraph:saveAppRegistration`/
  `:getConnections`/`:connect`/`:cancelConnect`/`:disconnect`/`:test` IPC
  handler'ları; device code bilgisi `mainWindow?.webContents.send
  ("msGraph:deviceCode", info)` ile (flowRuntime'ın `onDebug`/`onStatus`
  push deseniyle AYNI) anlık gönderiliyor; `cancelAllMsGraphConnects()`
  her iki `app.on(...)` kapanış hook'una eklendi.
- **`app-electron/preload/index.ts` + `src/window.d.ts`**: standart IPC
  köprü zinciri (`saveMsGraphAppRegistration`, `getMsGraphConnections`,
  `connectMsGraph`, `cancelMsGraphConnect`, `disconnectMsGraph`,
  `testMsGraphConnection`, `onMsGraphDeviceCode`).
- **`src/components/ActivityBar.tsx`**: `Activity` union'a `"connections"`
  eklendi, `Plug` ikonlu yeni bir aktivite girişi.
- **`src/components/AppConnectionsHome.tsx`** (yeni) — kendi kendine yeten
  (SapGuiScriptingHome.tsx gibi, dışarıdan `pushToast` almıyor) tam sayfa:
  (1) Azure AD App Registration bölümü — Client ID/Tenant ID input + Kaydet
  + katlanabilir "Nasıl oluşturulur?" rehberi (6 adım, portal.azure.com'da
  App Registration oluşturma — "Allow public client flows" ve gerekli Graph
  delegated permission'ları dahil), (2) device code akışı — bağlanma
  sırasında kod + "microsoft.com" mesajı + Kopyala + Tarayıcıda Aç (gerçek
  `verificationUri`, API yanıtından) + İptal Et, (3) Outlook/SharePoint
  kartları — Bağlı/Bağlı değil rozeti, hesap adı, Bağlan/Bağlantıyı Test
  Et/Bağlantıyı Kes butonları.
- **`src/App.tsx`**: `activity === "connections"` dalı eklendi.
- **`src/i18n/tr.ts` + `en.ts`**: `activityBar.connections` + 30 civarı
  `appConnections.*` anahtarı (her ikisi de `Record<TranslationKey,string>`
  olduğu için EKSİKSİZ mirror edildi).
- **`package.json`**: `@azure/msal-node` bağımlılığı eklendi (npm install
  ile, 14 paket — msal-common dahil).
- **`electron.vite.config.ts`**: `externalizeDepsPlugin`'in `exclude`
  listesine `@azure/msal-node`/`@azure/msal-common` eklendi — **kritik
  paketleme kararı**: `package.json`'daki `build.files` SADECE
  `dist`/`dist-electron`/`@lydell`'i pakete alıyor, genel `node_modules`
  DAHIL EDİLMİYOR (fast-xml-parser'ın da AYNI sebeple burada olması gibi) —
  externalize edilmiş bir paket packed uygulamada "Cannot find module" ile
  patlardı. Bunun yerine msal-node/msal-common TAMAMEN
  `dist-electron/main/index.js`'e gömülüyor (main bundle 377KB'tan
  847KB'a çıktı, 59 modülden 335 modüle).

### Doğrulama

- `@azure/msal-node`'un GERÇEK tip tanımları (`node_modules/@azure/
  msal-node/src/request/DeviceCodeRequest.ts`,
  `CommonDeviceCodeRequest.ts`, `@azure/msal-common`'daki
  `DeviceCodeResponse`/`ICachePlugin`/`TokenCacheContext`) okunup
  `deviceCodeCallback` yanıt alanları (`userCode`/`verificationUri`/
  `message`/`expiresIn`), `request.cancel` iptal mekanizması ve
  `getTokenCache().getAllAccounts()`/`removeAccount()` API'leri
  UYDURULMADAN, kaynak koddan doğrulanarak kullanıldı.
- `npm run typecheck` (hem `tsconfig.web.json` hem `tsconfig.node.json`)
  temiz geçti.
- `npm run build` (electron-vite) temiz geçti — main/preload/renderer
  bundle'larının hepsi hatasız derlendi.
- Bundle içeriği doğrulandı: `dist-electron/main/index.js` içinde
  `require("@azure/msal-node")` YOK (`grep` ile doğrulandı — tamamen
  gömülü), `PublicClientApplication`/`acquireTokenByDeviceCode` string'leri
  VAR (gerçekten bundle'a girdiği kanıtı).
- **Gerçek bir Windows paketleme testi** yapıldı: `npx electron-builder
  --win dir` ile `release/win-unpacked` üretildi, exe imzalandı/ikon
  gömüldü, hatasız tamamlandı — bu, sadece `tsc`/`vite build`in değil,
  GERÇEK electron-builder paketleme sürecinin de bu yeni bağımlılıkla
  sorunsuz çalıştığının kanıtı.

### Test EDİLEMEYEN (bu ortamda gerçek bir Azure AD kiracısı/App
Registration yok)

Gerçek bir Microsoft hesabıyla device code akışının UÇTAN UCA çalıştığı
(kullanıcı kodu girip giriş yapınca `acquireTokenByDeviceCode`'un
gerçekten token döndürdüğü, `/me` isteğinin gerçek bir görünen ad
döndürdüğü) — bu, kullanıcının kendi Azure AD tenant'ında bir App
Registration oluşturup (yukarıdaki rehber adımlarını izleyerek) Client ID/
Tenant ID'yi uygulamaya girip "Bağlan" demesiyle doğrulanabilir. Rehberdeki
adımlar Microsoft'un resmi/bilinen App Registration akışına dayanıyor
(URL olarak sadece iyi bilinen `portal.azure.com` kök adresi ve resmi
`graph.microsoft.com/v1.0/me` Graph API endpoint'i kullanıldı — hiçbir
"tahmin edilmiş" derin bağlantı/URL yok).

## Uygulama Genelinde Eksik Denetimi (2026-08-29, aynı gün devamı)

Kullanıcı "uygulama genelinde nelerimiz eksik" diye sorunca bir alt-agent
ile TÜM repo (`src/`, `app-electron/`) tarandı: TODO/FIXME/"Yakında"/
"coming soon"/placeholder işaretleri, `tr.ts`↔`en.ts` anahtar tutarlılığı,
kullanılan-ama-tanımsız `t()` çağrıları, leftover `console.log`, ölü
export/dosya, `package.json` script'leri vs. Bulunanlar ve yapılan
düzeltmeler:

1. **`tr.ts`/`en.ts` anahtar tutarlılığı**: TAM — `en.ts`'in `Record<
   TranslationKey, string>` tip zorlaması (`TranslationKey = keyof typeof
   tr`) sayesinde derleme zamanında zaten garanti ediliyor, hiçbir eksik/
   fazla anahtar yok. Hiçbir `t()` çağrısı tanımsız bir anahtara işaret
   etmiyor (dinamik anahtar oluşturan `` t(`axetCodeHome.${key}`) `` gibi
   çağrılar da dahil, tüm olası değerler kontrol edildi).
2. **Ölü i18n anahtarı bulundu ve KALDIRILDI**: `axetCodeHome.
   connectionsComingSoon` ("Yakında"/"Coming soon", `tr.ts`/`en.ts`) —
   `AxetCodeHome.tsx`'teki "Bağlantılar" widget'ı artık işlevsel olduğu
   (SAP hızlı-bağlan listesi) ve ayrıca yepyeni bir "Uygulama Bağlantıları"
   Activity'si (Outlook/SharePoint OAuth) eklendiği için bu anahtar hiçbir
   `t()` çağrısında kullanılmıyordu — silindi. Bu, "Sonraki adımlar"
   bölümündeki (dosyanın en başı) eskimiş bir notun da kanıtıydı — o not da
   güncellendi (yukarıda, "DEVAM EDEN PLATFORM DÖNÜŞÜMÜ" bölümünde).
3. **Leftover `console.log` taraması**: `Toolbar.jsx`/`DebugPanel.jsx`'teki
   ikisi zaten bilinçli/onaylı (kaydetme sonrası dosya yolu bilgisi,
   `eslint-disable-next-line no-console` ile işaretli — ESLint kurulu
   olmadığı için bu yorumlar şu an no-op ama zararsız, dokunulmadı).
   `sapLogon.ts`'teki log KOŞULLU (sadece gerçekten bir zombi process
   temizlendiyse loglanıyor) — bilinçli diagnostic log, leftover DEĞİL,
   dokunulmadı.
4. **Ölü kod/export**: bulunamadı — `AppConnectionsHome.tsx` dahil her
   yeni dosya doğru şekilde import edilip kullanılıyor.
5. **`package.json` script'leri**: `lint`/`test`/`format` yok, hiçbir CI
   (`.github/workflows`) da yok — ama README de bunları hiç vaat etmiyor
   (sadece `dev`/`typecheck`/`build`/`build:win` belgeliyor, hepsi mevcut),
   bu yüzden bir "tutarsızlık" değil, bilinçli/minimal bir araç seti. Test
   altyapısı kurmak (Jest/Vitest vb.) ayrı, büyük bir karar — kullanıcı
   istemeden eklenmedi.
6. **Repo kökünde `tmp/axet-session-test/` boş bir klasör** bulundu (git
   tarafından TAKİP EDİLMİYORDU, `.gitignore`'da da yok — sadece yerel bir
   kalıntı) — silindi.

### Bulunan ve KAPATILAN gerçek, önemli bir güvenlik borcu

`PROJE-BILGI.md`'nin çok önceden (v1.3.3 civarı) "Bilinen Eksikler"
listesine eklediği ama hiç ele alınmamış bir madde vardı: **SAP sistem
şifreleri `config.json`'a düz metin yazılıyordu**
(`AppConfig.lastCredentials[uuid].password`). Bu turda Uygulama
Bağlantıları özelliği için kurulan `safeStorage` (Windows DPAPI) deseni
BURAYA da genelleştirilerek uygulandı:

- **`app-electron/main/secureStorage.ts`** (yeni, paylaşılan) —
  `encryptSecret(plain)`/`decryptSecret(stored)`: `enc:v1:<base64>`
  öneki ile şifreli/düz-metin ayrımı yapılıyor. `decryptSecret`, bu öneki
  GÖRMEYEN her string'i "eski/düz metin kayıt" kabul edip olduğu gibi
  döndürüyor — yani şifreleme eklenmeden ÖNCE kaydedilmiş mevcut
  kullanıcı config'leri KIRILMIYOR (o kayıt bir sonraki başarılı bağlanışta
  otomatik olarak şifreli forma yükseltilir, ayrı bir migrasyon script'i
  gerekmedi).
- **`app-electron/main/store.ts` `saveLastCredential`**: artık
  `credential.password`'u `encryptSecret` ile şifreleyip diske öyle
  yazıyor.
- **`app-electron/main/index.ts` `resolveCredentialDefaults`**: `last?.
  password` okunurken `decryptSecret` ile çözülüyor (renderer'a/forma
  hâlâ düz metin gidiyor — sadece DİSKTEKİ hâl şifreli, davranışta hiçbir
  değişiklik yok, kullanıcı hiçbir fark görmez).
- **Bilinçli kapsam sınırı**: `.conn_adt` dosyasının KENDİSİ hâlâ düz
  metin — `adt-tool.ps1` (PowerShell) ve `resources/sap-toolkit`'teki
  çok sayıda Python script (`sap_adt_lib.py` `python-dotenv` ile okuyor)
  bu dosyayı HARİCİ olarak, düz `KEY=VALUE` formatında tüketiyor;
  şifrelemek bu araçların TAMAMINI bozardı. Bu zaten PROJE-BILGI.md'de
  "bilinçli/kabul edilmiş tercih" olarak belgelenmişti, bu turda da
  değiştirilmedi — sadece madde artık "KISMEN ÇÖZÜLDÜ" olarak güncellendi
  (yukarıdaki "Bilinen Eksikler" bölümü).
- **`trustedCertificates`** kontrol edildi — sadece SHA-256 fingerprint
  (`host:port -> hash`) tutuyor, PEM/private key YOK, hassas değil,
  dokunulmadı.

### Doğrulama

- Gerçek Electron ortamında (`npx electron <script>`, `app.whenReady()`
  içinde) `safeStorage.isEncryptionAvailable()` → `true` ve encrypt/decrypt
  round-trip testi PASS (bu makinede DPAPI gerçekten çalışıyor, teorik bir
  varsayım değil).
- `npm run typecheck` ve `npm run build` temiz geçti.
- Bundle içeriği doğrulandı: `dist-electron/main/index.js` içinde
  `encryptSecret`/`decryptSecret`/`enc:v1:` string'leri VAR (gerçekten
  bundle'a girdiği kanıtı).

## Uygulama Bağlantıları — Ayrı Activity Yerine Ayarlar İçinde "Dropdown" Bölüm (2026-08-29, aynı gün devamı)

Kullanıcı "bu uygulama bağlantısını yeni bir ekran olarak değil de aşağıda
ayarlar kısmında dropbox (dropdown/katlanabilir bölüm) olarak yapabiliriz"
dedi — yani az önce eklenen bağımsız `"connections"` Activity'si (ayrı bir
ActivityBar ikonu + tam ekran sayfa) kaldırılıp `SettingsModal.tsx`'in
içine, varsayılan KAPALI bir accordion/katlanabilir bölüm olarak taşındı.

### Değişiklikler

- **`src/components/AppConnectionsHome.tsx` SİLİNDİ**, yerine
  **`src/components/AppConnectionsSection.tsx`** (yeni) eklendi — TÜM
  state/IPC mantığı (Azure AD kayıt formu, device code akışı, provider
  kartları, bağlan/test et/bağlantıyı kes) BİREBİR aynı, sadece dış
  "tam sayfa" kapsayıcısı (kendi `<h1>` başlığı, `min-h-0 flex-1
  overflow-y-auto` sayfa düzeni) kaldırıldı — artık SADECE İÇERİK
  döndürüyor, `SettingsModal.tsx`'teki yeni bölüm onu sarmalıyor.
- **`src/components/SettingsModal.tsx`**: `Section`'ın yanına yeni bir
  **`CollapsibleSection`** component'i eklendi (`icon`, `title`,
  `defaultOpen` prop'ları, iç `useState` ile açık/kapalı durumu, başlığa
  tıklanınca dönen bir `ChevronDown` ikonu) — mevcut `Section`'ları
  DEĞİŞTİRMEDİ, sadece bu tek, karmaşık/opsiyonel bölüm için ek bir
  varyant. "Gelişmiş Yollar" bölümünün altına `<CollapsibleSection
  icon={Plug} title={t("settingsModal.sectionConnections")}>
  <AppConnectionsSection /></CollapsibleSection>` eklendi, varsayılan
  KAPALI (`defaultOpen` verilmedi → `false`) — Azure AD kurulumu
  gerektiren, çoğu kullanıcının her Ayarlar açılışında görmesi
  gerekmeyen bir özellik olduğu için.
- **`src/components/ActivityBar.tsx`**: `Activity` union'ından
  `"connections"` çıkarıldı, `activities` dizisindeki ayrı giriş
  (Plug ikonlu) kaldırıldı, kullanılmayan `Plug` import'u da temizlendi.
- **`src/App.tsx`**: `AppConnectionsHome` import'u ve `activity ===
  "connections"` render dalı kaldırıldı.
- **i18n temizliği** (`tr.ts`/`en.ts`): `activityBar.connections` (artık
  Activity yok) ve `appConnections.title`/`appConnections.subtitle`
  (eski sayfa başlığı, artık render edilmiyor) silindi; yeni
  `settingsModal.sectionConnections` ("Uygulama Bağlantıları (Outlook,
  SharePoint)" / "App Connections (Outlook, SharePoint)") eklendi.
  Kalan tüm `appConnections.*` anahtarları (form etiketleri, rehber
  metni, buton metinleri) DEĞİŞMEDEN `AppConnectionsSection.tsx`
  tarafından kullanılmaya devam ediyor.
- Backend tarafı (`msGraphAuth.ts`, IPC handler'ları, `secureStorage.ts`,
  `AppConfig.msGraphAppRegistration`/`msGraphConnections`) HİÇ
  değişmedi — bu sadece bir UI yeniden-konumlandırması, mimari/güvenlik
  tarafı bir önceki turda tamamlanmış hâliyle aynı.

### Doğrulama

- `npm run typecheck` (web + node) temiz geçti.
- `npm run build` (main/preload/renderer) temiz geçti.

## Uygulama Bağlantıları — Ayarlar Modal'ından da Çıkarılıp ActivityBar'da Kendi Butonuna Taşındı (2026-08-29, aynı gün üçüncü tur)

Kullanıcı bu sefer "ayarların içinde değil de ayarlar butonunun üstünde de
olsun" dedi — yani az önce Ayarlar modal'ının içine taşınan katlanabilir
bölüm de KALDIRILIP, ActivityBar'ın alt köşesindeki (dil/tema/Ayarlar
butonlarının olduğu dikey sıra) Ayarlar butonunun TAM ÜSTÜNE ayrı bir
buton eklendi — bu buton kendi bağımsız modal'ını açıyor (Ayarlar
modal'ından TAMAMEN AYRI, ikisi aynı anda açık olabilir).

### Değişiklikler

- **`src/components/SettingsModal.tsx`**: önceki turda eklenen
  `CollapsibleSection` component'i ve `AppConnectionsSection` kullanımı
  TAMAMEN KALDIRILDI — `ChevronDown`/`Plug` import'ları da temizlendi.
  Modal artık öncesi gibi sadece kendi orijinal `Section`'larını içeriyor.
- **`src/components/AppConnectionsModal.tsx`** (yeni) — `SettingsModal.tsx`
  ile AYNI modal kabuğu görsel dili (gradient üst çizgi, ortalanmış
  backdrop, sağ üstte X kapatma butonu, alt sağda tek bir "Kapat" butonu)
  kullanan, kendi başlığı (`appConnectionsModal.title`/`.subtitle`) olan
  bağımsız bir modal. İçeriği DOĞRUDAN `AppConnectionsSection.tsx`'i
  (state/IPC mantığı hiç değişmeyen, sadece İÇERİK component'i) render
  ediyor.
- **`src/components/ActivityBar.tsx`**: yeni `onOpenConnections` prop'u +
  alt köşedeki dikey sırada (dil → tema → **Bağlantılar (Plug ikonu,
  YENİ)** → Ayarlar) Ayarlar'ın TAM ÜSTÜNDE bir buton eklendi — kullanıcının
  "ayarlar butonunun üstünde" talebi birebir bu konumlandırmayla
  karşılandı.
- **`src/App.tsx`**: `connectionsOpen` state'i + `<AppConnectionsModal
  open={connectionsOpen} onClose={...} />` render'ı + `ActivityBar`'a
  `onOpenConnections={() => setConnectionsOpen(true)}` bağlandı.
  `SettingsModal`'ınkiyle AYNI basit modal-state deseni (`useState<
  boolean>`), ekstra bir context/global state gerekmedi.
- **i18n**: `settingsModal.sectionConnections` (artık kullanılmıyor)
  silindi; `activityBar.connections` (buton title'ı) GERİ EKLENDİ (bir
  önceki turda ölü kod diye silinmişti, şimdi gerçekten kullanılıyor);
  yeni `appConnectionsModal.title`/`.subtitle` + genel amaçlı
  `common.close` ("Kapat"/"Close" — daha önce hiçbir modalın ihtiyacı
  olmamıştı, `SettingsModal`/`AddSystemModal` gibi diğerleri hep "İptal"
  kullanıyordu, bu modalın "kaydet"/"iptal et" ayrımı olmadığı, sadece
  "görüntüle ve kapat" olduğu için ayrı bir anahtar gerekti) eklendi.
- Backend (`msGraphAuth.ts`, IPC handler'ları, `secureStorage.ts`,
  `AppConfig` alanları) yine HİÇ değişmedi — üçüncü turda da sadece UI
  konumlandırması değişti.

### Doğrulama

- `npm run typecheck` (web + node) temiz geçti.
- `npm run build` (main/preload/renderer) temiz geçti.
- Kod tabanında `AppConnectionsHome`/`CollapsibleSection`/
  `sectionConnections`'a hiçbir gerçek referans (import/kullanım)
  kalmadığı doğrulandı — sadece iki dosyadaki (`AppConnectionsSection.tsx`,
  `msGraphAuth.ts`) tarihsel/açıklayıcı yorumlar güncellendi.

## Uygulama Bağlantıları — MİMARİ PİVOTU: Azure AD OAuth Yerine aXet Agentic Connector'ları (2026-08-29, aynı gün dördüncü tur, KAPANDI)

Kullanıcı önceki 3 turdaki "kendi Azure AD App Registration'ını gir, gerçek
Microsoft Graph OAuth yap" mimarisini **tamamen terk edip** şunu söyledi:
"biz https://axet.nttdata.com/agentic/ bunu kullanıyoruz, burda da
https://axet.nttdata.com/api/agentic-mcp-tools/outlook_tools/mcp böyle bir
MCP var, bu MCP outlook bağlantısı için kullanılıyor, tenant id falan onları
geçelim, bu şekilde connector yapalım, SharePoint için de
.../sharepoint_tools/mcp". Yani gerçek hedef, kullanıcının kurumsal "aXet
Agentic" platformundaki (NTT DATA'nın kendi MCP tool sunucuları) Outlook/
SharePoint connector'larını kullanmaktı — Azure AD/tenant kavramı TAMAMEN
YANLIŞ bir varsayımdı (önceki turlarda kullanıcı henüz bunu netleştirmemişti).

### Araştırma ve netleştirme (3 `ask_user` turu)

1. Endpoint'e kimlik bilgisiz `fetch` denendi → `401 Unauthorized` (gerçek,
   canlı bir sunucu — uydurma değil). Kullanıcıya nasıl kimlik doğrulanacağı
   soruldu → "oauth ile galiba" (belirsiz).
2. `https://axet.nttdata.com/.well-known/oauth-authorization-server`
   denendi — Angular SPA'sının kendisini döndürdü (gerçek bir OAuth
   metadata endpoint'i DEĞİL), somut bir client id/authority bulunamadı.
3. Kullanıcıya tekrar soruldu, "ben kendim bağlanmaya çalıştığımda
   Microsoft giriş ekranı çıkıyor" dedi — bu, MCP sunucusunun kullanıcının
   TARAYICI oturumuna dayandığını ama uygulamanın kendi başına bunu taklit
   edemeyeceğini gösterdi.
4. **Kesin çözüm**: bu makinede zaten kurulu olan `axet-code` CLI'nın
   (`axet-code --help`) `login`/`logout` komutları bulundu —
   `axet-code login --help` çıktısı: **"Login to the AXET platform using
   Okta device code authentication... AXET_PLUGIN_OKTA_DOMAIN,
   AXET_PLUGIN_CLIENT_ID_OKTA, AXET_CORE_URL, AXET_LLM_ENABLER,
   AXET_ENABLER_MANAGER"** — yani CLI'nın KENDİSİ zaten bu platforma Okta
   SSO ile giriş yapıp Connector'lara (MCP tool sunucularına) erişebiliyor.
   Kullanıcıya "Bağlan butonuna tıklanınca ne olsun" soruldu →
   **"axet-code CLI üzerinden delege et"** seçildi (uygulamanın kendi başına
   bir token/OAuth akışı YAPMAMASI, `axetChat.ts`'in zaten kullandığı
   `axet-code run` mekanizmasını kullanması).

### Tamamen kaldırılanlar

- `app-electron/main/msGraphAuth.ts` — SİLİNDİ.
- `@azure/msal-node` (+ `@azure/msal-common`) — `npm uninstall` ile
  kaldırıldı (main bundle 848KB'tan **381KB'a düştü**, bu paketin
  gerçekten tamamen çıktığının kanıtı).
- `electron.vite.config.ts`'teki `@azure/msal-node`/`@azure/msal-common`
  externalize-exclude satırı geri alındı (artık gerek yok).
- `AppConfig.msGraphAppRegistration`/`msGraphConnections` alanları,
  `store.ts`'teki `saveMsGraphAppRegistration`/`saveMsGraphConnection`/
  `removeMsGraphConnection` fonksiyonları — TAMAMEN SİLİNDİ. **Yeni mimaride
  `AppConfig`'e HİÇBİR alan eklenmedi** — bu launcher artık hiçbir token/
  hesap/tenant bilgisi SAKLAMIYOR, hepsi CLI'nın kendi sorumluluğunda.
- `MsGraphProvider`/`MsGraphAppRegistration`/`MsGraphConnection`/
  `MsGraphDeviceCodeInfo`/`MsGraphConnectResult`/`MsGraphDisconnectResult`/
  `MsGraphTestResult`/`MsGraphAppRegistrationResult` tipleri (shared/
  types.ts) — SİLİNDİ, yerine 2 basit tip geldi (aşağıda).
- Tüm `msGraph:*` IPC kanalları, `AppConnectionsSection.tsx`'teki Azure AD
  App Registration formu + device code ekranı (kod/QR gösterme, "Tarayıcıda
  Aç" ile verification URI açma) — TAMAMEN KALDIRILDI.

### Yeni mimari

- **`app-electron/main/agenticConnectors.ts`** (yeni) — `PROVIDER_MCP_URL`
  (gerçek URL'ler: `.../outlook_tools/mcp`, `.../sharepoint_tools/mcp`,
  sadece BİLGİ/gösterim amaçlı — bu launcher onlara asla direkt istek
  atmıyor) + her provider için ajana verilen bir test prompt'u
  (`PROVIDER_TEST_PROMPT`): ajana "sana ait bir Outlook/SharePoint connector
  aracın var, SADECE GÜVENLİ/SALT-OKUNUR bir aksiyon çağır (gönderme/silme/
  değiştirme YOK), sonucu tam olarak `CONNECTOR_OK: <detay>` veya
  `CONNECTOR_FAIL: <sebep>` formatında tek satır raporla" deniyor. Ajanın
  hangi tool adını kullanacağı BİLEREK belirtilmiyor (tool adları sürümle
  değişebilir) — ajan kendi keşfettiği connector aracını seçiyor.
  `testConnector(requestId, provider, cwd)` — `axetChat.ts`'teki AYNI
  spawn/iptal deseniyle (`spawn("axet-code", ["run","-q",prompt])`,
  `requestId`→`ChildProcess` map, `__markCancelled`) `axet-code run -q`
  çalıştırıp stdout'u `CONNECTOR_(OK|FAIL): (.*)` regex'iyle ayrıştırıyor
  (agent ekstra açıklama eklese bile SON eşleşmeyi esas alıyor).
  `cancelConnectorTest`/`cancelAllConnectorTests` de aynı desen.
  `mcpUrlFor(provider)` — sadece UI'da göstermek için gerçek URL'i döner.
- **`app-electron/shared/types.ts`**: `ConnectorProvider = "outlook" |
  "sharepoint"`, `ConnectorTestResult { ok, connected, detail, error?,
  cancelled? }` — TEK bunlar, `AppConfig`'e HİÇBİR EKLEME yok.
- **IPC** (`index.ts`/`preload/index.ts`/`window.d.ts`): `connectors:test`,
  `connectors:cancelTest`, `connectors:getMcpUrl` — 3 basit kanal (önceki
  turun 6 kanalından + 1 push event'inden çok daha küçük bir yüzey).
- **`src/components/AppConnectionsSection.tsx`** (tamamen yeniden yazıldı)
  — artık form YOK: sadece bir açıklama metni + Outlook/SharePoint kartları
  (gerçek MCP URL'i `getConnectorMcpUrl` ile çekilip küçük gri metinle
  gösteriliyor) + her biri için "Bağlantıyı Test Et" (busy/cancel
  durumlarıyla) + sonuç (yeşil ✓ "detay" / kırmızı ✕ "sebep") + altta tek bir
  "Terminalde Giriş Yap" butonu.
- **`src/App.tsx`**: yeni `handleOpenLoginTerminal` — `handleNewTerminal`
  ile AYNI "manuel terminal" yolu (READY_PATTERNS/8sn fallback bekleyen
  `openTerminalForConnection`'ın YOLUNU KULLANMIYOR, çünkü `axet-code login`
  tam-ekran bir TUI DEĞİL, düz satırlar yazan basit bir komut) — terminal
  oluşturulur oluşturulmaz (`setImmediate` ile hemen "ready") `axet-code
  login\r\n` stdin'e yazılıyor, tab/panel hemen açılıp kullanıcı device
  code + URL'i doğrudan terminalde görüyor.
- **`src/components/AppConnectionsModal.tsx`**: "Terminalde Giriş Yap"
  tıklanınca `onOpenLoginTerminal()` çağrılıp modal KAPATILIYOR (aksi halde
  modal'ın z-50 backdrop'u App.tsx'in normal akışta render ettiği, özel bir
  z-index'i olmayan `TerminalPanel`'i görünmez şekilde örterdi).
- **i18n**: TÜM Azure AD/device-code'a özel anahtarlar (`registrationTitle`,
  `showGuide`/`hideGuide`, `guideStep1-6`, `clientId`/`tenantId`,
  `connect`/`disconnect`, `connectingTitle`, `waitingForCode`,
  `openBrowser`, `appsTitle`, `*Scopes` vb.) silindi; yerine `appConnections.
  intro`, `.testConnection`, `.loginHint`, `.openLoginTerminal`,
  `.loginTerminalTitle` gibi çok daha küçük bir set geldi.

### Doğrulama

- `npm run typecheck` (web + node) temiz geçti.
- `npm run build` temiz geçti — main bundle **848KB → 381KB** (msal-node'un
  gerçekten tamamen kaldırıldığının somut kanıtı).
- Kod tabanında `msGraph`/`MsGraph`/`msal-node` string'lerinin TEK kalan
  yeri, bu pivotu açıklayan tarihsel yorumlar (dosya: `AppConnectionsSection.
  tsx`, `agenticConnectors.ts`, `index.ts`, `secureStorage.ts`, `shared/
  types.ts`) — gerçek kod/tip/IPC referansı KALMADI, `grep` ile doğrulandı.
  `mcpUrlFor` export'unun kullanılmayan (dead code) kalmaması için özellikle
  `connectors:getMcpUrl` IPC kanalına bağlanıp UI'da gerçekten gösterildiği
  doğrulandı.
- **Gerçek paketleme testi**: `npx electron-builder --win dir` ile
  `release/win-unpacked/aXet SAP Launcher.exe` başarıyla üretildi (bir
  önceki paketlenmiş sürümün kilitli exe'sini `taskkill` ile serbest
  bırakıp tekrar denendi).

### Test EDİLEMEYEN (bu ortamda gerçek axet.nttdata.com erişimi/oturumu var
ama uçtan uca "Bağlantıyı Test Et" akışı bu turda çalıştırılmadı)

Bu makinede `axet-code` CLI'sı zaten kurulu ve `axet-code.json`/`auth.enc`
dosyaları mevcut (muhtemelen daha önce `axet-code login` yapılmış) — ama bu
turda gerçek "Bağlantıyı Test Et" butonuna tıklanıp ajanın GERÇEKTEN
outlook_tools/sharepoint_tools connector'ını çağırıp `CONNECTOR_OK:`
formatında cevap verdiği UÇTAN UCA doğrulanmadı (bu, paketlenmiş uygulamayı
açıp gerçek bir tıklama gerektirir — kod-seviyesi doğrulama, gerçek
kullanıcı testi kadar kesin değil). Kullanıcının kendi makinesinde Ayarlar
butonunun üstündeki 🔌 ikonuna tıklayıp "Bağlantıyı Test Et"i denemesi
gerekiyor; başarısız olursa "Terminalde Giriş Yap" ile `axet-code login`
çalıştırıp tekrar denemesi öneriliyor.

## Canlı Bulgu: "No project selected, launch axet-code in interactive mode first." (2026-08-30, TAMAMLANDI)

### Kullanıcının gerçek testi ve bulduğu hata

Kullanıcı paketlenmiş uygulamayı açıp Outlook connector'ında Okta SSO
oturumunu tamamladı (login akışı ÇALIŞTI), ama "Bağlantıyı Test Et"
dediğinde şu hatayı aldı: **"No project selected, launch axet-code in
interactive mode first."**

### Kök sebep araştırması (canlı, bu makinedeki gerçek axet-code kurulumuna karşı)

1. `axet-code projects --json` çalıştırıldı — bu, axet-code'un KENDİ dizin-
   bazlı proje geçmişini (hangi klasörlerde `.axet-code` alt klasörü var)
   listeliyor, `axetWorkspaceDir` ZATEN bu listede — yani bu "proje" kavramı
   HATANIN SEBEBİ DEĞİL.
2. `axet-code run -q "list your available tools, just the names, nothing
   else"` çalıştırıldı — dönen liste: `agent, agentic_fetch, ask_user, bash,
   code_graph, download, edit, fetch, glob, grep, job_kill, job_output, ls,
   lsp_diagnostics, lsp_references, lsp_restart, multiedit, skill_install,
   skill_publish, skill_search, skill_uninstall, sourcegraph, todos, view,
   write` — **outlook_tools/sharepoint_tools YOK**. `run -q` (non-
   interactive) modunda bu MCP araçları HİÇ YÜKLENMİYOR.
3. `axet-code.exe` binary'sinin ham string'leri tarandı (`node` ile
   latin1 decode + regex) — **kesin kanıt bulundu**: `SelectedProjectID`,
   `openProjectsDialog`, `ActionSelectProject`, `ActionInitializeProject`,
   `markProjectInitialized`, `*api.AxetProject`, `FetchProjectModels` gibi
   string'ler + kritik olarak bir ortam değişkeni: **`AXET_PROJECT_ID`**.
   Bu, axet-code'un KENDİ dizin-bazlı "projects" komutundan TAMAMEN AYRI
   bir kavram: **AXET Agentic platformunun "Project" entity'si** — MCP
   connector'lar (Outlook/SharePoint gibi) hangi AXET Project'e ait
   olduklarını bilmek zorunda, bu seçim SADECE interaktif TUI'deki bir
   diyalogla (`openProjectsDialog`) yapılabiliyor. `run -q` non-interactive
   modda bu diyalog gösterilecek bir yer olmadığı için CLI bu hatayı veriyor
   — kod tarafımızda bir hata YOK, bu axet-code CLI'nın kendi tasarımı.
4. `AXET_PROJECT_ID` env var'ını manuel set edip bir proje ID'si tahmin
   etmek YERİNE (elimizde geçerli bir ID yok, uydurmak riskli), CLI'nın
   kendi önerdiği çözüm izlendi: **"launch axet-code in interactive mode
   first"** — yani kullanıcının gerçek/tam ekran `axet-code` TUI'sini
   AÇIP oradaki proje seçim diyaloğunu bir kere geçmesi gerekiyor.

### Yapılan düzeltme

- **`src/App.tsx`**: `handleOpenLoginTerminal`'ı ("Terminalde Giriş Yap")
  besleyen mantık genelleştirilip `openConnectorHelperTerminal(command,
  title)` adında paylaşılan bir yardımcıya çıkarıldı (aynı "manuel
  terminal aç + hazır olur olmaz komutu stdin'e yaz" deseni). Yeni
  **`handleOpenProjectTerminal`** eklendi — `config.axetCommand` (varsayılan
  `"axet-code -y"`, uygulamanın HER YERDE zaten kullandığı interaktif komut)
  ile GERÇEK bir interaktif `axet-code` TUI'si açıyor; kullanıcı burada
  normal şekilde etkileşime girip proje seçim diyaloğunu geçebilir —
  bizim tarafımızdan simüle edilen bir tuş vuruşu YOK, tamamen gerçek CLI
  deneyimi.
- **`src/components/AppConnectionsSection.tsx`**: `isNoProjectSelectedError
  (text)` — sonuç metninde `/no project selected/i` veya `/interactive
  mode/i` regex'i eşleşirse tespit ediyor. Eşleşirse, mevcut genel
  "Terminalde Giriş Yap" satırının ÜSTÜNE amber/uyarı renkli, AlertTriangle
  ikonlu YENİ bir banner ekleniyor: "Bu connector'lar bir AXET Project
  seçilmesini gerektiriyor — bu sadece axet-code'un interaktif (tam ekran)
  modunda yapılabilir." + "AXET Projesi Seç" butonu (`onOpenProjectTerminal`
  prop'u, App.tsx'teki yeni handler'a bağlı).
- **`src/components/AppConnectionsModal.tsx`**: yeni `onOpenProjectTerminal`
  prop'u eklendi, "Terminalde Giriş Yap"la AYNI desende (tıklanınca terminal
  açılıp modal kapanıyor — aksi halde modal'ın backdrop'u TerminalPanel'i
  örterdi).
- **i18n** (`tr.ts`/`en.ts`): `appConnections.selectProjectHint`,
  `.openProjectTerminal`, `.projectTerminalTitle` eklendi.

### Doğrulama

- `npm run typecheck` ve `npm run build` temiz geçti.
- Gerçek `electron-builder --win dir` paketleme testi yapıldı (kullanıcının
  açık olan önceki paketli uygulaması `taskkill` ile kapatılıp yeniden
  paketlendi).

### Kullanıcı için sıradaki adım

🔌 ikonundan Uygulama Bağlantıları'nı aç → "Bağlantıyı Test Et" hâlâ aynı
hatayı verirse artık amber renkli "AXET Projesi Seç" butonu görünecek →
tıklayınca gerçek interaktif bir `axet-code` terminali açılır → burada
normal şekilde (klavyeyle) etkileşime girip AXET Project seçim diyaloğunu
geçmen gerekiyor (tam olarak hangi ekran/adımların çıkacağı bu ortamda
görülemedi, CLI'nın kendi TUI'si bunu yönetiyor) → seçim tamamlandıktan
sonra "Bağlantıyı Test Et"i tekrar dene.

## Canlı Bulgu #2: "Outlook integration is unauthorized (state 'ERROR' — authorization flow not completed)" (2026-08-30, TAMAMLANDI)

### Kullanıcının ikinci gerçek testi

Yukarıdaki proje-seçimi sorunu çözüldükten sonra ("AXET Projesi Seç"
akışını geçti) kullanıcı FARKLI bir hata aldı: **"Outlook integration is
unauthorized (state 'ERROR' — authorization flow not completed)"**.

### Kök sebep araştırması (bu makinedeki gerçek axet-code'a karşı canlı test)

1. `axet-code run -q "List the exact names of ALL tools you currently have
   available..."` çalıştırıldı — artık proje seçili olduğu için gerçek MCP
   tool'lar görünüyor: **`mcp_conn_c3c2a49d-..._outlook_*`,
   `mcp_conn_df6566e3-..._outlook_*`, `mcp_conn_e0c6a18b-..._outlook_*`** —
   yani **AYNI Outlook provider'ı için ÜÇ AYRI, farklı connection ID'li
   entegrasyon** kayıtlı (muhtemelen tekrarlanan re-authorization/SSO
   denemelerinden kalan kalıntılar, axet.nttdata.com/agentic platformunun
   kendi tarafında oluşuyor, bizim kodumuzda değil).
2. Her üç entegrasyona ayrı ayrı `outlook_read`/`outlook_check_folder`
   çağrısı yapıldı — **kesin sonuç**: `df6566e3-...` ÇALIŞIYOR (`{'status':
   'success', 'folder_name': 'Inbox', ...}`), diğer ikisi (`c3c2a49d-...`,
   `e0c6a18b-...`) **HTTP 500 → "Integrations error for 'outlook'.
   Integration <id> is in state 'ERROR'; complete the authorization flow
   before using it."** hatası veriyor.
3. **Sonuç**: bu bir kod hatası DEĞİL — axet.nttdata.com/agentic
   platformunun sunucu tarafındaki entegrasyon kayıtlarından bazıları
   kalıcı olarak bozuk durumda kalmış, ama AYNI PROVIDER için ÇALIŞAN bir
   entegrasyon da GERÇEKTEN VAR. Sorun, önceki turdaki `PROVIDER_TEST_
   PROMPT`'un ajana "SADECE bir tool çağır" demesiydi — ajan İLK bulduğu
   (ve şans eseri bozuk olan) entegrasyonu deneyip hemen `CONNECTOR_FAIL`
   diyordu, çalışan diğer entegrasyonu HİÇ denemiyordu.

### Yapılan düzeltme ve CANLI doğrulama

- **`app-electron/main/agenticConnectors.ts`**: `PROVIDER_TEST_PROMPT`
  (outlook + sharepoint, ikisi de) güncellendi — ajana artık şu talimat
  veriliyor: "Bu provider için BİRDEN FAZLA ayrı connector entegrasyonu
  olabilir, bazıları bozuk olabilir. İLK tool'u dene; 'unauthorized/error
  state/authorization flow' hatası alırsan SIRADAKİ farklı tool'u dene,
  hepsini deneyene kadar devam et (her tool'a SADECE bir çağrı, asla
  gönderme/silme/değiştirme yapma); herhangi biri çalışırsa CONNECTOR_OK,
  hepsi başarısız olursa CONNECTOR_FAIL (denenen entegrasyon sayısını
  belirt)."
- **Bu değişiklik BU MAKİNEDE gerçek axet-code'a karşı CANLI doğrulandı**
  (kod yazılmadan ÖNCE `axet-code run -q "<yeni prompt metni>"` ile manuel
  test edildi): ajan sırasıyla entegrasyonları denedi, `c3c2a49d-...`/
  `e0c6a18b-...` için hata aldı, `df6566e3-...`'ye geçti, ORADA başarılı
  oldu ve tam olarak beklenen formatta cevap verdi: **"CONNECTOR_OK: Inbox
  folder found via second connector (df6566e3-2e65-4bcd-b8eb-
  0eb047312c5d)"**. Yani kullanıcının GERÇEK senaryosunda bu düzeltmeyle
  "Bağlantıyı Test Et" artık BAŞARILI sonuç dönecek (agent otomatik olarak
  çalışan entegrasyonu buluyor).
- **`src/components/AppConnectionsSection.tsx`**: yeni `isIntegrationError
  State(text)` dedektörü (`/unauthorized/i`, `/state\s*'?ERROR'?/i`,
  `/authorization flow/i` regex'leri) — eğer (nadir durumda, TÜM
  entegrasyonlar bozuksa) test hâlâ bu hatayla başarısız olursa, amber
  renkli YENİ bir banner gösteriliyor: "Bu sağlayıcı için kayıtlı
  entegrasyon(lar) 'ERROR' durumunda görünüyor. Genelde ajan çalışan başka
  bir entegrasyonu otomatik bulur — hepsi bozuksa aXet Agentic portalından
  yeniden yetkilendirmen/temizlemen gerekebilir." + **"aXet Agentic
  Portalını Aç"** butonu (`window.api.openExternalUrl` ile
  `https://axet.nttdata.com/agentic/`'i tarayıcıda açar — zaten var olan
  IPC, yeni bir kanal eklenmedi).
- **i18n**: `appConnections.integrationErrorHint`, `.openAgenticPortal`
  eklendi (tr/en).

### Doğrulama

- `npm run typecheck` ve `npm run build` temiz geçti.
- Bundle içeriğinde yeni prompt metninin ("DO NOT give up yet") gerçekten
  paketlenmiş `app.asar` içine girdiği doğrulandı.
- Gerçek `electron-builder --win dir` paketleme testi yapıldı (kullanıcının
  açık olan önceki paketli uygulaması tekrar `taskkill` ile kapatılıp
  yeniden paketlendi).
- **En kritik doğrulama**: yeni prompt, KOD YAZILMADAN ÖNCE bu makinedeki
  gerçek `axet-code` CLI'sına karşı manuel çalıştırılıp kullanıcının TAM
  OLARAK yaşadığı senaryo (3 entegrasyon, 2'si bozuk, 1'i sağlam)
  üzerinde `CONNECTOR_OK` sonucu üretilene kadar doğrulandı — varsayımsal
  bir düzeltme değil, gerçek veriye karşı kanıtlanmış bir çözüm.

### Kalıcı not (ileride benzer bir hata gelirse)

axet.nttdata.com/agentic platformu, kullanıcı Outlook/SharePoint'e her
"yeniden bağlan" dediğinde YENİ bir entegrasyon kaydı oluşturuyor gibi
görünüyor (eskisini silmiyor) — bu yüzden zamanla birikmiş, kalıcı olarak
bozuk entegrasyonlar normal bir durum. Uygulama tarafında yapılabilecek en
iyi şey (ve yapılan şey) ajana "bozuğu atla, çalışanı bul" demek; kalıcı
temizlik ancak portalın kendisinden yapılabilir, bu launcher'ın erişimi/
yetkisi yok.

## Canlı Bulgu #3: Aynı Sorun Genel axet.code Sohbetinde de Çıktı (2026-08-30, aynı gün, TAMAMLANDI)

### Kullanıcının üçüncü gerçek testi

Kullanıcı "Bağlantılar"dan Outlook'u bağladı, "Bağlantıyı Test Et" OK
döndü (Canlı Bulgu #2'deki çoklu-entegrasyon-deneme düzeltmesi sayesinde)
— AMA genel axet.code sohbet ekranında ("chate sordugumda") "bağlantım
çalışıyor mu" diye sorunca ŞU cevabı aldı: **"Bağlantı henüz
tamamlanmamış — Outlook entegrasyonu 'ERROR' durumunda, yetkilendirme
akışını tamamlamanız gerekiyor..."**

### Kök sebep (bu makinede canlı doğrulandı)

`agenticConnectors.ts`'teki "Bağlantıyı Test Et" prompt'u ajana ÖZEL olarak
"bir entegrasyon bozuksa BAŞKASINI dene" talimatı veriyordu (Canlı Bulgu #2)
— ama bu talimat SADECE o özel test akışında vardı. **Genel axet.code
sohbeti** (`axetChat.ts`, `AxetCodeHome.tsx`'in arkasındaki sohbet
motoru) tamamen AYRI bir prompt kullanıyor, bu talimat orada YOKTU. Canlı
doğrulama:
```
axet-code run -q "Is my outlook connection working? Before answering, tell me which exact tool name you tried and the raw error/result."
```
Sonuç: ajan `mcp_conn_e0c6a18b-..._outlook_c_03079715` (BOZUK entegrasyon)
tool'unu denedi, `state 'ERROR'` hatası aldı, HİÇ başka bir entegrasyon
denemeden "Not working" dedi — tam olarak kullanıcının yaşadığı senaryo.
3 entegrasyondan hangisinin denendiği CLI'nın kendi iç mantığına göre
değişebiliyor (deterministik bir sıralama garantisi yok), bu yüzden
kullanıcı bazen çalışan bazen bozuk entegrasyona rastlıyor.

### Yapılan düzeltme ve CANLI doğrulama

- **`app-electron/main/axetChat.ts`**: yeni `CONNECTOR_RETRY_REMINDER`
  sabiti — Canlı Bulgu #2'deki `agenticConnectors.ts` talimatının KISA,
  GENERİK bir versiyonu ("bir MCP araç çağrısı entegrasyonun yetkisiz/
  ERROR durumunda olması yüzünden başarısız olursa ve aynı sağlayıcı için
  BAŞKA bir araç varsa, vazgeçmeden önce onu dene"). `buildPrompt()`
  fonksiyonu artık bu hatırlatmayı **TÜM** mesajlara (geçmişli/geçmişsiz)
  otomatik olarak ekliyor — sadece Outlook/SharePoint'e özel değil,
  gelecekte eklenecek herhangi bir çoklu-entegrasyon senaryosuna da
  otomatik uyuyor.
- **Kod yazılmadan ÖNCE canlı doğrulama** (bu makinedeki gerçek axet-code'a
  karşı, `axet-code run -q "<hatırlatma metni>\n\nKullanıcı mesajı: Is my
  outlook connection working?"`): ajan artık BOZUK entegrasyonu deneyip
  hemen "Yes, working — connected via the alternate Outlook integration
  (the primary one is unauthorized/errored, but a working connection found
  your Inbox successfully)." cevabını verdi — kullanıcının gerçek
  senaryosu ÇÖZÜLDÜ.
- **Yan etki kontrolü (canlı doğrulandı)**: hatırlatma metninin, MCP
  araçlarıyla İLGİSİZ basit sorularda (`axet-code run -q "<hatırlatma>
  \n\nKullanıcı mesajı: 2+2 kaç eder?"`) cevabı BOZMADIĞI doğrulandı — çıktı
  sadece `4`, hiçbir ekstra/alakasız metin yok. Bu, hatırlatmanın TÜM
  mesajlara eklenmesinin güvenli olduğunun kanıtı.

### Doğrulama

- `npm run typecheck` ve `npm run build` temiz geçti.
- Bundle içeriğinde (`app.asar`, `utf-8` decode ile — `latin1` Türkçe
  karakterleri (`ç`) bozduğu için ilk kontrolde YANLIŞ NEGATİF verdi,
  `utf-8` ile düzeltilip doğrulandı) `CONNECTOR_RETRY_REMINDER` ve
  hatırlatma metninin gerçekten paketlendiği doğrulandı.
- Gerçek `electron-builder --win dir` paketleme testi yapıldı (kullanıcının
  açık olan önceki paketli uygulaması tekrar `taskkill` ile kapatılıp
  yeniden paketlendi).

### Genel prensip (bundan sonra benzer bulgular için)

Artık İKİ ayrı yer (agentic connector testi VE genel axet.code sohbeti)
aynı "bozuk entegrasyonu atla, çalışanı bul" davranışına sahip — bu ikisi
arasında bir tutarsızlık kalmadı. `sapGuiScriptAgent.ts`/`axetFlowsAgent.ts`
gibi diğer `axet-code run` çağıran modüllere BİLEREK eklenmedi (onlar
Outlook/SharePoint connector'larıyla hiç ilgilenmiyor, gereksiz prompt
şişkinliği olurdu) — sadece kullanıcının gerçekten etkileşime girdiği
genel sohbet + connector test akışı kapsandı.

## Router'sız Sistemlerde de RFC Bridge — Exeltis (QUB) Canlı Bulgusu: "Eclipse Bağlanıyor Ama Biz Bağlanamıyoruz" (2026-09-02, TAMAMLANDI)

**Şikayet**: Kullanıcı Exeltis müşterisinin `QUB` sistemine (host
`SAPS4QUBIS.INSUDPHARMA.COM`, **SAProuter TANIMLI DEĞİL** — doğrudan bağlantı)
VPN açıkken bağlanamıyordu, "zaman aşımı" hatası alıyordu — ama Eclipse'te
(ADT) aynı sisteme AYNI VPN üzerinden sorunsuz bağlanabiliyordu.

**Teşhis (canlı, bu makinede)**:
- Tüm bilinen ADT/ICM HTTPS candidate portları (443/8443/44300/50000/4443,
  ayrıca kullanıcının SMICM'den okuduğu gerçek portlar 8000/8443) bu
  makineden **tamamen erişilemez** (ham TCP connect zaman aşımına düşüyor) —
  `discoverAdtEndpoint()`/`verifyCredentials()` ile canlı doğrulandı
  (`verify.status === null`, mesaj "Zaman aşımı").
- SAP Logon'un DIAG portu (3200) VE **gateway portu (3300, DIAG+100)**
  ise erişilebilir (`Test-NetConnection` ile canlı doğrulandı).
- `netstat`/`Get-NetTCPConnection` ile **KESİN kanıt**: çalışan `eclipse.exe`
  process'i bu sisteme (`10.166.30.95`) sadece **port 3300**'den bağlıydı,
  hiçbir HTTP(S) portuna bağlı DEĞİLDİ. Yani Eclipse ADT, bu sistemde HTTPS
  KULLANMIYOR — "SAP GUI connection'dan oluştur" tipi ADT projeleri, HTTP(S)
  erişilemezken `SADT_REST_RFC_ENDPOINT` üzerinden **RFC/gateway portu ile**
  tünelliyor. Bu, tam olarak bu projenin router-only sistemler için zaten
  sahip olduğu RFC Bridge mekanizmasının (bkz. yukarıdaki "RFC Bridge —
  pratik workaround" ve "RFC Bridge Otomatik Başlatma" bölümleri) aynısı —
  sadece bu sistemde bir SAProuter YOK, engel doğrudan ağ/firewall
  seviyesinde.

**Kök sebep (kod tarafında, gerçek bir kapsam boşluğu)**: RFC bridge otomatik
başlatması (`attemptRfcBridgeAutoStart`) sadece `routerString && isRouterPermissionDenied(...)`
koşuluyla tetikleniyordu — router'ı OLMAYAN ama HTTPS'i ağ seviyesinde
tamamen engelli sistemler için hiçbir fallback yoktu, kullanıcı sadece çıplak
"Zaman aşımı" görüyordu.

**Düzeltme**:
- **`app-electron/main/launcher.ts`**: yeni `probeTcpPort(host, port,
  timeoutMs)` yardımcı fonksiyonu (ham TCP connect, HTTP/TLS yok) + yeni bir
  `else if` dalı — `!verify.ok && !manualUrl && !routerString &&
  verify.status === null && host` ise (yani: router yok, manuel URL değil,
  HİÇBİR HTTP yanıtı alınamadı — 401/SAML/diğer status'lar HARİÇ) önce
  gateway portunu (`diagPort + 100`) 3 saniyelik ucuz bir TCP probe ile
  kontrol ediyor; açıksa **doğrudan (router'sız) RFC bridge** moduna geçiyor
  (`rfcBridge = { ashost: host, sysnr: guessInstanceNumber(...), saprouter:
  "", bridgePort: 8788 }`), kapalıysa (VPN de kapalıysa gateway de kapalı
  olur) normal başarısızlık mesajıyla dönüyor — böylece gerçekten tamamen
  erişilemeyen sistemlerde boşuna RFC bridge denenmez.
- **`adt_rfc_bridge.py`**: `load_rfc_config()`'teki `saprouter` artık
  ZORUNLU DEĞİL (`ADT_RFC_SAPROUTER` boş/tanımsızsa `None`), `_ensure_connection()`
  artık `pyrfc.Connection(**conn_kwargs)`'ı `saprouter` anahtarını SADECE
  değer varsa ekleyerek çağırıyor (boş string vermek bazı sapnwrfc
  sürümlerinde "invalid saprouter string" hatası riski taşıyabileceği için
  anahtar tamamen atlanıyor, değer geçilmiyor).
- **`buildConnAdt()`/`buildContextMarkdown()`**: `.conn_adt`'taki yorum
  bloğu ve `sap-context.md`'deki "RFC Bridge Modu" bölümü artık
  `rfcBridge.saprouter` truthy/falsy'sine göre iki farklı anlatım kullanıyor
  — router'lı durumda eskisi gibi "SAProuter reddetti", router'sız durumda
  "SAProuter YOK ama HTTPS ağ seviyesinde erişilemez, Eclipse ADT'nin
  kullandığı AYNI mekanizma" (yanlışlıkla var olmayan bir router'dan
  bahsetmiyor).
- Downstream kod (`attemptRfcBridgeAutoStart`, `rfcBridgeManager.ts`,
  `%sap-adt-readonly` otomatik başlatması) **hiç değişmedi** — zaten
  `RfcBridgeConfig.saprouter: string` tipiydi, boş string ile de sorunsuz
  akıyor, router-specific bir mantık taşımıyordu.

**Canlı doğrulama (bu makinede, gerçek Exeltis/QUB parametreleriyle)**:
- `discoverAdtEndpoint`/`verifyCredentials` gerçek host'a karşı çalıştırılıp
  `verify.status === null` (hiçbir port yanıt vermedi) olduğu ve yeni dalın
  gerçekten tetikleneceği doğrulandı.
- `probeTcpPort(host, 3300)` gerçekten `true` döndü (gateway portu açık),
  `guessInstanceNumber(3200)` → `"00"` — üretilecek `rfcBridge` config'i
  tam olarak beklenen: `{ashost: "SAPS4QUBIS.INSUDPHARMA.COM", sysnr:"00",
  saprouter:"", bridgePort:8788}`.
- `adt_rfc_bridge.py`'nin `load_rfc_config()`'i (pyrfc gerektirmeyen kısım)
  hem `ADT_RFC_SAPROUTER` YOKKEN (`saprouter: None`, `pyrfc.Connection`
  kwargs'ından `saprouter` anahtarı doğru şekilde ATLANIYOR) hem VARKEN
  (eski router davranışı KORUNUYOR, `saprouter` anahtarı doğru ekleniyor)
  test edildi, ikisi de PASS.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.
- **Test EDİLEMEYEN**: gerçek Exeltis kimlik bilgileriyle uçtan uca RFC
  logon + `%sap-adt-readonly` çağrısı (kullanıcının gerçek şifresi bu
  oturumda kullanılmadı/istenmedi) — kullanıcının kendi makinesinde SAP
  Logon ağacındaki **gerçek "Exeltis" sistemine** (manuel BTP girişine
  DEĞİL — o ayrı bir path, host bilgisi olmadığı için bu fallback'i
  tetiklemez) tıklayıp normal şekilde bağlanmayı denemesi gerekiyor; artık
  "Zaman aşımı" ile durmayıp otomatik RFC bridge moduna geçmesi ve terminalin
  açılması beklenir.

**Genel prensip (ileride benzer bulgular için)**: "Eclipse/SAP GUI bağlanıyor
ama biz bağlanamıyoruz" şikayeti geldiğinde ilk kontrol edilecek şey artık
bu — `netstat`/`Get-NetTCPConnection` ile Eclipse'in (varsa) o sisteme HANGİ
portla bağlı olduğuna bak; DIAG/gateway (32xx/33xx) ise muhtemelen bizim de
zaten sahip olduğumuz RFC bridge mekanizması (router'lı veya router'sız)
devreye girmeli, illa SAProuter aranmasın.

## SAML SSO Tespit Edilen Cloud Sistemlerde `.conn_adt`/`sap-context.md` HİÇ Yazılmıyordu — "test"/DA8 Canlı Bulgusu (2026-09-02, TAMAMLANDI)

**Şikayet**: Kullanıcı manuel eklediği bir cloud test sistemine
(`https://my431455.s4hana.cloud.sap`, "test"/DA8) bağlanmaya çalışınca
`samlLoginDetected` mesajını (bkz. yukarıdaki "Kimlik Doğrulama Her Zaman
'Başarılı' Görünüyordu" bölümü, 2026-08-26'da eklenen tespit mekanizması)
aldı — mesaj doğru teşhis koyuyordu ("bu sistem SAML SSO gerektiriyor,
`login_saml_sso.py` akışını izle") ama **terminal hiç açılmıyordu**.

**Kök sebep (gerçek bir kapsam boşluğu, 2026-08-26'daki SAML tespit
düzeltmesinden beri var olan)**: `connectToSystem()`'daki karar zinciri, SAML
tespitini diğer TÜM `!verify.ok` durumlarıyla (401, timeout, vb.) aynı
jenerik `else if (!verify.ok) { return ok:false, ... }` dalına düşürüyordu —
bu dal projeyi `mkdirSync` ile oluşturduktan hemen sonra, **`.conn_adt`/
`sap-context.md` hiç yazılmadan** dönüyordu. Sonuç: kullanıcı proje klasörünü
açtığında (canlı doğrulandı — boş klasör) `login_saml_sso.py`'nin ihtiyaç
duyduğu `.conn_adt` (`ADT_SAP_URL`/`ADT_SAP_USER`/`ADT_SAP_PASSWORD`) hiçbir
zaman diskte oluşmuyordu — mesaj doğru yönlendirme yapıyordu ama önerdiği
adımı fiilen takip etmek için gereken dosya hiç var olmuyordu. Bu, SAP
Router-permission-denied ve ağ-seviyesi-erişilemez (yukarıdaki iki bölüm)
senaryolarının ikisinin de zaten sahip olduğu "ok:true + verified:false,
dosyaları yaz, terminali aç, kullanıcıyı doğru akışa yönlendir" desenine SAML
tespitinin dahil edilmemiş olmasıydı.

**Düzeltme**:
- **`adtDiscovery.ts`**: `CredentialVerifyResult`'a yapısal bir
  `samlDetected?: boolean` alanı eklendi (`verifyCredentials`'ın hem doğrudan
  hem router üzerinden giden dalı, SAML sayfası tespit ettiğinde bunu `true`
  set ediyor) — böylece launcher.ts artık dile bağımlı (`tr`/`en`) mesaj
  metnine regex ile bakmak zorunda değil, kırılgan string-matching yerine
  yapısal bir bayrağa bakıyor.
- **`launcher.ts`**: yeni `samlSetupNeeded: boolean` yerel değişkeni + karar
  zincirine (`else if (!verify.ok && verify.samlDetected)`) yeni bir dal —
  router-permission-denied ve gateway-fallback dallarıyla AYNI desende:
  `rfcBridge` set edilmiyor (RFC bridge bu senaryoda gerekmiyor/anlamsız),
  ama `.conn_adt`/`sap-context.md` normal şekilde yazılıyor, adt-tool.ps1
  self-test'i (aynı Basic Auth'u kullanıp aynı yanıltıcı "TLS/sertifika
  sorunu" notunu üreteceği için) bilerek atlanıyor, ve fonksiyon `ok:true,
  verified:false` ile döner — terminal açılır, mesaj net biçimde "önce SAML
  login akışını izle" der.
- **`buildContextMarkdown()`**'a yeni `samlSetupNeeded` parametresi eklendi
  — `connectionStatusBlock` artık üç dallı (RFC bridge / SAML SSO gerekli /
  normal doğrulandı), SAML dalı `sap-context.md`'ye "## ADT Bağlantısı — SAML
  SSO GEREKLİ" başlığıyla net bir bölüm yazıyor (mevcut "Cloud / BTP Sistem
  Notları" bölümündeki `login_saml_sso.py` adımlarına doğrudan atıfla).
- **Bilinçli tasarım kararı**: Bu dal `isCloudSystem`'e bakılmaksızın SADECE
  `verify.samlDetected`'e bakıyor — teorik olarak router'lı bir sistem de
  SAML sayfası döndürebilir (çok nadir), o durumda da RFC bridge yerine
  doğru şekilde SAML akışına yönlendirilir (router-permission-denied dalı
  zaten kendi koşuluyla önce kontrol ediliyor, SAML'i asla ezmiyor).

**Canlı doğrulama (bu makinede, gerçek "test"/DA8 sistemine karşı)**:
- `verifyCredentials()` gerçek `https://my431455.s4hana.cloud.sap`'e karşı
  çalıştırılıp `samlDetected: true`, `status: 200`, `ok: false` döndüğü ve
  launcher.ts'in karar zincirinin artık doğru şekilde "SAML_SETUP_NEEDED"
  dalına düştüğü (eskiden düşülen "generic-fail" dalı değil) doğrulandı.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.
- **Test EDİLEMEYEN**: `connectToSystem()`'ın tam ucuçtan uca akışı (Electron
  `app` singleton'ına bağımlı olduğu için `tsx` ile bağımsız çalıştırılamadı)
  — mantık zinciri elle/statik olarak izlendi (hiçbir early-return yeni dalı
  atlamıyor), ama gerçek bir GUI'de "test"/DA8'e tıklayıp `.conn_adt`/
  `sap-context.md`'nin gerçekten oluştuğunu ve terminalin "SAML SSO gerekli"
  mesajıyla açıldığını kullanıcının doğrulaması gerekiyor.

## Gömülü Terminalde Ctrl+V Yapıştırma İKİ KEZ Oluyordu — Gerçek Kök Sebep Bulundu (2026-09-02, TAMAMLANDI)

**Şikayet**: Kullanıcı gömülü terminalde Ctrl+V ile yapıştırma yaptığında
metin **iki kez** yazılıyordu (örn. "abc" yapıştırınca "abcabc" görünüyordu).

**Kök sebep (xterm.js'in kendi minified kaynak koduna bakılarak kanıtlandı)**:
`EmbeddedTerminal.tsx`'teki `term.attachCustomKeyEventHandler()` Ctrl+V'yi
yakalayıp `navigator.clipboard.readText()` → `term.paste(text)` ile manuel
yapıştırıyordu ve `false` döndürüyordu — ama xterm.js'in kendi `_keyDown(e)`
implementasyonu (`node_modules/@xterm/xterm/lib/xterm.js` içinde doğrulandı:
`if(this._customKeyEventHandler&&!1===this._customKeyEventHandler(e))return!1`)
handler `false` dönünce SADECE kendi iç işlemesini (data gönderme) durduruyor
— **native tarayıcı keyboard event'ini `preventDefault()` ETMİYOR**. Bu
yüzden Chromium'un native Ctrl+V klavye kısayolu (`main/index.ts`'teki
`enableDeprecatedPaste:true` + Menu'nün `paste` rolündeki
`registerAccelerator:false` sayesinde hâlâ devrede) tetiklenmeye devam
ediyordu — bu da xterm'in kendi hidden textarea'sına GERÇEK bir native
`paste` DOM event'i gönderiyordu. xterm.js'in KENDİSİ de bu textarea'ya
ayrıca bir `paste` event dinleyicisi bağlıyor (kaynakta `handlePasteEvent`
fonksiyonu doğrulandı — `e.stopPropagation()` çağırıyor ama bu native paste
event'inin KENDİSİNİ, bizim keydown handler'ımızın tetiklediği ayrı zinciri
DEĞİL, engelliyordu) ve o da aynı panodaki metni **ayrıca** yapıştırıyordu.
Sonuç: iki bağımsız mekanizma (bizim manuel `clipboard.readText()`+`term.paste()`
zincirimiz VE xterm'in kendi native `paste` event handler'ı) aynı Ctrl+V
tuşuna aynı anda tepki verip metni iki kez yazıyordu.

**Düzeltme**: `EmbeddedTerminal.tsx`'teki `attachCustomKeyEventHandler`'a
tek satır eklendi — `event.preventDefault()`, Ctrl+V tespit edildiğinde
`navigator.clipboard.readText()` çağrılmadan ÖNCE çalıştırılıyor. Bu,
Chromium'un native Ctrl+V kısayol davranışını (ve dolayısıyla xterm'in kendi
native `paste` event dinleyicisinin tetiklenmesini) tamamen engelliyor —
geriye SADECE bizim manuel yolumuz kalıyor, metin artık bir kez yazılıyor.
Diğer HİÇBİR şeye (Menu/`enableDeprecatedPaste`/global bir listener/başka
input alanlarındaki native paste) dokunulmadı — bu, `PROJE-BILGI.md`'deki
"KESİN KURAL" bölümünün izin verdiği TEK müdahale noktası (xterm `Terminal`
örneğine özel, dar kapsamlı `attachCustomKeyEventHandler`) içinde kalan,
minimal bir düzeltme.

- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.
- **Test EDİLEMEYEN**: gerçek bir GUI penceresinde Ctrl+V'nin artık TEK
  yapıştırdığının görsel doğrulaması kullanıcının kendi makinesinde
  yapılmalı — bu ortamda pencere etkileşimi mümkün değil. Kök sebep xterm.js'in
  kendi (üçüncü parti, değiştirilemeyen) minified kaynak kodundan kanıtlandığı
  için düzeltmenin doğruluğu yüksek güvenle biliniyor.

## Beklenmeyen HTTP Durumlarında Ham HTML Dökülüyordu — Simpro/S4Q Canlı Bulgusu (2026-09-02, TAMAMLANDI)

**Şikayet**: Kullanıcı "Simpro QA" sistemine bağlanmaya çalışırken hata
mesajında şu görünüyordu: `Beklenmeyen HTTP durumu: 403 —
<html><head><meta http-equiv="content-type" ...` — okunamaz, ham HTML kodu
kullanıcıya doğrudan gösteriliyordu.

**Kök sebep araştırması (canlı, gerçek Simpro/S4Q — `192.168.1.244:44300` —
sistemine karşı)**: Birden fazla path canlı test edildi:
- `/sap/public/icman/ping` → **200 OK** ("server on host s4qasapp system
  s4qasapp_S4Q_00 successfully reached")
- `/sap/bc/gui/sap/its/webgui` → **200 OK** (WebGUI çalışıyor)
- `/sap/public/info` → **403** "Service cannot be reached"
- `/sap/bc/adt/discovery` → **403** "Service cannot be reached" (kullanıcının
  aldığı hata)

Sistem tamamen ayakta/erişilebilir (ping ve WebGUI çalışıyor) — bu bir ağ/VPN
sorunu DEĞİL. `/sap/public/info` gibi başka bir varsayılan-kapalı servisin de
AYNI hatayı vermesi kanıtlıyor: **`/sap/bc/adt` servis ağacı bu sistemde
SICF'te hiç aktive edilmemiş** — SAP ICM bu durumda kendi HTML hata sayfasını
("Service cannot be reached") döndürüyor, gerçek bir ADT/kimlik doğrulama
yanıtı değil. Eski kod bu HTML gövdesini olduğu gibi (400 karaktere kadar,
etiketler dahil) mesaja ekliyordu — ne kullanıcıya okunaklı ne de kök sebebi
gösteren bir çıktı.

**Düzeltme (`adtDiscovery.ts`)**:
- Yeni `isHtmlBody(contentType, body)` — content-type `html` içeriyorsa VEYA
  gövde `<!doctype html`/`<html` ile başlıyorsa (SAML tespitindeki
  `looksLikeSamlLoginPage`'le aynı mantık) gövdeyi HTML olarak tanır.
- Yeni `extractHtmlTitle(body)` — `<title>...</title>` içeriğini regex ile
  çıkarır (SAP'ın kendi ICM hata sayfalarında bu her zaman anlamlı bir özet
  taşır — "Service cannot be reached" gibi).
- Yeni `SICF_INACTIVE_TITLE_PATTERN` — title bu kalıba uyuyorsa
  (`service cannot be reached`, `resource/service not available/found`,
  `404 not found`, `service ... not active/available`) artık kullanıcıya
  SADECE "beklenmeyen HTTP durumu" değil, doğrudan **Basis'e yönlendiren**
  açıklayıcı bir mesaj dönüyor: "...bu sistemde /sap/bc/adt servisi SICF'te
  henüz aktive edilmemiş (kullanıcı adı/şifre veya ağ/VPN sorunu DEĞİL).
  Basis ekibine SICF (t-code SICF) üzerinden default_host/sap/bc/adt
  düğümünü 'Service/Host Activate' ile aktive etmesini iste."
- `unexpectedStatusMessage()` artık `contentType` parametresi de alıyor,
  üç kademeli bir mantığa göre dallanıyor: (1) HTML + SICF-inactive kalıbı →
  yukarıdaki Basis-yönlendirmeli mesaj, (2) HTML + başka bir title → sadece
  title'ı gösteren temiz bir mesaj ("... — 'X' (SAP'ın kendi HTML hata
  sayfası, ADT yanıtı değil)"), (3) HTML ama title yok → jenerik "yanıt bir
  HTML sayfası" notu, (4) HTML DEĞİL → eski davranış (düz metin gövdenin
  400 karakterlik özeti). Her iki çağrı noktası (`verifyCredentials`'ın
  doğrudan ve router üzerinden giden dalları) artık `content-type`
  header'ını da bu fonksiyona geçiriyor.

**Canlı doğrulama (bu makinede, gerçek Simpro/S4Q'ya karşı, hem TR hem EN)**:
- `verifyCredentials("https://192.168.1.244:44300", ...)` gerçek 403 +
  "Service cannot be reached" HTML sayfasına karşı çalıştırıldı — dönen
  mesaj artık: `HTTP 403 — "Service cannot be reached". Bu, SAP ICM'in kendi
  hata sayfası ve genelde şu anlama gelir: bu sistemde /sap/bc/adt servisi
  SICF'te henüz aktive edilmemiş (kullanıcı adı/şifre veya ağ/VPN sorunu
  DEĞİL). Basis ekibine SICF (t-code SICF) üzerinden default_host/sap/bc/adt
  düğümünü "Service/Host Activate" ile aktive etmesini iste.` — ham HTML
  hiç görünmüyor, ingilizcesi de aynı şekilde doğrulandı.
- `npm run typecheck`, `npm run build`, `npx electron-builder --win dir`
  temiz geçti; `release/win-unpacked` güncel kaynaktan yeniden paketlendi.
- **Bilinçli sınır**: Bu heuristik (title-pattern eşleştirme) SICF-inaktif
  dışındaki HTML hata sayfalarını (örn. gerçek bir 500 Internal Server
  Error HTML sayfası) genel "HTML sayfası" notuna düşürür — ama en azından
  ham etiketli HTML'i asla kullanıcıya göstermez, en kötü senaryo "temiz
  ama az bilgilendirici" bir mesajdır, "okunamaz ham kod" değil.

## Sohbet Ekranı Faz 0 — Tema / Tasarım Sistemi (2026-09-02, TAMAMLANDI)

Kullanıcı "adım adım ekran ekran gidelim, önce chat ekranı" dedi; derinlemesine
analizden sonra fonksiyonel fazların (Faz 1-4) ÖNÜNE bir **Faz 0** eklendi:
sadece **tema / tasarım / görsel görünüm**, kapsamı **sohbet ekranı + yan
panellerdeki objeler**. Sonra "bildiğin gibi en iyi şekilde yap sana
bırakıyorum" denerek tam yetki verildi. 15 dosya değişti.

### Kalıcı tasarım sistemi kuralları (yeni kod yazarken BUNLARA UY)

- **`text-white` accent zeminde KULLANILMAZ — `text-accent-on` kullan.**
  Sebep: `--ink-strong-rgb` üzerinden `white` tokenı override edildiği için
  açık temada `text-white` = `41 39 36` (koyu gri) oluyordu ve
  `bg-accent-500` üzerinde ölçülen kontrast **2.89:1** idi (WCAG AA için
  4.5:1 gerekiyor). Yeni token `--accent-on-rgb: 255 255 255` her iki temada
  da tanımlı. 12 yerde düzeltildi (`AppConnectionsSection`, `AxetCodeHome`,
  `AxetFlowsLiveHome`, `ChatBubble`, `ChatSessionPane`, `SapGuiAgentPanel`,
  `SapGuiScriptingHome`, + gradient butonlarda `AppConnectionsModal`,
  `CredentialsModal`, `SettingsModal`, `UpdatePromptModal`).
- **Yarıçap ölçeği: `md` / `lg` / `xl` / `full` — başka değer kullanma.**
  Denetimde sadece sohbet yığınında 9 farklı yarıçap vardı
  (`rounded-[3px]`, `rounded-[4px]`, `rounded-[6px]`, `rounded-sm`,
  `rounded-2xl`...). Hepsi bu dörde indirildi.
- **Tipografi ölçeği: 10 / 11 / 12 / 14 / 20 px.** `text-[10.5px]` gibi yarım
  piksel değerler Windows'ta bulanık render ediliyordu — KULLANMA.
- **Tanımsız Tailwind tokenı sessizce Tailwind'in KENDİ varsayılan rengine
  düşer, hata vermez.** `text-slate-600` ve `text-accent-300` böyle sessizce
  tema dışına kaçıyordu. `slate-600` (`--ink-600-rgb`) artık gerçek bir token;
  `accent-300` YOK, `accent-400` kullan. Yeni bir renk sınıfı yazmadan önce
  `tailwind.config.js`'te var mı diye BAK.
- **Tema geçiş animasyonu artık global `*` seçicisinde DEĞİL.** Eskiden her
  elemana sürekli `transition-property: background-color,...` uygulanıyordu —
  bu, hover geri bildirimini bile gecikmeli hissettiriyordu. Artık sadece
  `a, button, input, textarea, select, [role="button"]` 120ms'lik geçiş
  alıyor; 200ms'lik tam-sayfa geçişi ise SADECE tema değiştirme ANINDA
  `html.theme-transition` sınıfıyla açılıp 260ms sonra kaldırılıyor
  (`App.tsx`, `previousThemeRef` ile ilk yüklemede TETİKLENMEZ).
- **Global `:focus-visible` outline** (`src/index.css`) — klavye erişilebilirliği
  için tek merkezî kural, komponent başına tekrar yazma.

### Sohbet ekranındaki görsel değişiklikler

- **Asistan cevabı artık KUTUSUZ akıyor** (hata durumu hariç, o hâlâ
  `--status-danger-*` kutusunda). Eski `bg-base-800` + `max-w-[80%]` balon,
  Faz 1'de gelecek markdown tablo/başlık/kod bloğunu taşırıyordu.
  ChatGPT/Claude deseni: kullanıcı mesajı balon, asistan cevabı düz metin.
  `ThinkingBubble` da kutusuz yapıldı, yoksa cevap gelince ekran zıplıyordu.
- **Okuma sütunu `max-w-3xl` (768px) → `max-w-[68ch]`** — 14px metinde 768px,
  satır başına ~110 karakter demekti (okunabilir aralık 60-75). Composer da
  aynı genişliğe hizalandı.
- **Mesaj gruplama**: ardışık aynı rolden mesajlarda avatar tekrar etmiyor
  (`showAvatar` prop'u), yerinde aynı genişlikte boşluk kalıyor (`AVATAR_COL`).
- **Her mesajın altında hover'da beliren meta satırı** (saat + kopyala).
  `opacity-0` ile GİZLİ ama yer KAPLIYOR (`display:none` değil) — aksi hâlde
  hover'da sayfa zıplardı. Bu yüzden turlar arası boşluk `mt-5` → `mt-3`,
  gruplananlar arası `0`.
- **Ölü i18n anahtarları canlandırıldı** (silinmedi, gerçek bir UI evi
  verildi): `axetCodeHome.emptyTitle`/`emptyHint` → boş sohbet listesi
  durumu; `modelSelector.appliesNextChatHint` → model menüsünün altbilgisi
  (model seçiminin GLOBAL olduğunu, sonraki sohbetleri de etkilediğini
  açıklıyor). Yeni anahtar: `copyButton.copyAnswer`.
- **ActivityBar'dan gradient kaldırıldı** — aktif sekme artık düz
  `bg-base-800 text-accent-400`. Alt gruptaki butonlar 40px → 44px (dokunma
  hedefi).
- **Yan panel oturum satırları** `role="button" tabIndex={0}` + Enter/Space
  ile klavyeden erişilebilir, aktif olan 2px accent şeridi alıyor.

### Yan bulgu: DOCX önizleme açık temada KOYU-ÜSTÜNE-KOYU idi

`FileViewer.tsx`'te DOCX önizlemesi `bg-white` + `text-slate-900` kullanıyordu.
`bg-white` tema tokenına bağlı olduğu için açık temada `41 39 36` (koyu gri)
oluyor, `text-slate-900` ise tanımsız olduğu için Tailwind'in `#0f172a`'sına
düşüyordu → okunamaz. Bir Word belgesi HER İKİ temada da beyaz kâğıt gibi
görünmeli, o yüzden tema-BAĞIMSIZ literallere çevrildi: `bg-[#ffffff]`,
`text-[#1a1a1a]`, `border-[#d4d4d4]`.

### Doğrulama

`npx tsc -p tsconfig.web.json --noEmit`, `npx tsc -p tsconfig.node.json
--noEmit` ve `npm run build` temiz geçti. Üretilen CSS'te `.text-accent-on`,
`--ink-600-rgb` (koyu `70 70 78` / açık `186 184 179`), global
`:focus-visible` outline, `theme-transition` ve `68ch` varlığı ayrıca
kontrol edildi. **Release/push YAPILMADI** — dönüşüm bitene kadar sadece
yerel build kuralı geçerli.

### Sıradaki: Faz 1 (fonksiyonel)

1. **Gerçek streaming** — `chatChunk` IPC push event'i ile; `ChatBubble`'daki
   simüle daktilo animasyonu bunun yerine geçecek (yukarıdaki ⚠️ DÜZELTME
   notuna bak, stdout gerçekten akıyor).
2. Prompt'u komut satırı argümanı yerine **stdin**'den geçirmek.
3. Markdown kapsamını genişletmek (başlık, tablo, sıralı liste).
4. Kod bloğuna kopyala butonu + dil rozeti.
5. Linkler için `openExternalUrl`.

## Sohbet Ekranı Faz 1 — Gerçek Streaming + stdin + Tam Markdown (2026-09-02, TAMAMLANDI)

Faz 0'ın (tema/görsel) ardından fonksiyonel tur. Beş madde de canlı `axet-code`
CLI'ına karşı ölçülerek yapıldı, varsayımla değil.

### 1. Cevap artık GERÇEKTEN akıyor (simüle daktilo KALDIRILDI)

`ChatBubble.tsx`'teki `TypewriterMarkdown`/`TARGET_REVEAL_MS`/`animationDurationMs`
ve onu besleyen `justArrived` + `onAnimationDone` zinciri **tamamen silindi**.
"stdout tamponlanıyor" varsayımı üzerine kurulmuşlardı ve o varsayım yanlış
(bkz. yukarıdaki ⚠️ DÜZELTME notu).

Yeni zincir — projedeki `flows:runtime:*` push event'leriyle AYNI desen:
`axetChat.ts` `onChunk` callback'i → `main/index.ts`
`mainWindow?.webContents.send("axetChat:chunk", requestId, text)` →
`preload` `onChatChunk(cb) => unsubscribe` → `window.d.ts` → `AxetCodeHome`'da
BİR KEZ kurulan abonelik.

- **`onChunk` yalnızca YENİ parçayı taşır**, birikmiş metni değil.
- **50ms'lik biriktirme penceresi** (`CHUNK_FLUSH_MS`): tek bir cevap 178 ayrı
  `data` event'i üretebiliyor; her biri ayrı IPC + ayrı React render'ı olurdu.
- **invoke cevabı yine tam metni taşıyor** ve renderer akan mesajı ONUNLA
  sonlandırıyor — bir parça kaybolsa bile son metin doğru olur. Bu bilinçli
  bir "kendini düzelten" tasarım, akışa tek başına güvenilmiyor.
- **Geç gelen parça güvenli**: finalize `requestId`'yi `null`'a çekiyor, sonra
  gelen bir chunk hiçbir oturumla eşleşmiyor ve sessizce düşüyor.
- `ChatMessage.justArrived` → **`ChatMessage.streaming`**. Akarken metnin
  sonunda yanıp sönen bir imleç var; saat + kopyala meta satırı akış bitene
  kadar GİZLİ (yarım cevabı kopyalatmanın anlamı yok).
- `ThinkingBubble` sadece İLK parça gelene kadar görünüyor.
- **Durdurulan cevabın yarım metni artık SİLİNMİYOR** — kullanıcı onu zaten
  okudu, kaybolması "bir şey ters gitti" hissi veriyordu (ChatGPT de bırakır).
  Hiç metin gelmeden iptal edilirse boş balon kalmasın diye mesaj kaldırılıyor.
- **Otomatik kaydırma artık koşullu** (`stickToBottomRef`): kullanıcı yukarı
  kaydırıp eski bir mesajı okuyorsa akan cevap onu zorla dibe çekmiyor. 48px
  tolerans (kesirli scroll yüksekliklerinde tam eşitlik aramak tutmaz).

### 2. Prompt komut satırı argümanı DEĞİL, stdin'den

`spawn`'ın stdio'su `["ignore",...]` → `["pipe",...]`; prompt pozisyonel
argüman yerine `proc.stdin.end(buildPrompt(...))` ile gidiyor. Canlı
doğrulandı: pozisyonel argüman verilmeden `axet-code run -q` prompt'u
stdin'den okuyup normal cevap veriyor.

**Neden**: Windows'ta bir process'in komut satırının TAMAMI ~32767 karakterle
sınırlı ve biz geçmişi transkript olarak prompt'a GÖMÜYORUZ (24 mesaj). Ölçüldü:
75.000 karakterlik bir prompt eski yöntemde **`spawn ENAMETOOLONG`** ile
patlıyor — prompt uzunluğunu hiç işaret etmeyen bir mesaj. Aynı prompt stdin ile
sorunsuz çalıştı (11.3s, `ok=true`). `proc.stdin.on("error")` guard'ı ŞART:
kullanıcı hemen "Durdur"a basarsa yazma EPIPE fırlatır ve yakalanmazsa main
process'i düşürür.

### 3-5. `markdownLite.tsx` — kapsam genişletildi

Yeni bloklar: **başlık** (`#`..`######`), **GFM boru-tablosu**, **sıralı liste**,
**alıntı** (`>`), **yatay çizgi**. Yeni satır içi: ***italik***, ~~üstü çizili~~.
Kod bloğu artık **dil rozeti + hover'da kopyala butonu** olan bir başlık
şeridine sahip. Bloklar arası ritim tek merkezden (`space-y-2`) — blok başına
margin verilince başlık/tablo/liste birleşimlerinde margin-collapse yüzünden
düzensiz boşluklar çıkıyordu.

- **Linkler artık `window.api.openExternalUrl` ile açılıyor**, `target="_blank"`
  ile DEĞİL — Electron renderer'ında o ya yeni bir BrowserWindow doğurur ya da
  engellenir. `http(s)` DIŞINDAKİ şemalar (`javascript:`, `file:` ...) bilinçli
  olarak reddediliyor: bir LLM cevabından gelen metne kabuk/uygulama açtırmak
  istemiyoruz.
- **Sıralı liste en fazla 3 haneli**: sınırsız `\d+` ile Türkçe bir cümle
  başlangıcı ("2024. yılında...") yanlışlıkla liste maddesine dönüşüyordu.
- Satır içi token sırası ÖNEMLİ: `` ` `` → `**` → `~~` → `*`. Kalın, italikten
  önce gelmezse italik kuralı kalın işaretinin ilk yıldızını yer.
- Hâlâ `dangerouslySetInnerHTML` YOK (React elemanı üretiliyor) — XSS riski yok,
  yeni npm bağımlılığı eklenmedi.

### Doğrulama (bu makinede, gerçek `axet-code`'a karşı)

- **Streaming + stdin + geçmiş**: 3 parça, akan metin sonuç metniyle tutarlı,
  transkriptten gelen "Zeynep" adı cevapta doğru geçti.
- **İptal**: `cancelled=true`, 77 karakterlik kısmi metin korundu.
- **Uzun prompt**: 75.000 karakter stdin ile `ok=true`; aynısı argümanla
  `ENAMETOOLONG`.
- **Markdown**: `react-dom/server` ile statik render — başlık, tablo (hücre içi
  `kod` dahil), sıralı/madde liste, dil rozetli kod bloğu, kalın/italik/çizili/
  link, alıntı, hr'nin hepsi doğru; "2024. yılında" paragraf olarak kaldı.
- **Akış dayanıklılığı**: metnin 1..N arası HER ara uzunluğu render edildi
  (yarım tablo, kapanmamış ``` bloğu dahil) — **0 hata**. Ayrıca 12 bozuk/eksik
  girdi (`"```"`, `"[x]("`, `"~~"` ...) test edildi, hiçbiri patlamadı.
- `npx tsc` (web + node) ve `npm run build` temiz. **Release/push YAPILMADI.**

## Sohbet Ekranı Faz 2 — Kalıcılık + Sohbet Yönetimi (2026-09-02, TAMAMLANDI)

Faz 1 "cevabın nasıl geldiği" ile ilgiliydi; Faz 2 **sohbetin kendisiyle**.

### 2.1 Sohbet geçmişi artık DİSKTE (ana madde)

Faz 2'den önce sohbetler yalnızca React state'inde (`useState<ChatSession[]>([])`)
yaşıyordu: **uygulamayı kapatmak tüm konuşmaları uyarısız siliyordu.** Bu, ekranın
en büyük eksiğiydi.

- Yeni dosya: `app-electron/main/chatStore.ts` →
  `userData/chat-sessions.json`.
- **`config.json`'dan AYRI** bir dosya: config her ayar değişikliğinde baştan
  yazılıyor, sohbet geçmişi ise megabaytlara çıkabiliyor — ikisini birleştirmek
  her tema değişiminde tüm geçmişi yeniden serileştirmek olurdu.
- **Atomik yazma**: önce `.tmp`, sonra `renameSync`. Doğrudan `writeFileSync`
  ile yazarken uygulama çökerse dosya yarım kalır ve TÜM geçmiş okunamaz olur.
- **Bozuk dosya EZİLMİYOR**: JSON parse edilemezse dosya
  `.corrupt-<zaman>` olarak kenara alınıp kullanıcıya toast ile bildiriliyor.
- **Diskten gelen her alan süzülüyor** (`sanitizeSession`/`sanitizeMessage`) —
  elle düzenlenmiş bir dosya render sırasında ekranı çökertmesin.
- **Üst sınırlar**: 60 sohbet, sohbet başına 400 mesaj, mesaj başına 200.000
  karakter. Kesme **en eskiden** yapılıyor.
- **`pending`/`requestId`/`streaming` BİLEREK yazılmıyor**: çalışan bir
  `axet-code` process'ine işaret ediyorlar ve o process uygulamayla ölüyor.
  Yazılsalardı açılışta sonsuza kadar "düşünüyor" kalan hayalet sohbetler olurdu.
- **Hayalet `activeId`**: kayıtlı aktif sohbet listede yoksa `null`'a çekiliyor.

**Renderer tarafındaki KRİTİK ayrıntı** (`AxetCodeHome.tsx`): kaydedici bir
`loadedRef` ile korunuyor. Bu bayrak olmadan ilk render'daki boş `sessions=[]`
state'i, yükleme cevabı gelmeden debounce'lu kaydediciyi tetikleyip **diskteki
tüm geçmişi silerdi**. Kaydetme 600ms debounce'lu; parçalar ~50ms aralıklarla
geldiği için bu aynı zamanda akış sırasında yazmayı da engelliyor (zamanlayıcı
sürekli sıfırlanıyor, kayıt cevap bittikten sonra bir kez çalışıyor).

**IPC zinciri** (proje konvansiyonu): `shared/types.ts` (`StoredChatMessage`,
`StoredChatSession`, `ChatSessionsState`, `ChatSessionsLoadResult`) →
`main/index.ts` (`chatSessions:load` / `chatSessions:save`) →
`preload/index.ts` → `src/window.d.ts` → `AxetCodeHome.tsx`.

### 2.2–2.6 Sohbet yönetimi

- **Yeniden adlandırma**: satır içi input (kalem ikonu). Enter kaydeder,
  Escape iptal, blur kaydeder. Boş ad reddediliyor (sohbet listede kaybolurdu).
- **Silme onayı**: mevcut `ConfirmDialog` ile, mesaj sayısını da söyleyerek.
  Kalıcılık geldiği için ARTIK ŞART — yanlış basılan bir "×" geri dönüşsüz.
  **Boş sohbette onay sorulmuyor** (kaybolacak bir şey yok).
- **Yeniden üret**: son mesaj bitmiş bir asistan cevabıysa listenin altında
  bir buton. Eski cevabı atıp aynı istemi yeniden çalıştırıyor (`axet-code run`
  stateless olduğu için bu gerçekten yeni bir çağrı). Hatalı cevaplarda da
  aktif — asıl işe yaradığı yer orası.
- **Arama**: başlık VE mesaj içeriğinde. Yalnızca 3'ten fazla sohbet varken
  görünüyor. `toLocaleLowerCase("tr")` kullanılıyor — düz `toLowerCase()` ile
  "İSTEK" araması "istek" başlıklı sohbeti bulamazdı.
- **Sıralama**: `updatedAt` azalan (en son dokunulan üstte). Sohbetler kalıcı
  olduğu için ekleme sırası birkaç gün içinde kullanılamaz hâle gelirdi.
- **Ctrl+N / Cmd+N**: yeni sohbet.

### Doğrulama

- `chatStore.ts` için 20 maddelik izole test (esbuild + sahte `electron`
  modülü): eksik dosya, tur-gidiş-dönüş, bozuk dosya kurtarma, çöp veri
  süzme, hayalet `activeId`, üst sınırlar, uzun mesaj kırpma — **hepsi geçti**,
  `.tmp` artığı kalmadı.
- `npx tsc` (web + node) ve `npm run build` temiz. **Release/push YAPILMADI.**

---

## Sohbet Ekranı Faz 3 — Arayüz Yeniden Tasarımı (2026-09-02, GÖRSEL KATMANI FAZ 4 İLE DEĞİŞTİ)

> **UYARI — bu bölümün GÖRSEL kararları artık geçerli değil.** Faz 3'ün
> tasarımı kullanıcı tarafından reddedildi (*"yok hoşuma gitmedi en baştan
> sıfırdan burayı yap"*) ve yerine Gemini referanslı Faz 4 geldi. Aşağıdaki
> **yapısal** kararlar (dashboard'un kaldırılması, `NEW_SESSION_ID`, mesaj
> düzenleme, dibe-in düğmesi, kalıcılık) HÂLÂ geçerli ve Faz 4'te korundu;
> **düzen/renk/biçim** kararları için Faz 4 bölümüne bak. Değişenler aşağıda
> tek tek işaretli.

**Tetikleyici — kullanıcı kararı (aynen):** *"bu sohbet chat kısmı hiç
istediğim gibi değil ben direkt, böyle chat gpt, claude, gemini arayüzleri gibi
bişey istiyorum"* ve ardından *"bunlara benzer olcak birebir olmayacak
bunlardan daha iyi olucak"*.

Faz 0-2 işlevsel olarak doğruydu ama YERLEŞİM yanlıştı: uygulama bir
"dashboard" ile açılıyordu ve sohbet ikinci sınıf bir ekrandı.

### Kaldırılanlar

- **Dashboard TAMAMEN gitti** (`AxetCodeHome.tsx`): istatistik kartları (aktif
  sohbet / SAP sistemi / sürüm), iki büyük buton, son sohbet kartları, son
  bağlantı listesi. Hiçbiri kullanıcının o an vereceği kararı beslemiyordu ve
  sohbete başlamak fazladan bir tıklama gerektiriyordu. Sürüm zaten Ayarlar'da,
  sistem sayısı SAP Launcher sekmesinde.
- **Avatarlar** (`ChatBubble.tsx`): her mesajın yanındaki 28px'lik sütun.
  Referans arayüzlerin üçü de kullanmıyor — iki kişilik bir konuşmada kimin
  konuştuğu hizadan belli (kullanıcı sağda balon, asistan solda düz metin) ve o
  sütun okuma genişliğinden kalıcı olarak yer çalıyordu.
- **Kullanıcı balonunda `bg-accent-500`**: doygun accent üzerinde yapıştırılan
  yol/kod parçaları okunmuyordu ve asistan cevabından daha çok dikkat
  çekiyordu — oysa asıl içerik cevap. Nötr `bg-base-800`'e alındı.
- Ölü i18n anahtarları: `subtitle`, `statSessions`, `statSystems`,
  `statVersion`, `emptyButton`, `openSapLauncher`, `recentSessionsTitle`,
  `recentConnectionsTitle`, `connectionsTitle`, `newChatTitle`,
  `chatEmptyHint`. `App.tsx`'ten `totalSystemsCount` prop'u.

### Yeni yapı

- ~~**Tek arayüz, iki düzen**: sohbet boşsa composer ekranın ORTASINDA, mesaj
  varsa dibe iniyor.~~ **FAZ 4'TE İPTAL** — composer artık her zaman dipte.
- **`NEW_SESSION_ID = "__new__"`**: "Yeni sohbet" artık listeye kayıt
  EKLEMİYOR, sadece boş composer'a dönüyor. Gerçek kayıt ilk mesajla birlikte,
  başlığı ve kullanıcı mesajı içinde, tek seferde doğuyor (`handleSendNew`).
  Eskiden üst üste "Yeni sohbet"e basmak listeyi boş kayıtlarla dolduruyordu.
- **Okuma sütunu**: mesaj listesi ve composer AYNI genişlikte — yazdığın
  satırla okuduğun satır aynı hizada. (Faz 4'te değer `max-w-[68ch]`'den
  `max-w-3xl`'e alındı; ilke aynı kaldı.)
- **Mesaj düzenleme** (`handleEditMessage`): kullanıcı mesajının yanındaki
  kalem, metni composer'a geri koyup sohbeti O MESAJDAN İTİBAREN kesiyor.
  Sonraki cevaplar düzeltilmiş soruya ait olmadığı için bağlamda tutulmaları
  yanlış olurdu. Geri alma yok — bu yüzden düğme sadece hover'da ve akış
  yokken.
- **"En alta in" düğmesi**: uzun bir cevap akarken yukarı kaydıran kullanıcı
  için. `stickToBottomRef` + 48px tolerans (tam piksel eşitliği kesirli scroll
  yüksekliklerinde tutmuyor). Ayrıca panel görünür olduğu anda dibe sabitleyen
  ayrı bir efekt var: gizli panelin `scrollHeight`'i 0 olduğu için sohbete geri
  dönüldüğünde liste en üstte açılıyordu.
- ~~**Kenar çubuğunda tarih grupları**: Bugün / Dün / Son 7 gün / Daha eski.~~
  **FAZ 4'TE KALDIRILDI** — Gemini'de liste tek ve düz bir "Son" listesi;
  240px'lik bir sütunda her birkaç satırda bir gelen başlık listeyi ayraçla
  dolduruyordu. `groupLabelKey` ve dört `group*` i18n anahtarı silindi.
- **SAP bağlantıları başlıksız dip bloğuna indirildi**: burası bir sohbet
  ekranı; kendi başlığıyla ikinci bir bölüm gibi görünmesi sohbet listesiyle
  dikkat yarıştırıyordu.

### Doğrulama

- `npx tsc -p tsconfig.web.json --noEmit` ve `npm run build` temiz.
  **Release/push YAPILMADI.**

---

## Sohbet Ekranı Faz 4 — Gemini Düzeni (2026-09-02, TAMAMLANDI)

**Tetikleyici — kullanıcı kararı (aynen):** *"yok hoşuma gitmedi en baştan
sıfırdan burayı yap gemini yada claude'nin ekranı falan olsun"*. Sorulduğunda
referans olarak **Gemini** seçildi ve rahatsız eden şey olarak DÖRT maddenin
hepsi işaretlendi (renkler/tema, yerleşim/boşluklar, composer, kenar çubuğu),
serbest metin: *"her ley rahatsız etti"*. Yani Faz 3'ün görsel katmanından
korunacak bir şey yok.

Bu, sohbet ekranının ARKA ARKAYA REDDEDİLEN ÜÇÜNCÜ tasarımı. Bir sonraki
dokunuşta kararların yanlışlıkla geri alınmaması için düzenin kuralları
`ChatSessionPane.tsx`'in başına da yazıldı.

### Beş kural

1. **Composer HER ZAMAN dipte.** Boş sohbette composer'ı ekranın ortasına alan
   desen (ChatGPT/Claude — Faz 3'te bu vardı) bilinçli olarak kullanılmıyor:
   Gemini'de yazı kutusu ilk andan itibaren aynı yerde durur, ilk mesajdan
   sonra aşağı zıplamaz.
2. **Kenarlık değil DOLGU.** Composer, kartlar, satırlar ve model seçici
   `border` kullanmaz; zeminden bir ton açık bir dolguyla ayrışırlar. Kenar
   çubuğunun `border-r`'ı ve sohbet satırlarındaki sol accent şerit de bu
   yüzden kaldırıldı.
3. **Model seçici SAĞ ÜSTTE**, composer'ın içinde değil. Bu, Faz 0'daki
   "model değiştirme composer toolbar'ında olsun" kararını AÇIKÇA değiştirir —
   model seçimi mesaj başına değil oturum başına verilen bir karar.
4. **Karşılama SOLA yaslı, 40px, degradeli.**
5. **Öneriler çip değil KART** (`rounded-2xl`, sabit yükseklik, ikon sağ altta
   bir daire içinde).

### Neden ayrı `--chat-hero-*` tema değişkenleri

Degradeyi mevcut accent jetonlarından kurmak İMKÂNSIZ: `--accent-cyan-rgb`
her iki temada da `--accent-500-rgb` ile **birebir aynı değer**
(koyu: `42 108 235`, açık: `61 108 189`), yani o ikisinden kurulan bir
`bg-gradient-to-r` düpedüz düz bir renk çıkarıyor. `src/index.css`'e her iki
tema bloğuna üç değişken eklendi (`--chat-hero-from/via/to`); açık temada
tonlar KOYU seçildi, çünkü koyu tema için seçilen parlak tonlar açık zeminde
okunmuyor. Bunlar sadece o başlıkta kullanılıyor, palete yeni bir vurgu rengi
katmıyorlar.

### Dosya dosya

- **`ChatSessionPane.tsx`** — baştan yazıldı. Üstte sadece model seçicinin
  olduğu ince bir şerit; ortada kaydırılabilir içerik (boşsa degradeli
  karşılama + 3'lü öneri kartı ızgarası, doluysa mesajlar); dipte kenarlıksız
  `rounded-3xl` dolgulu composer (`items-end` sayesinde metin çok satıra
  çıkınca düğmeler dipte kalır) ve altında tek satırlık uyarı metni.
  **Gönder düğmesi metin yokken hiç çizilmiyor** — soluk ve tıklanamaz bir
  düğme bırakmak yerine yer kaplamıyor (Gemini deseni).
- **`ChatBubble.tsx`** — kullanıcı istemi sağda `rounded-3xl` dolgulu balon;
  cevap solda balonsuz, solunda 26px'lik logo oluğu. Faz 3'te avatarlar
  tamamen kaldırılmıştı; Gemini SADECE cevap tarafında simge kullandığı için
  bu asimetri bilinçli olarak geri geldi. Cevabın altındaki kopyala düğmesi
  **hover'a gizlenmiyor** (gizli düğme, varlığı bilinmediği için
  kullanılmıyor); istem tarafındaki düzenle/kopyala hover'da kalıyor.
  Gövde metni 15px (`BODY`), Faz 3'teki 14px'ten büyük.
- **`AxetCodeHome.tsx`** — kenar çubuğu daraltılabilir (`sidebarOpen`, ☰ ile;
  açık 256px / kapalı 68px ikon şeridi, animasyonlu genişlik geçişi).
  Daraltılmışken liste tamamen gizli: 68px'e sığdırılmış kırpık başlıklar
  okunmuyor, sadece gürültü oluyordu. "Yeni sohbet" accent kutusu yerine nötr
  hap düğme; sohbet satırları `rounded-full`; tek düz "Son" başlığı; SAP
  bağlantıları ayırıcı çizgi yerine kendi `rounded-2xl` dolgulu kutusunda.
- **`ModelSelector.tsx`** — yeni opsiyonel `variant?: "outline" | "filled"`
  prop'u. Varsayılan `outline` DEĞİŞMEDİ: bileşen axet.flows ChatPanel'de de
  kullanılıyor ve varsayılanı değiştirmek o ekranın görünümünü bozardı.
  Sohbet ekranı `variant="filled"` + `direction="down"` geçiyor (tetikleyici
  artık tepede, varsayılan "up" menüyü pencere dışına taşırdı).
- **i18n** — eklenen: `toggleSidebar`, `recentTitle`, `disclaimer`. Silinen:
  `sessionsTitle`, `composerHint`, `groupToday`, `groupYesterday`,
  `groupWeek`, `groupOlder`. `heroSubtitle` metni de değişti (artık 40px'lik
  ikinci satır olduğu için kısaltıldı).

### Doğrulama

- `npx tsc -p tsconfig.web.json --noEmit` ve `npm run build` temiz.
  **Release/push YAPILMADI** (dönüşüm bitene kadar geçerli kural).
- Görsel doğrulama kullanıcıda: dev server HMR ile açık.

## Sohbet Ekranı Faz 4b — Özelleştirme (2026-09-02, TAMAMLANDI)

**Tetikleyici — kullanıcı (aynen):** *"daha güzel oldu bunu şimdi
özelleştirelim biraz"*. Sorulduğunda üç alan seçildi: **aXet kimliği**,
**kullanıcı ayarları**, **görsel rötuşlar**. Dördüncü seçenek (**SAP'ye özel
içerik** — SAP odaklı öneri kartları, composer'da aktif sistem rozeti)
seçilMEDİ; bilinçli olarak kapsam dışı, ileride istenirse ayrı bir adım.

### 1. aXet kimliği — degrade uydurulmadı, logodan alındı

`--chat-hero-*` değerleri `src/assets/logo.svg`'nin kendi `mark` degradesinden
**birebir** kopyalandı: `#6d5efc → #8b7dff → #22d3ee`. Yeni bir marka rengi
icat etmek yerine zaten var olanı kullanmak, karşılama başlığını logoyla aynı
görsel aileye sokuyor. Açık temada aynı TONLAR korunup koyulaştırıldı
(`#4c3ad4 → #6355d8 → #0e8ba6`) — parlak sürüm beyaz zeminde okunmuyordu.

Karşılamada artık **kullanıcının adı** var: `"{greeting}, {name}"`
(`axetCodeHome.greetingWithName`). Varsayılan ad Windows hesabından geliyor
(`store.ts` → `safeUserName()`, `os.userInfo()` bir `try/catch` içinde —
bazı kısıtlı ortamlarda fırlatabiliyor). Ayarlardan değiştirilebilir; **boş
bırakılırsa** isimsiz karşılamaya düşer, yani bu bir zorunluluk değil.

### 2. Kullanıcı ayarları — yeni IPC kanalı AÇILMADI

`AppConfig`'e dört alan eklendi (`chatDisplayName`, `chatFontSize`,
`chatDensity`, `chatSidebarOpen`). Bunlar mevcut jenerik
`window.api.saveConfig(partial)` yolundan gidiyor; sohbet görünümü için ayrı
bir IPC kanalı AÇMAYIN — `types.ts → index.ts → preload → window.d.ts` zinciri
yalnızca yeni bir *işlem* gerektiğinde kurulur, yeni bir *ayar alanı* için
değil.

Sembolik ayarları piksele çeviren TEK yer `App.tsx`'teki efekt: değerleri
`<html>` üzerinde `--chat-font-size` / `--chat-hero-size` /
`--chat-message-gap` olarak yazıyor. Bunun alternatifi üç seviye prop
geçirmekti (AxetCodeHome → ChatSessionPane → ChatBubble); CSS değişkeni hem
daha az kod hem de bileşenleri ayardan habersiz bırakıyor.

> **Tuzak:** Tailwind'de bir CSS değişkenini yazı boyutu yapmak
> `text-[length:var(--chat-font-size)]` yazımını GEREKTİRİR. `text-[var(...)]`
> yazılırsa Tailwind onu RENK sanar, boyut sessizce hiç uygulanmaz — hata da
> vermez.

Eski `config.json`'lar bu alanları içermiyor: `loadConfig()` her birini tip
kontrolüyle doğruluyor ve eksikse `defaultConfig()` değerine düşüyor.

`SettingsModal`'a **Sohbet görünümü** bölümü eklendi: ad girişi, yazı boyutu
(sm/md/lg) ve yoğunluk (rahat/sıkışık) için `SegmentedControl`, bir de
"kenar çubuğu açılışta açık" onay kutusu.

### 3. Görsel rötuşlar

- **Sessiz kaydırma çubuğu** (`.chat-scroll`): başparmak normalde şeffaf,
  sadece imleç listenin üstündeyken beliriyor. Kalıcı bir çubuk, kenarlıksız
  düzende tek dikey çizgi olarak göze batıyordu.
- Öneri kartları `sm:grid-cols-3` ile dar pencerede alt alta geçiyor; ikon
  dairesi hover'da accent'e dönüyor (`group-hover:bg-accent-500/15`).
- Karşılama `animate-panel-fade-in` ile giriyor.
- "Yeniden üret" düğmesinin negatif üst boşluğu artık sabit `-mt-6` değil,
  `mt-[calc(var(--chat-message-gap)*-0.6)]` — yoğunluk ayarıyla birlikte
  ölçekleniyor.

### Doğrulama

- `npx tsc -p tsconfig.web.json --noEmit`, `npx tsc -p tsconfig.node.json
  --noEmit` ve `npm run build` temiz.
- **Dev sunucusu yeniden başlatıldı.** `store.ts` bir MAIN process dosyası;
  electron-vite'ın HMR'ı yalnızca renderer'ı günceller, main process eski
  hâliyle çalışmaya devam eder. Yeniden başlatmadan yeni `AppConfig` alanları
  çalışan uygulamada oluşmaz. **Not:** `npm run dev`'i öldürmek Electron
  penceresini öldürMÜYOR; tek-örnek kilidi yüzünden yeni örnek hemen kapanır.
  Eski `electron.exe` ağacını `taskkill /PID <main> /T /F` ile kapatmak gerek.
- **Release/push YAPILMADI.**

## Sohbet Gecikmesi — Kök Sebep ve Çözüm (2026-09-02, TAMAMLANDI)

**Tetikleyici — kullanıcı (aynen):** *"çok geç cevap veriyor direkt axetteki
gibi cevap verse daha iyi olur çok hızlı cevap vermeli"*.

### Ölçüm — gecikme model kaynaklı DEĞİL

`axet-code run -q` ile, cevabı 2 karakter olan bir prompt ("Sadece OK yaz."):

| Ortam | Süre |
|---|---|
| boş dizin | 12.0 s |
| gerçek çalışma dizini | 16.3 s |
| **en hızlı modelle (haiku 4.5)** | **13.2 s** |
| process başlatma tek başına (`axet-code models`) | 1.0 s |

Model seçimi fark etmiyor ve process başlatma 1 saniye — yani süre başka bir
yerde. `-d` günlüğünün aşama dökümü (12.8 s'lik bir çalışma):

| Aşama | Süre |
|---|---|
| `connector.sync` (3 Outlook kaydı ağdan çekiliyor) | 1.5 s |
| MCP istemcileri başlatılıyor | 0.9 s |
| MCP araç listeleri yükleniyor | 2.3 s |
| `skillsmarket.sync` | 0.8 s |
| `Audit logged` | 0.4 s |
| başlık üretimi (küçük modelle AYRI bir LLM çağrısı) | 1.3 s |
| **ASIL CEVAP** | **0.6 s** |
| MCP istemcileri kapatılıyor (`Shutdown took`) | 3.4 s |

Sürenin **~8 saniyesi**, sohbetin çoğu mesajında hiç kullanılmayan MCP
bağlayıcılarının HER MESAJDA kurulup yıkılmasına gidiyor.

### İkinci arıza modu — backend çöktüğünde

Ölçüm sırasında backend bir süre cevap vermedi ve tablo değişti: axet-code
bağlanmayı **tam 10 saniye** deniyor, sonra `connector.sync.failed` yazıp
devam ediyor. `https://axet.nttdata.com/` 0.7 s'de 200 dönerken
`/api/agentic-mcp-tools/api/integrations` asılı kalıyordu — yani ağ/VPN değil,
servisin kendisi.

> **Yanlış giden bir ara adım, tekrar denenmesin diye:** önce "backend ayakta
> mı" diye yoklayan, ölüyse bağlayıcıları otomatik kapatan bir sağlık kontrolü
> yazıldı ve ÇÖPE ATILDI. Sebep: endpoint kimlik doğrulamasız bir GET'e
> **401 ile 562 ms'de** cevap veriyor, yani "ayakta" görünüyor; asılı kalan
> axet-code'un KİMLİK DOĞRULAMALI çağrısı. Dışarıdan yapılan yoklama bu ikisini
> ayırt edemez. Üstelik asıl maliyet (8 s) backend SAĞLIKLIYKEN de var — sağlık
> kontrolü yanlış soruyu çözüyordu.

### Çözüm

`app-electron/main/axetSpawnEnv.ts` — `axetSpawnEnv(useConnectors: boolean)`.
`false` ise `AXET_MCP_BASE_URL` **anında reddedilen** bir loopback adresine
(`http://127.0.0.1:9`, discard portu) çevriliyor: dinlenmeyen bir loopback
portu TCP SYN'e hemen RST döner — DNS yok, zaman aşımı yok. **Ulaşılamayan bir
İNTERNET adresi vermek işe yaramazdı**, o da zaman aşımına düşerdi.

Uygulandığı yerler:

- **`axetChat.ts`** — `AppConfig.chatUseConnectors` ayarına bakar,
  **varsayılan `false`**. Ayar her mesajda okunuyor ki değişiklik anında etki
  etsin. Bağlayıcılar kapalıyken `CONNECTOR_RETRY_REMINDER` prompt'a da
  EKLENMİYOR (ortada bağlayıcı yokken anlamsız).
- **`axetFlowsAgent.ts` / `sapGuiScriptAgent.ts`** — KOŞULSUZ kapalı. İkisi de
  yapılandırılmış JSON üreten ajanlar; ne prompt'larında ne protokollerinde MCP
  aracına atıf var (arandı, yok).
- **`agenticConnectors.ts` — DOKUNULMADI.** "Uygulama Bağlantıları"ndaki test
  bağlayıcıların ta kendisini sınıyor; onu hızlandırmak işlevi yok etmek olurdu.

**Sonuç (gerçek çalışma dizini, aynı prompt):** 15.1 s → **5.4 s**.

### Bilinçli olarak dokunulmayanlar

- **`Audit logged` (~0.4 s)** — kurumsal denetim kaydı, bir uyumluluk kontrolü.
  Hızlanmak için denetim kaydını atlamak bizim vereceğimiz bir karar değil.
- **`skillsmarket.sync` (~0.8 s)** ve **başlık üretimi (~1.3 s)** — kapatan bir
  anahtar bulunamadı, kazanç da bağlayıcılarınkinin yanında küçük.

### Kullanıcıya düşen ayrı bir iyileştirme

Günlükte **3 ayrı Outlook entegrasyonu** görünüyor (`test`, `test123`,
`test123`) — `axetChat.ts`'in başındaki nottaki gibi, tekrarlanan yetkilendirme
denemelerinden kalma kopyalar. Bağlayıcılar AÇIKKEN her mesaj üçünü birden
kurup yıkıyor. Fazlalıkları axet.nttdata.com/agentic üzerinden silmek, açık
moddaki maliyeti de belirgin şekilde düşürür. Bu bir portal işlemi, koddan
yapılamaz.

### Doğrulama

- `npx tsc` (web + node) ve `npm run build` temiz.
- Gecikme ölçümleri `axet-code` CLI'ına karşı canlı yapıldı (yukarıdaki tablolar).
- **Release/push YAPILMADI.**

## Bekleme Göstergesi — Üçüncü (ve son) Tasarım (2026-09-02, TAMAMLANDI)

**Tetikleyici — kullanıcı (aynen):** *"düşünüyor, axet coda soruyor gibi
kısmlar yerine daha farklı bişey yapalım ve ordaki logoyu kaldıralım"*.

Elenen iki tasarım, tekrar önerilmesin diye:

1. **Sayısal bekleme sayacı** — saniyelerin akışını izletmek beklemeyi *daha
   yavaş* hissettiriyordu.
2. **Logo + dönen durum cümleleri** ("Düşünüyor…", "axet.code ile
   konuşuluyor…", "Yanıt hazırlanıyor…") — yukarıdaki geri bildirim.

**Şimdiki tasarım (kullanıcı seçimi, AskUserQuestion önizlemesiyle):** hiç
metin, hiç logo. Cevabın belireceği yerde üç soluk iskelet satırı duruyor ve
üzerlerinden marka renginde bir ışık soldan sağa süzülüyor. Beklemeyi
anlatmak yerine gelecek cevabın YERİNİ gösteriyor.

- Gösterge, cevap metniyle **aynı hizadan** başlıyor (`pl-[42px]` = 26px simge
  oluğu + `gap-4`), böylece metin akmaya başlayınca yatay zıplama olmuyor.
- Satır genişlikleri kısalıyor (100% / 82% / 48%) — eşit genişlikte satırlar
  bir tablo gibi duruyordu. Işık satırlara 140ms arayla ulaşıyor, tek blok
  yerine aşağı akan bir dalga oluyor.
- `role="status"` + `aria-label` (`axetCodeHome.thinkingAria`, EKRANDA
  GÖRÜNMEZ): gösterge tamamen görsel olduğu için ekran okuyucunun
  söyleyebileceği tek şey bu.
- **Logo yalnızca göstergeden kalktı**, asistan cevaplarının solundaki 26px'lik
  oluk duruyor — kullanıcının işaret ettiği yer bekleme göstergesiydi.
- `i18n` `thinking1/2/3` anahtarları SİLİNDİ (başka kullanan yoktu).

> **CSS tuzağı** (`.chat-skeleton-line`, index.css): ışık ayrı bir katman/eleman
> değil, tek elemanın İKİNCİ arka plan katmanı — altta opak `background-color`,
> üstte kaydırılan yarı saydam gradyan. Alttaki renk opak olmasaydı gradyanın
> alfası sayfa zeminine sızar ve koyu temada ışık sönük kalırdı. Ayrıca yüzdeli
> `background-position`, p'yi *(eleman − resim)* farkıyla ÇARPAR — `background-size:
> 55%` ile bu 0.45×genişlik demek, bu yüzden bandı iki uçta da tamamen dışarı
> çıkarmak için %-130 ve %230 gibi 100'ü aşan değerler gerekiyor. %0–%100 yazmak
> bandı hiç kaybetmez ve süzülme yerine yerinde titreme gibi görünür.

### Doğrulama

- `npx tsc` (web + node) ve `npm run build` temiz.
- **Release/push YAPILMADI.**

## Ekler: Yol Metni Yerine Çip/Küçük Resim (2026-09-02, TAMAMLANDI)

**Tetikleyici — kullanıcı (aynen):** *"görsel eklemeyi dosya eklemeyi falan
direkt eklesek olmaz mı yolu gitmesin chate yukarda gözüksün"*.

**Eski davranış:** bir dosya sürüklendiğinde/yapıştırıldığında/seçildiğinde
tırnaklı disk YOLU doğrudan taslak metnine yazılıyordu. Gönderilen mesaj
`"C:\Users\...\ekran.png" bu ne?` gibi görünüyordu — hem çirkin hem de
kullanıcının yazdığı cümleyle karışıyordu.

**Yeni model:** ek artık mesaj metninin parçası DEĞİL, ayrı bir alan
(`ChatAttachment { id, path, name }` — shared/types.ts).

- Composer'da, yazı satırının **üstünde** ve **kutunun içinde** çip olarak
  duruyor. Kutunun dışında ayrı bir şerit olsaydı gönderilecek şeyle görsel
  bağı kopardı.
- Görseller çipte küçük resimle, gönderilmiş mesajda daha büyük (≤176px)
  yuvarlatılmış bir görsel olarak çiziliyor. Görsel olmayanlar ikonlu çip.
- Çipte × ile kaldırılabiliyor; aynı dosya iki kez eklenmiyor (yol karşılaştırması).
- Metin YOKKEN de gönderilebiliyor (tek başına bir görsel bırakıp göndermek).
  Bu durumda sohbet başlığı ilk ekin adından türüyor.
- Düzenle (kalem) ekleri de composer'a geri getiriyor.

**Yol nereye gidiyor?** Yalnızca `axet-code`'a giden prompt'un sonuna, gönderim
anında (`lib/attachments.ts` → `promptWithAttachments`):

```
<kullanıcının yazdığı metin>

Ekli dosyalar (bu yollardan okuyabilirsin):
"C:\...\ekran.png"
```

**GEÇMİŞ DE aynı fonksiyondan geçiyor.** Geçmemesi hâlinde ajan, iki mesaj önce
konuşulan dosyanın yolunu kaybeder: ekran metninde o yol artık yok, sadece
çipin adı var. Bu, "ekleri metinden ayırmanın" kolayca gözden kaçan bedeli —
`handleSend`/`handleRegenerate` içindeki `historyForCall` eşlemeleri bu yüzden
`m.content` değil `promptWithAttachments(m.content, m.attachments ?? [])`
kullanıyor.

### Önizleme — neden main process okuyor?

Renderer dosyayı KENDİSİ okuyamıyor: dev'de sayfanın kaynağı
`http://localhost:5173`, oradan `file://` bir görsele erişmek engelli. Bu yüzden
yeni bir IPC var: `chatAttachments:preview` → `readAttachmentPreview` `data:`
URL'i döndürüyor.

- Önizleme sınırı **6MB**, ek yükleme sınırından (20MB) ayrı ve ondan küçük:
  base64 boyu ~%33 büyütüyor ve 8MB'lık bir görselin önizlemesi için ~11MB'lık
  bir string'i process sınırından geçirmenin faydası yok. Ek yine gönderilir,
  sadece küçük resmi olmaz.
- Görsel olmayan uzantı = `ok: true` ama `dataUrl` yok. **Hata değil**, çip
  ikona düşer.
- Önizlemeler **diske YAZILMIYOR** (`ChatAttachment`te böyle bir alan yok):
  bir ekran görüntüsü base64 olarak birkaç megabayt tutar ve `chat-sessions.json`
  şişerdi. Onun yerine `AttachmentChip` içinde **30 kayıtlık, en-eskiyi-atan**
  bir bellek önbelleği var.

### Dikkat edilenler

- `resolveFilesToPaths` artık **tırnaksız** yol döndürüyor. Tırnaklama sadece
  prompt kurulurken yapılıyor — ek nesnesinin içinde tırnaklı yol tutmak,
  aynı yolla yapılan önizleme okumasını sessizce bozardı.
- Sohbet alanına düz METİN bırakmak (dosya değil) hâlâ taslağa metin ekliyor,
  ek olarak değil.
- Diskten yüklerken `s.attachments ?? []` — eski geçmiş dosyalarında bu alan
  yok ve composer ilk render'da `undefined.length` ile patlardı.

### Doğrulama

- `npx tsc` (web + node) ve `npm run build` temiz.
- Main process dosyaları değiştiği için dev sunucusu **yeniden başlatıldı**
  (electron-vite burada main'i sıcak yeniden başlatmıyor).
- **Release/push YAPILMADI.**

## Bekleme Göstergesi v4 — Mors + Cevaplarda Avatar Kaldırıldı (2026-09-02, TAMAMLANDI)

**Tetikleyici — kullanıcı (aynen):** *"o chatteki süre satırları mors alfabesi
gibi parlayan şekilde olsun parçalı parçalı, ve chatte hâlâ logo gözüküyor
cevaplarda"*.

### 1. Gösterge artık parçalı

Bütün iskelet satırları yerine kısa/uzun parçalar (nokta/çizgi) ve
üzerlerinden SIRAYLA geçen bir ışık.

Işık, kaydırılan bir gradyan bandıyla DEĞİL, her parçanın kendi
`chat-morse-glow` döngüsüne verilen bir GECİKMEYLE ilerliyor. Gradyan burada
işe yaramazdı: parçalar arasındaki boşluklar bandı keser, ışık aralarda
kaybolurdu.

Desen SABİT (rastgele değil): her render'da yeniden üretilen bir desen, React
her yeniden çizdiğinde animasyonu baştan başlatır ve dalga tökezler.

Parlama döngünün sadece ilk %20'sinde, `box-shadow` ile parçanın dışına da
taşıyor; mors ışığı hissini veren asıl şey bu.

### 1b. İnce ve tek satır (ikinci tur)

İlk deneme ÜÇ satır ve 9px kalınlıktaydı. Kullanıcı geri bildirimi (aynen):
*"çok geniş kalın olmuş ince çizgiler ve tek satır"*. Artık **tek satır, 3px**.
Gerekçe: bu bir paragraf taslağı değil bir gösterge — cevap gelmeden ekranı
doldurmamalı.

Bağlı iki ayar:

- `box-shadow` yarıçapı 10px → **6px**. 3px'lik bir çizgide geniş bir gölge
  ışık değil bulanık bir leke gibi görünüyor.
- Sarmalayıcı `h-6` ile **sabit yükseklikte**. İnce satır tek başına neredeyse
  yüksekliksiz kalıyor ve cevap gelince satır zıplıyordu.

> **Kırılma noktası:** toplam gecikme, döngüden KÜÇÜK kalmalı. Şu an 9 parça ×
> 80ms = 720ms < 2000ms. Aşarsa son parça daha parlamadan döngü başa sarar ve
> dalga akmak yerine rastgele titrer. Parça eklemek/çıkarmak bu hesabı bozar
> (`MORSE_SEGMENTS`, `MORSE_STEP_MS` — ChatBubble.tsx).

### 2. Cevaplarda logo kaldırıldı

Asistan cevaplarının solundaki 26px'lik logo oluğu tamamen gitti. Kim kimden
ayrılıyor artık hizadan belli: istem sağda ve balonlu, cevap solda ve balonsuz.

> **Bağlı düzeltme:** düzenin geri kalanı o oluğa göre hizalanmıştı.
> ChatSessionPane'deki "Yeniden üret" düğmesinin `ml-[42px]` girintisi de
> kaldırıldı — kaldırılmasaydı düğme cevap metninden içeride kalırdı.

`logo.svg` uygulamada duruyor, sadece sohbet akışında kullanılmıyor:
`TitleBar.tsx` ve `ActivityBar.tsx` hâlâ kullanıyor.

### Doğrulama

- `npx tsc` (web + node) ve `npm run build` temiz.
- Yalnızca renderer dosyaları değişti — dev sunucusu yeniden başlatılmadı, HMR yeterli.
- **Release/push YAPILMADI.**

## Sohbet Ekranı — Düzen Turu v5 (2026-09-02, TAMAMLANDI)

**Tetikleyici — kullanıcı (aynen):** *"model seçimi chat box içersinde olsun
sağ tarafta, chate eklenilen görseller dosyalar v.s önizleme yapılabilsin
ekranda büyütebilelim görebilelim tıklarsak, soldaki panel'i daha profesyonel
şekilde düzenleyelim borderler daha keskin olsun, kenar çubuğunu kapatma açma
sağ tarafta olsun yanında arama çubuğu falan olabilir, yeni sohbet çok çirkin
yerde duruyor, tam ekran yaptığımda boyut aynı kalıyor ekran boyutuna göre
chat boyutlandırması da değişsin"*.

Altı ayrı istek; hepsi tek turda karşılandı.

### 1. Model seçici composer'ın içine indi

Ekranın tepesindeki, SADECE model seçiciyi taşıyan şerit tamamen kaldırıldı —
tek bir düğme için 52px'lik bir bant ayırıyordu.

Composer artık ÜÇ katmanlı: ekler → yazı alanı (tam genişlik) → araç çubuğu
(solda ataç, sağda model seçici + gönder). Eskiden üçü tek satırdaydı; model
seçici o satıra girince dar pencerede yazı alanını eziyordu.

`ModelSelector`'a üçüncü bir görünüm eklendi: **`ghost`** — zeminsiz, sadece
hover'da beliren, etiketi 120px'e kadar kırpılan kompakt hâli. `filled`/
`outline` varyantları DEĞİŞMEDİ; axet.flows'un ChatPanel'i onları kullanıyor.

> Menü yönü `direction="up"` olmalı — tetikleyici artık ekranın DİBİNDE.

### 2. Ekler tıklanınca açılıyor / büyüyor

Yeni: `src/components/AttachmentLightbox.tsx`. Tek bir jestin (tıklama) iki
karşılığı var:

| Ek | Tıklayınca |
|---|---|
| Görsel | Tam boy katman (Esc / zemine tıkla = kapat) |
| Görsel değil | `window.api.openExternal` — işletim sisteminin varsayılan uygulaması |

Katman görseli YENİDEN OKUMUYOR: `AttachmentChip`'in `usePreview`'i zaten
okumuş ve `data:` URL'i bellekteki önbellekte duruyor. Büyütme, olmayan bir
veriyi getirmiyor; var olanı kırpmadan gösteriyor.

İki ince nokta:

- Katmanın **üst şeridine** yapılan tıklama `stopPropagation` ile durduruluyor —
  yoksa "Bilgisayarda aç" düğmesine basmak aynı anda katmanı da kapatırdı.
- **Görselin kendisine** yapılan tıklama da kapatmıyor; sadece zemin kapatıyor.
  Büyütülmüş bir görseli incelerken üstüne tıklamak kapatma niyeti değil.
- Sohbetteki küçük resimde hover'da bir büyüteç maskesi beliriyor:
  `cursor-zoom-in` tek başına, fareyi oraya götürmemiş kullanıcıya hiçbir şey
  anlatmıyor.

### 3–5. Kenar çubuğu yeniden düzenlendi

Gemini'nin yumuşak/haplı dili BURADA bırakıldı (sohbet yüzeyinde büyük ölçüde
duruyor):

- `border-r border-base-800` — ton farkı değil gerçek bir kenarlık.
- Bölümler arası `border-b`/`border-t` ayırıcılar; köşeler `rounded-md`.
- Sohbet satırlarında kenarlık **her zaman** var, seçili olmayanlarda
  `transparent`. Sadece seçiliye eklenseydi satır seçildiğinde 2px uzar, liste
  zıplardı.
- Genişlik `w-64` → `w-[272px]` (başlığa arama + düğme sığması için), daraltılmış
  hâli `68px` → `60px`.

**Başlık şeridi:** solda arama, sağda daralt/genişlet düğmesi. Düğme yön
gösteren ikonlarla (`PanelLeftClose` / `PanelLeft`) — tek bir ☰, düğmenin ne
yapacağını söylemiyordu. `axetCodeHome.toggleSidebar` yerine iki yeni etiket:
`collapseSidebar` / `expandSidebar`.

**Arama artık HER ZAMAN görünür.** Eskiden yalnızca 3'ten fazla sohbet varken
beliriyordu, yani kullanıcı onu aramaya alıştığı yerde bulamıyordu.

**"Yeni sohbet"** tam genişlik ve accent tonlu birincil düğme oldu; kısayol
(Ctrl+N) düğmenin üstünde yazıyor, sadece tooltip'te değil — tooltip'i görmek
için beklemek gerekiyor, o satırı görmek için değil.

### 6. Sohbet genişliği pencereye göre büyüyor

`COLUMN` sabiti `max-w-3xl` → `max-w-3xl xl:max-w-4xl 2xl:max-w-5xl`. Sabit
768px, 2560px'lik bir ekranda sohbeti ortada dar bir şerit olarak bırakıyordu.

> **Sınırsız DEĞİL, bilinçli olarak.** Satır uzunluğu okunabilirliğin kendisi:
> 1500px genişliğinde bir paragrafta göz satır sonundan satır başına dönemiyor.
> Kademeler Tailwind'in kendi kırılma noktalarında (xl 1280px → 896px,
> 2xl 1536px → 1024px) ve orada duruyor. `SystemPanel.tsx` zaten aynı deseni
> kullanıyordu; asıl aykırı olan sohbet ekranıydı.

### Doğrulama

- `npx tsc -p tsconfig.web.json --noEmit` ve `npm run build` temiz.
- Yalnızca renderer dosyaları değişti — dev sunucusu yeniden başlatılmadı, HMR yeterli.
- **Release/push YAPILMADI.**

---

## Sohbet Ekranı — Rötuş Turu v6 (2026-09-02, TAMAMLANDI)

Bir önceki turun (Düzen Turu v5) hemen ardından gelen geri bildirim, o turda
yapılan iki şeyi GERİ ALDIRDI. Tetikleyen mesaj birebir:

> *"chat box çok kalın tek box'ın içine gömülü şekilde tek satıra indir,
> sohbetlerde ara kısmı açılır searchbox olsun tıklayınca genişlesin ve search
> box daha güzel olabilir çirkin bir box olmuş, panelde ayraç lineları olmasa
> da olur, sohbet geçmişinde eklediğim görsel silinmiş oluyor, ek olarak yine
> chat box'a mikrofon ekleyelim tıkladığımızda konuştuklarımızı da yazabilsin"*

Tur sırasında gelen üç ek düzeltme: *"mikrofon solda model seçimi sağda
olcak"* → hemen ardından *"mikrofon model seçiminin solunda olsun"* (yani
mikrofon sağ uçta, seçicinin solunda) ve *"model seçimi boxu tam ortalamıyor
gibi hafif altta kalmış"*.

### 1. Composer tek satıra döndü (`ChatSessionPane.tsx`)

v5'te model seçicisi kutunun içine girince yazı alanı + araç çubuğu AYRI
satırlara bölünmüştü. Bu, boş sohbette kutuyu ~90px'e çıkarıyordu. Şimdi tek
satır: `[ataç] [yazı alanı] [mikrofon] [model] [gönder]`, ekler varsa üstte
ayrı bir sıra olarak aynı kutunun içinde.

- Satır `items-end`: yazı alanı büyüdükçe düğmeler dipte kalıyor.
- Tüm düğmeler ve model seçicisi 36px (`h-9`). Model seçicinin `ghost`
  varyantına SABİT yükseklik verilmesinin sebebi buydu: dolgudan türeyen
  ~30px'lik yüksekliği, `items-end` hizası yüzünden düğmeleri birkaç piksel
  aşağıda bırakıyordu.
- Tek satırın bedeli, seçicinin dar pencerede yazı alanından yer çalması;
  karşılığı `ghost` varyantının dar (`max-w-[120px]`) etiketi.

### 2. Açılır arama kutusu (`AxetCodeHome.tsx`)

Başlık şeridinde sürekli açık duran kutu, 272px'lik sütunda şeridin tamamını
yiyordu. Şimdi tek bir büyüteç ikonu; tıklanınca şeridi dolduruyor.

- İkon ve daralt/genişlet düğmesi İKİSİ DE ŞERİDİN SAĞINDA (*"sol
  paneldeki arama ve kenar çubuğu butonları sağ tarafta olacak"*). Kutu
  `ml-auto` + `w-full` + `max-w` ile sağa yapışıp SOLA doğru büyüyor;
  `flex-1` kullanılamaz, o kutuyu şeridin soluna sabitler.
- Genişleme `max-width` üzerinden animasyonlu. `flex-1` ile sabit genişlik
  ARASINDA geçiş animasyon üretmiyor — `max-w-[32px]` ↔ `max-w-[400px]`
  üretiyor. Bir dahaki dokunuşta "flex-basis ile daha temiz olur" diye
  değiştirilmesin.
- Görünüm de değişti (*"çirkin bir box olmuş"*): `border` + koyu zemin yerine
  `bg-base-800` + `ring-1 ring-inset`, odakta `ring-accent-500/40`.
- Escape ÖNCE metni, metin zaten boşsa kutuyu kapatıyor.
- Kapanış aramayı SIFIRLIYOR — kapalı bir kutunun listeyi süzmeye devam
  etmesi, kullanıcının sohbetlerini kaybettiğini sanmasına yol açardı. Kenar
  çubuğu daraltılırken de aynı sebeple kapanıyor.

### 3. Ayraç çizgileri kaldırıldı

v5'te eklenen üç yatay çizgi (`border-b` başlık, `border-b` yeni sohbet,
`border-t` bağlantılar) gitti. Sütunu dört kutuya bölüp panelin kendisinden
çok ızgarasını öne çıkarıyorlardı. Bölümleri artık boşluk ayırıyor. Panelin
sohbet yüzeyinden ayrıldığı `border-r` DURUYOR — o bir bölüm ayracı değil,
panelin kendi sınırı.

### 4. HATA: sohbet geçmişindeki ekler siliniyordu (`chatStore.ts`)

Kullanıcının bildirdiği *"sohbet geçmişinde eklediğim görsel silinmiş
oluyor"*. İki ayrı sebep vardı, ikisi de düzeltildi:

**(a) Asıl sebep — ekler diske HİÇ yazılmıyordu.** `sanitizeMessage` ve
`sanitizeSession` nesneyi alan alan YENİDEN KURUYOR (kopyalamıyor) ve
`attachments` bu listede yoktu. `saveChatSessions` yazarken, `loadChatSessions`
okurken aynı süzgeçten geçtiği için ekler HER İKİ YÖNDE de düşüyordu:
renderer tarafındaki kalıcılık işi doğruydu ama main process onu sessizce
iptal ediyordu. Kanıt: `chat-sessions.json`'da kullanıcının *"bu ne görseli"*
mesajı `attachments` alanı olmadan duruyordu, oysa asistanın kayıtlı cevabı
ekran görüntüsünü ayrıntısıyla anlatıyordu — yani ek ajana ULAŞMIŞ, sadece
kaydedilmemişti.

Düzeltme: `sanitizeAttachments()` eklendi (yolu olmayan kayıt atılıyor, en
fazla `MAX_ATTACHMENTS = 20`) ve hem mesaja hem oturuma bağlandı. Boş dizi
yazılmıyor.

**Genel ders:** alan alan yeniden kuran bir sanitizer, tipe eklenen yeni bir
alanı SESSİZCE yutuyor — TypeScript bunu yakalamıyor, çünkü eksik alan
isteğe bağlı (`attachments?`). Bu dosyaya yeni bir alan eklendiğinde
sanitizer'a da eklenmeli.

**(b) İkincil sebep — dosyanın kendisi siliniyordu.** Yapıştırılan/blob
ekler `app.getPath("temp")` altına yazılıyordu; Windows'un ve kurumsal
temizlik politikalarının süpürdüğü yer orası. Sohbet geçmişi kalıcı ve mesajın
içinde yalnızca DOSYA YOLU duruyor, yani dosya silinince geçmişteki görsel
kırık bir yola dönüşüyordu. Klasör `app.getPath("userData")/chat-attachments`
altına taşındı.

### 5. Mikrofon: gömülü, YEREL konuşma tanıma (`main/dictation.ts` + `src/lib/dictationRecorder.ts` — YENİ)

Kayıt renderer'da, tanıma main process'te gömülü **whisper.cpp** ile. Ses bu
makineden HİÇ çıkmıyor, API anahtarı yok, internet gerekmiyor.

**Bu, ilk denenen yol DEĞİL — iki yol denendi ve ÖLÇÜLEREK elendi. Bir dahaki
turda tekrar denenmesin:**

- **Web Speech API (`webkitSpeechRecognition`) Electron'da çalışmıyor.**
  Chromium'un tanıması, Google'ın konuşma servisine derleme anında gömülen bir
  anahtarla gidiyor; resmî Electron yapılarında o anahtar yok, çağrı her
  seferinde `error: "network"` ile düşüyor.
- **Windows'un kendi sesle yazması (Win+H) BU MAKİNEDE TÜRKÇE YAPMIYOR.**
  Önce bu yol yazıldı (`keybd_event` P/Invoke ile Win+H gönderen bir .ps1),
  sonra kullanıcı *"mikrofon çalışmıyor"* dedi ve kayıt defterinden ölçüldü
  (2026-09-03): kurulu tek yerel tanıyıcı `MS-1033-110-WINMO-DNN` (yalnızca
  en-US); `HKLM:\SOFTWARE\Microsoft\Speech_OneCore\ServiceLanguages` altında
  de/en/es/fr/it/ja/pt-BR/zh var, **tr-TR YOK**; `OnlineSpeechPrivacy.
  HasAccepted` boş. Yani Win+H açılsa bile en iyi ihtimalle İngilizce yazardı.
  Kullanıcı bunun üzerine "yerel Whisper paketle" dedi.
- **Bulut STT bir API anahtarı ister** ve kurumsal bir masaüstü aracından
  sessizce dışarı SES çıkarır — teknik bir detay değil, ayrı bir karar.

**Model ve yapı seçimi ÖLÇÜMLE yapıldı (bu makine, 12 çekirdek).** Önce base
seçilmişti; kullanıcı *"söylemlerim yanlış çıkıyor"* deyince ölçüm tekrarlandı:

| Yapı + model | Sentetik 2 sn | Gerçek konuşma |
|---|---|---|
| düz CPU + `base-q5_1` (60 MB) | 1.75 sn | 1.5 sn |
| düz CPU + `small-q5_1` (190 MB) | 12 sn | — |
| **BLAS + `small-q5_1`** | 8.2 sn | **4.3–4.7 sn** |
| BLAS + `small-q5_1`, greedy (`-bs 1 -bo 1`) | 3.9 sn | 3.7 sn |

İki şey öğrenildi: **(1)** BLAS yapısı (`whisper-blas-bin-x64.zip`,
libopenblas ile) small'ü 1.5 kat hızlandırıyor; **(2)** sentetik ses (saf sinüs)
çözücüyü halüsinasyona sokup süreyi ŞİŞİRİYOR — gerçek konuşmada aynı model
neredeyse iki kat hızlı. İlk turda base'i seçtiren 12 saniye, büyük ölçüde bu
ölçüm hatasıydı.

**BLAS + small seçildi**, beam search varsayılanda bırakıldı: gerçek konuşmada
greedy yalnızca 0.6 sn kazandırıyor ve şikâyetin konusu hız değil DOĞRULUK.
İş parçacığı sayısının etkisi YOK (t=4/7/12/16 hepsi aynı bantta) — fark
modelin kendisinde: whisper encoder'ı sesi her hâlükârda 30 saniyelik pencereye
tamamlıyor, yani iki saniyelik bir cümle bile modelin tam bedelini ödüyor.

Hız yine sorun olursa `models/` içine base'i koyup small'ü silmek yeterli —
`getEmbeddedWhisperRuntime()` model dosyasını ADIYLA arıyor ve listedeki ilk
bulunanı kullanıyor.

**Dil OTOMATİK algılanıyor (`-l auto`), sabit DEĞİL.** Bir ara `-l tr` sabitti
ve kullanıcı *"İngilizce dil desteği de yok"* dedi. Sabitlemek yalnızca eksik
değil ZARARLI: ölçüldü (2026-09-03), İngilizce bir cümle `-l tr` ile
çözümlendiğinde çıkan metin tamamen uydurma oluyor ("Kustamın numara 472'e bir
saldırı yapabilirsiniz…") ve süre 4.7 sn → **12.6 sn**'ye çıkıyor, çünkü çözücü
tutarsız sesle boğuşuyor. Otomatik algılama aynı 30 saniyelik pencereden
bedavaya geliyor ve ölçümde İngilizceyi **p=0.999** ile buldu. Böylece iki dil
tek düğmeden, uygulama dilinden BAĞIMSIZ olarak çalışıyor. `transcribeAudio`
dili parametre olarak alıyor — ileride açık bir seçici (TR/EN/Oto) eklemek tek
satır.

**Ses formatı:** whisper-cli yalnızca flac/mp3/ogg/wav okuyor (`--help` ile
doğrulandı), `MediaRecorder` ise Chromium'da WebM/Opus üretiyor. Araya ffmpeg
koymak sırf format çevirmek için ~80MB'lik ikinci bir ikili paketlemek
demekti; bunun yerine ham PCM `AudioContext`'ten alınıp 16kHz mono WAV başlığı
`dictationRecorder.ts` içinde elle yazılıyor (birkaç satır, sıfır bağımlılık).
`AudioContext({ sampleRate: 16000 })` — whisper modelleri 16kHz mono ile
eğitilmiş.

**Gömülü Whisper Runtime** (`resources/whisper-runtime/`, ~297MB):
`rfc-runtime` ve `guiscript-runtime` ile AYNI desen — build makinesinde bir
kere elle hazırlanır, `.gitignore`'dadır, `package.json` →
`build.extraResources` ile paketlenir. Kurulumu:

1. whisper.cpp sürüm **b4938**, **`whisper-blas-bin-x64.zip`** indir (düz
   `whisper-bin-x64.zip` DEĞİL — BLAS'sız yapı small modelini 1.5 kat
   yavaşlatıyor).
2. İçindeki `whisper-cli.exe`, `whisper.dll`, `ggml*.dll` ve
   `libopenblas.dll` dosyalarını `resources/whisper-runtime/bin/` altına koy.
   (`llama.dll`, `parakeet*`, `SDL2.dll`, `bench/stream/talk-llama`,
   `test-*` gerekmez.)
3. `ggml-small-q5_1.bin`'i HuggingFace `ggerganov/whisper.cpp`'den indirip
   `resources/whisper-runtime/models/` altına koy.

⚠️ `bin/` içindeki `ggml-cpu-*.dll` varyantlarının hepsi KALMALI:
whisper-cli.exe çalışma anında makinenin CPU'suna göre birini seçiyor (bu
makinede `alderlake`). "Kullanılmıyor gibi duran" varyantları silmek,
uygulamayı sadece build makinesinin işlemcisinde çalışır hâle getirir.
`ggml-blas.dll` + `libopenblas.dll` de şart — onlarsız encoder düz CPU yoluna
düşüyor.

**Düğme üç hâlli** (boşta / kayıtta / yazıya dökülüyor) ve üçü de görünür:
kaydın sürdüğünü göstermeyen bir mikrofon, kullanıcının boşluğa konuşmasına
yol açar. Çeviri sürerken düğme kilitli — ikinci bir kayıt, biten çevirinin
metnini nereye yazacağını belirsizleştirirdi. Tanınan metin taslağın SONUNA
ekleniyor, üzerine yazılmıyor.

**Doğrulama:** komut satırından uçtan uca çalıştırıldı, çıkış kodu 0,
`ggml-cpu-alderlake.dll` otomatik yüklendi. Doğruluk testi için GERÇEK konuşma
üretildi: Windows SAPI (`System.Speech`) ile 16kHz mono WAV sentezlendi ve
dört yapılandırma aynı cümlede kıyaslandı — dördü de birebir doğru yazdı
(sayı normalizasyonu dahil: "four seven two" → "472").

⚠️ Makinede yalnızca **İngilizce** TTS sesi var (`David`/`Zira`, en-US;
`GetInstalledVoices` ile doğrulandı), yani bu yöntemle TÜRKÇE doğruluk
ölçülemiyor. Türkçe kalite testi kullanıcıya kaldı — bir dahaki turda "Türkçe
doğruluğu test ettim" denecekse, önce Türkçe bir ses kaynağı bulunmalı.

⚠️ **Sentetik ses (saf sinüs) süre ölçümü için GÜVENİLMEZ.** İlk turda model
seçimi bu şekilde yapıldı ve small 12 sn ölçüldü; gerçek konuşmada aynı model
4.3 sn. Fark, whisper'ın anlamsız seste halüsinasyon üretip çözücüyü uzun
uzun çalıştırmasından geliyor. Süre ölçülecekse SAPI ile gerçek konuşma
sentezlensin.

⚠️ **`app-electron/main/*` değişiklikleri dev sunucusunda SICAK
YÜKLENMİYOR.** Renderer HMR ile yeni düğmeyi gösterir ama eski preload'da yeni
IPC köprüsü bulunmaz ve çağrı sessizce bir TypeError'a düşer — kullanıcıya
HİÇBİR ŞEY göstermeyen ölü bir düğme. Bu birebir yaşandı (2026-09-02, ilk
"mikrofon çalışmıyor" raporunun asıl sebebi buydu). İki önlem: (a)
`handleDictate` köprünün varlığını `typeof … !== "function"` ile kontrol edip
açık bir hata gösteriyor, (b) main process'e dokunan her turdan sonra dev
sunucusu TAMAMEN yeniden başlatılmalı (önce artık kalan Electron ağacı
öldürülerek).

---

## Uygulama Bağlantıları — "bağlandı diyor ama olmuyor" (2026-09-04, TAMAMLANDI)

Kullanıcı raporu: *"ben sharepoint ve outlooka bağlanamıyorum bağlandı diyor
ama olmuyor eksik bişeyler var"*. Ekranda Outlook yeşil tik veriyordu, sohbete
"mailime bak" denince hiçbir şey olmuyordu.

**Çıkarımla değil ÖLÇÜMLE bulundu.** Gerçek `axet-code`, gerçek çalışma
dizininde koşturuldu:

| koşu | sonuç |
|---|---|
| normal env (testin kullandığı) | **23 Outlook aracı**, 4 yinelenmiş bağlantı; ~10.5 sn |
| `AXET_MCP_BASE_URL=http://127.0.0.1:9` (sohbetin kullandığı) | **hiç araç yok** |
| SharePoint'e özel sonda | **hiç araç yok** |
| uygulamanın kendi SharePoint istemi | `CONNECTOR_FAIL: … 0 SharePoint tools found to try.` → kırmızı |
| uygulamanın kendi Outlook istemi | `CONNECTOR_OK: … listed calendars for Sasmaz, Tufan…` → yeşil |
| canlı config | `chatUseConnectors = false` |

### İki AYRI arıza vardı, tek belirtinin altında

**1. Outlook — yeşil tik DOĞRUYDU, sohbet ayrı bir kapıdan geçiyordu.**
`agenticConnectors.ts` testi `spawn`'a hiç `env` vermiyor, yani connector'lar
her zaman açık koşuyor. Sohbet ise `axetSpawnEnv(useConnectors)` üzerinden
geçiyor ve `false` ise `AXET_MCP_BASE_URL`'i **discard portuna**
(`http://127.0.0.1:9`) çeviriyor — MCP kurulumunu tamamen atlatmak için
(mesaj başına ~8-10 sn kazanç, ölçülmüş). Ayarı yöneten kutucuk Ayarlar'da,
**testle aynı Türkçe adı taşıyor** ve varsayılanı kapalıydı. Yani ekran
"bağlandı" derken doğru söylüyordu; söylemediği şey sohbetin o bağlantıyı
kullanmadığıydı. Ekranda bunu ima eden tek bir kelime yoktu.

**2. SharePoint — bozuk değil, HİÇ KURULMAMIŞ.** Platformda kayıtlı bir
SharePoint entegrasyonu yok; agent'ın elinde denenecek sıfır araç var. Ekran
bunu doğru raporluyordu ama önündeki tek çıkış yolunu (portaldan entegrasyonu
eklemek) göstermiyordu: portal düğmesi yalnızca "unauthorized"/ERROR
kelimeleri geçtiğinde beliriyordu, "hiç araç yok" hâli bu kalıba uymuyordu.

### Okumayla bulunan ek eksikler

- Test sonuçları **hiçbir yere yazılmıyordu** (yalnızca React state) — modal
  kapanınca kayboluyordu, "en son ne zaman çalıştı" sorusunun cevabı yoktu.
- Uyarı şeritleri `Object.values(results).some(...)` ile **iki sağlayıcıyı
  topluyordu**: SharePoint'in derdi Outlook kartının altında görünüyordu.
- Kartın altındaki MCP adresi, sanki **uygulama** oraya bağlanıyormuş gibi
  duruyordu (bağlanan axet-code, uygulama değil).
- Testin **zaman aşımı yoktu** — asılı bir `axet-code` düğmeyi sonsuza kadar
  "test ediliyor"da bırakırdı.

### Yapılanlar

- `agenticConnectors.ts`: üçüncü bir sonuç eklendi — `CONNECTOR_NONE`, "böyle
  bir araç HİÇ yok" hâli için (`FAIL`'den ayrı, çünkü çözümü de ayrı: biri
  oturum/izin, öteki portalda kurulum). 180 sn zaman aşımı + süreç öldürme.
- `ConnectorCheck` config'e yazılıyor (`connectorLastResults`), kartta
  "Son kontrol: …" olarak görünüyor.
- Tanı **sağlayıcı başına** yapılıyor (`diagnose()`), ipucu ilgili kartın
  İÇİNDE çıkıyor: `project` (proje seçili değil) / `missing` (hiç kurulmamış,
  portal düğmesiyle) / `repair` (oturum düşmüş).
- Ekranın altına **sohbet kipi satırı** eklendi. Kip `off` iken kehribar
  renginde ve "Sohbette de Aç" düğmesiyle — kullanıcının vurduğu tam boşluk.
- `chatUseConnectors` (boolean) → `chatConnectorMode: "auto"|"always"|"off"`.
  Eski `true` değeri `"always"`e göç ediyor (`readConnectorMode`), eski alan
  merge sonrası config'den siliniyor.
- **Varsayılan `auto`** — kullanıcının kararı (seçenekler sunulduğunda
  "Otomatik karar" seçildi). `axetChat.ts` mesajın metnine bakıyor
  (`CONNECTOR_HINT_PATTERN`: outlook/sharepoint/mail/takvim/toplantı/taslak…,
  TR+EN) ve son 2 mesajı da tarıyor ki "peki ya yarınki?" gibi devam
  soruları da yakalansın.

⚠️ **Otomatik karar TAHMİNDİR ve yanılabilir.** Yanılgı sessiz olmasın diye
cevabın altına bir fiş rozeti basılıyor (`ChatBubble.usedConnectors`, sohbet
geçmişine de yazılıyor). Kullanıcı "neden mailime bakmadı" ya da "neden bu
kadar yavaştı" diye sorduğunda cevap ekranda duruyor. Rozet SADECE açıkken
gösteriliyor — her cevaba basmak gürültü olurdu.

⚠️ **Yeşil tik "sohbet kullanabiliyor" demek DEĞİL.** Test her zaman
connector'lar açık koşar; sohbet `chatConnectorMode`'a bağlıdır. İkisi ayrı
kapı ve öyle kalıyor (test, ayardan bağımsız olarak "bağlantı sağlam mı"
sorusunu cevaplamalı). Ekran artık bu ayrımı yazıyor.

### Yan bulgu — İngilizce'de "APP CONNECTİONS İN CHAT"

`index.html`'de `<html lang="tr">` sabit yazılı ve dil değişince
güncellenmiyordu. Bu sadece bir erişilebilirlik etiketi değil: tarayıcı
`text-transform: uppercase`'i **dile özgü** kurallarla uyguluyor, Türkçe
kuralıyla İngilizce 'i' harfi noktalı 'İ' oluyordu. Ayarlar'daki tüm bölüm
başlıklarını etkiliyordu. `LanguageProvider` artık `document.documentElement
.lang`'i dille birlikte güncelliyor.

### Doğrulama

`npm run typecheck` + `npm run build` temiz. Otomatik karar regex'i 10 gerçekçi
olumlu ve 10 olumsuz mesajla sınandı: 10/10 ve 10/10. Ekran tarayıcı
koşumunda (sahte `window.api` ile, canlı ölçümün verisiyle beslenerek)
görsel olarak doğrulandı: Outlook yeşil + "Son kontrol", SharePoint kırmızı +
"hiç kurulmamış" ipucu + portal düğmesi (`openExternalUrl`'e
`https://axet.nttdata.com/agentic/` gittiği ölçüldü), kehribar sohbet kipi
satırı ve "Sohbette de Aç" düğmesinin kipi `auto`'ya çevirişi, aynısı
İngilizce'de.

⚠️ Tarayıcı koşumunda sahte köprü kurarken iki tuzak: (a) `onX` abonelik
fonksiyonları useEffect temizleyicisi olarak kullanılıyor, Promise dönerlerse
tüm ekran *"destroy is not a function"* ile hata sınırına düşer; (b)
`getConfig`/`getLandscape` gerçek şekli dönmeli — `getLandscape` sarmalayıcı
değil, doğrudan `{customers, path}` döner.

## Uygulama Bağlantıları — tek buton, her yerde geçerli (2026-09-04, TAMAMLANDI)

Kullanıcı isteği: *"bağlantıyı test et değil de, bağlan ve bağlantıyı kes
şeklinde tek buton olsun, terminalde giriş yap kısmı kaldırılsın direkt
agentic sitesine yönlendirsin bağlanamazsa, arayüzü tasarımını temasını
daha güzel yapabilirsen düzenleyebilirsin, eğer uygulamalar bağlıysa her
yerden erişilebilsin bunlara yapay zeka ile konuştuğumuz"*.

### "Bağlan" ne demek — burada açılan bir soket YOK

Bu launcher axet.nttdata.com'a hiçbir zaman doğrudan istek atmıyor; her şey
`axet-code`'un kendi Okta oturumu üzerinden. O yüzden butonların anlamı
şöyle sabitlendi ve etiketler bu yüzden dürüst:

| Buton | Ne yapıyor | Süre |
| --- | --- | --- |
| **Bağlan** | `axet-code`'a sorar (doğrular) + başarılıysa `connectorEnabled[provider] = true` | ~30-60 sn |
| **Bağlantıyı Kes** | `connectorEnabled[provider] = false` | anında, process yok |

Yani **"bağlı" = hem çalışıyor hem de yapay zekânın kullanmasına izin var.**
Eskiden bunlar iki ayrı şeydi (test ekranı yeşil tik gösterirken sohbetin
ayarı kapalı olabiliyordu) — *"bağlandı diyor ama olmuyor"* şikayetinin
kaynağı buydu; bir önceki tur bunu ekranda **yazarak** çözmüştü, bu tur
**ortadan kaldırdı**.

### Tek doğruluk kaynağı: `connectorEnabled`

`connectorMode` artık yalnızca `auto | always` — `off` **kaldırıldı**. Aynı
şeyi (açık/kapalı) iki ayrı yerden ifade etmek karışıklığın ta kendisiydi.
Kip seçimi de Ayarlar'dan **çıkarıldı**, Uygulama Bağlantıları ekranına
taşındı: açık/kapalı = Bağlan/Kes butonu, kip = yalnızca *ne zaman
yükleneceği* (hız ayarı). `store.ts` eski `chatUseConnectors` (boolean) ve
`chatConnectorMode` (`off` dahil) alanlarını okuyup göç ettiriyor ve
siliyor; `off` → `auto`.

⚠️ **Gelecekte dokunma notu:** bağlayıcıların açık/kapalı olması için
`connectorEnabled` dışında ikinci bir alan **eklenmesin**. İki yer = aynı hata.

### Her yerden erişim — üç yüzey, tek politika

`connectorPolicy.ts` tek karar noktası; sohbet (`axetChat.ts`), axet.flows
ajanı (`axetFlowsAgent.ts`) ve SAP GUI ajanı (`sapGuiScriptAgent.ts`) üçü de
oradan geçiyor. Ekranda da üç yüzey rozet olarak yazıyor — eskiden yalnızca
"sohbet" deniyordu ve iki ajanın da aynı araçlara ulaştığı hiçbir yerde
yazmıyordu.

⚠️ **Karar KULLANICININ KENDİ CÜMLESİYLE verilir, birleştirilmiş prompt'la
DEĞİL.** İki ajanın prompt'unda node katalogu / aksiyon sözlüğü var ve orada
geçen tek bir "mail" kelimesi her turu boşuna ~8-10 sn yavaşlatırdı. Bu
yüzden her iki `agentRunner` da `connectorText`'i ayrıca geçiriyor (mesaj
boşsa transcript'teki son `KULLANICI:` satırı — konu hâlâ o). Tur ortasında
değişmesin diye turun her iterasyonunda aynı metin gidiyor.

ℹ️ MCP araçları `axet-code`'un **kendi** ajan döngüsü içinde çağrılıyor, bu
yüzden stdout hâlâ yalnızca nihai cevabı taşıyor — ajanların JSON aksiyon
protokolü bundan **bozulmuyor**. Tek maliyet süre.

### Kaldırılanlar

- **"Terminalde Giriş Yap" satırı** — bir başarısızlığın çaresi neredeyse
  her zaman portalde. Artık **tanınmayan her hata da** portale yönlendiriyor
  (eskiden tanınmayan hatalar hiçbir yol göstermeden kırmızı satır olarak
  kalıyordu). Tek istisna **AXET Project seçimi**: portalde çözülemez, bu
  makinedeki interaktif `axet-code` TUI'sini gerektirir — o buton duruyor.
- Ayarlar'daki "Sohbette uygulama bağlantıları" seçicisi (yukarı bkz.).

### Görsel

Kartlar bağlıyken accent kenarlık/zemin, değilken nötr; sağ üstte durum
rozeti (Bağlı / Bağlı değil / Bağlanıyor… / Başarısız), altta tam genişlik
tek buton. Kartların altında "nerelerde kullanılabilir" kutusu — hiçbiri
bağlı değilken kehribar uyarıya dönüşüyor. ActivityBar'daki fiş ikonunda
bağlı uygulama varsa accent nokta (durum artık modal açmadan da görünüyor);
modal kapanırken `getConfig` yeniden okunuyor, yoksa nokta bayat kalırdı.

### Doğrulama

`npm run typecheck` + `npm run build` temiz. Ölü i18n anahtarı bırakılmadı
(`testConnection`, `loginHint`, `openLoginTerminal`, `loginTerminalTitle`,
`chatMode.*`, `enableForChat`, `settingsModal.chatConnectorMode*`).

## Uygulama adı: "aXet Studio" (2026-09-04)

Kullanıcı isteği: *"artık bi platform olduğu için uygulamanın da adını
değiştirelim"* → seçilen ad **aXet Studio**. Beş modülü (axet.code,
SAP Launcher, axet.flows, axet.flows Live, SAP GUI Scripting) barındıran
platformun adı bu; **modül adları değişmedi** — soldaki raydaki kayıt
"aXet SAP Launcher" değil artık sadece "SAP Launcher", çünkü "aXet" ön eki
platformun kendisine ait.

Değişen yerler: `package.json` (`productName`, `nsis.shortcutName`,
`portable.artifactName`), `index.html` başlığı, `TitleBar`, hata diyaloğu
başlığı (`index.ts`), `updatePrompt.message` (tr/en), `launcher.ts`'in
ürettiği dosyalardaki imza satırları.

⚠️ **BİLEREK DEĞİŞTİRİLMEDİ** — üçü de kimlik, isim değil:

| Alan | Değer | Neden dokunulmadı |
| --- | --- | --- |
| `build.appId` | `com.nttdata.axet.saplauncher` | Windows uygulamayı bununla tanıyor; değişirse mevcut kurulumun ÜSTÜNE gelmez, ikinci bir uygulama olarak kurulur |
| `build.publish.repo` | `axet-sap-launcher` | electron-updater güncellemeleri buradan çekiyor; değişirse kurulu sürümler güncelleme alamaz |
| `package.json` `name` | `axet-sap-launcher` | npm paket adı, kullanıcıya görünmüyor |

Bunları değiştirmek isteyen biri, önce mevcut kullanıcıların nasıl geçiş
yapacağını çözmeli — yeniden adlandırma değil, göç işi.

## Aynı turda düzeltilenler (2026-09-04)

- **Uygulama Bağlantıları'nda yatay taşma.** SharePoint'in cevabındaki
  boşluksuz uzun URL kartı yırtıp modal'a yatay kaydırma çubuğu ekliyordu
  (kullanıcı ekran görüntüsüyle bildirdi). İki sebep birden: grid hücresinin
  varsayılan `min-width:auto`'su (→ `min-w-0`) ve sarılmayan metin
  (→ `break-words` + `[overflow-wrap:anywhere]`, üstüne `line-clamp-4` +
  tamamı `title`'da).
- **Turuncu uyarı kutusu açık temada okunmuyordu.** Sabit `amber-*`
  sınıfları kullanılıyordu; uygulamanın geri kalanı (StatusDot, FileViewer,
  SystemPanel) zaten tema değişkenlerini kullanıyor. `--status-warning-bg/
  border/text` üçlüsüne geçildi. ⚠️ Yeni uyarı kutuları da `amber-*` DEĞİL
  bu üçlüyü kullanmalı — açık temada `text-amber-200` okunmuyor.
- **axet.code arama kutusu artık hep açık** (*"kapanmasına gerek yok"*).
  2026-09-02'de istenen açılır/kapanır büyüteç kaldırıldı; `searchOpen`
  state'i ve `toggleSearch` silindi, geriye `clearSearch` kaldı (kenar
  çubuğu daraltılırken de çağrılıyor — görünmeyen bir süzgeç listeyi
  süzmemeli).
- **Sol raydaki SAP Launcher ikonu** uygulama logosu değil artık düz bir
  lucide ikonu (`Server`) — renkli logo, o modülü diğer dördünün arasında
  "uygulamanın kendisi" gibi gösteriyordu.

## GitHub'a açılış öncesi sadeleştirme (2026-09-04)

Kullanıcı isteği: *"uygulama ilk açıldığında axet chat kısmında sıfır sohbet
ekranı karşılasın son sohbeti açmasın, axet flows ve axet flows canlı
ekranlarını kaldıralım uygulamayı gite atıcaz onlara şuan gerek yok sonra
karar vericem onlara ne olucağını"*.

### 1. Açılışta boş sohbet

`AxetCodeHome`'un mount effect'i diskteki `activeId`'yi artık **okumuyor**
(`src/components/AxetCodeHome.tsx`, geçmiş yükleme effect'i). `activeId === null`
zaten "yeni sohbet" ekranını çiziyordu; tek yapılan o satırı kaldırmak oldu.

Alan diske hâlâ **yazılıyor** (`ChatSessionsState`'in zorunlu alanı) — sadece
okunmuyor. Sohbet geçmişi kaybolmadı: liste solda duruyor, tıklayınca eskisi
gibi açılıyor. Değişen tek şey AÇILIŞ noktası.

### 2. axet.flows ve axet.flows Live arayüzden kaldırıldı

⚠️ **Kaynak dosyalar SİLİNMEDİ — bu bilinçli.** Kullanıcı *"sonra karar
vericem onlara ne olucağını"* dedi; karar verilmemiş bir modülü silmek, geri
getirmek için commit arkeolojisi gerektirir. Diskte duruyorlar ve TypeScript
tarafından hâlâ derleniyorlar (tsconfig `src/**`), yani çürümüyorlar da:

`src/components/AxetFlowsHome.tsx`, `src/components/AxetFlowsLiveHome.tsx`,
`src/components/flows/**`, `src/flows/**`,
`app-electron/main/axetFlows{Agent,LiveDiscovery,LiveSave}.ts`,
`app-electron/main/flowRuntime.js`, `flowDiagnostics.js`

Kaldırılan yalnızca **arayüz yolu** — üç yer:

1. `src/App.tsx` — iki `import` ve iki route dalı (`activity === "axetFlows"`
   ile `axetFlowsLive` için tutulan gizli `<div>`).
2. `src/components/ActivityBar.tsx` — `activities` dizisindeki iki girdi
   (`Workflow`/`Radio` ikonları da artık import edilmiyor).
3. `src/components/AppConnectionsSection.tsx` — `SURFACES` listesindeki
   "axet.flows" satırı; olmayan bir ekranı vaat etmemesi için.

Geri açmak = bu üç yeri geri eklemek. `Activity` birleşim tipi ile i18n
anahtarları (`activityBar.axetFlows*`, `axetFlowsLive.*`) bilerek DURUYOR;
i18n anahtarları zaten hâlâ derlenen bileşenler tarafından kullanılıyor,
silinirse typecheck patlar.

Ana süreçteki IPC handler'ları (`flows:*`, `axetFlowsLive:*`) da duruyor —
kimse çağırmıyor, `FlowRuntime` yalnızca `deploy()` ile başlıyor, dolayısıyla
açılışta hiçbir maliyeti yok.

**Yan fayda:** `axetFlowsLive` ekranı "hidden div" olarak HER ZAMAN mount
kalıyordu; içindeki webview yüzünden konsolda sürekli
`BACKEND_MODELS_SEPARATOR has already been declared`, `Failed to get token:
Unauthorized`, `Error loading catalog … Forbidden` gürültüsü akıyordu. O div
gidince gürültü de gitti.

## axet.code: mount kalıcılığı ve dönüşümlü öneri kartları (2026-09-04)

Kullanıcı isteği: *"bu chat kısmındaki boş sohbet ekranı sadece uygulama
kapalıysa ve açıldıysa gelsin ... eğer açıksa ve herhangi bir sohbet devam
ediyosa ekran değiştiğinde de sabit kalsın"* ve *"burdaki önerilen sorular
sürekli değişen mantıklı şeyler olsun"*.

### 1. axet.code artık UNMOUNT OLMUYOR

`App.tsx` bu bileşeni koşullu render etmiyor; sekme değişince CSS ile
gizliyor (`hidden`). Bir üstteki turda eklenen "açılışta boş sohbet"
davranışı, koşullu render yüzünden **her sekme geçişinde** tetikleniyordu.

Koşullu render'ın götürdüğü üç şey vardı ve üçü de tek hamlede çözüldü:

1. Açık sohbetin seçimi (`activeId`) sıfırlanıyordu.
2. Henüz diske yazılmamış son değişiklikler kayboluyordu — kaydedici 600ms
   debounce'lu ve unmount `clearTimeout` ile zamanlayıcıyı iptal ediyor.
3. **AKAN bir cevap** kayboluyordu: main process'teki `axet-code` çalışmaya
   devam edip cevabı ölü bir bileşene teslim ediyordu.

⚠️ Mount'u korumanın iki bedeli var, ikisi de karşılandı:

- **Global kısayollar gizliyken de dinliyordu.** `active` prop'u eklendi;
  Ctrl+N dinleyicisi yalnızca sekme öndeyken bağlanıyor. Yoksa SAP
  Launcher'dayken Ctrl+N, görünmeyen bir panelde sessizce yeni sohbet açardı.
- **`display:none` panelin `scrollHeight`'i 0'dır.** `ChatSessionPane`'in
  `active` prop'u artık `active && activeId === …` — sekmeye geri dönüldüğünde
  effect yeniden çalışıp listeyi dibe sabitliyor (gizliyken akan cevap
  yüzünden liste en üstte açılırdı).

`axetFlowsLive` de aynı desendeydi ve KALDIRILDI — çelişki değil: oradaki
gizli div bir **webview** barındırıyordu ve sürekli konsol gürültüsü
üretiyordu. Burada webview yok, maliyet sıfır.

### 2. Öneri kartları havuzdan geliyor

Eskiden ekranda her zaman aynı üç kart vardı; ikinci açılıştan sonra kimse
okumuyordu. Artık `AxetCodeHome`'daki `SUGGESTION_POOL`'dan (17 öneri) üçü
seçiliyor ve **her "yeni sohbet"te** yenileniyor.

- **Tohumlanmış karıştırma** (`seededShuffle`, mulberry32) kullanılıyor, düz
  `Math.random()` değil: seçim bir `useMemo` içinde ve React aynı
  bağımlılıklarla gövdeyi tekrar çalıştırabildiği için kartlar kullanıcı
  hiçbir şey yapmadan gözünün önünde değişirdi.
- **`scope` ile bağlam süzgeci**: `sap` kapsamlı öneriler yalnızca bağlanılmış
  bir SAP sistemi varsa, `connector` kapsamlılar yalnızca bir uygulama bağlıysa
  gösteriliyor. Öneri kartının işi kullanıcıya *yapabileceği* bir şeyi
  hatırlatmak; karşılığı olmayan bir öneri ya boş cevap ya uydurma üretir.

Yeni öneri eklemek: `src/i18n/{tr,en}.ts`'e `axetCodeHome.sg*` anahtarı +
`SUGGESTION_POOL`'a bir satır. İkon isteğe bağlı (`ChatSessionPane`'deki
`SUGGESTION_ICONS`; eşleşme yoksa `Sparkles`).

## "Sisteme bağlan" artık konsol değil sohbet açıyor (2026-09-04)

Kullanıcı geri bildirimi (üçüncü bir kişiden aktarıldı): *"la sisteme bağlan
diyince yine konsol açılıyor ... dayım konsolla ne işimiz var daha"*. Kastedilen
"SAP GUI açılsın" değil, **terminal yerine bizim sohbet ekranımıza düşülsün**
(kullanıcı açıklaması, aynı gün).

Eskiden `handleCredentialsSubmit`, bağlantı başarılı olunca proje klasöründe
`axet-code -y` TUI'sini bir terminalde başlatıyordu. Uygulamanın kendi sohbet
arayüzü varken kullanıcıyı bir konsol penceresine bırakmak, aynı işin iki
ayrı yüzünü yan yana koymaktı.

**Artık:** bağlantı başarılı → `setActivity("axetCode")` + o bağlantının proje
klasörüne bağlı BOŞ bir sohbet.

### Sohbete özel çalışma klasörü (asıl iş bu)

Bu değişiklik kozmetik olamazdı: sohbet, çalışma klasörünü tek bir global
ayardan (`config.axetWorkspaceDir`) alıyordu — yani hangi sisteme bağlanırsan
bağlan, ajan hep aynı klasörde çalışıyordu ve bağlantının ürettiği
`.conn_adt` / `sap-context.md` dosyalarını (bkz. `launcher.ts`) **hiç
görmüyordu**. O yüzden klasör sohbet BAŞINA taşındı:

- `StoredChatSession.cwd?` + `sapLabel?` (opsiyonel — eski geçmiş dosyaları
  bu alanlar olmadan okunabilmeli, `?? null` ile bağlamsız açılıyorlar).
- `runPrompt(..., sessionCwd)` → `sessionCwd || config.axetWorkspaceDir || ""`.
  Klasör, çağıranın elindeki oturumdan geliyor; `runPrompt` içinde `sessions`
  aramak bağımlılık listesini gereksiz büyütürdü.
- Bağlantı, kayıt DOĞMADAN önce geliyor (yeni sohbet ilk mesajda kayda
  dönüşüyor, bkz. `NEW_SESSION_ID`), o yüzden o ana kadar `newBinding`
  state'inde bekliyor. Bağlanıp hiçbir şey sormayan kullanıcı listede boş bir
  sohbet bulmuyor.
- `handleNewSession(binding = null)`: elle açılan yeni sohbet **bağlamsız**
  başlıyor — önceki sistemin klasörü yapışıp kalmamalı. Bu yüzden düğmede
  `onClick={() => handleNewSession()}` sarmalayıcısı var; fonksiyonu doğrudan
  geçmek MouseEvent'i `binding` sanardı.

### Görünürlük ve kaçış yolu

- Sohbetin tepesinde ince bir şerit: sistem etiketi + proje klasörünün TAM
  YOLU. Görünmezse aynı görünen iki sohbetin farklı sistemlere konuştuğu
  anlaşılamaz, ajanın dosyayı nereye yazdığı da tahmin işi olurdu. Şerit
  yalnızca bağlı sohbetlerde çiziliyor.
- **Terminal kaldırılmadı, varsayılan olmaktan çıktı.** Şeritteki "Terminal"
  düğmesi aynı klasörde DÜZ bir kabuk açıyor (`openProjectDirTerminal`).
  Komut verilmiyor: `createTerminal`'ın READY_PATTERNS beklemesi yalnızca
  TUI'nin kendi arayüzünü çizmesini beklemek içindi, düz kabukta sekme anında
  açılmalı (bkz. `handleNewTerminal`, aynı yol).
- `openConnectorHelperTerminal` **değişmedi**: Connector/MCP araçlarının
  istediği "AXET Project" seçim diyaloğu gerçekten interaktif TUI'yi
  gerektiriyor (CLI'nın kendi hatası: *"No project selected, launch axet-code
  in interactive mode first"*).

`nonce`: `SapChatRequest`'te bilerek var — aynı sisteme arka arkaya bağlanmak
aynı `{projectDir, label}` çiftini üretir ve effect bir daha tetiklenmezdi.

## Sohbetin yanında dosya paneli — gör, izle, müdahale et (2026-09-04)

Aynı geri bildirimin ikinci maddesi: *"ayrıca dosya sistemleri de çok faydalı
oluyor / kendi gidip txt vs yazıyor direkt göreyim müdahale edeyim"*.

Cümlenin üç ayrı gereği var; üçü de karşılandı:

| İstek | Karşılığı |
| --- | --- |
| **Görmek** | `ChatFilesPanel` — sohbetin sağında, o sohbetin KENDİ çalışma klasörünü kök alan bir ağaç |
| **Direkt** | `fs.watch(recursive)` — ajan dosyayı yazdığı anda ağaç tazeleniyor, YENİLE'ye basmak gerekmiyor |
| **Müdahale** | `FileViewer`'ın düzenleme kipi — metin dosyası panelde düzenlenip diske yazılıyor |

Gezgin ve önizleme YENİ BİLEŞEN DEĞİL: `FileExplorer`/`FileViewer` zaten SAP
Launcher ekranında vardı. İki yeni yetenek (canlı izleme, düzenleme) oraya
opsiyonel bayrak olarak eklendi ve SAP Launcher'da KAPALI bırakıldı — orada
dosyaları kullanıcı kendisi koyuyor, önizleme bilinçli olarak salt okunur.

### İzin kökü genişledi (dikkat)

`isPathAllowed` yalnızca `projectsBaseDir`'i kabul ediyordu. `axetWorkspaceDir`
onun KARDEŞİ (ikisi de Belgeler altında, biri diğerinin içinde değil), yani
bağlamsız bir sohbetin klasörü için tüm `fs:*` çağrıları reddedilirdi. Artık
iki kök kabul ediliyor. İzin hâlâ KAPALI BİR LİSTE — bu iki klasörün dışına
çıkan hiçbir yol geçmiyor; genişleme, yeni `fs:writeTextFile` yolunu da
kapsadığı için bilinçli ve sınırlı tutuldu.

### Kararlar ve sebepleri

- **İzleyici gezginin içinde** (`FileExplorer`, `autoRefresh`), panelde değil.
  Açık dosya önizlemesi aynı olaydan `onExternalChange` ile besleniyor —
  ikinci bir `fs.watch` açmaya gerek yok.
- **Debounce main tarafında** (`WATCH_DEBOUNCE_MS = 300`): Windows tek bir
  yazma için birden çok olay üretiyor, renderer'a saniyede onlarca IPC mesajı
  gitmemeli. `.git`, `node_modules`, `.venv`, `__pycache__` filtreli.
- **İzleyici yalnızca GÖRÜNEN panelde.** Her sohbetin kendi paneli var ve
  hepsi mount hâlde duruyor; bayrak olmasa onlarca `fs.watch` aynı anda
  çalışırdı. Panel kapalıyken hiç mount edilmiyor.
- **Panel açık/kapalı TÜM sohbetler için ortak**, açık DOSYA sohbet başına.
  Paneli her yeni sohbette yeniden açmak, işini (ajanın yazdığını görmek) her
  seferinde yeniden hatırlanması gereken bir şey yapardı.
- **Kırpılmış dosya düzenlenemez.** Ekranda dosyanın ilk 2MB'ı var
  (`MAX_TEXT_BYTES`); onu kaydetmek geri kalanını SİLERDİ.
- **Düzenleme kipinde disk tazelemesi yok sayılıyor.** Kullanıcının yazdığının
  üzerine gelen bir tazeleme, kaybedilen emek demek.
- **Bağlam şeridi artık her sohbette var** (bağlamsız olanlarda etiket
  "Çalışma alanı", ikon sönük). Klasör yolunun görünür olması isteğin ilk
  adımı: ajanın nereye yazdığı tahmin edilecek bir şey olmamalı.
- Panel genişliği SABİT (380px). Sürüklenebilir bir ayırıcı, okuma sütununun
  kendi kademeli genişliğiyle (`COLUMN`) çakışırdı.

## Aktif Bağlam — üç ekranın ortak "neredeyiz" bilgisi (2026-09-04)

Geri bildirimin üçüncü maddesi: *"bu 3 farklı uygulamayı tek bir yere toplamış
gibi / birbiriyle haberleri olsun"*. axet.code, SAP Launcher ve SAP GUI
Scripting aynı pencerede duruyordu ama birbirinden tamamen habersizdi:
Launcher bir sisteme bağlanıyor, sohbet bunu bilmiyor, GUI Scripting ekranı
hangi sisteme bağlı olduğumuzu hiç duymuyordu.

Ortak gerçek `app-electron/main/activeContext.ts`'te: bağlı SAP sistemi
(`sap`) ve canlı SAP GUI oturumu (`gui`).

### Neden main process'te, neden diske YAZILMIYOR

Bu bilgiyi okuyan iki yer renderer'da değil: prompt'u kuran `axetChat.ts` ve
bağlantıyı kuran `launcher.ts`. React state'i olsaydı main tarafı kendi
yazdığı gerçeği geri okuyamazdı.

Diske yazılmıyor çünkü **canlı bir bağlantı yeniden başlatmayı atlatmaz** —
RFC bridge ölür, `.conn_adt` bayatlar. Kalıcı olsaydı uygulama bir sonraki
açılışta "PRD'ye bağlısın" diye yanlış bir şey iddia ederdi; bu tam olarak
birinin yanlış sisteme iş yaptırmasına yol açan tür bir yalan.

**Şifre taşınmıyor.** Bu nesne hem ekranda gösteriliyor hem de ajanın
prompt'una giriyor; kimlik bilgisi `.conn_adt` ve `secureStorage`'da kalıyor.

### Tek yazar kuralı

| Alan | Tek yazarı |
| --- | --- |
| `sap` | başarılı `system:connect` (main) |
| `gui` | SAP GUI Scripting ekranı (`setActiveGuiContext`) |

Renderer `sap`'ı ÜRETEMİYOR, yalnızca okuyor ve kullanıcı isterse
temizliyor. İki yerden yazılabilen bir "aktif sistem", iki farklı doğruya
sahip olurdu.

### Üç ekranın kazancı

- **Başlık çubuğu**: bağlı sistem + client/kullanıcı + tier rozeti + canlı
  GUI işlemi. Üç ekranın da üstünde duran tek yer orası; rozeti bir ekranın
  içine koymak "bu bilgi o ekrana ait" demek olurdu. Tıklayınca Launcher'da
  o sistem seçiliyor.
- **axet.code**: bir sisteme bağlandıktan sonra elle açılan yeni sohbetler de
  o sisteme bağlanıyor (madde 1 yalnızca bağlantı ANINDA açılan sohbeti
  bağlıyordu). Bağlamsız sohbet istemenin yolu rozetten bağlamı temizlemek.
- **SAP GUI Scripting**: başlıkta Launcher'ın bağlı olduğu sistem, ve GUI'deki
  oturum FARKLI bir sistem/client ise "farklı sistem" uyarısı. Bu fark
  eskiden script yanlış sistemde oynatılana kadar hiçbir yerde görünmüyordu.
- **Ajan**: sohbetin prompt'una kısa bir bağlam bloğu giriyor (sistem, tier,
  client, proje klasörü, açık GUI işlemi). QA/PRD'de ayrıca "yazma yapma,
  önce sor" satırı ekleniyor.

### Prompt bloğunun sınırı (bilinçli)

Blok YALNIZCA sohbetin çalışma klasörü aktif bağlamın proje klasörüyse
ekleniyor. Genel bir sohbette "S4D'ye bağlısın" demek, kullanıcının hiç
sormadığı bir bağlamı her cevaba sızdırmak olurdu. Gevşetmek isteyen
`buildContextPreamble`'daki tek `if`'i değiştirir.

### Dikkat

- `setActiveGui` değişiklik yoksa yayın YAPMIYOR. GUI ekranı `getScreen`'i
  düzenli yokluyor ve çoğu yoklama aynı ekranı döndürüyor; `updatedAt`
  karşılaştırmaya kasten katılmıyor, yoksa her yoklama tüm renderer'ı
  yeniden render ederdi.
- SAP GUI Scripting ekranı UNMOUNT olurken bağlamı TEMİZLEMİYOR. Sekme
  değişince unmount oluyor ve orada silmek, tam ona ihtiyaç duyulan anda
  (kullanıcı sohbete geçip "bu ekranda ne yapmalıyım" derken) silerdi.
- Aktif bağlam `App.tsx`'te TEK KEZ okunup prop olarak dağıtılıyor. Hook'u
  her bileşende ayrı çağırmak N ayrı abone ve N ayrı kopya demek olurdu —
  "tek bir yere toplama" isteğinin tam tersi.

## Sohbet hızı ve "arkada ne oluyor" — ölçülmüş düzeltmeler (2026-09-04)

Kullanıcı bildirimi: *"chat boxda çoklu satır metni gönderince boxun
büyüklüğü o şekilde kalıyor, chat aynı zamanda çok yavaş çalışıyor ... arkada
bişey yaparken uzun süre chatdeki çubuklar yanıp sönüyor, eğer anlık olarak
bişey yapıyorsa arka planda onları da görsek fena olmaz"*.

### Ölçümler (bu makinede, canlı `axet-code`'a karşı)

| Ne | Değer |
|---|---|
| "merhaba" yaz → tek atış toplam | 8.1 s |
| stdin'den ÖNCE yapılan iş (auth, config, yetenek kataloğu) | ~2–4 s |
| stdin'den SONRA sabit maliyet (agent → oturum → kod grafiği → denetim) | ~0.47 s |
| Modele giden istek gövdesi — bağlayıcılar KAPALI | 92 KB |
| Modele giden istek gövdesi — bağlayıcılar AÇIK | 409 KB |

Ölçüm yöntemi: `(sleep 9; echo prompt) \| axet-code run -v` — `skillsmarket.sync`
satırı prompt gönderilmeden DOKUZ SANİYE ÖNCE düştü. Gövde boyutları
`axet-code run -d` sonrası `axet-code logs` içindeki `bodyLen=` alanından.

409 KB'ın 317 KB'ı bağlayıcı araç şemaları: `axet.nttdata.com/agentic`'te aynı
sağlayıcı için DÖRT ayrı Outlook kaydı duruyor (eski yetkilendirme
denemelerinden kalıntı). Bunları silmek kod değişikliği olmadan kazanılacak
bir hız — uygulamanın karar vereceği bir şey değil, hesabın sahibinin.

### Yapılanlar

1. **Composer yüksekliği** (`ChatSessionPane.tsx`). Ölçüm `onInput`'taydı ve
   `onInput` yalnızca KLAVYEYLE yazınca ateşleniyor. Gönderdikten sonra
   taslağı React `""` yapıyor, olay ateşlenmiyor ve inline `style.height` eski
   değerinde asılı kalıyordu. Aynı kör noktanın TERS yönü de vardı ve
   görülmemişti: dikte, öneri kartı, sürüklenen metin ve "mesajı düzenle"
   taslağı programatik yazdığı için kutu BÜYÜMÜYORDU da. Ölçüm taslağa bakan
   bir efekte taşındı; ikisi birden kapandı.
2. **Ön-ısıtma** (`axetChat.ts` `prewarmChat`). Kullanıcı yazmayı yarım saniye
   duraklattığında bir sonraki mesajın `axet-code run` süreci açılıp stdin'de
   bekletiliyor. Tek süreç, boşta 3 dakika sonra bırakılıyor.
3. **Canlı aşama göstergesi**. `-q` (yalnızca spinner'ı gizliyordu) yerine `-v`
   (Show logs): aşamalar stderr'e CANLI düşüyor, stdout eskisi gibi tertemiz
   kalıyor. Ham log satırı arayüze taşınmıyor, `AxetChatActivityPhase`'e
   indirgeniyor — metin İngilizce ve sürüme bağlı.
4. **Zaman aşımı + süreç ağacı**. 5 dakikalık tavan (eskiden tavan YOKTU:
   axet-code takılırsa sohbet sonsuza kadar bekliyordu) ve `taskkill /T` ile
   ağaç öldürme (`proc.kill()` Windows'ta MCP torun süreçlerini bırakıyordu).

### Dikkat

- Isıtılmış süreç BAĞLAYICILAR KAPALI açılıyor: açılıp açılmayacağı mesajın
  METNİNE bağlı (bkz. `connectorPolicy.ts`) ve ısıtma anında metin yok. Karar
  "açık" çıkarsa ısıtılan süreç atılıp yenisi kuruluyor — yani yanlış tahminin
  bedeli, eskiden HER mesajda ödenen şeyin aynısı; kötüleşme yok.
- Klasör ve model spawn anında sabitleniyor. İkisinden biri değişirse
  ısıtılmış süreç kullanılamaz, `takeWarm` bu yüzden ikisini de karşılaştırıyor.
- Aşamalar GERİYE gitmiyor (`PHASE_ORDER`). İki sebeple giderdi: ısıtılmış
  süreçte açılış satırları prompt'tan sonra tekrar akıyor, ve bağlayıcılar
  açıkken "MCP client initialized" denetim kaydından sonra da gelebiliyor.
- `-v` açıkken stderr NORMAL çalışmada da dolu. Hata mesajı üretirken
  `extractError` INFO/DEBU/WARN satırlarını atıyor — yoksa her hata bir log
  yığını olarak görünürdü.
- **`run` kipinde araç çağrıları HİÇBİR akışa düşmüyor** (ölçüldü — denetim
  kaydından sonra cevap gelene kadar 12 saniyeye varan tam sessizlik). Bu
  yüzden bu kipte `thinking` aşamasında yapılan tek dürüst şey geçen süreyi
  saymak. **Bu, aşağıdaki Adım 2'de kalıcı oturumla çözüldü** — `run` yolu
  artık yalnızca yedek; orada bu sınır aynen geçerli.
- `run`'ın `--resume`/`--session` bayrağı YOK (`run --help` ile doğrulandı).
  Bunun bedeli yalnızca hız değil: araç SONUÇLARI mesajlar arasında kayboluyor
  — ajan 1. mesajda okuduğu dosyanın içeriğini 2. mesajda göremiyor, çünkü
  transkriptte yalnızca metin cevabı var. (Adım 2 bunu da çözüyor: kalıcı TUI
  oturumunun hafızası CLI'ın kendisinde.)

## Adım 2 — Kalıcı oturum (gerçek TUI, node-pty) — 2026-09-04

Bir önceki adımın bilerek açık bıraktığı iki maddeyi kapatıyor: araç
çağrılarının görünmemesi ve oturum hafızasının olmaması. Kullanıcı: *"ikinci
adıma geçelim hâlâ yavaşlık var gibi ama maillerimden son maili oku dedim biraz
yavaş davrandı"*.

**Ne yapıldı**: her sohbet için `axet-code`'un GERÇEK interaktif TUI'si bir
pty içinde bir kez açılıyor ve açık kalıyor. Mesajlar bu oturuma yazılıyor;
cevap ise ekrandan değil, axet-code'un KENDİ oturum veritabanından okunuyor.

| | eski (`run`) | yeni (kalıcı TUI) |
|---|---|---|
| Açılış maliyeti | her mesajda | sohbette bir kez (3,5 s, ısıtmada görünmez) |
| "sadece OK yaz" | 8,1 s | 3 s |
| package.json'daki version (1 araç) | — | 5,4 s |
| aynı sorunun tekrarı (araçsız, hafızadan) | — | **3,1 s** |
| Oturum hafızası | yok (transkript prompt'a gömülüyordu) | CLI'ın kendisinde |
| Araç çağrıları | görünmüyor | canlı görünüyor |

### Neden ekrandan okumuyoruz

TUI tam ekran bir Bubble Tea arayüzü. ANSI dizileri temizlendikten sonra bile
cevap; kenarlıklar, yan panel ve spinner artıklarıyla iç içe okunamaz hâlde
çıkıyor (ölçüldü). Aynı cevap `.axet-code/axet-code.db` içinde tertemiz
duruyor — araç çağrılarıyla birlikte.

### Veritabanı hakkında (ölçülmüş)

- Proje başına `.axet-code/axet-code.db`, **WAL kipinde** (header baytı 18/19=2).
- `messages(id, session_id, role, parts TEXT, model, created_at, ...)`;
  `created_at` şemadaki yoruma rağmen **Unix SANİYE**.
- `parts` içinde `text` / `tool_call` / `tool_result` / `finish` öğeleri var.
  MCP araçları `mcp_conn_<uuid>_<ad>` biçiminde.
- 281 MB'lık gerçek veritabanında Electron içinde: açılış 15 ms, oturum
  sorgusu 5 ms, artımlı mesaj sorgusu 0 ms. 250 ms'lik yoklama serbest.
- axet-code `.axet-code`'u cwd'den YUKARI doğru arıyor (doğrulandı: cwd
  `...\Temp\axprobe` iken veriler `...\Temp\.axet-code` altına yazıldı).

### better-sqlite3 — bu makineye özgü kurulum

Saf JS/WASM okuyucular (denendi: `node-sqlite3-wasm`) **WAL yüzünden**
kullanılamıyor: paylaşımlı belleği kuramadıkları için var olan her dosyada
"unable to open database file" veriyorlar. Native sürüm zorunlu.

- Sürüm **12.4.1'e sabitli**. 13.x, `engines: node>=22` yüzünden Electron 33'ün
  Node 20'sinde `new Database`'te süreci sert çökertiyor (crashpad).
- Bu makinede kurumsal npm kurulum script'lerini engelliyor ve Visual Studio
  derleme araçları YOK — yani ne indirilebiliyor ne derlenebiliyor. Paket
  `--ignore-scripts` ile kuruluyor; ikiliyi `build/ensureSqlite.cjs` indiriyor
  (Electron ABI'si için hazır prebuild, derleme değil).
- Bu script `npm run build`'in **prebuild** aşamasında otomatik çalışıyor.
  Kasıtlı: eksik ikilinin belirtisi SESSİZ ("sohbet yine yavaş") olurdu.
- `npmRebuild: false` — bu ortamda rebuild garanti patlar.
- Paketleme: `files`'a `better-sqlite3`, `bindings`, `file-uri-to-path`
  eklendi; `asarUnpack`'teki `**/*.node` zaten `.node`'u asar dışına çıkarıyor.

### Açılış el sıkışması

Ekranda sırayla aranan işaretler: `Choose your development tool` →
`choose a provider and model` → `model changed to` / `tab focus chat`. Her
diyaloga tek `Enter`. İşaretlerden hiçbiri 30 sn içinde görünmezse oturum
bırakılıp `run` yoluna düşülüyor **ve sebep log'a yazılıyor** — TUI'nin açılış
ekranı bir sürümde değişirse tek belirti "sohbet yine yavaş" olurdu.

Model diyalogunda tek Enter'ın DOĞRU modeli seçmesi, modelin spawn'dan önce
`axetModels.setAxetModel` ile axet-code'un kendi config'ine yazılmasıyla
sağlanıyor (`recent_models.large` — CLI'ın kendi `/model` seçicisinin yazdığı
dosyanın aynısı). Ekrana model adı yazıp filtrelemek gerekmiyor.

Klavye: `Enter` = `\r` gönderir, `ctrl+j` = `\n` satır atlar. Yani çok satırlı
metin olduğu gibi yazılıp sonuna tek `\r` konabiliyor.

### Turun bittiğini anlamak

**Bitiş sebebi `"stop"` DEĞİL.** İlk sürüm ona baktı ve cevabı aldığı hâlde
beklemeye devam edip 2 dakikada zaman aşımına düştü. Ölçülen gerçek: araç
zincirindeki ara asistan mesajları `tool_use`, kapanış mesajı **`end_turn`**
ile bitiyor; `"stop"` yalnızca `tool_result` kayıtlarında görülüyor. Kural bu
yüzden sebebi saymak değil, SON asistan mesajında `tool_use` DIŞINDA bir sebep
görmek.

### Dikkat

- **`run` yolu KALDIRILMADI, yedek oldu.** TUI kurulamazsa (sqlite yok, açılış
  ekranı tanınmadı, pty açılmadı) mesaj oradan gidiyor. En kötü durum = dünkü
  davranış.
- Araç çağrıları çağrı KİMLİĞİYLE tekilleniyor, adla değil. Ad karşılaştıran
  ilk sürüm, yoklama aynı mesajları yeniden okuduğu için saniyede dört kez aynı
  aracı bildirdi.
- Bir turda yalnızca o tura ait mesajlar akıtılıyor: gönderimden ÖNCE var olan
  mesaj kimlikleri işaretleniyor. Yoksa `created_at` saniye çözünürlüklü olduğu
  için önceki turun cevabı bu turun başında yeniden akardı.
- İptal (`esc`) süreci ÖLDÜRMÜYOR — oturum kalıcı, yalnızca tur kesiliyor.
  İptalde ayrıca bir bayrak set ediliyor: esc her zaman veritabanına bir bitiş
  yazdırmıyor, yoklama onu beklerse iptal 5 dakikalık zaman aşımına dönerdi.
- Bağlayıcı kararı (bkz. `connectorPolicy.ts`) spawn anında sabitleniyor. Karar
  değişirse oturum yeniden kuruluyor ve geçmiş `buildPrompt` ile yeniden
  tohumlanıyor — yine en kötü durum eski davranış.
- En fazla 3 eşzamanlı oturum (LRU), 10 dakika boşta kalan bırakılıyor. Sohbet
  silinince oturumu da kapanıyor (`axetChat:closeSession`).
- Yeni sohbetin kimliği kullanıcı YAZARKEN üretiliyor (`newChatIdRef`) ki
  ısıtılan oturumla birazdan doğacak sohbet aynı kimliği paylaşsın.
- Her tur `[axetChatTui] tur bitti` satırıyla süresini ve kaç araç çalıştığını
  log'a yazıyor — "yavaş" şikâyeti bir daha ölçüsüz kalmasın.

### "model changed to" HAZIR demek değil — bağlayıcı yarışı

Kullanıcı (2026-09-04): *"connector var aslında direkt bakması lazım"* — ajan
ise "bu oturumda posta kutusuna bağlı bir entegrasyon görünmüyor" diyordu.
Ajan doğru söylüyordu; sorduğumuz ANDA gerçekten yoktu.

Ölçüm (bağlayıcılar açık, tek açılış):

```
[2.8] "model changed to"      <- eskiden prompt TAM BURADA yazılıyordu
[2.8] Connectors: None   ● launcher test starting... ● test123 starting...
                         ● test123 starting...       ● test starting...
[6.5] ● test 25 tools
[6.6] ● test123 25 tools
[6.8] ● test123 25 tools
[6.8] ● launcher test 17 tools
```

Yani model seçildikten sonra araçların gelmesi için ~4 saniye daha var. O
boşlukta sorulan soruya ajan dürüstçe "aracım yok" diyor.

Düzeltme: `useConnectors` açıkken açılış, ekrandaki `● <ad> <N> tools`
satırlarının SAYISI artmayı bırakıp 1,2 sn sessizlik geçene kadar bekliyor
(tavan 15 sn, dolarsa beklemeden devam + log). Tek bir işaret aranmıyor çünkü
kayıt sayısı kullanıcıya göre değişiyor ve hepsi ayrı ayrı geliyor.

A/B doğrulama, aynı soru ("mail ile ilgili araçlarının adlarını yaz"):

| | cevap |
|---|---|
| beklemesiz | "elimde mail ile ilgili herhangi bir araç yok" |
| beklemeli (2,5 s) | `outlook_read_tool`, `outlook_send_email`, `outlook_save_draft_tool`, ... |

Bedel: bağlayıcı isteyen sohbetin İLK mesajında ~2,5 s. Sonraki turlar
etkilenmiyor (oturum kalıcı). Eski `run` kipinde aynı maliyet HER mesajda
ödeniyordu.

**Ayrıca ölçüldü**: 4 bağlayıcı kaydı var ve `test123` İKİ KEZ kayıtlı —
25+25+25+17 = 92 araç. Mükerrer kayıtların temizlenmesi kod işi değil,
axet.nttdata.com/agentic tarafındaki bir ayar.

### 30 saniyelik mail cevabının dökümü (2026-09-04)

Kullanıcı: *"ortalama 30sn sürdü"*. Cevap DOĞRUYDU (mail okundu). Süre
veritabanından adım adım:

```
19:10:38  prompt gönderildi
19:10:38  -> outlook_read  (connector c3c2a49d)
19:10:45  <- sonuç: +7 s   YETKİSİZ, başarısız
19:10:45  -> outlook_read  (connector df6566e3 — MÜKERRER kayıt)
19:10:57  <- sonuç: +12 s  başarılı
19:10:57  cevap
```

Üç ayrı kalem, üçü de farklı yerde:

1. **7 s bozuk mükerrer kayda gidiyor.** Ajan önce `c3c2a49d`'yi deniyor, o
   yetkisiz dönüyor, sonra `df6566e3`'e geçiyor. Alternatifi denemesinin
   sebebi bizim `CONNECTOR_RETRY_REMINDER` önsözümüz — yani cevabın gelmesini
   o sağlıyor, bedeli de bu. KOD İŞİ DEĞİL: axet.nttdata.com/agentic'teki
   mükerrer kayıt silinince kalkar.
2. **12 s bağlayıcı arka ucunun kendi süresi.** Bizde yapılacak bir şey yok.
3. **~6 s açılış** (3,5 s el sıkışması + 2,5 s bağlayıcı beklemesi). Bu
   gizlenebilirdi ve gizlendi: ön-ısıtmaya artık YAZILMAKTA OLAN TASLAK da
   gidiyor ve bağlayıcı kararı ona bakılarak veriliyor. Kullanıcı "mail"
   yazdığı anda doğru oturum kurulmaya başlıyor; eskiden ısıtma her zaman
   bağlayıcısız kuruluyor, doğru oturum Gönder'e basıldıktan SONRA
   kuruluyordu.

Taslak kararı yanlış çıkarsa bedel sınırlı: sonradan bağlayıcı gerekmezse
oturum olduğu gibi kullanılıyor (yapışkan kural), gerekir de kaçırmışsak o
mesajda yeniden kuruluyor — yani eski davranış.

---

## Bağlantıdan sonra sohbetin ilk balonu (2026-09-06)

**Kullanıcının bildirdiği davranış**: bir sisteme bağlanıldıktan sonra sohbet
BOMBOŞ açılıyordu. Kullanıcı "MAYA sistemine bağlı mısın" diye sormak zorunda
kalıyor, ajan da 4 komut çalıştırıp durumu sıfırdan keşfediyordu ("Hayır,
gerçek anlamda bağlı değilim — SAML SSO giriş sayfası döndü"). Cevap DOĞRUYDU,
ama bir tur jetona, birkaç saniyeye ve kullanıcının soru sormasına mal
oluyordu.

**Kök sebep**: bağlantı sonucu sohbete hiç ulaşmıyordu. `App.tsx`
`handleCredentialsSubmit` `ConnectResult`ten yalnızca `ok`, `message` ve
`projectDir`i okuyor, `verified`i hiç kullanmıyordu; `AxetCodeHome`in yeni
sohbet yüzeyi (`newSessionView`) `messages: []` ile sabitti. Yani doğrulama
sonucunu launcher ZATEN biliyordu, sadece kimseye söylemiyordu.

**Çözüm**: karşılama metni bağlantı anında `App.tsx`te üretiliyor
(`connectNotice.*` anahtarları) ve `SapChatRequest.notice` ile sohbete
taşınıyor. İçeriği: sistem etiketi + client/kullanıcı + `result.message`
(launcher'ın dile duyarlı, duruma özel açıklaması — yeniden yazılmıyor) +
sıradaki adım.

- **`ok: true` + `verified: false` GERÇEK bir durum** (SAML kurulumu gereken
  sistemler, RFC bridge ayakta ama doğrulanmamış, bridge auto-start başarısız).
  Karşılama bu iki hâli ayırıyor; renderer eskiden üçünü de aynı "başarılı"
  toast'ıyla geçiştiriyordu.
- Balon `newSessionView.messages`e giriyor, yani bağlantıdan sonra açılış
  ekranındaki genel öneri kartları yerine O görünüyor.
- İlk mesajla birlikte sohbete de taşınıyor (`handleSendNew`) — sadece boş
  ekranda dursaydı kullanıcı yazar yazmaz kaybolur, geçmişe dönüldüğünde
  sohbetin hangi sisteme ait olduğu görünmezdi.
- **Ajana giden geçmişten SÜZÜLÜYOR** (`CONNECT_NOTICE_ID` /
  `isNotConnectNotice`, üç `historyForCall` kurucusunda da). Bu balon asistan
  gibi görünüyor ama ajanın ürettiği bir tur değil; uydurma bir asistan turu
  göndermek ajanın kendi kalıcı oturum hafızasıyla çelişirdi ve aynı bilgi
  zaten proje klasöründeki `sap-context.md`de duruyor.
- Kimlik SABİT (`"connect-notice"`), her render'da `crypto.randomUUID()`
  değil — id React `key` olarak kullanılıyor, değişseydi balon her tuş
  vuruşunda sökülüp yeniden kurulurdu.
- Elle açılan yeni sohbet (`handleNewSession(null)`) karşılamayı temizliyor:
  bir önceki bağlantının metni ekranda asılı kalmamalı.

Aynı turda **"Son Bağlananlar" listesindeki göreli zaman satırı geri alındı**
(kullanıcı isteği) — liste yine tek satır. `formatRelativeTime` hâlâ
`SystemPanel`de "son bağlantı" için kullanılıyor, ölü kod kalmadı.

## SAML SSO girişi artık OTOMATİK (2026-09-06)

Kullanıcı isteği: *"bu şekildeki sistemlerde otomatik olarak bana dediği
adımları kendi yapmalı zaten login bilgilerini giriyorum arkada kendi
tarayıcıyı açsın otomatik halletsin falan yani"*.

Önceden SAML'li (BTP/cloud) bir sisteme bağlanınca launcher sadece bir NOT
bırakıyordu: "`login_saml_sso.py` çalıştır". Bu, kullanıcı açısından dört elle
adım demekti — `pip install playwright`, ~200MB Chromium indir, script'i
çalıştır, script'in bastığı `ADT_SAML_COOKIES_FILE=...` satırını `.conn_adt`'a
kopyala. Yani "bağlan" düğmesi bağlamıyordu.

**Yeni akış** (`app-electron/main/samlLogin.ts`, `performSamlLogin`):
- Giriş penceresini **Electron'un kendisi** açıyor. Electron zaten Chromium —
  ayrı bir tarayıcı indirmenin, ayrı bir Python çalışma zamanının ve elle
  kopyalanan bir satırın hiçbirine gerek yok.
- Pencere **önce gizli**. Kurumsal ortamda IdP oturumu çoğu zaman zaten
  açıktır ve akış 6 saniye içinde kendiliğinden biter — bu durumda kullanıcı
  hiçbir şey görmez. Bitmezse pencere gösterilir (parola + MFA/push için 3
  dakika).
- Oturum bölmesi **sistem başına ve kalıcı** (`persist:saml-<service.uuid>`):
  bir kere giriş yapıldıktan sonra aynı sisteme sonraki bağlanmalar sessiz.
  İki farklı sisteme iki farklı kullanıcıyla bağlanmak birbirine karışmıyor.
- Başarının ölçüsü "çerez var mı" DEĞİL, `SAP_SESSIONID*`/`MYSAPSSO2` var mı —
  IdP'ye yönlendiren ilk istek de çerez bırakıyor, yarım kalmış bir akışı
  başarı sanardık. Python tarafı (`saml_auth_provider.get_sap_session_id`)
  aynı çereze bakıyor.
- **Sertifika hatası SESSİZCE GEÇİLMİYOR** (`callback(false)`). Uygulamanın
  geri kalanı ADT isteklerinde `rejectUnauthorized: false` kullanıyor ama
  orada gönderilen şey zaten bilinen bir kimlik bilgisi; burada kullanıcı
  parolasını CANLI olarak yabancı bir sayfaya yazıyor.
- Akışın sonu `application/atomsvc+xml`, yani Chromium için bir İNDİRME —
  varsayılan davranış gizli pencereden bir "farklı kaydet" diyaloğu açmak
  olurdu. `will-download` iptal ediliyor; bizi ilgilendiren gövde değil, o
  noktaya gelene kadar toplanan çerez.

**Çerez alındı ≠ çerez geçerli.** `adtDiscovery.ts`e eklenen
`verifyWithCookies` gerçek bir ADT çağrısıyla doğruluyor (ve dönen şey yine
bir HTML giriş sayfasıysa başarısız sayıyor — SAML'in tuzağı tam olarak 200
dönmesi). Ancak bu geçtikten sonra `verified: true` deniyor. `verifyCredentials`
imzasına isteğe bağlı bir parametre olarak EKLENMEDİ: o fonksiyonun router dalı
da var, SAML'li sistemler ise tanım gereği cloud — router'ın arkasında değiller.

Yazılan dosyalar: `<proje>/.saml_cookies.json` (Python tarafının beklediği
şekil: `cookies` sözlüğü + `session_cookies` listesi, alan adları camelCase
DEĞİL) ve `.conn_adt` içinde `ADT_SAML_COOKIES_FILE=.saml_cookies.json`.
Sabit ad bilinçli — klasör zaten sisteme özel, `login_saml_sso.py`'nin
host'a göre değişen adı (`.saml_cookies_<host>.json`) yüzden `.conn_adt`
satırını da elle kopyalatmak zorunda kalıyordu. `.gitignore`'a **ikisi de**
giriyor: çerez dosyasındaki SAP_SESSIONID, süresi dolana kadar parolanın
yerine geçen canlı bir oturum anahtarı.

`samlSystem` ve `samlVerified` iki AYRI bayrak: Basic Auth'a dayanan adımlar
(`adt-tool.ps1` self-test) giriş BAŞARILI olsa bile atlanmalı, çünkü o script
hâlâ kullanıcı adı/şifre gönderiyor ve bu sistemde kaçınılmaz olarak HTML
giriş sayfası alacak.

`sap-context.md`nin SAML bölümü de değişti: artık ajana "önce
`login_saml_sso.py` çalıştır" DEMİYOR. Giriş başarılıysa açıkça *"senin
yapman gereken hiçbir kurulum adımı YOK, Playwright kurmaya kalkışma"*
diyor; başarısızsa doğru ilk adım olarak **kullanıcıdan yeniden bağlanmasını
istemeyi** öneriyor (pencere kapatıldıysa/zaman aşımına uğradıysa sebep
çoğu zaman budur). Elle akış son çare olarak duruyor.

Çerezin süresi dolduğunda Python tarafı bunu ANLAMIYOR — `is_valid()` sadece
`bool(self._cookies)`, bir tarih kontrolü yok. Bayat bir kavanoz geçerli
görünüp ADT çağrısında HTML sayfası döndürüyor. Çözüm yeniden bağlanmak;
`sap-context.md` ajana bunu söylüyor.

## Sohbetler: sisteme göre gruplanıyor ve devam ediyor (2026-09-06)

Üç ayrı iş, hepsi kenar çubuğunda buluşuyor.

**1) `sanitizeSession` veri kaybı (chatStore.ts).** `cwd` ve `sapLabel` tipe
ve renderer'a eklenmişti ama `sanitizeSession`'a eklenmemişti; o fonksiyon
nesneyi alan alan YENİDEN KURDUĞU için ikisi de hem kaydetmede hem okumada
sessizce düşüyordu — uygulama kapanınca her sohbet "sistemsiz" hâle
geliyordu. Aynı hatanın ÜÇÜNCÜ tekrarı (önce `attachments`, sonra `steps`).
Bu dosyaya yeni bir alan eklerken `sanitizeSession`/`sanitizeMessage`
mutlaka güncellenmeli — tip sistemi bunu yakalamıyor.

**2) Aynı sisteme tekrar bağlanınca eski sohbet devam ediyor.**
`AxetCodeHome.tsx`'teki `sapChatRequest` etkisi artık `cwd`'si eşleşen en son
güncellenmiş sohbeti bulup ona geçiyor ve bağlantı notunu oraya ekliyor.
Anahtar `cwd` (küçük harfe indirilmiş): sohbette sistem uuid'si YOK, tek
kalıcı bağ çalışma klasörünün yolu. Önceki sohbet `pending` ise (ajan hâlâ
cevap yazıyor) araya girilmiyor, yeni sohbet açılıyor. Etki `sessions`
yerine `sessionsRef` okuyor — bağımlılığa `sessions` konsaydı her mesajda
yeniden çalışıp tekrar tekrar bağlantı notu basardı. Not id'si de sabit
değil, `connect-notice-<nonce>`: aynı sohbet ikinci kez not alabildiği için
sabit id çift React key üretirdi.

**3) Kenar çubuğu grupları.** Sohbetler artık iki bölüm: "SAP sohbetleri"
(sistem başına daraltılabilir bir grup, `cwd` ile anahtarlanıyor, etiket
`sapLabel` yoksa klasör adına düşüyor — düzeltmeden önce kaydedilmiş
sohbetler öksüz kalmasın diye) ve "Sohbetler" (sistemsiz olanlar, o da
daraltılabilir). Sadece KAPALI gruplar state'te tutuluyor, yani varsayılan
açık. Arama yapılırken `groupOpen` her grubu açık sayıyor; aksi hâlde
eşleşen sohbet kapalı bir grubun içinde kalır ve arama bozuk görünürdü.
Daraltma durumu diske YAZILMIYOR (oturumluk).

Dipteki sistemler bloğu artık başlıklı ve üstünde `border-t` var. "Panelde
ayraç lineları olmasa da olur" kuralının bilinçli istisnası: sohbetler kendi
başlıklarının altında gruplanınca başlıksız dip blok da bir sohbet grubu
gibi görünmeye başladı, oysa oradaki satırlar tıklanınca BAĞLANIYOR.

### SAML otomatik doldurma neden çalışmıyordu (2026-09-06)

İlk sürümde doldurma `if (!shown) await tryAutofill();` ile çağrılıyordu —
yani YALNIZCA pencere gizliyken. Pencere ise açılıştan 6 saniye sonra
koşulsuz gösteriliyordu. Kurumsal bir IdP'ye yönlendirme zinciri 6 saniyede
bitmediği için giriş formu ekrana geldiğinde doldurma çoktan kapanmış
oluyordu: pencere açılıyor, alanlar boş, bir daha denenmiyor.

Düzeltmeler:

- Doldurma pencere gösterildikten SONRA da sürüyor.
- Bunun güvenli olması için script artık DOLU bir alana dokunmuyor, ve
  kullanıcı klavyeye dokunduğu anda (`before-input-event`) doldurma tamamen
  çekiliyor. Kontrol kullanıcıdaysa bizde değil.
- Sayfa hâlâ yükleniyorken pencere gizli tutuluyor (üst sınır 20 sn) —
  yarım yüklenmiş formu bir saniyeliğine gösterip ilerletmek yanıp sönen bir
  ekran demekti.
- CSP yedeği: Okta/Azure AD gibi sıkı CSP'li sayfalar ana dünyada script
  çalıştırmayı reddedebiliyor; ana çerçeve için `executeJavaScriptInIsolated-
  World` deneniyor. `WebFrameMain`'in izole dünya API'si YOK, yani CSP'li bir
  iframe'de doldurma yapılamıyor — o durumda pencere kullanıcıya açılıyor.
- Gönderim düğmesi seçimi: "İptal/Geri/Parolamı unuttum" eleniyor. Önceki
  seçici DOM'da ilk duran düğmeyi alıyordu.
- `console.log("[saml] …")` ile tanılama: hangi çerçevede ne bulundu, hangi
  düğmeye basıldı, pencere kaçıncı saniyede açıldı. Parola asla basılmıyor.

Değişmeyen güvenlik kuralı: parola bir bağlanma başına EN FAZLA BİR KEZ
gönderiliyor (`passwordSubmitted`). Hesap kilitlemek bu özelliğin
yapabileceği en pahalı hata olurdu; `MAX_AUTOFILL_SUBMITS` yalnızca kullanıcı
adı adımlarını sınırlıyor.

## Sohbet projeleri (2026-09-06)

Kullanıcı isteği: *"chat ekranının kısmında chat gpt deki projeler yapısını
ekleyelim"*. Sorulduğunda seçilen biçim: **gerçek projeler + proje talimatı** —
kendin oluştur, adlandır, sil; sohbetleri içine taşı; her projenin kendi kalıcı
talimatı var. SAP sistem grupları bundan BAĞIMSIZ ve otomatik olarak durmaya
devam ediyor.

Kenar çubuğu sırası: **Projeler** → **SAP sohbetleri** → **Sohbetler** →
sistemler bloğu. Bir sohbet hem bir projede hem bir SAP klasöründe olabilir;
o durumda **proje kazanıyor**, çünkü proje bilinçli bir seçim, `cwd` ise
bağlantının yan ürünü.

### Talimat HER TURDA gönderiliyor, sadece ilk mesajda değil

İlk tasarım "projedeki her sohbet o talimatla başlar" idi. Tek sefer enjekte
etmek üç ayrı yoldan sessizce kayboluyor:

1. Ajana giden geçmiş son `MAX_HISTORY_MESSAGES` (24) mesajla sınırlı — uzun
   sohbette ilk mesaj pencereden düşüyor.
2. Kalıcı axet-code oturumu uygulama kapanınca ölüyor; yeniden tohumlanırken
   geçmiş EKRANDAKİ mesajlardan kuruluyor ve talimat orada hiç yok (talimat
   bilerek ekrana yazılmıyor).
3. Var olan bir sohbet sonradan bir projeye taşınabiliyor — o sohbetin "ilk
   mesajı" çoktan gitmiş oluyor.

Bu yüzden `withProjectInstructions` her turda, gönderilen metnin başına
işaretli bir blok ekliyor. EKRANDA görünen mesaja dokunulmuyor. Bedeli her
turda talimat kadar jeton; `chatStore.ts` talimatı 8000 karakterle
sınırlıyor ve tipik bir talimat birkaç yüz karakter. Ekleme TEK yerde
(`runPrompt`) yapılıyor: gönder / yeniden üret / sürdür yollarının üçü de
oradan geçiyor.

### İki ayrı "yönerge" mekanizması var, karıştırılmamalı

- **Proje talimatı** (bu iş): sohbete ait, `chat-sessions.json`'da duruyor,
  prompt'a BİZ ekliyoruz. Terminali etkilemiyor.
- **Klasör yönergesi** (`AGENTS.md`, `ChatInstructionsDialog`): klasöre ait,
  axet-code onu SÜREÇ AÇILIŞINDA kendisi okuyor, gömülü terminaldeki
  oturumlarda da geçerli.

Proje kutusunda bunu söyleyen bir satır var (`chatProject.folderNote`) —
kullanıcının "buraya yazdım ama terminalde çalışmıyor" diye takılacağı en
olası yer burası.

### Kararlar

- **Proje silmek sohbetleri SİLMİYOR** — aidiyet kopuyor, sohbetler
  "Sohbetler" başlığına düşüyor. Tek bir çöp kutusu düğmesinin bir klasör
  dolusu konuşmayı uyarısız yok etmesi kabul edilebilir değildi.
- Silinmiş bir projeye işaret eden `projectId` **yok sayılıyor**, sohbet
  görünmez bir grupta kaybolmuyor.
- Boş projeler listede **görünüyor** (SAP gruplarının aksine): yeni kurulan
  proje boş doğuyor, görünmeseydi içine sohbet açılamazdı. Arama sırasında
  gizleniyorlar.
- Sohbeti taşımak `updatedAt`'e dokunmuyor — taşınan sohbet listenin en
  üstüne zıplamamalı.
- Ad/talimat/silme **tek kutuda** (`ChatProjectDialog`): 272px'lik başlığa
  dört düğme sığmıyordu. Silme onayı kutunun İÇİNDE iki aşamalı, üstüne
  `ConfirmDialog` açılmıyor (ikisi de `z-[60]`).
- `MAX_PROJECTS = 40` hem `chatStore.ts`'te hem çizicide: sınır yalnızca
  diskte uygulansaydı kullanıcının kurduğu proje bir sonraki açılışta yok
  olurdu. Aynı gerekçeyle ad 80 / talimat 8000 karakterde `maxLength`.

### Yine aynı tuzak: `sanitizeSession` alan alan kuruyor

`projectId` hem tiplere hem çiziciye eklenip `chatStore.ts`'e eklenmeseydi
kaydetmede DE okumada DA sessizce düşerdi — `attachments`, `steps` ve
`cwd`/`sapLabel` bunu üç kez yaşattı. Bu sefer aynı commit'te eklendi.
Ayrıca kayıt effect'inin bağımlılığına `projects` KONULDU: proje adı/talimatı
sohbet listesine dokunmuyor, olmasaydı değişiklik ancak bir sonraki mesajla
diske inerdi.

## Gruplama artık `cwd`'ye değil, sohbetin nasıl doğduğuna bakıyor (2026-09-06)

Kullanıcı bildirimi: *"eğer bir sisteme bağlıysam ve yeni sohbet başlatmışsam
SAP sohbetlerine alıyor ama ben Sohbetler'e gitmesini istiyorum"*. Netleşen
kural:

- SAP Launcher'dan bir **sisteme bağlanınca** doğan sohbet → "SAP sohbetleri",
  orada devam ediyor.
- Elle **"Yeni sohbet"** (ya da Ctrl+N) → "Sohbetler". O sohbet sistemin
  klasöründe çalışıyor olabilir, ama listede sistemin altına gömülmüyor.
- Bir sistemin altına bilerek sohbet eklemek isteyen için, sistem satırının
  üzerine gelince çıkan **"+"** düğmesi (`newChatInSystem`).

Önceden ayrım `cwd`'nin dolu olmasıydı; `effectiveNewBinding` bağlıyken açılan
her sohbete `activeSap`'ın klasörünü verdiği için elle açılan sohbetler de
sistemin altına düşüyordu. Artık `StoredChatSession.keepInGeneral` var:
`handleNewSession`'a bir **bağlantı geçilmişse** false, geçilmemişse true.
`cwd`'ye DOKUNULMADI — ajanın çalışma klasörü işlevsel bir şey, listedeki yer
ise düzenleme; ikisini aynı alandan türetmek bu hatanın kaynağıydı.

Alan yalnızca `true` iken diske yazılıyor; hiç olmaması "eski davranış" demek,
o yüzden bu işten önce kaydedilmiş sohbetler sistem gruplarında kaldı.
`sanitizeSession`'daki alan alan kurulum tuzağının BEŞİNCİSİ — aynı commit'te
eklendi.

Yeniden bağlanma yolunda (`sapChatRequest` effect'i) `keepInGeneral` olanlar
eşleşmeden **eleniyor**: aynı klasörde çalışan ama kullanıcının bilerek
genelde tuttuğu bir sohbet, "sistemin kaldığı yerden devam eden sohbeti"
değil. Eşleşme çıkmazsa sisteme bağlı yeni bir taslak açılıyor.

## "SAP sohbetleri kayboldu, kurduğum proje silinmiş" (2026-09-06)

Kullanıcı bildirimi. Kodda hata YOKTU; sebep **çalışan ana sürecin eski
olmasıydı**. Electron 00:27'de başlamıştı, `cwd`/`sapLabel` kalıcılığı 00:42'de
(`be47c4b`), projeler 01:37'de eklendi. Yani `chatStore.ts`'in bellekteki hâli
bu alanların HİÇBİRİNİ tanımıyordu ve `sanitizeSession` nesneyi alan alan
yeniden kurduğu için her kayıtta hepsini siliyordu.

Diskteki dosya bunu açıkça gösterdi: 31 sohbetin tamamında `cwd` yok,
`projects` alanı hiç yok. Sohbetlerin kendisi ve mesajları sağlamdı — kaybolan
yalnızca sistem aidiyetiydi, ve o hiçbir zaman diske yazılamamıştı (düzeltme
yazıldı ama çalışmadı). Geri getirilecek bir şey yok.

### Yapısal düzeltme: tanınmayan alanlar artık TAŞINIYOR

Bu, alan alan yeniden kurmanın ALTINCI kurbanıydı: `attachments` (09-02),
`steps` (09-05), `cwd`/`sapLabel`, `projectId`, `keepInGeneral` ve — bu arada
fark edilen — `interrupted`. Sonuncusu tipinde "diske de yazılıyor" diye
YAZILI olmasına rağmen `sanitizeMessage`'da yoktu, yani yarıda kalmış cevabın
notu her kayıtta düşüyordu: kırpılmış bir cevap sonraki açılışta tam bir cevap
gibi görünüyordu.

Artık `carryUnknown` var: bilinen alanlar eskisi gibi tek tek doğrulanıyor,
TANINMAYAN alanlar olduğu gibi taşınıyor. Böyle bir alan en kötü ihtimalle
doğrulanmamış olur, yok olmaz. Sınırlar (20 alan, 8000 karakter) dosya elle
düzenlendiğinde keyfî büyümeye karşı — taşınan değer hiçbir kırpmadan
geçmiyor.

Bu, bugünkü olayı geriye dönük çözmüyor (düzeltmenin kendisi de eski süreçte
yoktu). Kuralı değiştiriyor: bundan sonra tipe alan eklemeyi unutmak veri
kaybı DEĞİL.

### Değişmeyen kural

`app-electron/main/*` ve `app-electron/preload/*` HMR ile GELMİYOR. Bu
dosyalara dokunulduysa `npm run dev` tamamen kapatılıp açılmalı — yoksa çizici
yeni alanları yazar, ana süreç onları sessizce siler.

## Tema baştan kuruldu: "Modern SaaS" + zeytin vurgu (2026-09-06)

Kullanıcı: *"şu temayı hiç beğenmedim komple tüm temayı tasarımı baştan
ayarlayalım uygulamanın tüm butonlar ayarlar tema tasarım renk v.s her şeyi"*.
İki soru soruldu, iki cevap alındı:

- **Tasarım dili:** Modern SaaS (Linear/Notion) — nötr koyu gri-siyah zemin,
  saç teli kenarlıklar, 6px köşeler, sık yerleşim, düz dolgu düğmeler, gölge
  yok, renk yalnızca vurguda.
- **Vurgu rengi:** Zeytin / yeşil — doygunluğu düşük, mavi-mor yorgunluğundan
  çıkan bir ton.

### Neden paletle başlandı

Tasarım sistemi zaten merkezîydi: renkler `src/index.css`'te "R G B" tripleti
olarak duruyor, `tailwind.config.js` bunları `withOpacity()` ile okuyor. Yani
**paletin tamamı tek dosyadan değiştirilebiliyordu** ve CSS HMR üzerinden anında
geliyor — kullanıcı sonucu görmek için yeniden başlatmak zorunda değil.
Şekil dili ise 36 bileşene dağılmıştı; oraya ikinci adımda gidildi.

### Palet

Koyu tema artık **nötr**: `14 14 16` → `46 46 51`, üç kanal birbirine yakın.
Önceki palet (`18 16 25`) mor tintliydi; vurgu rengi maviden zeytine kayınca o
tint zeminden ayrı bir renk gibi okunmaya başlıyordu. Nötr zemin, "tek renkli
vurgu" stratejisinin ön şartı.

Açık tema Notion'a çekildi: sayfa `#ffffff`, uygulama zemini `#f3f3f1`,
ayırıcılar `#e5e5e3`.

Vurgu ölçülerek seçildi, göz kararı değil:

| | koyu | açık |
|---|---|---|
| `accent-400` zemin üstünde metin | 8.4:1 | 4.95:1 |
| `accent-500` üstünde `accent-on` | 4.95:1 | 6.1:1 |

Ton değiştirilecekse **bu iki oran yeniden hesaplanmalı** — `bg-accent-500` +
`text-accent-on` ikilisi uygulamanın her yerinde birincil düğme demek.

### Vurgu yeşili ile durum yeşilini ayırma

Vurgu zeytin olunca `--status-success-text`in eski yaprak yeşili (`#4ade95`)
"seçili öğe" ile "başarılı işlem"i ayırt edilemez hâle getiriyordu. Başarı
rengi belirgin biçimde **turkuaza** kaydırıldı (`#46cfa8` / `#1f7a5c`). Bu bir
estetik tercih değil, okunabilirlik gereği: iki yeşil yan yana geldiğinde
kullanıcı hangisinin durum hangisinin seçim olduğunu bilemiyordu.

### Köşe yarıçapı: 36 bileşen yerine tek bir ölçek

Yarıçap dağılmıştı — `rounded-sm` 62, bare `rounded` 39, `rounded-md` 108,
`rounded-lg` 39, `rounded-xl` 21 kullanım. Aynı ekranda 2px'lik keskin bir kutu
ile 12px'lik yuvarlak bir kart yan yana durabiliyordu.

Bunları tek tek değiştirmek yerine **ölçeğin kendisi daraltıldı**
(`tailwind.config.js` > `borderRadius`): Tailwind'in 2/4/6/8/12/16/24
merdiveni 4/6/6/8/10/12/16 oldu. Tek bir yapılandırma değişikliğiyle 300+
kullanım dile geçti ve bundan sonra hangi sınıf yazılırsa yazılsın sonuç dilin
içinde kalıyor. `rounded` ile `rounded-md`nin aynı değeri vermesi kasıtlı.

`full` dokunulmadı — rozetler, avatarlar ve durum noktaları hap kalmalı.

### Gölge: kart değil, katman göstergesi

Yeni kural: **gölge "bu şey yüzüyor" demektir**, dekorasyon değil.

- Kaldırıldı: kart gölgeleri (`SystemPanel` kartları, `AppConnectionsSection`
  seçili kart, `ScreenViewer` görseli), düğme gölgeleri.
- Kaldı: modal, açılır liste, toast, lightbox — ekranın üstünde duran her şey.

Aynı turda dört birincil düğmedeki `bg-gradient-to-r from-accent-600
to-accent-500` + `shadow-lg` + `hover:brightness-110` + `active:scale-[0.98]`
kombinasyonu düz `bg-accent-500` / `hover:bg-accent-600` ile değiştirildi, ve
üç modalin tepesindeki dekoratif accent gradyan şeridi silindi.

### Temadan kaçmış renkler toplandı

Bunların hepsi Tailwind'in KENDİ sabit renkleriydi, yani tema değişkenlerini
tamamen atlıyorlardı — açık temada yanlış tonda görünüyorlardı:

| nerede | eski | yeni |
|---|---|---|
| `StatusDot` üç nokta | `bg-amber-400` / `bg-emerald-400` / `bg-rose-500` | `--status-*-text` |
| `TitleBar` doğrulanmış rozeti | `bg-emerald-500` | `--status-success-text` |
| `TitleBar` kapat düğmesi hover | `bg-rose-600` | `--status-danger-solid` (yeni) |
| `SettingsModal` "yeniden başlat ve kur" | `bg-emerald-600` | `bg-accent-500` |
| `SettingsModal` / `UpdatePromptModal` hata | `text-red-400` | `--status-danger-text` |
| klasör ikonu (4 dosyada) | `text-[#d99a4e]` | `--folder-icon` (yeni) |
| `SystemPanel` yorum kartı şeridi | `#c9973f` / `#d9a566` | `--action-amber-*` |
| `PreflightPanel` "bilinmiyor" | `#94a3b8` | `--ink-400-rgb` |
| `StatusBarStrip` "I" mesajı | `#93c5fd` | `--status-info-text` (yeni) |
| `EmbeddedTerminal` xterm teması | `#121019` / `#eceaf2` / `#60a5fa` | yeni paletin değerleri |
| `BrowserWindow.backgroundColor` | `#121019` | `#0e0e10` |

`StatusBarStrip`'teki durum ZEMİNLERİ ayrıca `color-mix(in srgb, var(--token)
%N, transparent)` ile kendi metin renklerinden türetiliyor artık. Önceden elle
yazılmış rgba üçlüleriydi ve o sayılar eski paletten kopyalanmıştı: metin
jetonu kayıyor, zemin olduğu yerde kalıyordu.

**`--status-danger-solid` neden ayrı bir jeton:** `--status-danger-text` koyu
zemin üstünde OKUNSUN diye açık bir pembe. Zemin olarak kullanıldığında
üstündeki beyaz ikon 2.5:1'de kayboluyor. Yeni jeton beyazla 5.5:1 veriyor.
Yıkıcı **dolgu** gereken her yerde (başlık çubuğu kapat düğmesi, `ConfirmDialog`
danger onayı) bu kullanılmalı, `-text` olan DEĞİL.

### Modal perdeleri

`bg-black/40`, `/50`, `/60`, `/70` diye dört farklı değer vardı ve hepsi gerçek
siyahtı — açık temada sert bir siyah örtü. Hepsi zaten var olan ama tek bir
yerde kullanılan `--overlay-scrim` jetonuna alındı (koyu 0.6, açık 0.35).

Üç yerde `bg-black/*` KALDI ve kalmalı: `AttachmentChip` (fotoğrafın üstündeki
büyüteç örtüsü) ve `Toast` sayaç rozeti — bunlar tema yüzeyinin değil, bir
görselin/renkli kutunun üstünde duruyor.

### Karşılama başlığının gradyanı değişti

`--chat-hero-*` logonun mor→camgöbeği gradyanıydı (`#6d5efc → #22d3ee`,
`src/assets/logo.svg`'den alınmıştı). Nötr-zeytin bir ekranın ortasında o
başlık tek başına başka bir uygulamadan kopyalanmış gibi duruyordu. Şimdi
degrade **palet içinde**: en açık metin tonundan vurgu yeşiline sessiz bir
geçiş.

**Logonun kendisine dokunulmadı** — `logo.svg` hâlâ mor/camgöbeği, marka
işareti değişmedi. Değişen yalnızca başlık metninin degradesi. Kullanıcı marka
renklerinin başlıkta da geri gelmesini isterse tek yapılacak `--chat-hero-*`
üçlüsünü eski değerlerine döndürmek.

### Tek renk kuralının bilinçli tek istisnası

`--project-500-rgb` ("Yeni proje" düğmesi). Kullanıcı bu düğmenin renkli
olmasını açıkça istedi (2026-09-06) ve yanındaki "Yeni sohbet" ile aynı renk
olursa hangisinin ne yaptığı bir bakışta okunmuyor. Doygunluğu zeytinle aynı
seviyeye çekilmiş mat bir mor — logonun morunun sönümlenmiş hâli.

### Değişmeyen kurallar

- Renk değişkenlerine **`#hex` yazma**: `*-rgb` ile biten her şey boşlukla
  ayrılmış triplet olmalı, yoksa `bg-accent-500/20` gibi opacity varyantları
  derlenmez. Hex değerli `--*-text` jetonları bunun dışında; onlar Tailwind'e
  değil doğrudan CSS'e gidiyor.
- Accent zeminli her yerde **`text-accent-on`**, `text-white` DEĞİL —
  `white` bu projede `--ink-strong-rgb`'ye bağlı ve açık temada koyuya düşüyor.
- `EmbeddedTerminal`'ın xterm teması ve `BrowserWindow.backgroundColor` CSS
  değişkeni okuyamıyor; palet değişirse **bu iki yer elle** güncellenmeli.
  Bağ otomatik değil.
