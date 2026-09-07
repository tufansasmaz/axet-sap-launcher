# [FS-NO] — [GELİŞTİRME BAŞLIĞI]

> Varsayılan NTT FS şablonu. Kullanıcı kendi şablonunu verdiyse BU DOSYA KULLANILMAZ.
> Köşeli alanlar reçeteden (CLAUDE.md), kullanıcı girdilerinden ve analiz
> dokümanlarından doldurulur. Proje reçetesi ek zorunlu bölümler tanımlıyorsa
> sona eklenir.

## 1. Doküman Kontrolü

| Alan | Değer |
|---|---|
| FS No | [FS-<MODÜL>-<NNN> — reçetedeki numaralandırma] |
| Geliştirme Başlığı | [BAŞLIK] |
| Müşteri | [reçeteden] |
| Proje | [reçeteden] |
| Modül | [FI / SD / MM / ...] |
| WRICEF Tipi | [Report / Interface / Conversion / Enhancement / Form / Workflow] |
| SAP Ürün + Sürüm | [reçeteden] |
| Hazırlayan | [DANIŞMAN ADI] |
| Tarih | [YYYY-AA-GG] |
| Durum | Taslak |

### Değişiklik Geçmişi

| Sürüm | Tarih | Yazan | Açıklama |
|---|---|---|---|
| 0.1 | [TARİH] | [AD] | İlk taslak |

## 2. Amaç ve Kapsam

[Geliştirmenin iş amacı 2-4 cümle. Neyi kapsar, neyi KAPSAMAZ.]

## 3. Mevcut Durum (As-Is)

[Bugünkü süreç/çözüm. Kaynak dokümanlardan; yoksa [Açık Konu].]

## 4. Hedef Süreç (To-Be)

[Numaralı adımlarla hedef akış. Her adım kaynak dokümana/kullanıcı cevabına dayanır.]

## 5. Fonksiyonel Gereksinimler

| No | Gereksinim | Kaynak |
|---|---|---|
| FR-001 | [Gereksinim cümlesi] | [doküman/görüşme referansı] |
| FR-002 | ... | ... |

## 6. İş Kuralları ve Doğrulamalar

| No | Kural | Hata Davranışı |
|---|---|---|
| BR-001 | [Kural] | [mesaj/engelleme/uyarı] |

## 7. Girdi / Çıktı ve Ekran Tasarımı

[Seçim ekranı alanları, ALV kolonları, form/arayüz yapısı — WRICEF tipine göre.
Alan listelerinde: alan adı, veri öğesi/tablo-alan, zorunluluk, varsayılan.]

## 8. Yetkilendirme

[Yetki nesneleri / roller. Girdi sessizse: [Açık Konu].]

## 9. Hata Yönetimi ve Loglama

[Hata senaryoları, mesaj sınıfı beklentisi, log/izleme ihtiyacı, audit-trail.]

## 10. Test Senaryoları

| No | Senaryo | Beklenen Sonuç |
|---|---|---|
| TC-001 | [Adımlar] | [Sonuç] |

## 11. Açık Konular ve Varsayımlar

[FS genelindeki tüm [Açık Konu], [Varsayım], [Bağımlılık], [Netleştirilmesi
Gereken Nokta] etiketlerinin toplu listesi — inceleyen tek bakışta görsün.]

## 12. Onay

| Rol | Ad | Tarih | İmza/Onay |
|---|---|---|---|
| İş Birimi | | | |
| Modül Danışmanı | | | |
| Proje Yöneticisi | | | |
