# Fast Scan Question Generator — Optimized Skill

Generate a business-oriented Fast Scan questionnaire from selected project evidence and the Business Driven Configuration (BDC) questionnaire.

Default output: **100 distinct questions**, unless the user selects another amount.

Flow:

`resolve local sources → collect scope → inventory/prioritize → read evidence → confirm readiness → lock wizard state → checkpoint session → plan questions → generate 10-question text batches → merge/validate batches → write/verify workbook`

Keep separate:
- **Target facts**: facts explicitly provided for, or evidenced by sources belonging to, the new/current implementation being assessed.
- **Reference facts**: facts that belong only to selected historical/reference projects.
- **Suggested questions/guidance**: questions derived from evidence or accepted generic knowledge.
- **Unresolved gaps**: missing, unreadable, ambiguous, conflicting, or deferred items.

A selected reference project is an **evidence source**, never the target of the Fast Scan unless the user explicitly says otherwise.

Core transformation:

`reference evidence → reusable process/decision dimension → target-oriented question`

Never perform:

`reference evidence → assumed target fact`

## 1. Core Rules

- Ask one wizard decision at a time via `ask_user` or an available equivalent; otherwise use a concise plain question.
- Reuse explicit answers already provided in the current session.
- Derive industry, projects, modules, implementation context, source language, and available document options from the inspected Registry when available.
- Treat depth, output language, Cross-module, question amount, and navigation as wizard controls, not Registry values.
- Allow free text. Do not add a redundant "Other" option if the tool already provides one.
- Batch missing required files into one request.
- Keep the **target implementation** separate from every **reference project**. Reference-project content may reveal process areas, decisions, exceptions, integrations, risks, and useful question topics, but reference-specific values must never be presented as target facts or target requirements.
- Use a reference-specific value only as evidence for *why a topic should be asked*. Convert it into a neutral target decision/question unless the same value is independently confirmed for the target.
- Never invent Registry values, source facts, SAP identifiers, document relationships, or read status.
- Never cite a document as substantive evidence unless the relevant content was actually inspected.
- Prefer concise evidence notes with precise locators over retaining large raw excerpts.


## 2. Wizard State, Scope Version, and Phase Lock

The wizard must behave as an explicit state machine. Once scope is confirmed, do not reconstruct or replay completed wizard steps.

### 2.1 Authoritative `wizard_state`

Maintain one authoritative `wizard_state` object for the active Fast Scan:

```yaml
wizard_state:
  scope_version: 1
  phase: SCOPE_COLLECTION
  industry: null
  target_implementation:
    name: null
    country: null
    company_or_group: null
    implementation_context: null
    system_context: null
  reference_projects: []
  modules: []
  process_areas: []
  depth: null
  language: null
  question_count: 100
  confirmation_status: NOT_CONFIRMED
  source_inventory_status: NOT_READY
  readiness_status: NOT_READY
  generation:
    global_plan_status: NOT_STARTED
    batch_size: 10
    completed_batches: []
    next_batch_start: 1
    merged_text_status: NOT_STARTED
    workbook_status: NOT_STARTED
```

Use explicit null/empty values rather than filling missing target values from reference projects.

### 2.2 `scope_version`

Start with `scope_version = 1`.

Increment it only when the user explicitly changes confirmed scope, such as:
- industry,
- target implementation identity/context,
- reference-project selection,
- module/process scope,
- depth,
- language,
- implementation/system context,
- question count.

Do **not** increment `scope_version` for:
- source retries or revision checks,
- evidence re-extraction,
- batch repair,
- duplicate removal,
- merge repair,
- workbook recreation or formatting fixes,
- context compaction.

All generated artifacts must belong to the active `scope_version`.

### 2.3 Phase Lifecycle

Use these phases:

1. `SCOPE_COLLECTION`
2. `SOURCE_READING`
3. `READY_FOR_CONFIRMATION`
4. `GENERATION_LOCKED`
5. `BATCH_GENERATION`
6. `MERGE_VALIDATION`
7. `WORKBOOK_CREATION`
8. `COMPLETE`

Phase transitions move forward unless the user explicitly changes scope or a narrowly defined validation issue requires repair at the affected non-wizard stage.

### 2.4 Generation Lock

After valid user confirmation:

```text
confirmation_status = CONFIRMED
phase = GENERATION_LOCKED
```

Once `phase = GENERATION_LOCKED`:

- Never restart the wizard.
- Never ask Industry, Reference Project, Module, Implementation Context, Depth, Language, or Question Count again for the same `scope_version`.
- Treat confirmed `wizard_state` as authoritative.
- Do not interpret context compaction, missing working notes, source failure, batch failure, merge failure, workbook failure, or tool retry as a scope reset.
- Do not return to Wizard Steps 1–7 unless the **user explicitly requests a scope change**.
- If a specific ambiguity remains, ask only the smallest targeted clarification needed.

Correct:
`The target implementation context has two conflicting values: Greenfield and Rollout. Which one should be used for scope_version 1?`

Incorrect:
`Which industry should we use?`

### 2.5 Session Checkpoint

Immediately after entering `GENERATION_LOCKED`, write/update:

`fast_scan_session_state.json`

Store only operational state, not confidential source content.

Minimum structure:

```json
{
  "scope_version": 1,
  "phase": "GENERATION_LOCKED",
  "confirmation_status": "CONFIRMED",
  "industry": "Automotive",
  "target_implementation": {
    "name": "Target implementation",
    "country": "Spain"
  },
  "reference_projects": ["Reference Project A"],
  "modules": ["FI"],
  "process_areas": [],
  "depth": "Detailed",
  "language": "English",
  "question_count": 100,
  "generation": {
    "batch_size": 10,
    "completed_batches": [],
    "next_batch_start": 1,
    "merged_text_status": "NOT_STARTED",
    "workbook_status": "NOT_STARTED"
  }
}
```

### 2.6 Restore from Checkpoint

If working context becomes compacted, incomplete, or uncertain:

1. Load `fast_scan_session_state.json`.
2. Validate its `scope_version`.
3. Restore confirmed wizard choices and current phase.
4. Continue from the recorded generation stage.

Do not rerun wizard questions merely because earlier conversational context is no longer present.

If the checkpoint is missing but confirmed scope is still available in the current session, reconstruct the checkpoint once and continue.

A later explicit user instruction overrides the checkpoint and creates a new `scope_version` when it changes scope.

### 2.7 Batch Progress Checkpointing

After each accepted batch, update the checkpoint atomically.

Example after `Q001-Q010`:

```json
{
  "phase": "BATCH_GENERATION",
  "generation": {
    "batch_size": 10,
    "completed_batches": ["001_010"],
    "next_batch_start": 11,
    "merged_text_status": "NOT_STARTED",
    "workbook_status": "NOT_STARTED"
  }
}
```

After all batches pass validation:

`phase = MERGE_VALIDATION`

After merged text passes validation:

`phase = WORKBOOK_CREATION`

After workbook verification succeeds:

`phase = COMPLETE`

### 2.8 State Protection

These events must never clear confirmed wizard choices:
- unreadable/newly available source,
- changed source revision,
- missing locator repair,
- failed batch validation,
- duplicate/near-duplicate repair,
- corrupt batch file,
- merged-text rebuild,
- spreadsheet write failure,
- hyperlink/formatting repair,
- context compaction,
- tool retry or process restart within the same active run.

Repair only the affected source, evidence record, batch, merged dataset, or workbook artifact.


## 3. Target Implementation vs Reference Projects

### 3.1 Definitions

- **Target Implementation**: the new/current SAP implementation for which the Fast Scan questions are being prepared.
- **Reference Project**: a previously completed or ongoing project selected only to provide evidence about similar business processes, decisions, exceptions, integrations, risks, and workshop topics.
- **Reference Fact**: a value or statement that belongs to the reference project's organization, geography, legal entity, system, or design.
- **Target Fact**: a value or statement explicitly provided by the user for the target, or supported by inspected target-specific evidence.
- **Transferable Decision Dimension**: the general business/configuration topic exposed by reference evidence and worth validating for the target.

### 3.2 Reference Evidence Is Not Target Truth

Reference-project documents may be used to understand:
- which process decisions mattered,
- which exceptions occurred,
- which integrations were required,
- which organizational/design choices had to be made,
- which risks or dependencies should be validated,
- which workshop questions are worth asking.

They must **not** be used to assume that the target has the same:
- country/localization requirements,
- legal entities or company codes,
- currencies,
- chart of accounts,
- fiscal year variants,
- plants, warehouses, storage locations, sales organizations, purchasing organizations, or other org units,
- tax rules,
- statutory reporting rules,
- banking setup,
- customers/vendors,
- material/product structures,
- interfaces,
- approval thresholds,
- naming/numbering conventions,
- configuration values,
- custom developments,
- process exceptions,
- volumes or operating model.

This list is illustrative, not exhaustive.

A reference-specific value may appear in traceability/notes as historical evidence, but must not be written as though it already applies to the target.

### 3.3 Required Question Transformation

For each reference-derived candidate question:

1. Extract the **reference fact**.
2. Identify the underlying **business decision / process dimension**.
3. Remove reference-only values and assumptions.
4. Apply only independently known **target facts**.
5. Draft a target-oriented question that asks the new implementation to confirm its own requirement.
6. Keep the reference evidence only in source/traceability fields and, when useful, Notes.

Example:

Reference evidence:
`Morocco company code 6010 uses MAD local currency and EUR group currency; no third parallel currency is configured.`

Transferable decision dimension:
`Company-code currency architecture / parallel currency requirement.`

Correct target-oriented question:
`What local and group currencies should be configured for the target company code, and is an additional parallel currency required for statutory or management reporting?`

If the target country is explicitly confirmed as Spain, it is acceptable to say:
`For the Spain implementation, what local and group currencies are required, and is any additional parallel currency needed for statutory or management reporting?`

Incorrect:
`Your company's books are kept in MAD with EUR as group currency. Do you need a third currency?`

The incorrect form turns a Morocco reference fact into an unsupported target fact.

### 3.4 Column Semantics

For reference-derived questions:

- **Fast Scan Question**: must be about the target implementation.
- **Purpose**: explain the target decision to validate; do not describe the reference setup as the target baseline.
- **Expected Customer Input**: state the target information/decision the customer should provide. Do not prefill it with the reference project's answer.
- **Key Attention Points**: may mention a transferable lesson/risk, but must not imply the target already has the reference design.
- **Reference Project / Source Project / Source Document Link**: identify the historical evidence source normally.
- **Notes**: may summarize the reference evidence and locator. Prefix or clearly state that it is **reference evidence only — not a target fact** when there is any risk of confusion.
- **Potential Config Area**: may identify the relevant SAP design/configuration area, but should not copy a reference-specific configured value as the target setting.
- **Related SAP Best Practice**: follow the normal evidence rule; a reference project's implementation choice does not itself prove a Best Practice ID.

### 3.5 Target Context Precedence

Use target information in this order:

1. Explicit user-provided target facts.
2. Inspected target-specific documents/evidence.
3. Confirmed wizard scope values.
4. Otherwise leave the target value unknown and **ask for it**.

Never fill an unknown target value from a reference project merely because the businesses are similar.

### 3.6 Reference Similarity

Similarity between target and reference projects determines **which evidence is useful**, not **which answers are inherited**.

Even when:
- the same corporate group is involved,
- business activities are nearly identical,
- the same template is expected,
- the same SAP modules are in scope,

the skill must still ask target-specific validation questions for geography, legal/statutory requirements, organization, currencies, tax, integrations, local exceptions, and configuration-sensitive decisions unless those values are independently confirmed for the target.


## 4. Local Source Resolution

### 4.1 Local-First Policy

Use the validated local OneDrive shortcut for discovery and content reads.

**Do not enumerate, fetch, or read SharePoint through MCP/HTTP/API as a fallback.**

Registry SharePoint URLs are identity/citation/mapping data only.

Label local sources:

`Remote freshness unverified`

This label alone does not block generation. A known sync or revision conflict must be resolved or explicitly accepted before current claims are made.

### 4.2 Resolve `SOURCE_ROOT`

Use:

[../scripts/resolve_local_sources.py](../scripts/resolve_local_sources.py)

Resolution:
1. Use a user-supplied shortcut root if present.
2. Else use `FAST_SCAN_SOURCE_ROOT` if set.
3. Else ask OneDrive which folders it syncs (its own registry) and check each
   one, plus one level inside it.
4. Identify the root by its CONTENT — the two directories in step 6 — never by a
   shortcut name. Measured 2026-09-21: shortcut layouts differ per machine, each
   synced shortcut is its own mount, and a name-based guess found nothing on a
   machine where the library was plainly there.
5. Do not recursively scan the user profile or drive.
6. A valid root must contain:
   - `1 - Proje Dokümanları`
   - `2 - Agent Dokümanları`
7. Reject legacy `SDKB_SAP_Delivery_Copilot_KB`.
8. If several valid roots remain, ask once and show full paths.
9. If none remain, report attempted paths/access errors and ask for the correct shortcut root or sync state.

Use literal filesystem paths. On Windows, prefer the helper's `access_path` for long-path operations.

A listed OneDrive placeholder that cannot open is **Found but not readable**, not **Missing**.

Do not download/pin the entire shortcut or hash the full tree during discovery.

### 4.3 Control Files

Resolve Registry and BDC using the exact relative paths defined in the parent `SKILL.md`.

Do not:
- append `26.AI Delivery` twice,
- recursively search for older Registry/BDC copies,
- select a legacy copy because the expected BDC is missing.

A changed layout requires a verified local path or explicit user replacement.

Show:
`Role | SOURCE_ROOT | Relative path | Exists/access status | Next action`

Content-read status is updated separately.

## 5. Source Identity, Revision, and Evidence

Maintain a session-only `source_status_map`.

### 5.1 Source Identity

For files under the validated shortcut:

`delivery-kb::<root-relative path including extension>`

Store absolute local path and `SOURCE_ROOT` separately.

Preserve the original Registry `webUrl` after verified local mapping.

Do not merge sources by filename stem, stripped extension, fuzzy name match, or same basename in another project.

A content hash may deduplicate identical byte extraction but must not erase separate Registry/project lineage.

### 5.2 Revision Fingerprint

For selected local content, prefer SHA-256 of bytes actually extracted/read.

Also record when available:
- size,
- modified time,
- extraction method/version,
- extraction time,
- extraction completeness.

If hashing is unavailable, use `path + size + mtime` and record that it is weaker.

Before reusing evidence, validate source identity, revision, inspected coverage, and availability of the evidence notes.

If revision changed:
- mark old revision `Superseded`,
- invalidate it for current claims,
- reread only required ranges.

### 5.3 Evidence Notes

Each source-derived finding must retain:
- `evidence_id`
- `source_id`
- `revision_id`
- precise locator
- concise finding
- process area
- fact / proposal / open issue
- caveat/conflict if relevant

Locator examples:
- XLSX: sheet + row/cell range
- PDF: page range
- DOCX: heading + paragraph/table index
- extracted attachment: stable section identifier

A filename, TOC, heading hit, or search result is navigation evidence only.

Preserve negation, conditions, dates, units, exceptions, and unresolved conflicts.

### 5.4 Reuse and Persistence

Reuse unchanged evidence only when the same revision and range are still valid.

Read missing ranges incrementally. Reopen a range when wording, detail, or contradiction must be checked.

If evidence notes are lost from context, restore a valid checkpoint or reread the required range.

Default persistence is **session-only**. Do not write source content or summaries to global assistant memory.

Only if the user explicitly requests persistent project caching, store a compact manifest/evidence index in the agreed project-local location and validate revisions before reuse.

## 6. Source Status

| Status | Meaning | Usable for source-derived questions? |
|---|---|---|
| Discovered | Metadata/path only | No |
| Indexed only | Structure/schema/TOC only | No |
| Opened & Read | Entire extracted content inspected; no known gaps | Yes, only retained located evidence |
| Partially Read | Specific substantive ranges inspected | Yes, only those ranges |
| Found but not readable | File exists but open/extraction failed | No |
| Ambiguous candidate | Identity/revision unresolved | No |
| Missing | Not found after applicable local discovery | No |
| Deferred | Not read due to budget/coverage/pending input | No |
| Superseded | Replaced by a validated current revision | Historical only |

Rules:
- Parser success alone is not a read.
- Attachment receipt alone is not a read.
- TOC/header inspection remains `Indexed only`.
- Empty/truncated extraction, missing tables, unreadable scans, or extraction gaps must be recorded.
- Use OCR/visual inspection only when needed for relevant unreadable content.

## 7. Registry, BDC, and Template

### 7.1 Registry

Inspect Registry headers first, then required sheets.

If the Registry cannot be inspected:

`Cannot proceed. Registry is not accessible.`

Before generation, all rows used to derive wizard options and all `Project_Document_Links` rows must be processed.

Preferred sources:

| Data | Primary | Fallback |
|---|---|---|
| Industry | Project_Industry_Mapping | Projects_Master → Validation_Lists |
| Projects | Projects_Master | Project_Industry_Mapping → Project_Module_Mapping |
| Modules | Project_Module_Mapping | Projects_Master |
| Implementation context | Projects_Master | Validation_Lists |
| Source language | Projects_Master | User if missing/mixed |
| Process areas | Process_Catalog | Inspected BDC/project content |

Deduplicate, ignore blanks, retain provenance, and never fill Registry gaps from memory.

### 7.2 Module Matching and Inventory

Read relevant `Module_Aliases`.

For module cells:
- split on `;`,
- trim/normalize,
- match canonical codes/aliases exactly.

For blank/error/`#N/A` module cells, use bounded filename tokens or alias phrases only as candidates until content confirms relevance.

Do not automatically expand related modules. Include integration references only when supported by `Process_Catalog`, inspected content, or explicit user scope.

Process all qualifying Registry link rows. Retain every row and its match reason, then deduplicate only physical source identities while preserving all Registry lineage.

Report:

`[R] qualifying Registry rows; [N] unique supporting documents; [A] unresolved identity candidates.`

These are inventory counts, not read counts.

### 7.3 Registry URL → Local Path

For a direct Registry file URL:
1. Validate expected host/site/library/`26.AI Delivery` segments.
2. Decode each segment once.
3. Strip exactly the logical remote-root prefix.
4. Join the remaining relative path to `SOURCE_ROOT`.
5. Reject traversal, invalid/rooted path injection, and any resolution outside `SOURCE_ROOT`.
6. Preserve the original URL as `Source Document Link`.
7. Mark the source Registry-supplied/local-mapped, not remotely verified.

For sharing/redirect URLs or legacy filename-only rows:
- use explicit Registry path metadata if available,
- otherwise search only inside the selected project's local subtree,
- require verified lineage,
- ask for the relative local path if ambiguity remains.

Never map an unrelated source solely by basename.

### 7.4 BDC

BDC is a **control source**, not proof of customer behavior.

Inspect sheet names, headers, actual schema, and relevant module/process rows.

Record row locators and topic coverage.

BDC questions provide prompts/topics; they do not prove that a customer follows a process.

If BDC is unavailable or cannot be interpreted, require an explicit BDC-free fallback decision.

### 7.5 Output Template

If supplied, inspect:
- sheets,
- headers,
- validation rules,
- required columns/structure.

If none is supplied, use the default layout in §12 after confirmation.

If the template conflicts with question count, bilingual layout, required columns, or traceability, surface the conflict before generation.

Registry, relevant BDC ranges, and template/default layout are P0 controls and do not count toward the supporting-document budget.

## 8. Wizard

| Step | Action |
|---|---|
| 1 | Industry from Registry |
| 2 | Reference project(s), all relevant, or skip project references |
| 3 | Module(s), or Cross-module with process areas |
| 4 | Implementation/system context |
| 5 | Depth: Executive / Standard / Detailed |
| 6 | Language: English / Turkish / Bilingual EN+TR |
| 7 | Question amount, default 100 |
| 8 | Source inventory, prioritization, reading, coverage |
| 9 | Scope/readiness/layout confirmation; persist `wizard_state`, lock the active `scope_version`, and write the session checkpoint |
| 10 | Generate in 10-question text batches, update checkpoint after each accepted batch, merge/validate, then write and verify workbook |

Project choices should show available Registry metadata such as industry, implementation type, system, language, modules, and Solution Design/Blueprint/Workshop link availability.

Link availability is not the same as readability.

Depth:
- **Executive**: business objectives, operating model, major decisions, risks.
- **Standard**: balanced business/process coverage, decisions, exceptions, integrations.
- **Detailed**: deeper process/integration/configuration implications and workshop planning, still understandable to business managers.

Track as active scope:
- **target implementation identity/context** (for example company/group, country, rollout entity, known legal/localization context),
- selected **reference projects**,
- modules,
- process areas,
- depth,
- language,
- implementation context,
- question amount.

The target implementation and reference projects are separate scope objects. Never substitute one for the other.

If the **user explicitly changes scope**:
- increment `scope_version`,
- preserve still-valid evidence where provenance/revision remains applicable,
- set `confirmation_status = NOT_CONFIRMED`,
- move `phase` back only as far as required,
- recompute matching/priorities/coverage,
- read only newly required ranges,
- reconfirm,
- write a new `GENERATION_LOCKED` checkpoint.

Do not treat internal uncertainty, context loss, source-read failure, or batch failure as a scope change.

## 9. Inventory, Priority, and Reading

### 9.1 Inventory First

Before bulk reading:
1. Build the full filtered Registry inventory.
2. Add BDC, template, and explicitly required sources.
3. Assign every entry:
   - identity or unresolved candidate record,
   - priority,
   - selection reason,
   - required/optional flag,
   - next action.

Do not read simply in filesystem or Registry row order.

### 9.2 Priority Tiers

| Tier | Sources | Purpose |
|---|---|---|
| P0 | Registry, relevant BDC, template/default | Scope/output controls |
| P1 | User-required; Solution Designs → Blueprints → Workshop Notes | Core process evidence |
| P2 | Approved changes, Functional Specs, config notes, Test Scripts | Decisions/exceptions/gaps |
| P3 | Technical Specs, training/handover, official shared refs | Targeted residual coverage |

Within P1:
1. Solution Design
2. Business Blueprint
3. Workshop Minutes

Distinguish by Registry `Document Type` and verified folder lineage.

A source may be promoted to resolve a material conflict or uncovered process; record why.

Do not assume newest timestamp or Workshop Notes automatically represent final authority. Use documented approval, effective scope/date, and supersession evidence.

### 9.3 Reading Pattern

For each selected source:
1. Inspect structure plus revision/approval metadata.
2. Select substantive ranges relevant to scope/depth.
3. Read decisions, exceptions, interfaces, risks, open issues, and relevant cross-references.
4. Read small high-value files fully when efficient.
5. Extract concise located evidence.
6. Update coverage before selecting the next source.

Review gaps after small batches and stop optional reading when coverage is sufficient.

Default budget: **up to 10 unique supporting documents per scope**, excluding P0 controls.

This is adjustable, not a hard lifetime limit.

Never silently defer a user-required source. Expand the budget when feasible, narrow scope, or obtain an explicit limited-coverage decision.

### 9.4 Coverage

Maintain:

`Project / Process Area → Evidence IDs → Decisions / Exceptions / Integrations → Missing or Conflicting Points`

BDC identifies topics but cannot fill missing project facts.

Before confirmation, every inventory entry must have an explicit disposition.

Report separately:
- substantive documents read,
- indexed-only,
- reused,
- deferred,
- inaccessible,
- ambiguous,
- control-source coverage.

Never say "read N of N" when some items were only indexed, deferred, or inaccessible.

## 10. Confirmation and Readiness

Before generation, show:
- industry,
- **target implementation context**,
- selected **reference projects**,
- modules/process areas,
- implementation/system context,
- depth,
- language,
- question amount,
- template/default layout,
- source inventory summary,
- substantive coverage,
- unread required sources,
- deferred coverage,
- BDC status,
- ambiguity/conflict/freshness limitations.

Ask:

`Generate the Fast Scan question set?`

Options:
- Yes
- Change scope
- Cancel

A Yes approves displayed scope/layout but does not silently waive unresolved required-source blockers.

When Yes is valid under the Generation Gate:
1. persist all confirmed choices into `wizard_state`;
2. retain the current `scope_version`;
3. set `confirmation_status = CONFIRMED`;
4. set `phase = GENERATION_LOCKED`;
5. write/update `fast_scan_session_state.json`;
6. do not ask completed wizard questions again for this `scope_version`.

### Generation Gate

Generate only when:
1. Registry identity is valid and required Registry sheets/link inventory were inspected.
2. Relevant BDC was inspected, or BDC-free fallback was explicitly accepted.
3. Template structure was inspected, or default layout was accepted.
4. Active scope and question amount are confirmed.
5. Required source/coverage gaps and material revision conflicts are resolved or explicitly accepted with stated limitations.
6. No ambiguous source is used as evidence.
7. Every planned source-derived claim has available evidence with source revision and locator.

If readiness fails, return only to the affected step and preserve valid work.

Without substantive Solution Design, Blueprint, or Workshop evidence for a selected reference project, do not claim project-grounded coverage for it. Explicitly accept generic/limited coverage or exclude that project.

If project references were intentionally skipped, do not demand project documents.

## 11. Question Generation

### 11.1 Evidence Mapping

Build a question plan before drafting final rows.

For every reference-derived candidate, explicitly capture:

`reference evidence → transferable decision dimension → known target facts → target-oriented question`

Use, in order:
1. relevant BDC topics,
2. inspected **reference-project evidence** to discover reusable decision dimensions,
3. inspected **target-specific evidence**, when available, to ground target facts,
4. targeted inspected official/shared references,
5. accepted general guidance only for explicitly accepted gaps.

Reference evidence may determine **what to ask**. It must not silently determine **the target answer**.

Every source-derived question must map to:
- `evidence_id`
- `source_id`
- `revision_id`
- precise locator
- canonical source link when available

When multiple sources support one question, retain all relevant mappings.

Never cite an unread source to make a generic question look project-specific.

Do not copy a reference project's answer into the target-facing question or `Expected Customer Input`.

Before accepting any reference-derived question, perform a **target/reference leakage check**:
- Does the question assert a country, currency, company code, org unit, localization, tax rule, interface, threshold, configuration value, or exception that is supported only by a reference project?
- Does `Purpose` describe the reference design as the target baseline?
- Does `Expected Customer Input` contain the reference answer instead of asking for the target answer?
- Does `Key Attention Points` imply reference-specific behavior already exists in the target?

If yes, rewrite the row around the transferable decision dimension.

If sources conflict and authority cannot be resolved, turn the conflict into a neutral confirmation question and retain both locators.

### 11.2 Question Quality

Questions should be written for the **target implementation** and expose:
- process decisions,
- business rules,
- exceptions,
- integration dependencies,
- risks,
- open issues,
- likely deviations,
- workshop needs.

Do not adopt reference-project solutions, values, organization structures, localization choices, or answers as target requirements.

Reference-specific terminology may appear in Notes/traceability when needed to explain provenance, but target-facing fields should use target terminology or neutral wording.

General knowledge may fill an explicitly accepted gap, but:
- label it as general guidance,
- leave unsupported project/document references blank,
- do not invent SAP Best Practice IDs.

Only inspected official material may substantiate a specific Best Practice identifier.

### 11.3 Plain Language

Question text must be answerable by a business manager without SAP expertise.

Do not use in question text:
- transaction codes,
- unexplained module abbreviations,
- consultant-only terminology,
- unnecessary SAP jargon.

Technical implications belong in consultant-facing columns.

Test:

`Can a business manager answer this without knowing SAP?`

If not, rewrite.

### 11.4 Question Count

Ask the user for the number of questions. Default: **100**.

Questions must be distinct, actionable, and uniquely identified.

For bilingual output:
- keep one Question ID per logical question,
- use paired EN/TR text columns,
- do not duplicate the same question as separate IDs.

Do not fabricate facts or meaningless duplicates to reach the target count.

### 11.5 Batch Generation Protocol

Generate the final question set in **batches of 10 questions** to improve consistency, coverage control, and recoverability.

Before writing the first batch:

1. Build a global question plan for the full requested amount.
2. For every planned reference-derived question/topic, record:
   - reference project/evidence,
   - reusable process or decision dimension,
   - known target facts (if any),
   - target question intent.
3. Allocate expected coverage across process areas, question categories, priorities, and source/evidence groups.
4. Reserve the complete Question ID sequence before drafting (for example `Q001`–`Q100`).
5. Use the global plan as a control map for every batch; a batch is a slice of the same target question set, not an independent mini-generation.

#### Batch Size and Files

- Standard batch size: **10 questions**.
- If the requested amount is not divisible by 10, the final batch contains the remainder.
- Write each completed batch to a separate UTF-8 `.txt` staging file before generating the next batch.
- Use deterministic names such as:
  - `fast_scan_questions_batch_001_010.txt`
  - `fast_scan_questions_batch_011_020.txt`
  - `fast_scan_questions_batch_091_100.txt`
- Batch files are intermediate generation artifacts. The Excel workbook must not be written until all required batches have passed validation.

#### Batch Text Format

Each batch `.txt` file must use a **structured, machine-parseable text format** and contain every field required for the final workbook row.

Preferred format: **JSON Lines (JSONL stored in `.txt`)**, one complete question object per line.

Each question object must include:
- Question ID
- every required Sheet 1 field for the selected language mode
- evidence/source mappings needed for traceability
- batch number or batch range

Do not store only the question wording. The batch file must contain enough structured data to reconstruct the final workbook without regenerating question content.

For bilingual output, store both EN and TR values in the same question object under their final column names.

#### Validate Every Batch Before Continuing

After each batch is written, validate it against:
- the global question plan,
- all previously accepted batches,
- the active scope,
- available evidence.

At minimum verify:
1. exactly 10 questions, except the permitted final remainder batch;
2. correct sequential and unique Question IDs;
3. no duplicate or near-duplicate questions within the batch;
4. no duplicate or near-duplicate questions against earlier batches;
5. source-derived questions retain valid evidence/source mappings;
6. **reference facts have not leaked into target-facing fields as assumed target facts**;
7. `Expected Customer Input` asks for target information rather than repeating a reference answer;
8. country/company-code/currency/org/localization/configuration values are used only when independently known for the target;
9. no unsupported target facts or SAP identifiers were introduced;
10. the batch stays within planned process/category coverage;
11. plain-language and depth rules remain satisfied;
12. required fields are present and parseable.

If a batch fails validation, repair **only that batch** before proceeding. Do not regenerate already accepted batches unless a cross-batch conflict requires it.

After each batch passes validation:
- append its range to `wizard_state.generation.completed_batches`;
- set `wizard_state.generation.next_batch_start`;
- set `phase = BATCH_GENERATION`;
- atomically update `fast_scan_session_state.json`.

Before generating a new batch, use the checkpoint to determine which ranges are already accepted. Never regenerate an accepted batch merely because conversational context no longer contains it.

#### Cross-Batch Consistency

For each new batch, keep a compact index of previously accepted questions containing at least:
- Question ID
- normalized question text
- business process area
- question category
- priority
- evidence IDs/source IDs
- reference project, when used
- transferable decision dimension
- target-context assumptions actually used

Use this index to prevent repetition and uncontrolled topic drift without reloading all raw batch text into active context.

Do not reset terminology, assumptions, scope, language style, or evidence rules between batches.

#### Merge Gate

After all batches are accepted:

1. Parse every batch file.
2. Merge them in Question ID order into:
   `fast_scan_questions_merged.txt`
3. Treat this merged text file as the **single source of truth for Sheet 1 generation**.
4. Do not rewrite, paraphrase, expand, or regenerate questions while creating the workbook.

Before workbook creation, validate the merged set for:
- requested total question count,
- unique/sequential IDs,
- parseability,
- required columns/fields,
- duplicate and near-duplicate questions,
- process/category coverage against the global plan,
- evidence/source mapping completeness,
- **target/reference separation across all target-facing fields**,
- absence of reference-only geography, currency, org, legal/localization, configuration, and process answers presented as target facts,
- bilingual pairing where applicable,
- unsupported or unread-source references.

If the merged validation fails, repair the affected batch file(s), rebuild the merged file, and rerun validation.

When all batches are accepted, set `phase = MERGE_VALIDATION` and update the checkpoint.

Only after the merged text passes this gate:
- set `wizard_state.generation.merged_text_status = VALIDATED`;
- set `phase = WORKBOOK_CREATION`;
- update the checkpoint;
- create the Excel workbook.

## 12. Workbook Output

Create a real `.xlsx` file. This kit ships `office-excel-write` and
`office-excel-report`; use them rather than hand-rolling a writer.

Build Sheet 1 **only from the validated `fast_scan_questions_merged.txt` dataset**. Workbook creation is a formatting/serialization step, not another question-generation step.

Do not silently alter question wording, IDs, classifications, source mappings, target/reference roles, or other generated values while transferring the merged dataset into Excel.

`Reference Project`, `Source Project`, and `Source Document Link` describe provenance. They do **not** change the target of the `Fast Scan Question`.

### Sheet 1 — Fast Scan Questions

These are the 19 base columns the parent `SKILL.md` refers to.

Single-language columns, in this order:

Question ID | Industry | Reference Project | SAP Module | Business Process Area | Question Category | Fast Scan Question | Purpose | Expected Customer Input | Related SAP Best Practice | Potential Config Area | Workshop Required | Workshop Topic | Key Attention Points | Source Type | Source Project | Source Document Link | Priority | Notes

For **Bilingual EN+TR**:
- replace each language-dependent text column with adjacent `<column> (EN)` and `<column> (TR)` columns,
- keep shared IDs/codes/project names/links/controlled values once,
- disclose the expansion during confirmation.

### Sheet 2 — Source Traceability

Keep every qualifying Registry row even when several rows reference one physical source.

Also include BDC, template, and non-Registry sources.

Include enough fields to reconstruct:
- Registry row/origin
- source ID
- revision/freshness
- name/link
- project/module
- source type
- priority/reason
- status
- inspected ranges
- evidence IDs
- related question IDs
- reuse action
- missing/deferred/conflict notes

This sheet does not count toward the question total.

If the user explicitly requires a single-sheet template, agree before generation where mandatory traceability will be delivered.

### Verification

Reopen the workbook and verify:
- workbook Sheet 1 matches the validated merged text dataset row-for-row,
- all accepted batch files are represented exactly once in the merged dataset,
- target-facing fields contain no reference-only facts presented as target facts,
- `Expected Customer Input` contains target information requests rather than reference-project answers,
- requested number of unique Question IDs,
- required columns,
- bilingual pairing when applicable,
- no duplicate questions,
- source-derived questions map to usable evidence,
- qualifying Registry lineage is retained,
- unread/superseded sources are not presented as current support,
- hyperlinks are structurally valid,
- basic readability/wrapping is applied.

Report only checks actually performed. Do not claim a visual review when only structure was validated.

After workbook verification succeeds:
- set `wizard_state.generation.workbook_status = VERIFIED`;
- set `phase = COMPLETE`;
- atomically update `fast_scan_session_state.json`.

## 13. Claiming and Recovery

Use wording that reflects actual source state.

| Situation | Wording |
|---|---|
| Metadata only / inaccessible | Source found but not readable. Not used for generation. |
| Missing | Source not found via available local routes; required action listed. |
| Same revision/range reused | Previously inspected evidence reused from session cache. |
| Persistent cache reused | Cached evidence from [inspection date], revision [ID]; [validation result]. |
| Partial read | Only [specific ranges] inspected; remaining sections not used. |
| TOC/headers only | Structure indexed; no substantive source evidence extracted. |
| Deferred | Not read — [reason]. Not used for generation. |
| Freshness uncertain | Local snapshot used; remote freshness unverified. |

Never claim "fully reviewed", "reading complete", "template applied", or "BDC-aligned" unless actual inspection/application supports it.

If validation fails after confirmation:

1. preserve `wizard_state`, `scope_version`, and all confirmed wizard choices;
2. invalidate only the affected source, evidence mapping, batch, merged dataset, or workbook artifact;
3. repair only that stage;
4. update `fast_scan_session_state.json`;
5. continue from the recorded phase.

**Do not return to Wizard Steps 1–7 after `GENERATION_LOCKED`.**

The normal reason to revisit completed wizard choices is an **explicit user scope change**.

If clarification is genuinely required, ask one targeted question about the unresolved field. Do not restart from Industry or replay completed wizard questions.

Before asking any wizard-like question after confirmation:
- load/inspect `fast_scan_session_state.json`;
- check whether that value already exists for the active `scope_version`;
- reuse it if present.

Do not restart the entire wizard for a local correction.

Typical recovery triggers:
- invented Registry choices,
- incomplete filtered inventory,
- ambiguous filename/extension collision,
- legacy control-file selection,
- remote SharePoint reads replacing the local workflow,
- changed revision treated as unchanged,
- metadata/TOC promoted to substantive evidence,
- required source silently deferred,
- raw substring module matching changing scope,
- confirmation no longer matching active scope,
- missing/corrupt/unparseable batch files,
- duplicate or skipped Question IDs across batches,
- batch output drifting from the global question plan,
- reference-project facts leaking into target-facing fields,
- target questions being phrased as though the reference project is the implementation target,
- `Expected Customer Input` being prefilled with a reference-project answer,
- a completed wizard question being asked again despite a valid confirmed checkpoint,
- `scope_version` changing without an explicit user scope change,
- confirmed `wizard_state` being cleared by a source/batch/merge/workbook failure,
- workbook rows differing from the validated merged text,
- unsupported facts, locators, source types, or SAP identifiers.

## 14. Final Principle

Prefer:

**less evidence with verified provenance and precise locators**

over:

**more material with unclear revision, unread content, or invented traceability**.

Generate only what inspected evidence and explicitly accepted fallback rules can support.

For reference-derived question generation, preserve the semantic, state, and artifact chains:

`reference evidence → transferable decision dimension → target-oriented question`

`confirmed wizard_state + scope_version → GENERATION_LOCKED → checkpointed batch progress → COMPLETE`

`global question plan → validated 10-question batch .txt files → validated merged .txt → Excel workbook`

Never bypass target/reference separation, the confirmed state lock, or the merged-text validation gate by restarting the wizard or generating workbook questions directly.
