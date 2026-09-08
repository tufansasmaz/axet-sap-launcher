#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bootstrap_fm.py - one-time install of the screen-generator FM.

Creates the function group + function module, pushes the FM source (inline signature
+ body) and activates it, so generate_screen.py / adt_generate_screen can call it.

By default it installs into the LOCAL package $TMP (no transport) - a generator is a
per-system developer tool that does not need to travel between systems. Pass --package
and --transport to install into a transportable package instead.

NO manual step. The FM is created ALREADY Remote-Enabled by calling SAP's own
RPY_FUNCTIONMODULE_INSERT over SOAP-RFC — that FM ships remote-enabled on every system
and takes a REMOTE_CALL flag. ADT cannot set the flag (it rejects processingType as a
create attribute, 400 "Unexpected Case in Branch"), which is why this used to end in one
SE37 click per system. Measured on DS4 (S/4HANA 2023): TFDIR-FMODE = R right after the
call, with nobody touching SAP GUI.

Usage:
    python bootstrap_fm.py --cwd /path/to/project                 # $TMP, default names
    python bootstrap_fm.py --package ZNT --transport TRX --cwd .  # transportable
"""
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

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

_THIS = Path(__file__).resolve()
_SKILL_DIR = _THIS.parents[1]
_DEFAULT_SRC = _SKILL_DIR / 'bootstrap' / 'ZND_FM_SCREEN_GEN.func.abap'

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


RFC_NS = 'urn:sap-com:document:sap:rfc:functions'


def _create_fm_remote_enabled(adt, fm_name, fg_name, description, transport, is_local):
    """Create the function module with the Remote-Enabled flag ALREADY set.

    ADT cannot do this — it rejects processingType as a create attribute — which is why
    every install used to end with one manual SE37 click. SAP's own
    RPY_FUNCTIONMODULE_INSERT ships remote-enabled on every system and takes REMOTE_CALL,
    so the generator installs itself over the very channel it will later be called on.
    No bootstrap paradox: the FM we call to bootstrap is SAP's, not ours.

    Returns (ok: bool, message: str). An already-existing FM counts as ok — the source
    push that follows updates it.
    """
    from xml.sax.saxutils import escape
    params = [
        ('FUNCNAME', fm_name),
        ('FUNCTION_POOL', fg_name),
        ('REMOTE_CALL', 'X'),
        ('SHORT_TEXT', description[:70]),
        ('SUPPRESS_CORR_CHECK', 'X' if is_local else ''),
        ('CORRNUM', transport or ''),
    ]
    body = ''.join(f'      <{k}>{escape(str(v))}</{k}>\n' for k, v in params if v != '')
    envelope = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/" '
        f'xmlns:urn="{RFC_NS}">\n'
        '  <soap-env:Header/>\n'
        '  <soap-env:Body>\n'
        f'    <urn:RPY_FUNCTIONMODULE_INSERT>\n{body}'
        '    </urn:RPY_FUNCTIONMODULE_INSERT>\n'
        '  </soap-env:Body>\n'
        '</soap-env:Envelope>\n'
    )
    url = f"{adt.url.rstrip('/')}/sap/bc/soap/rfc?sap-client={adt.client}&sap-language=EN"
    try:
        r = adt.session.post(url, data=envelope.encode('utf-8'),
                             headers={'Content-Type': 'text/xml; charset=utf-8',
                                      'Accept': 'text/xml', 'SOAPAction': '""'}, timeout=90)
    except Exception as exc:
        return False, f"SOAP-RFC request failed: {type(exc).__name__}: {exc}"

    text = r.text or ''
    from html import unescape
    # Both tags matter: application faults put the readable reason in <message>, but
    # RPY raises classic ABAP exceptions (FUNCTION_ALREADY_EXISTS) as <faultstring>
    # with no <message> at all. Reading only the first made a re-install look like a
    # hard failure instead of a no-op.
    m = (re.search(r'<(?:\w+:)?message>(.*?)</(?:\w+:)?message>', text, re.DOTALL)
         or re.search(r'<(?:\w+:)?faultstring>(.*?)</(?:\w+:)?faultstring>', text, re.DOTALL))
    fault = unescape(m.group(1)).strip() if m else None
    if r.status_code < 400 and not fault:
        inc = re.search(r'<FUNCTION_INCLUDE>(.*?)</FUNCTION_INCLUDE>', text)
        return True, f"created Remote-Enabled (include {inc.group(1) if inc else '?'})"
    low = (fault or '').lower()
    if 'exist' in low or 'vorhanden' in low or 'mevcut' in low:
        return True, "already exists (source push will update it)"
    if '404' in str(r.status_code):
        return False, "/sap/bc/soap/rfc is not reachable — check SICF"
    return False, f"RPY_FUNCTIONMODULE_INSERT failed (HTTP {r.status_code}): {fault or text[:300]}"


def ensure_generator_fm(adt, fm_name, fg_name, source_file, description):
    """Install a generator FM into $TMP if it is missing. Returns (ok, message).

    Callers use this when a SOAP-RFC call comes back `fm_not_found`: the generator is a
    per-system developer tool, so the first use on a new system installs it instead of
    handing the consultant a setup errand. $TMP only — local, no transport, removable —
    and the caller must say out loud that it wrote to the system.

    Not gated on risk here: tier-3 skills never install into a customer-production
    workspace in the first place, so that gate already sits upstream in ntt-setup.
    """
    src = Path(source_file)
    if not src.is_file():
        return False, f"generator source not found: {src}"
    source = _retarget_function_name(src.read_text(encoding='utf-8'), fm_name)

    try:
        adt.create_function_group(name=fg_name, description=description,
                                  package_name='$TMP', transport=None)
    except Exception as exc:
        return False, f"function group {fg_name}: {type(exc).__name__}: {exc}"

    ok, msg = _create_fm_remote_enabled(adt, fm_name, fg_name, description, None, True)
    if not ok:
        return False, msg

    try:
        res = adt.set_function_module_source(name=fm_name, function_group=fg_name,
                                             source_code=source, transport=None,
                                             activate=True)
    except Exception as exc:
        return False, f"source push: {type(exc).__name__}: {exc}"
    if not res.get('success'):
        return False, f"source push/activation failed: {res.get('message')}"
    return True, f"installed {fm_name} in {fg_name} ($TMP, Remote-Enabled, activated)"


def main():
    parser = argparse.ArgumentParser(description='One-time install of the screen-generator FM.')
    parser.add_argument('--fm-name', default='ZND_FM_SCREEN_GEN', help='FM name (default ZND_FM_SCREEN_GEN).')
    parser.add_argument('--fg-name', default='ZND_FG_AUTO_GEN', help='Function group (default ZND_FG_AUTO_GEN).')
    parser.add_argument('--package', default='$TMP',
                        help="Package. Default '$TMP' (local, no transport). Use a Z package for transportable.")
    parser.add_argument('--transport', default=None,
                        help='Transport (required only for a non-$TMP package; NEVER fabricate - ask the user).')
    parser.add_argument('--source-file', default=str(_DEFAULT_SRC),
                        help='FM source file (default bundled ZND_FM_SCREEN_GEN.func.abap).')
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

    # 2) Function module, created ALREADY Remote-Enabled (see the helper's docstring)
    ok, msg = _create_fm_remote_enabled(adt, args.fm_name, args.fg_name,
                                        args.description, args.transport, is_local)
    print(f"[{'OK' if ok else 'FAIL'}] FM: {msg}")
    if not ok:
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
    print("  DONE - no manual step. The FM was created Remote-Enabled.")
    print(f"  Verify in TFDIR: {args.fm_name} must have FMODE = 'R'.")
    print("  Then test:")
    # This script installs whatever --source-file points at, so the caller to test with
    # depends on the FM, not on this script's home skill. Naming generate_screen.py
    # unconditionally sent adobe-gen users to the wrong tool.
    if 'ADOBE' in args.fm_name.upper():
        fmflag = "" if args.fm_name == 'ZND_FM_ADOBE_GEN' else f" --fm-name {args.fm_name}"
        print(f"    python generate_adobe.py --interface <ZIFNAME> --mode READ{fmflag} --cwd <DIR>")
    else:
        fmflag = "" if args.fm_name == 'ZND_FM_SCREEN_GEN' else f" --fm-name {args.fm_name}"
        print(f"    python generate_screen.py --program <ZPROG> --dynpro 0100 --mode READ{fmflag} --cwd <DIR>")
    print("=" * 70)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
