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
  --title  "Monthly Report" \   # title block + footer; replaces a leading '# ...'
  [--eyebrow "TEKNIK SPESIFIKASYON"] \          # small caps line above the title
  [--classification "Confidential — Customer Restricted"] \   # footer centre
  [--toc auto|on|off] [--toc-title Contents] [--page-word Page] \
  [--no-logo] \                 # a document that is not ours
  [--redact-pii] \              # mask TCKN / 10-11 digit tax IDs first
  [--keep-html report.html] \   # keep the intermediate HTML
  [--force]
```

Without `--title`, the document's own first `# ...` line is the title.

## What you get — the Word edition's page

Since 2026-09-29 a PDF and its `office-docx` twin are the same document on
paper: until then an FS went to the customer twice, once with the NTT mark and
a classification (Word) and once with neither (PDF).

- **A4, Word's margins** (2.7 cm sides, 2.6 top, 2.2 bottom); the **NTT mark
  top right** on every page; footer **title · classification · Sayfa n / m**
  over a hairline.
- **Title block**: eyebrow in accent small caps, the title light and large over
  an accent rule — not an underlined H1.
- **Contents list** from eight h1–h3 headings (`--toc auto`), dotted leaders,
  linked. **Page numbers** come from a second print: the first one's bookmarks
  say where each heading landed (needs `pymupdf` or `pypdf`; without either the
  list keeps its links and drops the numbers, and says so). The PDF also carries
  bookmarks — the headings — like Word's navigation pane.
- **House theme** (`lib/theme.py`, shared with the .docx): six heading steps in
  Word's sizes and colours; table headers filled with white text; zebra rows;
  horizontal hairlines only.
- **Tables sized by content**, as Word's are: a word never breaks, so no column
  is narrower than its longest word; a short code (`FR-001`) stays on one line;
  an ABAP name in a cell may break after `_`. Header rows repeat, rows do not split.
- **`pre { white-space: pre-wrap }`** so long code/appendix lines wrap.
- `#1 text` is text: a heading needs the space after `#`.

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
