---
step_id: atc-results-export
phase: analysis
order: 31
kind: consultant
title: Export ATC results as a ZIP for SAP Readiness Check
prerequisites:
  - atc-run-execute
blocks:
  - readiness-check-upload
next:
  - readiness-check-upload
  - repo-info-export
sap_notes:
  - 2781766
  - 2758146
  - 3533625
estimated_time: "15–30 min"
---

# Export ATC results as a ZIP for SAP Readiness Check

> **Why we do this:** The ATC result set — stored in SAP ABAP tables — is not directly readable by the Readiness Check dashboard or by the plugin. The "Export to File for SAP Readiness Check" action produces a standardised ZIP containing an XML of all findings, which is the accepted upload format for the RC dashboard's "Custom Code (ATC)" tile. This ZIP is also the primary input for the plugin's `ATCIngester`. Getting this export right is the gate between "ATC ran" and "findings are in the pipeline."

## Prerequisites

- `atc-run-execute` complete: ATC run in status "Completed" with finding count > 0
- User has result access on the central check system
- SAP Note 2781766 applied if SAP_BASIS < 7.52 SP5 / 7.53 SP3 (enables the "File for SAP Readiness Check" export option)

## Steps

1. **Open the ATC Results Browser**

   On the **central check system**, run transaction `ATC`.

   Navigate to: *Runs* → *Manage Results*. The ATC Results Browser opens, listing all completed runs.

2. **Select the correct run series**

   In the results list, find the run created in `atc-run-execute` (by run name `<SID>_S4H2025_<YYYYMM>`).

   Click on the run to highlight it.

3. **Export to File for SAP Readiness Check**

   Right-click the run entry → select **Export to** → **File for SAP Readiness Check for S/4HANA**.

   If this option is missing from the context menu:
   - Apply SAP Note **2781766** (export enablement note — required for SAP_BASIS < 7.52 SP5 or < 7.53 SP3)
   - After applying the Note, restart the ICM and retry

   WHY: The "File for SAP Readiness Check" export is a specific format distinct from the generic ATC results export. Only this format is accepted by the RC dashboard upload dialog.

4. **Save the ZIP file**

   A save dialog appears. The default filename follows the pattern `<SID>_atc_findings.zip` (e.g. `PRD_atc_findings.zip`).

   **Do not rename the ZIP.** The RC dashboard uses the filename to identify the upload type. Renaming causes a KBA **3533625** error ("Upload rejected — filename mismatch").

   Save the file to `./migration/inputs/atc/`.

5. **Verify the ZIP contents**

   Unzip locally and confirm:
   - One XML file inside (UTF-8 encoded)
   - XML is non-empty and contains finding records
   - Run header metadata (SID, variant name, timestamp) visible near the top of the XML

   The XML schema is NOT publicly published by SAP. Do not rely on hard-coded element names — the plugin uses schema-discovery to map fields on first parse.

6. **Check that one export = one run series**

   The ZIP covers a single run/series. If you have multiple ATC runs (e.g. separate runs for different namespaces), export each separately and upload them individually to the RC dashboard.

7. **Record in PROGRESS.md**

   Append: "ATC results exported; file: `<filename>`; path: `./migration/inputs/atc/`; finding count: <n>"

## Expected behaviour

- ZIP file saved to `./migration/inputs/atc/`
- ZIP contains a single non-empty XML file
- No error during export (no SAP GUI popup indicating failure)

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| "Export to File for SAP Readiness Check" option missing | Note 2781766 not applied | Apply Note; restart ICM |
| RC dashboard rejects the ZIP | File was renamed before upload | Re-export with default filename |
| XML is empty | ATC run had 0 findings | Return to `atc-run-execute`; verify scope and object provider |
| Export ZIP >100 MB | Very large landscape (>100k findings) | Normal — the dashboard handles large files; plugin also handles them |
| SAP GUI times out during export | Result set too large for synchronous export | Use background export if available; or export in batches by namespace |

## When to come back

Return here when:
- Running a re-analysis after CCMSIDB or variant update
- A new custom namespace is added and a separate run is needed

## Output for the next step

- `./migration/inputs/atc/<SID>_atc_findings.zip` — primary plugin input (`ATCIngester`)
- Same ZIP uploaded to RC dashboard (see `readiness-check-upload`)

## References

- SAP Note 2781766 — ATC export enablement for SAP Readiness Check format
- SAP Note 2758146 — SAP Readiness Check planning Note
- KBA 3533625 — ATC upload to RC: filename mismatch error
- [ATC results table — SAP Community](https://community.sap.com/t5/application-development-and-automation-discussions/atc-results-table/m-p/12072244)
- [Remote ATC for S/4HANA readiness — saptechnicalguru.com](https://www.saptechnicalguru.com/remote-atc-s4hanareadiness/)
