---
name: office-excel-images
description: >
  Extract embedded images (inserted pictures / logos / screenshots) from an
  Excel workbook (.xlsx, .xlsm) to a folder of image files. Use when the user
  says "extract images from Excel", "get the pictures out of this spreadsheet",
  "pull the logos from xlsx", "save the embedded images", "there are photos in
  this Excel I need as files", or "rip images from a workbook".
allowed-tools: Bash(python:*), Bash(pip:*), Read, Write
---

# Excel Images Skill

Pulls every embedded picture out of an `.xlsx` / `.xlsm` workbook and writes
each one as a standalone image file (`.png`, `.jpg`, …). Images are named by
the sheet and cell they are anchored to (e.g. `Sheet1_B2_1.png`) so you can tell
where each one came from.

Useful for: harvesting product photos or logos suppliers embed in price lists,
recovering screenshots pasted into an Excel-based test log, or migrating image
assets out of a spreadsheet into a proper folder.

---

## CRITICAL RULES

1. **Only inserted pictures are embedded** — charts, sparklines, conditional
   formatting, and cell background colours are **not** images in the file and
   cannot be extracted. If the user means a chart, point them to a screenshot
   instead. Only pictures under `xl/media/` come out.
2. **Legacy `.xls` is not supported** — old-format `.xls` stores pictures in an
   OLE stream, not a zip. The script exits with a clear message; ask the user to
   re-save as `.xlsx` first.
3. **Check the file exists** before running. If the path is ambiguous, confirm
   the exact path with the user.
4. **Customer data caution** — extracted images may contain product photos,
   signatures, or ID scans. Remind the user the output folder will hold real
   image content before extracting a customer workbook.

---

## Steps

### Step 1 — Ensure venv is set up

```bash
# create once if missing
python3 -m venv .venv && .venv/bin/pip install openpyxl -q
```

`openpyxl` is the only dependency; it is already in the office-tools
`requirements.txt`.

### Step 2 — Run extract_images.py

```bash
.venv/bin/python3 plugins/office-tools/skills/office-excel-images/scripts/extract_images.py \
  "<file.xlsx>" \
  [--out "<output_folder>"] \
  [--output summary|json]
```

Default output folder is `<file-stem>_images` next to the workbook. Default
report is a human-readable summary; use `--output json` for a manifest you can
feed into another step (e.g. `office-manual` or `office-pptx`).

### Step 3 — Report findings

Summarise for the user:
- How many images were extracted and where they were saved
- The sheet/cell each image came from (from the summary table)
- Whether any images were **rescued from `xl/media/`** without a cell anchor
  (header/footer images or grouped shapes) — flagged as `unplaced_*`
- If zero images: confirm the workbook only has charts/formatting, not pictures

### Step 4 — Suggest next steps

- Building documentation from the images → `office-manual` or `office-pptx`
- Need the surrounding data too → `office-excel-read` on the same file
- Images are product photos keyed to rows → read the sheet to pair each
  `Sheet_Cell` image with its material/product row

---

## How it works (two passes)

| Pass | Tool | Purpose |
|---|---|---|
| 1 | openpyxl worksheet `_images` | Locates each picture by **sheet + anchor cell** → friendly names |
| 2 | direct zip scan of `xl/media/` | Rescues images openpyxl misses (header/footer, grouped shapes), de-duplicated by content hash |

An `.xlsx` is a zip archive; the second pass guarantees nothing embedded is left
behind even when the anchor metadata is unusual.

---

## Common Pitfalls

| Pitfall | Why it happens | Fix |
|---|---|---|
| "No embedded images found" | Workbook has charts or coloured cells, not inserted pictures | Those are not `xl/media/` assets — nothing to extract; suggest a screenshot |
| `.xls` rejected | Old binary format stores pictures in OLE, not a zip | Re-save as `.xlsx` and retry |
| Images named `unplaced_*` | Anchored in a header/footer or inside a grouped shape | Expected — openpyxl can't map those to a cell; they are still extracted |
| Duplicate-looking images collapse to one | Same picture reused in many cells shares one `xl/media/` entry | By design — content is de-duplicated by MD5; one file per unique image |
| `BadZipFile` / "not a valid OOXML container" | File is corrupt or actually a renamed `.xls`/HTML | Open in Excel and re-save as `.xlsx` |
| Wrong cell reported | Two-cell anchors report the top-left `from` marker | This is the intended anchor origin; the image may span to a lower-right cell |
