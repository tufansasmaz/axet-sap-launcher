"""office-pptx — build a native, editable .pptx via python-pptx.

Unlike the Marp route (office-slides), this produces real PowerPoint shapes
(text boxes, tables) the user can edit afterwards — ideal for a polished
management deck with branding.

Two input forms (pick one):

1. JSON spec (--spec deck.json) — full control:
   {
     "title": "Q2 Review",
     "subtitle": "NTT DATA · 2026",
     "slides": [
       {"type": "title",   "title": "Q2 Review", "subtitle": "Board update"},
       {"type": "bullets", "title": "Highlights",
        "bullets": ["Revenue +12%", "5 bugs fixed", ["Sub-point", 1]]},
       {"type": "table",   "title": "Scorecard",
        "headers": ["Metric", "Value"],
        "rows": [["Pass", "22"], ["Fail", "0"]]}
     ]
   }

2. Markdown deck (--md deck.md) — quick: '---' separates slides, the first
   '# Heading' on a slide is its title, '- ' lines become bullets.

    py build_pptx.py --spec deck.json --output deck.pptx --title "Q2 Review"
    py build_pptx.py --md deck.md     --output deck.pptx
    py build_pptx.py --spec d.json --output d.pptx --redact-pii
"""
from __future__ import annotations

import argparse
import json
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

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from redact import redact_text
except Exception:
    redact_text = None

from theme import (ACCENT, BODY_FONT, DEEP, INK, LIGHT_FONT,  # noqa: E402
                   MUTED, SEMI_FONT, logo_path)


def _require_pptx():
    try:
        import pptx  # noqa: F401
        return
    except ImportError:
        sys.exit("ERROR: python-pptx required. Run: py -m pip install python-pptx")


def _mask(spec, on):
    """Recursively redact all strings in the spec when --redact-pii is set."""
    if not on or redact_text is None:
        return spec
    if isinstance(spec, str):
        return redact_text(spec)
    if isinstance(spec, list):
        return [_mask(x, on) for x in spec]
    if isinstance(spec, dict):
        return {k: _mask(v, on) for k, v in spec.items()}
    return spec


_INLINE_MD = re.compile(r"\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|`(.+?)`")
_TABLE_RULE = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")
# "1. ", "2) " — a list, not prose. Without this the paragraph joiner swallowed
# a numbered list into one run-on bullet, which is worse than the per-line
# splitting it was fixing.
_ORDERED = re.compile(r"^\d+[.)]\s+")


def _plain(text: str) -> str:
    """Drop inline Markdown markers. A slide shows text, not syntax."""
    return _INLINE_MD.sub(lambda m: next(g for g in m.groups() if g is not None),
                          text).strip()


def md_to_spec(md_text: str, deck_title: str) -> dict:
    """'---' separates slides, the first '# ' on one is its title.

    When the document has no '---' at all, split on '## ' instead. That is not a
    second syntax, it is the difference between a deck and a document: an FS or a
    report has sections and no slide breaks, and the old code turned all of it
    into ONE slide -- heading dropped, every wrapped source line its own bullet,
    table pipes and '**' included -- then printed "(1 slides)" and exited 0.
    Measured 2026-09-03 on a five-section spec. Falling back is announced on
    stderr, because guessing quietly is what made the first version look fine.
    """
    if "\n---\n" in md_text:
        chunks = md_text.split("\n---\n")
    else:
        chunks = re.split(r"\n(?=## )", md_text)
        if len(chunks) > 1:
            print(f"[office-pptx] no '---' slide breaks; split on {len(chunks)} "
                  f"'##' headings instead", file=sys.stderr)

    slides = []
    for chunk in chunks:
        lines = [ln.rstrip() for ln in chunk.strip().splitlines()]
        if not any(ln.strip() for ln in lines):
            continue
        title, bullets = "", []
        # Prose wraps in the source and means nothing there. One bullet per
        # source LINE turned a three-line paragraph into three bullets, each
        # ending mid-sentence. Accumulate until something ends the paragraph.
        para: list[str] = []

        def flush() -> None:
            if para:
                bullets.append([" ".join(para), 0])
                para.clear()

        for ln in lines:
            stripped = ln.lstrip()
            if not stripped:
                flush()
            elif ln.startswith("# ") and not title:
                flush()
                title = _plain(ln[2:])
            elif stripped.startswith("## ") and not title:
                flush()
                title = _plain(stripped[3:])
            elif ln.startswith("#"):
                flush()                        # a heading we are not using as the title
            elif _TABLE_RULE.match(ln):
                flush()                        # |---|---| is layout, not content
            elif stripped.startswith("|"):
                flush()
                cells = [_plain(c) for c in stripped.strip("|").split("|")]
                bullets.append([" · ".join(c for c in cells if c), 0])
            elif stripped.startswith(("- ", "* ")):
                flush()
                indent = (len(ln) - len(stripped)) // 2
                bullets.append([_plain(stripped[2:]), indent])
            elif _ORDERED.match(stripped):
                flush()
                indent = (len(ln) - len(stripped)) // 2
                bullets.append([_plain(stripped), indent])
            else:
                para.append(_plain(ln))
        flush()
        slides.append({"type": "bullets", "title": title or "Slide",
                       "bullets": bullets})
    return {"title": deck_title or (slides[0]["title"] if slides else "Deck"),
            "slides": slides}


def build(spec: dict, out_path: str) -> None:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.dml.color import RGBColor

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    accent = RGBColor(*ACCENT)
    mark = logo_path()

    def add_mark(slide):
        """Wordmark bottom right, small. A slide is looked at rather than read,
        so the mark stays out of the reading path instead of competing with the
        one thing the slide exists to say."""
        if mark:
            slide.shapes.add_picture(
                str(mark), Inches(11.55), Inches(6.85), width=Inches(1.2))

    def add_title_bar(slide, text):
        box = slide.shapes.add_textbox(Inches(0.6), Inches(0.4),
                                       Inches(12.1), Inches(1.0))
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = text or ""
        p.font.size = Pt(30)
        p.font.bold = False
        p.font.name = SEMI_FONT
        p.font.color.rgb = accent
        # accent underline
        line = slide.shapes.add_shape(1, Inches(0.6), Inches(1.45),
                                      Inches(12.1), Pt(3))
        line.fill.solid()
        line.fill.fore_color.rgb = accent
        line.line.fill.background()

    for sl in spec.get("slides", []):
        slide = prs.slides.add_slide(blank)
        stype = sl.get("type", "bullets")

        if stype == "title":
            box = slide.shapes.add_textbox(Inches(0.8), Inches(2.6),
                                           Inches(11.7), Inches(2.3))
            tf = box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = sl.get("title", "")
            p.font.size = Pt(44)
            p.font.bold = False
            p.font.name = LIGHT_FONT
            p.font.color.rgb = RGBColor(*DEEP)
            if sl.get("subtitle"):
                sp = tf.add_paragraph()
                sp.text = sl["subtitle"]
                sp.font.size = Pt(22)
                sp.font.name = BODY_FONT
                sp.font.color.rgb = RGBColor(*MUTED)
            add_mark(slide)
            continue

        add_title_bar(slide, sl.get("title", ""))
        add_mark(slide)

        if stype == "bullets":
            box = slide.shapes.add_textbox(Inches(0.7), Inches(1.8),
                                           Inches(12.0), Inches(5.2))
            tf = box.text_frame
            tf.word_wrap = True
            first = True
            for item in sl.get("bullets", []):
                text, lvl = (item if isinstance(item, list)
                             else (item, 0))
                p = tf.paragraphs[0] if first else tf.add_paragraph()
                first = False
                p.text = "• " + str(text) if lvl == 0 else "– " + str(text)
                p.level = int(lvl)
                p.font.size = Pt(20 - 2 * min(int(lvl), 3))
                p.font.name = BODY_FONT
                p.font.color.rgb = RGBColor(*INK)
                p.space_after = Pt(6)

        elif stype == "table":
            headers = sl.get("headers", [])
            rows = sl.get("rows", [])
            nrows, ncols = len(rows) + 1, max(1, len(headers))
            gtab = slide.shapes.add_table(
                nrows, ncols, Inches(0.7), Inches(1.9),
                Inches(12.0), Inches(0.4 * nrows)).table
            for c, h in enumerate(headers):
                cell = gtab.cell(0, c)
                cell.text = str(h)
                cell.fill.solid()
                cell.fill.fore_color.rgb = accent
                para = cell.text_frame.paragraphs[0]
                para.font.bold = True
                para.font.size = Pt(13)
                para.font.name = BODY_FONT
                para.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            for r, row in enumerate(rows, start=1):
                for c in range(ncols):
                    cell = gtab.cell(r, c)
                    cell.text = str(row[c]) if c < len(row) else ""
                    cp = cell.text_frame.paragraphs[0]
                    cp.font.size = Pt(12)
                    cp.font.name = BODY_FONT
                    cp.font.color.rgb = RGBColor(*INK)

    prs.save(out_path)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Build a native editable .pptx.")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--spec", help="JSON deck spec")
    src.add_argument("--md", help="markdown deck ('---' separates slides)")
    ap.add_argument("--output", required=True, help="target .pptx")
    ap.add_argument("--title", default="", help="deck title")
    ap.add_argument("--redact-pii", action="store_true",
                    help="mask TCKN / 10-11 digit tax IDs in all text")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args(argv)

    _require_pptx()
    if os.path.exists(args.output) and not args.force:
        sys.exit(f"ERROR: {args.output} exists (use --force)")

    if args.spec:
        spec = json.load(open(args.spec, encoding="utf-8"))
        if args.title:
            spec["title"] = args.title
    else:
        spec = md_to_spec(open(args.md, encoding="utf-8").read(), args.title)

    spec = _mask(spec, args.redact_pii)
    build(spec, args.output)
    print(f"[office-pptx] wrote {args.output} "
          f"({len(spec.get('slides', []))} slides)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
