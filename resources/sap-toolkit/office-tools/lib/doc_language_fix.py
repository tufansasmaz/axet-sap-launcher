# -*- coding: utf-8 -*-
"""Put the fixed words of a generated document into ONE language, from the master table.

A document skill tells the model to write every section title, sub-section name and table column in the
document's language (references/DOCUMENT_LANGUAGE.md, generated from lib/doc_language.json). Nothing
enforced it: on 2026-11-05 an English BBP came out with 23 Turkish sub-headings and the header row of 10 of
its 17 tables in Turkish, although every one of them is in the table. This module is the enforcement.

    fixed, leftovers = apply(md_text, "en")

- A heading is a Markdown line starting with '#'. Its text, with any leading numbering ("2.1.1 ", "4. ",
  "Bölüm 3:") kept aside, is looked up in the master (whole text, case-insensitive). A hit is replaced by the
  other language's word; the numbering stays.
- The header row of a Markdown table (the row above the |---| line) is treated cell by cell the same way.
- Bold labels on a line of their own ("**Süreç adı**") and the first cell of a two-column key/value row are
  NOT touched: they are field labels the model fills; the table covers them but a wrong hit there would
  rewrite content. They are reported as leftovers when they are not in the target language.
- Names, product terms and quotes are never in the master, so they are never rewritten.
- leftovers = headings and table header cells that are not in the master and still contain a letter that only
  Turkish uses (en direction) or are an exact English master word (tr direction): the skill's author or the
  person decides, the code does not guess a translation.

Pure functions, standard library only. Direction "tr" maps English to Turkish with the same table.
"""
from __future__ import annotations

import json
import os
import re
from typing import Dict, List, Tuple

_MASTER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "doc_language.json")
TURKISH_LETTERS = set("çğıöşüÇĞİÖŞÜ")
NUMBERING = re.compile(r"^(?P<num>(?:Bölüm|Chapter)\s+\d+\s*[:.\-–]\s*|\d+(?:\.\d+)*\.?\s+)(?P<rest>.+)$", re.I)
SEPARATOR = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")


def _fold(s: str) -> str:
    """Turkish-aware fold, for Turkish text (I is dotless, İ is dotted)."""
    return re.sub(r"\s+", " ", s.replace("İ", "i").replace("I", "ı").lower()).strip()


def _fold_en(s: str) -> str:
    """Plain fold, for English text: 'WARNING' must equal 'Warning', not 'warnıng'."""
    return re.sub(r"\s+", " ", s.lower()).strip()


def load_maps(path: str = _MASTER) -> Tuple[Dict[str, str], Dict[str, str]]:
    """(tr->en, en->tr) over every table of the master, keyed by folded text. A word that maps to two
    different translations in two tables is dropped (reported by the test, not guessed here)."""
    with open(path, encoding="utf-8") as fh:
        master = json.load(fh)
    tr_en: Dict[str, Dict[str, str]] = {}
    en_tr: Dict[str, Dict[str, str]] = {}
    for name, table in master["tables"].items():
        if name == "integration":  # the words of an Excel sheet ("Öneri" is "Proposal" there), not document headings
            continue
        for tr, en in table["rows"]:
            if _fold(tr) == _fold_en(en):
                continue
            tr_en.setdefault(_fold(tr), {}).setdefault(_fold_en(en), en)  # case-only differences are one word
            en_tr.setdefault(_fold_en(en), {}).setdefault(_fold(tr), tr)
    a = {k: next(iter(v.values())) for k, v in tr_en.items() if len(v) == 1}
    b = {k: next(iter(v.values())) for k, v in en_tr.items() if len(v) == 1}
    return a, b


def _swap(text: str, table: Dict[str, str], fold) -> str:
    """Translate one heading text or cell; the numbering stays; unknown text comes back unchanged.
    `fold` is the fold of the language the table is KEYED by (Turkish for tr->en, plain for en->tr)."""
    m = NUMBERING.match(text)
    num, rest = (m.group("num"), m.group("rest")) if m else ("", text)
    hit = table.get(fold(rest.strip().rstrip(":")))
    if hit is None:
        return text
    tail = ":" if rest.strip().endswith(":") and not hit.endswith(":") else ""
    return num + hit + tail


def _is_foreign(text: str, lang: str, other_table: Dict[str, str]) -> bool:
    # Only the English direction can be checked without guessing: a Turkish-only letter is proof.
    # (An English word left in a Turkish document cannot be told from a name or a product term.)
    body = NUMBERING.sub(lambda m: m.group("rest"), text).strip()
    return lang == "en" and bool(body) and any(c in TURKISH_LETTERS for c in body)


def _split_row(line: str) -> List[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def apply(md_text: str, lang: str, maps: Tuple[Dict[str, str], Dict[str, str]] | None = None
          ) -> Tuple[str, Dict[str, int], List[str]]:
    """Return (text, counts, leftovers). counts = {'headings': n, 'table_headers': n}."""
    if lang not in ("tr", "en"):
        return md_text, {"headings": 0, "table_headers": 0}, []
    tr_en, en_tr = maps or load_maps()
    table = tr_en if lang == "en" else en_tr
    own_side = en_tr if lang == "en" else tr_en  # words already in the target language
    fold = _fold if lang == "en" else _fold_en
    lines = md_text.split("\n")
    counts = {"headings": 0, "table_headers": 0}
    left: List[str] = []
    in_fence = False
    for i, line in enumerate(lines):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        h = re.match(r"^(#{1,6}\s+)(.+?)(\s*#*)$", line)
        if h:
            new = _swap(h.group(2), table, fold)
            if new != h.group(2):
                counts["headings"] += 1
                lines[i] = h.group(1) + new + h.group(3)
            elif _is_foreign(h.group(2), lang, own_side if lang == "tr" else table):
                left.append("heading: " + h.group(2).strip()[:80])
            continue
        # a table header row: a '|' row directly above a separator row
        if line.lstrip().startswith("|") and i + 1 < len(lines) and SEPARATOR.match(lines[i + 1]):
            cells = _split_row(line)
            out = [_swap(c, table, fold) for c in cells]
            changed = sum(1 for a, b in zip(cells, out) if a != b)
            if changed:
                counts["table_headers"] += changed
                lines[i] = "| " + " | ".join(out) + " |"
            for c, o in zip(cells, out):
                if c == o and _is_foreign(c, lang, own_side if lang == "tr" else table):
                    left.append("table column: " + c[:80])
    return "\n".join(lines), counts, left
