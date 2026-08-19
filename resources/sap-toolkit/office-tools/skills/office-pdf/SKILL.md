---
name: office-pdf
description: >
  Convert a Markdown file to a branded, print-ready PDF using a real headless
  Chromium engine (Playwright) — full fidelity for Turkish glyphs (ı/ğ/ş/İ/ç/ö/ü),
  GitHub-style tables, emoji, code blocks, and **Mermaid diagrams rendered to SVG**
  (flowcharts, sequence, architecture). Use when the user says "make a PDF",
  "export this report to PDF", "branded PDF", "PDF for management", "PDF with
  diagrams", or wants a polished document from Markdown. Optional KVKK/PII masking.
allowed-tools: Bash(python:*), Bash(py:*), Bash(pip:*), Read, Write
---

# office-pdf — Markdown → branded PDF (Chromium)

Three-stage pipeline: **Markdown → styled HTML → Chromium-printed PDF**. A real
browser engine is used (not a Markdown→PDF converter) because that is what
renders Turkish characters, wide GFM tables, and emoji correctly. weasyprint /
xhtml2pdf were the no-browser alternatives but they choke on emoji + wide tables
and need manual font registration for Turkish — Chromium just works.

## Engine install (ON DEMAND — not in requirements.txt)

The first time only (~130 MB):

```bash
py -m pip install playwright
py -m playwright install chromium
```

If the engine is missing the script prints this and exits with code 2.
`markdown` (in requirements.txt) handles stage 1.

## Usage

```bash
py plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py \
  --input  report.md \
  --output report.pdf \
  --title  "Monthly Report" \   # footer + <title>
  [--redact-pii] \              # mask TCKN / 10-11 digit tax IDs first
  [--keep-html report.html] \   # keep the intermediate HTML
  [--force]
```

## What you get

- **A4** geometry, 16/12 mm margins, `· page/total` footer on every page.
- **Green corporate theme** — h1 with a green bottom border; table headers green
  with white text; zebra-striped rows.
- **Table survival rules** — `table-layout: fixed` + `word-wrap: break-word` so
  wide multi-column tables wrap instead of running off the page.
- **`pre { white-space: pre-wrap }`** so long code/appendix lines wrap.
- Font stack `"Segoe UI", Arial` — full Turkish glyph coverage; `print_background`
  keeps the green fills (Chromium drops backgrounds by default when printing).

## Supported Markdown

GFM tables, fenced code, headings, lists, blockquotes, images, links, emoji —
via the `markdown` extensions `tables, fenced_code, toc, sane_lists`.

## Tips

- Feed it the output of any report generator, or a hand-written `.md`.
- Use `--redact-pii` for anything with customer tax/TCKN numbers before it is
  persisted or shared (shared masker in `lib/redact.py`).
- Need an editable deliverable instead of a flat PDF? Use **office-docx** (Word)
  or **office-pptx** (PowerPoint) from the same source.

## Engine notes

Why Chromium, the must-not-regress details (print_background, footer `N/M`, fixed
table layout, the UTF-8 console wrapper for Turkish/emoji output paths) and a
troubleshooting table: [`references/MD_TO_PDF_CHROMIUM.md`](references/MD_TO_PDF_CHROMIUM.md).
