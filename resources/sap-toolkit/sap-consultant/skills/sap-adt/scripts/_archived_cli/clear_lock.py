#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check and clear a stale SAP enqueue lock on an ABAP object (ADT equivalent of SM12).

Use when a push/edit failed and left a lock behind, or when an object reports
"being edited" / write attempts return 500/423 because of a leftover lock.

What it does:
  1. Queries /sap/bc/adt/locks to see if the object is locked and by whom.
  2. If locked by the CURRENT user, clears it via a lock->unlock cycle
     (clear_enqueue_lock). This is safe and creates no transport entry.
  3. If locked by ANOTHER user, it does NOT force-release (ADT cannot safely do
     that) and tells you to use SM12 — releasing another user's lock can corrupt
     their in-flight edit.

Usage:
    python clear_lock.py --name ZCL_MY_CLASS --type class --cwd /path/to/project
    python clear_lock.py --name ZAI_CL_AI_CONFIG_DAO --type class --transport FIDK901580 --cwd C:/proj
    python clear_lock.py --name ZMY_PROG --type program --check-only --cwd /path/to/project
"""
import argparse
import sys
from pathlib import Path

# Force UTF-8 output on Windows (cp1252 console cannot render Unicode)
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from sap_adt_lib import set_explicit_working_dir
from sap_client import SAPClient
from object_types import get_object_url


def main():
    parser = argparse.ArgumentParser(
        description='Check and clear a stale SAP enqueue lock on an ABAP object (ADT SM12 equivalent)'
    )
    parser.add_argument('--name', required=True, help='Object name (e.g., ZCL_MY_CLASS)')
    parser.add_argument('--type', default='class',
                        help='Object type: class, interface, program, functiongroup, etc. (default: class)')
    parser.add_argument('--transport', help='Transport corrNr to pass during the clear cycle '
                                            '(optional; avoids CTS auto-creating a ghost transport)')
    parser.add_argument('--check-only', action='store_true',
                        help='Only report lock status; do not attempt to clear')
    parser.add_argument('--cwd', help='Working directory containing .conn_adt')
    args = parser.parse_args()

    if args.cwd:
        set_explicit_working_dir(args.cwd)

    try:
        client = SAPClient()
        adt = client.adt_client
        object_url = get_object_url(args.name, args.type)
        current_user = (adt.user or '').upper()

        print(f"\n{'=' * 60}")
        print(f"  Lock check: {args.name} ({args.type})")
        print(f"  Object URL: {object_url}")
        print(f"{'=' * 60}")

        status = adt.is_object_locked(object_url)
        if status is None:
            print("[WARNING] Could not determine lock status (lock query failed).")
            print("[INFO] The lock endpoint may be unavailable on this system. Use SM12 to inspect.")
            return 1

        if not status.get('locked'):
            print("[OK] Object is NOT locked. Nothing to clear.")
            return 0

        owner = (status.get('lock_owner') or 'unknown')
        print(f"[INFO] Object IS locked. Owner: {owner}")

        if args.check_only:
            print("[INFO] --check-only set; not clearing.")
            return 0

        owner_up = owner.upper()
        # Only clear the current user's own lock (or an unidentifiable one we can
        # acquire ourselves). Never force-release a clearly-foreign lock.
        if owner_up not in (current_user, 'UNKNOWN', ''):
            print(f"\n[STOP] Lock is held by another user ({owner}), not you ({current_user}).")
            print("[STOP] ADT will not force-release another user's lock — doing so can corrupt")
            print("       their in-flight edit. Release it via transaction SM12 (with their")
            print("       awareness), then retry your operation.")
            return 1

        print(f"\n[ACTION] Clearing your stale lock via lock->unlock cycle...")
        ok = adt.clear_enqueue_lock(object_url, transport=args.transport)

        # Verify
        after = adt.is_object_locked(object_url)
        still_locked = bool(after and after.get('locked'))

        if ok and not still_locked:
            print("[OK] Lock cleared — object is now free.")
            return 0
        elif not still_locked:
            print("[OK] Object is no longer locked.")
            return 0
        else:
            print("\n[FAIL] Lock could not be cleared via ADT.")
            print("[ACTION REQUIRED] Use transaction SM12 to delete the enqueue lock manually.")
            print("[ACTION REQUIRED] Do NOT tell the user the lock was cleared.")
            return 1

    except Exception as e:
        print("")
        print("=" * 60)
        print(f"[FAIL] CLEAR LOCK FAILED for {args.name}")
        print("=" * 60)
        print(f"[ERROR] {type(e).__name__}: {e}")
        print("[ACTION REQUIRED] Do NOT tell the user the lock was cleared.")
        print("[ACTION REQUIRED] Report this failure and suggest SM12 as a fallback.")
        print("=" * 60)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
