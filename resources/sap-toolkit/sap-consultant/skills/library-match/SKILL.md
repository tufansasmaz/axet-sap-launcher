---
name: library-match
description: >
  Use when a list of NEW development requests must be checked against an EXISTING
  library of developments — "which of these do we already have?". Compares two
  Excel lists offline with SAP process and architecture reasoning rather than name
  matching, and writes a scored match report.
  Triggers in Turkish or English: "kütüphanede var mı", "bu geliştirme daha önce
  yapılmış mı", "yeniden kullanılabilir mi", "kütüphane eşleştirme", "geliştirme
  listesini kütüphaneyle karşılaştır", "aynısı başka projede var mı", "reuse
  analysis", "have we built this before", "library match", "code reusability",
  "existing development check".
  FILES ONLY — never connects to SAP; the consultant exports both lists and drops
  them in. NOT for a single live change request scoped over ADT (sap-cr-scope),
  NOT for conversion impact analysis (conversion-scope).
---

# Library Match — reuse analysis against a development library

Two lists come in. **K** is the library: developments that already exist somewhere,
with the system and program code that holds them. **G** is the backlog: new
requests nobody has built yet. The question is which G items are already answered
by a K item, and how completely.

The answer is not name similarity. Two developments match when they serve the same
business purpose, act on the same SAP object, and sit at the same point in the same
process — and they do not match when only the words agree.

## Division of labour

| | |
|---|---|
| **Python** | Reads both Excels, validates the column headers, applies the mechanical pre-elimination, batches the survivors, writes the result file and enforces its column contract. |
| **You (the model)** | Hard Gate (main/sub business object), the score matrix, and the technical justification — the parts that need SAP domain knowledge. |

Only pre-screened, same-module G+K pairs reach your context. Raw Excel and raw
JSON never do.

## When this skill is not the right tool

- **One live change request, over ADT.** `sap-cr-scope` answers "should this be
  built at all" against the actual system, including whether an existing Z object
  covers it. This skill is the bulk offline version: a whole backlog against a
  curated library, no connection. They complement each other — and note that
  `sap-cr-scope` is narrowed to the support and global teams, so on a project team
  this is the only one you have.
- **Conversion or upgrade impact.** "What breaks when we move to S/4" is
  `conversion-scope`, driven by Simplification Database and ATC evidence.
- **Writing the specification** once a decision is made — `fs-generator`.
- **A library this skill does not carry.** The bundled copy is the NTT library.
  A customer's own catalogue of Z developments is a different list — drop it in
  as `Kutuphane Listesi/*.xlsx` and it takes over, but this skill cannot go and
  read it out of an SAP system; that is ADT work.
- **A handful of items.** Two lists of ten are read faster by a person than
  prepared, batched and scored.

## Mode — decide once, here

Ask the consultant which mode, and do not infer it from how many files happen to
be present:

- **Toplu (batch)** — a G Excel exists. Full pipeline, result written to Excel.
- **Tekil (single)** — no G Excel; the consultant describes one development in
  free text. Same rules, no files written, answer shown on screen.

The project name is a required argument to `prepare.py`, so in batch mode there is
nothing to guess: ask for it, pass it, and the script will refuse without it.

---

## Toplu mode

### 1. Prepare

```bash
py scripts/prepare.py --project "<proje adi>"
```

Expects the request list at `Gelistirme Listesi/*.xlsx`. **The library comes with
the kit** — `references/library.jsonl`, 127 developments, regenerated from the
SharePoint source by a maintainer running `scripts/sync_library.py`. Nobody has to
download anything to run an analysis.

A local `Kutuphane Listesi/*.xlsx` wins when present, so a project with its own
library, or a consultant holding a fresher copy, is never blocked. `--g` / `--k`
override both paths.

`prepare.py` prints which library it used and, for the bundled one, how old it is.
A copy is frozen the day it is taken; that cannot be designed away, but the age
being on screen at the moment of use can be. Past four months it says so outright.

It:

- resolves each column against a list of accepted spellings, and **stops, printing
  the real headers**, if a required one is missing — it never guesses a column.
  The list exists because library files genuinely differ between customers: the
  document this skill came from called a column `Geliştirme Açıklaması` where the
  real file says `Geliştirme Açıklama`, and named a `Bulunduğu Sistem` that is
  actually `Kütüphane Sistemi` (there *is* a `Sistem` column, but it holds the
  customer name — binding to it would have been quietly wrong). Add a spelling to
  the alias list rather than renaming a customer's file;
- re-reads both Excels from scratch (the JSON files are output, not cache);
- applies the pre-elimination in `references/HARD_GATE.md` §0 — empty description,
  field-extension keyword, module absent from the library — and drops **cancelled**
  library entries from the candidate pool;
- writes `batches/batch_NNN.json`, **one module per batch**, max 10 G records each,
  with that module's candidate list carried **once** rather than repeated beside
  every request;
- writes `batches/eliminated.json` and recreates
  `Sonuc/<proje>/Analiz_Sonuclari.xlsx` with its header row.

Report the counts it prints before moving on.

### 2. Score, batch by batch

Read `references/HARD_GATE.md` and `references/SCORING.md` first — once, not per
batch. Then for each `batches/batch_NNN.json` **in order**:

1. Read the batch file itself. Its shape is `{modul, k_candidates, g_records}` —
   one module, its candidate list once, and up to ten requests. Every record in
   `g_records` is examined against `k_candidates`; there is no shortcut that skips
   a batch or writes one verdict across a range of them.
2. For each G–K pair: Hard Gate first, then the score matrix. A G record may match
   several K records — write one row per match, highest score first.
3. A G record with no surviving candidate still gets a row: `Karsiligi Yok` in the
   two K columns, score `0`, and a short fixed note (`HARD GATE: <criterion>`),
   not a paragraph of reasoning.
4. Write the rows to a JSON file and append them:

```bash
py scripts/write_results.py --project "<proje adi>" --rows rows.json --batch batches/batch_001.json
```

`--batch` makes the writer check that **every G key in that batch has at least one
row**. If any is missing it refuses and names the keys. This is the mechanical
replacement for a rule that used to be three paragraphs of prose asking the model
not to skip batches.

Before extracting the technical content from a `Description`: if it has a
`Geliştirme Detayı:` section, use only that; otherwise ignore the `Talep Eden`,
`Kütüphanede Mevcut Mu`, `Amaç/Kazanım`, `Geliştirme Olmasa`, `Standart Çözüm`
lines and work from the remaining technical text.

Report progress as `Batch 03/17 done, 24 rows` and continue — no confirmation
between batches.

### 3. Finalize

```bash
py scripts/write_results.py --project "<proje adi>" --finalize
```

Appends the pre-eliminated records and prints the totals.

---

## Tekil mode

No Excel is read or written. Ask **one** open question:

> "Yapmak istediğiniz geliştirmeyi serbest metinle anlatın — ne yapıyor, hangi
> ekran/rapor/arayüz, hangi iş sürecine hizmet ediyor?"

That text is the `Description`. Derive the summary from it yourself rather than
asking for one. Ask for the module only if the text does not make it obvious —
at most two questions in total.

If the text is empty, say so and stop: the empty-description rule applies here
exactly as it does in batch mode.

Then read the K Excel, take every candidate in the same module, and apply the same
Hard Gate and score matrix — the rules do not differ by mode. Show the survivors on
screen, highest score first: library development name, program code, system, match
percentage, note. If nothing passes the Hard Gate, say "Kütüphanede karşılığı
bulunamadı" rather than presenting a weak match.

Offer another single comparison when it is done.

---

## Output contract

`Sonuc/<proje>/Analiz_Sonuclari.xlsx`, one sheet, 15 columns in this order:

`Key (G)` · `Summary (G)` · `Description (G)` · `Main Responsible Modul (G)` ·
`Gelistirme Tipi (G)` · `Modul (K)` · `Gelistirme Tanimi (K)` ·
`Gelistirme Aciklamasi (K)` · `Kutuphane Sistem Program Kodu (K)` ·
`Bulundugu Sistem (K)` · `SAP Ana Is Nesnesi` · `SAP Alt Is Nesnesi` ·
`SAP Is Sureci` · `Eslesme Orani (%)` · `Benzerlik Notu / Yorum`

`Eslesme Orani (%)` is always a number between 0 and 100. `write_results.py`
rejects the row otherwise, so a process or object name written into that column
fails loudly instead of shifting every column after it.

`Kutuphane Sistem Program Kodu (K)` is `prepare.py`'s `__program_kodu`: the first
non-empty of `İşlem Kodu`, `Program Adı`, `Geliştirme Paketi`. The transaction code
leads because it is what the consultant reaches for after deciding "we already have
this" — the package name says where it lives, the tcode says how to run it.
`Bulundugu Sistem (K)` is the library system that holds it (NP4/NS4/NR4), left
empty on rows with no match.

## Bundled resources

- `references/library.jsonl` — the NTT development library itself, one record per
  line: title, description, module, transaction code, program, package, library
  system, copy status. **Generated, never hand-edited** — `scripts/sync_library.py
  --source <xlsx>` rebuilds it from the SharePoint workbook, and the first line
  stamps that source's name, sha256, record count and date. Ten of the source's
  twenty-two columns are deliberately not shipped: three of consultants' names,
  one of customer names, and six of process tracking that no match depends on.
- `references/HARD_GATE.md` — pre-elimination, semantic normalization, the analysis
  order, and the object/process/architecture rules that decide a match. Turkish:
  most of the distinctions live in Turkish SAP terminology and do not survive
  translation.
- `references/SCORING.md` — the two-stage matrix and its calibration, including
  the rule that a short description is not a reason to deduct points.
- `scripts/prepare.py` — reads and validates both Excels, pre-eliminates, batches,
  creates the result file.
- `scripts/write_results.py` — appends scored rows, enforces the 15-column and
  numeric-score contract, and verifies that a batch was actually covered.
