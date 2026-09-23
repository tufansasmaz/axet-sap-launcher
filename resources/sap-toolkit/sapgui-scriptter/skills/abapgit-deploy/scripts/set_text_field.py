"""Set the value of a text field or context field.

Usage:
    python set_text_field.py --id "wnd[0]/usr/ctxtGD-TAB" --value "VBAK"
    python set_text_field.py --id "wnd[0]/usr/txtRSYST-MANDT" --value "000"
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
from sap_gui_lib import attach_scripting_engine, get_session, set_text


def main() -> None:
    parser = argparse.ArgumentParser(description="Set text field value.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    parser.add_argument("--id", required=True, help="Element ID")
    parser.add_argument("--value", required=True, help="Value to set")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.conn, args.sess)
        set_text(session, args.id, args.value)
        print(f"OK: Set {args.id} = '{args.value}'")
    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
