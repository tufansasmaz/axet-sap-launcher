# aXet SAP Launcher — Tasarım Sistemi ve Kabuk Yeniden Yapılandırması

**Tarih:** 2026-09-06
**Durum:** Tasarım onayı bekliyor
**Kapsam:** Faz 0 uygulanabilir ayrıntıda; Faz 1–4 yön ve kabul ölçütü düzeyinde.

---

## 1. Sorun

Uygulamanın renk katmanı bitti. `src/index.css` rol adlı yüzeyler (`app`/`sidebar`/
`card`/`raised`/`control`/`hover`/`active`), üç katmanlı kenarlık ad alanı
(`line-subtle`/`line`/`line-strong`), iki katmanlı lime (`accent-500` dolgu,
`accent-400` metin/ikon) ve üç ayrı dolgu-üstü-metin belirteci ile tutarlı.
Ham renk sınıfı kalmadı — kalan `bg-emerald-600`, `text-amber-200` gibi eşleşmelerin
hepsi kaldırılmış kodu anlatan YORUM satırlarının içinde.

Biten şey renk. **Bitmeyen şey dil.** Ölçülen durum:

| Alan | Bugün | Olması gereken |
|---|---|---|
| Düğme | `btn()`/`iconBtn()`/`tintBtn()` var; 9 dosyada 21 çağrı. Buna karşılık 25 dosyada ~150 elde yazılmış `cursor-pointer` sınıf dizesi. **Benimsenme %12.** | Tek ilkel, %90+ benimsenme |
| Girdi | 29 odak bildirimi, **7 farklı muamele**: `focus:border-accent-500` (çıplak), `/50`, `/60`, `focus:border-accent-500 + ring-2 + ring-accent-500/20`, `focus-within:border-accent-500`, `focus-within:ring-accent-500/40`, `focus:ring-0` | Tek odak muamelesi |
| Modal | 10 modal, **2 zemin muamelesi** (5'inde `animate-backdrop-fade-in backdrop-blur-sm`, 5'inde yok), **3 z katmanı** (50×5 / 60×4 / 70×1), her biri aynı flex kabuğunu yeniden yazıyor. Ayrıca `GuidePanel` z-30 çekmecesi. | Tek kabuk, tek z kaydı |
| Bölüm etiketi | Aynı anlamsal öğe **6 farklı biçimde** (10px/11px × `tracking-wide`/`tracking-wider` × `text-slate-300`/`400`/`500`) | Tek bileşen |
| Tipografi | Tailwind basamakları + `text-[10px]`/`[11px]`/`[13px]` gibi keyfi boyutlar yan yana | 6 basamaklı kapalı ölçek (bkz. 4) |
| "Seçili" | **4+ lehçe**: ray (lime şerit + yıkama), sistem satırı (lime yıkama + şerit), SAP Launcher segmentleri (`bg-active text-white`), dosya ağacı (bir başkası) | Tek dil |
| Başlık yüksekliği | Bir kenar çubuğunda 54px, diğerinde ölçüsüz `p-2` | Her yerde 48px |

Bunun altında **yapısal** bir sorun var. ActivityBar üç birbirini dışlayan modül
arasında geçiş yaptırıyor ve her modül kendi mobilyasına sahip: kendi kenar çubuğu,
kendi başlığı, kendi seçili dili. Yani modül değiştirmek **terk etmek** demek.
Bu, kullanıcının kendi kimlik cümlesiyle çelişiyor:

> "kullanıcı sadece AI'a soru sormuyor, sistemlerine bağlı bir AI çalışma ortamı
> kullanıyor."

Sistemine bağlı bir çalışma ortamında SAP bağlamı, sohbete geçince kaybolmamalı.

## 2. Referans ve seçilen yaklaşım

İncelenen: Claude Code, Codex, ChatGPT, Gemini, vi3ecode. Kullanıcının açıkça
tercih ettiği model **vi3ecode**.

> Not: `https://vi3ecode.com/` HTTP 403 döndürdü. Elimizde vi3ecode'un **bilgi
> mimarisi ve ilan ettiği ilkeler** var; piksel düzeyinde tasarımı yok. Aşağıdaki
> çıkarım ilkelere dayanıyor, ekran görüntüsüne değil.

Seçilen yaklaşım — **A: Tek çalışma alanı**. Modüller ayrı "uygulamalar" olmaktan
çıkıp tek bir kabuğun **panelleri** olur. Bağlam (hangi SAP sistemine bağlısın)
kabukta yaşar, panelde değil. Reddedilen alternatifler: (B) yalnız dili birleştirip
yerleşime dokunmamak — ölçülen sorunun yarısını çözüyor; (C) sıfırdan yeniden yazım —
çalışan bir uygulamayı riske atıyor, kullanıcının "temel sağlam" değerlendirmesiyle
çelişiyor.

**Yönetici kural:** *Daha fazla arayüz değil → daha güçlü hiyerarşi.* Bu belgedeki
hiçbir madde açılış ekranına yeni büyük bileşen eklemez.

## 3. Fazlar

| Faz | Ne | Kabul ölçütü |
|---|---|---|
| **0** | Dil temeli: tipografi ölçeği, ilkeller, tek "seçili" dili, z kaydı, ritim | Bu belgenin 4–8. bölümleri |
| **1** | Tek kabuk: ortak kenar çubuğu iskeleti, ortak başlık, ortak panel sistemi | Modül değişince kenar çubuğu ve başlık YERİNDE kalır |
| **2** | Tek çalışma alanı: paneller/dock'lar, sistem = bağlam, GUI Scripting = panel | Bağlı sistem her modülde görünür |
| **3** | Ekran ekran cila: açılış, sohbet, sistem, ayarlar | — |
| **4** | Flows'u geri açmak | Kullanıcının kararı |

Faz 0 aşağıda uygulanabilir ayrıntıda. Faz 1–4 ayrı spec'ler olacak; her biri kendi
brainstorm → spec → plan döngüsünü görecek.

---

# FAZ 0

## 4. Tipografi ölçeği

Altı basamaklı, kapalı ölçek. Keyfi `text-[Npx]` yasak.

"Bugünkü kullanım" sütunu, o basamağa **göç edecek** yerlerin sayısıdır (bugünkü
Tailwind sınıfı + eşdeğer keyfi boyutlar birlikte sayılmıştır), bugünkü sınıfın
ham sayısı değil.

| Ad | Boyut | Görevi | Bugünkü kullanım |
|---|---|---|---|
| `text-2xs` | 10px | Yalnız hap/rozet içi | 54 |
| `text-xs` | 11px | Üst veri, ikincil satır, bölüm etiketi | 95 |
| `text-sm` | 12px | **Arayüz varsayılanı**: düğme, liste satırı, alan | 145 |
| `text-base` | 13px | Gövde: sohbet mesajı, kart metni | 11 |
| `text-lg` | 15px | Bölüm/modal başlığı | 7 |
| `text-xl` | 19px | Ekran başlığı | 3 |

`text-2xl` ve üstü ölçekte YOK. Selamlama ölçeğin dışında kalır
(`--chat-hero-size`, kullanıcı ayarlanabilir).

### Uygulama yöntemi

`tailwind.config.js` içindeki `fontSize` ölçeğinin **kendisi yeniden tanımlanır** —
bu depoda `borderRadius` için zaten kanıtlanmış teknik (config'te bunu belgeleyen
yorum duruyor).

Dürüst sonuç: `text-sm` 14px→12px, `text-xs` 12px→11px düşer; arayüz bir kademe
sıkışır. Bunu takiben ~15 yer (modal gövdeleri, boş durum metinleri) elle doğru
basamağa yükseltilir.

Reddedilen alternatif: yeni adlar + ~380 sınıf göçü. Aynı sonucu 25× işle veriyor.

## 5. İlkeller — `src/ui/`

### 5.1 `Button.tsx`

`btn()`'in neden %12'de kaldığı ölçüldü: gerçek düğmeler **koşullu yerleşim**
istiyor (daraltılmış kenar çubuğu, `flex-1`, yalnız-ikon) ve `btn()`'in sabit
`px-4`'ü bununla çakışıyor. Çözüm "daha çok `btn()` kullan" değil; ilkelin
uygulamanın gerçekten ihtiyaç duyduğunu ifade edebilmesi.

Sınıf dizesi üreten fonksiyon değil, **gerçek React bileşeni** — `disabled`,
`title`, `aria-*`, `type` tek yerden tutarlı gelsin.

```
Button {
  variant : "primary" | "neutral" | "ghost" | "danger" | "tint"
  tint    : "accent" | "sap" | "terminal" | "project"   // variant="tint" iken
                                                        // "project" YENİ: bugün
                                                        // tintBtn'de yok, ama
                                                        // --project-500-rgb var
                                                        // ve "Yeni proje" düğmesi
                                                        // onu elde kullanıyor
  size    : "xs"(24) | "sm"(28) | "md"(32) | "lg"(36)
  icon    : boolean   // kare, dolgu boyuttan türer
  block   : boolean   // w-full
  grow    : boolean   // flex-1 min-w-0
  className : string  // yalnız yerleşim; renk/dolgu geçersiz kılınamaz
}
```

Dolgu boyuttan türer. `className` yalnız **yerleşim** içindir; renk ve dolgu
geçersiz kılınamaz — `btn()`'in bugün elde yazılmasına yol açan çakışmanın kaynağı
buydu.

`src/ui/buttons.ts` içindeki kural aynen korunur ve bileşene taşınır:
**bir ekranda aynı anda EN FAZLA BİR `primary`.** Açılış ekranında bu "Yeni sohbet";
Send yalnız gönderilecek bir şey varken çizildiği için kural bozulmuyor.

Göç: eski `btn()`/`iconBtn()`/`tintBtn()` fonksiyonları Faz 0 boyunca **kalır**
(21 çağrı yerinde çalışır), bileşene sarmalanır, Faz 3'te kaldırılır.

### 5.2 `Field.tsx`

29 odak bildirimi, 7 muamele → **tek** muamele:

| Durum | Görünüm |
|---|---|
| Durgun | `border-line bg-control` |
| Hover | `border-line-strong` |
| Odak | `border-accent-500` + `ring-2 ring-accent-500/20` |
| Hata | `border-[var(--status-danger-border)]` + altında `text-xs` hata metni |
| Devre dışı | `opacity-50 cursor-not-allowed` |

Boyutlar `Button` ile **aynı merdivenden** (24/28/32/36) — bugün hiçbir yerde bir
alan ile yanındaki düğme aynı hizada değil.

Bilinen tuzak, ilkelin içinde bir kez çözülür: Tailwind `hover:` kurallarını
`focus-within:` kurallarından SONRA, eşit özgüllükte yayıyor; bu yüzden hover odağı
sessizce eziyor. Çözüm `[&:hover:not(:focus-within)]:…`.

Kapsam: `input` (text/password/number/search), `textarea`, `select`. Sohbet
bestecisi (composer) **hariç** — kullanıcının açıkça kararlaştırdığı tek satırlık
"Gemini düzeni" kendi kuralları altında kalır.

### 5.3 `Modal.tsx`

10 kabuk → 1.

- Zemin: `bg-[var(--overlay-scrim)]` + `backdrop-blur-sm` + `animate-backdrop-fade-in`
  — **her modalde**, bugün 10'un 5'inde eksik.
- `size`: `sm`(400) / `md`(560) / `lg`(720) / `xl`(920)
- Yuvalar: başlık (başlık metni + kapat), gövde (kaydırılabilir), altlık
  (eylemler sağa yaslı, `primary` en sağda)
- Davranış: Esc ile kapanma, zemin tıklamasıyla kapanma, **odak tuzağı**, açılışta
  ilk odaklanabilir öğeye odak, `<body>` kaydırma kilidi
- z: `layers.modal` (bkz. 5.6)

Bugün her modal bunların bir alt kümesini yeniden yazıyor; bazıları odağı hiç
tutmuyor — bu bir erişilebilirlik hatası, yalnızca tutarsızlık değil.

### 5.4 `SectionLabel.tsx`

6 çeşit → 1: `text-xs` · `font-semibold` · `uppercase` · `tracking-wider` ·
`text-slate-500`. Sağda isteğe bağlı eylem yuvası — "SON ÇALIŞMALAR … Tümünü gör →"
kalıbı, ki şu an elde yazılı.

### 5.5 `Panel.tsx`

Kenarlıklı yüzey: `rounded-lg border border-line-subtle bg-card`.

| Varyant | Davranış |
|---|---|
| `flat` | Hover yok — bilgi kutusu |
| `interactive` | Hover → `border-line bg-raised` — tıklanabilir kart/satır |
| `inset` | `bg-app` — çukur alan, kod/çıktı bloğu |

Öneri kartları, son-çalışma satırları, boş durum kutuları ve sistem satırları bugün
bunu tek tek elde yazıyor.

### 5.6 `layers.ts`

```
dropdown 30 · sticky 40 · overlay 50 · modal 60 · toast 70 · tooltip 80
```

Adlandırılmış kayıt. Bugün 50/60/70 modal başına rastgele seçiliyor; iki modal
üst üste gelince hangisinin kazanacağı tesadüf.

## 6. Tek "seçili" dili

Dört durum, dört ayrı ifade, örtüşme yok:

| Durum | Anlam | İfade |
|---|---|---|
| **Seçili/aktif** | "buradasın" | soldan 2px `accent-500` şerit + `bg-accent-500/10` + ikon `accent-400` |
| **Hover** | "bunun üzerindesin" | `bg-hover`, şerit yok |
| **Sağlık/durum** | "bu şey nasıl" | `--status-*`, **asla accent** |
| **Odak** | "klavye burada" | `accent-500` kenarlık + `accent-500/20` halka |

Bu dil bugün 4+ lehçeye bölünmüş durumda. Hepsi buna göçer:

- ActivityBar rayı — bugün 3px şerit; 2px'e iner. Genişlik 2px seçildi çünkü sistem
  satırı zaten `w-[2px]` kullanıyor ve iki şerit aynı ekranda yan yana görünüyor;
  ikisinden birinin değişmesi gerekiyordu, azınlıkta olan ray.
- Sistem satırı (AxetCodeHome) — zaten uyumlu, dokunulmaz
- SAP Launcher segmentli geçişi — `bg-active text-white` bırakılır
- Dosya gezgini ağacı — kendi lehçesi bırakılır

**Korunan ayrım** (kullanıcı kararı, 2026-09-06): `StatusDot` **sağlık**tır, durum
yeşilini kullanır ve accent'e ÇEVRİLMEZ. Satır vurgusu **etkinlik**tir ve lime
kullanır. İkisi aynı satırda yan yana durabilir; farklı şeyler söylüyorlar.

**Korunan karar** (kullanıcı isteği, 2026-09-06): ActivityBar alt grup ikonları
durgun hâlde RENKLİ kalır. Üst/alt ayrımı opaklıkla (%75→%100) yapılır, renk
kaldırarak değil.

## 7. Ritim

4px ızgarası. İzinli boşluk basamakları Tailwind'in `1 / 1.5 / 2 / 2.5 / 3 / 4 /
6 / 8 / 10 / 12` değerleri. Keyfi piksel boşluk yasak — **istisna yalnız gerçek
sabit mobilya**: ray genişliği (48px), başlık yüksekliği, yeniden boyutlandırılabilir
kenar çubuğunun satır içi `style` genişliği.

**Tüm panel/modül başlıkları 48px'e (`h-12`) hizalanır.** Bugün bir kenar çubuğunda
54px, diğerinde ölçüsüz `p-2`. Bu, Faz 1'deki ortak başlığın önkoşulu: iki modül
farklı yükseklikte başlık taşıdığı sürece "kabuk yerinde kalıyor" hissi kurulamaz.

## 8. Değişmezler (bozulmayacak)

Bu belgedeki hiçbir madde aşağıdakileri değiştirmez:

1. `--*-rgb` değişkenlerine `#hex` yazılmaz; boşlukla ayrılmış RGB üçlüsü kullanılır.
2. Koyu ve açık tema blokları **her** değişkeni aynalar.
3. Yüzey sıralaması: `hover` ve `control`, `border-subtle`'dan KOYU kalır;
   `active` (#2a2f3b), `border-line`'dan (#333a48) koyu. Açık temada ters.
4. `text-accent-500` kullanılmaz — açık temayı bozar. Metin/ikon `accent-400`.
5. `bg-base-*` yazılmaz. Ham `--base-*-rgb` rampası yalnız `src/flows/flows.css`
   (157 başvuru) için takma ad katmanı olarak yaşar.
6. Gradyan / parlama / dekoratif efekt yok (`src/index.css` başındaki kural).
7. Depo **Prettier biçimli değil**. `prettier --write` çalıştırılmaz — ~110 sütunluk
   ev düzenini 80'e indirir.
8. Kapılar: `npm run typecheck` (iki tsconfig) + `npm run build`. eslint yapılandırması yok.
9. i18n: `tr.ts`'e eklenen her anahtar `en.ts`'e de eklenir, yoksa typecheck kırılır.
10. Tailwind **kaynak metnini** tarar; çalışma zamanında birleştirilen sınıf dizeleri
    hiç yayılmaz.

## 9. Doğrulama

Faz 0 için:

- `npm run typecheck` ve `npm run build` temiz.
- Açık ve koyu temada gözle geçiş: ray, açılış ekranı, sistem listesi, 10 modalin
  her biri, ayarlar.
- Sayısal kontrol: `text-\[[0-9]+px\]` eşleşmesi yok (selamlama değişkeni ve
  FileViewer'ın belge önizlemesi hariç); odak muamelesi 7→1; modal kabuğu 10→1.
- `Button` benimsenmesi: elde yazılmış `cursor-pointer` sınıf dizesi sayısı ~150'den
  20'nin altına iner.

Otomatik test yok — bu depoda test altyapısı bulunmuyor; kapılar typecheck ve
build'dir. Bunu değiştirmek bu spec'in kapsamı dışında.

## 10. Kapsam dışı

- Faz 1–4 (ayrı spec'ler).
- axet.flows / axet.flows Live'ın geri açılması — kullanıcının kararı, Faz 4.
- Sohbet bestecisinin tek satırlık düzeni — kullanıcının kayıtlı kararı.
- Açılış ekranının kendi sütun genişliğine kavuşup kavuşmayacağı — açık soru,
  bugün besteci ve mesaj listesiyle paylaşılan `max-w-5xl`'e bağlı.
- Test altyapısı kurmak.
