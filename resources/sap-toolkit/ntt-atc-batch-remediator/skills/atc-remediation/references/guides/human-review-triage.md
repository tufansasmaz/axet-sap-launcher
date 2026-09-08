---
step_id: human-review-triage
phase: triage
order: 5
kind: consultant
title: Work the human-review-queue.csv (the slow, judgment part)
prerequisites:
  - recheck-results-import
next:
  - pseudo-comment-policy
sap_notes: []
estimated_time: "varies (0.5-2 days for 1k findings)"
---

# Human-review triage

## TCODE

(none — Excel/LibreOffice/your CSV viewer of choice)

## What to do

1. Open `./remediation/output/human-review-queue.csv`. It uses the frozen 13-column schema documented in `scripts/deliverables/human_review_queue.py` — do NOT rearrange columns; downstream tools depend on the order.
2. **Filter by `reason_routed`** to triage the highest-leverage cohort first:
   - `low-confidence` — the LLM produced a patch but the ConfidenceJudge scored it below 0.7. Often the right answer is "approve the patch with a tweak" — open the matching audit-trail entry to see what the LLM proposed.
   - `judgment-category` — the cluster's `fix_shape` is `judgment`. The LLM was NEVER consulted; the change requires architectural decision. Decide per finding: actual fix vs pseudo-comment vs exemption (see `pseudo-comment-policy`).
   - `no-patch-produced` — `--no-llm` mode was used. Either re-run with `--with-llm` or hand-write a patch for the high-leverage clusters.
3. **Group by `category`** to spot patterns. If many `direct-dml-sap-tables` findings share the same Z-include, the right answer is a single helper FM, not 50 individual pseudo-comments.
4. For each finding, decide:
   - **Actual fix** — modify the source in the patched workbench and add to the in-progress TR.
   - **Pseudo-comment** — `"#EC <token>` inline; see `pseudo-comment-policy`.
   - **Exemption** — escalate manually via `SATC_AC_EXEMPT*` (this plugin NEVER auto-creates exemptions).
5. As you resolve findings, mark `decision` and `notes` columns in the CSV and re-export the CSV alongside the next patch ZIP.

## Why

The queue is intentionally CSV: it lets the consultant work offline, use pivot tables, and share findings with the customer's basis or developer team without giving them access to the plugin tooling.

## Expected output

- An annotated `human-review-queue.csv` (decision + notes per row).
- Zero or more new patches scoped to the in-progress TR (hand-written, not LLM-generated).

## Pitfalls

- Resist the urge to bulk-apply `"#EC` pseudo-comments — they are throw-away annotations that don't survive the next refactor. Use exemptions for systemic issues.
- Do NOT edit the CSV columns or column order. `write_human_review_queue` will refuse to round-trip a queue that doesn't match the frozen schema.

## Lessons-learned trigger

If you find yourself adding the same suggested action across many rows in the same category, capture a lesson with `category: missing-pattern`, `pr_candidate: true`, `proposed_change` describing the new YAML pattern under `references/patterns/`.
