#!/usr/bin/env python3
"""Apply a plan's rename map to the extracted payloads and report what it did.

Stage 2 of a cross-system object transfer. No SAP connection: it reads plan.yaml
and payload/, writes out/, and produces three reports. Everything it needs was
saved by transfer_extract.py, so the transform can be re-run and reviewed without
touching the source system again.

    py transfer_rename.py --plan .transfer/zrea/plan.yaml

Writes, next to the plan:
    out/<TYPE>/<NEW_NAME>.<ext>   the transformed payloads
    reports/residue.md            source-prefix names that SURVIVED the rename
    reports/external.md           customer objects referenced but not transferred
    reports/changes.md            every replacement site, file and line
    reports/collisions.md         two objects proposing the same target name

Exit 0 = transform written (check residue.md before deploying).
Exit 2 = a collision was found; nothing was written.
ASCII output only (cp1252 console).
"""
from __future__ import annotations

import argparse
import re
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

try:
    import yaml
except ImportError:
    sys.exit("[FAIL] PyYAML is required:  py -m pip install pyyaml")

ZREF = re.compile(r"\b[ZY][A-Z0-9_]{2,29}\b")

# SAP's own include names for a function group: L<FG><suffix>. A word-boundary
# rename of the FUGR alone never reaches them -- in LZREA_FG01TOP the characters
# around the group name are word characters, so there is no boundary to match.
# They have to be enumerated. Suffix set carried over from the cross-migration
# module of the internal ADT app.
#   TOP global declarations   UXX FM signature registry   SAP reserved
#   T99 ABAP Unit wrapper     F.. subroutines             O.. PBO modules
#   I.. PAI modules           E.. events                  P.. local class impls
#   U.. one per function module
def fugr_include_suffixes() -> list[str]:
    out = ["TOP", "UXX", "SAP", "T99"]
    for i in range(1, 100):
        n = "%02d" % i
        out += ["F" + n, "O" + n, "I" + n, "E" + n, "P" + n, "U" + n]
    return out


def build_map(objs: list[dict], src_package: str = "", dst_package: str = "") -> dict[str, str]:
    """source name -> target name, for selected objects that actually change."""
    m = {}
    # The PACKAGE is a name too, and it travels inside the payloads: a service
    # binding carries adtcore:packageRef, and program headers name it. Measured on
    # the first clean run -- every remaining residue row was the source package.
    # The plan already knows both sides, so leaving this to a human to notice was
    # simply a gap.
    if src_package and dst_package and src_package.upper() != dst_package.upper():
        m[src_package.upper()] = dst_package.upper()
    # ...and so does every OTHER package an object was pulled in from. They are all
    # landing in one target package, so a packageRef still naming its old owner is
    # a reference to a package that does not exist on the far side. Mapping only
    # the plan's own source package left those behind.
    if dst_package:
        for o in objs:
            owner = str(o.get("from_package") or "").upper()
            if owner and owner != dst_package.upper():
                m.setdefault(owner, dst_package.upper())
    # EVERY object in the plan is mapped, selected or not. `select` decides whether
    # the OBJECT travels; it says nothing about whether REFERENCES to it should be
    # repointed. An object already present on the target is deselected (rightly --
    # nobody wants it silently overwritten), and a transferred program that still
    # calls it by its SOURCE name is broken. Keying the map off `select` produced
    # exactly that: ten residue rows, every one a reference to an object already
    # sitting on the target under its new name.
    #
    # `via: skip` rows carry no usable target name and are excluded -- there is
    # nothing to rename them to.
    for o in objs:
        src, dst = str(o["from"]).upper(), str(o.get("to") or "").upper()
        if dst and dst != "-" and src != dst:
            m[src] = dst
        # Function modules are carried by their group rather than being plan rows,
        # but their names still travel and still have to be repointed everywhere
        # they are CALLed -- including from objects outside the group.
        for fm in ((o.get("opts") or {}).get("function_modules") or []):
            a, b = str(fm.get("from", "")).upper(), str(fm.get("to", "")).upper()
            if a and b and a != b:
                m[a] = b

    # Derive the function group's include names. Never clobber an explicit entry:
    # a human who renamed one include by hand meant it.
    for o in objs:
        if o.get("type") != "FUGR":
            continue
        src, dst = str(o["from"]).upper(), str(o.get("to") or "").upper()
        if src == dst:
            continue
        for suf in fugr_include_suffixes():
            m.setdefault("L" + src + suf, "L" + dst + suf)
    return m


def apply_map(text: str, mapping: dict[str, str]) -> tuple[str, list[tuple[int, str, str]]]:
    """Rename every mapped token. Returns the new text and the sites touched.

    Longest name first: overlapping names must not be half-replaced by a shorter
    entry that happens to be a prefix of a longer one.

    Replacement runs inside string literals too, and that is deliberate --
    CALL FUNCTION 'Z_OLD', SUBMIT ZOLD and dynamic CREATE OBJECT all carry object
    names as text, and a migration that skipped them would ship code pointing back
    at the source system. Every site is reported so the breadth stays reviewable
    rather than silent.
    """
    sites: list[tuple[int, str, str]] = []
    lines = text.splitlines(keepends=True)
    names = sorted(mapping, key=len, reverse=True)
    patterns = [(n, re.compile(r"\b%s\b" % re.escape(n), re.IGNORECASE)) for n in names]

    out_lines = []
    for idx, line in enumerate(lines, start=1):
        new = line
        for name, pat in patterns:
            if pat.search(new):
                new = pat.sub(mapping[name], new)
                sites.append((idx, name, mapping[name]))
        out_lines.append(new)
    return "".join(out_lines), sites


def md_table(rows: list[list[str]], head: list[str]) -> list[str]:
    out = ["| " + " | ".join(head) + " |",
           "|" + "|".join(["---"] * len(head)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plan", required=True)
    args = ap.parse_args()

    plan_path = Path(args.plan).resolve()
    base = plan_path.parent
    plan = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
    objs = plan.get("objects") or []
    prefix_from = ((plan.get("naming") or {}).get("rule") or {}).get("prefix", {}).get("from", "")
    prefix_from = (prefix_from or "").upper()

    print("=" * 66)
    print("RENAME  %s" % plan_path)
    print("=" * 66)

    # --- collisions first: nothing is written if two objects want one name ---
    by_target: dict[tuple[str, str], list[str]] = {}
    for o in objs:
        if not o.get("select"):
            continue
        by_target.setdefault((o["type"], str(o["to"]).upper()), []).append(str(o["from"]).upper())
    collisions = {k: v for k, v in by_target.items() if len(v) > 1}

    reports = base / "reports"
    reports.mkdir(parents=True, exist_ok=True)

    if collisions:
        rows = [[t, n, ", ".join(sorted(srcs))] for (t, n), srcs in sorted(collisions.items())]
        (reports / "collisions.md").write_text(
            "\n".join(["# Name collisions", "",
                       "Two or more selected objects propose the SAME target name and type.",
                       "Nothing was transformed. Fix the names in plan.yaml and re-run.", ""]
                      + md_table(rows, ["type", "target name", "sources"])) + "\n",
            encoding="utf-8")
        print("  [BLOCKED] %d collision(s) -> reports/collisions.md" % len(collisions))
        sys.exit(2)

    mapping = build_map(objs,
                        (plan.get("source") or {}).get("package", ""),
                        (plan.get("target") or {}).get("package", ""))
    print("  map      %d entries (%d explicit, rest derived FUGR includes)"
          % (len(mapping), sum(1 for o in objs if o.get("select")
                               and str(o["from"]).upper() != str(o["to"]).upper())))

    mapped_names = set(mapping)
    all_sources = {str(o["from"]).upper() for o in objs}
    for o in objs:
        for fm in ((o.get("opts") or {}).get("function_modules") or []):
            all_sources.add(str(fm["from"]).upper())
    out_dir = base / "out"
    residue_rows, external, change_rows = [], {}, []
    written = 0

    # A group's modules are transformed alongside it: same map, same reports, and
    # the deploy finds them at out/FUNC/<new name>.src.
    fm_pairs = []
    for o in objs:
        if not o.get("select"):
            continue
        for fm in ((o.get("opts") or {}).get("function_modules") or []):
            fm_pairs.append((str(fm["from"]).upper(), str(fm["to"]).upper()))

    for src_fm, dst_fm in fm_pairs:
        f = base / "payload" / "FUNC" / (src_fm + ".src")
        if not f.is_file():
            continue
        text = f.read_text(encoding="utf-8")
        new_text, sites = apply_map(text, mapping)
        dst = out_dir / "FUNC" / (dst_fm + ".src")
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(new_text, encoding="utf-8")
        written += 1
        for line_no, old, new in sites:
            change_rows.append([dst_fm, "%s:%d" % (dst.name, line_no), old, new])

        # Scanned like any other payload. An earlier version transformed function
        # modules but left them OUT of the residue scan, and the report said
        # "clean" while a module still referenced a table type from another
        # package -- the transfer then failed at activation with "Type ... is
        # unknown". A safety net with a hole in it is worse than none, because it
        # is believed.
        scan_fm = re.sub(r"<atom:link[^>]*/?>", "", new_text)
        for line_no, line in enumerate(scan_fm.splitlines(), start=1):
            for ref in ZREF.findall(line.upper()):
                if ref in mapping.values() or ref == dst_fm:
                    continue
                if prefix_from and ref.startswith(prefix_from):
                    residue_rows.append([dst_fm, "%s:%d" % (dst.name, line_no), ref])
                elif ref not in all_sources and "_" in ref:
                    external.setdefault(ref, set()).add(dst_fm)

    for o in objs:
        if not o.get("select") or not o.get("payload"):
            continue
        src_file = base / o["payload"]
        if not src_file.is_file():
            print("  [WARN] payload missing for %s" % o["from"])
            continue
        text = src_file.read_text(encoding="utf-8")
        new_text, sites = apply_map(text, mapping)

        dst = out_dir / o["type"] / (str(o["to"]).upper() + src_file.suffix)
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(new_text, encoding="utf-8")
        written += 1

        for line_no, old, new in sites:
            change_rows.append([o["to"], "%s:%d" % (dst.name, line_no), old, new])

        # What is still pointing at the source system after the transform?
        #
        # atom:link elements are stripped first. They are SAP's own navigation URLs
        # in the READ representation -- a message class carries one long-text link
        # per message, spelling the class name and the number as a single token
        # (.../object_name/ZGNL_PP_001000). Nothing in them is written back, and
        # leaving them in produced nine false residue rows for one message class:
        # a residue report that cries wolf is a residue report nobody reads.
        scan_text = re.sub(r"<atom:link\b[^>]*/?>", "", new_text)
        for line_no, line in enumerate(scan_text.splitlines(), start=1):
            for ref in ZREF.findall(line.upper()):
                if ref in mapping.values() or ref == str(o["to"]).upper():
                    continue
                if prefix_from and ref.startswith(prefix_from):
                    # Anchored on the source prefix, so this list stays precise.
                    # It is the dangerous one; precision matters more than brevity.
                    residue_rows.append([o["to"], "%s:%d" % (dst.name, line_no), ref])
                elif ref not in all_sources and "_" in ref:
                    # The underscore is a HEURISTIC and the report says so. Without
                    # it, uppercase Turkish words in comments and text elements
                    # (YAKALAMA, YAZILDI, YOK) match the Z/Y pattern and bury the
                    # real references -- measured on the first run. External refs
                    # are informational, so a missed exotic name costs less than a
                    # list nobody reads.
                    external.setdefault(ref, set()).add(str(o["to"]).upper())

    # --- reports ---
    (reports / "residue.md").write_text("\n".join(
        ["# Residue - source names that survived the rename", "",
         "Every name here still carries the SOURCE prefix `%s` after the transform."
         % (prefix_from or "(none set)"), "",
         "This is the dangerous list. A name in it means the migrated object still",
         "points at something in the source system: either it belongs in the transfer",
         "and is missing from the plan, or the reference has to be repointed by hand.",
         "An empty table here is the result you want.", ""]
        + (md_table(sorted(residue_rows), ["object", "site", "surviving name"])
           if residue_rows else ["_No source-prefix names survived. Clean._"])) + "\n",
        encoding="utf-8")

    ext_rows = [[ref, ", ".join(sorted(users))] for ref, users in sorted(external.items())]
    (reports / "external.md").write_text("\n".join(
        ["# External references - must already exist on the target", "",
         "Customer objects the transferred code references but that are NOT part of",
         "this transfer. They are not errors: shared utilities, global classes and",
         "central tables are meant to live outside a delivery.",
         "",
         "They are, however, the list nobody produces today. If one of these is",
         "missing on the target, the transfer activates and then fails at runtime.",
         "Check them before deploying.",
         "",
         "_Heuristic: only names containing an underscore are listed. Uppercase",
         "words in comments and text elements match the Z/Y pattern too, and an",
         "unfiltered list is long enough that nobody reads it. A customer object",
         "without an underscore will be missed here -- residue.md is the precise one._",
         ""]
        + (md_table(ext_rows, ["referenced object", "used by"])
           if ext_rows else ["_No external customer references._"])) + "\n",
        encoding="utf-8")

    (reports / "changes.md").write_text("\n".join(
        ["# Every replacement site", "",
         "One row per (line, name) touched, string literals included. This is the",
         "breadth of the transform made reviewable -- scan it for anything renamed",
         "that should not have been.", "",
         "%d replacements across %d objects." % (len(change_rows), written), ""]
        + md_table(change_rows, ["object", "site", "from", "to"])) + "\n",
        encoding="utf-8")

    print("  written  %d objects -> out/" % written)
    print("  changes  %d replacement sites" % len(change_rows))
    print()
    if residue_rows:
        print("  [ATTENTION] %d surviving source-prefix name(s) -> reports/residue.md"
              % len(residue_rows))
    else:
        print("  residue  clean - no source-prefix name survived")
    print("  external %d object(s) must already exist on the target"
          " -> reports/external.md" % len(ext_rows))
    print()
    print("  NEXT: read reports/residue.md. Nothing has been deployed.")


if __name__ == "__main__":
    main()
