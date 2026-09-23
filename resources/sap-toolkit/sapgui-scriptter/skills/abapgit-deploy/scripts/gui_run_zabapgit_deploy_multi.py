"""Drive ZABAPGIT_STANDALONE in multi-package deploy mode (P_AGENT + P_MULTI).

Imports a FULL-folder-logic ZIP (produced by the matching bootstrap-multi
flow or by Claude Code editing such a ZIP) into a single transport request.
The patched standalone creates/reuses an offline repo named
"multi-deploy-<root>" with FULL folder logic; deserialise routes each file
to its declared devclass via path_to_package, so objects land in their
original packages while a single TR captures every change.

Pre-condition: a SAPGUI session is logged in and the patched standalone
(with run_auto_deploy_multi) is activated.

Sequence:
  1. /n then /nSE38 (reset)
  2. enter ZABAPGIT_STANDALONE, F8 -> selection screen
  3. fill pwdP_AGENT='X' / pwdP_MULTI='X' / pwdP_ZIP / pwdP_ROOT / pwdP_TRK / pwdP_ACT
  4. F8 -> START-OF-SELECTION fires run_auto_deploy_multi
  5. poll for completion - status keyword in LIST output:
     SUCCESS / BAD_INPUT / ACTIVATION_FAIL / EXCEPTION

Returns:
  exit 0 if SUCCESS, exit 1 otherwise.

Usage:
    python gui_run_zabapgit_deploy_multi.py \
        --zip C:/tmp/picks.zip \
        --root ZGIT \
        --transport NPLK900081
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


FLD_AGENT = "wnd[0]/usr/pwdP_AGENT"
FLD_MULTI = "wnd[0]/usr/pwdP_MULTI"
FLD_ZIP   = "wnd[0]/usr/pwdP_ZIP"
FLD_ROOT  = "wnd[0]/usr/pwdP_ROOT"
FLD_TRK   = "wnd[0]/usr/pwdP_TRK"
FLD_ACT   = "wnd[0]/usr/pwdP_ACT"

COMPLETION_TIMEOUT = 240
COMPLETION_POLL = 1.0

STATUS_MARKERS = (
    "abapgit-deploy-multi: SUCCESS",
    "abapgit-deploy-multi: BAD_INPUT",
    "abapgit-deploy-multi: ACTIVATION_FAIL",
    "abapgit-deploy-multi: EXCEPTION",
)


def read_user_area(session) -> list[str]:
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
    blob = " ".join(labels)
    for m in STATUS_MARKERS:
        if m in blob:
            return m.split(": ", 1)[1]
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", required=True,
                        help="Absolute workstation path to the input ZIP")
    parser.add_argument("--root", required=True,
                        help="Common-ancestor package (recursion anchor)")
    parser.add_argument("--transport", required=True,
                        help="Modifiable transport request (e.g., NPLK900081)")
    parser.add_argument("--no-activate", action="store_true",
                        help="Skip activation; only deserialise (objects stay inactive)")
    parser.add_argument("--connection-index", type=int, default=0)
    parser.add_argument("--session-index", type=int, default=0)
    parser.add_argument("--timeout", type=int, default=COMPLETION_TIMEOUT,
                        help=f"Seconds to wait for completion "
                             f"(default {COMPLETION_TIMEOUT})")
    args = parser.parse_args()

    # AXET-TIER-GATE (aXet launcher adaptation): SAP writes only on a DEV system.
    from tier_gate import require_dev_tier
    refused = require_dev_tier()
    if refused:
        print(refused, file=sys.stderr)
        return 2

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

    prog = find_element(session, "wnd[0]/usr/ctxtRS38M-PROGRAMM")
    if prog is None:
        print("FAIL: SE38 program field not found", file=sys.stderr)
        return 3
    prog.text = "ZABAPGIT_STANDALONE"
    session.findById("wnd[0]").sendVKey(8)

    deadline = time.time() + 5.0
    while time.time() < deadline:
        if find_element(session, FLD_AGENT) is not None \
                and find_element(session, FLD_MULTI) is not None:
            break
        time.sleep(0.3)
    else:
        print("FAIL: pwdP_AGENT / pwdP_MULTI fields not found - is the "
              "patched standalone (with run_auto_deploy_multi block) "
              "installed and activated?", file=sys.stderr)
        return 4

    try:
        session.findById(FLD_AGENT).text = "X"
        session.findById(FLD_MULTI).text = "X"
        session.findById(FLD_ZIP).text   = str(zip_path)
        session.findById(FLD_ROOT).text  = args.root.upper()
        session.findById(FLD_TRK).text   = args.transport.upper()
        session.findById(FLD_ACT).text   = "" if args.no_activate else "X"
    except Exception as exc:
        print(f"FAIL: fill selection screen: {exc}", file=sys.stderr)
        return 3

    log.info("filled selection screen; F8 to run deploy-multi")
    print(f"deploy-multi: zip={zip_path.name} root={args.root.upper()} "
          f"transport={args.transport} activate={not args.no_activate}")

    session.findById("wnd[0]").sendVKey(8)

    deadline = time.time() + args.timeout
    last_marker = None
    last_count = 0
    while time.time() < deadline:
        time.sleep(COMPLETION_POLL)
        labels = read_user_area(session)
        marker = find_status_marker(labels)
        if marker:
            last_marker = marker
            break
        if len(labels) != last_count:
            last_count = len(labels)
            log.info("progress: %d output lines", len(labels))

    final = read_user_area(session)
    print()
    print("=== ZABAPGIT_STANDALONE deploy-multi output ===")
    for line in final:
        print(f"  {line}")
    print()

    if last_marker is None:
        print(f"FAIL: timeout after {args.timeout}s; no status marker",
              file=sys.stderr)
        return 1

    if last_marker == "SUCCESS":
        print(f"OK: deploy-multi SUCCESS (root={args.root.upper()}, "
              f"transport={args.transport})")
        return 0

    print(f"FAIL: deploy-multi returned {last_marker}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
