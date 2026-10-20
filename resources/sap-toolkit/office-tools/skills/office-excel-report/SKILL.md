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

**The look is the house look, not an option.** Since 2026-09-29 every report
is built on `lib/xlsx_theme.py`, the workbook theme Fast Scan uses: the NTT mark
and a header block (title, customer, project, date, one line on how to read it),
a real Excel table (filter and sort on every column), house-blue header, zebra,
frozen header, A4 landscape fitted to one page wide with the title and page
numbers in the footer. Column names are shown without underscores
(`Devam_Eden` → `Devam Eden`), a share column (`…Oran…`, `rate`, `pct` with
values 0–1) as a percentage, whole numbers with thousands separators. The old
colour flags are accepted and ignored.

| Option | Flag | Default |
|---|---|---|
| Report title | `--title "Haftalık Durum"` | none |
| Header block | `--customer`, `--project`, `--version` | none (date is today) |
| One line under the title | `--legend "..."` | how to filter/sort |
| Language of the words it writes | `--lang tr\|en` | tr |
| Number format per column | `--number-format "Revenue=#,##0.00,Pct=0.00%"` | automatic (see above) |
| Conditional format | `--cond-format "Revenue<0=red"` (red/green/yellow/orange = soft fills) | none |
| Chart type | `--chart bar\|line\|pie` | none |
| Chart columns | `--chart-cols "Month,Revenue,Cost"` | none |
| Chart title | `--chart-title "..."` | the series names — never "Chart" |
| Sheet name | `--sheet "Rapor"` | Rapor |
| Read from specific sheet | `--input-sheet "Data"` | first sheet |

The chart takes the house blues (never red/green for "in progress"/"not
started"), sits under the table as wide as the table, and is inside the print
area — the page prints as one piece.

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
  --customer "Örnek A.Ş." --project "S/4HANA Dönüşüm" \
  [--number-format "Revenue=#,##0.00"] \
  [--chart bar --chart-cols "Month,Revenue" --chart-title "Aylık gelir"]
```

### Step 3 — Report to user

Confirm the output file path and size, and what the reader will find (the
table, the chart, which columns were formatted as percentages).

---

### Step 4 — Offer a slide deck

After confirming the report, always ask:
> "Would you like a PDF/PPTX presentation from this data as well? I can use
> `office-slides` to generate a deck in under 30 seconds."

---

## Multi-Sheet Management Reports

When the request involves **multiple sheets or sections, KPI rows and per-sheet
charts** (e.g. a top-management consolidated report), write a short script — but
build it on the house workbook theme, **never on a palette of your own**.
`plugins/office-tools/lib/xlsx_theme.py` is what `report_excel.py`, the Excel
delta, Fast Scan and library-match use; a hand-rolled "NTT palette" is how a
report came out in `003087` navy and Calibri beside documents in `0072BC` and
Segoe UI (that palette stood in this section until 2026-09-29).

```python
import sys
sys.path.insert(0, "plugins/office-tools/lib")        # or the installed skills' lib
import xlsx_theme as xt
from theme import ACCENT_HEX, DEEP_HEX, MUTED_HEX     # the house colours

meta = {"title": "Yönetim Raporu — Eylül 2026", "customer": "Örnek A.Ş.",
        "project": "S/4HANA Dönüşüm"}
wb = xt.new_workbook(meta)
for name, columns, rows in sections:                  # one sheet per section
    ws = xt.add_table_sheet(wb, name, columns, rows, meta=meta,
                            legend="Her kolonda filtre ve sıralama var.")
    # ...a chart under the table, series in ACCENT_HEX, DEEP_HEX, "6CACE4", MUTED_HEX
wb.save("rapor.xlsx")
```

Each sheet then has the NTT mark and header block, a filterable Excel table,
house-blue header, tinted zebra, frozen header, A4 landscape on one page wide and
the title and page numbers in the footer. `columns` is a list of
`{"key", "header", "width", "input", "choices"}`; see the module's docstring.

### Chart series API (openpyxl 3.x)

In openpyxl 3.x the `series[0].title.v` attribute **does not exist**:

```python
from openpyxl.chart.shapes import GraphicalProperties
series.graphicalProperties = GraphicalProperties(solidFill=ACCENT_HEX)
data_ref = Reference(ws, min_col=2, max_col=2, min_row=header_row, max_row=last_row)
chart.add_data(data_ref, titles_from_data=True)   # the header row becomes the label
chart.x_axis.delete = False; chart.y_axis.delete = False   # or the axes vanish
```

Blues for status series; keep red and green for a real good/bad meaning, not for
"in progress" and "not started".

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
