"""Open a new SAP GUI connection and log in.

Usage:
    python connect_to_sap.py --system "NPL [127.0.0.1]" --client 000
    python connect_to_sap.py --system "NPL [127.0.0.1]" --client 000 --no-sso --user SAP* --password Down1oad
    python connect_to_sap.py  # Uses environment variables
"""

import argparse
import sys
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sap_gui_lib import (
    CONFIG, connect_to_system, get_session_info, mask_text, log,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Open a new SAP GUI connection.")
    parser.add_argument("--system", default=CONFIG.system, help="SAP Logon entry name")
    parser.add_argument("--client", default=CONFIG.client, help="SAP client number")
    parser.add_argument("--user", default=CONFIG.user, help="SAP username")
    parser.add_argument("--password", default=CONFIG.password, help="SAP password")
    parser.add_argument("--language", default=CONFIG.language, help="Logon language")
    parser.add_argument("--no-sso", dest="sso", action="store_false", help="Use password login")
    parser.set_defaults(sso=CONFIG.sso)
    args = parser.parse_args()

    try:
        app, session, conn_idx = connect_to_system(
            system=args.system,
            client=args.client,
            user=args.user,
            password=args.password,
            language=args.language,
            sso=args.sso,
        )
        info = get_session_info(session)
        print(f"OK: Connected to {info['system']}")
        print(f"    Connection index: {conn_idx}")
        print(f"    Client: {info['client']}")
        print(f"    User: {mask_text(info['user'])}")
        print(f"    Transaction: {info['transaction']}")
        print(f"    Response time: {info['response_time']} ms")
    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
