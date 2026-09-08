---
step_id: atc-findings-export
phase: ingest
order: 1
kind: consultant
title: Export ATC findings and drop them under ./remediation/inputs/findings/
prerequisites:
  - atc-run-execute
next:
  - batch-zip-import
sap_notes:
  - 2825775
estimated_time: "5 min (assuming the ATC run is complete)"
---

# ATC findings export

## TCODE

`ATC` → Manage Results → Export to → File for SAP Readiness Check

## What to do

The full ATC findings export procedure (variant selection, ATC central system caveats, file-naming convention, encoding pitfalls) is documented in the upstream **ntt-s4-migrator** plugin's guide library at:

> `plugins/ntt-s4-migrator/references/guides/atc-results-export.md`

Once you have the export ZIP, drop it at:

```
./remediation/inputs/findings/<filename>.zip
```

Then run `/atc-batch-remediator:run` (or `/atc-batch-remediator:run --with-llm`).

## Why

`PostToolUse` will see the file land and journal a `consultant added findings` row to `PROGRESS.md` plus a suggestion to invoke `/atc-batch-remediator:run`. The orchestrator's `FindingsIngester` reads the ZIP directly — no manual extraction step required.

## Expected output

- One ATC findings ZIP under `./remediation/inputs/findings/`.
- A new row in `./remediation/PROGRESS.md` (written by the PostToolUse hook).

## Pitfalls

- Do NOT extract the ZIP — `FindingsIngester` consumes the ZIP file directly.
- If your export contains multiple XMLs, drop the bundled ZIP rather than the individual files.
- This plugin deliberately does NOT duplicate the s4-migrator export guide — follow the link above for the authoritative procedure.

## Lessons-learned trigger

If `FindingsIngester` raises `SchemaUnknown` on the ZIP (i.e. the root element is not in `KNOWN_ROOTS`), capture a lesson with `category: new-atc-export-schema`, `pr_candidate: true`, and the root element name in `what_happened`.
