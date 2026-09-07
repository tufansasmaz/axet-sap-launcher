---
name: ts-generator
description: >
  Use when the user asks to convert a SAP Functional Specification (FS) into a
  Technical Specification (TS), or says "FS to TS", "create TS from FS", "TS üret",
  "TS hazırla", "teknik spesifikasyon oluştur",
  "fonksiyonel spesifikasyondan teknik spesifikasyon oluştur", or provides a SAP FS
  PDF/document for technical analysis. Reads the project brief (CLAUDE.md) for the
  target system, SAP version, namespace and output language so the TS matches the
  project's reality without re-asking. Produces a Clean-Core-compliant, code-ready
  TS split into 5 parts and rendered to branded PDF (office-pdf) or editable Word
  (office-docx). Companion to fs-generator (which authors the FS this consumes).
  Triggers: FS, TS, functional specification, technical specification, WRICEF,
  Clean Core, Gap List, ts-generator, fs2ts (former name), teknik spesifikasyon.
---

# ts-generator — SAP Functional Spec → Technical Spec Converter

> Formerly named `fs2ts`; renamed 2026-08-02 for symmetry with `fs-generator`.

## Purpose

Analyze a SAP Functional Specification (FS) and produce a Technical Specification (TS)
that follows SAP Clean Core principles — detailed enough for a code-generation agent
(or a developer using `abapgit-workflow`) to implement directly, rendered to a branded
PDF or an editable Word document.

**IMPORTANT:** This skill is interactive. Ask the STEP 4 clarification round and wait
for answers BEFORE generating the TS.

## Project brief first (CRITICAL)

If the project root has a **`CLAUDE.md` project brief** (auto-loaded on NTT-managed
projects), it is the single source of truth for project facts — take these from it,
never re-ask, never invent:

- **Target platform:** SAP product + version (answers "Public/Private Cloud vs
  On-Premise, ABAP Cloud active?" — do not ask what the brief states).
- **System landscape** (DEV/QA/PRD SIDs) → feeds 2.13 Transport & Deployment Plan.
- **Namespace convention** → supplies the `<Prefix1>` (Z/Y) for the naming standard
  below; on conflict the brief wins. **Never put a concrete package name in a TS:**
  the package is the next free number in the development system when work starts,
  which nobody can know while the document is being written, and claiming one lets
  another development take it first. Write the `<ZPKG>` placeholder instead
  (NAMING_STANDARD §1.2) — package, program, includes, classes and structures all
  carry it, so one substitution resolves the whole document. A developer resolves
  it with three questions (module / package / transport) before the first object
  is created; that step belongs to the `sap-adt` skill, not to this one.
- **Output language** (else match the user; Turkish → Turkish). Preserve UTF-8.
- **Customer / project / module context** → TS header block.
- A brief field marked `[BİLİNMİYOR]` that the TS needs → ask the user, and remind
  once that the project lead should fill it centrally.

The brief governs *project facts*; the *requirement/technical content* comes only from
the FS and the user's answers.

## Skill Scripts

| Script | Language | Description |
|--------|----------|-------------|
| `scripts/extract_pdf.js` | Node.js | Extract text from a PDF FS (pdfjs-dist) |
| `scripts/merge_and_pdf.py` | Python | Merge the 5 TS parts and render the final PDF via office-pdf |
| `scripts/package.json` | — | Node.js dependencies |

## Requirements

- **Input:** FS document (PDF, text, or `fs-generator` output)
- **Output directory:** defaults to `./ts-output/` unless the user specifies one
- **First-time setup:**

```bash
cd <SCRIPTS> && npm install                                                  # PDF extraction
py -m pip install playwright markdown && py -m playwright install chromium   # PDF rendering
```

`merge_and_pdf.py` locates the `office-pdf` skill's `md_to_pdf.py` automatically
(override with `OFFICE_PDF_SCRIPT`).

---

## Writing style (readability is a feature, length is a cost)

The TS must read like a senior architect wrote it — precise, direct, no fat:

- **As short as the content allows.** Detail lives where the developer needs it
  (object list, logic, messages); everywhere else one clear sentence beats a
  paragraph. State a fact ONCE and reference it ("bkz. Part 3 §2.8") — never
  restate. A section with nothing to say is closed in one sentence.
- **Human voice, no AI smell.** Short active sentences; no actor-hiding passives.
  Banned: bureaucratic filler ("işbu", "söz konusu", "önem arz etmektedir"),
  marketing adjectives ("kapsamlı", "güçlü", "sorunsuz"), mechanical
  rule-of-three lists, information-free sentences.
- **Quiet formatting.** Bold only for critical terms; pseudocode and tables carry
  the precision — prose around them stays lean.
- **The deletion test:** if removing a sentence loses no information, remove it.

## WORKFLOW (APPLY IN ORDER — DO NOT SKIP STEPS)

### STEP 0: Resolve the scripts directory

Materialized NTT installs carry a preamble block at the top of this file naming
`SCRIPTS_DIR` — use it. In a classic Claude Code plugin install, the scripts are at
`${CLAUDE_PLUGIN_ROOT}/skills/ts-generator/scripts`. Below, `<SCRIPTS>` means that
resolved directory.

### STEP 1: Extract the PDF content

If the FS is a PDF:

```bash
node <SCRIPTS>/extract_pdf.js "<pdf_path>" "<output_txt>"
```

### STEP 2: Analyze the FS and build the Gap List

Extract from the FS:

1. **General information:** WRICEF ID (Jira ID), title, development type (Enhancement,
   Report, Interface, Conversion, Form, Workflow), requesting module. If the FS has no
   WRICEF/FS number, derive one from the brief's numbering scheme and tag it `[Öneri]`.
2. **Business requirement:** purpose summary, As-Is process, To-Be process, functional
   requirements (itemized).
3. **Technical clues:** table/field references, transaction codes, integration points.
4. **Gap List:** number every functional requirement (GAP-01, GAP-02, …).
5. **Open items:** list anything marked "Open Item", `[Açık Konu]`, "TBD", "?" or left
   ambiguous (fs-generator outputs collect these in their final section — read it).

Present a short summary to the user at the end of this step (WRICEF ID, title, module,
type, Gap List, open items).

**FS approval gate:** if the FS carries a document-control Status (`Durum`) field and
it is not `Onaylı`, warn the user: *"Bu FS hâlâ Taslak görünüyor — onaylanmamış
FS'ten TS üretmek rework riski taşır. Yine de devam edeyim mi?"* Proceed only on an
explicit yes. An external FS without a Status field gets one neutral note, not a block.

### STEP 3: Apply the Clean Core decision tree

For each Gap, evaluate the extensibility levels in order and pick the **lowest** viable one:

| Level | Name | Use when |
|-------|------|----------|
| 1 | Key User Extensibility (custom field, BRFplus, Fiori adaptation) | Solvable without code |
| 2 | Developer Extensibility / In-App (RAP, Released API, ABAP Cloud) | A released API exists |
| 3 | Side-by-Side (BTP: CAP, Integration Suite) | UI/integration-heavy |
| 4 | Classic Extensibility (BAdI, User-Exit, Enhancement) | The above are insufficient |

Rules: always choose the lowest level **viable on the brief's target platform** (e.g.
Level 4 classic enhancements do not exist on Public Cloud); write a Clean Core exception
justification whenever Level 4 is used; **NEVER** recommend modifying a SAP standard
object. Record the decision rationale per Gap.

**Mandatory release-status verification (not optional):** every STANDARD SAP object
the TS relies on — tables read, BAPIs/FMs called, BAdIs implemented, released
APIs/CDS consumed — is verified through the `clean-core` skill BEFORE the TS is
written. Use its batch compliance check (one call for the whole list, e.g.
`clean_core_checker.py compliance MARA,BSEG,BADI_SD_SALES_BASIC`). The result goes
into the §1.3 table as an evidence column — **Release Durumu: Released / Not
released (ikame: …) / Doğrulanamadı** — so a reviewer sees at a glance that no
release claim was invented. "Doğrulanamadı" (checker offline) is an honest state;
an UNVERIFIED claim presented as fact is a defect.

**Two taxonomies, one sentence apart — do not conflate:** the L1–L4 tree above
answers *"which extensibility path?"*; `NAMING_STANDARD.md` §0's A–D levels answer
*"how clean is the chosen technology?"* (roughly: L1–L3 land in A, classic-API
work in B, discouraged objects in C–D). Use L1–L4 for the decision, A–D only when
the naming standard or brief refers to it.

### STEP 4: ONE clarification round (CRITICAL — ALWAYS BEFORE THE TS)

**⚠️ Do not generate the TS before the user answers.** Ask everything as **ONE numbered
question list** mapped to the Gap List — not one question at a time — and do NOT ask
anything the brief or the FS already answers. Cover what is genuinely open among:
functional/data detail (mandatory vs optional fields, data volume, existing Z/Y
objects), integration (released API/BAPI/CDS, sync vs async), UI (Fiori Elements vs
freestyle vs backend-only), authorization (new auth object vs existing role),
enhancement detail (which spot/BAdI/User-Exit, filter-dependent?),
performance/volume/scheduling, and each FS open item (resolved, assume, or blocker?).

**Then STOP and wait.** If answers arrive only partially, mark the still-assumed points
explicitly in the TS "Assumptions / Open Items" section — never assume silently. If the
user says "proceed as draft", tag every gap-fill as `[Varsayım]`.

### STEP 5: Generate the TS (5 parts)

**Only after the user has answered.** Create these files in the output directory.
**Every Z/Y object name in the TS comes from `references/NAMING_STANDARD.md`** (next
to this SKILL.md) — the NTT DATA/TR corporate naming standard with per-object-type
formulas (classic, CDS/RAP, integration, Public Cloud, workflow). Its section 7 "AI
İçin Uygulama Kuralları" is binding: no "isim TBD", consistent `<Description>` across
one logical group, the equality rules (a metadata extension carries the same name as
the view it extends — this REVERSED with guideline v2.0 on 2026-08-15, it used to
require `_MX_` and a different name), and a "teyit gerekli" note whenever a type has
no formula. The header block comes from the brief.

**Two object types cannot be created through ADT at all** — a developer reading the TS
will hit a 404 and may conclude the design is impossible. When the Object List contains
either, add a one-line note next to it in section 2.1 naming the generator, so the reader
knows there is a route:

| In the TS | Prefix2 | Route for the developer |
|---|---|---|
| Adobe Form / Adobe Interface | `AF` / `IF` | `sap-consultant/adobe-gen` (layout still LiveCycle) |
| Classic Dynpro / GUI status / titlebar | — | `sap-consultant/screen-gen` |

Both need a one-time generator FM in the target system. Do **not** name a package for
them either — `<ZPKG>` applies here as everywhere (§1.2); the generators take the package
and transport as parameters, resolved by the three questions when work starts.

- `<WRICEF_ID>-TS-Part1-Header.md` — Header block (customer/project/module from the
  brief; *project* is the brief's **Proje adı**, never the folder name or the
  `project:` code — those are technical identifiers), Roles & Revision tables, 1. Technical Context (Overview, Technical
  Architecture Mermaid, Clean Core Assessment + decision table, Assumptions incl. user
  answers, Dependencies)
- `<WRICEF_ID>-TS-Part2-Solution.md` — 2.1 Object List (with a **Doğrulama** column,
  filled in STEP 5a), 2.1a Class/Interface method signatures (full ABAP), 2.1b CDS/RAP
  detail, 2.2 Data Model & Structures
- `<WRICEF_ID>-TS-Part3-Logic.md` — 2.3 Input, 2.4 Output, 2.5 Processing Logic (numbered
  pseudocode per method), 2.5a Enhancement/BAdI detail, 2.6 UI design, 2.7 Validation (full
  message texts), 2.8 Error Handling (exception classes, TRY-CATCH, full message texts)
- `<WRICEF_ID>-TS-Part4-Test.md` — 2.9 Data Mapping, 2.10 Authorization, 2.11
  Non-Functional Requirements, 2.12 Test Scenarios (step-by-step), 2.13 Transport &
  Deployment Plan (landscape from the brief), 2.14 Appendix
- `<WRICEF_ID>-TS-Part5-Diagrams.md` — 2.15 Definition of Done checklist, 3. Mermaid
  diagrams (flowchart, classDiagram, erDiagram, sequenceDiagram, stateDiagram-v2,
  deployment, error-handling — at least 5 types), 4. Summary

### STEP 5a: Verify the object list against the system (SKIP CLEANLY IF OFFLINE)

**First decide whether there is a system at all.** No `.conn_adt`, no `adt_sql`, VPN
down, or the first query errors → **stop this step immediately**, write
`— doğrulanamadı` in every verification cell, and carry on. That is a supported
outcome, not a degraded one: a TS is often written before anyone has a system.
**Never ask the user to set up a connection in order to write a TS**, and never let
this step change what the TS says when it cannot run.

With a connection, verify the whole §2.1 list in **six or seven `adt_sql` calls
whatever its size** — one per catalog table, each carrying an `IN` list, read as a
set difference. The queries, the reasoning and the traps are in
[`references/SYSTEM_VERIFICATION.md`](references/SYSTEM_VERIFICATION.md); use them
as written, in particular the second `IN` list on `FUPARAREF` (without it one BAPI
returns 57 rows).

Two readings of the same result:

- **consumed** standard objects — tables and their fields, FMs and their parameter
  names *and directions*, data elements, domains, classes, CDS → must exist;
- **created** `Z`/`Y` names this TS invents → must **not** exist; one that does is a
  name collision, and it is one edit now against a rename across five parts later.

Fill the §2.1 verification column: `✓ doğrulandı` · `✗ bulunamadı` ·
`⚠ ad çakışması` · `— doğrulanamadı`. **A `✗` or `⚠` is a defect in the TS — fix it
here, before the self-check.** It is not a warning to pass on to the developer.

This is read-only, catalog tables only, through the `sap-adt-readonly` surface every
TS-writing role already installs. It does not replace the §1.3 Clean Core column:
*"exists on this system"* and *"released for ABAP Cloud"* are different questions and
both columns stay.

### STEP 5b: Self-check (MANDATORY — before showing anything to the user)

Silently verify the five parts and FIX what fails; the user sees only the one-line
result:

1. Every object in 2.1 Object List is named by a `references/NAMING_STANDARD.md`
   formula, within MaxLen, equality rules held (metadata extension = the name of the
   view it extends; BDEF root `_R_`, BDEF projection `_C_`), consistent
   `<Description>` across the logical group.
2. Every 2.1 object is actually detailed in the later sections; every GAP maps to at
   least one object AND at least one test scenario (traceability chain unbroken).
3. Message texts are complete (class/number + full text); pseudocode is numbered;
   at least 5 Mermaid diagram types render.
4. Header block matches the brief; platform-inviable proposals absent (e.g. no
   Level 4 on Public Cloud); Clean Core exceptions justified; **every standard SAP
   object in the TS appears in the §1.3 evidence column with a verified release
   status** (or an honest "Doğrulanamadı") — no unverified release claims.
5. Every §2.1 row carries a **Doğrulama** value from STEP 5a — `✓ doğrulandı`,
   `✗ bulunamadı`, `⚠ ad çakışması` or `— doğrulanamadı`. An empty cell is a missed
   step; a `✗` or `⚠` still present is a defect that must not ship.
6. No unanswered STEP 4 point without an explicit `[Varsayım]`/Assumption entry.
7. Language uniform per the brief; UTF-8 intact.
8. Writing-style pass done: repetition and filler removed, empty-by-design
   sections closed in one sentence, actor-less passives rewritten (see
   "Writing style" above).

### STEP 6: Merge the parts and render

```bash
py <SCRIPTS>/merge_and_pdf.py <output_dir> [wricef_id] [title]    # branded PDF
```

For an **editable Word** deliverable, hand the merged
`<WRICEF_ID>-Teknik-Spesifikasyon.md` to the `office-docx` skill:

```
build_docx.py --input <merged.md> --output <merged.docx>
              --title "<kısa iş başlığı>"
              --eyebrow "Teknik Spesifikasyon"
              --classification "Confidential — Customer Restricted"
```

`--title` is the **business** title, not the WRICEF id: it also becomes the
footer's left slot, which is what names the document on a page torn out of a
printed copy, and `ZFI015` alone tells a reader nothing. The NTT mark is placed
in the header of every page automatically — pass nothing for it.

### STEP 7: Review briefing (what the user actually reads — NEVER dump the TS)

Present a compact briefing in chat, nothing more:

1. One result line: WRICEF ID, title, 5 parts + merged file path.
2. One self-check line (e.g. `Öz-denetim: 2.1'deki 8 nesnenin 8'i standarda uygun ·
   izlenebilirlik zinciri tam · 6 Mermaid`).
3. **"SENİN KARARIN GEREKEN N NOKTA"** — every Assumption, open item, Clean Core
   exception and `teyit gerekli` naming note as a numbered one-liner with its
   part/section reference. This list is the review surface.
4. A reading map: 2.1 Object List + Clean Core decision table (read), processing
   logic (skim per interest), diagrams/boilerplate (reference).

Iterate in dialogue; keep the TS header Status `Taslak` until the user explicitly
approves.

### STEP 8: Offer a two-page technical summary (OPTIONAL — the user decides)

The briefing above lives in chat and dies with the session. A merged TS is ~35 pages,
and the lead assigning the work, the ABAP developer picking it up and the reviewer all
need the same few answers. Offer a separate document — **ask, do not assume** — as one
line at the end of the STEP 7 briefing:

> Bir de **2 sayfalık teknik özet** ister misin? Ne inşa edilecek, nerede risk var,
> karar bekleyen maddeler ve nereye bakılacağı. (`<WRICEF_ID>-TS-Ozet.md`)

Only if the user says yes:

1. Build it from `references/TS_OZET_TEMPLATE.md`. It is **not a shortened TS** — a
   miniature of the five parts fails the job. Follow the template's shape and budgets.
2. The decision list is the same list as the briefing's "SENİN KARARIN GEREKEN N
   NOKTA" — every Assumption, open item, Clean Core exception and `teyit gerekli`
   naming note. There, spoken; here, permanent. Nothing may be dropped to save space;
   cut prose first.
3. Object names carry the `<ZPKG>` placeholder, exactly as in the TS (§1.2). A summary
   never invents a concrete package name the TS deliberately left open.
4. Save as `<output_dir>/<WRICEF_ID>-TS-Ozet.md`.
5. **Measure it — the length rule is not advisory:**

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/summary_check.py" <ozet.md> --kind ts
```

   FAIL means cut and re-run. The budget is calibrated against real renders; the
   usual overrun is a wrapping table cell, which is why decisions are a numbered
   list. If the object table exceeds 18 rows, keep the ones carrying logic and close
   with `+ N destekleyici nesne (tam liste: Part2 · 2.1)` — a developer needs the
   shape of the build, not a second copy of 2.1.
6. Render it the same way as the TS if the user wants PDF/Word.

## Output files

```
<output_dir>/
├── <WRICEF_ID>-TS-Part1-Header.md
├── <WRICEF_ID>-TS-Part2-Solution.md
├── <WRICEF_ID>-TS-Part3-Logic.md
├── <WRICEF_ID>-TS-Part4-Test.md
├── <WRICEF_ID>-TS-Part5-Diagrams.md
├── <WRICEF_ID>-Teknik-Spesifikasyon.md    (merged)
├── <WRICEF_ID>-Teknik-Spesifikasyon.pdf   (final output)
└── <WRICEF_ID>-TS-Ozet.md                 (OPTIONAL — only if the user asked, STEP 8)
```

## Critical rules

1. **Project facts come from the brief; technical content from the FS and answers.**
   Neither is ever invented.
2. **Do not generate the TS without the STEP 4 round and its answers.**
3. Every object in the 2.1 Object List must be detailed in later sections and named
   by the formulas in `references/NAMING_STANDARD.md` (brief supplies Prefix1/PkgNo).
4. Include complete message texts (message class/number **and** full text with placeholders).
5. Use numbered pseudocode, code-translatable, per method.
6. Include at least 5 Mermaid diagram types.
7. Preserve UTF-8 characters (ı, ğ, ş, ç, ö, ü, İ).
8. Document the Clean Core exception justification whenever Level 4 is used.
9. Mark any point the user did not answer as an explicit "Assumption".

## Error cases

| Error | Fix |
|-------|-----|
| `pdfjs-dist` not found | `cd <SCRIPTS> && npm install` |
| office-pdf not found | Ensure the **office-tools** plugin/skills are installed (or set `OFFICE_PDF_SCRIPT` to its `md_to_pdf.py`) |
| Mermaid render timeout | Reduce/simplify the diagrams |
| Turkish characters garbled | Ensure UTF-8 encoding throughout |
| PDF contains only filenames | Use `merge_and_pdf.py` — do not pass part files individually |

## References

- `references/SYSTEM_VERIFICATION.md` — the seven catalog queries STEP 5a runs, why each
  is filtered the way it is, and the rule that no connection means the TS is written
  exactly as before
- `references/NAMING_STANDARD.md` — the binding NTT DATA/TR naming standard for every
  Z/Y object the TS names (tokens, per-type formulas, package hierarchy, ZNT shared
  packages, AI application rules)
- [SAP Clean Core Extensibility Guide](https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/clean-core)
- The `fs-generator` skill (sap-specs plugin) — authors the FS this skill consumes
- The `clean-core` skill (sap-specs plugin) — verify object release status
- The `office-pdf` / `office-docx` skills (office-tools plugin) — PDF / Word rendering
- To *deliver* the resulting ABAP, use the `abapgit-workflow` skill (abapgit-bridge
  plugin, developer-in-the-loop) or the sap-adt agent directly
