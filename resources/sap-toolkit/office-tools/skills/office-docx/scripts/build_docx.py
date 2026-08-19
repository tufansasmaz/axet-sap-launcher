"""office-docx — Markdown (subset) -> native, editable Word .docx via python-docx.

Mirrors the office-pdf input (Markdown) but produces an editable .docx with a
green corporate heading theme. Supported Markdown subset:
  # / ## / ###        headings
  - / * bullet         (nesting by 2-space indent)
  1. ordered list
  | a | b |            GFM tables (the row of --- separators is the divider)
  ```code```           fenced code block (monospace, shaded)
  > quote
  ---                  horizontal rule -> page break
  **bold**  *italic*  `code`   inline runs
  blank line           paragraph break

Usage:
    py build_docx.py --input report.md --output report.docx --title "Report"
    py build_docx.py --input r.md --output r.docx --redact-pii
"""
from __future__ import annotations

import argparse
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from redact import redact_text, count_matches
except Exception:
    redact_text = None
    count_matches = None

GREEN = (0x0A, 0x7D, 0x3C)
_INLINE = re.compile(r"(\*\*.+?\*\*|\*.+?\*|`.+?`)")


def _require_docx():
    try:
        import docx  # noqa: F401
    except ImportError:
        sys.exit("ERROR: python-docx required. Run: py -m pip install python-docx")


def _add_inline(paragraph, text):
    """Render **bold**, *italic*, `code` inline runs into a paragraph."""
    for tok in _INLINE.split(text):
        if not tok:
            continue
        if tok.startswith("**") and tok.endswith("**"):
            paragraph.add_run(tok[2:-2]).bold = True
        elif tok.startswith("*") and tok.endswith("*"):
            paragraph.add_run(tok[1:-1]).italic = True
        elif tok.startswith("`") and tok.endswith("`"):
            r = paragraph.add_run(tok[1:-1])
            r.font.name = "Consolas"
        else:
            paragraph.add_run(tok)


def _is_table_sep(line):
    return bool(re.match(r"^\s*\|?[\s:\-|]+\|?\s*$", line)) and "-" in line


def _split_row(line):
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]


def build(md_text, out_path, title):
    from docx import Document
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()
    green = RGBColor(*GREEN)

    # Theme the built-in heading styles green.
    for lvl in (1, 2, 3):
        try:
            doc.styles[f"Heading {lvl}"].font.color.rgb = green
        except Exception:
            pass

    if title:
        h = doc.add_heading(title, level=0)
        for run in h.runs:
            run.font.color.rgb = green

    lines = md_text.splitlines()
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        # blank
        if not stripped:
            i += 1
            continue

        # horizontal rule -> page break
        if stripped == "---":
            doc.add_page_break()
            i += 1
            continue

        # fenced code block
        if stripped.startswith("```"):
            i += 1
            code = []
            while i < n and not lines[i].strip().startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1  # closing fence
            p = doc.add_paragraph()
            r = p.add_run("\n".join(code))
            r.font.name = "Consolas"
            r.font.size = Pt(9)
            continue

        # heading
        m = re.match(r"^(#{1,3})\s+(.*)$", stripped)
        if m:
            doc.add_heading(m.group(2).strip(), level=len(m.group(1)))
            i += 1
            continue

        # blockquote
        if stripped.startswith(">"):
            p = doc.add_paragraph(style="Intense Quote")
            _add_inline(p, stripped.lstrip(">").strip())
            i += 1
            continue

        # GFM table: header row + separator row
        if "|" in line and i + 1 < n and _is_table_sep(lines[i + 1]):
            headers = _split_row(line)
            i += 2
            rows = []
            while i < n and "|" in lines[i] and lines[i].strip():
                rows.append(_split_row(lines[i]))
                i += 1
            table = doc.add_table(rows=1, cols=len(headers))
            table.style = "Light Grid Accent 1"
            for c, htext in enumerate(headers):
                cell = table.rows[0].cells[c]
                cell.text = ""
                _add_inline(cell.paragraphs[0], htext)
                for run in cell.paragraphs[0].runs:
                    run.bold = True
            for row in rows:
                cells = table.add_row().cells
                for c in range(len(headers)):
                    cells[c].text = ""
                    _add_inline(cells[c].paragraphs[0],
                                row[c] if c < len(row) else "")
            continue

        # bullet / ordered list
        mb = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", line)
        if mb:
            indent = len(mb.group(1)) // 2
            ordered = mb.group(2).endswith(".")
            style = "List Number" if ordered else "List Bullet"
            p = doc.add_paragraph(style=style)
            p.paragraph_format.left_indent = Pt(18 * (indent + 1))
            _add_inline(p, mb.group(3).strip())
            i += 1
            continue

        # plain paragraph (gather consecutive non-special lines)
        para = [stripped]
        i += 1
        while i < n and lines[i].strip() and not re.match(
                r"^(#{1,3}\s|[-*]\s|\d+\.\s|>|```|---)", lines[i].strip()) \
                and "|" not in lines[i]:
            para.append(lines[i].strip())
            i += 1
        p = doc.add_paragraph()
        _add_inline(p, " ".join(para))

    doc.save(out_path)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Markdown subset -> native .docx.")
    ap.add_argument("--input", required=True, help="source .md file")
    ap.add_argument("--output", required=True, help="target .docx")
    ap.add_argument("--title", default="", help="document title (Heading 0)")
    ap.add_argument("--redact-pii", action="store_true",
                    help="mask TCKN / 10-11 digit tax IDs before writing")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args(argv)

    _require_docx()
    if not os.path.isfile(args.input):
        sys.exit(f"ERROR: input not found: {args.input}")
    if os.path.exists(args.output) and not args.force:
        sys.exit(f"ERROR: {args.output} exists (use --force)")

    md_text = open(args.input, encoding="utf-8").read()
    if args.redact_pii:
        if redact_text is None:
            sys.exit("ERROR: --redact-pii requested but lib/redact.py not importable")
        n = count_matches(md_text)
        md_text = redact_text(md_text)
        sys.stderr.write(f"[redact] masked {n} ID(s) before writing\n")

    build(md_text, args.output, args.title)
    print(f"[office-docx] wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
