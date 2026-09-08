---
name: bbp-creator
description: Use when the user asks to create/generate a SAP Conceptual Design / Business Blueprint (BBP) Solution Document from meeting notes, Fast Scan analyzer Q&A, workstream plans or a requirements/ister list — "create BBP", "generate conceptual design document", "BBP oluştur", "konsept tasarım dokümanı hazırla", "solution document yaz", "blueprint hazırla". Works for ANY SAP module (MM, SD, FI/CO, PP, QM, PM, HR, PS, EWM, …) — detects the module(s) from the source documents, no need to state it. Produces a Word document in the fixed five-section shape (Purpose / Analysis with a strict current-state section / Best Practice Process Flow with Scope Item IDs and Fit-Gap / Functional Design / Developments), either one document with a chapter per topic or one document per scope item. Ranks conflicting sources by recency, keeps every open point in one table rather than as prose caveats, and traces content to requirement IDs when an ister list exists.
---

# Solution Document (BBP) Generator

## When to use this skill

Use this skill when the user provides project input documents — meeting notes,
Fast Scan analyzer Q&A (Excel), workstream (WS) plans, requirement/ister lists —
and asks for a **Conceptual Design / Business Blueprint (BBP) Solution
Document** in Word format, following the customer's fixed template.

This skill is **module-agnostic**: it was piloted on Materials Management
(MM), but the document structure and workflow below apply identically to any
SAP module or LOB (SD, FI/CO, PP, QM, PM, HR, PS, EWM,
etc.). Never hard-code MM-specific assumptions — always derive the module
and its content from the current set of source documents.

## When this skill is not the right tool

A BBP is a **conceptual design**: what the solution will be, before anyone
builds it. Reach for something else when:

- **The thing already exists and needs documenting.** As-built technical
  documentation is [`../as-built-doc/SKILL.md`](../as-built-doc/SKILL.md); an
  end-user manual for a finished program is
  [`../sap-enduser-doc/SKILL.md`](../sap-enduser-doc/SKILL.md).
- **One development needs specifying, not a whole design.** A single
  requirement becomes an FS with [`../fs-generator/SKILL.md`](../fs-generator/SKILL.md),
  then a TS with [`../ts-generator/SKILL.md`](../ts-generator/SKILL.md). A BBP
  is the layer above those.
- **The question is "should we build this at all".** That is
  [`../sap-cr-scope/SKILL.md`](../sap-cr-scope/SKILL.md) against a live system,
  or [`../library-match/SKILL.md`](../library-match/SKILL.md) for a whole
  backlog against the reuse library.
- **There are no source documents.** This skill turns meeting notes, Fast Scan
  answers and workstream plans into a document. With nothing to read it would be
  writing the design itself, which is the consultant's job and not a document
  generator's.
- **The customer's template is not the one described below.** The five-section
  shape in [`references/BBP_TEMPLATE.md`](references/BBP_TEMPLATE.md) is a fixed
  structure. A different template means editing that file, not fighting it.

## Three rules that decide whether the document can be trusted

These override anything else in this file.

1. **The current-state section contains no SAP.** `2.1 Current Situation`
   describes how the work is done today — process steps, departments and
   roles, manual handling, Excel/e-mail/paper, data sources, approval points,
   existing integrations, pain points. It contains **no** target design: no
   transaction code, no Fiori app, no configuration, no SAP role, no
   development, no Best Practice, no proposed solution. An existing SAP system
   may be named only when the source documents state that it is in use today,
   and even then only *that* it is used, never how the target will use it. The
   SAP answer lives in sections 3, 4 and 5 and nowhere earlier. This is the
   single most common way a blueprint goes wrong — the consultant describing
   today's process starts describing tomorrow's — and it is why the rule is
   stated as a prohibition with a list rather than as guidance.

2. **Prose never carries a caveat; open points go to one table.** Anything the
   sources do not settle — a threshold, an approval limit, an owner, an
   integration detail, a business rule — becomes a row in `2.1.10 Açık Konular
   ve Varsayımlar`, with the affected process, the responsible party and the
   decision needed. The body text does **not** say "teyit edilmeli", "varsayım",
   "netleştirilecek" or anything like it, and does not fill the gap with a
   plausible value either. A reader gets the settled design in the prose and
   the complete list of what is not settled in one place. The two halves of
   this rule protect each other: without the table, the prose fills with
   hedges; without the prose rule, the table is never used.

3. **Nothing is invented.** No business rule, organisation element, threshold,
   approval limit or integration that the sources do not contain. No Scope
   Item ID from memory. No requirement reference that is not in the ister
   list. Where a source is silent, rule 2 applies. Where a source is
   contradicted by a newer one, the newer one wins and the contradiction is
   recorded (see "Sources and scope").

## Sources and scope (settle before drafting)

**Scope is a runtime input, not a template blank.** The document covers exactly
the modules, Scope Item IDs and process headings the user names; if none were
named, derive them from the source documents and **state them back once**
before drafting so a wrong scope is corrected early. Everything outside that
line is excluded from the design — even when it appears in the meeting notes.
An out-of-scope process that has a dependency or interface with the scoped one
gets a short entry under *Kapsam Dışı Bağımlılıklar* at the end of the
document, and no functional design or development detail.

**Source priority, highest first:**

1. Decisions in the **most recent** meeting notes
2. Earlier meeting notes, newest first
3. The WS plan
4. Fast Scan analyzer answers
5. Any other supporting document

A Fast Scan answer that a later meeting changed or clarified is superseded by
that meeting. When two sources genuinely conflict: take the newest meeting
decision as the target design, list the conflict in `2.1.9 Tespit Edilen
Tutarsızlıklar` naming both versions and which was taken, and **do not resolve
it by inventing a third position**. A question no source has decided is not a
conflict — it is an open point, and goes to `2.1.10`.

## Module scope & detection (do this first, before drafting anything)

1. **Detect the module(s) from the source documents**, not from the user's
   phrasing. Read the meeting notes / Fast Scan Q&A / WS plan titles and
   content and match against process vocabulary:

   | Signals in the source documents | Module |
   |---|---|
   | purchase requisition/order, vendor/supplier, goods receipt, invoice verification, sourcing, contracts | **MM** (Materials Management) |
   | sales order, delivery, billing, pricing, customer, returns | **SD** (Sales and Distribution) |
   | GL posting, AP/AR, cost center, profit center, closing, asset accounting | **FI/CO** (Finance / Controlling) |
   | production order, BOM, routing, work center, MRP, capacity planning | **PP** (Production Planning) |
   | inspection lot, quality notification, sampling, certificate of analysis | **QM** (Quality Management) |
   | maintenance order, equipment, functional location, breakdown | **PM** (Plant Maintenance) |
   | recruiting, employee master, payroll, time management | **HR** |
   | WBS, project, network activity, milestone | **PS** (Project System) |
   | warehouse task, storage bin, wave, EWM-specific movements | **EWM** |

   Several modules can be in scope at once (e.g. an MM document may still
   reference SD or PP where processes cross module boundaries) — that is
   normal; keep each chapter scoped to its own module/topic and only note a
   cross-module dependency inline where the source material says so.

2. **State the detected module(s) once, briefly, to the user** before
   drafting (e.g. "Bu notlar QM sürecini anlatıyor, dokümanı QM için
   hazırlıyorum.") so a wrong detection can be corrected early. If the
   sources are genuinely ambiguous across two plausible modules, ask via
   `ask_user` with the candidate modules as options — do not silently guess.

3. **Reflect the module in the document title and Purpose** (e.g.
   "<Customer> - QM Conceptual Design Document"), and use it to scope the SAP
   Best Practice search (see step 5 of "How to use this skill" below) and
   the module-specific content guidance table right below.

### Module-specific content guidance

The document structure (Analysis → Best Practice Process Flow → Functional
Design → Developments) is identical for every module; only the *substance*
under each heading changes. Use this as a checklist for what `2.1 Current
Situation` and `4. Functional Design` typically cover per module — always
driven by what the actual source documents say, never invented, and in 2.1
never as SAP (rule 1):

| Module | Typical As-Is / Functional Design substance |
|---|---|
| MM | requisition/PO approval flow, vendor master governance, source lists/contracts, goods receipt & invoice verification, inventory/warehouse movements, returns, subcontracting, scrap |
| SD | quotation/order entry, pricing & condition records, availability check, delivery & shipping, billing, credit management, returns/complaints |
| FI/CO | chart of accounts, document types & posting keys, AP/AR processes, cost center/profit center assignment, period-end close, asset accounting |
| PP | material requirements planning, BOM/routing maintenance, production order execution & confirmation, capacity leveling, backflushing |
| QM | inspection plan/type setup, sampling procedures, inspection lot processing, usage decision, quality notifications, certificates |
| PM | maintenance order types, equipment/functional location hierarchy, preventive maintenance plans, breakdown handling, spare-parts linkage |
| HR | organizational structure, employee master data, time/payroll integration, approval workflows |
| PS | WBS structure, project types, budgeting, network activities, milestone billing |
| EWM | warehouse structure (storage types/bins), inbound/outbound process, wave management, physical inventory |

## Requirement traceability (when a requirements/ister list is supplied)

If any source document contains an explicit list of requirements — a "İster
Listesi", "Requirements List", numbered FR-xx/REQ-xx items, or a Fast Scan
Q&A column that enumerates discrete asks — every relevant heading in the
BBP must show which requirement(s) it satisfies:

1. **Extract the requirement list first** and keep it as a lookup (ID →
   short description) before drafting chapters.
2. **Tag content inline** wherever it addresses one or more requirements:
   - In Functional Design prose, end the relevant sentence with a reference,
     e.g. *"...the system will auto-propose the last purchase price.
     **(Ref: İster 12)**"*
   - In `3.4 Fit-Gap` and `5.1 Geliştirme Listesi`, fill the **İster Ref**
     column with the requirement ID(s) that row implements or closes.
3. **Never invent a requirement reference.** If a piece of content in the
   BBP does not trace to any listed requirement, leave the reference out
   rather than guessing one.
4. **Flag orphan requirements.** Under *Karşılanmayan İsterler* at the end of
   the document, list any requirement ID from the source list that no section
   addressed, so the user can decide whether it is out of scope or missed.
5. If no requirements/ister list was supplied, skip this entirely — do not
   fabricate requirement IDs just to have something to cite.

## Document structure

The full skeleton — every heading, sub-heading and table, in order — is
[`references/BBP_TEMPLATE.md`](references/BBP_TEMPLATE.md). Read it before
drafting; it is what the output must look like. In summary, one unit of
blueprint is:

| section | sourced from | carries |
|---|---|---|
| **1. PURPOSE** | everything below it — written last | 4–5 sentences, Scope Item ID named |
| **2. ANALYSIS** — `2.1 Current Situation` | the source documents only | today's process, 2.1.1–2.1.10; **no SAP** (rule 1); decisions, conflicts and open points each in their own table |
| **3. BEST PRACTICE PROCESS FLOW** | the bundled scope-item reference | Scope Item ID visible; steps in the reference's hierarchy; apps/roles table; **3.4 Fit-Gap** — Fit / Partial Fit / Gap per step, one table, no separate GAP list |
| **4. FUNCTIONAL DESIGN** | meeting decisions + in-scope Best Practices | 4.1 overview · 4.2 end-to-end target flow · 4.3 org structure · 4.4 master data · 4.5 documents · 4.6 workflow/approval · 4.7 integration · 4.8 reporting/KPI · 4.9 exceptions — **only the sub-sections the sources support** |
| **5. DEVELOPMENTS** | 3.4's Gaps + 4.x | every candidate first answered *standard / configuration / development*; 5.1 list; 5.2 one detail block per development, concrete enough to hand to `fs-generator` |

Followed by three closing summaries: *Kapsam Dışı Bağımlılıklar*, *Açık Konular*
(pointing at 2.1.10, not repeating it), and *Karşılanmayan İsterler* when a
requirements list exists.

**Sub-sections are used, not filled.** 4.3's table has twelve organisation
rows and a QM blueprint needs three of them; 4.6 has nothing to say when no
approval exists — and then it says *that*, in one sentence, rather than
holding an empty table. A heading the sources cannot populate is absent, and
the topic it would have covered is a row in 2.1.10.

### Packaging: one document or several

Two shapes, same five sections inside:

- **One document, one chapter per topic** — the default. A multi-workstream
  input becomes a multi-chapter document (the MM pilot ran to nine); one
  document-level Purpose at the top, never repeated per chapter.
- **One document per Scope Item** — when the customer's template asks for it,
  or when the user says so. Each document then carries its own meta block and
  Purpose. Prefer this when a single scope item's blueprint would itself run
  long enough to need its own table of contents.

Ask once if the source documents make both plausible; otherwise default to the
first and say which you chose.

## How to use this skill

1. **Gather inputs.** Ask the user for (or locate in the conversation/attached
   files): meeting notes, Fast Scan analyzer Q&A (Excel), the WS
   (workstream) plan, and any requirements/ister list. All uploaded
   documents follow the same underlying process being documented.

2. **Detect the module(s)** per the "Module scope & detection" section
   above, before extracting any content.

3. **Settle scope and rank the sources** per "Sources and scope" above, then
   extract `2.1 Current Situation`, `4. Functional Design` and
   `5. Developments` strictly from them. Rule 1 while writing 2.1: no SAP.
   Rule 2 for every gap: a row in 2.1.10, never a hedge in the prose.

4. **Record what the sources decided, disagreed on and left open** — in
   their three tables (2.1.8 decisions, 2.1.9 conflicts, 2.1.10 open points),
   not scattered through the text. A conflict is resolved by recency and
   recorded; it is never resolved by inventing a compromise.

5. **Determine each chapter's "2. Best Practice Process Flow" from the bundled
   reference — never from the internet and never from memory.** The scope-item
   catalogue **ships with this skill**, split by LOB, under
   `references/bp/`. Nothing has to be downloaded.
   - **Pick the LOB file** for the detected module and `Grep` that one:
     MM → `sourcing.tsv` (and `supply-chain.tsv`), SD → `sales.tsv`,
     FI/CO → `finance.tsv`, PP and QM → `manufacturing.tsv`,
     PM → `asset-mgmt.tsv`, HR → `hr.tsv`, PS → `rnd.tsv`.
     `_meta.json`'s `dosyalar` map is the authoritative LOB → file table if one
     of these names ever moves. Reading one 232 KB file beats reading three
     megabytes.
   - **If the module does not map cleanly, `Grep` the whole directory** rather
     than guessing a file. A wrong mapping must degrade to a slower search, not
     to "found nothing". Never load a whole file into context — `Grep` it.
   - **Keep each `Grep` narrow — one concept, or one Scope Item ID, per
     call.** A broad alternation
     (`Purchase Requisition|Quotation|Source List|...`) hits the 100-match cap
     on a megabyte-scale TSV and hands back ~22 KB, which loads the file into
     context by the back door and defeats the rule above. Three such greps in
     the 2026-09-04 session cost 66 KB between them.
   - **Do the lookups once, for the whole document, the moment the chapter list
     exists** — never again inside each chapter. Walk the planned chapters in a
     single pass, collect the Scope Item IDs each one needs, and keep that short
     list; after that, grep again only for an ID the pass genuinely missed. Per
     chapter, the 2026-09-04 run spent 238 seconds across 27 greps and pulled
     160 KB of matches into context — where every later turn re-sent them, so
     the bill was larger than the four minutes it looks like — and searched the
     same scope items two and three times because each chapter started its own
     hunt.
   - Present the matched flow using the `Solution Activity (Hierarchy)` steps
     for that Scope Item, in order. **Leading spaces carry the tree depth** —
     four per level — so read them as the hierarchy and reproduce it.
   - Always show the **Scope Item ID** next to every best practice referenced
     (e.g. "Bank Integration with SAP Multi-Bank Connectivity (16R)").
   - If the user supplies their own list of relevant Scope Item IDs, filter to
     just those instead of searching by keyword.
   - **State the reference's date once**, in the end-of-task report, from
     `references/bp/_meta.json` (`tarih`). SAP renumbers and retires
     scope items between releases, so a reader needs to know how old the
     catalogue behind the document is. Say it once; do not repeat it per chapter
     and do not write it into the document.
   - **A newer or customer-specific export wins.** If the project folder holds
     one (conventionally `Best Practices/*.tsv|.xlsx|.csv`), use it instead of
     the bundle and say which you used. See
     [`references/SCOPE_ITEM_EXPORT.md`](references/SCOPE_ITEM_EXPORT.md).
   - **Nothing matched?** Write that no best practice was found for the topic.
     Do NOT write this section from recollection of SAP Best Practices: an
     invented scope item ID reads exactly like a real one, and the consultant
     signing the document cannot tell the difference. Rule 3 applied to the
     one section not derived from the source documents.

6. **Apply requirement traceability** per the section above wherever a
   requirements/ister list was supplied.

7. **Apply Clean Core principles** in sections 4 and 5: prefer standard Fiori
   apps / released APIs named in the reference over classic transactions or
   direct table access; flag anything that would require a non-released object.
   Where the reference names no app for a step, apply the principle from the
   source documents alone and do not invent an app ID to support it. Section 5
   is where this bites: a candidate development that standard or configuration
   covers is recorded as exactly that, in the wording the template gives, and
   does not become a Z object.

8. **Render the output as a Word document** using the `office-docx` skill
   (Markdown → .docx with headings, tables, lists). Name the output file after
   the detected module (e.g. `<Customer> - QM Conceptual Design Document.docx`),
   or after the Scope Item when packaging one document per scope item — the
   same name the assembled Markdown already carries, because rule 0 of "Working
   chapter-by-chapter" settled it before the first chapter was written. Assemble
   the parts first (rule 3); the heading levels are settled there too, so do not
   restructure at render time.

9. **Ask for missing inputs** (via `ask_user`, one question) only if none of
   the required source documents (meeting notes / Fast Scan Q&A / WS plan)
   were provided at all, or if module detection is genuinely ambiguous.
   Otherwise proceed autonomously with what is available and note gaps in
   the final document instead of blocking.

## Working chapter-by-chapter (mandatory for multi-chapter documents)

Never draft or edit a multi-chapter BBP in one giant pass — both **creating**
a new document and **analyzing/revising** an existing one must be split into
one unit of work per chapter. A single-shot rewrite of a large document risks
truncation/EOF failures and makes it impossible for the user to sanity-check
scope before the whole thing changes.

### A. Creating a new BBP from scratch

0. **Settle the file name and the heading levels before chapter 1.** Decide the
   final document name now — as step 8 names it, after the detected module —
   create `<stem>_parts/` beside it, write the meta block as
   `<stem>_parts/00-meta.md`, and fix the nesting. None of this can be
   renegotiated once chapters exist:

   | level | what sits there |
   |---|---|
   | `#` | the document title, once |
   | `##` | `1. PURPOSE` — document-level, written last (rule 3) |
   | `##` | `Bölüm N: <name>` — one per chapter |
   | `###` | that chapter's `2. ANALYSIS` … `5. DEVELOPMENTS` |
   | `####` | their sub-sections (`2.1 Current Situation`, `3.1 …`) |

   `BBP_TEMPLATE.md` puts the five sections at `##` because it describes **one
   chapter**, not a whole document; in a multi-chapter BBP every template
   heading moves down one level to make room for `## Bölüm N`. Do not invent a
   container heading to hold the chapters — the document title already is one.

1. **Plan the chapter list first, and say it out loud.** From the source
   documents, identify the distinct topics/workstreams and register them as a
   todo list (`todos` tool), one task per chapter (e.g. "Chapter 3: Sourcing,
   RFQ & Contract Management"), plus one closing task for the final Word
   render. Then, **before drafting a word**, tell the user three things: how
   many chapters there are, roughly how long that is, and that **no Word file
   appears until the very end**. A chapter of the usual size (~11 KB) takes
   about ninety seconds to write, so nine chapters is around twenty minutes
   during which the folder holds only part files and the screen looks idle. A
   consultant who was not told that reports the skill as hung — which is
   exactly what happened on 2026-09-04.
2. **Draft one chapter at a time, each into its own file** under
   `<stem>_parts/`, numbered in document order: `02-bolum-01.md`,
   `03-bolum-02.md`, and so on. Gather that chapter's source material
   (grep/view the relevant meeting-notes/Fast-Scan/WS-plan/ister-list
   sections), then write its sections **2 → 3 → 4 → 5** in template order —
   Current Situation with its three tables, Best Practice flow with Fit-Gap,
   Functional Design, Developments — as a single `write`. Section 1 (Purpose)
   waits for the end.

   **A heading the sources cannot fill is not written at all** — see
   "Sub-sections are used, not filled" above. 4.6 with no approval process says
   so in one sentence and moves on; it does not carry an empty table. **The same
   goes for a single field**: `Yetki gereksinimleri: Yok`, `Kontrol / karar
   noktası: —`, `İş kuralları: Belirtilmemiştir` say nothing — omit the line.
   The 2026-09-04 document carried "Belirtilmemiştir" forty-five times and "Yok"
   through most of its 5.2 blocks. A gap that genuinely needs deciding is a row
   in 2.1.10, not a placeholder line.

   **Never print the same fact twice.** 3.2's step blocks and 3.3's app table
   used to carry the same role, app, app ID and Scope Item ID for every step;
   5.2's blocks repeated the type, requirement and priority already in 5.1's
   table. Those two duplications alone were a quarter of the document. The
   template now says which half owns each field — follow it, and key the detail
   block to the table by name rather than restating it. **The ban is on repeated
   fields, never on sections, tables or rows**: 3.3 and 3.4 are written for every
   chapter, 3.4 carries a row for every step in 3.2, and 5.2 carries a block for
   every row in 5.1. The first run under this rule dropped half the Fit-Gap
   sections outright — it read "do not repeat" together with "omit what you
   cannot fill" and skipped the analysis, which is the one thing the document is
   for.

   **One file per chapter, never one growing document.** Appending to a growing
   file means finding its end first, and on 2026-09-04 that cost nine
   PowerShell line-counts, fourteen tail `view`s and one 107-second `edit` that
   missed its `old_string` — 292 seconds, a fifth of the run, spent on nothing
   but "where does this file end". A chapter written to its own name needs none
   of it, and a run interrupted halfway can be resumed from the parts that
   already exist. Update the todo list every 2-3 chapters rather than after
   each one; the `todos` tool costs ~17 seconds a call.
3. **Write the document-level Purpose last**, once every chapter exists —
   only then can it accurately summarize "what the document covers" and
   which module it is. It goes to `<stem>_parts/01-purpose.md`, which sorts
   into second place and so lands where the reader expects it.

   Then **assemble the parts into `<stem>.md`** in filename order. aXet's
   `bash` has no `cat`, `grep`, `head` or `wc` — they exit 127 — so use
   PowerShell:

   ```
   Get-Content -Encoding UTF8 (Get-ChildItem "<stem>_parts\*.md" | Sort-Object Name) | Set-Content -Encoding UTF8 "<stem>.md"
   ```
4. **Render to Word only once, at the end**, after every chapter is drafted
   (see step 8 of "How to use this skill"). Re-rendering after every single
   chapter is unnecessary churn.
5. **Checkpoint after every 2-3 chapters**, always — "Chapters 1-3 done,
   continuing with 4-6" — instead of silently powering through the entire
   thing. The user may want to redirect scope before more work is sunk. This
   used to fire only at **10+ chapters**; a nine-chapter MM document then ran
   forty minutes without a word, one chapter below the threshold, so the
   threshold is gone.
6. **Read each reference once.** `SKILL.md`, `BBP_TEMPLATE.md` and
   `_meta.json` are still in context after the opening pass — re-reading them
   mid-run cost 39 KB in the 2026-09-04 session and bought nothing. The same
   goes for the document being written: its structure is the part-file listing
   (`ls <stem>_parts/`), never a `view` of the assembled document.
7. **Never restart the document.** If the structure turns out wrong mid-run,
   repair it in place with `edit`. On 2026-09-04 an agent wrote two chapters,
   read them back, disliked the heading levels and began again under a second
   filename: eleven minutes and 37 KB discarded, every scope-item grep re-run,
   a fresh chapter plan that no longer matched what it had told nobody, and the
   abandoned file left in the folder looking like a deliverable. The restart
   did not even fix the shape — it produced a different wrong one. Rule 0 is
   there so the question is never open.

### B. Analyzing / revising an existing BBP

1. **Read the whole document first** (`view`, no offset/limit truncation) to
   understand its current chapter structure and module before touching
   anything.
2. **Turn the user's revision request into one todo per chapter/section**
   affected. If a request's scope is ambiguous — e.g. "remove the Türkiye
   content" could mean one chapter or all of them — **ask via `ask_user`**
   with concrete options (e.g. "only Chapter 6" vs. "the whole document")
   *before* editing anything wider than the chapter under discussion. Do not
   guess broad scope silently.
3. **Process exactly one chapter per turn** when the user asks to go
   "sırayla" / step-by-step: apply the edits for that chapter only, report
   back concisely, and explicitly name the next chapter you will handle —
   then wait for the user's go-ahead (`onaylıyorum` / "continue") before
   starting it. Do not silently continue into the next chapter uninvited.
4. **After finishing an edit pass across chapters**, re-scan the whole file
   for residual mismatches the piecemeal edits could have left behind (e.g.
   a GAP-table row or a Functional Design paragraph in one chapter still
   referencing content that a different chapter's edit removed, or a
   an İster Ref pointing at an ID that no longer exists). Fix those
   before declaring the pass complete.
5. **Re-render the Word output once**, after all requested chapters are
   updated — not after every individual chapter — unless the user asks to
   see intermediate versions.
6. **Report status honestly.** If asked "is everything done", re-diff the
   original request against the current file state chapter by chapter (not
   from memory) before answering; call out anything skipped or only
   partially applied instead of claiming full completion.

## Reference data

- [`references/BBP_TEMPLATE.md`](references/BBP_TEMPLATE.md) — the output
  skeleton: every heading, sub-heading and table of the five sections, the meta
  block, the closing summaries. Turkish, because the field labels go into the
  document verbatim. Edit this, not the skill, when a customer's template
  differs.
- `references/bp/*.tsv` — the SAP Best Practice scope-item
  catalogue, **bundled**, one file per LOB, 14,238 rows across thirteen files.
  Used exclusively for each chapter's "2. Best Practice Process Flow" heading.
  `Grep` the LOB file, or the directory when the module does not map cleanly;
  never load one into context.
- `references/bp/_meta.json` — which export the bundle came from,
  its sha256, row count and **date**. Report the date once per document: SAP
  renumbers and retires scope items between releases, so how old the catalogue
  is affects how much the process-flow sections are worth.
- [`references/SCOPE_ITEM_EXPORT.md`](references/SCOPE_ITEM_EXPORT.md) — why the
  bundle is split by LOB, which two columns are dropped, how a maintainer
  refreshes it, and how a project overrides it with its own export.
- The Word rendering itself is not this skill's: it hands finished Markdown to
  [`../../../office-tools/skills/office-docx/SKILL.md`](../../../office-tools/skills/office-docx/SKILL.md).
