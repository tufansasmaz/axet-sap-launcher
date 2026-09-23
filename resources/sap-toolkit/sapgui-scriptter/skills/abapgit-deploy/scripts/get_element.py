"""Get detailed information about a specific GUI element.

Usage:
    python get_element.py --id "wnd[0]/usr/txtRSYST-MANDT"
    python get_element.py --id "wnd[0]/sbar"
    python get_element.py --id "wnd[0]/usr/cntlGRID/shellcont/shell"
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


PROPERTIES = [
    "Id", "Type", "Name", "Text", "Tooltip",
    "Changeable", "Visible", "Modified",
    "Left", "Top", "Width", "Height",
    "IconName", "DefaultTooltip",
    "MaxLength", "Highlighted", "IsSymbolFont",
    "RowCount", "ColumnCount", "VisibleRowCount",
    "CurrentRow", "CurrentColumn",
    "Key", "Value", "Selected",
    "MessageType", "MessageId", "MessageNumber",
    "CharLeft", "CharTop", "CharWidth", "CharHeight",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Get element properties.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    parser.add_argument("--id", required=True, help="Element ID")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.conn, args.sess)

        elem = find_element(session, args.id)
        if elem is None:
            print(f"FAIL: Element not found: {args.id}")
            sys.exit(1)

        print(f"Element: {args.id}\n")
        for prop in PROPERTIES:
            try:
                val = getattr(elem, prop)
                if val is not None and str(val).strip():
                    print(f"  {prop}: {val}")
            except Exception:
                pass

        # Check for children
        try:
            children = elem.Children
            if children and children.Count > 0:
                print(f"\n  Children: {children.Count}")
                for i in range(min(children.Count, 20)):
                    try:
                        child = children(i)
                        child_type = getattr(child, "Type", "?")
                        child_id = getattr(child, "Id", "?")
                        child_text = getattr(child, "Text", "")
                        if len(child_text) > 40:
                            child_text = child_text[:37] + "..."
                        print(f"    [{i}] {child_type}: {child_id} = \"{child_text}\"")
                    except Exception:
                        pass
        except Exception:
            pass

    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
