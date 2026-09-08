"""office-manual — Step-by-step user manual from a JSON manifest.

Each step can carry a title, a description, and an optional screenshot path.
The script embeds the screenshots natively into Word (.docx) or PowerPoint
(.pptx), producing a ready-to-share document the user can polish afterwards.

Manifest format (steps.json):
    {
      "title":  "SAP Process Guide",
      "author": "Author Name",
      "steps": [
        {
          "step": 1,
          "title": "Open Transaction",
          "description": "Type ZABAPGIT_STANDALONE in the command bar and press Enter.",
          "screenshot": "screenshots/step_001.png"
        }
      ]
    }

"screenshot" paths are relative to the manifest file (or absolute).
Steps without a "screenshot" key render as text-only.

Usage:
    py build_manual.py --manifest steps.json --output manual.docx
    py build_manual.py --manifest steps.json --output manual.pptx --format pptx
    py build_manual.py --screenshot-dir screenshots/ --title "My Guide" --output guide.docx
    py build_manual.py --manifest s.json --output s.docx --force
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

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
from theme import (ACCENT, BODY_FONT, DEEP, INK, LIGHT_FONT,  # noqa: E402
                   MUTED, SEMI_FONT, logo_path)


def _resolve_screenshot(path: str | None, manifest_dir: Path) -> Path | None:
    if not path:
        return None
    p = Path(path)
    if not p.is_absolute():
        p = manifest_dir / p
    return p if p.exists() else None


# ─────────────────────────────────────── DOCX ──────────────────────────────


def build_docx(spec: dict, out_path: str, manifest_dir: Path) -> None:
    try:
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        sys.exit("ERROR: python-docx required. Run: py -m pip install python-docx")

    from docx.oxml.ns import qn

    def face(target, name, size=None, bold=None, color=None):
        """All four rFonts slots — see build_docx._face for why w:ascii is not
        enough once a Turkish dotless i is in the string."""
        target.font.name = name
        rfonts = target._element.rPr.rFonts
        for slot in ("w:eastAsia", "w:hAnsi", "w:cs"):
            rfonts.set(qn(slot), name)
        if size is not None:
            target.font.size = Pt(size)
        if bold is not None:
            target.font.bold = bold
        if color is not None:
            target.font.color.rgb = RGBColor(*color)
        return target

    doc = Document()

    normal = doc.styles["Normal"]
    face(normal, BODY_FONT, 10.5, color=INK)
    normal.paragraph_format.line_spacing = 1.35
    normal.paragraph_format.space_after = Pt(10)

    for lvl, (size, before) in enumerate(((15, 20), (13, 16), (11, 12)), start=1):
        try:
            style = doc.styles[f"Heading {lvl}"]
            face(style, SEMI_FONT, size, color=(DEEP if lvl == 3 else ACCENT))
            style.font.bold = False
            style.paragraph_format.space_before = Pt(before)
            style.paragraph_format.space_after = Pt(8)
        except Exception:
            pass

    # Cover — the mark leads, then the title. A manual is read on screen and
    # printed for a training room, so it gets the same identity as every other
    # deliverable rather than a bare heading.
    mark = logo_path()
    if mark:
        lp = doc.add_paragraph()
        lp.paragraph_format.space_after = Pt(16)
        lp.add_run().add_picture(str(mark), width=Inches(1.5))
    h = doc.add_paragraph()
    h.paragraph_format.space_after = Pt(6)
    face(h.add_run(spec.get("title", "User Manual")), LIGHT_FONT, 24, False, DEEP)
    if spec.get("author"):
        p = doc.add_paragraph()
        face(p.add_run(spec["author"]), BODY_FONT, 11, False, MUTED)
    doc.add_paragraph()

    steps = spec.get("steps", [])
    for i, step in enumerate(steps, start=1):
        num = step.get("step", i)
        title = step.get("title", "")
        description = step.get("description", "")
        screenshot = _resolve_screenshot(step.get("screenshot"), manifest_dir)

        heading = f"Step {num}: {title}" if title else f"Step {num}"
        doc.add_heading(heading, level=2)

        if description:
            doc.add_paragraph(description)

        if screenshot:
            try:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run()
                run.add_picture(str(screenshot), width=Inches(6.0))
            except Exception as exc:
                p = doc.add_paragraph()
                p.add_run(f"[screenshot: {screenshot.name} — {exc}]").italic = True

        # spacing between steps
        doc.add_paragraph()

    doc.save(out_path)


# ─────────────────────────────────────── PPTX ──────────────────────────────


def build_pptx(spec: dict, out_path: str, manifest_dir: Path) -> None:
    try:
        from pptx import Presentation
        from pptx.util import Inches, Pt
        from pptx.dml.color import RGBColor
    except ImportError:
        sys.exit("ERROR: python-pptx required. Run: py -m pip install python-pptx")

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    accent = RGBColor(*ACCENT)
    mark = logo_path()

    def _mark(slide) -> None:
        """The wordmark, bottom right, small. On a deck it belongs out of the
        reading path — a slide is looked at, not read, and a logo in the title
        zone competes with the one thing the slide is for."""
        if mark:
            slide.shapes.add_picture(
                str(mark), Inches(11.55), Inches(6.85), width=Inches(1.2))

    def _title_bar(slide, text: str) -> None:
        box = slide.shapes.add_textbox(
            Inches(0.6), Inches(0.25), Inches(12.1), Inches(1.0))
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = text
        p.font.size = Pt(26)
        p.font.bold = False
        p.font.name = SEMI_FONT
        p.font.color.rgb = accent
        # accent underline
        ln = slide.shapes.add_shape(
            1, Inches(0.6), Inches(1.3), Inches(12.1), Pt(3))
        ln.fill.solid()
        ln.fill.fore_color.rgb = accent
        ln.line.fill.background()

    # ── Title slide ──
    ts = prs.slides.add_slide(blank)
    box = ts.shapes.add_textbox(
        Inches(0.8), Inches(2.6), Inches(11.7), Inches(2.3))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = spec.get("title", "User Manual")
    p.font.size = Pt(40)
    p.font.bold = False
    p.font.name = LIGHT_FONT
    p.font.color.rgb = RGBColor(*DEEP)
    if spec.get("author"):
        sp = tf.add_paragraph()
        sp.text = spec["author"]
        sp.font.size = Pt(20)
        sp.font.name = BODY_FONT
        sp.font.color.rgb = RGBColor(*MUTED)
    _mark(ts)

    # ── Step slides ──
    steps = spec.get("steps", [])
    for i, step in enumerate(steps, start=1):
        num = step.get("step", i)
        title = step.get("title", "")
        description = step.get("description", "")
        screenshot = _resolve_screenshot(step.get("screenshot"), manifest_dir)

        slide = prs.slides.add_slide(blank)
        heading = f"Step {num}: {title}" if title else f"Step {num}"
        _title_bar(slide, heading)
        _mark(slide)

        if screenshot:
            try:
                # Image fills content area; height auto-scales from aspect ratio.
                # A 5-inch max height keeps room for the caption strip.
                slide.shapes.add_picture(
                    str(screenshot),
                    Inches(0.6), Inches(1.45),
                    width=Inches(12.1),
                )
            except Exception as exc:
                tb = slide.shapes.add_textbox(
                    Inches(0.6), Inches(1.7), Inches(12.1), Inches(0.5))
                tb.text_frame.paragraphs[0].text = (
                    f"[screenshot: {Path(str(screenshot)).name} — {exc}]")

            if description:
                cap = slide.shapes.add_textbox(
                    Inches(0.6), Inches(6.85), Inches(12.1), Inches(0.55))
                tf = cap.text_frame
                tf.word_wrap = True
                p = tf.paragraphs[0]
                p.text = description
                p.font.size = Pt(13)
                p.font.name = BODY_FONT
                p.font.color.rgb = RGBColor(*INK)
        else:
            # Text-only: description fills the content area
            box = slide.shapes.add_textbox(
                Inches(0.7), Inches(1.6), Inches(12.0), Inches(5.6))
            tf = box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = description
            p.font.size = Pt(22)

    prs.save(out_path)


# ─────────────────────────────────────── helpers ────────────────────────────


def _spec_to_markdown(spec: dict, manifest_dir: Path) -> str:
    """Render the manifest as Markdown with absolute file:/// image URIs.

    Used for the PDF route, which goes through the office-pdf Chromium engine.
    """
    lines: list[str] = ["# " + spec.get("title", "User Manual")]
    if spec.get("author"):
        lines += ["*" + spec["author"] + "*", ""]
    else:
        lines += [""]

    for i, step in enumerate(spec.get("steps", []), start=1):
        num = step.get("step", i)
        title = step.get("title", "")
        description = step.get("description", "")
        screenshot = _resolve_screenshot(step.get("screenshot"), manifest_dir)

        lines.append(f"## Step {num}: {title}" if title else f"## Step {num}")
        lines.append("")
        if description:
            lines += [description, ""]
        if screenshot:
            uri = "file:///" + str(screenshot.resolve()).replace("\\", "/")
            lines += [f"![Step {num}]({uri})", ""]
    return "\n".join(lines)


def build_pdf(spec: dict, out_path: str, manifest_dir: Path) -> None:
    """Render the manual to PDF via the sibling office-pdf Chromium engine."""
    pdf_scripts = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "..", "office-pdf", "scripts")
    sys.path.insert(0, os.path.abspath(pdf_scripts))
    try:
        import md_to_pdf  # from office-pdf skill
    except ImportError:
        sys.exit("ERROR: PDF output needs the office-pdf skill "
                 f"(expected at {pdf_scripts}).")

    md_text = _spec_to_markdown(spec, manifest_dir)
    title = spec.get("title", "")
    html = md_to_pdf.md_to_html(md_text, title)
    html_path = out_path + ".tmp.html"
    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(html)
    try:
        md_to_pdf.html_to_pdf(html_path, out_path, title)
    finally:
        if os.path.exists(html_path):
            os.remove(html_path)


def _autodiscover_steps(screenshot_dir: Path) -> list[dict]:
    """Build a steps list from stepN.png / step_N.png files in a directory."""
    files = sorted(
        [p for p in screenshot_dir.glob("step*.png")],
        key=lambda p: p.name,
    )
    steps = []
    for i, f in enumerate(files, start=1):
        steps.append({
            "step": i,
            "title": f.stem.replace("_", " ").title(),
            "description": "",
            "screenshot": str(f.resolve()),
        })
    return steps


# ─────────────────────────────────────── CLI ────────────────────────────────


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="Build a step-by-step user manual (.docx or .pptx) from a JSON manifest.")
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--manifest", help="JSON manifest file (steps.json)")
    src.add_argument("--screenshot-dir",
                     help="Auto-discover step*.png files and build a manifest on the fly")
    ap.add_argument("--title", default="", help="Document title (overrides manifest title)")
    ap.add_argument("--author", default="", help="Author line (overrides manifest author)")
    ap.add_argument("--output", required=True, help="Output .docx or .pptx path")
    ap.add_argument("--format", choices=["docx", "pptx", "pdf"], default="",
                    help="Output format (inferred from --output extension when omitted)")
    ap.add_argument("--force", action="store_true",
                    help="Overwrite output if it already exists")
    args = ap.parse_args(argv)

    if os.path.exists(args.output) and not args.force:
        sys.exit(f"ERROR: {args.output} exists (use --force to overwrite)")

    # Infer format
    fmt = args.format
    if not fmt:
        ext = Path(args.output).suffix.lower().lstrip(".")
        if ext in ("docx", "pptx", "pdf"):
            fmt = ext
        else:
            sys.exit(
                "ERROR: cannot infer format — use --format docx|pptx|pdf "
                "or give the output file a .docx, .pptx or .pdf extension")

    # Build spec
    spec: dict = {}
    manifest_dir = Path(".")

    if args.manifest:
        mp = Path(args.manifest)
        if not mp.exists():
            sys.exit(f"ERROR: manifest not found: {args.manifest}")
        manifest_dir = mp.parent
        spec = json.loads(mp.read_text(encoding="utf-8"))

    elif args.screenshot_dir:
        sd = Path(args.screenshot_dir)
        if not sd.is_dir():
            sys.exit(f"ERROR: screenshot-dir not found: {args.screenshot_dir}")
        manifest_dir = sd
        label = sd.name.replace("-", " ").replace("_", " ").title()
        spec = {"title": args.title or label, "steps": _autodiscover_steps(sd)}

    else:
        sys.exit("ERROR: provide --manifest <steps.json> or --screenshot-dir <dir>")

    if args.title:
        spec["title"] = args.title
    if args.author:
        spec["author"] = args.author

    n = len(spec.get("steps", []))
    if fmt == "docx":
        build_docx(spec, args.output, manifest_dir)
    elif fmt == "pdf":
        build_pdf(spec, args.output, manifest_dir)
    else:
        build_pptx(spec, args.output, manifest_dir)

    print(f"[office-manual] wrote {args.output} ({n} step{'s' if n != 1 else ''}, {fmt})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
