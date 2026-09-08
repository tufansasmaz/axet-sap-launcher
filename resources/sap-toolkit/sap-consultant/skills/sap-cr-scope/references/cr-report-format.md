# CR document format — one page for the person who signs

The reader is often a customer-side manager who is deciding whether to spend money, not a
consultant. They need: what they get, what it costs, what it costs *later*, and what they are
not getting. Everything else is behind page 1.

---

## Page 1 — the whole thing

```
DEĞİŞİKLİK TALEBİ — CR-2291
DEV/100 · SD · 04.08.2026 · Beyhan Meyrali

TALEP
Sipariş kaydedilirken, müşterinin kredi limiti aşılıyorsa
kullanıcı uyarılsın; kayıt engellenmesin.

DEĞERLENDİRME
Standart SAP bu kontrolü yapıyor ama sadece teslimat
aşamasında. Sipariş anında uyarı için geliştirme gerekli.
Uygun BAdI mevcut, modifikasyon gerekmiyor.

                              Sınıf: B · Clean Core: Yeşil

KAPSAM                                          Efor
  Geliştirme  ZCL_SD_CREDIT + BAdI              ___ gün
  Birim testi mevcut test yok, 2 metot          ___ gün
  Regresyon   7 statik çağıran                  ___ gün
  Doküman + devir                               ___ gün
                                    TOPLAM      ___ gün
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

The effort column ships **blank**, with a name and date line under it. The analysis is
yours; the price is a human's. See
[`scope-and-estimate.md`](scope-and-estimate.md) for why, and for the sheet that fills
this block. If a consultant has already priced it, the numbers go in and their name goes
on the line — that is a signable document. A total with no name on it is not.

## Why each block is there

| Block | Purpose | Rule |
|---|---|---|
| **TALEP** | the request as a *behaviour*, restated | never the customer's proposed solution |
| **DEĞERLENDİRME** | what the system does today and why code is needed | must rest on `reuse`-tagged rows — this is the block that kills CRs |
| **Sınıf / Clean Core** | the two labels that predict lifetime cost | never suppressed, even on a small CR |
| **KAPSAM** | the work broken into lines, each with its measured driver | every line traceable to `scope` rows; the day column is filled by a named human, never by you |
| **NELERİ KONTROL EDEMEDİM** | what the analysis could not see | from `case.py limit`; omitting it claims total coverage |
| **BU FİYATA DAHİL DEĞİL** | the boundary | omitting this is how a fixed price becomes an argument |
| **VARSAYIMLAR** | what the number rests on | an assumption invisible at signature cannot be invoked later |
| **KARAR** | the signature line | the artifact exists to be decided on, not filed |

`BU FİYATA DAHİL DEĞİL` is the CR equivalent of the incident report's `BUNU DÜZELTMEZ`, and it
does the same job: it is the block that prevents the next dispute.

## When the answer is "do not build this"

This is a **success**, and the document should look like one — not like a rejection.

```
DEĞİŞİKLİK TALEBİ — CR-2288 · SONUÇ: GELİŞTİRME GEREKMİYOR

TALEP
Fatura çıktısında vade tarihi görünsün.

BULGU
Bu alan standart formda mevcut, sadece kapalı.
V/40 → çıktı belirleme → ZF01 formu → "Vade" alanı = X

YAPILACAK
Konfigürasyon, ~30 dk, danışman tarafında. Geliştirme yok.

NASIL DOĞRULARSIN
  VF03 → 90001234 → çıktı önizleme
```

Note the `NASIL DOĞRULARSIN` block, borrowed from the incident report. The customer will not
take "you do not need this" on trust from an AI-assisted analysis; they will take it from a
line they checked in thirty seconds.

Track these. A team that can show *"this quarter we prevented eleven CRs"* is selling
something a body-shop cannot.

## Scale

Scale by **shape**, not by a day count — you do not have a day count at this point.

| | Page 1 | Scope detail | Ledger appendix |
|---|---|---|---|
| **Shape A/B — new object or extension point** | full | full, per object | full |
| **Shape C — change to an existing Z object** | full, KAPSAM as one line per unit | changed objects list | table |
| **Shape D — config / tiny change** | TALEP / KAPSAM / VARSAYIMLAR, 5 lines | — | table |
| **Not built** | the "GELİŞTİRME GEREKMİYOR" shape above | — | the `reuse` rows |

What never scales down: the classification, the Clean Core tier, the reuse check,
`NELERİ KONTROL EDEMEDİM`, and the rule that every KAPSAM line traces to a `scope` row.

## Language

Same rule as the incident report: deliverable language is a field on the case, defaulted from
the customer, not from the language the consultant typed in. Never translate system-emitted
strings — transaction codes, table and field names, object names, transport IDs, package names.

## Rendering

```bash
py plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py \
  --input  cr/CR-2291/report/scope.md \
  --output cr/CR-2291/report/CR-2291-kapsam.pdf \
  --title  "CR-2291 Kapsam ve Efor" --redact-pii
```

`--redact-pii` is not optional on anything that leaves the machine.
