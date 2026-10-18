# Ofis Görünümü — Tasarım

Tarih: 2026-10-18 · Dal: `ozellik/ofis-gorunumu` (`ozellik/gorev-panosu` üstüne) · Durum: kullanıcının
2026-10-18 gece verdiği "onay isteme, devam et" yetkisiyle yazıldı (tasarım/plan onayı atlandı;
birleştirme/push yine onaya bağlı).

## 1. Amaç

Ajanlar ekranına, ekibi tek bakışta gösteren üçüncü bir görünüm: **Bölmeler | Pano | Ofis**.
Her ajan bir masada oturan bir karakterdir; kim çalışıyor, kim soru soruyor, kim boşta,
kim hata verdi — renk ve küçük hareketle görülür. Karaktere tıklamak o ajanın terminalini
öne getirir. Yeni bilgi üretmez: Ajan Alanı'nın durum verisini (kesin/tahmini) ve Görev
Panosu'nun atama verisini başka bir biçimde gösterir.

İlke: **daha fazla UI değil, daha güçlü hiyerarşi.** Ofis süs değil, durum özetidir:
- tahmini durum kesin gibi gösterilmez (≈ işareti, hareket yok),
- yanlış bilgi yerine "bilinmiyor" gösterilir,
- hareket kullanıcı "hareketi azalt" tercihini açtıysa durur.

AgentSpace benzeri ürünlerin piksel-art çizimleri **kopyalanmaz**; karakterler kendi
basit geometrik SVG çizimimizdir (baş + gövde + masa + ekran), bölme rengini taşır.

## 2. Görünüm ve veri

- `TerminalWorkspace.view` (ve `SavedTerminalWorkspace.view`) `"board"`'a ek olarak
  `"office"` değerini alır; yoksa Bölmeler. Mevcut kayıtlar aynen açılır; bilinmeyen
  değer atılır.
- Ekip şeridindeki geçiş üç seçenekli olur (radiogroup). Ofis'teyken bölmeler Pano'daki
  gibi **gizlenir, sökülmez** (terminal oturumları korunur).
- Veri kaynakları: `useAgentStatuses()` (durum, kaynak, soru), `useBoards()` (alt görev
  başlığı: `activeSubtaskOf`), alanın ajan bölmeleri (`agentPanes`). Yeni IPC yok.

## 3. Yerleşim

- Saf fonksiyon `officeLayout(count)`: en fazla 9 ajan (alan sınırı) için masa konumları;
  1–3 ajan tek sıra, 4–6 iki sıra, 7–9 üç sıra; ızgara hücreleri eşit, ortalanmış.
- Düz kabuk bölmeleri ofiste görünmez (ajan değiller); alt köşede "N terminal" küçük notu.
- Ajan yoksa boş durum: "Ofiste kimse yok" + **Ajan** düğmesi (mevcut "+ Ajan" penceresi).

## 4. Karakter

| Durum (kaynak) | Görünüm |
|---|---|
| running (kesin) | ekran parlıyor, eller yazıyor (küçük döngü) |
| running (tahmini) | aynı poz, hareket yok, ≈ |
| asking (kesin) | başın üstünde "?" balonu (`--status-warning-*`), soru metninin ilk 60 karakteri balonda |
| idle / finished | arkasına yaslanmış, ekran sönük; "Boşta 3 dk" |
| error | ekranda `--status-danger-*` işareti |
| unknown / kayıt yok | soluk karakter, "bilinmiyor" |
| motor kurulu değil | masa boş, "Kurulu değil" etiketi |

- Karakterin rengi bölme rengi (`PANE_COLOR_VAR`); seçili/odaktaki ajan lime çerçeve.
- Masanın altında ad · rol · motor; görevliyse alt görev başlığı (≤ 40, title tam metin).
- Hareket CSS animasyonu; `prefers-reduced-motion: reduce` ise hiç hareket yok.
- Yeni renk yok: tonlar `--status-*` ve bölme renklerinden.

## 5. Etkileşim

- Karaktere tıklama / Enter / Space → görünüm Bölmeler'e döner, bölme öne gelir
  (`revealPane`); küçültülmüşse geri açılır.
- Soru balonuna tıklama → aynı şekilde terminale gider (Kararlar paneli ayrıca açık kalır).
- Klavye: karakterler ızgarada sırayla odaklanır (tab sırası), görünür odak halkası;
  her karakter `aria-label`: "Ad, rol, durum (tahmini)".
- Ofis görünümünde de sağdaki Kararlar paneli yerinde kalır.

## 6. Hata durumları

- Durum verisi yok (izleyici henüz göndermedi) → "bilinmiyor" (soluk), hata değil.
- Pano yok (kayıtsız alan) → yalnız ajan durumları, alt görev satırı yok.
- Pencere küçük → ızgara küçülür, ad/rol kırpılır (title tam metin); taşma yok.

## 7. Test

- Saf: `officeLayout` (0–9, sınır), durum→karakter pozu eşlemesi (kesin/tahmini ayrımı,
  bilinmiyor), metin kırpma.
- Bileşen: üç seçenekli geçiş; ofiste bölmeler gizli ama takılı; karakter tıklaması
  `revealPane` + görünüm Bölmeler; tahmini durumda hareket sınıfı yok; soru balonu yalnız
  kesin asking'te metin gösterir; reduced-motion; boş durum; i18n tr/en.
- Elle: iki axet-code ajanı + bir Claude ajanı; birine soru sordur → balon; birini kapat →
  soluk/boşta; karaktere tıkla → terminal.

## 8. Kapsam dışı

Sürükleyerek masa yerleştirme, karakter özelleştirme, ses, mola/kahve animasyonları,
ofisler arası (alanlar arası) tek görünüm, lider karakteri (lider başsız çalışır; Pano'daki
"Planlanıyor" göstergesi yeterli).
