---
step_id: batch-zip-import
phase: apply
order: 2
kind: consultant
title: Import a patch ZIP via abapgit-bridge onto the target system
prerequisites:
  - atc-findings-export
next:
  - recheck-run
sap_notes:
  - 1947516
estimated_time: "10-15 min per ZIP"
---

# abapgit-bridge import workflow

## TCODE

`SE38` → run `ZGIT_BRIDGE` (or `ZABAPGIT_STANDALONE`, depending on which build is installed in the customer system).

## What to do

1. Open `SE38` → execute `ZGIT_BRIDGE` (or `ZABAPGIT_STANDALONE`).
2. Choose **IMPORT** mode (NOT PULL — PULL would try to talk to a remote git server you do not have).
3. Upload the patch ZIP from the agent's output folder, e.g. `./remediation/output/patches/b-0007-select-star.zip`.
4. Pick the destination workbench transport request (the one captured in `PROJECT_PLAN.md` → `Transport request for patch imports`).
5. Hit **F8** to execute. abapgit-bridge writes objects into the package referenced by `.abapgit.xml` (default: `$TMP` if the package field is empty — fix the `.abapgit.xml` or pick a real package).
6. Watch the activation log: switch to `SE80` → check the package, look for red activation indicators.

## Why

Each ZIP is one check-category cluster, capped at 25 objects (abapgit-bridge `CHANGELOG.md` 1.4.0 documents the cascade-safety cap). Smaller per-category ZIPs limit the blast radius of any single bad fix.

## Expected output

- All objects in the ZIP activated.
- A new row in `./remediation/PROGRESS.md` written by the PostToolUse hook reflecting the consultant action.

## Pitfalls

- **BOOTSTRAP confirmation** — abapgit-bridge prompts for a BOOTSTRAP step if the ZIP has more than 100 files. The 25-object cap in this plugin keeps you well below that, but a hand-edited ZIP can blow past it. If you see the prompt, STOP and re-bundle.
- **Deletions are NOT propagated.** Removing an include from a class with an `Edit` patch deletes the source on the agent side but abapgit-bridge will NOT delete the corresponding object in SAP. If your patch removes lines, you must delete the include manually in SE80.
- **Activation cascade.** One bad fix can mask many good ones because activation halts at the first error. Per-category ZIPs are an explicit mitigation; do NOT manually merge ZIPs to save time.

## Lessons-learned trigger

Any activation failure → capture a lesson with `category: patch-activation-failure`, `pr_candidate: true`, `what_happened` containing the batch ID and the failing object list, `proposed_change` suggesting a guard pattern for `references/patterns/`.
