# Hard Gate — nesne, süreç ve mimari kuralları

Bu dosya Türkçedir ve öyle kalmalıdır. İçindeki ayrımların çoğu Türkçe SAP
terminolojisinin kendisinde yaşıyor: "Nakit Akım" ile "Nakit Akışı"nın farklı
şeyler olması, "hazıredim"in Material Staging demesi, "muhatap"ın iş ortağı
olması. Çevrilirse kural kalmaz, kuralın tarifi kalır.

Buradaki her madde bir yanlış eşleştirmeden geriye yazıldı. Silmeden önce hangi
hatanın tekrar edeceğini sor.

---

## 0. Erken eleme (her şeyden önce, düz keyword taraması)

`prepare.py` bunu zaten yapıyor ve elenenleri `batches/eliminated.json`'a
yazıyor — LLM'in bu adımı tekrar etmesi gerekmez. Kural burada, kararın
gerekçesi sorulduğunda okunacak yer olsun diye duruyor.

- **G~Description boşsa** → Skor %0, not: `ERKEN ELİME: Boş açıklama`.
- **G~Description'da field extension sinyali varsa** → Skor %0, not:
  `ERKEN ELİME: Field Extension`. Aranan ifadeler: `Ek Alan, Additional Field,
  Custom Field, Append Structure, CI Include, Screen Enhancement, Field
  Extension, Z Alan, alan ekleme, kolon ekleme, Dynpro, Selection Screen
  değişikliği, Layout değişikliği`.
- **G~Modül kütüphanede hiç yoksa** → Skor %0, not:
  `HARD GATE: Modül eşleşmedi`.

### İptal edilmiş kütüphane kayıtları aday değildir

Bu, G tarafında değil **K tarafında** bir elemedir: `Kopyalama Durumu` alanı
`İptal` olan bir kütüphane kaydı aday havuzuna hiç girmez. G kaydı analize devam
eder, sadece o aday yok sayılır.

Gerçek Helix kütüphanesinde 127 kayıttan 4'ü böyle. İptal edilmiş bir
geliştirmeyi "bunun karşılığı kütüphanede var" diye sunmak, olmayan bir şeyi
vaat etmektir — ve bu vaat teklife girdiğinde geri alınmaz.

### Standart SAP geliştirmeleri ret kuralı

Yukarıdaki keyword listesiyle aynı kapıya çıkar ve aynı sonucu verir: standart
bir rapora/ekrana alan veya kolon eklemek, Dynpro düzenlemesi, Selection Screen
değişikliği, Layout değişikliği. Hiyerarşiye bakılmaz, Final Skor %0, analiz
kapanır.

---

## 1. Veri denklikleri ve semantik normalizasyon

Analiz öncesi alanları eşle:

- `K~Modül` = `G~Sorumlu Ana Modül`
- `K~Geliştirme Tanımı` = `G~Summary`
- `K~Geliştirme Açıklaması` = `G~Description`

Terimleri eşitle:

| | |
|---|---|
| TCMB | CBRT |
| TFRS | IFRS |
| Satıcı | Tedarikçi = Vendor = Supplier |
| Malzeme | Material |
| Müşteri | Customer |
| Kur | Exchange Rate |
| Açık Kalem | Open Item |
| Satınalma Siparişi | Purchase Order |
| Satış Siparişi | Sales Order |
| Hazıredim | Material Staging |
| Yaşlandırma | Aging |
| İrsaliye | Dispatch note |
| Analiz Sertifikası | Certificate of Analysis |

Benzer dil/kısaltma farklarını aynı mantıkla normalize et.

> **Sınır.** Normalizasyon yalnızca **aynı** iş nesnesinin farklı isimlerini
> eşitlemek içindir. Farklı nesneler asla birleştirilemez: Vendor ≠ Material,
> Certificate ≠ Interface.

### Kütüphane-mevcut sinyali yasağı

`G~Description` içinde "Kütüphanede Mevcut Mu: Evet/Hayır" gibi ifadeler
bulunabilir. **Dikkate alınmaz ve skoru etkilemez.** Analiz yalnızca
geliştirmenin teknik ihtiyacına, iş nesnesine, sürecine ve mimarisine dayanır —
birinin daha önce verdiği cevaba değil.

---

## 2. Analiz sırası

1. SAP Modülü
2. SAP Ana İş Nesnesi
3. SAP Alt İş Nesnesi
4. SAP İş Süreci
5. Teknik Mimari
6. Teknik Nesneler
7. Veri Akışı
8. Algoritma
9. Başlık Benzerliği — **her zaman en son**

### Hard Gate

**Modül + Ana İş Nesnesi + Alt İş Nesnesi** üçü birden eşleşmiyorsa: analiz
derhal biter. Teknik mimari, nesneler, veri akışı, UI, algoritma ve başlık
benzerliği **değerlendirilmez**. Skor matrisi çalıştırılmaz. Final Skor **%0**.

### Sıra disiplini — geriye sızma yasağı

Hard Gate kararı, skor matrisinden **bağımsız ve önce** verilir.

**Yasak:** "İş süreci benzer, veri akışı aynı yönde, o zaman alt nesne de
yeterince yakındır" diyerek Aşama 2 gözlemlerinden geriye dönüp Alt Nesne
kararını gevşetmek. Bu sırayı tersine çevirir.

Alt Nesne kararı **yalnızca** şu sorularla verilir:

- Tetikleyici kim/ne? (kullanıcı mı, dış sistem mi, job mu)
- Veri kaynağı ne? (canlı API/push mı, statik dosya/tablo mu)
- Programın adı/kodu ne ima ediyor? (UPLOAD/MASS/BATCH sinyalleri)

Cevaplar farklıysa Alt Nesne farklıdır — İş Süreci veya Veri Akışı ne kadar
benzer görünürse görünsün Hard Gate'te durulur, Aşama 2'ye hiç geçilmez.

---

## 3. Ana ve alt iş nesnesi

Her geliştirme için net bir Ana ve Alt iş nesnesi tanımlanır.

**Örnek nesne grupları:**

- **Material** → Material Master, Material Image, Material Barcode, Material
  Classification, Material Batch, Material Costing, Material Code Creation
- **Vendor** → Vendor Master, Vendor Approval, Vendor Qualification, Vendor
  Evaluation, Vendor Integration
- **Production** → Planning, Confirmation, Consumption, Order, Components, BOM,
  Routing, Master Recipe

**Alt iş nesnesi kuralı.** Ana nesne aynı olsa bile alt nesne farklıysa Final
Skor %0. Örnek: Material Image ↔ Material Barcode, Certificate of Analysis ↔
Inspection Lot.

**İlişkili nesne ≠ aynı nesne.** Material ≠ Storage Location, Vendor ≠ Purchase
Order, Delivery ≠ Shipment. Eşleşme sağlanamaz, Skor %0.

### EWM transfer hassasiyeti

EWM içindeki farklı transfer türleri birbirinin alt nesnesi sayılmaz:

- EWM içi adresler arası transfer (Internal TO) ≠ MM↔EWM depolar arası transfer
  (Goods Movement 311/313)
- EWM Inbound Delivery mal kabulü ≠ EWM Internal Stock Transfer

Hard Gate düzeyinde değerlendirilir → Skor %0.

### 3rd-party entegrasyon ≠ toplu/manuel yükleme

Hedef SAP nesnesi (DMS Document, Material Master) aynı olsa bile **farklı alt
nesne** sayılır ve Hard Gate'te elenir:

- **3rd-party otomatik entegrasyon** — dış sistem push/event-driven, RFC/API/web
  servisle SAP'ye veri gönderir, tetikleyici dış sistemdedir.
  Alt nesne örneği: "Document Integration (3rd-Party)".
- **Toplu/manuel yükleme programı** — kullanıcı veya zamanlanmış job tarafından
  pull/batch mantığıyla çalıştırılan, dosya/tablo okuyup BAPI çağıran klasik
  ABAP raporu. Alt nesne örneği: "Document Mass Upload".

**Ayırt edici sinyaller.** Program adında UPLOAD/MASS/BATCH/TOPLU → yükleme
programı. Açıklamada "3rd-party sistem X'ten otomatik/real-time aktarım",
"API", "interface", "entegrasyon aracılığıyla" → 3rd-party entegrasyon.
Sinyaller çelişiyorsa alt nesne farklıdır, Hard Gate başarısız.

> **Kaçınılması gereken pratik:** "İkisi de Document yaratıyor, ikisi de DMS'e
> veri koyuyor" diyerek tek alt nesne altında birleştirmek. Bu isim/amaç
> benzerliğine dayanan yüzeysel bir eşleştirmedir. Tetikleme mekanizması
> (push/event ↔ pull/batch) ve veri kaynağı (dış sistem canlı verisi ↔ statik
> dosya/tablo) ayrı ayrı sorgulanmalıdır.

Bu kural, §5'teki "Program ≠ RFC/Servis" kuralıyla **karıştırılmamalıdır**: o
kural her ikisi de aynı alt nesneye aitken sadece arayüz şekli farklı olduğunda
puan kırpar. Burada tetikleme kaynağı ve iş akışı yönü baştan farklıdır, sorun
Alt Nesne seviyesindedir, Aşama 2'ye hiç geçilmez.

### FI/CO — benzer isim, farklı finansal anlam

FI/CO'da terimler kulağa neredeyse aynı gelse de finansal anlamı ve veri kaynağı
tamamen farklı olabilir. Sadece isim benzerliğiyle eşitleme; her biri farklı alt
nesnedir ve Hard Gate'te elenir:

- **Nakit Akım Raporu** (Statutory Cash Flow Statement) ≠ **Nakit Akışı Raporu**
  (Treasury/Liquidity plan-fiili raporu). Biri TFRS/IFRS yasal mali tablo seti
  (dönemsel kapanış raporlaması), diğeri hazine yönetimi için plan-fiili
  tahsilat/ödeme projeksiyonu (likidite karar desteği). Veri kaynağı, hesaplama
  mantığı ve kullanım amacı (denetim/statutory ↔ operasyonel/treasury) farklıdır.
- **Cari kart / cari hesap raporları.** "Cari" ortak kelimesi tek başına eşleşme
  nedeni değildir. Alt nesneyi raporun asıl işlevine göre belirle: *Running
  Balance / Yürüyen Bakiye* (dönemsel kümülatif toplam) ≠ *Payment /
  Cross-Module Reconciliation* (PO–Fatura–Ödeme çapraz kontrolü) ≠ *Aging /
  Yaşlandırma* ≠ *Statement / Ekstre*. Her biri farklı algoritma ve farklı veri
  kaynağı (tek modül FI hareketi ↔ çok modüllü MM+FI birleşimi) kullanır.

**Genel prensip.** FI/CO'da bir raporun alt nesnesini belirlerken sor: *"Bu
rapor hangi SAP sürecinin (yasal kapanış / hazine yönetimi / cari mutabakat /
bütçe kontrolü) çıktısıdır ve hangi kaynak veriyi (hesap bakiyesi / açık kalem /
planlama verisi / çok modüllü birleşim) kullanır?"* Cevaplar farklıysa isim
benzerliğine bakılmaksızın alt nesne farklıdır.

### HR — Personnel Action ≠ Infotype Batch

"Toplu aktarım/batch" ortak kelimesi tek başına eşleşme nedeni değildir:

- **Personnel Action / işlemler dizisi** (PA40 Action Type çerçevesi): işe alım,
  transfer, terfi, çıkış gibi bir **olay** tetiklendiğinde, o Action Type'a bağlı
  **önceden tanımlı sabit bir infotype zincirini** (0000→0001→0002→0006→0007→0008)
  birlikte ve iş kuralı validasyonlu yürüten transactional çerçeve.
- **Infotype batch program**: tek bir infotype'a (veya bağımsız infotype'lara)
  doğrudan toplu yazma yapan, aksiyon zinciri/iş kuralı çerçevesi içermeyen
  generic master data batch aracı (HR_INFOTYPE_OPERATION/BDC mantığı).

**Ayırt edici sinyal.** Açıklamada "işlemler dizisi", "personel
hareketi/aksiyonu", "işe alım/transfer/ayrılış" → Personnel Action. Sadece
"infotype güncelleme/aktarım" veya belirli bir infotype numarası (IT0006 Adres)
→ Infotype Batch.

### HR — hatırlatma/reminder alt domain ayrımı

"Hatırlatma/Reminder" ortak kelimesi tek başına eşleşme nedeni değildir; hangi
alt domainin hatırlatması olduğu netleşmelidir:

- **Zaman Yönetimi (PT)** hatırlatıcıları: devamsızlık, izin, kota, zaman
  değerlendirme, mesai onayı.
- **Kritik tarih / compliance** hatırlatıcıları: genelde IT0041 (Date
  Specifications) üzerinden takip edilen, PT ile ilgisi olmayan tarihler —
  deneme süresi bitişi, vize/ehliyet/sertifika/sözleşme bitişi, sağlık raporu
  geçerlilik süresi.

Bunlar birbirinin yerine geçmez. K adayının hangi infotype/sürece dayandığını
belirle; sadece "Reminder/Hatırlatıcı" kelimesine bakıp karar verme.

> **Kapsam farkı istisnası.** Aynı compliance/kritik tarih alt domaininde, G çok
> tipli/config-driven (birden fazla tarih türü) olup K tek bir hardcoded tarih
> türünü (örn. sadece deneme süresi) kapsıyorsa, bu alt nesne uyuşmazlığı
> **sayılmaz** — aynı temel mekanizma (tarih karşılaştırma + otomatik bildirim)
> olduğundan Hard Gate geçer. Kapsam farkı Aşama 2'de İş Süreci/Algoritma
> puanını düşürerek yansıtılır (bkz. SCORING.md, %70–85 bandı).

---

## 4. SAP iş süreci

Örnek süreçler: Create, Change, Display, Delete, Upload, Interface, Approval,
Release, Posting, Reversal, Settlement, Confirmation, Goods Movement.

**Süreç yaşam döngüsü zıtlığı.** Create ≠ Change, Posting ≠ Reversal, Approval ≠
Create. Approval ile Create kesinlikle aynı değildir; Create ile Change arasında
benzerlik olabilir.

**QM süreç ardışıklık kuralı.** QM döngüsündeki ardışık ama farklı adımlar
(Sonuç Girişi ≠ Kullanım Kararı ≠ Stok Transferi ≠ Stok İptali) birbirinin
yerine kullanılamaz. Aynı modülde ve benzer nesnelerde olsalar bile süreç
farklılığı İş Süreci skorunu en fazla "benzer/örtüşen" düzeyine (25 puan) çeker;
özdeş (40 puan) sayılamaz.

**Stok hareketi yönü.** İleri yönlü stok hareketi ≠ geri yönlü iptal/reversal.
Süreç zıtlığı kuralı uygulanır, İş Süreci skoru 0.

**PP üretim süreç ardışıklığı.** Birbirine bağlı ama farklı nesneli adımlar
birbirinin yerine geçemez:

- Üretim Siparişi Mal Girişi İptali (MIGO 102) ≠ Üretim Teyit İptali (CO13).
  CO13 mal hareketi içerse de başlangıç nesnesi "Confirmation"dır; MIGO 102'nin
  başlangıç nesnesi "Goods Receipt"tir. Alt nesne farklı → Hard Gate → %0.
- Planlı Sipariş Yaratma ≠ Planlı Sipariş → Üretim Siparişi Dönüşümü. Yaratma
  (BAPI_PLANNEDORDER_CREATE) ve dönüşüm (CO40) farklı SAP aksiyonları, farklı
  alt nesneler → Hard Gate → %0.
- Üretim Bildirimi/Teyit (CO11N) ≠ Mal Girişi (MIGO 101). Teyit içinde mal
  girişi olsa bile başlangıç nesnesi farklıdır; açıklamada her ikisi de
  geçiyorsa alt nesne uyumunu açıklama içeriğinden doğrula.

---

## 5. Teknik mimari, BAdI ve form kuralları

**Ortak tablo veya aynı BAdI/Enhancement kullanımı tek başına eşleşme nedeni
değildir.** Önce Modül, Ana Nesne, Alt Nesne ve Süreç uyuşmalıdır.
Açıklamalarda hangi tablo/BAdI/BAPI kullanıldığı belirtilmemiş olabilir; bu
durumda geliştirmenin fonksiyonuna uyan tablo/BAdI/BAPI'yi kendin belirle.

**Form / etiket / çıktı geliştirmeleri.** Adobe Form, ZPL, Smartform, SAPScript
— aynı teknolojiyi kullansalar bile şu dördünden herhangi biri farklıysa Hard
Gate başarısız, Skor %0:

- Tetikleme noktası (mal girişi tetiklemeli ≠ mal çıkışı tetiklemeli)
- Veri kaynağı (QUANT/stok bazlı ≠ teslimat bazlı ≠ sipariş bazlı)
- Süreç (giriş etiketi ≠ çıkış etiketi ≠ sevkiyat etiketi)
- Nesne (Purchase Order Form ≠ Invoice Form, Stok Etiketi ≠ Çıkış Etiketi)

Aynı form teknolojisi tek başına eşleşme gerekçesi olamaz.

**Program ≠ RFC/Servis.** G ve K'dan biri kullanıcı arayüzlü program (GUI ekranı,
ALV, Fiori), diğeri arayüzsüz servis/RFC ise Teknik Mimari + Nesneler kriteri
**en fazla 15 puan** alır (tam puan 25 yerine). Gerekçe: program mimarisi
(ekran, PBO/PAI, user exit) ile RFC/servis mimarisi (fonksiyon modülü, BAPI,
REST) farklı geliştirme iş yükü gerektirir.

**Veri akışı yönü.** Inbound ≠ Outbound, Read ≠ Write, Online ≠ Batch. Eşleşmeyi
bozar veya skoru düşürür.
