#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SAP ADT MCP server for abaper — typed tool layer over the same sap_adt_lib/sap_client
engine the CLI scripts use.

WHY THIS EXISTS (two wins the CLI scripts can't give):
  1. Persistent session / lock reuse. A CLI script is a fresh process per call:
     new HTTP session, new CSRF, new lock — a retry re-locks and can orphan the
     previous lock into a ghost transport. This server is long-lived and keeps ONE
     SAPClient (its requests.Session, sap-contextid cookie, CSRF token, and any
     lock handle) alive across tool calls. SAP sees one continuous stateful session,
     so lock -> push -> activate -> unlock share context and retries reuse it.
  2. Native typed tools + clean result objects. Every tool returns a structured dict
     ({ok, ...} / {ok: false, error, message}) instead of stdout the agent must parse.

Run standalone:   python adt_mcp_server.py
Registered as a Claude Code plugin MCP server via plugins/abaper/.mcp.json.

Config: resolves .conn_adt from ADT_CWD env (or the launch cwd). Guardrails
(guardrails.py) and ADT_READONLY apply exactly as in the CLI path.
"""
from __future__ import annotations

import contextlib
import io
import os
import sys
from pathlib import Path

# scripts/ dir (this file's dir) on path so sap_client / sap_adt_lib / guardrails import.
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

# CRITICAL (stdio MCP): sys.stdout IS the JSON-RPC channel. sap_client/sap_doctor
# call print() liberally — those bytes would corrupt the protocol. And redirecting
# sys.stdout per-call (the old approach) RACES FastMCP's response write and HANGS
# the call until the client disconnects. Fix: route ALL print() to stderr
# process-wide and NEVER touch sys.stdout. (Confirmed: the tool functions return in
# ~2s when called directly; only the global-stdout-redirect path hung.)
import builtins as _builtins
_orig_print = _builtins.print
def _stderr_print(*args, **kwargs):
    kwargs.setdefault("file", sys.stderr)
    return _orig_print(*args, **kwargs)
_builtins.print = _stderr_print

from mcp.server.fastmcp import FastMCP

mcp = FastMCP(
    name="abaper-sap-adt",
    instructions=(
        "SAP ABAP Development Tools (ADT) over a persistent session. Work only in the "
        "Z/Y customer namespace (package ZAI by default). ALWAYS confirm a transport with "
        "the user (adt_list_transports) before any write. Guardrails refuse standard-object "
        "writes/deletes; set ADT_READONLY=true to make a QA/PRD connection read-only."
    ),
)

# --- persistent client: the heart of win #1 ---------------------------------
_client = None

# --- auth-failure circuit breaker (v1.4.x) -----------------------------------
# A bad-credential .conn_adt otherwise lets an agent loop retry logins forever,
# burning SAP's login/fails_to_user_lock attempts (typically 5) and LOCKING the
# account. Once ANY tool call surfaces a real auth failure (401/403), latch it
# process-wide: every subsequent _get_client() call (i.e. every SAP-touching
# tool except ping/adt_doctor, which never call it, and adt_logon, which passes
# bypass_auth_latch=True to attempt one recovery probe) short-circuits with
# error_type=AuthLockdown instead of hitting SAP again. Single-user stdio
# server — a plain module dict is enough, no locks/threads needed.
_AUTH_LATCH = {"failed": False, "detail": ""}


class _AuthLockdownError(Exception):
    """Raised by _get_client() while the auth latch is set (see _AUTH_LATCH)."""
    pass


def _get_client(bypass_auth_latch: bool = False):
    """Lazily build ONE SAPClient and keep it for the server's lifetime.

    This single instance carries the requests.Session (connection pool +
    sap-contextid cookie), the CSRF token, and any active lock handle across
    every tool call — which is exactly what removes the re-lock / orphaned-lock
    ghost-transport class the per-process CLI suffers from.

    bypass_auth_latch: adt_logon passes True so it can attempt ONE recovery
    probe even while the auth latch is set (see _AUTH_LATCH) — every other
    caller is refused before it ever touches SAP.
    """
    global _client
    if _AUTH_LATCH["failed"] and not bypass_auth_latch:
        raise _AuthLockdownError(
            f"SAP auth is latched after a prior authentication failure "
            f"({_AUTH_LATCH['detail']}) — refusing further SAP calls to avoid tripping "
            f"login/fails_to_user_lock (SAP account lockout, typically 5 attempts)."
        )
    if _client is None:
        cwd = os.getenv("ADT_CWD")
        if cwd:
            from sap_adt_lib import set_explicit_working_dir
            set_explicit_working_dir(cwd)
        from sap_client import SAPClient
        _client = SAPClient()
    return _client


@contextlib.contextmanager
def _quiet():
    """Capture SAPClient chatter/errors into a buffer by redirecting STDERR.

    print() is globally routed to stderr at import, so redirecting stderr here
    captures the diagnostics/errors for surfacing in the result. Redirecting
    stderr is SAFE — unlike stdout, it is NOT the stdio JSON-RPC channel, so it
    cannot race/hang the protocol response (that was the v1.2.18 bug)."""
    buf = io.StringIO()
    with contextlib.redirect_stderr(buf):
        yield buf


# --- remediation hints (v1.4.x) ----------------------------------------------
# Maps error_type / error / code strings actually produced in this file and in
# sap_client.py's push_object() to a one-line, actionable next step — so an agent
# can self-recover without re-reading SKILL.md. Additive only: never changes what
# error is raised, only enriches the returned dict with result["hint"].
_HINTS = {
    "AuthLockdown": (
        "Fix credentials in .conn_adt, then restart the MCP server to clear the latch."
    ),
    "GhostTransportPrevented": (
        "SAP returned no CORRNR (object is released-owned or transport-less). In SE09 "
        "open a modifiable request and use 'Include Objects', or pin a valid transport "
        "with adt_set_transport, then retry."
    ),
    "GhostRedirectPrevented": (
        "The owning transport is a 'Generated Request for Change Recording' ghost. "
        "Reassign the object to a real request in SE09/SE03, then retry."
    ),
    "NoTransportResolved": (
        "No transport could be resolved. Confirm one with adt_list_transports and pin it "
        "via adt_set_transport, or pass transport= explicitly."
    ),
    "SourceDriftDetected": (
        "The live active source changed since you last read it (another agent may have "
        "edited it). Re-run adt_get_source to rebase, reapply your change, then push."
    ),
    "PrePushValidationFailed": (
        "A pre-push validator blocked the source (e.g. TYPE c LENGTH n in a method "
        "signature). Fix the flagged line and retry."
    ),
    # lock conflicts — SAPLockError covers BOTH an enqueue (SM12) lock and a CTS object
    # lock (E071K, "locked in request"); the exception message names which.
    "locked": (
        "Locked. If it's your own enqueue (SM12) lock, try adt_clear_lock. If the message "
        "mentions a CTS object lock (E071K / 'locked in request'), that is NOT clearable by "
        "adt_clear_lock — use SE03 -> Transport Organizer Tools -> 'Unlock Objects (Expert "
        "Tool)', or release/reassign the owning task."
    ),
    "SAPLockError": (
        "Locked. If it's your own enqueue (SM12) lock, try adt_clear_lock. If the message "
        "mentions a CTS object lock (E071K / 'locked in request'), that is NOT clearable by "
        "adt_clear_lock — use SE03 -> Transport Organizer Tools -> 'Unlock Objects (Expert "
        "Tool)', or release/reassign the owning task."
    ),
    "foreign_lock": (
        "Lock is held by another user — adt_clear_lock refuses to force-release it. "
        "Ask that user to release it, or use SM12 with the right authorization."
    ),
    "not_removed": (
        "The object is still recorded in the transport (in a task, or locked in the "
        "request). Remove it in SE09 (Object List -> delete the entry), or remove it from "
        "the owning task."
    ),
    "already_exists": (
        "Object already exists. Often fine for an idempotent create; if you intended a NEW "
        "object use a different name, or inspect the existing one with adt_get_source / "
        "adt_search first."
    ),
    "SAPObjectExistsError": (
        "Object already exists. Often fine for an idempotent create; if you intended a NEW "
        "object use a different name, or inspect the existing one with adt_get_source / "
        "adt_search first."
    ),
}


def _hint_for(*codes) -> str:
    """First remediation hint matching any of the given error_type/error/code
    strings (checked in order) — "" if none match. Never raises."""
    for c in codes:
        if c and c in _HINTS:
            return _HINTS[c]
    return ""


def _with_hint(result: dict) -> dict:
    """Merge a remediation hint into an error dict, keyed off result['error_type'] /
    ['error'] / ['code'] — only if the call failed and no hint is already set.
    Additive only: never touches ok/error/message."""
    if isinstance(result, dict) and result.get("ok") is False and "hint" not in result:
        h = _hint_for(result.get("error_type"), result.get("error"), result.get("code"))
        if h:
            result["hint"] = h
    return result


def _err(exc: Exception) -> dict:
    """Map SAP exceptions to a structured error object."""
    from sap_adt_lib import (
        SAPAuthenticationError, SAPConnectionError, SAPObjectNotFoundError,
        SAPObjectExistsError, SAPLockError, SAPActivationError, SAPValidationError,
        SAPADTError,
    )
    # v1.4.x: the auth-latch short-circuit (see _get_client/_AUTH_LATCH) never touched
    # SAP, so it gets its own error_type instead of falling through to "unexpected".
    if isinstance(exc, _AuthLockdownError):
        return _with_hint({"ok": False, "error": "auth_lockdown",
                           "error_type": "AuthLockdown", "message": str(exc)})
    mapping = [
        (SAPAuthenticationError, "auth_failed"),
        (SAPConnectionError, "connection_failed"),
        (SAPObjectNotFoundError, "not_found"),
        (SAPObjectExistsError, "already_exists"),
        (SAPLockError, "locked"),
        (SAPActivationError, "activation_failed"),
        (SAPValidationError, "validation_error"),
        (SAPADTError, "sap_error"),
    ]
    code = "unexpected"
    for cls, c in mapping:
        if isinstance(exc, cls):
            code = c
            break
    out = {"ok": False, "error": code, "message": str(exc)}
    if isinstance(exc, SAPLockError) and getattr(exc, "lock_owner", None):
        out["lock_owner"] = exc.lock_owner
    # v1.4.x: a real auth failure latches the circuit breaker so no further tool call
    # retries a logon and trips SAP's login/fails_to_user_lock (see _AUTH_LATCH).
    if isinstance(exc, SAPAuthenticationError):
        _AUTH_LATCH["failed"] = True
        _AUTH_LATCH["detail"] = str(exc)[:300]
    # v1.3.4: network-drop triage hint — a dropped VPN shows up as a requests-level
    # connection exception; tell the agent the recovery path instead of a bare error.
    _n = type(exc).__name__
    if 'Connection' in _n or _n in ('Timeout', 'ConnectTimeout', 'ReadTimeout',
                                    'SSLError', 'ChunkedEncodingError', 'ProtocolError'):
        out["hint"] = ("Network/VPN drop suspected — reconnect VPN, then retry the call; "
                       "adt_logon re-validates the persistent session.")
    return _with_hint(out)


# ============================================================================
# Tools
# ============================================================================

# Raw GitHub URL of the published plugin manifest (source of truth for "latest").
_GITHUB_PLUGIN_JSON = (
    "https://raw.githubusercontent.com/global-innovation-lab/"
    "ntt-claude-marketplace/main/plugins/abaper/.claude-plugin/plugin.json"
)


def _vtuple(v):
    """'1.4.10' -> (1,4,10) for correct numeric comparison; () if unparseable."""
    try:
        return tuple(int(x) for x in str(v).strip().split("."))
    except Exception:
        return ()


def _newest_installed_version():
    """The newest abaper version present in the plugin cache (OFFLINE, authoritative).
    _SCRIPTS_DIR = .../cache/<marketplace>/abaper/<ver>/skills/sap-adt/scripts, so
    parents[3] is the 'abaper' dir whose children are the installed version folders.
    Returns (version_str, vtuple) of the max, or (None, ()). Never raises.

    This is the signal that catches the real-world trap: the MCP process keeps
    running an OLD version while a newer one sits installed in the cache, and an
    agent globbing the cache can load an even older one. No network needed.
    """
    try:
        vroot = _SCRIPTS_DIR.parents[3]
        best, best_t = None, ()
        for child in vroot.iterdir():
            if child.is_dir():
                t = _vtuple(child.name)
                if t and t > best_t:
                    best, best_t = child.name, t
        return best, best_t
    except Exception:
        return None, ()


def _github_latest_version(timeout=3):
    """Best-effort: the latest published abaper version from GitHub. The repo may be
    PRIVATE, so try `gh api` (uses the user's auth) first, then unauthenticated raw
    (works only if public). Returns a version string or None. Never raises, never
    blocks long. Skipped when ABAP_VERSION_CHECK=off."""
    if os.getenv("ABAP_VERSION_CHECK", "").lower() in ("off", "0", "false", "no"):
        return None
    import json as _json
    # 1) gh CLI (private-repo capable, if installed AND authenticated)
    try:
        import subprocess as _sp
        out = _sp.run(
            ["gh", "api", "-H", "Accept: application/vnd.github.raw",
             "repos/global-innovation-lab/ntt-claude-marketplace/contents/"
             "plugins/abaper/.claude-plugin/plugin.json"],
            capture_output=True, text=True, timeout=timeout
        )
        if out.returncode == 0 and out.stdout.strip().startswith("{"):
            return _json.loads(out.stdout).get("version")
    except Exception:
        pass
    # 2) unauthenticated raw (only works once the repo is public)
    try:
        import urllib.request as _u
        req = _u.Request(_GITHUB_PLUGIN_JSON, headers={"User-Agent": "abaper-version-check"})
        with _u.urlopen(req, timeout=timeout) as r:
            return _json.loads(r.read().decode("utf-8")).get("version")
    except Exception:
        return None


def _plugin_info() -> dict:
    """Report the running plugin version + install path so an agent can verify WHICH
    code is actually loaded. /reload-plugins does not always restart this MCP process,
    so the on-disk version and the running version can drift — this surfaces the truth.
    Also compares against the latest version on GitHub (best-effort) so a stale
    install is caught before it causes ghost-transport / behavior drift.
    """
    info = {"version": "unknown", "install_path": str(_SCRIPTS_DIR)}
    try:
        import json as _json
        pj = _SCRIPTS_DIR.parents[2] / ".claude-plugin" / "plugin.json"
        info["version"] = _json.loads(pj.read_text(encoding="utf-8")).get("version", "unknown")
    except Exception:
        pass

    running_t = _vtuple(info["version"])

    # (1) OFFLINE, authoritative: is a newer version already installed in the cache
    #     that this still-running MCP process has NOT loaded? (the stale-process trap)
    newest, newest_t = _newest_installed_version()
    if newest:
        info["newest_installed"] = newest
        if running_t and newest_t and newest_t > running_t:
            info["stale_process"] = True
            info["update_hint"] = (
                f"This MCP is RUNNING abaper {info['version']} but {newest} is already "
                f"installed in the cache. Restart the MCP/Claude Code to load it. ALWAYS "
                f"resolve the scripts dir from this ping's install_path — never glob the "
                f"cache (it keeps every old version)."
            )

    # (2) BEST-EFFORT network: a newer version published on GitHub (private repo ->
    #     needs gh auth; silently skipped when unavailable). Compare to newest_installed.
    latest = _github_latest_version()
    if latest:
        info["latest_version"] = latest
        base_t = newest_t or running_t
        if base_t and _vtuple(latest) > base_t:
            info["update_available"] = True
            info.setdefault("update_hint",
                f"abaper {latest} is published on GitHub (installed: "
                f"{newest or info['version']}). Run /plugin update "
                f"abaper@ntt-abap-marketplace, then restart the MCP.")
    return info


@mcp.tool()
def ping() -> dict:
    """Sanity check — is the MCP server alive, which .conn_adt is active, and (critically)
    which plugin VERSION/code path is actually running (to detect stale-process drift)?"""
    cwd = os.getenv("ADT_CWD") or str(Path.cwd())
    return {"ok": True, "service": "abaper-sap-adt", "cwd": cwd,
            "readonly": os.getenv("ADT_READONLY", "").lower() in ("true", "1", "yes"),
            **_plugin_info()}


@mcp.tool()
def adt_doctor(package: str = "ZAI", probe: str = "", object_type: str = "class") -> dict:
    """Layered connection/environment diagnostic (.conn_adt -> auth/VPN/SAML -> package).

    Returns {ok, rc, report} where report is the human-readable layered output.
    """
    try:
        import sap_doctor
        # Capture the report via a temporary print() shim (NOT sys.stdout redirect,
        # which would race the stdio protocol channel and hang).
        lines = []
        prev = _builtins.print
        _builtins.print = lambda *a, **k: lines.append(" ".join(str(x) for x in a))
        try:
            rc = sap_doctor.run(os.getenv("ADT_CWD"), package, probe or None, object_type)
        finally:
            _builtins.print = prev
        # Keep only the final "SAP DOCTOR" report block (drop SAPClient probe chatter).
        rep = lines
        for i in range(len(lines) - 1, -1, -1):
            if "SAP DOCTOR" in lines[i]:
                rep = lines[max(0, i - 1):]
                break
        return {"ok": rc == 0, "rc": rc, "report": "\n".join(rep)}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_logon() -> dict:
    """Verify SAP connection + auth on the persistent session (VPN/credentials/SAML)."""
    try:
        client = _get_client(bypass_auth_latch=True)
        with _quiet():
            client.adt_client.fetch_csrf_token()
        a = client.adt_client
        # v1.4.x: a successful authentication clears the circuit-breaker latch (see
        # _AUTH_LATCH) so normal tool calls resume.
        _AUTH_LATCH["failed"] = False
        _AUTH_LATCH["detail"] = ""
        return {"ok": True, "url": a.url, "client": a.client, "user": a.user, **_plugin_info()}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_sql(query: str, max_rows: int = 100, acknowledge_risk: bool = False,
            approval_text: str = "") -> dict:
    """Run a read-only ABAP SQL SELECT via ADT data preview. Returns {ok, columns, rows, total_rows}.

    PII/KVKK guard (v1.4.7): on a QA/PRD system (.conn_adt ADT_SAP_TIER), reading a
    sensitive table (KNA1/LFA1/BSEG/PA*/…/TCKN/VKN) is refused unless acknowledge_risk=true
    AND approval_text contains an affirmative word ('approve'/'proceed'/'onay'). DEV is exempt.
    """
    try:
        from guardrails import require_data_access, GuardrailViolation
        import re as _re
        # Extract the first table after FROM/JOIN for the guard (best-effort).
        _m = _re.search(r'\b(?:FROM|JOIN)\s+([A-Za-z_/][A-Za-z0-9_/]*)', query or '', _re.IGNORECASE)
        _table = _m.group(1) if _m else None
        try:
            require_data_access(_table, acknowledge_risk=acknowledge_risk,
                                approval_text=approval_text or None, what="adt_sql read")
        except GuardrailViolation as gv:
            return gv.as_dict()
        client = _get_client()
        with _quiet():
            result = client.run_sql_query(query=query, max_rows=max_rows)
        if not result:
            return {"ok": False, "error": "no_result", "message": "Query returned no result object"}
        return {"ok": True, "columns": result.get("columns", []),
                "rows": result.get("data", []), "total_rows": result.get("total_rows", 0)}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_list_transports(modifiable_only: bool = True) -> dict:
    """List the current user's transports. Use this to pick a transport BEFORE any write."""
    try:
        client = _get_client()
        with _quiet():
            transports = client.list_user_transports()
        items = transports or []
        if modifiable_only:
            items = [t for t in items if str(t.get("status", "")).upper() in ("D", "MODIFIABLE", "")]
        return {"ok": True, "transports": items}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_get_source(name: str, object_type: str = "class", grep: str = "", method: str = "") -> dict:
    """Get an object's active source. Returns {ok, name, type, source}.

    Optional token-saving read filters (both default to "" — unset means
    byte-for-byte the original full-source behavior):
      grep:   a regex. Only matching lines plus a few lines of context are
              returned, each prefixed with its 1-based line number.
      method: a method/FORM name. Only that unit's source is returned (the
              METHODS declaration + METHOD...ENDMETHOD block for classes, or
              the FORM...ENDFORM block for reports).
    If both are set, `method` is applied first, then `grep` within its output.
    When either filter is used the result also carries filtered=True plus
    full_lines/shown_lines so it's obvious the view is partial.
    """
    try:
        from object_types import get_source_url
        client = _get_client()
        src_url = get_source_url(name, object_type)
        with _quiet():
            # version='active' (matches this tool's "active source" contract AND the drift
            # check's read, so a dangling inactive version can't false-drift the next push).
            source = client.adt_client.get_object_source(src_url, version='active')
            # v1.4.8: record this read as the session baseline so a later adt_push can
            # detect a concurrent edit (drift) before silently overwriting it.
            # NOTE: this MUST see the full, unfiltered source — always — even when
            # grep/method below narrow what's actually returned to the caller.
            try:
                client.note_source_baseline(src_url, source)
            except Exception:
                pass

        if not grep and not method:
            return {"ok": True, "name": name, "type": object_type, "source": source}

        # --- optional read-filter path (additive; only reached when grep/method set) ---
        import re as _re_mod
        from source_slice import grep_source, extract_method
        full_lines = len(source.splitlines())
        view = source

        if method:
            extracted = extract_method(view, method)
            if extracted is None:
                return {"ok": True, "name": name, "type": object_type, "source": "",
                        "filtered": True, "full_lines": full_lines, "shown_lines": 0,
                        "message": f"Method/form '{method}' not found in {name}."}
            view = extracted

        if grep:
            try:
                view = grep_source(view, grep)
            except _re_mod.error as rex:
                return {"ok": False, "error": "invalid_grep_pattern", "message": str(rex)}
            if not view:
                where = f" in method '{method}'" if method else ""
                return {"ok": True, "name": name, "type": object_type, "source": "",
                        "filtered": True, "full_lines": full_lines, "shown_lines": 0,
                        "message": f"No lines matching /{grep}/{where} for {name}."}

        shown_lines = len(view.splitlines())
        return {"ok": True, "name": name, "type": object_type, "source": view,
                "filtered": True, "full_lines": full_lines, "shown_lines": shown_lines}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_list_package(package: str = "ZAI") -> dict:
    """List objects in a package. Returns {ok, package, count, objects}."""
    try:
        client = _get_client()
        with _quiet():
            contents = client.list_package_contents(package)
        return {"ok": True, "package": package, "count": len(contents or []), "objects": contents or []}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_where_used(name: str, object_type: str = "class") -> dict:
    """Find usages of an object. Returns {ok, usages}."""
    try:
        client = _get_client()
        with _quiet():
            usages = client.where_used(object_name=name, object_type=object_type)
        return {"ok": True, "usages": usages or []}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_clear_lock(name: str, object_type: str = "class", transport: str = "") -> dict:
    """Clear the current user's stale ENQUEUE lock on an object (SM12-equivalent).

    Does NOT touch CTS object locks ("locked in request" — those need SE03).
    """
    try:
        from object_types import get_object_url
        client = _get_client()
        url = get_object_url(name, object_type)
        a = client.adt_client
        with _quiet():
            status = a.is_object_locked(url)
            if status and status.get("locked"):
                owner = (status.get("lock_owner") or "").upper()
                if owner and owner not in ((a.user or "").upper(), "UNKNOWN"):
                    return _with_hint({"ok": False, "error": "foreign_lock",
                            "message": f"Lock held by {owner}; use SM12 (won't force-release another user)."})
                cleared = a.clear_enqueue_lock(url, transport=transport or None)
                after = a.is_object_locked(url)
                return {"ok": bool(cleared and not (after and after.get("locked"))),
                        "locked_before": True, "cleared": bool(cleared)}
            return {"ok": True, "locked_before": False, "message": "Not locked; nothing to clear."}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_set_transport(transport: str = "") -> dict:
    """Pin the session's WORKSTREAM TRANSPORT — all subsequent writes (adt_push,
    adt_delete_object) default to it when no transport is passed. Confirm the number
    with the user FIRST (adt_list_transports). Pass transport="" to clear the pin.

    Held in the MCP process memory only (never on disk), so a new session always
    forces re-confirmation — the 'never reuse a transport from memory' rule, enforced
    structurally. Validation: must exist, be MODIFIABLE (D/L), owned by the logon
    user, and not carry SAP's ghost description.
    """
    try:
        client = _get_client()
        if not transport:
            had = getattr(client, "session_transport", None)
            client.session_transport = None
            return {"ok": True, "pinned": None,
                    "message": f"Session transport cleared (was {had})." if had else "No pin was set."}
        trkorr = transport.strip().upper()
        with _quiet():
            info = client.get_transport_info(trkorr)
        if not info:
            return {"ok": False, "error": "not_found",
                    "message": f"Transport {trkorr} not found/visible. adt_list_transports to see yours."}
        status = (info.get("status") or "").upper()
        owner = (info.get("owner") or "").upper()
        me = (client.adt_client.user or "").upper()
        desc = (info.get("description") or "").strip()
        if status not in ("D", "L", "MODIFIABLE"):
            return {"ok": False, "error": "not_modifiable",
                    "message": f"Transport {trkorr} has status '{status}' — only modifiable (D/L) may be pinned."}
        if owner and me and owner != me:
            return {"ok": False, "error": "foreign_transport",
                    "message": f"Transport {trkorr} belongs to {owner}, not {me} — pin refused."}
        if desc.lower() == "generated request for change recording":
            return {"ok": False, "error": "ghost_transport",
                    "message": f"Transport {trkorr} is an auto-generated ghost — pin refused."}
        client.session_transport = trkorr
        return {"ok": True, "pinned": trkorr, "owner": owner, "status": status,
                "description": desc,
                "message": f"Session transport pinned: {trkorr} — writes default to it until cleared."}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_transport_status() -> dict:
    """Show the session's transport situation: the pinned workstream transport (if any)
    with its details, task, and recorded-object count. READ-ONLY orientation call."""
    try:
        client = _get_client()
        pinned = getattr(client, "session_transport", None)
        if not pinned:
            return {"ok": True, "pinned": None,
                    "message": "No session transport pinned. adt_set_transport after confirming with the user."}
        _e = lambda v: str(v or '').replace("'", "''")
        with _quiet():
            info = client.get_transport_info(pinned)
            task = None
            objects = []
            try:
                t = client.run_sql_query(
                    f"SELECT trkorr FROM e070 WHERE strkorr = '{_e(pinned)}' AND trfunction = 'S'", 5)
                rows = (t or {}).get('data') or []
                task = rows[0][0] if rows and rows[0] else None
                for tr in filter(None, [pinned, task]):
                    o = client.run_sql_query(
                        f"SELECT pgmid, object, obj_name FROM e071 WHERE trkorr = '{_e(tr)}'", 50)
                    for r in (o or {}).get('data') or []:
                        objects.append({"trkorr": tr, "pgmid": r[0], "type": r[1], "name": r[2]})
            except Exception:
                pass
        return {"ok": True, "pinned": pinned, "details": info or {}, "task": task,
                "object_count": len(objects), "objects": objects[:30]}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_push(name: str, object_type: str, source_file: str, transport: str = "",
             ack_drop: str = "") -> dict:
    """Push (lock -> upload -> activate -> unlock) an object's source to SAP.

    `transport` is optional — resolution chain when omitted: the transport that already
    OWNS the object (ghost-checked) > the session-pinned transport (adt_set_transport) >
    REFUSE with the eligible-request list (error_type=NoTransportResolved). Never
    auto-creates, never guesses.

    Pre-push validators (v1.4.7) refuse before the bytes hit SAP: a class with
    `TYPE c LENGTH n` in a METHODS signature (opaque HTTP 400), and a DDIC table ALTER
    that DROPS/RETYPES a live field (data loss) — name the field(s) in `ack_drop`
    (comma-separated) to consciously permit a drop. Tier/binding guards also apply.

    Guardrails apply (Z/Y namespace, ADT_READONLY, tier). Returns push_object's structured
    result: {success, source_uploaded, activated, version_active, lock_released, corrnr,
    task, addobject_status, ghost_prevented, transport_redirect?, error, error_type}.
    Reuses the persistent session, so a retry does not spawn a fresh lock/ghost.
    """
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            result = client.push_object(object_name=name, object_type=object_type,
                                        transport=transport, source_file=source_file,
                                        ack_drop=ack_drop or None)
        result = dict(result) if isinstance(result, dict) else {"success": bool(result)}
        result["ok"] = bool(result.get("success"))
        result["log"] = buf.getvalue()[-4000:]
        return _with_hint(result)
    except Exception as exc:
        out = _err(exc)
        if buf is not None:  # v1.3.4: keep the log on the exception path too
            out["log"] = buf.getvalue()[-3000:]
        return out


@mcp.tool()
def adt_create(object_type: str, name: str, package: str, description: str,
               transport: str = "") -> dict:
    """Create a new ABAP object. Guardrails apply (Z/Y namespace, ADT_READONLY)."""
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            url = client.create_object(object_type=object_type, name=name, package=package,
                                       description=description, transport=transport or None)
        log = buf.getvalue()
        if url:
            return {"ok": True, "name": name, "type": object_type, "url": url}
        # FALSE-NEGATIVE FIX (v1.3.2): some ADT create responses omit the Location
        # header, so create_object returns a None URL even though the object WAS created
        # (log shows "[OK] Object created successfully"). Never report failure on a URL-less
        # success — verify by existence first. This also subsumes the idempotent
        # "already exists" (405) case: in every branch the source of truth is "does the
        # object now exist in SAP", not "did ADT echo a URL".
        created_marker = ("object created successfully" in log.lower())
        try:
            with _quiet():
                md = client.get_object_metadata(name, object_type)
        except Exception:
            md = None
        if md or created_marker:
            already = ("already exist" in log.lower() or "405" in log) and not created_marker
            return {"ok": True, "name": name, "type": object_type, "url": url or None,
                    "message": ("Object already exists (verified — idempotent create)." if already
                                else "Object created (ADT returned no URL; verified by existence).")}
        return {"ok": False, "error": "create_failed", "message": (log[-800:] or "create returned no URL")}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:  # v1.3.4: keep the log on the exception path too
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_activate(name: str, object_type: str = "class") -> dict:
    """Activate an object. Returns {ok, activated, log}. On failure the log carries the
    activation messages (syntax errors etc.) instead of swallowing them."""
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            ok = client.activate_object(object_name=name, object_type=object_type)
        out = {"ok": bool(ok), "activated": bool(ok)}
        if not ok and buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_delete_object(name: str, object_type: str = "class", transport: str = "",
                      confirm_name: str = "", force: bool = False) -> dict:
    """Delete a customer (Z/Y) ABAP object — DESTRUCTIVE, double-confirmed.

    Guardrails: refuses standard (non Z/Y) objects and read-only connections.
    DOUBLE CHECK: pass confirm_name == name AND force=True. Without both, NOTHING is
    deleted and a preview is returned. Provide transport=<an open request you own> so the
    deletion is recorded there (else SAP may auto-generate a ghost for the deletion entry).
    """
    buf = None
    try:
        if not (force and confirm_name and confirm_name.upper() == name.upper()):
            return {"ok": False, "error": "confirmation_required",
                    "message": (f"Refusing to delete {object_type} '{name}'. To proceed, call again "
                                f"with confirm_name='{name}' AND force=true, and pass "
                                f"transport=<an OPEN request you own> to record the deletion.")}
        client = _get_client()
        with _quiet() as buf:
            ok = client.delete_object(object_name=name, object_type=object_type,
                                      transport=transport or None, confirm=False)
        return {"ok": bool(ok), "deleted": bool(ok), "name": name, "type": object_type,
                "log": buf.getvalue()[-1500:]}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:  # v1.3.4: keep the log on the exception path too
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_remove_from_transport(name: str, transport: str, object_type: str = "class") -> dict:
    """Remove an object's R3TR entry from a transport request/task — the inverse of the
    push-time addobject. Use to clean a mis-placed entry (e.g. a K-request-level row left by an
    earlier tool) or an orphaned include. Pass the request OR task number that holds the entry.
    Guardrails apply (Z/Y namespace, ADT_READONLY).
    """
    try:
        from guardrails import require_writable, require_customer_namespace, GuardrailViolation
        try:
            require_writable(what="remove from transport")
            require_customer_namespace(name, what=object_type)
        except GuardrailViolation as gv:
            return {"ok": False, "error": "guardrail", "message": str(gv)}
        client = _get_client()
        with _quiet():
            res = client.adt_client.remove_object_from_transport(name, transport, object_type)
            # VERIFY (never trust the bare 200): the 'removeobject' action returns HTTP 200
            # even when it does not actually delete the E071 row (e.g. the object is recorded
            # in a task / locked in the request). Confirm by re-reading E071 and report the
            # TRUTH, with the SE09 fallback when SAP declined.
            still_there = None
            try:
                _e = lambda v: str(v or '').replace("'", "''")
                chk = client.run_sql_query(
                    f"SELECT trkorr FROM e071 WHERE obj_name = '{_e(name.upper())}' "
                    f"AND trkorr = '{_e(transport.upper())}'", 2)
                still_there = bool((chk or {}).get('data'))
            except Exception:
                still_there = None
        if res.get("removed") and still_there is False:
            return {"ok": True, "removed": True, "name": name, "transport": transport,
                    "status_code": res.get("status_code")}
        if still_there:
            return _with_hint({"ok": False, "removed": False, "name": name, "transport": transport,
                    "status_code": res.get("status_code"), "error": "not_removed",
                    "message": (f"SAP accepted the removeobject call (HTTP {res.get('status_code')}) "
                                f"but {name} is still recorded in {transport} — it is in a task or "
                                f"locked in the request. Remove it in SE09 (Object List -> delete the "
                                f"entry / release the object lock), or remove from the owning task.")})
        # could not verify (E071 read failed) — surface the raw lib result
        return {"ok": bool(res.get("removed")), "name": name, "transport": transport,
                "verified": False, **res}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_transport_check(name: str, object_type: str = "class", operation: str = "",
                        package: str = "", link_up: bool = False) -> dict:
    """Pre-write transport check (READ-ONLY) — Eclipse's pre-lock check via
    /sap/bc/adt/cts/transportchecks (backend CTS_WBO_API_CHECK_OBJECTS; no lock, no DB change).
    Tells you whether the object needs a transport (`recording_required`), which OPEN
    requests/tasks may record it (`requests`), whether only an existing request may be used
    (`existing_req_only`), and whether it's locked in a foreign request (`locks[].foreign`).
    Run this BEFORE a push to pick the right transport. For a create pass operation='I' and
    package=<pkg>. Returns {ok, result, recording_required, existing_req_only, requests, locks,
    messages}.
    """
    try:
        from object_types import get_object_url
        client = _get_client()
        obj_url = get_object_url(name, object_type)
        with _quiet():
            res = client.adt_client.transport_check(obj_url, operation=operation,
                                                    devclass=package, link_up=link_up)
        return res if isinstance(res, dict) else {"ok": False, "error": "no_result"}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_create_package(name: str, description: str, super_package: str = "ZAI",
                       transport: str = "", sw_component: str = "HOME",
                       transport_layer: str = "", package_type: str = "development") -> dict:
    """Create a new SAP package (e.g. a sub-package under ZAI).

    Requires a transport. Guardrails apply (Z/Y namespace, ADT_READONLY).
    Returns {ok, package, location, message}.
    """
    try:
        from guardrails import (require_writable, require_customer_namespace,
                                 require_transport, GuardrailViolation)
        try:
            require_writable(what="create package")
            require_customer_namespace(name, what="package")
            require_transport(transport, what="package creation")
        except GuardrailViolation as gv:
            return {"ok": False, "error": "guardrail_violation", "message": str(gv)}

        from create_package import create_package as _create_package
        client = _get_client()
        with _quiet() as buf:
            result = _create_package(
                client.adt_client, name=name, description=description,
                super_package=super_package, sw_component=sw_component,
                transport_layer=transport_layer, package_type=package_type,
                transport=transport,
            )
        out = dict(result) if isinstance(result, dict) else {"success": bool(result)}
        out["ok"] = bool(out.get("success"))
        log = buf.getvalue()
        # Idempotent: an existing package is success per the skill's create rule.
        if not out["ok"] and "already exist" in (str(out.get("message", "")) + log).lower():
            out["ok"] = True
            out["message"] = f"Package {name} already exists (idempotent)."
        out["log"] = log[-800:]
        return out
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_create_transport(description: str, package: str = "ZAI") -> dict:
    """Create a new workbench transport request. Returns {ok, transport, message}.

    Guardrails: refused if ADT_READONLY is set. Picks the on-prem or BTP Cloud
    variant automatically. Prefer adt_list_transports + reusing an existing
    transport unless the user explicitly wants a new one.
    """
    try:
        from guardrails import require_writable, GuardrailViolation
        try:
            require_writable(what="create transport")
        except GuardrailViolation as gv:
            return {"ok": False, "error": "guardrail_violation", "message": str(gv)}
        # v1.3.4: the description 'Generated Request for Change Recording' is RESERVED —
        # it is SAP's auto-generated-ghost signature, and abaper's ghost defenses key on
        # it (GhostRedirectPrevented refuses to push into any transport so described).
        # Creating one by hand would make every push to it refuse. Refuse early instead.
        if (description or "").strip().lower() == "generated request for change recording":
            return {"ok": False, "error": "reserved_description",
                    "message": ("'Generated Request for Change Recording' is SAP's ghost-transport "
                                "signature and is reserved — abaper's defenses refuse to push into "
                                "transports so described. Choose a different description.")}
        client = _get_client()
        with _quiet():
            result = client.adt_client.create_transport(description=description, package_name=package)
        if isinstance(result, dict) and result.get("success"):
            return {"ok": True, "transport": result.get("transport"), "message": result.get("message", "")}
        return {"ok": False, "error": "create_failed", "message": str(result)}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_generate_screen(program: str, dynpro: str = "0100", title: str = "Liste",
                        screen_type: str = "DOCKING", cc_name: str = "CC_ALV",
                        mode: str = "WRITE", recreate: bool = False,
                        transport: str = "", language: str = "", fm_name: str = "") -> dict:
    """Generate a classic Dynpro screen + GUI status + titlebar (what ADT cannot do).

    Calls an RFC-enabled generator FM over the SOAP-RFC channel (dialog context;
    classrun fails with 400). The generator must already exist on the system AND be
    Remote-Enabled (SE37) — see the screen-gen skill's one-time bootstrap. The FM name
    defaults to ZAI_FM_SCREEN_GEN (or env ABAP_SCREEN_GEN_FM); pass fm_name to override
    if you installed the template under a different name.

    Names are DYNAMIC from `dynpro`: screen <n>, MODULE status_<n>/user_command_<n>,
    GUI status STAT<n>, titlebar TIT<n>. The program MUST use the same number.

    screen_type: DOCKING (no container) or CONTAINER (one custom control = cc_name;
    also the base for split screens, which are split in ABAP via cl_gui_splitter_container).
    mode: WRITE (generate) / READ (inspect) / DELETE. Guardrail: customer (Z/Y) programs only.
    EV_RC=0 OK, EV_RC=2 already existed (idempotent). After WRITE: syntax-check + activate.
    """
    try:
        # The caller (screen-gen skill) lives in a sibling skill dir.
        screen_gen_scripts = _SCRIPTS_DIR.parents[1] / "screen-gen" / "scripts"
        if str(screen_gen_scripts) not in sys.path:
            sys.path.insert(0, str(screen_gen_scripts))
        from generate_screen import generate_screen as _generate_screen

        client = _get_client()
        with _quiet():
            result = _generate_screen(
                client.adt_client, program=program, dynpro=dynpro, title=title,
                screen_type=screen_type, cc_name=cc_name, mode=mode, recreate=recreate,
                transport=transport or None, language=language or None,
                fm_name=fm_name or None,
            )
        return result if isinstance(result, dict) else {"ok": bool(result)}
    except ImportError as exc:
        return {"ok": False, "error": "screen_gen_unavailable",
                "message": f"screen-gen skill not found alongside sap-adt: {exc}"}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_delete_transport(transport: str, confirm_transport: str = "", force: bool = False) -> dict:
    """Delete a MODIFIABLE transport the current user OWNS — DESTRUCTIVE, double-confirmed.

    Safety (all enforced; any failure = no-op):
      - Refused if ADT_READONLY is set.
      - Ownership: the transport's E070 owner must equal the logon user (no foreign deletes).
      - Status: must be modifiable (D/L); released (R/N/O) is refused.
      - DOUBLE CHECK: pass confirm_transport equal to `transport` AND force=True. If either
        is missing/mismatched, returns {error:'confirmation_required'} with a preview of the
        owner/status/description and DELETES NOTHING.

    Recommended flow: call once with just `transport` to see the preview, then call again
    with confirm_transport=<same number> and force=True to delete. SAP also refuses
    deletion of non-empty requests (release/reassign objects first).
    """
    try:
        client = _get_client()
        with _quiet():
            result = client.delete_transport(
                transport=transport,
                confirm_transport=confirm_transport or None,
                force=force,
            )
        return result if isinstance(result, dict) else {"ok": bool(result)}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_check_scatter(object_name: str) -> dict:
    """Check whether a class's CTS includes are scattered across multiple transports.

    Read-only. Scans the transport-organizer tree for the R3TR entry + all LIMU includes
    (CLSD/CPUB/CPRO/CPRI/METH) of `object_name`. Returns {ok, scattered,
    modifiable_requests, requests}. scattered=true means the includes sit in >1 MODIFIABLE
    request — a push will fragment it further; consolidate first (SE09 / moveobjects).
    Run this BEFORE pushing a class you suspect is fragmented.
    """
    try:
        client = _get_client()
        with _quiet():
            res = client.check_object_scatter(object_name)
        return {"ok": True, **res}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_syntax_check(name: str, object_type: str = "class") -> dict:
    """Syntax-check an object WITHOUT activating (ADT activation pre-audit mode).
    Checks the object as it exists in SAP (incl. its inactive version) — to check new
    source, push it first (push runs activation anyway; this tool is for a standalone
    check). Returns {ok, valid, errors, warnings}."""
    try:
        client = _get_client()
        with _quiet():
            res = client.syntax_check(object_name=name, object_type=object_type)
        if not isinstance(res, dict):
            return {"ok": False, "error": "no_result"}
        # Honesty: the lib catches exceptions into {'valid': False, 'error': ...} —
        # surface that as a FAILURE, not as "syntax invalid with zero errors".
        if res.get("error"):
            return {"ok": False, "error": "check_failed", "message": str(res["error"])[:300]}
        return {"ok": True, "valid": bool(res.get("valid")),
                "errors": res.get("errors", []), "warnings": res.get("warnings", [])}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_atc_check(name: str, object_type: str = "class", variant: str = "DEFAULT") -> dict:
    """Run ATC (ABAP Test Cockpit) quality checks on an object or package — READ-ONLY
    analysis. Returns {ok, findings:[{priority, check, message, location}...]}."""
    try:
        client = _get_client()
        with _quiet():
            res = client.run_atc_check(object_name=name, object_type=object_type, variant=variant)
        if not isinstance(res, dict):
            return {"ok": False, "error": "no_result", "message": "ATC returned no result object"}
        return {"ok": True, **res}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_unit_test(name: str, object_type: str = "class") -> dict:
    """Run ABAP Unit tests for an object.

    IMPORTANT: this EXECUTES ABAP code on the SAP system (runs the object's test
    classes) — it writes nothing to the CTS/transport system (no source change, no
    lock, no activation), but unlike adt_syntax_check/adt_atc_check it is not a
    passive read: SAP actually runs the tests, which can have side effects if the
    tests themselves are not properly isolated (that risk is inherent to ABAP Unit,
    not to this tool).

    Returns {ok, object, passed, failed, errors,
    alerts:[{kind, severity, title, message, location}...], duration}.
    """
    try:
        client = _get_client()
        with _quiet():
            res = client.run_unit_tests(object_name=name, object_type=object_type)
        if not isinstance(res, dict):
            return {"ok": False, "error": "no_result", "message": "Unit test run returned no result object"}
        return res
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_search(query: str, max_results: int = 50, obj_type: str = "") -> dict:
    """Search the ABAP repository for objects by name pattern (wildcards: 'ZAI*').
    Optional obj_type filter ('CLAS', 'INTF', 'PROG', 'TABL', ...). READ-ONLY.
    Returns {ok, count, objects:[{name, type, uri, description}]}."""
    try:
        client = _get_client()
        with _quiet():
            res = client.search_objects(query=query, max_results=max_results,
                                        obj_type=obj_type or None)
        items = res or []
        return {"ok": True, "count": len(items), "objects": items}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_code_search(query: str, max_results: int = 50) -> dict:
    """Full-text search of ABAP source CODE (statements/string literals) system-wide
    — READ-ONLY. Distinct from adt_search: adt_search matches OBJECT NAMES
    (quickSearch, wildcards like 'ZAI*'); this tool searches INSIDE source code for
    the given text (e.g. every place a literal, field name, or statement appears),
    regardless of what the containing object is named.

    Returns {ok, count, results:[{uri, name, type, description, line?, snippet?}...]}.

    On a system/release where the ADT textSearch endpoint isn't available (401/403
    = missing S_ADT_RES authorization or not exposed to this user; 404 = ICF service
    not activated / SAP_BASIS < 7.51), returns {ok: false, error:
    "text_search_unavailable", status_code, message} instead of raising — fall back
    to adt_search (object-name search) in that case.
    """
    try:
        client = _get_client()
        with _quiet():
            res = client.code_search(query=query, max_results=max_results)
        if not isinstance(res, dict):
            return {"ok": False, "error": "no_result", "message": "code_search returned no result object"}
        return res
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_revisions(name: str, object_type: str = "class") -> dict:
    """Get an object's version history (who changed it, when, which transport).
    READ-ONLY. Returns {ok, count, revisions:[{uri, date, author, version, versionTitle}]}."""
    try:
        from object_types import get_object_url
        client = _get_client()
        obj_url = get_object_url(name, object_type)
        with _quiet():
            revs = client.adt_client.get_object_revisions(obj_url)
        items = revs or []
        return {"ok": True, "count": len(items), "revisions": items}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_inactive_objects() -> dict:
    """List all inactive (not yet activated) objects in the system — READ-ONLY.
    Useful before mass activation or to see what a failed activation left behind.
    Returns {ok, count, objects:[{name, type, uri, user}]}."""
    try:
        client = _get_client()
        with _quiet():
            res = client.list_inactive_objects()
        if res is None:
            # Honesty: None = the lib hit an error (often a dropped connection) —
            # do NOT report it as "zero inactive objects".
            return {"ok": False, "error": "no_result",
                    "message": "Inactive-object read failed (connection?). Retry; adt_logon re-validates."}
        return {"ok": True, "count": len(res), "objects": res}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_badi_discovery(badi_definition: str, max_implementations: int = 15) -> dict:
    """Discover a classic BAdI's full cross-reference graph — READ-ONLY table reads:
    definition header (SXS_ATTR) -> interface (SXS_INTER) -> implementations (SXC_EXIT)
    -> active flag (SXC_ATTR) -> implementing class (SXC_CLASS). Far richer than a flat
    list: you immediately see which class implements the BAdI and whether it's active.
    Classic BAdIs only (new-style enhancement-spot BAdIs live in ENH* tables).
    Returns {ok, badi_definition, interface, multi_use, filter_dependent, implementations}."""
    try:
        client = _get_client()
        _e = lambda v: str(v or '').upper().replace("'", "''")
        badi = _e(badi_definition)

        def _q(sql, n=30):
            r = client.run_sql_query(sql, n)
            return (r or {}).get('data') or []

        with _quiet():
            # SXS_ATTR real columns (verified live): EXIT_NAME, MLTP_USE, FLT_TYPE (filter
            # data element -> filter-dependent if set), INTERNAL, DEVCLASS, MIG_ENHSPOTNAME.
            hdr = _q(f"SELECT exit_name, internal, mltp_use, flt_type, devclass, mig_enhspotname "
                     f"FROM sxs_attr WHERE exit_name = '{badi}'", 2)
            if not hdr:
                return {"ok": False, "error": "not_found",
                        "message": (f"No classic BAdI definition '{badi}' in SXS_ATTR. "
                                    f"If it is a new-style (enhancement-spot) BAdI it lives in "
                                    f"ENH* tables — check SE18/SE20.")}
            inter = _q(f"SELECT inter_name FROM sxs_inter WHERE exit_name = '{badi}'", 2)
            impls = _q(f"SELECT imp_name, flt_val FROM sxc_exit WHERE exit_name = '{badi}'", 50)

            implementations = []
            for row in impls[:max_implementations]:
                imp = (row[0] or '').strip()
                if not imp:
                    continue
                imp_e = _e(imp)
                attr = _q(f"SELECT active FROM sxc_attr WHERE imp_name = '{imp_e}'", 2)
                cls = _q(f"SELECT imp_class FROM sxc_class WHERE imp_name = '{imp_e}'", 2)
                implementations.append({
                    "impl_name": imp,
                    "impl_class": (cls[0][0] or '').strip() if cls and cls[0] else '',
                    "active": bool(attr and attr[0] and (attr[0][0] or '').strip() == 'X'),
                    "filter_value": (row[1] or '').strip() if len(row) > 1 else '',
                })

        h = (hdr[0] + [None] * 6)[:6]
        return {"ok": True, "badi_definition": badi,
                "interface": (inter[0][0] or '').strip() if inter and inter[0] else '',
                "internal": (h[1] or '').strip() == 'X',
                "multi_use": (h[2] or '').strip() == 'X',
                "filter_dependent": bool((h[3] or '').strip()),
                "package": (h[4] or '').strip(),
                "migrated_enhancement_spot": (h[5] or '').strip(),
                "implementation_count": len(impls),
                "implementations": implementations,
                "truncated": len(impls) > max_implementations}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_dumps(max_results: int = 10) -> dict:
    """List recent ABAP short dumps (ST22) via the ADT runtime feed — READ-ONLY.
    Each entry: title (exception/category), user, date, uri (full dump text), categories.
    The go-to first move when 'the program dumped' — no SAPGUI needed."""
    try:
        client = _get_client()
        with _quiet():
            res = client.adt_client.list_runtime_dumps(max_results=max_results)
        return res if isinstance(res, dict) else {"ok": False, "error": "no_result"}
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Optional local HTTP transport (Option B).
# For agents/clients that CANNOT speak stdio MCP (e.g. aXet.code with only a
# `fetch` tool). Because this runs in the SAME long-lived process, it reuses the
# SAME persistent SAPClient (_get_client singleton) => same requests.Session,
# sap-contextid cookie, CSRF token and lock handles across every HTTP call =>
# lock/push/activate/unlock share one SAP session => NO ghost transports, same
# as stdio MCP. Single-user, localhost-only by default. This is NOT multi-tenant:
# one .conn_adt, one client, calls serialized. Every guardrail / auth latch /
# error hint applies because it calls the exact same tool functions.
#   Run:   python adt_mcp_server.py --http [--host 127.0.0.1] [--port 8787]
#   Call:  POST http://127.0.0.1:8787/tool/adt_sql   body: {"query":"..."}
#          GET  http://127.0.0.1:8787/tools           (names + JSON schemas)
#          GET  http://127.0.0.1:8787/health
#   Optional auth: set env ABAP_HTTP_TOKEN => require "Authorization: Bearer <t>".
# ---------------------------------------------------------------------------
import json as _json
import threading as _threading

_HTTP_CALL_LOCK = _threading.Lock()  # serialize tool calls: ONE SAPClient session


def _http_tool_specs():
    """Map tool name -> {fn, schema, description} for every registered MCP tool.

    Tool name == function name, and @mcp.tool() leaves the plain function as a
    module global, so the HTTP layer dispatches to the identical callable the
    stdio path uses (all guardrails/latch/hints included, zero duplication).
    """
    import asyncio
    mod = sys.modules[__name__]
    try:
        tools = asyncio.run(mcp.list_tools())
    except Exception:
        tm = getattr(mcp, "_tool_manager", None)
        tools = list(getattr(tm, "_tools", {}).values()) if tm else []
    specs = {}
    for t in tools:
        name = getattr(t, "name", None)
        fn = getattr(mod, name, None) if name else None
        if callable(fn):
            specs[name] = {
                "fn": fn,
                "schema": getattr(t, "inputSchema", None),
                "description": (getattr(t, "description", "") or "").split("\n")[0],
            }
    return specs


def run_http(host: str = "127.0.0.1", port: int = 8787) -> None:
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    specs = _http_tool_specs()
    token = os.getenv("ABAP_HTTP_TOKEN", "").strip()

    class _Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def _send(self, code, obj):
            body = _json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _auth_ok(self):
            if not token:
                return True
            return self.headers.get("Authorization", "") == f"Bearer {token}"

        def log_message(self, *a):  # never write to stdout/stderr per request
            pass

        def do_GET(self):
            if not self._auth_ok():
                return self._send(401, {"ok": False, "error": "unauthorized"})
            if self.path in ("/", "/health"):
                return self._send(200, {"ok": True, "server": "abaper-sap-adt-http",
                                        "tool_count": len(specs), "tools": sorted(specs)})
            if self.path == "/tools":
                return self._send(200, {"ok": True, "tools": [
                    {"name": n, "description": s["description"], "schema": s["schema"]}
                    for n, s in sorted(specs.items())]})
            return self._send(404, {"ok": False, "error": "not_found"})

        def do_POST(self):
            if not self._auth_ok():
                return self._send(401, {"ok": False, "error": "unauthorized"})
            if not self.path.startswith("/tool/"):
                return self._send(404, {"ok": False, "error": "not_found",
                                        "message": "use POST /tool/<name>"})
            name = self.path[len("/tool/"):].strip("/")
            spec = specs.get(name)
            if not spec:
                return self._send(404, {"ok": False, "error": "unknown_tool",
                                        "message": f"no tool {name!r}; GET /tools for the list"})
            try:
                clen = int(self.headers.get("Content-Length", 0) or 0)
                raw = self.rfile.read(clen) if clen else b""
                kwargs = _json.loads(raw.decode("utf-8")) if raw else {}
                if not isinstance(kwargs, dict):
                    raise ValueError("request body must be a JSON object of kwargs")
            except Exception as exc:
                return self._send(400, {"ok": False, "error": "bad_request", "message": str(exc)})
            try:
                with _HTTP_CALL_LOCK:            # ONE SAPClient => one call at a time
                    result = spec["fn"](**kwargs)
            except TypeError as exc:
                return self._send(400, {"ok": False, "error": "bad_args", "message": str(exc)})
            except Exception as exc:
                try:
                    result = _err(exc)
                except Exception:
                    result = {"ok": False, "error": "tool_exception", "message": str(exc)}
            return self._send(200, result if isinstance(result, dict)
                              else {"ok": True, "result": result})

    srv = ThreadingHTTPServer((host, port), _Handler)
    local = host in ("127.0.0.1", "localhost", "::1")
    sys.stderr.write(
        f"[abaper-http] listening on http://{host}:{port}  ({len(specs)} tools)\n"
        + ("" if local else
           "[abaper-http] !! WARNING: non-localhost bind exposes SAP write ops on the network!\n")
        + f"[abaper-http] auth: {'Bearer token (ABAP_HTTP_TOKEN)' if token else 'none - localhost only'}\n"
        + "[abaper-http] GET /tools  |  POST /tool/<name> with JSON kwargs\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


def main():
    import argparse
    ap = argparse.ArgumentParser(add_help=False, description="abaper SAP ADT server")
    ap.add_argument("--http", action="store_true",
                    help="Run a local HTTP transport instead of stdio MCP (for non-MCP clients)")
    ap.add_argument("--host", default="127.0.0.1", help="HTTP bind host (default localhost)")
    ap.add_argument("--port", type=int, default=8787, help="HTTP port (default 8787)")
    args, _unknown = ap.parse_known_args()
    if args.http:
        run_http(args.host, args.port)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
