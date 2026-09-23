"""List all active SAP GUI connections and sessions.

Usage:
    python list_sessions.py
    python list_sessions.py --no-mask
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
from sap_gui_lib import attach_scripting_engine, mask_text, format_table


def main() -> None:
    parser = argparse.ArgumentParser(description="List active SAP GUI sessions.")
    parser.add_argument("--no-mask", action="store_true", help="Show unmasked user/client")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)

    conn_count = app.Children.Count
    if conn_count == 0:
        print("No active SAP connections.")
        return

    headers = ["Conn", "Sess", "System", "Client", "User", "Transaction", "Program"]
    rows = []

    for i in range(conn_count):
        conn = app.Children(i)
        for j in range(conn.Children.Count):
            sess = conn.Children(j)
            try:
                info = sess.Info
                do_mask = not args.no_mask
                rows.append([
                    str(i),
                    str(j),
                    getattr(info, "SystemName", ""),
                    mask_text(getattr(info, "Client", ""), do_mask),
                    mask_text(getattr(info, "User", ""), do_mask),
                    getattr(info, "Transaction", ""),
                    getattr(info, "Program", ""),
                ])
            except Exception:
                rows.append([str(i), str(j), "?", "?", "?", "?", "?"])

    print(f"Active SAP sessions ({len(rows)}):\n")
    print(format_table(headers, rows))


if __name__ == "__main__":
    main()
