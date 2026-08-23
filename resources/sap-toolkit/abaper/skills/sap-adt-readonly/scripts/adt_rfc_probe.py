#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""RFC-over-SAProuter connectivity probe for systems where the SAProuter's
saprouttab permits native/message-mode SAP protocol traffic (DIAG, RFC) but
DENIES raw/native TCP tunneling to the ICM HTTP(S) port (error -94,
NIEROUT_PERM_DENIED). See PROJE-BILGI.md "BONY" bulgusu for the full story.

WHY THIS EXISTS
    SAP GUI reaches these systems fine because its DIAG connection is native
    SAP-protocol traffic, which this class of router explicitly allows.
    ADT's plain HTTPS to the ICM is raw TCP from the router's point of view,
    which the same router explicitly denies. An RFC connection (also native
    SAP protocol, same family as DIAG) is NOT denied — so we can reach the
    system via RFC and use the (community-documented, NOT an official SAP
    public API) function module SADT_REST_RFC_ENDPOINT to proxy ADT REST
    calls over that already-permitted RFC channel.

WHAT THIS SCRIPT DOES (read-only, safe to run first)
    1. Opens an RFC connection through the SAProuter using pyrfc.
    2. Calls RFC_PING to prove the RFC channel itself works.
    3. Calls RFC_GET_FUNCTION_INTERFACE for SADT_REST_RFC_ENDPOINT and prints
       its real parameter/field names on THIS system/release, because the
       community-sourced field names (REQUEST_LINE/HEADER_FIELDS/MESSAGE_BODY,
       STATUS_LINE) are not guaranteed identical across every NetWeaver
       release. adt_rfc_bridge.py assumes those names; if this probe shows
       different names, adjust adt_rfc_bridge.py's marshalling accordingly.
    4. Optionally (--try-call) makes one real SADT_REST_RFC_ENDPOINT call for
       GET /sap/bc/adt/discovery and prints the raw result, so you can see
       immediately whether the assumed field layout actually round-trips.

REQUIRES
    aXet SAP Launcher bundles its own Python + pyrfc + SAP NW RFC SDK
    (resources/rfc-runtime) and runs adt_rfc_bridge.py with that runtime
    automatically — you normally never need to install anything to use the
    RFC bridge. This probe script is a standalone diagnostic tool for running
    OUTSIDE the launcher (e.g. to inspect SADT_REST_RFC_ENDPOINT's real field
    names on a system, or to debug with your own Python). For that standalone
    use you need your own:
    - SAP NW RFC SDK ("SAP NetWeaver RFC Library"), a licensed SAP download.
      Free of extra cost, but gated behind a valid SAP S-user with download
      authorization: https://support.sap.com/en/product/connectors/nwrfcsdk.html
      Set SAPNWRFC_HOME to the extracted SDK folder before installing pyrfc.
    - pip install pyrfc   (after SAPNWRFC_HOME is set; it compiles against
      the SDK's headers/libs, so a C/C++ toolchain matching your Python must
      be available too)

USAGE
    ADT_CWD=<dir-with-.conn_adt> py adt_rfc_probe.py [--try-call]
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("[FAIL] python-dotenv not installed. pip install python-dotenv", file=sys.stderr)
    sys.exit(1)


def _ensure_sapnwrfc_dll_dir() -> None:
    """Two independent DLL-search mechanisms need SAPNWRFC_HOME/lib:
    1. Python >=3.8's own extension-module loader (pyrfc's _cyrfc.pyd) no
       longer searches PATH (PEP 3118 / bpo-36085) -- needs os.add_dll_directory().
    2. sapnwrfc.dll's OWN internal LoadLibrary calls for its ICU dependencies
       (icuuc50.dll/icudt50.dll/icuin50.dll), made deep inside the native RFC
       runtime when a Connection is actually opened, are classic LoadLibrary
       calls that only honour the process PATH -- add_dll_directory() does not
       cover those, so PATH must be extended too, or you get a native
       'Could not open the ICU common library' error at logon time (not at
       import time), pointing at [nlsui0.c] / SAP note 519753."""
    if sys.platform != "win32":
        return
    home = os.getenv("SAPNWRFC_HOME")
    if not home:
        return
    lib_dir = Path(home) / "lib"
    if not lib_dir.is_dir():
        return
    try:
        os.add_dll_directory(str(lib_dir))
    except (AttributeError, OSError):
        pass
    lib_dir_str = str(lib_dir)
    path = os.environ.get("PATH", "")
    if lib_dir_str not in path.split(os.pathsep):
        os.environ["PATH"] = lib_dir_str + os.pathsep + path


def find_conn_file() -> Path:
    """Mirrors sap_adt_lib.find_conn_file()'s search order, kept standalone so
    this probe has zero dependency on the heavier ADT HTTP client module."""
    for env_var in ("CLAUDE_CWD", "INIT_CWD", "COPILOT_CWD", "ADT_CWD"):
        value = os.getenv(env_var)
        if value:
            p = Path(value)
            if p.exists():
                candidate = p.resolve() / ".conn_adt"
                if candidate.exists():
                    return candidate
    cwd_candidate = Path.cwd().resolve() / ".conn_adt"
    if cwd_candidate.exists():
        return cwd_candidate
    value = os.getenv("PWD")
    if value:
        p = Path(value)
        if p.exists():
            candidate = p.resolve() / ".conn_adt"
            if candidate.exists():
                return candidate
    return cwd_candidate


def load_rfc_config() -> dict:
    conn_path = find_conn_file()
    if not conn_path.exists():
        print(f"[FAIL] .conn_adt not found (looked at {conn_path}). Connect via aXet SAP Launcher first.", file=sys.stderr)
        sys.exit(1)
    load_dotenv(dotenv_path=conn_path)

    if os.getenv("ADT_RFC_MODE", "").lower() not in ("true", "1", "yes"):
        print(
            "[FAIL] ADT_RFC_MODE is not set to true in .conn_adt — this system was not "
            "flagged by aXet SAP Launcher as needing the RFC bridge. If you believe it "
            "does, add ADT_RFC_MODE=true, ADT_RFC_ASHOST, ADT_RFC_SYSNR, ADT_RFC_SAPROUTER "
            "manually to .conn_adt.",
            file=sys.stderr,
        )
        sys.exit(1)

    cfg = {
        "ashost": os.getenv("ADT_RFC_ASHOST"),
        "sysnr": os.getenv("ADT_RFC_SYSNR", "00"),
        "client": os.getenv("ADT_SAP_CLIENT", "").strip() or "000",
        "user": os.getenv("ADT_SAP_USER"),
        "passwd": os.getenv("ADT_SAP_PASSWORD"),
        "lang": os.getenv("ADT_SAP_LANGUAGE", "EN"),
        "saprouter": os.getenv("ADT_RFC_SAPROUTER"),
    }
    missing = [k for k in ("ashost", "user", "passwd", "saprouter") if not cfg.get(k)]
    if missing:
        print(f"[FAIL] .conn_adt is missing RFC fields: {missing}", file=sys.stderr)
        sys.exit(1)
    return cfg


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--try-call", action="store_true", help="also attempt one real SADT_REST_RFC_ENDPOINT call")
    args = ap.parse_args()

    cfg = load_rfc_config()

    _ensure_sapnwrfc_dll_dir()
    try:
        import pyrfc
    except ImportError as exc:
        print(
            "[FAIL] pyrfc is not installed/importable: " + str(exc) + "\n"
            "  This almost always means the SAP NW RFC SDK is missing or SAPNWRFC_HOME\n"
            "  is not set. See SKILL.md 'Router-only sistemler (RFC bridge)' section for\n"
            "  the exact setup steps (SDK download requires your own SAP S-user).",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"[+] Connecting via RFC: ashost={cfg['ashost']} sysnr={cfg['sysnr']} "
          f"client={cfg['client']} saprouter={cfg['saprouter']}")
    try:
        conn = pyrfc.Connection(
            ashost=cfg["ashost"],
            sysnr=cfg["sysnr"],
            client=cfg["client"],
            user=cfg["user"],
            passwd=cfg["passwd"],
            lang=cfg["lang"],
            saprouter=cfg["saprouter"],
        )
    except Exception as exc:  # pyrfc raises its own error types; keep this broad and print verbatim
        print(f"[FAIL] RFC logon failed: {exc}", file=sys.stderr)
        sys.exit(1)

    print("[+] RFC connection established.")

    try:
        conn.call("RFC_PING")
        print("[OK] RFC_PING succeeded — the RFC channel through the SAProuter works.")
    except Exception as exc:
        print(f"[FAIL] RFC_PING failed even though logon succeeded: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        iface = conn.call("RFC_GET_FUNCTION_INTERFACE", FUNCNAME="SADT_REST_RFC_ENDPOINT")
        params = iface.get("PARAMS", [])
        if not params:
            print("[WARN] RFC_GET_FUNCTION_INTERFACE returned no PARAMS — function module "
                  "may not exist on this system, or you lack S_RFC authorization for it.")
        else:
            print(f"[OK] SADT_REST_RFC_ENDPOINT exists. Parameters ({len(params)}):")
            for p in params:
                print(f"    {p.get('PARAMETER', '?'):<20} type={p.get('PARAMCLASS', '?'):<5} "
                      f"struct={p.get('STRUCTURE', '') or '-'}")
        print(
            "\n[!] IMPORTANT: adt_rfc_bridge.py assumes REQUEST/RESPONSE substructures named\n"
            "    REQUEST_LINE{METHOD,URI,VERSION}, HEADER_FIELDS[]{NAME,VALUE}, MESSAGE_BODY,\n"
            "    STATUS_LINE{VERSION,STATUS_CODE,REASON_PHRASE} — these are community-sourced\n"
            "    (NOT an official SAP public API), confirm against the PARAMETER/STRUCTURE\n"
            "    names printed above before trusting the bridge on this system."
        )
    except Exception as exc:
        print(f"[WARN] Could not introspect SADT_REST_RFC_ENDPOINT: {exc}\n"
              "    This may mean it doesn't exist on this system/release, or you lack\n"
              "    S_RFC authorization for it (see SAP KBA 3569684).", file=sys.stderr)

    if args.try_call:
        print("\n[+] Attempting one real SADT_REST_RFC_ENDPOINT call (GET /sap/bc/adt/discovery)...")
        try:
            result = conn.call(
                "SADT_REST_RFC_ENDPOINT",
                REQUEST={
                    "REQUEST_LINE": {"METHOD": "GET", "URI": "/sap/bc/adt/discovery", "VERSION": "HTTP/1.1"},
                    "HEADER_FIELDS": [{"NAME": "Accept", "VALUE": "*/*"}],
                    "MESSAGE_BODY": b"",
                },
            )
            print("[OK] Call succeeded. Raw result:")
            print(result)
        except Exception as exc:
            print(f"[FAIL] SADT_REST_RFC_ENDPOINT call failed: {exc}\n"
                  "    If this is a field-name mismatch, use the PARAMS printout above to\n"
                  "    fix adt_rfc_bridge.py's REQUEST/RESPONSE structure field names.",
                  file=sys.stderr)
            sys.exit(1)

    conn.close()
    print("\n[+] Probe finished. If RFC_PING and the interface introspection both succeeded,\n"
          "    adt_rfc_bridge.py should work — start it next (see SKILL.md).")


if __name__ == "__main__":
    main()
