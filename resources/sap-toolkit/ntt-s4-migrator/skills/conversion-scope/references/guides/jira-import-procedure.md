---
step_id: jira-import-procedure
phase: delivery
order: 70
kind: consultant
title: Import the fix backlog into Jira as epics and stories
prerequisites:
  - exec-summary-customisation
blocks: []
next:
  - deletion-transport-create
sap_notes: []
estimated_time: "1–2 h (CSV preparation + Jira import + story triage)"
---

# Import the fix backlog into Jira as epics and stories

> **Why we do this:** The fix backlog (`output/fix-backlog.csv`) translates the impact table into actionable Jira items so the customer's development team can sprint-plan the migration work. Without loading it into their project-management tool, the findings stay in a spreadsheet and remediation efforts are untracked. This guide covers the mechanics of the CSV import and how to organise the stories into a workable sprint structure.

## Prerequisites

- `exec-summary-customisation` complete: action plan agreed, effort bands validated
- Plugin `analyze` run complete: `output/fix-backlog.csv` generated
- Jira project exists for the S/4HANA migration (customer creates this — not the consultant's responsibility)
- Customer's Jira administrator available for import configuration

## Steps

1. **Review the fix-backlog CSV**

   Open `./migration/output/fix-backlog.csv`. The file has the following columns:
   - `object_type`, `object_name`, `package` — identify the work item
   - `impact_class` — Mandatory / Advisory / Delete-candidate
   - `priority` — 1/2/3
   - `effort_band` — XS/S/M/L/XL
   - `cluster` — thematic grouping (from `ImpactMapper`)
   - `sap_note` — primary Note reference
   - `note_summary` — plain-language description
   - `remediation_hint` — from Simplification Database

   Review with the customer to confirm the column mapping matches their Jira field structure.

2. **Map CSV columns to Jira fields**

   Work with the Jira administrator to define the mapping:

   | CSV column | Jira field (suggested) |
   |---|---|
   | `object_name` | Summary / Title |
   | `cluster` | Epic Link |
   | `impact_class` | Labels or Custom Field |
   | `priority` | Priority (mapped: 1=Highest, 2=High, 3=Medium) |
   | `effort_band` | Story Points (XS=1, S=2, M=5, L=8, XL=13) |
   | `note_summary` | Description |
   | `remediation_hint` | Acceptance Criteria |

   Document the mapping in `PROJECT_PLAN.md`. The exact Jira field names are customer-specific — do not hard-code them into the plugin.

3. **Create epics for each cluster**

   Before importing stories, manually create one Jira Epic per `ImpactMapper` cluster:
   - Epic name: `[S4H] Cluster <ID>: <cluster-short-description>`
   - Epic label: `s4h-migration`, `priority-1` (if cluster contains Priority-1 items)

   Note the Epic IDs — you will set the Epic Link column in the CSV before import.

4. **Add the Epic Link column to the CSV**

   Before importing, add an `epic_link` column to `fix-backlog.csv` and populate it with the Epic IDs from Step 3. Save as `fix-backlog-jira-<date>.csv`.

5. **Import via Jira CSV importer**

   In Jira: *Project Settings* → *Import Issues* → *CSV*.
   - Upload `fix-backlog-jira-<date>.csv`
   - Map columns in the Jira import wizard
   - Run a preview import for the first 10 rows; verify fields look correct
   - Run the full import

   For Jira Cloud: use the "External System Import" or the Jira CSV importer. For Jira Data Center: the process is identical.

6. **Triage and sprint-assign Priority-1 stories**

   After import, filter by Priority = Highest (Priority-1 Mandatory items). Work with the development team lead to assign these to the first available sprint.

   Any stories with `impact_class = Delete-candidate` should be moved to a separate Jira Epic: "[S4H] Decommission" and linked to the `deletion-transport-create` activity.

7. **Record in PROGRESS.md**

   Append: "Jira import complete; stories created: <count>; epics: <count>; project: <Jira project key>"

## Expected behaviour

- All rows from `fix-backlog.csv` appear as Jira stories (or are intentionally excluded by customer decision)
- Priority-1 Mandatory stories are in a sprint or backlog with owners
- Delete-candidate stories are in the Decommission epic

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Jira import fails on special characters in object names | SAP object names contain `/` or `*` | Escape or replace characters in the CSV pre-import |
| Epic Link not populated | Forgot to add the column before import | Re-import affected rows with the Epic Link column populated |
| Story point mapping is wrong | Effort band to points mapping not agreed | Re-agree with development team lead; update stories via bulk edit |
| Customer's Jira has no custom fields for SAP context | Standard Jira only | Use the Description field for remediation detail; add a label `s4h-migration` |

## When to come back

Return here when:
- A re-analysis adds new Priority-1 findings that were not in the original backlog
- Effort bands are revised during the sprint planning and need to be captured

## Output for the next step

- Jira project populated with migration stories
- Delete-candidate stories identified (feeds `deletion-transport-create`)
- Effort totals confirmed in Jira for project planning

## References

- [Jira Cloud CSV Import Guide](https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-csv/)
- [Custom Code Migration Guide 2025.001 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
