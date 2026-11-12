#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Turn the output of a render-test classrun into a PDF and say whether ADS drew anything.

    py render_pdf_check.py classrun_output.txt --out form.pdf [--min-bytes 5200]

STATUS reads the form objects; it does not run them. A form with a duplicated context, or one
called without DOCPARAMS (language, country), was reported healthy and produced an EMPTY page
from ADS on every call, static text included. The only measure of "done" is the PDF.

Input: the text a classrun printed (references/render_test.abap writes the PDF as base64 lines
`B64:<chunk>`). Lines without that prefix are ignored, so the whole console output can be saved
as is.

Output: the PDF on disk, its size, a page count when one can be read, and a verdict.
  empty layout          ~ 4600 bytes (measured)
  one filled page       ~ 11 KB      (measured)
  --min-bytes           the size at or below which the verdict is "looks EMPTY" (default 5200)
The page count counts `/Type /Page` objects; ADS PDFs may keep them in compressed object
streams, and then it is reported as unknown -- never as 0. Size is the dependable signal.

--xdp layout.xdp   ALSO check that the PDF is YOUR layout. ADS caches a template by the uuid on the
                    XDP root; a layout served from that cache gives a full, healthy-sized PDF of ANOTHER
                    form (a customer's quotation came out for a label request). Size cannot see that.
                    The static texts of the layout (its `draw` labels) are looked for in the PDF's
                    text: none found = WRONG DOCUMENT. Reading PDF text needs `pypdf` or `pymupdf`
                    (not shipped); without one the identity is reported NOT CHECKED, never "ok".

Exit: 0 a PDF of a plausible size | 1 it looks empty or is another document | 2 no PDF could be
rebuilt from the input.
Open the PDF and LOOK at it: alignment and overflow are visual defects no size check sees.
"""
from __future__ import annotations

import argparse
import base64
import binascii
import re
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

EMPTY_LIMIT = 5200
MIN_LABELS = 3          # fewer static texts than this say nothing about identity


def layout_labels(xdp_text: str) -> list[str]:
    """The static texts a layout draws: `<draw>...<text>LABEL</text>`. Real words only: a label
    with no letter in it (a rule, a number, a page counter) cannot tell two forms apart."""
    out: list[str] = []
    for m in re.finditer(r"<draw\b.*?</draw>", xdp_text, re.S):
        for t in re.findall(r"<text[^>]*>(.*?)</text>", m.group(0), re.S):
            t = re.sub(r"<[^>]+>", " ", t)
            t = re.sub(r"&(?:amp|lt|gt|quot|apos);", " ", t)
            t = " ".join(t.split())
            if len(t) >= 3 and re.search(r"[^\W\d_]{3}", t) and t.lower() not in (x.lower() for x in out):
                out.append(t)
    return out


def pdf_text(pdf: bytes) -> str | None:
    """Text of the PDF through pypdf or pymupdf, whichever is installed; None when neither is."""
    try:
        import io
        import pypdf
        return "\n".join((pg.extract_text() or "") for pg in pypdf.PdfReader(io.BytesIO(pdf)).pages)
    except ImportError:
        pass
    except Exception:
        return None
    try:
        import pymupdf
        with pymupdf.open(stream=pdf, filetype="pdf") as doc:
            return "\n".join(pg.get_text() for pg in doc)
    except Exception:
        return None


def _norm(t: str) -> str:
    return re.sub(r"\s+", "", t).casefold().replace("\u0307", "")


def identity(pdf: bytes, xdp_path: str) -> tuple[int, str]:
    """(0 ok | 1 wrong document | 3 not checked, one line). Never 'ok' on a guess."""
    try:
        labels = layout_labels(Path(xdp_path).read_text(encoding="utf-8", errors="replace"))
    except OSError as exc:
        return 3, f"IDENTITY NOT CHECKED: cannot read {xdp_path}: {exc.strerror or exc}"
    if len(labels) < MIN_LABELS:
        return 3, (f"IDENTITY NOT CHECKED: the layout has {len(labels)} static text(s); too few to tell it "
                   f"from another form. Open the PDF and compare.")
    text = pdf_text(pdf)
    if text is None:
        return 3, ("IDENTITY NOT CHECKED: no PDF text reader here (pip install pypdf). Open the PDF and "
                   "confirm it is YOUR layout, not a cached other form: a healthy size does not prove it.")
    hay = _norm(text)
    found = [t for t in labels if _norm(t) in hay]
    if not found:
        return 1, (f"VERDICT: WRONG DOCUMENT. None of the {len(labels)} labels of this layout "
                   f"(e.g. '{labels[0]}') appear in the PDF. ADS most likely served a CACHED template: "
                   f"upload the XDP again with a fresh uuid/timeStamp (generate_adobe.py does it on every "
                   f"SET_LAYOUT) and render again.")
    if len(found) * 3 < len(labels):
        return 1, (f"VERDICT: SUSPECT. Only {len(found)} of {len(labels)} labels of this layout are in the "
                   f"PDF. Open it and look before trusting it.")
    return 0, f"IDENTITY: {len(found)} of {len(labels)} labels of this layout are in the PDF."


def collect_base64(text: str) -> str:
    return "".join(m.group(1) for m in re.finditer(r"^[ \t]*B64:([A-Za-z0-9+/=]+)[ \t]*$", text, re.M))


def page_count(pdf: bytes) -> int | None:
    pages = len(re.findall(rb"/Type\s*/Page(?![A-Za-z])", pdf))
    if pages:
        return pages
    counts = [int(c) for c in re.findall(rb"/Type\s*/Pages\b[^>]*?/Count\s+(\d+)", pdf)]
    counts += [int(c) for c in re.findall(rb"/Count\s+(\d+)[^>]*?/Type\s*/Pages\b", pdf)]
    return max(counts) if counts else None


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Rebuild the PDF from a render-test classrun and judge it.")
    ap.add_argument("classrun_output")
    ap.add_argument("--out", default="render_test.pdf")
    ap.add_argument("--min-bytes", type=int, default=EMPTY_LIMIT)
    ap.add_argument("--xdp", help="the layout that was rendered: also check the PDF is that layout")
    args = ap.parse_args(argv)

    try:
        text = Path(args.classrun_output).read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(f"NOT CHECKED: cannot read {args.classrun_output}: {exc.strerror or exc}")
        return 2
    b64 = collect_base64(text)
    if not b64:
        print("NOT CHECKED: no 'B64:' lines in the output -- the classrun printed no PDF "
              "(did the form call fail? read its own messages above the B64 lines).")
        return 2
    try:
        pdf = base64.b64decode(b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        print(f"NOT CHECKED: the base64 does not decode ({exc}); a line was cut or mangled.")
        return 2
    if not pdf.startswith(b"%PDF"):
        print(f"NOT CHECKED: {len(pdf)} bytes decoded but they do not start with %PDF.")
        return 2

    Path(args.out).write_bytes(pdf)
    pages = page_count(pdf)
    shown = "unknown (compressed object streams)" if pages is None else str(pages)
    print(f"PDF: {len(pdf)} bytes, pages: {shown}, written to {args.out}")
    if len(pdf) <= args.min_bytes:
        print(f"VERDICT: looks EMPTY (<= {args.min_bytes} bytes; an empty layout is about 4600). "
              f"Typical causes: a duplicated context (run GET_CONTEXT), a call without DOCPARAMS, "
              f"a cached template (the XDP kept its uuid).")
        return 1
    if args.xdp:
        code, line = identity(pdf, args.xdp)
        print(line)
        if code == 1:
            return 1
    print("VERDICT: plausible size. Open the PDF and look: header, table, page break, page numbers.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
