# Ayarlar ve pencereler — tasarım

**Tarih:** 2026-10-01
**Dal:** `tasarim/grafit`
**Önceki tur:** `2026-09-30-logon-ikinci-tur-design.md`
**Girdi:** `tasarim/temel`'den park edilen borçlar (pencere iskeleti ve Ayarlar maddeleri)

## Amaç

Ayarlar penceresi ve uygulamadaki öteki pencereler yeni grafit görünümüne
uysun. Vibe'daki düzene benzesin ama bize özgü kalsın: Vibe'ın değerleri
birebir kopyalanmıyor, yalnız yapısı örnek alınıyor.

Kullanıcının kararları:

- Ayarlar **pencere olarak kalıyor**, içi bölünüyor: solda bölüm listesi,
  sağda yalnız seçili bölüm.
- Pencere iskeletinde ve Ayarlar'da ertelenmiş hatalar **bu turda**
  düzeliyor (dokunduğumuz dosyalardakiler). SapWriteGate kapsam dışı.

## Başarı ölçütleri

1. Ayarlar'da bir bölüme tıklayınca yalnız o bölüm görünüyor; uzun kaydırma
   yok.
2. Değişiklik yapılan bölüm listede işaretli; başka bölüme geçince
   kaybolmuyor.
3. Bütün pencereler aynı çerçeveyi, aynı boy ölçeğini ve aynı düğme dilini
   kullanıyor; kendi çerçevesini elle çizen pencere kalmıyor.
4. Escape, Tab ve "değişiklikleri at?" her pencerede aynı kuralla çalışıyor.
5. Bütün testler yeşil, tip denetimi temiz.

## 1. Ortak pencere çerçevesi (`src/ui/Modal.tsx`)

- **Arka plan:** karartma + hafif bulanıklık (`backdrop-blur-sm`). Elle
  çizilen üç pencere bunu zaten kullanıyor; artık hepsinde aynı.
- **Başlık:** `text-base` → `text-lg`, sıkı satır aralığı. Alt başlık
  `text-sm`, rahat satır aralığı.
- **Boy ölçeği:** `width={sayı}` yerine `size` özelliği:

  | `size` | Genişlik | Pencereler |
  |---|---|---|
  | `sm` | 420px | ConfirmDialog, NewPaneDialog |
  | `md` | 520px | AddSystemModal, CredentialsModal, TierPromptModal, UpdatePromptModal |
  | `lg` | 640px | RoleModal, ChatInstructionsDialog, ChatProjectDialog, CertTrustDialog, AppConnectionsModal, GlobalSkillsModal |
  | `xl` | 960px | SettingsModal |

  Varsayılan `md`. `width` özelliği kaldırılıyor; her pencere `size` ile
  çağrılıyor. Dar pencerede genişlik `calc(100vw - 2rem)`'den büyük olamıyor
  (bugünkü davranış korunuyor).
- **Değişmeyenler:** sağ üstte ✕, altta sağa yaslı İptal + ana düğme, ikon
  kutusu, katman sırası (modal < confirm < critical), arka plana tıklamanın
  kapatmaması, `dirty` iken onay, `closeDisabled`.

### Ertelenmiş çerçeve hataları

- **Odak tuzağı** gizli öğeleri (`hidden`, `display:none`, `aria-hidden`
  ata), devre dışı bir `fieldset` içindekileri ve `inert` alandakileri
  atlıyor.
- **Escape önceliği:** pencerenin içinde açık bir açılır liste varsa
  (`ModelSelector`, `AttachmentLightbox` gibi) Escape önce onu kapatıyor,
  pencereyi değil. Kural: Escape olayı pencereye ulaşmadan önce
  `defaultPrevented` ise ya da hedefi `[data-escape-owner]` taşıyan açık bir
  öğenin içindeyse pencere kapanmıyor. Açılır listeler kendi kapanışlarında
  `preventDefault()` çağırıyor.
- **"Değişiklikleri at?" onayı** `role="alertdialog"`, açıklaması
  `aria-describedby` ile bağlı.
- **Escape tekrarı:** `e.repeat` olan Escape yok sayılıyor; basılı tutmak
  peş peşe pencere kapatmıyor.

## 2. Ayarlar penceresi (`src/components/SettingsModal.tsx`)

### Düzen

- `size="xl"`, yükseklik `min(80vh, 720px)` sabit: bölüm değişince pencere
  zıplamıyor.
- Başlık satırı ortak çerçeveden (ikon, "Ayarlar", alt başlık, ✕).
- Gövde iki sütun:
  - **Sol, bölüm listesi** (~200px, `border-r`): sekiz bölüm, sırasıyla
    Genel, Görünüm, aXet Code, Sohbet görünümü, Terminal, Gelişmiş, El ile
    sistemler, Güncellemeler. Her satır ikon + ad. Seçili satır kenar
    çubuklarındaki seçim diliyle (`bg-active`, lime yalnız seçimde).
    Değişiklik içeren bölümün sağında küçük nokta
    (`--status-warning-text`, not kartındaki "kaydedilmedi" noktasıyla aynı).
    En altta sabit, soluk sürüm metni.
  - **Sağ, seçili bölüm:** kendi kaydırma alanı. Üstte bölüm başlığı
    (`text-base font-semibold`) ve tek
    satırlık açıklama; altında bir ya da birkaç kart (`rounded-xl border
    border-line bg-card p-5`). Etiketli alanlar etiket üstte, kontrol
    altta; aç/kapa satırları başlık + açıklama solda, anahtar sağda.
- Bölüm listesi `role="tablist"` + `aria-orientation="vertical"`; sağ alan
  `role="tabpanel"`, `aria-labelledby` seçili sekmeye. Ok tuşlarıyla
  bölümler arasında geziliyor (yukarı/aşağı, Home/End).
- Alt satır: solda, kayıtsız değişiklik varken "Kaydedilmemiş değişiklik
  var" (uyarı rengi, nokta ile); sağda İptal / Kaydet (bugünkü gibi).

### Davranış

- Pencere her açılışta **Genel** ile açılıyor. Bugün Ayarlar'ı açan tek yer
  etkinlik çubuğu; belirli bir bölümle açma ihtiyacı yok, eklenmiyor.
- Kaydetme bugünkü gibi: bütün değişiklikler Kaydet'le birlikte gidiyor;
  İptal ya da Escape değişiklik varken "değişiklikleri at?" soruyor.
- Bölüm geçişi formu sıfırlamıyor; bütün bölümler tek formu paylaşıyor.
- "Değişiklik içeren bölüm" her bölümün kendi alan listesi üzerinden
  hesaplanıyor (ör. Görünüm: `palette`, `theme`).
- Elle çizilmiş altı `<input>` ortak `Input`'a geçiyor. Klasör alanlarının
  sağındaki göz at düğmesi ortak `iconBtn` ile.
- `SkillsSection` Ayarlar'da değil (Hazırlık ekranında); bu turda yalnız
  düğme sınıfları ortak dile geçiyor.

### Ertelenmiş Ayarlar hataları

- **Klasör seçici** formun eski kopyasını yazıyor (`setForm({ ...form, … })`
  `await` sonrasında). Düzeltme: işlevsel güncelleme
  `setForm((current) => …)`.
- **İlk kare:** açılışta bir an eski form görünebiliyor. Düzeltme: form
  `open` olduğu anda (ilk çizimden önce) yapılandırmadan kuruluyor.
- **Bölge kalabalığı:** her `Section` ayrı `region` landmark'ı ve
  yinelenen `aria-label`. Yeni düzende bölümler sekme paneli; kartlar
  landmark değil.
- **İlk odak testi**ndeki etkisiz Enter adımı kaldırılıyor, test odaklanan
  öğeyi doğrudan doğruluyor.

## 3. Öteki pencereler

- **Ortak `Modal`'a taşınanlar:** `AppConnectionsModal`,
  `GlobalSkillsModal`, `UpdatePromptModal`. Elle çizilen kabuk (`fixed
  inset-0 …`) kalkıyor. `UpdatePromptModal` bugün `z-[70]` ile her şeyin
  üstünde; `layer="confirm"` alıyor. Soru aşamasında Escape ve ✕ "Daha
  Sonra" ile aynı (`onDismiss`); indirme/kurulum aşamasında
  `closeDisabled`, pencere kapanmıyor (bugün de kapanmıyor).
- **İç parçalar:**
  - `RoleModal`'daki elle çizilmiş `<input>` → `Input`.
  - Elle sınıf verilmiş düğmeler (taramada bulunanlar: `AppConnectionsModal`
    4, `GlobalSkillsModal` 4, `RoleModal` 4, `SettingsModal` 6,
    `UpdatePromptModal` 3, `SkillsSection` 7) → `btn`/`iconBtn`/`tintBtn`.
    Pencere başına en fazla bir birincil düğme.
- **Ertelenmiş:** `ChatProjectDialog`'da İptal sonrası odak `body`'ye
  düşüyor. `Modal` kapanınca odağı açan öğeye zaten geri veriyor; bu
  pencerede neden çalışmadığı önce ölçülüyor, sonra düzeltiliyor.
- **AddSystemModal** düzenleme modunda açılınca `dirty=false` (değişiklik
  yapmadan Escape soru sormadan kapatıyor): test ekleniyor.

## Kapsam dışı

- SapWriteGate (SAP yazma onayı): güvenlik akışı, ayrı ele alınacak.
- `Tabs` bileşeninin borçları: bu turda `Tabs` kullanılmıyor.
- Ayarlar'ın tam ekran sayfaya dönüşmesi (kullanıcı pencereyi seçti).
- Ayarlar'da anında kaydetme.

## Test

- Çerçeve: her ertelenmiş hata için önce başarısız olan test (gizli/
  fieldset odak, Escape önceliği, `alertdialog`, `e.repeat`, odak dönüşü).
- `size` ölçeği: her pencerenin beklenen boyu (tablodaki eşleme).
- Taşınan üç pencere: Escape, odak tuzağı, katman.
- Ayarlar: bölüm geçişi, ok tuşları, değişiklik noktası, alt satırdaki
  uyarı, klasör seçicinin güncel formu koruması, açılışta Genel.
- Kaynak kuralı testleri: pencerelerde `fixed inset-0` ve `width={`
  kalmıyor.
- Görsel doğrulama: kullanıcı uygulamayı açıp bakıyor.

## Global kurallar

- Vibe değerleri birebir kopyalanmıyor.
- Lime/vurgu yalnız seçimde; ekranda en fazla bir birincil düğme.
- Kod yorumları tam Türkçe karakterle; commit mesajları ASCII Türkçe.
- `git add` dosya dosya; prettier yok; kaynak dosyalar Edit aracıyla.
- `EmbeddedTerminal` davranışı değişmiyor.
