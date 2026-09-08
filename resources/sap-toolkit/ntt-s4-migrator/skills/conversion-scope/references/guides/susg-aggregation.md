---
step_id: susg-aggregation
phase: data-collection
order: 21
kind: consultant
title: Schedule SUSG aggregation and create a usage snapshot
prerequisites:
  - scmon-activation
blocks:
  - ccm-app-export
next:
  - ccm-app-export
  - ccmsidb-download
sap_notes:
  - 2701371
  - 3410478
estimated_time: "15 min to schedule; daily background job runs at ~02:30; snapshot takes 5–15 min"
---

# Schedule SUSG aggregation and create a usage snapshot

> **Why we do this:** SCMON records raw call events. SUSG (Usage Statistics) aggregates those events into a usable table (`SUSG_DATA`) grouped by object + day, then condensed to object + month over time. Without SUSG aggregation the raw SCMON data is too granular to analyse efficiently. The snapshot export is what gets uploaded into the Custom Code Migration Fiori app (or handed to the plugin as a fallback XML). Skipping this step means you have runtime data you cannot use.

## Prerequisites

- `scmon-activation` complete: SCMON is actively running on the source system
- At least one month of SCMON data collected (preferably 3+ months before the first review; 12 months before final export)
- SUSG transaction access on the source system

## Steps

1. **Open SUSG on the source system**

   Run transaction `SUSG`. The initial view title is **"Usage Data: Aggregation State"**.

   The top-level buttons are:
   - **Activate** — schedules the daily aggregation background job
   - **Create Snapshot** — produces an exportable snapshot file from current aggregated data
   - **Manage Snapshots** — lists, downloads, or uploads existing snapshots
   - **Display Log** — shows aggregation job history

   WHY: SUSG is the single UI for both scheduling aggregation and exporting the results. You will return to this screen multiple times during the engagement.

2. **Activate the daily aggregation job**

   Click **Activate**. This schedules a background job that runs **daily at approximately 02:30** on the production system.

   You do NOT manually schedule this job. SUSG's Activate button handles the scheduling automatically.

   Verify the job exists: run `SM37` and filter on job name `*SUSG*` or `*CALL MONITOR*`. The job "ABAP Call Monitor: Collect" should appear as "Scheduled" (KBA 2682315 references this job). If the job already exists from a previous session, Activate is idempotent — clicking it again is safe.

   WHY: The daily job reads from SCMON's raw tables and writes aggregated records to `SUSG_DATA` (and the CDS view `SUSG_I_DATA` per Note 3410478). Without this job, `SUSG_DATA` stays empty even if SCMON is collecting.

3. **Check aggregation state**

   The main SUSG screen shows an aggregation state indicator. After the first overnight run you should see:
   - Objects count > 0
   - Last aggregation date = today or yesterday

   If objects count = 0 after 48 hours, check SM37 for job errors and refer to Note 2701371 troubleshooting section.

4. **Create a snapshot (first review or final export)**

   When you have sufficient data (at least 3 months for a first review; 12 months for final analysis):

   Click **Create Snapshot**. A dialog appears with:
   - **Date from** / **Date to** — filter the aggregation period. For a full export use the SCMON activation date as "Date from" and today as "Date to".
   - **Clean up usage data after snapshot** — check this only if you want to reset the aggregation table. For routine snapshots, leave unchecked.

   Click **OK** / **Create**. The system generates the snapshot file (format: **XML**, not binary — confirmed in research).

5. **Download the snapshot**

   After creation, click **Manage Snapshots** → select the snapshot → **Download to File**.

   Save the file. The filename will typically be `SAPNote_2436688_Checked_System.xml` or similar — the exact filename is system-generated. Place it in `./migration/inputs/susg/` as a fallback artifact.

   **Primary path**: the snapshot XML is used as input to the Custom Code Migration Fiori app (see `ccm-app-export`), NOT directly by the plugin. The plugin primarily parses the CCM app's CSV export. Keep the XML as a fallback.

   WHY: The snapshot format is XML (parseable outside SAP) but the schema is undocumented. The CCM app joins it with additional metadata. The CCM CSV export is the cleaner artifact for the plugin.

6. **Note retention behaviour**

   SUSG has no automatic purge. Aggregation data accumulates indefinitely (object + day, condensed to object + month over time). You can clean up with report `SUSG_DELETE_PROGRAMS` if needed, but do not run it before the final snapshot export.

## Expected behaviour

- SM37 shows a daily aggregation job scheduled
- SUSG aggregation state shows > 0 objects after the first overnight run
- Snapshot creates without errors; appears in Manage Snapshots list
- Downloaded file is a readable XML file

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Objects count = 0 after 48 h | SUSG job not running or SCMON not active | Check SM37 for job failures; verify SCMON status |
| "Activate" button fails | SUSG authorization missing | Assign S_TCODE for SUSG and S_ADMI_FCD per Note 2701371 |
| Snapshot download produces empty file | No data in selected date range | Widen the date range; verify aggregation ran |
| Annual jobs missing from data | Collection period < 12 months | Normal — document in PROJECT_PLAN.md; re-export after 12-month window |
| Snapshot XML exceeds browser download limit | Very large landscape | Use ALM export path or increase browser timeout; split date ranges |

## When to come back

- Return after 3 months for a first-look snapshot (project milestone review)
- Return after 12 months for the final snapshot used in the full analysis
- Return if SCMON is restarted (new activation date means a new date-range for the snapshot)

## Output for the next step

- SUSG snapshot XML file in `./migration/inputs/susg/` (fallback artifact)
- Aggregation confirmed active (prerequisite for `ccm-app-export` which uploads the snapshot to the CCM Fiori app)
- Date range of aggregated data (for `PROJECT_PLAN.md` and CCM app project setup)

## References

- SAP Note 2701371 — Recommendations for aggregating usage data using transaction SUSG
- SAP Note 3410478 — CDS view `SUSG_I_DATA` (OSS Note reference)
- KBA 2682315 — SCMON/SUSG collection job background
- [SAP Community — Aggregate usage data in your production system with SUSG](https://community.sap.com/t5/application-development-blog-posts/aggregate-usage-data-in-your-production-system-with-susg-transaction/ba-p/13401524)
- [saptechnicalguru.com — SUSG walkthrough](https://www.saptechnicalguru.com/susg/)
- [Custom Code Migration Guide 2025.001 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
