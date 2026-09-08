---
name: celonis-ocpm-builder
description: >
  Celonis'te ham kaynak tablolardan Object-Centric Process Mining (OCPM) modeli kurar.
  Keşif, obje/event tipi türetme, transformation SQL, obje/event/relationship yaratma (REST API),
  perspective ve doğrulama. "OCPM kur", "obje yarat", "event log çıkar", "data model kur",
  "kaynak tabloları incele", "join haritası çıkar" gibi isteklerde tetiklenir.
  Süreç-agnostik: P2P, O2C, AP, AR veya custom — şablona göre değil, gerçek şemaya göre karar ver.
---

# Celonis OCPM Builder

Ham ERP tablolarından OCPM modeli kur. Sırayla ilerle, her fazı doğrulamadan sonrakine geçme.

---

## 0. Temel kurallar

1. **Keşfetmeden inşa etme.** Şablondan obje türetme. Gerçek şemayı oku, ölç, sonra karar ver.
2. **Ölç, varsayma.** Coverage %, cardinality, distinct — hepsi ölçülür.
3. **Önce kök neden.** Hata alınca sebebi bul; körlemesine retry veya dosya yeniden üretme yok.
4. **Belirsizlikte sor.** İş mantığı kararı (lead obje, hangi kaynaktan supplier) teknik karar
   değil — kullanıcıya sor, tahmin etme.
5. **Uydurma.** Bir API/alan bilinmiyorsa "bilmiyorum" de. Aşağıdaki keşif teknikleriyle bul.

---

## 1. Ortam gerçekleri (deneyle doğrulanmış)

### Neyin ne olduğu
- **pycelonis: OCPM API'si YOK.** Obje/event/relationship/transformation-bağlama yaratamaz.
  Sadece enum'lar var (`SchemaType.OCPM`, `DataJobType.OCDM`), çağrılabilir metod yok.
  `pool.create_job()` + `create_transformation()` **OCPM'e bağlı değildir** — bu genel amaçlı
  pool transformation'ı üretir, sıradan bir pool tablosu yaratır, OCDM şemasıyla hiçbir ilişkisi
  olmaz. Bunu OCPM obje/event doldurmak için kullanmayın (bkz. §6 — bu hata bir kere yapıldı,
  öksüz tablolarla sonuçlandı).
- **pycelonis: extraction YOK.** Kaynak veri çekimi UI connector işi.
- **Obje/event/relationship yaratma → belgelenmemiş REST API** (`/bl/api/v2/...`, §2). AppKey
  Bearer ile çalışır.
- **Obje/event tipine SQL bağlama → SQL Factory, ayrı belgelenmemiş REST API** (§6). Bu da
  DevTools capture ile bulundu, pycelonis'te karşılığı yok.
- **PQL sorgu endpoint'i Objects&Events REST yüzeyinde YOK.** `CREATE_EVENTLOG` doğrulaması
  (bkz. §8) bu REST API ile değil, **Studio/Analytics tarafında** (Knowledge Model + Analysis)
  yapılır. 5 endpoint denendi, hiçbiri gerçek değildi — bu API üzerinde PQL sorgulama arayışı
  boşuna, tekrar deneme.
- **FAZ A keşif için geçici data model'de (ZZ_DISCOVERY_TMP) generic pool transformation hâlâ
  geçerli** (`pool.create_job()`) — çünkü orada OCPM'e bağlamıyoruz, sadece PQL motorunu
  kullanılabilir kılıyoruz. Orada motor Vertica/CeloSQL, Spark SQL DEĞİL:
  - `CREATE OR REPLACE TABLE` **çalışmaz** → `DROP TABLE IF EXISTS` + `CREATE TABLE`
  - Tip adları: `VARCHAR`, `FLOAT`, `INTEGER`, `TIMESTAMP` (Spark tipleri değil)
  **SQL Factory'de bu DROP/CREATE deseni GEÇERSİZ** — orada düz `SELECT`, hedef tabloyu
  Celonis yönetir (bkz. §6).

### Doküman seçimi kritik
- OCPM için **tek doğru kaynak:** `data-modeling-reference.md` (docs.celonis.com OCPM bölümü).
- Bootcamp/partner-enablement doc'ları (`01A/01B/01C`) **klasik case-centric** anlatır.
- **`create_foreign_key` OCPM ilişkisi DEĞİLDİR.** O case-centric data model API'si. OCPM'de
  kullanırsan M:N kaybolur, gizli event/relationship tabloları oluşmaz, `CREATE_EVENTLOG`
  çalışmaz. Kullanma.

---

## 2. OCPM REST API (belgelenmemiş, deneyle doğrulanmış)

```
BASE = {CELONIS_URL}/bl/api/v2/workspaces/{poolId}
AUTH = Authorization: AppKey {base64(appKeyId:secret)}
```
`bl` = business layer. `?environment=develop` (varsayılan) / `production` (readonly).

**⚠️ Header adı `AppKey`, `Bearer` DEĞİL.** `conn_celonis.txt`'teki `CELONIS_API_TOKEN` zaten
`base64(appKeyId:secret)` formatında hazır duruyor — direkt `Authorization: AppKey <token>` olarak
gönder, decode/re-encode etme.

**Pool ID'yi bulma — dökümante edilmemiş, deneyle bulundu:**
```
GET /integration/api/pools
```
Auth eden App Key'in erişebildiği **tüm data pool'ları JSON döner** (`id`, `name`,
`dataPoolType`, `permissions`). `/bl/api/v2/workspaces` altında pool listeleme endpoint'i
YOKTUR (`400`/`404` — sadece tekil pool işlemleri var); pool ID'sine önce bu endpoint'ten ulaş,
sonra `{poolId}`'yi §2 tablosundaki `/bl/api/v2/workspaces/{poolId}/...` çağrılarına geçir.
Denenip **404 SPA fallback** döndüğü için işe yaramayan adaylar: `/bl/api/v2/workspaces`,
`/data-integration/api/pools`, `/continuous-engine/api/pools`, `/api/pools` — hepsi ya `400`
veriyor ya da Angular SPA index.html'ini (`Content-Type: text/html`) döndürüyor, JSON değil.

| İşlem | Method + Path |
|---|---|
| **Pool listesi** | `GET /integration/api/pools` ← ayrı servis (`data-integration`), `/bl/` altında DEĞİL |
| Obje tipleri | `GET/POST /types/objects` |
| Tek obje | `GET/PUT/DELETE /types/objects/{id}` |
| Event tipleri | `GET/POST /types/events` |
| **Relationship** | `POST /types/objects/relationships` ← **ayrı endpoint** |
| Relationship silme | `DELETE /types/objects/{sourceId}/relationships/{targetId}?relationship=<name>` (ID'ler UUID) |
| Giden ilişkiler | `GET /types/objects/{id}/relationships/outgoing?requestMode=ALL` |
| Perspective | `GET/POST /perspectives` |
| Ortamlar | `GET /environments` |
| Versiyon yaratma | `POST /pacman/api/core/packages/pig-{uuid}/versions` (pig = Process Intelligence Graph; pig UUID `GET /environments` yanıtındaki `packageKey`'den gelir, pool ID DEĞİL) |
| **Deploy (gerçek endpoint)** | `POST /bl/api/packages/pig-{uuid}/deploy` — bkz. §7.1. **`/pacman/api/deployments` DEĞİL** (o Studio Apps'in mekanizması, `deployableType` için hep 500 döner, yanlış subsystem) |

### Obje tipi yaratma
```json
POST /types/objects?environment=develop
{
  "name": "PurchaseOrder",
  "tags": [], "description": "", "categories": [], "relationships": [],
  "color": "#4608B3",
  "fields": [
    {"name": "ID", "namespace": "custom", "dataType": "CT_UTF8_STRING"},
    {"name": "SUPPLIER_ID", "namespace": "custom", "dataType": "CT_UTF8_STRING"}
  ]
}
```

**`ID` alanı ZORUNLU** — `name:"ID"`, `CT_UTF8_STRING`. Yoksa `ID_FIELD_NOT_FOUND`.

### dataType — sadece 5 geçerli değer
```
CT_UTF8_STRING   string
CT_LONG          tamsayı
CT_DOUBLE        ondalık
CT_BOOLEAN       boolean
CT_INSTANT       zaman damgası (ayrı DATE/TIMESTAMP/DATETIME YOK)
```
Başka hiçbir `CT_*` geçerli değil (CT_INTEGER, CT_DATE, CT_TIMESTAMP... hepsi reddedilir).

### Event tipi yaratma
```json
POST /types/events?environment=develop
{
  "name": "PurchaseOrderCreated",
  "namespace": "custom",
  "tags": [], "description": "", "categories": [],
  "fields": [
    {"name": "ID",               "namespace": "custom", "dataType": "CT_UTF8_STRING"},
    {"name": "Time",             "namespace": "custom", "dataType": "CT_INSTANT"}
  ]
}
```

**Zorunlu timestamp alanı adı tam olarak `Time`** (`CT_INSTANT`) — `EVENTTIME` veya başka bir
isim DEĞİL. Yoksa `TIME_FIELD_NOT_FOUND`. Obje tarafındaki `ID` zorunluluğunun event
karşılığı budur.

Event-obje ilişkisi için bkz. **§7.2** — `HAS_ONE`/`HAS_MANY` relationship gerekir. Tip
tanımına (`fields`) manuel bir FK alanı (`PURCHASEORDER_ID` gibi) EKLEME — relationship bu adı
rezerve eder. Veri, SQL Factory seviyesinde cardinality'ye göre farklı bir kanaldan gider
(`relationshipTransformations` ya da `foreignKeyNames`+gömülü kolon, bkz. §7.2).

### Relationship yaratma — obje gövdesinde DEĞİL, ayrı endpoint
```json
POST /types/objects/relationships?environment=develop
{
  "bidirectional": true,
  "cardinality": "MANY_TO_MANY",
  "source": {"object": {"name": "PurchaseOrder",   "namespace": "custom"},
             "relationship": "SupplierInvoice"},
  "target": {"object": {"name": "SupplierInvoice", "namespace": "custom"},
             "relationship": "PurchaseOrder"}
}
```

**Obje referansı `name` + `namespace` ile — UUID ile DEĞİL.** En sık hata bu.
Cardinality: `MANY_TO_MANY`, `MANY_TO_ONE`, `ONE_TO_MANY`.
Okurken `HAS_ONE` / `HAS_MANY` olarak döner.

### Relationship silme
Obje tipini silmeden önce üzerindeki ilişkiler silinmeli — yoksa `OBJECT_REFERENCED_IN_O2O`.
```
DELETE /types/objects/{sourceObjectId}/relationships/{targetObjectId}?relationship=<relationshipName>&environment=develop
```
Path'teki her iki ID de **UUID** (obje `id`'si, `name` değil) — POST'un tam tersi. `relationship`
adı query param'da gider. 204 döner.

### İsimlendirme kuralları (API zorlar)
- **Obje/event tipi adı `^\p{L}[\p{L}0-9]{0,39}$` regex'iyle doğrulanır: harfle başlar, sadece
  harf+rakam, UNDERSCORE DAHİL hiçbir özel karakter/boşluk kabul edilmez.** `PurchaseOrder_Created`
  reddedilir (`REQUEST_VALIDATION`) → `PurchaseOrderCreated` kullan. Bu kısıtlama sadece tipin
  kendi `name`'i için geçerli; attribute/field isimlerinde (`PO_NUMBER` vb.) underscore serbest.
  SQL Factory kullanıldığı için transformation tablo adı diye bir şey yok (bkz. §6) — factory'nin
  `displayName`'i serbest, ama `target.entityRef.name` tip adıyla birebir eşleşmeli.
- Uzunluk: obje/event tipi **40**, attribute **50**, relationship **41** karakter
- Attribute ve relationship isimleri obje içinde benzersiz (case-insensitive)
- Yasaklı: `activity` (event tipinde), `epoch` (her ikisinde)

---

## 3. Belgelenmemiş API keşif teknikleri

Bir endpoint/şema bilinmiyorsa uydurma — bunları kullan:

1. **`OPTIONS` → `allow` header.** Hiçbir şey yaratmadan hangi method'ların desteklendiğini
   söyler. En güvenli keşif aracı.
2. **Bu API 404 değil, 400 döner.** Ayrım hata tipinden:
   - `GENERIC` / `MESSAGE_NOT_READABLE` → **path veya gövde şekli yanlış**
   - `RESOURCE_NOT_FOUND` → path doğru, ID yok
   - `ENTITY_VALIDATION` / `REQUEST_VALIDATION` → path ve şekil doğru, alan hatalı
3. **Enum bisect.** Geçersiz enum → JSON parse aşamasında düşer (`MESSAGE_NOT_READABLE`).
   Geçerli enum + eksik alan → validation aşamasına ulaşır (`ENTITY_VALIDATION`).
   Bu fark ile geçerli enum değerlerini eleyerek bul.
4. **DevTools capture.** Şema polymorphic ise (Jackson discriminator) kör tahmin işe yaramaz —
   her denemede aynı generic hata gelir. O noktada durup UI'da işlemi bir kez elle yap,
   F12 → Network → Fetch/XHR → giden POST → *Copy as cURL*. Tek doğru kaynak budur.
   **Kör tahminde ısrar etme; 3 denemede alan-bazlı hataya düşemiyorsan capture iste.**
5. **Yakalanan cURL cookie/session auth kullanır.** Ajan için Bearer AppKey'e çevir; önce
   `GET` ile 200 aldığını doğrula.

---

## 4. FAZ A — Keşif (asla atlanmaz)

Ham pool tabloları doğrudan sorgulanamaz → **geçici data model** kur (FK'siz, sadece PQL motoru).
Adı açıkça geçici olsun (`ZZ_DISCOVERY_TMP`).

### A1. Şema envanteri
Satır sayısı, kolon, tip, uzunluk.

### A2. Sabit kolon taraması — ZORUNLU, istisnasız her kolon
`distinct == 1` → **ölü kolon.** İsmi cazip olabilir (`TAX_DOC_NO`, `INVOICE_NO`, `DOC_NUMBER`)
ama tek değer taşıyorsa join yolu değildir. İsme bakıp atlama — **ölç.**
`distinct == satır sayısı` → aday PK (sürekli sayısal/tarih alanlar yanıltır, dikkat).

Global `distinct=1` yetmez. Kolonu **anlamlı alt kümelere bölerek de tara** (yıl, şirket kodu,
kaynak sistem). Bir kolon global değişken ama belirli bir alt kümede sabit olabilir — bu da ölü
join yolu/veri kalitesi sinyalidir.
Ayrıca: distinct sayısı satır sayısına **yakın ama eşit değilse** (örn. 112/120), bu **sahte
anahtar** olabilir — PK sanıp join'leme, önce sebebini bul (whitespace, trailing karakter, format
farkı vb.).

### A3. Join haritası — ölçerek
Coverage %, yetim kayıt (iki yönde), **cardinality dağılımı** (1/2/3+ dağılımı, sadece "1:N" değil).
Tek kolonla join'de satır patlıyorsa **bileşik anahtar** gerekiyordur.

### A4. M:N tespiti — VE GRAIN HASSASİYETİ
M:N = her iki yönde de 1'den fazla bağlantı.

**Kritik:** Aynı veri farklı grain'de farklı cardinality gösterir.
Örnek (gerçek): `PO_ITEM ↔ Invoice` = **1:1**, ama `PO_HEADER ↔ Invoice` = **M:N**
(bir PO'nun kalemleri farklı faturalara dağıldığı için).

→ **Cardinality'yi HER grain seviyesinde ayrı ölç.** Tek seviyede ölçüp genelleme yapma.
→ Yanlış grain seçersen M:N görünmez ve OCPM'in gerekçesi çöker.

**Önce köprü tablolarını tespit et:** Bir tablonun kolonları ağırlıklı olarak iki BAŞKA tabloya
FK ise, o bir köprü (bridge/junction) tablosudur. Örnek: `EKSPERTIZ_KALEM`, `INVOICE_ITEM`,
`ORDER_LINE_ALLOCATION`.

**KRİTİK: Bir varlığı KENDİ köprü tablosuna karşı test ETME.** Bu her zaman 1:N verir — köprü
tanımı gereği her iki tarafa N'dir. Tautolojik sonuç, bilgi değeri yok.

**DOĞRU TEST — köprü üzerinden İKİ SIÇRAMA, iki EBEVEYN arasında:**
```
A --(köprü)-- B
ölç: A başına distinct B sayısı
ölç: B başına distinct A sayısı
ikisi de >1 ise ⇒ M:N
```
- Örnek (YANLIŞ): `HASAR_KALEM vs EKSPERTIZ_KALEM` → hep 1:N çıkar (aynı köprünün iki tarafı)
- Örnek (DOĞRU): `EKSPERTIZ vs HASAR_KALEM` → köprü üzerinden, iki gerçek ebeveyn

**Bileşik anahtar = global kimlik:** `(PARENT_ID, SEQ_NO)` bir bileşik anahtarsa ve o kombinasyon
benzersizse, bu GLOBAL bir kimliktir. `SEQ_NO`'nun tek başına yerel (parent-scoped) olması bunu
değiştirmez. "Sıra numarası yerel, o yüzden sahte M:N" diyerek testi GEÇERSİZ SAYMA.

**M:N sinyali aldıktan sonra onu reddediyorsan, reddetme gerekçeni VERİYLE doğrula:** eşleşmeyen
anahtar sayısını ölç. 0 ise sinyal gerçektir — "muhtemelen çakışma" diyerek atlama.

### A5. Fan-out / divergence
Ortak ata üzerinden iki yana dallanma (N:1:N). Doğrudan join → satır patlar.
Divergence noktasında `PU_` ile topla, sonra join'le.

### A6. Free-text / koşullu tipli alanlar
Çok değerli alanlar, gömülü referanslar, `CHANGE_TYPE`'a göre tipi değişen `OLD/NEW_VALUE`.
**Transformation layer'da parse edilir, PQL'de ASLA.**

### A7. Timestamp envanteri
Null oranı + karşılık gelen event. Yüksek null = **koşullu event**.

### A8. Döngü/tekrar tespiti
Her event adayı için: aynı obje örneğine kaç kez tekrar ediyor?
Max tekrar >1 olan event tipleri **döngü** demektir.
Döngü process mining'de birinci sınıf yapıdır — rework, itiraz, yeniden açılma.
Raporda ayrıca belirt: hangi eventler tekrar ediyor, kaç kez, kaç objede.

### Keşif bitince DUR, rapor sun, onay al.

---

## 5. FAZ B — Obje & Event tasarımı

### Naming
```
o_<ns>_<Object>   e_<ns>_<Event>   r_o_ / r_e_ (relationship)
el_ (sistem event log, otomatik)   el__ (custom)
```
Bu tablolar Celonis'in kendi yönettiği OCDM şeması — siz bunları yaratmazsınız, isimlerini de
seçmezsiniz. Kendi transformation'ınızı SQL Factory ile tanımlarsınız (bkz. §6); orada tablo
adı değil, `displayName` + `target.entityRef.name` vardır.

### Grain
Her obje için grain'i açıkça yaz ve gerekçelendir. Header mı, item mı?
**M:N ve fan-out farklı grain'lerde yaşayabilir** → ikisini de yakalamak için header ve item'ı
**ayrı obje tipleri** yap. Tek grain'e zorlarsan birini kaybedersin.

### Lead obje
Lead obje seçimi **satır sayısını değiştirir**, aynı event seti olsa bile. Bilinçli seç.

### Event divergence tuzağı — DİKKAT
Bir event'i doğal grain'inden daha ince bir grain'e join'lersen **event çoğalır.**
Örnek: `Invoice_Posted` (header grain, 61 satır) `INVOICE_ITEM` ile join'lenirse 119 olur — aynı
fatura için birden fazla "Posted" event'i. **Bu tam da OCPM'in çözmek için var olduğu hata.**

→ Event'i **kendi doğal grain'inde** tut. Item-level bağlantı gerekiyorsa **relationship** ile
kur, event'i item'a çekerek değil.

### Statik ilişkiyi event'e asma
Header–item ilişkisi **yapısal bir gerçek**, bir olayın yan ürünü değil. O2O relationship ile
kur. Event'e bağlarsan event filtrelenince ilişki kaybolur.

### Event tipi ayrıştırma
Alt tipleri ayrı event tipi yap (`PriceChanged` / `QuantityChanged` / `DateChanged`), tek
"Changed" altında ezme — yoksa variant analizinde hangi değişikliğin darboğaz yarattığı görünmez.

---

## 6. FAZ C — SQL Factory (obje/event tipine SQL bağlama)

**YANLIŞ ZİHİN MODELİ (düzeltildi):** `t_o_`/`t_e_` prefix'li kendi tablolarını `DROP TABLE
IF EXISTS` + `CREATE TABLE ... AS SELECT` ile yaratıp pool'a bırakmak **tamamen yanlış**. Bu
tablolar hiçbir OCDM şemasına bağlanmaz, öksüz kalır — obje/event tipi ile aralarında hiçbir
ilişki yoktur. `pool.create_job()` + generic transformation task da bu işi yapmaz (o mekanizma
sıradan pool tabloları üretir, OCPM'in haberi olmaz).

**DOĞRU mekanizma: SQL Factory.** Her obje tipi / event tipi için ayrı bir "factory" kaydı
vardır; SQL'iniz **düz bir `SELECT`'tir, `DROP`/`CREATE TABLE` YOK**. Hedef tabloyu Celonis
kendi yönetir — siz sadece kaynak sorguyu ve hangi obje/event tipine, hangi attribute'lara
eşleneceğini tanımlarsınız. Bu, belgelenmemiş bir REST API — DevTools capture ile bulundu.

### Akış
1. `POST` ile boş bir taslak (draft) factory yarat → `factoryId` döner.
2. `PUT` ile factory'yi gerçek SQL + attribute eşlemesiyle doldur.
3. `POST .../validate` ile doğrula.
4. Preview için `POST .../dataset-preview`.
5. Gerekirse `DELETE` ile factory'yi sil.

### 1) Taslak yarat
```
POST /bl/api/v2/workspaces/{poolId}/factories/sql?environment=develop&useV2Manifest=true
```
```json
{
  "factoryId": "00000000-0000-0000-0000-000000000000",
  "namespace": "custom",
  "changeDate": 0,
  "creationDate": 0,
  "dataConnectionId": "",
  "displayName": "PurchaseOrder",
  "target": {
    "entityRef": {"name": "PurchaseOrder", "namespace": "custom"},
    "kind": "OBJECT"
  },
  "draft": true,
  "localParameters": [],
  "changedBy": {},
  "createdBy": {}
}
```
`factoryId` alanındaki sıfırlar dummy — gerçek `factoryId` yanıtta döner.

### 2) SQL + eşleme ile doldur
```
PUT /bl/api/v2/workspaces/{poolId}/factories/sql/{factoryId}?environment=develop&useV2Manifest=true
```
```json
{
  "factoryId": "<uuid>",
  "namespace": "custom",
  "description": null,
  "displayName": "PurchaseOrder - 1",
  "dataConnectionId": "",
  "sourceSystem": "",
  "target": {
    "entityRef": {"namespace": "custom", "name": "PurchaseOrder"},
    "kind": "OBJECT"
  },
  "transformations": [{
    "namespace": "custom",
    "foreignKeyNames": [],
    "propertyNames": ["COMPANY_CODE", "ID", "PO_NUMBER", "PO_TYPE", "SUPPLIER_ID"],
    "propertySqlFactoryDatasets": [{
      "id": "PurchaseOrderAttributes",
      "disabled": false,
      "sql": "SELECT 'PurchaseOrder::' || \"PO_HEADER_PO_HEADER\".\"PO_NUMBER\" AS \"ID\" FROM \"PO_HEADER_PO_HEADER\"",
      "overwrite": null,
      "materialiseCte": false,
      "completeOverwrite": false,
      "type": "SQL_FACTORY_DATA_SET"
    }],
    "changeSqlFactoryDatasets": [],
    "relationshipTransformations": [
      {"relationshipName": "SupplierInvoice", "sqlFactoryDatasets": []}
    ]
  }],
  "localParameters": [],
  "disabled": true,
  "draft": false,
  "hasUserTemplate": false,
  "factoryValidationStatus": "NOT_VALIDATED",
  "tableTransformation": false,
  "saveMode": "VALIDATE"
}
```

**Kurallar:**
- **SQL düz `SELECT`, `DROP`/`CREATE TABLE` YOK.** Kolon adları çift tırnakla obje/event tipinin
  field adlarıyla **birebir** eşleşmeli (`AS "ID"`, `AS "SUPPLIER_ID"` vb.).
- **Türetilmiş STRING kolonlarda kaynak tip BIGINT ise `CAST(... AS VARCHAR)` zorunlu** — yoksa
  deploy'da `Expected attribute X to have type VARCHAR(255), but the analyzed type is BIGINT`.
- **`propertyNames`** = o transformation'ın kapsadığı tüm field adlarının listesi (alfabetik,
  `ID` dahil) — obje/event tipi yaratılırken tanımlanan field'larla birebir aynı olmalı. `POST`
  taslak yaratırken sunucu bunu otomatik dolduruyor (hedef tipin field'larından) — elle yazmadan
  önce taslağı `GET` edip oradan al.
- **`propertySqlFactoryDatasets[].id`** konvansiyonu: **`<ObjectName>Attributes`**.
- **ID kuralı hâlâ geçerli:** `'<TypeName>::' || <primary_key>`.
- **`relationshipTransformations`** — **şema doğrulandı** (deneyerek, ilk denemede `VALID` çıktı):
  ```json
  {"relationshipName": "SupplierInvoice", "sqlFactoryDatasets": [{
    "id": "PurchaseOrderSupplierInvoiceRelationship", "disabled": false,
    "sql": "SELECT 'PurchaseOrder::'||PO_NUMBER AS \"ID\", 'SupplierInvoice::'||INVOICE_ID AS \"SupplierInvoice\" FROM ...",
    "overwrite": null, "materialiseCte": false, "completeOverwrite": false, "type": "SQL_FACTORY_DATA_SET"
  }]}
  ```
  `sqlFactoryDatasets[]` = `propertySqlFactoryDatasets` ile **aynı şekil**. SQL kuralı: `"ID"` = bu
  objenin/eventin kendi ID'si, `"<RelationshipName>"` = karşı tarafın ID'si (relationship adıyla
  birebir aynı alias). Event-grain'i bozmadan N:1 fan-out kurmak için bu tablo idealdir — event'in
  kendi `propertySqlFactoryDatasets` satır sayısı değişmez, sadece mapping tablosu N satır üretir.
- **`kind`**: `"OBJECT"` ve `"EVENT"` ikisi de doğrulandı (minimal `POST` + yanıt kontrolü).
- **`disabled` / `draft` / `saveMode`**: `disabled:false, draft:false, saveMode:"VALIDATE"` ile
  gerçek deploy sonrası veri materialize oldu (bkz. §7.1) — bu kombinasyon **doğrulandı**, çalışıyor.
- **Bir relationship'in oto-kolonuyla aynı ada çakışan bir `fields` girdisi ASLA ekleme** — bkz.
  §9, `Multiple entries with same key` / `INVALID_COMBINATION_OF_FIELD_AND_RELATIONSHIP_ID`
  hataları. **Çakışan alanı silmek TEK BAŞINA yeterli değil** — obje/event tipinden kabuk kalır,
  ilişki verisi hiç akmaz (13 ölü join'in kök nedeni buydu). Doğru veri kanalı cardinality'ye göre
  değişir, bkz. §7.2 özet tablosu: `HAS_MANY` → `relationshipTransformations`, `HAS_ONE` →
  `foreignKeyNames` + ana SQL'e gömülü kolon.

### 3) Doğrulama / önizleme
```
POST /execution/factories/sql/validate?environment=develop
POST /execution/factories/sql/dataset-preview?environment=develop
```
(Body şekli henüz tam belgelenmedi — muhtemelen `PUT` gövdesine benzer bir alt küme; gövdeyi
denerken hata mesajından çıkar.)

### Diğer ilgili endpoint'ler
```
GET    /factories/sql/templates?size=50&requestMode=PAGE&page=0&environment=develop
GET    /factories/parameters?requestMode=ALL&environment=develop
DELETE /factories/sql/{factoryId}?environment=develop
```

---

## 7. FAZ D — Obje/event/relationship yaratma + SQL Factory + perspective + deploy

1. Obje tiplerini yarat (`POST /types/objects`) — her birinde zorunlu `ID`.
2. Event tiplerini yarat (`POST /types/events`) — her birinde zorunlu `Time` (`CT_INSTANT`).
3. Obje-obje relationship'leri kur (`POST /types/objects/relationships`) — `name`+`namespace`.
   **Event-obje relationship'i için ayrı bir type-level endpoint VAR**: `PUT /types/events/{id}
   ?strictMode=true`, relationship event gövdesinin içine gömülü — bkz. 7.2.
4. Her obje/event tipi için SQL Factory kur (§6): `POST` taslak → `PUT` SQL+eşleme → validate.
   Bu adım atlanırsa tip kabuk olarak kalır, hiç veri içermez. **İlişki verisi de BURADA
   kuruluyor** — obje-obje VE event-obje fark etmeksizin, cardinality'ye göre `HAS_MANY` →
   `relationshipTransformations`, `HAS_ONE` → `foreignKeyNames`+gömülü kolon (bkz. §7.2). Bu adım
   atlanırsa (veya sadece manuel field silinip veri kanalı kurulmazsa) tip/relationship kabuk
   kalır, ilişkili obje var ama join'ler sessizce ölü kalır.
5. Perspective yarat (`POST /perspectives`) — hangi objeler dahil (LINK ile), hangi event'ler
   hangi event log'a (`projections[].events[]`, bkz. §7.3) dahil, lead obje.
6. Versiyon + deploy — bkz. §7.1.
7. Data model / perspective load.

### 7.2 Event-obje relationship — AYRI ENDPOINT YOK, event tipinin kendi gövdesinde (DevTools ile bulundu)

Doküman object-to-object (`r_o_`) ile object-to-event (`r_e_`) ilişki tablolarını ayırıyor ama bu,
event'lerin obje'ler gibi **ayrı bir POST endpoint'iyle** bağlandığı anlamına gelmiyor.
Gerçek mekanizma object-object'ten **farklı**: event tarafında relationship, event tipinin
**kendi `PUT` gövdesine** gömülü.

```
PUT /types/events/{eventId}?environment=develop&strictMode=true
```
```json
{
  "name": "SupplierInvoicePosted",
  "tags": [], "description": "", "categories": [],
  "fields": [
    {"name":"ID","namespace":"custom","dataType":"CT_UTF8_STRING"},
    {"name":"Time","namespace":"custom","dataType":"CT_INSTANT"},
    {"name":"SUPPLIERINVOICE_ID","namespace":"custom","dataType":"CT_UTF8_STRING"},
    {"name":"POSTED_BY","namespace":"custom","dataType":"CT_UTF8_STRING"}
  ],
  "relationships": [
    {"cardinality":"HAS_ONE","name":"SupplierInvoice","namespace":"custom",
     "target":{"objectRef":{"name":"SupplierInvoice","namespace":"custom"}}}
  ],
  "changeDate": 1234567890000
}
```

**Obje-obje ile farkları:**
- `target.objectRef` kullanılır — `source`/`bidirectional` YOK (object-object'te bunlar var).
- **`strictMode=true` query param ŞART.**
- **`PUT` tam gövde ister — eksik alan gönderirsen SİLER** (relationship'i eklerken bile `fields`,
  `tags`, `description`, `categories` hepsi tekrar gönderilmeli). Önce `GET` ile mevcut gövdeyi çek,
  üzerine `relationships` ekle, sonra `PUT` et. (Bu, obje tipinde `relationships:[]` göndererek
  mevcut ilişkileri sildiğimiz hatayla aynı sınıf hata — bkz. §9.)

**Cardinality — iki seçenek, dikkatli seç (yanlış seçim fan-out/M:N'i bozar):**
- **`HAS_ONE`** = event/obje tam bir hedef objeye bağlanır (UI: "involves one"; type-level
  karşılığı `MANY_TO_ONE`, `owner: SOURCE` — bkz. `GET /types/objects/{id}/relationships/outgoing`).
  Bu taraf ilişkinin skaler FK'sini taşır.
- **`HAS_MANY`** = birden çok hedefe bağlanır (UI: "involves many"). Tek kolona sığmaz, ayrı bir
  eşleme tablosu gerekir. `HAS_ONE` seçersen event ince obje grain'ine çekilir → **event
  divergence** (örn. header-grain bir event 61 satırdan 119'a çıkar). Grain'i N tarafa
  kaydırmadan `HAS_MANY` + mapping tablosu kullan.

**İKİ TARAF, İKİ FARKLI MEKANİZMA — birbirinin yerine geçmez (deneyle doğrulandı):**

- **`HAS_MANY` → `relationshipTransformations`.** Ayrı bir eşleme tablosu SQL'i (bkz. §6),
  `"ID"` = bu obje/event'in kendi ID'si, `"<RelationshipName>"` = hedefin ID'si. Bu mekanizma
  SADECE `HAS_MANY` için çalışır.

- **`HAS_ONE` → `foreignKeyNames` + ana `propertySqlFactoryDatasets` SQL'ine gömülü kolon.**
  `relationshipTransformations` `HAS_ONE` için **SESSİZCE YOK SAYILIR** — `PUT` `200`/`VALID`
  döner ama yanıt gövdesindeki `relationshipTransformations` dizisi **boş** gelir (durum kodunu
  değil, echo edilen gövdeyi kontrol et — aksi halde veri gitmediğini fark etmezsin). Doğru yol:
  1. Transformation'ın `foreignKeyNames` alanına ilişki adını ekle: `["PurchaseOrder"]`.
  2. Aynı `propertySqlFactoryDatasets`'in **ana attribute SQL'ine** (ayrı bir dataset DEĞİL, ID
     satırının hemen altına) hedef ID'yi üreten bir kolon ekle, **alias tam olarak ilişki adı**
     (`_ID` son eki YOK — o son ek Celonis'in kendi iç kolonuna ait, aşağıya bak):
     ```sql
     SELECT
         'GoodsReceipt::' || t."GR_NUMBER" AS "ID",
         'PurchaseOrderItem::' || t."PO_NUMBER" || '::' || t."PO_ITEM" AS "PurchaseOrderItem",
         ...
     FROM "GOODS_RECEIPT_GOODS_RECEIPT" t
     ```
  3. **`propertyNames`'e bu alias'ı EKLEME** — sadece gerçek deklare edilmiş `fields` üyeleri
     orada durabilir; `propertyNames`'e eklersen sunucu sessizce filtreler (SQL metni olduğu gibi
     kalır, sadece `propertyNames` listesinden düşer — zararsız ama gereksiz).
  4. **Tip tanımına (`fields`) bu isimle bir alan EKLEME.** `<RelationshipName>` (veya
     `<RelationshipName>_ID`) adında manuel bir `fields` girdisi eklemeyi denersen
     `ENTITY_VALIDATION` / `INVALID_COMBINATION_OF_FIELD_AND_RELATIONSHIP_ID` alırsın: *"You
     can't use the relationship ID name 'X'. You can't give a relationship the same name as an
     attribute of an object or event involved in it."* — bu isim relationship'e **rezerve**,
     tip seviyesinde asla deklare edilemez.
  5. Deploy sırasında bilgilendirici (bloklamayan) bir mesaj görebilirsin: `"The datatype of
     attribute PurchaseOrderItem_ID is changed from VARCHAR(255) to VARCHAR(39)... reflected
     when the data job executed successfully."` — bu, Celonis'in **iç rezerve kolonun** gerçek
     adının `<RelationshipName>_ID` olduğunu doğrular (senin SQL'deki alias'ın DEĞİL — sen SQL'de
     sadece `<RelationshipName>` yazarsın, Celonis kendi içinde `_ID` ekleyerek eşler). Uyarı
     niteliğinde, deploy'u durdurmaz.

Özet tablo:

| Cardinality | Veri mekanizması | Alias/isim kuralı |
|---|---|---|
| `HAS_MANY` (bu obje/event çoğul tarafta) | `relationshipTransformations` (ayrı eşleme SQL'i) | `sqlFactoryDatasets` içindeki SQL'de `"<RelationshipName>"` |
| `HAS_ONE` (bu obje/event tekil tarafta, FK'yi taşır) | `foreignKeyNames` + ana attribute SQL'ine gömülü kolon | Ana SQL'de `"<RelationshipName>"` (son ek yok); tip `fields`'ine ASLA ekleme |

### 7.3 Perspective kurulumu — çözüldü

**YANLIŞ ZİHİN MODELİ (düzeltildi):** "Top-level `events` boş kalır, event'ler obje ilişkileri
üzerinden OTOMATİK dahil olur" — **YANLIŞ**. `HAS_ONE`/`HAS_MANY` event-obje ilişkisi (§7.2) o
event'in perspective'e dahil olacağını GARANTİ ETMEZ; bu ilişki sadece event'in obje(ler)e
*bağlanabileceğini* tanımlar. Perspective'e girmesi için event **açıkça listelenmeli**.

**Gerçek mekanizma (DevTools capture, UI'da elle event log düzenlenerek bulundu):** Her
`projections[]` kaydı bir **event log**'dur — `leadObject` + o event log'a dahil edilecek
**açık `events[]` listesi** taşır. Top-level `events:[]` gerçekten her zaman boş kalır (bu kısım
doğruydu) — ama bunun nedeni event'lerin objeler üzerinden sızması değil, event'lerin
**projection seviyesinde** yaşamasıdır.

```
PUT /bl/api/v2/workspaces/{poolId}/perspectives/{perspectiveId}?environment=develop
```
```json
{
  "name": "P2POCPM",
  "objects": [
    {"name": "PurchaseOrder", "namespace": "custom", "relationships": [],
     "originRef": {"namespace": "custom", "name": "P2POCPM"}},
    {"name": "SupplierInvoice", "namespace": "custom",
     "relationships": [{"name": "PurchaseOrder", "namespace": "custom", "strategy": "LINK",
                         "originRef": {"namespace": "custom", "name": "P2POCPM"}}],
     "originRef": {"namespace": "custom", "name": "P2POCPM"}}
  ],
  "events": [],
  "projections": [{
    "name": "SupplierInvoice",
    "leadObject": {"namespace": "custom", "name": "SupplierInvoice"},
    "events": [
      {"name": "SupplierInvoicePosted", "namespace": "custom"},
      {"name": "SupplierInvoiceBlocked", "namespace": "custom"},
      {"name": "SupplierInvoiceReleased", "namespace": "custom"},
      {"name": "SupplierInvoicePaid", "namespace": "custom"}
    ],
    "eventList": [],
    "originRef": {"namespace": "custom", "name": "P2POCPM"}
  }],
  "tags": [], "preambleAddendum": null, "aliasesEnabled": false,
  "baseRef": null, "defaultProjection": "SupplierInvoice", "excludedEvents": [],
  "changeDate": 1234567890000
}
```

- **`defaultProjection`** (lead object seçimi) = **düz string** (obje adı) — bare `{namespace,name}`
  nesnesi `MESSAGE_NOT_READABLE` verir.
- String tek başına yetmez: **`projections` dizisinde aynı adla bir kayıt tanımlı olmalı**,
  yoksa `DEFAULT_PROJECTION_NOT_FOUND` / `"Default event log 'X' is not defined for this perspective"`.
- O `projections` kaydının bir **`leadObject`** alanı olmalı, yoksa `PROJECTION_WITHOUT_LEAD_OBJECT`.
- **O `projections` kaydının `events[]` listesi, o event log'a dahil edilecek her event tipini
  `{name, namespace}` olarak açıkça saymalı.** Boş bırakırsan event log'da hiç event olmaz —
  "otomatik dahil olma" yok, kör nokta buydu.
- Her `objects[].relationships[]` girdisinde **`strategy: "LINK"`** olmalı (obje-obje relationship'i
  perspective'e dahil etmenin yolu budur — tip seviyesinde ilişki var olması yetmez, perspective
  ayrıca hangi ilişkileri kullanacağını seçer). Event-obje ilişkileri için böyle bir seçim YOK —
  event'in kendisi zaten `projections[].events[]` ile seçiliyor.
- **Obje/perspective isimleri de underscore kabul etmiyor** (bkz. §2 naming kuralı, obje/event
  tipiyle aynı regex).
- Var olan bir perspective'i güncellemek için `PUT .../perspectives/{perspectiveId}` (yaratmak
  için `POST .../perspectives`, §2 tablosunda).

### 7.4 Perspective ilişki grafiği ASİKLİK olmalı

Perspective, dahil ettiği `objects[].relationships[]` üzerinden bir join grafiği kurar — bu grafik
**döngüsüz (acyclic)** olmak zorunda. Tip seviyesinde döngü olabilir (obje tiplerinin kendi
ilişkileri arasında), ama **tek bir perspective'e döngü oluşturan ilişkilerin HEPSİ birden
konulamaz — birini çıkar.**

**Gerçek örnek:**
```
PurchaseOrder <-> SupplierInvoice          (M:N, tip seviyesinde)
PurchaseOrderItem -> PurchaseOrder         (LINK)
PurchaseOrderItem -> SupplierInvoice       (LINK)
```
`PurchaseOrder → SupplierInvoice → PurchaseOrderItem → PurchaseOrder` = döngü. **İki farklı
kontrol noktasında yakalanabilir:**
1. **Perspective `PUT` anında** (`PERSPECTIVE_VALIDATION` / `OBJECT_CYCLE_DETECTED`) — eğer aynı
   M:N'in HER İKİ yönü de (`PurchaseOrder→SupplierInvoice` VE `SupplierInvoice→PurchaseOrder`)
   `LINK` olarak eklenirse hemen yakalanır.
2. **Data model `reload`/load anında** (`Cycle in table joins detected`) — M:N tek yönde
   eklense bile, üçüncü bir obje (`PurchaseOrderItem`) her iki uca da ayrı ayrı bağlanıyorsa
   döngü fiziksel join grafiğinde oluşur; `PUT` validasyonu bunu YAKALAMAZ, sadece gerçek
   `reload` sırasında ortaya çıkar. **`PUT`'un 200 dönmesi döngüsüz olduğu anlamına gelmez.**

**Çözüm deseni:** Hangi bağın "asıl gösterilmek istenen" ilişki olduğuna karar ver (iş mantığı
kararı — kullanıcıya sor), döngüye giren diğer LINK'i perspective'ten çıkar. **Tip seviyesinde
ilişki KALIR** (silinmez) — sadece o perspective'in `objects[].relationships[]` listesine dahil
edilmez. Bilgi kaybı, çıkarılan bağın cardinality'sine göre değişir: 1:1/1:m bağları çıkarmak
görece ucuz (dolaylı yoldan hâlâ erişilebilir), M:N'i çıkarmak genelde daha pahalıdır (dolaylı yol
yoktur) — mümkünse M:N'i tut, tekil yönlü bağı çıkar.

### 7.1 Deploy — gerçek endpoint (DevTools capture ile bulundu)

**`/pacman/api/deployments` DEĞİL.** O endpoint Studio Apps'in deploy mekanizması —
`deployableType` için OCPM'e uygun hiçbir değer yok, her denemede alan-bazlı hataya değil
anlamsız `500`'e düşer (3 kör denemeden sonra durulup capture istendi, bu şekilde bulundu).

```
POST /bl/api/packages/pig-{pigId}/deploy
```
```json
{
  "environment": "develop",
  "packageVersion": "STAGING",
  "targetDataPoolId": "<poolId>",
  "executeDataJob": true
}
```
- `pigId`: `GET /environments` yanıtındaki `packageKey`'den (`pig-` önekini at).
- `executeDataJob: true` → deploy'la birlikte SQL Factory'leri çalıştırıp veriyi materialize eder
  (ayrı bir "data job" arayışına gerek yok — §6'daki "SQL Factory görünür bir job üretmiyor"
  bulgusunun sebebi bu: job, deploy çağrısının kendisine gömülü).
- Önce `POST /pacman/api/core/packages/pig-{pigId}/versions` ile versiyon yarat (bkz. §2 tablo),
  sonra bu endpoint'i çağır.

**GÜVENLİK — asla varsayma, izin sınırı:**
- `environment: "develop"` → **serbest**, ajan tarafından çalıştırılabilir.
- `environment: "production"` → **YASAK**. Bunu sadece kullanıcı kendi yapar. Ajan asla
  `"production"` ile bu endpoint'i çağırmaz, kullanıcı açıkça talep etse bile bir kez daha
  teyit almadan tetiklemez.

---

## 8. Doğrulama — yapı değil, veri üstünde

Her tablo için **beklenen satır sayısını ÖNCEDEN yaz**, sonra ölç. Beklentisiz doğrulama,
çıkan sayıyı doğru sanmaktır.

Kontrol et:
- Obje instance sayısı = kaynak distinct ID sayısı mı?
- Event sayısı = timestamp null-olmayan satır sayısı mı?
- **Event divergence yok mu?** (header-grain event, item sayısı kadar değil, header kadar olmalı)
- M:N modelde gerçekten M:N mi?
- Boş obje tipi varsa: kaynak tablo yüklendi mi? (Publish'te Celonis eksik kaynak tablolar için
  boş placeholder yaratır — placeholder'dan obje çıkmaz.)
- PQL'de event/relationship tabloları gizlidir → `CREATE_EVENTLOG` ile eriş.

---

## 9. Hata kılavuzu

| Belirti | Sebep | Çözüm |
|---|---|---|
| `SYNTAX_ERROR` on `CREATE OR REPLACE` | Motor Vertica, Spark değil | `DROP` + `CREATE` |
| `ID_FIELD_NOT_FOUND` | Obje tipinde `ID` alanı yok | `{"name":"ID",...CT_UTF8_STRING}` ekle |
| `TIME_FIELD_NOT_FOUND` | Event tipinde `Time` (CT_INSTANT) alanı yok/adı yanlış | Alanı tam `Time` adıyla ekle, `EVENTTIME` değil |
| `MESSAGE_NOT_READABLE` | Gövde şekli/enum yanlış | Enum bisect veya DevTools capture |
| Relationship POST 400 (hep aynı) | UUID ile referans verilmiş | `name` + `namespace` kullan |
| Relationship DELETE 400 | `name` ile referans verilmiş | Path'te UUID kullan (POST'un tersi) |
| Obje tipi silinemiyor (`OBJECT_REFERENCED_IN_O2O`) | Üzerinde ilişki var | Önce ilişkiyi sil, sonra objeyi |
| Obje/event tipi yaratma `REQUEST_VALIDATION` (regex) | İsimde underscore/özel karakter var | Tip adından underscore'u kaldır |
| Deploy: `Multiple entries with same key: X_ID:VARCHAR(255) and Y_ID:VARCHAR(39)` | Relationship'in otomatik ürettiği `<RelationshipName>_ID` kolonu, aynı tip üzerinde case-insensitive aynı isimde MANUEL bir attribute field'ıyla çakışıyor (örn. relationship `PurchaseOrderItem` → oto-kolon `PurchaseOrderItem_ID`, manuel field `PURCHASEORDERITEM_ID` case-fold'da aynı). **Obje-obje VE event-obje relationship'inde AYNI risk var** | Manuel field'ı tip tanımından ve SQL Factory'nin `propertyNames`/SQL'inden kaldır. **DUR — sadece silmek yetmez, kolon kabuk kalır.** Cardinality'ye göre veri kanalını AYRICA kur: `HAS_MANY` → `relationshipTransformations`; `HAS_ONE` → `foreignKeyNames` + ana SQL'e gömülü `"<RelationshipName>"` kolonu (bkz. §7.2 özet tablosu). Silip veri kanalı kurmadan bırakırsan join sessizce ölü kalır (`did not find any matching rows`) — deploy hiçbir hata vermez |
| `relationshipTransformations` `HAS_ONE` ilişkide veri taşımıyor, join hâlâ ölü | `relationshipTransformations` SADECE `HAS_MANY` için çalışır. `HAS_ONE`'da `PUT` `200 OK` + `factoryValidationStatus:"VALID"` döner ama yanıt gövdesindeki `relationshipTransformations` dizisi **sessizce boş** gelir — HTTP durumuna bakarak "kabul edildi" sanılır, veri asla akmaz | `HAS_ONE` için `relationshipTransformations` kullanma. `foreignKeyNames` + ana attribute SQL'ine gömülü kolon kullan (bkz. §7.2). Her `PUT`'tan sonra **yanıt gövdesini** kontrol et, sadece durum kodunu değil — sessiz drop'u yalnızca echo'daki boş dizi ele verir |
| `ENTITY_VALIDATION` / `INVALID_COMBINATION_OF_FIELD_AND_RELATIONSHIP_ID`: *"You can't use the relationship ID name 'X'..."* | Tip tanımına (`fields`) relationship'in rezerve ettiği isimle (`<RelationshipName>` veya `<RelationshipName>_ID`) manuel bir alan eklemeye çalıştın | Bu adı `fields`'e asla ekleme — relationship zaten bu ismi rezerve eder. Veri, tip tanımına değil, SQL Factory'nin ana attribute SQL'ine gömülü kolonla gider (§7.2) |
| Obje/event tipini `PUT` ettikten sonra ilişkiler kayboluyor | `PUT` **tam gövde** ister — `relationships` (veya başka bir alan) eksik/boş gönderilirse MEVCUT içerik SİLİNİR (obje/event *yaratmadaki* `POST`'un aksine, orada sessizce yok sayılır). Bu, `POST`'un idempotent-merge davranışıyla `PUT`'un full-replace davranışı arasındaki farktan kaynaklanıyor | Değişiklik yapmadan önce her zaman `GET` ile mevcut tam gövdeyi çek, üzerine ekle/değiştir, sonra `PUT` et. Obje tarafında ilişki `POST /types/objects/relationships` ile ayrıca yeniden kurulabilir; event tarafında (§7.2) `relationships` dizisi `PUT` gövdesinin bir parçası olduğu için GET→ekle→PUT dışında kurtarma yolu yok |
| Event sayısı beklenenden fazla | Divergence — event ince grain'e join'lenmiş | Event'i doğal grain'inde tut |
| M:N görünmüyor | Yanlış grain seçilmiş | Cardinality'yi her grain'de ölç |
| Satır sayısı patladı | Tek kolonla bileşik anahtar join'i | Tam anahtar |
| Kolon pipeline'ı bozuyor | Çıplak `NULL` | `CAST(NULL AS <tip>)` |
| PQL "No common table" | Reload yapılmadı | `data_model.reload()` |
| Event tablosu PQL'de yok | Gizli (tasarım) | `CREATE_EVENTLOG(...)` |
| 403 | Pool/paket seviyesinde izin yok | App seviyesi yetmez, pool'da da ver |
| `.find()` bulamıyor | İsimde gizli boşluk | Tam string'i kontrol et |
| Push job 2. kez çalışmıyor | Tek sefer tasarımı | `create_table(drop_if_exists=True)` |
| STRING değerler kesilmiş | VARCHAR(80) default | `ColumnTransport` + `field_length` (içeride ×4) |
