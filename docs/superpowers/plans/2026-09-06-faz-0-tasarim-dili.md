# Faz 0 — Tasarım Dili Temeli · Uygulama Planı

> **Ajan çalışanlar için:** ZORUNLU ALT BECERİ: Bu planı görev görev uygulamak
> için `superpowers:subagent-driven-development` (önerilen) veya
> `superpowers:executing-plans` kullanın. Adımlar takip için onay kutusu
> (`- [ ]`) sözdizimi kullanıyor.

**Hedef:** Uygulamanın dağınık arayüz dilini (tipografi, düğme, girdi, modal,
bölüm etiketi, panel, "seçili" hâli, z katmanı, ritim) tek bir kaynağa
indirgemek.

**Mimari:** Renk katmanı zaten bitmiş durumda (rol adlı yüzeyler, üç kademeli
kenarlık, iki katmanlı lime). Bu plan onun üstüne **dil** katmanını koyuyor:
önce ölçeğin kendisi Tailwind yapılandırmasında kapatılıyor, sonra `src/ui/`
altında beş ilkel bileşen doğuyor ve mevcut ekranlar bunlara göç ediyor.
Yaklaşım "yeni bileşen ekle" değil, **var olanı tek dile indirge** — açılış
ekranına hiçbir yeni büyük bileşen girmiyor.

**Teknoloji:** Electron 33.4.11 · React 18 · TypeScript (strict) ·
Tailwind 3.4.19 · electron-vite

**Spec:** `docs/superpowers/specs/2026-09-06-tasarim-sistemi-design.md`

---

## Bu depoda "test" ne demek

**Bu depoda test koşucusu YOK** — `package.json`'da test betiği, `vitest`/`jest`
yapılandırması ve tek bir test dosyası bulunmuyor. Spec bunu açıkça kabul ediyor
ve kapıları şöyle tanımlıyor:

```
npm run typecheck   # tsc --noEmit -p tsconfig.web.json && tsc --noEmit -p tsconfig.node.json
npm run build
```

Bu yüzden her görevin kırmızı-yeşil döngüsü şu biçimi alıyor ve **atlanmıyor**:

1. **Doğrulama komutunu yaz ve ÇALIŞTIR** — beklenen çıktı: BAŞARISIZ (bugünkü
   bozuk durumu gösterir).
2. **Uygula.**
3. **Doğrulamayı + `npm run typecheck` + `npm run build` çalıştır** — beklenen:
   HEPSİ GEÇER.
4. **Gözle bak** (görevde belirtilen ekranlar, koyu VE açık tema).
5. **İşle.**

Adım 1'i "zaten belli, geçecek" diye atlamak bu plandaki en olası hata. Komutu
önce çalıştırmak, doğrulamanın gerçekten bir şey ölçtüğünü kanıtlar — yanlış
yazılmış bir grep her zaman "0 eşleşme" der ve uygulamadan sonra da "0" demeye
devam eder.

## Küresel kısıtlar

Her görevin gereksinimlerine örtük olarak dahildir. Değerler spec'ten birebir:

- **`--*-rgb` değişkenlerine `#hex` YAZILMAZ** — boşlukla ayrılmış RGB üçlüsü.
- **Koyu ve açık tema blokları her değişkeni aynalar** (`:root, html[data-theme="dark"]`
  ve `html[data-theme="light"]`).
- **Yüzey sıralaması:** `hover` ve `control`, `border-subtle`'dan KOYU kalır;
  `active` (#2a2f3b), `border-line`'dan (#333a48) koyu. Açık temada ters.
- **`text-accent-500` KULLANILMAZ** — açık temayı bozar. Metin/ikon `accent-400`.
- **`bg-base-*` YAZILMAZ.** Ham `--base-*-rgb` rampası yalnız
  `src/flows/flows.css` (157 başvuru) için takma ad katmanıdır.
- **Gradyan / parlama / dekoratif efekt yok** (`src/index.css` başındaki kural).
- **Depo Prettier biçimli DEĞİL.** `prettier --write` çalıştırılmaz — ~110
  sütunluk ev düzenini 80'e indirir. `.prettierrc` yok, `package.json`'da
  `prettier` anahtarı yok.
- **i18n ikizliği:** `tr.ts`'e eklenen her anahtar `en.ts`'e de eklenir.
  `TranslationKey` `tr.ts`'ten türetiliyor, `en.ts` ise
  `Record<TranslationKey, string>` — tek dosyaya eklenen anahtar typecheck'i kırar.
- **Tailwind kaynak METNİNİ tarar.** Çalışma anında birleştirilen sınıf dizeleri
  (`` `z-[${n}]` ``, `` `bg-${c}-500` ``) hiç yayılmaz. Bu yüzden dinamik
  değerler satır içi `style` ile verilir, sınıfla değil.
- **`core.autocrlf = true`.** `sed -i` dosyayı LF'e çevirir, git `add`'de
  normalize eder. "LF will be replaced by CRLF" uyarısı ZARARSIZ, düzeltilmez.
- **Git Bash'te `/tmp` Node'dan kullanılamaz**, `python` PATH'te yok. Geçici
  dosya gerekirse depo içinde aç ve sil.
- **Bash çalışma dizini çağrılar arası KORUNUR.** Şüphede
  `cd /c/workspace/aXet-SAP-Launcher` ile başla.
- **Küçültülmüş CSS tek satırdır.** `dist/assets/*.css` içinde arama yaparken
  `grep -oF` (sabit dize) kullan; `\:` kaçışları yüzünden normal grep yanlış
  negatif verir.
- **İşleme (commit) üslubu:** Türkçe ama diakritiksiz ASCII, özet satırı +
  maddeli gövde, sonunda
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
  Heredoc'lu `git commit -F -` bu kabukta çalışıyor.
- **PUSH YAPILMAZ.** Kullanıcı açıkça söyleyene kadar yasak. `main` üstünde
  çalışılıyor.
- **Korunan kullanıcı kararları** (hiçbiri bu planla değişmez):
  - ActivityBar alt grup ikonları durgun hâlde RENKLİ kalır; üst/alt ayrımı
    opaklıkla (%75→%100).
  - `StatusDot` **sağlık**tır (`--status-success-text`), accent'e çevrilmez.
    Satır vurgusu **etkinlik**tir ve lime kullanır.
  - Sohbet bestecisinin tek satırlık "Gemini düzeni" dokunulmaz.
  - Kenar çubuğu 272px kalır.

---

## Dosya yapısı

**Yeni:**

| Dosya | Sorumluluk |
|---|---|
| `src/ui/layers.ts` | Adlandırılmış z-index kaydı ve `layerStyle()` yardımcısı |
| `src/ui/SectionLabel.tsx` | Büyük harfli bölüm etiketi + isteğe bağlı sağ eylem |
| `src/ui/Panel.tsx` | Kenarlıklı yüzey (`flat`/`interactive`/`inset`) |
| `src/ui/Button.tsx` | Tek düğme bileşeni; `buttons.ts`'i sarmalar |
| `src/ui/Field.tsx` | Tek odak muamelesi (`fieldClass`) + etiket/ipucu/hata sarmalayıcısı |
| `src/ui/Modal.tsx` | Tek modal kabuğu: zemin, odak tuzağı, Esc, kaydırma kilidi |

**Değişen:**

| Dosya | Ne |
|---|---|
| `tailwind.config.js` | Kapalı `fontSize` ölçeği (theme kökünde), `project` rengi |
| `src/ui/buttons.ts` | `xs` boyu, `project` tonu, keyfi px → ölçek sınıfı |
| `src/components/**`, `src/App.tsx`, `src/lib/markdownLite.tsx` | Göç |

`src/ui/` bilerek düz duruyor — alt klasör açmıyoruz. Bugün orada iki dosya var
(`buttons.ts`, `fileIcons.ts`); altı dosya daha eklendiğinde sekiz dosyalık düz
bir klasör hâlâ tek bakışta okunuyor.

---

## Görev 1: Tipografi ölçeğini kapat

**Dosyalar:**
- Değiştir: `tailwind.config.js` (`theme` kökü)
- Değiştir: `src/ui/buttons.ts:54-56`, `src/ui/buttons.ts:174-175`
- Değiştir: `src/components/FileViewer.tsx:175`
- Değiştir: `src/components/SystemPanel.tsx:290-291`, `:379`
- Değiştir: `src/lib/markdownLite.tsx:232-239`
- Değiştir: `src/components/ErrorBoundary.tsx:42`
- Değiştir: 4 modal başlığı — `ChatInstructionsDialog.tsx:102`,
  `ChatProjectDialog.tsx:66`, `ConfirmDialog.tsx:43`, `UpdatePromptModal.tsx:36`
- Değiştir: 9 düzyazı `<p>` — aşağıda tek tek listeli
- Değiştir: 34 dosyada 192 keyfi `text-[Npx]` (sed ile)

**Arayüzler:**
- Tüketir: yok (ilk görev)
- Üretir: `text-2xs`(10) · `text-xs`(11) · `text-sm`(12) · `text-base`(13) ·
  `text-lg`(15) · `text-xl`(19). **Bu altısı dışında font boyutu sınıfı YOK** —
  `text-2xl` ve üstü artık CSS üretmez.

### Bu görev neden tek işleme (commit) olmak ZORUNDA

Ölçek çevirme ile sed göçü ayrılamaz. Bugünkü ölçekte `text-[11px]` → `text-xs`
dönüşümü 11px'i **12px yapar**; yeni ölçekte aynı dönüşüm 11px'i 11px bırakır.
İkisi ayrı işlemelerde olursa aradaki commit'te 96 yer bir piksel büyük çıkar ve
"göç bitti" sanılan bir ara durum ortaya çıkar. Birlikte gidecekler.

### Değişimin gerçek görsel etkisi (ölçüldü)

Keyfi px'ler ölçeğe **birebir** oturuyor, yani 192 yerin 191'i piksel olarak
DEĞİŞMİYOR:

| Bugün | Sayı | Yeni sınıf | Yeni px | Fark |
|---|---|---|---|---|
| `text-[10px]` | 55 | `text-2xs` | 10 | — |
| `text-[11px]` | 96 | `text-xs` | 11 | — |
| `text-[12px]` | 29 | `text-sm` | 12 | — |
| `text-[13px]` | 12 | `text-base` | 13 | — |

Gerçekten küçülen tek şey, **bugün Tailwind sınıfı kullanan** yerler:

| Sınıf | Sayı | Bugün | Yarın |
|---|---|---|---|
| `text-xs` | 119 | 12px | **11px** |
| `text-sm` | 55 | 14px | **12px** |
| `text-base` | 5 | 16px | **13px** |
| `text-lg` | 7 | 18px | **15px** |

`text-base` ve `text-lg`'nin 12 kullanımının tamamı **başlık** ya da **avatar**,
yani düzyazı değil — bu yüzden hepsi aşağıda tek tek doğru basamağa taşınıyor,
küçülmeye bırakılmıyor.

- [ ] **Adım 1: Doğrulamayı yaz ve çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
# Keyfi punto kalmamalı. Kasıtlı iki istisna haric tutuluyor:
#   - FileViewer: belge onizlemesi, uygulama olceginin disinda (bkz. Adim 3)
#   - --chat-hero-size: kullanici ayarlanabilir selamlama
grep -rnE 'text-\[[0-9]+px\]' src/ --include=*.tsx --include=*.ts \
  | grep -v 'src/components/FileViewer.tsx' | wc -l
```

Beklenen çıktı **bu aşamada: `192`** (yani BAŞARISIZ — hedef 0).

- [ ] **Adım 2: Ölçeği `tailwind.config.js`'te kapat**

`extend` DEĞİL, `theme` kökü. `extend` birleştirme yapar ve `text-2xl`…`text-9xl`
hayatta kalır; ölçeğin kapalı olması bu planın sonraki her adımının dayanağı.

`export default {` satırından sonra, `theme: {` içinde `extend`'in ÜSTÜNE:

```js
    // TİPOGRAFİ ÖLÇEĞİ — `extend` DEĞİL, kök (2026-09-06).
    //
    // `extend` altında olsaydı Tailwind'in kendi 2xl…9xl basamakları hayatta
    // kalırdı ve ölçek "kapalı" olmazdı: bir sonraki geliştirici `text-3xl`
    // yazabilir, CSS üretilir, kimse fark etmez. Kökte tanımlamak bu altı
    // basamağın DIŞINI derleme hatası değil ama BOŞ sınıf yapıyor — yani
    // `text-2xl` yazan yer gözle hemen görülüyor.
    //
    // Bu, `borderRadius` için 2026-09-06'da kanıtlanmış tekniğin aynısı:
    // bileşenlere tek tek dokunmak yerine ölçeğin kendisini daraltmak.
    //
    // Satır yüksekliği de burada: `text-[11px]` gibi keyfi puntoların satır
    // yüksekliği yoktu, ebeveynden miras alıyorlardı — aynı 11px yazı iki
    // farklı kapta iki farklı satır aralığıyla çiziliyordu. Artık punto ile
    // aralık birlikte geliyor.
    fontSize: {
      "2xs": ["10px", { lineHeight: "14px" }],
      xs: ["11px", { lineHeight: "16px" }],
      sm: ["12px", { lineHeight: "17px" }],
      base: ["13px", { lineHeight: "20px" }],
      lg: ["15px", { lineHeight: "22px" }],
      xl: ["19px", { lineHeight: "26px" }]
    },
```

- [ ] **Adım 3: Ölçek DIŞINDA kalması gereken tek yeri sabitle**

`src/components/FileViewer.tsx:175` bir **belge önizlemesi** — beyaz kâğıt
görünümlü (`text-[#1a1a1a]`), kullanıcının açtığı .docx/.md dosyasının içeriğini
çiziyor. Uygulama mobilyası değil, dolayısıyla uygulama ölçeğine bağlanmamalı.
`[&_h1]:text-2xl` yeni ölçekte hiç CSS üretmeyeceği için açık punto veriliyor:

```
[&_h1]:text-2xl   →   [&_h1]:text-[24px]
[&_h2]:text-xl    →   [&_h2]:text-[19px]
```

Aynı satıra gerekçeyi yazan bir yorum ekle (bu dosyada `{/* */}` değil, JSX
niteliği içinde olduğu için satırın ÜSTÜNE):

```tsx
      {/* Bu blok BELGE içeriği, uygulama mobilyası değil: puntolar bilerek
          keyfi ve `tailwind.config.js`'teki kapalı ölçeğe bağlı DEĞİL. Ölçek
          daralırsa kullanıcının açtığı .docx/.md önizlemesi onunla birlikte
          küçülmemeli. Doğrulama grep'i bu dosyayı bu yüzden hariç tutuyor. */}
```

- [ ] **Adım 4: Keyfi puntoları sed ile ölçeğe taşı**

```bash
cd /c/workspace/aXet-SAP-Launcher
FILES=$(grep -rlE 'text-\[1[0-3]px\]' src/ --include=*.tsx --include=*.ts \
        | grep -v 'FileViewer.tsx')
for f in $FILES; do
  sed -i \
    -e 's/text-\[10px\]/text-2xs/g' \
    -e 's/text-\[11px\]/text-xs/g' \
    -e 's/text-\[12px\]/text-sm/g' \
    -e 's/text-\[13px\]/text-base/g' "$f"
done
grep -rnE 'text-\[[0-9]+px\]' src/ --include=*.tsx --include=*.ts | grep -v FileViewer
```

Son grep yalnızca `src/components/SystemPanel.tsx:379`'daki `xl:text-[28px]`'i
göstermeli — o Adım 6'da kalkıyor.

- [ ] **Adım 5: `buttons.ts`'i ölçeğe bağla**

`SIZE` ve `PANEL_TITLE` sed'den geçti; sonucu kontrol et ve `xs` kademesini
HENÜZ EKLEME (Görev 5'in işi). Beklenen hâl:

```ts
const SIZE: Record<BtnSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  md: "h-8 gap-1.5 px-3 text-sm",
  lg: "h-9 gap-2 px-4 text-base",
};
```

`PANEL_TITLE` içindeki `tracking-[0.08em]`'i `tracking-wider` yap — Görev 3'teki
`SectionLabel` ile aynı harf aralığını kullanması gerekiyor, yoksa iki bölüm
etiketi yan yana geldiğinde farklı okunuyor:

```ts
export const PANEL_TITLE =
  "text-2xs font-semibold uppercase tracking-wider text-slate-500";
```

- [ ] **Adım 6: Başlık ve avatar rollerini doğru basamağa taşı**

Bunlar düzyazı değil; küçülmeye bırakılmıyor.

```
src/components/ChatInstructionsDialog.tsx:102  text-base → text-lg   (modal başlığı)
src/components/ChatProjectDialog.tsx:66        text-base → text-lg   (modal başlığı)
src/components/ConfirmDialog.tsx:43            text-base → text-lg   (modal başlığı)
src/components/UpdatePromptModal.tsx:36        text-base → text-lg   (modal başlığı)
src/components/ErrorBoundary.tsx:42            text-lg   → text-xl   (ekran başlığı)
src/components/SystemPanel.tsx:290             text-lg   → text-xl   (56px avatar baş harfleri)
src/components/SystemPanel.tsx:291             text-lg   → text-xl   (aynı avatarın ikinci hâli)
```

`src/components/SystemPanel.tsx:379` — ekran başlığı. Duyarlı ikinci punto
kalkıyor, çünkü kapalı ölçekte "geniş ekranda bir tık büyüsün" diye ikinci bir
basamak tutmak ölçeği yeniden açmak demek:

```tsx
<h2 className="truncate text-2xl font-bold tracking-tight text-white xl:text-[28px]">
```
→
```tsx
<h2 className="truncate text-xl font-bold tracking-tight text-white">
```

- [ ] **Adım 7: `markdownLite` başlıklarını gövdenin ÜSTÜNDE tut**

`src/lib/markdownLite.tsx:232-239`. Sohbet gövdesi artık 13px (`text-base`).
Dokunulmazsa h1 gövdeyle aynı, h2/h3 gövdeden KÜÇÜK olur — yani başlık, başlık
olmaktan çıkar. Yorum da güncelleniyor, çünkü içindeki "14px" artık yanlış:

```tsx
      // Sohbet gövdesi 13px (`text-base`); başlıklar ondan çok fazla
      // ayrışmamalı (bir cevabın içindeki `#`, sayfa başlığı değil bölüm
      // ayıracı). h1 bir basamak üstte, h2/h3 gövdeyle aynı puntoda ama
      // yarı kalın — ölçek daraldığı için aradaki fark artık kalınlık.
      const cls =
        level === 1
          ? "mt-1 text-lg font-semibold text-slate-100"
          : level === 2
            ? "mt-1 text-base font-semibold text-slate-100"
            : "mt-1 text-base font-semibold text-slate-300";
```

- [ ] **Adım 8: Düzyazıyı `text-base`'e kaldır**

Etiketler ve satırlar bilerek sıkışıyor; **cümleler** sıkışmamalı. 14px→12px
düşen dokuz düzyazı yeri, tam listesi:

```
src/components/ChatInstructionsDialog.tsx:104   text-sm → text-base
src/components/ConfirmDialog.tsx:45             text-sm → text-base
src/components/FileViewer.tsx:138               text-sm → text-base
src/components/SystemPanel.tsx:278              text-sm → text-base
src/components/UpdatePromptModal.tsx:41         text-sm → text-base
src/components/UpdatePromptModal.tsx:65         text-sm → text-base
src/components/UpdatePromptModal.tsx:79         text-sm → text-base
src/components/UpdatePromptModal.tsx:87         text-sm → text-base
src/components/UpdatePromptModal.tsx:103        text-sm → text-base
```

Kural, sonraki geliştirici için: **`<p>` içindeki bir CÜMLE `text-base`'dir;
etiket, satır, rozet, düğme `text-sm` ve altıdır.**

- [ ] **Adım 9: Doğrulamayı ve kapıları çalıştır — HEPSİ GEÇMELİ**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rnE 'text-\[[0-9]+px\]' src/ --include=*.tsx --include=*.ts \
  | grep -v 'src/components/FileViewer.tsx' | wc -l          # bekleniyor: 0
grep -rnE 'text-(2xl|3xl|4xl|5xl|6xl)' src/ --include=*.tsx --include=*.ts \
  | grep -v 'src/components/FileViewer.tsx' | wc -l          # bekleniyor: 0
npm run typecheck
npm run build
```

- [ ] **Adım 10: Gözle bak**

`npm run dev` çalıştır. Koyu VE açık temada kontrol et:
açılış ekranı · sohbet (bir mesaj gönder, markdown başlıklı bir cevap) ·
SAP sistem paneli (avatar baş harfleri + ekran başlığı) · Ayarlar modalı ·
bir onay diyalogu.

Aranan: **hiçbir yerde okunamayacak kadar küçük metin yok** ve başlıklar
gövdeden ayrışıyor. Bir yer fazla küçük geldiyse Adım 8'in kuralını uygula
(cümle mi, etiket mi?) ve listeye ekle.

- [ ] **Adım 11: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
Tipografi olcegi kapatildi

- tailwind.config.js: fontSize theme KOKUNDE tanimlandi (extend degil),
  boylece olcek kapali: 2xs/xs/sm/base/lg/xl disinda punto sinifi yok
- Satir yuksekligi puntoyla birlikte geliyor; keyfi px'lerin ebeveynden
  miras aldigi degisken satir araligi bitti
- 34 dosyada 192 keyfi text-[Npx] olcege tasindi (piksel degeri aynen
  korundu; gercekten kuculen sey yalnizca Tailwind sinifi kullanan yerler)
- Baslik/avatar rolleri dogru basamaga tasindi, kuculmeye birakilmadi
- markdownLite basliklari govdenin ustunde tutuldu
- Dokuz duzyazi <p> text-base'e kaldirildi
- FileViewer belge onizlemesi BILEREK olcek disinda: acilan .docx/.md
  icerigi uygulama mobilyasiyla birlikte kucumemeli

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 2: z katmanı kaydı

**Dosyalar:**
- Oluştur: `src/ui/layers.ts`
- Değiştir: `src/components/AddSystemModal.tsx:132`,
  `AppConnectionsModal.tsx:36`, `AttachmentLightbox.tsx:46`,
  `AxetCodeHome.tsx:3350`, `ChatInstructionsDialog.tsx:94`,
  `ChatProjectDialog.tsx:58`, `ConfirmDialog.tsx:35`, `CredentialsModal.tsx:70`,
  `SettingsModal.tsx:329`, `UpdatePromptModal.tsx:30`,
  `sapgui/GuidePanel.tsx:29`

**Arayüzler:**
- Tüketir: yok
- Üretir: `LAYER` (`{dropdown:30, sticky:40, overlay:50, modal:60, toast:70,
  tooltip:80}`), `LayerName` tipi, `layerStyle(name: LayerName): {zIndex: number}`

Bugün z değerleri modal başına elle seçilmiş: `z-50` beş yerde, `z-[60]` dört
yerde, `z-[70]` bir yerde, `z-30` bir yerde. Hangi modalin hangisinin üstüne
çıkacağı tesadüf — `ConfirmDialog` (60) `SettingsModal`'ın (50) üstünde çıkıyor,
ki bu doğru; ama `AttachmentLightbox` da 60 ve o da `ConfirmDialog` ile aynı
katmanda, yani ikisi aynı anda açıksa sıralama DOM sırasına düşüyor.

- [ ] **Adım 1: Doğrulamayı çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rnoE 'z-\[?[0-9]+\]?' src/ --include=*.tsx | wc -l
```

Beklenen çıktı bu aşamada: **11'den büyük bir sayı** (elle yazılmış z değerleri
var). Hedef: 0.

- [ ] **Adım 2: `src/ui/layers.ts`'i oluştur**

```ts
// Uygulamanın TEK z-index kaydı.
//
// Bugüne kadar her modal kendi değerini seçiyordu: z-50 beş yerde, z-[60] dört
// yerde, z-[70] bir yerde. İki modal aynı anda açıldığında hangisinin üstte
// kalacağı DOM sırasına düşüyordu, yani tesadüftü. Katmanları isimlendirmek
// bunu bir KARAR hâline getiriyor.
//
// Aralar 10'ar: iki mevcut katmanın arasına bir şey sokmak gerekirse ölçeği
// yeniden numaralamadan yapılabilsin.
export const LAYER = {
  /** Açılır menü, otomatik tamamlama, seçici — akış içinde açılanlar. */
  dropdown: 30,
  /** Kaydırırken yerinde kalan başlık şeritleri. */
  sticky: 40,
  /** Panelin ÜSTÜNÜ kaplayan ama pencereyi kaplamayan örtü (çekmece). */
  overlay: 50,
  /** Pencereyi kaplayan modal ve onun zemini. */
  modal: 60,
  /** Bildirim/uyarı şeridi — modalin de üstünde görünmeli. */
  toast: 70,
  /** İpucu balonu — her şeyin üstünde, hiçbir şeyi engellemez. */
  tooltip: 80,
} as const;

export type LayerName = keyof typeof LAYER;

/**
 * Katmanı SATIR İÇİ STİL olarak verir, Tailwind sınıfı olarak değil.
 *
 * Sebep: Tailwind sınıf adlarını kaynak METNİNDEN tarıyor. `` `z-[${LAYER.modal}]` ``
 * gibi çalışma anında kurulan bir dize taramaya hiç görünmez, o CSS üretilmez
 * ve öğe z-index'siz kalır — sessizce, çünkü sınıf adı DOM'da doğru görünür.
 * Aynı tuzak `tintBtn`'de de var (bkz. `src/ui/buttons.ts`).
 */
export function layerStyle(name: LayerName): { zIndex: number } {
  return { zIndex: LAYER[name] };
}
```

- [ ] **Adım 3: On bir kullanım yerini kayda bağla**

Her birinde `z-50` / `z-[60]` / `z-[70]` / `z-30` sınıfını **sil** ve öğeye
`style={layerStyle("...")}` ekle. Eşleme:

| Dosya:satır | Bugün | Katman |
|---|---|---|
| `AddSystemModal.tsx:132` | `z-50` | `modal` |
| `AppConnectionsModal.tsx:36` | `z-50` | `modal` |
| `AxetCodeHome.tsx:3350` | `z-50` | `modal` |
| `CredentialsModal.tsx:70` | `z-50` | `modal` |
| `SettingsModal.tsx:329` | `z-50` | `modal` |
| `ChatInstructionsDialog.tsx:94` | `z-[60]` | `modal` |
| `ChatProjectDialog.tsx:58` | `z-[60]` | `modal` |
| `ConfirmDialog.tsx:35` | `z-[60]` | `modal` |
| `AttachmentLightbox.tsx:46` | `z-[60]` | `modal` |
| `UpdatePromptModal.tsx:30` | `z-[70]` | `toast` |
| `sapgui/GuidePanel.tsx:29` | `z-30` | `overlay` |

Dikkat: bunların hepsi **aynı** `modal` katmanına çıkıyor. Bugünkü 50/60 ayrımı
bir hiyerarşi değildi — `ConfirmDialog`'un `SettingsModal` üstünde çıkması
DOM sırasından da geliyor (React portal yok, sonradan monte edilen sonra çizilir).
Tek katman doğru cevap: aynı anda iki modal açmak zaten bir tasarım hatası ve
bunu z-index'le gizlemek yerine görünür bırakıyoruz.

`UpdatePromptModal` bilerek `toast`: bir güncelleme duyurusu, kullanıcının o an
yaptığı işin üstünde belirmesi gereken tek şey.

`GuidePanel` bilerek `overlay`: `fixed` değil `absolute`, yani pencereyi değil
kendi panelini kaplıyor — modal değil, çekmece.

Örnek (ConfirmDialog):

```tsx
    <div
      className="fixed inset-0 flex items-center justify-center bg-[var(--overlay-scrim)] "
      style={layerStyle("modal")}
```

İçe aktarma: `import { layerStyle } from "../ui/layers";`
(`sapgui/GuidePanel.tsx` için `"../../ui/layers"`.)

- [ ] **Adım 4: Doğrulamayı ve kapıları çalıştır — HEPSİ GEÇMELİ**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rnoE 'z-\[?[0-9]+\]?' src/ --include=*.tsx        # bekleniyor: cikti yok
npm run typecheck
npm run build
```

- [ ] **Adım 5: Gözle bak**

`npm run dev`. Sırayla aç ve **hepsinin görünür olduğunu** doğrula:
Ayarlar modalı · Ayarlar açıkken bir silme onayı (üstte çıkmalı) ·
bir eki büyüt (lightbox) · SAP GUI Scripting'te rehber çekmecesi.

- [ ] **Adım 6: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
z katmani kaydi: src/ui/layers.ts

- Alti adlandirilmis katman (dropdown/sticky/overlay/modal/toast/tooltip),
  aralar 10'ar
- 11 kullanim yeri kayda baglandi; elle yazilmis z-50/z-[60]/z-[70]/z-30 bitti
- Katman satir ici STIL olarak veriliyor: Tailwind kaynak metnini tariyor,
  calisma aninda kurulan `z-[${n}]` dizesi hic yayilmaz
- UpdatePromptModal toast katmaninda (kullanicinin isinin ustunde belirmeli),
  GuidePanel overlay katmaninda (absolute cekmece, modal degil)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 3: `SectionLabel`

**Dosyalar:**
- Oluştur: `src/ui/SectionLabel.tsx`
- Değiştir: Adım 1'in grep'i ne bulursa (bilinen adaylar aşağıda)

**Arayüzler:**
- Tüketir: Görev 1'in `text-2xs` basamağı
- Üretir: `<SectionLabel action={…}>…</SectionLabel>` — varsayılan dışa aktarım

Aynı anlamsal öğe (bir listenin üstündeki büyük harfli başlık) bugün en az altı
biçimde çiziliyor: 10px ve 11px karışık, `tracking-wide` ve `tracking-wider`
karışık, `text-slate-300`/`400`/`500` karışık. Tek biçim: **`text-2xs` ·
`font-semibold` · `uppercase` · `tracking-wider` · `text-slate-500`.**

- [ ] **Adım 1: Doğrulamayı çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rn 'uppercase' src/ --include=*.tsx | grep -c 'tracking'
```

Beklenen: **1'den büyük** (her biri elle kurulmuş bir bölüm etiketi). Hedef: 0
— tüm büyük harfli+aralıklı metin bileşene taşındıktan sonra sıfır olmalı.
Rozet içi büyük harf (`tracking` içermeyenler) bu sayıma girmiyor.

- [ ] **Adım 2: `src/ui/SectionLabel.tsx`'i oluştur**

```tsx
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /**
   * Etiketin sağına yaslanan eylem — "Tümünü gör →" gibi. Verildiğinde bileşen
   * tek satırlık bir şeride dönüşüyor; verilmediğinde düz bir etiket kalıyor.
   * İki ayrı bileşen yapmadık çünkü ikisi AYNI şey: bir bölümün başlığı.
   */
  action?: ReactNode;
  /** Yalnızca YERLEŞİM için (boşluk, genişlik). Punto/renk geçersiz kılınmaz. */
  className?: string;
}

/**
 * Bir bölümün büyük harfli başlığı — "SON ÇALIŞMALAR", "SİSTEMLER", "HIZLI
 * BAŞLANGIÇ".
 *
 * Bu öğe uygulamada altı farklı biçimde elde yazılmıştı: 10px/11px,
 * tracking-wide/wider, slate-300/400/500. Hiçbiri kasıtlı bir ayrım değildi —
 * aynı şeyin altı kere yeniden yazılmasıydı. Punto ve renk burada SABİT;
 * `className` yalnızca boşluk vermek için.
 */
export default function SectionLabel({ children, action, className = "" }: Props) {
  const label = "text-2xs font-semibold uppercase tracking-wider text-slate-500";

  if (action == null) {
    return <div className={`${label} ${className}`}>{children}</div>;
  }

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <span className={`min-w-0 truncate ${label}`}>{children}</span>
      {action}
    </div>
  );
}
```

- [ ] **Adım 3: Bilinen kullanım yerlerini göç ettir**

Adım 1'in grep'i tam listeyi verir. Kesin bilinen üçü:

`src/components/ChatSessionPane.tsx` — "Hızlı başlangıç" etiketi:

```tsx
<div className="mt-8 pb-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">
  {t("axetCodeHome.quickStart")}
</div>
```
→
```tsx
<SectionLabel className="mt-8 pb-2.5">{t("axetCodeHome.quickStart")}</SectionLabel>
```

`src/components/ChatSessionPane.tsx` — "Son çalışmalar" başlık şeridi. Bugün
elle kurulmuş `flex items-center justify-between pb-2.5` sarmalayıcısı ve içinde
bir `<span>` + koşullu düğme var. `action` yuvasına taşınıyor:

```tsx
<SectionLabel
  className="pb-2.5"
  action={
    recentWork.length > VISIBLE_RECENT_WORK ? (
      <button
        onClick={() => setWorkExpanded((v) => !v)}
        className="flex cursor-pointer items-center gap-1 text-xs text-slate-500 transition-colors hover:text-accent-400"
      >
        {workExpanded ? t("recentWork.showLess") : t("recentWork.viewAll")}
        <ChevronRight size={12} className={`transition-transform ${workExpanded ? "-rotate-90" : ""}`} />
      </button>
    ) : undefined
  }
>
  {t("recentWork.heading")}
</SectionLabel>
```

`src/ui/buttons.ts` — `PANEL_TITLE` sabiti. Bir sınıf dizesi olduğu için
bileşene çevrilemez ama Görev 1 Adım 5'te aynı değerlere getirildi. Üstüne
şu notu ekle:

```ts
/**
 * Panel başlığı etiketi. Düğme değil ama aynı şeritte yaşıyor, hizası buradan.
 *
 * `SectionLabel` bileşeniyle AYNI değerler — orası JSX, burası sınıf dizesi
 * isteyen yerler için (`sapgui/*` panelleri). İkisi ayrışırsa aynı ekranda iki
 * farklı bölüm etiketi çıkar; değiştirirken ikisini birlikte değiştir.
 */
```

- [ ] **Adım 4: Doğrulamayı ve kapıları çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rn 'uppercase' src/ --include=*.tsx | grep 'tracking'   # bekleniyor: cikti yok
npm run typecheck
npm run build
```

Grep hâlâ bir şey gösteriyorsa: `sapgui/*` panelleri `PANEL_TITLE` sabitini
kullanıyorsa sorun yok (o sınıf dizesi `buttons.ts`'te, `.tsx`'te değil).
`.tsx` içinde kalan her eşleşme göç etmemiş bir etikettir.

- [ ] **Adım 5: Gözle bak**

`npm run dev`. Açılış ekranı: "HIZLI BAŞLANGIÇ" ve "SON ÇALIŞMALAR" etiketleri
aynı puntoda, aynı harf aralığında, aynı tonda. "Tümünü gör" düğmesi hâlâ
çalışıyor ve satır sonunda duruyor. Kenar çubuğundaki "SİSTEMLER" de aynı.

- [ ] **Adım 6: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
SectionLabel ilkeli: alti bicim tek bicime indi

- src/ui/SectionLabel.tsx: text-2xs/semibold/uppercase/tracking-wider/slate-500
- Sag eylem yuvasi ("Tumunu gor") ayri bilesen degil, ayni bilesenin ikinci hali
- PANEL_TITLE sabiti ayni degerlere getirildi ve birlikte degistirilmesi
  gerektigi yazildi (sinif dizesi isteyen sapgui panelleri icin duruyor)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 4: `Panel`

**Dosyalar:**
- Oluştur: `src/ui/Panel.tsx`
- Değiştir: `src/components/ChatSessionPane.tsx` (öneri kartları, son çalışma
  satırları), `src/components/AxetCodeHome.tsx` (boş durum kutuları)

**Arayüzler:**
- Tüketir: yok
- Üretir: `<Panel variant="flat"|"interactive"|"inset">` — varsayılan dışa aktarım;
  `PanelVariant` tipi

Kenarlıklı yüzey (`rounded-lg border border-line-subtle bg-card`) ve onun hover
hâli bugün en az dört yerde tek tek yazılı: öneri kartları, son çalışma satırları,
boş durum kutuları, sistem satırları.

- [ ] **Adım 1: Doğrulamayı çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rc 'border-line-subtle bg-card' src/ --include=*.tsx | awk -F: '$2>0'
```

Beklenen: en az iki dosya listelenir. Hedef: yalnızca `src/ui/Panel.tsx`.

- [ ] **Adım 2: `src/ui/Panel.tsx`'i oluştur**

```tsx
import type { HTMLAttributes, ReactNode } from "react";

export type PanelVariant = "flat" | "interactive" | "inset";

// `interactive`in hover'i KENARLIK + ZEMIN birlikte degistiriyor. Yalnizca
// zemin degisseydi kart "biraz aydinlandi" gibi okunuyordu; kenarlik da bir
// kademe cikinca "bu tiklanabilir" oluyor.
const VARIANT: Record<PanelVariant, string> = {
  flat: "border-line-subtle bg-card",
  interactive:
    "border-line-subtle bg-card transition-colors hover:border-line hover:bg-raised",
  inset: "border-line-subtle bg-app",
};

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  children: ReactNode;
}

/**
 * Kenarlıklı yüzey — kart, liste satırı, boş durum kutusu, kod bloğu.
 *
 * Üç varyantın ayrımı DAVRANIŞSAL, dekoratif değil:
 *   flat        → tıklanmaz. Bilgi kutusu.
 *   interactive → tıklanır. Hover'da kenarlık ve zemin birlikte bir kademe çıkar.
 *   inset       → çukur. Zemin `bg-app`, yani kartın değil PENCERENİN tonu;
 *                 içine gömülü bir şey (çıktı, kod) olduğunu söylüyor.
 *
 * Yarıçap sabit `rounded-lg` (8px). Uygulamada kart yarıçapı bir ara
 * rounded/md/lg/xl arasında dağılmıştı; `tailwind.config.js`'teki ölçek
 * daraltması farkı küçülttü, bu bileşen tamamen kapatıyor.
 */
export default function Panel({
  variant = "flat",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <div className={`rounded-lg border ${VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
```

- [ ] **Adım 3: Öneri kartlarını ve son çalışma satırlarını göç ettir**

`src/components/ChatSessionPane.tsx`. Her ikisi de `interactive`. Kartın kendi
`group` sınıfı, dolgusu ve yerleşimi `className`'e geçiyor; **kenarlık, zemin
ve hover artık orada YAZILMIYOR.**

Öneri kartı — bugünkü `rounded-lg border border-line-subtle bg-card p-4 …
hover:border-line hover:bg-raised` dizesinden kenarlık/zemin/hover parçaları
silinir, geriye `group flex … gap-3 p-4` kalır ve sarmalayıcı `<button>`
`<Panel as>` değil, `Panel`'in İÇİNDE kalır — `Panel` bir `div` olduğu için
tıklanabilirlik `<button>`da kalmalı. Yani:

```tsx
<Panel variant="interactive" className="group">
  <button onClick={…} className="flex w-full cursor-pointer items-start gap-3 p-4 text-left">
    …
  </button>
</Panel>
```

Son çalışma satırı için aynı kalıp, `className="group"` + iç düğmede
`px-3.5 py-2.5`.

- [ ] **Adım 4: Doğrulamayı ve kapıları çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rn 'border-line-subtle bg-card' src/ --include=*.tsx
# bekleniyor: yalnizca src/ui/Panel.tsx (ve varsa henuz gocmemis yerler)
npm run typecheck
npm run build
```

- [ ] **Adım 5: Gözle bak**

`npm run dev`, açılış ekranı, koyu ve açık tema. Üç öneri kartı ve son çalışma
satırları: durgunda aynı kenarlık, hover'da kenarlık VE zemin birlikte bir
kademe çıkıyor. Tıklama hâlâ çalışıyor (kart bir `div` içine girdi, düğme değil
— tıklamanın iç `<button>`da kaldığını doğrula).

- [ ] **Adım 6: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
Panel ilkeli: kenarlikli yuzey tek yerden

- src/ui/Panel.tsx: flat / interactive / inset
- Varyant ayrimi davranissal: tiklanmaz / tiklanir / cukur
- Oneri kartlari ve son calisma satirlari gocuruldu; kenarlik, zemin ve
  hover artik cagri yerinde yazilmiyor
- Yaricap sabit rounded-lg; kart yaricapinin dagilmasi kapandi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 5: `Button` ilkeli

**Dosyalar:**
- Oluştur: `src/ui/Button.tsx`
- Değiştir: `src/ui/buttons.ts` (`xs` boyu, `project` tonu, `iconTintBtn`)
- Değiştir: `tailwind.config.js` (`project` rengi)

**Arayüzler:**
- Tüketir: Görev 1'in ölçeği (`text-2xs`)
- Üretir:
  - `buttons.ts`: `BtnSize` artık `"xs" | "sm" | "md" | "lg"`;
    `BtnTint` artık `"accent" | "sap" | "terminal" | "project"`;
    yeni `iconTintBtn(tint, size, extra): string`
  - `Button.tsx` varsayılan dışa aktarım — props:
    `variant?: "neutral"|"primary"|"danger"|"ghost"|"tint"` ·
    `tint?: BtnTint` · `size?: BtnSize` · `icon?: boolean` · `block?: boolean` ·
    `grow?: boolean` · `layout?: string` + tüm yerel `<button>` nitelikleri

### `btn()` neden %12'de kaldı (ve bu bileşen neyi düzeltiyor)

Ölçüm: 9 dosyada 21 `btn()` çağrısı, buna karşılık 30 dosyada **144** elde
kurulmuş `cursor-pointer` sınıf dizesi.

Sebep tembellik değil, **çakışma**: gerçek düğmeler koşullu yerleşim istiyor
(daraltılmış kenar çubuğunda kare, açıkken `flex-1`; kimi yerde `w-full`) ve
`btn()`'in sabit `px-*`'i bununla kavga ediyor. `extra` parametresine yerleşim
sınıfı geçmek işe yarıyor ama `px-2` yazan biri dolguyu da eziyor ve düğme
diğerlerinden 4px dar çıkıyor — bu, "elle yazayım daha temiz" kararının doğduğu
an. Açılış ekranındaki "Yeni sohbet" düğmesi 2026-09-06'da tam bu yüzden elle
yazıldı.

Bileşenin çözümü **yapısal**: `className` yok, `layout` var. Adı, ne için
olduğunu söylüyor; ve dolgu/renk sınıfları `layout`'tan SONRA değil ÖNCE
yazıldığı için oraya `px-2` koymak bir şeyi değiştirmiyor. Yerleşim ihtiyacının
kendisi (`block`, `grow`, kare) ise ayrı proplarla karşılanıyor, yani çoğu
durumda `layout`'a hiç gerek kalmıyor.

- [ ] **Adım 1: Doğrulamayı çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -ro 'cursor-pointer' src/ --include=*.tsx | wc -l
```

Beklenen bu aşamada: **144**. Bu görevin hedefi 144'ü düşürmek DEĞİL (o Görev 6);
burada yalnızca ilkelin var olması gerekiyor. Sayıyı not al — Görev 6'nın
başlangıç değeri bu.

- [ ] **Adım 2: `tailwind.config.js`'e `project` rengini ekle**

`accent` bloğunun hemen ALTINA, `slate`'in üstüne:

```js
        // Proje moru — `--project-500-rgb` iki temada da tanımlı (koyu
        // 122 107 199, açık 91 79 191). Bugün yalnızca "Yeni proje" düğmesi
        // kullanıyor ve orada elle `rgb(var(--project-500-rgb) / …)` yazılı;
        // Tailwind rengi olarak kaydedilince `bg-project-500/10` gibi opaklık
        // varyantları da geliyor ve `tintBtn`'in `project` tonu mümkün oluyor.
        project: {
          500: withOpacity("--project-500-rgb")
        },
```

- [ ] **Adım 3: `buttons.ts`'e `xs` boyunu ekle**

`BtnSize` tipini ve iki boyut haritasını genişlet. Başlıktaki boy kademesi
yorumuna da bir satır ekleniyor:

```ts
export type BtnSize = "xs" | "sm" | "md" | "lg";
```

```ts
const SIZE: Record<BtnSize, string> = {
  xs: "h-6 gap-1 px-2 text-2xs",
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  md: "h-8 gap-1.5 px-3 text-sm",
  lg: "h-9 gap-2 px-4 text-base",
};

const ICON_SIZE: Record<BtnSize, string> = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
};
```

Dosya başındaki boy kademesi yorumuna ekle:

```
//   xs → h-6  (24px) · 10px yazı · satır içi eylemler, liste satırı düğmeleri
```

`GHOST_ICON_BUTTON` sabiti bugün elle kurulmuş bir 24px düğme — artık
`iconBtn("ghost", "xs")` ile aynı boyda. Sabiti ELLE YAZILI BIRAKMA, yeniden
tanımla (rengi biraz farklı olduğu için `extra` ile veriliyor):

```ts
/** Kenarlıksız satır içi ikon düğmesi — liste satırlarındaki eylemler (24px). */
export const GHOST_ICON_BUTTON = iconBtn("ghost", "xs", "text-slate-500 hover:text-white");
```

- [ ] **Adım 4: `buttons.ts`'e `project` tonunu ve `iconTintBtn`'i ekle**

```ts
export type BtnTint = "accent" | "sap" | "terminal" | "project";
```

`TINT` nesnesine, `accent` ile aynı kalıpta (proje moru da RGB üçlüsü olduğu için
`color-mix` değil Tailwind opaklık sözdizimi kullanılıyor):

```ts
  project:
    "border border-project-500/30 bg-project-500/10 text-project-500 " +
    "hover:border-project-500/50 hover:bg-project-500/20 disabled:opacity-40",
```

Ve `tintBtn`'in yanına kare kardeşi:

```ts
/** Yalnızca ikon taşıyan kare SOLUK-DOLGU düğme sınıfı. */
export function iconTintBtn(
  tint: BtnTint = "accent",
  size: BtnSize = "md",
  extra = "",
): string {
  return `${SHELL} ${ICON_SIZE[size]} ${TINT[tint]}${extra ? ` ${extra}` : ""}`;
}
```

- [ ] **Adım 5: `src/ui/Button.tsx`'i oluştur**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  btn,
  iconBtn,
  iconTintBtn,
  tintBtn,
  type BtnSize,
  type BtnTint,
  type BtnVariant,
} from "./buttons";

type Variant = BtnVariant | "tint";

// `className` BILEREK Omit ediliyor. Bu bilesenin var olma sebebi tam olarak
// bu: `btn()` bir sinif dizesi donduruyordu ve cagri yeri ona kendi dolgusunu
// ekleyebiliyordu (`px-2`), boylece dugmeler birbirinden 2-4px ayrisiyordu.
// Yerlesim ihtiyaci gercek ama dolgu/renk ihtiyaci degil — o yuzden yerlesim
// ayri proplarla (`block`, `grow`, `icon`) ve son care `layout` ile veriliyor.
interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: Variant;
  /** `variant="tint"` iken hangi ton. Diğer varyantlarda yok sayılır. */
  tint?: BtnTint;
  size?: BtnSize;
  /** Kare, yalnız ikon. Yatay dolgu kalkar, genişlik yüksekliğe eşitlenir. */
  icon?: boolean;
  /** `w-full` — kendi satırını kaplayan düğme. */
  block?: boolean;
  /** Esnek şeritte kalan boşluğu kaplar. */
  grow?: boolean;
  /**
   * Son çare YERLEŞİM sınıfları — kenar boşluğu, hizalama, sıra.
   * Punto, dolgu, renk ve yükseklik BURADAN VERİLMEZ; verilirse dilin dışına
   * çıkmış olursun ve bu bileşenin çözdüğü sorun geri gelir.
   */
  layout?: string;
  children?: ReactNode;
}

/**
 * Uygulamanın tek düğme bileşeni.
 *
 * Ton seçimi: `neutral` varsayılan · `primary` EKRANDA EN FAZLA BİR TANE
 * ("burada ne yapılması bekleniyor" sorusunun cevabı) · `danger` yıkıcı ·
 * `ghost` yoğun listelerde satır eylemleri · `tint` bir düğmeye kimlik
 * vermek gerektiğinde ("bu düğme neye dokunuyor": mavi SAP, yeşil terminal,
 * mor proje, lime ekleme). `tint` aynı şeritte birden fazla bulunabilir,
 * `primary` bulunamaz.
 */
export default function Button({
  variant = "neutral",
  tint = "accent",
  size = "md",
  icon = false,
  block = false,
  grow = false,
  layout = "",
  type = "button",
  children,
  ...rest
}: Props) {
  // `!flex-1` — ünlem KASITLI. `SHELL` içinde `shrink-0` var (düğmeler esnek
  // şeritlerde yanlarındaki metin uzayınca ezilmesin diye) ve `flex-1`
  // `flex: 1 1 0%` yazıyor, yani ikisi flex-shrink üstünde çakışıyor.
  // Hangisinin kazanacağı sınıf sırasına değil Tailwind'in ÜRETİM sırasına
  // bağlı — yani sessizce yanlış olabilir. `!` bunu karara bağlıyor.
  const extra = [block ? "w-full" : "", grow ? "min-w-0 !flex-1" : "", layout]
    .filter(Boolean)
    .join(" ");

  const cls =
    variant === "tint"
      ? icon
        ? iconTintBtn(tint, size, extra)
        : tintBtn(tint, size, extra)
      : icon
        ? iconBtn(variant, size, extra)
        : btn(variant, size, extra);

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Adım 6: Kapıları çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
npm run typecheck
npm run build
```

`Record<BtnSize, string>` haritalarından biri `xs` almazsa typecheck burada
kırılır — bu iyi, tipin işi bu.

- [ ] **Adım 7: Gözle bak**

`npm run dev`. Bu görevde henüz göç yok, yani **görünürde hiçbir şey
değişmemeli**. Değiştiyse `GHOST_ICON_BUTTON`'ın yeniden tanımı bozmuştur:
liste satırlarındaki küçük ikon düğmelerini (sohbet listesi, dosya ağacı)
kontrol et — 24px, kenarlıksız, hover'da zemin.

- [ ] **Adım 8: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
Button ilkeli: className yerine layout

- src/ui/Button.tsx: variant/tint/size/icon/block/grow/layout
- className BILEREK yok. btn()'in %12'de kalmasinin sebebi olculdu: cagri
  yeri kendi dolgusunu ekleyebiliyordu ve dugmeler 2-4px ayrisiyordu
- buttons.ts: xs (24px) boyu, project tonu, iconTintBtn
- GHOST_ICON_BUTTON artik elde kurulmuyor, iconBtn("ghost","xs")
- tailwind.config.js: project.500 rengi (--project-500-rgb)
- grow'da !flex-1: SHELL'deki shrink-0 ile flex-shrink uzerinde cakisiyor
  ve kazanan sinif sirasina degil uretim sirasina bagliydi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 6: `Button` benimsenmesi

**Dosyalar:** 30 dosyada 144 elde kurulmuş düğme. Dört öbek, **dört ayrı
işleme** — her öbek tek başına çalışır durumda olmalı.

**Arayüzler:**
- Tüketir: Görev 5'in `Button` bileşeni
- Üretir: yok (yalnız göç)

Bu planın en büyük görevi ve tamamı mekanik. Öbeklere bölünmesinin sebebi risk
değil **gözle bakılabilirlik**: 144 düğmelik tek bir fark gözden geçirilemez.

### Dönüşüm kuralı

Elde kurulmuş her düğme için sırayla sor:

1. **Bu bir düğme mi?** `cursor-pointer` taşıyan her şey düğme değil —
   sürüklenebilir satırlar, tıklanabilir kart yüzeyleri, bağlantı benzeri
   metinler de taşıyor. Değilse **dokunma**.
2. **Hangi ton?** Dolgu accent ise `primary` · kırmızı dolgu ise `danger` ·
   kenarlıksız/zeminsiz ise `ghost` · soluk renkli dolgu ise `tint` + doğru ton
   · geri kalan `neutral`.
3. **Hangi boy?** Yüksekliğe bak: `h-6`→`xs` · `h-7`→`sm` · `h-8`→`md` ·
   `h-9`→`lg`. Yükseklik yoksa (yalnız `p-1.5` gibi) en yakınına yuvarla ve
   **not düş** — bu, düğmelerin neden birbirinden ayrıştığının kanıtı.
4. **Kare mi?** Yalnız ikon taşıyorsa `icon`.
5. **Yerleşim?** `w-full` → `block` · `flex-1` → `grow` · kenar boşluğu →
   `layout`.

**Bir düğme kurala oturmuyorsa DÖNÜŞTÜRME.** Öbeğin sonunda listele ve
kullanıcıya sor. Zorlamak, bugünkü dağınıklığı bileşenin içine taşımak olur.

- [ ] **Adım 1: Başlangıcı ölç**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -ro 'cursor-pointer' src/ --include=*.tsx | wc -l    # 144
```

- [ ] **Adım 2: Öbek A — açılış ve sohbet (≈54 düğme)**

`AxetCodeHome.tsx` (23) · `ChatSessionPane.tsx` (18) · `ChatBubble.tsx` (4) ·
`ChatProjectDialog.tsx` (3) · `ModelSelector.tsx` (2) · `AttachmentChip.tsx` (2) ·
`ChatFilesPanel.tsx` (2)

Bu öbekte iki KORUNAN karar var, ikisi de bozulmayacak:
- **"Yeni sohbet" tek `primary`.** Ekrandaki başka hiçbir düğme `primary`
  olmayacak. `sidebarOpen` koşullu yerleşimi artık `grow` (açıkken) /
  `icon` (kapalıyken) ile veriliyor, elle `flex-1`/`w-9` ile değil.
- **"Yeni proje" mor `tint`.** `variant="tint" tint="project"`. Ayrım iki
  eksende: dolgu-vs-yıkama ve lime-vs-mor.

Gözle bak, sonra işle:

```bash
git add -A && git commit -F - <<'EOF'
Button benimsenmesi: acilis ve sohbet

- AxetCodeHome, ChatSessionPane, ChatBubble, ChatProjectDialog,
  ModelSelector, AttachmentChip, ChatFilesPanel
- "Yeni sohbet" tek primary olarak kaldi; koşullu yerlesim artik
  grow/icon proplariyla, elle flex-1/w-9 ile degil
- "Yeni proje" project tonunda tint

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

- [ ] **Adım 3: Öbek B — modaller (≈24 düğme)**

`SettingsModal.tsx` (13) · `AppConnectionsSection.tsx` (6) ·
`AddSystemModal.tsx` (3) · `CredentialsModal.tsx` (2)

`DIALOG_CANCEL_BUTTON` / `DIALOG_CONFIRM_BUTTON` / `DIALOG_DANGER_BUTTON`
sabitlerini kullanan yerler de bileşene geçiyor:
`<Button variant="ghost" size="lg">` / `variant="primary"` / `variant="danger"`.
Sabitler `buttons.ts`'te KALIYOR (Görev 7 modal ayaklarında kullanacak), ama
`.tsx` içinden çağrılmıyor.

Gözle bak (Ayarlar'ın her sekmesi, sistem ekleme, kimlik bilgileri), sonra işle.

- [ ] **Adım 4: Öbek C — kabuk ve SAP (≈37 düğme)**

`FileExplorer.tsx` (8) · `SystemPanel.tsx` (7) · `App.tsx` (6) ·
`ActivityBar.tsx` (5) · `TerminalPanel.tsx` (5) · `RecentSystems.tsx` (2) ·
`TitleBar.tsx` (2) · `Tree.tsx` (2)

**`ActivityBar.tsx`'e DİKKAT.** Buradaki beş düğme `Button`'a geçmiyor —
listede yalnızca sayıldıkları için var. Ray düğmelerinin kendi yapısı var
(mutlak konumlu şerit + iç kutu + satır içi renk) ve `Button` bunu ifade
edemiyor. Kurala göre: *"kurala oturmuyorsa dönüştürme."* Dosyaya bir satır not
ekle:

```tsx
// Bu şeritteki düğmeler BİLEREK `src/ui/Button.tsx` kullanmıyor: her biri
// mutlak konumlu bir aktiflik şeridi + ayrı bir iç kutu + satır içi modül
// rengi taşıyor. `Button` bunu ifade edemiyor ve etmesi de gerekmiyor —
// navigasyon rayı uygulamanın tek örneği.
```

Gözle bak (dosya gezgini, SAP sistem paneli, terminal, başlık çubuğu),
sonra işle.

- [ ] **Adım 5: Öbek D — SAP GUI Scripting ve kalan (≈20 düğme)**

`SapGuiScriptingHome.tsx` (9) · `sapgui/CommandBar.tsx` (4) ·
`sapgui/ScreenViewer.tsx` (3) · `sapgui/ElementInspector.tsx` (3) ·
`Toast.tsx` (1)

`AxetFlowsLiveHome.tsx` (4) **KAPSAM DIŞI**: axet.flows ve axet.flows Live
2026-09-04'te kullanıcı isteğiyle arayüzden kaldırıldı, kaynak dosyalar geri
açmak kolay olsun diye duruyor. Ölü arayüzü göç ettirmek Faz 4'ün kararını
şimdiden bağlar. Dokunma.

Gözle bak (SAP GUI Scripting ekranı, komut çubuğu, öğe denetçisi), sonra işle.

- [ ] **Adım 6: Sonucu ölç ve kalanı raporla**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -ro 'cursor-pointer' src/ --include=*.tsx | wc -l
grep -rc 'cursor-pointer' src/ --include=*.tsx | awk -F: '$2>0' | sort -t: -k2 -rn
npm run typecheck && npm run build
```

Beklenen: **20'nin altı.** Kalanlar meşru olmalı — `ActivityBar` (5, bilerek),
`AxetFlowsLiveHome` (4, kapsam dışı) ve düğme olmayan tıklanabilir yüzeyler.
Kalan her satırı tek tek gerekçelendir; gerekçesi olmayan varsa göç et.

Kurala oturmadığı için dönüştürülmeyen düğmeleri **kullanıcıya listele**.

---

## Görev 7: `Field`

**Dosyalar:**
- Oluştur: `src/ui/Field.tsx`
- Değiştir: 16 dosyadaki 29 odak bildirimi (Adım 1'in grep'i listeler)

**Arayüzler:**
- Tüketir: Görev 5'in boy merdiveni (`xs`/`sm`/`md`/`lg` — aynı yükseklikler)
- Üretir:
  - `fieldClass(size?: FieldSize, extra?: string): string`
  - `<Field label? hint? error?>` — varsayılan dışa aktarım, kontrolü sarmalar
  - `FieldSize` tipi

Ölçüldü: **29 bildirim, 7 farklı muamele.**

| Muamele | Kaç kez |
|---|---|
| `border-accent-500` (çıplak kenarlık, halkasız) | 18 |
| `border-accent-500/50` | 3 |
| `ring-2` | 2 |
| `ring-accent-500/20` | 2 |
| `ring-accent-500/40` | 2 |
| `border-accent-500/60` | 1 |
| `ring-0` (odağı tamamen kapatıyor) | 1 |

Hedef muamele zaten uygulamada var (`CredentialsModal`, `SettingsModal`) — en
görünür olan o, çünkü halka odağı klavye kullanıcısına uzaktan gösteriyor.
Diğer altısı ona göçüyor.

### Neden bileşen DEĞİL de sınıf üreteci + sarmalayıcı

Girdilerdeki ölçülen sorun dolgu kayması değil **odak muamelesi**; ve girdiler
düğmelerden çok daha çeşitli biçimlerde kullanılıyor (içine ikon gömülü olanlar,
kendi kendine büyüyen `textarea`'lar, `select`ler). Tek bir `<Field>` bileşenini
üç element tipine birden zorlamak, tip tarafını çözülmesi gereken bir soruna
çeviriyor ve karşılığında hiçbir şey vermiyor. O yüzden:

- `fieldClass()` → değişmesi gereken tek şeyi (odak + kenarlık + zemin) merkezîleştirir
- `<Field>` → etiket / ipucu / hata üçlüsünü merkezîleştirir

- [ ] **Adım 1: Doğrulamayı çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rnoE 'focus(-within)?:(border|ring)-[^ "`]+' src/ --include=*.tsx \
  | grep -v 'src/ui/Field.tsx' | awk -F: '{print $NF}' | sort | uniq -c | sort -rn
```

Beklenen: **7 farklı dize, toplam 29 satır** (yukarıdaki tablo).
Hedef: hepsi `fieldClass` içine taşınmış olacak.

- [ ] **Adım 2: `src/ui/Field.tsx`'i oluştur**

```tsx
import type { ReactNode } from "react";

export type FieldSize = "xs" | "sm" | "md" | "lg";

// Yükseklikler `src/ui/buttons.ts`'teki SIZE ile AYNI. Sebebi ölçüldü: bugün
// hiçbir yerde bir girdi ile yanındaki düğme aynı hizada değil, çünkü girdi
// `py-1.5` ile, düğme `h-8` ile kuruluyor ve ikisi aynı puntoda bile 1-3px
// ayrışıyor. Girdi de sabit `h-*` alınca satır hizası kendiliğinden geliyor.
const SIZE: Record<FieldSize, string> = {
  xs: "h-6 px-2 text-2xs",
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
  lg: "h-9 px-3.5 text-base",
};

/**
 * Bir girdinin (input / textarea / select) kendi sınıfları.
 *
 * ODAK MUAMELESİ TEK YERDE. Uygulamada yedi farklı hâli vardı: kimi yalnızca
 * kenarlık, kimi kenarlık + halka, kimi yarı saydam kenarlık, biri de
 * `focus:ring-0` ile odağı tamamen kapatıyordu (klavye kullanıcısı için
 * görünmez bir alan). Doğru cevap ikisi birlikte: kenarlık "buradasın",
 * halka "klavye burada" diyor ve halka uzaktan da görülüyor.
 *
 * `[&:hover:not(:focus-within)]` KASITLI: Tailwind `hover:` kurallarını
 * `focus-within:` kurallarından SONRA ve aynı özgüllükte yayıyor, yani düz
 * yazılırsa fare üstündeyken odak halkası sessizce kayboluyor. Bu tuzak
 * uygulamada bir kez ölçüldü; burada bir kez çözülüyor.
 *
 * `textarea` için: `size` yüksekliği sabitlediği için çok satırlıda
 * `extra="h-auto py-2"` geç.
 */
export function fieldClass(size: FieldSize = "md", extra = ""): string {
  return (
    "w-full rounded-md border border-line bg-control text-slate-200 " +
    "placeholder:text-slate-500 transition-colors outline-none " +
    "[&:hover:not(:focus-within)]:border-line-strong " +
    "focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 " +
    "disabled:cursor-not-allowed disabled:opacity-50 " +
    `${SIZE[size]}${extra ? ` ${extra}` : ""}`
  );
}

/** Hata hâlindeki kenarlık — `fieldClass`'ın `extra`sına geçilir. */
export const FIELD_ERROR = "!border-[var(--status-danger-border)]";

interface Props {
  /** Girdinin üstündeki etiket. */
  label?: ReactNode;
  /** Etiketin altındaki açıklama — hata varken gizlenir. */
  hint?: ReactNode;
  /** Doluysa altında kırmızı hata metni. */
  error?: ReactNode;
  /** Girdinin kendisi: `<input className={fieldClass()} />`. */
  children: ReactNode;
  className?: string;
}

/**
 * Etiket + girdi + ipucu/hata üçlüsü.
 *
 * Girdinin KENDİSİ `children` olarak geliyor, bileşen onu üretmiyor: uygulamada
 * input, textarea ve select üçü de var, kimisinin içine ikon gömülü. Üçünü tek
 * bileşene zorlamak tip tarafını bir soruna çevirip karşılığında hiçbir şey
 * vermiyordu.
 *
 * Hata KENARLIĞINI de bileşen çizmiyor, `FIELD_ERROR`'u çağıran geçiriyor:
 * `fieldClass("md", invalid ? FIELD_ERROR : "")`. Alternatifi bir alt öğe
 * seçicisiyle (`[&_*]:!border-…`) girdiyi uzaktan boyamaktı; o seçici içteki
 * ikonlara ve sarmalayıcılara da vuruyor.
 */
export default function Field({ label, hint, error, children, className = "" }: Props) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label != null && <span className="text-xs font-medium text-slate-300">{label}</span>}
      {children}
      {error != null ? (
        <span className="text-xs text-[var(--status-danger-text)]">{error}</span>
      ) : hint != null ? (
        <span className="text-xs text-slate-500">{hint}</span>
      ) : null}
    </div>
  );
}
```

- [ ] **Adım 3: 29 bildirimi göç ettir**

Her `<input>` / `<textarea>` / `<select>` için: kenarlık, zemin, dolgu, punto ve
odak sınıflarını **sil**, yerine `className={fieldClass("md")}` yaz. Yerleşim
(`w-full`, `flex-1`, kenar boşluğu) `extra` parametresine gider.

**Üç yer KAPSAM DIŞI** — dokunma:

| Yer | Neden |
|---|---|
| `ChatSessionPane.tsx` composer (`focus-within:border-accent-500`) | Kullanıcının kayıtlı "Gemini düzeni" kararı; tek satırlık besteci kendi kurallarında |
| `AxetCodeHome.tsx` (`focus-within:ring-accent-500/40`) | Aynı besteci kabuğunun ikinci örneği — önce hangi öğe olduğunu DOĞRULA; besteci değilse göç ettir |
| `App.tsx` (`focus-within:ring-accent-500/40`) | Aynı; doğrula, besteci değilse göç ettir |

`SystemPanel.tsx`'teki `focus:ring-0` **mutlaka** göç edecek: odağı tamamen
kapatıyor, yani klavyeyle gezen kullanıcı o alanda nerede olduğunu göremiyor.
Bu bir erişilebilirlik hatası, üslup tercihi değil.

- [ ] **Adım 4: Doğrulamayı ve kapıları çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rnoE 'focus(-within)?:(border|ring)-[^ "`]+' src/ --include=*.tsx \
  | grep -v 'src/ui/Field.tsx'
# bekleniyor: yalnizca kapsam disi birakilan besteci satirlari
npm run typecheck
npm run build
```

- [ ] **Adım 5: Gözle bak**

`npm run dev`, koyu VE açık tema. Her alanda **Tab ile** dolaş (fareyle değil —
ölçülen tuzak tam orada):
Ayarlar (her sekme) · sistem ekleme · kimlik bilgileri · SAP GUI Scripting
komut çubuğu · öğe denetçisi.

Aranan: (a) her odaklanmış alanda kenarlık VE halka birlikte görünüyor,
(b) fareyi odaklı alanın üstüne getirince halka **kaybolmuyor**,
(c) bir alan ile yanındaki düğme aynı yükseklikte.

- [ ] **Adım 6: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
Field ilkeli: yedi odak muamelesi tek muameleye indi

- src/ui/Field.tsx: fieldClass() + Field sarmalayicisi (etiket/ipucu/hata)
- Odak artik her yerde kenarlik + halka; SystemPanel'deki focus:ring-0
  kaldirildi (klavye kullanicisi icin gorunmez alandi)
- Girdi yukseklikleri buttons.ts'teki SIZE ile ayni merdivene bagli;
  bir alan ile yanindaki dugme artik ayni hizada
- [&:hover:not(:focus-within)] kasitli: Tailwind hover kurallarini
  focus-within'den SONRA ve ayni ozgullukte yayiyor, duz yazilirsa fare
  odak halkasini sessizce siliyor
- Sohbet bestecisi kapsam disi (kullanicinin kayitli Gemini duzeni karari)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 8: `Modal`

**Dosyalar:**
- Oluştur: `src/ui/Modal.tsx`
- Değiştir: `ConfirmDialog.tsx` · `ChatProjectDialog.tsx` ·
  `ChatInstructionsDialog.tsx` · `UpdatePromptModal.tsx` · `AddSystemModal.tsx` ·
  `CredentialsModal.tsx` · `AppConnectionsModal.tsx` · `SettingsModal.tsx` ·
  `AxetCodeHome.tsx:3350` · (`AttachmentLightbox.tsx` — bkz. Adım 4)
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` — gerekirse

**Arayüzler:**
- Tüketir: Görev 2'nin `LAYER`, Görev 5'in `Button`, Görev 1'in `text-lg`
- Üretir: `<Modal open onClose title? size? footer? bare? dismissOnBackdrop?>` —
  varsayılan dışa aktarım; `ModalSize` tipi

On modal aynı flex kabuğunu yeniden yazıyor ve her biri farklı bir alt küme
uyguluyor: beşinde `backdrop-blur-sm` + solma var, beşinde yok; kapatma düğmesi
kimisinde `rounded-full`, kimisinde `rounded-md`; **hiçbirinde odak tuzağı yok**.

`ConfirmDialog.tsx:36`'daki Esc dinleyicisi **çalışmıyor**: `onKeyDown` bir
`<div>`in üstünde ve o div odaklanabilir değil, yani olay ona hiç ulaşmıyor.
Kullanıcı içeride bir düğmeye tıklamadıkça Esc bir şey yapmıyor. İlkel bunu
doküman düzeyinde çözüyor.

- [ ] **Adım 1: Doğrulamayı çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rl 'overlay-scrim' src/ --include=*.tsx | sort
```

Beklenen: **11 dosya** (yukarıdaki dokuz + `AttachmentLightbox.tsx` +
`sapgui/GuidePanel.tsx`). Hedef: **3** — `src/ui/Modal.tsx`,
`AttachmentLightbox.tsx` (Adım 4) ve `GuidePanel.tsx` (bir çekmece, modal
değil).

- [ ] **Adım 2: `src/ui/Modal.tsx`'i oluştur**

```tsx
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "../i18n";
import { layerStyle } from "./layers";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const WIDTH: Record<ModalSize, string> = {
  sm: "w-[400px]",
  md: "w-[560px]",
  lg: "w-[720px]",
  xl: "w-[920px]",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusable(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Verilmezse başlık şeridi hiç çizilmez (lightbox gibi çıplak modaller). */
  title?: ReactNode;
  size?: ModalSize;
  /** Ayak şeridi — düğmeler sağa yaslı, `primary` en sağda. */
  footer?: ReactNode;
  /** Gövde dolgusunu kaldırır: sekme şeridi, tam kanamalı liste. */
  bare?: boolean;
  /**
   * Zemine tıklayınca kapanma. Veri girilen formlarda `false` yap — yanlışlıkla
   * dışarı tıklamak doldurulan formu siler.
   */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

/**
 * Uygulamanın tek modal kabuğu.
 *
 * Her modal bunu yeniden yazıyordu ve her biri farklı bir alt kümesini
 * uyguluyordu: yarısında zemin bulanıklığı/solması vardı yarısında yoktu,
 * kapatma düğmesi üç farklı biçimdeydi, HİÇBİRİNDE odak tuzağı yoktu ve
 * `ConfirmDialog`'un Esc dinleyicisi odaklanabilir olmayan bir `<div>` üstünde
 * durduğu için hiç çalışmıyordu.
 */
export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  footer,
  bare = false,
  dismissOnBackdrop = true,
  children,
}: Props) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc ve Tab DOKÜMAN düzeyinde, yakalama evresinde. Panelin üstünde
  // dinlemek işe yaramıyor: panel odaklanabilir değil, olay ona ulaşmıyor.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || panelRef.current == null) return;
      const items = visibleFocusable(panelRef.current);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  // Arkadaki sayfa kaymasın.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Açılışta odağı içeri al — yoksa Tab, modalin ARKASINDAKİ sayfada geziyor.
  useEffect(() => {
    if (!open || panelRef.current == null) return;
    visibleFocusable(panelRef.current)[0]?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="animate-backdrop-fade-in fixed inset-0 flex items-center justify-center bg-[var(--overlay-scrim)] p-6 backdrop-blur-sm"
      style={layerStyle("modal")}
      // `onMouseDown`, `onClick` DEĞİL: panelin içinde başlayıp dışarıda biten
      // bir sürükleme (metin seçmek) `click`i zeminde tetikliyor ve modal
      // kullanıcı hiçbir şey yapmamışken kapanıyor.
      onMouseDown={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`animate-modal-pop-in flex max-h-full ${WIDTH[size]} max-w-full flex-col overflow-hidden rounded-xl border border-line bg-card`}
      >
        {title != null && (
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line-subtle px-5">
            <h3 className="min-w-0 truncate text-lg font-semibold text-white">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-hover hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto ${bare ? "" : "px-5 py-4"}`}>
          {children}
        </div>
        {footer != null && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line-subtle px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

`common.close` anahtarı `tr.ts:4` ve `en.ts`'te zaten var — yeni i18n anahtarı
gerekmiyor. (Doğrula: `grep -n '"common.close"' src/i18n/tr.ts src/i18n/en.ts`.)

- [ ] **Adım 3: Dokuz modali göç ettir**

Her birinde: dış `<div>` (zemin) ve iç kabuk `<div>` silinir, `<Modal>` gelir;
başlık `title`'a, alt düğmeler `footer`'a taşınır. Boyut eşlemesi bugünkü
genişliklerden:

| Modal | `size` | `dismissOnBackdrop` |
|---|---|---|
| `ConfirmDialog` | `sm` | `true` |
| `UpdatePromptModal` | `sm` | `false` (indirme sürerken kapanmasın) |
| `ChatProjectDialog` | `md` | `false` (form) |
| `ChatInstructionsDialog` | `md` | `false` (form) |
| `AddSystemModal` | `md` | `false` (form) |
| `CredentialsModal` | `md` | `false` (form) |
| `AppConnectionsModal` | `lg` | `true` |
| `SettingsModal` | `xl` | `true` |
| `AxetCodeHome.tsx:3350` | Adım 4'te belirle | Adım 4'te belirle |

Ayak düğmeleri Görev 5'in bileşeniyle:

```tsx
footer={
  <>
    <Button variant="ghost" size="lg" onClick={onCancel}>{t("common.cancel")}</Button>
    <Button variant={danger ? "danger" : "primary"} size="lg" onClick={onConfirm}>
      {confirmLabel ?? t("confirmDialog.confirm")}
    </Button>
  </>
}
```

`ConfirmDialog`'daki `autoFocus` **kalkıyor** — `Modal` zaten açılışta ilk
odaklanabilir öğeye odaklanıyor ve ikisi birlikte olduğunda hangisinin kazandığı
render sırasına bağlı.

- [ ] **Adım 4: İki özel durumu karara bağla**

`AttachmentLightbox.tsx` — tam ekran resim görüntüleyici. Başlığı yok, gövdesi
kaydırılmıyor, genişliği sabit değil. `size`/`title`/`footer` proplarının hiçbiri
işine yaramıyor. **Göç ettirme**; yerine dosyaya not düş:

```tsx
// Bu BİLEREK `src/ui/Modal.tsx` kullanmıyor: lightbox'ın başlığı, ayağı ve
// sabit genişliği yok — pencereyi kaplayan bir tuval. `Modal`'ın verdiği tek
// şey zemin + Esc olurdu ve karşılığında sabit genişlik/dolgu kabuğunu
// ezmek gerekirdi. Katman kaydı (`layerStyle`) yine de kullanılıyor.
```

`AxetCodeHome.tsx:3350` — hangi modal olduğunu ÖNCE oku. Yukarıdaki tabloya
uyuyorsa göç ettir; lightbox gibi çıplak bir örtüyse aynı notu düş.

- [ ] **Adım 5: Doğrulamayı ve kapıları çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rn 'overlay-scrim' src/ --include=*.tsx
# bekleniyor: src/ui/Modal.tsx, sapgui/GuidePanel.tsx, AttachmentLightbox.tsx
npm run typecheck
npm run build
```

- [ ] **Adım 6: Gözle bak — bu görevin en önemli adımı**

`npm run dev`. **Her modal için ayrı ayrı**, koyu ve açık temada:

1. Aç. Zemin bulanık ve yumuşak beliriyor mu?
2. **Esc'e bas** (önce hiçbir yere tıklamadan). Kapanıyor mu?
   — `ConfirmDialog`'da bu bugün ÇALIŞMIYOR; düzeldiğini doğrula.
3. **Tab'a basmayı sürdür.** Odak modalin içinde dönüyor mu, yoksa arkadaki
   sayfaya kaçıyor mu?
4. Zemine tıkla. Tabloya göre kapanmalı ya da kapanmamalı.
5. Gövdenin içinden başlayıp dışarıda biten bir metin seçimi yap. Modal
   kapanmamalı (`onMouseDown` bunun için).
6. Arka plan kayıyor mu? Kaymamalı.

- [ ] **Adım 7: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
Modal ilkeli: on kabuk tek kabuga indi

- src/ui/Modal.tsx: zemin + baslik/govde/ayak yuvalari + size
- Odak tuzagi eklendi (hicbir modalde yoktu): Tab modalin icinde donuyor,
  acilista odak iceri aliniyor, kapanista body kaydirma kilidi cozuluyor
- ConfirmDialog'un Esc dinleyicisi calismiyordu: odaklanabilir olmayan bir
  <div> ustundeydi, olay ona hic ulasmiyordu. Artik dokuman duzeyinde
- Zemin kapanmasi onMouseDown ile: govdede baslayip disarida biten bir metin
  secimi onClick'i zeminde tetikliyor ve modali sebepsiz kapatiyordu
- Veri girilen formlarda zemin tiklamasi kapali
- AttachmentLightbox bilerek disarida: baslik/ayak/sabit genislik yok

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 9: Tek "seçili" dili

**Dosyalar:** Adım 1'in grep'i belirler. Beklenen: `ActivityBar.tsx` ·
`App.tsx` · `SystemPanel.tsx` · `ChatSessionPane.tsx` · `SettingsModal.tsx` ·
`AppConnectionsModal.tsx`

**Arayüzler:** Yeni dosya yok — bu görev tamamen mevcut sınıfların
hizalanması. Tüketir: Görev 1 (punto), Görev 4 (`Panel`).

Spec §6'daki tablo. Ölçüldü: uygulamada "bu seçili" demenin **altı** ayrı
yolu var (`bg-active text-white`, `bg-accent-500/10`, `bg-control`, 3px şerit,
2px şerit, yalnız `text-accent-400`), ve ikisi aynı ekranda yan yana
görünüyor — o yüzden hangisinin ne demek olduğu öğrenilemiyor.

| Durum | İfade |
|---|---|
| Seçili / aktif | 2px `accent-500` şerit + `bg-accent-500/10` + ikon/metin `accent-400` |
| Fare üstünde | `bg-hover`, şerit YOK |
| Sağlık / durum | `--status-*` renkleri, **asla** accent |
| Odak | `accent-500` kenarlık + `accent-500/20` halka (Görev 7) |

**Geometri notu — şerit her yerde yok.** Şerit, öğenin DİKEY bir listede
durduğunu varsayar (rayda, kenar çubuğunda, satır listesinde). Yatay bir
segment denetiminde (SAP Launcher'ın iki durumlu anahtarları, sekme şeritleri)
şerit anlamsız; orada seçili hâl **şeritsiz** ama aynı renk diliyle kuruluyor:
`bg-accent-500/10 text-accent-400`. Renk aynı, geometri kabın geometrisi.

- [ ] **Adım 1: Ölç ve doğrulamayı çalıştır — BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
# 1) "secili" demenin kac ayri yolu var
grep -rn 'bg-active\|bg-accent-500/10\|w-\[3px\]\|w-\[2px\]\|h-\[3px\]\|h-\[2px\]' \
  src/ --include=*.tsx
# 2) "secili" anlaminda bg-active + text-white
#    DIKKAT: bosluksuz bitisiklik araniyor. `hover:bg-active hover:text-white`
#    MESRU (fare ustunde hali) ve bu kalibi ESLESTIRMEZ; onlara dokunulmayacak.
grep -rn 'bg-active text-white' src/ --include=*.tsx
```

Çıktıyı **oku ve listele** — planı yazarken ölçülen dosya adları eskimiş
olabilir. Aşağıdaki adımlar bu listenin üstünde çalışır.

Hedef: `bg-active` artık "seçili" anlamında hiçbir yerde kullanılmıyor
(nötr düğme dolgusu olarak kalması SORUN DEĞİL — `buttons.ts`'teki `neutral`
varyantı odur), ve şerit kalınlığı tek değere indi.

- [ ] **Adım 2: DİKEY seçim şeridini 2px'te birle**

Uygulamada dikey seçim şeridinin iki kalınlığı var ve **ikisi aynı ekranda,
yan yana duruyor**:

| Yer | Bugün | Ne gösteriyor |
|---|---|---|
| `ActivityBar.tsx:113` (`h-5 w-[3px] rounded-full bg-accent-500`) | 3px | Rayda aktif modül |
| `AxetCodeHome.tsx:3087` (`h-4 w-[2px] rounded-full bg-accent-500`) | 2px | Listede seçili sohbet |

Biri sol rayda, diğeri onun hemen sağındaki kolonda. Azınlık değişiyor:
**ray 3px → 2px.** İnce olan kazanıyor çünkü `w-12`'lik dar rayda 3px'lik
şerit ikonun soluna fazladan ağırlık bindiriyordu.

**`ChatBubble.tsx:301`'deki `w-[2px]` ŞERİT DEĞİL** — yazım imleci
(`animate-pulse`, `h-[1em]`). Dokunma.

- [ ] **Adım 3: `bg-active text-white` seçili hâllerini göç ettir**

Adım 1'in bulduğu her yer için: `bg-active text-white` →
`bg-accent-500/10 text-accent-400`.

`text-white` **kalkmalı**: `--ink-strong-rgb` "en güçlü metin" demek ve
uygulamada başlıkların rengi. Seçili bir segmentin başlıktan daha güçlü
olması gerekmiyor; onu seçili yapan renk, ağırlık değil.

**Dikkat — `bg-active`in meşru kullanımı var.** `buttons.ts`'teki `neutral`
varyantının dolgusu odur ve basılı hâl (`active:`) için de kullanılıyor.
Yalnızca "bu öğe seçili" anlamındakileri değiştir; düğme dolgularına dokunma.

- [ ] **Adım 4: `SystemPanel`'in YATAY şeritlerine DOKUNMA — ve nedenini yaz**

`SystemPanel.tsx`'te üç yatay şerit var (`:371`, `:505`, `:565`) ve grep bunları
Adım 1'de "şerit" diye getirecek. **Hiçbiri seçim göstergesi değil**, kart üstü
kimlik/uyarı çubukları:

| Satır | Renk | Anlamı |
|---|---|---|
| `:371` | `accentBarColor` = SAP kademesinin rengi (DEV/QA/PRD) | **Kimlik** — kullanıcı hangi sistemde olduğunu bundan anlıyor |
| `:505` | `--accent-500-rgb`, %50 opaklık | Kart başlığı süsü |
| `:565` | `--action-amber-rgb`, %45 opaklık | **Uyarı** |

`:371`'i accent'e çevirmek ölçülebilir bir zarar: kademe rengi, kullanıcının
PRD'de olduğunu gösteren işaret. Onu lime yapmak o bilgiyi siler.

Yapılacak tek şey: bu üç satıra, neden dile dahil OLMADIKLARINI söyleyen bir
yorum düşmek — yoksa bir sonraki geçişte biri onları "unutulmuş şerit"
sanacak.

```tsx
{/* Bu YATAY çubuk seçim göstergesi DEĞİL: SAP kademesinin (DEV/QA/PRD)
    kimlik rengi. Tasarım dilinin "sağlık/durum" satırına ait ve accent'e
    çevrilmez — kullanıcının hangi sistemde olduğunu gösteren işaret bu. */}
```

- [ ] **Adım 5: Hover'ı şeritten arındır**

Hover **yalnızca** `bg-hover`. Bir satır fare altındayken şerit gösteriyorsa
şeridi kaldır: şerit "buradasın" diyor, hover "buraya gidebilirsin" diyor;
ikisi aynı işareti kullanınca ikisi de anlamını kaybediyor.

- [ ] **Adım 6: `StatusDot`'a DOKUNMA**

`StatusDot` sağlık gösteriyor (bağlı / bağlanıyor / hata), seçililik değil.
Yeşili `--status-*` ailesinden ve accent'ten bağımsız kalmalı — kullanıcının
kayıtlı kararı: *"nokta accent DEĞİL, durum yeşili."*

Aynı şekilde `ActivityBar`'ın alt grup ikonları **dinlenme hâlinde rengini
korur** (kullanıcı kararı, 2026-09-06); üst/alt ayrımı saydamlıkla
(%75 → %100) yapılıyor, rengi silerek değil.

- [ ] **Adım 7: Doğrulamayı ve kapıları çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rn 'w-\[3px\]' src/ --include=*.tsx        # bekleniyor: bos
grep -rn 'h-\[3px\]' src/ --include=*.tsx        # bekleniyor: SystemPanel :371 ve :505
                                                 #   (Adim 4 — yatay kimlik cubuklari)
grep -rn 'bg-active text-white' src/ --include=*.tsx  # bekleniyor: bos
npm run typecheck
npm run build
```

- [ ] **Adım 8: Gözle bak**

`npm run dev`, koyu ve açık tema. Sırayla: sol ray · sistem listesi ·
SAP Launcher'ın iki durumlu anahtarları · Ayarlar sekmeleri ·
`SystemPanel` sekmeleri · sohbet oturum listesi.

**Tek soru:** Ekranı ilk kez gören biri, hangi öğenin seçili olduğunu
bakar bakmaz söyleyebilir mi — ve seçililiği her yerde AYNI işaretten mi
anlıyor?

- [ ] **Adım 9: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
Tek "secili" dili: alti ifade bire indi

- Secili = 2px accent serit + bg-accent-500/10 + accent-400 metin/ikon
- ActivityBar'in dikey seridi 3px'ten 2px'e: sohbet listesindeki 2px'lik
  seritle ayni ekranda yan yana duruyordu
- bg-active + text-white secili hallerinden kalkti; bg-active yalnizca
  notr dugme dolgusu ve hover olarak kaliyor
- Yatay segment denetimlerinde seritsiz ama ayni renk dili
- SystemPanel'in yatay cubuklari BILEREK disarida: :371 SAP kademesinin
  (DEV/QA/PRD) kimlik rengi, :565 uyari. Accent'e cevirmek kullanicinin
  hangi sistemde oldugunu gosteren isareti silerdi. Nedeni yoruma yazildi
- ChatBubble'daki w-[2px] serit degil, yazim imleci
- Hover artik yalniz bg-hover: serit "buradasin", hover "gidebilirsin"
- StatusDot ve ActivityBar alt grup renkleri kasitli olarak dokunulmadi
  (kullanicinin kayitli kararlari)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Görev 10: Ritim ve 48px başlık hizası

**Dosyalar:** Adım 1 ve Adım 4'ün grep'leri belirler.

**Arayüzler:** Yeni dosya yok. Tüketir: Görev 3 (`SectionLabel`),
Görev 8 (`Modal`'ın `h-12` başlığı).

İki ölçülen sorun:

1. **Keyfi boşluk.** `p-[13px]`, `gap-[7px]`, `mt-[9px]` gibi 4'e bölünmeyen
   değerler dağılmış durumda. Tek tek bakınca hiçbiri yanlış değil; bir arada
   ızgarayı yok ediyorlar.
2. **Başlık şeritleri hizasız.** Panel ve modül başlıkları 40px, 44px, 48px ve
   "dolgudan ne çıkarsa" yükseklikleriyle kurulmuş. Yan yana duran iki kolonun
   başlıkları birbirini tutmuyor, yani göz yatay bir çizgi bulamıyor.

- [ ] **Adım 1: Keyfi boşlukları ölç — doğrulama BAŞARISIZ olmalı**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rnoE '\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-[xy])-\[[0-9]+px\]' \
  src/ --include=*.tsx | sort | uniq -c | sort -rn
```

Her bulguyu şu kurala vur: **4'e bölünüyor mu?**
- Bölünüyorsa (`p-[8px]`, `gap-[16px]`) → Tailwind ölçeğine çevir
  (`p-2`, `gap-4`). Piksel değişmiyor, okunurluk artıyor.
- Bölünmüyorsa (`p-[13px]`, `gap-[7px]`) → **en yakın 4'ün katına yuvarla**
  ve ölçek sınıfını yaz.

- [ ] **Adım 2: Sabit kroma dokunma**

Bu kuralın dışında kalanlar — pikseli optik olarak seçilmiş, ızgaraya değil
kendi kabına bağlı sabit kabuk ölçüleri:

| Yer | Neden |
|---|---|
| `ActivityBar` ray genişliği (`w-12`) ve kutuları | Kullanıcının kayıtlı "daha dar ve daha sakin ray" kararı |
| Kenar çubuğu genişliği (272px) | Kullanıcı kararı |
| Aktif/seçili şerit (`w-[2px]`) | Görev 9'un dili |
| `Modal` genişlikleri | Görev 8'in `WIDTH` tablosu |
| Besteci (composer) iç ölçüleri | Kullanıcının kayıtlı "Gemini düzeni" kararı |
| `src/flows/flows.css` | Faz 4'e kadar kapsam dışı |

Şüphedeysen **dokunma** ve kullanıcıya sor. Bu görevin amacı ızgarayı geri
getirmek, kullanıcının verdiği kararları geri almak değil.

- [ ] **Adım 3: Doğrulamayı çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rnoE '\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-[xy])-\[[0-9]+px\]' \
  src/ --include=*.tsx
```

Beklenen: yalnızca Adım 2'nin tablosundaki yerler. Kalan her satırı
**kullanıcıya listele** ve neden kaldığını yaz.

- [ ] **Adım 4: Başlık şeritlerini ölç**

```bash
cd /c/workspace/aXet-SAP-Launcher
grep -rn 'border-b border-line' src/ --include=*.tsx | grep -E 'h-\[?[0-9]+' 
grep -rn 'h-10\|h-11\|h-12\|h-14\|h-\[4[0-9]px\]' src/components src/sapgui --include=*.tsx
```

Panel / modül / ekran başlığı olan her şerit **`h-12`** (48px) olur.

Neden 48: `Modal`'ın başlığı (Görev 8) zaten `h-12`, kabuğun üst şeridi de
öyle, ve 48 = 12 × 4 yani ızgaranın üstünde duruyor. Ayrıca `h-8`'lik bir
düğme + 2 × 8px dolgu tam 48 ediyor — yani başlığın içine düğme koyunca
yükseklik kendiliğinden oturuyor.

**Kapsam dışı:** satır yükseklikleri, liste öğeleri, çipler, sekme şeritleri.
Yalnızca **başlık şeritleri**.

- [ ] **Adım 5: Kapıları çalıştır**

```bash
cd /c/workspace/aXet-SAP-Launcher
npm run typecheck
npm run build
```

- [ ] **Adım 6: Gözle bak — bu görevin tek gerçek testi**

`npm run dev`. Pencereyi olabildiğince geniş yap, koyu ve açık tema.

Yan yana duran her kolon çiftinde (kenar çubuğu + içerik, sistem listesi +
`SystemPanel`, sohbet listesi + sohbet) **başlıkların alt kenarı aynı yatay
çizgide mi?** Değilse hangi şeridin kaçtığını bul.

Sonra bir modal aç: modalin başlık şeridi arkadaki kabuğun başlık şeridiyle
aynı yükseklikte mi?

- [ ] **Adım 7: İşle**

```bash
cd /c/workspace/aXet-SAP-Launcher
git add -A
git commit -F - <<'EOF'
Ritim: 4px izgara ve 48px baslik hizasi

- 4'e bolunmeyen keyfi bosluklar (p-[13px], gap-[7px] gibi) en yakin
  4'un katina yuvarlandi ve Tailwind olcek siniflarina cevrildi
- 4'e bolunen keyfi degerler piksel degismeden olcege gecti
- Panel/modul/ekran baslik seritleri h-12'de birlesti; yan yana duran
  kolonlarin baslik alt kenarlari artik ayni yatay cizgide
- Sabit krom (ray genisligi, kenar cubugu, serit, modal genislikleri,
  besteci) kasitli olarak disarida: pikselleri optik secilmis, izgaraya
  degil kendi kabina bagli

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Faz 0 bittiğinde

Uygulamanın tasarım dili artık **altı dosyada** yaşıyor:

| Dosya | Ne söylüyor |
|---|---|
| `tailwind.config.js` | Renk, yarıçap, **punto** ölçekleri — kapalı |
| `src/index.css` | Rol yüzeyleri, kenarlıklar, durum renkleri |
| `src/ui/buttons.ts` | Boy merdiveni, varyantlar, tonlar |
| `src/ui/Button.tsx` | Düğmenin biçimi |
| `src/ui/Field.tsx` | Girdinin biçimi ve **tek odak muamelesi** |
| `src/ui/Modal.tsx` | Örtünün biçimi, Esc, odak tuzağı |

Faz 1 (tek kabuk) bunun üstüne kuruluyor: kabuğu yeniden düzenlerken artık
"bu düğme neye benzemeli" sorusu sorulmuyor.

**Faz 0'ın vermediği şey:** ekranların yerleşimi değişmedi. Aynı ekranlar,
aynı yerlerde — sadece aynı dili konuşuyorlar. Kullanıcı "hâlâ dağınık"
derse doğru cevap Faz 1'dir, Faz 0'a dönmek değil.
