# Business Blueprint — doküman şablonu

Bu dosya, üretilen dokümanın **iskeleti**dir: hangi başlıklar, hangi sırayla,
hangi tablolar. Türkçedir çünkü çıktı Türkçedir ve tablo başlıkları dokümana
olduğu gibi giriyor. Başlıkların bir kısmı müşteri şablonundan İngilizce
geliyor (`PURPOSE`, `ANALYSIS`, `Current Situation`); o karışım şablonun
kendisidir, düzeltilecek bir şey değil.

İş akışı, kaynak önceliği ve yazım kuralları `SKILL.md`'de. Burada yalnızca
şekil var.

Her bölümün altındaki alt başlıklar ve tablolar **kaynak dokümanların
desteklediği ölçüde** kullanılır. Dolduracak bilgi olmayan bir alt başlık
boş bir tablo ile değil, **yokluğuyla** temsil edilir; ilgili konu `2.1.10
Açık Konular`a düşer.

---

## Her blokta geçerli: karşılığı olmayan alan yazılmaz

Aşağıdaki blokların alan listeleri **azamiyi** gösterir, doldurulacak formu
değil. Kaynakların karşılığını vermediği alan **satır olarak da yazılmaz** —
`Kontrol / karar noktası: —`, `Yetki gereksinimleri: Yok`,
`İş kuralları: Belirtilmemiştir` hiçbir şey söylemez ve belgeyi büyütür.
Gerçekten karara bağlanması gereken bir boşluğun yeri 2.1.10'daki açık konular
tablosudur.

Bu, tamamlılık şartını **bozmaz**: bölüm, tablo ve satır her zaman yazılır
(bkz. 3.4 ve 5.2). Atlanan şey blok içindeki tek bir alandır.

## Doküman başı — meta blok

Her dokümanın en üstünde, PURPOSE'tan önce:

```
Doküman adı
Modül
Süreç adı
İlgili SAP Best Practice Scope Item ID / ID'leri
Kullanılan kaynak dokümanlar   (adı ve tarihiyle; öncelik sırasıyla)
Doküman kapsamı                (kapsam maddesi + açıkça kapsam dışı olanlar)
```

---

## 1. PURPOSE

4–5 cümle. Şunları taşır: dokümanın amacı, iş sürecinin kapsamı, sürece dahil
temel fonksiyonlar/departmanlar, hedeflenen iş sonucu, ilgili SAP Best Practice
referansı (Scope Item ID ile).

Bu bölüm **son yazılır** — bütün bölümler bitmeden dokümanın neyi kapsadığı
doğru özetlenemez.

---

## 2. ANALYSIS

### 2.1 Current Situation

**Bu bölümde SAP hedef tasarımı yer almaz.** Kural `SKILL.md`'de; burada
yalnızca hatırlatma: işlem kodu, Fiori uygulaması, konfigürasyon, rol,
geliştirme, Best Practice, önerilen çözüm — hiçbiri. Bugün iş nasıl yapılıyor,
sadece o.

Alt başlıklar süreç içeriğine göre seçilir; aşağıdaki liste örnek yapıdır.

**2.1.1 Süreç Genel Bakışı** — başlangıç tetikleyicisi, bitiş noktası, dahil
olan birimler, temel iş amacı.

**2.1.2 Mevcut Organizasyon Yapısı ve Roller**

| Departman / Rol | Mevcut Sorumluluk | Kullandığı Araç / Ortam | Girdi / Çıktı |
|---|---|---|---|

**2.1.3 Mevcut Süreç Adımları** — baştan sona, numaralı. Her adımda: sorumlu
rol, tetikleyici, kullanılan bilgi, çıktı, kontrol noktası.

**2.1.4 Mevcut Veri, Doküman ve Kayıt Yapısı** — ana veri, işlem verisi,
Excel'ler, formlar, raporlar, e-postalar, kalite/müşteri/satıcı dokümanları.

**2.1.5 Mevcut Onay ve Kontrol Mekanizmaları** — onay seviyeleri, yetkiler,
manuel kontroller, görev ayrılıkları, istisna yönetimi.

**2.1.6 Mevcut Sistemler, Manuel Araçlar ve Entegrasyonlar** — mevcut
tablo anlatılır; hedef çözüm önerilmez. Mevcut bir SAP kullanımı **yalnızca
kaynak dokümanda açıkça geçiyorsa** yazılır.

**2.1.7 Mevcut Sorunlar ve İyileştirme İhtiyaçları** — maddeler halinde:
manuel bağımlılıklar, veri kalitesi riskleri, gecikmeler, izlenebilirlik
eksikleri, kontrol boşlukları, raporlama ihtiyaçları.

**2.1.8 Toplantı Kararları ve Süreç Netleştirmeleri** — hedef tasarımı
etkileyen **kesin** kararlar.

| No | Karar | Kaynak / Toplantı Tarihi | Sürece Etkisi |
|---|---|---|---|

**2.1.9 Tespit Edilen Tutarsızlıklar ve Karar Önceliği** — kaynaklar
arasında fark varsa. En güncel toplantı kararının esas alındığı açıkça
yazılır; **çelişkiden yeni bir karar üretilmez**.

| No | Konu | İlk Bilgi / Fast Scan Cevabı | Son Toplantı Kararı | Değerlendirme |
|---|---|---|---|---|

**2.1.10 Açık Konular ve Varsayımlar** — netleşmemiş her şeyin **tek evi**.
Düzyazıda "teyit edilmeli" gibi bir not yazılmaz; buraya satır eklenir.
Mümkünse sorumlu taraf ve alınması gereken karar da yazılır.

| No | Açık Konu / Varsayım | Etkilenen Süreç | Sorumlu | Durum |
|---|---|---|---|---|

---

## 3. BEST PRACTICE PROCESS FLOW

Yalnızca **bu dokümanın kapsamındaki** Best Practice. Scope Item ID görünür
yazılır:

```
Scope Item ID: 1FM
Scope Item Description: Quality Management in Procurement
```

Birden fazla Best Practice zorunlu olarak aynı dokümandaysa her biri ayrı
tabloda ve hangi adımda kullanıldığı belirtilerek gösterilir.

**3.1 İlgili SAP Best Practice Scope Item'ları**

| Scope Item ID | Best Practice Tanımı | Doküman Kapsamındaki Kullanım Amacı |
|---|---|---|

**3.2 Best Practice Süreç Akışı** — numaralı, iş odaklı, baştan sona. Uygun
olduğu ölçüde: tetikleyici, ana veri hazırlığı, planlama/ihtiyaç, işlem
yürütme, kalite/kontrol/onay, istisna/hata, muhasebe/maliyet etkisi,
raporlama/izleme.

Her adım için:

```
[Süreç Adımı]
İş amacı:
Girdi:
Çıktı:
Kontrol / karar noktası:
```

Adımlar ve uygulama kimlikleri **paketli referanstan** gelir (`SKILL.md`,
adım 5). Hafızadan Best Practice yazılmaz.

Sorumlu rol, kullanılan SAP fonksiyonu ve Best Practice ID burada
**yazılmaz** — üçü de 3.3'ün tablosunda, adım adına bağlı olarak duruyor.
Aynı olguyu iki kez basmak belgeyi büyütür, okunurluğunu artırmaz.

**3.3 İlgili SAP Uygulamaları, İşlemler ve Roller** — yalnızca kapsamdaki
süreç için gerekenler.

| İş Faaliyeti | Fiori Uygulaması / İşlem | Uygulama ID / T-Code | İş Rolü | Best Practice ID |
|---|---|---|---|---|

**3.4 Fit-Gap Değerlendirmesi** — Best Practice'in her adımı için. Bu tablo
GAP'leri de taşır; ayrı bir "Differences" tablosu yoktur. İster listesi
verildiyse **İster Ref** sütunu eklenir.

**3.3 ve 3.4 her bölümde zorunludur** ve 3.2'de sayılan **her adım** için bir
satır taşır. Tekrar yasağı blok içindeki *alanı* kaldırır; bölümü, tabloyu veya
satırı asla kaldırmaz. Adım 3.2'de varsa Fit-Gap'te de vardır.

| Best Practice Adımı | Fit / Partial Fit / Gap | Gerekçe | Kaynak | İş Etkisi | Öncelik | Önerilen Yaklaşım | İster Ref |
|---|---|---|---|---|---|---|---|

---

## 4. FUNCTIONAL DESIGN

Hedef süreç S/4HANA üzerinde nasıl tasarlanacak. Toplantı kararları + kapsam
içi Best Practice'ler temel alınır; akış uçtan uca izlenebilir olmalı. **Her
hedef tasarım kararı bir toplantı notuna ya da kaynak dokümana geri
izlenebilmeli.**

**4.1 Hedef Süreç Genel Bakışı** — amaç, kapsam, tetikleyiciler, roller, ana
çıktılar, beklenen iş faydası.

**4.2 Hedef Uçtan Uca Süreç Akışı** — numaralı adımlar. Her adımda: süreç
adımı, sorumlu rol, SAP fonksiyonu/uygulaması/işlem kodu, oluşacak/kullanılacak
belge, kontrol/onay/validasyon, sonraki adıma etkisi, ilgili Best Practice ID.

**4.3 Organizasyon Yapısı Tasarımı** — yalnızca ilgili modül ve süreç için
gerekli satırlar.

| Organizasyon Unsuru | Hedef Tasarım | Açıklama |
|---|---|---|
| Company Code | | |
| Plant | | |
| Storage Location | | |
| Purchasing Organization | | |
| Purchasing Group | | |
| Sales Organization | | |
| Distribution Channel | | |
| Division | | |
| Production Plant / Work Center | | |
| Warehouse / EWM Yapısı | | |
| Cost Center / Profit Center | | |
| Quality Organization / Inspection Setup | | |

**4.4 Ana Veri Tasarımı**

| Ana Veri Nesnesi | Gerekli Alanlar / Nitelikler | Veri Sahibi | Oluşturma / Güncelleme Yöntemi |
|---|---|---|---|

Modüle göre tipik ana veriler — kontrol listesi, kaynak dokümanın söylediğiyle
sınırlı:

| Modül | Ana veriler |
|---|---|
| MM | malzeme, tedarikçi, satınalma bilgi kaydı, kaynak listesi, kota düzenlemesi |
| SD | müşteri, malzeme, fiyatlandırma koşulları, satış alanı verileri |
| PP | malzeme, BOM, rota, iş merkezi, üretim versiyonu, MRP parametreleri |
| QM | malzeme kalite görünümü, muayene planı, muayene karakteristikleri, örnekleme prosedürü, kalite bilgi kaydı, kalite bildirimi |
| OM | şirket kodu, tesis, depo yeri, satınalma/satış organizasyonu, iş merkezi, maliyet merkezi |
| FI | hesap planı, ana hesap, müşteri, tedarikçi, vergi kodu, banka, ödeme koşulu |
| CO | maliyet merkezi, faaliyet türü, iç sipariş, kâr merkezi, maliyet unsurları, dağıtım/devir döngüleri |

**4.5 İşlemsel Belge Tasarımı**

| Belge / Nesne | Amaç | Oluşturma Yöntemi | Temel Kontroller | Entegrasyon Etkisi |
|---|---|---|---|---|

**4.6 Workflow, Onay ve Yetki Tasarımı** — onay gerekmiyorsa bu **açıkça**
yazılır; başlık boş bırakılmaz.

| Workflow Adımı | Tetikleyici | Onaylayan / Sorumlu Rol | Karar | Sonraki İşlem |
|---|---|---|---|---|

**4.7 Entegrasyon Tasarımı** — modüller arası (MM/SD/PP/QM/OM/FI/CO) ve varsa
harici sistem, **kaynak dokümana dayanarak**.

| Entegrasyon | Kaynak | Hedef | Veri / Belge | Tetikleyici | Hata Yönetimi |
|---|---|---|---|---|---|

**4.8 Raporlama, İzleme ve KPI Tasarımı**

| İş İhtiyacı | Standart SAP Çözümü | Uygulama / İşlem | Ek Geliştirme İhtiyacı |
|---|---|---|---|

**4.9 Hata ve İstisna Yönetimi** — her önemli istisna için.

| İstisna / Hata | Olası Neden | Sorumlu Rol | Çözüm Yöntemi | Eskalasyon |
|---|---|---|---|---|

---

## 5. DEVELOPMENTS

Yalnızca standart SAP ve konfigürasyonla **karşılanamayan** gereksinimler.
Her aday için önce şu soru: gerçekten gerekli mi?

- Standart karşılıyorsa: *"Geliştirme gerekmiyor – standart fonksiyon
  kullanılacaktır."*
- Konfigürasyon karşılıyorsa: *"Geliştirme gerekmiyor – konfigürasyon ile
  karşılanacaktır."*
- Aksi halde geliştirme nesnesi ayrıntılı tanımlanır.

Bu üç beyandan biri **her aday için** yazılır; sessizce geliştirme listesine
düşmez.

Türler: Z rapor · Fiori uygulaması/genişletmesi · arayüz · IDoc/API/BAPI/web
servis · form/çıktı · workflow · enhancement/BAdI/user exit · validasyon · veri
dönüşümü/yükleme · otomatik bildirim · dashboard/KPI.

**5.1 Geliştirme Listesi** — ister listesi verildiyse **İster Ref** sütunu
eklenir.

| No | Geliştirme Nesnesi | Geliştirme Türü | İş Gereksinimi | Öncelik | İlgili Süreç Adımı | İster Ref |
|---|---|---|---|---|---|---|

**5.2 Geliştirme Detayları** — her geliştirme için ayrı alt başlık. Bu blok
`fs-generator`'ın girdisi olacak kadar somut olmalı.

**5.1'in her satırının 5.2'de bir bloğu vardır** — biri diğerinden kısa olamaz.
Tekrar yasağı bloktan *alan* siler, blok saydırmaz.

Türü, iş gereksinimi, önceliği ve ilgili süreç adımı **burada tekrarlanmaz**
— dördü de 5.1'de, geliştirme adına bağlı olarak duruyor.

```
5.2.X [Geliştirme Adı]
İş gerekçesi:
Kullanıcı / sorumlu rol:
Girdi verileri:
Çıktı verileri:
İş kuralları ve validasyonlar:
Hata mesajları ve hata yönetimi:
Yetki gereksinimleri:
Entegrasyon bağımlılıkları:
Raporlama / log ihtiyacı:
Test senaryoları:
Tahmini kapsam:
```

---

## Doküman sonu

İki kısa özet, her dokümanda:

- **Kapsam Dışı Bağımlılıklar** — kapsam dışı olup bu süreçle arayüzü/bağımlılığı
  olan konular, tasarım detayı olmadan.
- **Açık Konular** — `2.1.10`'un özeti; yeni madde eklenmez, oraya işaret eder.
- **Karşılanmayan İsterler** — ister listesi verildiyse, hiçbir bölümün ele
  almadığı ister numaraları. Kapsam dışı mı, atlanmış mı — kararı okuyan verir.
