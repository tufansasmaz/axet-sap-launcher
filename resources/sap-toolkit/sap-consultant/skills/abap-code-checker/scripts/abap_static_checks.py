#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Two OBJECT_GATES rows as deterministic checks on a source file saved to disk.

    py abap_static_checks.py <file> [<file> ...]

Point it at the source `adt_get_source` returned, saved as a file: a class
(`.clas.abap`, `.abap`, `.txt`) or a behavior definition (`.bdef`, `.asbdef`, or any
file whose text starts a `define behavior`). Each file is checked by what its text IS,
not by its name.

  CDS-AMDP-01  an apostrophe inside a SQLScript `--` comment in an AMDP body. HANA's
               parser reads it as the start of a string literal; the class passes the
               syntax check and ATC, and fails only at the first real activation with
               "Literals across more than one line are not allowed".
  RAP-BD-08    a managed behavior definition with create/update/delete but no
               `lock master`, or no `etag master` / `etag dependent`.

Exit: 0 nothing found · 1 at least one finding · 2 nothing could be checked (no file
was an AMDP class or a managed BDEF -- "not checked" is never "clean").

Adapted from Ozgur Yilmaz's axet-template (MIT): validators
check_amdp_comment_apostrophe.py and check_rap_managed_etag.py, helper
utils/kaynak_tarama.py (amdp_govde_araliklari, sqlscript_yorumu). Copyright (c) 2026
Ozgur Yilmaz, MIT licence -- full text in THIRD_PARTY_NOTICES.txt beside this file.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

ESCAPE = "#NO_AMDP_APOSTROPHE_CHECK"

# ---------------------------------------------------------------- AMDP ----
_AMDP_ANY = re.compile(r"BY\s+DATABASE\s+(?:PROCEDURE|FUNCTION)|LANGUAGE\s+SQLSCRIPT", re.I)
_AMDP_START = re.compile(r"BY\s+DATABASE\s+(?:PROCEDURE|FUNCTION)", re.I)
_AMDP_END = re.compile(r"^\s*ENDMETHOD\b", re.I)


def amdp_bodies(text: str) -> list[tuple[int, int]]:
    """[(first, last)] 1-based line ranges, both inclusive, of every AMDP body:
    from the `BY DATABASE PROCEDURE|FUNCTION` line to its ENDMETHOD. Inside, `--`
    is a SQLScript comment; outside it is ABAP, where `--` is no comment and an
    apostrophe in a `*` or `"` comment is legal."""
    ranges: list[tuple[int, int]] = []
    start: int | None = None
    lines = text.splitlines()
    for i, raw in enumerate(lines, 1):
        if start is None:
            if _AMDP_START.search(raw):
                start = i
        elif _AMDP_END.match(raw):
            ranges.append((start, i))
            start = None
    if start is not None:
        ranges.append((start, len(lines)))
    return ranges


def sqlscript_comment(raw: str) -> str | None:
    """The text after a `--` that starts a SQLScript comment on this line, or None.
    `--` inside a string literal ('a--b') is not a comment; '' is an escaped quote."""
    i, n, in_literal = 0, len(raw), False
    while i < n:
        ch = raw[i]
        if in_literal:
            if ch == "'":
                if i + 1 < n and raw[i + 1] == "'":
                    i += 2
                    continue
                in_literal = False
            i += 1
            continue
        if ch == "'":
            in_literal = True
        elif ch == "-" and i + 1 < n and raw[i + 1] == "-":
            return raw[i + 2:]
        i += 1
    return None


def check_amdp(text: str) -> list[tuple[int, str]]:
    findings = []
    bodies = amdp_bodies(text)
    for i, raw in enumerate(text.splitlines(), 1):
        if ESCAPE in raw or not any(a <= i <= b for a, b in bodies):
            continue
        comment = sqlscript_comment(raw)
        if comment is not None and "'" in comment:
            findings.append((i, raw.strip()[:120]))
    return findings


# ---------------------------------------------------------------- BDEF ----
_DEFINE_BEHAVIOR = re.compile(r"\bdefine\s+behavior\s+for\b", re.I)
_MANAGED = re.compile(r"^\s*managed\b", re.I | re.M)
_WRITE_OP = re.compile(r"^\s*(?:internal\s+)?(?:create|update|delete)\b", re.I | re.M)
_LOCK_MASTER = re.compile(r"\block\s+master\b", re.I)
_ETAG = re.compile(r"\betag\s+(?:master|dependent)\b", re.I)


def _strip_bdef_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.S)
    return "\n".join(line.split("//", 1)[0] for line in text.splitlines())


def check_bdef(text: str) -> list[tuple[int, str]]:
    code = _strip_bdef_comments(text)
    if not _WRITE_OP.search(code):
        return []
    findings = []
    if not _LOCK_MASTER.search(code):
        findings.append((0, "no `lock master` -- a managed BO that writes needs one on its "
                            "root (children: `lock dependent by _assoc`)"))
    if not _ETAG.search(code):
        findings.append((0, "no `etag master <field>` (children: `etag dependent by _assoc`) "
                            "-- optimistic locking is missing"))
    return findings


# ---------------------------------------------------------------- main ----
def kind_of(text: str) -> str:
    code = _strip_bdef_comments(text)
    if _DEFINE_BEHAVIOR.search(code):
        return "bdef-managed" if _MANAGED.search(code) else "bdef-other"
    if _AMDP_ANY.search(text):
        return "amdp"
    return "other"


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0 if argv else 2
    checked = 0
    total = 0
    for name in argv:
        path = Path(name)
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            print(f"NOT CHECKED  {name}: cannot read ({exc.strerror or exc})")
            continue
        kind = kind_of(text)
        if kind == "amdp":
            checked += 1
            rows = check_amdp(text)
            for line, snippet in rows:
                print(f"CDS-AMDP-01  {name}:{line}  apostrophe in a SQLScript `--` comment "
                      f"-> {snippet}")
            total += len(rows)
            if not rows:
                print(f"OK           {name}: AMDP comments carry no apostrophe")
        elif kind == "bdef-managed":
            checked += 1
            rows = check_bdef(text)
            for _, message in rows:
                print(f"RAP-BD-08    {name}: {message}")
            total += len(rows)
            if not rows:
                print(f"OK           {name}: managed BDEF has lock master and etag "
                      f"(or does not write)")
        else:
            reason = ("not a managed behavior definition" if kind == "bdef-other"
                      else "no AMDP body and no behavior definition")
            print(f"NOT CHECKED  {name}: {reason}")
    if total:
        print(f"\n{total} finding(s). Fix: rewrite the AMDP comment without an apostrophe "
              f"(or mark the line {ESCAPE} <reason>); add `lock master` / `etag master` "
              f"to the root behavior.")
        return 1
    if not checked:
        print("\nNothing was checked: record these files as not covered, not as passed.")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
