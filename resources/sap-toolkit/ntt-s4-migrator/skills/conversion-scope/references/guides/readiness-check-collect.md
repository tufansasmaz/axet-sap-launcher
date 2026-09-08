---
step_id: readiness-check-collect
phase: analysis
order: 33
kind: consultant
title: Run RC_COLLECT_ANALYSIS_DATA to collect Readiness Check data
prerequisites:
  - ccmsidb-download
  - atc-check-variant-install
blocks:
  - readiness-check-upload
next:
  - readiness-check-upload
sap_notes:
  - 2185390
  - 1872170
  - 2399707
  - 2745851
  - 2769657
  - 2612179
  - 2758146
estimated_time: "2–8 h (background job on production system)"
---

# Run RC_COLLECT_ANALYSIS_DATA to collect Readiness Check data

> **Why we do this:** `RC_COLLECT_ANALYSIS_DATA` is the master orchestrator report for the SAP Readiness Check. It schedules a suite of underlying sub-jobs (simplification item scan, system sizing, business function analysis, Fiori/app availability, add-on compatibility, custom code summary) and produces the main analysis ZIP. This ZIP is what gets uploaded to `me.sap.com` and drives the majority of the RC dashboard tiles. Without it, the dashboard shows no data beyond what you manually upload.

## Prerequisites

- Prerequisite SAP Notes applied on the **source production system** (see Notes section — this is a multi-note baseline)
- SE38 execute access on the production system
- Background job scheduling permission
- Maintenance window or off-peak time agreed with Basis (job runs 2–8 h on typical production)
- Custom namespace list confirmed in `PROJECT_PLAN.md`

## Steps

1. **Verify prerequisite Notes are applied on the production system**

   These Notes are mandatory for `RC_COLLECT_ANALYSIS_DATA` to run correctly:
   - **2185390** — SAP Readiness Check central prerequisite
   - **1872170** — ABAP test runs prerequisite
   - **2399707** — Readiness Check foundation
   - **2745851** — Collection data enhancement
   - **2769657** — Additional collection fix
   - **2612179** — Readiness Check sub-job fix
   - **2758146** — Readiness Check planning

   Run `SNOTE` and check the status of each. Apply any that are missing. Allow transport time if imports are needed.

   WHY: Missing any of these Notes causes specific sub-jobs (e.g. sizing, business functions) to produce empty or incorrect results.

2. **Open the collection report**

   On the **source production system**, run:

   `SE38` → enter `RC_COLLECT_ANALYSIS_DATA` → **Execute** (F8).

   WHY: This is the going-forward entry point as of 2025+. The older `/SDF/RC_START_CHECK` still exists but is now a sub-step invoked internally by this report, not the recommended user entry point.

3. **Configure parameters**

   Fill in the report parameters (verify exact field names on your system):
   - **Target release**: select the S/4HANA target (e.g. `S/4HANA 2025`)
   - **Custom namespaces**: enter namespaces from `PROJECT_PLAN.md`
   - **Language**: use the production system's primary language (SY-LANGU mismatch causes the "Custom Code Analysis stuck" error — see Common Pitfalls)
   - **Output type**: "Download as ZIP to frontend" or AL11 path

4. **Schedule as background job**

   For production systems (always): press *F9* or use *Program → Execute in Background*.
   - Job name: `RC_COLLECT_<SID>_<YYYYMM>`
   - Schedule immediately (off-peak) or at a specific time agreed with Basis

   Monitor in `SM37`. The job schedules multiple sub-jobs; monitor all of them.

5. **Wait for completion and download the ZIP**

   After all sub-jobs complete (2–8 h is typical; >8 h on HANA database > 1 TB), download the output ZIP from the AL11 path or the frontend download dialog.

   The ZIP contains multiple XML data-collector files — this is the main analysis payload for the RC dashboard.

   Save to `./migration/inputs/readiness-check/`.

6. **Record in PROGRESS.md**

   Append: "RC_COLLECT_ANALYSIS_DATA completed on <SID>; job: `<name>`; completed: <timestamp>; ZIP saved to inputs/readiness-check/"

## Expected behaviour

- All SM37 sub-jobs complete with status "Finished" (not "Cancelled")
- ZIP is non-empty (tens of MB is typical)
- ZIP contains multiple XML files (sizing, simplification, business functions, etc.)

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Sub-jobs time out on large where-used index | Large custom codebase | Re-run during a quieter window; split namespace scope if possible |
| "Custom Code Analysis stuck" | SY-LANGU mismatch between parameter and system language | Re-run with correct language parameter |
| Sizing data missing from ZIP | Note 2745851 not applied | Apply Note; re-run |
| Dashboard delay >2 h after upload | System size > 1 TB | Normal — wait; check dashboard status page |
| RC report not found in SE38 | Older system / Note not applied | Apply Note 2185390 and its dependencies |

## When to come back

Return here when:
- A significant infrastructure change occurs (HANA upgrade, system copy)
- The target release changes and a fresh RC analysis is needed
- Dashboard results appear stale and a refresh is requested

## Output for the next step

- Analysis ZIP in `./migration/inputs/readiness-check/` ready for upload (`readiness-check-upload`)
- Sub-job completion status in SM37 for PROGRESS.md

## References

- SAP Note 2185390 — SAP Readiness Check central prerequisite
- SAP Note 1872170 — ABAP test runs prerequisite
- SAP Note 2399707 — Readiness Check foundation
- SAP Note 2745851 — Collection data enhancement
- SAP Note 2769657 — Additional collection fix
- SAP Note 2612179 — Readiness Check sub-job fix
- SAP Note 2758146 — Readiness Check planning
- [SAP Help Portal — SAP Readiness Check](https://help.sap.com/docs/SAP_READINESS_CHECK)
- [SAP Community — SAP Readiness Check 2.0 — Setup and Execution](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/sap-readiness-check-2-0-setup-execution/ba-p/13432371)
