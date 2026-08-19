---
name: office-excel-read
description: >
  Read, inspect, and profile an Excel file (.xlsx, .xls, .xlsm, .csv).
  Use when the user says "read this Excel", "what's in this spreadsheet",
  "analyze this file", "load Excel", "inspect xlsx", "show me the columns",
  "what sheets does this have", or uploads/points to a spreadsheet file.
allowed-tools: Bash(python:*), Bash(pip:*), Read, Write
---

# Excel Read Skill

Profiles an Excel or CSV file and gives Claude a structured view of its
contents — sheet names, columns, data types, null counts, sample rows,
and basic statistics. Always run this first before any transform or report.

---

## CRITICAL RULES

1. **Always check the file exists** before calling the script. If the path
   is ambiguous, ask the user to confirm the exact path.
2. **Never print raw binary** — always use the script; do not `cat` an xlsx.
3. **Polars is faster for large files** (>100k rows). Offer it when the user
   mentions performance or large data volumes.
4. **Multiple sheets** — if the file has multiple sheets, list all of them
   and ask the user which to load if they haven't specified.

---

## Steps

### Step 1 — Ensure venv is set up

```bash
# create once if missing
python3 -m venv .venv && .venv/bin/pip install pandas openpyxl polars xlrd -q
```

### Step 2 — Run read_excel.py

```bash
.venv/bin/python3 plugins/office-tools/skills/office-excel-read/scripts/read_excel.py \
  "<file_path>" \
  [--sheet "<sheet_name_or_index>"] \
  [--rows <n>] \
  [--engine pandas|polars] \
  [--output summary|json|csv]
```

Default: first sheet, 5 sample rows, pandas engine, summary output.

### Step 3 — Interpret and report

Read the stdout and summarise for the user:
- How many rows and columns
- Which columns have nulls and how many
- Any obvious data quality issues (mixed types, unexpected nulls, duplicate rows)
- What the data appears to represent

### Step 4 — Suggest next steps

Based on the profile, suggest:
- `office-excel-transform` if data needs cleaning or reshaping
- `office-excel-report` if a formatted output is needed
- `office-excel-compare` if the user wants to diff against another file

---

## Common Pitfalls

| Pitfall | Why it happens | Fix |
|---|---|---|
| `BadZipFile` error | File is `.xls` (old format), not `.xlsx` | Add `--engine xlrd` or `pip install xlrd` |
| Mixed dtype in column | Column has numbers and text | Script reports this — suggest cleaning with `office-excel-transform` |
| Large file hangs | Pandas loads full file into memory | Switch to `--engine polars` |
| Date columns read as float | Excel stores dates as serial numbers | Check for columns ending in `_date`, `_dt` — script flags them |
| SAP BEx export: 100+ "Unnamed" columns, all nulls | BEx writes sparse multi-section pivot grids; pandas guesses headers from row 0 which is a BEx filter row | Read with `pd.read_excel(..., header=None)`, then scan rows to find the real header row and section anchors |
| SAP BEx: `BExRepositorySheet` or hidden first sheet | BEx always prepends a hidden repository sheet | Skip it; the real data starts on the second sheet |
| `openpyxl` not installed | `pip install pandas` does not pull openpyxl automatically | Run `pip install openpyxl` explicitly in the venv |

## SAP BEx Export Pattern

SAP BEx workbooks export multi-section pivot grids where:
- Row 0 is a filter/parameter row (mostly empty)
- Multiple data sections sit side-by-side (Actual, Budget, Delta…) separated
  by blank columns, each starting with the same time-period header row
- Column positions must be determined by scanning, not assumed

```python
import pandas as pd

df = pd.read_excel("report.xlsx", sheet_name="Region Performance", header=None)

# Discover section boundaries from the header row (usually row 2)
hdr_row = df.iloc[2]
for col_idx, val in enumerate(hdr_row):
    if str(val).strip() == "YTD":
        print(f"YTD column at index {col_idx}")

# Extract data starting at known row
data_rows = df.iloc[4:]   # adjust to the first data row
regions   = data_rows[2]  # region names in column C (index 2)
ytd_act   = data_rows[19] # YTD Actual (section 1, YTD col)
ytd_bud   = data_rows[39] # YTD Budget (section 2, YTD col)
```
