#!/usr/bin/env python3
"""Check a generated meeting note against its sources: names, added terms, unread images.

The prompt rules of meeting-notes-organizer ("Step 4b - Fidelity to the sources") ask the
model to keep names and terms exactly as the sources have them. A prompt cannot guarantee
that: a model that knows the word "Guref" will quietly turn the customer "Gures" into it
(a real run, 2026-10-26). This file is the part that does not depend on the model. It is
shared by both consumers of the skill -- the chat skill (aXet.code) runs it as a script,
Kokpit (aXet.flows) imports the same functions -- so there is one rule, not two.

What it does, all mechanical:
  lexicon(texts)        names the sources spell (capitalised words) and the short words they use
  fix_names(text, lex)  a capitalised word that differs from a source name ONLY by Turkish
                        diacritics (s/s-cedilla, g/g-breve, i/dotless i, o/u/c variants) is put
                        back to the source's spelling -- the model's "correction" undone
  new_terms(text, lex)  ALL-CAPS abbreviations and a few SAP terms the note uses that no source
                        contains (MIRO, "konsinyasyon"): listed for the consultant, never edited
  docx_images(path)     the images inside a .docx and the paragraph each one follows -- their
                        content is not read by anything here, so the note must say they exist

Usage (chat skill):
  py note_fidelity.py --extracted .tmp/extracted.json --note note.md [--fix] [--json report.json]

Console output is ASCII-only (the Windows console is cp1252/cp1254); Turkish text is shown
as \\u escapes in the report and written as UTF-8 to the files.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

LETTERS = "A-Za-zÇĞİÖŞÜçğıöşü"
WORD_RE = re.compile("[%s][%s0-9]+" % (LETTERS, LETTERS))
_FOLD = str.maketrans("çğıöşüÇĞİÖŞÜ",
                      "cgiosuCGIOSU")

# Module and project vocabulary every note may use without a source spelling it out.
ALLOWED_CAPS = {
    "SAP", "MM", "SD", "PP", "FI", "CO", "QM", "PM", "TM", "EWM", "PS", "HCM", "TRM", "CM", "WM",
    "PO", "STO", "INT", "WRICEF", "FIFO", "ATK", "TR", "EN", "KG", "ERP", "WORD", "DOCX", "PDF",
    "S4HANA", "ECC", "BTP", "ATC", "RICEF", "FS", "TS", "BBP", "UAT", "CRM", "BOM", "MRP", "ABAP",
}
# SAP words a model adds by "knowing" what the speaker meant; the source must have them too.
WATCH_WORDS = (
    "konsinye", "konsinyasyon", "consignment", "subcontract", "miro", "migo", "me21n", "me51n",
    "mb51", "movement type", "hareket tipi", "valuation class", "değerleme sınıfı",
)

MIN_NAME = 4
ID_RE = re.compile(r"^[A-Z]{1,6}\d+$")   # K1, A12, WRICEF003: numbering, not vocabulary


def fold(word: str) -> str:
    """The word without Turkish diacritics, lower case: the comparison key."""
    return word.translate(_FOLD).lower()


def tokens(text: str):
    return WORD_RE.findall(text or "")


def lexicon(texts) -> dict:
    """What the sources spell. `names`: capitalised words (not abbreviations, not common
    words that are mostly written in lower case); `words`: every distinct word of 3-16
    letters, lower-cased and diacritic-folded, so "is this abbreviation in a source at all"
    has an answer."""
    caps: dict[str, int] = {}
    lower_fold: dict[str, int] = {}
    words: set[str] = set()
    for text in texts:
        for tok in tokens(text):
            if 3 <= len(tok) <= 16:
                words.add(fold(tok))
                words.add(tok.lower())
            if len(tok) < MIN_NAME or tok == tok.upper():
                continue
            if tok[0].isupper():
                caps[tok] = caps.get(tok, 0) + 1
            else:
                lower_fold[fold(tok)] = lower_fold.get(fold(tok), 0) + 1
    names = [tok for tok, n in caps.items() if lower_fold.get(fold(tok), 0) < 2 * n]
    return {"names": sorted(names), "words": sorted(words)}


def fix_names(text: str, lex: dict):
    """Put a name that differs from a source name only by diacritics back to the source's
    spelling. Returns (new_text, [{"from", "to", "count"}])."""
    names = set(lex.get("names") or [])
    by_fold: dict[str, set] = {}
    for n in names:
        by_fold.setdefault(fold(n), set()).add(n)
    fixes: dict[tuple, int] = {}

    def swap(m):
        tok = m.group(0)
        if tok in names or not tok[0].isupper() or tok == tok.upper() or len(tok) < MIN_NAME:
            return tok
        same = by_fold.get(fold(tok))
        if same and len(same) == 1:
            target = next(iter(same))
            fixes[(tok, target)] = fixes.get((tok, target), 0) + 1
            return target
        return tok

    new = WORD_RE.sub(swap, text or "")
    return new, [{"from": a, "to": b, "count": c} for (a, b), c in sorted(fixes.items())]


def new_terms(text: str, lex: dict):
    """Abbreviations and SAP words in the note that no source contains."""
    have = set(lex.get("words") or [])
    found: dict[str, int] = {}
    for tok in tokens(text):
        if (len(tok) >= 3 and tok == tok.upper() and not tok.isdigit() and tok not in ALLOWED_CAPS
                and not ID_RE.match(tok)):
            if tok.lower() not in have and fold(tok) not in have:
                found[tok] = found.get(tok, 0) + 1
    low = (text or "").lower()
    for w in WATCH_WORDS:
        if w in low and w not in have and fold(w) not in have and not any(t.lower() == w for t in found):
            found[w] = found.get(w, 0) + low.count(w)
    return [{"term": t, "count": c} for t, c in sorted(found.items())]


_PARA_RE = re.compile(r"<w:p[ >].*?</w:p>", re.S)
_TEXT_RE = re.compile(r"<w:t[^>]*>([^<]*)</w:t>")
_IMG_RE = re.compile(r"<w:drawing|<w:pict|<v:imagedata")


def docx_images(path) -> dict:
    """The images of a .docx and what each follows: {"count": n, "items": [{"after": text}]}.
    Read straight from the package (no python-docx), so Kokpit can use it too. The caption is
    the nearest paragraph with text at or before the image; "" when the image opens the file."""
    out = {"count": 0, "items": []}
    try:
        with zipfile.ZipFile(str(path)) as z:
            xml = z.read("word/document.xml").decode("utf-8", "replace")
    except (OSError, KeyError, zipfile.BadZipFile):
        return out
    last = ""
    for para in _PARA_RE.findall(xml):
        text = "".join(_TEXT_RE.findall(para)).strip()
        n = len(_IMG_RE.findall(para))
        if text:
            last = text
        for _ in range(n):
            out["items"].append({"after": (text or last)[:80]})
    out["count"] = len(out["items"])
    return out


def _source_texts(bundle) -> list:
    texts = []
    for doc in bundle:
        texts += [p.get("text", "") for p in doc.get("paragraphs", [])]
        for t in doc.get("tables", []):
            for row in t:
                texts += [c for c in row if isinstance(c, str)]
    return texts


def _ascii(value) -> str:
    return json.dumps(value, ensure_ascii=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--extracted", required=True, type=Path, help="the JSON bundle of extract_sources.py")
    ap.add_argument("--note", required=True, type=Path, help="the note's Markdown (before rendering)")
    ap.add_argument("--fix", action="store_true", help="rewrite the note with the source spelling of names")
    ap.add_argument("--json", type=Path, help="also write the report here (UTF-8)")
    args = ap.parse_args()

    bundle = json.loads(args.extracted.read_text(encoding="utf-8"))
    lex = lexicon(_source_texts(bundle))
    note = args.note.read_text(encoding="utf-8")
    fixed_text, fixes = fix_names(note, lex)
    terms = new_terms(fixed_text, lex)
    images = {d["file"]: d["images"] for d in bundle if d.get("images", {}).get("count")}
    report = {"names_fixed": fixes, "terms_not_in_sources": terms, "images_not_read": images}
    if args.fix and fixes:
        args.note.write_text(fixed_text, encoding="utf-8")
    if args.json:
        args.json.write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    print("names put back to the source spelling: %d" % sum(f["count"] for f in fixes) +
          (" (applied)" if args.fix and fixes else " (not applied: use --fix)" if fixes else ""))
    for f in fixes:
        print("  %s -> %s x%d" % (_ascii(f["from"]), _ascii(f["to"]), f["count"]))
    print("terms in the note that no source contains: %d" % len(terms))
    for t in terms:
        print("  %s x%d  (remove it, or take the source's own words)" % (_ascii(t["term"]), t["count"]))
    n_img = sum(v["count"] for v in images.values())
    print("images in the sources whose content was not read: %d" % n_img)
    for name, v in images.items():
        print("  %s: %d" % (_ascii(name), v["count"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
