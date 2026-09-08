---
step_id: recheck-results-import
phase: verify
order: 4
kind: consultant
title: Drop the recheck XML/ZIP and let the verifier compute the delta
prerequisites:
  - recheck-run
next:
  - human-review-triage
sap_notes:
  - 2754597
estimated_time: "1 min"
---

# Recheck results import

## TCODE

(none — purely a file-drop step)

## What to do

1. Take the recheck XML produced by the `ZATC_RECHECK_<batch-id>` report (or the ZIP produced by the full ATC re-export).
2. Rename it so the filename contains the batch id, e.g. `PRD_after_b-0007.xml`.
3. Drop it at:

   ```
   ./remediation/inputs/recheck-results/
   ```

4. Run `/atc-batch-remediator:verify b-0007`. The verifier:
   - re-ingests the original findings ZIP (the "before" snapshot),
   - ingests this recheck file (the "after" snapshot),
   - computes the per-check_id delta via the `(object_type, object_name, line, check_id)` fingerprint,
   - appends a `## Verification — batch b-0007` section to `./remediation/output/remediation-report.md`.

## Why

The `(object_type, object_name, line, check_id)` fingerprint is stable across re-runs because ATC's line numbers are stable when the source has been re-activated with the patched form. Any finding that survives is therefore a genuine miss, not a re-numbered version of the same defect.

## Expected output

- A new section in `remediation-report.md` showing per-category before/after counts and the residual fingerprints.
- A new row in `PROGRESS.md` recorded by the PostToolUse hook ("consultant added recheck").

## Pitfalls

- If the filename does NOT contain the batch id, the verifier cannot match it and exits with a clear error. Rename and re-run.
- If you forgot to apply SAP Note 2754597, ATC may have produced a result for the OLD variant — the verifier will count this as "no improvement". Inspect the variant version in the recheck XML before assuming the patch failed.

## Lessons-learned trigger

If the verifier returns 0 delta but you know the patch was activated, capture a lesson with `category: recheck-no-delta`, `pr_candidate: true`, `what_happened` describing the activation evidence, `proposed_change` suggesting a verifier diagnostic.
