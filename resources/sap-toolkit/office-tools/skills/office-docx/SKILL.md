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
  --title  "Monthly Report" \      # title block AND the footer's left slot;
                                   # replaces a leading "# ..." line (see below)
  [--eyebrow "Teknik Spesifikasyon"] \   # small caps line above the title
  [--classification "Confidential — Customer Restricted"] \  # footer centre
  [--no-logo] \                    # converting a document that is not ours
  [--accent 2E7D32] \              # a surface with its own designed palette
  [--heading-font Cambria] \       # ...and its own display face
  [--toc auto|on|off] \            # contents list; auto = from 8 headings up
  [--toc-title "Contents"] \       # its heading (default "İçindekiler")
  [--redact-pii] \                 # mask TCKN / 10-11 digit tax IDs first
  [--force]
```

## The house theme

The NTT DATA mark sits **top right in the header of every page** (right-aligned: a tab would land on the Header style's own centre stop, which kept it centred until 2026-09-28) — it is a
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

## Page flow

- **Contents list** after the title from eight headings up (`--toc auto`): the
  headings as links, with dotted leaders and page numbers as in a book. The
  numbers come from Word's layout -- Word opens the file read-only, invisibly,
  reports the page of each heading and closes without saving, so no sensitivity
  label is applied. Without Word (or with `NTT_DOCX_NO_WORD`) the list keeps its
  links and the file carries the update-fields flag: Word asks once on opening and
  fills the numbers (in Protected View, after *Enable editing*).
- **Nothing is left at the foot of a page:** a heading, a bold lead-in line and
  any paragraph directly above a table stay with what follows.
- **Tables:** the header row repeats on every page, a row is never split across a
  page break, and columns take the width their content asks for (never past the
  margin, never narrower than their longest word). `| | |` over a key/value
  block is a table with **no header row**: labels in bold, no empty blue bar.
- **Contents depth:** h1–h3, less the deepest level when it is a long run of
  short entries (twenty-one test cases of three lines each); `lib/toc.py`,
  the same rule the PDF uses.
- A quote or list item **wrapped over several source lines** is one paragraph.
- The footer cuts a title longer than 40 characters with "…", so it does not
  run into the classification.

## Supported Markdown subset

| Markdown | Word output |
|---|---|
| `#` … `###` | Heading 1/2/3 — Segoe UI Semibold, 1–2 in the accent, 3 in the deeper shade |
| `####` … `######` | Heading 4/5/6 — same face, stepping down in size; never italic, never Word's theme blue |
| `- ` / `* ` | bullet list (2-space indent = nesting) |
| `1.` | numbered list |
| `\| a \| b \|` + `---` row | table: filled header, zebra body, hairline rules, **no vertical lines** |
| ` ```code``` ` | shaded Consolas block |
| ` ```mermaid ` | **the diagram as a picture**, drawn by mermaid.js in Playwright's Chromium (the engine `office-pdf` uses, same colours), shrunk to the column and to 20 cm high. Without Chromium, or offline (mermaid.js comes from jsDelivr), it stays a code block and a warning says how many — say so to the user rather than handing over a TS whose diagrams are listings |
| `> quote` | callout — accent bar on the left, quieter text |
| `---` | a hairline, as in the PDF (it was a page break until 2026-09-29: an As-Built ran to 22 pages in Word and 12 in PDF) |
| `**bold**` `*italic*` `` `code` `` | inline runs |
| `[label](url)`, `<url>`, bare `https://…` | clickable hyperlink (accent, underlined) |

Every level is a real Word heading, so all six appear in the navigation pane
and in a table of contents inserted in Word (which shows 1–3 unless told
otherwise). `#######` and deeper is not a heading in Markdown and stays text.

## Who owns the title

**`--title` does.** It prints the title block and names the document in the
footer, so when it is given, a `# …` line that is the **first** content line of
the Markdown is taken as the document's title and replaces a leading `#` line
rather than rendering a second copy as Heading 1 under the title block. A skill
can therefore keep `# <title>` at the top of its Markdown — `office-pdf` and
anyone reading the `.md` need it — and render through here with `--title`
without the title appearing twice.

- Same text (markup and case ignored): taken silently.
- Different text (an FS opens with `# FS-FI-012 — <title>` and passes the
  business title alone): still taken, and the replaced heading is named on
  stderr, so nothing disappears unannounced. Put anything the reader must see
  from that line — an FS number — in the body, not only in the heading.
- A `#` further down, or a document that opens with `##`, is untouched.
- Without `--title` the leading `#` line **is** the title: it becomes the title
  block and the footer name, as in `office-pdf` (since 2026-09-29; before, it
  stayed a Heading 1 and the document had no title block).

## Tips

- Use the **same source `.md`** to produce a PDF (`office-pdf`) and a Word doc
  (`office-docx`) — one source, two deliverables.
- `--redact-pii` masks customer tax/TCKN numbers before the file is written
  (shared masker in `lib/redact.py`).
- For a spreadsheet, use **office-excel-report**; for slides, **office-pptx** or
  **office-slides**.
