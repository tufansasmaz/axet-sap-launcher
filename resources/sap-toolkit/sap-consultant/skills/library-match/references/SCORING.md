# Skor matrisi ve kalibrasyon

Türkçedir, HARD_GATE.md ile aynı sebeple: kalibrasyon örnekleri Türkçe SAP
terimlerine (yaşlandırma, reeskont, dönemselleştirme) bağlı.

Bu dosya yalnızca **Hard Gate geçildikten sonra** okunur. Geçilmediyse skor
%0'dır ve matris hiç çalıştırılmaz (bkz. HARD_GATE.md §2).

---

## Aşama 1 — Hard Gate (binary)

Aşağıdaki üç kriter **skor matrisine dahil değildir**.

| Kriter | Kontrol |
|---|---|
| SAP Modülü | Eşleşmeli |
| SAP Ana İş Nesnesi | Eşleşmeli |
| SAP Alt İş Nesnesi | Eşleşmeli |

Eşleşmezse analiz durur, Final Skor %0. Eşleşirse Aşama 2 çalışır; bu üç kriter
otomatik olarak tam eşleşmiş sayılır ve matrise **tekrar girmez**.

---

## Aşama 2 — Skor matrisi

| Kriter | Ağırlık | Puanlama |
|---|---|---|
| SAP İş Süreci | **%40** | Özdeş = 40 · Benzer/örtüşen = 25 · Zıt (Posting ≠ Reversal) = 0 · QM ardışık adım farkı = max 25 |
| Teknik Mimari + Teknik Nesneler | **%25** | Mimari ve tablo/fonksiyon uyumu birlikte. SAP domain bilgisiyle türet. Program ≠ RFC/Servis ise max 15. Form/etiket tetikleme+veri kaynağı farklıysa Hard Gate devreye girer. |
| Veri Akışı Yönü | **%20** | Yön özdeş = 20 · Kısmi örtüşme = 10 · Yön zıt = 0 |
| Algoritma / İş Mantığı | **%10** | Hesaplama/kontrol/sıralama mantığı benzerliği. SAP domain bilgisiyle türet. |
| Başlık Benzerliği | **%5** | **En son** uygulanır, yalnızca tiebreaker. Diğer kriterler eşitse devreye girer. |
| **Toplam** | **%100** | |

---

## Kalibrasyon

### Kısa açıklama ceza değildir

K veya G açıklaması kısa olduğu için Teknik Mimari, Teknik Nesneler, Veri Akışı
veya Algoritma kriterlerinde **puan kırma**. Bu alanları boş/eksik sayıp 0 puan
vermek yanlıştır.

Bunun yerine SAP domain bilginle (standart tablolar, BAPI'ler, BAdI'ler, işlem
kodları, algoritmalar) geliştirmenin doğal teknik içeriğini **türet**;
türetilebiliyorsa tam puan ver, türetilemiyorsa gerekçeyle kısmi puan ver.

> Bu, boş açıklama kuralıyla karıştırılmamalı: G~Description tamamen **boşsa**
> kayıt zaten ön elemede düşer (HARD_GATE.md §0). Buradaki durum, açıklamanın
> var ama kısa olması.

**Türetme örnekleri** — bunlardan domain mantığını genelleştir, her birini
tek tek işleme:

| Geliştirme | Türetilecek teknik içerik |
|---|---|
| Yaşlandırma raporu | FBL5N/BSID/BSAD, açık kalem vade hesaplama |
| Exchange Rate arayüzü | OB08/TCURR, HTTP servis, JOB zamanlama |
| IRR / etkin faiz | TRM (TM00/TX06), VTBFHA/VTBFHAPO |
| Dönemselleştirme | ACAC, ACEACCROBJ/ACAC_ITEMS |
| Reeskont | TFRS zaman değeri, FBL1N/FBL5N, F.05 |
| Excel'den belge | BAPI_ACC_DOCUMENT_POST, FB01 |

### Birebir amaç örtüşmesi yüksek skordur

Hard Gate geçilmişse ve her iki geliştirme de **aynı iş problemini** çözüyorsa
(isim/açıklama farkından bağımsız olarak), skor **%85 ve üzeri** olmalıdır.

Skor %70'in altına ancak şunlardan biri **kanıtlanırsa** düşer: net süreç
zıtlığı, veri akışı yön farkı, veya kapsam farklılığı.

### Skor tavanı referansları

| Durum | Bant |
|---|---|
| Birebir aynı geliştirme (açıklama da örtüşüyor) | **%95–100** |
| Amaç özdeş, minör teknik/kapsam farkı | **%85–95** |
| Amaç aynı, süreç veya kapsam farkı var | **%70–85** |
| Kısmi örtüşme, süreç benzer ama yön/kapsam farklı | **%55–70** |
| Zayıf örtüşme, yalnızca nesne düzeyinde benzerlik | **%40–55** |

---

## Sonuç kontrolü

Satırı yazmadan önce son bir soru: **eşleşme yalnızca isim veya modül
benzerliğine mi dayanıyor?** Evetse iptal et, Final Skor %0.

Bu, matrisin verdiği sayıyı geçersiz kılabilen tek kuraldır ve bilerek en sona
konmuştur — matris yüksek bir sayı üretmiş olması, eşleşmenin gerçek olduğunun
kanıtı değildir.
