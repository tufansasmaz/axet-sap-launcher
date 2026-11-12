#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mechanical check of a dev-walkthrough document. Reads files; writes nothing.

    py check_walkthrough.py anlatim.md --evidence veri/nesneler.json [--ts ts.md] [--allow ZQM016 ...]
    py check_walkthrough.py anlatim.md --ts-only --ts ts.md

Two things a model gets wrong without noticing:

  sections  a required section is missing (the Turkish or the English heading set, one per
            document; --ts-only needs only four of the seven).
  names     a Z/Y object name in the text that is NOT in the evidence (the object list the
            agent saved from the system), the TS, or --allow. This is the commonest fault in
            a walkthrough: a plausible name nobody ever created.

Evidence file: a JSON list of objects, `[{"type": "PROG", "name": "ZFI_REPORT_01"}]`; the
keys `name`, `obj_name` and `object_name` are all accepted, any case.

Exit: 0 clean | 1 at least one finding | 2 not checked (file unreadable, or no name source was
given, so the names could not be compared -- never a pass).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

SECTIONS = {
    "tr": ["Ne yapar", "Akış", "Nesneler", "Veri", "Kararlar", "Revizyon rehberi", "Bilinmeyenler"],
    "en": ["What it does", "Flow", "Objects", "Data", "Decisions", "Revision guide", "Unknowns"],
}
TS_ONLY = {"tr": ["Ne yapar", "Akış", "Nesneler", "Bilinmeyenler"],
           "en": ["What it does", "Flow", "Objects", "Unknowns"]}
# A customer-namespace name: Z or Y, then at least three more of A-Z 0-9 _ (ZSD001, ZQM016_T_FAI_RSN).
# It must contain a digit or an underscore: upper-cased Turkish words (YAPAR, YENI, YAZILIR) start with
# Y or Z too and are not object names. A name made only of letters (ZTABLE) is therefore not seen.
NAME = re.compile(r"(?<![A-Za-z0-9_/])(?=[ZY][A-Z0-9_]*[0-9_])[ZY][A-Z0-9_]{3,}(?![A-Za-z0-9_/])")


def headings(text: str) -> set[str]:
    return {m.group(1).strip().lower() for m in re.finditer(r"^#{1,6}\s+(.+?)\s*$", text, re.M)}


def evidence_names(path: Path) -> set[str]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    out: set[str] = set()
    for row in data if isinstance(data, list) else []:
        if isinstance(row, dict):
            lowered = {str(k).lower(): v for k, v in row.items()}
            for key in ("name", "obj_name", "object_name"):
                if lowered.get(key):
                    out.add(str(lowered[key]).strip().upper())
    return out


def pick_language(found: set[str]) -> str:
    hits = {lang: sum(1 for s in names if s.lower() in found) for lang, names in SECTIONS.items()}
    return "en" if hits["en"] > hits["tr"] else "tr"


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Check a dev-walkthrough document.")
    ap.add_argument("doc")
    ap.add_argument("--evidence", help="JSON list of the objects read from the system")
    ap.add_argument("--ts", help="the TS text (md or txt): names it mentions are allowed")
    ap.add_argument("--allow", nargs="*", default=[], help="extra names that are fine (the package, a prefix)")
    ap.add_argument("--ts-only", action="store_true", help="situation A: nothing built yet")
    args = ap.parse_args(argv)

    try:
        text = Path(args.doc).read_text(encoding="utf-8-sig", errors="replace")
    except OSError as exc:
        print(f"NOT CHECKED: cannot read {args.doc}: {exc.strerror or exc}")
        return 2

    findings: list[str] = []
    found = headings(text)
    lang = pick_language(found)
    required = (TS_ONLY if args.ts_only else SECTIONS)[lang]
    for section in required:
        if section.lower() not in found:
            findings.append(f"section missing: '{section}'")

    allowed: set[str] = {a.strip().upper() for a in args.allow if a.strip()}
    sources = []
    if args.evidence:
        try:
            allowed |= evidence_names(Path(args.evidence))
            sources.append("evidence")
        except (OSError, ValueError) as exc:
            print(f"NOT CHECKED: cannot read evidence {args.evidence}: {exc}")
            return 2
    if args.ts:
        try:
            ts_text = Path(args.ts).read_text(encoding="utf-8-sig", errors="replace")
        except OSError as exc:
            print(f"NOT CHECKED: cannot read TS {args.ts}: {exc.strerror or exc}")
            return 2
        allowed |= set(NAME.findall(ts_text.upper()))
        sources.append("TS")
    if args.allow:
        sources.append("--allow")

    names_checked = bool(sources)
    if names_checked:
        # a package or prefix (ZQM016) is fine when real objects start with it (ZQM016_CL_X)
        known = lambda n: n in allowed or any(e.startswith(n + "_") for e in allowed)  # noqa: E731
        unknown = sorted({n for n in NAME.findall(text.upper()) if not known(n)})
        for n in unknown:
            findings.append(f"name not in {' / '.join(sources)}: {n}")

    for f in findings:
        print(f"FINDING  {f}")
    if findings:
        print(f"\n{len(findings)} finding(s). A name in the text must be one the system, the TS or --allow "
              f"gave; otherwise it is invented or misspelled.")
        return 1
    if not names_checked:
        print("Sections present. NOT CHECKED: object names (give --evidence, --ts or --allow).")
        return 2
    print(f"OK: {len(required)} sections present, every Z/Y name is in {' / '.join(sources)}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
