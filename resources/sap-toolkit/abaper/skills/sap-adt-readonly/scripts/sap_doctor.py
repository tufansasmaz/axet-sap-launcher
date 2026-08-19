#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""sap_doctor.py - layered SAP connection/environment diagnostic.

Answers "is it the connection, VPN, auth, config, or the object?" in one command.
Each layer is isolated; a failure in one still lets the others run.

Layers:
  1. .conn_adt present + required fields filled
  2. Python deps + sap_client/sap_adt_lib import OK
  3. Live connection + auth (CSRF/discovery probe; distinguishes auth vs VPN vs SAML)
  4. Authenticated ADT probe (optional --probe object) - catches SAML/auth walls
  5. Package access (default ZAI) - can we actually read the working package
  6. Write mode (ADT_READONLY flag) - is this .conn_adt marked read-only

Usage:
    python sap_doctor.py --cwd /path/to/project
    python sap_doctor.py --package ZAI --probe ZAI_CL_AI_CONFIG_DAO --type class --cwd C:/proj

Adapted from the TRAKYA_DOKUM sap_doctor (single-.conn_adt model; no tier file).
"""
from __future__ import annotations

import argparse
import contextlib
import io
import sys
from pathlib import Path

# Only when run as a CLI — NOT when imported (e.g. by the MCP server), where
# reassigning sys.stdout would disturb the stdio JSON-RPC channel.
if sys.platform == 'win32' and __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

OK, FAIL, WARN, INFO = "[OK]  ", "[FAIL]", "[WARN]", "[INFO]"
_REQUIRED_BASE = ("ADT_SAP_URL", "ADT_SAP_USER", "ADT_SAP_PASSWORD")
_CLIENT_FIELD = "ADT_SAP_CLIENT"
_SAML_URL_PATTERNS = (".s4hana.cloud.sap", ".cloud.sap", ".hana.ondemand.com")


def _looks_like_saml_or_cloud(conn: dict) -> bool:
    """True if this .conn_adt is a SAML SSO / BTP Cloud system, where
    ADT_SAP_CLIENT is meaningless (SAML authenticates via browser cookies,
    service-key auth has its own path) and must not be treated as a missing
    required field."""
    if conn.get("ADT_BTP_AUTH_TYPE", "").lower() == "saml":
        return True
    if conn.get("ADT_SAML_COOKIES_FILE") or conn.get("ADT_BTP_SERVICE_KEY_PATH"):
        return True
    url = conn.get("ADT_SAP_URL", "").lower()
    return any(p in url for p in _SAML_URL_PATTERNS)


def _conn_path(cwd: str | None) -> Path | None:
    base = Path(cwd) if cwd else Path.cwd()
    p = base / ".conn_adt"
    return p if p.exists() else None


def _parse_conn(p: Path) -> dict:
    d = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if "=" in s and not s.startswith("#"):
            k, v = s.split("=", 1)
            d[k.strip()] = v.strip()
    return d


def run(cwd, package, probe, ptype):
    results = []

    # 1. .conn_adt + fields
    cp = _conn_path(cwd)
    conn = {}
    missing = [_CLIENT_FIELD]  # any non-empty placeholder — overwritten below when cp exists
    if not cp:
        results.append((FAIL, f".conn_adt not found in {cwd or Path.cwd()}"))
    else:
        conn = _parse_conn(cp)
        required = list(_REQUIRED_BASE)
        if not _looks_like_saml_or_cloud(conn):
            required.append(_CLIENT_FIELD)
        missing = [k for k in required if not conn.get(k)]
        if missing:
            results.append((FAIL, f".conn_adt missing field(s): {', '.join(missing)}"))
        else:
            results.append((OK, f".conn_adt OK ({cp})  URL={conn.get('ADT_SAP_URL','?')} "
                                f"client={conn.get('ADT_SAP_CLIENT','?')} user={conn.get('ADT_SAP_USER','?')}"))

    # 2. Imports
    SAPClient = None
    try:
        from sap_adt_lib import set_explicit_working_dir  # noqa
        from sap_client import SAPClient as _SC
        SAPClient = _SC
        if cwd:
            set_explicit_working_dir(cwd)
        results.append((OK, "Python modules import OK (sap_adt_lib, sap_client)"))
    except Exception as exc:
        results.append((FAIL, f"Module import failed: {type(exc).__name__}: {exc} "
                              f"(install deps: pip install -r requirements.txt)"))

    # 3-5. Live probes (only if imports worked and config present)
    if SAPClient and cp and not missing:
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                client = SAPClient()
                client.adt_client.fetch_csrf_token()
            results.append((OK, "SAP connection + auth OK (VPN reachable, credentials accepted)"))

            # 4. Authenticated probe
            if probe:
                try:
                    with contextlib.redirect_stdout(io.StringIO()):
                        md = client.get_object_metadata(probe, object_type=ptype)
                    if md:
                        results.append((OK, f"Authenticated ADT probe OK ({probe})"))
                    else:
                        results.append((WARN, f"Probe object {probe} ({ptype}) not found - "
                                              f"connection OK, object missing or wrong type"))
                except Exception as exc:
                    results.append((WARN, f"Probe {probe} error: {type(exc).__name__}: {str(exc)[:120]}"))

            # 5. Package access
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    contents = client.list_package_contents(package)
                n = len(contents) if contents else 0
                if n > 0:
                    results.append((OK, f"Package {package} accessible ({n} object(s) listed)"))
                else:
                    results.append((WARN, f"Package {package} returned no objects - "
                                          f"empty package or no read access"))
            except Exception as exc:
                results.append((WARN, f"Package {package} access error: {type(exc).__name__}: {str(exc)[:120]}"))

        except Exception as exc:
            name = type(exc).__name__
            msg = str(exc)
            if "SAML SSO" in msg or "login_saml_sso.py" in msg:
                # Root-fixed: fetch_csrf_token() now raises this distinctly (an
                # HTML IdP login page, not a dropped VPN/connection) — surface it
                # as-is instead of falling through to the generic Auth/Connection
                # buckets below, which used to show a misleading "is the VPN up?"
                # hint for what is actually a SAML wall.
                results.append((FAIL, f"SAML SSO required: {msg}"))
            elif "Auth" in name:
                results.append((FAIL, f"SAP auth failed: {exc}  -> check user/password/client"))
            elif "Connection" in name or "Timeout" in name:
                results.append((FAIL, f"SAP connection failed: {exc}  -> is the VPN up? host/port reachable?"))
            elif "ParseError" in name:
                results.append((FAIL, f"Got HTML instead of ADT XML (SAML wall?): {exc}  "
                                      f"-> run login_saml_sso.py for BTP Cloud"))
            else:
                results.append((FAIL, f"SAP probe error ({name}): {str(exc)[:160]}"))

    # 6. Write mode
    try:
        from guardrails import is_readonly
        if is_readonly():
            results.append((WARN, "ADT_READONLY is SET - all create/push/delete will be refused (read-only mode)"))
        else:
            results.append((INFO, "Write mode: ENABLED (ADT_READONLY not set)"))
    except Exception:
        pass

    # Report
    print("=" * 64)
    print("SAP DOCTOR - connection/environment diagnostic")
    print("=" * 64)
    for tag, msg in results:
        print(f"  {tag} {msg}")
    print("-" * 64)
    n_fail = sum(1 for t, _ in results if t == FAIL)
    n_warn = sum(1 for t, _ in results if t == WARN)
    if n_fail:
        print(f"RESULT: {n_fail} CRITICAL issue(s), {n_warn} warning(s) - fix before any SAP operation.")
        return 1
    if n_warn:
        print(f"RESULT: OK ({n_warn} warning(s)) - safe to proceed.")
        return 0
    print("RESULT: all layers OK - ready for SAP operations.")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Layered SAP connection/environment diagnostic")
    ap.add_argument("--cwd", help="Working directory containing .conn_adt")
    ap.add_argument("--package", default="ZAI", help="Package to verify read access (default: ZAI)")
    ap.add_argument("--probe", help="Optional object name for an authenticated ADT probe")
    ap.add_argument("--type", default="class", help="Probe object type (default: class)")
    args = ap.parse_args()
    return run(args.cwd, args.package, args.probe, args.type)


if __name__ == "__main__":
    raise SystemExit(main())
