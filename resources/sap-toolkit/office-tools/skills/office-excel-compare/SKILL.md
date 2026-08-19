---
name: office-excel-compare
description: >
  Compare two Excel or CSV files and produce a delta report showing added,
  removed, and changed rows. Use when the user asks to "compare Excel files",
  "what changed between these spreadsheets", "diff two files", "before and after",
  "migration delta", "find differences", or "reconcile two extracts".
allowed-tools: Bash(python:*), Bash(pip:*), Read, Write
---

# Excel Compare Skill

Diffs two Excel or CSV files row-by-row using a key column and produces a
colour-coded delta report: added rows (green), removed rows (red), changed
rows (yellow with old/new values side-by-side). Useful for SAP migration
validation, data reconciliation, and change tracking.

---

## CRITICAL RULES

1. **Key column is required** for meaningful row-level comparison. Without it,
   the script falls back to positional comparison which is unreliable.
   Always ask the user for the key column (e.g. "which column uniquely
   identifies a row? e.g. order number, material number, cost centre").
2. **Both files must have the same columns** for a full diff. If columns differ,
   the script reports schema differences first.
3. **Do not store customer data in the output** — remind the user that the
   delta report will contain actual data values. If this is customer IP,
   confirm they are comfortable with the output file being in the project folder.

---

## Steps

### Step 1 — Confirm key column

Ask: "Which column uniquely identifies each row in both files?"

### Step 2 — Run compare_excel.py

```bash
.venv/bin/python3 plugins/office-tools/skills/office-excel-compare/scripts/compare_excel.py \
  --file1 "<before.xlsx>" \
  --file2 "<after.xlsx>" \
  --key "<KeyColumn>" \
  [--sheet1 "<Sheet1>"] \
  [--sheet2 "<Sheet1>"] \
  --output "<delta_report.xlsx>" \
  [--summary-only]
```

`--summary-only` prints counts only — no row data in the output (useful when
data is sensitive and you only need the delta count).

### Step 3 — Report findings

Summarise for the user:
- Total rows in file 1 vs file 2
- Added rows (in file 2, not in file 1)
- Removed rows (in file 1, not in file 2)
- Changed rows (same key, different values) — list which columns changed
- Unchanged rows
- Any key column duplicates found (signals data quality issue)

### Step 4 — Suggest next steps

- If many changes: run `office-excel-transform` to filter and focus on a specific
  change type
- If unexpected removals: check whether key column is correctly identified
- If schema diff: confirm both files represent the same extract

---

## Common Pitfalls

| Pitfall | Why it happens | Fix |
|---|---|---|
| All rows show as changed | Key column has trailing spaces or case differences | Add `--normalize-keys` to strip and lowercase keys before compare |
| Duplicate key warning | Key column is not unique in one or both files | Script flags this — ask user to provide a composite key |
| Schema mismatch error | Files have different column sets | Script lists the diff — run `office-excel-read` on both first |
| Large file is slow | Pandas merge on large frames | Add `--engine polars` for files >100k rows |
