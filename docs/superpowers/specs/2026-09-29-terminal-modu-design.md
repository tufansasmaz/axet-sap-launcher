# Terminal modu — tasarım

Tarih: 2026-09-29 · Dal: `tasarim/grafit` · Alt proje: **T** (Grafit spec'inde
ayrılmıştı, bkz. `2026-09-29-grafit-kimlik-ve-kabuk-design.md`)

## 1. Amaç

Bugün gömülü terminal Logon ekranının altında sekmeli bir panel
(`TerminalPanel`) ve bir anda tek terminal görünüyor. Kullanıcı vibe'daki gibi
**aynı anda birden fazla terminali ekranda görmek ve hepsinde çalışmak**
istiyor. Terminal kendi modu oluyor; Logon'dan tamamen çıkıyor.

Sıra kullanıcı kararıyla: **önce Terminal modu, sonra Logon sağ taraf.** Logon
tasarımında onaylanan kısımlar (ince başlık, düz bölümler) kendi spec'inde
yazılacak; bu belge yalnız terminalin Logon'dan kalkmasını kapsıyor.

### Kullanıcının verdiği kararlar

| Konu | Karar |
|---|---|
| Ne çalışacak | Karışık: her bölme açılırken axet-code, cmd ya da PowerShell seçiliyor |
| Düzen birimi | Çalışma alanları (sekme gibi); her alanın kendi ızgarası |
| Izgara | Otomatik yerleşim; aralar sürüklenerek boyutlanıyor |
| Yeniden açılış | Düzen kaydediliyor, açılışta geri yükleme soruluyor; ekran çıktısı kaydedilmiyor |
| Alanların yeri | Kenar çubuğunda liste (diğer modlarla aynı) |
| Klasör | Bölme başına seçiliyor |
| Mimari | Yaklaşım A: ekran tarafında `TerminalStore` + ızgara; mevcut `terminalManager` ve `EmbeddedTerminal` yeniden kullanılıyor |

Script ekranı yerinde kalıyor (kullanıcı kaldırmayı düşündü, vazgeçti).

### Başarı ölçütleri

- Terminal modunda aynı anda 1–9 terminal görünüyor ve her birine yazılabiliyor.
- Mod değiştirince, alan değiştirince hiçbir süreç ölmüyor.
- Uygulama yeniden açılınca "Geri yükle" ile aynı alanlar ve bölmeler geri
  geliyor.
- Logon'da terminal paneli ve "Terminal" düğmesi yok.
- Diske terminal çıktısı, token ya da şifre yazılmıyor.

## 2. Kapsam dışı

- Ekran çıktısının (scrollback) diske yazılması — terminalde şifre/token
  görünebilir; kullanıcının güvenlik kurallarıyla çatışıyor.
- Hazır düzen seçici, serbest (iç içe) bölme, bölmeleri sürükleyip yer
  değiştirme.
- Bölme oranlarının kaydedilmesi.
- axet-code'un "düşünüyor / bekliyor" durumunun çıktıdan tahmin edilmesi.
- Ana süreçte düzen tutup Ctrl+R sonrası açık kabuklara yeniden bağlanma
  (yaklaşım B, seçilmedi).
- Logon sağ tarafın yeniden tasarımı (ayrı spec).

## 3. Yerleşim

### 3.1 Mod seçici ve kısayol

- `SidebarMode`'a `"terminal"` ekleniyor; sıra **Sohbet · Logon · Script ·
  Terminal**. Grafit spec'indeki "Sohbet · Terminal · Logon · Script" sırası
  yerine Terminal sona geliyor ki Ctrl+1/2/3 değişmesin.
- **Ctrl+4** Terminal moduna geçiriyor. Olay xterm içinden geliyorsa
  dokunulmuyor (bugünkü `isInTerminal` kuralı).
- Etiket "Terminal" (8 karakter; Grafit'in 7 karakter kuralını bir aşıyor).
  264px'te dört sekme gözle kontrol ediliyor; taşarsa Grafit kuralı gereği
  ikon + ipucuna geçiliyor. Ölçmeden değiştirilmiyor.
- Daraltılmış 48px şeritte dördüncü ikon `TerminalSquare`, ipucu ve
  erişilebilir adıyla.
- Terminal modunda `/` bir şey yapmıyor (arama kutusu yok), Script'teki gibi.

### 3.2 Kenar çubuğu — çalışma alanları

- Ortada mono bölüm etiketi **ÇALIŞMA ALANLARI**, yanında "＋" (yeni alan).
- Her satır: nokta · ad · bölme sayısı (mono). Seçili satır Grafit seçim
  rengiyle.
- Nokta, görünmeyen bir alanda ne olduğunu söylüyor:
  - **Mavi (vurgu):** alan görünmezken bir bölmesine çıktı geldi.
  - **Kırmızı (hata):** alanın bir süreci sıfırdan farklı kodla kapandı ya da
    başlatılamadı.
  - **Yok:** sakin. Kırmızı maviden önce gelir.
  - Alan görünür olunca iki bayrak da siliniyor.
- Yeni alan adı "Çalışma alanı N" (N = boş ilk sayı). Çift tık ya da sağ tık
  menüsünden "Yeniden adlandır" yerinde düzenleme açıyor (Enter kaydeder, Esc
  vazgeçer, boş ad kabul edilmiyor). Sağ tık menüsünde "Kapat" da var.
- Alan kapatılırken içinde çalışan süreç varsa onay soruluyor ("Bu alandaki 3
  terminal kapanacak").
- En fazla **6** alan; 6'da "＋" pasif, ipucu "En fazla 6 çalışma alanı".

### 3.3 Sağ taraf

- **Üst şerit** (ince): alan adı · "3 / 9 bölme" (mono) · boşluk · "＋ Bölme".
  9'da "＋ Bölme" pasif, ipucu "En fazla 9 bölme".
- **Izgara** — bölme sayısına göre otomatik:

  | Bölme | Yerleşim |
  |---|---|
  | 1 | tek bölme, tam alan |
  | 2 | 2 sütun |
  | 3 | 2 sütun; 1. bölme sol sütunu boydan kaplıyor, 2 ve 3 sağda üst üste |
  | 4 | 2×2 |
  | 5–6 | 3 sütun × 2 satır (5'te son hücre boş) |
  | 7–9 | 3×3 (eksik hücreler boş) |

  Sütun ve satır araları sürüklenerek boyutlanıyor; bir bölme %8'in altına
  inmiyor. Bölme sayısı değişince oranlar eşitleniyor.
- **Bölme:** ince çerçeveli kart. Başlıkta durum noktası · tür (mono büyük
  harf: AXET-CODE / CMD / POWERSHELL) · klasör (mono, uzunsa ortadan
  kısaltılmış, tam yol ipucunda) · boşluk · üç ikon düğme (ipucu ve
  erişilebilir adıyla):
  - **Büyüt / Küçült** — bölme ızgara içinde tüm alanı alıyor, diğerleri
    gizleniyor (takılı kalıyor); tekrar basınca geri.
  - **Yeniden başlat** — süreci öldürüp aynı tür ve klasörle yeniden açıyor.
  - **Kapat** — süreci öldürüp bölmeyi kaldırıyor; çalışan bir **axet-code**
    bölmesiyse önce onay.
- Başlıktaki nokta: yeşil = çalışıyor, gri = kapandı (kod 0) ya da sırada,
  kırmızı = hatayla kapandı ya da başlatılamadı.
- **Odak:** tıklanan bölme odaklanıyor; çerçevesi vurgu renginde.
- **Süreç kapanınca** bölme kalıyor; xterm çıktısının altında tek satır:
  "Süreç kapandı (kod N) — yeniden başlatmak için ↻".
- **Boş alan:** ortada üç büyük seçenek (axet-code · cmd · PowerShell) ve
  altında klasör satırı; birine basmak bölmeyi açıyor.

### 3.4 Yeni bölme penceresi

- "＋ Bölme" küçük bir pencere açıyor: **Tür** (üç seçenekli segment) ve
  **Klasör** (salt okunur yol + "Değiştir" → `pickFolder`).
- Varsayılan tür: bu oturumda son seçilen; yoksa Ayarlar'daki "Gömülü terminal
  kabuğu" (`config.terminal`).
- Varsayılan klasör: bu alanda en son açılan bölmenin klasörü; yoksa
  `config.projectsBaseDir`.
- Enter açıyor, Esc kapatıyor.

## 4. Veri

### 4.1 Config (kalıcı)

`AppConfig`'e (`app-electron/shared/types.ts`, `app-electron/main/store.ts`):

```ts
type TerminalPaneKind = "axet" | "cmd" | "powershell";
interface SavedTerminalPane { id: string; kind: TerminalPaneKind; cwd: string }
interface SavedTerminalWorkspace { id: string; name: string; panes: SavedTerminalPane[] }

terminalWorkspaces: SavedTerminalWorkspace[];   // varsayılan []
terminalActiveWorkspaceId: string | null;       // varsayılan null
```

- Okurken ayıklanıyor: bilinmeyen `kind`, boş `cwd`, boş/geçersiz `id` taşıyan
  bölme atlanıyor; boş adlı alan "Çalışma alanı N" oluyor; alan başına ilk 9
  bölme, ilk 6 alan kalıyor; `terminalActiveWorkspaceId` listede yoksa `null`.
- Yazma yalnız yapı değişince: alan ekle/sil/yeniden adlandır, bölme ekle/sil,
  seçili alan değişimi. Çıktı, oran, süreç kimliği yazılmıyor.

### 4.2 `TerminalStore` (yalnız bellekte)

`src/stores/terminalStore.tsx` — `ChatStore`/`ScriptStore` kalıbında; saf
indirgeyici (reducer) ayrı dışa aktarılıyor ki testte React'sız sınansın.

Bölme başına çalışma durumu:

```ts
type PaneRun =
  | { state: "queued" }
  | { state: "starting" }
  | { state: "running"; ptyId: string }
  | { state: "exited"; code: number }
  | { state: "failed"; message: string }
  | { state: "missingDir" };
```

Alan başına bayraklar: `unread` (mavi), `error` (kırmızı).

HMR tuzağı (bkz. sohbet notları): context ayrı bir modülde tanımlanıyor
(`terminalStoreContext.ts`), sağlayıcı dosyası i18n'e bağlı olsa da context
yeniden yaratılmıyor.

## 5. Akışlar

### 5.1 Bölme başlatma

- axet-code: `createTerminal(cwd, cols, rows, config.terminal, config.axetCommand || "axet-code -y")`
  — bugünkü "AXET Projesi Seç" yolunun aynısı (seçilen kabukta başlangıç
  komutu).
- cmd / powershell: `createTerminal(cwd, cols, rows, kind)`.
- **Başlatma sırası:** aynı anda en fazla **2** süreç başlıyor
  (`createTerminal` çözülene kadar); gerisi `queued` ve bölmede "Sırada…".
  Geri yüklemede dokuz axet-code'un aynı anda açılıp makineyi kilitlemesini
  önlüyor.
- **Klasör yoksa:** Terminal modu bölmeleri klasör yaratmıyor. `terminal:create`
  IPC'sine isteğe bağlı `{ createDir: false }` ekleniyor; klasör yoksa ana süreç
  süreci açmadan `"missingDir"` hatası döndürüyor. Bölmede "Klasör bulunamadı:
  <yol>" ile **Klasör seç** (yolu değiştirip başlatır, config'e yazar) ve
  **Kaldır**. Sohbet ve diğer çağıranlar bugünkü gibi klasörü yaratmaya devam
  ediyor.
- **Başlatılamazsa:** `failed` + mesaj, bölmede "Başlatılamadı: <sebep>" ve ↻;
  alanın `error` bayrağı. Bildirim (toast) yok.
- `onTerminalExit(id, code)` → `exited`; `code !== 0` ise alanın `error`
  bayrağı. `onTerminalData` görünmeyen alanın bölmesinden geliyorsa `unread`.

### 5.2 Açılış ve geri yükleme

- Renderer açılır açılmaz yeni `terminal:disposeAll` IPC'si çağrılıyor
  (`terminalManager.disposeAllTerminals`): Ctrl+R sonrası öksüz kalan kabuklar
  kapanıyor. Sohbetin axet-code TUI'si (`axetChatTui.ts`) ayrı bir yönetici,
  etkilenmiyor.
- Kayıtlı düzen boş değilse Terminal moduna **ilk girişte** ızgaranın üstünde
  ince şerit: "Son düzen: 3 alan, 7 bölme — **Geri yükle** / **Boş başla**".
  - Geri yükle: alanlar kurulur, bölmeler 5.1'deki sırayla başlar; seçili alan
    geri gelir.
  - Boş başla: kayıtlı düzen siliniyor (config'e boş liste yazılıyor) ve tek
    boş alan ("Çalışma alanı 1") açılıyor.
  - Şerit açıkken alan ve bölme "＋"ları pasif; önce karar veriliyor.
- Kayıtlı düzen boşsa Terminal modu tek boş alanla ("Çalışma alanı 1") açılıyor.

### 5.3 Görünürlük

- `TerminalMode` bileşeni Sohbet gibi **hep takılı**; mod değişince `hidden`.
  Alan değişince diğer alanların ızgaraları da takılı kalıp gizleniyor.
- Gizli alanlara gelen çıktı xterm'e yazılmaya devam ediyor (`EmbeddedTerminal`
  bugünkü gibi).
- Alan görünür olunca, ızgara oranı ya da pencere boyutu değişince görünen
  bölmeler `fit` ediliyor (`EmbeddedTerminal`'ın `active` özelliği).

### 5.4 Logon'dan kalkan

- `TerminalPanel.tsx` siliniyor. App'teki `terminalSessions`,
  `terminalPanelOpen`, `terminalPanelHeight`, `terminalFullscreen`,
  `handleToggleTerminalPanel`, `handleToggleTerminalFullscreen`, yükseklik
  sürükleme ve `onTerminalReady` etkisi kalkıyor.
- Logon üst şeridindeki "Terminal" düğmesi kalkıyor. (Şeridin geri kalanı Logon
  spec'inde.)
- `sidebarHidden` (terminal tam ekranı) ve `useShellShortcuts`'taki karşılığı
  kalkıyor.
- 2026-09-05 tarihli "SOHBET EKRANINDA TERMİNAL YOK" yorumu güncelleniyor:
  terminal artık kendi modunda.
- `handleNewTerminal` kalkıyor (Terminal modunun "＋ Bölme"si yerini alıyor).

### 5.5 "AXET Projesi Seç" yönlendirmesi

`AppConnectionsModal` → `handleOpenProjectTerminal`: Terminal moduna geçiyor ve
seçili alana `axet` türünde, klasörü `config.axetWorkspaceDir ||
config.projectsBaseDir` olan bir bölme ekliyor. Seçili alan 9 bölmeyle doluysa
yeni bir alan açıp oraya ekliyor; 6 alan sınırı da doluysa hata bildirimi
("Çalışma alanı sınırı dolu"). Geri yükleme şeridi açıksa bölme bekletiliyor:
kullanıcı Geri yükle ya da Boş başla dedikten sonra aynı kurallarla ekleniyor.
Modal bugünkü gibi kapanıyor.

## 6. Güvenlik

- Diske yalnız ad, tür ve klasör yolu yazılıyor.
- ADT HTTP token'ı bugünkü gibi yalnız sürecin ortam değişkeninde
  (`ABAP_HTTP_TOKEN`); config'e, düzene, loga yazılmıyor.
- Uygulama kapanırken ek soru yok; tüm süreçler bugünkü gibi kapanıyor.

## 7. Test

Hepsi vitest + jsdom; xterm yerine sahte `EmbeddedTerminal` (vi.mock),
`window.api` sahte.

- **Izgara hesabı** (`src/terminal/gridLayout.ts`, saf): 1–9 bölme için sütun,
  satır ve 3 bölmedeki boydan bölme; 0 ve 10 için korunma.
- **Config okuma** (`store.ts`): bozuk bölme/alan ayıklama, 9 ve 6 sınırı,
  yok olan seçili alan → `null`.
- **Store indirgeyici:** ekle/sil/yeniden adlandır; `exited` kod 0 / ≠0;
  görünmeyen alana çıktı → `unread`; hata → `error`; alan görünür olunca
  bayraklar siliniyor; kırmızı maviden önce.
- **Başlatma sırası:** 5 bölme geri yüklenince aynı anda en fazla 2
  `createTerminal` bekliyor; biri çözülünce sıradaki başlıyor.
- **Ekran:**
  - Yeni bölme penceresi: varsayılan tür ve klasör, Enter/Esc.
  - Geri yükleme şeridi: Geri yükle ve Boş başla; şerit açıkken "＋" pasif.
  - "Klasör bulunamadı" durumu ve Klasör seç / Kaldır.
  - 9 bölme ve 6 alan sınırında pasif düğmeler.
  - Çalışan axet-code bölmesini kapatırken onay.
  - Ctrl+4; xterm içinden gelen Ctrl+4'e dokunulmuyor.
  - "AXET Projesi Seç" Terminal moduna geçip bölme ekliyor; şerit açıksa
    karardan sonra ekliyor; 9 doluysa yeni alana ekliyor.
  - Logon'da TerminalPanel ve "Terminal" düğmesi yok.
  - Açılışta `disposeAllTerminals` bir kez çağrılıyor.
- **Ana süreç:** `createTerminal` `createDir: false` ve olmayan klasörle süreç
  açmıyor, `missingDir` döndürüyor; varsayılan davranış (klasörü yaratma)
  değişmedi.

## 8. Gözle kontrol

Uygulama bitince kullanıcı bakıyor: dört sekmenin 264px'e sığması, 1–9 bölme
yerleşimi, sürükleme, geri yükleme, gizli alandaki noktalar.
