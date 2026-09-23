"""Open ZABAPGIT_STANDALONE in a SAPGUI session and wait for the abapGit GUI.

Drives a connected SAPGUI session to:
  1. Navigate to SE38
  2. Enter ZABAPGIT_STANDALONE
  3. F8 to execute
  4. Wait until the abapGit HTML viewer is rendered (Repository List visible)

Returns 0 if the GUI opened cleanly, non-zero if anything blocked.

Usage:
    python gui_open_zabapgit_standalone.py
    python gui_open_zabapgit_standalone.py --session-index 0
"""
from __future__ import annotations

import argparse
import os
import sys
import time

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
    CONFIG, attach_scripting_engine, find_element, get_session, log,
)


# How long to wait for the HTML viewer to render after F8
HTML_READY_TIMEOUT = 15.0
HTML_READY_POLL = 0.5

# IDs we look for once the abapGit GUI is up. The exact path depends on
# how ZABAPGIT_STANDALONE wraps its HTML viewer; on NW 7.52 it's just
# /usr/shell, but other versions use a named container. We probe in order.
HTML_VIEWER_CANDIDATES = (
    "wnd[0]/usr/shell",
    "wnd[0]/usr/cntlGUI_CONTAINER/shellcont/shell",
    "wnd[0]/usr/cntlMAIN/shellcont/shell",
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--connection-index", type=int, default=0,
                        help="Which SAPGUI connection to use (default 0)")
    parser.add_argument("--session-index", type=int, default=0,
                        help="Which session within the connection (default 0)")
    parser.add_argument("--program", default="ZABAPGIT_STANDALONE",
                        help="Program name (default ZABAPGIT_STANDALONE)")
    args = parser.parse_args()

    try:
        app = attach_scripting_engine()
    except Exception as exc:
        print(f"FAIL: cannot attach to SAPGUI scripting engine: {exc}",
              file=sys.stderr)
        print("hint: make sure SAPGUI is running. Open SAP Logon if it's closed.",
              file=sys.stderr)
        return 2

    # Pre-check the connection's server-side scripting flag before grabbing a
    # session - DisabledByServer=True means the customer hasn't set
    # sapgui/user_scripting = TRUE in DEFAULT.PFL. NEVER fix this from the
    # script - it's a basis-team operation. Fall back to manual cycle.
    if app.Connections.Count == 0:
        print("FAIL: no SAPGUI connections open. Log in to your SAP system "
              "via SAP Logon first, then re-run.", file=sys.stderr)
        return 2

    conn = app.Connections.Item(args.connection_index)
    if getattr(conn, "DisabledByServer", False):
        print("FAIL: SAP GUI Scripting is DISABLED on the server "
              "(DisabledByServer=True).", file=sys.stderr)
        print("", file=sys.stderr)
        print("Action required (basis team, not this script):", file=sys.stderr)
        print("  Add to <SID>/SYS/profile/DEFAULT.PFL:", file=sys.stderr)
        print("    sapgui/user_scripting = TRUE", file=sys.stderr)
        print("  Then restart SAP for the parameter to take effect.",
              file=sys.stderr)
        print("", file=sys.stderr)
        print("Until that's done, use the manual cycle from abapgit-bridge:",
              file=sys.stderr)
        print("  /abapgit-export-zip   then  /abapgit-howto", file=sys.stderr)
        return 4

    try:
        session = get_session(app, args.connection_index, args.session_index)
    except Exception as exc:
        print(f"FAIL: cannot attach to SAPGUI session "
              f"({args.connection_index}, {args.session_index}): {exc}",
              file=sys.stderr)
        print("hint: make sure you're logged in to a SAPGUI session.",
              file=sys.stderr)
        return 2

    log.info("attached to session, current transaction=%s",
             session.Info.Transaction)

    # 1. Send /nSE38 to navigate (the /n prefix discards any current screen state)
    try:
        session.findById("wnd[0]/tbar[0]/okcd").text = "/nSE38"
        session.findById("wnd[0]").sendVKey(0)
    except Exception as exc:
        print(f"FAIL: SE38 navigate: {exc}", file=sys.stderr)
        return 3

    time.sleep(0.5)

    # 2. Enter program name and F8
    try:
        prog_field = find_element(session, "wnd[0]/usr/ctxtRS38M-PROGRAMM")
        if prog_field is None:
            print("FAIL: SE38 program field not found - SE38 didn't open as expected",
                  file=sys.stderr)
            return 3
        prog_field.text = args.program
        # F8 = Execute (vkey 8)
        session.findById("wnd[0]").sendVKey(8)
    except Exception as exc:
        print(f"FAIL: enter program + F8: {exc}", file=sys.stderr)
        return 3

    # 3. Wait for the abapGit HTML viewer to render
    deadline = time.time() + HTML_READY_TIMEOUT
    viewer = None
    while time.time() < deadline:
        for cand in HTML_VIEWER_CANDIDATES:
            v = find_element(session, cand)
            if v is not None:
                viewer = v
                break
        if viewer is not None:
            break
        time.sleep(HTML_READY_POLL)

    if viewer is None:
        print("FAIL: abapGit HTML viewer didn't appear within "
              f"{HTML_READY_TIMEOUT}s. is the standalone activated?",
              file=sys.stderr)
        return 3

    log.info("abapGit standalone is open; HTML viewer ID = %s", viewer.Id)
    print(f"OK: ZABAPGIT_STANDALONE running, viewer={viewer.Id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
