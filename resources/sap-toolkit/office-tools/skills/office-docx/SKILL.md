---
name: office-docx
description: >
  Generate a native, editable Word .docx from a Markdown file via python-docx —
  headings, GFM tables, bullet/numbered lists, bold/italic/code, blockquotes, and
  code blocks, in the NTT DATA house theme. Use when the user wants a Word
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
  --title  "Monthly Report" \      # title block AND the footer's left slot
  [--eyebrow "Teknik Spesifikasyon"] \   # small caps line above the title
  [--classification "Confidential — Customer Restricted"] \  # footer centre
  [--no-logo] \                    # converting a document that is not ours
  [--accent 2E7D32] \              # a surface with its own designed palette
  [--heading-font Cambria] \       # ...and its own display face
  [--redact-pii] \                 # mask TCKN / 10-11 digit tax IDs first
  [--force]
```

## The house theme

The NTT DATA mark sits **top right in the header of every page** — it is a
section property, so it repeats however long the document grows and nothing is
pasted per page. Pass nothing to get it; pass `--no-logo` to suppress it when
converting someone else's document.

The customer's own mark is deliberately **not** here. One kit serves every
account, so a customer logo would have to be wrong for all but one of them; the
customer is named in the text instead, which is where identification belongs.

Everything else follows one accent (NTT blue `#0072BC`): headings, the rule
under the title, table header bands, the callout bar and links. Body text is
Segoe UI 10.5 at 1.35 line spacing on a ~16 cm measure — roughly 80 characters,
the width the eye tracks without losing the line.

### A surface with its own identity

`--accent` and `--heading-font` exist for one case: a surface that already has a
designed look and ships a Word edition **beside** an HTML one. The showcase pages
are that case — set in Cambria over warm paper with a restrained green, written
down as a decision — so `render_showcase.py` passes both, and takes everything
else from here: the mark in the header, real page fields, hairline tables, the
callout bar, the Turkish font slots.

The deeper title shade is **derived** from `--accent` (`theme.darken`) rather than
being a second flag, so an overridden palette cannot drift out of step with
itself. The NTT mark is never recoloured — a logo is the brand, not part of the
page's palette.

This is not a knob for taste. Without a reason of that kind, use the house theme.

## Supported Markdown subset

| Markdown | Word output |
|---|---|
| `#` / `##` / `###` | Heading 1/2/3 — Segoe UI Semibold in the accent |
| `- ` / `* ` | bullet list (2-space indent = nesting) |
| `1.` | numbered list |
| `\| a \| b \|` + `---` row | table: filled header, zebra body, hairline rules, **no vertical lines** |
| ` ```code``` ` | shaded Consolas block |
| `> quote` | callout — accent bar on the left, quieter text |
| `---` | page break |
| `**bold**` `*italic*` `` `code` `` | inline runs |
| `[label](url)`, `<url>`, bare `https://…` | clickable hyperlink (accent, underlined) |

## Tips

- Use the **same source `.md`** to produce a PDF (`office-pdf`) and a Word doc
  (`office-docx`) — one source, two deliverables.
- `--redact-pii` masks customer tax/TCKN numbers before the file is written
  (shared masker in `lib/redact.py`).
- For a spreadsheet, use **office-excel-report**; for slides, **office-pptx** or
  **office-slides**.
