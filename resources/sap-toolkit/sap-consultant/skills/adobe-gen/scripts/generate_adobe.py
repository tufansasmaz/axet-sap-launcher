#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_adobe.py - Adobe Interface (SFPI) + Adobe Form (SFPF) over SOAP-RFC.

ADT does not know these object types at all — they are absent from its supported
type list, so create, read and write all fail there. SAP's own workbench API
(package SAFPAPI) is fully capable, but those APIs need a *dialog context*: called
from the ADT classrun channel they fail with 400 "Session Timed Out". Same trap,
same fix as the screen-gen skill — a one-time, RFC-enabled wrapper FM (default
ZND_FM_ADOBE_GEN) called over /sap/bc/soap/rfc, reusing the SAPADTClient session.

NO SETUP STEP. If the generator FM is missing, the first call installs it into
$TMP — already Remote-Enabled, via SAP's own RPY_FUNCTIONMODULE_INSERT — and
retries. The install is announced, writes nothing outside $TMP, and needs no
transport. Pass auto_install=False to refuse it.

NEVER TRUST A SUCCESS MESSAGE HERE. ADT cannot show these objects, so the only
real verification is reading back through the same API — that is what the STATUS,
GET_PARAMS and GET_LAYOUT modes are for, and they are why they ship. While this
tool was being built, apparent success differed from reality three times: reported
active but state=I, reported written but the layout was unchanged, reported added
but the context tree was empty.

Modes
  WRITE         create interface + form, activate both
  READ          existence, reported in SAP's own words
  DELETE        form then interface (dependency order)
  SET_LAYOUT    upload an .xdp (sent base64 — an xstring will not survive raw)
  SET_LAYOUT_TYPE  fix only the layout type; leaves the XDP alone
  GET_LAYOUT    download the .xdp
  SET_PARAMS    add up to two import parameters to the interface
  SYNC_CONTEXT  build the form's context tree from those parameters — the API
                equivalent of SFP's "Get from Interface". Creating parameters
                does NOT do this; without it the Context tab stays empty.
  GET_CONTEXT   read the context tree back — duplicate node names  (verification)
  STATUS        real A/I state + visible parameter count  (verification)
  GET_PARAMS    read the interface's import parameters back (verification)
  RTTI_DEBUG    a DDIC type's runtime kind / row type     (verification)

Usage:
    python generate_adobe.py --interface ZPM001_IF_ORDER --form ZPM001_AF_ORDER \\
        --devclass ZPM001 --transport DS4K900067 --cwd /path/to/project
    python generate_adobe.py --form ZPM001_AF_ORDER --mode SET_LAYOUT \\
        --layout-file order.xdp --cwd /path/to/project
    python generate_adobe.py --interface ZPM001_IF_ORDER --mode SET_PARAMS \\
        --param1 IS_HDR:ZPM001_S_HDR --param2 IT_OPS:ZPM001_TT_OP --cwd ...
"""
import argparse
import base64
import os
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

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

# The bundled ABAP is a reference template, not a fixed-name object — install it
# under whatever name the project uses and override here.
DEFAULT_FM_NAME = os.getenv('ABAP_ADOBE_GEN_FM', 'ZND_FM_ADOBE_GEN')
RFC_NS = 'urn:sap-com:document:sap:rfc:functions'

MODES = ('WRITE', 'READ', 'DELETE', 'SET_LAYOUT', 'SET_LAYOUT_TYPE', 'GET_LAYOUT',
         'SET_PARAMS', 'SYNC_CONTEXT', 'GET_CONTEXT', 'STATUS', 'GET_PARAMS',
         'RTTI_DEBUG')
# Modes that only ever read; a guardrail or transport warning would be noise.
READ_ONLY_MODES = ('READ', 'GET_LAYOUT', 'STATUS', 'GET_PARAMS', 'GET_CONTEXT',
                   'RTTI_DEBUG')


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

    SAP returns app faults as HTTP 500 with a generic <faultstring> and the real
    reason in <detail><rfc:Error><message>. Prefer the detail."""
    from html import unescape
    raw = _tag(text, 'message') or _tag(text, 'faultstring')
    return unescape(raw).strip() if raw else None


def _customer_ns(name):
    return name.startswith(('Z', 'Y', '/'))


def _auto_install(adt, fm_name, source_file, description):
    """Install the generator FM on first use. Returns (ok, message)."""
    import sys as _s
    from pathlib import Path as _P
    bs = _P(__file__).resolve().parents[2] / 'screen-gen' / 'scripts'
    if str(bs) not in _s.path:
        _s.path.insert(0, str(bs))
    try:
        from bootstrap_fm import ensure_generator_fm
    except ImportError as exc:
        return False, f"bootstrap helper unavailable (screen-gen skill missing?): {exc}"
    return ensure_generator_fm(adt, fm_name, 'ZND_FG_AUTO_GEN', source_file, description)


def generate_adobe(adt, interface='', form='', devclass='$TMP', transport=None,
                   language=None, if_text=None, form_text=None, template=None,
                   mode='WRITE', fm_name=None, layout_base64=None,
                   param1_name=None, param1_type=None,
                   param2_name=None, param2_type=None, layout_type=None,
                   auto_install=True):
    """Call the generator FM over SOAP-RFC. Returns a structured dict.

    Returns: {ok, rc, ev_rc, ev_message, layout_base64?, http_status, message,
              error?, transport_warning?}
    """
    fm_name = fm_name or DEFAULT_FM_NAME
    mode = (mode or 'WRITE').upper()
    interface = (interface or '').upper().strip()
    form = (form or '').upper().strip()
    template = (template or '').upper().strip()

    if mode not in MODES:
        return {"ok": False, "error": "bad_args",
                "message": f"unknown mode '{mode}'; expected one of {', '.join(MODES)}."}
    if not interface and not form:
        return {"ok": False, "error": "bad_args",
                "message": "at least one of interface / form is required."}

    if mode not in READ_ONLY_MODES:
        for label, name in (('interface', interface), ('form', form)):
            if name and not _customer_ns(name):
                return {"ok": False, "error": "guardrail_violation",
                        "message": (f"Refusing to modify {label} '{name}' outside the "
                                    "customer namespace. Must start with Z, Y or /.")}

    out = {}
    if mode not in READ_ONLY_MODES and devclass != '$TMP' and not transport:
        out["transport_warning"] = (
            f"Package '{devclass}' is transportable but no transport was supplied. "
            "Never fabricate a transport number — list the open ones and ask the user.")

    params = [
        ('IV_INTERFACE', interface),
        ('IV_FORM', form),
        ('IV_DEVCLASS', devclass),
        ('IV_TRANSPORT', transport),
        ('IV_LANGUAGE', language),
        ('IV_IF_TEXT', if_text),
        ('IV_FORM_TEXT', form_text),
        ('IV_TEMPLATE', template),
        ('IV_MODE', mode),
        ('IV_LAYOUT_BASE64', layout_base64),
        ('IV_PARAM1_NAME', param1_name),
        ('IV_PARAM1_TYPE', param1_type),
        ('IV_PARAM2_NAME', param2_name),
        ('IV_PARAM2_TYPE', param2_type),
        ('IV_LAYOUT_TYPE', layout_type),
    ]
    envelope = _build_envelope(fm_name, params)

    base_url = adt.url.rstrip('/')
    lang = language or getattr(adt, 'language', None) or 'EN'
    url = f"{base_url}/sap/bc/soap/rfc?sap-client={adt.client}&sap-language={lang}"
    headers = {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml',
        'SOAPAction': '""',
    }
    timeout = getattr(adt, 'timeout_long', None) or getattr(adt, 'timeout_default', 60)

    try:
        resp = adt.session.post(url, data=envelope.encode('utf-8'),
                                headers=headers, timeout=timeout)
    except Exception as exc:
        out.update({"ok": False, "error": "request_failed",
                    "message": f"SOAP-RFC request failed (transport-level): "
                               f"{type(exc).__name__}: {exc}"})
        return out

    text = resp.text or ''
    out["http_status"] = resp.status_code
    fault_msg = _fault_message(text)

    if resp.status_code >= 400 or fault_msg:
        low = (fault_msg or '').lower()
        if 'not found' in low or 'not exist' in low or 'unknown function' in low:
            # First use on this system: install the generator and try once more. It is a
            # per-system developer tool, so the alternative is handing the consultant a
            # setup errand in the middle of their task.
            if auto_install and fm_name == DEFAULT_FM_NAME:
                src = Path(__file__).resolve().parents[1] / 'bootstrap' / f'{fm_name}.func.abap'
                ok, msg = _auto_install(adt, fm_name, src,
                                        'Adobe Form/Interface generator (RFC)')
                if ok:
                    retry = generate_adobe(
                        adt, interface=interface, form=form, devclass=devclass,
                        transport=transport, language=language, if_text=if_text,
                        form_text=form_text, template=template, mode=mode,
                        fm_name=fm_name, layout_base64=layout_base64,
                        param1_name=param1_name, param1_type=param1_type,
                        param2_name=param2_name, param2_type=param2_type,
                        layout_type=layout_type, auto_install=False)
                    retry["installed"] = msg
                    return retry
                out.update({"ok": False, "error": "fm_not_found",
                            "message": (f"Generator FM '{fm_name}' is missing and the "
                                        f"automatic install failed: {msg}")})
                return out
            out.update({"ok": False, "error": "fm_not_found",
                        "message": (f"Generator FM '{fm_name}' not found on this system: "
                                    f"{fault_msg} Run the bootstrap (see SKILL.md), or pass "
                                    "--fm-name to target an existing one.")})
            return out
        if resp.status_code == 404 and not fault_msg:
            out.update({"ok": False, "error": "http_error",
                        "message": "SOAP-RFC returned HTTP 404 — the /sap/bc/soap/rfc "
                                   "service path may be inactive (SICF)."})
            return out
        out.update({"ok": False, "error": "soap_fault" if fault_msg else "http_error",
                    "message": f"SOAP-RFC fault (HTTP {resp.status_code}): "
                               f"{fault_msg or text[:600]}"})
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

    ev_layout = _tag(text, 'EV_LAYOUT_BASE64')
    if ev_layout:
        out["layout_base64"] = ev_layout

    # 0 = done, 4 = something already existed and was left untouched.
    if rc_int in (0, 4):
        out["ok"] = True
        out["message"] = ev_message or "Done."
        if mode == 'WRITE' and form and not template and auto_install:
            # A form with no layout CANNOT be activated — SAP fails serialising it
            # and reports "error converting object data", which says nothing about
            # the cause. That is the whole reason template-copying looked like the
            # only route, and template-copying is what drags the old context along.
            # Give the new form the bundled blank page and it activates normally.
            blank = Path(__file__).resolve().parents[1] / 'bootstrap' / 'blank.xdp'
            if blank.is_file():
                lay = generate_adobe(
                    adt, form=form, mode='SET_LAYOUT', fm_name=fm_name,
                    transport=transport, devclass=devclass,
                    layout_base64=base64.b64encode(blank.read_bytes()).decode('ascii'),
                    layout_type=layout_type or 'S', auto_install=False)
                out["blank_layout"] = lay.get("message") or lay.get("error")
                out["message"] += (" Blank layout applied and the form activated — "
                                   "design it in LiveCycle, or upload one with "
                                   "--mode SET_LAYOUT."
                                   if lay.get("ok") else
                                   " WARNING: the form has NO layout, so it could not be "
                                   f"activated: {out['blank_layout']}")
        if mode in ('WRITE', 'SET_PARAMS'):
            out["message"] += (" Verify with --mode STATUS before believing this; "
                               "these objects have reported success while inactive.")
        return out

    out["ok"] = False
    out["error"] = "generation_failed"
    out["message"] = f"Reported EV_RC={ev_rc}. See EV_MESSAGE."
    return out


# ---------------------------------------------------------------------------
# CLI wrapper
# ---------------------------------------------------------------------------

def _split_param(raw, label):
    """NAME:DDIC_TYPE -> (name, type)."""
    if not raw:
        return None, None
    if ':' not in raw:
        raise SystemExit(f"[FAIL] --{label} must be NAME:DDIC_TYPE (got '{raw}')")
    name, typ = raw.split(':', 1)
    return name.strip().upper(), typ.strip().upper()


def main():
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
        description='Create/maintain Adobe Interfaces and Forms via SOAP-RFC.')
    parser.add_argument('--interface', default='', help='Adobe Interface name.')
    parser.add_argument('--form', default='', help='Adobe Form name.')
    parser.add_argument('--devclass', default='$TMP',
                        help='Package (default $TMP). Ask: which module, which package, '
                             'which request.')
    parser.add_argument('--transport', default=None,
                        help='Transport request. Required for a transportable package. '
                             'NEVER fabricate one.')
    parser.add_argument('--language', default=None, help='Master language.')
    parser.add_argument('--if-text', default=None, help='Interface description.')
    parser.add_argument('--form-text', default=None, help='Form description.')
    parser.add_argument('--template', default=None,
                        help='Existing form to COPY from, so the new form starts with a '
                             'real layout instead of a blank one.')
    parser.add_argument('--mode', default='WRITE', choices=MODES)
    parser.add_argument('--layout-type', default=None, choices=['S', 'Z', 'A'],
                        help="Layout type written with SET_LAYOUT/SET_LAYOUT_TYPE. "
                             "S=Standard (print forms), Z=ZCI, A=xACF. Leaving it "
                             "unset in SAP means 'Unknown', which makes SFP refuse "
                             "to save with FPUIFB101. FM default: S.")
    parser.add_argument('--layout-file',
                        help='SET_LAYOUT: .xdp to upload. GET_LAYOUT: where to save it.')
    parser.add_argument('--param1', help='SET_PARAMS/SYNC_CONTEXT: NAME:DDIC_TYPE')
    parser.add_argument('--param2', help='SET_PARAMS/SYNC_CONTEXT: NAME:DDIC_TYPE')
    parser.add_argument('--fm-name', default=None,
                        help=f'Installed generator FM name (default {DEFAULT_FM_NAME}; '
                             'or env ABAP_ADOBE_GEN_FM).')
    parser.add_argument('--cwd', help='Working directory containing .conn_adt')
    args = parser.parse_args()

    if args.cwd:
        set_explicit_working_dir(args.cwd)

    p1n, p1t = _split_param(args.param1, 'param1')
    p2n, p2t = _split_param(args.param2, 'param2')

    layout_b64 = None
    if args.mode == 'SET_LAYOUT':
        if not args.layout_file:
            print("[FAIL] --mode SET_LAYOUT needs --layout-file <file.xdp>")
            return 1
        raw = Path(args.layout_file).read_bytes()
        layout_b64 = base64.b64encode(raw).decode('ascii')
        print(f"[INFO] layout {args.layout_file}: {len(raw)} byte -> base64")

    if args.mode not in READ_ONLY_MODES and args.devclass != '$TMP' and not args.transport:
        print("[WARNING] No --transport given for a transportable package.")
        print("[INFO] List the open transports and ASK the user. Never fabricate one.")

    try:
        client = SAPClient()
        adt = client.adt_client
    except Exception as exc:
        print("[FAIL] Could not establish SAP connection.")
        print(f"[ERROR] {type(exc).__name__}: {exc}")
        print("[INFO] Check .conn_adt and run run_check_logon.py (sap-adt skill).")
        return 1

    result = generate_adobe(
        adt, interface=args.interface, form=args.form, devclass=args.devclass,
        transport=args.transport, language=args.language, if_text=args.if_text,
        form_text=args.form_text, template=args.template, mode=args.mode,
        fm_name=args.fm_name, layout_base64=layout_b64,
        param1_name=p1n, param1_type=p1t, param2_name=p2n, param2_type=p2t,
        layout_type=args.layout_type,
    )

    if result.get("transport_warning"):
        print(f"[WARNING] {result['transport_warning']}")
    if result.get("installed"):
        print(f"[INSTALLED] {result['installed']}")
        print("[INFO] A generator function module was written to this SAP system "
              "($TMP, local, no transport). Remove it with SE37 if unwanted.")
    if 'ev_rc' in result:
        print(f"[INFO] EV_RC     = {result.get('ev_rc')}")
        print(f"[INFO] EV_MESSAGE= {result.get('ev_message')}")

    if args.mode == 'GET_LAYOUT' and result.get('layout_base64'):
        raw = base64.b64decode(result['layout_base64'])
        target = Path(args.layout_file or f"{args.form or 'form'}.xdp")
        target.write_bytes(raw)
        print(f"[OK] layout written to {target} ({len(raw)} byte)")

    if result.get('ok'):
        print(f"[OK] {result.get('message', 'Done.')}")
        return 0

    print(f"[FAIL] {result.get('message', 'Operation failed.')}")
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
