# Görev Panosu ve Lider — Tasarım

Tarih: 2026-10-18 · Dal: `ozellik/gorev-panosu` (`ozellik/ajan-alani` üstüne) · Durum: kullanıcı onayı bekliyor

## 1. Amaç ve kapsam

Ajanlar ekranına (spec 2026-10-17 ajan-alani) bir **görev panosu** eklenir. Kullanıcı
bir hedef yazar ("ödeme modülüne iade akışı ekle"); **lider** hedefi alt görevlere
böler; kullanıcı taslağı onaylar; NTT Studio alt görevleri alandaki ajanların
terminallerine dağıtır; her alt görev **kanıtla** (alanın doğrulama komutları yeşil)
kapanır.

İlke: **bölmeyi yapay zekâ yapar, gerisini kod yapar.** Dağıtım, durum ve kanıt
deterministiktir; ajanın "bitti" demesi hiçbir kartı kapatmaz. Bu, öncelik sıramızdaki
"yanlış bilgi" maddesinin karşılığıdır.

SAP'ye bağlı değildir: herhangi bir klasörde, Git deposunda ya da SAP proje
klasöründe çalışır.

**Seçilen yaklaşım (B):** lider başsız `axet-code run` ile çalışır ve yalnız plan
üretir (katı JSON). Elenenler:
- (A) lider bir ajan bölmesi olarak pano dosyasına yazar — dosyayı doğru yazacağına
  güvenmek gerekir; yazmazsa pano yanlış bilgi gösterir.
- (C) axet-code `team.json` devretmesi — alt ajanlar bölmelerde görünmez, Kararlar'a
  düşmez, Claude/Codex ile çalışmaz.

## 2. Veri modeli

Pano alan (workspace) başınadır; uygulamanın veri klasöründe
`boards/<workspaceId>.json` olarak saklanır. Proje klasörüne ya da depoya dosya
yazılmaz. Alan silinince panosu da silinir.

```ts
type TaskState = "draft" | "awaitingApproval" | "running" | "done" | "stuck";
type SubtaskState = "waiting" | "ready" | "running" | "asking" | "verifying" | "done" | "failed";

interface BoardTask {
  id: string;
  title: string;            // ≤ 80
  goal: string;             // kullanıcının yazdığı hedef, ≤ 2000
  state: TaskState;
  createdAt: number;
  subtasks: Subtask[];      // ≤ 8
  leadError?: string;       // lider başarısızsa açık mesaj
  leadRaw?: string;         // lider cevabı (≤ 8 KB), yalnız hata ayıklama için katlı
}

interface Subtask {
  id: string;
  title: string;            // ≤ 80
  prompt: string;           // ajana gidecek istem, ≤ 4000, tek satıra indirilir
  roleHint: string;         // ≤ 40, boş olabilir
  dependsOn: string[];      // aynı görevdeki alt görev id'leri
  state: SubtaskState;
  paneId: string | null;    // atanan ajan
  note?: string;            // "ajan kapandı", "yeniden başlatıldı", "süre aşıldı" …
  proof?: Proof;
  attempts: number;         // ajana kaç kez gönderildi
  held?: boolean;           // true iken dağıtıcı atlar (ajan kapandı / yeniden başlatma)
}

interface Proof {
  kind: "commands" | "manual";
  commands: { command: string; exitCode: number | null; durationMs: number; tail: string }[];
  ok: boolean;              // manual için her zaman true; yeşil gibi gösterilmez
  at: number;
}
```

Alanın doğrulama komutları `TerminalWorkspace.verify?: string[]` alanına (en fazla 5
satır, her biri ≤ 300) eklenir; mevcut kayıtlı düzen bu alan olmadan da açılır.

Görev durumu alt görevlerden türetilir: hepsi `done` → `done`; biri `failed` ya da
lider hatası → `stuck`; biri `running/asking/verifying` → `running`.

## 3. Lider (planlama)

- "+ Görev" → başlık + hedef. **Böl** düğmesi lideri çalıştırır; kullanıcı lideri
  atlayıp alt görevleri elle de girebilir.
- Lider: alan kökünde (`root`, yoksa ajanların varsayılan klasörü) başsız
  `axet-code run` (mevcut köprünün `buildRunArgs`'ı; en düşük axet-code 1.4).
  Sohbet oturumu açmaz; her planlama yeni bir oturum.
- İstem: hedef + kurallar: "Dosya DEĞİŞTİRME, yalnız oku ve planla. Cevabın yalnız
  şu JSON olsun: `{"subtasks":[{"title","prompt","role","dependsOn":[indeks]}]}`,
  en fazla 8 alt görev, her istem tek başına anlaşılır olsun." Alandaki ajanların
  rolleri istemde listelenir (rol ipucu buradan seçilsin diye).
- Ayrıştırma: cevaptaki ilk JSON nesnesi (```json bloğu dahil) alınır; şema
  doğrulanır: dizi 1–8, alanlar ve sınırlar, `dependsOn` geçerli indeks, döngü yok.
  Geçmezse görev `stuck`, `leadError` açık mesaj, `leadRaw` katlı alanda.
- Süre sınırı 3 dk; aşılırsa süreç ağacı kapatılır, "Yeniden dene".
- Lider bir Git deposunda çalıştıysa önce/sonra `git status --porcelain` karşılaştırılır;
  fark varsa taslağın üstünde uyarı: "Lider planlarken dosya değiştirdi" (geri alma yok,
  yalnız dürüst bilgi).
- SAP'ye bağlı alanda liderin çalıştığı oturum mevcut SAP yazma onayı/kademe/rol
  kapısından geçer; plan aşamasında yazma beklenmez.

## 4. Taslak ve onay

- Taslakta alt görevler düzenlenir (başlık, istem, rol ipucu, bağımlılık), silinir,
  eklenir, sırası değiştirilir. **Onayla** → bağımlılığı olmayanlar `ready`,
  ötekiler `waiting`. Onaysız hiçbir şey ajana gitmez.
- Modül danışmanı rolündeki kullanıcıda pano görev çalıştırabilir ama SAP'ye
  geliştirme yazamaz (rol kapısı değişmez; ajanın yazma çağrısı yine reddedilir).

## 5. Dağıtım

Saf bir dağıtıcı her durum olayında ve her saniye çalışır. Önce `waiting` alt görevlerden bağımlılıklarının hepsi `done` olanlar `ready` olur; bağımlılığı `failed` olan `waiting` kalır. `ready` bir alt görev için
**uygun ajan**:
1. aynı alanda bir ajan bölmesi (düz kabuk değil),
2. motoru çalışıyor (bölme `exited` değil; genel okuyucuda kabuk istemi görünmüyor),
3. durumu `idle` (kesin) ya da başlangıçtaki "boşta ≈"; `running/asking` değil,
4. başka bir alt göreve atanmamış; alt görev `held` değil,
5. kullanıcı o bölmede yazmıyor (Enter'a basılmamış taslak yok, son girdi
   `TYPING_GUARD_MS`'den eski),
6. rol ipucu doluysa önce rolü eşleşen ajanlar (büyük/küçük harf duyarsız); eşleşen
   yoksa herhangi bir uygun ajan.

Seçilen ajana istem yazılır: satır sonları boşluğa indirilir, sonra `\r`. Alt görev
`running`, `paneId` dolar, `attempts++`. Uygun ajan yoksa alt görev `ready`
kalır; kartta "Uygun ajan bekleniyor". **Ajana ver** ile kullanıcı elle atar (aynı
2–5 koşulları; 6 atlanır).

**Güvenlik kuralı:** motor çalışmıyorsa (kabuk istemi ekranda) istem asla yazılmaz.
Yapay zekânın ürettiği metin hiçbir koşulda cmd/PowerShell komutu olarak
çalıştırılamaz.

Aynı klasörde birden çok alt görev aynı anda çalışabilir; kartta "aynı klasörde
paralel çalışıyor" uyarısı. Worktree yalıtımı kapsam dışı.

## 6. Bitiş ve kanıt

- Atanan ajanın durumu `running` → `idle`/`finished` (kaynak **kesin**) olunca alt
  görev `verifying`. Ajan soru sorarsa `asking`; cevaplanınca `running`'e döner.
- Kaynak **tahmini** ise (Claude, Codex, Gemini, özel) kendiliğinden geçiş yok; kartta
  **Doğrula** düğmesi (her zaman da basılabilir).
- Doğrulama: alanın `verify` komutları ana süreçte, alan kökünde, terminalden
  bağımsız gizli bir çocuk süreçte (`shell: true`, kullanıcının kendi yazdığı komut),
  sırayla, ilk kırmızıda durarak çalışır. Komut başına süre sınırı 10 dk; aşılırsa
  süreç ağacı kapatılır. Çıktının son 40 satırı (≤ 8 KB) kanıta yazılır.
  - Hepsi 0 → `done`. Biri ≠ 0 ya da süre aşıldı → `failed`.
  - `failed` kartta: **Düzeltmeye geri gönder** → aynı ajana "Doğrulama başarısız:
    <komut> çıktısının sonu: …  Düzelt." istemi (dağıtımdaki koşullarla).
    Kendiliğinden geri gönderme yok (otopilot S3).
- `verify` boşsa (SAP alanları dahil) kartta yalnız **Onayla**: kanıt `manual`,
  kartta "elle onaylandı" — yeşil onay işaretiyle gösterilmez.
- Doğrulama komutları yalnız kullanıcının Ayarlar'da yazdığı metindir; liderden ya
  da ajandan gelen metin doğrulama komutu olamaz.

## 7. Hata durumları

| Durum | Davranış |
|---|---|
| axet-code yok / 1.4 altı / bozuk | Böl çalışmaz; Doktor mesajıyla açık hata; elle alt görev ekleme açık |
| Lider cevabı JSON değil, > 8 alt görev, döngü, geçersiz bağımlılık | Taslak oluşmaz, `stuck` + açık mesaj + katlı ham cevap; Yeniden dene / elle ekle |
| Lider 3 dk'da bitmedi | Süreç ağacı kapatılır, Yeniden dene |
| Atanmış ajanın bölmesi kapandı / motor çıktı / çöktü | Alt görev `ready`, `paneId` boşalır, `held: true`, not "ajan kapandı"; dağıtıcı `held` alt görevi atlar, kullanıcı **Yeniden sıraya al** deyince `held` kalkar |
| Ajan soru soruyor | `asking`; Kararlar'dan cevaplanınca `running` |
| Kullanıcı ajanın terminaline yazıyor | Dağıtım bekler |
| Doğrulama komutu 10 dk'yı aştı | Ağaç kapatılır, `failed`, not "süre aşıldı" |
| Doğrulama komutu başlatılamadı (yok, izin) | `failed`, çıkış kodu `null`, hata metni kanıtta |
| Uygulama kapanıp açıldı | Pano diskten gelir; `running/asking/verifying` → `ready` + `held: true` + not "uygulama yeniden başlatıldı"; kendiliğinden gönderme yok |
| Pano dosyası okunamıyor/bozuk | Bozuk dosya `.bozuk-<zaman>` olarak kenara alınır, boş pano + açık uyarı; veri sessizce silinmez |
| Alan silindi | Panosu silinir (alan silme onayı mevcut) |

## 8. Ekran

- Ajanlar ekranının üstünde **Bölmeler | Pano** geçişi (alan başına son seçim hatırlanır).
- **Pano**: Taslak · Sırada · Çalışıyor · Doğrulama · Bitti. Ana görev kartı ilerlemesiyle;
  alt görevler kendi sütunlarında, ana görevin rengiyle gruplanmış küçük kartlar.
  `stuck/failed` kartlar sütunlarında `--status-danger-*` etiketiyle. Yeni renk yok;
  lime yalnız seçili kart.
- **Ayrıntı paneli** (sağda): hedef, alt görev listesi (istem, rol ipucu, bağımlılık,
  ajan seçici), kanıt (komut, çıkış kodu, süre, çıktının sonu, katlanır), düğmeler:
  Böl · Onayla · Ajana ver · Terminale git · Doğrula · Düzeltmeye geri gönder ·
  Yeniden sıraya al · Sil.
- **Ekip şeridi**: görevli ajanın kartında alt görev başlığı küçük satır.
- **Kenar çubuğu**: alanda `failed` alt görev varsa rozet.
- **Alan sağ tık menüsü**: "Doğrulama komutları…" (satır başına bir komut).
- **Bildirim** (pencere arka plandayken, mevcut anahtar): "Görev bitti", "Alt görev başarısız".
- Erişilebilirlik: sütunlar `role="list"`, kartlar düğme, panel `aria-label`, durum
  değişiklikleri `aria-live="polite"` tek satır.

## 9. Günlük

`pano.lider` (süre, alt görev sayısı, sonuç), `pano.dagitim` (alt görev id, pane id),
`pano.dogrulama` (komut indeksi, çıkış kodu, süre). Hedef, istem ve komut çıktısı
günlüğe yazılmaz.

## 10. Test

- Saf: plan ayrıştırıcı (bozuk JSON, kod bloğu, > 8, döngü, geçersiz indeks, sınırlar),
  dağıtıcı (uygunluk koşulları 1–6, bağımlılık, motor kapalıyken yazmama, yazma
  koruması, rol eşleşmesi), durum geçişleri ve görev durumu türetme, yeniden
  başlatmada geri yükleme, bozuk pano dosyası.
- Doğrulama çalıştırıcısı: enjekte sahte süreçle yeşil/kırmızı, ilk kırmızıda durma,
  süre aşımı ve ağaç kapatma, çıktı kırpma.
- Lider: enjekte sahte `run` ile başarı, JSON dışı cevap, süre aşımı, git status farkı.
- Bileşen: pano sütunları, taslak düzenleme, ayrıntı paneli düğmeleri, i18n tr/en.
- Elle: bir hedefi böl → onayla → iki ajana dağıt → birini kırmızı doğrulamayla
  düzeltmeye geri gönder → yeşil → görev bitti bildirimi.

## 11. Kapsam dışı (sonraki alt projeler)

Otopilot (sıradakini kendiliğinden başlatma, kırmızıda kendiliğinden geri gönderme) ·
ofis görünümü · Git worktree yalıtımı · SAP kanıtı (ATC/syntax check) · "başka ajana
ver" kuyruk taşıma · görev geçmişi/rapor dışa aktarma · mobil, ses.

## 12. Değişmeyenler

SAP yazma onayı, QA/PRD salt okunur, rol kapısı ("modül danışmanları asla geliştirme
yapamasınlar"), axet-code `-y`, Ajan Alanı'nın istem→oturum eşlemesi ve Kararlar.
