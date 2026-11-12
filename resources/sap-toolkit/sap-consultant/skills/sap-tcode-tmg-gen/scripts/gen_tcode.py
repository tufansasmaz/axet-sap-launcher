#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_tcode.py - create / delete a transaction code (SE93) through ZND_FM_TCODE_GEN.

    # report transaction
    python gen_tcode.py --cwd . --tcode ZPM_MP_REPROC --text "Reprocess measuring points" \
        --program ZPM_P_MPOINT_REPROCESS --package ZPM --transport XXXK926117
    # SM30 parameter transaction (maintenance view)
    python gen_tcode.py --cwd . --tcode ZPM_MP_SET --text "Measuring point settings" \
        --view ZPM_T_MP_MATKLS --package ZPM --transport XXXK926117
    # delete
    python gen_tcode.py --cwd . --tcode ZND_TEST_TC --delete --package '$TMP'

A transportable package needs --transport (ask the user; never invent one).
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from soap_rfc import call_rfc  # noqa: E402

FM = "ZND_FM_TCODE_GEN"


def main() -> int:
    for s in (sys.stdout, sys.stderr):
        s.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--cwd", default=".")
    ap.add_argument("--tcode", required=True)
    ap.add_argument("--text", default="")
    ap.add_argument("--program", help="report transaction: program name")
    ap.add_argument("--view", help="parameter transaction: SM30 maintenance view/table")
    ap.add_argument(
        "--display-only",
        action="store_true",
        help="SM30 in display mode (UPDATE blank)",
    )
    ap.add_argument("--package", default="$TMP")
    ap.add_argument("--transport", default="")
    ap.add_argument("--delete", action="store_true")
    a = ap.parse_args()

    if a.package.upper() != "$TMP" and not a.transport:
        print(
            f"[FAIL] package {a.package} is transportable: pass --transport (ask the user)."
        )
        return 1
    if not a.delete and not (a.program or a.view):
        print("[FAIL] give --program (report tcode) or --view (SM30 tcode).")
        return 1

    params = {
        "IV_ACTION": "DELETE" if a.delete else "CREATE",
        "IV_TCODE": a.tcode.upper(),
        "IV_TEXT": a.text,
        "IV_TYPE": "P" if a.view else "R",
        "IV_PROGRAM": a.program,
        "IV_VIEWNAME": a.view,
        "IV_UPDATE": "" if a.display_only else "X",
        "IV_DEVCLASS": a.package.upper(),
        "IV_TRANSPORT": a.transport,
    }
    res = call_rfc(a.cwd, FM, params)
    if not res["ok"]:
        print(f"[FAIL] HTTP {res['http']}: {res['fault'] or 'no response'}")
        if res["http"] == 500 and res["fault"] and "not" in res["fault"].lower():
            print(
                f"[INFO] {FM} may be missing: run bootstrap/{FM}.func.abap through screen-gen/scripts/bootstrap_fm.py"
            )
        return 1
    ok = res["out"].get("EV_OK") == "X"
    print(f"[{'OK' if ok else 'FAIL'}] {res['out'].get('EV_MESSAGE')}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
