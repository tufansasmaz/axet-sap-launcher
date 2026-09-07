# The deliverable

One page for the decision, one for the fixes, one for the record. `quality.py board`
renders page 1 — do not hand-write it, or the format lasts until the second consultant.

The order is fixed: **scoreboard → verdict → findings → what I could not check.** Never
open with prose. The reader of this document has one question and it is answerable in a
table.

---

## Page 1 — the board

```
## KOD KALİTE KARNESİ — ZCL_SD_DELIVERY_ADDR

DEV/100 · class · S4DK900431 · B. Meyrali · 05.08.2026

| # | Kapı | Sonuç | Kaynak | Not |
|---|---|---|---|---|
| G1 | Sözdizimi   | ✅ GEÇTİ      | adt_syntax_check | 0 hata, 2 uyarı |
| G2 | ATC         | ❌ KALDI      | adt_atc_check    | varyant ZNTT_DEFAULT · 1 öncelik-1 |
| G3 | Birim testi | ⚠️ UYARI      | adt_unit_test    | 0 test çalıştı — testi yok |
| G4 | Clean Core  | ✅ GEÇTİ      | clean-core       | yasak nesne yok |
| G5 | Standartlar | ⚠️ UYARI      | adt_get_source   | 3 minor |
| G6 | Etki alanı  | ✅ GEÇTİ      | adt_where_used   | 3 statik çağıran (asgari) |

**SONUÇ: RELEASE EDİLEMEZ**
- 1 kapı KALDI: atc
- 1 blocker bulgu: F1
```

Four verdicts, and the script computes all four. Nobody types a verdict.

| Verdict | Ne demek | Ne yapılmalı |
|---|---|---|
| **RELEASE EDİLEBİLİR** | altı kapı da geçti | release |
| **ŞARTLI — UYARILAR OKUNMALI** | kalan yok, blocker yok, en az bir ⚠️ | uyarıları oku, kararı adı geçen kişi versin |
| **EKSİK — KARAR VERİLEMEZ** | bir kapı hiç çalışmadı | eksik kapıyı çalıştır |
| **RELEASE EDİLEMEZ** | bir kapı kaldı veya blocker var | düzelt, kapıları tekrar çalıştır |

`ŞARTLI` is the honest common case and it is not a soft pass. It means: nothing here
blocks, and a person is now accountable for the warnings. Put the person's name on it.

---

## Page 2 — findings, worst first

The board's finding table, then a diff per blocker and major. The diff rules are the same
as `sap-incident`: source read live via `adt_get_source`, never written from memory, DEV
and target compared with `adt_revisions` first.

```abap
* F1 · ZCL_SD_DELIVERY_ADDR → GET_SHIP_TO, satır 184
  METHOD get_ship_to.
+   AUTHORITY-CHECK OBJECT 'M_MATE_WRK'
+     ID 'WERKS' FIELD is_partner-werks
+     ID 'ACTVT' FIELD '03'.
+   IF sy-subrc <> 0.
+     RAISE EXCEPTION TYPE zcx_sd_no_auth.
+   ENDIF.
    SELECT ...
```

### Overrides have a name

A finding the team decides not to fix does not disappear from the board. It gets a row:

| ID | Karar | Kim | Ne zaman | Gerekçe |
|---|---|---|---|---|
| F4 | Düzeltilmeyecek | A. Yılmaz | 05.08.2026 | ATC yanlış pozitif — bu çağrı zaten yetki kontrolünden geçmiş bir wrapper içinde |

That row is the whole reason the script refuses to let you downgrade a priority-1. The
finding stays a blocker; a person overrules it in public. Six months later the question
"why did this ship" has an answer.

### Application is a proposal, not a push

| Sistem | Nasıl |
|---|---|
| **DEV** | Adı geçen kişi diff'i onayladıktan sonra `adt_push` → `adt_syntax_check` → `adt_atc_check` → `adt_unit_test` → `adt_activate`, onayladıkları taşıma ile. **Sonra kapıları tekrar çalıştır.** Aktivasyon doğrulama değildir. |
| **QA** | Salt okunur. Yalnızca taşıma ile değişir. |
| **PRD** | Salt okunur. Kaynak okunabilir, yazılamaz. |

---

## Page 3 — the record

- The board again, with the raw artifact filename and SHA-256 per machine gate. That is
  what makes the run reproducible by somebody who does not trust it.
- `NELERİ KONTROL EDEMEDİM` in full.
- The ATC variant name, spelled out. A board without it is unfalsifiable.

---

## Rendering

```bash
py plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py \
  --input board.md --output ZCL_SD_DELIVERY_ADDR-kalite.pdf \
  --title "Kod Kalite Karnesi — ZCL_SD_DELIVERY_ADDR"
```

**No `--redact-pii`.** The masker treats any 10–11 digit number as a tax ID and will eat
SAP object and document keys — which are precisely what makes a finding checkable. These
boards carry keys, line numbers and check IDs. They do not carry names or addresses, and
if one ever does, that is a finding about the report, not a reason to mask it.

## Language

Deliverable in Turkish for a Turkish customer or team; the gate names, tool names, ATC
check IDs and ABAP identifiers stay as they are. Translating `AUTHORITY-CHECK` helps
nobody and makes the finding unsearchable.
