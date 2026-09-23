"""Send a virtual key (Enter, F8, etc.) to the SAP GUI window.

Usage:
    python send_vkey.py --vkey 0       # Enter
    python send_vkey.py --vkey 8       # F8 (Execute)
    python send_vkey.py --vkey 11      # Ctrl+S (Save)
    python send_vkey.py --vkey 3       # F3 (Back)
    python send_vkey.py --vkey 8 --window 1  # F8 on popup window
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
    attach_scripting_engine, get_session, send_vkey, read_status_bar,
)

VKEY_NAMES = {
    0: "Enter", 1: "F1", 2: "F2", 3: "F3 (Back)", 4: "F4",
    5: "F5", 6: "F6", 7: "F7", 8: "F8 (Execute)", 9: "F9",
    10: "F10", 11: "Ctrl+S (Save)", 12: "F12 (Cancel)",
    13: "Shift+F1", 14: "Shift+F2", 15: "Shift+F3 (Exit)",
    16: "Shift+F4", 17: "Ctrl+F (Find)", 18: "Ctrl+G (Continue Find)",
    19: "Ctrl+P (Print)", 71: "Ctrl+Shift+F3 (Delete)",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a virtual key.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    parser.add_argument("--vkey", type=int, required=True, help="Virtual key number")
    parser.add_argument("--window", type=int, default=0, help="Window index (0=main, 1=popup)")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.conn, args.sess)
        key_name = VKEY_NAMES.get(args.vkey, f"VKey {args.vkey}")
        send_vkey(session, args.vkey, args.window)

        sbar = read_status_bar(session)
        print(f"OK: Sent {key_name} to wnd[{args.window}]")
        if sbar["text"]:
            print(f"    Status [{sbar['type']}]: {sbar['text']}")
    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
