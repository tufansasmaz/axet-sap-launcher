#!/usr/bin/env python3
"""Inventory and transport tables for an as-built document, from evidence on disk.

WHY THIS EXISTS
  These three tables are arithmetic over data that has already been pulled from the
  system. Written by hand they are wrong the first time the document is edited, and
  the error is invisible: a total that does not match its own detail rows still
  looks like a table. In the project this discipline came from, four consecutive
  audit rounds were spent entirely in this layer -- totals that did not add up,
  objects missed, a transport column derived from a name prefix.

  So the agent pulls the evidence, saves it, and this script does the counting. The
  document is generated from files rather than from a conversation, which is also
  what makes a second run reproduce the first.

INPUT   <target>/veri/
  nesneler.json   REQUIRED. The object set, from adt_list_package or a TADIR read.
                  [{"type": "PROG", "name": "ZFI_REPORT_01", "text": "..."}]
                  Keys are matched case-insensitively, so the column names adt_sql
                  returns (OBJECT, OBJ_NAME) work unchanged.

  sahiplik.json   OPTIONAL. Ownership and development unit -- a human judgement, not
                  something the system knows.
                  {"ZFI_REPORT_01": {"du": "DU-01", "ownership": "O"}}
                  Anything missing defaults to O / (unassigned) and is listed in the
                  run summary so the gap is visible rather than silently filled.

  e071.json       OPTIONAL. Which request carries which object.
                  [{"trkorr": "NS4K900123", "object": "PROG", "obj_name": "ZFI_..."}]

  e070.json       OPTIONAL. Request headers.
                  [{"trkorr": "...", "trfunction": "K", "trstatus": "R",
                    "as4user": "...", "as4date": "20260115", "as4text": "..."}]

OUTPUT  <target>/uretilen/envanter.md   -- paste-ready markdown

USAGE
  py scripts/envanter.py as-built/ZFI000
  py scripts/envanter.py as-built/ZFI_REPORT_01 --title "ZFI_REPORT_01"
"""
from __future__ import annotations

import argparse
import collections
import json
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

# Ownership codes, in the order they are reported. Kept in one place because the
# summary columns, the detail column and the validation all have to agree, and the
# O/S mix-up is the most common single-character error in this document type.
OWNERSHIP = ("O", "S", "E", "X")
OWNERSHIP_LABEL = {
    "O": "Owned",
    "S": "Shared",
    "E": "External Z",
    "X": "SAP standard",
}

# Object types that carry no logic. They are inventory rows like any other, but the
# volume-split decision counts narrative, not rows -- so the run summary reports
# both numbers and the writer does not have to work it out by eye.
NON_NARRATIVE = {"DTEL", "DOMA", "TTYP", "TABL/S", "SHLP", "ENQU"}


def _pick(row: dict, *names: str, default: str = "") -> str:
    """Read a value whatever case the key arrived in.

    adt_sql hands back SQL column names (OBJ_NAME); a hand-written file uses
    lowercase. Both are legitimate and neither should require the writer to
    rename keys before running this.
    """
    lowered = {str(k).lower(): v for k, v in row.items()}
    for n in names:
        v = lowered.get(n.lower())
        if v not in (None, ""):
            return str(v).strip()
    return default


def load(path: Path, required: bool = False):
    if not path.exists():
        if required:
            raise SystemExit(f"eksik dosya: {path}")
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise SystemExit(f"bozuk JSON: {path} -- {e}") from None
    # adt_sql wraps rows; accept either the list or the wrapper.
    if isinstance(data, dict):
        for key in ("rows", "data", "result", "objects"):
            if isinstance(data.get(key), list):
                return data[key]
        return data
    return data


def collect(veri: Path) -> tuple[list[dict], dict, list[dict], list[dict]]:
    objects = load(veri / "nesneler.json", required=True)
    if not objects:
        raise SystemExit("nesneler.json bos -- kapsam cozumlemesi eksik")
    ownership = load(veri / "sahiplik.json")
    if isinstance(ownership, list):        # tolerate a list of {name, du, ownership}
        ownership = {_pick(r, "name", "obj_name"): r for r in ownership}
    return objects, ownership or {}, load(veri / "e071.json"), load(veri / "e070.json")


def normalise(objects: list[dict], ownership: dict) -> tuple[list[dict], list[str]]:
    rows, seen, dupes = [], set(), []
    for o in objects:
        name = _pick(o, "name", "obj_name", "objname")
        typ = _pick(o, "type", "object", "objtype")
        if not name:
            continue
        key = (typ, name)
        if key in seen:
            dupes.append(f"{typ} {name}")
            continue
        seen.add(key)
        own = ownership.get(name, {})
        code = str(_pick(own, "ownership", "own", default="O")).upper()[:1] or "O"
        if code not in OWNERSHIP:
            code = "O"
        rows.append({
            "type": typ or "?",
            "name": name,
            "text": _pick(o, "text", "description", "ddtext", "obj_text"),
            "own": code,
            "du": _pick(own, "du", "unit", default=""),
        })
    rows.sort(key=lambda r: (r["type"], r["name"]))
    return rows, dupes


def transport_index(e071: list[dict]) -> dict:
    """object name -> the requests carrying it, in the order they were read."""
    idx = collections.defaultdict(list)
    for r in e071:
        name = _pick(r, "obj_name", "name")
        trk = _pick(r, "trkorr", "request")
        if name and trk and trk not in idx[name]:
            idx[name].append(trk)
    return idx


def table(headers: list[str], rows: list[list[str]], align: str = "") -> str:
    sep = []
    for i in range(len(headers)):
        c = align[i] if i < len(align) else "l"
        sep.append({"l": "---", "c": ":-:", "r": "---:"}[c])
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join(sep) + "|"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out)


def summary_table(rows: list[dict]) -> str:
    per = collections.defaultdict(lambda: collections.Counter())
    for r in rows:
        per[r["type"]][r["own"]] += 1
    body = []
    totals = collections.Counter()
    for typ in sorted(per):
        counts = per[typ]
        body.append([typ] + [str(counts[c]) if counts[c] else "-" for c in OWNERSHIP]
                    + [str(sum(counts.values()))])
        totals.update(counts)
    body.append(["**TOTAL**"] + [f"**{totals[c]}**" if totals[c] else "-"
                                 for c in OWNERSHIP] + [f"**{sum(totals.values())}**"])
    return table(["Type"] + list(OWNERSHIP) + ["Total"], body, "lccccr")


def detail_table(rows: list[dict], tidx: dict) -> str:
    body = []
    for r in rows:
        reqs = ", ".join(tidx.get(r["name"], [])) or "-"
        body.append([r["type"], f"`{r['name']}`", r["own"], r["du"] or "-",
                     r["text"] or "-", reqs])
    return table(["Type", "Name", "Own.", "Unit", "Description", "Request"],
                 body, "llcclll")


def transport_table(e070: list[dict], carried: set) -> str:
    # Read out of DD07T on a live system (domains TRFUNCTION and TRSTATUS, English),
    # not written from memory. The first real run met TRFUNCTION 'F' -- a piece list
    # shipped by an SAP support package -- which a three-entry map printed as a bare
    # "F", and a document that renders a code where a word belongs is a document the
    # customer asks about. Fixed values are copied, never paraphrased; that rule is
    # in the standard for the document and it applies to the script that feeds it.
    kind = {
        "C": "Relocation of Objects Without Package Change",
        "D": "Piece List for Support Package",
        "E": "Relocation of complete package",
        "F": "Piece List",
        "G": "Piece List for CTS Project",
        "K": "Workbench Request",
        "L": "Deletion transport",
        "M": "Client Transport Request",
        "O": "Relocation of Objects with Package Change",
        "P": "Piece List for Upgrade",
        "Q": "Customizing Task",
        "R": "Repair",
        "S": "Development/Correction",
        "T": "Transport of Copies",
        "W": "Customizing Request",
        "X": "Unclassified Task",
        "Y": "Piece list for commit",
    }
    status = {
        "D": "Modifiable",
        "H": "On hold",
        "L": "Modifiable, Protected",
        "N": "Released (with import protection for repaired objects)",
        "O": "Release Started",
        "P": "Release preparation",
        "R": "Released",
    }
    body = []
    for r in sorted(e070, key=lambda x: _pick(x, "as4date")):
        trk = _pick(r, "trkorr", "request")
        if carried and trk not in carried:
            continue
        d = _pick(r, "as4date", "date")
        pretty = f"{d[6:8]}.{d[4:6]}.{d[0:4]}" if len(d) == 8 and d.isdigit() else d or "-"
        body.append([
            f"`{trk}`",
            kind.get(_pick(r, "trfunction", "type"), _pick(r, "trfunction") or "-"),
            pretty,
            _pick(r, "as4user", "owner") or "-",
            _pick(r, "as4text", "text") or "-",
            status.get(_pick(r, "trstatus", "status"), _pick(r, "trstatus") or "-"),
        ])
    if not body:
        return ("No transport request data was collected for this target. "
                "Read E070/E071 with `adt_sql` and save them under `veri/`, "
                "or close section 10.2 with a reason.")
    return table(["Request", "Type", "Date", "Owner", "Description", "Status"], body)


def build(target: Path, title: str) -> tuple:
    veri = target / "veri"
    objects, ownership, e071, e070 = collect(veri)
    rows, dupes = normalise(objects, ownership)
    tidx = transport_index(e071)
    carried = {t for lst in tidx.values() for t in lst}

    narrative = sum(1 for r in rows if r["type"] not in NON_NARRATIVE)
    units = sorted({r["du"] for r in rows if r["du"]})
    unassigned = [r["name"] for r in rows if not r["du"]]

    parts = [
        f"<!-- URETILDI: envanter.py -- {title} -- elle duzenlenmez, yeniden uret -->",
        "",
        "## 2.2 Object Inventory — Summary `[V]`",
        "",
        summary_table(rows),
        "",
        f"Ownership codes: " + " · ".join(f"`{c}` {OWNERSHIP_LABEL[c]}" for c in OWNERSHIP),
        "",
        "## 2.4 Object Inventory — Detail `[V]`",
        "",
        detail_table(rows, tidx),
        "",
        "## 10.2 Transport Requests `[V]`",
        "",
        transport_table(e070, carried),
        "",
        "---",
        "",
        "<!-- Bolum 1 ve 2.3 icin sayilar -- dokumana KOPYALANMAZ, kontrol icindir",
        f"   nesne toplam        : {len(rows)}",
        f"   anlati nesnesi      : {narrative}  (cilt karari bu sayiya bakar)",
        f"   gelistirme birimi   : {len(units)}  {', '.join(units) if units else '-'}",
        f"   tasima istegi       : {len(carried)}",
        "-->",
    ]
    return "\n".join(parts) + "\n", rows, dupes, unassigned, narrative, units


def main() -> int:
    ap = argparse.ArgumentParser(description="as-built envanter tablolari")
    ap.add_argument("target", help="as-built/<HEDEF> klasoru")
    ap.add_argument("--title", default="", help="hedefin adi (varsayilan: klasor adi)")
    a = ap.parse_args()

    target = Path(a.target)
    if not (target / "veri").is_dir():
        raise SystemExit(f"veri klasoru yok: {target / 'veri'}")

    md, rows, dupes, unassigned, narrative, units = build(target, a.title or target.name)
    out = target / "uretilen" / "envanter.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")

    print(f"yazildi: {out}")
    print(f"  nesne {len(rows)} (anlati {narrative}) - birim {len(units)}")
    if dupes:
        print(f"  ATLANDI, mukerrer {len(dupes)}: {', '.join(dupes[:5])}"
              + (" ..." if len(dupes) > 5 else ""))
    if unassigned:
        # Not an error: a Profile N document has one unit and does not assign one.
        # Reported because on a package it means the ownership pass is unfinished,
        # and an unfinished pass produces a detail table that looks complete.
        print(f"  birime atanmamis {len(unassigned)}: {', '.join(unassigned[:5])}"
              + (" ..." if len(unassigned) > 5 else ""))
    if narrative >= 50 or len(units) >= 8:
        print(f"  NOT: cilt esigi asildi (anlati {narrative}, birim {len(units)})"
              " -- standart bolum 2")
    return 0


if __name__ == "__main__":
    sys.exit(main())
