"""office-pdf — Markdown -> branded HTML -> headless-Chromium PDF.

A real browser engine (Chromium via Playwright) is used instead of a
Markdown->PDF converter because that is what renders Turkish glyphs
(ı/ğ/ş/İ/ç/ö/ü), GitHub-style tables, and emoji correctly. weasyprint /
xhtml2pdf choke on emoji + wide tables and need manual font registration.

Pipeline (3 stages):
  1. Markdown -> HTML  (markdown lib: tables, fenced_code, toc, sane_lists)
  2. Wrap in print-oriented branded CSS (A4, green theme, table survival rules)
  3. HTML -> PDF       (Chromium .pdf(): print_background, page-number footer)

Mermaid diagrams: ```mermaid fenced blocks are rendered to inline SVG by
mermaid.js inside the same Chromium (green-themed), so architecture/flow/
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

ENGINE_HINT = (
    "Headless Chromium engine not found. Install it once (~130 MB):\n"
    "    py -m pip install playwright\n"
    "    py -m playwright install chromium\n"
)

# Print-oriented CSS. The green corporate theme + the table-survival rules
# (fixed layout + break-word) are what keep wide tables on the page.
CSS = """
@page { size: A4; margin: 16mm 12mm; }
* { box-sizing: border-box; }
body {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt; line-height: 1.45; color: #1a1a1a; margin: 0;
}
h1 { font-size: 20pt; color: #0a7d3c; border-bottom: 3px solid #0a7d3c;
     padding-bottom: 4px; margin: 0 0 14px; }
h2 { font-size: 15pt; color: #0a7d3c; margin: 18px 0 8px; }
h3 { font-size: 12.5pt; color: #14502a; margin: 14px 0 6px; }
a { color: #0a7d3c; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 10px 0; }
th, td { border: 1px solid #cfd8d0; padding: 5px 7px; text-align: left;
         vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
th { background: #0a7d3c; color: #fff; font-weight: 600; }
tr:nth-child(even) td { background: #f3f8f4; }
code { font-family: "Cascadia Code", Consolas, monospace; font-size: 9.5pt;
       background: #eef2ee; padding: 1px 4px; border-radius: 3px; }
pre { background: #f5f7f5; border: 1px solid #dde4dd; border-radius: 4px;
      padding: 10px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #0a7d3c; margin: 10px 0; padding: 2px 12px;
             color: #444; background: #f3f8f4; }
hr { border: none; border-top: 1px solid #cfd8d0; margin: 16px 0; }
img { max-width: 100%; }
/* Mermaid diagrams render to inline SVG (see mermaid support below). */
.mermaid { background: #fff; border: 1px solid #dde4dd; border-radius: 6px;
           padding: 12px; margin: 12px 0; text-align: center; break-inside: avoid; }
.mermaid svg { max-width: 100%; height: auto; }
h2, h3, table, .mermaid, pre { break-inside: avoid; }
"""

# Loaded as an ES module only when the document actually contains ```mermaid
# fences. mermaid.run() renders each <pre class="mermaid"> to SVG in the same
# Chromium that prints the PDF; window.__mmDone lets the printer wait for it.
MERMAID_JS = """
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({startOnLoad:false, theme:'base', securityLevel:'loose',
  themeVariables:{primaryColor:'#e8f5ee', primaryBorderColor:'#0a7d3c',
  primaryTextColor:'#14502a', lineColor:'#5b6773',
  fontFamily:'Segoe UI, sans-serif', fontSize:'14px'}});
window.__mmDone = false;
(async () => { try { await mermaid.run(); } catch (e) { console.log('mermaid', e); }
              window.__mmDone = true; })();
</script>
"""

FOOTER = (
    '<div style="font-size:8pt;color:#777;width:100%;text-align:center;'
    'padding:0 12mm;">'
    '<span class="title"></span> &nbsp;·&nbsp; '
    '<span class="pageNumber"></span>/<span class="totalPages"></span>'
    "</div>"
)
EMPTY_HEADER = '<div style="height:0"></div>'


def md_to_html(md_text: str, title: str) -> str:
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

    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "sane_lists"],
    )

    def _unstash(m):
        return f'<pre class="mermaid">{_htmllib.escape(blocks[int(m.group(1))])}</pre>'

    body = re.sub(r"<p>MMD(\d+)MARK</p>", _unstash, body)
    body = re.sub(r"MMD(\d+)MARK", _unstash, body)

    mermaid_script = MERMAID_JS if blocks else ""
    safe_title = (title or "").replace("<", "&lt;").replace(">", "&gt;")
    return (
        "<!doctype html><html lang='tr'><head><meta charset='utf-8'>"
        f"<title>{safe_title}</title><style>{CSS}</style></head>"
        f"<body>{body}{mermaid_script}</body></html>"
    )


def html_to_pdf(html_path: str, pdf_path: str, title: str) -> None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.stderr.write(ENGINE_HINT)
        sys.exit(2)

    footer = FOOTER.replace('class="title"></span>',
                            f'class="title">{title}</span>') \
        if title else FOOTER
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
            header_template=EMPTY_HEADER,
            footer_template=footer,
            margin={"top": "18mm", "bottom": "16mm",
                    "left": "12mm", "right": "12mm"},
        )
        browser.close()


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Markdown -> branded PDF (Chromium).")
    ap.add_argument("--input", required=True, help="source .md file")
    ap.add_argument("--output", required=True, help="target .pdf file")
    ap.add_argument("--title", default="", help="document title (footer + <title>)")
    ap.add_argument("--redact-pii", action="store_true",
                    help="mask TCKN / 10-11 digit tax IDs before rendering")
    ap.add_argument("--keep-html", metavar="PATH",
                    help="also write the intermediate HTML to PATH")
    ap.add_argument("--force", action="store_true", help="overwrite existing output")
    args = ap.parse_args(argv)

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

    html = md_to_html(md_text, args.title)

    html_path = args.keep_html or (args.output + ".tmp.html")
    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(html)

    try:
        html_to_pdf(html_path, args.output, args.title)
    finally:
        if not args.keep_html and os.path.exists(html_path):
            os.remove(html_path)

    print(f"[office-pdf] wrote {args.output}")
    if args.keep_html:
        print(f"[office-pdf] kept HTML {args.keep_html}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
