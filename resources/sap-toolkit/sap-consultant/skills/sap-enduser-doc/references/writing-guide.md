# Yazım Rehberi — Son Kullanıcı Dili (TR)

Bu doküman, üretilen kullanıcı dokümanının dilini ve tonunu tanımlar. Hedef okur: SAP'yi işini yapmak için kullanan, teknik bilgisi olmayan departman çalışanı.

## Temel kurallar

1. **"Siz" dili, emir kipi.** "Şirket kodunu girin", "Çalıştır butonuna basın". Asla "girilir", "basılmalıdır" gibi edilgen yapı kullanma — edilgen cümle kimin ne yapacağını belirsizleştirir.
2. **Bir adım = bir eylem.** "Şirket kodunu girip tarihi seçtikten sonra F8'e basın" üç adımdır, tek adım değil.
3. **Kısa cümle.** 20 kelimeyi geçen cümleyi böl.
4. **Sonucu söyle.** Kritik adımlarda kullanıcıya ne göreceğini söyle: "Çalıştır'a bastığınızda sonuç listesi açılır." Kullanıcı doğru yolda olduğunu ancak böyle anlar.
5. **Neden'i bir cümleyle ver.** Alan açıklamalarında sadece "ne girileceği" değil, mümkünse "neden" de olsun: "Sadece kendi şirket kodunuzu görebilirsiniz; farklı bir kod girerseniz yetki hatası alırsınız."
6. **Asla teknik terim.** Aşağıdaki çeviri tablosunu uygula. Tabloda olmayan bir teknik terimle karşılaşırsan iş dilindeki karşılığını danışmana sor, uydurma.

## Jargon çeviri tablosu

| Teknik terim | Dokümanda kullanılacak karşılık |
|---|---|
| Dynpro / ekran numarası | ekran |
| Selection screen | seçim ekranı / giriş ekranı |
| Parameter / select-option | alan / değer aralığı |
| ALV / ALV grid | sonuç listesi |
| Layout (ALV) | görünüm |
| Variant | kayıtlı seçim değerleri |
| Background job / arka plan job | zamanlanmış çalıştırma |
| Spool | çıktı kuyruğu (mümkünse hiç kullanma, "yazdırma listesi" de) |
| BAPI / RFC / fonksiyon | (hiç bahsetme — kullanıcıyı ilgilendirmez) |
| Commit / update task | kaydetme işlemi |
| Yetki nesnesi (S_...) | yetki |
| Master data | ana veri (örnekle aç: "malzeme kartı", "müşteri kartı") |
| Tcode / işlem kodu | işlem kodu (bu kalabilir, kullanıcılar bilir) |
| Batch input / BDC | otomatik veri aktarımı |
| Number range | numara aralığı |

## Yapı kuralları

- **Görev odaklı başlıklar.** "Seçim Ekranı" değil, "Raporu hangi kriterlerle alacağınızı belirleyin".
- **Tablolar referans içindir, adımlar anlatı içindir.** Alan açıklamaları tabloya, yapılacak işler numaralı adımlara.
- **Admonition kullanımı ölçülü olsun.** Sayfa başına en fazla bir-iki kutu; her paragrafı kutuya çevirme:
  - `> [!NOT]` — bilgi, bağlam.
  - `> [!IPUCU]` — işi kolaylaştıran ama zorunlu olmayan bilgi (varyant kaydetme gibi).
  - `> [!DIKKAT]` — veri kaybı, geri alınamaz işlem, sık yapılan hata.
- **Numaralı işaret disiplini:** Metindeki ①②③ işaretleri, ekran görüntüsündeki işaretlerle birebir aynı sırada ve anlamda olmalı. İşaretsiz görüntüye numaralı metin yazma, numarasız metne işaretli görüntü koyma.

## Hata tablosu kuralları

- Mesaj metnini kullanıcının ekranda göreceği haliyle, tırnak içinde yaz.
- "Anlamı" sütununda suçlayıcı dil kullanma: "Yanlış girdiniz" değil, "Girilen şirket kodu sistemde tanımlı değil".
- "Ne yapmalısınız" sütunu her zaman somut bir eylemle bitmeli; son çare her zaman destek kanalı: "...sorun devam ederse destek talebi açın."
- Kullanıcının hiçbir koşulda tetikleyemeyeceği iç/teknik mesajları tabloya alma.

## Ton

Profesyonel ama soğuk değil. Kullanıcıya güven ver: doküman "sistemi bozarım" korkusunu azaltmalı. Geri alınabilir işlemleri belirt ("Bu ekranda hiçbir veri değişmez, sadece görüntüleme yaparsınız"). Mizah yok, ünlem işareti yok.
