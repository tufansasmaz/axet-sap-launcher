---
name: office-excel-write
description: >
  Write data to an Excel file (.xlsx) from CSV, JSON, or in-memory data.
  Use when the user says "save as Excel", "export to Excel", "write to xlsx",
  "create an Excel file", "convert CSV to Excel", or "save this data as spreadsheet".
allowed-tools: Bash(python:*), Bash(pip:*), Read, Write
---

# Excel Write Skill

Writes structured data (CSV, JSON, or tab-separated text) to a formatted
`.xlsx` file. Applies auto-column widths and a styled header row by default.

---

## CRITICAL RULES

1. **Never overwrite without confirming** — if the output file already exists,
   ask the user before overwriting.
2. **Validate input first** — run `office-excel-read` on any input xlsx before writing
   back to it to confirm structure.
3. **Sheet name max 31 chars** — Excel silently truncates; warn the user if
   their sheet name is longer.

---

## Steps

### Step 1 — Prepare input

The script accepts:
- `--input <file>` — CSV, TSV, or JSON file (array of objects)
- `--stdin` — pipe data directly: `echo '[{"col": 1}]' | python write_excel.py --stdin`

### Step 2 — Run write_excel.py

```bash
.venv/bin/python3 plugins/office-tools/skills/office-excel-write/scripts/write_excel.py \
  --input "<input_file>" \
  --output "<output.xlsx>" \
  [--sheet "<Sheet1>"] \
  [--title "<Report Title>"] \
  [--no-header-style]
```

### Step 3 — Confirm output

After the script exits 0, confirm the file exists:

```bash
ls -lh "<output.xlsx>"
```

Report the file size and full path to the user.

---

## Common Pitfalls

| Pitfall | Why it happens | Fix |
|---|---|---|
| `PermissionError` on output | File open in Excel | Close the file in Excel first |
| JSON not an array | JSON is a dict, not a list of records | Wrap in `[]` or use `--json-key <key>` to extract the array |
| Date columns saved as text | Pandas reads them as strings | Use `--parse-dates "<col1>,<col2>"` |
