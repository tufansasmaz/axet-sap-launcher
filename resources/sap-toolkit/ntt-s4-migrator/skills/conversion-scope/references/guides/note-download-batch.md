---
step_id: note-download-batch
phase: analysis
order: 37
kind: consultant
title: Download SAP Notes for the top-impact simplification items
prerequisites:
  - s-user-access-check
  - ccm-app-export
blocks: []
next:
  - impact-table-walkthrough
sap_notes:
  - 2241080
  - 3666462
estimated_time: "30–90 min (depends on number of priority-1/2 findings)"
---

# Download SAP Notes for the top-impact simplification items

> **Why we do this:** The plugin's `NoteSummariser` agent produces plain-language summaries of what each simplification item means and what the remediation effort involves. When the Note PDF or HTML body is available locally, the summaries are far more precise — specific API replacement guidance, effort ranges, and migration caveats. Without the Note bodies, the summariser can only use the Note ID and title. Pre-downloading the top 20–50 priority-1 and priority-2 Notes before the analysis run significantly improves the quality of the effort estimates.

## Prerequisites

- `s-user-access-check` complete: S-user with software-download rights confirmed
- `ccm-app-export` complete: CCM CSV export available (identifies which Notes are most relevant)
- Plugin has been run at least through the ingest phase so that the top-N Note IDs are known (or consultant has identified them from the RC dashboard "Custom Code" tile)

## Steps

1. **Identify the top Note IDs to download**

   Open the CCM CSV export (`./migration/inputs/susg/ccm-export-*.csv`) in a spreadsheet. Filter by:
   - Priority = 1 (mandatory changes) — download all
   - Priority = 2 (important changes) + usage count > 0 — download the top 20

   Record the SAP Note numbers in a download list.

   Alternatively, run the plugin's ingest phase first: `scripts/orchestrator.py --ingest-only`. The output includes `./migration/output/notes-to-download.txt` with the prioritised list.

2. **Download Notes from SAP Support Portal**

   Navigate to `https://me.sap.com/notes/` (or `https://launchpad.support.sap.com/notes/`).

   For each Note ID:
   - Enter the Note number in the search field
   - Open the Note
   - Download as **PDF** (preferred for the plugin — parseable by `NotesIngester`) or **HTML** (also accepted)

   Save files to `./migration/inputs/notes/` using the convention `<note-number>.pdf` (e.g. `3666462.pdf`).

   WHY: The plugin's `NotesIngester` detects files by filename pattern `<digits>.pdf` or `<digits>.html`. Files with other names are silently skipped.

3. **Batch download for efficiency**

   SAP Support Portal allows Note exports one at a time. For more than 20 Notes, consider:
   - Downloading in parallel tabs
   - Asking the NTT delivery lead if a Note batch-download workflow exists for the engagement

   Note: the plugin works without any downloaded Notes (INFO-level fallback) — downloaded Notes improve quality, not gate the run.

4. **Verify the downloads**

   Run `ls ./migration/inputs/notes/*.pdf | wc -l` to confirm the count. Open one PDF to verify it is the correct Note and not a download-error page.

5. **Record in PROGRESS.md**

   Append: "Notes downloaded: <count> files; top Notes: <comma-separated Note IDs>; path: `./migration/inputs/notes/`"

## Expected behaviour

- `./migration/inputs/notes/` contains at least the priority-1 Notes from the CCM export
- Each file named `<note-number>.pdf`
- No empty or corrupted PDF files

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Note download page shows "Not authorised" | S-user lacks Note access | Most Notes are accessible with any S-user; check if a special contract is needed |
| Downloaded PDF is an error page (1 KB) | Session expired or Note restricted | Re-login to me.sap.com; check if Note requires special access |
| File saved with browser-mangled filename | Browser auto-renamed download | Rename to `<note-number>.pdf` before placing in inputs/notes/ |
| Note not found in portal | Note number is from an old or merged Note | Check the "Predecessor" field in the portal; download the successor |
| Plugin skips a Note | Filename does not match `<digits>.pdf` pattern | Rename the file |

## When to come back

Return here when:
- New priority-1 findings appear after a re-run with updated CCMSIDB
- A consultant wants deeper analysis for a specific cluster (download targeted Notes on demand)

## Output for the next step

- Note PDFs in `./migration/inputs/notes/` fed into `NoteSummariser` during the full analyze run
- Higher-quality effort estimates for priority-1 and priority-2 findings

## References

- SAP Note 2241080 — Simplification Database (Note numbers referenced in CCMSIDB items)
- SAP Note 3666462 — Check Variant for S/4HANA 2025 (frequently a referenced Note in findings)
- [SAP Support Portal — Note search](https://me.sap.com/notes/)
- [Custom Code Migration Guide 2025.001 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
