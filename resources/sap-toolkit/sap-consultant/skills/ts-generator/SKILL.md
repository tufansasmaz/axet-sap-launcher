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
  For an interface it also writes the PO/CPI team's integration detail sheet (.xlsx),
  and for a pure middleware flow with nothing built in SAP, that sheet alone.
  Triggers: FS, TS, functional specification, technical specification, WRICEF,
  Clean Core, Gap List, ts-generator, fs2ts (former name), teknik spesifikasyon.
---

# ts-generator — SAP Functional Spec → Technical Spec Converter

> **NTT Studio uyarlaması — `${CLAUDE_PLUGIN_ROOT}` yok.** Eklenti kökü diye bir şey ve o
> ortam değişkeni bu dağıtımda tanımlı değil. Aşağıda `${CLAUDE_PLUGIN_ROOT}/scripts/`
> geçen her yerde proje kökündeki **`.axet-code/scripts/`** oku (`summary_check.py` oraya
> kuruluyor); `${CLAUDE_PLUGIN_ROOT}/skills/<ad>/scripts` ise
> **`.axet-code/skills/<ad>/scripts`**.

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
- **Clean Core profile:** the front-matter line `clean_core:` (`public`, `s4-strict`,
  `s4-balanced`, `s4-legacy`, `ecc`). It decides what STEP 3 may propose and how §1.3
  words each object. The rules are **not in this file**: read the `clean-core` skill's
  `references/PROFILES.md`. No line in the brief → ask once and remind that the project
  lead sets it centrally; no answer → the strictest profile of the brief's platform,
  with the sentence PROFILES.md gives, at the top of §1.3.
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
- **Output language** (else match the user; Turkish → Turkish). Preserve UTF-8. **Every
  fixed word follows it** — `Doküman Kontrolü`, the §1.3 table columns, the Doğrulama
  values, the tags, `Karar bekleyen noktalar`: an English TS uses the English column of
  [`references/DOCUMENT_LANGUAGE.md`](references/DOCUMENT_LANGUAGE.md), and no Turkish
  heading or label stays in it (nor an English one in a Turkish TS).
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
  paragraph. State a fact ONCE and reference it by section ("bkz. §2.8") — never
  restate. A section with nothing to say is closed in one sentence.
- **The five parts are how the TS is written, not how it is read.** The reader
  gets one merged document with no "Part 3" in it, so a reference is `§2.8`,
  never `Part 3 §2.8` (a sample TS shipped with "bkz. Part 5 §4 karar 6").
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

1. **General information:** WRICEF ID (Orbit key), title, development type (Enhancement,
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

**An integration?** Development type Interface, a middleware named (PO, CPI, Integration
Suite) or a connection method (IDoc, Proxy, REST, SOAP, RFC, file transfer): the
integration team's sheet is written too — `references/INTEGRATION_SHEET.md`, read it now.
Say so in the summary (*"Entegrasyon: evet — entegrasyon detayı da yazılacak"*). With no
SAP object to create or change it is the **integration-only** path described there: the
sheet instead of the five parts.

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

Rules: always choose the lowest level that can do the job. **Which levels exist, and
which need a written reason, is the brief's Clean Core profile** — PROFILES.md, table
"Extension technique per profile": Level 4 does not exist on `public`, is an exception
with a written reason on `s4-strict`, and is ordinary work on `s4-balanced` and
`s4-legacy`. A modification, an implicit enhancement or a direct write to a standard
table is never proposed for new development on any profile. Record the decision
rationale per Gap.

**On `public` this is a different document, not a stricter one.** Before writing
anything, read the `clean-core` skill's `references/PUBLIC_CLOUD.md` and follow its
section "What this changes in a TS": the object list, the UI, authorization, transport
and the verification step all change shape.

**Mandatory release-status verification (not optional):** every STANDARD SAP object
the TS relies on — tables read, BAPIs/FMs called, BAdIs implemented, released
APIs/CDS consumed — is verified through the `clean-core` skill BEFORE the TS is
written. One call for the whole list, **with the brief's profile and release**, with
`--json` (the script lives in the clean-core skill's own `SCRIPTS_DIR`, e.g.
`clean_core_checker.py MARA BSEG BADI_SD_SALES_BASIC --profile s4-balanced --s4core 108
--sp 3 --json`; add `--system-type on_premise` for an on-premise brief; the clean-core
SKILL.md maps a brief's product and release to these flags). Without a target the
checker answers for Public Cloud and says so — that answer does not belong in a Private
Cloud or on-premise TS. On `ecc` the call is not made: SAP publishes no release list for
ECC, the column reads `Ölçülmez (ECC)` and one sentence under the table says why.

The result goes into the §1.3 table as two evidence columns, read **per object** from
the JSON — never from the run's summary line. **Seviye** is the object's own level and
state (`C, notToBeReleased`). **Karar** is the profile's `decision` for it, in the
wording PROFILES.md gives ("What each decision means"):

| `decision` | Karar |
|---|---|
| `free` | `Serbest` (`Released` for a level A object) |
| `reason` | `Gerekçeyle — <gerekçe>`; the reason names the successor that was not taken |
| `approval` | `İstisna — onay bekliyor` |
| `note` | `Listelendi` (+ `ikame: <successor>` when SAP names one) |
| `forbidden` | `Yasak (ikame: <successor>)` — `(ikame yok)` when none. **The design must not use it:** take the successor or redesign, then re-run |
| `no_new` | `Yeni kullanım yasak` — a TS describes new development, so this is `Yasak` here |
| `blocked` | `Doğrulanamadı — doğrulanana kadar kullanılmaz`; the object is an open item, not a building block |
| `unverified` | `Doğrulanamadı` + the reason: *çevrimdışı*, or *SAP deposunda kayıt yok* |

A run with no `decision` in it was made without `--profile`; do not ship its answer.
Every `reason` and `approval` row is also a line in STEP 7's decision list. A TS that
still contains a `forbidden` or `no_new` object after the self-check is defective.

Above the table, one line naming the profile (*Clean Core profili: `s4-balanced`*); under
it, the checker's **Source** and **Target** (e.g. *ROSA, 2026-10-01 · private_cloud /
2025_1 / profile s4-balanced*). An offline `NOT ALLOWED, unverified` from the bundled
snapshot is still `Doğrulanamadı` — at most with *(çevrimdışı; paket verisi: not
released)* after it. Exit code 3 means at least one row is `Doğrulanamadı`; that is an
honest state, not a failure. An UNVERIFIED claim presented as fact is a defect.

**Two taxonomies, one sentence apart — do not conflate:** the L1–L4 tree above
answers *"which extensibility path?"*; the A–D letters answer *"what did SAP say about
this object?"*. The profile sets both, in separate columns of PROFILES.md: `classic_ext`
and `modification` govern the tree, the letter columns govern the objects. Write the
A–D letter of the chosen solution in §1.3 as well (NAMING_STANDARD §0): the corporate
checklist asks for it.

### STEP 4: ONE clarification round (CRITICAL — ALWAYS BEFORE THE TS)

**⚠️ Do not generate the TS before the user answers.** Ask everything as **ONE numbered
question list** mapped to the Gap List — not one question at a time — and do NOT ask
anything the brief or the FS already answers. Cover what is genuinely open among:
functional/data detail (mandatory vs optional fields, data volume, existing Z/Y
objects), integration (released API/BAPI/CDS, sync vs async), UI (Fiori Elements vs
freestyle vs backend-only), authorization (new auth object vs existing role),
enhancement detail (which spot/BAdI/User-Exit, filter-dependent?),
performance/volume/scheduling, and each FS open item (resolved, assume, or blocker?).

**An integration** (STEP 2): the sheet's questions join the SAME list, after the TS
questions, under their own heading — `references/INTEGRATION_SHEET.md`, *The questions*.
What the FS answers is shown to confirm, not asked.

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

**On `public`** the five parts keep their numbers and their job, with the content
PUBLIC_CLOUD.md describes: §2.1 lists only object types the platform has and gains an
**Uzantı türü** column, §2.6 pictures Fiori screens, §2.10 is IAM app and business
catalog, §2.13 is tenants and software collections. The two paragraphs below (generator
routes, naming of classic objects) do not apply there.

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

- `<WRICEF_ID>-TS-Part1-Header.md` — `## Doküman Kontrolü` (unnumbered) holding the
  header table (customer/project/module from the
  brief; *project* is the brief's **Proje adı**, never the folder name or the
  `project:` code — those are technical identifiers) and, as its `###`
  sub-headings, Roles & Revision. Never `###` straight under the `#` title: the
  levels jump and the contents list opens with two orphan lines. Then 1. Technical Context (Overview, Technical
  Architecture Mermaid, Clean Core Assessment + decision table, Assumptions incl. user
  answers, Dependencies)
- `<WRICEF_ID>-TS-Part2-Solution.md` — 2.1 Object List (with a **Doğrulama** column
  when STEP 5a ran), 2.1a Class/Interface method signatures (full ABAP), 2.1b CDS/RAP
  detail, 2.2 Data Model & Structures
- `<WRICEF_ID>-TS-Part3-Logic.md` — 2.3 Input, 2.4 Output, 2.5 Processing Logic (numbered
  pseudocode per method), 2.5a Enhancement/BAdI detail, 2.6 UI design **with a picture
  of every screen** (below), 2.7 Validation (full
  message texts), 2.8 Error Handling (exception classes, TRY-CATCH, full message texts)
- `<WRICEF_ID>-TS-Part4-Test.md` — 2.9 Data Mapping, 2.10 Authorization, 2.11
  Non-Functional Requirements, 2.12 Test Scenarios (step-by-step), 2.13 Transport &
  Deployment Plan (landscape from the brief), 2.14 Appendix
- `<WRICEF_ID>-TS-Part5-Diagrams.md` — 2.15 Definition of Done checklist, 3. Mermaid
  diagrams (flowchart, classDiagram, erDiagram, sequenceDiagram, stateDiagram-v2,
  deployment, error-handling — at least 5 types), 4. Summary

#### §2.6 User interface: every screen as a picture

A development with a screen — a selection screen, an ALV list, a Dynpro, a popup, a
Fiori app — shows each one in §2.6 **as a picture**, not only as a field list. Until
2026-09-29 the FS carried the mock-up pictures (fs-generator §7) and the TS did not,
so the developer read the screen in one document and its logic in another.

1. **The FS has pictures → the same pictures.** Take the image lines from the FS's
   section 7 (or the `ekran-maketi-<konu>-*.png` beside the FS or in the project's
   mock-up folder when the FS came as a PDF) and reuse them, one per screen, with the
   same order and names. Do not redraw a screen the customer already approved.
2. **No pictures, but a screen → draw it.** Build the mock-up with `screen-mockup`
   from the FS's field and column lists (its skeleton, its house style) and run
   `mockup.py <src.html> --fs-dir <TS output folder>`: it writes one PNG per screen
   and popup and prints the image lines relative to the TS. Say in §2.6 that the
   picture was drawn for the TS and has not been through the customer.
3. **Under each picture, the TS's own detail** — what the FS does not say:
   - selection screen: each parameter / select-option → data element, obligatory,
     default, F4 source, `AT SELECTION-SCREEN` checks with their messages (§2.7);
   - ALV: the field catalogue (column → field, data element, key / hotspot / sum /
     edit), layout variant, toolbar buttons with their function codes and handlers;
   - Dynpro / popup: screen number (§3.2 of the naming standard), PBO / PAI modules,
     GUI status and function codes, the fields and their checks.
4. **No screen at all** (an interface, a background job, a BAdI): §2.6 is closed in
   one sentence, as any empty-by-design section.

If `screen-mockup` is not installed for this role, write §2.6 as text, say that the
screens are not pictured, and name the skill that would draw them — do not leave the
section looking complete.

### STEP 5a: Verify the object list against the system (SKIP CLEANLY IF OFFLINE)

**On `public` this step does not run:** its catalog queries are not possible on that
platform. Leave the Doğrulama column out and write *"Nesne listesi sistemde
doğrulanmadı: Public Cloud'da katalog tabloları okunamaz; doğrulama §1.3'teki release
kontrolüdür."* above the §2.1 table.

**First decide whether there is a system at all.** No `.conn_adt`, no `adt_sql`, VPN
down, or the first query errors → **stop this step immediately**, leave the
**Doğrulama column out of §2.1** and put one sentence above the table instead
(*"Nesne listesi sistemde doğrulanmadı: bağlantı yoktu."*), and carry on. A column
holding the same "— doğrulanamadı" thirty times says it thirty times and squeezes
the columns that carry the design. That is a supported
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
`⚠ ad çakışması` · `— doğrulanamadı` (the last only for an object type with no
cheap check). **A `✗` or `⚠` is a defect in the TS — fix it
here, before the self-check.** It is not a warning to pass on to the developer.

This is read-only, catalog tables only, through the `sap-adt-readonly` surface every
TS-writing role already installs. It does not replace the §1.3 Clean Core column:
*"exists on this system"* and *"released for ABAP Cloud"* are different questions and
both columns stay. Nor does one fill the other: `✓ doğrulandı` here never turns a
§1.3 `Doğrulanamadı` into `Released`.

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
4. Header block matches the brief; **§1.3 names the brief's Clean Core profile** and
   nothing in the TS goes beyond it — no technique the profile's row forbids (no
   Level 4, report, Dynpro or classic transport on `public`), no object whose Karar is
   `Yasak` or `Doğrulanamadı — doğrulanana kadar kullanılmaz` used as a building
   block; every `Gerekçeyle` row carries its reason and every `İstisna` row is in the
   STEP 7 list; **every standard SAP object in the TS appears in the §1.3 evidence
   columns** (Seviye + Karar, or an honest "Doğrulanamadı") — no unverified release
   claims; the Source/Target line is present, the target is the brief's and it names
   the profile.
5. If STEP 5a ran, every §2.1 row carries a **Doğrulama** value — `✓ doğrulandı`,
   `✗ bulunamadı`, `⚠ ad çakışması` or `— doğrulanamadı`. An empty cell is a missed
   step; a `✗` or `⚠` still present is a defect that must not ship. If it did not
   run, the column is absent and the sentence above the table says why.
6. No unanswered STEP 4 point without an explicit `[Varsayım]`/Assumption entry.
7. Language uniform per the brief, **including every heading, table column, status
   word and tag** (`references/DOCUMENT_LANGUAGE.md`); UTF-8 intact.
8. No "Part N" left in the text; references are by section (`§2.8`).
9. Every screen the development has is pictured in §2.6 (the FS's pictures, or drawn
   with screen-mockup), each followed by its TS-level detail; or §2.6 says why not.
10. Writing-style pass done: repetition and filler removed, empty-by-design
   sections closed in one sentence, actor-less passives rewritten (see
   "Writing style" above).

### STEP 6: Merge the parts and render

```bash
py <SCRIPTS>/merge_and_pdf.py <output_dir> [wricef_id] [title] [--lang tr|en]    # branded PDF
```

For an **editable Word** deliverable, hand the merged
`<WRICEF_ID>-Teknik-Spesifikasyon.md` to the `office-docx` skill:

```
build_docx.py --input <merged.md> --output <merged.docx>
              --title "<kısa iş başlığı>" --lang <tr|en>
              --eyebrow "<Teknik Spesifikasyon | Technical Specification>"
              --classification "<Gizli — Müşteriye Özel | Confidential — Customer Restricted>"
```

`--lang` sets the contents heading and the footer's page word (İçindekiler / Sayfa,
Contents / Page); the eyebrow and classification per language are in
`references/DOCUMENT_LANGUAGE.md`. The PDF script takes the same flag:
`merge_and_pdf.py <output_dir> [wricef_id] [title] --lang <tr|en>`.

`--title` is the **business** title, not the WRICEF id: it also becomes the
footer's left slot, which is what names the document on a page torn out of a
printed copy, and `ZFI015` alone tells a reader nothing. The NTT mark is placed
in the header of every page automatically — pass nothing for it.

### STEP 6a: The integration sheet (integrations only)

Write `<WRICEF_ID>-Entegrasyon-Detay.json` from the answers and render it with
`integration_sheet.py` (`references/INTEGRATION_SHEET.md`, *Writing the sheet*), in the
TS's language. Every field carries its honest source; a derived value is `proposal`, an
unknown one `open` — never a guess that makes the sheet look complete. Check it against
the TS before the briefing: sync/async, the methods and the systems must agree.

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
5. **The summary offer — ALWAYS the last line of the briefing, every TS (STEP 8):**

   > Bir de **2 sayfalık teknik özet** ister misin? Ne inşa edilecek, nerede risk var,
   > karar bekleyen maddeler ve nereye bakılacağı. (`<WRICEF_ID>-TS-Ozet.md`)

   The briefing is not finished without it. Module consultants reported on 2026-10-09
   that it was not always asked: it used to sit in STEP 8, after the approval section,
   under the word OPTIONAL, and a run that thought it was done at the briefing skipped
   it. The *document* is optional; the *question* is not. Not for the integration-only
   path: there is no TS to summarise, and the sheet is one page.

Iterate in dialogue; keep the TS header Status `Taslak` until the user explicitly
approves. **Before asking for approval, check the offer was made** — if the briefing
went out without it, make it now. Record `summary_offered` (and the answer) in
`.axet-code/state/ts-generator.json` so a restarted run does not ask twice or skip it.

### Approve and save to the project store

When the person is satisfied, ask whether they approve this TS — in the
wording and under the rules of the **`project-store`** skill, which owns them.
In short: show the file(s), the project code and the destination first, ask
once, and save only on an explicit yes. Silence or "sonra" is not a yes.

**Order matters.** The TS header Status is `Taslak` until now; it becomes the approved status. Update it, **re-render the Word file, and only
then save** — the record hashes the saved bytes, so saving first would store an
"approved" document that still says draft inside.

```bash
py <project-store SCRIPTS>/project_store.py save --kind TS \
    --file <ts.docx> --file <ts.md> --skill ts-generator --approved
```

An integration adds `--file <WRICEF_ID>-Entegrasyon-Detay.xlsx` to the same save; the
integration-only path saves the .xlsx alone.

Run it from the project folder. Relay the result as `project-store` describes —
in particular, exit 3 means **nothing was saved** (the Projects folder is not
synced here), which must never be reported as success.


### STEP 8: The two-page technical summary (the offer is mandatory, the document is the user's choice)

The briefing above lives in chat and dies with the session. A merged TS is ~35 pages,
and the lead assigning the work, the ABAP developer picking it up and the reviewer all
need the same few answers. **The offer is item 5 of the STEP 7 briefing and is made on
every TS**; ask, do not assume.

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

## Surviving a restart

aXet.code can lose the conversation after an LLM error (a 429 rate limit, a dropped
connection) and start the same task again with no new message from the person —
measured three times in one Fast Scan run on 2026-09-25, each time asking twenty
minutes of answers again. So this skill keeps its own record on disk:

- **`.axet-code/state/ts-generator.json` in the project folder.** Every answer the person
  gave (in their words), every choice settled, the source files in use, the steps
  finished with their output files, and `next` — the step to do now. Write it the
  moment one of these changes, not at the end.
- **Read it first, on every run.** If it exists and is not `"complete": true`, say in
  one line what you are reusing and continue from `next`; ask only what it does not
  hold. A run that begins again without a new request from the person is exactly
  this case — never ask again what the file already answers.
- **Close it** with `"complete": true` when the deliverable is done. A new request
  for another deliverable renames the old file with its date and starts a new one.
- Decisions and paths only: no document text, no source content, nothing the
  person did not type.

For this skill that is: the FS it starts from, the objects and naming settled
against the project brief, the answers given, the sections written, and the
output file.


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
├── <WRICEF_ID>-TS-Ozet.md                 (OPTIONAL — only if the user asked, STEP 8)
├── <WRICEF_ID>-Entegrasyon-Detay.json     (integrations only — the answers, STEP 6a)
└── <WRICEF_ID>-Entegrasyon-Detay.xlsx     (integrations only — the PO/CPI team's sheet)
```

Integration-only: the two `Entegrasyon-Detay` files, and no Part 1–5.

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
8. The brief's Clean Core profile governs: what it forbids is not proposed, what it
   allows with a reason carries the reason, what it calls an exception waits for the
   project lead. The rules are in the `clean-core` skill's `references/PROFILES.md`,
   never restated from memory.
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

- `references/INTEGRATION_SHEET.md` — the integration team's sheet: when it is written,
  its questions, the integration-only path, and `scripts/integration_sheet.py`
- `references/SYSTEM_VERIFICATION.md` — the seven catalog queries STEP 5a runs, why each
  is filtered the way it is, and the rule that no connection means the TS is written
  exactly as before
- `references/NAMING_STANDARD.md` — the binding NTT DATA/TR naming standard for every
  Z/Y object the TS names (tokens, per-type formulas, package hierarchy, ZNT shared
  packages, AI application rules)
- [SAP Clean Core Extensibility Guide](https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/clean-core)
- The `fs-generator` skill (sap-specs plugin) — authors the FS this skill consumes
- The `clean-core` skill (same plugin) — verify object release status for the brief's
  target; its `references/PROFILES.md` holds the Clean Core profiles and
  `references/PUBLIC_CLOUD.md` what a TS looks like on Public Cloud
- The `office-pdf` / `office-docx` skills (office-tools plugin) — PDF / Word rendering
- To *deliver* the resulting ABAP, use the `abapgit-workflow` skill (abapgit-bridge
  plugin, developer-in-the-loop) or the sap-adt agent directly
