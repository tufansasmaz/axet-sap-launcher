"""Inspect the current SAP screen and dump all GUI elements.

Usage:
    python inspect_screen.py
    python inspect_screen.py --conn 0 --sess 0 --depth 3
    python inspect_screen.py --window 1  # Inspect popup
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
    attach_scripting_engine, get_session, walk_elements,
    get_session_info, find_element,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect current SAP screen elements.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    parser.add_argument("--depth", type=int, default=5, help="Max depth to traverse (default: 5)")
    parser.add_argument("--window", type=int, default=0, help="Window index (0=main, 1=popup)")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.conn, args.sess)

        info = get_session_info(session)
        print(f"Screen: {info['transaction']} / {info['program']} / Screen {info['screen_number']}")
        print(f"Window: wnd[{args.window}]")
        print()

        root = find_element(session, f"wnd[{args.window}]")
        if root is None:
            print(f"FAIL: Window wnd[{args.window}] not found.")
            sys.exit(1)

        elements = walk_elements(root, depth=0, max_depth=args.depth)

        # Print element tree
        for elem in elements:
            indent = "  " * elem["depth"]
            elem_type = elem.get("type", "?")
            elem_id = elem.get("id", "?")
            elem_text = elem.get("text", "")
            changeable = elem.get("changeable")

            # Truncate long text
            if len(elem_text) > 60:
                elem_text = elem_text[:57] + "..."

            flags = ""
            if changeable is True:
                flags = " [editable]"
            elif changeable is False:
                flags = " [readonly]"

            text_display = f' = "{elem_text}"' if elem_text else ""
            print(f"{indent}{elem_type}: {elem_id}{text_display}{flags}")

        print(f"\nTotal elements: {len(elements)}")

    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
