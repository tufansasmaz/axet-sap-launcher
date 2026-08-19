#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bootstrap_fm.py - one-time install of the screen-generator FM.

Creates the function group + function module, pushes the FM source (inline signature
+ body) and activates it, so generate_screen.py / adt_generate_screen can call it.

By default it installs into the LOCAL package $TMP (no transport) - a generator is a
per-system developer tool that does not need to travel between systems. Pass --package
and --transport to install into a transportable package instead.

ONE manual step remains and CANNOT be automated: RFC-enable the FM in SE37
(Attributes -> Processing Type = Remote-Enabled Module). ADT rejects processingType as
a create attribute (400 "Unexpected Case in Branch"). Until you do this, SOAP-RFC calls
fault with "Function module ... not found".

Usage:
    python bootstrap_fm.py --cwd /path/to/project                 # $TMP, default names
    python bootstrap_fm.py --package ZAI --transport TRX --cwd .  # transportable
"""
import argparse
import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

_THIS = Path(__file__).resolve()
_SKILL_DIR = _THIS.parents[1]
_DEFAULT_SRC = _SKILL_DIR / 'bootstrap' / 'ZAI_FM_SCREEN_GEN.func.abap'

_SAP_ADT_SCRIPTS = _THIS.parents[2] / 'sap-adt' / 'scripts'
if _SAP_ADT_SCRIPTS.is_dir():
    sys.path.insert(0, str(_SAP_ADT_SCRIPTS))

try:
    from sap_adt_lib import set_explicit_working_dir
    from sap_client import SAPClient
except ImportError as exc:
    print("[FAIL] Could not import the sap-adt engine.")
    print(f"[ERROR] {type(exc).__name__}: {exc}")
    print(f"[INFO] Expected sap-adt scripts at: {_SAP_ADT_SCRIPTS}")
    raise SystemExit(1)


def _retarget_function_name(source: str, fm_name: str) -> str:
    """Rewrite the leading `FUNCTION <name>` token so the source matches --fm-name."""
    return re.sub(r'(?im)^(\s*FUNCTION\s+)\w+', rf'\1{fm_name.lower()}', source, count=1)


def main():
    parser = argparse.ArgumentParser(description='One-time install of the screen-generator FM.')
    parser.add_argument('--fm-name', default='ZAI_FM_SCREEN_GEN', help='FM name (default ZAI_FM_SCREEN_GEN).')
    parser.add_argument('--fg-name', default='ZAI_FG_SCREEN_GEN', help='Function group (default ZAI_FG_SCREEN_GEN).')
    parser.add_argument('--package', default='$TMP',
                        help="Package. Default '$TMP' (local, no transport). Use a Z package for transportable.")
    parser.add_argument('--transport', default=None,
                        help='Transport (required only for a non-$TMP package; NEVER fabricate - ask the user).')
    parser.add_argument('--source-file', default=str(_DEFAULT_SRC),
                        help='FM source file (default bundled ZAI_FM_SCREEN_GEN.func.abap).')
    parser.add_argument('--description', default='Classic Dynpro screen + GUI status generator (RFC)',
                        help='FM/FG short text.')
    parser.add_argument('--no-activate', action='store_true', help='Skip activation after source push.')
    parser.add_argument('--cwd', help='Working directory containing .conn_adt')
    args = parser.parse_args()

    if args.cwd:
        set_explicit_working_dir(args.cwd)

    package = args.package
    is_local = package.upper() == '$TMP'
    if not is_local and not args.transport:
        print(f"[FAIL] Package '{package}' is transportable but no --transport given.")
        print("[INFO] Run list_transports.py --modifiable-only and ASK the user. Or use --package $TMP (local).")
        return 1

    src_path = Path(args.source_file)
    if not src_path.is_file():
        print(f"[FAIL] Source file not found: {src_path}")
        return 1
    source = src_path.read_text(encoding='utf-8')
    source = _retarget_function_name(source, args.fm_name)

    print("=" * 70)
    print(f"  Bootstrap screen-generator FM")
    print(f"  FG={args.fg_name}  FM={args.fm_name}  package={package}"
          + ("  (LOCAL / $TMP, no transport)" if is_local else f"  transport={args.transport}"))
    print("=" * 70)

    try:
        client = SAPClient()
        adt = client.adt_client
    except Exception as exc:
        print("[FAIL] Could not establish SAP connection.")
        print(f"[ERROR] {type(exc).__name__}: {exc}")
        return 1

    # 1) Function group (idempotent)
    try:
        fg = adt.create_function_group(name=args.fg_name, description=args.description,
                                       package_name=package, transport=args.transport)
        print(f"[OK] FG: {fg.get('message')}")
    except Exception as exc:
        print(f"[FAIL] Function group creation failed: {type(exc).__name__}: {exc}")
        return 1

    # 2) Function module shell (idempotent; local for $TMP)
    try:
        fm = adt.create_function_module(name=args.fm_name, function_group=args.fg_name,
                                        description=args.description,
                                        transport=args.transport, local=is_local)
        print(f"[OK] FM: {fm.get('message')}")
    except Exception as exc:
        print(f"[FAIL] Function module creation failed: {type(exc).__name__}: {exc}")
        return 1

    # 3) Push full source (inline signature + body) + activate
    try:
        res = adt.set_function_module_source(
            name=args.fm_name, function_group=args.fg_name, source_code=source,
            transport=args.transport, activate=not args.no_activate)
    except Exception as exc:
        print(f"[FAIL] FM source push failed: {type(exc).__name__}: {exc}")
        return 1

    if not res.get('success'):
        print(f"[FAIL] FM source push/activation reported failure: {res.get('message')}")
        act = res.get('activation')
        if act:
            print(f"[INFO] activation: {act}")
        return 1

    print(f"[OK] FM source pushed.")
    act = res.get('activation')
    if act is not None:
        ok = act.get('success') if isinstance(act, dict) else bool(act)
        print(f"[{'OK' if ok else 'WARN'}] activation: {act}")

    print("")
    print("=" * 70)
    print("  NEXT (MANUAL, required) - RFC-enable the FM:")
    print(f"    SE37 -> {args.fm_name} -> Attributes -> Processing Type =")
    print("    'Remote-Enabled Module' -> Save + Activate.")
    print("  (ADT cannot set this; SOAP-RFC will fault until it is done.)")
    print("  Then test:")
    fmflag = "" if args.fm_name == 'ZAI_FM_SCREEN_GEN' else f" --fm-name {args.fm_name}"
    print(f"    python generate_screen.py --program <ZPROG> --dynpro 0100 --mode READ{fmflag} --cwd <DIR>")
    print("=" * 70)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
