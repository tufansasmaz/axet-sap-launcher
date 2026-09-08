---
step_id: readiness-check-upload
phase: analysis
order: 34
kind: consultant
title: Upload analysis ZIPs to the SAP Readiness Check dashboard
prerequisites:
  - readiness-check-collect
  - atc-results-export
  - repo-info-export
blocks:
  - readiness-check-export
next:
  - readiness-check-export
sap_notes:
  - 2758146
  - 3533625
estimated_time: "15–45 min (upload + dashboard processing)"
---

# Upload analysis ZIPs to the SAP Readiness Check dashboard

> **Why we do this:** The SAP Readiness Check dashboard at `me.sap.com` is SAP's central analysis hub. It ingests the analysis ZIP (from `RC_COLLECT_ANALYSIS_DATA`), the repository-info ZIP, and the ATC findings ZIP, cross-references them against SAP's internal simplification-item database, and produces the tile-by-tile view used to scope the migration. Without this upload, you have raw data files but no structured report to walk the customer through.

## Prerequisites

- `readiness-check-collect` complete: analysis ZIP saved to `./migration/inputs/readiness-check/`
- `atc-results-export` complete: `<SID>_atc_findings.zip` saved to `./migration/inputs/atc/`
- `repo-info-export` complete: `S4HMigrationRepositoryInfo<SID>.zip` saved to `./migration/inputs/atc/`
- S-user access to `https://me.sap.com/` (verified in `s-user-access-check`)
- Customer's SAP system registered in their SAP for Me account

## Steps

1. **Navigate to the SAP Readiness Check dashboard**

   Open a browser and go to `https://me.sap.com/`.

   Navigate to: *Systems & Provisioning* → *SAP Readiness Check*.

   The legacy URL (`launchpad.support.sap.com`) redirects to `me.sap.com` but use the direct path to avoid redirect loops.

2. **Create a new analysis or open an existing one**

   Click **New Analysis** and select the scenario: **"SAP Readiness Check for SAP S/4HANA"** (system conversion scenario).

   Fill in:
   - System ID (source SID)
   - Target release
   - Description (use: `<customer> <YYYYMM>`)

   If updating an existing analysis, open it and click **Update Analysis**.

3. **Upload the main analysis ZIP**

   In the analysis upload dialog, select **Main Analysis** (or the first upload slot) and upload the ZIP produced by `RC_COLLECT_ANALYSIS_DATA`. This populates the majority of the tiles (Sizing, Business Functions, Add-ons, Fiori, etc.).

   Processing takes 5–40 minutes depending on system size. The dashboard shows a processing spinner; wait for it to complete before the next upload.

4. **Upload the ATC findings ZIP**

   After the main analysis completes processing:

   Navigate to the **Custom Code** tile → *Update Custom Code Analysis*.

   Upload `<SID>_atc_findings.zip`.

   WHY: The ATC findings populate the "Custom Code (detailed, ATC)" tile. This tile only appears when the ATC ZIP has been successfully uploaded. Without it, the dashboard shows only high-level custom code counts, not the per-object-per-check breakdown needed for effort estimation.

   **Filename rule**: The ZIP must keep its original filename `<SID>_atc_findings.zip`. Renaming causes a KBA **3533625** rejection error.

5. **Upload the repository-info ZIP**

   In the same Custom Code tile update dialog, also upload `S4HMigrationRepositoryInfo<SID>.zip`.

   WHY: This ZIP provides the object inventory. Together with the ATC findings, it fills the full Custom Code tile view.

6. **Wait for processing and verify tiles**

   After uploads, the dashboard refreshes. Verify:
   - Simplification Items tile: populated with relevant/not relevant counts
   - Custom Code tile: shows object count + ATC finding counts by priority
   - Sizing tile: shows HANA sizing estimate
   - Business Functions tile: shows active/always-on analysis

   If any tile shows "No data", the corresponding upload may have failed silently — re-upload.

7. **Record in PROGRESS.md**

   Append: "RC dashboard uploads complete; analysis ID: <dashboard analysis ID>; tiles populated: <list>"

## Expected behaviour

- Main analysis tile shows SAP processing complete (not spinner)
- Custom Code tile shows ATC finding breakdown by priority (1/2/3)
- At least 10 tiles populated

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| ATC ZIP upload rejected | Filename was renamed | Re-export from `atc-results-export` with original filename |
| "Custom Code Analysis" stuck after upload | SY-LANGU mismatch in collection data | Re-collect with correct language; re-upload |
| Dashboard delay >2 h | System > 1 TB or high server load | Wait; check status page on me.sap.com |
| Sizing tile empty | Main analysis ZIP did not include sizing sub-job data | Return to `readiness-check-collect`; verify Note 2745851 applied |
| Dashboard shows wrong target release | Wrong scenario selected at creation | Delete analysis and re-create with correct target release |

## When to come back

Return here when:
- A refresh analysis is needed (new ATC run, updated CCMSIDB)
- The customer's go-live target changes

## Output for the next step

- RC dashboard analysis ID (for `readiness-check-export` XLSX downloads)
- Tile population status (for `exec-summary-customisation` context)

## References

- SAP Note 2758146 — SAP Readiness Check planning
- KBA 3533625 — ATC upload filename rules
- [SAP for Me — SAP Readiness Check](https://me.sap.com/)
- [SAP Help Portal — SAP Readiness Check](https://help.sap.com/docs/SAP_READINESS_CHECK)
- [New SAP Readiness Check Landing Page in SAP for Me (community.sap.com)](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/new-sap-readiness-check-landing-page-in-sap-for-me/ba-p/14123952)
