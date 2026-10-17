# Ajan Alanı — tasarım (2026-10-17)

Terminal ekranının yerine geçen, birden çok yapay zekâ ajanının yan yana çalıştığı bir çalışma alanı. AgentSpace'in çalışma stilinden (adlı ajanlar, her biri kendi terminalinde, tek bakışta durum, soruların tek yerde toplanması) esinleniyor; kodu ve tasarımı tamamen bize ait. SAP'ye bağlı değil: SAP sistemi bağlamak isteğe bağlı, SAP dışı geliştiriciler de kendi projelerinde kullanıyor.

## 1. Neden

- Bugün bir danışman ya da geliştirici aynı anda tek bir ajanla konuşuyor (sohbet) ya da elle terminal bölmeleri açıp her birinde ajanı ayrı ayrı izliyor. Hangisinin çalıştığı, hangisinin soru sorup beklediği ancak bölmelere tek tek bakınca anlaşılıyor.
- Kullanıcı kararı (2026-10-17): "Terminal ekranımız yerine AgentSpace çalışma stilini bize özgü şekilde entegre edelim; yalnız SAP değil, SAP'den bağımsız geliştirme yapan geliştiricileri de düşün." Merkezde üçü birden: ajan ekibi + görev panosu, paralel ajanlar, otopilot. İlk sürüm: paralel ajanlar + Kararlar. Görünüm: sade ekip görünümü varsayılan, ofis görünümü düğmeyle. Motor: axet-code + başka CLI'ler. Yaklaşım (A): her ajan kendi gerçek terminalinde, motor başına durum okuyucu.

## 2. Kapsam

**Sürüm 1 (bu belge):**
1. "Ajanlar" ekranı Terminal ekranının yerine geçer (sol rayda aynı yer, `Ctrl+3`).
2. Ajan ekleme: ad, rol (serbest metin + hazır roller), motor, çalışma klasörü, renk.
3. Her ajan mevcut bölmeli terminal altyapısında kendi bölmesinde çalışır (bölme, sürükle-bırak, ad, renk, yazı boyutu aynen).
4. Ekip şeridi: her ajan için kart (ad, rol, motor, durum, son etkinlik); karta tıklayınca o ajanın bölmesi öne gelir/odaklanır.
5. Durum: `çalışıyor / boşta / soru soruyor / bitti / hata / bilinmiyor`; her durumun KAYNAĞI gösterilir: **kesin** (motorun kendi kaydından) ya da **tahmini** (terminal hareketinden).
6. "Kararlar" paneli: bütün ajanların cevap bekleyen soruları tek listede; seçenekli sorular (axet-code) listeden cevaplanır, diğerleri "terminale git".
7. Bildirim: pencere arka plandayken bir ajan soru sorunca ya da işini bitirince Windows bildirimi (mevcut bildirim altyapısı ve ayarı).
8. Düz terminal (cmd / PowerShell) bölmesi eklemek mümkün kalır — Terminal ekranının bugünkü işlevi kaybolmaz.

**Sonraki sürümler (yapı bunlara göre kurulur, bu belgede yalnız ilke düzeyinde):**
- S2: Görev panosu + lider ajan (işi kartlara bölme, karta ajan atama, kanıt raporuyla kapanma).
- S3: Otopilot kuyruğu (biri bitince sıradaki), sabah raporu.
- S2/S3 ile birlikte: ofis görünümü (aynı veri, sahne olarak). Ayrı bir veri modeli GEREKTİRMEZ; sürüm 1'in durum modeli onu besler.
- Claude Code / Codex için kesin durum okuyucuları (bu makinede kurulu değiller; ölçüm o motorlar kurulunca yapılır, bkz. §6).

**Kapsam dışı:**
- Başka bir ürünün kodunu inceleme / tersine mühendislik. Hiçbir rakip uygulamanın kodu ya da paketi açılmaz.
- Ajanların birbirine otomatik iş devretmesi (S2'nin konusu).
- Mobil/uzaktan kontrol, sesli asistan.
- Ajanları başsız çalıştırma (sohbet köprüsü ayrı kalır, bu ekran terminal tabanlı).

## 3. Kavramlar ve veri modeli

- **Çalışma alanı** (bugünkü terminal "workspace"i genişler): ad + kök klasör + isteğe bağlı SAP sistemi (`serviceUuid`). Kök klasör herhangi bir klasör ya da Git deposu olabilir; varsayılan `axetWorkspaceDir`. SAP sistemi seçilirse kök, o sistemin proje klasörü (`computeProjectDir`) olur ve SAP araçları/yazma onayı axet-code tarafında zaten devrede (8787, `SapWriteGate`). En fazla 6 çalışma alanı (bugünkü sınır).
- **Ajan**: `{ id, ad, rol, motor, klasör (varsayılan: çalışma alanının kökü), renk, model? }` — mevcut terminal bölmesinin (`TerminalPane`) bir türü olarak saklanır: bölme türü `agent` + `agent` alanları. Düz kabuk bölmesi (`cmd`/`powershell`) türü aynen kalır. Bölme sınırı (9) ajanlar için de geçerli.
- **Motor**: bir CLI tanımı — `{ id, ad, komut, kurulu mu, durum okuyucu, cevap yöntemi }`. Sürüm 1 motorları:
  - `axet-code` (varsayılan; komut bugünkü `config.axetCommand`, varsayılan `axet-code -y`),
  - `claude` (Claude Code), `codex` (OpenAI Codex), `gemini` (Gemini CLI),
  - `ozel` — kullanıcının yazdığı komut (ör. `opencode`, `kiro-cli`).
  "Kurulu mu" PATH'te aranarak (`where`) bulunur; kurulu olmayan motor seçilebilir ama kartta "kurulu değil" yazar ve bölme açılmaz.
- **Durum**: `{ durum, kaynak: "kesin" | "tahmini", sonEtkinlik, soru? }`. Ajan durumu kalıcı değildir; açılışta yeniden okunur.
- **Karar**: `{ ajanId, soru, seçenekler?: string[], zaman, cevaplanabilir: boolean }` — durum okuyucusundan türetilir; ayrı saklanmaz (tek doğruluk kaynağı motorun kendi kaydı).
- Kalıcılık: çalışma alanları ve ajan tanımları bugünkü `config.terminalWorkspaces` yapısında (geriye uyumlu: eski kayıtlar düz kabuk ve `axet` türü bölmeler olarak açılır; `axet` türü otomatik olarak motoru `axet-code` olan bir ajana dönüştürülür).

## 4. Ekran

- Sol ray: "Terminal" yerine **"Ajanlar"** (aynı sıra, `Ctrl+3`). Sol kenar çubuğu: çalışma alanları (bugünkü TerminalSidebar) + her çalışma alanında ajan sayısı ve "soru bekleyen" rozeti.
- Ana alan, yukarıdan aşağı:
  1. **Ekip şeridi** — ajan kartları yatay sıra halinde. Kart: renk şeridi, ad, rol, motor adı, durum noktası + metni ("Çalışıyor", "Soru soruyor", "Boşta 3 dk"), tahmini durumlarda küçük "≈" işareti ve açıklama ipucu. Seçili ajanın kartı vurgulu (lime YALNIZ seçim). Sağ uçta "+ Ajan" düğmesi.
  2. **Bölme alanı** — bugünkü bölmeli terminal. Her ajan bir bölme; bölme başlığında ajanın adı ve rengi (bugünkü bölme başlığı).
  3. **Kararlar paneli** — sağda, katlanabilir; başlıkta sayaç. Her satır: ajan adı/rengi, soru, seçenek düğmeleri (varsa) ya da "Terminale git". Boşsa "Bekleyen karar yok" ve panel kendiliğinden daralır.
- Ajan ekleme penceresi (ortak Modal): ad, rol (hazır: Geliştirici, Analist, Test, İnceleme; serbest metin), motor (kurulu olanlar üstte), klasör (varsayılan kök; değiştirilebilir), renk. "Ekle" bölmeyi açar ve motoru başlatır.
- Ofis görünümü sürüm 1'de YOK; başlıkta "Görünüm" düğmesi S2/S3'e kadar konmaz (ölü düğme bırakılmaz).
- Boş durum: hiç ajan yokken kısa açıklama + "İlk ajanını ekle" + kurulu motorların listesi.

## 5. Ajanın başlatılması

- Bölme bugünkü gibi kabuk (cmd/PowerShell) olarak açılır ve motorun komutu ilk satır olarak yazılır (`terminalManager.createTerminal` + `initialCommand`). Böylece motor kapansa da bölme kabukta kalır, kullanıcı yeniden başlatabilir.
- Motor komutu motor tanımından gelir; model seçildiyse motorun model bayrağı eklenir (yalnız bayrağı bilinen motorlarda; bilinmeyende alan gösterilmez).
- İzin kipi: axet-code bugünkü kararla `-y` (kullanıcı kararı 2026-09-24, yerelde onay sormadan; SAP yazmaları ayrıca `SapWriteGate`'ten geçer). Diğer motorlara izin atlatma bayrağı (ör. `--dangerously-skip-permissions`, `--yolo`) EKLENMEZ; motor kendi onaylarını terminalde sorar ve bu bir "Karar" olarak görünür (§7).
- Ortam: bugünkü terminal ortamı (`ABAP_HTTP_TOKEN` yalnız SAP çalışma alanında anlamlı; SAP'siz çalışma alanında da zararsız, değişmez).

## 6. Durum okuyucuları (motor başına)

Ortak arayüz (ana süreç, saf mantık + enjekte edilen okuma): `okuyucu.basla(ajan, bolme) → { durum(): AjanDurumu, dur() }`. Okuyucu bölmenin terminal verisini (zaten ana süreçten geçiyor) ve motorun kendi kayıtlarını kullanabilir.

1. **axet-code — kesin.** Oturum veritabanı (`resolveSessionDb(klasör)`), bugünkü yardımcılarla (`readMessagesSince`, `hasUnansweredToolCall`, finish türleri):
   - *Oturum eşleme:* aynı klasörde birden çok ajan aynı veritabanını kullanır, bu yüzden "en yeni oturum" yetmez. Bölmeye yazılan satır (kullanıcı Enter'a bastığında, terminal girişi ana süreçten geçtiği için) yalnız bellekte tutulur ve `findSessionByPrompt` ile o ajanın oturumu bulunur; bulunduktan sonra ajan→oturum bağı sabittir (bölme kapanana kadar). İlk istem yazılmadan önce durum "boşta"dır. Eşleme belirsiz kalırsa kaynak "tahmini"ye düşer, yanlış oturuma ASLA bağlanmaz.
   - *Durum:* son asistan mesajı tamamlanmadıysa → çalışıyor; `ask_user` aracı sonuçsuzsa → soru soruyor (soru + seçenekler `parseAskUser` ile); son finish `end_turn` → boşta; finish hata türleri → hata (mevcut sınıflandırıcılar).
   - *Ön koşul ölçümü (plan Görev 0):* axet-code TUI'nin oturumu baştan belirlemeye yarayan bir bayrağı var mı (`--resume <id>`, oturum adı vb.)? Varsa eşleme bununla yapılır (istem eşlemeye gerek kalmaz). Ölçülmeden karar verilmez.
2. **Claude Code / Codex / Gemini — sürüm 1'de tahmini, kesin okuyucu ölçüm sonrası.** Bu makinede kurulu değiller; davranışları (Claude Code kancaları ve oturum kayıtları, Codex oturum dosyaları ve `notify` ayarı) ölçülmeden kesin okuyucu yazılmaz. Sürüm 1 bunlar için genel okuyucuyu kullanır; kesin okuyucular ayrı bir iş olarak, o motorlar kurulu bir makinede ölçülerek eklenir (motor tanımına okuyucu takmak yeterli; ekran değişmez).
3. **Genel okuyucu — tahmini.** Terminal çıktısı akıyorsa → çalışıyor; 20 saniyedir çıktı yoksa → boşta (eşik sabit, testte enjekte); motor süreci kapandıysa (kabuk istemi döndüyse) → bitti. Soru algılamaz (soru kartı çıkmaz; kullanıcı terminalde görür). Kartta "≈ tahmini" ve ipucu: "Bu motorun durumu terminal hareketinden tahmin ediliyor."

## 7. Kararlar

- Kaynak: okuyucuların bildirdiği açık sorular. Sürüm 1'de yalnız axet-code (kesin okuyucu) seçenekli soru üretir; genel okuyucu soru üretmez.
- Listeden cevaplama: axet-code soru kutusunda seçenek, ok tuşları + Enter ile seçilir (eski TUI köprüsünde 1.8.2'ye kadar sahada kullanılan yöntem; serbest metin yazımında menü tuzakları vardı, seçenek seçiminde yoktu). Sürüm 1'de yalnız SEÇENEK seçimi listeden yapılır; serbest metin cevabı ve çok seçimli sorular "Terminale git" ile terminalde verilir.
- Cevap gönderilmeden önce okuyucu sorunun hâlâ açık olduğunu yeniden doğrular (aynı anda terminalden cevaplanmış olabilir); kapalıysa satır kaybolur, tuş gönderilmez.
- Bir karar cevaplanınca (listeden ya da terminalden) okuyucu bunu oturum kaydından görür ve satır kalkar — tek doğruluk kaynağı motorun kaydı.

## 8. SAP ve SAP dışı kullanım

- SAP'siz çalışma alanı: sıradan bir proje; ajanlar SAP aracı görmez (axet-code'un SAP araçları yalnız SAP proje klasöründe/8787 bağlamında devrede; bugünkü davranış).
- SAP'li çalışma alanı: kök SAP proje klasörü; SAP yazmaları bugünkü gibi `SapWriteGate` onayından geçer, kademe kuralları (QA/PRD salt okunur) aynen geçerli. Ajan Alanı bu kuralları DEĞİŞTİRMEZ ve atlatmaz.
- Rol kapısı: modül danışmanı rolünde geliştirme yetenekleri bugünkü gibi kapalı kalır (`skillProfiles`); Ajan Alanı rol kapısını atlatan bir yol açmaz.

## 9. Bildirim

- Mevcut `notificationFor` + ayar (`chatNotifications`) yeniden kullanılır; yeni türler: "ajan soru soruyor", "ajan işini bitirdi" (yalnız kesin durumda; tahmini "bitti" için bildirim yok — yanlış alarm olmasın). Tıklayınca Ajanlar ekranı ve o ajanın bölmesi açılır. İçerik (soru metni) bildirime yazılmaz.

## 10. Hata durumları

- Motor kurulu değil → kartta "kurulu değil", bölme açılmaz, kurulum için kısa metin.
- Motor çıktı/kapandı → "bitti" (kesin okuyucuda sebebiyle); bölme kabukta kalır, kartta "Yeniden başlat".
- axet-code 1.4 öncesi / bozuk exe → bugünkü `axetBinaryStatus` mesajı kartta.
- Veritabanı okunamıyor → okuyucu "tahmini"ye düşer, hata fırlatmaz (ana süreçte yakalanmamış istisna yok).
- Bölme sınırı (9) dolu → "+ Ajan" devre dışı + açıklama.

## 11. Günlük

| Etiket | Alanlar |
|---|---|
| `ajan.eklendi` | motor, rol türü (hazır/serbest), sap (evet/hayır) |
| `ajan.durum` | motor, durum, kaynak (yalnız değişimde) |
| `ajan.karar` | motor, yol (liste/terminal) |
| `ajan.eslesme` | motor, sonuc (istem/bayrak/belirsiz) |

Mesaj, soru ya da terminal içeriği günlüğe yazılmaz.

## 12. Test

- Saf mantık: genel okuyucu durum geçişleri (sahte saat), axet-code okuyucusu (sahte mesaj listeleriyle: çalışıyor/soru/boşta/hata), istem→oturum eşleme (aynı klasörde iki ajan, belirsiz durum), Karar listesi türetme ve "hâlâ açık mı" yeniden doğrulaması, motor "kurulu mu" (sahte `where`), eski `axet` bölmelerinin ajana dönüşümü.
- Arayüz: ekip şeridi kartları ve durum metinleri, "≈ tahmini" işareti, Kararlar paneli (seçenek düğmesi → doğru tuş dizisi IPC'si; serbest metin → terminale git), ajan ekleme penceresi, kurulu olmayan motor, bölme sınırı.
- Elle doğrulama (kullanıcıyla): iki axet-code ajanı aynı klasörde; birinde soru, listeden cevap; bildirim; düz terminal bölmesi.

## 13. Açık noktalar (plan bunları ölçümle kapatır)

1. axet-code TUI'de oturumu baştan belirleme bayrağı (§6.1) — Görev 0 ölçümü.
2. axet-code soru kutusunda seçenek seçiminin tuş dizisi 1.4.x TUI'de hâlâ aynı mı — Görev 0 ölçümü (eski köprüdeki dizi referans).
3. Claude Code / Codex kesin okuyucuları — ayrı iş, o motorlar kurulu bir makinede ölçülerek.
