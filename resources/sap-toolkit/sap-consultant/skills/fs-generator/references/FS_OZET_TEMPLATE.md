# [FS-NO] — [BAŞLIK] · Özet

> **Bu bir kısaltılmış FS DEĞİLDİR.** Ayrı bir işi var: tam FS'i okumayacak kişinin
> 90 saniyede "bu ne, benden ne isteniyor, gerekirse nereye bakarım" sorusunu
> cevaplaması. FS'in bölümlerini küçülterek kopyalamak bu işi görmez — küçültülmüş
> bir doküman zaten göz gezdirilerek okunabilirdi.
>
> **Sert sınır: 1 sayfa.** Ölç, tahmin etme:
> `py <PLUGIN_ROOT>/scripts/summary_check.py <ozet.md> --kind fs`
> FAIL alırsan kısalt; sınırı esnetmek yerine cümleyi at.
>
> **Satır kaydırma sayfayı sessizce yer.** Ölçüldü: üç satırlık bir karar tablosu
> render'da on bir satır tuttu, çünkü bir hücre üç satıra bölündü. Kural:
> **tablo hücresi 2 kolonda ~34, 3 kolonda ~24 karakteri geçmez**; geçecekse tablo
> değil liste kullanılır. Karar maddeleri bu yüzden liste — tam sayfa genişliği,
> madde başına tek satır.
>
> Başlıklar reçetenin çıktı dilinde yazılır (varsayılan TR). Bölümlerin **hepsi
> zorunludur**; içi boş olan tek cümleyle kapatılır, silinmez.

---

## Kimlik

<!-- 2 kolon, 4 satır. Okuyucunun "bu benim işim mi" sorusu ilk bakışta biter. -->

| | |
|---|---|
| Müşteri · Proje | [reçeteden] |
| Modül · WRICEF | [SD] · [Report] |
| Durum · Tarih | [Taslak] · [YYYY-AA-GG] |
| Tam doküman | `[FS-NO-kisa-ad.md]` — [N] sayfa |

## Ne isteniyor

<!-- En fazla 4 satır (~280 karakter). İhtiyaç bir cümle, çözüm bir-iki cümle,
     "neden bu çözüm" bir cümle. Arka plan, tarihçe, "işbu doküman kapsamında" yok. -->

[İhtiyaç. Çözüm. Neden bu çözüm.]

## Kapsam

<!-- 2 satır. "Yok" satırı sonradan çıkacak kapsam tartışmasını bugünden kapatır ve
     genelde "Var" satırından daha değerlidir; boş bırakılmaz. -->

**Var:** [madde] · [madde] · [madde]
**Yok:** [açıkça kapsam dışı] · [madde]

## Kararın gereken [N] nokta

<!-- ÖZETİN VAROLUŞ SEBEBİ. FS'teki her [Açık Konu], [Varsayım], [Bağımlılık] ve
     [Netleştirilmesi Gereken Nokta] buraya bir madde olarak gelir — hiçbiri atlanmaz.
     Biçim: numara, kalın konu, tire, kim karar verir, orta nokta, FS'te nerede.
     Madde başına TEK SATIR: 92 karakteri geçme.
     En fazla 8 madde. Daha fazlaysa sorun özette değil — FS henüz teslim edilebilir
     durumda değildir, önce onu konuş.
     Hiçbiri yoksa tek satır: "Karar bekleyen nokta yok." -->

1. **[konu, ≤45 krk]** — [kim karar verir] · [Böl. N]
2. **[konu]** — [kim] · [Böl. N · BR-0N]

## Etkilenenler

<!-- 1 satır. Ad listesi; açıklama değil. Hiçbiri yoksa "Yalnızca [modül]." -->

**Roller:** [...] · **Süreçler:** [...] · **Sistemler:** [...]

## Nereye bakmalı

<!-- Okuma haritası: FS'in bölüm listesi DEĞİL, soru → bölüm eşlemesi. 3-4 satır.
     Okuyucunun gerçekten soracağı sorular; hücreler kısa (2 kolon, ≤34 krk). -->

| Şunu merak ediyorsan | FS'te oku |
|---|---|
| Tam olarak ne üretilecek | [5. Fonksiyonel Gereksinimler] |
| Hangi iş kuralları geçerli | [6. İş Kuralları] |
| Nasıl test edilecek | [10. Test Senaryoları] |
