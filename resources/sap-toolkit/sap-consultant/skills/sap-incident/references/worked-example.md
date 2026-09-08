# Worked example — one ticket, start to finish

This is what a run of this skill actually looks like. Read it once before your first
incident; you will not need it again.

The example is deliberately a *good* case — the mechanism was provable. The second half
shows the same ticket ending as an Interim Findings Note, because that outcome is at least
as common and it is the one people fake their way past.

---

## What the consultant pasted

Nothing else. No question, no context, no formatting.

```
merhaba, müşteri şunu iletti:

"1200 nolu depodan çıkan irsaliyelerde teslimat adresi yanlış basılıyor.
Geçen haftaya kadar sorun yoktu. Bugün 3 sevkiyat yanlış adrese çıktı,
müşteri geri gönderdi. Acil bakılmasını rica ederiz."

TCK-10482, PRD sistemi, öncelik yüksek. bakabilir misin
```

Plus a screenshot of a printed delivery note with the wrong address circled in red.

## What the skill did

### Open the case (no questions asked yet)

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" new \
  --ticket TCK-10482 --system PRD/100 --severity P2 \
  --title "Plant 1200 irsaliye adresi yanlış"
```

The screenshot gives one machine-checkable key: delivery `80001234`. It is not evidence
yet — it is `reported` until ADT confirms it. The image itself stays in `evidence/raw/` and
never enters the report; SAP screens carry names and addresses.

### First output, before any question

> **Anladığım:** PRD/100, SD. Plant 1200'den çıkan irsaliyelerde teslimat adresi yanlış
> basılıyor. Yaklaşık bir haftadır. Etki: en az 3 sevkiyat, fiziksel geri dönüş var.
>
> **Bu sistemde son dönemde ne değişti:** adres okuma alanına dokunan iki istek son 14
> günde serbest bırakılmış — S4DK900312 (27.07, `ZCL_SD_DELIVERY_ADDR`) ve S4DK900298
> (22.07, form değişikliği). Bunlar **ipucu, cevap değil**: E070 serbest bırakma tarihini
> verir, bu sisteme ne zaman aktarıldığını değil.

That is 40 minutes of hand archaeology, produced before the consultant typed a second
message. It is also where the temptation lives: naming S4DK900312 here and stopping.

### The loop

Two hypotheses, each with what would refute it:

| # | Hypothesis | Would refute it |
|---|---|---|
| H1 | S4DK900312 removed a null check; 1200's address record is empty | the null check is still there, or 1200's record is populated |
| H2 | Output form changed and reads a different address field | the form's address field is unchanged since before the window |

Five calls, each appended as it happened:

```bash
py .../case.py add --case support/TCK-10482 --source adt_revisions --system PRD/100 \
  --confidence observed --claim "ZCL_SD_DELIVERY_ADDR changed 27.07 in S4DK900312" \
  --query "adt_revisions ZCL_SD_DELIVERY_ADDR" --raw .tmp/rev.txt

py .../case.py add --case support/TCK-10482 --source adt_get_source --system PRD/100 \
  --confidence observed --claim "GET_SHIP_TO has no IS INITIAL check on ADRC-STREET; \
falls through to the plant default address" \
  --query "adt_get_source ZCL_SD_DELIVERY_ADDR method=GET_SHIP_TO" --raw .tmp/src.txt

py .../case.py add --case support/TCK-10482 --source adt_sql --system PRD/100 \
  --confidence observed --claim "ADRC 0000123456 (plant 1200 ship-to): STREET empty" \
  --query "SELECT addrnumber, street, city1 FROM adrc WHERE addrnumber = '0000123456'" \
  --raw .tmp/adrc.txt
```

The `--raw` files are not optional. `case.py add` refuses `--confidence observed` without
one, because a row that says *"I saw X"* with nothing on disk records what the model
asserted, not what a tool returned.

H2 died on the fourth call: `adt_revisions` on the form showed no change to the address
field since March. **Refuting H2 is what turned H1 from a story into a finding** — one
surviving hypothesis with a mechanism and one with a refutation is the bar.

### What could not be checked

```bash
py .../case.py limit --case support/TCK-10482 \
  --what  "S4DK900312'nin PRD'ye tam olarak ne zaman aktarıldığı" \
  --why   "İçe aktarma geçmişi ADT'de yok; E070-AS4DATE serbest bırakma tarihidir" \
  --where "STMS → içe aktarma geçmişi → PRD, 25–29.07"

py .../case.py limit --case support/TCK-10482 \
  --what  "1200 dışındaki plant'ların adres kayıtları" \
  --why   "Yalnızca şikâyet edilen plant kontrol edildi" \
  --where "SE16N → ADRC, ilgili plant'ların ship-to adres numaraları"
```

Neither is `--blocking`: the mechanism holds without them. The second one matters
commercially — other plants may have the same empty record and nobody has looked.

### The gate

```bash
py .../case.py check --case support/TCK-10482
```

```
PASS  5 evidence row(s), 4 observed, 2 recorded limit(s)
```

Had the ADRC read been skipped, `Güven` could not have been `DOĞRULANDI`: the mechanism
needs *both* the missing check and the empty record. One without the other is correlation.

## The deliverable

```
INCIDENT ANALİZİ — TCK-10482
PRD/100 · SD · 04.08.2026 · Beyhan Meyrali

SORUN
Plant 1200'de irsaliye çıktısında yanlış adres basılıyor.
Yaklaşık bir haftadır, o plant'taki tüm irsaliyelerde.

NEDEN
Adres okuma fonksiyonundaki boş-kayıt kontrolü kaldırılmış
(S4DK900312, 27.07'de serbest bırakıldı). 1200'ün ship-to
adres kaydı boş olduğu için sistem yedek adresi basıyor.
İki koşul birlikte gerekiyor; ikisi de doğrulandı.

                                        Güven: DOĞRULANDI

ÇÖZÜM
  Önerilen   Kodu düzelt · diff s.2 · onayınızla DEV'e uygularım
  Alternatif ADRC 0000123456'yı doldur · ~30 dk · kod değişmez
  Hemen      Çıktı öncesi adresi manuel düzelt

BUNU DÜZELTMEZ
  1200'ün adres kaydındaki boşluk duruyor. Kod düzeltilse bile
  adres eksik kalır — başka raporlar da bu kaydı okuyor.

NELERİ KONTROL EDEMEDİM
  · Taşımanın PRD'ye tam aktarım tarihi — ADT'de görünmez
    → STMS · içe aktarma geçmişi · 25–29.07
  · Diğer plant'ların adres kayıtları kontrol edilmedi
    → SE16N · ADRC · ilgili ship-to numaraları

NASIL DOĞRULARSIN
  VL03N → 80001234 → çıktı önizleme
  SE16N → ADRC → ADDRNUMBER 0000123456 → STREET boş
```

Fifteen lines. The consultant can read it to the customer without translating anything.
`NASIL DOĞRULARSIN` is the part that earns trust: two rows, thirty seconds, checked by
someone who does not read ABAP.

Note what the ÇÖZÜM line does **not** say: it does not say the fix was applied. The
deliverable is a diff. The write happens after a named human approves it, on DEV, against
a transport they chose.

---

## The same ticket, when it does not resolve

Change one fact: `ADRC 0000123456` is populated. H1's mechanism collapses, H2 was already
refuted, and the next discriminating query is *"what did the nightly print job actually
do"* — which is a job log, which ADT cannot read.

```bash
py .../case.py limit --case support/TCK-10482 \
  --what  "Gece çalışan çıktı işinin logu" \
  --why   "İş logu ADT üzerinden görünmez" \
  --where "SM37 · ZSD_PRINT_NIGHTLY · 28.07.2026 çalışması" --blocking
```

```
PASS  4 evidence row(s), 3 observed, 1 recorded limit(s)
      ⚠ L1 marked blocking — this is an Interim Findings Note, not a root-cause report
```

```
ARA BULGU NOTU — TCK-10482

NE TESPİT ETTİK
  Adres okuma fonksiyonu 27.07'de değişti (S4DK900312).
  1200'ün adres kaydı dolu — yani eksik veri sebep değil.

NEYİ ELEDİK
  Form değişikliği: adres alanı Mart'tan beri değişmemiş.
  Eksik ana veri: ADRC 0000123456 dolu.

NEYİ BİLMİYORUZ
  Yanlış adresin hangi aşamada seçildiği. Kod yolu iki
  ihtimal bırakıyor ve ikisi de çalışma anında belirleniyor.

NE LAZIM
  SM37 → ZSD_PRINT_NIGHTLY → 28.07 çalışmasının logu.
  Basis ekibinden istenebilir, 10 dakikalık iş.
```

**This is a successful outcome**, and the skill has to make it as easy to produce as the
confident one. A junior with an angry customer at 18:40 will write whichever document is
easier. If that is the confident one, the tooling has taught them to guess.
