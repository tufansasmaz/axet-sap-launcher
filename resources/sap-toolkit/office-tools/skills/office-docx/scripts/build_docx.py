"""office-docx — Markdown (subset) -> native, editable Word .docx via python-docx.

Mirrors the office-pdf input (Markdown) but produces an editable .docx carrying
the NTT DATA house theme: the mark repeating in the header of every page, one
accent running through headings, rules, table headers and links, and typography
set for reading rather than for fitting. Supported Markdown subset:
  # / ## / ###        headings
  - / * bullet         (nesting by 2-space indent)
  1. ordered list
  | a | b |            GFM tables (the row of --- separators is the divider)
  ```code```           fenced code block (monospace, shaded)
  > quote
  ---                  horizontal rule -> page break
  **bold**  *italic*  `code`   inline runs
  [label](url)  <url>  url     clickable hyperlinks
  ![alt](path)         image on its own line (path relative to the .md,
                       centred, shrunk to the text column if oversized)
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
from pathlib import Path

# A Turkish output path (ı, ş, ğ) cannot be encoded by the default Windows cp1252
# console, and the only thing this script prints is that path -- so the document
# was written and the process still died on the success line. Caught by the
# showcase render, which builds ~40 Turkish-named files through a pipe and read
# 29 of them as failures. Same shim as office-excel-images.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from redact import redact_text, count_matches
except Exception:
    redact_text = None
    count_matches = None

# The palette is shared with every other Office renderer -- see lib/theme.py for
# why it is not defined here. Not optional the way redact.py is: a missing theme
# means a document in the wrong brand, which is worse than a loud failure.
from theme import (ACCENT, ACCENT_HEX, BAND_HEX, BODY_FONT, DEEP,  # noqa: E402
                   INK, LIGHT_FONT, MONO_FONT, MUTED, RULE_HEX, SEMI_FONT,
                   darken, logo_path, parse_hex)

# ---------------------------------------------------------- active palette ---
# The house accent and heading face, unless the caller overrides them. Module
# state rather than a threaded parameter because `_add_hyperlink` needs the
# accent and sits four calls below `build()`, and because this script is one
# build per process: `main()` runs once, and render_showcase.py invokes it as a
# SUBPROCESS per page rather than importing it.
#
# The override exists for a surface that already has a designed identity of its
# own. The showcase pages ship as .html and .docx side by side and are set in
# Cambria over a warm paper with a restrained green -- a written decision, not a
# default nobody revisited. Forcing NTT blue and Segoe UI on the Word half would
# have split one page into two looks, which is the failure the pairing exists to
# prevent. So the surface keeps its palette and gains the machinery: the mark in
# the header, real page fields, hairline tables, callouts, the Turkish font slots.
_ACCENT = ACCENT
_ACCENT_HEX = ACCENT_HEX
_DEEP = DEEP
_HEAD_FONT = SEMI_FONT


def _apply_palette(accent: str = "", heading_font: str = "") -> None:
    """Point the module at this build's palette. Empty argument = house default."""
    global _ACCENT, _ACCENT_HEX, _DEEP, _HEAD_FONT
    if accent:
        _ACCENT = parse_hex(accent)
        _ACCENT_HEX = "%02X%02X%02X" % _ACCENT
        _DEEP = darken(_ACCENT)
    else:
        _ACCENT, _ACCENT_HEX, _DEEP = ACCENT, ACCENT_HEX, DEEP
    _HEAD_FONT = heading_font or SEMI_FONT

# Written into the .docx core properties so a consumer can ask "is this still
# the markdown it was built from?" without rebuilding and diffing binaries.
SOURCE_STAMP = "office-docx source-sha:"


def source_sha(md_text: str) -> str:
    """Hash of the DECODED markdown, so CRLF/LF never shows up as a difference."""
    import hashlib
    return hashlib.sha256(md_text.replace("\r\n", "\n").encode("utf-8")).hexdigest()[:16]


def stamped_sha(docx_path) -> str | None:
    """The source hash a .docx was stamped with, or None if it carries no stamp."""
    try:
        from docx import Document
        note = Document(str(docx_path)).core_properties.comments or ""
    except Exception:
        return None
    _, sep, sha = note.partition(SOURCE_STAMP)
    return sha.strip() or None if sep else None
_LINK = r"\[[^\]\n]+\]\([^)\s]+\)"      # [label](url)
_AUTOLINK = r"<https?://[^>\s]+>"        # <url>
_BARE_URL = r"https?://[^\s<>)\]]+"      # url on its own
_BOLD = r"\*\*(?:[^*]|\*(?!\*))+?\*\*"   # **bold**, may contain a lone *
_ITALIC = r"\*(?!\*)(?:[^*]|\*\*)+?\*(?!\*)"   # *italic*, may contain **bold**
_INLINE = re.compile(
    rf"({_LINK}|{_AUTOLINK}|{_BOLD}|{_ITALIC}|`.+?`|{_BARE_URL})"
)


def _require_docx():
    try:
        import docx  # noqa: F401
    except ImportError:
        sys.exit("ERROR: python-docx required. Run: py -m pip install python-docx")


def _face(target, name, size=None, bold=None, color=None):
    """Set a font on ALL FOUR rFonts slots of a run or a style.

    python-docx writes only `w:ascii`. Turkish is full of characters outside
    Latin-1 -- the dotless i above all -- and for those Word consults `w:hAnsi`
    and `w:eastAsia` instead, silently substituting a different face. The result
    is a single Turkish word set in two fonts, which is exactly the kind of
    defect nobody reports and everybody notices.
    """
    from docx.oxml.ns import qn
    from docx.shared import Pt, RGBColor

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


def _shade(target, hex_fill):
    """Background fill for a table cell or a paragraph."""
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    el = OxmlElement("w:shd")
    el.set(qn("w:val"), "clear")
    el.set(qn("w:fill"), hex_fill)
    props = (target._tc.get_or_add_tcPr() if hasattr(target, "_tc")
             else target._p.get_or_add_pPr())
    props.append(el)


def _rule(paragraph, edge="bottom", hex_color=RULE_HEX, size=6, space=6):
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    pPr = paragraph._p.get_or_add_pPr()
    borders = pPr.find(qn("w:pBdr"))
    if borders is None:
        borders = OxmlElement("w:pBdr")
        pPr.append(borders)
    el = OxmlElement(f"w:{edge}")
    el.set(qn("w:val"), "single")
    el.set(qn("w:sz"), str(size))
    el.set(qn("w:space"), str(space))
    el.set(qn("w:color"), hex_color)
    borders.append(el)


def _field(paragraph, instr):
    """A Word field (PAGE / NUMPAGES) — python-docx has no API for these.

    Real fields, not baked numbers: the page count has to survive the reader
    editing the document, which is the whole point of shipping .docx.
    """
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    run = paragraph.add_run()
    for kind, text in (("begin", None), (None, instr), ("end", None)):
        if kind:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), kind)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = text
        run._r.append(el)
    return run


def _add_hyperlink(paragraph, url, label):
    """Insert a real, clickable Word hyperlink — python-docx has no API for it,
    so the w:hyperlink element and its relationship are built by hand."""
    from docx.opc.constants import RELATIONSHIP_TYPE as RT
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    r_id = paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), r_id)

    run = OxmlElement("w:r")
    props = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), _ACCENT_HEX)
    props.append(color)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    props.append(underline)
    run.append(props)

    text = OxmlElement("w:t")
    text.set(qn("xml:space"), "preserve")
    text.text = label
    run.append(text)
    link.append(run)
    paragraph._p.append(link)


def _add_inline(paragraph, text, bold=False, italic=False):
    """Render **bold**, *italic*, `code` and links as runs in a paragraph.

    Recursive, so markers nest: `**\\`code\\`**` is bold monospace rather than a
    bold run with literal backticks in it. A code span is a leaf — markers inside
    it are content, not formatting."""
    for tok in _INLINE.split(text):
        if not tok:
            continue
        if tok.startswith("[") and tok.endswith(")") and "](" in tok:
            label, _, url = tok[1:-1].partition("](")
            _add_hyperlink(paragraph, url, label)
        elif tok.startswith("<") and tok.endswith(">"):
            _add_hyperlink(paragraph, tok[1:-1], tok[1:-1])
        elif tok.startswith(("http://", "https://")):
            trail = ""
            while tok and tok[-1] in ".,;:!?":
                trail, tok = tok[-1] + trail, tok[:-1]
            _add_hyperlink(paragraph, tok, tok)
            if trail:
                _add_inline(paragraph, trail, bold, italic)
        elif len(tok) > 4 and tok.startswith("**") and tok.endswith("**"):
            _add_inline(paragraph, tok[2:-2], True, italic)
        elif len(tok) > 2 and tok.startswith("*") and tok.endswith("*"):
            _add_inline(paragraph, tok[1:-1], bold, True)
        elif len(tok) > 2 and tok.startswith("`") and tok.endswith("`"):
            r = paragraph.add_run(tok[1:-1])
            r.font.name = "Consolas"
            r.bold, r.italic = bold or None, italic or None
        else:
            r = paragraph.add_run(tok)
            r.bold, r.italic = bold or None, italic or None


def _fresh_num_id(doc, style_name="List Number"):
    """Clone the list style's numbering into a new instance.

    Every "List Number" paragraph otherwise shares one numbering instance, so
    Word numbers them continuously across the whole document — three separate
    3-step lists come out as 1-3, 4-6, 7-9. A fresh numId per list restarts at 1.
    Returns None if the template has no numbering part (then Word's default
    behaviour stands)."""
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    try:
        numbering = doc.part.numbering_part.element
        style = doc.styles[style_name].element
        path = f'{qn("w:pPr")}/{qn("w:numPr")}/{qn("w:numId")}'
        base_id = style.find(path).get(qn("w:val"))
        abstract = None
        used = []
        for num in numbering.findall(qn("w:num")):
            used.append(int(num.get(qn("w:numId"))))
            if num.get(qn("w:numId")) == base_id:
                abstract = num.find(qn("w:abstractNumId")).get(qn("w:val"))
        if abstract is None:
            return None
        new_id = max(used) + 1
        num = OxmlElement("w:num")
        num.set(qn("w:numId"), str(new_id))
        a = OxmlElement("w:abstractNumId")
        a.set(qn("w:val"), abstract)
        num.append(a)
        numbering.append(num)
        return new_id
    except Exception:
        return None


def _apply_num(paragraph, num_id, level=0):
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    if num_id is None:
        return
    numPr = OxmlElement("w:numPr")
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), str(level))
    nid = OxmlElement("w:numId")
    nid.set(qn("w:val"), str(num_id))
    numPr.append(ilvl)
    numPr.append(nid)
    paragraph._p.get_or_add_pPr().append(numPr)


def _is_table_sep(line):
    return bool(re.match(r"^\s*\|?[\s:\-|]+\|?\s*$", line)) and "-" in line


def _split_row(line):
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]


_HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)


def strip_html_comments(md_text: str) -> str:
    """Drop `<!-- ... -->` blocks. Every markdown renderer does; this one did not.

    They are how a source file carries instructions to whoever rebuilds it -- the
    global manual's own header holds its rebuild command that way. Rendering them
    puts that command in the middle of a document a consultant reads.

    NOT applied to source_sha(): the stamp hashes the file as written, so adding
    or editing a comment still counts as the source having changed. That is the
    honest reading -- the note is part of the file even when it is not part of the
    document.
    """
    return _HTML_COMMENT.sub("", md_text)


def _style_table(table):
    """Shaded header, zebra body, hairline horizontals — and NO vertical rules.

    At 9.5pt a full grid reads as a cage: every cell gets four lines and the eye
    spends its effort on the ink rather than the values. A filled header row and
    horizontal hairlines carry the same structure with a fraction of it. Applied
    after the cells are filled, because `_add_inline` decides the runs.
    """
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Pt

    for r, row in enumerate(table.rows):
        for cell in row.cells:
            if r and r % 2 == 0:
                _shade(cell, BAND_HEX)
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(5)
                p.paragraph_format.space_after = Pt(5)
                p.paragraph_format.line_spacing = 1.1
                for run in p.runs:
                    _face(run, BODY_FONT, 9.5,
                          color=((0xFF, 0xFF, 0xFF) if r == 0 else INK))
                    if r == 0:
                        run.font.bold = True

    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        off = edge in ("left", "right", "insideV")
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "none" if off else "single")
        el.set(qn("w:sz"), "0" if off else "6")
        el.set(qn("w:color"), "auto" if off else RULE_HEX)
        borders.append(el)
    table._tbl.tblPr.append(borders)

    margins = OxmlElement("w:tblCellMar")
    for side, twips in (("top", 60), ("bottom", 60), ("left", 130), ("right", 130)):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(twips))
        el.set(qn("w:type"), "dxa")
        margins.append(el)
    table._tbl.tblPr.append(margins)


def _build_header(section, measure, logo=True):
    """The NTT mark, top right, on every page — and nothing else up there.

    A running head carrying the document id beside a logo that already repeats
    is furniture, not information, so the id lives in the footer instead. The
    logo is a SECTION property: it repeats however long the document grows,
    without anything being pasted per page.

    Falls back to a text wordmark when the asset is MISSING — a document that
    loses its logo file should look plainer, never broken. `logo=False` is a
    different thing and gets a different answer: the caller is converting a
    document that is not ours, so the header stays empty rather than printing
    the brand in letters instead of in pixels.
    """
    from docx.enum.text import WD_TAB_ALIGNMENT
    from docx.shared import Cm, Emu

    if not logo:
        return
    header = section.header
    header.is_linked_to_previous = False
    p = header.paragraphs[0]
    p.paragraph_format.space_after = 0
    p.paragraph_format.tab_stops.add_tab_stop(Emu(int(measure)),
                                              WD_TAB_ALIGNMENT.RIGHT)
    p.add_run("\t")
    mark = logo_path()
    if mark:
        p.add_run().add_picture(str(mark), width=Cm(3.1))
    else:
        _face(p.add_run("NTT DATA"), BODY_FONT, 12, True, ACCENT)   # the MARK, never recoloured


def _build_footer(section, measure, left="", classification=""):
    """What a page torn out of the printed copy still has to say: which document
    it belongs to, how far it may travel, and where it sits in the whole."""
    from docx.enum.text import WD_TAB_ALIGNMENT
    from docx.shared import Emu, Pt

    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.paragraph_format.space_before = Pt(4)
    stops = p.paragraph_format.tab_stops
    stops.add_tab_stop(Emu(int(measure) // 2), WD_TAB_ALIGNMENT.CENTER)
    stops.add_tab_stop(Emu(int(measure)), WD_TAB_ALIGNMENT.RIGHT)
    _face(p.add_run(left), BODY_FONT, 8, False, MUTED)
    p.add_run("\t")
    _face(p.add_run(classification), BODY_FONT, 8, False, MUTED)
    p.add_run("\t")
    _face(p.add_run("Sayfa "), BODY_FONT, 8, False, MUTED)
    _face(_field(p, "PAGE"), BODY_FONT, 8, False, MUTED)
    _face(p.add_run(" / "), BODY_FONT, 8, False, MUTED)
    _face(_field(p, "NUMPAGES"), BODY_FONT, 8, False, MUTED)
    _rule(p, "top", RULE_HEX, size=6, space=6)


def build(md_text, out_path, title, base_dir=".", eyebrow="",
          classification="", logo=True, accent="", heading_font=""):
    from docx import Document
    from docx.shared import Cm, Emu, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    _apply_palette(accent, heading_font)
    base = Path(base_dir)

    doc = Document()

    # python-docx ships a US Letter template with 3.17 cm margins. Everything
    # this kit produces is read and printed on A4, so set the page rather than
    # inherit it: on Letter the text reflows when someone prints A4, and the old
    # hardcoded 15.5 cm image cap was WIDER than the real 15.24 cm column, so
    # oversized screenshots ran into the margin.
    for section in doc.sections:
        section.page_width = Cm(21)
        section.page_height = Cm(29.7)
        section.left_margin = section.right_margin = Cm(2.7)
        section.top_margin, section.bottom_margin = Cm(2.6), Cm(2.2)
        section.header_distance = section.footer_distance = Cm(1.1)
    first = doc.sections[0]
    max_width = Emu(int(first.page_width)
                    - int(first.left_margin) - int(first.right_margin))

    _build_header(first, max_width, logo=logo)
    _build_footer(first, max_width, left=title, classification=classification)

    # Airiness is a set of numbers, not a mood. 1.35 leading (was 1.15) and a
    # ~16 cm measure -- about 80 characters -- is the width the eye tracks
    # without losing its place on the way back to the left margin.
    normal = doc.styles["Normal"]
    _face(normal, BODY_FONT, 10.5, color=INK)
    normal.paragraph_format.line_spacing = 1.35
    normal.paragraph_format.space_after = Pt(10)

    # Headings in the accent, sized so three levels are told apart by weight and
    # space rather than by colour alone, and given room to separate sections
    # instead of sitting on the paragraph above.
    for lvl, (size, before) in enumerate(((15, 20), (13, 16), (11, 12)), start=1):
        try:
            style = doc.styles[f"Heading {lvl}"]
            _face(style, _HEAD_FONT, size, color=(_DEEP if lvl == 3 else _ACCENT))
            style.font.bold = False          # Semibold IS the weight; bold doubles it
            style.paragraph_format.space_before = Pt(before)
            style.paragraph_format.space_after = Pt(8)
            style.paragraph_format.line_spacing = 1.0
        except Exception:
            pass

    if title:
        if eyebrow:
            eb = doc.add_paragraph()
            eb.paragraph_format.space_after = Pt(3)
            eb.paragraph_format.line_spacing = 1.0
            _face(eb.add_run(eyebrow), BODY_FONT, 8, True, _ACCENT).font.all_caps = True
        # Not add_heading(level=0): Word's Title style carries its own font and
        # its own bottom border, both of which would fight this theme.
        h = doc.add_paragraph()
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.line_spacing = 1.0
        # The title takes the heading face too. A page whose H1 is Cambria and
        # whose title is Segoe UI Light reads as two documents stapled together.
        _face(h.add_run(title), LIGHT_FONT if _HEAD_FONT == SEMI_FONT else _HEAD_FONT,
              22, False, _DEEP)
        _rule(h, "bottom", _ACCENT_HEX, size=12, space=9)
        spacer = doc.add_paragraph()
        spacer.paragraph_format.space_after = Pt(10)

    lines = strip_html_comments(md_text).splitlines()
    i, n = 0, len(lines)
    # Numbering instance of the ordered list currently being emitted. Only a
    # structural block (heading, table, code, page break) starts a new list;
    # images, notes and quotes between two steps must not restart the count.
    num_id = None
    while i < n:
        line = lines[i]
        stripped = line.strip()

        # blank
        if not stripped:
            i += 1
            continue

        # horizontal rule -> page break
        if stripped == "---":
            num_id = None
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
            num_id = None
            p = doc.add_paragraph()
            # Set apart from the prose: indented, single-spaced (code lines are
            # meant to be read as a block, not as paragraphs), with air around it.
            pf = p.paragraph_format
            pf.left_indent = Cm(0.45)
            pf.line_spacing = 1.15
            pf.space_before = Pt(8)
            pf.space_after = Pt(12)
            _face(p.add_run("\n".join(code)), MONO_FONT, 9, color=INK)
            _shade(p, BAND_HEX)
            continue

        # image line: one ![alt](path), or several separated by spaces, which
        # render as a ROW. Markdown already treats images as inline, so the
        # source reads the way the page looks: three logos on one line are three
        # logos side by side, and nothing new has to be learned to get that.
        shots = re.findall(r"!\[([^\]]*)\]\(([^)\s]+)\)", stripped)
        if shots and re.fullmatch(r"(?:!\[[^\]]*\]\([^)\s]+\)\s*)+", stripped):
            paths = []
            for _alt, ref in shots:
                src = Path(ref)
                if not src.is_absolute():
                    src = base / src
                if src.is_file():
                    paths.append(src)
                else:
                    print(f"[office-docx] WARNING: image not found: {src}",
                          file=sys.stderr)
            if paths:
                gap = Pt(6)
                # Share the column between them, minus the gaps. Each picture is
                # still only ever shrunk: a small logo keeps its own size rather
                # than being blown up to fill a third of the page.
                budget = Emu(int(max_width) - int(gap) * (len(paths) - 1))
                share = Emu(int(budget) // len(paths))
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                # NOT `n`: that is the main loop's line count, and shadowing it
                # ended the document at the first image row.
                for idx, src in enumerate(paths):
                    if idx:
                        p.add_run(" ")
                    run = p.add_run()
                    run.add_picture(str(src))
                    shape = doc.inline_shapes[-1]
                    if shape.width > share:
                        ratio = int(share) / int(shape.width)
                        shape.width = int(int(shape.width) * ratio)
                        shape.height = int(int(shape.height) * ratio)
            i += 1
            continue

        # heading
        m = re.match(r"^(#{1,3})\s+(.*)$", stripped)
        if m:
            num_id = None
            # Build the heading empty and fill it through the inline renderer:
            # add_heading(text) writes the string verbatim, so a heading naming a
            # file or a flag came out with its backticks showing.
            h = doc.add_heading("", level=len(m.group(1)))
            _add_inline(h, m.group(2).strip())
            i += 1
            continue

        # blockquote -> callout: a bar in the accent, indented, quieter text.
        # Word's "Intense Quote" was centred, italic and followed the template's
        # BLUE theme accent, so a document had two unrelated colour systems in it.
        if stripped.startswith(">"):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.55)
            p.paragraph_format.space_after = Pt(12)
            _add_inline(p, stripped.lstrip(">").strip())
            for run in p.runs:
                _face(run, BODY_FONT, 10, color=MUTED)
            _rule(p, "left", _ACCENT_HEX, size=18, space=11)
            i += 1
            continue

        # GFM table: header row + separator row
        if "|" in line and i + 1 < n and _is_table_sep(lines[i + 1]):
            num_id = None
            headers = _split_row(line)
            i += 2
            rows = []
            while i < n and "|" in lines[i] and lines[i].strip():
                rows.append(_split_row(lines[i]))
                i += 1
            table = doc.add_table(rows=1, cols=len(headers))
            table.style = "Table Grid"
            for c, htext in enumerate(headers):
                cell = table.rows[0].cells[c]
                cell.text = ""
                _add_inline(cell.paragraphs[0], htext)
                _shade(cell, _ACCENT_HEX)
            for row in rows:
                cells = table.add_row().cells
                for c in range(len(headers)):
                    cells[c].text = ""
                    _add_inline(cells[c].paragraphs[0],
                                row[c] if c < len(row) else "")
            _style_table(table)
            continue

        # bullet / ordered list
        mb = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", line)
        if mb:
            indent = len(mb.group(1)) // 2
            ordered = mb.group(2).endswith(".")
            style = "List Number" if ordered else "List Bullet"
            p = doc.add_paragraph(style=style)
            p.paragraph_format.left_indent = Pt(18 * (indent + 1))
            if ordered:
                if num_id is None:          # first item of a new ordered list
                    num_id = _fresh_num_id(doc)
                _apply_num(p, num_id, indent)
            else:
                num_id = None
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

    # Stamp the source so a later run can tell whether this file is still the
    # markdown it was built from. A .docx is a build output that nothing else
    # links back to its source: edit the guide, forget to rebuild, and the Word
    # copy people download drifts with no way to notice. Lives in core
    # properties, which survive render_manual()'s hyperlink rewrite (that
    # touches word/_rels only).
    doc.core_properties.comments = f"{SOURCE_STAMP}{source_sha(md_text)}"
    doc.save(out_path)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Markdown subset -> native .docx.")
    ap.add_argument("--input", required=True, help="source .md file")
    ap.add_argument("--output", required=True, help="target .docx")
    ap.add_argument("--title", default="", help="document title")
    ap.add_argument("--eyebrow", default="",
                    help="small caps line above the title, e.g. TEKNIK SPESIFIKASYON")
    ap.add_argument("--classification", default="",
                    help="footer centre, e.g. 'Confidential - Customer Restricted'")
    ap.add_argument("--no-logo", action="store_true",
                    help="omit the NTT mark (converting a document that is not ours)")
    ap.add_argument("--accent", default="",
                    help="override the house accent, e.g. 2E7D32; the deeper "
                         "title shade is derived from it")
    ap.add_argument("--heading-font", default="",
                    help="override the heading face, e.g. Cambria (for a surface "
                         "whose HTML edition is set in it)")
    ap.add_argument("--redact-pii", action="store_true",
                    help="mask TCKN / 10-11 digit tax IDs before writing")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args(argv)

    _require_docx()
    if not os.path.isfile(args.input):
        sys.exit(f"ERROR: input not found: {args.input}")
    if os.path.exists(args.output) and not args.force:
        sys.exit(f"ERROR: {args.output} exists (use --force)")

    # utf-8-sig: PowerShell's Set-Content/Out-File prepend a BOM, which would
    # otherwise ride into the first heading as an invisible character.
    md_text = open(args.input, encoding="utf-8-sig").read()
    if args.redact_pii:
        if redact_text is None:
            sys.exit("ERROR: --redact-pii requested but lib/redact.py not importable")
        n = count_matches(md_text)
        md_text = redact_text(md_text)
        sys.stderr.write(f"[redact] masked {n} ID(s) before writing\n")

    build(md_text, args.output, args.title,
          base_dir=os.path.dirname(os.path.abspath(args.input)),
          eyebrow=args.eyebrow, classification=args.classification,
          logo=not args.no_logo, accent=args.accent,
          heading_font=args.heading_font)
    print(f"[office-docx] wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
