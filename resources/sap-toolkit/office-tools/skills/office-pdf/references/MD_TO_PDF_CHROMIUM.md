# Markdown → PDF via Headless Chromium — engine notes (office-pdf)

Why `office-pdf` renders Markdown through a **real browser engine** (Chromium via Playwright)
instead of a Markdown-to-PDF converter, and the non-obvious details that make it work. Adapted
from the field-proven implementation in the NTT_TR_SUPPORT "Index SAP Chatbot" project
(`docs/MD_TO_PDF_CHROMIUM.md` there); `office-pdf` is the generalized, skill-driven version of it.

## Why a browser engine

| Option | Verdict |
|--------|---------|
| `wkhtmltopdf` / WeasyPrint / xhtml2pdf | Turkish dotted/dotless **i** and wide-table layout break; partial CSS; emoji choke. |
| Word / `python-docx` → PDF | Heavy, needs Office, hard to template. |
| **Markdown → HTML+CSS → Chromium `page.pdf()`** | ✅ Real engine = perfect glyphs, full CSS, GitHub tables, page footers. **Chosen.** |

Whatever looks right in Chrome looks right in the PDF.

## Pipeline (what `md_to_pdf.py` does)

```
report.md
  → markdown.markdown(extensions=[tables, fenced_code, toc, sane_lists])   # MD → HTML body
  → title block + contents list + inline house CSS (lib/theme.py)         # HTML
  → Playwright: chromium.launch() → page.goto(file://…) → page.pdf(...)    # Chromium → PDF
  → report.pdf            (intermediate .html kept only with --keep-html)
```

## Non-obvious details that matter (don't regress these)

- **`extensions=["tables", ...]`** — without `tables`, GFM pipe tables render as literal `|` text.
- **`print_background=True`** — REQUIRED, else the blue table-header fills and zebra rows are
  dropped (Chromium omits backgrounds when printing by default).
- **Page footer `N/M`** — `display_header_footer=True` + a `footer_template` using Chromium's
  special `<span class="pageNumber">` / `<span class="totalPages">`. The page CSS does **not**
  apply to header/footer templates — their font-size must be set **inline**. The header carries
  the NTT mark as a `data:` URI (a template is its own document and cannot load a file);
  `--no-logo` gives an empty `<div>`, which suppresses Chromium's default date/title.
- **`@page` margins vs `page.pdf(margin=…)`** — Chromium honours the `page.pdf` margins for the
  PDF; the `@page` rule keeps the standalone HTML preview consistent. (office-pdf leaves slightly
  more top/bottom for the footer band.)
- **Auto table layout, deliberately** (since 2026-09-29) — columns take the width their
  content asks for, as Word's do: `table-layout: auto` + `overflow-wrap: break-word`, so a
  word is never broken and no column is narrower than its longest word. Long ABAP names
  get a `<wbr>` after each `_` inside table cells, and a short code (`FR-001`) is `nowrap`.
  `table-layout: fixed` + `overflow-wrap: anywhere` is what it replaced: every column the
  same width, a `No` column as wide as the text beside it, "FR-" over "001".
- **Contents page numbers** — a second print: the first one's bookmarks (`outline=True`,
  `tagged=True`) say where each heading landed; read with pymupdf or pypdf, matched to the
  contents entries by text. Without a PDF reader the list has links and no numbers.
- **UTF-8 console** — `md_to_pdf.py` wraps `sys.stdout`/`sys.stderr` in a UTF-8
  `TextIOWrapper(errors="replace")` at import. Without it, printing a Turkish/emoji output path
  or title crashes with `UnicodeEncodeError` on a Windows console (cp1254/cp437). **Keep it.**

## Using office-pdf

```bash
py -m pip install markdown playwright        # one-time
py -m playwright install chromium            # one-time (~130 MB, on demand)

py md_to_pdf.py --input report.md --output report.pdf --title "Report"
py md_to_pdf.py --input r.md --output r.pdf --redact-pii      # mask TCKN/tax IDs first
py md_to_pdf.py --input r.md --output r.pdf --keep-html r.html --force
```

`--title` is the title block and the footer name; without it the document's first
`# ...` line is. `--eyebrow`, `--classification`, `--toc`, `--page-word` as in SKILL.md. `--redact-pii` masks standalone
10–11 digit IDs (TCKN / vergi no) via the shared `lib/redact.py` before rendering.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Table fills / zebra rows missing in PDF | `print_background=True` not set (it is, by default — don't remove). |
| `Executable doesn't exist … chromium` | `py -m playwright install chromium`. |
| Turkish chars show as boxes | font stack missing a Unicode face — keep Segoe UI / Noto Sans. |
| Pipe tables render as raw `\|` text | `tables` extension missing from `markdown.markdown(...)`. |
| Console `UnicodeEncodeError` on print | the UTF-8 `sys.stdout/stderr` wrapper was removed — restore it. |
| Wide content runs off the page | a long unbreakable token outside `<code>`; put it in backticks (code breaks after `_`). |
