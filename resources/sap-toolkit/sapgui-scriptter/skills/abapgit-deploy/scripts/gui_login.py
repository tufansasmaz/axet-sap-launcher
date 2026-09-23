"""Read .conn_adt + open a SAP Logon connection and log in.

The plugin already speaks .conn_adt (the sap-adt / abapgit-bridge convention).
This script reads that file for user/password/client/language, then opens a
named SAP Logon entry and logs in via the connect_to_sap primitive.

If a session is already open for the same system, this is idempotent: it
returns the existing session without re-logging-in.

The SAP Logon entry NAME is independent of .conn_adt (which is REST-oriented),
so it's passed via --system or the SAP_GUI_SYSTEM env var. Default 'NPL'.

Usage:
    python gui_login.py --system "NPL"
    python gui_login.py --system "NPL [127.0.0.1]" --cwd D:/path/to/project
    python gui_login.py --system "NPL" --user SAP* --password Down1oad   # override
"""
from __future__ import annotations

import argparse
import os
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sap_gui_lib import (
    CONFIG, attach_scripting_engine, connect_to_system, get_session_info,
    log, mask_text,
)


def parse_conn_adt(cwd: Path) -> dict:
    """Read .conn_adt key=value pairs from the given working directory."""
    f = cwd / ".conn_adt"
    if not f.exists():
        return {}
    out: dict = {}
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip()
    return out


def find_existing_session(app, system_hint: str):
    """Return (conn_idx, session, conn) for any open session matching system_hint.
    Matches on connection Description (substring, case-insensitive)."""
    hint = (system_hint or "").lower()
    for i in range(app.Connections.Count):
        c = app.Connections.Item(i)
        desc = (c.Description or "").lower()
        if hint and hint in desc and c.Sessions.Count > 0:
            return i, c.Sessions.Item(0), c
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--system", default=os.getenv("SAP_GUI_SYSTEM", "NPL"),
                        help="SAP Logon entry name (default 'NPL' or "
                             "$SAP_GUI_SYSTEM)")
    parser.add_argument("--cwd", default=os.getcwd(),
                        help="Project directory containing .conn_adt "
                             "(default: current dir)")
    parser.add_argument("--user", help="SAP username (overrides .conn_adt)")
    parser.add_argument("--password", help="SAP password (overrides .conn_adt)")
    parser.add_argument("--client", help="SAP client (overrides .conn_adt)")
    parser.add_argument("--language", help="Logon language (overrides .conn_adt)")
    parser.add_argument("--no-sso", dest="sso", action="store_false",
                        help="Force password login even if SSO is configured")
    parser.set_defaults(sso=False)  # ADT-style password is the default for .conn_adt
    parser.add_argument("--reuse", action="store_true", default=True,
                        help="Reuse an existing logged-in session if one matches "
                             "the system name (default: enabled)")
    args = parser.parse_args()

    cwd = Path(args.cwd).resolve()
    conn = parse_conn_adt(cwd)

    user = args.user or conn.get("ADT_SAP_USER") or CONFIG.user
    password = args.password or conn.get("ADT_SAP_PASSWORD") or CONFIG.password
    client = args.client or conn.get("ADT_SAP_CLIENT") or CONFIG.client
    language = args.language or conn.get("ADT_SAP_LANGUAGE") or CONFIG.language

    if not user or not password:
        print("FAIL: missing user/password. Provide via .conn_adt "
              "(ADT_SAP_USER/PASSWORD), --user/--password, or env vars.",
              file=sys.stderr)
        return 2
    if not client:
        print("FAIL: missing client. Provide via .conn_adt "
              "(ADT_SAP_CLIENT) or --client.", file=sys.stderr)
        return 2

    # Try to reuse a logged-in session first
    if args.reuse:
        try:
            app = attach_scripting_engine()
            existing = find_existing_session(app, args.system)
            if existing is not None:
                conn_idx, session, c = existing
                info = get_session_info(session)
                print(f"OK: reusing existing session on connection [{conn_idx}]")
                print(f"    System:      {info['system']}")
                print(f"    Client:      {info['client']}")
                print(f"    User:        {mask_text(info['user'])}")
                print(f"    Transaction: {info['transaction']}")
                print(f"    (pass --no-reuse to force a new login)")
                return 0
        except Exception as exc:
            log.info("scripting engine probe before login: %s", exc)
            # Fall through to full login

    # No existing session - open a new connection and log in
    log.info("opening SAP Logon entry %r as user %r (client %s, language %s)",
             args.system, user, client, language)
    try:
        app, session, conn_idx = connect_to_system(
            system=args.system,
            client=client,
            user=user,
            password=password,
            language=language,
            sso=args.sso,
        )
    except Exception as exc:
        print(f"FAIL: login: {exc}", file=sys.stderr)
        print("hints:", file=sys.stderr)
        print("  - is the system name in SAP Logon spelled exactly as --system?",
              file=sys.stderr)
        print("  - is the SAP server reachable from this workstation?",
              file=sys.stderr)
        print("  - is SAP GUI Scripting enabled (server profile + client setting)?",
              file=sys.stderr)
        return 3

    info = get_session_info(session)
    print(f"OK: logged in to {args.system}")
    print(f"    Connection index: {conn_idx}")
    print(f"    System:           {info['system']}")
    print(f"    Client:           {info['client']}")
    print(f"    User:             {mask_text(info['user'])}")
    print(f"    Transaction:      {info['transaction']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
