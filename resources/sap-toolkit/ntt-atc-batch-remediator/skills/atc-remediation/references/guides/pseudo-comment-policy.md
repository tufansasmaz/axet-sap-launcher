---
step_id: pseudo-comment-policy
phase: triage
order: 6
kind: consultant
title: Decision tree — actual fix vs "#EC pseudo-comment vs SATC exemption
prerequisites:
  - human-review-triage
next: []
sap_notes:
  - 2754597
  - 3624162
estimated_time: "5 min per finding (decision); fix time varies"
---

# Pseudo-comment policy

A consultant-facing decision tree for any finding that doesn't have a clean automatic patch.

## TCODE

`SE80` (apply fix or pseudo-comment) / `SATC_AC_EXEMPT*` (request exemption).

## Decision tree

### 1. Actual fix — default

Pick this for **mechanical** category findings (the 10 auto-fix categories in v0.1) and for **high-confidence context** findings where the right pattern is obvious. The cost is upfront effort; the payoff is a code base that ATC actually likes.

### 2. Pseudo-comment `"#EC <token>` — local false positive

Pick this when:

- The finding is a true false positive on THIS exact line (the check is over-eager).
- You expect this line to live unchanged through the next refactor (otherwise the pseudo-comment is lost).
- The token-specific exemption applies (e.g. `"#EC CI_FLDEXT_OK` for MATNR extensibility false positives).

**Pre-requisite:** SAP Note 2754597 must be applied on BOTH:

- the checked system (where the source lives), AND
- the central ATC system (where the run executes).

If only one side has the note, the pseudo-comment is silently ignored.

**Known limitation (SAP KBA 3624162):** `"#EC CI_FLDEXT_OK` does NOT suppress every MATNR sub-check. Some MATNR-length checks still fire. If you hit this, the next option (exemption) is usually correct.

### 3. Exemption (`SATC_AC_EXEMPT*`) — systemic, cross-object, approver required

Pick this when:

- The finding is genuinely **not relevant** in this system context (e.g. a check designed for cloud variants firing on an on-premise object).
- The exemption needs to cover MANY findings sharing the same root cause.
- An approver (typically the customer's ATC governance owner) signs off.

This plugin NEVER auto-creates exemptions. The consultant must escalate manually. This is by design — BTP ABAP env 2602 mandates 4-eyes governance on exemptions, and an automated agent cannot satisfy that requirement.

## Why

- Actual fixes survive refactors.
- Pseudo-comments are cheap but throw-away.
- Exemptions are expensive (governance overhead) but cover entire classes of finding.

## Expected output

A decision recorded against each routed finding in `human-review-queue.csv`, plus the corresponding source change OR exemption request.

## Pitfalls

- Do NOT use pseudo-comments to mask systemic issues — use exemptions.
- Do NOT use exemptions for one-off false positives — use pseudo-comments.
- If you're unsure, the right answer is almost always "actual fix" — the false-positive rate of modern ATC variants is < 5% on properly-configured central systems.

## Lessons-learned trigger

If the same `"#EC` token is being applied across many objects in the same category, capture a lesson with `category: systemic-false-positive`, `pr_candidate: true`, `proposed_change` describing the exemption pattern AND the test that should detect it.
