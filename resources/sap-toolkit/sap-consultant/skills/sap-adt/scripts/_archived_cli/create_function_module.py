#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Create function module within a function group in SAP.

Note: Function module parameters (IMPORTING, EXPORTING, CHANGING, TABLES, EXCEPTIONS)
cannot be added via ADT API. Use SAP GUI (SE37/SE80) to add parameters after creation.

Usage:
    python create_function_module.py --name ZAI_GET_CUSTOMER --function-group ZAI_FG_CUSTOMER --description "Get Customer Data" --transport TRXXXXX --cwd /path/to/project
"""
import argparse
import sys
from pathlib import Path

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add scripts directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from sap_adt_lib import set_explicit_working_dir
from sap_client import SAPClient


def main():
    parser = argparse.ArgumentParser(
        description='Create function module within a function group in SAP'
    )
    parser.add_argument('--name', required=True,
                       help='Function module name (e.g., ZAI_GET_CUSTOMER)')
    parser.add_argument('--function-group', required=True,
                       help='Parent function group name (e.g., ZAI_FG_CUSTOMER) - must exist first')
    parser.add_argument('--description', required=True,
                       help='Function module description')
    parser.add_argument('--transport',
                       help='Transport request number (e.g., TRXXXXXX)')
    parser.add_argument('--cwd', help='Working directory containing .conn_adt')
    args = parser.parse_args()

    if args.cwd:
        set_explicit_working_dir(args.cwd)

    if not args.transport:
        print("[FAIL] --transport is required.")
        print("[INFO] You MUST run list_transports.py --modifiable-only and ASK the user which transport to use.")
        print("[INFO] NEVER assume, fabricate, or reuse a transport number from memory.")
        return 1

    try:
        client = SAPClient()
        result = client.create_function_module(
            name=args.name,
            function_group=args.function_group,
            description=args.description,
            transport=args.transport
        )
    except Exception as e:
        print("")
        print("=" * 60)
        print(f"[FAIL] CREATE FUNCTION MODULE FAILED - {args.name} was NOT created in SAP")
        print("=" * 60)
        print(f"[ERROR] {type(e).__name__}: {e}")
        print("")
        print("[ACTION REQUIRED] Do NOT tell the user this operation succeeded.")
        print("[ACTION REQUIRED] Report this failure to the user and ask how to proceed.")
        print("=" * 60)
        return 1

    if result:
        print(f"[OK] Function module created successfully: {args.name}")
        print(f"[INFO] Function module shell created WITHOUT parameters")
        print(f"[INFO] IMPORTANT:")
        print(f"[INFO] 1. Add parameters via SAP GUI (SE37/SE80)")
        print(f"[INFO] 2. Activate function group and function module before use")
        return 0
    else:
        print("")
        print("=" * 60)
        print(f"[FAIL] CREATE FUNCTION MODULE FAILED - {args.name} was NOT created in SAP")
        print("=" * 60)
        print("")
        print("[ACTION REQUIRED] Do NOT tell the user this operation succeeded.")
        print("[ACTION REQUIRED] Report this failure to the user and ask how to proceed.")
        print("=" * 60)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
