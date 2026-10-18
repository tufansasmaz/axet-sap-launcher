# Değişiklikler: Canlı İzleme, İnceleme Kuyruğu ve Geri Alma Noktası — Tasarım

Tarih: 2026-10-18 · Dal: `ozellik/degisiklikler` (`ozellik/ofis-gorunumu` üstüne) · Durum:
kullanıcının 2026-10-18 gece verdiği "onay isteme, devam et" yetkisiyle yazıldı (tasarım/plan
onayı atlandı; birleştirme/push yine onaya bağlı).

## 1. Amaç

Ajanlar bir klasörde dosya değiştirirken kullanıcının şu üç soruya tek ekrandan cevap
bulması:
1. **Şu an ne değişiyor?** (canlı izleme)
2. **Bu tur / bu alt görev neyi değiştirdi, kabul ediyor muyum?** (inceleme kuyruğu)
3. **Beğenmediysem o ana nasıl dönerim?** (geri alma noktası)

Önceki konuşmada önerilen "inceleme kuyruğu + geri alma noktası" fikirleri ile AgentSpace'in
"Live Watch + instant diff" özelliğinin karşılığı. SAP nesneleri bu kapsamda değil: SAP
yazmaları zaten "SAP yazma geçmişi" panelinde (değişmiyor).

İlke (öncelik sırası): **veri kaybı yok → yanlış bilgi yok → işlevsel boşluk**. Geri alma
yıkıcı bir işlemdir; her geri almadan önce o anın da geri alma noktası alınır ("geri almayı
geri al"), ve yalnız ilgili dosyalar etkilenir.

## 2. Kapsam ve ön koşul

- Yalnız **Git deposu** olan alan kökleri (alanın `root`'u, yoksa ajanların varsayılan
  klasörü). Depo değilse görünüm açık bir mesaj gösterir: "Bu klasör bir Git deposu değil;
  değişiklik izleme yalnız Git depolarında çalışır." Otomatik `git init` YOK.
- `git` PATH'te yoksa aynı şekilde açık mesaj.
- Kullanıcının deposunda **HEAD, dal, index, stash ve ref'ler asla değişmez.** Anlık
  görüntüler geçici bir index dosyasıyla (`GIT_INDEX_FILE`) nesne veritabanına yazılır
  (`git add -A` + `git write-tree`); yalnız ağaç nesnesi oluşur. `.gitignore`'daki dosyalar
  izlenmez (Git'in kendi kuralı).
- Ağaç nesneleri hiçbir ref'e bağlanmadığı için `git gc` onları ~2 hafta sonra silebilir.
  Görüntünün ağacı bulunamazsa kayıt "süresi doldu" olarak gösterilir; sessizce yok sayılmaz.

## 3. Veri modeli

Uygulama veri klasöründe `checkpoints/<workspaceId>.json` (en fazla 200 kayıt; eskiler
düşer):

```ts
interface Checkpoint {
  id: string;
  workspaceId: string;
  tree: string;             // git write-tree sonucu (40 hex)
  createdAt: number;
  reason: "prompt" | "dispatch" | "manual" | "beforeRestore";
  paneId: string | null;    // hangi ajanın istemi/ataması
  agentName: string | null; // o anki bölme adı (sonradan değişse de kayıt tarihî)
  subtaskId: string | null; // panodan geldiyse
  label: string;            // istemin ilk 80 karakteri ya da elle verilen ad
  reviewed: "pending" | "accepted" | "reverted";
}
```

İstem metni yalnız ilk 80 karakter olarak saklanır; günlüğe yazılmaz.

## 4. Görüntü ne zaman alınır

1. **Pano dağıtımı** (spec Görev Panosu §5): alt görev ajana yazılmadan hemen önce
   (`reason: "dispatch"`, `subtaskId`).
2. **Kullanıcı bir ajan bölmesinde istem gönderince** (Enter ile tamamlanan satır,
   Ajan Alanı'nın `InputLineBuffer`'ı): `reason: "prompt"`. Aynı ajan için 30 sn içinde
   ikinci görüntü alınmaz (sohbet gibi art arda kısa mesajlar kuyruğu doldurmasın).
3. **Elle**: görünümdeki "Geri alma noktası oluştur" (`reason: "manual"`).
4. **Geri almadan hemen önce** (`reason: "beforeRestore"`).

Görüntü alma ana süreçte, ajanın terminalini bekletmeden (asenkron) yapılır; başarısız
olursa (depo değil, git hatası, kilitli index) istem yine gider, görünümde kısa bir uyarı
satırı çıkar. Görüntü alma süre sınırı 20 sn.

## 5. Ekran: "Değişiklikler" görünümü

Ajanlar ekranındaki geçiş dörde çıkar: **Bölmeler | Pano | Ofis | Değişiklikler**.

- **Sol**: kayıt listesi (yeniden eskiye). Her satır: zaman, ajan rengi+adı, etiket, dosya
  sayısı (+/−), inceleme durumu. Üstte **Canlı** satırı: son görüntüden bu yana çalışma
  ağacındaki değişiklik (`git diff <tree>` ile working tree; görünüm açıkken 3 sn'de bir,
  değilse hiç).
- **Sağ**: seçili kaydın değişiklikleri: bu görüntüden **bir sonraki görüntüye** kadar
  (en sonuncusunda: çalışma ağacına kadar). Dosya listesi + birleşik diff (satır
  numaralı, eklenen/silinen satırlar mevcut `--status-success-*` / `--status-danger-*`
  tonlarıyla, yeni renk yok). İkili dosya ve 200 KB üstü dosya: yalnız "ikili/büyük dosya
  değişti" satırı.
- Düğmeler: **Kabul et** (yalnız işaret; dosyaya dokunmaz) · **Geri al** · **Terminale git**.
- Pano ayrıntı panelinde alt görevin satırında "Değişiklikler" bağlantısı → bu görünüm,
  ilgili kayıt seçili.
- Kenar çubuğu: inceleme bekleyen kayıt sayısı yok (fazla UI); yalnız görünüm içinde
  "N bekliyor" başlığı.

## 6. Geri al

"Geri al" seçili kaydın **bu kayıttan sonraki değişikliklerini** (o kaydın aralığındaki
dosyalar) kaydın görüntüsündeki hâline döndürür:

1. Onay penceresi (alertdialog): etkilenecek dosya listesi; "Bu dosyalardaki sonraki
   değişiklikler de geri alınır" uyarısı (aralık sonraki kayıtlarla çakışıyorsa o kayıtlar
   adıyla listelenir).
2. Önce `beforeRestore` görüntüsü alınır (başarısızsa geri alma YAPILMAZ).
3. Aralıktaki her dosya için: görüntüde varsa `git checkout <tree> -- <yol>` eşdeğeri
   (geçici index ile, kullanıcının index'ine dokunmadan: `git --work-tree . read-tree` +
   `checkout-index` ya da `git show <tree>:<yol>` ile yazma); görüntüde yoksa (sonradan
   eklenmiş) dosya **çöp kutusuna** taşınır (Electron `shell.trashItem`), kalıcı silinmez.
4. Yollar alan kökünün içinde mi diye doğrulanır (`..`, mutlak yol, sembolik bağ dışarı
   çıkışı reddedilir).
5. Kayıt `reverted` olur; `beforeRestore` kaydı listede görünür ve kendi "Geri al"ı ile
   geri alma geri alınabilir.
6. O sırada aralıktaki dosyalardan birine yazan bir ajan çalışıyorsa (kayıtlı ajan
   `running`) onay penceresi bunu ayrıca söyler.

## 7. Güvenlik ve sağlamlık

- Git her zaman `execFile` ile sabit argümanlarla, kabuksuz çalışır; çalışma klasörü alan
  kökü. Renderer'dan gelen kimlikler (workspaceId deseni + kayıtlı alan, checkpoint id,
  dosya yolu = yalnız o kaydın diff listesinden seçilmiş yol) ana süreçte doğrulanır;
  renderer serbest yol gönderemez.
- `git` çıktısı boyut sınırlı (diff toplamı 2 MB; aşılırsa dosya bazında kırpılıp
  "kırpıldı" notu).
- Aynı alanda eşzamanlı iki git işlemi sıraya alınır (index.lock çakışması olmasın);
  kullanıcının kendi git işlemi index.lock tutuyorsa görüntü alma 3 kez kısa aralıkla
  dener, sonra uyarıyla vazgeçer.
- Günlük: `degisiklik.goruntu` (sebep, süre ms, sonuç), `degisiklik.geriAl` (dosya sayısı,
  sonuç). Dosya yolu, içerik ya da istem günlüğe yazılmaz.

## 8. Hata durumları

| Durum | Davranış |
|---|---|
| Git deposu değil / git yok | Görünümde açık mesaj; görüntü alınmaz; istem ve pano etkilenmez |
| Ağaç nesnesi silinmiş (gc) | Kayıt "süresi doldu", diff ve Geri al kapalı |
| Görüntü alma hatası | İstem yine gider; görünümde uyarı satırı |
| Geri almada bir dosya yazılamadı | İşlem durur, o ana kadar yazılanlar listelenir, `beforeRestore` ile geri dönülebilir |
| Kayıt dosyası bozuk | `.bozuk-<zaman>` olarak kenara alınır, boş liste + uyarı (Görev Panosu deposu kalıbı) |

## 9. Test

- Saf: aralık hesabı (kayıt → sonraki kayıt), yol doğrulama, diff ayrıştırma ve kırpma,
  30 sn sınırlaması, kayıt sınırı (200).
- Git katmanı: geçici klasörde gerçek bir test deposu (vitest'te `git` varsa; yoksa test
  atlanır ve sebebi yazılır) — görüntü alma, diff, geri alma, eklenen dosyanın çöpe
  taşınması (taşıma enjekte), kullanıcının index/HEAD'inin değişmediği.
- Bileşen: liste, diff görünümü, Kabul et, Geri al onayı, depo değil mesajı, i18n tr/en.
- Elle: bir axet-code ajanına dosya değiştirt → Canlı satırında görünür → tur sonunda
  kayıt → Geri al → dosyalar eski hâl, eklenen dosya çöpte → beforeRestore'un Geri al'ı ile
  geri gelir; `git status`/`git log` kullanıcı açısından değişmemiş.

## 10. Kapsam dışı

SAP nesne değişikliği (SAP yazma geçmişi ayrı), satır bazında kısmi geri alma, otomatik
commit, dal/worktree yönetimi, uzak depoya gönderme, git olmayan klasörler için kendi
anlık görüntü sistemi.
