# Ajanlar Ekranı — Yeniden Tasarım (AgentSpace iskeleti + kendi piksel ofisimiz)

Tarih: 2026-10-18 · Dal: `ozellik/ajanlar-yeniden` (`ozellik/ertelenenler` üstüne) · Durum: taslak,
kullanıcı onayı bekliyor.

## 1. Neden

Kullanıcı ilk günden AgentSpace'teki yapıyı istedi; yapılan Ofis ve ekran düzeni bundan uzak kaldı.
Bu belge AgentSpace'in **herkese açık canlı demosunda görünen** iskeleti kendi kodumuzla kurar.
Kod, görsel ya da veri kopyalanmaz; tersine mühendislik yok. Piksel sanatı bizim çizimimiz
(kullanıcı kararı: LimeZu paketi kullanılmıyor).

Var olan özelliklerin hepsi kalır (Görev Panosu, Değişiklikler, Tarayıcı, Kalıcı bellek, Kararlar,
terminal bölmeleri); yalnız yerleri değişir. Yeni arka uç özelliği yok.

## 2. İskelet

```
┌─ Üst: ekip sekmeleri  [Satış 3] [Destek 2] [+ Ekip]                ─────────────┐
├─ Sol: Akış (kenar çubuğu yuvası) ─┬─ Orta: sekmeler ─────────────────────────────┤
│ SAP bağlamı (küçük satır)         │ Ofis | Terminal | Görevler | Değişiklikler |  │
│ olaylar: başladı/bitti/soru/rapor │ Tarayıcı                                      │
│ soru kartları (cevap düğmeleri)   │                                               │
│ ─────────────────────────────     │  (seçili sekmenin içeriği)                     │
│ [@ajan] mesaj kutusu      [Gönder]│                                               │
└───────────────────────────────────┴───────────────────────────────────────────────┘
```

- **Ekip = alan (workspace).** Üstteki sekmeler bugünkü alan listesinin yerini alır: ad + ajan sayısı,
  sağ tık/… menüsünde yeniden adlandır/kapat, sonda **+ Ekip**. Seçim alan başına hatırlanan görünüm
  kaydıyla aynı kalır.
- **Sol sütun = Akış.** Uygulamanın Ajanlar modundaki kenar çubuğu yuvasına oturur (bugünkü
  `TerminalSidebar` yerine). İçerik, yeni bir arka uç olmadan var olan olaylardan kurulur:
  ajan durum değişimleri (izleyici), pano alt görev başladı/bitti/doğrulandı, Kararlar'daki sorular
  (cevap düğmeleriyle — `DecisionsPanel` buraya taşınır, sağdaki panel kalkar), Değişiklikler kaydı
  geldi. En yeni altta, bellek içi en çok 200 olay (oturumluk; kalıcı kayıt yok).
- **Mesaj kutusu:** `@` ile ajan seçilir (liste: alandaki ajanlar); Enter → seçili ajana Görev
  Panosu'nun gönderme yoluyla tek satır istem (meşgulse sebep yazılır, kendiliğinden yeniden
  denenmez). Ajan seçilmeden Enter: kutu "Bir ajan seç (@)" der. Lidere hedef verme Görevler
  sekmesinde kalır.
- **Orta sekmeler:** Ofis (varsayılan) | Terminal (bugünkü bölme düzeni) | Görevler (pano) |
  Değişiklikler | Tarayıcı. Bugünkü radyo geçişi bu sekmelere dönüşür; görünüm kaydı aynı alan
  (`panes`→Terminal, `board`→Görevler, `office`, `changes`, `browser`). Eski kayıtlar bozulmaz.
- Ajan ekle / kabuk ekle düğmeleri orta sekme şeridinin sağında; bellek ve rol bilgisi ofiste ve
  terminal başlığında.

## 2a. Sohbet bu ekranın parçası (kullanıcı kararı 2026-10-18)

- Orta sekme şeridinin başında **Sohbet** sekmesi: bugünkü Sohbet ekranı (`AxetCodeHome`) olduğu
  gibi burada görünür. Bileşen bugünkü gibi uygulama ömrü boyunca takılı kalır (akan cevap, taslak
  kaybolmaz); yalnız görünürlüğü bu sekmeye bağlanır.
- Sohbet sekmesindeyken sol sütun Sohbet'in kendi oturum listesidir (`ChatSidebar`); diğer
  sekmelerde Akış. Üst şerit (ekip sekmeleri + orta sekmeler) iki durumda da aynıdır.
- Uygulamanın sol menüsündeki "Sohbet" ve "Ajanlar" düğmeleri aynı ekrana açılır (Sohbet → Sohbet
  sekmesi, Ajanlar → son seçilen ajan sekmesi); ayrı ekran kalmaz.
- Terminal sekmesi bugünkü bölme düzenidir (kullanıcı: "terminal kısmı harici" — değişmiyor).

## 2b. AgentSpace'ten taşınanlar (demoda görünen 14 aşamaya karşılık)

| AgentSpace | Bizde |
|---|---|
| Build a team (şablonla ekip) | **Ekip şablonları**: "+ Ekip" → boş ya da hazır şablon (SAP geliştirme: lider + geliştirici + test; Analiz: lider + analist; Destek: tek ajan). Şablon yalnız ajan bölmeleri açar (motor axet-code, rol hazır). |
| Add a person | Ajan ekle (var) |
| Tell Agent X | Akış'taki `@ajan` mesaj kutusu |
| The beam / lead hands out work | Pano dağıtımında ofiste liderden ajana kısa bir ışın animasyonu (hareketi azaltta yok) |
| The office at work | Piksel ofis (§3) |
| Chat + decisions | Akış + soru kartları (§2) |
| Tasks | Görevler sekmesi (pano) |
| Code | Değişiklikler sekmesi |
| Browser test | Tarayıcı sekmesi |
| Memory | Kalıcı bellek (var; ajan satırında) |
| Results / Reports | **Raporlar**: Görevler sekmesinde biten alt görevlerin özeti + doğrulama sonucu listesi (yeni veri yok, panodan) |
| Visual report, Fix a design, integrations, mobil, ses | kapsam dışı |

## 3. Piksel ofis

- Tek bir `<canvas>`; 16×16 piksellik karolar, tam sayı ölçek (2×–4×, alana sığan en büyük),
  `image-rendering: pixelated`. Çizim verisi TypeScript'te küçük piksel matrisleri + palet
  (dosya varlığı yok, lisans derdi yok). Tema renkleri mevcut değişkenlerden; lime yalnız seçim.
- Kat planı: ahşap zemin, üst duvar (pencere, pano, saat), masa sıraları (masa + monitör + sandalye),
  orta halı/toplantı masası, köşelerde bitki, kahve köşesi. Masa sayısı ajan sayısına göre büyür
  (satır başına 4–6 masa; 12'yi aşınca ikinci oda/kat altta).
- Karakter: 16×24 piksel, 4 saç × 6 gömlek rengi (gömlek = ajanın bölme rengi), oturur poz.
  Durumlar (mevcut `officeSeat` eşlemesi korunur):
  - çalışıyor (kesin): 2 kare yazma animasyonu (≈4 fps), monitör yanar;
  - tahmini çalışıyor: aynı poz, animasyon yok;
  - soru: başın üstünde sarı "?" balonu; tıklanınca Akış'taki soru kartına kayar;
  - hata: kırmızı "!"; boşta/bitti: arkaya yaslanır, monitör söner; motor yok: boş masa.
- Masanın üstünde ad etiketi (piksel yazı değil, keskin HTML katmanı) + küçük durum çipi; panodan
  alt görev varsa başlığı (≤ 40 karakter, üstüne gelince tamamı).
- Tıklama/Enter: Terminal sekmesine geçer, o ajanın bölmesi öne gelir. Klavye: ajanlar Tab ile
  gezilir (görünmez odak düğmeleri canvas'ın üstünde), odak halkası lime.
- Hareketi azalt açıksa animasyon yok. Görünmezken (başka sekme) çizim döngüsü durur.

## 4. Kapsam dışı

Ajanın odalar arası yürümesi, sürükle-bırak yerleşim, çok katlı bina, mobil, sesli komut, Raporlar
sekmesi (sonraki iş), kalıcı akış geçmişi.

## 5. Yürütme (jeton tasarrufu)

İki parça: **A) iskelet** (ekip sekmeleri, Akış + mesaj kutusu, orta sekmeler, Kararlar'ın taşınması),
**B) piksel ofis**. Her parça kısa bir planla, kontrolcü tarafından doğrudan (alt ajan yok) TDD ile
yazılır; parça sonunda tek bir bütün inceleme. Her parçanın sonunda kullanıcı uygulamada görür.

## 6. Test

Saf: akış olay üretimi ve sınırı, `@` ayrıştırma, ofis yerleşimi (masa sayısı → ızgara), piksel
matrislerinin boyut/palet tutarlılığı. Bileşen: sekmeler, akış kartları ve cevap, mesaj kutusu
gönderme/sebep, ofis tıklama → Terminal, klavye gezinme, hareketi azalt. i18n tr/en. Elle: canlı.
