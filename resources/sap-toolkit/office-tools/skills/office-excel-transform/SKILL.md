---
name: office-excel-transform
description: >
  Transform, clean, and reshape Excel or CSV data. Use when the user asks to
  filter rows, sort, rename columns, remove duplicates, fill blanks, group by,
  aggregate, pivot, unpivot, merge sheets, or clean messy spreadsheet data.
  Triggers: filter Excel, clean data, pivot table, group by, aggregate, dedupe,
  rename columns, merge sheets, fill empty cells, drop columns.
allowed-tools: Bash(python:*), Bash(pip:*), Read, Write
---

# Excel Transform Skill

Applies data operations to an Excel or CSV file using Pandas and writes the
result to a new file. Chains multiple operations in one call.

---

## CRITICAL RULES

1. **Always write to a new file** — never overwrite the source file. Default
   output is `<input>_transformed.xlsx`.
2. **Preview before writing** — after each transform run, show the user the
   first 5 rows of output before saving, unless `--no-preview` is set.
3. **Column names are case-sensitive** — confirm exact column names from
   `office-excel-read` output before referencing them.

---

## Available Operations

| Operation | Flag | Example |
|---|---|---|
| Filter rows | `--filter "col op value"` | `--filter "Revenue > 10000"` |
| Sort | `--sort "col1 asc,col2 desc"` | `--sort "Date desc,Name asc"` |
| Rename columns | `--rename "Old=New,A=B"` | |
| Drop columns | `--drop "col1,col2"` | |
| Keep columns | `--keep "col1,col2,col3"` | |
| Remove duplicates | `--dedupe ["col1,col2"]` | dedupe on all cols if omitted |
| Fill nulls | `--fillna "col=value,col2=0"` | |
| Group + aggregate | `--groupby "col" --agg "sum_col=sum(Revenue)"` | |
| Pivot table | `--pivot-index "col" --pivot-cols "col2" --pivot-values "val"` | |
| Unpivot (melt) | `--melt-id "col1,col2" --melt-value-name "Value"` | |
| Add column | `--add-col "NewCol=ColA * ColB"` | supports simple expressions |
| Merge sheets | `--merge-sheets --on "KeyCol"` | merges all sheets on a key |

Operations are applied in the order listed above. Chain multiple in one call.

---

## Steps

### Step 1 — Read the file first

Always run `office-excel-read` first to confirm column names and data types.

### Step 2 — Run transform_excel.py

```bash
.venv/bin/python3 plugins/office-tools/skills/office-excel-transform/scripts/transform_excel.py \
  --input "<file.xlsx>" \
  [--sheet "<sheet>"] \
  --output "<output.xlsx>" \
  [--filter "Status == 'Active'"] \
  [--sort "Date desc"] \
  [--dedupe] \
  [--groupby "Region" --agg "Total=sum(Revenue),Count=count(Revenue)"] \
  [--keep "Region,Total,Count"]
```

### Step 3 — Validate and report

After transform, run `office-excel-read` on the output and report:
- Row count before → after
- Columns before → after
- Any nulls introduced

---

## Common Pitfalls

| Pitfall | Why it happens | Fix |
|---|---|---|
| Filter drops all rows | Column name typo or wrong case | Re-check with `office-excel-read` |
| Groupby loses columns | Aggregation only keeps groupby + agg cols | Use `--keep` after groupby to restore columns if needed |
| Pivot fails with duplicate index | Multiple values for same index/column pair | Add `--pivot-aggfunc mean` or `sum` |
| Date filter fails | Date column is string type | Add `--parse-dates "DateCol"` |
