# Scope — the decomposition, and who prices it

**You produce the decomposition. A human produces the price.**

That split is the whole design of this page, and it is not modesty. The pieces of a
change — which objects move, who calls them, whether tests exist, whether a BAdI is
free — are *facts about the system*, and tool calls establish them. Days are not a fact
about the system. Days depend on who is building it, what else they are carrying that
week, how this customer's UAT behaves, and what the commercial frame is. None of that is
in ADT, and no amount of confidence in the analysis puts it there.

So: fill in the units, count the callers, name the unknowns, and hand a human a sheet
they can price in five minutes. Do not emit a number the consultant can paste into an
offer without adding anything.

---

## The scope ledger

Every object the change touches gets rows tagged `scope`, produced by tool calls:

| What to capture | Tool | Why it changes the size |
|---|---|---|
| callers of each changed unit | `adt_where_used` | the *static* callers — see the warning below |
| current source of the units | `adt_get_source` with `method=` / `grep=` | you cannot size a change to code you have not read |
| existing ATC findings | `adt_atc_check` | so you do not inherit somebody else's debt as your own finding |
| existing unit tests | `adt_unit_test` | no tests means writing one is part of this CR |
| active enhancements at the point | `adt_badi_discovery` | an occupied BAdI changes shape B completely |
| what changed here recently | `adt_revisions` | somebody may already be working in this object |

Read source **filtered**. Three unfiltered class reads will end the session, and the scope
study is exactly where the temptation to read everything is strongest.

### `adt_where_used` is a floor, not the scope

It is a static reference list. It does **not** find:

- `SUBMIT (lv_prog)` and any other dynamic program call
- `PERFORM (lv_form) IN PROGRAM (lv_prog)`
- BAdI and enhancement implementations reached by filter at runtime
- RFC, OData, IDoc and web-service consumers outside this system
- job variants, batch-input sessions, and anything scheduled
- code in other clients or other systems that calls in

So the caller count is the **minimum** regression surface. Write it down as that, and
record the rest as a limit:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case cr/CR-2291 \
  --what "Dinamik çağrılar (SUBMIT/PERFORM) ve dış sistem tüketicileri" \
  --why  "adt_where_used sadece statik referansları görür" \
  --where "SM37 iş varyantları, SM59 / SOAMANAGER arayüz listesi, fonksiyonel ekip"
```

A scope sheet with no limits row is claiming it found every caller. It did not.

---

## The decomposition sheet

This is the deliverable. One row per unit of work, with the *drivers* filled in from the
ledger and the day column left for the estimator:

```
KAPSAM ÇÖZÜMLEMESİ — CR-2291

Yapılacak iş                       Ölçü (kanıttan)              Efor
─────────────────────────────────────────────────────────────────────
Geliştirme
  ZCL_SD_CREDIT (yeni metot)       ~60 satır, sınıfın           ___ gün
                                   mevcut testi YOK
  BAdI implementasyonu             BADI_SD_SALES_ITEM,          ___ gün
  ORDER_SAVE                       boş, filtre gerekmiyor
Test
  Birim testi yazımı               2 metot, mevcut test yok     ___ gün
  Regresyon                        7 statik çağıran             ___ gün
                                   (+ dinamikler bilinmiyor)
Doküman ve devir                   FS + UAT + devir              ___ gün
Taşıma ve koordinasyon             1 istek, 3 sistem             ___ gün
─────────────────────────────────────────────────────────────────────
                                                       TOPLAM ___ gün

Bu sayıyı kim doldurdu: ____________________  Tarih: __________
```

The blank column is deliberate and it is the point. Somebody's name goes at the bottom.
That is what makes it an estimate rather than an output.

## What drives each line up — say it, do not multiply it

Do not apply a percentage. State the driver in words next to the line, so the estimator
can decide what it is worth on *this* engagement:

| Driver | How you know | What it means for the estimator |
|---|---|---|
| no unit tests on the object | `adt_unit_test` returned nothing | the build line has to carry writing them, and the first change is slower than the second |
| background/batch callers | `adt_where_used` shows job callers | the regression line needs a scheduled run, not a dialog test |
| extension point not found yet | `adt_badi_discovery` found nothing free | this is unbounded until somebody looks; it can exceed the build |
| multi-client / multi-country variants | same code, several configurations | the test line multiplies, the build line usually does not |
| Red Clean Core tier | modification | a recurring cost at every upgrade, priced separately and forever |

Earlier versions of this page carried a multiplier table ("+30–50%"). Those percentages
were invented, they looked like norms, and a junior would have quoted them as if they
came from somewhere. The words above carry the same information without the false
precision.

## Unknowns are a deliverable, not a failure

Anything you could not settle goes on the sheet as a named unknown, with what would
settle it and roughly what that costs:

```
BİLİNMEYENLER
  · Sipariş kaydında uygun bir genişletme noktası var mı?
    Nasıl netleşir: yarım günlük araştırma (BAdI + enhancement spot taraması)
    Etkisi: bulunmazsa Şekil B → Şekil C, geliştirme kalemi belirgin şekilde büyür
  · Dış sistemler bu kodu çağırıyor mu?
    Nasıl netleşir: fonksiyonel ekip + SM59/SOAMANAGER kontrolü
```

> Yarım günlük bir araştırma bunu netleştirir.

A sheet that names two unknowns and what they cost to close is worth more to the person
signing than a confident total, because it tells them what to buy next.

## Recording it

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" set --case cr/CR-2291 --estimate-days 5.5
```

`--estimate-days` exists so that `sap-cr-handover` has something to compare the actual
against. **Set it only after a human has filled the sheet in and told you the number.**
It records their figure; it is not yours. `case.py check` fails if it is set with no
`scope` row, because a number attached to a case nobody examined is the single most
fabricable artifact in the whole process: it is a number, it looks like a fact, and
nothing about its appearance reveals whether anybody looked at the system.

## The baseline is moving, and it is moving down

Most SAP effort norms were built when finding the right BAdI meant an afternoon in SE84
and reading a class meant reading the whole class. With `adt_code_search`,
`adt_badi_discovery` and `adt_where_used`, the *analysis* half of many jobs has collapsed
— sometimes to a tenth. The build half has not moved nearly as much.

Split the sheet along that line, because the two halves now age at different rates:

| Line | Trend | Treat as |
|---|---|---|
| analysis / finding the extension point / impact | falling fast | re-check against recent actuals every time |
| writing and testing the code | roughly stable | the old norms still hold |
| customer-side (test data, UAT, sign-off) | unchanged | never discount this against tooling |

**Do not quietly keep the old number and pocket the difference.** A four-hour estimate
delivered in fifty minutes is a wrong price, and the customer will eventually notice which
of their suppliers quotes from evidence.

## Afterwards

`sap-cr-handover` writes `--actual-days` back onto this same case. Two numbers on one
case, over thirty cases, is the only thing that ever makes a team's estimates better. One
number is a guess; a pair is data.

`case.py set --actual-days` flags a variance in either direction. The under-run flag
matters most here: it is the signal that the guidance on *this page* is out of date, and
it only ever gets corrected if the consultant sends it back rather than enjoying the easy
afternoon.
