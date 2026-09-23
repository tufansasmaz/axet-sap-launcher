"""Activate inactive objects in a SAP package via SE80, capture errors.

After abapGit deserialises objects on Import ZIP, they're inactive in SAP.
SE80 can activate the entire package and report any errors. This script:

  1. /nSE80 -> set object type=Package, name=<package>
  2. Right-click package -> "Activate" (or use menu)
  3. Wait for activation to finish
  4. Read activation status from status bar / popup
  5. If errors: capture the SE80 activation log and write to --capture-to file

Standard SAPGUI screens (no HTML viewer) - much more reliable than driving
abapGit's HTML UI.

Usage:
    python gui_activate_package.py --package ZAI_FOO --capture-to ~/errors.txt

Status: v0.1 - functional scaffold. Live-test on NPL VM.
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
    attach_scripting_engine, find_element, get_session, log, read_status_bar,
)


ACTIVATE_TIMEOUT = 60.0
ACTIVATE_POLL = 1.0


def navigate_se80_package(session, package: str) -> bool:
    """Open SE80 and load the given package."""
    try:
        session.findById("wnd[0]/tbar[0]/okcd").text = "/nSE80"
        session.findById("wnd[0]").sendVKey(0)
    except Exception as exc:
        log.error("SE80 navigate: %s", exc)
        return False
    time.sleep(0.5)

    # SE80's object selector - try a few common IDs
    obj_type_field_candidates = (
        "wnd[0]/usr/cmbG_KIND",  # combobox
        "wnd[0]/usr/cmbR_OBJ",
    )
    obj_name_field_candidates = (
        "wnd[0]/usr/ctxtG_NAME",
        "wnd[0]/usr/ctxtR_OBJ",
        "wnd[0]/usr/ctxtRSEUMOD-DEVCLASS",
    )

    # Pick "Package" in the type combo (key is usually 'PACKAGE' or 'DEVC')
    type_set = False
    for fid in obj_type_field_candidates:
        fld = find_element(session, fid)
        if fld is not None:
            try:
                fld.key = "DEVC"
                type_set = True
                break
            except Exception:
                pass
    if not type_set:
        log.warning("SE80 object-type combo not set - layout may differ")

    # Set the name
    name_set = False
    for fid in obj_name_field_candidates:
        fld = find_element(session, fid)
        if fld is not None:
            fld.text = package
            name_set = True
            break
    if not name_set:
        log.error("SE80 object-name field not found")
        return False

    session.findById("wnd[0]").sendVKey(0)  # Enter -> load
    time.sleep(1.0)
    return True


def trigger_activate(session) -> bool:
    """Send the activate-inactive shortcut (Ctrl+F3)."""
    try:
        # Standard "Activate" key combo in SE80 is Ctrl+F3 (vkey 3 with Ctrl)
        session.findById("wnd[0]").sendVKey(3)
        return True
    except Exception as exc:
        log.error("activate vkey: %s", exc)
        return False


def wait_for_activation(session) -> tuple[str, str]:
    """Poll until the status bar shows a result. Returns (status, message)."""
    deadline = time.time() + ACTIVATE_TIMEOUT
    last_msg = ""
    while time.time() < deadline:
        sb = read_status_bar(session)
        msg = (sb.get("text") or "").strip()
        msg_type = (sb.get("messageType") or "").strip()
        if msg and msg != last_msg:
            log.info("status bar: [%s] %s", msg_type, msg)
            last_msg = msg
        # Heuristic: activation done when status type in S/W/E/A
        # and message contains 'activated' or 'error'
        low = msg.lower()
        if "activated" in low or "active" in low:
            return ("OK", msg)
        if "error" in low or msg_type in ("E", "A"):
            return ("FAIL", msg)
        time.sleep(ACTIVATE_POLL)
    return ("TIMEOUT", last_msg or "no status bar message within timeout")


def capture_activation_log(session, output_file: Path) -> bool:
    """If an activation log popup appeared (wnd[1]), capture its contents."""
    log_window = find_element(session, "wnd[1]")
    if log_window is None:
        return False
    try:
        # The log is usually a table or list - try several read paths
        # A simple text dump of all visible content:
        from sap_gui_lib import walk_elements
        rows = walk_elements(log_window, max_depth=8)
        with output_file.open("w", encoding="utf-8") as f:
            f.write(f"# SE80 activation log capture\n")
            f.write(f"# captured at {time.strftime('%Y-%m-%dT%H:%M:%S')}\n\n")
            for row in rows:
                txt = (row.get("text") or "").strip()
                if txt:
                    f.write(txt + "\n")
        return True
    except Exception as exc:
        log.warning("could not capture log: %s", exc)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", required=True,
                        help="SAP package name to activate")
    parser.add_argument("--capture-to",
                        help="Path to write activation errors if any")
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

    if not navigate_se80_package(session, args.package):
        print(f"FAIL: SE80 navigation to package {args.package!r}",
              file=sys.stderr)
        return 3

    log.info("triggering activate (Ctrl+F3)")
    if not trigger_activate(session):
        return 3

    log.info("waiting for activation to complete (up to %ss)", ACTIVATE_TIMEOUT)
    status, msg = wait_for_activation(session)

    print(f"{status}: {msg}")

    if status != "OK" and args.capture_to:
        out = Path(args.capture_to)
        if capture_activation_log(session, out):
            print(f"captured activation log to {out}")
        else:
            # Fall back to writing the status bar message
            out.write_text(
                f"# activation failed - see SE80 log directly for full detail\n"
                f"package: {args.package}\n"
                f"status:  {status}\n"
                f"message: {msg}\n",
                encoding="utf-8",
            )
            print(f"wrote status-bar message to {out}")

    return 0 if status == "OK" else 1


if __name__ == "__main__":
    sys.exit(main())
