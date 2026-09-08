---
step_id: recheck-run
phase: verify
order: 3
kind: consultant
title: Run the recheck (focused Z-report OR full ATC re-export)
prerequisites:
  - batch-zip-import
next:
  - recheck-results-import
sap_notes:
  - 2754597
estimated_time: "5-30 min depending on path"
---

# Recheck run

Two paths — pick the one that matches what's possible on the customer system:

## Path A (preferred): focused Z-report

### TCODE

`SE38` → run `ZATC_RECHECK_<batch-id>` (e.g. `ZATC_RECHECK_b_0007` — the report name in SAP uses `_` because object names cannot contain `-`).

### What to do

1. The `ZipBundler` inlines a `ZATC_RECHECK_<batch_id>` Z-report into every patch ZIP. After import, it lives in the same package as the patched objects.
2. Open it in SE38 → F8.
3. The report runs ATC against ONLY the objects that were in the imported batch, using the same check variant captured in `PROJECT_PLAN.md`.
4. It writes the result XML to the application server transport directory; SAP will surface a download link in the report output.

## Path B (fallback): full ATC re-export

### TCODE

`ATC` → Manage Results → Re-run → Export to → File for SAP Readiness Check

### What to do

Same as the original `atc-findings-export` step, but on the imported system. Slower (full custom-code scope), but the only option if `ZATC_RECHECK_<batch-id>` failed to import or was edited out of the patch.

## Why

The focused report (Path A) is dramatically faster and produces an XML you can drop straight into the recheck-results folder. SAP Note 2754597 must be applied on BOTH the checked system AND the central ATC system before either path will produce stable results.

## Expected output

- An XML file (`<batch-id>_recheck.xml`) ready to be dropped at `./remediation/inputs/recheck-results/`.

## Pitfalls

- If the imported `ZATC_RECHECK_*` report was deleted or its activation failed, you must use Path B.
- The ATC central system must trust the imported variant — if the variant has not been replicated yet, the recheck returns "variant not found".

## Lessons-learned trigger

If the Z-report is missing from the imported package, capture a lesson with `category: missing-recheck-report`, `pr_candidate: true`, and `proposed_change` suggesting a ZipBundler assertion in tests.
