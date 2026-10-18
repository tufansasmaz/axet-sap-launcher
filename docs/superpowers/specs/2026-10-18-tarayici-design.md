# Yerleşik Tarayıcı — Tasarım

Tarih: 2026-10-18 · Dal: `ozellik/tarayici` (`ozellik/degisiklikler` üstüne) · Durum:
kullanıcının 2026-10-18 gece verdiği "onay isteme, devam et" yetkisiyle yazıldı (tasarım/plan
onayı atlandı; birleştirme/push yine onaya bağlı). Yol haritasının 4. maddesi ("yerleşik
tarayıcı + ajan başına kalıcı bellek") iki alt projeye bölündü: önce tarayıcı (bu belge),
sonra bellek (ayrı spec).

## 1. Amaç

Ajanlarla çalışırken kullanıcının uygulamadan çıkmadan bir web sayfasına bakabilmesi ve
gördüğünü bir ajana tek adımda verebilmesi:

1. Ajanın ayağa kaldırdığı yerel bir sunucuyu (`http://localhost:5173`), bir dokümantasyon
   sayfasını ya da bir Fiori uygulamasını ajanların yanında açmak.
2. Sayfadaki seçili metni, sayfanın adresini ya da ekran görüntüsünü **Ajana gönder** ile
   seçilen ajanın istemine eklemek.

AgentSpace'in "Browser panel" özelliğinin karşılığı (kamuya açık sayfasındaki tarif; tersine
mühendislik yok). Bu turda **ajanın tarayıcıyı kendisinin sürmesi yok** (§9): bunun için
uygulamaya ajandan geri çağrı kanalı gerekiyor; ayrı bir iş.

İlke (öncelik sırası): **güvenlik → veri kaybı yok → yanlış bilgi yok → işlevsel boşluk**.
Tarayıcı, güvenilmeyen içerik çalıştıran tek yüzey olacak; uygulamanın preload'una, IPC'sine,
dosya sistemine ve SAP oturumlarına hiçbir yoldan erişememeli.

## 2. Ekran

Ajanlar ekranındaki geçiş beşe çıkar: **Bölmeler | Pano | Ofis | Değişiklikler | Tarayıcı**.
Seçim alan başına hatırlanır (`view: "browser"`), diğer görünümlerdeki kalıp: bölmeler kapanmaz,
gizlenir.

- **Üst satır**: Geri, İleri, Yenile/Durdur, adres alanı, **Sistem tarayıcısında aç**,
  **Ajana gönder**.
- **Adres alanı**: `http://` ya da `https://` ile başlamayan girdi: içinde boşluk yoksa ve
  nokta ya da `localhost` içeriyorsa başına `https://` (localhost/127.0.0.1 için `http://`)
  eklenir; değilse "Yalnız http ve https adresleri açılır" uyarısı. Arama motoruna yönlendirme
  YOK (kullanıcının yazdığı bir yere gönderilmesin).
- **Gövde**: sayfa. Henüz sayfa yoksa boş durum: "Bir adres yaz" + alanın son açılan adresi
  (varsa) tek tıkla.
- Yükleme hatası (DNS, bağlantı reddi, sertifika): gövdede sade mesaj + adres + Yeniden dene.
  Sertifika hatası **asla** yok sayılmaz (istisna düğmesi yok).
- Alan başına son adres saklanır (layout'ta `browserUrl`, en çok 2048 karakter, yalnız
  http/https). Geri/ileri geçmişi oturumluktur, saklanmaz.

## 3. Ajana gönder

Düğme bir menü açar: alandaki **ajan** bölmeleri (kabuk bölmeleri yok), her biri adı, rolü,
durumuyla. Ajan yoksa menüde "Bu alanda ajan yok". Seçilince metin
hemen gönderilir (onay penceresi yok; menüde seçmek onaydır):

- Gönderilen metin tek satır: `[Tarayici] <başlık> <adres>` ve seçili metin varsa
  ` Secili metin: "<metin>"`. Seçili metin boşlukları tekleştirilip 2000 karakterde kırpılır
  (`…`). Kontrol karakterleri (C0/C1) atılır. Başlık 120 karakter. Başlıkta ve seçili
  metinde `\` → `\\`, `"` → `\"` (tırnak çerçevesi kırılmasın; kırpma kaçış çiftini bölmez).
- **Ekran görüntüsü ile**: menüdeki ikinci seçenek. Görünür alanın PNG'si alan kökünün altında
  `.ntt-studio/tarayici/<yyyyMMdd-HHmmss>.png` dosyasına yazılır ve metne
  ` Ekran goruntusu: .ntt-studio/tarayici/<ad>.png` (alan köküne göreli) eklenir. Klasör yoksa
  yaratılır. Dosya en çok 10 MB; büyükse görüntü alınmaz, uyarı.
- Gönderme Görev Panosu'nun kullandığı yoldan (`agentMonitor.sendPrompt`) geçer: ajan
  çalışıyor/soru soruyor/kullanıcı yazıyorsa gönderilmez ve sebebi söylenir ("Ajan şu an
  meşgul", "Ajan bir soru bekliyor" …) ve sonra kendiliğinden yeniden denenmez. Uygunsa
  metin ajanın istem satırına yazılır ve Enter'a basılır (pano ile aynı). `!` ile başlayan
  metin olmaz (önek `[Tarayici]`). Metin yazıldıktan sonra Enter iptal olursa (kullanıcı
  arada terminale yazdı) sonuç `notSubmitted`: metin satırda kalır, ekran görüntüsü
  silinmez, kullanıcıya "kontrol edip Enter'a sen bas" denir.
- Başarıda kısa onay satırı "<ajan>'a gönderildi" ve görünüm Tarayıcı'da kalır.

## 4. Güvenlik modeli

Tarayıcı bir `<webview>` (DOM içinde çizildiği için uygulamanın pencereleri ve açılır
menüleri üstte kalır). Electron'un "webview güvenliği" önerileri ana süreçte zorunlu kılınır:

1. **Tek giriş kapısı `will-attach-webview`**: şu an bütün webview'lar reddediliyor
   (`windowGuard.ts`, `flowSandbox.ts`). Yeni kural: yalnız **ana pencerenin** webContents'i
   ve yalnız `partition === "persist:ntt-tarayici"` ve `src` boş ya da http/https olan
   webview'a izin; izin verilen webview'ın `webPreferences`'ı zorla: `preload` silinir,
   `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`,
   `webSecurity: true`, `allowRunningInsecureContent: false`, `plugins: false`. Diğer her
   durumda (Flow sandbox penceresi dahil) reddedilir — mevcut davranış.
2. **Ayrı oturum**: `persist:ntt-tarayici` bölümü; uygulamanın varsayılan oturumundan, SAML
   oturumlarından ve Node-RED'den ayrı. SAP'ye ya da portala bu tarayıcıda giriş yapılırsa
   çerezler yalnız burada kalır.
3. **İzinler**: bu oturumda yalnız `clipboard-sanitized-write` verilir (sayfaların "kopyala"
   düğmeleri çalışsın); geri kalan bütün izin istekleri (kamera, mikrofon, konum, bildirim, pano
   okuma — `clipboard-read`, `deprecated-sync-clipboard-read` —, MIDI, HID, seri port, ekran
   paylaşımı) reddedilir. `setPermissionRequestHandler` ve `setPermissionCheckHandler` aynı
   yüklemi kullanır (yalnız `clipboard-sanitized-write` için true).
4. **Gezinme**: webview içinde ana çerçeve gezinmesi yalnız http/https; `file:`, `data:`,
   `javascript:`, `chrome:`, `devtools:` vb. reddedilir. `window.open`/`target=_blank`:
   aynı webview'da açılır (yeni pencere asla). Uygulamanın genel "yalnız kendi sayfası"
   gezinme kuralı webview'ın webContents'ine uygulanmaz (yerine bu kural).
5. **İndirme**: bu oturumda `will-download` iptal; kullanıcıya "İndirmeler yerleşik tarayıcıda
   kapalı; Sistem tarayıcısında aç'ı kullan".
6. **IPC yüzeyi**: webview'ın preload'u yok, dolayısıyla `window.api` yok. Ana süreçteki
   tarayıcı IPC'leri (ekran görüntüsü, seçili metin) yalnız ana pencereden gelir ve hedef
   webview'ı `webContentsId` ile alır; ana süreç o id'nin **ana pencereye bağlı, bu bölümdeki**
   bir webview olduğunu doğrular (`hostWebContents` + oturum), değilse reddeder.
7. **Günlük**: `tarayici.gezinme` yalnız sonuç (izin/ret) ve şema; adres, başlık, seçili
   metin günlüğe yazılmaz. `tarayici.gonder` (sonuç, ekran görüntüsü var mı).
   `tarayici.kural-hatasi` (yalnız sonuç): sayfanın kuralları kurulamadı, sayfa kilitlendi
   (uygulama sırasında eklendi).
8. **CSP / izinli kökler**: uygulamanın kendi CSP'si değişmez; webview kendi kökünde çalışır.

## 5. Veri

- Layout (alan başına): `view: "browser"` ve `browserUrl?: string`. Eski kayıtlar etkilenmez;
  geçersiz değer atılır (mevcut `readWorkspaceView` kalıbı).
- Ekran görüntüleri alan kökünde `.ntt-studio/tarayici/`. Silme/temizleme kullanıcıda (rehber
  söyler). Değişiklikler görünümü Git deposunda bunları da görür (`.gitignore`'a ekleme
  kullanıcıya bırakılır; rehberde önerilir).

## 6. Hata durumları

| Durum | Davranış |
|---|---|
| Geçersiz adres / şema | Uyarı, gezinme yok |
| DNS/bağlantı/sertifika hatası | Gövdede mesaj + Yeniden dene; sertifika istisnası yok |
| Ajan meşgul / soru bekliyor / yazıyor / kapalı | Gönderilmez, sebep satırı |
| Ekran görüntüsü alınamadı / yazılamadı / >10 MB | Gönderilmez, uyarı; metin gönderilmez (yarım bilgi gitmesin) |
| Alan kökü yok | Ekran görüntüsü seçeneği kapalı; metin gönderimi açık |
| Webview çöktü (`render-process-gone`) | Gövdede "Sayfa çöktü" + Yeniden yükle |

## 7. Erişilebilirlik ve tasarım

- Araç çubuğu düğmeleri `aria-label`'lı; adres alanı Enter ile gider, Esc ile eski adrese
  döner. Ctrl+L adres alanına odak (yalnız Tarayıcı görünümündeyken). Alt+Sol/Sağ geri/ileri.
- Lime yalnız seçim; yeni renk yok. "Daha fazla UI değil": yer imi, sekme, geçmiş listesi yok.

## 8. Test

- Saf: adres normalleştirme (şema ekleme, localhost → http, boşluklu girdi reddi, 2048
  sınırı), gönderilecek metin (C0/C1 atma, boşluk tekleştirme, 2000 kırpma, başlık 120,
  `!` önlemi), ekran görüntüsü yolu (alan köküne göreli, `isSafeRelPath` ile tutarlı).
- Ana süreç: `will-attach-webview` kararı (izinli/izinsiz bölüm, ana pencere dışı, kötü src,
  zorla temizlenen webPreferences), webview gezinme kararı, izin reddi, indirme iptali,
  `webContentsId` doğrulaması — sahtelerle.
- Kaynak kilidi: `webviewTag` yalnız ana pencerede; Flow sandbox'ı hâlâ reddediyor.
- Bileşen: araç çubuğu, adres girişi, hata gövdesi, Ajana gönder menüsü (ajan yok, meşgul,
  başarı), beş seçenekli geçiş, i18n tr/en.
- Elle: localhost sayfası açma, seçili metni ajana gönderme, ekran görüntüsü, indirme reddi,
  `window.open`, sertifika hatası sayfası (`https://expired.badssl.com` — kamuya açık test
  sitesi), kamera izni isteyen sayfa.

## 9. Kapsam dışı

Ajanın tarayıcıyı sürmesi (aç/oku/tıkla — geri çağrı kanalı gerekir), sekmeler, yer imleri,
geçmiş listesi, indirme, eklenti, başka tarayıcıdan oturum içe aktarma, terminaldeki
bağlantıların yerleşik tarayıcıda açılması, alanlar arası paylaşılan sayfa durumu.
