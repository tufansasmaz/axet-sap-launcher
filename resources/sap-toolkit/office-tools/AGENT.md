# office-tools — Agent Guide

This plugin automates **office document** workflows for SAP consultants using
Python — Excel, PDF, PowerPoint, and Word. Read this before deciding which skill
to invoke.

The suite has two families:

- **Excel family** (`office-excel-*`, `office-slides`) — read/transform/report/
  compare spreadsheets and build Marp decks. Pandas / OpenPyXL.
- **Document family** (`office-pdf`, `office-pptx`, `office-docx`) — turn a
  Markdown file or a JSON spec into a branded deliverable.

---

## The Pipeline

```
User gives you an Excel file
        │
        ▼
   office-excel-read          ← always start here — confirm columns, types, sheet names
        │
        ▼
   office-excel-transform     ← clean, filter, group, pivot (produces a tidy data file)
        │
        ▼
   office-excel-report        ← styled .xlsx with headers, colours, charts, print setup
        │
        ▼
   office-slides              ← Marp PDF/PPTX presentation from the same data


Or: a Markdown report  ──►  office-pdf    (branded PDF, Chromium — Turkish/emoji/tables)
                       ──►  office-docx   (editable Word .docx)
    A JSON deck spec   ──►  office-pptx   (native editable PowerPoint)
```

You do not have to use every step. If the data is already clean, skip to
`office-excel-report`. If only a presentation is needed, go straight to `office-slides`.
If the user has a Markdown report and wants a polished file, use `office-pdf`
(flat PDF) or `office-docx` (editable Word); for an editable deck use `office-pptx`.

---

## Typical SAP Source Files

| File type | Common sheet names | Key columns |
|-----------|-------------------|-------------|
| SE Data Report (daily/weekly) | `Data`, `Pivot` | `Team`, `Ticket ID`, `Service Execution Status`, `Actual Total Duration`, `Total Duration Deviation` |
| FI Monthly Closing | `Sales`, `Regional Summary`, `AR Aging` | `Region`, `Revenue Plan`, `Revenue Actual`, `GP %` |
| SD Order Report | `Orders`, `Open Items` | `Sales Org`, `Material`, `Net Value`, `Delivery Status` |
| MM Stock Report | `Stock`, `Movements` | `Plant`, `Material`, `Unrestricted`, `Movement Type` |
| HR Headcount | `Headcount`, `Turnover` | `Cost Centre`, `Employee Group`, `FTE` |

Always run `office-excel-read` first — column names vary between extracts and customers.

---

## When to Use Which Skill

| User says... | Skill to use |
|---|---|
| "what's in this file", "show me columns", "analyze" | `office-excel-read` |
| "filter by team", "group by region", "pivot", "dedupe", "sort" | `office-excel-transform` |
| "create a formatted report", "add colors", "make it professional" | `office-excel-report` |
| "save this data as Excel", "convert CSV/JSON to xlsx" | `office-excel-write` |
| "what changed between these two files", "compare before/after" | `office-excel-compare` |
| "create a presentation from data", "slide deck from this Excel" | `office-slides` |
| "make a PDF", "branded PDF", "export this Markdown report to PDF" | `office-pdf` |
| "PowerPoint", "editable pptx", "deck I can edit in PowerPoint" | `office-pptx` |
| "Word document", "docx", "editable Word report" | `office-docx` |

### Picking a deliverable format

| Need | Skill |
|---|---|
| Spreadsheet (styled, charts) | `office-excel-report` |
| Flat PDF from Markdown (max fidelity, Turkish/emoji) | `office-pdf` |
| Editable Word doc from Markdown | `office-docx` |
| Editable PowerPoint from a spec | `office-pptx` |
| Deck rendered from tabular data (Marp) | `office-slides` |

**KVKK / PII:** `office-pdf`, `office-pptx`, and `office-docx` all accept
`--redact-pii`, which masks standalone 10-11 digit IDs (TCKN / vergi no) via the
shared `lib/redact.py` **before** the file is written. 18-digit MATNR and
≤9-digit document numbers are left untouched. Use it for anything customer-facing.

---

## Python Environment

This repo uses a venv at `.venv/`. Always call:

```bash
.venv/bin/python3 plugins/office-tools/skills/<skill>/scripts/<script>.py
```

Do **not** use bare `python3` or `pip` — on macOS this may hit the externally
managed system Python and fail.

If `.venv/` does not exist, create it once:

```bash
python3 -m venv .venv
.venv/bin/pip install -r plugins/office-tools/requirements.txt   # pandas, openpyxl, markdown, python-pptx, python-docx
npm install -g @marp-team/marp-cli                               # for office-slides --render

# office-pdf only — headless Chromium engine, installed ON DEMAND (~130 MB):
.venv/bin/python -m pip install playwright
.venv/bin/python -m playwright install chromium
```

---

## End-to-End Example — SAP SE Data Report → Management Deck

```bash
# 1. Inspect the file
.venv/bin/python3 plugins/office-tools/skills/office-excel-read/scripts/read_excel.py \
  "Daily_SE_Report.xlsx" --sheet Data --rows 5

# 2. Build team summary pivot
.venv/bin/python3 plugins/office-tools/skills/office-excel-transform/scripts/transform_excel.py \
  --input "Daily_SE_Report.xlsx" --sheet Data \
  --output /tmp/by_team.xlsx \
  --groupby "Team" \
  --agg "Executions=count(Ticket ID),Avg_Duration=mean(Actual Total Duration),Avg_Deviation=mean(Total Duration Deviation)" \
  --sort "Executions desc"

# 3. Styled Excel report with chart
.venv/bin/python3 plugins/office-tools/skills/office-excel-report/scripts/report_excel.py \
  --input /tmp/by_team.xlsx \
  --output /tmp/se_report.xlsx \
  --title "SE Execution Summary — CW17" \
  --number-format "Executions=#,##0,Avg_Duration=#,##0,Avg_Deviation=#,##0.0" \
  --cond-format "Avg_Deviation>0=orange" \
  --chart bar --chart-cols "Team,Executions" \
  --print-setup --force

# 4. PDF slide deck
.venv/bin/python3 plugins/office-tools/skills/office-slides/scripts/generate_slides.py \
  --input /tmp/by_team.xlsx \
  --output /tmp/se_deck.md \
  --title "SE Weekly Report — CW17" \
  --key-col "Team" \
  --value-cols "Executions,Avg_Duration,Avg_Deviation" \
  --highlight "Avg_Deviation>0=over plan" \
  --render pdf --force
```

---

## End-to-End Example — Monthly FI Closing → Board Report

```bash
# 1. Regional summary already in the file — read it
.venv/bin/python3 plugins/office-tools/skills/office-excel-read/scripts/read_excel.py \
  "monthly_closing.xlsx" --sheet "Regional Summary"

# 2. Filter out the TOTAL row, sort by performance
.venv/bin/python3 plugins/office-tools/skills/office-excel-transform/scripts/transform_excel.py \
  --input "monthly_closing.xlsx" --sheet "Regional Summary" \
  --output /tmp/regional.xlsx \
  --filter "Region != 'TOTAL'" \
  --sort "Achievement_% desc"

# 3. Formatted Excel
.venv/bin/python3 plugins/office-tools/skills/office-excel-report/scripts/report_excel.py \
  --input /tmp/regional.xlsx \
  --output /tmp/board_report.xlsx \
  --title "Monthly Closing — Regional Performance | Apr 2025" \
  --number-format "Revenue_Plan=€#,##0,Revenue_Actual=€#,##0,Achievement_%=0.0\"%\"" \
  --cond-format "Achievement_%<90=red;Achievement_%>=100=green" \
  --chart bar --chart-cols "Region,Revenue_Plan,Revenue_Actual" \
  --print-setup --force

# 4. Management PDF
.venv/bin/python3 plugins/office-tools/skills/office-slides/scripts/generate_slides.py \
  --input /tmp/regional.xlsx \
  --output /tmp/board_deck.md \
  --title "Board Report — Apr 2025" \
  --key-col "Region" \
  --highlight "Achievement_%<95=needs attention;Achievement_%>=100=on track" \
  --render pdf --force
```

---

## Output File Conventions

| Type | Suggested path |
|------|---------------|
| Pivot / intermediate | `/tmp/<name>_pivot.xlsx` or project `output/` folder |
| Formatted report | `<project>/reports/<name>_report.xlsx` |
| Slide deck source | `<project>/reports/<name>_deck.md` |
| Rendered PDF/PPTX | `<project>/reports/<name>_deck.pdf` |

Never write output into the same directory as the source file without confirming
with the user. Never overwrite the user's source Excel.
