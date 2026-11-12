"""Leftover SAP sessions: record the engine's stateful session, close it when its process died.

Every lock the engine takes lives in ONE stateful ADT context on the SAP side. When the
server process is killed (a closed terminal, a launcher restart, a crash) that context
stays open until SAP's own timeout, and with it every lock: the next session is told
"User D_ONERO is currently editing ZCL_..." about the user's own object, and
adt_clear_lock cannot see why.

So the engine writes down which context it holds, and a later engine in the same project
closes the contexts whose process is gone. Measured on NS4 (2026-11-12): a request that
carries the dead context's two cookies -- `sap-contextid` and the security session
`SAP_SESSIONID_<SID>_<client>` -- with `x-sap-adt-sessiontype: stateless` ends that
context, and its locks are released at once. `sap-sessioncmd=close` on an ADT URL did not;
the old context id with a NEW login did not (HTTP 400).

The record therefore holds those two cookies, which together are a live session for as
long as SAP keeps it. It lives in `<project>/.sap_sessions/` (gitignored, like the SAML
cookie file), holds no password and no SSO ticket, and is deleted once the context is
closed or the process ends cleanly. Idea from mcp-abap-adt's leftover-session handling
(rebuilt from the wire format; that project's request code is LGPL).

Standard library and `requests` only; nothing here imports the engine.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

RECORD_DIR = ".sap_sessions"
RECORD_PREFIX = "adt-session-"
CLOSE_PATH = "/sap/bc/adt/compatibility/graph"
# A record older than this is past any SAP session timeout: drop it without a call.
MAX_RECORD_AGE_S = 24 * 3600


def session_cookies(jar) -> list[dict]:
    """The two cookies that identify a stateful ADT context, or [] when there is none."""
    out = []
    for c in jar:
        n = c.name.lower()
        if n == "sap-contextid" or n.startswith("sap_sessionid"):
            out.append({"name": c.name, "value": c.value, "domain": c.domain or "",
                        "path": c.path or "/"})
    return out if any(c["name"].lower() == "sap-contextid" for c in out) else []


def record_path(project_dir, pid: int) -> Path:
    return Path(project_dir) / RECORD_DIR / f"{RECORD_PREFIX}{pid}.json"


def write_record(project_dir, pid: int, url: str, user: str, client: str,
                 cookies: list[dict]) -> Path:
    """Write (atomically) which context this process holds."""
    path = record_path(project_dir, pid)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps({"pid": pid, "written": int(time.time()), "url": url,
                               "user": (user or "").upper(), "client": client or "",
                               "cookies": cookies}), encoding="utf-8")
    os.replace(tmp, path)
    return path


def remove_record(project_dir, pid: int) -> None:
    try:
        record_path(project_dir, pid).unlink()
    except FileNotFoundError:
        pass


def pid_alive(pid: int) -> bool:
    """True when a process with this id runs. On doubt, True: a live session is never closed."""
    if pid <= 0:
        return False
    if sys.platform == "win32":
        import ctypes
        k32 = ctypes.windll.kernel32
        handle = k32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return k32.GetLastError() == 5  # access denied: it exists
        try:
            code = ctypes.c_ulong()
            if not k32.GetExitCodeProcess(handle, ctypes.byref(code)):
                return True
            return code.value == 259  # STILL_ACTIVE
        finally:
            k32.CloseHandle(handle)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def read_records(project_dir) -> list[dict]:
    folder = Path(project_dir) / RECORD_DIR
    out = []
    for p in sorted(folder.glob(f"{RECORD_PREFIX}*.json")) if folder.is_dir() else []:
        try:
            rec = json.loads(p.read_text(encoding="utf-8"))
            rec["_path"] = str(p)
            out.append(rec)
        except (OSError, ValueError):
            out.append({"_path": str(p), "_unreadable": True})
    return out


def leftovers(project_dir, own_pid: int, url: str, user: str, client: str,
              alive=pid_alive, now=None) -> tuple[list[dict], list[dict]]:
    """(to_close, stale): contexts of dead processes of THIS user on THIS system.

    A record of another user or system is never touched. `stale` are records too old
    to still be open on the SAP side (or unreadable); they are only deleted.
    """
    now = time.time() if now is None else now
    to_close, stale = [], []
    for rec in read_records(project_dir):
        if rec.get("_unreadable"):
            stale.append(rec)
            continue
        if rec.get("pid") == own_pid or alive(int(rec.get("pid") or 0)):
            continue
        if (rec.get("url"), rec.get("user"), rec.get("client")) != (url, (user or "").upper(), client or ""):
            continue
        if now - float(rec.get("written") or 0) > MAX_RECORD_AGE_S:
            stale.append(rec)
        else:
            to_close.append(rec)
    return to_close, stale


def close_context(rec: dict, verify=True, timeout: int = 30) -> int:
    """End a recorded context (and release its locks). Returns the HTTP status."""
    import requests
    s = requests.Session()
    s.verify = verify
    for c in rec.get("cookies") or []:
        s.cookies.set(c["name"], c["value"], domain=c.get("domain") or "", path=c.get("path") or "/")
    params = {"sap-client": rec["client"]} if rec.get("client") else None
    r = s.get(rec["url"].rstrip("/") + CLOSE_PATH, params=params, timeout=timeout,
              headers={"x-sap-adt-sessiontype": "stateless", "Accept": "*/*"})
    return r.status_code


def close_leftovers(project_dir, own_pid: int, url: str, user: str, client: str,
                    verify=True, closer=close_context, alive=pid_alive) -> dict:
    """Close every leftover context of this user and delete its record. Never raises."""
    report = {"closed": [], "failed": [], "dropped": 0}
    try:
        to_close, stale = leftovers(project_dir, own_pid, url, user, client, alive=alive)
    except Exception as exc:  # a broken folder must not stop a logon
        return {**report, "error": str(exc)[:200]}
    for rec in stale:
        _unlink(rec["_path"])
        report["dropped"] += 1
    for rec in to_close:
        entry = {"pid": rec.get("pid"), "age_min": int((time.time() - float(rec.get("written") or 0)) / 60)}
        try:
            entry["status"] = closer(rec, verify=verify)
        except Exception as exc:
            entry["error"] = str(exc)[:200]
        # A 200 ends it; 400/401 means SAP no longer knows it -- also gone.
        if entry.get("status") in (200, 204, 400, 401, 404):
            _unlink(rec["_path"])
            report["closed"].append(entry)
        else:
            report["failed"].append(entry)
    return report


def _unlink(path: str) -> None:
    try:
        Path(path).unlink()
    except OSError:
        pass
