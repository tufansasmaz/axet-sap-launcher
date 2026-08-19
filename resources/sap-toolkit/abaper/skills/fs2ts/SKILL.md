---
name: fs2ts
description: >
  Use when the user asks to convert a SAP Functional Specification (FS) document into a
  Technical Specification (TS), or says "FS to TS", "create TS from FS",
  "convert functional specification to technical specification",
  "fonksiyonel spesifikasyondan teknik spesifikasyon oluştur", or provides a SAP FS
  PDF/document for technical analysis. Produces a Clean-Core-compliant, code-ready TS
  split into 5 parts and rendered to a branded PDF via the office-pdf skill.
  Triggers: FS, TS, functional specification, technical specification, WRICEF,
  Clean Core, Gap List, fs2ts.
---

# fs2ts — SAP Functional Specification → Technical Specification Converter

## Purpose

This skill analyzes a SAP Functional Specification (FS) document and produces a Technical
Specification (TS) that follows SAP Clean Core principles. The output carries enough
technical detail for a code-generation agent (or a developer using `abapgit-workflow`) to
implement directly, and is finally rendered to a branded PDF via the **office-pdf** skill.

**IMPORTANT:** This skill is interactive. You MUST ask the user clarification questions
(STEP 4) and wait for answers BEFORE generating the TS.

## Skill Scripts

| Script | Language | Description |
|--------|----------|-------------|
| `scripts/extract_pdf.js` | Node.js | Extract text from a PDF FS (pdfjs-dist) |
| `scripts/merge_and_pdf.py` | Python | Merge the 5 TS parts and render the final PDF via office-pdf |
| `scripts/package.json` | — | Node.js dependencies |

**Script directory (when installed):** `.axet-code/skills/fs2ts/scripts/`

## Requirements

- **Input:** FS document (PDF or text)
- **Output directory:** defaults to `./ts-output/` unless the user specifies one
- **Language:** Turkish by default (unless the user requests another language)

## Installation (first-time setup)

### 1. Node.js dependencies (for PDF extraction)

```bash
cd .axet-code/skills/fs2ts/scripts
npm install
```

### 2. Python dependencies (for PDF generation)

Requires the **office-pdf** skill from this toolkit (`merge_and_pdf.py` locates its
`md_to_pdf.py` automatically). Install the headless Chromium engine once:

```bash
py -m pip install playwright markdown
py -m playwright install chromium
```

---

## WORKFLOW (APPLY IN ORDER — DO NOT SKIP STEPS)

### STEP 1: Extract the PDF content

If the FS is a PDF, use the skill script:

```bash
node .axet-code/skills/fs2ts/scripts/extract_pdf.js "<pdf_path>" "<output_txt>"
```

### STEP 2: Analyze the FS and build the Gap List

Extract from the FS:

1. **General information:** WRICEF ID (Jira ID), title, development type (Enhancement,
   Report, Interface, Conversion, Form, Workflow), requesting module.
2. **Business requirement:** purpose summary, As-Is process, To-Be process, functional
   requirements (itemized).
3. **Technical clues:** table/field references, transaction codes, integration points.
4. **Gap List:** number every functional requirement (GAP-01, GAP-02, …).
5. **Open items:** list anything marked "Open Item", "TBD", "?" or left ambiguous.

Present a short summary to the user at the end of this step (WRICEF ID, title, module,
type, Gap List, open items).

### STEP 3: Apply the Clean Core decision tree

For each Gap, evaluate the extensibility levels in order and pick the **lowest** viable one:

| Level | Name | Use when |
|-------|------|----------|
| 1 | Key User Extensibility (custom field, BRFplus, Fiori adaptation) | Solvable without code |
| 2 | Developer Extensibility / In-App (RAP, Released API, ABAP Cloud) | A released API exists |
| 3 | Side-by-Side (BTP: CAP, Integration Suite) | UI/integration-heavy |
| 4 | Classic Extensibility (BAdI, User-Exit, Enhancement) | The above are insufficient |

Rules: always choose the lowest level; write a Clean Core exception justification whenever
Level 4 is used; **NEVER** recommend modifying a SAP standard object. Record the decision
rationale per Gap. Use the `clean-core` skill to verify object release status.

### STEP 4: CLARIFICATION QUESTIONS (CRITICAL — ALWAYS ASK BEFORE THE TS)

**⚠️ DO NOT SKIP. Do not generate the TS before the user answers.**

For every point whose answer is not in the FS or rests on an assumption, ask the user a
concrete question, mapped to the Gap List. Cover: target system (Public vs Private Cloud /
On-Premise, ABAP Cloud active?), functional/data detail (mandatory vs optional fields, data
volume, existing Z/Y objects), integration (released API/BAPI/CDS, sync vs async), UI
(Fiori Elements vs freestyle vs backend-only), authorization (new auth object vs existing
role), transport/landscape, enhancement detail (which spot/BAdI/User-Exit, filter-dependent?),
performance/volume/scheduling, and each FS open item (resolved, assume, or blocker?).

**Then STOP and wait for the user's answers.** If answers arrive only partially, mark the
still-assumed points explicitly in the TS "Assumptions / Open Items" section — never assume
silently.

### STEP 5: Generate the TS (5 parts)

**Only after the user has answered.** Create these files in the output directory:

- `<WRICEF_ID>-TS-Part1-Header.md` — Header block, Roles & Revision tables, 1. Technical
  Context (Overview, Technical Architecture Mermaid, Clean Core Assessment + decision table,
  Assumptions incl. user answers, Dependencies)
- `<WRICEF_ID>-TS-Part2-Solution.md` — 2.1 Object List, 2.1a Class/Interface method
  signatures (full ABAP), 2.1b CDS/RAP detail, 2.2 Data Model & Structures
- `<WRICEF_ID>-TS-Part3-Logic.md` — 2.3 Input, 2.4 Output, 2.5 Processing Logic (numbered
  pseudocode per method), 2.5a Enhancement/BAdI detail, 2.6 UI design, 2.7 Validation (full
  message texts), 2.8 Error Handling (exception classes, TRY-CATCH, full message texts)
- `<WRICEF_ID>-TS-Part4-Test.md` — 2.9 Data Mapping, 2.10 Authorization, 2.11
  Non-Functional Requirements, 2.12 Test Scenarios (step-by-step), 2.13 Transport &
  Deployment Plan, 2.14 Appendix
- `<WRICEF_ID>-TS-Part5-Diagrams.md` — 2.15 Definition of Done checklist, 3. Mermaid
  diagrams (flowchart, classDiagram, erDiagram, sequenceDiagram, stateDiagram-v2, deployment,
  error-handling — at least 5 types), 4. Summary

### STEP 6: Merge the Markdown parts and render the PDF

```bash
py .axet-code/skills/fs2ts/scripts/merge_and_pdf.py <output_dir> [wricef_id] [title]
```

Examples:

```bash
py .axet-code/skills/fs2ts/scripts/merge_and_pdf.py ./ts-output          # auto-detect WRICEF ID
py .axet-code/skills/fs2ts/scripts/merge_and_pdf.py ./ts-output PP007
```

## Output files

```
<output_dir>/
├── <WRICEF_ID>-TS-Part1-Header.md
├── <WRICEF_ID>-TS-Part2-Solution.md
├── <WRICEF_ID>-TS-Part3-Logic.md
├── <WRICEF_ID>-TS-Part4-Test.md
├── <WRICEF_ID>-TS-Part5-Diagrams.md
├── <WRICEF_ID>-Teknik-Spesifikasyon.md    (merged)
└── <WRICEF_ID>-Teknik-Spesifikasyon.pdf   (final output)
```

## Critical rules

1. **Do not generate the TS without asking STEP 4 questions and awaiting answers.**
2. Every object in the 2.1 Object List must be detailed in later sections.
3. Include complete message texts (message class/number **and** full text with placeholders).
4. Use numbered pseudocode, code-translatable, per method.
5. Include at least 5 Mermaid diagram types.
6. Preserve UTF-8 characters (ı, ğ, ş, ç, ö, ü, İ).
7. Document the Clean Core exception justification whenever Level 4 is used.
8. Mark any point the user did not answer as an explicit "Assumption".

## Error cases

| Error | Fix |
|-------|-----|
| `pdfjs-dist` not found | `cd .axet-code/skills/fs2ts/scripts && npm install` |
| office-pdf not found | Ensure the `office-pdf` skill is installed in this project (or run from the real repo clone) |
| Mermaid render timeout | Reduce/simplify the diagrams |
| Turkish characters garbled | Ensure UTF-8 encoding throughout |
| PDF contains only filenames | Use `merge_and_pdf.py` — do not pass part files individually |

## References

- [SAP Clean Core Extensibility Guide](https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/clean-core)
- The `clean-core` skill (this toolkit) — verify object release status
- The `office-pdf` skill (this toolkit) — branded PDF rendering
- To *deliver* the resulting ABAP, use the `abapgit-workflow` skill (developer-in-the-loop)
