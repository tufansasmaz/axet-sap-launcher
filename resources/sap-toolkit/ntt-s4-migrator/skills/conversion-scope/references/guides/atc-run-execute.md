---
step_id: atc-run-execute
phase: analysis
order: 30
kind: consultant
title: Execute the ATC readiness check run on the central system
prerequisites:
  - atc-check-variant-install
  - s-user-access-check
blocks:
  - atc-results-export
next:
  - atc-results-export
sap_notes:
  - 2364916
  - 3666462
  - 3548772
estimated_time: "30 min setup; hours to days for the actual run depending on codebase size"
---

# Execute the ATC readiness check run on the central system

> **Why we do this:** The ATC run with the `S4HANA_READINESS_2025` check variant systematically analyses every custom ABAP object in the source system against the S/4HANA simplification catalogue. It is the most comprehensive automated code-compatibility scan available — covering every PROG, CLAS, FUGR, INTF, and other ABAP object type in your custom namespaces. The output is the primary input for the impact assessment and the effort estimate.

## Prerequisites

- `atc-check-variant-install` complete: `S4HANA_READINESS_2025` variant available on central check system
- `s-user-access-check` complete: RFC user auth verified (Note 3548772)
- `central-atc-setup` complete: RFC destination and object provider configured
- Consultant has ATC run permissions on the central check system (`S_DEVELOP` with activity 03)
- Agreed maintenance window or off-peak time slot (ATC runs can be resource-intensive on large landscapes)

## Steps

1. **Open the ATC run management screen**

   On the **central check system**, run transaction `ATC`.

   Navigate to: *Runs* → *Schedule / Create New Run* (the exact menu label may vary slightly by release; it is in the top-level Runs menu).

2. **Create a new run**

   Click **New Run** (or *Schedule ATC Run*). Fill in:
   - **Run Name**: use a convention like `<SID>_S4H2025_<YYYYMM>` for traceability
   - **Check Variant**: select `S4HANA_READINESS_2025` (or `_NO_FLE` if documented in `PROJECT_PLAN.md`)
   - **Object Provider**: select the remote object provider configured in `central-atc-setup` (the source production or development system)
   - **Scope**: select the custom namespaces (Z*, Y*, /CUSTNS/* — per `PROJECT_PLAN.md`). If the scope is broad, expect the run to take hours or longer.
   - **Schedule**: choose "Immediately" for a synchronous test or schedule as a background job for large landscapes (recommended)

   WHY: A named run with a clear convention makes it easy to identify which ATC result series to export later.

3. **Start the run**

   Click **Execute** or **Schedule**.

   For background runs: confirm the job is registered in `SM37` under the run name.

   The ATC run performs:
   - Object retrieval from the source system via RFC
   - Static analysis against each check in the variant (each check maps to a simplification item)
   - Result storage in `SATC_AC_RESULTH` (run header) and `SATC_AC_RESULTVT` / `SATC_AC_RESULTVTI` (findings)

4. **Monitor progress**

   Run `ATC` → *Runs* → *Manage Results*. The run status cycles through: "Scheduled" → "Running" → "Completed" (or "Completed with errors").

   For large landscapes (>50k custom objects) the run can take **hours to days**. Plan accordingly; do not interrupt a running ATC job.

5. **Verify completion**

   After the run completes, check:
   - Status = "Completed" (not "Completed with errors")
   - Finding count > 0 (a zero count may indicate scope misconfiguration or object provider issues)
   - Run header (visible in Manage Results detail) shows the correct source SID, variant name, and target release

   If status is "Completed with errors": check the ATC run log for object-provider connection errors (RFC failures) or check-execution errors. Note 2364916 covers common remote-run error codes.

6. **Record run metadata in PROGRESS.md**

   Append: "ATC run <run-name> completed on <date>; findings: <count>; variant: <name>; source: <SID>"

## Expected behaviour

- Run completes without critical errors
- Finding count is plausible for the landscape size (100–100k findings is typical for real ECC landscapes)
- Run header shows correct variant name, source SID, and timestamp

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Finding count = 0 | Scope excludes all objects OR object provider not delivering | Check scope namespace filter; test RFC connection in central-atc-setup |
| Run "Completed with errors" | RFC connection dropped mid-run | Re-run; stabilise RFC; check SM59 RFC destination |
| Run takes >24 h | Landscape >100k objects or under-resourced central system | Schedule during weekend; increase background job memory if Basis confirms |
| Auth error mid-run | RFC user missing S_DEVELOP activity 02 | Fix per Note 3548772; re-run |
| Wrong variant selected | FLE vs NO_FLE mismatch | Delete result and re-run with correct variant; document in PROJECT_PLAN.md |

## When to come back

Return here when:
- A new CCMSIDB patch has been imported and a re-run is needed
- The target release changes (different variant)
- Additional custom namespaces are added to scope

## Output for the next step

- ATC run name and run ID (for export in `atc-results-export`)
- Finding count and completion status (sanity check)
- Run timestamp (for PROJECT_PLAN.md and RC dashboard correlation)

## References

- SAP Note 2364916 — Recommended SAP Notes for ATC remote analysis
- SAP Note 3666462 — Check Variant for SAP S/4HANA 2025
- SAP Note 3548772 — Consolidated auth Note for ATC
- [Remote ATC for S/4HANA readiness — saptechnicalguru.com](https://www.saptechnicalguru.com/remote-atc-s4hanareadiness/)
- [Custom Code Migration Guide 2025.001 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
