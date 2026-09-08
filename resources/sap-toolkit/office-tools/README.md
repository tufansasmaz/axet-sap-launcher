# office-tools

Office document automation for SAP consultants — Excel, PDF, PowerPoint, and Word, using Python (Pandas, OpenPyXL, Playwright/Chromium, python-pptx, python-docx).

---

## Skills

### Excel family

| Skill | Trigger | What it does |
|---|---|---|
| **office-excel-read** | "read this Excel", "what's in this file", "inspect xlsx" | Profiles a file: shape, column types, nulls, unique counts, sample rows, numeric stats, data quality flags |
| **office-excel-write** | "save as Excel", "export to xlsx", "convert CSV to Excel" | Writes CSV/JSON to a formatted `.xlsx` with styled header and auto-width columns |
| **office-excel-transform** | "filter rows", "group by", "pivot", "clean data", "dedupe" | Chains filter/sort/rename/drop/dedupe/fillna/groupby/pivot/melt/add-col operations |
| **office-excel-report** | "create Excel report", "format with colors", "add a chart" | Generates a professionally formatted report with header styling, alternating rows, number formats, conditional formatting, and bar/line/pie charts |
| **office-excel-compare** | "compare two files", "what changed", "migration delta", "diff spreadsheet" | Produces a colour-coded delta report: added (green), removed (red), changed (yellow) |
| **office-excel-images** | "extract images from Excel", "get the pictures out", "pull logos from xlsx", "save embedded images" | Extracts every embedded picture to image files, named by the sheet + cell they are anchored to (`Sheet1_B2_1.png`) |
| **office-slides** | "slide deck from this data", "Marp presentation" | Renders a Marp PDF/PPTX/HTML deck from tabular data |

### Document family

| Skill | Trigger | What it does |
|---|---|---|
| **office-pdf** | "make a PDF", "branded PDF", "PDF for management" | Markdown → styled HTML → **headless-Chromium** PDF. Full Turkish/emoji/GFM-table fidelity, A4, green theme, page footers |
| **office-pptx** | "PowerPoint", "editable pptx", "deck I can edit" | Native, editable `.pptx` (real text boxes, bullets, tables) via python-pptx — from a JSON spec or a Markdown deck |
| **office-docx** | "Word document", "docx", "editable Word report" | Markdown (subset) → native, editable Word `.docx` via python-docx |
| **office-manual** | "user manual", "user guide with screenshots", "document this SAP process", "turn these screenshots into a manual" | Step-by-step user manual (`.docx` or `.pptx`) from a JSON manifest — embeds screenshots natively, one step per section/slide. Pairs with **sapgui-scriptter**'s `take_screenshot.py` to capture SAPGUI screens |

The document skills accept **`--redact-pii`** — masks standalone 10–11 digit IDs (TCKN / vergi no) via the shared `lib/redact.py` **before** the file is written. 18-digit MATNR and ≤9-digit document numbers are left untouched.

---

## Install

```bash
/plugin install office-tools@ntt-abap-marketplace
pip install -r ~/.claude/plugins/ntt-abap-marketplace/office-tools/requirements.txt
```

Core dependencies: `pandas`, `polars`, `openpyxl`, `xlrd`, `markdown`, `python-pptx`, `python-docx`

**office-pdf only** needs a headless Chromium engine, installed on demand (~130 MB):

```bash
py -m pip install playwright
py -m playwright install chromium
```

---

## Typical workflow

```
User: "Read this file and give me a summary"
  → office-excel-read

User: "Clean it — remove duplicates and fill blanks in the Status column"
  → office-excel-transform --dedupe --fillna "Status=Unknown"

User: "Now generate a formatted monthly report grouped by region"
  → office-excel-transform --groupby + office-excel-report

User: "Compare this with last month's extract"
  → office-excel-compare --key "OrderNumber"
```

---

## Script reference

| Script | Location |
|---|---|
| `read_excel.py` | `skills/office-excel-read/scripts/` |
| `write_excel.py` | `skills/office-excel-write/scripts/` |
| `transform_excel.py` | `skills/office-excel-transform/scripts/` |
| `report_excel.py` | `skills/office-excel-report/scripts/` |
| `compare_excel.py` | `skills/office-excel-compare/scripts/` |
| `extract_images.py` | `skills/office-excel-images/scripts/` |
| `generate_slides.py` | `skills/office-slides/scripts/` |
| `md_to_pdf.py` | `skills/office-pdf/scripts/` |
| `build_pptx.py` | `skills/office-pptx/scripts/` |
| `build_docx.py` | `skills/office-docx/scripts/` |
| `build_manual.py` | `skills/office-manual/scripts/` |
| `redact.py` (shared lib) | `lib/` |

Each script accepts `--help` for full argument reference.

---

## Engine choice

| Scenario | Use |
|---|---|
| Standard files (<100k rows) | `pandas` (default) |
| Large files (>100k rows) | `--engine polars` |
| Old `.xls` format | pandas + `xlrd` (auto-detected) |
| Excel formatting / charts | `openpyxl` (used by report + write scripts) |

---

*Part of the NTT ABAP Marketplace. Contact Beyhan (admin) for access.*
