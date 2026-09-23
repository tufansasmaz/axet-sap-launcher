"""Core library for SAP GUI Scripting automation via COM/win32com.

Provides SapGuiSession wrapper and utility functions for all scripts.
"""

import logging
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

try:
    import win32com.client
except ImportError:
    print("ERROR: pywin32 is not installed. Run: pip install pywin32")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("sap_gui")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SapGuiConfig:
    """Configuration from environment variables with sensible defaults."""
    system: str = os.getenv("SAP_GUI_SYSTEM", "")
    client: str = os.getenv("SAP_GUI_CLIENT", "")
    user: str = os.getenv("SAP_GUI_USER", "")
    password: str = os.getenv("SAP_GUI_PASSWORD", "")
    language: str = os.getenv("SAP_GUI_LANGUAGE", "EN")
    sso: bool = os.getenv("SAP_GUI_SSO", "true").lower() in ("1", "true", "yes")
    login_wait: float = 2.0
    popup_wait: float = 0.5
    startup_timeout: int = 30
    session_ready_timeout: float = 30.0
    saplogon_paths: Tuple[str, ...] = (
        r"C:\Program Files (x86)\SAP\FrontEnd\SAPgui\saplogon.exe",
        r"C:\Program Files\SAP\FrontEnd\SAPgui\saplogon.exe",
        r"C:\Program Files (x86)\SAP\SAPLogon\saplogon.exe",
    )


CONFIG = SapGuiConfig()

LOGIN_SCREEN_FIELDS = (
    "wnd[0]/usr/txtRSYST-MANDT",
    "wnd[0]/usr/txtRSYST-BNAME",
)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def mask_text(text: str, enabled: bool = True) -> str:
    """Mask sensitive text for logging."""
    if not enabled or not text:
        return text
    if len(text) <= 2:
        return "*" * len(text)
    return text[0] + ("*" * (len(text) - 2)) + text[-1]


def find_element(session: Any, element_id: str) -> Optional[Any]:
    """Safely find a GUI element by ID. Returns None if not found."""
    try:
        return session.findById(element_id)
    except Exception:
        return None


def get_element_or_raise(session: Any, element_id: str) -> Any:
    """Find a GUI element by ID. Raises RuntimeError if not found."""
    elem = find_element(session, element_id)
    if elem is None:
        raise RuntimeError(f"Element not found: {element_id}")
    return elem


# ---------------------------------------------------------------------------
# COM / Scripting Engine
# ---------------------------------------------------------------------------

def attach_scripting_engine() -> Any:
    """Attach to the running SAP GUI Scripting Engine via COM/ROT."""
    try:
        rot_entry = win32com.client.GetObject("SAPGUI")
        engine = rot_entry.GetScriptingEngine
        if engine is None:
            raise RuntimeError("Scripting engine returned None")
        return engine
    except Exception as exc:
        raise ConnectionError(
            f"Cannot attach to SAP GUI Scripting Engine: {exc}\n"
            "Ensure SAP GUI is running and scripting is enabled."
        ) from exc


def ensure_saplogon_running() -> Any:
    """Attach to SAP GUI or start SAP Logon if not running."""
    try:
        app = attach_scripting_engine()
        log.info("SAP Logon running. Active connections: %s", app.Children.Count)
        return app
    except Exception:
        log.info("SAP Logon not detected - attempting to start...")

    exe_path = next((p for p in CONFIG.saplogon_paths if os.path.isfile(p)), None)
    if exe_path is None:
        raise ConnectionError(
            "SAP Logon is not running and saplogon.exe not found in:\n"
            + "\n".join(f"  {p}" for p in CONFIG.saplogon_paths)
        )

    log.info("Launching SAP Logon from: %s", exe_path)
    subprocess.Popen([exe_path])

    deadline = time.time() + CONFIG.startup_timeout
    while time.time() < deadline:
        try:
            app = attach_scripting_engine()
            log.info("SAP Logon started successfully.")
            return app
        except Exception:
            time.sleep(1.0)

    raise ConnectionError(
        f"SAP Logon did not become ready within {CONFIG.startup_timeout}s."
    )


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def get_session(app: Any, conn_idx: int = 0, sess_idx: int = 0) -> Any:
    """Get a specific session from the application."""
    if app.Children.Count <= conn_idx:
        raise RuntimeError(
            f"Connection index {conn_idx} out of range. "
            f"Active connections: {app.Children.Count}"
        )
    conn = app.Children(conn_idx)
    if conn.Children.Count <= sess_idx:
        raise RuntimeError(
            f"Session index {sess_idx} out of range. "
            f"Active sessions on connection {conn_idx}: {conn.Children.Count}"
        )
    return conn.Children(sess_idx)


def wait_for_session_ready(connection: Any, timeout: float = None) -> Any:
    """Wait until the first session on a connection is ready."""
    if timeout is None:
        timeout = CONFIG.session_ready_timeout
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            session = connection.Children(0)
            _ = session.findById("wnd[0]").Text
            return session
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("SAP window did not become ready within timeout.")


def detect_screen_state(session: Any) -> str:
    """Detect current screen state: LOGIN, MENU, or UNKNOWN."""
    if find_element(session, LOGIN_SCREEN_FIELDS[0]) is not None:
        return "LOGIN"
    try:
        tcode = session.Info.Transaction.strip()
        if tcode and tcode != "LOGIN":
            return "MENU"
    except Exception:
        pass
    try:
        if session.findById("wnd[0]").Text.strip():
            return "MENU"
    except Exception:
        pass
    return "UNKNOWN"


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def do_login(
    session: Any,
    client: str = "",
    user: str = "",
    password: str = "",
    language: str = "EN",
    sso: bool = True,
) -> None:
    """Fill login fields and submit."""
    mandt = find_element(session, "wnd[0]/usr/txtRSYST-MANDT")
    if mandt and mandt.Changeable and client:
        mandt.text = client
        log.info("Client set.")

    if not sso:
        bname = find_element(session, "wnd[0]/usr/txtRSYST-BNAME")
        bcode = find_element(session, "wnd[0]/usr/pwdRSYST-BCODE")
        langu = find_element(session, "wnd[0]/usr/txtRSYST-LANGU")
        if bname:
            bname.text = user
        if bcode:
            bcode.text = password
        if langu and langu.Changeable:
            langu.text = language
        log.info("Credentials filled (user/password mode).")
    else:
        log.info("SSO mode - skipping username/password fields.")

    session.findById("wnd[0]").sendVKey(0)
    log.info("Login submitted (Enter).")


def handle_multiple_logon_popup(session: Any) -> None:
    """Handle the multiple logon popup by keeping existing sessions."""
    log.info("Multiple logon detected - selecting OPT2 (keep existing).")
    opt2 = find_element(session, "wnd[1]/usr/radMULTI_LOGON_OPT2")
    if opt2:
        opt2.select()
    confirm = find_element(session, "wnd[1]/tbar[0]/btn[0]")
    if confirm:
        confirm.press()
    else:
        session.findById("wnd[1]").sendVKey(0)


def handle_post_login_popups(session: Any) -> None:
    """Handle any popups that appear after login."""
    time.sleep(CONFIG.popup_wait)
    for _ in range(5):
        popup = find_element(session, "wnd[1]")
        if popup is None:
            break
        log.info("Popup detected: '%s'", popup.Text.strip())
        try:
            if find_element(session, "wnd[1]/usr/radMULTI_LOGON_OPT1"):
                handle_multiple_logon_popup(session)
            else:
                popup.sendVKey(0)
        except Exception as exc:
            log.warning("Popup handling failed: %s", exc)
        time.sleep(CONFIG.popup_wait)


def verify_login(session: Any) -> None:
    """Check status bar for login errors."""
    sbar = find_element(session, "wnd[0]/sbar")
    if not sbar:
        return
    msg_type = getattr(sbar, "MessageType", "")
    msg_text = getattr(sbar, "Text", "")
    if msg_type in ("E", "A"):
        raise RuntimeError(f"Login failed [{msg_type}]: {msg_text}")
    if msg_type == "W":
        log.warning("Login warning [%s]: %s", msg_type, msg_text)
    elif msg_type == "S" and msg_text:
        log.info("Login status [%s]: %s", msg_type, msg_text)


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

def connect_to_system(
    system: str = "",
    client: str = "",
    user: str = "",
    password: str = "",
    language: str = "",
    sso: bool = None,
) -> Tuple[Any, Any, int]:
    """Open a new SAP connection and log in.

    Returns: (app, session, connection_index)
    """
    system = system or CONFIG.system
    client = client or CONFIG.client
    user = user or CONFIG.user
    password = password or CONFIG.password
    language = language or CONFIG.language
    if sso is None:
        sso = CONFIG.sso

    if not system:
        raise ValueError("SAP system name is required (--system or SAP_GUI_SYSTEM env var)")

    app = ensure_saplogon_running()
    log.info("Opening connection to '%s' (SSO=%s)...", system, sso)

    try:
        connection = app.OpenConnection(system, True)
    except Exception as exc:
        raise ConnectionError(
            f"Cannot open connection to '{system}': {exc}\n"
            "Check SAP Logon entry name (case-sensitive)."
        ) from exc

    session = wait_for_session_ready(connection)
    log.info("Session opened.")

    state = detect_screen_state(session)
    log.info("Screen state: %s", state)

    if state == "LOGIN":
        do_login(session, client, user, password, language, sso)
        time.sleep(CONFIG.login_wait)
    elif state == "MENU":
        log.info("SSO authenticated - skipped login screen.")
    else:
        log.warning("Unexpected screen state '%s' - attempting to continue.", state)

    handle_post_login_popups(session)
    verify_login(session)

    conn_idx = app.Children.Count - 1
    return app, session, conn_idx


# ---------------------------------------------------------------------------
# Session info
# ---------------------------------------------------------------------------

def get_session_info(session: Any) -> Dict[str, str]:
    """Get current session information."""
    info = session.Info
    return {
        "system": getattr(info, "SystemName", ""),
        "client": getattr(info, "Client", ""),
        "user": getattr(info, "User", ""),
        "transaction": getattr(info, "Transaction", ""),
        "program": getattr(info, "Program", ""),
        "screen_number": str(getattr(info, "ScreenNumber", "")),
        "response_time": str(getattr(info, "ResponseTime", "")),
    }


# ---------------------------------------------------------------------------
# Screen interaction helpers
# ---------------------------------------------------------------------------

def navigate_to_transaction(session: Any, tcode: str) -> None:
    """Navigate to a transaction code."""
    okcd = get_element_or_raise(session, "wnd[0]/tbar[0]/okcd")
    okcd.text = f"/n{tcode}"
    session.findById("wnd[0]").sendVKey(0)
    log.info("Navigated to transaction: %s", tcode)


def read_status_bar(session: Any) -> Dict[str, str]:
    """Read the status bar message."""
    sbar = find_element(session, "wnd[0]/sbar")
    if not sbar:
        return {"type": "", "text": "", "id": "", "number": ""}
    return {
        "type": getattr(sbar, "MessageType", ""),
        "text": getattr(sbar, "Text", ""),
        "id": getattr(sbar, "MessageId", ""),
        "number": getattr(sbar, "MessageNumber", ""),
    }


def set_text(session: Any, element_id: str, value: str) -> None:
    """Set the text of a text field or context field."""
    elem = get_element_or_raise(session, element_id)
    elem.text = value
    log.info("Set %s = '%s'", element_id, value)


def press_button_by_id(session: Any, element_id: str) -> None:
    """Press a button by element ID."""
    elem = get_element_or_raise(session, element_id)
    elem.press()
    log.info("Pressed button: %s", element_id)


def send_vkey(session: Any, vkey: int, window: int = 0) -> None:
    """Send a virtual key to a window."""
    session.findById(f"wnd[{window}]").sendVKey(vkey)
    log.info("Sent VKey %d to wnd[%d]", vkey, window)


# ---------------------------------------------------------------------------
# Element inspection
# ---------------------------------------------------------------------------

def get_element_info(element: Any) -> Dict[str, Any]:
    """Get properties of a GUI element."""
    info = {"id": "", "type": "", "name": "", "text": ""}
    try:
        info["id"] = element.Id
    except Exception:
        pass
    try:
        info["type"] = element.Type
    except Exception:
        pass
    try:
        info["name"] = element.Name
    except Exception:
        pass
    try:
        info["text"] = element.Text
    except Exception:
        pass
    try:
        info["changeable"] = element.Changeable
    except Exception:
        pass
    try:
        info["visible"] = element.Visible if hasattr(element, "Visible") else True
    except Exception:
        pass
    return info


def walk_elements(element: Any, depth: int = 0, max_depth: int = 5) -> List[Dict[str, Any]]:
    """Recursively walk GUI element tree and collect info."""
    results = []
    info = get_element_info(element)
    info["depth"] = depth
    results.append(info)

    if depth >= max_depth:
        return results

    try:
        children = element.Children
        for i in range(children.Count):
            try:
                child = children(i)
                results.extend(walk_elements(child, depth + 1, max_depth))
            except Exception:
                pass
    except Exception:
        pass

    return results


# ---------------------------------------------------------------------------
# ALV Grid reading
# ---------------------------------------------------------------------------

def find_alv_grid(session: Any) -> Optional[Any]:
    """Find the first ALV grid (GuiGridView) on the current screen."""
    def _search(element: Any, depth: int = 0) -> Optional[Any]:
        if depth > 10:
            return None
        try:
            elem_type = element.Type
            if elem_type == "GuiGridView":
                return element
        except Exception:
            pass
        try:
            children = element.Children
            for i in range(children.Count):
                try:
                    result = _search(children(i), depth + 1)
                    if result is not None:
                        return result
                except Exception:
                    pass
        except Exception:
            pass
        return None

    return _search(session.findById("wnd[0]/usr"))


def read_alv_data(
    grid: Any,
    max_rows: int = 0,
    columns: Optional[List[str]] = None,
) -> Tuple[List[str], List[List[str]]]:
    """Read data from an ALV grid.

    Returns: (column_names, rows)
    """
    col_count = grid.ColumnCount
    row_count = grid.RowCount

    # Get column names
    all_columns = []
    for c in range(col_count):
        try:
            col_name = grid.GetColumnTitles(c)
            if col_name:
                all_columns.append(str(col_name[0]) if hasattr(col_name, '__getitem__') else str(col_name))
            else:
                all_columns.append(f"COL_{c}")
        except Exception:
            try:
                all_columns.append(grid.GetColumnOrder()[c] if c < len(grid.GetColumnOrder()) else f"COL_{c}")
            except Exception:
                all_columns.append(f"COL_{c}")

    # Get column field names for data access
    try:
        col_fields = list(grid.GetColumnOrder())
    except Exception:
        col_fields = [f"COL_{c}" for c in range(col_count)]

    # Filter columns if specified
    if columns:
        col_indices = []
        for col in columns:
            col_upper = col.upper()
            for idx, cf in enumerate(col_fields):
                if cf.upper() == col_upper:
                    col_indices.append(idx)
                    break
        if not col_indices:
            col_indices = list(range(col_count))
    else:
        col_indices = list(range(col_count))

    selected_names = [all_columns[i] if i < len(all_columns) else col_fields[i] for i in col_indices]
    selected_fields = [col_fields[i] for i in col_indices]

    # Read rows
    if max_rows > 0:
        row_count = min(row_count, max_rows)

    rows = []
    for r in range(row_count):
        row = []
        for cf in selected_fields:
            try:
                val = grid.GetCellValue(r, cf)
                row.append(str(val) if val is not None else "")
            except Exception:
                row.append("")
        rows.append(row)

    return selected_names, rows


# ---------------------------------------------------------------------------
# Table control reading
# ---------------------------------------------------------------------------

def read_table_control(
    session: Any,
    table_id: str,
    max_rows: int = 0,
) -> Tuple[List[str], List[List[str]]]:
    """Read data from a table control.

    Returns: (column_names, rows)
    """
    table = get_element_or_raise(session, table_id)
    columns = table.Columns
    col_names = []
    for c in range(columns.Count):
        try:
            col = columns(c)
            col_names.append(col.Title if col.Title else col.Name)
        except Exception:
            col_names.append(f"COL_{c}")

    row_count = table.RowCount
    visible_rows = table.VisibleRowCount
    if max_rows > 0:
        row_count = min(row_count, max_rows)

    rows = []
    for r in range(row_count):
        # Scroll if needed
        if r >= visible_rows:
            table.VerticalScrollbar.Position = r
        row = []
        for c in range(columns.Count):
            try:
                col = columns(c)
                cell_id = f"{table_id}/txtF{col.Name}[{r % visible_rows},{c}]"
                cell = find_element(session, cell_id)
                if cell is None:
                    cell_id = f"{table_id}/ctxtF{col.Name}[{r % visible_rows},{c}]"
                    cell = find_element(session, cell_id)
                row.append(cell.Text if cell else "")
            except Exception:
                row.append("")
        rows.append(row)

    return col_names, rows


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

def format_table(headers: List[str], rows: List[List[str]], max_col_width: int = 40) -> str:
    """Format data as an ASCII table."""
    if not headers:
        return "(no data)"

    # Calculate column widths
    widths = [min(len(h), max_col_width) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            if i < len(widths):
                widths[i] = min(max(widths[i], len(str(val))), max_col_width)

    # Build table
    sep = "+" + "+".join("-" * (w + 2) for w in widths) + "+"
    header_line = "|" + "|".join(f" {h:<{widths[i]}} " for i, h in enumerate(headers)) + "|"

    lines = [sep, header_line, sep]
    for row in rows:
        vals = []
        for i, w in enumerate(widths):
            v = str(row[i]) if i < len(row) else ""
            if len(v) > w:
                v = v[:w-1] + "~"
            vals.append(f" {v:<{w}} ")
        lines.append("|" + "|".join(vals) + "|")
    lines.append(sep)

    return "\n".join(lines)
