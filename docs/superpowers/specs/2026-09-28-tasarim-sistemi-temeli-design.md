# Tasarım sistemi temeli — tasarım belgesi

Tarih: 2026-09-28 · Dal: `tasarim/temel` · Durum: onaylandı

## 1. Amaç

Uygulama daha modern, sade, yumuşak, okunaklı ve profesyonel görünsün; renkler
birbiriyle uyumlu olsun; uygulama tek tek ekranlar yerine bir platform gibi
hissettirsin.

Bu iş dört alt projeye bölündü. Bu belge yalnızca **1. alt projeyi** anlatıyor:

| # | Alt proje | Durum |
|---|---|---|
| 0 | Diyaloglarda sessiz veri kaybı | Bitti (`fix/veri-kaybi`, `1b44371`) |
| 1 | **Tasarım sistemi temeli** — renkler, ölçüler, ortak parçalar, Görünüm ayarı | Bu belge |
| 2 | Ekranların yeni sisteme taşınması, ortak ekran başlığı, katlanır paneller | Sonra |
| 3 | Platform özellikleri — komut paleti, kısayollar, ekran başına hata sınırı, ilk açılış rehberi | Sonra |

### Kullanıcının verdiği kararlar

- **Yeni kimlik.** Limon yeşili bırakılıyor.
- **İki palet, Ayarlar'dan seçilir:** *Sakin İndigo* ve *Sıcak Nötr*. İkisinin de
  koyu ve açık hâli var; toplam dört görünüm.
- **Yoğunluk: Ferah.** Gövde metni 14px, satır ve kontrol yüksekliği 40px, kart
  ve pencere köşesi 12px.
- **Yöntem:** Tema dosyasında dört açık blok ve bu blokları ölçen bir kontrast
  testi. Katmanlı ya da koddan üretilen yapı seçilmedi (gerekçe §3).

### Başarı ölçütleri

1. Dört görünümün her birinde metin ve durum renkleri, en zayıf dinlenme
   yüzeyinde **en az 4.5:1** kontrastta. Bunu bir test ölçüyor; biri rengi
   bozarsa test kırılıyor.
2. Kullanıcı Ayarlar → Görünüm'den paleti ve koyu/açık hâli seçebiliyor; seçim
   kalıcı.
3. Açık temada uygulama açılırken koyu bir kare görünmüyor.
4. Açık bir pencerenin üstünde bildirimler görünüyor (bugün arkasında kalıyor).
5. Ortak `Modal`: klavye odağı pencerenin içinde kalıyor, Escape yalnızca en
   üstteki pencereyi kapatıyor, değişiklik varken kapatmak onay soruyor.
6. Mevcut testlerin hepsi yeşil; tip denetimi temiz.

## 2. Mevcut durum (incelemeyle bulunanlar)

- Renkler zaten **göreve göre** adlandırılmış jetonlar (`app`, `sidebar`,
  `card`, `raised`, `hover`, `control`, `active`, `line`, `ink`, `accent`,
  `status-*`, `tier-*`, `module-*`). `src/index.css` içinde 70 değişken var,
  "R G B" üçlüsü olarak tanımlı ve Tailwind'e `withOpacity` ile bağlı. Tailwind'in
  `slate-*` ve `white` renkleri de bu jetonlara yönlendirilmiş. Yani **bileşenler
  değişmeden** renkler değişebiliyor.
- Tema `html[data-theme="dark|light"]` ile seçiliyor (`src/App.tsx:327`).
- Yazı boyutları dağınık: 10 farklı boyut, elle yazılmış `text-[Npx]` sınıfı
  **207** yerde (`src/` altında `text-\[[0-9.]+px\]` ile sayıldı; ilk
  incelemede 202 yazılmıştı), 10px yazı 59 yerde.
- **15 elle yazılmış pencere** var; yalnız 2'sinde `role="dialog"`, hiçbirinde
  odak tutma yok. Escape yalnızca odak pencerenin içindeyken çalışıyor.
- Bildirim kutusu `z-50` (`src/App.tsx:1519`), pencereler `z-[60]`–`z-[71]`:
  açık bir pencere varken bildirim arkada kalıyor.
- Pencere arka planı `app-electron/main/index.ts:260`'ta `#0b0c10` olarak sabit;
  açık temada açılışta koyu bir kare görünüyor.
- Terminal renkleri `src/components/EmbeddedTerminal.tsx:36`'da elle yazılmış
  (eski koyu zemin, limon imleç); palet değişince kendiliğinden değişmiyor.

## 3. Yöntem: dört açık blok + kontrast testi

`src/index.css` içinde dört blok:

```css
html[data-palette="indigo"][data-theme="dark"]  { … }
html[data-palette="indigo"][data-theme="light"] { … }
html[data-palette="warm"][data-theme="dark"]    { … }
html[data-palette="warm"][data-theme="light"]   { … }
```

Her blok **bütün** renk jetonlarını kendisi tanımlıyor. Gerekçe açıklamaları
bugünkü gibi değerlerin yanında kalıyor.

`:root` bloğu Sakin İndigo · koyu'nun kopyası değil, **aynı blok**: seçici
listesi `:root, html[data-palette="indigo"][data-theme="dark"]`. Böylece nitelik
henüz yazılmamışken (ilk kare) de doğru renk var.

Seçilmeyen yollar:

- **Katmanlı yapı** (koyu/açık bloğu nötrleri, palet bloğu vurguyu verir):
  Sıcak Nötr yüzeyleri de değiştirdiği için palet bloğu koyu/açık bloğunun
  çoğunu yeniden yazıyordu. Hangi değerin hangi katmandan geldiği okunmuyor;
  sıralama hatası dört görünümden yalnız birinde çıkıyor.
- **Koddan üretme** (TS dosyası → CSS): yeni bir derleme adımı ekliyor ve
  açıklamaları değerlerden koparıyor. Sabit dört görünüm için değmez.

Bedeli: tekrar (yaklaşık 4 × 70 satır). Bu tekrarı test koruyor (§8).

## 4. Renkler

### 4.1 Paletler

Dört görünüm tarayıcıda yan yana gösterildi ve onaylandı. Değerler aşağıda.
Tablolardaki değerlerin hepsi bağlayıcı. Metin, vurgu ve durum renkleri ölçüldü;
yüzey ve kenarlık basamakları §4.2 sıralama kuralını sağlıyor. Uygulamada bir
değer değişecekse belge de aynı işlemede güncelleniyor.

**Yüzeyler**

| Jeton | İndigo koyu | İndigo açık | Sıcak koyu | Sıcak açık |
|---|---|---|---|---|
| app | `#121418` | `#f5f6f8` | `#161514` | `#f6f4f1` |
| sidebar | `#16191e` | `#fbfbfc` | `#1b1a18` | `#fbfaf8` |
| card | `#1b1e24` | `#ffffff` | `#201f1d` | `#ffffff` |
| raised | `#1f2229` | `#f8f9fa` | `#242321` | `#f9f8f6` |
| hover | `#21252c` | `#f1f3f6` | `#262422` | `#f2efeb` |
| control | `#22262d` | `#eef0f4` | `#292725` | `#efebe6` |
| active | `#2e333d` | `#e3e6ec` | `#35322f` | `#e5e0d9` |

**Kenarlıklar**

| Jeton | İndigo koyu | İndigo açık | Sıcak koyu | Sıcak açık |
|---|---|---|---|---|
| line-subtle | `#282c35` | `#e8eaef` | `#2e2c29` | `#ebe7e1` |
| line | `#343945` | `#dcdfe6` | `#3a3733` | `#e0dad2` |
| line-strong | `#444a57` | `#c4c9d3` | `#4a4641` | `#cbc3b8` |

**Metin (ink)**

| Jeton | Görev | İndigo koyu | İndigo açık | Sıcak koyu | Sıcak açık |
|---|---|---|---|---|---|
| ink-100 | ana metin | `#e8eaee` | `#1a1d24` | `#ece9e4` | `#1f1c18` |
| ink-200 | ikincil metin | `#b4b9c3` | `#474d5b` | `#bdb7ae` | `#4f483f` |
| ink-300 / ink-400 | ipucu, üst bilgi | `#8a91a0` | `#646b78` | `#978f85` | `#6d655a` |
| ink-strong | başlık | `#ffffff` | `#12151a` | `#ffffff` | `#161310` |

`ink-500` (yer tutucu, devre dışı) ve `ink-600` (yalnız süs) uygulamada
türetilir; `ink-500` en zayıf yüzeyde en az **3:1**, `ink-600` için kontrast
şartı yok, okunması gereken metinde kullanılmaz.

**Vurgu**

| Jeton | İndigo koyu | İndigo açık | Sıcak koyu | Sıcak açık |
|---|---|---|---|---|
| accent-500 (dolgu) | `#8b93ff` | `#4f55d9` | `#e08a5f` | `#ad4e24` |
| accent-on (dolgu üstü yazı) | `#0f1020` | `#ffffff` | `#1a0f09` | `#ffffff` |

`accent-400` (metin olarak vurgu) ve `accent-600` (basılı hâl) uygulamada
türetilir: `accent-400` en zayıf yüzeyde en az 4.5:1. Limon yeşilinin kaldığı
yan jetonlar da her blokta yeniden tanımlanıyor: `--accent-cyan-rgb`,
`--accent-glow`, `--accent-soft-text`, `--chat-hero-from/via/to`, kaydırma
çubuğu renkleri.

**Durum ve ortam çipleri**

| Anlam | İndigo koyu | İndigo açık | Sıcak koyu | Sıcak açık |
|---|---|---|---|---|
| başarı (`status-success-text`) | `#5cc8a8` | `#12785a` | `#8cc49a` | `#2d7444` |
| DEV (`tier-dev-text`, `status-info-text`) | `#7fb2ff` | `#2360c4` | `#8fb4d9` | `#35649a` |
| QA (`tier-qa-text`, `status-warning-text`) | `#e6b866` | `#8a5a06` | `#dcb76a` | `#855a0e` |
| PRD (`tier-prd-text`, `status-danger-text`) | `#f08a95` | `#be3446` | `#e88c8c` | `#b03636` |

Zeminler (`*-bg`) aynı rengin %9–13 saydamlığı, kenarlıklar (`*-border`)
%25–30 saydamlığı. `status-danger-solid` (kırmızı dolgulu düğme) üstündeki
beyaz yazı 4.5:1 sağlamalı. Anlamlar iki palette de aynı: DEV mavi, QA kehribar,
PRD kırmızı.

`--module-*` ve `--action-amber-*` jetonları da dört blokta yeniden tanımlanıyor
ve aynı teste giriyor.

### 4.2 Sıralama kuralı

Bugünkü kural korunuyor, dört görünüme yazılı olarak taşınıyor:

- **Koyu:** `hover` ve `control`, `line-subtle`dan koyu; `active`, `line`dan
  koyu. Aksi hâlde ince kenarlıklı bir kartın üstüne gelindiğinde dolgu
  kenarlığı geçer, çerçeve kaybolur.
- **Açık:** tersi — `control` ve `hover`, `line-subtle`dan açık.

Test bu sıralamayı da denetliyor (§8).

### 4.3 Ölçüm

Metin ve durum renkleri, üç dinlenme yüzeyinin (`app`, `card`, `control`)
**en zayıfına** karşı ölçüldü. Tasarım sırasında koyu temalardaki ipucu metni
(`ink-300`) `control` üstünde 4.0:1 çıktı; değer yükseltildi (İndigo `#8a91a0`
→ 4.80, Sıcak `#978f85` → 4.67). Plan yazılırken dört blok yeniden ölçüldü;
her bloğun en düşüğü: İndigo koyu `ink-300` 4.80, İndigo açık `folder-icon`
4.59, Sıcak koyu `ink-300` 4.67, Sıcak açık `success-text` 4.79.

## 5. Ölçüler (Ferah)

Köşe yarıçapında daha önce kullanılan yol burada da kullanılıyor: **ölçeğin
kendisi** yeniden tanımlanıyor, var olan sınıflar bileşene dokunmadan yeni
değere kayıyor.

| Ölçek | Değerler |
|---|---|
| Yazı (`fontSize`) | `2xs` 11 (yalnız çip ve etiket) · `xs` 12.5 (üst bilgi) · `sm` **14** (gövde) · `base` 15 · `lg` 17 · `xl` 20 · `2xl` 24 |
| Satır aralığı | gövde 1.5, başlık 1.3 |
| Kontrol yüksekliği | `sm` 32px · `md` **40px** (varsayılan); liste satırı 40px |
| Köşe (`borderRadius`) | `sm` 6 · `DEFAULT`/`md` 8 (kontroller) · `lg` 10 · `xl` **12** (kart, pencere) · `2xl` 16 · `full` değişmez |
| Gölge | `--elev-1` (açılır menü), `--elev-2` (pencere), `--elev-3` (bildirim); koyu ve açık için ayrı. Koyu temada derinliği asıl kenarlık + bir basamak açık yüzey veriyor, gölge yardımcı. |
| Katman (`zIndex`) | `dropdown` 40 · `modal` 50 · `confirm` 60 · `critical` 70 · `toast` 80 |

Bildirim kutusu `z-toast`a taşınıyor; artık açık pencerelerin üstünde.

Elle yazılmış `text-[Npx]` kullanımları (207) **bu alt projede toplu
taşınmıyor**; yalnızca düğme boyları ve ortak `Modal`'a taşınan beş pencere
ölçeğe geçiyor (207 → 191). Geri kalanı 2. alt projede ekran ekran
temizlenecek. O zamana kadar sayının artmaması için bir "cırcır" testi var (§8).

Sohbet okuma boyutu ayarı (`--chat-font-size`: 14 / 15 / 17) aynen kalıyor.

## 6. Ortak parçalar

Hepsi `src/ui/` altında. Yeni bir paket eklenmiyor: uygulama internet erişimi
kısıtlı kurumsal makinelerde çalışıyor ve gereken odak tutma mantığı küçük.

### 6.1 `Modal`

```tsx
<Modal
  open={boolean}
  onClose={() => void}          // kullanıcının kapatma isteği
  title={string}                // aria-labelledby buna bağlanır
  dirty?={boolean}              // true iken kapatma "Değişiklikleri at?" sorar
  layer?={"modal" | "confirm" | "critical"}   // varsayılan "modal"
  width?={number}               // px, varsayılan 480
>
```

- `role="dialog"`, `aria-modal="true"`, başlık `aria-labelledby` ile bağlı.
- **Odak tutma:** açılınca ilk odaklanabilir öğeye (ya da `autoFocus` olan
  öğeye) gider; Tab sondan başa, Shift+Tab baştan sona sarar; kapanınca odak
  pencereyi açan öğeye geri döner.
- **Pencere yığını:** Escape belge düzeyinde dinleniyor ve **yalnızca en
  üstteki** pencere tepki veriyor. Böylece (a) odak dışarıdayken Escape'in hiç
  çalışmaması, (b) üstteki onaydaki Escape'in arkadaki pencereye kabarıp onu
  yeniden tetiklemesi sorunları birlikte çözülüyor.
- **`dirty`:** Escape, X ve İptal aynı kapıdan geçiyor; `dirty` doğruysa
  `settingsModal.discard*` metinleriyle onay soruluyor. 0. alt projede dört
  kez elle yazılan kalıbın yerini alıyor. Başarılı kayıttan sonra çağıran
  `onClose`'u doğrudan çağırır; bu yol onaydan geçmez.
- Arka plan tıklaması **kapatmıyor** (bugünkü davranış; yanlışlıkla veri
  kaybına yol açmasın).

### 6.2 `Button`

`variant`: `primary | neutral | ghost | danger` × `size`: `sm` (32px) | `md`
(40px). Altında `src/ui/buttons.ts`'teki `btn()` kullanılıyor; bugünkü
`DIALOG_CONFIRM_BUTTON` gibi sabitler çalışmaya devam ediyor.

### 6.3 `Field`, `Input`, `Textarea`, `Select`, `Toggle`

`Field` etiketi, ipucunu ve hata metnini tek düzende gösteriyor; içindeki
girdiye `id`, `aria-describedby` ve hata varsa `aria-invalid` otomatik
bağlanıyor. `Toggle` `role="switch"` ve `aria-checked` taşıyor.

### 6.4 `Card`, `Tabs`, `EmptyState`

- `Card`: dolgulu yüzey (`card`), 12px köşe, ince kenarlık.
- `Tabs`: `tablist` / `tab` / `tabpanel` rolleri; sol/sağ ok, Home, End.
- `EmptyState`: simge + başlık + açıklama + isteğe bağlı eylem düğmesi.

### 6.5 Bu alt projede taşınanlar

Yalnızca ortak parçanın gerçekten çalıştığını kanıtlayan beş pencere:
`ConfirmDialog`, `SettingsModal`, `ChatInstructionsDialog`, `ChatProjectDialog`,
`AddSystemModal`. Diğer 10 pencere ve tüm ekranlar 2. alt projede.

## 7. Görünüm ayarı ve bağlantılar

- **Ayar:** `AppConfig`'e `palette: "indigo" | "warm"` ekleniyor; varsayılan
  `"indigo"` (`app-electron/main/store.ts` varsayılanları). Eski ayar
  dosyalarında alan yoksa varsayılan geliyor; ayrı dönüştürme adımı yok.
  `theme: "dark" | "light"` aynen kalıyor.
- **Ayarlar → Görünüm:** yeni bölüm. Renk örnekli iki palet kartı, Koyu/Açık
  seçimi ve buraya taşınan sohbet yazı boyutu. Soldaki güneş/ay düğmesi hızlı
  koyu/açık geçişi olarak kalıyor.
- **Uygulama:** `src/App.tsx` `data-theme`'in yanına `data-palette`'i yazıyor;
  bugünkü 260ms'lik yumuşak renk geçişi palet değişiminde de çalışıyor.
- **Renklerin tek kaynağı:** `app-electron/shared/themeSurfaces.ts`

  ```ts
  export type AppPalette = "indigo" | "warm";
  export interface ThemeSurface {
    app: string;                       // pencere arka planı, "#rrggbb"
    card: string;                      // kart yüzeyi (Ayarlar'daki renk örneği)
    accent: string;                    // vurgu 500 (Ayarlar'daki renk örneği)
    terminal: { background: string; foreground: string; cursor: string };
  }
  export const THEME_SURFACES: Record<AppPalette, Record<AppTheme, ThemeSurface>>;
  ```

  - `card` ve `accent` Ayarlar → Görünüm'deki palet kartlarının renk örnekleri
    için: seçili olmayan paletin CSS değişkenleri o an sayfada tanımlı değil.
    Test dördünü de CSS'teki `--surface-app-rgb`, `--surface-card-rgb`,
    `--accent-500-rgb` ile eşliyor.
  - Ana süreç pencereyi açarken ayardaki palet ve temaya göre `backgroundColor`
    alıyor → açılıştaki koyu kare gidiyor.
  - Terminal aynı tablodan okuyor ve palet değişince `term.options.theme`'i
    güncelliyor.
  - **Terminal açık temada da koyu kalıyor**, ama paleti izliyor: standart
    ANSI sarı ve yeşil beyaz zeminde okunmuyor. Yani `light` satırındaki
    `terminal` değerleri o paletin koyu değerleriyle aynı.
- **Kapsam dışı** (sonra birer blokla eklenebilir): işletim sisteminin temasını
  izleme, kullanıcı tanımlı renk, üçüncü palet.

## 8. Testler

| Test | Ne denetliyor |
|---|---|
| Kontrast | `src/index.css`'i okuyup dört bloğu çözüyor; `ink-100/200/300`, `accent-400`, durum ve ortam renklerini `app`/`card`/`control`ın en zayıfına karşı ≥ 4.5:1; `accent-on` / `accent-500` ve beyaz / `status-danger-solid` ≥ 4.5:1; `ink-500` ≥ 3:1 |
| Eksiksizlik | Dört blok aynı jeton kümesini tanımlıyor; birinde eksik jeton yok |
| Sıralama | §4.2'deki yüzey/kenarlık sıralaması dört blokta |
| Limon kalmadı | Eski limon değerleri (`183 243 74`, `169 225 63`, `155 209 48`, `#a9e13f`, `#b7f34a`) `src/` ve `app-electron/` altında hiçbir dosyada yok (testin kendisi hariç) |
| Tek kaynak | `THEME_SURFACES` değerleri CSS'teki `--surface-app-rgb` ile eşleşiyor |
| Cırcır | Elle yazılmış `text-[Npx]` sayısı ölçülen değeri geçmiyor: başlangıçta 205, alt proje sonunda 191; yalnızca aşağı çekilir |
| `Modal` | Odak tutma (Tab sarması), Escape yalnız en üstteki, kapanınca odağın dönmesi, `dirty` onayı, `role`/`aria-*` |
| `Field` | Hata metni `aria-describedby` ve `aria-invalid` ile bağlı |
| `Tabs` | Ok tuşlarıyla gezinme, rolleri |
| Ayar | `palette` yoksa `"indigo"` geliyor; seçim `data-palette`'e yazılıyor |
| Gerileme | `tests/dialogDataLoss.test.tsx` (10 test) taşımadan sonra da yeşil |

Bitmiş sayılma: tüm test takımı yeşil, `npm run typecheck` temiz, dört görünüm
çalışan uygulamada gözle kontrol edildi.

## 9. Riskler

- **Ölçek değişimi her ekranı etkiler.** `text-sm` 14px'e, `rounded-xl` 12px'e
  kayınca sığdırılmış alanlar taşabilir. Önlem: plan, her ölçek değişikliğinden
  sonra ana ekranları (sohbet, SAP başlatıcı, GUI Scripting, Hazırlık, Ayarlar) 980px ve geniş pencerede açıp bakmayı
  adım olarak içeriyor. Taşmalar 2. alt projeye bırakılmıyor; o anda
  düzeltiliyor ya da not ediliyor.
- **`:root` ile İndigo koyu bloğunun birleşmesi** yanlışlıkla ayrışırsa ilk
  karede yanlış renk görünür. Test "eksiksizlik" bunu yakalıyor.
- **Açık tema daha önce az kullanıldı;** gözden kaçan sabit renkler açık
  temada göze batabilir. `.tsx` içindeki hex'ler tek tek ölçüldü: gerçek
  renk olanlar `EmbeddedTerminal`'in üç değeri (artık `THEME_SURFACES`'ten
  geliyor). `AxetCodeHome`, `PreflightPanel` ve `SystemPanel`'dekiler yalnızca
  yorum. `FileViewer`'daki beyaz DOCX sayfası **bilerek sabit kalıyor**:
  önizleme her iki temada da kâğıt sayfası gibi görünmeli, gerekçesi
  dosyadaki yorumda.
