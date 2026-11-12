#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""seed_table.py - write TEST rows into a Z/Y customizing table via ZND_FM_TABLE_SEED.

    python seed_table.py --cwd . --table ZPM_T_MP_MATKL --rows "MATKL=J36060000|MATKL=J36060100"

Test data only (not transported). Real customizing goes through SM30 into a request.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from soap_rfc import call_rfc  # noqa: E402


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--cwd", default=".")
    ap.add_argument("--table", required=True)
    ap.add_argument(
        "--rows", required=True, help="FIELD=VALUE;FIELD=VALUE|FIELD=VALUE;..."
    )
    ap.add_argument("--delete-first", action="store_true")
    args = ap.parse_args()
    res = call_rfc(
        args.cwd,
        "ZND_FM_TABLE_SEED",
        {
            "IV_TABLE": args.table.upper(),
            "IV_ROWS": args.rows,
            "IV_DELETE_FIRST": "X" if args.delete_first else "",
        },
    )
    if not res["ok"]:
        print(f"[FAIL] HTTP {res['http']}: {res['fault']}")
        return 1
    ok = res["out"].get("EV_OK") == "X"
    print(f"[{'OK' if ok else 'FAIL'}] {res['out'].get('EV_MESSAGE')}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
