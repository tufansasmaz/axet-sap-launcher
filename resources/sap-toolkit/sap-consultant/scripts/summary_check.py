#!/usr/bin/env python3
"""Measure an FS/TS summary against its budget, because "keep it short" does not hold.

An FS summary that runs to four pages is not a summary; it is the document again,
and nobody reads it twice. The length rule is therefore mechanical rather than a
request in a prompt: this script counts what will actually land on the page and
fails when it does not fit.

What it enforces
----------------
  * TOTAL length, in rendered lines (see PAGE_LINES for how that maps to pages).
    For a TS the object table has its own allowance -- a developer needs the whole
    list, and squeezing it out to make room for prose is the wrong trade.
  * The DECISIONS section exists and either lists decisions or says in one line
    that there are none. This is the section the summary exists for; a summary
    that quietly drops it looks fine and is worthless.
  * No leftover [PLACEHOLDER] from the template.
  * No section left as a heading with nothing under it.

What it does NOT enforce: whether the prose is any good. Nothing mechanical can.

Headings follow the brief's output language, so the two sections that must be
identified by name accept both Turkish and English spellings; anything else is
matched by shape. If the lookup fails the script says which names it tried rather
than passing silently.

Usage
-----
  py summary_check.py <summary.md> --kind fs
  py summary_check.py <summary.md> --kind ts
  py summary_check.py <summary.md> --kind ts --verbose    # per-section line counts
"""
from __future__ import annotations

import argparse
import io
import re
import sys

# How many counted lines actually fit on one A4 page through office-pdf's branded
# style. MEASURED, not guessed: a sample FS summary counted at 41 lines here was
# rendered and its last section -- six lines -- landed on page two. The first
# guess for this constant was 46, which called that same file "0.9 pages". A
# length rule that cannot count pages is not a length rule.
#
# Re-measure with: render a summary, then
#   py -c "from pypdf import PdfReader; print(len(PdfReader('x.pdf').pages))"
PAGE_LINES = 48

# Bracketed by render, not chosen. One sample FS summary was grown a decision at a
# time and rendered at each step:
#
#     counted 44, 46, 48  ->  1 page
#     counted 50, 52, 54  ->  2 pages
#
# So one page holds 48 and the budget is 48. The two-page figure was measured the
# same way against a TS summary.
#
# The decision and object caps are COUNTS, not budgets: they answer "is this still
# a summary" rather than "does it fit". Ten open decisions fit on a page and still
# mean the document underneath is not ready to hand over.
BUDGETS = {
    # kind: (total lines, max decision items, max object rows, page claim)
    "fs": (48, 8, 0, 1),
    "ts": (88, 10, 18, 2),
}

# The two sections that must be found by name. Turkish first (the default output
# language), English second.
DECISION_HEADINGS = ("karar", "decision", "open item", "acik konu", "açık konu")
OBJECT_HEADINGS = ("ne insa", "ne inşa", "what gets built", "objects", "nesne")

NO_DECISIONS = ("karar bekleyen nokta yok", "no open decisions", "no decisions")

PLACEHOLDER = re.compile(r"\[[A-ZÇĞİÖŞÜ][^\]]{1,60}\]")
# Template guidance lives in HTML comments and never reaches the reader, so it is
# stripped before anything is counted.
COMMENT = re.compile(r"<!--.*?-->", re.S)


def norm(s: str) -> str:
    """Lowercase and strip diacritics enough for a heading lookup."""
    s = s.lower()
    for a, b in (("ı", "i"), ("İ", "i"), ("ş", "s"), ("ğ", "g"),
                 ("ü", "u"), ("ö", "o"), ("ç", "c")):
        s = s.replace(a, b)
    return s


def sections(text: str) -> list[tuple[str, list[str]]]:
    """Split on level-2 headings, keeping each heading's body lines."""
    out: list[tuple[str, list[str]]] = []
    current = ("(preamble)", [])
    for line in text.splitlines():
        if line.startswith("## "):
            out.append(current)
            current = (line[3:].strip(), [])
        else:
            current[1].append(line)
    out.append(current)
    return [(h, b) for h, b in out if h != "(preamble)" or any(x.strip() for x in b)]


# Text wider than the column it sits in WRAPS, and every wrapped line costs a
# full line of page. This is what actually blew the first calibration: a decision
# table with three rows rendered as eleven lines, because one 44-character cell
# became three. So length is counted in WRAPPED lines, and the templates cap cell
# text so that wrapping cannot happen in the first place -- constraining the input
# beats predicting the renderer.
PROSE_COLS = 72                 # full-width body text before it wraps


def wrapped(text: str, cols: int) -> int:
    return max(1, -(-len(text.strip()) // cols)) if text.strip() else 1


def rendered(body: list[str]) -> int:
    """Lines that will occupy space on the page, wrapping included.

    A blank line between paragraphs is real vertical space, but a run of them is
    not, and a table's separator row (|---|---|) renders as a rule rather than a
    line. Counting raw lines would punish formatting instead of length.
    """
    n, blank_run = 0, 0
    for line in body:
        s = line.strip()
        if not s:
            blank_run += 1
            if blank_run == 1:
                n += 1
            continue
        blank_run = 0
        if re.fullmatch(r"\|[\s\-:|]+\|", s):
            continue
        if s.startswith("|"):
            cells = [c for c in s.strip("|").split("|")]
            per = max(10, PROSE_COLS // max(1, len(cells)))
            n += max(wrapped(c, per) for c in cells)
        else:
            n += wrapped(s, PROSE_COLS)
    return n


def wide_cells(body: list[str]) -> list[str]:
    """Cells wide enough to wrap, which is what silently costs pages.

    The threshold is forgiving on purpose: a two-column table gives its second
    column most of the width, and a 38-character cell there was measured to sit on
    one line. What must be caught is the four-column case, where a 44-character
    cell became three lines and pushed a section onto page two.
    """
    out = []
    for line in body:
        s = line.strip()
        if not s.startswith("|") or re.fullmatch(r"\|[\s\-:|]+\|", s):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        per = max(20, 90 // max(1, len(cells)))     # 2 kolon 45 · 3 kolon 30 · 4 kolon 22
        for c in cells:
            if len(c) > per:
                out.append(f"{len(c)}>{per} krk: {c[:44]}")
    return out


def find(secs, needles):
    for heading, body in secs:
        h = norm(heading)
        if any(n in h for n in needles):
            return heading, body
    return None, None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("path")
    ap.add_argument("--kind", required=True, choices=sorted(BUDGETS))
    ap.add_argument("--verbose", action="store_true",
                    help="print the line count of every section")
    a = ap.parse_args()

    raw = io.open(a.path, encoding="utf-8").read()
    text = COMMENT.sub("", raw)
    secs = sections(text)
    budget, dec_allow, obj_allow, pages = BUDGETS[a.kind]

    obj_heading = find(secs, OBJECT_HEADINGS)[0] if obj_allow else None
    dec_heading, dec_body = find(secs, DECISION_HEADINGS)

    total, obj_rows, dec_rows, report = 0, 0, 0, []
    for heading, body in secs:
        n = rendered(body)
        total += n + 1                      # +1 for the heading itself
        if obj_heading and heading == obj_heading:
            obj_rows = sum(1 for l in body if l.strip().startswith("|")
                           and not re.fullmatch(r"\|[\s\-:|]+\|", l.strip()))
            report.append((heading, n, "nesne tablosu"))
            continue
        report.append((heading, n, "karar listesi" if heading == dec_heading else ""))

    fails: list[str] = []

    if total > budget:
        fails.append(f"{total} satir, butce {budget} — {total - budget} satir fazla")
    if obj_allow and obj_heading is None:
        fails.append("nesne tablosu bolumu bulunamadi; aranan basliklar: "
                     + ", ".join(OBJECT_HEADINGS))
    elif obj_allow and obj_rows - 1 > obj_allow:          # -1 for the header row
        fails.append(f"nesne tablosu {obj_rows - 1} satir, tavan {obj_allow} — "
                     f"mantik tasiyanlari birak, kalanini sayiyla ozetle")

    if dec_heading is None:
        fails.append("karar bolumu bulunamadi; aranan basliklar: "
                     + ", ".join(DECISION_HEADINGS))
    else:
        blob = norm(" ".join(dec_body))
        items = [l for l in dec_body if re.match(r"^\s*\d+\.\s", l)]
        if not items and not any(p in blob for p in NO_DECISIONS):
            fails.append("karar bolumu bos — ya numarali maddeleri yaz ya da "
                         "'Karar bekleyen nokta yok.' de")
        if len(items) > dec_allow:
            fails.append(f"karar listesi {len(items)} madde, tavan {dec_allow} — "
                         f"bu kadar acik konu varsa sorun ozette degil, FS/TS "
                         f"henuz teslim edilebilir durumda degil")
        long_items = [l.strip()[:50] for l in items if len(l.strip()) > 92]
        if long_items:
            fails.append(f"{len(long_items)} karar maddesi tek satira sigmiyor "
                         f"(>92 krk), ilki: {long_items[0]}")
        dec_rows = len(items)

    # Wrapping is invisible in the markdown and expensive on the page.
    for heading, body in secs:
        for w in wide_cells(body)[:3]:
            fails.append(f"'{heading}' tablosunda hucre satira sigmiyor — {w}")

    left = sorted({m.group(0) for m in PLACEHOLDER.finditer(text)}
                  - {"[N]"})
    if left:
        fails.append(f"sablondan kalan yer tutucu: {' '.join(left[:6])}"
                     + (f" (+{len(left) - 6})" if len(left) > 6 else ""))

    empty = [h for h, b in secs if h != obj_heading and not any(x.strip() for x in b)]
    if empty:
        fails.append("icerigi bos bolum: " + ", ".join(empty))

    # ---- report ----
    if a.verbose:
        for heading, n, note in report:
            print(f"  {n:4}  {heading}{('  <- ' + note) if note else ''}")
        print()

    print(f"{a.path}")
    print(f"  uzunluk    {total:4} / {budget} satir")
    print(f"  karar      {dec_rows:4} / {dec_allow} madde")
    if obj_allow:
        print(f"  nesne      {max(obj_rows - 1, 0):4} / {obj_allow} satir")
    print(f"  sayfa      {total / PAGE_LINES:.1f} (hedef {pages})")
    print()

    if fails:
        for f in fails:
            print(f"  FAIL  {f}")
        print(f"\n{len(fails)} kural ihlali. Ozet kisaltilmadan teslim edilmez.")
        return 1
    print("  OK — ozet butcesine uyuyor")
    return 0


if __name__ == "__main__":
    sys.exit(main())
