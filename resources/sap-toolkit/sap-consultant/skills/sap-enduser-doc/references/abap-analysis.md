# ABAP Source Analysis — Extracting Documentation Seeds

Goal: turn the program source into structured drafts for the document. Everything extracted here is a `[from-code]` draft — it becomes final content only after the consultant confirms or rewrites it in the interview (or, in the default quick-trigger flow, only after it is corroborated by what actually happened on screen — see SKILL.md).

**Business logic out, code detail left behind.** `work/<task>/analysis.md` may reference technical names for your own traceability, but `document.md` (the final deliverable) never gets ABAP source blocks, FORM/method/include names, internal table or structure names, message class+number pairs (use the message *text*, not `E001(ZMM)`), or line numbers. If a technical fact has no plain-language business translation, leave it out of the document rather than pasting it verbatim "just in case".

## 1. Selection screen inventory

Scan for:

```abap
PARAMETERS: p_bukrs TYPE bukrs OBLIGATORY,
            p_test  AS CHECKBOX DEFAULT 'X'.
SELECT-OPTIONS: s_matnr FOR mara-matnr,
                s_budat FOR mkpf-budat OBLIGATORY.
SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-001.
```

Record per field: technical name, DDIC type, obligatory flag, default value, checkbox/radio group, block/frame grouping, and the selection text if text elements were provided. Preserve the on-screen order — the document's field table and the walkthrough script both follow it.

Flag as **ambiguous** (→ interview question) any field where the business meaning is not obvious from the selection text alone: generic names (`p_var1`), flags whose effect is buried in logic, date fields where the expected granularity (posting date vs. document date) matters.

**Classify every field as FILTER or BEHAVIOR.** Filters narrow the result set (they end up in WHERE clauses / range checks). Behavior parameters change what the program *does*: test-vs-update checkboxes, radio groups selecting processing mode, background/output options. Trace each checkbox/radio into the logic to decide. In the document, filters go into the field table; every behavior parameter gets its own `[!DIKKAT]` box after the table — especially anything that controls whether data is changed.

**Hunt for implicit selection.** Hardcoded conditions the user cannot influence — fixed status values in WHERE clauses, document-type restrictions, content-based routing rules (e.g. "orders containing X go to another transaction") — feed the template's "Hangi Kayıtlar Bu Ekranda Görünür?" section. These invisible filters are the top cause of "my record is missing" support tickets, so extract them even though no selection-screen field represents them.

`AT SELECTION-SCREEN` validation logic is valuable: it tells you which inputs get rejected and with which message — feed this into the error table.

## 2. Messages → error table seed

Scan for every `MESSAGE` statement:

```abap
MESSAGE e001(zmm) WITH p_bukrs.        " message class + number
MESSAGE 'Tarih aralığı geçersiz' TYPE 'E'.
MESSAGE ID sy-msgid TYPE sy-msgty NUMBER sy-msgno ...
```

- For class/number messages, get the actual text from the user if T100 texts weren't supplied with the source; note `&` placeholders and what fills them.
- Classify each: can an end user trigger it through input/usage (→ error table) or is it internal (RFC failure, lock error during batch)? Internal ones go to the support section at most ("bu mesajı görürseniz doğrudan destek talebi açın"), not the main table.
- The `sy-msg*` pass-through pattern means messages come from called function modules — ask the consultant which ones users actually see.

## 3. Authorizations → prerequisites seed

Scan `AUTHORITY-CHECK OBJECT '...'`. Record object and fields checked. In the document this becomes plain language: not "S_TCODE ve Z_BUKRS_CHK yetkisi", but "Bu programı kullanabilmek için SAP yetkinizin ilgili şirket kodunu kapsaması gerekir; yetki hatası alırsanız sistem yöneticinize başvurun." The consultant confirms which role name the customer knows this by.

## 4. Output structure → interpretation seed

Locate the ALV construction: `cl_salv_table`, `REUSE_ALV_GRID_DISPLAY` field catalog, or `WRITE` lists. Record output columns (field, label) and any of these — they always deserve explanation in "Sonuçların Yorumlanması":

- Traffic-light / icon columns (`icon_*`, exception fields, `set_exception_column`)
- Color coding (`emphasize`, color tables)
- Totals/subtotals, sort logic
- Hotspots / double-click navigation to other transactions
- Editable columns (rare but critical to document)

## 5. Interactive transactions → actions seed

If the program is not a plain report — it has detail screens (`CALL SCREEN`, PBO/PAI modules), user commands (`sy-ucomm` / `CASE ok_code`), or ALV events that trigger updates — inventory every user command: button text, what it changes (status transitions are the most important — map the full status flow), its preconditions, and whether it is reversible. This feeds the template's "Ekrandaki İşlemler" table. Also record list→detail navigation (double-click / hotspot handlers) as numbered steps. A transaction's real output is usually a state change, not a list — say so explicitly in "Genel Bakış".

## 6. Flow → Mermaid seed

From `INITIALIZATION` / `START-OF-SELECTION` / `END-OF-SELECTION` and the top-level PERFORM/method chain, sketch the run phases (read → process → output). Then **translate to the user's viewpoint**: the flowchart in the document shows what the user does and sees (enter criteria → run → review list → export/print or fix input and rerun), not internal phases. The code flow only helps you know whether there are decision points visible to the user (test run vs. update run, online vs. background).

## 7. Things code cannot tell you (always interview)

- Why the program exists / what business decision its output feeds.
- Realistic example values (never invent company codes, materials, or dates — use the interview's scenario, or the named variant's own stored values).
- Frequency and timing of use (month-end? daily?).
- What users most commonly do wrong.
- Whether the update mode actually changes data (users fear this most — the document must state clearly whether the program modifies anything).

If no interview happened (default quick-trigger flow with no consultant available), do not fill these in from guesswork and do not write any placeholder/disclaimer in their place ("bilgi doğrulanamadı", "teyit edilmesi önerilir", etc. are forbidden inside `document.md`): omit the specific sentence, row, or field entirely from the document, and tell the user — only in the görev sonu raporu / `SESSION_HANDOFF.md` "Kalan işler" line — which items still need a consultant's confirmation before the document is considered final.
