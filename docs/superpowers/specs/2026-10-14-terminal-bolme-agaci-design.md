# Terminal modu: bölme ağacı, bölme başına ayarlar, kayma hatası — tasarım

Tarih: 2026-10-14 · Dal: `main` üzerinde yeni bir dal açılacak · Önceki
tasarım: `2026-09-29-terminal-modu-design.md` (oradaki "Kapsam dışı"nın üç
maddesi — serbest/iç içe bölme, sürükleyip yer değiştirme, oranların
kaydedilmesi — bu belgeyle kapsama giriyor).

## 1. Amaç

Kullanıcı (2026-10-14): *"terminal kısmında istediğim gibi rahatça genişletip
küçültemiyorum ya da yerlerini serbest değiştiremiyorum, hepsi ayrı ayrı
özelleştirilebilir olmalı; terminal içindeki yazılar kaydırırken ya da bir şey
yapmasam da kayıyor, sapıtıyor, tıklayınca düzeliyor."*

Bugün her çalışma alanında düz bir bölme listesi ve otomatik bir ızgara var
(`src/terminal/gridLayout.ts`). Oranlar sütun/satır başına ORTAK:
aynı sütundaki bütün bölmeler genişliği paylaşıyor, yani tek bir bölme ayrı
boyutlanamıyor. Oranlar yalnız ekranda (`TerminalMode.tsx` içindeki
`useState`) tutuluyor, kaydedilmiyor. Yer değiştirme yok.

### Kullanıcının verdiği kararlar

| Konu | Karar |
|---|---|
| Yerleşim modeli | Bölme ağacı (VS Code gibi): her bölme yatay ya da dikey bölünür, iç içe |
| Bölme başına | Kendi boyutu · ad ve renk · yazı boyutu · tam ekran / küçült |
| Kayma hatası | Bütün bölme türlerinde (axet-code, PowerShell, cmd); kaydırırken, çıktı akarken, boyut değişince ve boşta dururken; tıklayınca düzeliyor |

### Başarı ölçütleri

- Bir bölmeyi boyutlandırmak yalnız onun kardeşini etkiliyor.
- Bir bölme başlığından sürüklenip başka bir bölmenin kenarına ya da ortasına
  bırakılabiliyor; süreçler yeniden başlamıyor.
- Ad, renk, yazı boyutu, küçültülmüş durum ve ağaç uygulama yeniden açılınca
  "Geri yükle" ile aynen geliyor.
- Terminal yazıları tıklamaya gerek kalmadan doğru kalıyor (ölçümle
  doğrulanmış kök nedene göre, bkz. §5).
- Diske terminal çıktısı, token ya da şifre yazılmıyor (değişmedi).

## 2. Kapsam dışı

- Bölmeyi başka bir çalışma alanına sürüklemek.
- Hazır düzen şablonları.
- Bölme başına tema ya da yazı tipi ailesi.
- Ekran çıktısının (scrollback) kaydedilmesi.
- Klavyeyle bölmeler arası gezinme kısayolları.

## 3. Yerleşim ve etkileşim

### 3.1 Ağaç

Her çalışma alanının bir `layout` ağacı var:

- **Yaprak:** `{ type: "pane", paneId }`.
- **Kap:** `{ type: "split", dir: "row" | "column", children, sizes }`.
  `row` = çocuklar yan yana, `column` = üst üste. `sizes` çocuk başına pay,
  toplamı 1.

Değişmezler (her işlemden sonra denetlenir, testlerde de):

- Boş kap yok; tek çocuklu kap yok (çözülür, çocuk üst kaba geçer).
- Bir kabın çocuğu aynı yönde bir kap olamaz (düzleştirilir: `row` içinde
  `row` → tek `row`).
- `sizes.length === children.length`, her pay > 0, toplam 1 (±1e-6).
- Her `paneId` ağaçta en fazla bir kez; ağaçtaki yapraklar + küçültülmüşler =
  alanın bölmeleri. En fazla 9 bölme (`MAX_TERMINAL_PANES` aynen).

### 3.2 Yeni bölme

- "Yeni bölme" odaktaki bölmeyi ikiye böler: bölmenin ekrandaki genişliği
  yüksekliğinden büyükse sağına (`row`), değilse altına (`column`). Odak
  yoksa ya da alan boşsa kökün sonuna eklenir.
- Her bölme başlığında iki düğme: **Sağa böl**, **Alta böl**. Yeni bölme
  diyaloğu (`NewPaneDialog`) aynen açılır; tür ve klasör oradan seçilir.
- Bölünen bölme ile yenisi payı eşit paylaşır.
- 9 bölmede düğmeler kapalı (ipucu sınırı söyler).

### 3.3 Boyutlandırma

- Kardeşlerin arasındaki ayırıcı sürüklenir; yalnız o iki kardeşin payı
  değişir (bugünkü `dragRatios` mantığı, kap başına).
- Ayırıcıya çift tık: o kabın bütün çocukları eşit.
- Alt sınır: bir bölme yaklaşık 20 sütun × 5 satırın altına inmiyor
  (piksel karşılığı, yazı boyutundan bağımsız sabit: 160 px × 90 px).
  Sürükleme sınırda durur.

### 3.4 Yer değiştirme (sürükle-bırak)

- Başlıktan tutulur (düğmeler hariç). 4 px'ten az hareket sürükleme sayılmaz
  (tıklama odak vermeye devam eder).
- Sürüklerken hedef bölmenin üstünde beş alan belirir: **sol, sağ, üst, alt
  kenar** (her biri bölmenin %25'i) ve **orta**.
  - Kenar: sürüklenen bölme kaynaktan çıkarılır, hedefin o tarafına
    eklenir (hedef bölünür, pay eşit).
  - Orta: iki bölme yer değiştirir (ağaçta `paneId`'ler takas edilir).
- Yarı saydam bir gölge sonucu bırakmadan önce gösterir.
- Kendi üstüne bırakma ya da Esc: iptal, hiçbir şey değişmez.
- Süreçler yeniden başlamaz: `TerminalPane` nesneleri ve `ptyId`'ler
  dokunulmadan kalır, yalnız ağaç değişir. xterm örneği bölme taşınırken
  YENİDEN OLUŞTURULMAZ (bkz. §6.2).

### 3.5 Kapatma

Bölme kapanınca yaprak ağaçtan çıkar, kardeşleri payını paylaşır; tek çocuk
kalan kap çözülür.

### 3.6 Eski kayıtlar

Ağacı olmayan eski kayıt (`panes` listesi) bugünkü otomatik ızgaraya benzeyen
bir ağaca çevrilir: `gridLayout(n)`'in satırları bir `column` kabının
çocukları, her satır bir `row` kabı (3 bölmede sol bölme boydan: `row[ pane0,
column[pane1, pane2] ]`). Hiçbir bölme kaybolmaz.

## 4. Bölme başına ayarlar

- **Ad:** başlıktaki tür etiketine çift tık → yerinde düzenleme. Enter
  kaydeder, Esc vazgeçer, boş = tür adı. En fazla 40 karakter, kırpılarak.
- **Renk:** 6 değer: `gray | blue | green | amber | red | violet` (varsayılan
  `gray` = renksiz). Başlıktaki renk noktasına tık → küçük seçici. Başlığın
  solunda 3 px şerit. Durum noktası (çalışıyor/hata/durdu) ayrı kalır.
  Renkler tema jetonlarından (`--status-*` ve vurgu ailesi); sabit hex yok.
- **Yazı boyutu:** bölme içinde Ctrl+tekerlek, Ctrl+`+` / Ctrl+`-`; Ctrl+0
  varsayılan (13). Aralık 9–24. Yalnız o bölme. Değişince terminal yeniden
  ölçülür ve yeni boyut kabuğa bildirilir (§5'teki sakinleşme kuralıyla).
- **Tam ekran:** bugünkü büyüt düğmesi kalıyor (`maximizedPaneId`); Esc de
  geri alır.
- **Küçült:** başlıkta yeni düğme. Bölme ağaçtan çıkar, alanın altındaki ince
  şeritte (`h-7`) ad + renk ile sekme olur; kardeşleri yerini doldurur.
  Süreç çalışmaya devam eder; çıktı gelirse sekmede nokta yanar. Sekmeye tık →
  geri gelir: kaydedilmiş "eski yer"e (`{ siblingPaneId, side }`), o kardeş
  artık yoksa odaktaki bölmenin sağına. Bütün bölmeler küçültülürse alan
  boş-durum metnini gösterir, sekmeler şeritte durur.

## 5. Yazıların kayması — ölç, sonra düzelt

Bilinenler: tıklama `focusPane` → `EmbeddedTerminal`'in `active` efekti
`fit()` + `resizeTerminal()` çağırıyor ve görüntü düzeliyor. Yani arada
xterm'in satır/sütunu ile kabuğun bildiği boyut ayrışıyor ya da çizim
bayatlıyor. `EmbeddedTerminal` tek yerde kullanılıyor (aynı pty iki görünümde
değil — elendi).

1. **Ölçüm (önce):** `terminalManager.resizeTerminal` her GERÇEK boyut
   değişikliğini `ntt-studio.log`'a yazar: `terminal.boyut bolme=<ilk 8>
   sutun=<n> satir=<n>`. Aynı boyut tekrarı yazılmaz; bölme başına saniyede en
   fazla 4 satır. İçerik yok. Ana süreçte; yeni IPC yok.
2. **Teşhis:** kullanıcı kaymayı bir kez yaşar, günlük okunur.
   - Kayma anında boyut oynuyorsa (ara boyutlar, döngü): boyut kabuğa ancak
     ~100 ms sakinlikten sonra ve yalnız değiştiyse bildirilir; xterm'in kendi
     `fit()`'i her karede çalışabilir ama pty'ye ara boyut gitmez.
   - Boyut sabitse (çizim bayat): görünürlük, odak ve düzen değişiminde
     `term.refresh(0, rows-1)`.
3. Düzeltme kullanıcı denemesiyle doğrulanır: tıklamadan doğru kalmalı.

**Kural notu:** "EmbeddedTerminal'in davranışını değiştirme" kuralının konusu
Ctrl+V / sağ tık ele alınışı; o kısım AYNEN kalır. Değişen yalnız
boyutlandırma/çizim ve bölme başına yazı boyutu.

## 6. Mimari

### 6.1 Birimler

- `src/terminal/layoutTree.ts` (yeni, saf, React'sız): tipler ve işlemler —
  `splitPane`, `removePane`, `movePane(drag, target, zone)`, `swapPanes`,
  `resizeSplit(path, index, delta, minShares)`, `equalize(path)`,
  `minimizePane`/`restorePane`, `fromLegacy(paneIds)`, `normalizeLayout(raw,
  paneIds)` (bozuk kaydı onarır ya da `fromLegacy`'ye düşer), `assertLayout`
  (değişmezler, testlerde).
- `terminalTypes.ts` / `terminalReducer.ts`: `TerminalWorkspace`'e `layout`,
  `minimized: Array<{ paneId, home }>`; `TerminalPane`'e `title?`, `color`,
  `fontSize`. Yeni eylemler: `splitPane`, `movePane`, `resizeSplit`,
  `equalizeSplit`, `minimizePane`, `restorePane`, `renamePane`,
  `setPaneColor`, `setPaneFontSize`. `addPane`/`closePane` ağacı da günceller.
- `SavedTerminalWorkspace` (`app-electron/shared/types.ts`): isteğe bağlı
  `layout`, `minimized`; `SavedTerminalPane`: isteğe bağlı `title`, `color`,
  `fontSize`. `normalizeTerminalWorkspaces` bunları doğrular; bozuksa atlar
  (bölme yine gelir, ağaç `fromLegacy`).
- `src/terminal/LayoutView.tsx` (yeni): ağacı iç içe flex kaplarla çizer —
  ama yapraklarda TERMİNAL DEĞİL boş yer tutucular var; ayırıcılar,
  sürükle-bırak katmanı ve gölge de burada. Yer tutucuların ölçülen kutuları
  bölmelerin mutlak konumunu veriyor (bkz. §6.2). `TerminalMode.tsx`'teki ızgara
  çizimi bununla değişir; `gridLayout.ts` yalnız `fromLegacy` için kalır.
- `TerminalPaneView.tsx`: başlık düğmeleri (sağa böl, alta böl, küçült),
  ad düzenleme, renk seçici; sürükleme tutamağı başlık.
- `EmbeddedTerminal.tsx`: `fontSize` prop'u; §5'e göre boyut/çizim düzeltmesi.

### 6.2 xterm örneklerinin korunması

Ağaç değişince React bileşen ağacının yapısı değişir; bölme farklı bir kaba
geçerse `EmbeddedTerminal` unmount olur ve xterm (ekrandaki geçmiş) kaybolurdu.
Bunu önlemek için bölmeler ağaçtan BAĞIMSIZ, alan düzeyinde düz bir listede ve
`paneId` anahtarıyla bir kez çizilir; ağaç yalnız her yaprağın dikdörtgenini
(ölçülen kutu) hesaplar ve bölme mutlak konumla o kutuya yerleşir. Taşıma,
yer değiştirme, küçültme yalnız konumu değiştirir; xterm hiç yeniden
oluşturulmaz. (Küçültülmüş bölme `display: none` ile gizlenir, takılı kalır.)

### 6.3 Kayıt

Düzen kaydı bugünkü yoldan (`terminalWorkspaces`) yapılır; yalnız yeni alanlar
eklenir. Oranlar sürükleme bitince yazılır (her karede değil).

## 7. Test

- `layoutTree` birim testleri: her işlem + değişmezler; eski kayıttan dönüşüm
  (1–9 bölme); bozuk kayıt (eksik/çift paneId, NaN pay, yanlış tip, aynı yönlü
  iç içe kap) onarılıyor ya da düşülüyor.
- Reducer testleri: ağaç ile bölme listesinin tutarlılığı (ekle, kapat,
  yeniden başlat, alan kapat, küçült/geri getir).
- Kayıt normalizasyonu testleri (`normalizeTerminalWorkspaces`).
- Bileşen testi: beş bırakma alanının doğru işlemi seçmesi, Esc iptal, 4 px
  eşiği; ad düzenleme Enter/Esc; yazı boyutu sınırları.
- Taşımada xterm'in yeniden oluşturulmadığı: `EmbeddedTerminal` sahte
  bileşenle, mount sayacı.
- Ölçüm satırı: tekrar boyut yazılmıyor, hız sınırı.
- Gözle kontrol (kullanıcı): 9 bölme, sürükleme, küçült/geri getir, yeniden
  açılışta geri yükleme, kaymanın kalmadığı.
