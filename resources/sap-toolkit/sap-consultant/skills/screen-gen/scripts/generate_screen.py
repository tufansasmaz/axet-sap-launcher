#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_screen.py - Generate a classic Dynpro screen + GUI status + titlebar.

ADT CANNOT create Dynpro screens or GUI statuses directly. The proven workaround
is a one-time, RFC-enabled generator function module (default ZND_FM_SCREEN_GEN) that
wraps RPY_DYNPRO_INSERT + RS_CUA_INTERNAL_* . Those FMs require a *dialog context*,
so the ADT classrun channel fails with 400 "Session Timed Out". This module calls
the generator over the SOAP-RFC channel (/sap/bc/soap/rfc), reusing the existing
SAPADTClient session (auth, SSL, sap-client) from the sap-adt skill.

Two entry points share one core:
  - generate_screen(adt, ...) -> structured dict  (importable; no stdout side-effects,
    safe for the stdio MCP server).
  - main()                    -> CLI wrapper that prints + returns an exit code.

NO SETUP STEP. If the generator FM is missing, the first call installs it into
$TMP — already Remote-Enabled, via SAP's own RPY_FUNCTIONMODULE_INSERT — and
retries. The install is announced and needs no transport. auto_install=False refuses it.

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
from html import unescape
from xml.sax.saxutils import escape

# Default generator FM name. The ABAP itself is NOT shipped under a fixed name —
# bootstrap/ZND_FM_SCREEN_GEN.func.abap is a reference template you install under your
# own name. Override per call via fm_name / --fm-name / env ABAP_SCREEN_GEN_FM.
import os

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
DEFAULT_FM_NAME = os.getenv('ABAP_SCREEN_GEN_FM', 'ZND_FM_SCREEN_GEN')
# Screen type FIELDS is served by a SECOND generator FM, not by a branch inside
# the first one. Two reasons, both from the NS4 run on 2026-09-03: the field-pair
# generator must not touch the GUI status (the ALV one creates STAT/TIT, and a
# detail popup re-generated ten times while its layout is tuned must not keep
# rewriting them), and the two take different parameters. The split is an
# implementation detail -- the consultant asks for a screen type.
DEFAULT_FIELDS_FM_NAME = os.getenv('ABAP_SCREEN_FIELDS_FM', 'ZND_FM_SCREEN_FIELDS')
DEFAULT_BUTTON_FM_NAME = os.getenv('ABAP_CUA_BUTTON_FM', 'ZND_FM_ADD_CUA_BUTTON')
RFC_NS = 'urn:sap-com:document:sap:rfc:functions'

# The application-toolbar button code lives in RSMPE_BUT-CODE, domain GUI_BCODE,
# which is CHAR 4. Menu and pfkey function codes are GUI_FUNC and go to 20, so a
# longer code looks fine everywhere else and only the toolbar drops it -- SAP
# truncates silently and the button binds to nothing. Measured on NS4
# 2026-09-03 with 'KALEMLR' (7 chars): status written, button never appeared.
MAX_FCODE_LEN = 4


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
    """Namespace-tolerant single-tag extractor, XML entities resolved.

    Unescaped here rather than at each call site: EV_MESSAGE routinely carries
    quoted values (butcode='0100'), and a message that reaches the consultant as
    butcode=&#39;0100&#39; reads like a defect in the tool.
    """
    m = re.search(rf'<(?:\w+:)?{name}>(.*?)</(?:\w+:)?{name}>', text, re.DOTALL)
    return unescape(m.group(1)).strip() if m else None


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


def _post_rfc(adt, envelope, language=None):
    """POST a SOAP-RFC envelope on the ADT session. Returns the response.

    /sap/bc/soap/rfc rather than ADT's own channel, and that is not a
    preference: RPY_DYNPRO_INSERT and RS_CUA_INTERNAL_WRITE need a dialog
    context, and from adt_classrun they answer 400 "Session Timed Out". The
    session is borrowed from sap-adt so the auth, SSL and sap-client are the
    ones already established.
    """
    base_url = adt.url.rstrip('/')
    lang = language or getattr(adt, 'language', None) or 'EN'
    url = f"{base_url}/sap/bc/soap/rfc?sap-client={adt.client}&sap-language={lang}"
    headers = {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml',
        'SOAPAction': '""',
    }
    timeout = getattr(adt, 'timeout_long', None) or getattr(adt, 'timeout_default', 60)
    return adt.session.post(url, data=envelope.encode('utf-8'),
                            headers=headers, timeout=timeout)


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


def generate_screen(adt, program, dynpro='0100', title='Liste', screen_type='DOCKING',
                    cc_name='CC_ALV', mode='WRITE', recreate=False, transport=None,
                    language=None, fm_name=None, auto_install=True, **kwargs):
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
                 env ABAP_SCREEN_GEN_FM / 'ZND_FM_SCREEN_GEN'). The ABAP is a
                 reference template — install it under whatever name your project uses.

    Returns: {ok, rc, ev_rc, ev_message, http_status, message, error?, transport_warning?}
    """
    fm_name = (fm_name or DEFAULT_FM_NAME).upper()
    prog = (program or '').upper()
    mode = (mode or 'WRITE').upper()
    screen_type = (screen_type or 'DOCKING').upper()

    if screen_type == 'FIELDS':
        return generate_fields(adt, program=program, dynpro=dynpro, title=title,
                               fields=kwargs.get('fields'),
                               lines=kwargs.get('lines', 20),
                               columns=kwargs.get('columns', 100),
                               mode=mode, recreate=recreate, transport=transport,
                               language=language,
                               fm_name=kwargs.get('fields_fm_name'),
                               auto_install=auto_install,
                               verify=kwargs.get('verify', True))

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

    try:
        resp = _post_rfc(adt, envelope, language)
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
            # First use on this system: install the generator and try once more. It is a
            # per-system developer tool, so the alternative is handing the consultant a
            # setup errand in the middle of their task.
            if auto_install and fm_name == DEFAULT_FM_NAME:
                src = Path(__file__).resolve().parents[1] / 'bootstrap' / f'{fm_name}.func.abap'
                ok, msg = _auto_install(adt, fm_name, src,
                                        'Classic Dynpro screen + GUI status generator (RFC)')
                if ok:
                    retry = generate_screen(
                        adt, program=program, dynpro=dynpro, title=title,
                        screen_type=screen_type, cc_name=cc_name, mode=mode,
                        recreate=recreate, transport=transport, language=language,
                        fm_name=fm_name, auto_install=False)
                    retry["installed"] = msg
                    return retry
                out.update({"ok": False, "error": "fm_not_found",
                            "message": (f"Generator FM '{fm_name}' is missing and the "
                                        f"automatic install failed: {msg}")})
                return out
            out.update({"ok": False, "error": "fm_not_found",
                        "message": (f"Generator FM '{fm_name}' not found on this system: {fault_msg} "
                                    "Run the bootstrap (see SKILL.md), or pass "
                                    "fm_name/--fm-name to target an existing one.")})
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


def parse_field_spec(fields):
    """Normalise a field-pair spec into the FM's 'label;name;len|...' string.

    Accepts the pipe string itself, or a list of "label;NAME;len" strings, or a
    list of (label, name, length) tuples. Validated here rather than in ABAP:
    a malformed row is skipped silently by the FM (`IF lines( lt_cols ) < 3.
    CONTINUE.`), so a typo costs a field that never appears and never explains
    itself.
    """
    if fields is None:
        raise ValueError("no fields given")
    rows = fields.split('|') if isinstance(fields, str) else list(fields)

    out = []
    for i, row in enumerate(rows, 1):
        parts = ([str(p) for p in row] if isinstance(row, (list, tuple))
                 else str(row).split(';'))
        parts = [p.strip() for p in parts]
        if len(parts) != 3:
            raise ValueError(
                f"field {i} has {len(parts)} part(s), expected 3 "
                f"(label;FIELDNAME;length): {row!r}")
        label, name, length = parts
        if not label:
            raise ValueError(f"field {i} has an empty label: {row!r}")
        if not name:
            raise ValueError(f"field {i} has an empty field name: {row!r}")
        if ';' in label or '|' in label:
            raise ValueError(
                f"field {i} label contains a separator (; or |): {label!r}")
        if not length.isdigit() or int(length) < 1:
            raise ValueError(
                f"field {i} length must be a positive integer, got {length!r}")
        out.append(f"{label};{name.upper()};{length}")
    if not out:
        raise ValueError("no fields given")
    return '|'.join(out)


def read_screen_fields(adt, program, dynpro='0100', language=None, fm_name=None):
    """READ mode: what is ACTUALLY on the dynpro, from SAP's native table.

    Returns {ok, ext_fields, native_fields, ev_message}. `native_fields` is the
    count from RPY_DYNPRO_READ's fields_list (d021s) -- what the converter wrote
    to disk, not what was submitted to it. That distinction is the whole point:
    RPY_DYNPRO_INSERT can answer rc=0 having written nothing.
    """
    fm = (fm_name or DEFAULT_FIELDS_FM_NAME).upper()
    envelope = _build_envelope(fm, [
        ('IV_PROGRAM', (program or '').upper()),
        ('IV_DYNPRO', dynpro),
        ('IV_MODE', 'READ'),
    ])
    try:
        resp = _post_rfc(adt, envelope, language)
    except Exception as exc:
        return {"ok": False, "error": "request_failed",
                "message": f"{type(exc).__name__}: {exc}"}
    fault, _ = _fault_message(resp.text or '')
    if resp.status_code >= 400 or fault:
        return {"ok": False, "error": "soap_fault",
                "message": fault or f"HTTP {resp.status_code}"}
    msg = _tag(resp.text or '', 'EV_MESSAGE') or ''
    m_ext = re.search(r'ext_fields=(\d+)', msg)
    m_nat = re.search(r'native=(\d+)', msg)
    return {"ok": True, "ev_message": msg,
            "ext_fields": int(m_ext.group(1)) if m_ext else None,
            "native_fields": int(m_nat.group(1)) if m_nat else None}


def generate_fields(adt, program, dynpro='0100', title='Detay', fields=None,
                    lines=20, columns=100, mode='WRITE', recreate=False,
                    transport=None, language=None, fm_name=None,
                    auto_install=True, verify=True):
    """Label + value pairs on a classic dynpro — the SE51 detail-screen shape.

    Companion to generate_screen(), not a replacement. This one builds the field
    layout and does NOT touch the GUI status or titlebar, so the target dynpro's
    STAT<n>/TIT<n> must exist already: run generate_screen() once for the same
    dynpro number, then rebuild the layout with this as often as you like.

    `verify=True` re-reads the screen after a successful write and fails if SAP
    kept fewer fields than were sent. RPY_DYNPRO_INSERT reports rc=0 for a screen
    it wrote nothing to -- on NS4 2026-09-03, 24 fields went in, rc was 0, and
    only OKCODE was on the dynpro. Checking is the only way to tell the two
    apart, so it is on by default.

    Returns: {ok, rc, ev_rc, ev_message, http_status, message, verified?, error?}
    """
    fm_name = (fm_name or DEFAULT_FIELDS_FM_NAME).upper()
    prog = (program or '').upper()
    mode = (mode or 'WRITE').upper()

    if mode == 'WRITE' and not (prog.startswith('Z') or prog.startswith('Y') or prog.startswith('/')):
        return {"ok": False, "error": "guardrail_violation",
                "message": f"Refusing to generate a screen in non-customer program '{prog}'. "
                           "Target must be in the Z/Y customer namespace."}

    spec, pair_count = '', 0
    if mode == 'WRITE':
        try:
            spec = parse_field_spec(fields)
        except ValueError as exc:
            return {"ok": False, "error": "bad_field_spec",
                    "message": (f"{exc}\n"
                                "Format: label;FIELDNAME;length, rows joined by '|'. "
                                "FIELDNAME must be a GLOBAL variable or structure "
                                "component of the target program (e.g. GS_DETAIL-EBELN); "
                                "a local variable or a class attribute cannot be bound "
                                "to a screen.")}
        pair_count = len(spec.split('|'))

    out = {}
    if mode == 'WRITE' and not transport:
        out["transport_warning"] = ("No transport supplied; will record against the program's "
                                    "open transport if any. Never fabricate a transport — "
                                    "list_transports + ask the user.")

    envelope = _build_envelope(fm_name, [
        ('IV_PROGRAM', prog),
        ('IV_DYNPRO', dynpro),
        ('IV_TRANSPORT', transport),
        ('IV_TITLE', title),
        ('IV_FIELDS', spec),
        ('IV_LINES', str(lines)),
        ('IV_COLUMNS', str(columns)),
        ('IV_MODE', mode),
        ('IV_RECREATE', 'X' if recreate else ''),
    ])

    try:
        resp = _post_rfc(adt, envelope, language)
    except Exception as exc:
        out.update({"ok": False, "error": "request_failed",
                    "message": f"SOAP-RFC request failed (transport-level): {type(exc).__name__}: {exc}"})
        return out

    text = resp.text or ''
    out["http_status"] = resp.status_code
    fault_msg, _ = _fault_message(text)

    if resp.status_code >= 400 or fault_msg:
        low = (fault_msg or '').lower()
        if ('not found' in low or 'not exist' in low or 'unknown function' in low):
            if auto_install and fm_name == DEFAULT_FIELDS_FM_NAME:
                src = Path(__file__).resolve().parents[1] / 'bootstrap' / f'{fm_name}.func.abap'
                ok, msg = _auto_install(adt, fm_name, src,
                                        'Classic Dynpro label/value field-pair generator (RFC)')
                if ok:
                    retry = generate_fields(
                        adt, program=program, dynpro=dynpro, title=title, fields=fields,
                        lines=lines, columns=columns, mode=mode, recreate=recreate,
                        transport=transport, language=language, fm_name=fm_name,
                        auto_install=False, verify=verify)
                    retry["installed"] = msg
                    return retry
                out.update({"ok": False, "error": "fm_not_found",
                            "message": (f"Generator FM '{fm_name}' is missing and the "
                                        f"automatic install failed: {msg}")})
                return out
            out.update({"ok": False, "error": "fm_not_found",
                        "message": f"Generator FM '{fm_name}' not found on this system: {fault_msg}"})
            return out
        if resp.status_code == 404 and not fault_msg:
            out.update({"ok": False, "error": "http_error",
                        "message": "SOAP-RFC returned HTTP 404 — the /sap/bc/soap/rfc service path "
                                   "may be inactive (SICF)."})
            return out
        out.update({"ok": False, "error": "soap_fault" if fault_msg else "http_error",
                    "message": f"SOAP-RFC fault (HTTP {resp.status_code}): {fault_msg or text[:600]}"})
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

    if rc_int not in (0, 2):
        out.update({"ok": False, "error": "generation_failed",
                    "message": f"Generation reported EV_RC={ev_rc}. See EV_MESSAGE."})
        return out

    expected = pair_count * 2          # one TEXT + one TEMPLATE per pair
    if not verify:
        out["ok"] = True
        out["message"] = (f"{pair_count} field pair(s) written to {prog}/{dynpro} "
                          f"(rc={rc_int}, NOT verified).")
        return out

    check = read_screen_fields(adt, prog, dynpro, language=language, fm_name=fm_name)
    native = check.get("native_fields")
    out["verified"] = check
    if not check.get("ok") or native is None:
        out["ok"] = True
        out["message"] = (f"{pair_count} field pair(s) written to {prog}/{dynpro} "
                          f"(rc={rc_int}), but the read-back check could not run: "
                          f"{check.get('message', 'no field count in EV_MESSAGE')}. "
                          f"Confirm in SE51 before relying on it.")
        return out

    # OKCODE is on every dynpro and is not one of ours, hence >= rather than ==.
    if native < expected:
        out.update({"ok": False, "error": "fields_dropped",
                    "message": (
                        f"RPY_DYNPRO_INSERT answered rc={rc_int} but the screen holds "
                        f"{native} native field(s), not the {expected} sent "
                        f"({pair_count} pairs). Fields were dropped silently.\n"
                        f"The usual cause is the root container: every elementary "
                        f"field must bind to an entry in the CONTAINERS table, and "
                        f"without the type='SCREEN' name='SCREEN' row the converter "
                        f"skips them all without an error. Check that row is still "
                        f"in {fm_name}.")})
        return out

    out["ok"] = True
    out["message"] = (
        f"{pair_count} field pair(s) on {prog}/{dynpro}, verified: {native} native "
        f"field(s) read back. GUI status untouched — STAT{dynpro}/TIT{dynpro} must "
        f"already exist (generate_screen for the same dynpro). The program must "
        f"declare each bound name as a GLOBAL variable, and CALL SCREEN must live in "
        f"the PROGRAM, never in a class pool.")
    return out


def add_toolbar_button(adt, program, status, fcode, text='Detay', icon='@1F@',
                       butcode=None, devclass=None, transport=None, language=None,
                       fm_name=None, auto_install=True, modal=None, mode='WRITE',
                       but_group=None):
    """Add ONE application-toolbar push button to an existing GUI status.

    FETCH the CUA, add the function, register it, WRITE, GENERATE. The status has
    to exist already — generate_screen() makes STAT<n>/TIT<n>; this only adds to
    them. Idempotent: a code already in the CUA returns rc=2 and rewrites nothing.

    Three things make a button that never appears, all silent, all found live on
    NS4 2026-09-03 and all handled in the FM:
      * a function code longer than 4 characters (see MAX_FCODE_LEN);
      * a status whose RSMPE_STA-BUTCODE is empty — the toolbar group. The
        clean-toolbar pass in ZND_FM_SCREEN_GEN deliberately clears it, so a
        screen from this very skill starts with no group and no button can show
        whatever the BUT table says. The FM assigns one when it finds none;
      * a code missing from ACT, the active-function list. The kernel treats it
        as invalid: no toolbar button, and runtime 00256 "select a valid
        function" if it is triggered anyway.

    Returns: {ok, rc, ev_rc, ev_message, http_status, message, error?}
    """
    fm_name = (fm_name or DEFAULT_BUTTON_FM_NAME).upper()
    prog = (program or '').upper()
    code = (fcode or '').strip().upper()
    status = (status or '').strip().upper()

    if not (prog.startswith('Z') or prog.startswith('Y') or prog.startswith('/')):
        return {"ok": False, "error": "guardrail_violation",
                "message": f"Refusing to modify the GUI status of non-customer program '{prog}'."}
    if not status:
        return {"ok": False, "error": "bad_args",
                "message": "status is required (e.g. STAT0100) — this adds to an existing status."}
    if not code:
        return {"ok": False, "error": "bad_args", "message": "fcode is required."}
    # READ and GENERATE do not add anything, so the length rule is a WRITE rule.
    if (mode or 'WRITE').upper() == 'WRITE' and len(code) > MAX_FCODE_LEN:
        # Refused here rather than in ABAP too, so the reason arrives before the
        # round trip and names the fix.
        return {"ok": False, "error": "fcode_too_long",
                "message": (f"Function code '{code}' is {len(code)} characters; the "
                            f"application-toolbar code (RSMPE_BUT-CODE, domain "
                            f"GUI_BCODE) is CHAR {MAX_FCODE_LEN}. SAP truncates a "
                            f"longer one without complaining and the button binds to "
                            f"nothing. Use at most {MAX_FCODE_LEN} characters — "
                            f"'{code[:MAX_FCODE_LEN]}' would do.")}

    out = {}
    mode = (mode or 'WRITE').upper()
    if mode == 'WRITE' and not transport:
        out["transport_warning"] = ("No transport supplied; the CUA change records against "
                                    "the program's open transport if any. Never fabricate one.")

    envelope = _build_envelope(fm_name, [
        ('IV_PROGRAM', prog),
        ('IV_STATUS', status),
        ('IV_FCODE', code),
        ('IV_FUN_TEXT', text),
        ('IV_ICON_ID', icon),
        ('IV_BUTCODE', butcode),
        ('IV_DEVCLASS', devclass),
        ('IV_MODE', (mode or 'WRITE').upper()),
        # RSMPE_STA-MODAL: '-' leave alone (default), 'N' normal dynpro status,
        # 'D' modal dialog box. 'N' rather than a space because a lone space does
        # not survive an XML element reliably. Never defaulted to a value: a
        # status whose screen really is a popup must stay 'D', and only the
        # caller knows which it is.
        ('IV_MODAL', '-' if modal is None else str(modal).upper()),
        # Which RSMPE_STA field names the BUT group. See the FM header: the
        # dictionary allows either reading and the ALV donor carries the same
        # value in both, so this is settled by testing on a system, not by
        # reading DD03L.
        ('IV_BUT_GROUP', (but_group or 'BUTCODE').upper()),
    ])

    try:
        resp = _post_rfc(adt, envelope, language)
    except Exception as exc:
        out.update({"ok": False, "error": "request_failed",
                    "message": f"SOAP-RFC request failed (transport-level): {type(exc).__name__}: {exc}"})
        return out

    text_body = resp.text or ''
    out["http_status"] = resp.status_code
    fault_msg, _ = _fault_message(text_body)

    if resp.status_code >= 400 or fault_msg:
        low = (fault_msg or '').lower()
        if 'not found' in low or 'not exist' in low or 'unknown function' in low:
            if auto_install and fm_name == DEFAULT_BUTTON_FM_NAME:
                src = Path(__file__).resolve().parents[1] / 'bootstrap' / f'{fm_name}.func.abap'
                ok, msg = _auto_install(adt, fm_name, src,
                                        'CUA application-toolbar button adder (RFC)')
                if ok:
                    retry = add_toolbar_button(
                        adt, program=program, status=status, fcode=fcode, text=text,
                        icon=icon, butcode=butcode, devclass=devclass,
                        transport=transport, language=language, fm_name=fm_name,
                        auto_install=False)
                    retry["installed"] = msg
                    return retry
                out.update({"ok": False, "error": "fm_not_found",
                            "message": (f"Generator FM '{fm_name}' is missing and the "
                                        f"automatic install failed: {msg}")})
                return out
            out.update({"ok": False, "error": "fm_not_found",
                        "message": f"Generator FM '{fm_name}' not found on this system: {fault_msg}"})
            return out
        out.update({"ok": False, "error": "soap_fault" if fault_msg else "http_error",
                    "message": f"SOAP-RFC fault (HTTP {resp.status_code}): {fault_msg or text_body[:600]}"})
        return out

    ev_rc = _tag(text_body, 'EV_RC')
    ev_message = _tag(text_body, 'EV_MESSAGE')
    if ev_rc is None:
        out.update({"ok": False, "error": "bad_response",
                    "message": f"Unexpected SOAP response (no EV_RC): {text_body[:600]}"})
        return out
    try:
        rc_int = int(ev_rc)
    except (TypeError, ValueError):
        rc_int = -1
    out.update({"rc": rc_int, "ev_rc": ev_rc, "ev_message": ev_message})

    # The FM's own codes: 2 idempotent, 90 fcode too long, 91 status not found,
    # 10+subrc a WRITE failure. Named here so the caller is not left with a bare
    # number and the log line to interpret it from.
    if rc_int in (0, 2):
        out["ok"] = True
        if mode == 'READ':
            out["message"] = f"CUA of {prog}/{status} read — see ev_message."
        elif mode == 'GENERATE':
            out["message"] = f"{prog}'s CUA regenerated (rc={rc_int})."
        else:
            out["message"] = (
                f"'{code}' {'already wired on' if rc_int == 2 else 'added to'} {prog}/{status}"
                f"{'' if rc_int == 2 else f' ({text})'}. The program must handle it: "
                f"read sy-ucomm / the OK_CODE field in MODULE user_command_<dynpro> and "
                f"branch on '{code}'. A button SAP renders and the program ignores looks "
                f"identical to a broken one.")
        return out

    reason = {90: "function code longer than 4 characters",
              91: f"status {status} does not exist in {prog}'s CUA — generate it first "
                  f"(generate_screen --screen-type DOCKING for the same dynpro)"}.get(rc_int)
    if rc_int >= 10:
        reason = reason or f"RS_CUA_INTERNAL_WRITE failed (subrc {rc_int - 10})"
    out.update({"ok": False, "error": "button_failed",
                "message": f"EV_RC={ev_rc}" + (f" — {reason}." if reason else ".")})
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
    parser.add_argument('--screen-type', default='DOCKING',
                        choices=['DOCKING', 'CONTAINER', 'FIELDS'],
                        help='DOCKING (no container), CONTAINER (one custom control) or '
                             'FIELDS (SE51-style label/value detail screen; needs --fields). '
                             'Default DOCKING.')
    parser.add_argument('--cc-name', default='CC_ALV',
                        help='Custom control name for CONTAINER type (default CC_ALV).')
    parser.add_argument('--fields',
                        help='FIELDS type only. "label;FIELDNAME;length" rows joined by "|", '
                             'e.g. "Siparis;GS_DETAIL-EBELN;12|Kalem;GS_DETAIL-EBELP;6". '
                             'FIELDNAME must be a GLOBAL variable or structure component of '
                             'the target program. Repeatable instead: pass --fields once per row.',
                        action='append')
    parser.add_argument('--lines', type=int, default=20,
                        help='FIELDS type: screen height in rows (default 20).')
    parser.add_argument('--columns', type=int, default=100,
                        help='FIELDS type: screen width in columns (default 100).')
    parser.add_argument('--no-verify', action='store_true',
                        help='FIELDS type: skip the read-back check. Not advised — '
                             'RPY_DYNPRO_INSERT answers rc=0 for a screen it wrote nothing to.')
    parser.add_argument('--fields-fm-name', default=None,
                        help=f'Installed field-pair generator FM name (default '
                             f'{DEFAULT_FIELDS_FM_NAME}; or env ABAP_SCREEN_FIELDS_FM).')
    parser.add_argument('--add-button', metavar='FCODE',
                        help='Instead of generating a screen: add one application-toolbar '
                             f'button with this function code to --status. Max '
                             f'{MAX_FCODE_LEN} characters (RSMPE_BUT-CODE is CHAR '
                             f'{MAX_FCODE_LEN}; a longer one is truncated silently).')
    parser.add_argument('--status', help='GUI status to add the button to (e.g. STAT0100). '
                                         'Defaults to STAT<dynpro>.')
    parser.add_argument('--button-text', default='Detay', help='Button label (default "Detay").')
    parser.add_argument('--button-icon', default='@1F@', help='Icon id (default @1F@).')
    parser.add_argument('--button-code', default=None,
                        help='Toolbar group (RSMPE_STA-BUTCODE). Assigned automatically when '
                             'the status has none — only set this to join an existing group.')
    parser.add_argument('--button-fm-name', default=None,
                        help=f'Installed button FM name (default {DEFAULT_BUTTON_FM_NAME}; '
                             'or env ABAP_CUA_BUTTON_FM).')
    parser.add_argument('--modal', choices=['N', 'D'], default=None,
                        help='Set the status type (RSMPE_STA-MODAL): N normal dynpro status, '
                             'D modal dialog box. Left alone when not given. A D status draws '
                             'no application toolbar at all, so a button on one is invisible '
                             'however correct the CUA is — but a status whose screen really is '
                             'a popup (CALL SCREEN n STARTING AT) must stay D.')
    parser.add_argument('--button-mode', default='WRITE', choices=['WRITE', 'READ', 'GENERATE'],
                        help='WRITE add the button (default) / READ dump the CUA tables a '
                             'visible button depends on / GENERATE re-run RS_CUA_GENERATE only.')
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

    # READ and GENERATE change nothing, so the transport warning is noise on them.
    _writes = (args.mode == 'WRITE'
               and (not args.add_button or args.button_mode == 'WRITE'))
    if _writes and not args.transport:
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

    if args.add_button:
        result = add_toolbar_button(
            adt, program=args.program, status=(args.status or f'STAT{args.dynpro}'),
            fcode=args.add_button, text=args.button_text, icon=args.button_icon,
            butcode=args.button_code, transport=args.transport,
            language=args.language, fm_name=args.button_fm_name,
            modal=args.modal, mode=args.button_mode)
        if result.get("installed"):
            print(f"[INFO] {result['installed']}")
        if result.get("transport_warning"):
            print(f"[WARNING] {result['transport_warning']}")
        if result.get("ev_message"):
            print(f"[INFO] EV_MESSAGE= {result['ev_message']}")
        print(("[OK] " if result.get("ok") else "[FAIL] ") + str(result.get("message", "")))
        return 0 if result.get("ok") else 1

    if args.screen_type == 'FIELDS' and args.mode == 'WRITE' and not args.fields:
        print("[FAIL] --screen-type FIELDS needs --fields.")
        print('[INFO] Example: --fields "Siparis;GS_DETAIL-EBELN;12" '
              '--fields "Kalem;GS_DETAIL-EBELP;6"')
        return 1

    result = generate_screen(
        adt, program=args.program, dynpro=args.dynpro, title=args.title,
        screen_type=args.screen_type, cc_name=args.cc_name, mode=args.mode,
        recreate=args.recreate, transport=args.transport, language=args.language,
        fm_name=args.fm_name,
        # FIELDS only; ignored by the DOCKING/CONTAINER path.
        fields=('|'.join(args.fields) if args.fields else None),
        lines=args.lines, columns=args.columns, verify=not args.no_verify,
        fields_fm_name=args.fields_fm_name,
    )

    if result.get("installed"):
        print(f"[INSTALLED] {result['installed']}")
        print("[INFO] A generator function module was written to this SAP system "
              "($TMP, local, no transport). Remove it with SE37 if unwanted.")
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
