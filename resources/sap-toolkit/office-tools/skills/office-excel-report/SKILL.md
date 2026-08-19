---
name: office-excel-report
description: >
  Generate a formatted, presentation-ready Excel report with styled headers,
  alternating row colors, auto-width columns, number formatting, and optional
  charts. Use when the user asks to "create a report", "format Excel",
  "add colors to spreadsheet", "make a professional Excel", "add a chart",
  "generate Excel report", or "styled spreadsheet".
allowed-tools: Bash(python:*), Bash(pip:*), Read, Write
python: .venv/bin/python3
---

# Excel Report Skill

Takes data (CSV, JSON, or xlsx) and produces a professionally formatted
Excel report using OpenPyXL. Supports title rows, header styling, alternating
row colors, column-level number formats, conditional formatting, and bar/line
charts.

---

## CRITICAL RULES

1. **Run `office-excel-transform` first** if the data needs cleaning — report_excel.py
   formats data as-is; it does not clean or reshape.
2. **Charts require numeric data** — confirm column types from `office-excel-read`
   before requesting a chart. String columns cannot be chart series.
3. **Large files** — OpenPyXL loads the entire file; warn the user if the
   input exceeds ~50k rows (suggest summary/pivot first).
4. **Multi-sheet / management reports** — `report_excel.py` handles one flat
   table per run. For reports with multiple sheets, KPI cards, section headers,
   and embedded charts per sheet, write a **custom openpyxl script** directly
   (see "Multi-Sheet Management Reports" section below).

---

## Formatting Options

| Option | Flag | Default |
|---|---|---|
| Report title (row 1) | `--title "My Report"` | none |
| Header background colour | `--header-color "1F4E79"` | dark blue |
| Header font colour | `--header-font-color "FFFFFF"` | white |
| Alternating row colour | `--alt-row-color "DCE6F1"` | light blue |
| Freeze header row | `--freeze-header` | yes |
| Auto-fit column widths | `--auto-width` | yes |
| Number format per column | `--number-format "Revenue=#,##0.00,Pct=0.00%"` | none |
| Conditional format | `--cond-format "Revenue<0=red"` | none |
| Chart type | `--chart bar\|line\|pie` | none |
| Chart columns | `--chart-cols "Month,Revenue,Cost"` | none |
| Sheet name | `--sheet "Report"` | Sheet1 |
| Read from specific sheet | `--input-sheet "Data"` | first sheet |
| A4 landscape print + freeze header row | `--print-setup` | off |

---

## Steps

### Step 1 — Prepare source data

Data should already be clean and shaped. Run `office-excel-read` then
`office-excel-transform` if needed.

### Step 2 — Run report_excel.py

```bash
python plugins/office-tools/skills/office-excel-report/scripts/report_excel.py \
  --input "<data.csv|json|xlsx>" \
  --output "<report.xlsx>" \
  --title "Monthly Revenue Report" \
  --header-color "1F4E79" \
  --alt-row-color "DCE6F1" \
  --number-format "Revenue=#,##0.00,Share=0.00%" \
  --freeze-header \
  --auto-width \
  [--chart bar --chart-cols "Month,Revenue"]
```

### Step 3 — Report to user

Confirm the output file path and size. Describe what formatting was applied
(colours used, chart included, number formats set).

---

### Step 4 — Offer a slide deck

After confirming the report, always ask:
> "Would you like a PDF/PPTX presentation from this data as well? I can use
> `office-slides` to generate a deck in under 30 seconds."

---

## Multi-Sheet Management Reports

When the request involves **multiple domains/sections, KPI summary cards,
per-sheet charts, and conditional colour coding** (e.g. a top-management
consolidated report), skip `report_excel.py` and write a **custom openpyxl
script** instead. This pattern is faster and gives full layout control.

### Recommended helper functions (copy-paste template)

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, PieChart, Reference

# NTT DATA brand palette
C_DARK_BLUE  = "003087"
C_MID_BLUE   = "00AEEF"
C_LIGHT_BLUE = "E8F4FB"
C_WHITE      = "FFFFFF"
C_GREEN      = "00B050"
C_RED        = "FF0000"
C_TOTAL_BG   = "1F3864"

def fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def font(bold=False, size=11, color="000000"):
    return Font(name="Calibri", bold=bold, size=size, color=color)

def border_thin():
    s = Side(border_style="thin", color="BFBFBF")
    return Border(left=s, right=s, top=s, bottom=s)

def align(h="left", v="center", wrap=False):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)
```

### Chart series API (openpyxl 3.x)

In openpyxl 3.x the `series[0].title.v` attribute **does not exist**. Use
these patterns instead:

```python
# Set series colour
chart.series[0].graphicalProperties.solidFill = "003087"

# Set series label via data reference (preferred)
data_ref = Reference(ws, min_col=2, max_col=2, min_row=1, max_row=13)
chart.add_data(data_ref, titles_from_data=True)   # row 1 becomes the label
```

### Sheet structure pattern for management reports

```
Row 1  – Title bar (dark blue, merged, white bold 18pt)
Row 2  – Subtitle (light blue, italic, report period)
Row 3  – blank spacer (height 8)
Row 4  – Section A header (mid-blue, bold 13pt)
Row 5  – Column headers (dark blue, white text)
Row 6+ – Data rows (alternating white / E8F4FB)
         Total row: dark navy (1F3864) background
Row N  – Section B header …
         Embed charts to the right of tables (e.g. anchor "G24")
Row M  – Footer (grey 9pt, "RESTRICTED — Org | Date")
```

---

## Common Pitfalls

| Pitfall | Why it happens | Fix |
|---|---|---|
| Chart shows no data | Column is string type | Ensure numeric columns; use `office-excel-transform --add-col` to cast |
| Column too narrow after auto-width | Column has a very long header | Set `--max-col-width 50` |
| Conditional format not visible | Colour hex missing `#` | Script accepts both `FF0000` and `#FF0000` |
| `PermissionError` on output | File open in Excel | Close the file first |
| `series[0].title.v` AttributeError | openpyxl 3.x removed that attr | Use `titles_from_data=True` on `add_data()` or set series colour only |
| `openpyxl` not found in venv | pandas doesn't pull it automatically | Run `pip install openpyxl` explicitly before the script |
| SAP BEx export has 100+ unnamed cols | BEx writes sparse multi-section grids | Read with `header=None`, scan row-by-row to find section headers and data anchors |
