"""office-pdf — Markdown -> branded HTML -> headless-Chromium PDF.

A real browser engine (Chromium via Playwright) is used instead of a
Markdown->PDF converter because that is what renders Turkish glyphs
(ı/ğ/ş/İ/ç/ö/ü), GitHub-style tables, and emoji correctly. weasyprint /
xhtml2pdf choke on emoji + wide tables and need manual font registration.

Pipeline (3 stages):
  1. Markdown -> HTML  (markdown lib: tables, fenced_code, toc, sane_lists)
  2. Wrap in print-oriented branded CSS (A4, NTT house frame: mark, title block, contents, footer)
  3. HTML -> PDF       (Chromium .pdf(): print_background, page-number footer)

Mermaid diagrams: ```mermaid fenced blocks are rendered to inline SVG by
mermaid.js inside the same Chromium (house colours), so architecture/flow/
sequence diagrams print as real graphics, not code. mermaid.js loads only
when the document contains a mermaid fence; the printer waits for render.

Usage:
    py md_to_pdf.py --input report.md --output report.pdf --title "Report"
    py md_to_pdf.py --input r.md --output r.pdf --redact-pii   # mask TCKN/tax IDs
    py md_to_pdf.py --input r.md --output r.pdf --keep-html r.html

Playwright + Chromium are installed ON DEMAND (not in requirements.txt):
    py -m pip install playwright
    py -m playwright install chromium
This script prints those commands and exits 2 if the engine is missing.
"""
from __future__ import annotations

import argparse
import html as _htmllib
import io
import os
import re
import sys

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# UTF-8-safe console — Turkish glyphs (ı/ğ/ş/İ/ç/ö/ü) or emoji in an output path
# or title must not crash on the Windows console code page (cp1254/cp437) with
# UnicodeEncodeError. Wrap both streams, guarded. See references/MD_TO_PDF_CHROMIUM.md.
for _name in ("stdout", "stderr"):
    _stream = getattr(sys, _name, None)
    if _stream is not None and hasattr(_stream, "buffer"):
        try:
            setattr(sys, _name,
                    io.TextIOWrapper(_stream.buffer, encoding="utf-8", errors="replace"))
        except Exception:
            pass

# --- shared redaction lib (plugins/office-tools/lib) -------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from redact import redact_text, count_matches
except Exception:  # lib missing -> redaction simply unavailable
    redact_text = None
    count_matches = None

# The house palette, shared with every other Office renderer. Not wrapped in a
# try: a missing theme means a PDF in the wrong brand, which is worse than a
# loud failure -- unlike redaction, which degrades to "unavailable" honestly.
from theme import (ACCENT_HEX, BAND_HEX, DEEP_HEX, INK_HEX,  # noqa: E402
                   MUTED_HEX, RULE_HEX, TINT_HEX, logo_path)

ENGINE_HINT = (
    "Headless Chromium engine not found. Install it once (~130 MB):\n"
    "    py -m pip install playwright\n"
    "    py -m playwright install chromium\n"
)

# Print-oriented CSS. The house theme (lib/theme.py) + the table-survival rules
# (fixed layout + break-word) are what keep wide tables on the page. Colours are
# interpolated rather than typed, so this file cannot drift from the .docx.
# The page is the Word edition's page (office-docx): the same A4 margins, the
# same 10.5pt text at 1.35 leading, the same six heading steps in the same
# colours, the title block and the contents list. Until 2026-09-29 a PDF FS and
# its .docx looked like two documents from two companies -- no mark, no
# classification, a 20pt underlined H1 where Word has a title block.
CSS = f"""
@page {{ size: A4; }}
* {{ box-sizing: border-box; }}
body {{
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt; line-height: 1.35; color: #{INK_HEX}; margin: 0;
}}
p {{ margin: 0 0 10pt; }}
h1, h2, h3, h4, h5, h6 {{ font-weight: 600; line-height: 1.15; margin: 0 0 8pt; }}
h1 {{ font-size: 16pt; color: #{ACCENT_HEX}; margin-top: 22pt; }}
h2 {{ font-size: 13.5pt; color: #{ACCENT_HEX}; margin-top: 18pt; }}
h3 {{ font-size: 12pt; color: #{DEEP_HEX}; margin-top: 14pt; }}
h4 {{ font-size: 11pt; color: #{INK_HEX}; margin-top: 12pt; }}
h5 {{ font-size: 10.5pt; color: #{INK_HEX}; margin-top: 8pt; }}
h6 {{ font-size: 10pt; color: #{MUTED_HEX}; margin-top: 8pt; }}
.eyebrow {{ font-size: 8pt; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
           color: #{ACCENT_HEX}; margin: 0 0 3pt; }}
.doc-title {{ font-size: 22pt; font-weight: 300; color: #{DEEP_HEX}; line-height: 1.1;
             border-bottom: 1.5pt solid #{ACCENT_HEX}; padding-bottom: 9pt; margin: 0 0 20pt; }}
.toc {{ margin: 0 0 18pt; }}
.toc .toc-h {{ font-size: 13.5pt; font-weight: 600; color: #{ACCENT_HEX}; margin: 0 0 8pt; }}
.toc a {{ display: flex; color: #{INK_HEX}; text-decoration: none; line-height: 1.6; }}
.toc a .t {{ flex: 0 1 auto; }}
.toc a .dots {{ flex: 1 1 auto; border-bottom: 1px dotted #{MUTED_HEX}; margin: 0 4pt 4pt; }}
.toc a .n {{ flex: 0 0 auto; }}
.toc .l1 {{ font-weight: 600; margin-top: 3pt; }}
.toc .l2 {{ padding-left: 12pt; }}
.toc .l3 {{ padding-left: 24pt; color: #{MUTED_HEX}; }}
a {{ color: #{ACCENT_HEX}; }}
/* Columns take the width their content asks for, as Word's do (office-docx
   _size_columns): a `No` column holding "V-13" is not as wide as the text
   beside it. A word is never broken, so no column is narrower than its longest
   word; only code -- long object names -- may break, which keeps a wide table
   on the page. */
table {{ width: 100%; border-collapse: collapse; table-layout: auto; margin: 10px 0; }}
td code, th code {{ white-space: normal; }}
td.nw {{ white-space: nowrap; }}
table.kv td:first-child {{ font-weight: 600; }}
table.kv tr:nth-child(even) td {{ background: transparent; }}
table.kv tr:nth-child(odd) td {{ background: #{BAND_HEX}; }}
/* Horizontal hairlines only -- a full grid reads as a cage at this size, the
   same call the .docx tables make. */
th, td {{ border: none; border-bottom: 1px solid #{RULE_HEX};
         padding: 6px 8px; text-align: left;
         vertical-align: top; overflow-wrap: break-word; }}
th {{ background: #{ACCENT_HEX}; color: #fff; font-weight: 600; border-bottom: none; }}
tr:nth-child(even) td {{ background: #{BAND_HEX}; }}
code {{ font-family: "Cascadia Code", Consolas, monospace; font-size: 9.5pt;
       background: #{BAND_HEX}; padding: 1px 4px; border-radius: 3px; }}
pre {{ background: #{BAND_HEX}; border: 1px solid #{RULE_HEX}; border-radius: 4px;
      padding: 10px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }}
pre code {{ background: none; padding: 0; }}
blockquote {{ border-left: 4px solid #{ACCENT_HEX}; margin: 10px 0;
             padding: 6px 14px; color: #{MUTED_HEX}; background: transparent; }}
hr {{ border: none; border-top: 1px solid #{RULE_HEX}; margin: 16px 0; }}
img {{ max-width: 100%; }}
/* Mermaid diagrams render to inline SVG (see mermaid support below). */
.mermaid {{ background: #fff; border: 1px solid #{RULE_HEX}; border-radius: 6px;
           padding: 12px; margin: 12px 0; text-align: center; break-inside: avoid; }}
/* An UNBREAKABLE element taller than one page yields a blank page in Chromium
   print (seen live: a 3-subgraph `flowchart TB` under a TS "Teknik Mimari"
   heading). Diagrams therefore scale to fit a single page: 240mm ≈ A4 height
   minus margins. Tables and code blocks take the opposite cure — they are
   ALLOWED to break across pages (a long TS object list or pseudocode block
   would otherwise hit the same blank-page failure), with table headers
   repeating on every page. */
.mermaid svg {{ max-width: 100%; max-height: 240mm; width: auto; height: auto; }}
thead {{ display: table-header-group; }}
h1, h2, h3, h4, h5, h6 {{ break-inside: avoid; break-after: avoid; }}
tr {{ break-inside: avoid; }}
"""

# Loaded as an ES module only when the document actually contains ```mermaid
# fences. mermaid.run() renders each <pre class="mermaid"> to SVG in the same
# Chromium that prints the PDF; window.__mmDone lets the printer wait for it.
MERMAID_JS = """
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({startOnLoad:false, theme:'base', securityLevel:'loose',
  themeVariables:{primaryColor:'#%s', primaryBorderColor:'#%s',
  primaryTextColor:'#%s', lineColor:'#%s',
  fontFamily:'Segoe UI, sans-serif', fontSize:'14px'}});
window.__mmDone = false;
(async () => { try { await mermaid.run(); } catch (e) { console.log('mermaid', e); }
              window.__mmDone = true; })();
</script>
""" % (TINT_HEX, ACCENT_HEX, DEEP_HEX, MUTED_HEX)

# Word's margins (office-docx): 2.7 cm each side, 2.6 top, 2.2 bottom, header
# and footer 1.1 cm from the edge.
MARGIN = {"top": "26mm", "bottom": "22mm", "left": "27mm", "right": "27mm"}
EMPTY_HEADER = '<div style="height:0"></div>'


def _header(logo: bool) -> str:
    """The mark top right, as in Word. Chromium's header is a separate document
    that cannot load a file, so the picture travels as a data: URI."""
    if not logo:
        return EMPTY_HEADER
    mark = logo_path()
    if mark is None:
        inner = (f'<span style="font:700 12pt \'Segoe UI\';color:#{ACCENT_HEX}">'
                 'NTT DATA</span>')
    else:
        import base64
        inner = ('<img style="width:31mm" src="data:image/png;base64,'
                 + base64.b64encode(mark.read_bytes()).decode() + '">')
    return ('<div style="width:100%;padding:0 27mm;margin-top:11mm;'
            f'text-align:right;-webkit-print-color-adjust:exact">{inner}</div>')


_ONE_LINE = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis"


def _footer(title: str, classification: str, page_word: str) -> str:
    """Document, how far it may travel, where the page sits -- Word's footer."""
    e = _htmllib.escape
    return (
        '<div style="width:100%;margin:0 27mm 11mm;padding-top:4pt;'
        f'border-top:0.75pt solid #{RULE_HEX};display:flex;'
        "font-family:'Segoe UI',sans-serif;font-size:8pt;"
        f'color:#{MUTED_HEX};-webkit-print-color-adjust:exact">'
        # One line each: a long title is cut with an ellipsis rather than
        # pushing the footer to two lines on every page.
        f'<span style="flex:1 1 45%;text-align:left;{_ONE_LINE}">{e(title or "")}</span>'
        f'<span style="flex:1 1 35%;text-align:center;{_ONE_LINE}">{e(classification or "")}</span>'
        f'<span style="flex:0 0 auto;text-align:right;white-space:nowrap">{e(page_word)} '
        '<span class="pageNumber"></span> / <span class="totalPages"></span></span>'
        "</div>")


_LEAD_H1 = re.compile(r"^#\s+(.+?)\s*#*\s*$")


def take_leading_title(md_text: str, title: str) -> tuple[str, str]:
    """The first line's `# heading` is the document title: the title block shows
    it, so it is not printed a second time as a heading. `--title` wins over it
    (an FS opens with `# FS-MM-001 — <title>` and passes the business title).
    Returns the remaining text and the title to show."""
    lines = md_text.split("\n")
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        m = _LEAD_H1.match(line.strip())
        if m:
            return "\n".join(lines[:idx] + lines[idx + 1:]), (title or m.group(1).strip())
        break
    return md_text, title


_BARE_HASH = re.compile(r"^(\s*(?:[-*+]|\d+\.)?\s*)#(?=[^\s#])")


def _no_bare_hash_headings(md_text: str) -> str:
    """`#1 paket` is text, not a heading: a heading needs the space after `#`.

    Python-Markdown does not ask for the space, so a TS bullet reading
    "- #1 paket açıklaması…" printed as a page-wide heading with a bullet in
    front of it (2026-09-29). Escaping the `#` keeps it text. Code fences are
    left alone -- a `#comment` there must print as written.
    """
    out, fence = [], False
    for line in md_text.split("\n"):
        if line.lstrip().startswith("```"):
            fence = not fence
        elif not fence:
            line = _BARE_HASH.sub(r"\1\\#", line)
        out.append(line)
    return "\n".join(out)


def md_to_html(md_text: str, title: str, eyebrow: str = "", toc: str = "off",
               toc_title: str = "İçindekiler", pages: list | None = None) -> str:
    """Markdown -> the print page. `toc` is auto / on / off (auto: eight
    headings and more, as in Word); `pages`, when known from a first pass, are
    the page numbers of the contents entries in document order."""
    try:
        import markdown
    except ImportError:
        sys.exit("ERROR: the 'markdown' package is required. "
                 "Run: py -m pip install markdown")

    # Pull ```mermaid fences out BEFORE markdown runs (otherwise fenced_code
    # would HTML-escape them into <pre><code>). Re-inject afterwards as
    # <pre class="mermaid"> so mermaid.js can render them to SVG.
    blocks: list[str] = []

    def _stash(m):
        blocks.append(m.group(1))
        return f"\n\nMMD{len(blocks) - 1}MARK\n\n"

    md_text = re.sub(r"```mermaid[ \t]*\n(.*?)\n```", _stash, md_text, flags=re.DOTALL)
    md_text = _no_bare_hash_headings(md_text)

    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "sane_lists"],
    )

    def _unstash(m):
        return f'<pre class="mermaid">{_htmllib.escape(blocks[int(m.group(1))])}</pre>'

    body = re.sub(r"<p>MMD(\d+)MARK</p>", _unstash, body)
    body = re.sub(r"MMD(\d+)MARK", _unstash, body)

    # A long object name in a table cell may break after an underscore, the
    # only place an ABAP name can break and still be read -- short names stay
    # whole, and the column is as narrow as the longest segment.
    body = re.sub(r"<td>.*?</td>", lambda m: re.sub(
        r"<code>(.*?)</code>", lambda c: "<code>" + c.group(1).replace("_", "_<wbr>") + "</code>",
        m.group(0), flags=re.DOTALL), body, flags=re.DOTALL)

    # A short code with no space ("FR-001", "2026-09-28") stays on one line: a
    # hyphen is a break opportunity, and a No column read "FR-" over "001".
    body = re.sub(r"<td>(?=[^<\s]{1,14}</td>)", '<td class="nw">', body)
    # `| | |` over a key/value block: a table with no header. Its empty header
    # row printed as a bare blue bar; drop it and set the labels in bold.
    body = re.sub(r"<table>\s*<thead>\s*<tr>(?:\s*<th[^>]*>\s*</th>)+\s*</tr>\s*</thead>",
                  '<table class="kv">', body)

    mermaid_script = MERMAID_JS if blocks else ""
    safe_title = _htmllib.escape(title or "")
    head = ""
    if title:
        if eyebrow:
            head += f'<div class="eyebrow">{_htmllib.escape(eyebrow)}</div>'
        head += f'<div class="doc-title">{safe_title}</div>'
    if toc == "on" or (toc == "auto" and len(_toc_entries(body)) >= 8):
        head += _toc_html(_toc_heads(body), toc_title, pages)
    return (
        "<!doctype html><html lang='tr'><head><meta charset='utf-8'>"
        f"<title>{safe_title}</title><style>{CSS}</style></head>"
        f"<body>{head}{body}{mermaid_script}</body></html>"
    )


_H_TAG = re.compile(r'<h([1-3]) id="([^"]+)">(.*?)</h\1>', re.DOTALL)


def _toc_entries(body: str) -> list:
    """(level, id, text) of every h1-h3, the levels Word's contents list shows."""
    return [(int(m.group(1)), m.group(2), re.sub(r"<[^>]+>", "", m.group(3)).strip())
            for m in _H_TAG.finditer(body)]


def _toc_heads(body: str) -> list:
    """The entries the contents list shows: h1-h3, less the deepest level when
    it is a long run of short sections (lib/toc.py, the same rule as Word)."""
    from toc import toc_depth
    body = re.sub(r"<script.*?</script>", "", body, flags=re.DOTALL)
    found = list(_H_TAG.finditer(body))
    nxt = [m.start() for m in re.finditer(r"<h[1-6][ >]", body)] + [len(body)]
    sized = []
    for m in found:
        end = min(x for x in nxt if x > m.start())
        chars = len(re.sub(r"<[^>]+>", "", body[m.end():end]).strip())
        sized.append((int(m.group(1)), chars))
    depth = toc_depth(sized)
    return [e for e in _toc_entries(body) if e[0] <= depth]


def _toc_html(heads: list, toc_title: str, pages: list | None) -> str:
    """Contents: linked entries, dotted leaders, page numbers when known."""
    top = min((lvl for lvl, _, _ in heads), default=1)
    rows = []
    for k, (lvl, hid, text) in enumerate(heads):
        n = str(pages[k]) if pages and k < len(pages) and pages[k] else ""
        rows.append(f'<a class="l{lvl - top + 1}" href="#{hid}"><span class="t">{text}</span>'
                    f'<span class="dots"></span><span class="n">{n}</span></a>')
    return (f'<nav class="toc"><div class="toc-h">{_htmllib.escape(toc_title)}</div>'
            + "".join(rows) + "</nav>")


def match_pages(heads: list, marks: list) -> list | None:
    """Pair contents entries with bookmarks by their text, in order (the outline
    also holds h4-h6, which the contents list leaves out). None if any entry
    goes unmatched -- a wrong number is worse than none."""
    norm = lambda t: " ".join(t.split()).casefold()
    out, j = [], 0
    for _lvl, _id, text in heads:
        want = norm(_htmllib.unescape(text))
        # Chromium sometimes writes a bookmark's text twice ("1. Bağlam1. Bağlam").
        while j < len(marks) and not norm(marks[j][0]).startswith(want):
            j += 1
        if j == len(marks):
            return None
        out.append(marks[j][1])
        j += 1
    return out


def outline_pages(pdf_path: str) -> list | None:
    """Page of every bookmark, in order -- the PDF's own outline, which Chromium
    writes from the headings. None when no PDF reader is installed: the
    contents list then keeps its links and leaders and drops the numbers."""
    try:
        import pymupdf
        with pymupdf.open(pdf_path) as d:
            return [(t, page) for _lvl, t, page in d.get_toc(simple=True)]
    except ImportError:
        pass
    try:
        from pypdf import PdfReader
    except ImportError:
        return None
    r = PdfReader(pdf_path)
    out = []

    def walk(items, lvl):
        for it in items:
            if isinstance(it, list):
                walk(it, lvl + 1)
            else:
                out.append((it.title, r.get_destination_page_number(it) + 1))
    walk(r.outline, 1)
    return out


def html_to_pdf(html_path: str, pdf_path: str, title: str, classification: str = "",
                logo: bool = True, page_word: str = "Sayfa") -> None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.stderr.write(ENGINE_HINT)
        sys.exit(2)

    footer = _footer(title, classification, page_word)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("file:///" + os.path.abspath(html_path).replace("\\", "/"))
        # If the page has mermaid diagrams, wait for them to render to SVG
        # (mermaid.run sets window.__mmDone) before printing.
        try:
            has_mermaid = page.evaluate(
                "document.querySelectorAll('.mermaid').length > 0")
        except Exception:
            has_mermaid = False
        if has_mermaid:
            try:
                page.wait_for_function("window.__mmDone === true", timeout=60000)
            except Exception:
                sys.stderr.write("[office-pdf] warn: mermaid render timed out; "
                                 "diagrams may be incomplete\n")
            page.wait_for_timeout(600)
        page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            display_header_footer=True,
            header_template=_header(logo),
            footer_template=footer,
            margin=MARGIN,
            outline=True,       # bookmarks = the headings, like Word's navigation pane
            tagged=True,        # Chromium builds the outline from the tagged structure
        )
        browser.close()


# The fixed words a renderer prints itself, per document language (--lang). The master is
# lib/doc_language.json ("render"); scripts/test_doc_language.py holds this table equal to it.
LANG_WORDS = {"tr": {"toc_title": "İçindekiler", "page_word": "Sayfa"},
              "en": {"toc_title": "Contents", "page_word": "Page"}}


def resolve_lang_words(lang, toc_title, page_word):
    """--toc-title / --page-word win; otherwise --lang's words; otherwise Turkish, as before."""
    words = LANG_WORDS[lang or "tr"]
    return (toc_title if toc_title is not None else words["toc_title"],
            page_word if page_word is not None else words["page_word"])


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Markdown -> branded PDF (Chromium).")
    ap.add_argument("--input", required=True, help="source .md file")
    ap.add_argument("--output", required=True, help="target .pdf file")
    ap.add_argument("--title", default="",
                    help="document title (title block + footer); replaces a leading '# ...'")
    ap.add_argument("--eyebrow", default="",
                    help="small caps line above the title, e.g. TEKNIK SPESIFIKASYON")
    ap.add_argument("--classification", default="",
                    help="footer centre, e.g. 'Confidential - Customer Restricted'")
    ap.add_argument("--no-logo", action="store_true",
                    help="omit the NTT mark (converting a document that is not ours)")
    ap.add_argument("--toc", choices=("auto", "on", "off"), default="auto",
                    help="contents list: auto = from eight headings up")
    ap.add_argument("--lang", choices=("tr", "en"), default=None,
                    help="document language: sets the contents heading and the footer's page "
                         "label (tr: İçindekiler / Sayfa, en: Contents / Page). Default tr.")
    ap.add_argument("--toc-title", default=None,
                    help="its heading; overrides --lang")
    ap.add_argument("--page-word", default=None,
                    help="footer page label; overrides --lang")
    ap.add_argument("--redact-pii", action="store_true",
                    help="mask TCKN / 10-11 digit tax IDs before rendering")
    ap.add_argument("--keep-html", metavar="PATH",
                    help="also write the intermediate HTML to PATH")
    ap.add_argument("--force", action="store_true", help="overwrite existing output")
    args = ap.parse_args(argv)
    args.toc_title, args.page_word = resolve_lang_words(args.lang, args.toc_title, args.page_word)

    if not os.path.isfile(args.input):
        sys.exit(f"ERROR: input not found: {args.input}")
    if os.path.exists(args.output) and not args.force:
        sys.exit(f"ERROR: {args.output} exists (use --force to overwrite)")

    md_text = open(args.input, encoding="utf-8").read()

    if args.redact_pii:
        if redact_text is None:
            sys.exit("ERROR: --redact-pii requested but lib/redact.py not importable")
        n = count_matches(md_text)
        md_text = redact_text(md_text)
        sys.stderr.write(f"[redact] masked {n} ID(s) before rendering\n")

    md_text, title = take_leading_title(md_text, args.title)

    def render(pages=None):
        html = md_to_html(md_text, title, args.eyebrow, args.toc, args.toc_title, pages)
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(html)
        html_to_pdf(html_path, args.output, title, args.classification,
                    not args.no_logo, args.page_word)
        return html

    html_path = args.keep_html or (args.output + ".tmp.html")
    try:
        html = render()
        # Page numbers for the contents list: print once, read where each
        # heading landed from the PDF's bookmarks, print again with them. The
        # numbers occupy no extra line, so the second pass lands the same.
        if '<nav class="toc">' in html:
            marks = outline_pages(args.output)
            if marks is not None:
                pages = match_pages(_toc_heads(html), marks)
                if pages:
                    render(pages)
            else:
                sys.stderr.write("[office-pdf] note: no PDF reader (pymupdf/pypdf); "
                                 "contents list without page numbers\n")
    finally:
        if not args.keep_html and os.path.exists(html_path):
            os.remove(html_path)

    print(f"[office-pdf] wrote {args.output}")
    if args.keep_html:
        print(f"[office-pdf] kept HTML {args.keep_html}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
