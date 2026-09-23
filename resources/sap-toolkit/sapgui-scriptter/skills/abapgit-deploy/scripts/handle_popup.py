"""Handle a popup window (dismiss, confirm, or cancel).

Usage:
    python handle_popup.py --action enter     # Press Enter (confirm)
    python handle_popup.py --action cancel    # Press Cancel (F12)
    python handle_popup.py --action yes       # Press Yes button
    python handle_popup.py --action no        # Press No button
    python handle_popup.py --action back      # Press Back (F3)
    python handle_popup.py --read             # Just read popup text without acting
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
from sap_gui_lib import attach_scripting_engine, get_session, find_element


VKEY_ACTIONS = {
    "enter": 0,
    "back": 3,
    "cancel": 12,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Handle popup window.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    parser.add_argument("--window", type=int, default=1, help="Popup window index (default: 1)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--action", choices=["enter", "cancel", "yes", "no", "back"],
                       help="Action to perform")
    group.add_argument("--read", action="store_true", help="Just read popup text")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.conn, args.sess)

        popup = find_element(session, f"wnd[{args.window}]")
        if popup is None:
            print(f"No popup found at wnd[{args.window}].")
            return

        popup_text = popup.Text.strip()
        print(f"Popup wnd[{args.window}]: \"{popup_text}\"")

        # Try to read popup body text
        for path in [
            f"wnd[{args.window}]/usr/txtMESSTXT1",
            f"wnd[{args.window}]/usr/txtMESSTXT2",
            f"wnd[{args.window}]/usr/txtSPOP-TEXTLINE1",
            f"wnd[{args.window}]/usr/txtSPOP-TEXTLINE2",
        ]:
            elem = find_element(session, path)
            if elem and elem.Text.strip():
                print(f"  Body: {elem.Text.strip()}")

        if args.read:
            return

        if args.action in VKEY_ACTIONS:
            popup.sendVKey(VKEY_ACTIONS[args.action])
            print(f"OK: Sent {args.action} to popup")
        elif args.action == "yes":
            # Try common Yes button IDs
            for btn_id in [
                f"wnd[{args.window}]/usr/btnSPOP-OPTION1",
                f"wnd[{args.window}]/tbar[0]/btn[0]",
            ]:
                btn = find_element(session, btn_id)
                if btn:
                    btn.press()
                    print(f"OK: Pressed Yes ({btn_id})")
                    return
            # Fallback: Enter
            popup.sendVKey(0)
            print("OK: Pressed Enter (Yes button not found)")
        elif args.action == "no":
            for btn_id in [
                f"wnd[{args.window}]/usr/btnSPOP-OPTION2",
                f"wnd[{args.window}]/tbar[0]/btn[1]",
            ]:
                btn = find_element(session, btn_id)
                if btn:
                    btn.press()
                    print(f"OK: Pressed No ({btn_id})")
                    return
            popup.sendVKey(12)
            print("OK: Pressed Cancel (No button not found)")

    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
