"""Ensure SAP GUI is running and logged in. Launches via sapshcut.exe if needed.

Reads connection details from .conn_adt file, environment variables, or CLI args.
This is the recommended first step before any SAP GUI scripting operation.

Usage:
    python ensure_gui_ready.py
    python ensure_gui_ready.py --user developer --password developer3 --client 000
    python ensure_gui_ready.py --conn-file /path/to/.conn_adt
"""

import argparse
import os
import subprocess
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
    attach_scripting_engine,
    get_session_info,
    find_element,
    mask_text,
    log,
)


# sapshcut.exe search paths
SAPSHCUT_PATHS = (
    r"C:\Program Files\SAP\FrontEnd\SAPgui\sapshcut.exe",
    r"C:\Program Files (x86)\SAP\FrontEnd\SAPgui\sapshcut.exe",
)

STARTUP_TIMEOUT = 60  # seconds to wait for SAP GUI to be ready


def load_conn_adt(path: str) -> dict:
    """Parse a .conn_adt file into a dict of key=value pairs."""
    result = {}
    if not os.path.isfile(path):
        return result
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                result[key.strip()] = value.strip()
    return result


def find_sapshcut() -> str | None:
    """Find sapshcut.exe on the system."""
    for p in SAPSHCUT_PATHS:
        if os.path.isfile(p):
            return p
    return None


def has_active_session(app) -> dict | None:
    """Check if there's already a logged-in session. Returns session info or None."""
    try:
        if app.Children.Count == 0:
            return None
        conn = app.Children(0)
        if conn.Children.Count == 0:
            return None
        session = conn.Children(0)
        info = get_session_info(session)
        # If we're on the login screen, not yet logged in
        if find_element(session, "wnd[0]/usr/txtRSYST-MANDT") is not None:
            return None
        if info.get("user"):
            return info
    except Exception:
        pass
    return None


def launch_sapshcut(
    sapshcut_path: str,
    system: str,
    client: str,
    user: str,
    password: str,
    language: str = "EN",
    server: str = "",
    instance_nr: str = "",
) -> None:
    """Launch SAP GUI via sapshcut.exe with auto-login."""
    cmd = [sapshcut_path]

    # If server + instance are provided, use direct connection
    if server and instance_nr:
        cmd += [
            f"-type=SystemName",
            f"-sysname={system}",
            f"-server={server}",
            f"-instnr={instance_nr}",
        ]
    else:
        # Use SAP Logon entry name
        cmd += [f"-system={system}"]

    cmd += [
        f"-client={client}",
        f"-user={user}",
        f"-pw={password}",
        f"-language={language}",
    ]

    log.info("Launching: %s", " ".join(
        c if "-pw=" not in c else "-pw=***" for c in cmd
    ))
    subprocess.Popen(cmd)


def wait_for_logged_in_session(timeout: int = STARTUP_TIMEOUT) -> dict:
    """Wait until SAP GUI has a logged-in session."""
    deadline = time.time() + timeout
    last_state = ""

    while time.time() < deadline:
        try:
            app = attach_scripting_engine()
            info = has_active_session(app)
            if info:
                return info

            # Report progress
            conn_count = app.Children.Count
            state = f"connections={conn_count}"
            if state != last_state:
                log.info("Waiting for login... (%s)", state)
                last_state = state
        except Exception:
            state = "no_engine"
            if state != last_state:
                log.info("Waiting for SAP GUI to start...")
                last_state = state

        time.sleep(1.0)

    raise TimeoutError(f"SAP GUI did not reach logged-in state within {timeout}s")


def parse_sap_url(url: str) -> tuple[str, str]:
    """Extract host and derive instance number from an ADT URL like http://127.0.0.1:8000.

    SAP HTTP port = 8000 + instance_nr * 100 (for non-SSL)
    So port 8000 → instance 00, port 8100 → instance 01, etc.
    """
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.hostname or ""
    port = parsed.port or 8000
    # HTTP port formula: 8000 + (instance_nr * 100)
    instance_nr = (port - 8000) // 100
    return host, f"{instance_nr:02d}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ensure SAP GUI is running and logged in."
    )
    parser.add_argument("--conn-file", help="Path to .conn_adt file")
    parser.add_argument("--system", help="SAP system name (default: NPL)")
    parser.add_argument("--client", help="SAP client (default: from .conn_adt or 000)")
    parser.add_argument("--user", help="SAP username")
    parser.add_argument("--password", help="SAP password")
    parser.add_argument("--language", default=None, help="Logon language")
    parser.add_argument("--timeout", type=int, default=STARTUP_TIMEOUT,
                        help=f"Startup timeout in seconds (default: {STARTUP_TIMEOUT})")
    args = parser.parse_args()

    # --- Resolve connection details ---
    # Priority: CLI args > env vars > .conn_adt file

    # Find .conn_adt: explicit path > current dir > parent dirs
    conn_adt = {}
    conn_file = args.conn_file
    if not conn_file:
        for search_dir in [os.getcwd(), os.path.dirname(os.getcwd())]:
            candidate = os.path.join(search_dir, ".conn_adt")
            if os.path.isfile(candidate):
                conn_file = candidate
                break
    if conn_file:
        conn_adt = load_conn_adt(conn_file)
        if conn_adt:
            log.info("Loaded connection config from: %s", conn_file)

    system = args.system or os.getenv("SAP_GUI_SYSTEM") or conn_adt.get("SAP_GUI_SYSTEM") or conn_adt.get("ADT_SAP_SYSTEM", "NPL")
    client = args.client or os.getenv("SAP_GUI_CLIENT") or conn_adt.get("ADT_SAP_CLIENT", "000")
    user = args.user or os.getenv("SAP_GUI_USER") or conn_adt.get("ADT_SAP_USER", "")
    password = args.password or os.getenv("SAP_GUI_PASSWORD") or conn_adt.get("ADT_SAP_PASSWORD", "")
    language = args.language or os.getenv("SAP_GUI_LANGUAGE") or conn_adt.get("ADT_SAP_LANGUAGE", "EN")

    # Derive server/instance from ADT URL if available
    server, instance_nr = "", ""
    adt_url = conn_adt.get("ADT_SAP_URL", "")
    if adt_url:
        server, instance_nr = parse_sap_url(adt_url)

    # --- Step 1: Check if already running and logged in ---
    try:
        app = attach_scripting_engine()
        info = has_active_session(app)
        if info:
            print(f"OK: SAP GUI already running and logged in.")
            print(f"    System: {info['system']}")
            print(f"    Client: {info['client']}")
            print(f"    User: {mask_text(info['user'])}")
            print(f"    Transaction: {info['transaction']}")
            return
        log.info("SAP GUI running but no logged-in session found.")
    except Exception:
        log.info("SAP GUI not running.")

    # --- Step 2: Validate we have credentials ---
    if not user or not password:
        print("FAIL: No credentials available.")
        print("      Provide --user/--password, set SAP_GUI_* env vars,")
        print("      or place a .conn_adt file in the working directory.")
        sys.exit(1)

    # --- Step 3: Find sapshcut.exe ---
    sapshcut = find_sapshcut()
    if not sapshcut:
        print("FAIL: sapshcut.exe not found in:")
        for p in SAPSHCUT_PATHS:
            print(f"      {p}")
        sys.exit(1)

    log.info("Found sapshcut.exe: %s", sapshcut)

    # --- Step 4: Launch SAP GUI ---
    launch_sapshcut(
        sapshcut_path=sapshcut,
        system=system,
        client=client,
        user=user,
        password=password,
        language=language,
        server=server,
        instance_nr=instance_nr,
    )

    # --- Step 5: Wait for logged-in session ---
    try:
        info = wait_for_logged_in_session(timeout=args.timeout)
        print(f"OK: SAP GUI launched and logged in.")
        print(f"    System: {info['system']}")
        print(f"    Client: {info['client']}")
        print(f"    User: {mask_text(info['user'])}")
        print(f"    Transaction: {info['transaction']}")
    except TimeoutError as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
