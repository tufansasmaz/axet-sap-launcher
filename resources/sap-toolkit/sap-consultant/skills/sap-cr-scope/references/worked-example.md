# Worked example — one CR, start to finish

Two runs of the same skill. The first ends in a decomposition sheet somebody prices. The
second ends in *"do not build this"*, which is the more valuable outcome and the one people
forget to aim for.

---

## Run 1 — a CR that survives the kill checks

### What the consultant pasted

```
CR-2291 geldi. müşteri şöyle istiyor:

"Sipariş girişinde müşterinin kredi limiti aşılıyorsa satış temsilcisi
uyarılsın. Kayıt engellenmesin, sadece uyarı çıksın. VA01 ekranına
kırmızı bir mesaj eklenebilir mi?"

kaç günlük iş, teklif hazırlayacağız
```

Note the last line. The consultant wants a number. They are not going to get one from this
skill, and §4 of `SKILL.md` says why.

### Restate as behaviour, not as their solution

They asked for *"a red message on VA01"*. That is a solution. The requirement is *"the user
must be told, at order entry, when the credit limit is exceeded — without blocking the
save"*. Sizing their solution instead of their need is how you build the wrong thing
accurately.

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" new --kind cr \
  --ticket CR-2291 --system DEV/100 \
  --title "Sipariş girişinde kredi limiti uyarısı"
```

### Try to kill it — four checks, four rows

```bash
py .../case.py add --case cr/CR-2291 --tag reuse --source adt_search --system DEV/100 \
  --confidence observed --claim "No Z object implements a credit warning at order entry; \
ZSD_CREDIT_REPORT exists but is a report, not a check" \
  --query "adt_search ZSD*CREDIT*" --raw .tmp/search.txt

py .../case.py add --case cr/CR-2291 --tag reuse --source adt_badi_discovery --system DEV/100 \
  --confidence observed --claim "BADI_SD_SALES_ITEM exists, no active implementation in \
client 100, no filter required" \
  --query "adt_badi_discovery BADI_SD_SALES_ITEM" --raw .tmp/badi.txt
```

The standard-SAP check is the one that matters most here: SAP *does* have credit
management, and it *does* warn — but at delivery, not at order entry, and the customer
knows that. The row records exactly that, and it is why the CR survives:

> Standart kredi kontrolü mevcut ancak teslimat aşamasında devreye giriyor. Sipariş anında
> uyarı standartta yok.

**A negative result is still a row.** "Searched the Z namespace, found nothing" is the
evidence that the build is justified, and it is what a reviewer wants six months later when
a second credit object appears.

```bash
py .../case.py set --case cr/CR-2291 --decision build
```

### Compute the scope

```bash
py .../case.py add --case cr/CR-2291 --tag scope --source adt_where_used --system DEV/100 \
  --confidence observed --claim "ZCL_SD_ORDER_CHECK->VALIDATE has 7 static callers, \
2 of them background jobs" --query "adt_where_used ZCL_SD_ORDER_CHECK" --raw .tmp/wu.txt

py .../case.py add --case cr/CR-2291 --tag scope --source adt_unit_test --system DEV/100 \
  --confidence observed --claim "ZCL_SD_ORDER_CHECK has no test class" \
  --query "adt_unit_test ZCL_SD_ORDER_CHECK" --raw .tmp/ut.txt
```

And immediately, the gap that number hides:

```bash
py .../case.py limit --case cr/CR-2291 \
  --what  "Dinamik çağrılar ve dış sistem tüketicileri" \
  --why   "adt_where_used sadece statik referansları görür" \
  --where "SM37 iş varyantları, SM59 / SOAMANAGER, fonksiyonel ekip"
```

Seven callers is a **floor**. Saying "7 callers" without saying that is the difference
between a scope sheet and a false one.

### The deliverable

```
DEĞİŞİKLİK TALEBİ — CR-2291
DEV/100 · SD · 04.08.2026 · Beyhan Meyrali

TALEP
Sipariş kaydedilirken, müşterinin kredi limiti aşılıyorsa
kullanıcı uyarılsın; kayıt engellenmesin.

DEĞERLENDİRME
Standart SAP bu kontrolü yapıyor ama sadece teslimat
aşamasında. Sipariş anında uyarı için geliştirme gerekli.
BADI_SD_SALES_ITEM boş ve filtre gerektirmiyor —
modifikasyon gerekmiyor.

                              Sınıf: B · Clean Core: Yeşil

KAPSAM                                          Efor
  Geliştirme  BAdI impl. + ZCL_SD_CREDIT        ___ gün
              (~60 satır, sınıfın testi YOK)
  Birim testi 2 metot, mevcut test yok           ___ gün
  Regresyon   7 statik çağıran, 2'si arka plan   ___ gün
  Doküman + devir                                ___ gün
                                    TOPLAM       ___ gün
  Dolduran: ______________          Tarih: __________

NELERİ KONTROL EDEMEDİM
  · Dinamik çağrılar (SUBMIT/PERFORM) — adt_where_used görmez
    → SM37 iş varyantları, fonksiyonel ekip
  · Dış sistem tüketicileri → SM59 / SOAMANAGER

BU FİYATA DAHİL DEĞİL
  · Test verisi hazırlığı (müşteri)
  · Kredi limiti ana verisinin düzeltilmesi
  · Teslimat aşamasındaki mevcut kontrolde değişiklik

VARSAYIMLAR
  · ZSD paketinde, DEV/100 üzerinde geliştirilecek
  · UAT müşteri tarafında 2 gün içinde tamamlanır

KARAR                    ☐ Onay    ☐ Revizyon    ☐ İptal
```

### When the consultant asks again for the number

They will. The answer:

> Kalemleri çıkardım — hangi nesneler değişiyor, kaç çağıran var, test var mı, neyi
> göremedim. Günü siz koyacaksınız: kimin yapacağını, o hafta ne taşıdığını ve bu müşterinin
> UAT'ının nasıl işlediğini sistem bilmiyor. Sheet'i doldurun, adınızı yazın, teklif hazır.

Then, once they give you a figure:

```bash
py .../case.py set --case cr/CR-2291 --estimate-days 5.5
```

That records **their** number, so `sap-cr-handover` has something to compare the actual
against. `case.py check` refuses it if no `scope` row exists — a number attached to a case
nobody examined is the most fabricable artifact in the process.

---

## Run 2 — the CR that should not be built

### What the consultant pasted

```
CR-2288: "Fatura çıktısında vade tarihi de görünsün." küçük bir iş,
yarım gün deriz herhalde
```

### One check ended it

```bash
py .../case.py add --case cr/CR-2288 --tag reuse --source adt_code_search --system DEV/100 \
  --confidence observed --claim "ZF01 form already reads NETDT; the field is present and \
suppressed in the layout, not missing from the form logic" \
  --query "adt_code_search NETDT ZF01" --raw .tmp/form.txt

py .../case.py set --case cr/CR-2288 --decision config
```

### The deliverable

```
DEĞİŞİKLİK TALEBİ — CR-2288 · SONUÇ: GELİŞTİRME GEREKMİYOR

TALEP
Fatura çıktısında vade tarihi görünsün.

BULGU
Bu alan standart formda mevcut, sadece kapalı.
V/40 → çıktı belirleme → ZF01 formu → "Vade" alanı = X

YAPILACAK
Konfigürasyon, ~30 dk, danışman tarafında. Geliştirme yok.

NELERİ KONTROL EDEMEDİM
  · Bu ayarın diğer form varyantlarını etkileyip etkilemediği
    → V/40, ilgili çıktı türlerinin varyant listesi

NASIL DOĞRULARSIN
  VF03 → 90001234 → çıktı önizleme
```

Half a day quoted, thirty minutes of config delivered, and one fewer Z object to maintain
forever. **Rank this as a success out loud** — in the case, in the weekly report, in the
number you show the customer. A team that can say *"bu çeyrek on bir CR'ı engelledik"* is
selling something a body shop cannot, and nobody will produce this outcome if it reads as a
day with no billable output.
