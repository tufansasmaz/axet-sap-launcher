# Report format — simple on the surface, detail underneath

The consultant is often a functional consultant with no code background, working at 18:40
with an angry customer. If page 1 needs explaining, it has failed.

**Page 1** is what the consultant and the customer read: fifteen lines, no jargon, no
evidence IDs, no hypothesis table. **Pages 2–3** carry the code proposal and the evidence
for whoever wants to check.

---

## Page 1 — the whole thing

```
INCIDENT ANALİZİ — TCK-10482
PRD/100 · SD · 04.08.2026 · Beyhan Meyrali

SORUN
Plant 1200'de irsaliye çıktısında yanlış adres basılıyor.
28.07'den beri, o plant'taki tüm irsaliyelerde.

NEDEN
28.07'de giren S4DK900312 taşıma isteği, adres okuma
fonksiyonundaki boş-kayıt kontrolünü kaldırmış. 1200'ün
adres kaydı boş olduğu için sistem yedek adresi basıyor.

                                        Güven: DOĞRULANDI

ÇÖZÜM
  Önerilen   Kodu düzelt · ~4 saat · detay s.2
  Alternatif Adres ana verisini düzelt · ~30 dk · kod değişmez
  Hemen      Çıktı öncesi adresi manuel düzelt

BUNU DÜZELTMEZ
  1200'ün adres kaydındaki boşluk duruyor. Ayrı kayıt gerekli.

NELERİ KONTROL EDEMEDİM
  · Gece çalışan çıktı işinin logu — iş logu ADT'de görünmez
    → SM37 · ZSD_PRINT_NIGHTLY · 28.07.2026
  · 1200 dışındaki plant'lar tek tek doğrulanmadı

NASIL DOĞRULARSIN
  VL03N → 80001234 → çıktı önizleme
  SE16N → ADRC → ADDRNUMBER 0000123456
```

## Why each block is there

| Block | Purpose | Rule |
|---|---|---|
| **SORUN** | symptom as *verified*, not as reported | if they differ, page 3 says so — that gap is half the analysis |
| **NEDEN** | one paragraph, plain Turkish/English, no object names unless unavoidable | must trace to `observed` ledger rows |
| **Güven** | the only label on page 1 | DOĞRULANDI / MUHTEMEL / ŞÜPHELİ — never suppressed, never inferred upward |
| **ÇÖZÜM** | graded, never a single option | always include the no-code-change option when one exists |
| **BUNU DÜZELTMEZ** | what the fix masks or leaves open | omitting this is how a fix creates the next ticket |
| **NELERİ KONTROL EDEMEDİM** | the boundary of the analysis | from `case.py limit`; each line ends in a transaction and a key |
| **NASIL DOĞRULARSIN** | transaction + exact key | the trust mechanism — the reader spot-checks two rows in 30 seconds |

`NASIL DOĞRULARSIN` is not decoration. A functional consultant will not trust "the AI said
so"; they will trust a line they checked themselves. Give a transaction and a *complete*
key, never "check the delivery".

`NELERİ KONTROL EDEMEDİM` is its mirror image, and it is the block a junior most needs.
`Güven` grades what was found; only this block distinguishes *"checked everything, still
unsure"* from *"checked three things"*. The full list of what ADT cannot reach, and which
team each gap belongs to, is in
[`limits-and-escalation.md`](limits-and-escalation.md).

## Severity scales the report, not the standard

| | Page 1 | Code proposal | Evidence appendix |
|---|---|---|---|
| **P1 / P2** | full | yes | full |
| **P3** | SORUN / NEDEN / ÇÖZÜM only, ~5 lines | if code changed | ledger table |
| **P4, user education** | 3 lines + the documentation reference | no | the reference |

Make a password reset carry an eleven-section RCA and the whole thing is dead in a month.
What never scales down: the confidence label, `NELERİ KONTROL EDEMEDİM`, and the rule that
a claim without an `observed` row cannot be stated as fact.

## Language

Deliverable language is a **field on the case**, defaulted from the customer, and it is not
the language the consultant typed in. A Turkish prompt about a German customer's system
produces a German report.

**Never translate system-emitted strings**: transaction codes, table and field names,
message class + number, transport IDs, object names, dump titles. Translating `LIKP-KUNNR`
helps nobody and makes the report uncheckable.

## When there is no answer

Do not pad. Render an **Ara Bulgu Notu / Interim Findings Note** instead — same page-1
shape, four blocks:

```
NE TESPİT ETTİK      what is established, with evidence
NEYİ ELEDİK          what was ruled out, and by which refuting evidence
NEYİ BİLMİYORUZ      the open question, stated plainly
NE LAZIM             what would close it — access, a reproduction, a log
```

`NEYİ BİLMİYORUZ` and `NE LAZIM` are the `limits.jsonl` rows, split: the `--what`/`--why`
go in the first, the `--where` goes in the second. Any limit recorded with `--blocking`
forces this shape — `case.py check` prints the notice on its PASS line, so the choice is
not left to the moment when a confident report would be more comfortable to write.

This is a legitimate closure path and it must be an easy one. If "I don't know" is harder
to produce than a confident guess, people produce confident guesses.

## Rendering

```bash
py plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py \
  --input support/TCK-10482/report/report.md \
  --output support/TCK-10482/report/TCK-10482.pdf \
  --title "TCK-10482 Incident Analizi" --redact-pii
```

`--redact-pii` is not optional on anything that leaves the machine.
