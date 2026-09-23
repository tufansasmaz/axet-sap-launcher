"""Read the SAP status bar message.

Usage:
    python read_status_bar.py
    python read_status_bar.py --conn 0 --sess 0
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
from sap_gui_lib import attach_scripting_engine, get_session, read_status_bar


TYPE_LABELS = {
    "S": "Success",
    "W": "Warning",
    "E": "Error",
    "A": "Abort",
    "I": "Information",
    "": "(none)",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Read status bar message.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.conn, args.sess)
        sbar = read_status_bar(session)

        msg_type = sbar["type"]
        label = TYPE_LABELS.get(msg_type, msg_type)

        print(f"Status Bar:")
        print(f"  Type: {msg_type} ({label})")
        print(f"  Text: {sbar['text']}")
        if sbar["id"]:
            print(f"  Message ID: {sbar['id']}")
        if sbar["number"]:
            print(f"  Message Number: {sbar['number']}")

    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
