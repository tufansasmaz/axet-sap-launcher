#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_screen.py - Generate a classic Dynpro screen + GUI status + titlebar.

ADT CANNOT create Dynpro screens or GUI statuses directly. The proven workaround
is a one-time, RFC-enabled generator function module (default ZAI_FM_SCREEN_GEN) that
wraps RPY_DYNPRO_INSERT + RS_CUA_INTERNAL_* . Those FMs require a *dialog context*,
so the ADT classrun channel fails with 400 "Session Timed Out". This module calls
the generator over the SOAP-RFC channel (/sap/bc/soap/rfc), reusing the existing
SAPADTClient session (auth, SSL, sap-client) from the sap-adt skill.

Two entry points share one core:
  - generate_screen(adt, ...) -> structured dict  (importable; no stdout side-effects,
    safe for the stdio MCP server).
  - main()                    -> CLI wrapper that prints + returns an exit code.

PREREQUISITE: the generator FM (default ZAI_FM_SCREEN_GEN) must already exist AND be
flagged Remote-Enabled (SE37 -> Attributes -> Processing Type = Remote-Enabled
Module). See ../bootstrap/ and ../SKILL.md for the one-time install.

The generated names are DYNAMIC, derived from dynpro <n>:
    screen <n>, MODULE status_<n> / user_command_<n>, GUI status STAT<n>, title TIT<n>.
Your program's CALL SCREEN <n> + modules + SET PF-STATUS 'STAT<n>' + SET TITLEBAR
'TIT<n>' MUST use the same number.

Usage:
    python generate_screen.py --program ZAI_P_LIST --dynpro 0100 \
        --title "Liste" --screen-type DOCKING --transport TRXXXXXX --cwd /path/to/project
"""
import argparse
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

# Default generator FM name. The ABAP itself is NOT shipped under a fixed name —
# bootstrap/ZAI_FM_SCREEN_GEN.func.abap is a reference template you install under your
# own name. Override per call via fm_name / --fm-name / env ABAP_SCREEN_GEN_FM.
import os
DEFAULT_FM_NAME = os.getenv('ABAP_SCREEN_GEN_FM', 'ZAI_FM_SCREEN_GEN')
RFC_NS = 'urn:sap-com:document:sap:rfc:functions'


# ---------------------------------------------------------------------------
# Core (no stdout side-effects — safe to import from the MCP server)
# ---------------------------------------------------------------------------

def _build_envelope(fm_name, params):
    """Build a SOAP-RFC envelope. params: ordered list of (tag, value); empties dropped."""
    body = ''.join(
        f'      <{tag}>{escape(str(value))}</{tag}>\n'
        for tag, value in params
        if value is not None and value != ''
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/" '
        f'xmlns:urn="{RFC_NS}">\n'
        '  <soap-env:Header/>\n'
        '  <soap-env:Body>\n'
        f'    <urn:{fm_name}>\n'
        f'{body}'
        f'    </urn:{fm_name}>\n'
        '  </soap-env:Body>\n'
        '</soap-env:Envelope>\n'
    )


def _tag(text, name):
    """Namespace-tolerant single-tag extractor."""
    m = re.search(rf'<(?:\w+:)?{name}>(.*?)</(?:\w+:)?{name}>', text, re.DOTALL)
    return m.group(1).strip() if m else None


def _fault_message(text):
    """Best human-readable SOAP-RFC fault message.

    SAP returns app faults as HTTP 500 with a GENERIC <faultstring> ("Internal Server
    Error") and the real reason in <detail><rfc:Error><message>...</message>. Prefer the
    detail message; fall back to faultstring. Returns (message, type) or (None, None).
    """
    from html import unescape
    detail = _tag(text, 'message')
    fault = _tag(text, 'faultstring')
    rfc_type = _tag(text, 'type')
    raw = detail or fault
    return (unescape(raw).strip() if raw else None, rfc_type)


def generate_screen(adt, program, dynpro='0100', title='Liste', screen_type='DOCKING',
                    cc_name='CC_ALV', mode='WRITE', recreate=False, transport=None,
                    language=None, fm_name=None):
    """Call the generator FM over SOAP-RFC. Returns a structured dict.

    Args:
        adt: a SAPADTClient (SAPClient().adt_client) — provides .session/.url/.client/.language.
        program: target program (customer Z/Y namespace).
        dynpro: 4-digit screen number; drives all generated names.
        title: titlebar + dynpro description.
        screen_type: 'DOCKING' or 'CONTAINER'.
        cc_name: custom control name for CONTAINER.
        mode: 'WRITE' | 'READ' | 'DELETE'.
        recreate: delete + re-insert before write.
        transport: program's transport (never fabricate).
        language: sap-language for the call (defaults to connection language).
        fm_name: the installed generator FM name (defaults to DEFAULT_FM_NAME /
                 env ABAP_SCREEN_GEN_FM / 'ZAI_FM_SCREEN_GEN'). The ABAP is a
                 reference template — install it under whatever name your project uses.

    Returns: {ok, rc, ev_rc, ev_message, http_status, message, error?, transport_warning?}
    """
    fm_name = (fm_name or DEFAULT_FM_NAME).upper()
    prog = (program or '').upper()
    mode = (mode or 'WRITE').upper()
    screen_type = (screen_type or 'DOCKING').upper()

    if mode == 'WRITE' and not (prog.startswith('Z') or prog.startswith('Y') or prog.startswith('/')):
        return {"ok": False, "error": "guardrail_violation",
                "message": f"Refusing to generate a screen in non-customer program '{prog}'. "
                           "Target must be in the Z/Y customer namespace."}

    out = {}
    if mode == 'WRITE' and not transport:
        out["transport_warning"] = ("No transport supplied; will record against the program's "
                                     "open transport if any. Never fabricate a transport — "
                                     "list_transports + ask the user.")

    params = [
        ('IV_PROGRAM', prog),
        ('IV_DYNPRO', dynpro),
        ('IV_TRANSPORT', transport),
        ('IV_TITLE', title),
        ('IV_SCREEN_TYPE', screen_type),
        ('IV_CC_NAME', cc_name),
        ('IV_MODE', mode),
        ('IV_RECREATE', 'X' if recreate else ''),
    ]
    envelope = _build_envelope(fm_name, params)

    base_url = adt.url.rstrip('/')
    sap_client = adt.client
    lang = language or getattr(adt, 'language', None) or 'EN'
    url = f"{base_url}/sap/bc/soap/rfc?sap-client={sap_client}&sap-language={lang}"
    headers = {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml',
        'SOAPAction': '""',
    }
    timeout = getattr(adt, 'timeout_long', None) or getattr(adt, 'timeout_default', 60)

    try:
        resp = adt.session.post(url, data=envelope.encode('utf-8'), headers=headers, timeout=timeout)
    except Exception as exc:
        out.update({"ok": False, "error": "request_failed",
                    "message": f"SOAP-RFC request failed (transport-level): {type(exc).__name__}: {exc}"})
        return out

    text = resp.text or ''
    out["http_status"] = resp.status_code

    fault_msg, _ = _fault_message(text)
    if resp.status_code >= 400 or fault_msg:
        low = (fault_msg or '').lower()
        if 'not found' in low or 'not exist' in low or 'unknown function' in low:
            # The generator FM is not installed / not Remote-Enabled on this system.
            out.update({"ok": False, "error": "fm_not_found",
                        "message": (f"Generator FM '{fm_name}' not found on this system: {fault_msg} "
                                    "Do the one-time bootstrap (create + push + RFC-enable the FM — "
                                    "see SKILL.md), or pass fm_name/--fm-name to target an existing one.")})
            return out
        if resp.status_code == 404 and not fault_msg:
            out.update({"ok": False, "error": "http_error",
                        "message": "SOAP-RFC returned HTTP 404 — the /sap/bc/soap/rfc service path "
                                   "may be inactive (SICF)."})
            return out
        detail = fault_msg or text[:600]
        out.update({"ok": False, "error": "soap_fault" if fault_msg else "http_error",
                    "message": f"SOAP-RFC fault (HTTP {resp.status_code}): {detail}"})
        return out

    ev_rc = _tag(text, 'EV_RC')
    ev_message = _tag(text, 'EV_MESSAGE')
    if ev_rc is None:
        out.update({"ok": False, "error": "bad_response",
                    "message": f"Unexpected SOAP response (no EV_RC): {text[:600]}"})
        return out

    try:
        rc_int = int(ev_rc)
    except (TypeError, ValueError):
        rc_int = -1

    out.update({"rc": rc_int, "ev_rc": ev_rc, "ev_message": ev_message})

    if mode in ('READ', 'DELETE'):
        out["ok"] = True
        out["message"] = f"{mode} {prog}/{dynpro} complete."
        return out

    # WRITE: rc=0 OK, rc=2 means the screen already existed (idempotent success).
    if rc_int in (0, 2):
        note = " (screen already existed — idempotent)" if rc_int == 2 else ""
        out["ok"] = True
        out["message"] = (f"Screen {prog}/{dynpro} + STAT{dynpro} + TIT{dynpro} generated{note}. "
                          f"Next: syntax-check + activate the program. It must define CALL SCREEN "
                          f"{dynpro}; MODULE status_{dynpro}; MODULE user_command_{dynpro}; "
                          f"SET PF-STATUS 'STAT{dynpro}'; SET TITLEBAR 'TIT{dynpro}'.")
        return out

    out["ok"] = False
    out["error"] = "generation_failed"
    out["message"] = (f"Generation reported EV_RC={ev_rc}. See EV_MESSAGE and "
                      "SKILL.md > Troubleshooting for the rc breakdown.")
    return out


# ---------------------------------------------------------------------------
# CLI wrapper
# ---------------------------------------------------------------------------

def main():
    # ASCII-safe stdout/stderr on Windows consoles (cp1252)
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

    # Reuse the sap-adt skill engine (sibling skill).
    sap_adt_scripts = Path(__file__).resolve().parents[2] / 'sap-adt' / 'scripts'
    if sap_adt_scripts.is_dir():
        sys.path.insert(0, str(sap_adt_scripts))
    try:
        from sap_adt_lib import set_explicit_working_dir
        from sap_client import SAPClient
    except ImportError as exc:
        print("[FAIL] Could not import the sap-adt engine.")
        print(f"[ERROR] {type(exc).__name__}: {exc}")
        print(f"[INFO] Expected sap-adt scripts at: {sap_adt_scripts}")
        return 1

    parser = argparse.ArgumentParser(
        description='Generate a classic Dynpro screen + GUI status via SOAP-RFC (generator FM).'
    )
    parser.add_argument('--program', required=True,
                        help='Target program (e.g., ZAI_P_LIST). Must be a customer (Z/Y) program.')
    parser.add_argument('--dynpro', default='0100',
                        help='Screen number, 4 digits (default 0100). Everything is named after this.')
    parser.add_argument('--title', default='Liste',
                        help='Titlebar + dynpro description (default "Liste").')
    parser.add_argument('--screen-type', default='DOCKING', choices=['DOCKING', 'CONTAINER'],
                        help='DOCKING (no container) or CONTAINER (one custom control). Default DOCKING.')
    parser.add_argument('--cc-name', default='CC_ALV',
                        help='Custom control name for CONTAINER type (default CC_ALV).')
    parser.add_argument('--mode', default='WRITE', choices=['WRITE', 'READ', 'DELETE'],
                        help='WRITE (generate, default) / READ (inspect) / DELETE.')
    parser.add_argument('--recreate', action='store_true',
                        help="Delete + re-insert the screen (apply flow/container/status changes).")
    parser.add_argument('--transport',
                        help='Transport request the program belongs to (NEVER fabricate - ask the user).')
    parser.add_argument('--language',
                        help='sap-language for the call (defaults to the connection language; use TR if '
                             'donor GUI texts must be Turkish - see SKILL.md).')
    parser.add_argument('--fm-name', default=None,
                        help=f'Installed generator FM name (default {DEFAULT_FM_NAME}; or env '
                             'ABAP_SCREEN_GEN_FM). The bundled ABAP is a template - install under any name.')
    parser.add_argument('--cwd', help='Working directory containing .conn_adt')
    args = parser.parse_args()

    if args.cwd:
        set_explicit_working_dir(args.cwd)

    if args.mode == 'WRITE' and not args.transport:
        print("[WARNING] No --transport given. The screen/status will record against the program's")
        print("[WARNING] current transport if one is open. NEVER fabricate a transport number.")
        print("[INFO] Run list_transports.py --modifiable-only (sap-adt skill) and ASK the user first.")

    try:
        client = SAPClient()
        adt = client.adt_client
    except Exception as exc:
        print("[FAIL] Could not establish SAP connection.")
        print(f"[ERROR] {type(exc).__name__}: {exc}")
        print("[INFO] Check .conn_adt and run run_check_logon.py (sap-adt skill).")
        return 1

    result = generate_screen(
        adt, program=args.program, dynpro=args.dynpro, title=args.title,
        screen_type=args.screen_type, cc_name=args.cc_name, mode=args.mode,
        recreate=args.recreate, transport=args.transport, language=args.language,
        fm_name=args.fm_name,
    )

    if 'ev_rc' in result:
        print(f"[INFO] EV_RC     = {result.get('ev_rc')}")
        print(f"[INFO] EV_MESSAGE= {result.get('ev_message')}")

    if result.get('ok'):
        print(f"[OK] {result.get('message', 'Done.')}")
        return 0

    print(f"[FAIL] {result.get('message', 'Operation failed.')}")
    if result.get('error') == 'guardrail_violation':
        print("[INFO] Target program must be in the Z/Y customer namespace.")
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
