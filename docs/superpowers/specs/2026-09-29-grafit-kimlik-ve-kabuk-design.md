# Grafit kimlik ve kabuk — tasarım belgesi

Tarih: 2026-09-29 · Dal: `tasarim/grafit` (`tasarim/temel`'den açıldı) · Durum: kullanıcı incelemesinde

## 1. Amaç

Kullanıcının isteği: uygulama `C:\workspace\vibe` gibi görünsün, ama NTT
Studio'ya özgü olsun. Vibe'ın dört yanı beğenildi: tek renkli grafit hava, yazı
karakteri ve mono etiketler, kabuk düzeni, yoğunluk ve boşluk.

Vibe üçüncü taraf ticari bir ürünün yeniden üretimi ve bizim depomuz açık. Bu
yüzden **vibe'ın renk ve ölçü değerleri kopyalanmıyor**; bu belgedeki bütün
değerler bizim. Vibe yalnızca yön veriyor.

### Bölümleme

| # | Parça | Durum |
|---|---|---|
| 1a | **Grafit kimlik** — yüzeyler, üç vurgu rengi, JetBrains Mono, mono bölüm etiketi, başlık çubuğu | Bu belge |
| 1b | **Kabuk** — `ChatStore`/`ScriptStore`, tek geniş kenar çubuğu, ikon şeridinin kalkması | Bu belge |
| T | **Terminal modu** — vibe'daki gibi proje başına terminal ızgarası | Ayrı alt proje, 1 bitince |
| 2 | Kalan ekran ve pencerelerin ortak parçalara taşınması ve `tasarim/temel`'den park edilen borçlar | Sonra |
| 3 | Platform özellikleri | Sonra |

1a önce uygulanıyor ve kullanıcı gözle bakıyor; 1b ondan sonra başlıyor. İki
parça tek plan içinde, 1a görevleri önde ve 1a'nın sonunda gözle kontrol adımı
var.

### Kullanıcının verdiği kararlar

- **Kimlik: grafit + seçilebilir vurgu.** Vurgu Ayarlar'dan seçiliyor: *NTT
  mavisi* (varsayılan), *İndigo*, *Amber*. Bugünkü İndigo/Sıcak palet seçicinin
  yerini alıyor.
- **Kabuk: tek geniş kenar çubuğu.** İkon şeridi kalkıyor. Tepede mod seçici,
  ortada o modun listesi, dipte Hazırlık, Bağlantılar, tema · dil · ayarlar.
  İnce başlık çubuğu aktif sistem bağlamını mono etiketle gösteriyor.
- **Liste verisi yukarı taşınıyor** (yaklaşım 2). Portal ya da ekran başına
  kopya kenar çubuğu seçilmedi.
- **Açık tema kalıyor**, grafitin açık hâli oluyor; üç vurgu orada da geçerli.
- **Terminal modu** mod seçicide yer alacak (Sohbet · Terminal · Logon ·
  Script) ama kendi alt projesinde yapılıyor. Kenar çubuğu dört moda göre
  boyutlanıyor; bu belgede Terminal modu **çizilmiyor**, yer tutucu da yok.

### Başarı ölçütleri

1. Altı görünümün (2 tema × 3 vurgu) her birinde metin, vurgu ve durum
   renkleri en zayıf dinlenme yüzeyinde en az 4.5:1. Test ölçüyor.
2. Ayarlar'dan vurgu rengi seçilebiliyor, seçim kalıcı.
3. İkon şeridi yok; üç modun listesi tek kenar çubuğunda, mod değişince
   yalnızca orta kısım değişiyor.
4. Kenar çubuğu genişliği ve daraltılmış hâli uygulama yeniden açılınca
   hatırlanıyor.
5. Sohbet ve Script'teki davranış taşımadan önce ve sonra aynı; bunu taşımadan
   ÖNCE yazılan testler gösteriyor.
6. Script'ten çıkıp dönünce seçili oturum ve öğe ağacı kaybolmuyor.

## 2. Mevcut durum (incelemeyle bulunanlar)

- **İkon şeridi** `src/components/ActivityBar.tsx` (259 satır, 48px). Üstte üç
  modül sekmesi (Sohbet, SAP Logon, GUI Scripting); altta dil, tema, Hazırlık
  (arıza noktalı sekme), Bağlantılar (yeşil noktalı), Ayarlar. `Activity` türü
  de bu dosyada; `axetFlows`/`axetFlowsLive` türde duruyor ama bilerek
  gösterilmiyor (2026-09-04 kararı).
- **Başlık çubuğu** `src/components/TitleBar.tsx`, pencere çerçevesiz
  (`frame: false`), `h-9`. Solda logo ve "NTT Studio · by tsasmaz"; ortada
  `context.sap` varsa bağlam rozeti (doğrulama noktası, `SID · istemci /
  kullanıcı`, `TierBadge`, varsa tcode, bağlantıyı kes); sağda pencere
  düğmeleri. Bağlam main süreçten `useActiveContext()` ile geliyor.
- **Sohbet listesi** `AxetCodeHome.tsx` içinde (3509 satır), 272px sabit,
  60px'e daralıyor. `sessions`/`activeId`/`projects` durumlarını **37 yer**
  değiştiriyor; çoğu akış sırasında gelen cevaplar. Açılış daraltma tercihi
  `config.chatSidebarOpen`. Yükleme ve kayıt `AxetCodeHome`'da; yükleme
  bitmeden kayıt yapılmasını `loadedRef` engelliyor (yoksa boş ilk durum
  diskteki bütün geçmişi silerdi).
- **Logon listesi** `App.tsx` içinde: genişlik 320 (200–560, kaydedilmiyor),
  44px'e daralıyor, Sistemler/Dosyalar geçişi. Arama kutusu listede değil,
  üstteki şeritte; Ctrl+F onu odaklıyor.
- **Script listesi** `SapGuiScriptingHome.tsx` içinde, 264px sabit, yalnızca
  köprü çalışırken çiziliyor. Ekran mod değişince **kaldırılıyor**; seçili
  oturum ve ağaç kayboluyor. Ekranda 36 durum var, listeyi ilgilendiren 7.
- **Hazırlık** ayrı bir tam ekran, sol listesi yok.
- **Yazı:** yalnızca Inter gömülü. `font-mono` Tailwind'in varsayılan
  yığınına düşüyor; 26 dosya kullanıyor. Elle yazılmış büyük harfli bölüm
  başlıkları var (`text-[10px] font-semibold uppercase tracking-wider`).
  `index.html` sabit `lang="tr"`: İngilizce arayüzde `uppercase` "Files"ı
  "FİLES" yapabilir.
- **Renk yapısı:** `src/index.css`'te dört tam blok (2 palet × 2 tema), her biri
  bütün jetonları tekrar ediyor. `THEME_SURFACES` (`app-electron/shared/themeSurfaces.ts`)
  CSS okuyamayan üç tüketici için aynı değerleri tutuyor; `tests/themeTokens.test.ts`
  ikisini karşılaştırıyor. `AppPalette = "indigo" | "warm"`.
- `tasarim/temel` henüz `main`'e birleşmedi; yani yayımlanmış hiçbir sürümde
  `palette` ayarı yok.

## 3. 1a — Renk yapısı

### 3.1 Bloklar

Dört tam blok yerine:

- **İki yüzey bloğu** — `html[data-theme="dark"]` (ve `:root`) ile
  `html[data-theme="light"]`. Yüzeyler, kenarlıklar, metin, durum ve ortam
  renkleri, gölgeler, kaydırma çubuğu, örtü.
- **Altı vurgu bloğu** — `html[data-palette="…"][data-theme="…"]`. Yalnızca
  vurgu jetonları: `--accent-600/500/400-rgb`, `--accent-on-rgb`,
  `--accent-cyan-rgb`, `--accent-glow`, `--accent-soft-text`,
  `--chat-hero-via/to`.

Jeton **adları değişmiyor**. Bileşenler bu adları okuduğu için hiçbir ekran
değişmeden yeni renklere geçiyor.

`--module-code`, `--module-sap`, `--module-guiscript` gri oluyor (`ink-300`
değeri). İkon şeridi 1b'de kalkıyor; kalan kullanımları renkli ikonu
gerektirmiyor. `--project-*` ve `--folder-icon` yüzey bloklarında kalıyor.

### 3.2 Değerler

Tablolardaki değerler bağlayıcı. Uygulamada bir değer değişirse belge aynı
işlemede güncelleniyor.

**Yüzeyler**

| Jeton | Koyu | Açık |
|---|---|---|
| app | `#0e0f11` | `#f6f7f8` |
| sidebar | `#131417` | `#eff0f2` |
| card | `#17191c` | `#ffffff` |
| raised | `#1b1d21` | `#fafbfb` |
| hover | `#1f2125` | `#eceef1` |
| control | `#1d1f23` | `#f1f2f4` |
| active | `#282b30` | `#e2e5e9` |

**Kenarlıklar**

| Jeton | Koyu | Açık |
|---|---|---|
| line-subtle | `#25272b` | `#e6e8eb` |
| line | `#2e3136` | `#dadde2` |
| line-strong | `#41454b` | `#c3c7ce` |

**Metin**

| Jeton | Görev | Koyu | Açık |
|---|---|---|---|
| ink-100 | ana metin | `#ececee` | `#16181b` |
| ink-200 | ikincil | `#b4b8bf` | `#474c55` |
| ink-300 / ink-400 | ipucu, üst bilgi, bölüm etiketi | `#8d929b` | `#62676f` |
| ink-500 | yer tutucu, devre dışı | `#6c717a` | `#80858d` |
| ink-600 | yalnız süs | `#464a51` | `#b9bdc4` |
| ink-strong | başlık | `#ffffff` | `#0f1114` |

**Vurgu**

| Jeton | NTT koyu | NTT açık | İndigo koyu | İndigo açık | Amber koyu | Amber açık |
|---|---|---|---|---|---|---|
| accent-500 (dolgu) | `#2574cc` | `#1f6fc4` | `#8b93ff` | `#4f55d9` | `#e0a33f` | `#9a6210` |
| accent-on (dolgu üstü yazı) | `#ffffff` | `#ffffff` | `#0f1020` | `#ffffff` | `#1a1204` | `#ffffff` |
| accent-400 (metin, seçili çizgi) | `#5aa2ee` | `#1b66b6` | `#a0a6ff` | `#4a50d2` | `#ebb85f` | `#8f5a0c` |
| accent-600 (basılı) | `#1d63b3` | `#185aa3` | `#7a82f5` | `#4449c4` | `#c98f2e` | `#82520c` |

Seçili zemin (`--accent-glow`) accent-500'ün koyu temada %13, açık temada %10
saydamlığı. NTT koyu dolgusunun görece koyu olması bilerek: `#2f86e0` gibi
parlak bir mavi üstünde beyaz yazı 3.75:1'de kalıyor.

**Durum ve ortam renkleri** `tasarim/temel` belgesinin (§4.1) İndigo
sütunlarındaki değerlerle aynı kalıyor: DEV mavi, QA kehribar, PRD kırmızı,
başarı yeşil. Yeni yüzeylere karşı yeniden ölçülüyor; geçmeyen değer
koyulaştırılıyor (açıkta) ya da açılıyor (koyuda) ve bu tablo güncelleniyor.

### 3.3 Sıralama ve ölçüm

- `tasarim/temel` §4.2 sıralama kuralı aynen geçerli: koyuda `hover` ve
  `control` `line-subtle`dan koyu, `active` `line`dan koyu; açıkta `control`
  ve `hover` `line-subtle`dan açık. Yukarıdaki değerler bunu sağlıyor.
- Ölçüm yüzeyleri: `app`, `card`, `control` **ve `sidebar`**. Kenar çubuğu artık
  listelerin tamamını taşıyor, yazının en çok durduğu yer orası.
- Kurallar: `ink-100/200/300`, `accent-400`, durum ve ortam metinleri ≥ 4.5:1;
  `accent-on` / `accent-500` ≥ 4.5:1; beyaz / `status-danger-solid` ≥ 4.5:1;
  `ink-500` ≥ 3:1.

### 3.4 Ayar ve tek kaynak

- `AppPalette = "ntt" | "indigo" | "amber"`. Config alanının adı `palette`
  olarak kalıyor.
- Okuma: `"ntt"`, `"indigo"`, `"amber"` olduğu gibi; `"warm"` → `"amber"`;
  yok ya da geçersiz → `"ntt"`. Aynı kural `parseAppearance`'ta (pencere
  adresindeki `?palette=`).
- Ayarlar'daki `PalettePicker` "Vurgu rengi" oluyor: üç seçenek, her biri koyu
  ve açık önizlemeyle.
- `THEME_SURFACES` türü aynı kalıyor (`Record<AppPalette, Record<AppTheme, ThemeSurface>>`).
  `app` ve `card` bir temada üç vurgu için aynı; `accent` vurguya göre.
  Terminal her iki temada koyu: zemin `#0e0f11`, yazı `#ececee`, imleç o vurgunun
  koyu `accent-400`'ü.
- `windowBackgroundChange` ve `config:save`'deki `setBackgroundColor` akışı
  değişmiyor.

## 4. 1a — Yazı, etiket, başlık çubuğu

### 4.1 JetBrains Mono

- Değişken ağırlıklı woff2, latin ve latin-ext alt kümeleri, `src/assets/fonts/`
  altına; lisans (SIL OFL 1.1) `JetBrainsMono-LICENSE.txt` olarak yanına.
  Inter'deki düzen aynen: iki `@font-face`, `unicode-range`, `font-display: swap`.
  Dosyalar alındıktan sonra paket bağımlılığı bırakılmıyor.
- `tailwind.config.js`'e `fontFamily.mono`: `"JetBrains Mono Variable",
  ui-monospace, "Cascadia Mono", Consolas, monospace`. `font-mono` kullanan 26
  dosya kendiliğinden geçiyor.
- **Terminal (xterm) Consolas'ta kalıyor.** xterm hücre genişliğini açılışta
  ölçüyor; yazı tipi yüklenmeden açılırsa karakterler kayar. Terminal modu alt
  projesinde ölçülerek ele alınacak.

### 4.2 `Eyebrow`

- `src/ui/Eyebrow.tsx`: mono, `text-2xs`, `font-medium`, büyük harf,
  `tracking-[0.12em]`, `ink-300`. İsteğe bağlı `count` sağa yaslı gösteriliyor
  ("SİSTEMLER 3"). İsteğe bağlı `as` (varsayılan `div`; başlık gerekiyorsa `h2`/`h3`).
- 1a'da `text-[10px] font-semibold uppercase tracking-wider` kalıbındaki bölüm
  başlıkları bu bileşene çevriliyor. Form etiketleri ve diğer büyük harfli
  metinler 2. kısma kalıyor. `text-[Npx]` cırcırı yalnızca aşağı iner.

### 4.3 Belge dili

- `<html lang>` dil ayarını izliyor (`tr` / `en`), `App` dil değişince
  `document.documentElement.lang`'ı güncelliyor. `index.html`'deki başlangıç
  değeri `tr` kalıyor (ilk kare).
- Sonuç: Türkçe'de "SİSTEMLER", İngilizce'de "FILES". axet-code'dan gelen
  İngilizce başlıklar için `ChatBubble`'daki `lang="en"` deseni korunuyor.

### 4.4 Başlık çubuğu

Yapı ve davranış aynı, görünüm yeni:

- Yükseklik `h-9`, zemin `sidebar`, alt çizgi `line`.
- Solda logo ve "NTT Studio"; "by tsasmaz" `ink-500`, küçük.
- Bağlam rozeti mono etiket: `● S4D · 100 / TSASMAZ`, yanında DEV/QA/PRD
  etiketi, varsa tcode. Tıklayınca bugünkü gibi Logon'a gidip sistemi seçiyor.
- Bağlantıyı kes düğmesi yalnızca rozetin üstüne gelince ya da klavye odağı
  rozetteyken görünüyor.
- Pencere düğmeleri gri, üstüne gelince `hover` zemini; kapatma kırmızı
  (`status-danger-solid`, beyaz ikon).

### 4.5 1a sonu gözle kontrol

Uygulama altı görünümde açılıyor; Sohbet, Logon, Script, Hazırlık ve Ayarlar
980px ve geniş pencerede geziliyor. Taşma, okunmayan metin, kalan eski renk
not ediliyor ya da o anda düzeltiliyor. Kullanıcı bakmadan 1b başlamıyor.

## 5. 1b — Verinin kabuğa taşınması

### 5.1 `ChatStore`

- `src/stores/chatStore.tsx`: React bağlamı ve `ChatStoreProvider`. `App`'te,
  `AxetCodeHome`'un ve kenar çubuğunun üstünde duruyor.
- Tuttukları: `sessions`, `activeId`, `projects`, `sessionsLoaded` ve
  değiştiricileri. Değiştiriciler `useState`'inkilerle aynı imzada
  (`Dispatch<SetStateAction<…>>`); `AxetCodeHome`'daki 37 çağrı yeri aynen
  çalışıyor.
- **Yükleme ve kayıt `AxetCodeHome`'da kalıyor**, `loadedRef` korumasıyla
  birlikte. `AxetCodeHome` hep mount olduğu için davranış değişmiyor; taşımak
  yalnızca veri kaybı riski getirirdi.
- İşlem kuralı:
  - **Store'a taşınan:** yalnızca oturum/proje verisine ve dosyaya dokunan
    işlemler — yeniden adlandırma, projeye taşıma, proje oluşturma ve silme,
    dışa aktarma.
  - **Sohbet ekranında kalan:** yazma kutusuna ya da süren cevaba dokunan
    işlemler — yeni sohbet, sohbet silme (süren cevabı iptal ediyor, TUI
    oturumunu kapatıyor), yönergeler penceresini açma, proje penceresini açma.
    Sohbet ekranı bunları `registerChatCommands({...})` ile store'a
    kaydediyor; kenar çubuğu `useChatCommands()` ile çağırıyor. Kayıt
    yapılmadan çağrılırsa hiçbir şey olmuyor (ilk karede düğmeler zaten
    görünür ama sohbet ekranı aynı karede kaydediyor).
  - Her işlemin tarafı planda tablo olarak yazılıyor.
- `src/components/ChatSidebar.tsx`: arama, Yeni sohbet / Proje düğmeleri,
  Projeler / SAP sistemleri / Genel grupları, dipte Sistemler bloğu. Yalnızca
  listeye ait durum burada: `query`, açık gruplar (`openGroups`), yeniden
  adlandırma (`renamingId`, `renameDraft`), taşıma menüsü (`moveMenu`).
  Silme onayı ve proje penceresi sohbet ekranında kalıyor.
- `sessionGroups` hesabı saf bir fonksiyona çıkıyor
  (`src/lib/chatSessionGroups.ts`) ve doğrudan test ediliyor.

### 5.2 `ScriptStore`

- `src/stores/scriptStore.tsx`: `connections`, `sessionsByConn`,
  `expandedConn`, `activeSession`, `nodesByKey`, `expandedNodes`,
  `selectedElementId` ve değiştiricileri.
- Köprüyle konuşan her şey (durum yoklaması, bağlantı ve oturum okuma,
  otomatik yenileme, ekran görüntüsü, eylemler) `SapGuiScriptingHome`'da
  kalıyor. Ekran yalnızca Script aktifken çiziliyor; **arka planda istek
  yok**.
- Geri dönüşte: eski ağaç hemen görünüyor, bağlantılar yeniden okunuyor.
  Seçili oturum yeni listede yoksa seçim, düğümler ve seçili öğe temizleniyor.
- Ekrandan çıkarken bugün aktif GUI bağlamı temizleniyor
  (`setActiveGuiContext(null)`). Bu kalıyor; dönüşte oturum hâlâ varsa bağlam
  yeniden yayımlanıyor.
- `src/components/ScriptSidebar.tsx`: Bağlantılar → oturumlar ağacı, altında
  ekran öğeleri ağacı. Köprü kapalıyken ya da hazırlık ekranı gösterilirken
  boş durum ("Köprü kapalı") çiziliyor.

### 5.3 Logon

- `src/components/LogonSidebar.tsx`, `App.tsx`'teki sol panelden çıkıyor:
  arama kutusu (üst şeritten iniyor), Sistemler/Dosyalar geçişi,
  `RecentSystems`, sistem ağacı, `FileExplorer`. Veri `App`'te kalıyor,
  bileşene özellik olarak geçiyor.
- Ctrl+F ve `/` bu arama kutusunu odaklıyor. Üst şeritteki Sistem Ekle, SAP
  Logon'dan Getir, Terminal ve Yenile düğmeleri ana alanda kalıyor.

### 5.4 Taşımadan önce yazılan testler

Taşıma işlemlerinden önce, bugünkü koda karşı yazılıp yeşil olan testler;
taşımadan sonra da değişmeden yeşil kalmalı:

- Sohbet: gruplama (proje, sistem, genel; bilinmeyen `projectId` genele
  düşüyor), arama süzmesi, yeniden adlandırma (Enter kaydediyor, Escape
  vazgeçiyor), silme onayı, projeye taşıma, yeni sohbet, seçili satır.
- Sohbet: yükleme bitmeden kayıt çağrılmıyor (`loadedRef`).
- Script: oturum seçince ağaç yükleniyor, düğüm açılınca çocukları okunuyor.

Yeni davranış için ayrıca: Script'ten çıkıp dönünce seçim korunuyor; seçili
oturum kapanmışsa seçim temizleniyor.

## 6. 1b — Kenar çubuğu

### 6.1 Parçalar

- `src/shell/Sidebar.tsx`: tepede mod seçici, ortada modun listesi, dipte
  `SidebarFooter`, sağ kenarda genişlik tutamacı.
- `src/shell/SidebarFooter.tsx`: Hazırlık (arıza noktası), Bağlantılar (açık
  bağlayıcı noktası ve sayısı), altında tek sıra ikon düğme: tema, dil,
  ayarlar. Her birinin erişilebilir adı var.
- `src/shell/activity.ts`: `Activity` türü buraya taşınıyor (değerler aynı).
- `src/components/ActivityBar.tsx` siliniyor.

### 6.2 Mod seçici

- Mevcut `src/ui/Tabs` ile; ok tuşlarıyla gezilebiliyor. Etiketler: Sohbet,
  Logon, Script. Dört moda (Terminal eklenince) 264px'te sığacak ölçüde:
  sekme başına en fazla 7 karakterlik kısa etiket, taşarsa ikon + ipucu.
- Hazırlık açıkken hiçbir sekme seçili değil. Bugün bu durumda `Tabs`'e
  Tab tuşuyla ulaşılamıyor; `tasarim/temel`'den park edilen iki `Tabs` borcu
  burada kapatılıyor:
  - `value` `items`'ta yoksa ilk sekme Tab ile odaklanabiliyor.
  - `onChange` değişikliği reddederse odak kaymıyor.
- Hazırlık açıkken orta alanda son modun listesi kalıyor; Hazırlık satırı
  seçili görünüyor.

### 6.3 Genişlik ve daraltma

- Üç modda ortak genişlik: varsayılan 264px, 220–420px. Tutamaç fareyle
  sürükleniyor; odaktayken sol/sağ ok 8px, Shift ile 32px. `role="separator"`,
  `aria-valuenow/min/max`.
- Genişlik yalnızca sürükleme bitince (ya da tuş bırakılınca) kaydediliyor;
  her fare hareketinde dosyaya yazılmıyor.
- Daraltılmış hâl: 48px şerit. Üç modun ikonu alt alta, dipte Hazırlık,
  Bağlantılar, Ayarlar ikonları; her ikonun ipucu ve erişilebilir adı var.
- Config: `sidebarWidth` (sayı, sınırlara kırpılıyor, geçersizse 264) ve
  `sidebarCollapsed` (boolean). `sidebarCollapsed` yoksa eski
  `chatSidebarOpen === false` ise daraltılmış başlıyor. `chatSidebarOpen`
  türden, Ayarlar'dan ve çevirilerden kalkıyor.
- Logon'un `sidebarWidth`/`sidebarCollapsed` yerel durumları ve Sohbet'in
  `sidebarOpen`'ı kalkıyor.
- Terminal tam ekranı (Logon) kenar çubuğunu da gizliyor.

### 6.4 Kısayollar

- **Ctrl+1 / 2 / 3:** Sohbet / Logon / Script. Olay terminalin (xterm)
  içinden geliyorsa dokunulmuyor.
- **`/`:** o modun arama kutusunu odaklıyor (Script'te arama yok, bir şey olmuyor); yalnızca odak bir yazı alanında
  (input, textarea, contenteditable, xterm) değilse. Sohbet kutusundaki `/`
  menüsüne karışmıyor.
- **Ctrl+F:** bugünkü gibi Logon aramasını odaklıyor.
- **Ctrl+B kullanılmıyor**: gömülü terminalde axet-code'un kendi kısayolu.
- Programla yapılan geçişler aynı: hızlı bağlan ve başlık çubuğu Logon'a,
  bağlantı sonrası Sohbet'e.

### 6.5 Yoğunluk

- Kenar çubuğu liste satırı 28px, iç boşluk 8px yatay; seçili satır
  `--accent-glow` zemini ve solda 2px `accent-400` çizgi; bölüm başlıkları
  `Eyebrow`.
- `tasarim/temel` §5'teki "liste satırı 40px" kuralı ana içerik için geçerli
  kalıyor; kenar çubuğu bilerek daha yoğun (kullanıcının beğendiği vibe
  yoğunluğu). Ana içeriğin yoğunluğu 2. kısımda ele alınıyor.

### 6.6 Değişmeyenler

- Sohbet'in sağındaki `ChatFilesPanel`, Script'in `ElementInspector`'ı,
  Logon'un `SystemPanel` / `FileViewer` / `TerminalPanel`'i yerinde.
- `AxetCodeHome` hep mount, gizlenerek; Script ekranı yalnızca aktifken.

## 7. Testler

| Test | Ne denetliyor |
|---|---|
| Kontrast | İki yüzey bloğu × üç vurgu = altı görünüm; §3.3 kuralları `app`/`card`/`control`/`sidebar`'ın en zayıfına karşı |
| Eksiksizlik | İki yüzey bloğu aynı jeton kümesini, altı vurgu bloğu aynı vurgu kümesini tanımlıyor |
| Sıralama | §3.3 yüzey/kenarlık sıralaması iki temada |
| Tek kaynak | `THEME_SURFACES` altı birleşimde CSS ile eşleşiyor |
| Ayar | `palette` okuma kuralları (`warm` → `amber`, yok → `ntt`); `parseAppearance` aynı |
| Yazı tipi | `@font-face` dosyaları var, lisans dosyası var, `fontFamily.mono` ilk sırada JetBrains Mono |
| Belge dili | Dil değişince `<html lang>` değişiyor |
| `Eyebrow` | Mono, büyük harf sınıfları; `count` gösteriliyor |
| Başlık çubuğu | Bağlam yokken rozet yok; varken metin, etiket, kes düğmesi |
| Taşıma öncesi | §5.4 |
| Kenar çubuğu | Mod değiştirme; dip blok eylemleri; genişliğin sınırlara kırpılması ve bırakınca kaydedilmesi; daraltmanın kaydedilmesi; `chatSidebarOpen` geçişi; Ctrl+1/2/3 (xterm içinde çalışmaması); `/` yazı alanında çalışmaması; Hazırlık açıkken sekmelere Tab ile ulaşılması |
| `Tabs` | Park edilen iki borç (§6.2) |
| Gerileme | Bütün takım yeşil; `tests/dialogDataLoss.test.tsx` dahil |

Bitmiş sayılma: bütün takım yeşil, `npm run typecheck` temiz, 1a ve 1b
sonunda altı görünüm çalışan uygulamada gözle kontrol edildi.

## 8. Riskler

- **`AxetCodeHome` taşıması.** 3509 satırlık dosyada durum kaynağı değişiyor.
  Önlem: değiştirici imzası aynı, yükleme/kayıt yerinde, taşıma öncesi
  testler; işlemler tek tek ve her biri ayrı işlemede.
- **Vurgu ile anlam renginin karışması.** NTT mavisi DEV mavisine, Amber
  QA kehribarına yakın. Ortam etiketleri her zaman yazıyla (DEV/QA/PRD)
  gösteriliyor, renk tek başına anlam taşımıyor. Seçili satır çizgisi ile
  etiket aynı satırda yan yana geliyorsa 1a gözle kontrolünde bakılıyor.
- **Script durumunun kalıcı olması** kapanmış bir oturuma işaret eden seçim
  bırakabilir. Önlem: dönüşte doğrulama (§5.2) ve testi.
- **Mono yazı tipinin geç yüklenmesi.** `swap` ile ilk karede yedek yazı tipi
  görünebilir; dosya yerel olduğu için pratikte görünmüyor. xterm bu yüzden
  kapsam dışı.
- **Kısayol çakışmaları.** Ctrl+1/2/3 ve `/` terminal ve yazı alanlarında
  bırakılıyor; testle sabitleniyor.
