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
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from redact import redact_text
except Exception:
    redact_text = None

GREEN = (0x0A, 0x7D, 0x3C)


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


def md_to_spec(md_text: str, deck_title: str) -> dict:
    slides = []
    for chunk in md_text.split("\n---\n"):
        lines = [ln.rstrip() for ln in chunk.strip().splitlines() if ln.strip()]
        if not lines:
            continue
        title, bullets = "", []
        for ln in lines:
            if ln.startswith("# ") and not title:
                title = ln[2:].strip()
            elif ln.lstrip().startswith(("- ", "* ")):
                indent = (len(ln) - len(ln.lstrip())) // 2
                bullets.append([ln.lstrip()[2:].strip(), indent])
            elif not ln.startswith("#"):
                bullets.append([ln.strip(), 0])
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
    green = RGBColor(*GREEN)

    def add_title_bar(slide, text):
        box = slide.shapes.add_textbox(Inches(0.6), Inches(0.4),
                                       Inches(12.1), Inches(1.0))
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = text or ""
        p.font.size = Pt(30)
        p.font.bold = True
        p.font.color.rgb = green
        # accent underline
        line = slide.shapes.add_shape(1, Inches(0.6), Inches(1.45),
                                      Inches(12.1), Pt(3))
        line.fill.solid()
        line.fill.fore_color.rgb = green
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
            p.font.bold = True
            p.font.color.rgb = green
            if sl.get("subtitle"):
                sp = tf.add_paragraph()
                sp.text = sl["subtitle"]
                sp.font.size = Pt(22)
                sp.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
            continue

        add_title_bar(slide, sl.get("title", ""))

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
                cell.fill.fore_color.rgb = green
                para = cell.text_frame.paragraphs[0]
                para.font.bold = True
                para.font.size = Pt(13)
                para.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            for r, row in enumerate(rows, start=1):
                for c in range(ncols):
                    cell = gtab.cell(r, c)
                    cell.text = str(row[c]) if c < len(row) else ""
                    cell.text_frame.paragraphs[0].font.size = Pt(12)

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
