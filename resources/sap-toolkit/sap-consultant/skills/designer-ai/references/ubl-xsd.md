<!-- Imported from e-Solutions DesignerAI on 2026-09-04 by scripts/sync_designer.py. Owner: e-Solutions / Eren Guney. Do not hand-edit; re-run the sync. -->

# UBL 2.1 XSD Mimarisi (eFatura/eIrsaliye Referansı)

Kaynak: https://www.datypic.com/sc/ubl21/s-UBL-CommonAggregateComponents-2.1.xsd.html
(UBL-CommonAggregateComponents-2.1.xsd — OASIS UBL 2.1, Türkiye GİB e-Fatura/e-İrsaliye
UBL-TR profilinin temel aldığı ortak şema)

Bu dosya, XML/XSL işlemlerinde (özellikle "Hücre Düzenle → XML Alanı" ve
`updateXSLFromVisual` senkronizasyonunda) kullanılacak **XPath ve namespace
referansıdır**. Amaç: `toolOrnek.xslt` gibi gerçek şablonları XSD'yi tekrar
tekrar internetten/dokümandan okumadan doğru namespace prefix ve alan adıyla
düzenleyebilmek.

## 1. Namespace'ler (toolOrnek.xslt içinde kullanılan)

| Prefix | Namespace URI | Anlamı |
|---|---|---|
| `n1` | `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2` | Kök doküman (Invoice). DespatchAdvice'ta bu prefix `DespatchAdvice-2` olur. |
| `cac` | `urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2` | **Karmaşık/birleşik** alanlar (Party, Item, InvoiceLine, TaxTotal...) |
| `cbc` | `urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2` | **Basit/tekil değer** alanlar (ID, Name, Amount, Quantity...) |
| `xsl` | `http://www.w3.org/1999/XSL/Transform` | XSLT şablon dili |

**Kural (ayırt etme):** `cbc:` ile başlayan alan → doğrudan metin değeri
(`xsl:value-of select="cbc:X"`). `cac:` ile başlayan alan → içinde başka
`cac:`/`cbc:` alanlar barındıran bir **grup/kapsayıcı** (tek başına
`value-of` ile basılmaz, alt alanlarına inilir).

Kök her zaman `//n1:Invoice/...` (fatura) veya `//n1:DespatchAdvice/...`
(irsaliye) ile başlar. `extractXMLFields()` fonksiyonu XPath üretirken
otomatik `//n1:` prefix'i ekliyor — bu doğru davranış.

## 2. Fatura Satırı (cac:InvoiceLine) — En Sık Kullanılan Alanlar

Kök: `//n1:Invoice/cac:InvoiceLine`

| Alan (XPath, kökten sonrası) | Tip | Açıklama |
|---|---|---|
| `cbc:ID` | cbc | Satır no |
| `cbc:InvoicedQuantity` | cbc | Miktar (attribute: `unitCode`) |
| `cbc:LineExtensionAmount` | cbc | Satır tutarı (zorunlu) |
| `cac:Item/cbc:Name` | cbc | Ürün/hizmet adı |
| `cac:Item/cac:ClassifiedTaxCategory/cbc:Percent` | cbc | KDV oranı |
| `cac:Item/cac:SellersItemIdentification/cbc:ID` | cbc | Satıcı stok kodu |
| `cac:Price/cbc:PriceAmount` | cbc | Birim fiyat |
| `cac:TaxTotal/cbc:TaxAmount` | cbc | Satır KDV tutarı |
| `cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:Percent` | cbc | Vergi alt kırılım oranı |
| `cac:AllowanceCharge/cbc:Amount` | cbc | İskonto/ek ücret tutarı |
| `cac:AllowanceCharge/cbc:MultiplierFactorNumeric` | cbc | İskonto oranı (0-1 arası) |

## 3. İrsaliye Satırı (cac:DespatchLine)

Kök: `//n1:DespatchAdvice/cac:DespatchLine`

| Alan | Tip | Açıklama |
|---|---|---|
| `cbc:ID` | cbc | Satır no |
| `cbc:DeliveredQuantity` | cbc | Sevk edilen miktar (attribute: `unitCode`) |
| `cac:Item/cbc:Name` | cbc | Ürün adı |
| `cac:OrderLineReference/cbc:LineID` | cbc | İlişkili sipariş satırı |
| `cac:Item/cac:SellersItemIdentification/cbc:ID` | cbc | Stok kodu |

## 4. Taraf Bilgileri (cac:Party — Party*Type tabanlı, ~70 yerde kullanılır)

Kullanım yerleri: `cac:AccountingSupplierParty/cac:Party`,
`cac:AccountingCustomerParty/cac:Party`, `cac:DeliveryParty`, vs.

| Alan (Party'den sonrası) | Açıklama |
|---|---|
| `cac:PartyIdentification/cbc:ID` | VKN/TCKN (attribute `schemeID` ile tipi ayrılır) |
| `cac:PartyName/cbc:Name` | Unvan |
| `cac:PostalAddress/cbc:StreetName` | Adres - Cadde/Sokak |
| `cac:PostalAddress/cbc:CityName` | Şehir |
| `cac:PostalAddress/cbc:CitySubdivisionName` | İlçe |
| `cac:PostalAddress/cac:Country/cbc:Name` | Ülke |
| `cac:PartyTaxScheme/cac:TaxScheme/cbc:Name` | Vergi dairesi |
| `cac:Contact/cbc:Telephone` | Telefon |
| `cac:Contact/cbc:ElectronicMail` | E-posta |
| `cac:PersonType` altında `cbc:FirstName`, `cbc:FamilyName` | Şahıs adı/soyadı |

## 5. Genel Toplamlar (cac:LegalMonetaryTotal — MonetaryTotalType tabanlı)

Kök: `//n1:Invoice/cac:LegalMonetaryTotal`

| Alan | Açıklama |
|---|---|
| `cbc:LineExtensionAmount` | Mal/hizmet toplam tutarı |
| `cbc:TaxExclusiveAmount` | KDV hariç toplam |
| `cbc:TaxInclusiveAmount` | KDV dahil toplam |
| `cbc:AllowanceTotalAmount` | Toplam iskonto |
| `cbc:ChargeTotalAmount` | Toplam ek ücret |
| `cbc:PayableAmount` | **Ödenecek tutar (zorunlu)** |

## 6. Vergi Toplamı (cac:TaxTotal — TaxTotalType)

Kök: `//n1:Invoice/cac:TaxTotal`

| Alan | Açıklama |
|---|---|
| `cbc:TaxAmount` | Toplam vergi tutarı (zorunlu) |
| `cac:TaxSubtotal/cbc:TaxableAmount` | Matrah |
| `cac:TaxSubtotal/cbc:TaxAmount` | Kırılım vergi tutarı |
| `cac:TaxSubtotal/cac:TaxCategory/cbc:Percent` | Oran |
| `cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:Name` | Vergi türü adı (KDV, ÖTV...) |

## 7. Teslimat / Sevkiyat (cac:Delivery, cac:Shipment)

| Alan | Açıklama |
|---|---|
| `cac:Delivery/cbc:ActualDeliveryDate` | Teslim tarihi |
| `cac:Delivery/cac:DeliveryAddress/cbc:StreetName` | Teslimat adresi |
| `cac:Delivery/cac:DeliveryParty/cac:PartyName/cbc:Name` | Teslim alan taraf |
| `cac:Shipment/cbc:GrossWeightMeasure` | Brüt ağırlık |
| `cac:Shipment/cbc:NetWeightMeasure` | Net ağırlık |
| `cac:Shipment/cac:GoodsItem/cbc:Quantity` | Sevk kalemi miktarı |

## 8. Görsel/Ek Dosya (cac:AdditionalDocumentReference — img/QR alanları için)

`toolOrnek.xslt`'de kullanılan pattern (barkod/QR/logo):
```
//n1:Invoice/cac:AdditionalDocumentReference[./cbc:DocumentType = 'BARCODE']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject
```
→ Base64 gömülü görüntü verisi. HTML'de `<img src="data:image/png;base64,...">`
olarak kullanılır. `index.html`'deki "Görüntü Ekle/Değiştir" özelliği bu
alanı XSL'de değiştirmez (statik logo/QR alanıdır); sadece hücre içi manuel
eklenen görüntüler için kullanılır.

## 9. Kod Tarafında Kullanım Notu (index.html)

- `extractXMLFields()` (index.html) sadece etiket adında **"cbc"** geçenleri
  topluyor — bu, yukarıdaki tablodaki "basit değer" alanlarıyla uyumlu.
  `cac:` grupları listelenmez (doğru davranış, çünkü tek başına metin
  değeri yoktur).
- `analyzeXSLCellType()` bir hücrenin `xsl:value-of` içerip içermediğine
  bakarak XML Alanı/Sabit Metin/Görüntü ayrımını yapıyor; yukarıdaki
  XPath'ler bu ayrımın "doğru" tarafını temsil eder.
- Yeni bir belge türü tasarlanırken bu UBL yapısına uygun alan isimlendirmesi
  (cac/cbc ayrımı + n1 kök) takip edilmeli; tamamen farklı bir XSD
  kullanılacaksa bu dosyaya yeni bir bölüm eklenmeli. (Not: **Smartform**
  belge türü UBL/XSD tabanlı değildir, SAP tablo/alan referansı kullanır —
  bkz. `BELGE_TURLERI_GEREKSINIMLER.md` ve `PROJE_MIMARISI.md`.)

## 10. Kaynak Sayfa Yapısı (özet)

datypic.com sayfası ~669 `cac:` elementi ve ~228 `cac:XxxType` complex type'ı
alfabetik indeksler; her biri kendi alt sayfasında (`e-cac_<Ad>.html`,
`t-cac_<Tip>.html`) `Content` (alt elementler + minOccurs/maxOccurs) ve
`Used by` (hangi üst tiplerde kullanıldığı) bilgisini taşır. `InvoiceType`
ve `DespatchAdviceType` bu şemada değil, ayrı `UBL-Invoice-2.1.xsd` /
`UBL-DespatchAdvice-2.1.xsd` dosyalarında tanımlıdır ve buradaki `cac`/`cbc`
bileşenlerini import ederek kullanır.
