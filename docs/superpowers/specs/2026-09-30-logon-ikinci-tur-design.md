# Logon ekranı — ikinci tur tasarımı

Dal: `tasarim/grafit`. Önceki tur: `2026-09-30-logon-sag-taraf-design.md`.

## Kullanıcının söylediği

1. Kenar çubuğunun sağındaki ekran çok boş, çevresi siyah kalmış.
2. Kenar çubuğunun yapısı eski, yeni tasarıma yakışmıyor.

## Kararlar (kullanıcıyla)

- Sağ panel **iki sütun** olacak (başlık üstte, solda bağlantı, sağda notlar).
- Kenar çubuğunda **yapı değişmiyor**, yalnızca görünüm sohbet/terminal kenar çubuklarıyla aynı dile geçiyor.

## 1. Sağ panel (`SystemPanel`)

**Sebep:** Seçili sistem, geniş pencerenin ortasında `max-w-[720px]` bir sütunda duruyor. Geri kalan alan `bg-app` (en koyu yüzey) olarak boş kalıyor.

**Tasarım:**

- **Kap:** `max-w-[720px]` kalkıyor. Yerine `max-w-[1280px]` geliyor, yan pay `px-6` ile `px-8` arası. Kap yine ortalanıyor.
- **Başlık:** `SystemHeader` üstte tam genişlikte kalıyor, içeriği değişmiyor.
- **Başlığın altı:** iki sütunlu ızgara.
  - Sol sütunda `SystemInfoList` ("Bağlantı" başlığıyla), sağ sütunda `SystemNotes`.
  - Genişlik ~1000px'in altına inince tek sütuna düşüyor. Sıra bugünkü gibi: önce bilgiler, sonra notlar.
  - Eşik bir Tailwind kırılma noktası değil, kabın kendi genişliğine göre çalışmalı. Kenar çubuğu ve dosya sekmeleri alanı daralttığı için pencere genişliği yanıltır. Uygulama plan aşamasında seçilecek: container query ya da `grid-template-columns: repeat(auto-fit, minmax(…))`.
- **Kartlar:**
  - Her iki sütun bir kartın içinde: `bg-card`, `border border-line`, `rounded-xl`, iç boşluk ~`p-5`.
  - Arka plan (`bg-app`) yalnızca kartların arasında ve çevresinde ince bir boşluk olarak görünüyor.
  - Yeni renk ya da token eklenmiyor.
  - Notlar kutusu kendi kartının içindeki not çerçevesini koruyor. İç içe iki kenarlık kalabalık durursa iç çerçeve kenarlığı hafifletilebilir, ama tek gerçek kart dış kart.
- **Not kutusu yüksekliği:** Yan yana düzende not kartı sol kartla aynı yüksekliğe uzuyor ve metin alanı kalan yüksekliği dolduruyor. Tek sütun düzeninde bugünkü yüksekliğini koruyor.
- **Değişmeyenler:**
  - Boş durumlar ("sistem yok", "sistem seçilmedi").
  - Bütün düğmeler, kısayollar ve davranışlar.
  - Ekranda en fazla bir birincil düğme kuralı (`aXet'te Aç`).

## 2. Kenar çubuğu (`LogonSidebar`, `Tree`, `RecentSystems`)

Satır yüksekliği (`h-7`) ve seçim görünümü zaten sohbetle aynı. Değişenler yalnızca aşağıdakiler.

- **Üst şerit:**
  - Arama satırı `ChatSidebar` ile aynı: `h-[54px] shrink-0`, `px-2.5`.
  - Sistemler/Dosyalar geçişi çerçeveli kutudan (`border border-line p-0.5`) çıkıyor. Aramanın yanında iki sade simge düğmesi oluyor.
  - Seçili olan düğme `bg-active` ile belli oluyor. Lime (vurgu rengi) kullanılmıyor, çünkü lime yalnızca liste seçimi için.
  - ＋ düğmesi ve menüsü yerinde kalıyor.
- **Liste kabı:** `p-3 pt-0` yerine sohbetteki gibi `px-2.5 pb-2`.
- **Bölüm başlıkları:**
  - "SON KULLANILANLAR" aynı kalıyor.
  - Ağacın üstüne aynı biçimde (`Eyebrow`, ok, sayı) açılıp kapanabilen bir **"MÜŞTERİLER"** başlığı ekleniyor.
  - Sayı, müşteri klasörü sayısı değil, görünen sistem sayısı.
  - Kapalıyken ağaç gizleniyor.
  - Açık/kapalı durumu oturum içinde tutuluyor. Kalıcı olması gerekmiyor, "SON KULLANILANLAR" nasıl tutuyorsa öyle.
  - Arama yapılırken başlık kapalı olsa bile sonuçlar görünüyor. Aramada ağaç her zaman açık.
- **Satırlar (ağaç ve son kullanılanlar aynı):**
  - Lacivert `Server` simgesi kalkıyor.
  - `StatusDot` satırın başına, sabit genişlikte bir yuvaya taşınıyor.
  - Sıra: `● ad … [ortam rozeti] SID`.
  - Klasör simgesi gri (`text-slate-500`), `--folder-icon` rengi kullanılmıyor.
  - Girinti seviye başına 14px yerine 12px.
- **Değişmeyenler:**
  - Arama.
  - Klavyeyle gezinme (Tree `handleKeyDown`).
  - ＋ menüsü ve dosya görünümü (`FileExplorer`).
  - Seçim ve `ActiveLine`.
  - Satır başlıkları (`title`).

## Kapsam dışı

- Kenar çubuğuna yeni eylem düğmeleri ("Sistem ekle", "Yenile" satırı). Kullanıcı yapıyı değiştirmemeyi seçti.
- Ayarlar ve pencereler, Script sağ tarafı (sıradaki turlar).

## Test

- Var olan `systemPanel`, `logonSidebar`, `tree`, `recentSystems` testleri geçmeye devam ediyor.
- **Yeni testler:**
  - İki sütunlu panelde de ekranda tek birincil düğme var.
  - "MÜŞTERİLER" başlığı görünen sistem sayısını gösteriyor. Kapatınca ağaç gizleniyor, arama yazılınca sonuçlar yine görünüyor.
  - Satırda sunucu simgesi yok, durum noktası addan önce geliyor.
- `npm run -s typecheck` temiz. Tam paket yeşil.
