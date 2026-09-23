---
name: fast-scan-question-generator
description: >
  Prepare a Fast Scan / pre-workshop question set (100 questions, Excel) for a
  new customer or phase, grounded in what NTT already delivered: the synced
  past-project library — its registry, the Business Driven Configuration
  questionnaire, and the blueprints, solution designs and workshop notes behind
  them. Questions a business manager can answer without knowing SAP.
  Triggers: "Fast Scan soru seti", "atölye soruları hazırla", "çalıştay soru
  seti", "ön analiz soruları", "keşif soruları", "geçmiş projelerden soru
  çıkar", "fast scan", "workshop questions", "discovery questions".
  FILES ONLY — reads the library locally, never over MCP or HTTP, and touches
  no SAP system. NOT the FS (fs-generator), NOT the BBP (bbp-creator), NOT
  "have we built this before" (library-match).
author: "Öner Öztürk <Oner.Ozturk@bs.nttdata.com>"
---

# fast-scan-question-generator — workshop questions out of what we already know

A Fast Scan asks a customer 100 questions before anyone has configured anything.
The questions are only as good as the experience behind them, and that
experience is sitting in past projects: their blueprints, their solution
designs, the notes somebody took in a workshop three years ago.

This skill reads that library **locally**, inventories what is relevant, reads
the documents that earn the budget, and writes an `.xlsx` with 100 questions and
a full traceability sheet.

Full procedure — prioritization, cache, readiness, batching, output contract —
is in **[reference/optimized-wizard-flow.md](reference/optimized-wizard-flow.md)**.
Read it before starting the wizard. It owns those rules; this file owns the
boundaries below.

## Three roles, not two

The single most expensive mistake this skill can make is presenting something
that was true on another project as true for this customer. It is expensive
because the output looks *better* when it happens: concrete, specific, confident.

| role | what it is | what it is worth |
|---|---|---|
| **Target** | the customer being scanned, and the project brief if one exists | truth |
| **Target history** | the SAME project's or customer's own past documents | truth **as of its date** |
| **Reference** | every other project | never truth about the target — only a reason a question is worth asking |

Precedence: **brief > target history > reference.** A reference value becomes a
neutral question, never a target fact, unless the target independently confirms
it. Target history is not automatically current either: the customer's scope,
system or organisation may have moved since, so date it and let the brief win a
contradiction — then raise the contradiction as a question, because the brief
can be the stale one.

**Target history is not rare — it is already here.** Of four current project
briefs, two are in the past-project library: `ozak-tekstil` and
`sun-tekstil-jimmy-key`, and the second maps to **two** registry rows. So the
brief carries a LIST:

```yaml
registry_ids: [sun-tekstil-ekoten-rise-donusum-projesi, jimmy-key-retail-projesi]
registry_ids: []      # checked, this customer is not in the library
```

Match a library row to the target **only** by `Projects_Master.Project ID`
appearing in that list. Never by name similarity — measured 2026-09-21, the
library holds `vergo-enerji-s4-hana-rise-projesi` while a current project is
called `beta-enerji`; a fuzzy match would have handed one energy customer
another one's history as its own. `registry_ids: []` means *checked and absent*.
A brief with **no** `registry_ids` key at all means nobody looked: say so, and
treat every row as reference.

## Reading the library

Find it with the bundled helper; it locates the synced folder by its **content**,
not by a shortcut name.

```bash
py <SCRIPTS>/resolve_local_sources.py
py <SCRIPTS>/resolve_local_sources.py --root "<exact library folder>"
py <SCRIPTS>/resolve_local_sources.py --document-url "<a Registry Document Link>"
```

- **Local files only.** No SharePoint MCP, no HTTP. aXet.code has no MCP at all,
  and the library is synced anyway.
- **Use the `access_path`, always.** Measured 2026-09-21 on one real project:
  of its 325 document links, **52 (16%) are unreachable** through a plain path —
  they run 260 to 288 characters and Windows refuses them. With the helper's
  `access_path` all 325 resolve. A plain path does not error usefully here; it
  just reports the file as absent, so the evidence quietly shrinks by a sixth.
  Keep the display path separate for citations.
- **`present` does not mean readable.** A OneDrive placeholder stats exactly like
  a hydrated file. A file that will not open is *found but not readable*, never
  *missing* — the two lead the consultant to different fixes.
- Several valid roots → ask which. None → report what was tried and ask for the
  path or the sync state. Never silently substitute a different root.
- **`status: syncing` is not a failure.** It means the right library was found
  but OneDrive has not finished bringing it down — `incomplete` names what is
  still missing. Do NOT tell the person to add the shortcut again; they have it.
  Relay the `hint`: wait, or tick the folder in OneDrive > Settings > Account >
  Choose folders. Measured 2026-09-21 on the first real sync: every subfolder
  appeared at once and filled one at a time, so a marker directory can exist and
  be empty.
- Registry `Document Link` URLs are **citation metadata**. Map them to local
  files with `--document-url`; never fetch one. A mapped link is mapped, not
  verified, and a local read is a snapshot — do not claim live freshness.

### Which sheet is authoritative

Measured 2026-09-21 against the real workbook (94 projects, 4,482 document rows):

| sheet | joins | use it for |
|---|---|---|
| `Projects_Master` | 94 projects, the `Project ID` list | the project list, and the only ids `registry_ids` may name |
| `Project_Document_Links` | by project **NAME**, 0 orphans, covers 77 of the 94 | the evidence |
| `Project_Module_Mapping` | by name, 0 orphans, same 77 | module filtering |
| `Project_Industry_Mapping` | 123 names, **29 ids absent from `Projects_Master`** | industry filtering only — verify against the master before using a row |

The industry sheet is the dirty one, and it is dirty in a way that will fool you:
it contains short codes identical to our own brief codes — `beta-enerji`,
`ozak-tekstil` — that have **no `Projects_Master` row, no modules and no
documents**. Finding your project there means nothing. Evidence exists only
where `Project_Document_Links` has rows.

Seventeen projects in the master have no documents at all. Say so rather than
reading around it.

### Where the library lives

The helper takes it from OneDrive's own registry and identifies it by the two
directories `1 - Proje Dokümanları` and `2 - Agent Dokümanları`. **No tenant,
site or library URL is written into this skill** (house rule) — the site address
belongs in the department's setup document, and a URL in here would also be
wrong for anyone whose library is synced elsewhere. Relative paths to the
Registry and the BDC workbook are in the helper, alongside the identifying
directories.

For `.xlsx`, read with `openpyxl` (`read_only=True`, `data_only=True`) and
process rows in code — raw workbook dumps must not reach the conversation. A
cached formula value can be absent or stale; inspect the formula cell rather
than treating it as blank.

## Confidentiality — the output leaves the building

The workbook carries `Reference Project`, `Source Project` and
`Source Document Link` columns. A Fast Scan set is prepared **for a prospect**.
Put those two together and the deliverable tells customer A, by name and with a
link, what customer B did.

So: the library may be named **internally**, and the customer's identity comes
out at the **output** boundary. "A distribution project in the energy sector"
justifies a question exactly as well as the customer's name does. Ask once, at
confirmation, whether the workbook is internal or leaves NTT, and:

- **leaves NTT** → replace project names with sector/size descriptors, drop
  document links, keep the source IDs so traceability survives internally;
- **internal** → full provenance.

This is the same rule `library-match`'s sync already follows, where the customer
columns are dropped structurally and the free text is scanned for the names that
could not be.

## Output

A real `.xlsx`: sheet **Fast Scan Questions** with exactly 100 questions and the
19 base columns (wizard §12), sheet **Source Traceability** with every
qualifying source row including duplicates and unread ones. Bilingual output
splits language-dependent columns into `(EN)` / `(TR)` without duplicating
question IDs. Use `office-excel-write` or `office-excel-report` — both ship in
this kit.

## Plain language is a hard rule

Every question must be answerable by a manager who does not know SAP. No
T-codes, no module abbreviations, no unexplained jargon **in the question text**.
The SAP reasoning belongs in the `Potential Config Area` and
`Related SAP Best Practice` columns, where a consultant reads it and the
customer does not have to.

## Not this skill

- **Writing the FS** once a decision is made — `fs-generator`.
- **Conceptual Design / BBP** from workshop notes — `bbp-creator`, which also
  carries the SAP Best Practice scope items per LOB.
- **"Have we built this before"** against the development library —
  `library-match`. That is object-level reuse; this is decision-level experience.
- **Anything touching a live SAP system.** This skill connects to nothing.
