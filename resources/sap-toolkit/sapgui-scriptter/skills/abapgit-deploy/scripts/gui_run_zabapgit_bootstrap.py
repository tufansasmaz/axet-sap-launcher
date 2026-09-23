"""Drive ZABAPGIT_STANDALONE in bootstrap mode (P_BOOT='X').

The standalone exposes bootstrap-mode parameters on its selection screen
(P_PKG, P_OUT) hidden via screen-invisible=1. SAPGUI scripting reaches
them as GuiPasswordField (pwdP_*). The standalone serializes the package
contents to a ZIP file written to the workstation via cl_gui_frontend_services.

Pre-condition: a SAPGUI session is logged in, the patched standalone is
activated.

Sequence:
  1. /n then /nSE38 (reset)
  2. enter ZABAPGIT_STANDALONE, F8 -> selection screen
  3. fill pwdP_BOOT='X' / pwdP_PKG / pwdP_OUT
  4. F8 -> START-OF-SELECTION fires run_auto_bootstrap
  5. poll for completion - status keyword in LIST output:
     SUCCESS / EXCEPTION

Returns:
  exit 0 if SUCCESS and the ZIP file landed at the requested path,
  exit 1 if anything else.

Usage:
    python gui_run_zabapgit_bootstrap.py --package ZGIT --out C:/tmp/zgit.zip
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


FLD_BOOT = "wnd[0]/usr/pwdP_BOOT"
FLD_PKG  = "wnd[0]/usr/pwdP_PKG"
FLD_OUT  = "wnd[0]/usr/pwdP_OUT"

COMPLETION_TIMEOUT = 120
COMPLETION_POLL = 1.0

STATUS_MARKERS = (
    "abapgit-bootstrap: SUCCESS",
    "abapgit-bootstrap: EXCEPTION",
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
    parser.add_argument("--package", required=True,
                        help="SAP package to serialize (e.g., ZGIT, ZFI)")
    parser.add_argument("--out", required=True,
                        help="Absolute workstation path for the ZIP")
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

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        out_path.unlink()

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
        if find_element(session, FLD_BOOT) is not None:
            break
        time.sleep(0.3)
    else:
        print("FAIL: pwdP_BOOT field not found - is the patched standalone "
              "installed and activated?", file=sys.stderr)
        return 4

    try:
        session.findById(FLD_BOOT).text = "X"
        session.findById(FLD_PKG).text = args.package.upper()
        session.findById(FLD_OUT).text = str(out_path)
    except Exception as exc:
        print(f"FAIL: fill selection screen: {exc}", file=sys.stderr)
        return 3

    log.info("filled selection screen; F8 to run bootstrap")
    print(f"bootstrapping: package={args.package} -> {out_path}")

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
    print("=== ZABAPGIT_STANDALONE auto-bootstrap output ===")
    for line in final:
        print(f"  {line}")
    print()

    if last_marker is None:
        print(f"FAIL: timeout after {args.timeout}s; no status marker",
              file=sys.stderr)
        return 1

    if last_marker == "SUCCESS":
        if not out_path.exists():
            print(f"FAIL: SAP reported SUCCESS but ZIP not at {out_path}",
                  file=sys.stderr)
            return 1
        print(f"OK: bootstrap SUCCESS - ZIP at {out_path} "
              f"({out_path.stat().st_size} bytes)")
        return 0

    print(f"FAIL: bootstrap returned {last_marker}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
