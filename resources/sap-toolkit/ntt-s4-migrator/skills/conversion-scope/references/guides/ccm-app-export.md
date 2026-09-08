---
step_id: ccm-app-export
phase: analysis
order: 36
kind: consultant
title: Export the Custom Code Migration Fiori app findings as CSV
prerequisites:
  - susg-aggregation
  - atc-run-execute
blocks:
  - impact-table-walkthrough
next:
  - note-download-batch
  - impact-table-walkthrough
sap_notes:
  - 2599695
  - 2190065
  - 2270689
  - 3015497
estimated_time: "30–60 min (CCM project setup + export)"
---

# Export the Custom Code Migration Fiori app findings as CSV

> **Why we do this:** The Custom Code Migration (CCM) Fiori app joins three data sources in one place: the SUSG usage data (which objects ran and how often), the ATC check findings (which objects have compatibility issues), and the Simplification Database context (what the business impact is). This joined view — exported as a CSV/XLSX — is the primary input for the plugin's `UsageIngester`. It is far cleaner than the raw SUSG XML and includes remediation hints per object. This is the recommended path; raw SUSG XML is a fallback only.

## Prerequisites

- `susg-aggregation` complete: SUSG snapshot created and available for upload
- `atc-run-execute` complete: ATC run completed on the central check system
- CCM Fiori app accessible on the central check system (business catalog `SAP_BASIS_BC_CCM`)
- SAP Note 2599695 applied (remote stubs for the CCM app)

## Steps

1. **Access the Custom Code Migration Fiori app**

   Open the Fiori Launchpad on the **central check system** and navigate to the tile for **"Custom Code Migration"** (business catalog `SAP_BASIS_BC_CCM`).

   If the tile is not visible, your user may be missing the business catalog assignment. Ask Basis to assign `SAP_BASIS_BC_CCM`.

2. **Create or open a CCM migration project**

   In the CCM app, click **Create Project** (or open an existing project for this customer):
   - Project name: `<SID>_S4H2025_<YYYYMM>`
   - Target release: S/4HANA 2025 (or per `PROJECT_PLAN.md`)
   - Source system: the production SID

3. **Add usage data to the project**

   There are two paths to get SUSG data into the CCM project:

   **Path A (file upload — recommended for most consultants):**
   - In the project, click **Add Usage Data** → **Upload from File**
   - Upload the SUSG snapshot XML from `./migration/inputs/susg/` (created in `susg-aggregation`)

   **Path B (RFC pull — if RFC infrastructure is set up):**
   - `SUSG` on central check system → **Manage Snapshots** → **Import via RFC** from the source system's RFC destination

   WHY: Path A requires only the snapshot XML you already downloaded. Path B requires an RFC destination and object provider configured in both systems (more complex but fully automated for repeat runs).

4. **Associate the ATC run with the project**

   In the CCM project, navigate to the ATC results section:
   - Click **Assign ATC Result** or **Link ATC Run**
   - Select the ATC run name from `atc-run-execute`

   The CCM app will cross-reference findings with usage data and the Simplification Database content.

5. **Export the findings as CSV/XLSX**

   Once the project has both usage data and ATC results, click the **Download** or **Export** button in the CCM findings list view.

   The Fiori download service is `SYCM_APS_FILE_SRV` ("Download of SAP S/4HANA custom code check findings"). The export produces a standard Fiori CSV or XLSX download.

   Save the file to `./migration/inputs/susg/ccm-export-<YYYYMM>.csv`.

   WHY: This CSV is the **recommended primary input** for the plugin (not the raw SUSG XML). It has usage counts already joined with object names, check categories, and remediation hints in a stable column structure.

6. **Record in PROGRESS.md**

   Append: "CCM app export complete; file: `ccm-export-<date>.csv`; object count: <n>; path: `./migration/inputs/susg/`"

## Expected behaviour

- CCM project shows usage data populated (object count > 0)
- ATC findings linked (finding count matches `atc-run-execute` output)
- CSV export contains columns: object type, object name, package, usage count, priority, check category, remediation hint (exact column names are system-generated; plugin handles variations)

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| CCM tile not in Fiori Launchpad | Business catalog not assigned | Assign `SAP_BASIS_BC_CCM` to user; re-launch |
| Note 2599695 missing → "Remote stub not found" | Note not applied on central system | Apply Note; restart ICM |
| Usage data shows 0 objects | SUSG snapshot empty or wrong date range | Return to `susg-aggregation`; verify aggregation ran; re-export snapshot |
| RFC pull fails | RFC destination not configured | Switch to Path A (file upload) |
| Export produces empty CSV | ATC results not linked to project | Link ATC run in CCM project before exporting |

## When to come back

Return here when:
- A new SUSG snapshot is taken (after 12-month collection) for a fresh CCM export
- A re-run with updated ATC results needs a re-export

## Output for the next step

- `./migration/inputs/susg/ccm-export-<date>.csv` — primary input for plugin's `UsageIngester`
- Usage-joined findings ready for graph building and impact mapping

## References

- SAP Note 2599695 — Custom Code Migration Fiori App: Remote Stubs
- SAP Note 2190065 — ATC/CI: Remote Code Analysis Object Provider Stub
- SAP Note 2270689 — RFC Extractor for static checks
- SAP Note 3015497 — Foundation Note for BTP ABAP environment as central check system
- [Custom Code Migration Guide 2025.001 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
- [SAP Community — SAP S/4HANA Custom Code Migration Worklist](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/sap-s-4hana-custom-code-migration-worklist/ba-p/13285530)
