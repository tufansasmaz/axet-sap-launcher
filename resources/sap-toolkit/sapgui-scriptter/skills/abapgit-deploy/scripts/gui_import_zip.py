"""Drive abapGit Standalone's "Import ZIP" flow for an existing offline repo.

Pre-condition: ZABAPGIT_STANDALONE is open (run gui_open_zabapgit_standalone.py
first), positioned at the Repository List, and the offline repo named
--offline-repo already exists.

Approach:
  abapGit's HTML viewer dispatches actions via sapevent: URLs. Direct HTML
  clicking from SAP GUI Scripting is unreliable - the HTML is rendered in an
  embedded browser inside CL_GUI_HTML_VIEWER. This script triggers actions by
  navigating the viewer to specific abapGit URLs that resolve to in-program
  events:
    sapevent:zip_import?key=<repo-key>

  After the action triggers, abapGit may open a SAPGUI file picker (wnd[1])
  - that we DO drive via standard scripting since it's a real SAPGUI dialog.

Usage:
    python gui_import_zip.py --offline-repo my-zfoo --zip C:/path/to/repo-abc1234.zip

Status: v0.1 - functional scaffold. Live-test on NPL VM to confirm the
sapevent URL surface and dialog handling.
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


HTML_VIEWER_CANDIDATES = (
    "wnd[0]/usr/shell",
    "wnd[0]/usr/cntlGUI_CONTAINER/shellcont/shell",
    "wnd[0]/usr/cntlMAIN/shellcont/shell",
)
DIALOG_TIMEOUT = 10.0
DIALOG_POLL = 0.5


def find_html_viewer(session):
    for cand in HTML_VIEWER_CANDIDATES:
        v = find_element(session, cand)
        if v is not None:
            return v
    return None


def find_repo_key_for_name(viewer, repo_name: str) -> str | None:
    """Scrape the rendered HTML for the repo key matching the given name.

    abapGit renders each repo as a row with a key like 'KEY_<sha256>' embedded
    in its sapevent links. We grep the HTML for the row matching repo_name.
    """
    try:
        html = viewer.GetText()
    except Exception:
        return None
    # Look for: ...sapevent:go_repo?key=<KEY>...>repo_name<...
    # This heuristic depends on abapGit rendering; refine after live-testing.
    import re
    # Find every (key, name) pair in the Repository List
    pattern = r'sapevent:go_repo\?key=([A-F0-9]+)[^>]*>[^<]*<[^>]*>\s*([^<]+?)\s*</a>'
    for m in re.finditer(pattern, html, re.IGNORECASE):
        if m.group(2).strip() == repo_name.strip():
            return m.group(1)
    return None


def trigger_sapevent(viewer, sapevent: str) -> None:
    """Send a sapevent URL to the HTML viewer to trigger an abapGit action.

    Uses GuiHTMLViewer's documented behaviour: setting current URL via
    Reload(URL) navigates in the embedded view. abapGit handles sapevent: URLs
    in its HTTP handler.
    """
    # The actual API on the HTML viewer to navigate may be:
    # viewer.LoadHTML(url) or viewer.Reload() with a setURL beforehand.
    # SAP GUI Scripting's GuiHTMLViewer surface is thin; we may need to use
    # session.SendCommand or fall back to keyboard-driven menu navigation.
    #
    # v0.1 approach: try sendCustomEvent with the sapevent name + params.
    # The exact method name and args may need tweaking against a live system.
    try:
        viewer.sendCustomEvent("sapevent", sapevent)
    except Exception as exc:
        log.warning("sendCustomEvent failed (%s); fall back to setText URL push",
                    exc)
        # Last-ditch: try to set the viewer's URL property
        try:
            viewer.URL = sapevent
        except Exception as exc2:
            raise RuntimeError(
                f"could not trigger sapevent {sapevent!r}: "
                f"sendCustomEvent={exc!r}, URL set={exc2!r}"
            )


def fill_file_dialog(session, zip_path: str) -> bool:
    """When abapGit's Import ZIP triggers a file picker, fill it in.

    The file picker is a standard SAPGUI window at wnd[1] (or similar). It has
    a text field for the path and an 'Open' button.
    """
    deadline = time.time() + DIALOG_TIMEOUT
    while time.time() < deadline:
        dialog = find_element(session, "wnd[1]")
        if dialog is not None:
            log.info("file picker dialog detected at wnd[1]")
            # Heuristic: text field is usually wnd[1]/usr/ctxtPATH or
            # wnd[1]/usr/txtFILE. Try common IDs.
            for fid in ("wnd[1]/usr/ctxtPATH", "wnd[1]/usr/txtFILE",
                        "wnd[1]/usr/ctxtRLGRAP-FILENAME"):
                fld = find_element(session, fid)
                if fld is not None:
                    fld.text = zip_path
                    # Press Enter / Open
                    session.findById("wnd[1]").sendVKey(0)
                    return True
            log.warning("file picker open but no known text-field ID matched; "
                        "screen layout may differ on this SAP version")
            return False
        time.sleep(DIALOG_POLL)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline-repo", required=True,
                        help="Name of the abapGit offline repo (as shown in "
                             "Repository List)")
    parser.add_argument("--zip", required=True,
                        help="Absolute path to the ZIP file (must be readable "
                             "from the SAPGUI workstation)")
    parser.add_argument("--connection-index", type=int, default=0)
    parser.add_argument("--session-index", type=int, default=0)
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

    viewer = find_html_viewer(session)
    if viewer is None:
        print("FAIL: abapGit HTML viewer not found - is ZABAPGIT_STANDALONE open?",
              file=sys.stderr)
        return 3

    log.info("locating repo key for %r in Repository List", args.offline_repo)
    repo_key = find_repo_key_for_name(viewer, args.offline_repo)
    if repo_key is None:
        print(f"FAIL: offline repo {args.offline_repo!r} not found in "
              "Repository List. Create it via abapGit + New Offline first.",
              file=sys.stderr)
        return 3
    log.info("repo key = %s", repo_key)

    # Step 1: navigate into the repo (sapevent:go_repo?key=<key>)
    log.info("opening repo view")
    try:
        trigger_sapevent(viewer, f"sapevent:go_repo?key={repo_key}")
    except Exception as exc:
        print(f"FAIL: open repo: {exc}", file=sys.stderr)
        return 3
    time.sleep(1.0)

    # Step 2: trigger zip_import for this repo
    log.info("triggering zip_import")
    try:
        trigger_sapevent(viewer, f"sapevent:zip_import?key={repo_key}")
    except Exception as exc:
        print(f"FAIL: trigger zip_import: {exc}", file=sys.stderr)
        return 3

    # Step 3: handle the file picker dialog
    log.info("waiting for file picker dialog (up to %ss)", DIALOG_TIMEOUT)
    if not fill_file_dialog(session, str(zip_path)):
        print("FAIL: file picker dialog didn't appear or layout unknown. "
              "Is abapGit configured to use legacy dialog? Check Global Settings.",
              file=sys.stderr)
        return 3

    log.info("file picker submitted")
    print(f"OK: zip_import triggered for repo {args.offline_repo} "
          f"(key={repo_key}) with file {zip_path.name}")
    print("next: gui_stage_commit.py to Stage all + Commit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
