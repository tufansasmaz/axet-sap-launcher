"""Verify SAP GUI is running and scripting is enabled.

Usage:
    python verify_gui_connection.py
"""

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
from sap_gui_lib import attach_scripting_engine, log


def main() -> None:
    try:
        app = attach_scripting_engine()
    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)

    conn_count = app.Children.Count
    print(f"OK: SAP GUI Scripting is active.")
    print(f"    Active connections: {conn_count}")

    for i in range(conn_count):
        conn = app.Children(i)
        sess_count = conn.Children.Count
        for j in range(sess_count):
            sess = conn.Children(j)
            try:
                info = sess.Info
                print(
                    f"    [{i}:{j}] System={info.SystemName} "
                    f"Client={info.Client} "
                    f"User={info.User} "
                    f"TCode={info.Transaction}"
                )
            except Exception as exc:
                print(f"    [{i}:{j}] (unable to read session info: {exc})")


if __name__ == "__main__":
    main()
