# Ajan Başına Kalıcı Bellek — Tasarım

Tarih: 2026-10-18 · Dal: `ozellik/ajan-bellegi` (`ozellik/tarayici` üstüne) · Durum:
kullanıcının 2026-10-18 gece verdiği "onay isteme, devam et" yetkisiyle yazıldı (tasarım/plan
onayı atlandı; birleştirme/push yine onaya bağlı). Yol haritasının 4. maddesinin ikinci yarısı
(ilk yarısı: yerleşik tarayıcı).

## 1. Amaç

Bir ajan kapanıp yeniden açıldığında (ya da ertesi gün) "nerede kalmıştık, neye karar
vermiştik" bilgisinin kaybolmaması. AgentSpace'in "Bellek / second brain" özelliğinin sade
karşılığı (kamuya açık sayfasındaki tarif; tersine mühendislik yok): her ajanın kendi
**bellek dosyası** olur, ajan her açılışta onu okur ve önemli şeyleri oraya yazar; kullanıcı
dosyayı uygulamadan görüp düzeltebilir.

İlke (öncelik sırası): **veri kaybı yok → yanlış bilgi yok → işlevsel boşluk**. Bellek
kullanıcının dosyasıdır: uygulama onu hiçbir zaman kendiliğinden silmez ya da ezmez.

Bilinçli olarak YOK: vektör arama, puanlama, tipli notlar, ilişki grafiği, otomatik özetleme,
"gardener". Bunlar ajanın kendisinin yapabileceği ya da sonraki işler.

## 2. Bellek dosyası

- Yer: alanın kök klasörü altında `.ntt-studio/bellek/<anahtar>.md` (UTF-8, Markdown). Alanın
  kökü yoksa ajanın çalışma klasörü. Repoda durur: Git ile taşınır, Değişiklikler görünümünde
  görünür (istenmezse `.gitignore`).
- `<anahtar>`: ajan oluşturulurken bellek açıksa adından türetilir ve **ajan kaydına yazılır**
  (`AgentSpec.memory`); ajanın adı sonradan değişse de dosya aynı kalır. Türetme: küçük harf,
  Türkçe harfler ASCII karşılığına (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u), `[a-z0-9-]` dışı `-`, art arda
  `-` teke, baş/son `-` atılır, en çok 40 karakter; boşsa `ajan`. Aynı alanda aynı anahtar
  varsa `-2`, `-3`… eklenir.
- Dosya yoksa ilk açılışta uygulama **yalnız yoksa** (`wx`) şu başlıkla yaratır:
  `# <ajan adı> — kalıcı bellek` + boş satır + tek satır açıklama ("Bu dosyayı ajan ve sen
  birlikte tutarsınız; kalıcı kararlar, öğrenilenler, yarım işler."). Var olan dosyaya asla
  yazılmaz.
- Yol güvenliği: anahtar desenle doğrulanır (`^[a-z0-9][a-z0-9-]{0,39}$`); yazma/okuma öncesi
  gerçek yol alan kökünün içinde mi (junction/sembolik bağ ile dışarı çıkış reddi —
  Değişiklikler'deki `insideRootReal` kalıbı).

## 3. Ajana bildirme

Ajan **motoru hazır olduğunda** (izleyicinin `engineReady`'si; ajan boşta), uygulama bir kez
şu tek satırı ajanın istem satırına yazar ve Enter'a basar (Görev Panosu'nun `sendPrompt`
yolu):

`[Bellek] Kalici bellegin: .ntt-studio/bellek/<anahtar>.md (alan kokune gore). Once oku. Kalici kararlari, ogrendiklerini ve yarim isleri oraya kisa maddelerle yaz; gizli bilgi (sifre, token) yazma.`

- Yalnız bellek açık ajanlarda, her ajan süreci başına **bir kez** (yeniden başlatmada yine bir
  kez). Ajan meşgulse/soru soruyorsa/kullanıcı yazıyorsa gönderilmez; izleyici bir sonraki
  boşta anında (en çok 3 deneme, 10 sn arayla) yeniden dener, sonra vazgeçer (görünümde not).
- Görev Panosu dağıtımıyla çakışma: bellek satırı gönderilmeden önce bölmeye pano ataması
  gitmişse bellek satırı atlanmaz, ama pano ataması bekliyorsa bellek satırı **önce** gider
  (ataması bekleyen alt görev bir sonraki uzlaştırmada gider — panonun mevcut "ajan meşgul,
  sonra dene" davranışı).
- `axet-code` ajanında da aynı yol (AGENTS.md'ye yazılmaz: kullanıcının dosyası).

## 4. Ekran

- **Ajan ekle** penceresinde **Kalıcı bellek** onay kutusu (varsayılan kapalı; açıklama:
  "Ajan her açılışta kendi bellek dosyasını okur ve önemli şeyleri oraya yazar").
- Ekip şeridindeki ajan kartının menüsünde (bellek açıksa) **Belleği aç**: dosyanın
  içeriğini gösteren ve düzenlenebilen bir pencere (mevcut "Sohbet talimatları" penceresinin
  kalıbı): metin alanı, **Kaydet**, **Kapat**. Kaydetmeden önce dosya diskte değiştiyse
  (ajan bu arada yazdıysa) üzerine yazılmaz: "Dosya bu arada değişti; yeniden yükle" uyarısı,
  kullanıcının metni kaybolmaz (pencerede kalır).
- Bellek kapalı ajanda menüde **Belleği aç** yerine **Belleği etkinleştir** (anahtarı türetir,
  kaydeder; bir sonraki açılışta bildirim gider).
- Yeni görünüm/panel YOK ("daha fazla UI değil").

## 5. Veri

- `AgentSpec.memory?: string` (anahtar). Eski kayıtlar etkilenmez; geçersiz anahtar atılır
  (bellek kapalı sayılır, dosya silinmez).
- Dosya en çok 256 KB okunur/gösterilir; büyükse pencere "Dosya çok büyük; bir düzenleyicide
  aç" der ve **Klasörde göster** sunar (düzenleme yok, ezme yok).

## 6. Güvenlik ve gizlilik

- Bellek dosyası alanın klasöründedir; uygulama içeriğini günlüğe yazmaz. Günlük:
  `bellek.bildirim` (sonuç), `bellek.kaydet` (sonuç, bayt sayısı).
- Renderer serbest yol gönderemez: IPC yalnız (alan kimliği, bölme kimliği) alır; ana süreç
  anahtarı kayıttaki ajan spec'inden, kökü config'teki alandan bulur.
- Ajanın belleğe gizli bilgi yazmaması istemde söylenir; denetlenemez (rehberde not).

## 7. Hata durumları

| Durum | Davranış |
|---|---|
| Alan kökü ve ajan klasörü yok | Bellek seçeneği kapalı, sebep yazılı |
| Dosya yaratılamadı/okunamadı | Bildirim gönderilmez; pencerede hata, dosyaya dokunulmaz |
| Kaydetmede dosya diskte değişmiş | Yazılmaz; uyarı + yeniden yükle; metin kaybolmaz |
| Kaydetme yazılamadı | Hata satırı; metin pencerede kalır |
| Ajan sürekli meşgul | 3 denemeden sonra vazgeçilir; menüde "Bellek bildirilemedi" notu, **Yeniden bildir** |

## 8. Test

Saf (anahtar türetme, çakışma eki, desen, ilk içerik, istem satırı), ana süreç (yalnız yoksa
yaratma, kök içi denetim, değişmiş dosyanın ezilmemesi — mtime+boyut ya da içerik özeti ile,
256 KB sınırı), izleyici/pano ile bildirim sırası ve deneme sayısı (sahte saat), bileşen
(onay kutusu, menü, pencere kaydet/çakışma), i18n tr/en, elle deneme.

## 9. Kapsam dışı

Vektör/BM25 arama, tipli notlar, global bellek, alanlar arası paylaşım, ajanın yazdığını
onaylama kutusu (inbox), sır filtresi, otomatik özetleme, Claude/Codex belleğinden içe aktarım.
