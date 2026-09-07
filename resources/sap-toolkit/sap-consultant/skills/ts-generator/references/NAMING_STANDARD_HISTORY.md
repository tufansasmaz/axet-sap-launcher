# İsimlendirme Standardı — Karar Geçmişi

> **Bu dosya kural içermez.** Bağlayıcı formüllerin tamamı
> [`NAMING_STANDARD.md`](NAMING_STANDARD.md)'dedir; çelişkide o kazanır.
>
> Burada **neden öyle olduğu** yazar: hangi biçim ne zaman bırakıldı, kurumsal kılavuzun
> hangi satırı bilerek alınmadı, kılavuzun söylemediği bir şeye nasıl karar verdik. Standardın
> içindeyken bunlar bir referans dokümanın ortasında yaşayan changelog'du ve okumayı ağırlaştırıyordu.
>
> **Ne zaman buraya bakılır:** kurumsal kılavuzun yeni sürümü geldiğinde (standarttaki [K] ve
> [K!] işaretleri hangi satırların kontrol edileceğini söyler, burası o satırların bugünkü hâlinin
> gerekçesini), ya da bir kural "eksik/yanlış" gibi göründüğünde — büyük ihtimalle bilerek öyledir
> ve gerekçesi aşağıdadır.
>
> Standarttaki her karar satırı buraya bir bağlantı taşır. **Kural metnini buraya taşımayın**:
> koruyucu işlevi olan tek cümlelik karar standartta kalır, uzun gerekçe burada durur.

Kaynak kılavuz: `NTTDATA_Development_Naming_Guideline_2.0.pdf` (14.08.2026); öncesi 1.1 (14.07.2026).

> **SAP kitine standartla birlikte gider.** `sync_kit_standard.py` bu dosyayı
> `sap-dev-toolkit/standards/01-naming-history.md` olarak kopyalar ve iki taraftaki bağlantı
> hedeflerini karşılıklı düzeltir. Standardın gövdesi buraya on bir bağlantı taşıdığı için
> yalnızca standardı kopyalamak kitte on bir ölü bağlantı bırakırdı.

---

<a id="h1"></a>

## H1 — Paket hiyerarşisi dört katmana çıktı (2026-08-15, v2.0)

**Standartta:** §2

Kılavuz v1.1 üç katman tanımlıyordu (Root / Module / Cloud). v2.0 araya **modül genel paketini**
koydu: `ZSD000` "Module General Package", kalem paketleri `001`'den başlıyor.

Kök paketin adı da düzeldi: **`ZROOT`**, alt çizgili `Z_ROOT` değil. İkisi sahada bir arada
bulunabiliyor — Beta Enerji sisteminde her ikisi de var.

`Z<Modül>000`'ın **içine ne gireceği kılavuzda yazmıyor**; kapsam kuralı bizimdir (§2, [P]):
yalnızca tek bir WRICEF kalemine ait olmayan genel geliştirmeler — BAdI, enhancement, ek alan.
v2.0'ın kendi BAdI örneği (`ZSD000_IMP_PO_CUST`) bu okumayı destekliyor. Bu yüzden §3'ün 24 ve
25. satırları (`ENH`, `IMP`) `<PkgNo>` yerine `000` kullanır — kılavuzun enhancement örneği
`ZSD001_...` olduğu hâlde, ve o satır bu yüzden **[K!]** işaretlidir.

<a id="h2"></a>

## H2 — Paylaşılan paket ailesi `ZNT_*` → `ZND*` (2026-08-15, v2.0)

**Standartta:** §6

v1.1'de aile `ZNT_*` idi ve numaradan önce alt çizgi taşıyordu (`ZNT_001`). v2.0'da `ZND*` oldu,
alt çizgi düştü, ve aile `ZND_ROOT` altında yeniden tanımlandı.

**Numaralar mekanik olarak çevrilemez** — kritik nokta budur:

| v1.1 | v2.0 | |
|---|---|---|
| `ZNT_000` Yardımcı Nesneler | `ZND000` Yardımcı Nesneler | ✓ aynı |
| `ZNT_001` Dosya İşleme | `ZND001` Dosya İşleme | ✓ aynı |
| `ZNT_002` Mail | `ZND002` Mail | ✓ aynı |
| `ZNT_003` Doküman Yönetimi | `ZND003` **RF Mesajları** | ✗ farklı |
| `ZNT_004` Batch Input | `ZND004` **ALV İşlemleri** | ✗ farklı |

`ZNT_003 → ZND003` gibi bir dönüşüm iki alanı yanlış pakete koyar. Dönüşüm yapılacaksa **alan
adına bakılarak** yapılır, numaraya değil. (Bizde RF mesajları `ZNT_008`'de duruyordu.)

v2.0 yalnızca beş alt paket sayıyor; standardın §6'sındaki 15 paketlik eski liste kılavuzdan
değil sistem taramalarından geliyor ve **[P]** işaretlidir.

**İlgili:** kit'in kendi üretici nesneleri 2026-08-14'te `ZNT_FM_*`'dan `ZND_FM_*`'a alındı ve
öyle kaldı. Çakışma değil: `$TMP`'de yaşadıkları için taşınabilir bir pakete hiç girmezler,
dolayısıyla `ZND_ROOT` ağacında yer işgal etmezler (§3'ün başındaki not).

<a id="h3"></a>

## H3 — RAP formülleri kurumsal satır sahibi oldu (2026-08-15, v2.0)

**Standartta:** §4 giriş, §4.2 madde 4, 5, 6

2026-07-17'de `_DDL_I_ / _DDL_C_ / _DDL_MX_ / _DDL_AC_` gövdesi düz harf formülü lehine
bırakılmıştı. v2.0'da Behavior Definition, Behavior Implementation ve Metadata Extension
kurumsal satır sahibi oldu; o üçünde de proje-özel formül bırakılıp kılavuz esas alındı.

Metadata Extension'ın kuralı **tersine döndü**: eskiden `_MX_` alır ve projection'dan farklı
olmak *zorundaydı*; artık genişlettiği view ile **aynı** adı taşır. Eski kuralın gerekçesi
"kılavuzda satırı yok" idi — artık var. Bu ters dönüş üç yerde birden düzeltildi: standart,
`ts-generator`'ın kendi kontrolü, `spec-reviewer`'ın adlandırma kapısı.

Hâlâ kurumsal satırı olmayanlar — Access Control/DCL ve projection Behavior Pool — proje-özel
kalıyor ve tabloda **[P]** ile işaretli.

<a id="h4"></a>

## H4 — `I_` RAP kökü değil (2026-08-15, karar bizim)

**Standartta:** §4.1, §4.2 madde 2, §7 kural 8

Kılavuz "Interface View" ile "Root View" satırlarını **iki sürümdür ayrı ayrı veriyor ama farkı
hiç yazmıyor**; biz de RAP kökü için `I_` kullanıyorduk. Ayrımı RAP'ın kendi katmanlaması verdi:

- **`R_`** kök view entity'dir ve Behavior Definition **onunla aynı adı taşır**
- **`C_`** projection'dır (projection BDEF de onunla aynı adı taşır)
- **`I_`** başkalarının tüketmesi için açılan yeniden kullanılabilir VDM katmanıdır — RAP kökü değil
- **`E_`** extension view

SAP'ın kendi RAP üreticisi de kök için `R`, projection için `C` üretir. v2.0'ın Behavior Definition
satırını `R or C` diye vermesi zaten bu okumayı varsayıyor — yani kılavuz ayrımı yazmamış ama
kullanmış.

**Sonuç:** RAP kök CDS'i `Z{M}{N}_R_{D}`; eski `I_` biçimi bırakıldı. Bu, aynı gün BDEF kökünün
`_R_` olmasıyla açılan "kök CDS ile BDEF aynı adı taşımıyor" gerilimini kapatır. Harfler kurumsal
[K]; hangisinin kök olduğu kararı bizim — kılavuz bir gün ayrımı yazarsa **önce buraya bakılır**.

<a id="h5"></a>

## H5 — `V` yalnızca klasik DB view'a aittir (2026-08-15, karar bizim)

**Standartta:** §3 madde 31, §4.1, §7 kural 9

`V` harfinin sahibi belirsizdi: CDS tablosunda bir `_V_` satırı vardı, klasik view'ın ise **hiç
satırı yoktu** — metin "madde 31"e atıf yapıyordu ama tablo 30'da bitiyordu. v2.0 `V`'yi yalnız
DDIC tablosunda veriyor (`ZFI001_V_SIZE`), CDS için C/I/E/R diyor.

İkisi yer değiştirdi: klasik view **§3 madde 31** oldu, CDS'teki `_V_` satırı kaldırıldı. Artık
`V` tek anlama gelir; "isimden ayırt edilemez" sorunu bir notla yönetilmek yerine ortadan kalktı.

<a id="h6"></a>

## H6 — v2.0'ın `DDL` satırı bilerek alınmadı (2026-08-15)

**Standartta:** §4 giriş, tek satırlık karar notu

⚠ *(Bu maddedeki § numaraları **kılavuzun** bölümleridir.)*

Kılavuz §4.4.1 CDS view'ları için düz harf formülünü (C/I/E/R) verirken, §4.4.5 DDIC tablosunda
ayrıca `Data Definition | DDL | ZSD001_DDL_CUSTOMER_LIST` satırı duruyor. **Aynı nesne için iki
formül var ve hangisinin geçerli olduğu yazmıyor.**

Biz `_DDL_` gövdesini 2026-07-17'de düz harf formülü lehine bırakmıştık; o karar duruyor.
**Bu bir eksik değil, bir karardır** — kurumsal tarafa doküman hatası olarak bildirilecek, cevap
gelene kadar `_DDL_` üretilmez.

<a id="h7"></a>

## H7 — Program öneki `P`'ye daraltıldı (2026-08-15)

**Standartta:** §3 madde 2 ve altındaki not

Kılavuz v2.0 program için `P / R` diye **iki seçenek** veriyor. Biz `P`'yi tek seçenek olarak
daraltıyoruz: aynı nesne tipine iki yazım hakkı tanıyan standart, iki yazımı bir arada barındıran
sistem üretir. Ayrıca `R` bu standartta yüklü bir harftir — Root View ve Behavior Definition root
onu kullanır. Bilinçli daraltma, eksik değil; satır bu yüzden **[K!]**.

<a id="h8"></a>

## H8 — Number Range ve Transaction Code (2026-08-15, v2.0)

**Standartta:** §3 madde 19, 20

Number Range alt çizgi kazandı: `ZSD001NR` → **`ZSD001_NR`**.

Transaction Code artık paketin numarasını ödünç almıyor. v2.0'ın örneği `ZSD007`, paket örnekleri
ise `ZSD001`–`ZSD004`; yani tcode numarası tcode'ların kendi sırasıdır. Eski formülümüz `<PkgNo>`
kullandığı için tcode ile paket **birebir aynı adı taşıyordu**.

<a id="h9"></a>

## H9 — Mükerrer bölüm numarası: 3.2 → 3.3 (2026-08-15)

**Standartta:** §3.2 (dynpro), §3.3 (obje tanımları)

İki bölüm de **3.2** numarasını taşıyordu; Ağustos'ta bir gün arayla eklenmişler ve fark
edilmemiş. Altı dosyada sekiz "§3.2" atfı vardı ve hepsi aynı bölümü kastetmiyordu: altısı obje
tanımlarını, ikisi dynpro'yu gösteriyordu — yani atıfların dörtte biri okuyucuyu yanlış bölüme
gönderiyordu.

Numara belge sırasına göre düzeltildi: dynpro **3.2** kaldı, obje tanımları **3.3** oldu. Tanımları
kasteden altı atıf yeniden yönlendirildi (`ozak-tekstil`, `kibar-americas`, `beta-enerji`,
`spec-reviewer`, `sap-adt/SKILL.md`, `sap-adt/references/WINDOWS_ENCODING.md`). Dynpro'yu kasteden
ikisine (`screen-gen`, `spec-reviewer`'ın `0RCG` satırı) dokunulmadı.

<a id="h10"></a>

## H10 — Include rol suffix'lerinin eski biçimleri (2026-08-04)

**Standartta:** §3.1

Bırakılan biçimler: sayılı ekler (`_T01`, `_C01`, `_F01`, `_O01`, `_I01`, `_S01`) ve ayrı
`_PBO` / `_PAI` include'ları. Yerine beş rol kodu geldi — `_TOP`, `_SSC`, `_MDL`, `_CLS`, ve
üretilmeyen `_FRM`. PBO ve PAI modülleri ayrı include'lara bölünmez; ikisi de `_MDL` içindedir.

<a id="h11"></a>

## H11 — Authorization Object formülü (2026-07-17)

**Standartta:** §3 madde 26 ve altındaki not

Kurumsal kılavuz paket/modül numarası **olmadan** `Z_<Description>` veriyor (`Z_PORGIN`). Önceki
proje pratiği `Z_<Module>_<Description>` idi (`Z_SD_SALES`) — bu artık ikincil/eski kabul edilir.

<a id="h12"></a>

## H12 — Henüz alınmayan v2.0 maddeleri

Bunlar bilerek beklemede; her biri ayrı bir karar:

| Madde | Durum |
|---|---|
| ATC varyantı `ZZNDBS_ATC` | **Alındı** ama standartta değil — `abap-code-checker` skill'inde, çünkü isimlendirme kuralı değil release kapısı |
| "Standard ABAP" dil sürümü | Standarda **not olarak** girdi; `sap-adt` motorunun bunu set etmesi ayrı karar — ADT motoru değişikliği, canlı sistemde doğrulama ister |
| Kılavuz §5 checklist (8 madde) | Liste olarak alınmadı; karşılığı olmayan iki maddesi (Clean Core A–D beyanı, Standard ABAP) `spec-reviewer`'a eklendi |
| Customer Exit / Custom Logic satırları | **Alındı** — §3 madde 32, 33 |
| Namespace prefix (`/NTT/…`) | Standartta tek satırlık kapsam notu: kütüphane/ürün geliştirmesine ait, proje TS'ine değil |
