"""Drive ZABAPGIT_STANDALONE's hidden auto-deploy mode directly.

The standalone exposes agent-mode parameters on its selection screen but
hides them at AT SELECTION-SCREEN OUTPUT via screen-invisible=1. Interactive
users see an empty selection screen briefly (then the upstream HTML UI);
SAPGUI scripting reaches the same parameters as GuiPasswordField controls
(pwdP_*). No companion program needed - one ABAP install on SAP.

Pre-condition: a SAPGUI session is logged in, ZABAPGIT_STANDALONE
(patched, with the run_auto_deploy block) is activated on the target system.

Sequence:
  1. /n then /nSE38 (reset any state)
  2. enter ZABAPGIT_STANDALONE, F8 -> selection screen (hidden fields)
  3. fill pwdP_AGENT='X' / pwdP_REPO / pwdP_ZIP / pwdP_MSG / pwdP_TRK / pwdP_ACT
  4. F8 to execute -> START-OF-SELECTION fires run_auto_deploy
  5. poll for completion - status keyword in LIST output:
     SUCCESS / REPO_NOT_FOUND / ACTIVATION_FAIL / EXCEPTION
  6. if non-SUCCESS: dump the full LIST for orchestrator to capture into
     .abapgit-status/

Returns:
  exit 0 if SUCCESS, exit 1 if anything else.

Usage:
    python gui_run_zabapgit_auto.py --offline-repo ZGIT_TEST --zip C:/path/x.zip \
        --transport NPLK900081 -m "feat(...): ..."
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

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


# Fields on ZABAPGIT_STANDALONE's (hidden) selection screen.
# screen-invisible=1 in AT SELECTION-SCREEN OUTPUT renders these as
# GuiPasswordField (pwd*) controls - readable: no, writable: yes.
FLD_AGENT = "wnd[0]/usr/pwdP_AGENT"
FLD_REPO  = "wnd[0]/usr/pwdP_REPO"
FLD_ZIP   = "wnd[0]/usr/pwdP_ZIP"
FLD_MSG   = "wnd[0]/usr/pwdP_MSG"
FLD_TRK   = "wnd[0]/usr/pwdP_TRK"
FLD_ACT   = "wnd[0]/usr/pwdP_ACT"

# How long to wait for the auto-deploy to finish, in seconds.
COMPLETION_TIMEOUT = 120
COMPLETION_POLL = 1.0

STATUS_MARKERS = (
    "abapgit-deploy: SUCCESS",
    "abapgit-deploy: REPO_NOT_FOUND",
    "abapgit-deploy: ACTIVATION_FAIL",
    "abapgit-deploy: EXCEPTION",
)


def read_user_area(session) -> list[str]:
    """Return the visible labels in wnd[0]/usr (the LIST output)."""
    out: list[str] = []
    try:
        usr = session.findById("wnd[0]/usr")
        for i in range(usr.Children.Count):
            try:
                txt = (usr.Children.Item(i).Text or "").strip()
                if txt:
                    out.append(txt)
            except Exception:
                pass
    except Exception:
        pass
    return out


def find_status_marker(labels: list[str]) -> str | None:
    text_blob = " ".join(labels)
    for m in STATUS_MARKERS:
        if m in text_blob:
            return m.split(": ", 1)[1]  # e.g. "SUCCESS"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline-repo", required=True,
                        help="Name of the abapGit offline repo to deploy into")
    parser.add_argument("--zip", required=True,
                        help="Absolute path to the ZIP on the workstation")
    parser.add_argument("--transport", required=True,
                        help="Modifiable transport request (e.g., NPLK900081)")
    parser.add_argument("-m", "--message", default="",
                        help="Commit message (informational - logged in output)")
    parser.add_argument("--no-activate", action="store_true",
                        help="Skip activation; only deserialise (objects stay inactive)")
    parser.add_argument("--connection-index", type=int, default=0)
    parser.add_argument("--session-index", type=int, default=0)
    parser.add_argument("--timeout", type=int, default=COMPLETION_TIMEOUT,
                        help=f"Seconds to wait for completion "
                             f"(default {COMPLETION_TIMEOUT})")
    args = parser.parse_args()

    zip_path = Path(args.zip).resolve()
    if not zip_path.exists():
        print(f"FAIL: ZIP not found: {zip_path}", file=sys.stderr)
        return 2

    try:
        app = attach_scripting_engine()
        session = get_session(app, args.connection_index, args.session_index)
    except Exception as exc:
        print(f"FAIL: attach to SAPGUI: {exc}", file=sys.stderr)
        return 2

    log.info("attaching to session, current tx=%s", session.Info.Transaction)

    # 1. Reset state - /n clears any sticky status / popup, then /nSE38
    try:
        session.findById("wnd[0]/tbar[0]/okcd").text = "/n"
        session.findById("wnd[0]").sendVKey(0)
        time.sleep(0.4)
        session.findById("wnd[0]/tbar[0]/okcd").text = "/nSE38"
        session.findById("wnd[0]").sendVKey(0)
        time.sleep(0.6)
    except Exception as exc:
        print(f"FAIL: navigate to SE38: {exc}", file=sys.stderr)
        return 3

    # 2. Enter ZABAPGIT_STANDALONE program name, F8 -> selection screen
    prog_field = find_element(session, "wnd[0]/usr/ctxtRS38M-PROGRAMM")
    if prog_field is None:
        print("FAIL: SE38 program field not found", file=sys.stderr)
        return 3
    prog_field.text = "ZABAPGIT_STANDALONE"
    session.findById("wnd[0]").sendVKey(8)

    # 3. Wait for the (hidden) selection screen to render (poll up to 5s)
    deadline = time.time() + 5.0
    while time.time() < deadline:
        if find_element(session, FLD_REPO) is not None:
            break
        time.sleep(0.3)
    else:
        # Diagnostic: check status bar for "does not exist" message
        try:
            sbar = session.findById("wnd[0]/sbar")
            sbar_msg = (sbar.Text or "").strip()
            sbar_type = (sbar.MessageType or "").strip()
        except Exception:
            sbar_msg, sbar_type = "?", "?"
        print(f"FAIL: pwdP_REPO field not found - is the patched standalone "
              f"installed and activated?", file=sys.stderr)
        print(f"       status bar [{sbar_type}]: {sbar_msg!r}", file=sys.stderr)
        print(f"       hint: install docs/sources/zabapgit_standalone.prog.abap "
              f"on SAP (must include the run_auto_deploy block + screen-invisible "
              f"output handler).", file=sys.stderr)
        return 4

    # 4. Fill the (hidden) selection screen
    try:
        session.findById(FLD_AGENT).text = "X"
        session.findById(FLD_REPO).text = args.offline_repo
        session.findById(FLD_ZIP).text = str(zip_path)
        session.findById(FLD_MSG).text = args.message or ""
        session.findById(FLD_TRK).text = args.transport
        session.findById(FLD_ACT).text = "" if args.no_activate else "X"
    except Exception as exc:
        print(f"FAIL: fill selection screen: {exc}", file=sys.stderr)
        return 3

    log.info("filled selection screen; F8 to run")
    print(f"deploying: repo={args.offline_repo} zip={zip_path.name} "
          f"transport={args.transport} activate={not args.no_activate}")

    # 5. F8 -> execute
    session.findById("wnd[0]").sendVKey(8)

    # 6. Poll for completion
    deadline = time.time() + args.timeout
    last_marker = None
    last_lines_count = 0
    while time.time() < deadline:
        time.sleep(COMPLETION_POLL)
        labels = read_user_area(session)
        marker = find_status_marker(labels)
        if marker:
            last_marker = marker
            break
        # Periodic progress trace
        if len(labels) != last_lines_count:
            last_lines_count = len(labels)
            log.info("progress: %d output lines so far", len(labels))

    final_labels = read_user_area(session)
    print()
    print("=== ZABAPGIT_STANDALONE auto-deploy output ===")
    for line in final_labels:
        print(f"  {line}")
    print()

    if last_marker is None:
        print(f"FAIL: timeout after {args.timeout}s; no status marker found",
              file=sys.stderr)
        return 1

    if last_marker == "SUCCESS":
        print(f"OK: deploy SUCCESS (repo={args.offline_repo})")
        return 0

    print(f"FAIL: deploy returned {last_marker}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
