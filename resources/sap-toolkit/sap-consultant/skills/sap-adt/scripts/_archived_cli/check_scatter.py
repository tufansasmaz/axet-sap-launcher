#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check whether a class's CTS includes are scattered across multiple transports.

Read-only. A class pool's includes (CLSD/CPUB/CPRO/CPRI + per-method METH) can end up
recorded in different transport requests — that's the "scattered transport" problem. This
scans the transport-organizer tree for every entry belonging to the class and reports
which requests hold them. If more than one MODIFIABLE request holds the class, a push will
fragment it further; consolidate first (SE09 'Include Objects', or move the LIMU entries).

Usage:
    python check_scatter.py --object ZAI_CL_FOO --cwd /path/to/project
"""
import argparse
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from sap_adt_lib import set_explicit_working_dir
from sap_client import SAPClient


def main():
    parser = argparse.ArgumentParser(description="Check a class's transport scatter (read-only).")
    parser.add_argument('--object', required=True, help='Class name (e.g., ZAI_CL_FOO).')
    parser.add_argument('--cwd', help='Working directory containing .conn_adt')
    args = parser.parse_args()

    if args.cwd:
        set_explicit_working_dir(args.cwd)

    try:
        client = SAPClient()
    except Exception as e:
        print(f"[FAIL] Could not connect: {type(e).__name__}: {e}")
        return 1

    res = client.check_object_scatter(args.object)
    requests = res.get('requests', {})

    if not requests:
        print(f"[OK] {args.object}: not found in any modifiable or recent-released transport.")
        return 0

    print(f"Transports holding {args.object} (and its includes):")
    print("=" * 70)
    for num, r in requests.items():
        kinds = ", ".join(sorted({o['type'] for o in r['objects']}))
        print(f"  {num} [{r.get('status')}] owner={r.get('owner')}"
              f"  — {len(r['objects'])} entries: {kinds}")
    print("=" * 70)

    if res.get('scattered'):
        print(f"[WARN] SCATTERED across modifiable requests: {res['modifiable_requests']}")
        print("[INFO] Consolidate before pushing: SE09 -> add the class as R3TR CLAS to one")
        print("[INFO] request (or move its LIMU entries), so the pool lives in a single transport.")
        return 2
    print(f"[OK] Not scattered — modifiable requests: {res['modifiable_requests'] or '(none)'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
