# Sohbet ekranı — tasarım (alt proje 2, ekran 1)

Tarih: 2026-09-29 · Dal: `tasarim/grafit` · Onaylanan taslak: görsel yardımcıda
`sohbet-taslak.html` (kullanıcı: "devamke"), üst şerit için seçenek **A**.

## Amaç

Sohbet ekranının düzeni, düğmeleri ve konuşmanın yapısı vibe'ın sadeliğine
yaklaşsın, ama ölçü ve renkler Grafit'in kalsın. Vibe'dan yalnızca YAPI
alınıyor (araçların gruplanması, sade cevap satırı, yazma kutusunun altında
ayrı araç çubuğu). Vibe'ın hiçbir rengi, boşluğu ya da sınıf dizisi
kopyalanmıyor.

Başarı ölçütü: dolu bir konuşmada göz cevap metnine gidiyor. Araç dökümleri,
düğmeler ve durum satırları tek satıra iniyor ve istenince açılıyor. Hangi
sisteme yazıldığı, yazma kutusuna bakarken görülüyor.

## Kapsam

İlk sekiz madde onaylı taslaktaki numaralarla aynı.

1. **Araç satırı (kapalı).** Bir cevabın araç adımları tek satırda duruyor:
   ok (▸/▾), anahtar simgesi, "N araç işlemi", eş aralıklı yazıyla tür özeti
   ("2× Okuma · 1× Düzenleme") ve durum simgesi. Durum simgesi ✓ (hepsi bitti),
   ✕ (en az bir adım `failed`) ya da ◌ (tur sürüyor) oluyor. Satır bitince
   kapalı duruyor.
2. **Cevap düğmeleri.**
   - Yazılı "Yeniden üret" düğmesi (`ChatSessionPane`, `canRegenerate`)
     kalkıyor.
   - **Son** bitmiş cevabın altında kalıcı bir satır var: simge düğmeler
     (Kopyala, Yeniden üret), yanında silik saat.
   - Öteki cevaplarda aynı satır Kopyala ve saati taşıyor ama yalnız üzerine
     gelince görünüyor. Satırın yüksekliği her zaman ayrılı, yani görününce
     liste kaymıyor.
   - Kod bloklarında üst başlık şeridi (dil rozeti) kalkıyor. Kopyala düğmesi
     bloğun sağ üst köşesinde, üzerine gelince ya da klavyeyle odaklanınca
     görünüyor.
3. **Araç satırı (açık).** Kutu yok. Adımlar ince bir sol çizginin arkasında
   alt alta sıralanıyor. Her adımda aracın simgesi, adı, eş aralıklı yazıyla
   hedefi ve durumu var. Ayrıntısı (fark ya da çıktı) olan adıma tıklayınca
   ayrıntı hemen altında açılıyor. Birden fazla adımın ayrıntısı aynı anda
   açık kalabiliyor (bugünkü küme davranışı). Adım listesi en fazla 320px
   yükseklikte, fazlası kendi içinde kayıyor; adım ayrıntısı da bugünkü gibi
   sınırlı yükseklikte.
4. **Düşünüyor göstergesi.** Artık yapışık (`sticky top-0`) ve renk geçişli
   sarmalayıcı yok. Gösterge konuşmanın sonunda sade tek satır: nefes alan
   nokta, aşama metni, adım sayısı ve geçen saniye. `stalled` aşamasında
   dakika yazılıyor. Tur sürerken canlı araçlar bu satırın hemen üstünde,
   1. maddedeki araç satırıyla gösteriliyor, durumu ◌. Bugünkü göstergenin
   kendi araç satırı böylece bu bileşene devrediliyor.
5. **Soru/onay kartı** (`AskUserCard`). Konuşmanın sonunda, göstergenin
   altında duruyor. Seçenekler satır satır, serbest metin ve çoklu seçim
   bugünkü gibi. Yalnız görünüm sadeleşiyor; sıralama ve dizin mantığına
   dokunulmuyor.
6. **Plan (yapılacaklar)** (`PlanPanel`). Sistem sekmesinin hemen üstünde,
   çerçevesiz tek satır: "Plan 2/4 · o anki madde ▸". Tıklayınca liste
   açılıyor.
7. **Sistem sekmesi** (seçenek A). Bağlam şeridi (`contextPath &&` bloğu)
   tamamen kalkıyor; yerine yazma kutusunun sol üst köşesine yapışık küçük bir
   sekme geliyor. Sekmenin içeriği, soldan sağa:
   - **Seviye rozeti** (`TierBadge`), yalnız seviye biliniyorsa (aşağıya bak).
   - **Sistem adı**: `contextLabel`, yoksa "Çalışma alanı".
   - **Klasör adı**: yolun son parçası, silik eş aralıklı yazıyla. Yolun
     tamamı üzerine gelince araç ipucunda görünüyor.
   - **Dosyalar** ve **Talimatlar** düğmeleri. Simgeler renkli, yazı nötr.
     Dosyalar açıkken bugünkü vurgu korunuyor.
8. **Yazma kutusu.**
   - Yazı alanı 3 satır yüksekliğinde başlıyor ve bugünkü üst sınıra
     (`max-h-52`) kadar büyüyor.
   - Altında ayrı bir araç çubuğu var: solda ＋ (dosya ekle), sağda model
     seçici, bağlam doluluğu halkası ve gönder/durdur.
   - Kutunun altındaki uyarı yazısı (`axetCodeHome.disclaimer`) kalkıyor.
   - Bağlam doluluğu metin olmaktan çıkıp küçük bir halkaya dönüşüyor. Yüzde
     ve jeton sayısı araç ipucunda.

Ayrıca:

- **Kullanıcı balonu.** Balon daha silik bir zemine iniyor (Grafit yüzey
  sırasında bir kademe aşağı). Ekler balonun üstünde kalıyor. Saat, Düzenle
  ve Kopyala mutlak konumlu bir satırda, yalnız üzerine gelince görünüyor;
  görününce satır kaymıyor.
- **Mesaj aralığı.** `--chat-message-gap` 32px'ten 16px'e iniyor. Kullanıcı
  mesajından hemen sonra gelen araç satırı ve cevap ayrı mesaj sayılmıyor,
  aynı cevabın parçası.
- **Boş ekran.** Ortalı düzen, yukarıdan aşağı:
  - logo işareti (`src/assets/logo.svg`);
  - tek başlık ("Bugün ne yapalım?", mevcut `axetCodeHome.heroSubtitle`);
  - düz simgeli kartlar.

  Renk geçişli selamlama (`greeting`) ve "Hızlı başlangıç" etiketi kalkıyor.
  Kart içerikleri (`suggestionKeys`, bağlama göre değişen öneriler) aynen
  kalıyor. Karta tıklamak metni kutuya yazıyor, göndermiyor (bugünkü davranış
  bu). axet-code güncelleme satırı başlığın altında kalıyor.

## Taslaktan bilinçli sapmalar

- **Cevap satırında model adı YOK.** Mesaj hangi modelle üretildiğini
  saklamıyor (`ChatMessage`'da alan yok). Sohbetin o anki modelini yazmak,
  model sonradan değiştiyse yanlış bilgi olur. Satırda yalnız saat var.
  Mesaja model alanı eklemek bu ekranın işi değil.
- **Seviye rozeti her sohbette çıkmayabilir.** Sohbet kaydı seviyeyi
  tutmuyor; yalnız `sapLabel` ve `cwd` var. Rozet, sohbetin `cwd`'si o an
  bağlı sistemin `activeSap.projectDir`'i ile aynıysa `activeSap.tier`'dan
  geliyor. Bağlı olunmayan eski bir SAP sohbetinde rozet çıkmıyor, sistem adı
  yine görünüyor. Yanlış seviyeyi göstermektense hiç göstermemek tercih
  edildi.
- **Canlı araç satırı tur sürerken de kapalı başlıyor.** Taslakta açık
  görünüyordu. Kullanıcı daha önce göstergenin kendiliğinden büyümesini
  yadırgamıştı (bkz. `ThinkingBubble` notları). Kapalıyken özetin sonunda o
  anki adımın hedefi silik yazıyor, yani "şu an ne yapıyor" açmadan da
  okunuyor.

## Yerini alan eski kararlar

Aşağıdaki kararlar kodda yorum olarak duruyor. Bu tasarım, kullanıcının son
onayıyla hepsinin yerini alıyor, o yüzden ilgili yorumlar güncellenmeli.

| Eski karar | Yeni hâli |
|---|---|
| 2026-09-04: düşünüyor göstergesi tepede, yapışık | Konuşmanın sonunda, yapışık değil (madde 4) |
| 2026-09-02: yazma kutusu tek satır, düğmeler aynı satırda | 3 satır, altında ayrı araç çubuğu (madde 8) |
| Bağlam şeridinde klasör yolu yazılı | Sekmede klasör adı yazılı, tam yol araç ipucunda (madde 7) |
| 2026-09-05: cevap saati her cevapta kalıcı | Son cevapta kalıcı, ötekilerde üzerine gelince (madde 2) |

"İkonlar renkli, yazı nötr" (2026-09-06) kararı ve yazma kutusunun üç
kademeli durumu (durgun `line-subtle`, üzerine gelince `line`, odakta vurgu
kenarlık ve `--accent-glow` halesi) aynen kalıyor. Hale gölgeyle çiziliyor,
yükseklik hiçbir durumda değişmiyor.

## Korunacak davranışlar

Bunların hiçbiri değişmiyor. Planın her görevi dokunduğu maddeyi korumak
zorunda.

- Sohbet içi arama (Ctrl+F): önceki/sonraki, sayaç, kapatma, mesaj vurgusu.
  Şerit kalktığı için arama katmanı her zaman `top-2`'de.
- Kullanıcı mesajında Düzenle ve Kopyala. Düzenle sohbeti o mesajdan keser.
  Hemen ardından çıkan geri al şeridi (`editUndo`) kalıyor.
- Yarıda kalmış son cevapta "Devam et" düğmesi. Oturum yenilendi notu
  (`restartedReason`).
- Yeniden üret yalnız son, bitmiş cevapta; tur sürerken yok. Son cevap
  hataysa da bugünkü gibi kalıyor: hata cevabının satırında yalnız Yeniden
  üret var (Kopyala ve saat yok).
- Hata cevabının kırmızı kutusu.
- Aşağı in düğmesi (`!atBottom && !isEmpty`) ve dipteyken otomatik kaydırma.
  Gösterge artık listenin sonunda olduğu için dipteyken görünür kalıyor.
- Takılan iptal uyarısı (`cancelStuck`).
- `@` bahisleri:
  - yazı alanının arkasındaki boyama katmanı, ölçüleri BİREBİR aynı;
  - `pr-[10px]` kaydırma payı ve textarea'nın `block` olması;
  - `MentionMenu` kutunun üstünde açılıyor;
  - menü açıkken ok, Enter, Tab ve Esc menünün.
- Kutu boşken ↑ son mesajı geri çağırıyor. Enter gönderir, Shift+Enter satır
  atlar.
- Ekler: ataç yerine artık ＋ düğmesi. Sürükle-bırak katmanı, yapıştırma,
  kutunun içindeki ek çipleri.
- Gönder düğmesi her zaman çiziliyor: boşken soluk. Tur sürerken yerini
  durdur alıyor. Yalnız ek ile gönderme serbest.
- Model seçici yukarı açılıyor.
- Bağlam doluluğu ölçüm gelmeden hiç çizilmiyor. %60'ta uyarı, %80'de
  tehlike rengi.
- Dosyalar yan paneli (380px).
- `ChatBubble` `memo`'lu: yeni `onRegenerate` de `useCallback`'li ve kararlı
  olmalı. Yalnız son cevaba veriliyor, ötekilere `undefined`.
- Canlı ayrıntının "yapışkan" tercihi (kullanıcı isteği, 2026-09-07). Tur
  sürerken açık araç satırında kullanıcı bir adımın ayrıntısını açtıysa,
  yeni gelen adımın ayrıntısı da açık geliyor.
- Araç etiketleri (`useToolLabel`). MCP araçlarında ön ek yok. `connectors`
  aşaması "Düşünüyor" yazıyor.

## Bileşen düzeni

Tam yeniden yazım yok, adım adım taşıma var (yaklaşım 1). Dosyalar:

- `src/components/ChatToolRun.tsx` (yeni): araç satırı. Kapalı ve açık hâl,
  adım ayrıntısı. Bitmiş cevapta `message.steps`, canlı turda etkinlik
  listesi ile çalışıyor. `StepDetail` buraya taşınıyor. Durum girdisi
  `"running" | "done"`; ✕, adımların `failed` alanından türetiliyor.
- `src/components/ChatComposer.tsx` (yeni): sistem sekmesi, yazı alanı ve
  boyama katmanı, araç çubuğu, `MentionMenu`, `ContextRing`. Taslak ve ek
  durumu bugünkü gibi dışarıdan prop'la geliyor; bileşen durum tutmuyor, bahis
  menüsünün kendi yerel durumu hariç.
- `ChatBubble.tsx`: araç dökümü yerine `ChatToolRun`, yeni cevap satırı,
  silik kullanıcı balonu. `ThinkingBubble` tek satıra iniyor ve kendi araç
  satırını `ChatToolRun`'a bırakıyor.
- `ChatSessionPane.tsx`:
  - bağlam şeridi, yapışık gösterge sarmalayıcısı, yazılı "Yeniden üret" ve
    uyarı satırı kalkıyor;
  - boş ekran yeni düzene geçiyor;
  - composer bloğu `ChatComposer`'a taşınıyor.
- `markdownLite.tsx`: `CodeBlock` başlıksız.
- `AxetCodeHome.tsx`: `ChatSessionPane`'e yeni `contextTier` prop'u
  (`SystemTier | null`), iki çağrı yerinde de.
- `src/index.css`: `--chat-message-gap: 16px`.
- i18n (`tr.ts`, `en.ts`):
  - yeni anahtarlar: araç sayısı, tür özeti, halka araç ipucu, ＋ düğmesi
    başlığı;
  - kullanılmayan anahtarlar siliniyor: `axetCodeHome.disclaimer`,
    `axetCodeHome.quickStart`, `axetCodeHome.regenerate`.
    `axetCodeHome.regenerateTitle` simge düğmesinin başlığı olarak kalıyor.

Yeni npm paketi yok. `text-[Npx]` sayacı (`tests/designScale.test.ts`, üst
sınır 152, şu an 147) aşılmıyor. Mümkünse yeni yazı boyutu yerine mevcut
ölçekten sınıf kullanılıyor.

## Testler

Her görev kendi testini yazıyor (vitest, jsdom, @testing-library/react;
jest-dom ve user-event yok).

- `ChatToolRun`:
  - tür özeti tekrarları sayıyor ("2× … · 1× …");
  - bir adım `failed` ise ✕, tur sürerken ◌;
  - kapalı başlıyor, tıklayınca açılıyor;
  - ayrıntısı olmayan adım tıklanamıyor;
  - iki adımın ayrıntısı aynı anda açık kalabiliyor.
- Cevap satırı:
  - Yeniden üret yalnız `onRegenerate` verilen balonda;
  - akış sürerken satır yok; hata cevabında `onRegenerate` yoksa satır yok,
    varsa yalnız Yeniden üret;
  - öteki cevapların satırı `opacity-0` ile gizli ama DOM'da (yer ayrılı).
- `CodeBlock`: başlık şeridi yok, Kopyala düğmesi var.
- `ChatComposer`:
  - sekmede rozet yalnız `contextTier` varken;
  - klasör adı yolun son parçası, tam yol `title`'da;
  - Dosyalar ve Talimatlar geri çağrıları;
  - halka ölçüm yokken çizilmiyor, %60 ve %80 eşikleri;
  - gönder ve durdur geçişi;
  - Enter gönderir, Shift+Enter göndermez;
  - bahis menüsü açıkken Enter göndermiyor.
- `ChatSessionPane`:
  - bağlam şeridi yok;
  - arama katmanı `top-2`;
  - gösterge liste içinde son öğe ve `sticky` değil;
  - uyarı satırı yok;
  - boş ekranda selamlama ve "Hızlı başlangıç" yok, karta tıklamak
    göndermiyor.
- `AxetCodeHome`: `cwd` bağlı sistemle eşleşince `contextTier` dolu,
  eşleşmeyince `null`.
- Sonda: `npm run -s typecheck` ve `npx vitest run` yeşil. Çalışan
  uygulamada gözle kontrol: dolu sohbet, boş ekran, tur sürerken gösterge,
  soru kartı, PROD bağlı sohbet.

## Review Focus

Testlerin kolay kaçırdığı ve kullanıcıyı en çok ısırabilecek durumlar,
olasılık sırasıyla:

1. **Uzun sohbette kayma.** Gösterge liste sonuna inince dipteyken otomatik
   kaydırma onu takip etmeli. Kullanıcı yukarıdayken yeni adımlar onu aşağı
   çekmemeli.
2. **Uzun yol ve dar pencere.** Sekmede uzun sistem adı ve klasör adı
   kırpılmalı. Sekme kutudan geniş olmamalı, Dosyalar/Talimatlar taşmamalı.
   Yan panel açıkken de aynısı.
3. **Bahis boyamasının kayması.** 3 satır başlangıç ve yeni dolgu ile
   textarea'nın ve boyama katmanının ölçüleri ayrışırsa renkli metin imleçten
   kayar. Uzun, kaydırılan taslakta da denenmeli.
4. **Çok adımlı ve hatalı turlar.** 30+ adımlı bir cevapta açık araç satırı
   sınırlı yükseklikte kalmalı; tek hatalı adım özet satırında ✕ ile
   görünmeli.
5. **Seviye rozeti yanlışlığı.** B sistemine bağlıyken A sisteminin eski
   sohbeti açılınca, o sohbette B'nin rozeti ÇIKMAMALI (rozet hiç çıkmamalı).
