#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Delete a MODIFIABLE transport request the current user owns — with a double check.

DESTRUCTIVE. Two independent confirmations plus safety pre-checks are required:
  1. The transport must be MODIFIABLE (status D/L) and OWNED by the logon user
     (verified via E070). Released or foreign transports are refused.
  2. You must supply the transport number TWICE (--transport and --confirm, matching)
     AND pass --yes. Anything missing prints a preview and deletes nothing.

ADT_READONLY=true refuses the operation. SAP also refuses non-empty requests.

Usage:
    # Step 1 — preview (no deletion): shows owner/status/description
    python delete_transport.py --transport IEDK900123 --cwd /path/to/project

    # Step 2 — actually delete (double-confirm): number repeated + --yes
    python delete_transport.py --transport IEDK900123 --confirm IEDK900123 --yes --cwd /path/to/project
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
    parser = argparse.ArgumentParser(
        description='Delete a modifiable transport the current user owns (double-confirm).')
    parser.add_argument('--transport', required=True, help='Transport number to delete (e.g., IEDK900123).')
    parser.add_argument('--confirm', help='Repeat the SAME transport number to confirm deletion.')
    parser.add_argument('--yes', action='store_true', help='Required explicit go-ahead (with --confirm).')
    parser.add_argument('--cwd', help='Working directory containing .conn_adt')
    args = parser.parse_args()

    if args.cwd:
        set_explicit_working_dir(args.cwd)

    try:
        client = SAPClient()
    except Exception as e:
        print(f"[FAIL] Could not connect: {type(e).__name__}: {e}")
        return 1

    # force=True only when BOTH the repeated number and --yes are present (double check).
    force = bool(args.yes and args.confirm)
    result = client.delete_transport(
        transport=args.transport,
        confirm_transport=args.confirm,
        force=force,
    )

    details = result.get('details') or {}
    if details:
        print("-" * 60)
        print(f"  Transport : {details.get('number')}")
        print(f"  Owner     : {details.get('owner')}")
        print(f"  Status    : {details.get('status')}  (D/L = modifiable)")
        print(f"  Descript. : {details.get('description')}")
        print("-" * 60)

    if result.get('ok') and result.get('deleted'):
        print(f"[OK] {result.get('message')}")
        return 0

    err = result.get('error')
    if err == 'confirmation_required':
        print(f"[CONFIRM] {result.get('message')}")
        print(f"[INFO] {result.get('how_to_confirm')}")
        print(f"[INFO] Example: --transport {args.transport} --confirm {args.transport} --yes")
        return 2  # distinct exit code: nothing deleted, confirmation needed

    print(f"[FAIL] ({err}) {result.get('message')}")
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
