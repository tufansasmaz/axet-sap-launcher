"""Navigate to a SAP transaction code.

Usage:
    python navigate_transaction.py --tcode SE16N
    python navigate_transaction.py --conn 0 --sess 0 --tcode VA03
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
    attach_scripting_engine, get_session, navigate_to_transaction,
    get_session_info, read_status_bar,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Navigate to a transaction code.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    parser.add_argument("--tcode", required=True, help="Transaction code")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.conn, args.sess)
        navigate_to_transaction(session, args.tcode)

        info = get_session_info(session)
        sbar = read_status_bar(session)

        print(f"OK: Navigated to {args.tcode}")
        print(f"    Current transaction: {info['transaction']}")
        print(f"    Program: {info['program']}")
        print(f"    Screen: {info['screen_number']}")
        if sbar["text"]:
            print(f"    Status [{sbar['type']}]: {sbar['text']}")
    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
