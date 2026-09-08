# UAT script — a test the customer can actually run

The person running this is a key user, not a tester. They have forty minutes between meetings.
A step they cannot execute without asking you a question is a step that will be marked "OK"
without being run.

---

## One row per requirement, and a complete key on every step

```
UAT — CR-2291 · Kredi limiti uyarısı
QA/100 · 04.08.2026 · Beklenen süre: ~40 dk

T1  Limit aşımında uyarı çıkıyor
    VA01 → müşteri 0000047011 → malzeme M-01 → miktar 500
    Beklenen: kayıtta "Kredi limiti aşıldı" uyarısı (ZSD 042)
    Sipariş yine de kaydedilebilmeli
    Sonuç: ☐ Geçti  ☐ Kaldı ______________________

T2  Limit altında uyarı ÇIKMIYOR
    VA01 → müşteri 0000047011 → malzeme M-01 → miktar 5
    Beklenen: uyarı yok, kayıt normal
    Sonuç: ☐ Geçti  ☐ Kaldı ______________________

T3  Arka plan işi etkilenmiyor
    SM37 → ZSD_ORDER_BATCH → 04.08 çalıştırması
    Beklenen: iş hatasız bitiyor, dump yok
    Sonuç: ☐ Geçti  ☐ Kaldı ______________________
```

| Rule | Why |
|---|---|
| **Transaction + complete key on every step** | "check an order" is not a step; `0000047011` is |
| **Expected result stated before they run it** | otherwise they decide afterwards what "correct" was |
| **At least one negative case** | T2 catches the enhancement that fires too broadly — the single most common way this class of change breaks production |
| **Every background caller from `adt_where_used` gets a step** | that list is the *minimum* regression scope, and jobs are what nobody thinks to test |
| **The callers ADT cannot see get a named owner** | dynamic `SUBMIT`/`PERFORM`, filtered BAdIs, external RFC/OData/IDoc consumers — say who checks them, or the script reads as exhaustive |
| **A blank line for what actually happened** | a "Kaldı" with no note costs a round trip |

## Test data is a dependency, and it has an owner

Say who supplies each key, in the script, before the steps:

> Test verisi: 0000047011 numaralı müşteri, kredi limiti 10.000 TL olarak QA/100'de
> tanımlanmış olmalı. Müşteri tarafından sağlanacak.

A UAT script that assumes data which does not exist in QA is the most common reason acceptance
slips a week. Where you can, verify the key exists before you write it into the script — an
`adt_sql` read on QA with the data scope recorded (`case.py scope`) turns an assumption into
an `observed` row.

Never invent a plausible-looking customer or document number. A wrong key does not fail
loudly; it sends the key user hunting, and they stop trusting the document.

## Requirement traceability

Every requirement in the spec-vs-shipped table gets a test, or an explicit note saying why it
has none:

| Requirement | Test | If untested |
|---|---|---|
| ✅ delivered | T1, T2 | — |
| ⚠️ partial | T4, covering only what was delivered | say what is *not* tested, because it is not built |
| ❌ not delivered | none | state it, so nobody tests for something absent and reports a bug |

That last row prevents a specific and very common waste: the key user tests the missing
feature, raises a defect, and two people spend a day rediscovering a scope decision that was
made in July.

## Scale

| Size | Test steps |
|---|---|
| **> 5 days** | full script, negative cases, every background caller |
| **1–5 days** | the main path, one negative, the callers that are jobs |
| **< 1 day** | two steps: it works, and the thing next to it still works |

The second half of that last row is not optional. A one-line change with no regression step is
how a "small request" takes down an interface.

## Sign-off

The script carries a signature line, and that signature belongs in the ITSM, not in the PDF.
The document is evidence for the decision; the ticket system is where the decision is recorded.
Never write "kabul edildi" onto a document yourself.
