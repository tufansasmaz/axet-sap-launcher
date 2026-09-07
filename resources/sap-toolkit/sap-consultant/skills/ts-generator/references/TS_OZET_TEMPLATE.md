# [WRICEF-ID] — [BAŞLIK] · Teknik Özet

> **Bu bir kısaltılmış TS DEĞİLDİR.** Ayrı bir işi var: TS'in beş parçasını
> okumayacak kişinin — geliştiriciyi işe alan lider, devralan ABAP'çı, gözden
> geçiren — "ne inşa edilecek, nerede risk var, benden ne isteniyor" sorusunu
> birkaç dakikada cevaplaması. TS'i küçülterek kopyalamak bu işi görmez.
>
> **Sert sınır: 2 sayfa.** Nesne tablosu dışındaki her şey ~45 satır, nesne tablosu
> en fazla 18 satır. `py <PLUGIN_ROOT>/scripts/summary_check.py <ozet.md> --kind ts`
> ölçer; FAIL alırsan kısalt, sınırı esnetme.
>
> Başlıklar reçetenin çıktı dilinde yazılır (varsayılan TR). Bölümlerin **hepsi
> zorunludur**; içi boş olan tek cümleyle kapatılır, silinmez.

---

## Kimlik

<!-- En fazla 6 satır. -->

| | |
|---|---|
| Müşteri · Proje | [reçeteden] |
| Modül · WRICEF | [MM] · [MM019 — Report] |
| Clean Core | [Seviye A/B/C/D] — [istisna var mı: evet/hayır] |
| Kaynak FS | `[FS dosyası]` |
| Tam doküman | `[WRICEF-ID-Teknik-Spesifikasyon.md]` — [N] sayfa, 5 parça |

## Çözüm bir paragrafta

<!-- 3-4 cümle, en fazla 6 satır. Teknik yaklaşım ve NEDEN bu yaklaşım.
     Nesneleri burada saymayın — aşağıda tabloları var. -->

[Yaklaşım bir-iki cümlede. Neden bu yaklaşım (alternatif neden elendi), bir cümle.]

## Ne inşa edilecek

<!-- Geliştiricinin ilk sorusu. 2.1 Object List'in sıkıştırılmışı: ad + tip +
     "ne yapar" en fazla 6 kelime. En fazla 18 satır.
     18'i aşıyorsa: mantık taşıyan nesneler listelenir, sonuna
     "+ [N] destekleyici nesne (tam liste: Part2 · 2.1)" satırı eklenir.
     Adlar TS'teki gibi <ZPKG> yer tutucusuyla yazılır — özet somut paket adı uydurmaz. -->

| Nesne | Tip | Ne yapar |
|---|---|---|
| `<ZPKG>_R_[AD]` | CDS Root View | [≤6 kelime] |
| `<ZPKG>_CL_[AD]` | Class | [≤6 kelime] |

## Kararın gereken [N] nokta

<!-- ÖZETİN VAROLUŞ SEBEBİ. TS'teki her Assumption, açık konu, Clean Core istisnası
     ve "teyit gerekli" isimlendirme notu buraya bir satır olarak gelir — hiçbiri
     atlanmaz. STEP 7 brifingindeki "SENİN KARARIN GEREKEN N NOKTA" ile aynı liste;
     orada sohbette, burada dokümanda kalıcı.
     Hiçbiri yoksa: "Karar bekleyen nokta yok." yazılır, tablo silinir. -->

| # | Konu | Kim karar verir | TS'te nerede |
|---|---|---|---|
| 1 | [tek cümlede ne belirsiz] | [rol] | [Part2 · 2.1] |

## Dikkat

<!-- Risk yüzeyi. En fazla 5 satır, her biri tek satır.
     Buraya girenler: Clean Core istisnaları, doğrulanamamış release durumu,
     performans/hacim riski, geri alınamaz adımlar, dış bağımlılık.
     Hiçbiri yoksa: "Öne çıkan risk yok; Clean Core Seviye [X], istisna yok." -->

- [risk — ve nerede ele alındığı]

## Nereye bakmalı

<!-- Okuma haritası: parça listesi DEĞİL, soru → yer eşlemesi. 3-5 satır. -->

| Şunu merak ediyorsan | TS'te oku |
|---|---|
| Ne inşa edilecek, tam liste | [Part2 · 2.1 Object List] |
| İş mantığı nasıl çalışıyor | [Part3 · 2.5 Processing Logic] |
| Nasıl test edilecek | [Part4 · 2.12 Test Senaryoları] |
| Nasıl taşınacak | [Part4 · 2.13 Transport & Deployment] |
