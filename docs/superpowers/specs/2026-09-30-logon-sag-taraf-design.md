# Logon sağ taraf — tasarım

Tarih: 2026-09-30 · Dal: `tasarim/grafit` · Alt proje 2, ekran 3 (Sohbet ve
Terminal modu bitti, kullanıcı gözle kontrol etti)

## 1. Amaç

Logon modunun sağ tarafı (seçili sistemin ekranı) bugün eski düzende: büyük
başlık kartı, iki büyük eylem kartı, altta bilgi ve not kartları. Her şey aynı
ağırlıkta, en sık yapılan iş ("aXet'te aç") öne çıkmıyor. Üstte ayrıca üç
düğmelik bir şerit duruyor. Hedef: vibe'a benzeyen ama bize özgü, sakin ve
**eylem öncelikli** bir ekran. Vibe'ın değerleri birebir kopyalanmıyor; renk,
boşluk ve yazı Grafit belirteçlerinden geliyor.

### Kullanıcının verdiği kararlar

| Konu | Karar |
|---|---|
| Yön | **2 — Eylem öncelikli**: büyük kartlar kalkıyor, tek satır başlık, hemen altında belirgin "aXet'te aç" |
| Üst şerit | **Kalkıyor**; üç eylemi Logon kenar çubuğundaki **＋** menüsüne taşınıyor |
| Bölüm 1 (ekran düzeni) | Onaylandı |
| Bölüm 2 (＋ menüsü, pencereler, testler) | Onaylandı |

### Başarı ölçütleri

- Sistem seçilince ilk bakışta ad, ortam, durum ve "aXet'te aç" görünüyor;
  kaydırmadan.
- Logon'un üstünde düğme şeridi yok; Sistem ekle, SAP Logon'dan getir ve
  Listeyi yeniden yükle ＋ menüsünden erişiliyor.
- Giriş, sertifika, ortam ve rol pencereleri ortak `Modal` iskeletinde:
  Escape, odak ve katman davranışı diğer pencerelerle aynı.
- Bugün yapılabilen hiçbir iş kaybolmuyor (bkz. §5).
- Mevcut testlerin hepsi yeşil; sağ taraf ve pencereler için yeni testler var.

## 2. Kapsam dışı

- Bağlanma mantığı, SAP'ye giden hiçbir çağrı, bağlantı denetimi, not
  kaydetme, ortam (tier) kaydı, el ile sistem ekleme/düzenleme/silme mantığı.
- Dosya görüntüleyicinin (`FileViewer`) içi.
- Logon kenar çubuğunun listesi (ağaç, arama, sistemler/dosyalar geçişi);
  yalnızca üst satırına ＋ ekleniyor.
- `AddSystemModal` (zaten yeni yapıda).
- Ayarlar ve Script ekranı (sıradaki işler).

## 3. Ekran düzeni (Bölüm 1)

Sağ taraf ortalanmış, dar bir sütun (okunaklı satır uzunluğu için en fazla
~720px). Yukarıdan aşağı:

1. **Yol (breadcrumb)**: müşteri › klasör. Küçük, soluk yazı.
2. **Başlık satırı**: sistem adı, ortam rozeti (DEV/QA/PRD), durum noktası ve
   yazısı ("Erişilebilir", "Erişilemiyor", "Denetleniyor…"). **Durum yazısına
   tıklamak yeniden denetliyor**; ayrı "Yeniden denetle" düğmesi kalkıyor.
   Durum düğme olarak işaretleniyor (erişilebilir ad: "Yeniden denetle"),
   denetim sürerken devre dışı. El ile eklenmiş sistemlerde sağda
   düzenle/sil ikonları.
3. **Alt satır** (soluk, tek satır): adres · bağlantı türü · son bağlantı
   ("2 saat önce"). Olmayan parça hiç yazılmıyor, ayraç da.
4. **Eylem satırı**: birincil mavi **"aXet'te aç"** ve yanında daha sakin
   **"SAP Logon'da aç"**. İkincisi yalnız bugün göründüğü koşulda görünüyor
   (main'deki `canOpenInSapLogon` ile aynı koşul, yorumuyla birlikte
   korunuyor).
5. **Uyarı satırı** (gerektiğinde): erişilemiyor ya da üretim (PRD) sistemi
   uyarısı; ince, tek satır, ikonlu. Bugünkü metinler aynen kullanılıyor.
6. **Bilgiler**: düz liste, satır başına etiket + değer (eş aralıklı yazı):
   SID, Adres, ADT URL, SAP Router, Ortam, UUID. Değer olmayan satır
   gösterilmiyor. Satırın üzerine gelince kopyala düğmesi beliriyor (bugünkü
   `CopyButton`). **Ortam** satırında DEV/QA/PRD seçici; ortam addan
   tahmin edildiyse yanında "tahmin" etiketi (bugünkü davranış).
7. **Notlar**: metin alanı, Kaydet düğmesi, Ctrl+Enter ile kaydetme. Notun
   SAP Logon'dan geldiğini söyleyen bugünkü ipucu kalıyor.

**Boş durumlar** (`EmptyState` ile):
- Sistem seçili değil: ikon, "Soldan bir sistem seç", "Sistem ekle" düğmesi.
- Liste tamamen boş: "Henüz sistem yok", "Sistem ekle" düğmesi.
- `SAPUILandscape.xml` bulunamadıysa (bugünkü `app.noLandscapeFile`) uyarı
  boş durumun içinde, açıklama olarak gösteriliyor.

**Dosya sekmeleri şeridi** ("Sistem Detayı" + açık dosyalar) yalnızca en az
bir dosya açıkken görünüyor; dosya yokken yer kaplamıyor.

Kalkanlar: başlıktaki büyük avatar kutusu, StatTile ızgarası, iki büyük eylem
kartı, bilgiler/notlar iki sütunu, üst düğme şeridi.

## 4. Kenar çubuğu ＋ menüsü, pencereler (Bölüm 2)

### 4.1 ＋ menüsü

- `LogonSidebar`'ın üst satırında (arama kutusu ve sistemler/dosyalar
  geçişinin sağında) bir **＋** ikon düğmesi. Erişilebilir ad ve ipucu:
  "Sistem ekle ve yenile" / "Add and refresh systems" (yeni i18n anahtarı,
  tr + en).
- Tıklayınca küçük bir menü, Terminal kenar çubuğundaki sağ tık menüsüyle
  aynı görünüm ve klavye davranışı (Escape kapatır, dışarı tıklama kapatır,
  ok tuşlarıyla gezilir, seçince kapanır):
  1. **Sistem ekle** → `AddSystemModal` açılıyor (bugünkü `setAddSystemOpen(true)`).
  2. **SAP Logon'dan getir** → `refreshWithToast("app.refreshedFromSapLogon")`.
  3. **Listeyi yeniden yükle** → `refreshWithToast("app.listReloaded")`.
- Bildirimler (toast) bugünkü gibi.
- `LogonSidebar` bu üç işi prop olarak alıyor; kendi başına IPC çağırmıyor.

### 4.2 Pencereler

`CredentialsModal`, `CertTrustDialog`, `TierPromptModal` ve `RoleModal` bugün
elle yazılmış kaplamalar (`fixed inset-0`, her birinin kendi z-index'i ve
Escape işleyicisi). Hepsi `src/ui/Modal`'a geçiyor; alanlar `Field`, düğmeler
`Button` / `ModalCancelButton`.

- **İçerik ve davranış değişmiyor**: giriş penceresinde kullanıcı, şifre,
  istemci; şifre göster/gizle; ASCII dışı şifre uyarısı; "Doğrulanıyor…"
  beklemesi ve hata satırı; sertifika ayrıntıları ve güven/iptal; ortam
  sorusu; rol onayı. Metinler aynı i18n anahtarlarından.
- **Bekleme sırasında kapanmıyor**: doğrulama sürerken `closeDisabled`.
- **Katman sırası**: bugün sabit z-index'lerle kurulan üst üste binme
  (giriş < sertifika < ortam < rol) `Modal` yığınıyla korunuyor — sonra
  açılan üstte. Üstte kalması gereken pencere alttakinden *önce* açılabiliyorsa
  o pencere `layer="confirm"` alıyor. Plan, `App.tsx`'teki açılış sırasına
  bakarak her pencere çifti için hangisinin geçerli olduğunu yazıyor.
- Arka plana tıklamak kapatmıyor (`Modal` kuralı; bugün de dört pencerenin
  hiçbiri arka plan tıklamasıyla kapanmıyor, fark yok).

## 5. Davranış korunumu

Bugün yapılabilen her iş yeni düzende de yapılabiliyor:

| Bugün | Yeni yer |
|---|---|
| Üst şerit: Sistem Ekle / SAP Logon'dan Getir / Yeniden yükle | ＋ menüsü |
| "Yeniden denetle" düğmesi | Durum yazısına tıklama |
| Hero'daki ortam seçici | Bilgiler › Ortam satırı |
| İki eylem kartı | Eylem satırındaki iki düğme |
| StatTile'lar (SID, tür) | Bilgiler listesi ve alt satır |
| Düzenle/sil (el ile sistem) | Başlık satırının sağında ikonlar |
| `noLandscapeFile` şeridi | Boş durumun açıklaması |

## 6. Bileşenler ve sınırlar

- `SystemPanel.tsx` (657 satır) yeniden yazılıyor ve bölünüyor: başlık +
  eylemler, bilgiler listesi, notlar ayrı küçük bileşenler (aynı klasörde).
  Dışarıya açılan `Props` aynı kalıyor; `App.tsx` yalnızca üst şeridi ve
  uyarıyı kaldırıp ＋ menüsü için `LogonSidebar`'a üç işlevi geçiriyor.
- Stil Grafit belirteçleri (`bg-card`, `border-line`, `text-slate-*`,
  `accent`); lime yalnız seçim için (tasarım ilkesi).
- Kullanılmaz hale gelen `StatTile` ve eski yardımcılar siliniyor; başka yerde
  kullanılanlar (`StatusDot`, `TierBadge`, `CopyButton`) kalıyor.

## 7. Testler

Yeni test dosyaları (jsdom + @testing-library/react):

- **SystemPanel**: seçim yok / liste boş / `noLandscapeFile`; erişilebilir,
  erişilemiyor, denetleniyor; PRD uyarısı; el ile sistemde düzenle/sil
  görünür, diğerinde yok; "SAP Logon'da aç" koşulu; durum tıklaması
  `onCheck` çağırıyor, denetim sürerken çağırmıyor; ortam seçici
  `onSetTier`; boş değerli bilgi satırı çizilmiyor; not Ctrl+Enter ile
  kaydediliyor.
- **＋ menüsü** (`logonSidebar.test.tsx` genişliyor): menü açılıyor, üç
  seçenek doğru işlevi çağırıyor, Escape kapatıyor.
- **Pencereler**: Escape ve İptal kapatıyor; doğrulama sürerken kapanmıyor;
  ASCII dışı şifre uyarısı görünüyor; sertifika penceresi giriş penceresinin
  üstündeyken Escape yalnız üsttekini kapatıyor.
- Tüm takım ve `npm run -s typecheck` yeşil.

## 8. Riskler

- `SystemPanel` testsiz; yeniden yazımda bir koşul kaybolabilir. Önlem:
  önce bugünkü davranışı sabitleyen testler, sonra yeniden yazım.
- Pencere katman sırası sabit z-index'ten yığına geçerken ters dönebilir.
  Önlem: §7'deki üst üste pencere testi.
