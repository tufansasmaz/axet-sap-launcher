# İsimlendirme Standardı (AI Kullanımı İçin)

> **Bu dosya, TS içindeki her Z/Y nesnesinin adının üretildiği TEK kaynaktır.**
> Kaynaklar:
> - `ai-naming-standard-07072026-yek.xlsx` (Standart + RAP + Kılavuz sayfaları) — proje-özel RAP/CDS detay formülleri
> - `NTTDATA_Development_Naming_Guideline_2.0.pdf` (14.08.2026) — NTT DATA/TR kurumsal geliştirme
>   standardı. Nereden ne geldiği **bölüm başlıklarındaki [K] / [K!] / [P] işaretlerinde** yazılı
>   (hemen aşağıda).
>
> **Bir kural neden öyle?** Gerekçeler, bırakılan eski biçimler ve kılavuzdan bilerek alınmayan
> satırlar ayrı dosyada: [`NAMING_STANDARD_HISTORY.md`](NAMING_STANDARD_HISTORY.md). Buradaki
> karar notları oraya bağlantı taşır (`→ H1`, `→ H2` …). O dosya **kural içermez**; çelişkide
> bu dosya kazanır.
>
> Düzenlenebilir: satır ekle/çıkar/düzelt. Değiştirdikten sonra agent'lar otomatik bu dosyayı okur.
> Son güncelleme: 2026-08-15. Kaynağı katalogdur (2026-08-02'de FS-to-TS projesinden `ts-generator`
> skill'ine alındı); değişiklikler bu dosyada yönetilir. Reçetenin (CLAUDE.md) "Namespace / paket"
> alanı `<Prefix1>` ve `<PkgNo>` varsayılanlarını proje bazında belirler; çelişkide reçete kazanır.

---

## Köken işaretleri — bu dokümanı okurken

Her bölüm başlığı, kuralın **nereden geldiğini** söyleyen bir işaret taşır. Tek soruyu
cevaplar: *kurumsal kılavuzun yeni sürümü çıktığında bu satırı yeniden kontrol etmem
gerekir mi?*

| İşaret | Anlamı | Yeni kılavuz sürümünde |
|---|---|---|
| **[K]** | Kurumsal kılavuzdan, olduğu gibi | Evet — mekanik olarak karşılaştır |
| **[K!]** | Kılavuzda satırı var ama **bilerek saptık**; gerekçe yazılı | Evet — ama karar gerektirir, mekanik güncelleme yapma |
| **[P]** | NTT/TR proje pratiği; kılavuz bu konuda **susuyor** | Hayır — kılavuz değişse de bu bölüm bizimdir |

[K] bölümlerin içinde farklı köken taşıyan tek tük satırlar **kendi işaretini taşır**;
işaretsiz her satır bölümün işaretini devralır.

> **Her kural ileri dönüktür — belge geneli.** Bir formül değiştiğinde o formülle üretilmiş
> mevcut nesneler ve TS'ler **yeniden adlandırılmaz**; yeni kural yalnızca o tarihten sonraki
> üretimler için geçerlidir. Bu her bölümde ayrı ayrı yazmıyor, çünkü istisnası yok.

**Neden var:** v1.1'den v2.0'a bir ay geçti ve "yeni kılavuz bizde neyi değiştiriyor"
sorusunu cevaplamak 640 satırı baştan okumak demekti. Bir dahaki sürümde [K] ve [K!]
satırlarına bakmak yeter. Ters yönü de aynı derecede önemli: [P] işaretli bir bölüm,
kılavuzda karşılığı olmadığı için "eskimiş" sanılıp silinmemeli ya da kılavuzun hiç
bahsetmediği bir yöne "düzeltilmemelidir".

---

## 0. [K] Clean Core Seviyeleri (referans — karar ağacı ts-generator SKILL.md STEP 3'te; obje release durumu için `clean-core` skill'i)

| Seviye | Tanım | Teknoloji |
|---|---|---|
| A — En Temiz | ABAP Cloud on-stack veya BTP side-by-side | RAP, CAP, Low-Code/No-Code, Released API |
| B — Temiz | Classic ABAP + Classic API, SAP önerileriyle uyumlu | Classic ABAP, Classical API |
| C — Koşullu | SAP internal nesneler; upgrade-öncesi kontrol gerekir | Rastgele SAP nesneleri |
| D — Temiz Değil | Modifikasyon, önerilmeyen nesneler, implicit enhancement | Modifikasyon, Implicit Enh. |

## 0.1 [K] WRICEF Kategori Kodları

| Kategori | Kod | Açıklama |
|---|---|---|
| Workflow | `W` | Süreç otomasyonu: onay, bildirim, event tetikleyici |
| Report | `R` | SAP'ten veri çekip kullanıcı dostu sunum |
| Interface | `I` | SAP ↔ dış sistem veri transferi (inbound/outbound) |
| Conversion | `C` | Legacy/diğer sistem verisini SAP formatına çevirme |
| Enhancement | `E` | Standartta olmayan özel işlevsellik |
| Form | `F` | Basılı/elektronik doküman (fatura, SAS, sevkiyat) |

---

## 1. [P] Token Sözlüğü (formüllerde kullanılır)

| Token | Anlam | Örnek |
|---|---|---|
| `<Prefix1>` | Birincil prefix | `Z`, `Y` (kütüphanede `ZGNL`) |
| `<Prefix2>` | Obje türüne özgü ikincil prefix | `P`=Program, `I`=Include, `T`=Tablo, `CL`=Class, `FG`=Function Group |
| `<Module>` | SAP modül kodu | `SD`, `MM`, `FI`, `CO`, `PP` |
| `<PkgNo>` | Paket numarası (3 hane) | `001` |
| `<Description>` | Anlamlı açıklama, **BÜYÜK_HARF_ALT_ÇİZGİ** | `SALES_LIST` |
| `<Suffix>` | Ek (include vb.) | `F01`, `F02` |
| RAP kısa biçim: `{M}` | Modül | `MM` |
| RAP kısa biçim: `{N}` | Paket No (varsayılan `001`) | `001` |
| RAP kısa biçim: `{D}` | Açıklama (UPPER_SNAKE) | `PR_QTY_SYNC` |

**Genel kurallar:**
- Ad Max Uzunluğa sığmıyorsa `<Description>` otomatik kısaltılır (anlam korunur).
- Paket no belirsizse geçici varsayılan `001` kullan ve TS'te "paket no teyit edilecek" notu düş.
- Modül, FS'in "Talep Eden Modül Danışmanı" alanından alınır (MM009 → `MM`).

### 1.1 [P] `<Description>` nasıl seçilir — eklendi 2026-08-05

`<Description>` teknik adın **tek anlam taşıyan** parçasıdır; geri kalanı formüldür.
Bu yüzden rastgele değil, **nesnenin ne yaptığından türetilir**.

**Dil: İNGİLİZCE.** Teknik adlar her zaman İngilizce, `BÜYÜK_HARF_ALT_ÇİZGİ`.
Türkçe karakter, Türkçe kelime ve harf çevirisi (`IHTIYAC`, `SATINALMA`) kullanılmaz —
adlar sistem genelinde aranabilir ve uluslararası ekiplerce okunabilir olmalıdır.
Kullanıcıya görünen metinler bunun tersidir; oraya §3.3 bakar.

| | |
|---|---|
| ✅ | `REQ_SOURCE`, `SALES_LIST`, `PR_QTY_SYNC`, `STOCK_AGING` |
| ❌ | `IHTIYAC_KAYNAK` (Türkçe) · `MM019` (ID) · `PROGRAM`, `REPORT`, `CLASS` (tip) |
| ❌ | `TEST`, `TMP`, `NEW`, `FINAL`, `V2`, `Z1` (geçici/anlamsız) · `ONER`, `20260805` (kişi/tarih) |

**Seçim yolu:** FS'teki iş ihtiyacını bir cümleyle söyle, o cümlenin **nesnesini ve
eylemini** al, 1–3 kelimeye indir.

```
İhtiyaç ve satınalma taleplerinin kaynak takibi   -> REQ_SOURCE
Satınalma talebi miktarını SAP'ye senkronlar      -> PR_QTY_SYNC
Stok yaşlandırma raporu                            -> STOCK_AGING
```

**Bir geliştirme = bir `<Description>`.** Aynı işi oluşturan program, include, sınıf,
yapı ve tablo tipi aynı gövdeyi paylaşır; farklılaşma `<Prefix2>` ve suffix ile olur.
Böylece SE80'de yan yana dizilirler:

```
TS'te (paket henüz belli değil)      Geliştirme başlayınca (<ZPKG> = ZMM013)
<ZPKG>_P_REQ_SOURCE      program     ZMM013_P_REQ_SOURCE
<ZPKG>_I_REQ_SOURCE_TOP  include     ZMM013_I_REQ_SOURCE_TOP
<ZPKG>_CL_REQ_SOURCE     class       ZMM013_CL_REQ_SOURCE
<ZPKG>_S_REQ_SOURCE      struct      ZMM013_S_REQ_SOURCE
```

Kısaltma yalnızca MaxLen zorladığında yapılır ve **yerleşik** kısaltmalar seçilir
(`QTY`, `DOC`, `REQ`, `CUST`, `MAT`, `PLNT`); sesli harf atarak uydurma kısaltma
(`SLSLST`) üretilmez. Kısaltıldıysa TS'te tam hâli bir kez yazılır.

### 1.2 [P] TS'te paket adı: `<ZPKG>` yer tutucusu — eklendi 2026-08-06

`<Modül><PkgNo>` **TS yazılırken bilinemez.** Paket, geliştirme sisteminde o an
sıradaki boş numaradır; TS ise geliştirme başlamadan önce yazılır. Araya başka bir
geliştirme girerse TS'teki numara sessizce yanlışa döner — ya kullanılmaz ya da
başka birinin paketiyle çakışır.

Bu yüzden TS **hiçbir zaman somut paket adı taşımaz.** Adın değişken kısmı tek bir
yer tutucuyla yazılır — paketin kendisi `<ZPKG>`, nesneler `<ZPKG>_P_REQ_SOURCE` biçiminde
(§1.1'in son bloğu bu dört nesneyi çözülmüş hâlleriyle yan yana gösterir).

**Neden açılı parantez:** `<` ve `>` ABAP nesne adında geçemez. Yani `<ZPKG>_P_...`
yanlışlıkla kopyalanıp sisteme yazılamaz — aktivasyon anında hata verir. `ZXXYY_P_...`
gibi bir yer tutucu ise **geçerli bir addır** ve sessizce yaratılabilir; o yüzden
kullanılmaz.

**Tek token, tek ikame.** `<ZPKG>` çözüldüğünde (ör. `ZMM013`) paketin kendisi ve
o pakete ait bütün nesneler aynı anda somutlaşır; TS'te düzeltilecek ikinci bir yer
kalmaz. `<Description>` gövdesi zaten §1.1'de sabitlenmiştir, dolayısıyla belirsiz
olan tam olarak bu tek parçadır.

Kullanılmayan biçimler: `ZMM999`, `ZXXYY`, `Z???`, `TBD`, boş bırakma. İlk ikisi
gerçek ad sanılır, son ikisi ikame edilecek yeri belirsiz bırakır.

> Yer tutucu **yalnızca paket için** geçerlidir. Transport request de TS'te
> yazılmaz ama o bir ad değil, çalışma anı kararıdır — geliştirme başlarken
> sorulur (bkz. `sap-adt` skill'i, geliştirme öncesi üç soru).

---

## 2. [K] Paket Adlandırma

> Hiyerarşi dört katmandır. TS üretiminde pratikte kullanacağımız katman **kalem paketi**
> (`ZSD001` gibi) — Root/Module katmanları sistemde zaten var olan, TS başına yeniden
> oluşturulmayan idari üst paketlerdir. Kök paketin adı **`ZROOT`**; alt çizgili `Z_ROOT`
> kullanılmaz (bazı sistemlerde ikisi birden bulunur, ör. Beta Enerji)
> → [H1](NAMING_STANDARD_HISTORY.md#h1).

| Tip | Paket | Açıklama |
|---|---|---|
| Root | `ZROOT` | Tüm geliştirmelerin ana kök paketi (idari, TS'te oluşturulmaz) |
| Module | `ZSD` | Modül ana paketi, numarasız (idari, TS'te oluşturulmaz) |
| Module General | `ZSD000` | Modülün **genel** geliştirme paketi — bkz. altındaki kapsam kuralı |
| Item | `ZSD001` | Kalem geliştirme paketi — **TS'lerin fiilen kullandığı seviye** |

> **[P] `Z<Modül>000` neyi alır — kapsam kuralı.** Modül genel paketine yalnızca
> **belirli bir WRICEF kalemine ait olmayan, genel geliştirmeler** girer: BAdI implementasyonları,
> enhancement implementasyonları, ek alanlar (custom field / append / customizing include).
> Bunlar tek bir talebe ait olmadıkları, modül boyunca yaşadıkları ve tipik olarak birden çok
> geliştirme tarafından paylaşıldıkları için kalem paketine hapsedilmezler.
> Bir WRICEF talebine ait her şey — program, sınıf, CDS, form, servis — **000'a değil, kendi
> kalem paketine** (`ZSD001`, `ZSD002`…) girer.
>
> Kurumsal kılavuz v2.0 bu paketi "Module General Package" diye tanıtır ama içine ne gireceğini
> söylemez; yukarıdaki kapsam kuralı bizimdir. v2.0'ın BAdI örneği (`ZSD000_IMP_PO_CUST`) bu
> okumayı doğruluyor.

**Numaralandırma kuralları:**
- Numaradan önce alt çizgi YOK: `ZSD001`, `ZSD_001` DEĞİL.
- **`000` modül genel paketine ayrılmıştır**; kalem paketleri `001`'den başlar.
- Paket numarası (001, 002, 003…) **tamamen sıralıdır, WRICEF tipini göstermez** — MM009 için `ZMM001`
  seçilmesi "MM009 = paket 001" anlamına gelmez, sıradaki boş numaradır.
- Tüm paketler varsayılan olarak Cloud geliştirme paketidir, ek suffix gerekmez.

> **Namespace prefix (`/NTT/…`) — proje TS'inde kullanılmaz.** v2.0, kütüphane ya da ürün
> olarak geliştirilen uygulamalarda `Z/Y` yerine tescilli bir namespace öneki öngörüyor.
> Müşteri projelerinde teslim edilen geliştirmeler bu kapsama girmez; TS `Z` ile yazılır.
> Bu satır, ajanın kendiliğinden bir namespace uydurmaması için burada.

---

## 3. [K] Standart İsimlendirme — Klasik Z/Y Objeleri

> **[P] `ZND_FG_AUTO_GEN` / `ZND_FM_<ARAC>` — kit araçları, LOKAL.** Kitin SAP sistemine
> kurduğu yardımcı nesneler bu adları kullanır ve **`$TMP`'de** yaşar. Bunlar
> geliştirme değil **araçtır**: WRICEF numarası almazlar, TS'te geçmezler,
> transport edilmezler, silinebilirler. Proje nesneleri için `Z<Modül><PkgNo>_...`
> kalıbı geçerlidir — ikisi çakışmaz.
>
> Adları `ZNT_FM_*` idi, 2026-08-14'te `ZND_FM_*` oldu. Kurumsal kılavuz v2.0 aynı
> tarihte `ZND`'yi paylaşılan bileşen ailesi olarak tanımladı (Bölüm 6). **Bu bir
> çakışma değildir, çünkü kit nesneleri `$TMP`'de kalır:** taşınabilir bir pakete
> hiç girmezler, dolayısıyla `ZND_ROOT` ağacında bir yer işgal etmezler. Bir
> sistemde `ZND_FG_AUTO_GEN` gören biri bunun paylaşılan bir bileşen değil, kitin
> geçici üreticisi olduğunu `$TMP` üyeliğinden anlar.


| # | Obje Türü | P1 | P2 | Modül | MaxLen | Formül | Örnek | Not |
|---|---|---|---|---|---|---|---|---|
| 1 | Package | Z | — | SD | 30 | `<Prefix1><Module><PkgNo>` | `ZSD001` | |
| 2 | Report / Program | Z | P | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_P_INVOICE_REPORT` | **[K!]** Kılavuz `P / R` veriyor, biz `P`'ye daralttık — bkz. not altta. ⚠ Classic — **dil sürümü** |
| 3 | Include | Z | I | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>_<Suffix>` | `ZMM001_I_INVOICE_REPORT_TOP` | **[K!]** `<Suffix>` rol kodu bizim eklememiz (§3.1); kılavuzda suffix yok. ⚠ Classic — **dil sürümü** |
| 4 | OData Service | Z | ODS | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>_<Suffix>` | `ZSD001_ODS_CUSTOMER_O2` | Suffix `O2` ya da `O4` |
| 5 | Function Group | Z | FG | SD | 26 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_FG_INVOICE` | ⚠ Classic — **dil sürümü**. Cloud-ready değil, class'a sarmalanmalı |
| 6 | Function Module | Z | FM | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZMM001_FM_INVOICE_OUTPUT` | ⚠ Classic — **dil sürümü**. Cloud-ready değil |
| 7 | Class | Z | CL | SD | 30 | `<Prefix1><Prefix2>_<Module><PkgNo>_<Description>` | `ZCL_SD001_SALES_ORDER` | |
| 8 | Interface | Z | IF | SD | 30 | `<Prefix1><Prefix2>_<Module><PkgNo>_<Description>` | `ZIF_SD001_SALES_API` | |
| 9 | Exception Class | Z | CX | SD | 30 | `<Prefix1><Prefix2>_<Module><PkgNo>_<Description>` | `ZCX_SD001_INVALID_QTY` | |
| 10 | Test Class | Z | TC | SD | 30 | `<Prefix1><Prefix2>_<Module><PkgNo>_TC_<Description>` | `ZCL_MM001_TC_PO_TEST` | Kurumsal kılavuzla eklendi |
| 11 | Table | Z | T | SD | 16 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_T_SLOG` | |
| 12 | Table Type | Z | TT | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_TT_SALES` | |
| 13 | Structure | Z | S | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_S_SALES_HDR` | |
| 14 | Append Structure | Z | ZZ | SD | 30 | `<Prefix1><Prefix2><StandartTablo>` | `ZZMARA` | Kurumsal kılavuzla eklendi — custom field append'i |
| 15 | Data Element | Z | E | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_E_STATUS` | |
| 16 | Domain | Z | D | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_D_STATUS` | |
| 17 | Search Help | Z | SH | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_SH_CUSTOMER` | CDS view alternatifi tercih edilmeli |
| 18 | Message Class | Z | MC | SD | 20 | `<Prefix1><Module><PkgNo>_<Prefix2>` | `ZSD001_MC` | |
| 19 | Number Range | Z | NR | SD | 10 | `<Prefix1><Module><PkgNo>_<Prefix2>` | `ZSD001_NR` | v2.0 ile alt çizgi eklendi (eski: `ZSD001NR`) |
| 20 | Transaction Code | Z | — | SD | 20 | `<Prefix1><Module><TcodeNo>` | `ZSD007` | ⚠ Numara **tcode'un kendi sırasıdır**, paket numarası değil — bkz. not altta. Cloud-ready değil |
| 21 | Maintenance Table | Z | T | SD | 15 | `<Prefix1><Module><PkgNo>T` | `ZSD001T` | **[P]** Kılavuzda satırı yok |
| 22 | Custom Field | Z | ZZ1_ | — | 30 | `<Prefix1><Prefix2><Description>` | `ZZ1_DESC` | Kurumsal kılavuzla eklendi |
| 23 | Customizing Include (EEW*, CI_*) | Z | ZZ_ | — | 30 | `<Prefix1><Prefix2><Description>` | `ZZ_DESC` | Kurumsal kılavuzla eklendi |
| 24 | Enhancement Implementation | Z | ENH | SD | 30 | `<Prefix1><Module>000_<Prefix2>_<StandartObje>` | `ZSD000_ENH_MV45AFZZ` | **[K!]** Kılavuz örneği `ZSD001_...`; biz §2 kapsam kuralı gereği 000'a aldık. Yalnızca custom'da kullanılır |
| 25 | BAdI Implementation | Z | IMP | SD | 30 | `<Prefix1><Module>000_<Prefix2>_<Description>` | `ZSD000_IMP_PO_CUST` | BAdI implementasyon ID'si. **Modül genel paketine girer** (§2) |
| 26 | Authorization Object | Z | Aut | — | 10 | `<Prefix1>_<Description>` | `Z_PORGIN` | ⚠ Formül değişti, bkz. not altta |
| 27 | Smart Form | Z | SF | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_SF_INVOICE` | |
| 28 | Smart Style | Z | SS | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_SS_INVOICE` | |
| 29 | Adobe Form | Z | AF | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_AF_INVOICE` | |
| 30 | Adobe Interface | Z | IF | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZSD001_IF_INVOICE` | ⚠ ABAP Interface class (`ZIF_…`) ile önek konumu farklı, karıştırma |
| 31 | View (klasik DB view) | Z | V | SD | 30 | `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>` | `ZFI001_V_SIZE` | ⚠ Classic — **dil sürümü**. `V` yalnızca buraya aittir; CDS view'da `V` kullanılmaz (bkz. §4.1). Yeni geliştirmede CDS view tercih edilir |
| 32 | Customer Exit (SMOD/CMOD) | Z | — | SD | 30 | `<Prefix1><Module><PkgNo>...` (include) | `ZXV45U01` gibi SAP'ın verdiği include | ⚠ Ad SAP'ın exit include'undan gelir, biz seçmeyiz. Custom Logic (madde 33) tercih edilir |
| 33 | Custom Logic (cloud BAdI) | Z | ZZ1_ | — | 30 | SAP'ın enhancement spot'undan türer | `ZZ1_LE_SHIP_MODIFY_ITEM` | ⚠ Serbest ad değildir: spot adı + `ZZ1_` öneki. Public/Private Cloud'da customer exit yerine bu kullanılır |

### 3.1 [P] Include Rol Suffix'leri (klasik program) — eklendi 2026-08-04

Klasik program tek gövdede yazılmaz; include'lara bölünür. Include adı, ana programın
`<Description>` gövdesini aynen taşır ve sonuna **3 harfli rol kodu** alır:

Kullanılacak rol kodları **tam olarak** şunlardır; başka bir suffix üretilmez:

| Suffix | Rol | İçerik |
|---|---|---|
| `_TOP` | Global bildirimler | TYPES, DATA, CONSTANTS, `CLASS ... DEFINITION` (LCL_*) |
| `_SSC` | Selection SCreen | SELECT-OPTIONS / PARAMETERS ve seçim ekranı event'leri |
| `_MDL` | Dynpro modülleri | `MODULE ... OUTPUT` (PBO) **ve** `MODULE ... INPUT` (PAI) — tek include |
| `_CLS` | Lokal sınıflar | `CLASS ... IMPLEMENTATION` (LCL_*) |
| `_FRM` | FORM rutinleri | ⚠ **kullanılmaz** — aşağıdaki nota bak |

Örnek (TS'teki hâliyle): `<ZPKG>_P_REQ_SOURCE` → `<ZPKG>_I_REQ_SOURCE_TOP`,
`..._SSC`, `..._CLS`.

> ⭐ **`_FRM` üretilmez.** İş mantığı OO yazılır: global sınıf (veri/hesaplama) +
> `_CLS` içindeki `LCL_*` (ALV event handler, akış orkestrasyonu). FORM rutini yalnızca
> devralınan eski koda parite gerektiğinde açılır ve bu bir istisnadır; TS'te gerekçesi
> yazılır. Yeni bir geliştirmede `_FRM` include'u yoksa bu **doğrudur, eksiklik değildir**.
>
> `_MDL` yalnız **dynpro'lu** programlarda gerekir; SALV/ALV rapor akışında ekran
> olmadığı için açılmaz. PBO ve PAI modülleri ayrı include'lara bölünmez — ikisi de
> `_MDL` içindedir.
>
> Önceki biçimler **bırakıldı**: sayılı ekler (`_T01`, `_C01`, `_F01`, `_O01`, `_I01`, `_S01`)
> ve ayrı `_PBO` / `_PAI` include'ları
> → [H10](NAMING_STANDARD_HISTORY.md#h10).

### 3.2 [P] Dynpro Numaralandırma — eklendi 2026-08-05

Ekran numarası yalnızca bir sayaç değildir; **ekranlar arası ebeveyn-çocuk ilişkisini
taşır**. Biçim dört hane: **`0RCG`**

| Basamak | Anlamı | Değer |
|---|---|---|
| `0` | Sabit | Dört haneye tamamlar |
| `R` | Kök ekran sırası | `1`–`9` |
| `C` | O kökün alt ekranı | `0` = kökün kendisi · `1`–`9` = alt ekran |
| `G` | O alt ekranın alt ekranı | `0` = alt ekranın kendisi · `1`–`9` = torun |

**Kurallar**

1. Ana ekran her zaman **`0100`**.
2. Birbirinden **bağımsız** ekranlar yüzler basamağıyla ayrılır: `0200`, `0300`, …
3. Bir ekranın çocuğu, ebeveyninin **ilk sıfır basamağını doldurur**:
   `0100` → `0110`, `0120` … · `0110` → `0111`, `0112` …
4. **Ebeveyni bulma:** en sağdaki sıfır olmayan basamağı sıfırla. `0121` → `0120` → `0100`.
   Bu, numaraya bakan herkesin ağacı ezbersiz okuyabilmesi demektir.
5. Numaralar seviye içinde ardışık verilir; boşluk bırakılmaz, sonradan araya ekleme
   gerekirse sıradaki numara kullanılır (yeniden numaralandırma yapılmaz).

```
0100 ─┬─ 0110 ─┬─ 0111
      │        └─ 0112
      └─ 0120 ──── 0121

0200 ─┬─ 0210
      └─ 0220 ──── 0221
```

**Sınırlar ve istisnalar**

- Her seviyede 9 ekran, toplam 3 seviye. Dördüncü bir kırılım gerekiyorsa akış fazla
  derindir: ekranı değil **işlemi** bölmek gerekir; yine de zorunluysa TS'te gerekçesi
  yazılır.
- **Popup / modal** ekranlar da çocuktur — hangi ekrandan açılıyorsa onun altına girer.
  Subscreen alanları da barındıran ekranın çocuğudur.
- **`1000` kullanılmaz**: klasik rapor programlarında standart seçim ekranı bu
  numaradadır, çakışır.

Ekrandan türeyen adlar bu numaraya bağlıdır ve elle değiştirilmez:
`STAT<n>` (GUI status) · `TIT<n>` (titlebar) · `MODULE status_<n>` (PBO) ·
`MODULE user_command_<n>` (PAI). Hepsi `_MDL` include'unda toplanır (§3.1).

---

### 3.3 [P] Obje Tanımları (Description) — eklendi 2026-08-04

> 2026-08-15'e kadar bu bölüm de **3.2** numaralıydı; eski "§3.2" atıfları →
> [H9](NAMING_STANDARD_HISTORY.md#h9).

İsim kadar **tanım (description)** da standarda tabidir. Dört kural:

**1. Geliştirme ID'si yalnızca PAKET ve TRANSPORT REQUEST tanımında geçer.**

| Nesne | ID geçer mi? | Örnek |
|---|---|---|
| Paket | ✅ evet | `MM019 - İhtiyaç Rezervasyon/Satınalma Takip Raporu` |
| Transport request | ✅ evet | `OSSDDP-3092: MM019 - İhtiyaç Rez/Satınalma Tkp Rap` |
| Program, class, interface, include, struct, table type, message class, DDIC… | ❌ **hayır** | `Seçim ekranı` |

> **Neden:** SE80 Repository Browser nesneleri zaten paketin altında gösterir; paket satırı
> geliştirme ID'sini bir kez taşır. Her alt satırda tekrar etmek 60 karakterlik tanım alanının
> başını harcar, listeyi okunmaz yapar ve iki nesneyi ayıran asıl bilgiyi sağa iter. WRICEF ID
> ile nesne arasındaki bağ zaten paket üyeliğinden ve transport içeriğinden kurulur — tanıma
> yazmak bu bağı güçlendirmez, yalnızca tekrar eder.

**2. Tanım, nesnenin NE YAPTIĞINI tek başına anlatır.**

Tanım; obje tipini tekrarlamaz (`Include`, `Class` demek bilgi taşımaz), kısaltılmış
başlık kopyası olmaz, boş bırakılmaz.

```
YANLIS                                        DOGRU
MM019 - Secim ekrani                          Seçim ekranı
MM019 - Lokal sinif implementasyonu           ALV sunum katmanı (SALV, hotspot, toplam)
MM019 - Veri toplama, hesaplama ve hata yon.  Veri toplama, hesaplama ve mesaj yönetimi
Include ZMM011_I_REQ_SOURCE_TOP               Tipler, sabitler ve global veri
```

**3. Tanım LOGIN DİLİNDE ve o dilin KENDİ KARAKTERLERİYLE yazılır — ASCII'ye indirgemek YASAKTIR.**

Teknik ad İngilizce (§1.1), tanım oturum dili. Login dili TR ise `ç ğ ı İ ö ş ü` ve büyük
harfleri tanımda olduğu gibi kullanılır.

```
YANLIS                          DOGRU
Hata yonetimi                   Hata yönetimi
Secim ekrani                    Seçim ekranı
Mesaj yonetimi                  Mesaj yönetimi
Ihtiyac Karsilama Takip Raporu  İhtiyaç Karşılama Takip Raporu
Ihtiyac Rez/Satinalma           İhtiyaç Rez/Satınalma
Malzeme aciklamasi              Malzeme açıklaması
Uretim yeri                     Üretim yeri
Musteri siparisi                Müşteri siparişi
Lokal sinif implementasyonu     Lokal sınıf implementasyonu
```

Obje **ADI** ASCII'dir — bu SAP'ın teknik kısıtıdır, tartışma konusu değildir.
**Tanım öyle değildir**: kullanıcının gördüğü metindir ve sistem sorunsuz saklar.
Aynı sistemde müşterinin kendi geliştirmeleri böyle duruyor
(`ZNT_002_FM_SEND_MAIL` → *"Mail Gönderme İşlemleri"*), bizim ürettiklerimiz
karakterleri soyulmuş duruyorsa fark eden ilk kişi müşteri olur.

> **"Kodlama sorunu çıkar mı?" — hayır.** Master dili TR olan bir sistemde bu karakterler
> tanım/etiket alanlarında sorunsuz saklanır; kanıt: `ZMM011_S_REQ_SOURCE` yapısı `'ALV satır
> yapısı - bileşen ihtiyaç ve karşılama'` tanımı ve `'SAT Numaraları'` alan etiketiyle sorunsuz
> aktive edildi (04.08.2026). ASCII'ye indirgeme güvenlik önlemi değil, okunabilirlik kaybıdır.
>
> ⚠ **Bunu bozan şey bir yanlış anlamadır:** `sap-adt` skill'inin "ALL Python output MUST use
> ASCII" kuralı **Windows konsoluna basılan `print()` çıktısı** içindir (cp1252/cp857 çöker),
> **SAP'a YAZILAN veriyi kapsamaz.** Konsol ASCII'dir; description, text element, titlebar ve
> mesaj metni login dilinde ve kendi karakterleriyledir.

> **En sık düşülen tuzak — TUTARSIZLIK.** Aynı geliştirmede bir nesneye `ALV satır yapısı`,
> diğerine `hata yonetimi` yazmak ikisini birden ASCII yazmaktan kötüdür: hangisinin doğru
> olduğu belirsizleşir. Bir geliştirmedeki TÜM tanımlar aynı anda gözden geçirilir.

**4. Kod içi yorumlar da login dilinde yazılır.**

Program, fonksiyon modülü, class — kaynak koddaki açıklama satırları oturum
dilinde ve kendi karakterleriyle. Amaç kodu okuyan danışmanın anlaması.

**Ölçüsü:** yorum, kodun *neden* öyle olduğunu anlatır. Satır satır ne yaptığını
tekrar eden yorum gereksizdir — aşırıya kaçılmaz.

```abap
* YANLIS - hem karakterler soyulmus hem gereksiz
* Tabloyu okur ve iterasyon yapar
LOOP AT lt_items INTO ls_item.

* DOGRU - neden orada oldugunu soyluyor
* Sadece silinmemiş kalemler: iptal edilenler AUFK'ta kalır ama rapora girmez.
LOOP AT lt_items INTO ls_item WHERE deleted = abap_false.
```

> `abaplint`'in `7bit_ascii` kuralı yorumdaki Türkçe karakteri bulgu olarak
> gösterir. **Yorum satırlarındaki bu bulgu beklenendir ve göz ardı edilir**;
> kural asıl olarak kodun kendisi içindir.

İki ayrı soru, karıştırılmamalı:

| | Dil | Neden |
|---|---|---|
| **Teknik ad** (`ZMM011_P_REQ_SOURCE`) | Her zaman **İngilizce** (§1.1) | Sistem genelinde aranır, uluslararası ekip okur, dilden bağımsızdır |
| **Tanım ve kullanıcı metinleri** | **Login dili** | SAP bu metinleri dile göre saklar; kullanıcı hangi dille giriyorsa onu görür |

Kural, tanımın yanı sıra kullanıcıya görünen tüm metinleri kapsar: DDIC alan etiketleri
(`@EndUserText.label`), text element'ler, selection text'ler, mesaj metinleri. Bir nesnenin
tanımı **birden çok dilde** saklanabilir — sonradan başka dille çeviri eklemek mevcut tanımı
bozmaz; o yüzden cevap her zaman **o anki login dili**dir.

> **AI için:** `SAPWrite` create çağrısında `description` alanını bu kurala göre doldur.
> Aynı kural TS `2.1 Object List` tablosundaki "Amaç/Purpose" kolonu için de geçerlidir.
>
> **Login dilini nereden bilirsin:** bağlantı ayarındaki dil alanı (`.conn_adt` içindeki
> `ADT_SAP_LANGUAGE`, ARC-1 tarafında `SAP_LANGUAGE`) — yoksa proje reçetesindeki
> doküman dili. İkisi de yoksa **sor**; tahmin etme, çünkü yanlış dilde yazılan tanım
> kullanıcının ekranında boş görünür.

---

> ⚠ **Klasik nesnelerin ABAP dil sürümü (madde 2, 3, 5, 6, 31):** Bu nesnelerin **ABAP
> language version** özelliği **"Standard ABAP"** olmalıdır (v2.0, §4.1/§4.4.2 ve checklist
> madde 8). Sistem varsayılanı her yerde bu değildir — RISE / S/4HANA Cloud tarafında
> varsayılan ABAP Cloud olabilir; o zaman klasik nesne yanlış sürümde doğar ve aktivasyonda
> ya da ATC'de patlar. TS'te klasik nesne varsa bu satır yazılır.
>
> ⚠ **Bunu bugün hiçbir araç kendiliğinden ayarlamıyor.** `sap-adt` motorunda dil sürümü
> hiç geçmiyor; nesne yaratıldığında sistemin varsayılanı ne ise o oluyor. Motorun bunu
> set etmesi ayrı bir karardır (ADT motoru değişikliği, canlı sistemde doğrulama ister) —
> o gelene kadar **klasik nesne yaratıldıktan sonra dil sürümü elle teyit edilir**.

> ⚠ **[K!] Program öneki `P` — `R` kullanılmaz (madde 2).** Kılavuz iki seçenek veriyor, biz
> tek seçeneğe daraltıyoruz; bilinçlidir, eksik değil
> → [H7](NAMING_STANDARD_HISTORY.md#h7).

> ⚠ **Transaction Code numarası (madde 20)** paketin numarası DEĞİL, tcode'ların kendi
> sırasıdır. Sıradaki boş numara geliştirme sisteminden okunur; TS'te somut numara
> verilemiyorsa `<ZTCODE>` yer tutucusu kullanılır (`<ZPKG>` ile aynı gerekçe, §1.2)
> → [H8](NAMING_STANDARD_HISTORY.md#h8).

> ⚠ **Authorization Object (madde 26)** paket/modül numarası OLMADAN yazılır: `Z_<Description>`
> (`Z_PORGIN`). Eski proje formülü `Z_<Module>_<Description>` (`Z_SD_SALES`) ikincil kabul edilir
> → [H11](NAMING_STANDARD_HISTORY.md#h11).

---

## 4. [K] CDS View & RAP İsimlendirme

> ⚠ **[K!] Kılavuzun `DDL` satırı BİLEREK alınmadı** — `_DDL_` gövdesi üretilmez, düz harf
> formülü (C/I/E/R) geçerlidir. Kılavuz bu nesne için iki formül veriyor ve hangisinin geçerli
> olduğunu yazmıyor; bu bir eksik değil, karardır → [H6](NAMING_STANDARD_HISTORY.md#h6).
> Bırakılan eski proje formülleri (`_DDL_I_`, `_MX_` vb.) ve hangilerinin kurumsala geçtiği:
> [H3](NAMING_STANDARD_HISTORY.md#h3).

### 4.1 [K] CDS View Türleri (kurumsal kılavuz formülü)

| # | CDS Obje Türü | Formül | MaxLen | Örnek |
|---|---|---|---|---|
| 1 | **Root View** (RAP kök view entity) | `Z{Module}{PkgNo}_R_{Description}` | 30 | `ZSD001_R_ORDER` |
| 2 | Projection View | `Z{Module}{PkgNo}_C_{Description}` | 30 | `ZSD001_C_ORDER` |
| 3 | Interface View (yeniden kullanılabilir VDM katmanı) | `Z{Module}{PkgNo}_I_{Description}` | 30 | `ZSD001_I_ORDER` |
| 4 | Extension View | `Z{Module}{PkgNo}_E_{Description}` | 30 | `ZSD001_E_ORDER` |

> ⚠ **[P] `I_` RAP kökü DEĞİL.** Kök `R_`'dir ve Behavior Definition onunla **aynı adı taşır**;
> `I_` başkalarının tüketmesi için açılan yeniden kullanılabilir VDM katmanıdır. Kılavuz ikisini
> iki sürümdür ayrı satırlarda veriyor ama farkı hiç yazmıyor — ayrımı RAP'ın kendi katmanlaması
> ve SAP'ın RAP üreticisi belirledi → [H4](NAMING_STANDARD_HISTORY.md#h4).
>
> ⚠ **[P] `V` yalnızca klasik DB view'ındır** (§3 madde 31); bir CDS view hiçbir zaman `_V_`
> almaz → [H5](NAMING_STANDARD_HISTORY.md#h5).

### 4.2 [K] RAP İsimlendirme — Token Tabanlı Pattern'ler

RAP/Fiori stack objeleri kısa biçimi kullanır: `{M}`=Modül, `{N}`=Paket No, `{D}`=Açıklama (UPPER_SNAKE).

| # | RAP Obje Türü | Açıklama | Pattern | MaxLen | Eşitlik Kuralı |
|---|---|---|---|---|---|
| 1 | TABLE | Veritabanı Tablosu | `Z{M}{N}_T_{D}` | 16 | |
| 2 | DDLS_ROOT | CDS Root View (RAP kök view entity) | `Z{M}{N}_R_{D}` | 30 | ⚠ **= BDEF_ROOT adı** — 2026-08-15'te `_I_`'den değişti, bkz. §4.1 notu |
| 3 | DDLS_PROJECTION | CDS Projection View | `Z{M}{N}_C_{D}` | 30 | Kurumsal kılavuzla birebir uyumlu |
| 4 | DDLX_METADATA_EXTENSION | Metadata Extension | `Z{M}{N}_C_{D}` (projection'a), `Z{M}{N}_R_{D}` (root'a) | 30 | ⚠ **= genişlettiği view'ın adı** — v2.0 ile değişti, eski `_MX_` bırakıldı |
| 5 | BDEF_ROOT | Behavior Definition (Root) | `Z{M}{N}_R_{D}` | 30 | ⚠ **= Root View (`_R_`) adı** — v2.0 ile değişti, eski `_I_` bırakıldı |
| 6 | CLAS_BEHAVIOR_IMPL_ROOT | Behavior Pool Sınıf (Root) | `ZCL_{M}{N}_BP_{D}` | 30 | v2.0 formülü (`ZCL_SD001_BP_ORDER`); eski `ZBP_R_...` bırakıldı |
| 7 | BDEF_PROJECTION | Behavior Definition (Projection) | `Z{M}{N}_C_{D}` | 30 | = DDLS_PROJECTION adı |
| 8 | CLAS_BEHAVIOR_IMPL_PROJECTION | Behavior Pool Sınıf (Projection) | `ZCL_{M}{N}_BPC_{D}` | 30 | **[P]** Kılavuzda satırı yok — madde 6'dan türetildi, teyit gerekli |
| 9 | SRVD | Service Definition | `Z{M}{N}_UI_{D}` veya `Z{M}{N}_API_{D}` | 30 | UI'a bağlı servis `UI`, yalnız API ise `API` — ör. `ZMM001_UI_DESCRIPTION` / `ZMM001_API_DESCRIPTION` |
| 10 | SRVB | Service Binding | `Z{M}{N}_UI_{D}_O2` veya `_API_{D}_O4` | 30 | `_O2`/`_O4` OData versiyon suffix'i — ör. `ZMM001_UI_DESCRIPTION_O2` |
| 11 | Draft DB Table | Draft DB Table | `Z{M}{N}_A_{D}_D` | 30 | Kurumsal kılavuzla birebir uyumlu |
| 12 | Access Control (DCL) | Erişim Kontrolü | `Z{M}{N}_AC_{D}` | 30 | **[P]** Kılavuzda satırı yok, proje-özel korunuyor |
| 13 | Service Consumption | Dış servis tüketimi | `Z{M}{N}_SC_{D}` | 30 | ör. `ZMM001_SC_DESCRIPTION` |
| 14 | In/Outbound Service | Gelen/Giden servis | `Z{M}{N}_(I/O)S_{D}` | 30 | ör. `ZMM001_IS_DESCRIPTION` |

---

## 5. [K] Interface / Integration Nesneleri

Service Definition, Service Binding, Service Consumption ve In/Outbound Service **§4.2'de**
(madde 9, 10, 13, 14). Aynı nesneler hem RAP stack'inin parçası hem entegrasyon nesnesi
olduğu için iki ayrı tabloda duruyorlardı; formül tek yerde tutuluyor.

## 5.1 [K] Public Cloud Objects

| # | Nesne | Formül | Örnek |
|---|---|---|---|
| 1 | Communication Scenario | `Z{M}{N}_CS_{D}` | `ZSD001_CS_SALES` |
| 2 | Communication System | `Z{M}{N}_CSYS_{D}` | `ZSD001_CSYS_EXTSYS` |
| 3 | Communication Arrangement | `Z{M}{N}_CARR_{D}` | `ZSD001_CARR_SALES` |
| 4 | Communication User | `Z{M}{N}_CUSR_{D}` | `ZSD001_CUSR_INT` |

## 5.2 [K] Diğer Nesneler

| # | Nesne | Formül | Örnek |
|---|---|---|---|
| 1 | Business Catalog | `Z{M}{N}_BC_{D}` | `ZSD001_BC_SALES` |
| 2 | Business Role | `Z{M}{N}_BR_{D}` | `ZSD001_BR_SALESREP` |
| 3 | App Job Catalog | `Z{M}{N}_AJC_{D}` | `ZSD001_AJC_BILLING` |
| 4 | App Job Template | `Z{M}{N}_AJT_{D}` | `ZSD001_AJT_BILLING` |
| 5 | IAM App | `Z{M}{N}_IAM_{D}` | `ZSD001_IAM_PORTAL` |

## 5.3 [K] Workflow Nesneleri

| # | Nesne | Formül | Örnek |
|---|---|---|---|
| 1 | Workflow Template | `Z{M}{N}_WF_{D}` | `ZSD001_WF_01` |
| 2 | Workflow Task | `Z{M}{N}_TS_{D}` | `ZSD001_TS_01` |
| 3 | Responsibility Rule | `Z{M}{N}_RL_{D}` | `ZSD001_RL_01` |
| 4 | Email Template | `Z{M}{N}_EMT_{D}` | `ZSD001_EMT_NOTIFICATION` |

---

## 6. [K] ZND_ROOT — Paylaşılan Paket (bilgi amaçlı referans)

NTT DATA'nın proje-genelinde paylaşılan yardımcı (shared utility) paketi: yeniden kullanılabilir
kütüphaneler, ortak araçlar, altyapı bileşenleri. v2.0 bu aileyi `ZND_ROOT` altında tanımlar ve
"ZND namespace'i altındaki tüm nesneler, tüm projelerde tutarlı kullanılması gereken paylaşılan
bileşenlerdir" der.

```
ZND_ROOT
├── ZND
│   ├── ZND000   Yardımcı Nesneler
│   ├── ZND001   Dosya İşleme (Excel vb.)
│   ├── ZND002   Mail İşlemleri
│   ├── ZND003   RF Mesajları
│   └── ZND004   ALV İşlemleri
└── ZND_UTL      NTT Genel Yardımcıları
```

> ⚠ **Aile v1.1'de `ZNT_*` idi; numaralar mekanik olarak çevrilemez.** 000/001/002 aynı alanı
> gösteriyor ama `ZNT_003` (Doküman Yönetimi) ile `ZND003` (RF Mesajları), `ZNT_004` (Batch Input)
> ile `ZND004` (ALV) **farklı alanlardır** — dönüşüm alan adına bakılarak yapılır, numaraya değil.
> Eşleme tablosu → [H2](NAMING_STANDARD_HISTORY.md#h2).

**[P] v1.1 listesi — sistemlerde fiilen duran paketler (eski adlandırma).** Kılavuzdan değil,
sistem taramalarından. Aşağıdaki 15 paketin v2.0'da karşılığı yok; emekli mi edildiler yoksa
sayılmadılar mı belli değil, ama sistemlerde duruyorlar (Beta Enerji'de bu ailenin 23 paketi
var, en dolusu `ZNT_011`, 93 nesne). **Okuma amaçlıdır** — yeni geliştirme buraya yönlendirilmez.

| Alt Paket (eski) | Alan |
|---|---|
| `ZNT_005` | BAL_LOG (Application Log) |
| `ZNT_006` | COM Port İşlemleri |
| `ZNT_007` | Adobe Form Çıktı |
| `ZNT_008` | RF Mesajları *(v2.0'da `ZND003`)* |
| `ZNT_009` / `ZNT_011` | Integration Cockpit |
| `ZNT_010` | Transport Request İşlemleri |
| `ZNT_012` | Sabit Parametre İşlemleri |
| `ZNT_013` | Program Kopyalama Geçmişi |
| `ZNT_014` | Metin Okuma |
| `ZNT_016` | Yetkilendirme İşlemleri |
| `ZNT_019` | Yardımcı Destek Programları |
| `ZNT_020` | Çeviri Programı |
| `ZNT_022` | ZPL Etiket Baskı |
| `ZNT_023` | GTİP (Gümrük Tarife) |
| `ZNT_024` | HTTP/REST API Çağrı |

> **Kullanım notu:** Bu bölüm şimdilik yalnızca referans amaçlıdır. Bir TS'te WRICEF'e özel olmayan,
> genel-amaçlı bir yardımcı sınıf/nesne (ör. genel mail gönderim sınıfı, genel log yardımcı sınıfı)
> tasarlanırsa, agent bunu doğrudan ilgili `ZND0xx` alt paketine yönlendirmez — TS Part1
> "Dependencies" bölümünde "bu WRICEF paketinde mi yoksa ZND ortak paketinde mi barındırılsın —
> teyit gerekli" notuyla açık bırakır. Otomatik yönlendirme, ayrı bir süreç kararı gerektirir
> (ts-generator akışına henüz işlenmemiştir).
>
> Modülün **kendi** genel paketi (`Z<Modül>000`) ile karıştırılmamalı: o modül içi genel
> geliştirmeleri (BAdI, enhancement, ek alan) alır, `ZND*` ise projeler arası paylaşılan
> bileşenleri (bkz. §2).

---

## 7. [P] AI İçin Uygulama Kuralları

1. TS `2.1 Object List`'teki HER nesneye bu tablolardan uygun formülle ad üret. "İsim TBD" bırakma.
2. Nesne tipi RAP stack ise Bölüm 4.2, CDS temel/klasik ise Bölüm 4.1, klasik Z/Y ise Bölüm 3 formülünü kullan.
3. `<Module>`/`{M}` = FS modülü; `<PkgNo>`/`{N}` = verildiyse o, yoksa `001` (+ teyit notu).
   `000` kalem geliştirmesine verilmez — modül genel paketine ayrılmıştır (§2).
4. `<Description>`/`{D}` = ihtiyaç özeti, UPPER_SNAKE, MaxLen'e sığacak şekilde kısalt.
5. Aynı mantık grubundaki nesnelerde `<Description>` tutarlı olsun (ör. tüm SAT-SAS sync
   nesneleri `PR_QTY_SYNC` gövdesini paylaşsın).
6. Eşitlik kurallarına uy — **v2.0 ile değişti**: Metadata Extension artık genişlettiği view ile
   **AYNI** adı taşır (eski `_MX_` kuralı bırakıldı); BDEF root `_R_`, BDEF projection `_C_`.
7. Standart burada karşılığı olmayan bir nesne tipi çıkarsa: en yakın formülü uygula ve
   TS'te "naming standardında bu tip yok, önerilen ad: ... — teyit gerekli" notu düş.
8. **RAP kökü `_R_`'dir** (2026-08-15'te `_I_`'den değişti, bkz. Bölüm 4.1 notu): kök CDS,
   Behavior Definition ve varsa Metadata Extension **aynı adı** taşır. `_I_` yalnızca gerçek
   interface view'a — başkalarının tüketmesi için açılan yeniden kullanılabilir VDM katmanına —
   verilir; bir RAP kök business object'i `_I_` ile adlandırılmaz.
9. **`V` yalnızca klasik DB view'ındır** (§3 madde 31). Bir CDS view hiçbir zaman `_V_` almaz;
   katmanına göre `R_`/`C_`/`I_`/`E_` alır.
10. Yeni Authorization Object üretirken kurumsal formülü (`Z_<Description>`, madde 26) esas al; eski
    proje formülü (`Z_<Module>_<Description>`) yalnızca önceden üretilmiş TS'lerle tutarlılık gerekiyorsa
    referans olarak an.
