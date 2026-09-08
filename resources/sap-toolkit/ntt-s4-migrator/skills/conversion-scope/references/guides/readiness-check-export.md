---
step_id: readiness-check-export
phase: analysis
order: 35
kind: consultant
title: Export all Readiness Check tile data as XLSX files
prerequisites:
  - readiness-check-upload
blocks:
  - impact-table-walkthrough
  - exec-summary-customisation
next:
  - ccm-app-export
  - impact-table-walkthrough
sap_notes:
  - 2758146
estimated_time: "15–30 min (dashboard navigation + per-tile downloads)"
---

# Export all Readiness Check tile data as XLSX files

> **Why we do this:** The SAP Readiness Check dashboard provides no REST or JSON API for reading results. The only documented export mechanism is the per-tile XLSX (and PDF) download. These XLSX files are what the plugin's `ReadinessIngester` parses to extract sizing, business-function impact, and simplification-item counts. Downloading all relevant tiles now gives the agent a complete picture of the migration scope; any tile you skip means missing data in the exec summary and impact table.

## Prerequisites

- `readiness-check-upload` complete: dashboard tiles populated and processing finished
- Browser with download folder mapped to the consultant's machine
- `./migration/inputs/readiness-check/` directory created

## Steps

1. **Open the analysis in the RC dashboard**

   Navigate to `https://me.sap.com/` → *Systems & Provisioning* → *SAP Readiness Check*.

   Open the analysis created in `readiness-check-upload`.

2. **Download each tile as XLSX**

   For each tile listed below, click the tile → look for the **Download as XLSX** icon (usually a spreadsheet icon in the tile header or top-right corner).

   Priority tiles for the plugin:

   | Tile | XLSX filename convention | Plugin ingester |
   |---|---|---|
   | Simplification Items | `simplification_items_<date>.xlsx` | ImpactMapper context |
   | Custom Code (high-level) | `custom_code_<date>.xlsx` | ImpactMapper usage join |
   | Custom Code (detailed, ATC) | `custom_code_atc_<date>.xlsx` | `ReadinessIngester` primary |
   | S/4HANA Sizing | `sizing_<date>.xlsx` | Exec summary hardware context |
   | Business Functions | `business_functions_<date>.xlsx` | `ReadinessIngester` |
   | Add-on Compatibility | `add_on_<date>.xlsx` | Exec summary risk flags |

   Save each file to `./migration/inputs/readiness-check/`. Use consistent filenames (plugin uses filename-type detection — do not use ambiguous names).

3. **Understand the XLSX structure**

   Each workbook follows a consistent layout:
   - Rows 1–4: SAP logo banner + analysis metadata (system ID, target release, run date) — merged title cells
   - Rows 5–6: column headers (often with frozen pane at row 7)
   - Data rows from row 7 onward

   Do NOT filter or re-sort in Excel before saving — the plugin reads the raw file. Numeric columns may use thousand separators per your browser locale; the plugin handles them as strings.

4. **Multi-sheet workbooks**

   Some tiles produce multi-sheet XLSX files:
   - **Simplification Items**: multiple sheets (Relevant / Consistency / Custom code impact)
   - **Custom Code (ATC)**: summary sheet + finding detail sheet
   - **Fiori Recommendations**: summary + detail

   Do not split multi-sheet workbooks. Save them as-is.

5. **Note tile availability**

   Not all tiles appear for every analysis:
   - "Custom Code (detailed, ATC)" only appears if the ATC findings ZIP was uploaded
   - "BW Extractors" only appears if BW source detected
   - "Financial Data Quality" is PDF-primary

   Note which tiles are absent in PROGRESS.md — the plugin degrades gracefully for missing tiles.

6. **Record in PROGRESS.md**

   Append: "RC XLSX exports downloaded; tiles: <list of filenames>; path: `./migration/inputs/readiness-check/`"

## Expected behaviour

- At least 5 XLSX files in `./migration/inputs/readiness-check/`
- Each file opens in Excel without errors (no password protection; UTF-8 strings)
- Custom Code (ATC) XLSX contains finding rows (columns: Object Type, Object Name, Package, Priority, Check ID, etc.)

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| XLSX download button missing for a tile | Dashboard still processing | Wait 5–10 min; refresh page |
| Custom Code (ATC) tile absent | ATC ZIP not uploaded or rejected | Return to `readiness-check-upload`; re-upload ATC ZIP |
| XLSX opens but data rows are empty | Tile has no data (e.g. no BW objects) | Expected for absent features; note in PROGRESS.md |
| File saved with browser-locale thousand separators | Regional settings | Parse as strings; plugin handles this |
| Very large XLSX (>50 MB) | Large landscape with many Fiori apps | Normal; plugin handles large files with openpyxl streaming |

## When to come back

Return here when:
- The RC analysis is refreshed after a new ATC run
- Additional tiles become populated after a re-upload

## Output for the next step

- XLSX files in `./migration/inputs/readiness-check/` feed the plugin's `ReadinessIngester`
- Custom Code ATC XLSX is the secondary impact-analysis input (alongside the ATC ZIP)
- Sizing data feeds the exec summary hardware recommendation section

## References

- SAP Note 2758146 — SAP Readiness Check planning
- [SAP Help Portal — SAP Readiness Check](https://help.sap.com/docs/SAP_READINESS_CHECK)
- [New SAP Readiness Check Landing Page in SAP for Me](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/new-sap-readiness-check-landing-page-in-sap-for-me/ba-p/14123952)
