---
name: office-docx
description: >
  Generate a native, editable Word .docx from a Markdown file via python-docx —
  headings, GFM tables, bullet/numbered lists, bold/italic/code, blockquotes, and
  code blocks, with a green corporate heading theme. Use when the user wants a Word
  document ("docx", "Word report", "editable Word doc"). Mirrors office-pdf's
  Markdown input but yields an editable .docx. Optional KVKK/PII masking.
allowed-tools: Bash(python:*), Bash(py:*), Bash(pip:*), Read, Write
---

# office-docx — Markdown → native Word

Converts a Markdown file to an editable `.docx` with real Word styles. Same
Markdown input as **office-pdf**, but the output is editable in Word. Dependency:
`python-docx` (in requirements.txt).

## Usage

```bash
py plugins/office-tools/skills/office-docx/scripts/build_docx.py \
  --input  report.md \
  --output report.docx \
  --title  "Monthly Report" \   # Heading 0
  [--redact-pii] \              # mask TCKN / 10-11 digit tax IDs first
  [--force]
```

## Supported Markdown subset

| Markdown | Word output |
|---|---|
| `#` / `##` / `###` | Heading 1/2/3 (green theme) |
| `- ` / `* ` | bullet list (2-space indent = nesting) |
| `1.` | numbered list |
| `\| a \| b \|` + `---` row | native Word table (Light Grid Accent 1) |
| ` ```code``` ` | shaded monospace block |
| `> quote` | Intense Quote style |
| `---` | page break |
| `**bold**` `*italic*` `` `code` `` | inline runs |

## Tips

- Use the **same source `.md`** to produce a PDF (`office-pdf`) and a Word doc
  (`office-docx`) — one source, two deliverables.
- `--redact-pii` masks customer tax/TCKN numbers before the file is written
  (shared masker in `lib/redact.py`).
- For a spreadsheet, use **office-excel-report**; for slides, **office-pptx** or
  **office-slides**.
