"""Stage all + Commit on the current abapGit Stage view.

Pre-condition: gui_import_zip.py just succeeded - the abapGit Stage view is
visible in the HTML viewer with files marked for import.

Drives:
  1. sapevent:stage_all - mark every file for inclusion
  2. sapevent:commit - opens the commit dialog
  3. Fill commit message + author + email in the dialog (SAPGUI controls)
  4. Submit

Usage:
    python gui_stage_commit.py --message "round 1: feat(zcl_foo) add greet"
    python gui_stage_commit.py --message "..." --author "Claude" --email "ai@local"

Status: v0.1 - functional scaffold. Live-test on NPL VM.
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
    attach_scripting_engine, find_element, get_session, log,
)
from gui_import_zip import find_html_viewer, trigger_sapevent  # type: ignore


COMMIT_DIALOG_TIMEOUT = 10.0
COMMIT_DIALOG_POLL = 0.5


def fill_commit_dialog(session, message: str, author: str, email: str) -> bool:
    """abapGit's Commit dialog appears at wnd[1]. Standard SAPGUI fields."""
    deadline = time.time() + COMMIT_DIALOG_TIMEOUT
    while time.time() < deadline:
        if find_element(session, "wnd[1]") is not None:
            break
        time.sleep(COMMIT_DIALOG_POLL)
    else:
        return False

    # Field IDs are abapGit-specific. v0.1 attempts the most common patterns;
    # refine after live-test.
    msg_field_candidates = (
        "wnd[1]/usr/txtCOMMENT",
        "wnd[1]/usr/txtMESSAGE",
        "wnd[1]/usr/ctxtCOMMENT",
    )
    author_field_candidates = (
        "wnd[1]/usr/txtAUTHOR",
        "wnd[1]/usr/ctxtAUTHOR",
    )
    email_field_candidates = (
        "wnd[1]/usr/txtEMAIL",
        "wnd[1]/usr/ctxtEMAIL",
    )

    def set_first(ids, value):
        for fid in ids:
            fld = find_element(session, fid)
            if fld is not None:
                fld.text = value
                return True
        return False

    if not set_first(msg_field_candidates, message):
        log.warning("commit message field not found by known IDs; "
                    "try inspect_screen.py to identify the actual ID")
        return False

    set_first(author_field_candidates, author)
    set_first(email_field_candidates, email)

    # Submit (Enter / Continue)
    session.findById("wnd[1]").sendVKey(0)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--message", required=True, help="Commit message")
    parser.add_argument("--author", default="Claude (sapgui-scriptter)",
                        help="Commit author name")
    parser.add_argument("--email", default="ai@local",
                        help="Commit author email")
    parser.add_argument("--connection-index", type=int, default=0)
    parser.add_argument("--session-index", type=int, default=0)
    args = parser.parse_args()

    # AXET-TIER-GATE (aXet launcher adaptation): SAP writes only on a DEV system.
    from tier_gate import require_dev_tier
    refused = require_dev_tier()
    if refused:
        print(refused, file=sys.stderr)
        return 2

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.connection_index, args.session_index)
    except Exception as exc:
        print(f"FAIL: attach to SAPGUI: {exc}", file=sys.stderr)
        return 2

    viewer = find_html_viewer(session)
    if viewer is None:
        print("FAIL: HTML viewer not found - abapGit not open?", file=sys.stderr)
        return 3

    # 1. Stage all
    log.info("staging all files")
    try:
        trigger_sapevent(viewer, "sapevent:stage_all")
    except Exception as exc:
        print(f"FAIL: stage_all: {exc}", file=sys.stderr)
        return 3
    time.sleep(0.5)

    # 2. Commit (opens dialog)
    log.info("triggering commit (opens dialog)")
    try:
        trigger_sapevent(viewer, "sapevent:commit")
    except Exception as exc:
        print(f"FAIL: commit trigger: {exc}", file=sys.stderr)
        return 3

    # 3. Fill the commit dialog
    if not fill_commit_dialog(session, args.message, args.author, args.email):
        print("FAIL: commit dialog didn't appear or fields unknown",
              file=sys.stderr)
        return 3

    log.info("commit submitted")
    print(f"OK: staged + committed with message {args.message!r}")
    print("next: gui_activate_package.py to syntax-check + activate in SE80")
    return 0


if __name__ == "__main__":
    sys.exit(main())
