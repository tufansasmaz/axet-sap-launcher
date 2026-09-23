#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SAP ADT MCP server for sap-consultant — typed tool layer over the same sap_adt_lib/sap_client
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
Registered as a Claude Code plugin MCP server via plugins/sap-consultant/.mcp.json.

Config: resolves .conn_adt from ADT_CWD env (or the launch cwd). Guardrails
(guardrails.py) and ADT_READONLY apply exactly as in the CLI path.
"""
from __future__ import annotations

import contextlib
import functools
import io
import json
import os
import re
import sys
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


def _forbid_unknown_tool_arguments():
    """Make the stdio MCP path REFUSE an argument no tool declares.

    FastMCP builds a pydantic model per tool from its signature, and pydantic's
    default is `extra='ignore'`. So an argument the tool does not have is dropped
    without a word: on 2026-08-20 `adt_push(create_if_missing=True)` was accepted
    twice and did nothing, and `adt_capabilities` answered `ok` to two invented
    arguments (run 3, COMPARISON3 finding 3). A *missing required* argument is
    caught; an *extra* one was not. That is the same silent divergence between what
    was asked and what was done that this engine was repaired for.

    The engine's own HTTP transport never had the problem — it calls the function
    directly, so Python raises TypeError and the bridge answers `bad_args`. Only
    the stdio path needed this.

    Reaches into a FastMCP internal, so it fails *soft*: if the class moves on a
    version bump the server still starts — a consultant mid-task is not helped by an
    import crash — and the warning says what protection was lost. CI cannot catch
    that drift for us (it installs neither `mcp` nor `pydantic`); what CI does check
    is that this function still exists and still asks for `extra='forbid'`.
    `adt_capabilities` reports the flag, so the answer is one call away on a real
    machine.
    """
    try:
        from pydantic import ConfigDict
        from mcp.server.fastmcp.utilities.func_metadata import ArgModelBase
    except Exception as exc:                      # pragma: no cover - version drift
        sys.__stderr__.write(
            f"[sap-adt] WARNING: cannot reach FastMCP's argument model "
            f"({type(exc).__name__}); unknown tool arguments will be silently "
            f"ignored on the stdio path. See COMPARISON3 finding 3.\n")
        return False
    cfg = dict(getattr(ArgModelBase, "model_config", {}) or {})
    cfg["extra"] = "forbid"
    ArgModelBase.model_config = ConfigDict(**cfg)
    return True


_UNKNOWN_ARGS_REFUSED = _forbid_unknown_tool_arguments()

mcp = FastMCP(
    name="sap-consultant-sap-adt",
    instructions=(
        "SAP ABAP Development Tools (ADT) over a persistent session. Work only in the "
        "Z/Y customer namespace (package ZAI by default). ALWAYS confirm a transport with "
        "the user (adt_list_transports) before any write. Guardrails refuse standard-object "
        "writes/deletes; set ADT_READONLY=true to make a QA/PRD connection read-only."
    ),
)

# --- failure honesty --------------------------------------------------------
# FastMCP sets isError ONLY when a tool raises. A tool that returns
# {"ok": False} therefore reaches the client indistinguishable from a success,
# and the client here is an agent. Measured on a live NS4 run before this
# wrapper existed: 64 calls, 64 reported ok, 26 of them failed -- including a
# package create that 409'd and two deletes that did nothing. Anything reading
# the MCP error flag carried on as if the writes had landed.
#
# DIAGNOSIS.md S4 prescribes the fix for one tool (replace the substring
# success-flip with a read-back). This is the same fix applied at the boundary
# instead of per tool: wrapping mcp.tool once leaves all 49 existing
# `"ok": False` return sites untouched, so no tool has to change and none can
# be forgotten. The payload is preserved verbatim in the raised message, so a
# caller that used to read the dict loses nothing -- FastMCP renders it as
# `Error executing tool <name>: {...}`, and the JSON starts at the first brace.
class ToolFailure(Exception):
    """Raised so FastMCP marks the response isError; carries the full payload."""


def _is_failure(result) -> bool:
    """True when a tool's own payload says the operation did not succeed.

    `ok` is authoritative when present: it is this layer's own verdict, set after
    the tool has had its say about idempotent no-ops and URL-less creates, while
    `success` is the raw flag from the library underneath. Where they disagree
    the later judgement is the right one -- an existing package is a success even
    though the create call that found it returned success=False.

    `deleted` is deliberately not consulted: a delete preview legitimately
    returns deleted=False alongside ok=True.
    """
    if not isinstance(result, dict):
        return False
    if "ok" in result:
        return result["ok"] is False
    return result.get("success") is False


def _create_failure(log: str) -> dict:
    """A create that returned False, reported by its cause rather than its banner.

    The three creator wrappers each answered with `log[-900:]`, and the tail of a
    captured stdout is not the reason: a create that fails early prints its
    banner and little else, so the caller got
    "====== Creating ABAP Class: X ====== Package: ZOO001 ..." -- their own
    request echoed back, cause nowhere. Measured on NS4 2026-09-03.

    _salvage_error already knows how to lift a [FAIL]/[ERROR] block out of a
    prose log. Reuse it, and keep the log alongside instead of in place of the
    message.
    """
    salvaged = _salvage_error({"log": log})
    return {"ok": False, "error": "create_failed",
            "message": (salvaged.get("message") or salvaged.get("error")
                        or "creator returned False without stating a reason"),
            "log": (log or "")[-900:]}


def _salvage_error(result: dict) -> dict:
    """Fill an empty `error` from the prose log of a failed call.

    push_object can return success=False with error="" while its log holds the
    only statement of the cause -- live example, a table whose dependencies were
    inactive:

        [FAIL] Activation failed
               Activation was cancelled.
               Nametab for table ZCM901_T_PRCEXC cannot be generated

    A caller reading `error` got an empty string. Both machine-readable channels
    were then uninformative in the same call, which is the pair this wrapper
    exists to close. Additive: never overwrites an error the tool did set.
    """
    if result.get("error") or result.get("message"):
        return result
    log = result.get("log")
    if not isinstance(log, str):
        return result
    lines, block = log.splitlines(), []
    for i, line in enumerate(lines):
        if "[FAIL]" in line or "[ERROR]" in line:
            marker = line.strip()
            block = [marker.split("]", 1)[1].strip() or marker]
            indent = len(line) - len(line.lstrip())
            for nxt in lines[i + 1:]:
                if not nxt.strip():
                    break
                if len(nxt) - len(nxt.lstrip()) <= indent:
                    break
                block.append(nxt.strip())
            break
    if block:
        result["error"] = " / ".join(block)
        result.setdefault("error_source", "log")
    return result


_fastmcp_tool = mcp.tool


def _trace(line):
    """Write a trace line to the REAL stderr, flushed.

    Not print() and not sys.stderr: this module replaces print at import, and
    under mcp.run() sys.stderr is not necessarily the fd the parent captures --
    the first version of this trace produced exactly one line and lost the rest.
    sys.__stderr__ with an explicit flush is the one channel that survives.
    """
    try:
        sys.__stderr__.write("[SESSION] " + line + "\n")
        sys.__stderr__.flush()
    except Exception:
        pass


def _session_fingerprint():
    """Which SAP session is this call actually using?

    The engine's central claim is that ONE session spans every tool call - its
    cookies, CSRF token and lock handles included. In-process that holds; through
    the MCP server, consecutive calls behave like different editors (SAP answers
    "User X is currently editing" to a write following its own create). This
    reports the cookies that would show it, so the claim can be measured instead
    of argued about. See PROPOSAL.md addendum 2.

    Reads the module global rather than calling _get_client(), so tracing never
    triggers a logon by itself.
    """
    try:
        if _client is None:
            return "no client yet"
        jar = getattr(getattr(_client, "adt_client", None), "session", None)
        if jar is None:
            return "no session"
        bits = [f"{c.name}={(c.value or '')[:24]}" for c in jar.cookies
                if "contextid" in c.name.lower() or "sessionid" in c.name.lower()]
        return "; ".join(sorted(bits)) or "no session cookie"
    except Exception as exc:  # never let tracing break a tool call
        return f"unreadable ({exc})"


_SESSION_TRACE = os.environ.get("ADT_SESSION_TRACE", "").strip().lower() in (
    "1", "true", "yes")


def _tool_reporting_failures(*d_args, **d_kwargs):
    decorate = _fastmcp_tool(*d_args, **d_kwargs)

    def register(fn):
        @functools.wraps(fn)  # keeps __doc__/__wrapped__ so FastMCP still
        def guarded(*args, **kwargs):  # derives the schema from the real signature
            # ADT_SESSION_TRACE=1 prints the SAP session identity around every tool
            # call, to stderr (stdout is the MCP protocol channel). Off by default:
            # it is a diagnostic for the question in PROPOSAL.md addendum 2, not
            # something a consultant needs in their log.
            if _SESSION_TRACE:
                _trace(f"-> {fn.__name__}: {_session_fingerprint()}")
            try:
                result = fn(*args, **kwargs)
            finally:
                if _SESSION_TRACE:
                    _trace(f"<- {fn.__name__}: {_session_fingerprint()}")
            if _is_failure(result):
                result = _salvage_error(result)
                raise ToolFailure(json.dumps(result, ensure_ascii=False, default=str))
            return result

        return decorate(guarded)

    return register


mcp.tool = _tool_reporting_failures

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


def _naming_gate(name: str, object_type: str, *, root_entity: str = "",
                 extends: str = ""):
    """The naming verdict for a create, and the refusal when this system blocks.

    Returns `(verdict, refusal)`. `refusal` is None unless `.conn_adt` sets
    ADT_NAMING=block AND the name is in breach -- in which case the caller
    returns it and creates nothing. Otherwise the verdict rides back in the
    successful result payload and the object is created either way, because a
    non-conforming name is a convention breach and not damage.

    Fail-soft on purpose, and this is the one place it is right to be: a
    convention check bolted onto a write engine must never be the reason a create
    fails. If naming.py cannot be imported or throws, the write proceeds exactly
    as it did before this module existed.
    """
    try:
        import naming
        verdict = naming.check(name, object_type, root_entity=root_entity,
                               extends=extends)
        if verdict.get("conforms") is False and naming.blocking():
            return verdict, {
                "ok": False, "error": "guardrail_violation", "code": "GR_NAMING",
                "message": (f"Name '{verdict['name']}' does not follow the naming "
                            f"standard ({verdict.get('rule', '')}). Expected: "
                            f"{verdict.get('expected')}. This system sets "
                            f"ADT_NAMING=block in .conn_adt."),
                "naming": verdict}
        return verdict, None
    except Exception:
        return None, None


def _with_naming(out: dict, verdict) -> dict:
    """Attach the verdict to a SUCCESSFUL create.

    Not on failure: a create that failed has a more urgent thing to say, and a
    naming warning stacked on an error reads as a second failure.
    """
    if verdict and isinstance(out, dict) and out.get("ok"):
        out["naming"] = verdict
    return out


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
    # `message` now carries SAP's own sentence appended to our label, because
    # SAPADTError.__str__ reads response_text (it did not until 2026-09-03, which
    # is why every refusal looked alike). Also expose it on its own key: a caller
    # deciding what to do next should not have to split a string, and the HTTP
    # status is the difference between "fix your SQL" and "ask for the role".
    reason = ""
    try:
        from sap_adt_lib import adt_reason_from_text
        reason = adt_reason_from_text(getattr(exc, "response_text", "") or "")
    except Exception:
        pass
    if reason:
        out["sap_message"] = reason
    if getattr(exc, "status_code", None):
        out["sap_status"] = exc.status_code
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
    "ntt-claude-marketplace/main/plugins/sap-consultant/.claude-plugin/plugin.json"
)


def _vtuple(v):
    """'1.4.10' -> (1,4,10) for correct numeric comparison; () if unparseable."""
    try:
        return tuple(int(x) for x in str(v).strip().split("."))
    except Exception:
        return ()


def _newest_installed_version():
    """The newest sap-consultant version present in the plugin cache (OFFLINE, authoritative).
    _SCRIPTS_DIR = .../cache/<marketplace>/sap-consultant/<ver>/skills/sap-adt/scripts, so
    parents[3] is the 'sap-consultant' dir whose children are the installed version folders.
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
    """Best-effort: the latest published sap-consultant version from GitHub. The repo may be
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
             "plugins/sap-consultant/.claude-plugin/plugin.json"],
            capture_output=True, text=True, timeout=timeout
        )
        if out.returncode == 0 and out.stdout.strip().startswith("{"):
            return _json.loads(out.stdout).get("version")
    except Exception:
        pass
    # 2) unauthenticated raw (only works once the repo is public)
    try:
        import urllib.request as _u
        req = _u.Request(_GITHUB_PLUGIN_JSON, headers={"User-Agent": "adt-version-check"})
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
                f"This MCP is RUNNING sap-consultant {info['version']} but {newest} is already "
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
                f"sap-consultant {latest} is published on GitHub (installed: "
                f"{newest or info['version']}). Run /plugin update "
                f"sap-consultant@ntt-abap-marketplace, then restart the MCP.")
    return info


@mcp.tool()
def ping() -> dict:
    """Sanity check — is the MCP server alive, which .conn_adt is active, and (critically)
    which plugin VERSION/code path is actually running (to detect stale-process drift)?"""
    cwd = os.getenv("ADT_CWD") or str(Path.cwd())
    return {"ok": True, "service": "sap-consultant-sap-adt", "cwd": cwd,
            "readonly": os.getenv("ADT_READONLY", "").lower() in ("true", "1", "yes"),
            **_plugin_info()}


_CAPABILITY_CACHE = {}

# Marks a probe that is an ACTION surface, not a creatable object — asking which
# tool "creates" ATC is a category error, and listing it as a gap would be noise.
_NOT_AN_OBJECT = "-"

# What this ENGINE can create, per probed feature. The probe itself only reads ADT's
# discovery document, which says what the SYSTEM offers; conflating the two is what
# let `service_definition: true` stand on a system where no tool can create one.
#
# Every name here is asserted to be a real tool by scripts/test_adt_engine.py — a map
# that drifts is the same lie in a new place.
_FEATURE_CREATORS = {
    "cds_view": "adt_create_cds_view",
    "access_control": "adt_create_access_control",
    "metadata_extension": "adt_create_metadata_extension",
    "behavior_definition": "adt_create_behavior_definition",
    "behavior_implementation": None,   # a behaviour pool lives in local includes;
                                       # this engine writes source/main only
    "service_definition": None,        # THE GAP run 3 found — nothing creates an SRVD
    "service_binding": "adt_create_service_binding",
    "type_group": "adt_create_type_group",
    "lock_object": "adt_create_lock_object",
    "table": "adt_create_ddic_shell",
    "transport": "adt_create_transport",
    "abapgit": None,                   # reached through the abapgit-bridge plugin
    "atc": _NOT_AN_OBJECT,
}


@mcp.tool()
def adt_capabilities(refresh: bool = False) -> dict:
    """What this SAP system offers, and separately what THIS ENGINE can build on it.

    Reads the system's own ADT discovery document and reports which collections
    exist. Answers "can this system do X" BEFORE a write fails at it, instead of
    after: `behaviorimplementation` has no collection on NS4 816 at all, and the
    only way to learn that used to be to attempt it and read a 404.

    **Two different questions, and they used to be answered as one.** `features`
    is the system's answer — what ADT declares. It says nothing about whether any
    tool here can create the thing. On 2026-08-20 an agent read
    `service_definition: true`, planned a RAP service around it, and discovered
    mid-build that no tool creates an SRVD (run 3 / COMPARISON3.md).

    Returns {ok, features:{name: bool}, missing:[...], creates_with:{name: tool},
    declared_but_no_creator:[...], warning?}. Read `creates_with` before planning a
    build, and treat `declared_but_no_creator` as "this system has it, bring
    another client". `refresh=True` re-reads; otherwise the first answer of the
    session is reused, because the discovery document is ~400 KB and does not
    change under a running system.
    """
    try:
        if _CAPABILITY_CACHE and not refresh:
            out = dict(_CAPABILITY_CACHE)
            out["cached"] = True
            return out
        client = _get_client()
        adt = client.adt_client
        with _quiet():
            r = adt.session.get(f"{adt.url}/sap/bc/adt/discovery",
                                headers=adt._get_headers('application/atomsvc+xml'),
                                timeout=adt.timeout_default)
        if r.status_code != 200:
            return {"ok": False, "error": "discovery_failed",
                    "message": f"ADT discovery answered HTTP {r.status_code}"}
        doc = r.text
        # Collection paths, not guesses: each is what the engine would POST to.
        probes = {
            "cds_view": "/sap/bc/adt/ddic/ddl/sources",
            "access_control": "/sap/bc/adt/acm/dcl/sources",
            "metadata_extension": "/sap/bc/adt/ddic/ddlx/sources",
            "behavior_definition": "/sap/bc/adt/bo/behaviordefinitions",
            "behavior_implementation": "/sap/bc/adt/behaviorimplementations",
            "service_definition": "/sap/bc/adt/ddic/srvd/sources",
            "service_binding": "/sap/bc/adt/businessservices/bindings",
            "type_group": "/sap/bc/adt/ddic/typegroups",
            "lock_object": "/sap/bc/adt/ddic/lockobjects/sources",
            "table": "/sap/bc/adt/ddic/tables",
            "transport": "/sap/bc/adt/cts/transportrequests",
            "abapgit": "/sap/bc/adt/abapgit",
            "atc": "/sap/bc/adt/atc",
        }
        # PREFIX match, not exact. ATC declares only sub-collections
        # (/atc/approvers, /atc/worklist, ...), so an exact match reported "ATC not
        # available" on a system where adt_atc_check demonstrably works. A capability
        # probe that answers a confident NO for a working feature is worse than none.
        features = {name: (f'href="{path}' in doc) for name, path in probes.items()}
        gaps = sorted(f for f, ok in features.items()
                      if ok and _FEATURE_CREATORS.get(f) is None)
        out = {"ok": True, "features": features,
               "missing": sorted(k for k, v in features.items() if not v),
               "creates_with": {f: t for f, t in _FEATURE_CREATORS.items()
                                if t not in (None, _NOT_AN_OBJECT)},
               "declared_but_no_creator": gaps,
               # False means a FastMCP version bump moved the internal this engine
               # patches, and an argument no tool declares is being dropped in
               # silence again on the stdio path. See _forbid_unknown_tool_arguments.
               "unknown_args_refused": _UNKNOWN_ARGS_REFUSED,
               "source": "ADT discovery document",
               "caveat": (
                   "`features` says what ADT DECLARES on this system — nothing more. It "
                   "is NOT a statement that this engine can build the thing. Read "
                   "`creates_with` for that, and `declared_but_no_creator` for the "
                   "difference. On 2026-08-20 an agent read service_definition:true, "
                   "planned a RAP service around it, and found no tool can create one "
                   "(run 3, COMPARISON3.md). Features reached by other means (gCTS, for "
                   "one) are absent here rather than reported false."),
               "cached": False}
        if gaps:
            out["warning"] = (
                "ADT declares " + ", ".join(gaps) + " but this engine has no tool to "
                "create " + ("them" if len(gaps) > 1 else "it") + ". Build "
                + ("those" if len(gaps) > 1 else "that") +
                " in Eclipse or another client first; everything downstream "
                "(source push, activation, binding, publish) works here.")
        _CAPABILITY_CACHE.clear()
        _CAPABILITY_CACHE.update(out)
        return out
    except Exception as exc:
        return _err(exc)


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
def adt_get_source(name: str, object_type: str = "class", grep: str = "",
                   method: str = "", include: str = "",
                   function_group: str = "") -> dict:
    """Get an object's active source. Returns {ok, name, type, source}.

    A CLASS is not one source file. `source/main` holds the global class only;
    local class definitions/implementations, macros and test classes each live in
    their own include. For a RAP behaviour pool (ZBP_*) main is a generated shell
    and the whole handler is in `implementations`.
      include: "definitions" | "implementations" | "macros" | "testclasses",
               or "all" to concatenate them. Classes only.

    A FUNCTION MODULE needs `function_group` — it has no URI of its own, and the
    group-less form 404s as if the module did not exist. Find the group with
    adt_sql("SELECT pname FROM tfdir WHERE funcname = 'ZFM_NAME'"): it is PNAME
    without the leading 'SAPL'. Writing one goes through adt_write_function_module,
    never adt_push.
    When `include` is unset and main turns out to have no implementation body,
    the result carries `includes` (a {name: line-count} map) and a `note` saying
    where the code actually is — so an empty-looking class is never reported as
    empty source.

    Optional token-saving read filters (both default to "" — unset means
    byte-for-byte the original full-source behavior):
      grep:   a regex. Only matching lines plus a few lines of context are
              returned, each prefixed with its 1-based line number.
      method: a method/FORM name. Only that unit's source is returned (the
              METHODS declaration + METHOD...ENDMETHOD block for classes, or
              the FORM...ENDFORM block for reports).
    If both are set, `method` is applied first, then `grep` within its output.
    Both apply to whichever source was selected, main or an include.
    When either filter is used the result also carries filtered=True plus
    full_lines/shown_lines so it's obvious the view is partial.
    """
    try:
        from object_types import get_source_url
        client = _get_client()
        is_class = object_type.lower() in ("class", "clas")

        if include and not is_class:
            return {"ok": False, "error": "include_not_supported",
                    "message": f"`include` applies to classes; {object_type} has "
                               f"no class includes. Drop the argument."}

        # --- explicit include read -------------------------------------------
        # No source baseline is recorded here: the baseline protects a later push
        # of source/main, and this is not that source.
        if include:
            with _quiet():
                advertised = client.adt_client.list_class_includes(name)
            usable = [e for e in advertised if e["includeType"] != "main"]
            if not usable:
                return {"ok": False, "error": "no_includes",
                        "message": f"{name} advertises no includes (or the class "
                                   f"could not be read)."}
            names = [e["includeType"] for e in usable]
            if include == "all":
                chosen = usable
            else:
                chosen = [e for e in usable if e["includeType"] == include]
                if not chosen:
                    return {"ok": False, "error": "unknown_include",
                            "message": f"{name} does not have include '{include}'. "
                                       f"It advertises: {names}."}
            parts = []
            with _quiet():
                for entry in chosen:
                    body = client.adt_client.get_class_include_source(
                        name, entry["sourceUri"])
                    parts.append(f"*--- {entry['includeType']} ---\n{body}"
                                 if len(chosen) > 1 else body)
            source = "\n".join(parts)
            result = {"ok": True, "name": name, "type": object_type,
                      "include": include, "available_includes": names,
                      "source": source}
            return _apply_read_filters(result, source, grep, method, name,
                                       object_type)

        src_url = get_source_url(name, object_type, function_group or None)
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

        result = {"ok": True, "name": name, "type": object_type, "source": source}

        # A class whose main implements nothing is the case where "here is the
        # source" misleads: the code is in an include and the reader cannot tell.
        # Only then is it worth the extra round trips — every class advertises
        # definitions/implementations/macros whether or not they hold anything,
        # so the advertised list alone would be the same noise on every read.
        if is_class:
            from source_slice import has_implementation_body
            if not has_implementation_body(source):
                with _quiet():
                    sizes = {}
                    for entry in client.adt_client.list_class_includes(name):
                        if entry["includeType"] == "main":
                            continue
                        try:
                            body = client.adt_client.get_class_include_source(
                                name, entry["sourceUri"])
                        except Exception:
                            continue
                        sizes[entry["includeType"]] = len(body.splitlines())
                if sizes:
                    result["includes"] = sizes
                    biggest = max(sizes, key=sizes.get)
                    if sizes[biggest] > 3:
                        result["note"] = (
                            f"main implements nothing; {sizes[biggest]} lines are in "
                            f"the '{biggest}' include. Read it with "
                            f"include='{biggest}'.")

        return _apply_read_filters(result, source, grep, method, name, object_type)
    except Exception as exc:
        return _err(exc)


def _apply_read_filters(result: dict, source: str, grep: str, method: str,
                        name: str, object_type: str) -> dict:
    """Narrow `result['source']` by method/grep. Unset filters return it untouched.

    Shared by the main-source and include reads so both report `filtered`,
    `full_lines` and `shown_lines` the same way — a partial view must never be
    indistinguishable from a whole one.
    """
    if not grep and not method:
        return result

    import re as _re_mod
    from source_slice import grep_source, extract_method
    full_lines = len(source.splitlines())
    view = source

    def empty(message):
        return {**result, "source": "", "filtered": True,
                "full_lines": full_lines, "shown_lines": 0, "message": message}

    if method:
        extracted = extract_method(view, method)
        if extracted is None:
            return empty(f"Method/form '{method}' not found in {name}.")
        view = extracted

    if grep:
        try:
            view = grep_source(view, grep)
        except _re_mod.error as rex:
            return {"ok": False, "error": "invalid_grep_pattern", "message": str(rex)}
        if not view:
            where = f" in method '{method}'" if method else ""
            return empty(f"No lines matching /{grep}/{where} for {name}.")

    return {**result, "source": view, "filtered": True,
            "full_lines": full_lines, "shown_lines": len(view.splitlines())}


@mcp.tool()
def adt_list_package(package: str = "ZAI") -> dict:
    """List objects in a package. Returns {ok, package, count, objects}.

    A package that does not exist is an ERROR, not an empty list -- so this can
    be used as the existence pre-flight before creating one. It used to answer a
    made-up name with hundreds of unrelated objects: an empty listing was treated
    as an endpoint failure and fell through to a name search on `<pkg>*`, `Z_*`
    and the first two letters. An empty package that really exists returns
    count 0.
    """
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
def adt_clear_lock(name: str, object_type: str = "class", transport: str = "",
                   function_group: str = "") -> dict:
    """Clear the current user's stale ENQUEUE lock on an object (SM12-equivalent).

    Does NOT clear CTS object locks ("locked in request") — those need SE03 — but
    it does now REPORT them, which is the whole point. There are two kinds of lock
    and only one of them is this tool's business; answering "Not locked" while the
    object sat recorded in someone's request cost a consultant an afternoon on a
    customer system (2026-08, DS4). So every answer says which locks were looked
    for and what was found.
    """
    try:
        from object_types import get_object_url
        client = _get_client()
        url = get_object_url(name, object_type, function_group or None)
        a = client.adt_client
        with _quiet():
            status = a.is_object_locked(url)
            cts = _cts_lock_report(client, url)
            if status and status.get("locked"):
                owner = (status.get("lock_owner") or "").upper()
                if owner and owner not in ((a.user or "").upper(), "UNKNOWN"):
                    return _with_hint({"ok": False, "error": "foreign_lock",
                            "message": f"Lock held by {owner}; use SM12 (won't force-release another user).",
                            "cts_lock": cts})
                cleared = a.clear_enqueue_lock(url, transport=transport or None)
                after = a.is_object_locked(url)
                # Re-read the CTS side: clearing the ENQUEUE lock does not release
                # a request binding, and a caller who stops here retries into a 409.
                out = {"ok": bool(cleared and not (after and after.get("locked"))),
                       "enqueue_lock_before": True, "cleared": bool(cleared),
                       "cts_lock": _cts_lock_report(client, url)}
                if out["cts_lock"]:
                    out["message"] = (
                        f"ENQUEUE lock cleared, but the object is still recorded in "
                        f"{out['cts_lock']['transport']}. That is a CTS lock and this "
                        f"tool cannot clear it — write to that request, or release it "
                        f"in SE03 -> Transport Organizer Tools -> Unlock Objects.")
                return out
            if cts:
                return {"ok": True, "enqueue_lock_before": False, "cts_lock": cts,
                        "message": (
                            f"No ENQUEUE lock — but this object is NOT free: CTS has it "
                            f"recorded in {cts['transport']}"
                            f"{' (another user: ' + cts['owner'] + ')' if cts['foreign'] else ''}. "
                            f"A 409 here is that binding, not a stale lock. Write to "
                            f"{cts['transport']}, or release it in SE03 -> Transport "
                            f"Organizer Tools -> Unlock Objects.")}
            return {"ok": True, "enqueue_lock_before": False, "cts_lock": None,
                    "message": "No ENQUEUE lock and no CTS request binding; the object is free."}
    except Exception as exc:
        return _err(exc)


def _cts_lock_report(client, object_url):
    """Which transport request currently holds this object, if any.

    Best effort and read-only: the same `cts/transportchecks` call `adt_transport_check`
    makes. Returns {transport, owner, description, foreign} or None. Never raises —
    a failure here must not turn a working clear_lock into an error.
    """
    try:
        with _quiet():
            res = client.adt_client.transport_check(object_url)
    except Exception:
        return None
    if not isinstance(res, dict):
        return None
    for lock in (res.get("locks") or []):
        if lock.get("trkorr"):
            return {"transport": lock["trkorr"],
                    "owner": lock.get("as4user", ""),
                    "description": lock.get("as4text", ""),
                    "foreign": bool(lock.get("foreign"))}
    return None


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
                    "message": ("No session transport pinned. List the open requests with "
                                "adt_list_transports, confirm the number with the user, then "
                                "pin it with adt_set_transport.")}
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


_DDIC_PROBE = {
    "domain": ("ddic/domains", "application/vnd.sap.adt.domains.v2+xml"),
    "dataelement": ("ddic/dataelements", "application/vnd.sap.adt.dataelements.v2+xml"),
    # NOTE the SINGULAR media type against the PLURAL path. Getting it wrong
    # answers 406, the probe reads that as "absent", and the create then fails
    # with "already exists" on an object the probe had just failed to see.
    "tabletype": ("ddic/tabletypes", "application/vnd.sap.adt.tabletype.v1+xml"),
    # A CDS view that already exists answers the create POST with a bare 400 --
    # no AlreadyExists marker, and the library only special-cases 405 -- so the
    # create reads as a hard failure on a view sitting right there. Probing first
    # is what makes create-or-update idempotent.
    "cds": ("ddic/ddl/sources", "application/vnd.sap.adt.ddlSource+xml"),
}


def _ddic_exists(client, kind: str, name: str) -> bool:
    """Is this DDIC object already on the system?

    Asked BEFORE creating, because these endpoints answer a bare 400 for an
    object that already exists -- no "AlreadyExists" marker, no distinguishable
    status -- and the engine's retry wrapper then reports a connection error for
    something sitting right there. Re-running a partially completed transfer has
    to be cheap and quiet, not a wall of false failures.

    Accept must be the endpoint's own media type; the default answers 406, which
    reads exactly like "missing".
    """
    path, ct = _DDIC_PROBE[kind]
    adt = client.adt_client
    try:
        r = adt.session.get(f"{adt.url}/sap/bc/adt/{path}/{name.lower()}",
                            headers=adt._get_headers(ct, ct),
                            timeout=adt.timeout_short)
        return r.status_code == 200
    except Exception:
        return False


def _normalised_fixed_values(values) -> list | None:
    """Accept either spelling of a domain's value range and return the library's.

    `sap_adt_lib.create_domain` wants [{'value','text'}]. But a domain READ back
    off SAP comes as [{'low','high','description'}], which is the shape you have
    in hand whenever you are reproducing an existing domain -- the main reason to
    pass these at all. Taking only one spelling would mean every round trip needs
    a manual rename, so both are accepted and `high` is dropped (the library emits
    `<doma:high/>`; single values are the only range this path builds).

    `text` falls back to the value itself rather than to empty, because a fixed
    value with no text shows as a bare code in F4.
    """
    if not values:
        return None
    out = []
    for item in values:
        if not isinstance(item, dict):
            continue
        value = str(item.get("value", item.get("low", ""))).strip()
        if not value:
            continue
        text = item.get("text", item.get("description", "")) or value
        out.append({"value": value, "text": str(text)})
    return out or None


def _ddic_typed(_fn, _label, _kind, **kw) -> dict:
    """Shared shell for the parameter-built DDIC creators.

    The leading parameters are underscored so they cannot collide with the
    creator's own keyword arguments -- `name` appears in both, and a plain
    positional `name` here shadowed it into "got multiple values for argument".
    """
    verdict, refusal = _naming_gate(_label, _kind)
    if refusal:
        return refusal
    buf = None
    try:
        with _quiet() as buf:
            done = _fn(**kw)
        log = buf.getvalue()
        if done:
            return _with_naming({"ok": True, "name": _label.upper(), "type": _kind,
                                 "existed": "already exist" in log.lower(),
                                 "log": log[-500:]}, verdict)
        return _create_failure(log)
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_domain(name: str, package: str, description: str, datatype: str,
                      length: int, decimals: int = 0, lowercase: bool = False,
                      output_length: int = 0, transport: str = "",
                      fixed_values: list | None = None) -> dict:
    """Create a domain (DOMA) from its type parameters.

    adt_create cannot: the generic path answers "Unsupported object type: DOMA/DD".
    A domain is not source-bearing -- the object IS its metadata -- so it is built
    from parameters. When reproducing an existing domain, read datatype/length/
    decimals AND output_length off the source object rather than inventing them.

    output_length is the SCREEN width, not the input length: INT4 is 11, QUAN(15)
    is 19. Leave it 0 to derive it from the type; pass the source object's value
    when copying one, because a domain whose owner widened it by hand will
    otherwise come back narrower and truncate in ALV.

    `fixed_values`: [{"value": "A", "text": "Aktif"}, ...] -- the domain's value
    range, in the login language. A status domain without them has no input check,
    no F4 help and no value texts, so a field built on it is incomplete rather
    than merely plain. `text` defaults to `value` when omitted. Reproducing an
    existing domain: copy its values rather than inventing them, and remember that
    a value range narrowed by hand will silently widen if you leave this empty.
    """
    client = _get_client()
    if _ddic_exists(client, "domain", name):
        return {"ok": True, "name": name.upper(), "type": "domain", "existed": True,
                "message": "domain already exists - left as it is"}
    return _ddic_typed(client.create_domain, name, "domain",
                       name=name, datatype=datatype, length=int(length),
                       description=description, package=package,
                       transport=transport or None, decimals=int(decimals),
                       lowercase=bool(lowercase),
                       fixed_values=_normalised_fixed_values(fixed_values),
                       output_length=int(output_length) or None)


@mcp.tool()
def adt_create_data_element(name: str, package: str, description: str,
                            domain_name: str, short_label: str = "",
                            medium_label: str = "", long_label: str = "",
                            heading_label: str = "", transport: str = "") -> dict:
    """Create a data element (DTEL) on top of a domain.

    adt_create cannot (DTEL/DE is unsupported there). `domain_name` must be the
    domain's name ON THIS system -- a data element pointing at the source
    system's domain either fails to activate or, worse, binds to a same-named
    domain that means something else. SAP standard domains (STRING, CHAR10, …)
    stay as they are.

    The four labels are what users see in every screen and ALV heading; a data
    element created without them looks fine to a developer and empty to everyone.
    """
    client = _get_client()
    # An existing data element still needs its CONTENT written: the shell may be
    # left over from a create whose second step never ran, and that object cannot
    # activate. Skip the create, run the fill.
    if _ddic_exists(client, "dataelement", name):
        buf = None
        try:
            with _quiet() as buf:
                filled = client.set_data_element_content(
                    name, domain_name=domain_name, description=description,
                    short_label=short_label, medium_label=medium_label,
                    long_label=long_label, heading_label=heading_label,
                    transport=transport or None)
            if filled.get("ok"):
                return {"ok": True, "name": name.upper(), "type": "dataelement",
                        "existed": True, "message": "content rewritten on the "
                        "existing object (domain %s)" % filled.get("domain")}
            return {"ok": False, "error": "content_write_failed",
                    "message": str(filled.get("message"))[:900]}
        except Exception as exc:
            out = _err(exc)
            if buf is not None:
                out["log"] = buf.getvalue()[-2000:]
            return out
    return _ddic_typed(client.create_dataelement, name, "dataelement",
                       name=name, domain_name=domain_name, description=description,
                       package=package, transport=transport or None,
                       short_label=short_label or None, medium_label=medium_label or None,
                       long_label=long_label or None, heading_label=heading_label or None)


@mcp.tool()
def adt_create_cds_view(name: str, package: str, description: str,
                        source: str = "", source_file: str = "",
                        transport: str = "") -> dict:
    """Create a CDS view (DDLS) from its DDL source.

    adt_create cannot: the generic path answers "Unsupported object type: DDLS/DF".
    This is the CREATE; to change a view that already exists use adt_push with
    object_type="cds", which carries the same source through the lock/activate
    path and its guards.

    Pass the DDL either inline as `source` or as a path in `source_file`
    (resolved like adt_push's, against the working directory). Exactly one.

    On SAP_BASIS 816 and later prefer `define view entity` — it needs no
    @AbapCatalog.sqlViewName and no separate SQL view name to collide with
    anything. The older `define view` form still works and still requires it.

    TWO steps, because ADT needs both: the create POST makes the shell only --
    it accepts a `<ddl:sourceMainArtifact>` in the body and silently drops it, so
    a create alone leaves a view whose source reads back as "" and whose
    activation fails with "The DDIC source code does not contain..." -- and the
    DDL then goes up the normal lock/PUT/activate path, guards included.

    Activation is attempted at the end. A view over INACTIVE dependencies cannot
    generate, so activate the DDIC objects underneath first; `activated: false`
    with the activation log is reported honestly rather than called a success.
    """
    import tempfile
    buf = None
    tmp = None
    try:
        if bool(source) == bool(source_file):
            return {"ok": False, "error": "bad_arguments",
                    "message": "pass exactly one of source / source_file"}
        if source_file:
            ddl_path = Path(source_file).resolve()
            ddl = ddl_path.read_text(encoding="utf-8")
        else:
            ddl = source
            fd, tmp = tempfile.mkstemp(suffix=".ddls.asddls", text=True)
            os.close(fd)
            ddl_path = Path(tmp)
            ddl_path.write_text(ddl, encoding="utf-8")

        client = _get_client()
        existed = _ddic_exists(client, "cds", name)
        log = ""
        if not existed:
            with _quiet() as buf:
                made = client.create_cds_view(name=name, cds_source=ddl,
                                              description=description, package=package,
                                              transport=transport or None)
            log = buf.getvalue()
            if not made:
                return _create_failure(log)

        with _quiet() as buf:
            res = client.push_object(object_name=name, object_type="cds",
                                     transport=transport or None,
                                     source_file=str(ddl_path))
        res = dict(res) if isinstance(res, dict) else {"success": bool(res)}
        res["ok"] = bool(res.get("success"))
        res["name"] = name.upper()
        res["type"] = "cds"
        res["shell_created"] = not existed
        res["existed"] = existed
        res["log"] = (log + buf.getvalue())[-2500:]
        return _with_hint(res)
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out
    finally:
        if tmp:
            try:
                os.unlink(tmp)
            except OSError:
                pass


def _create_cds_companion(kind: str, fn, name: str, package: str, description: str,
                          source: str, source_file: str, transport: str) -> dict:
    """Shared shell for the CDS companion objects (DDLX, DCLS).

    Both are source-bearing and both are created by the library the correct way
    already -- shell POST, then the source PUT to /source/main. What they lacked
    was an MCP tool and, until this repair, an honest verdict: the library used to
    swallow an upload failure and return success regardless, which produced an
    empty object reported as created.
    """
    buf = None
    try:
        if bool(source) == bool(source_file):
            return {"ok": False, "error": "bad_arguments",
                    "message": "pass exactly one of source / source_file"}
        text = source or Path(source_file).read_text(encoding="utf-8")
        # A DDLX must carry the SAME name as the view it annotates (§4.2 #4), and
        # the source is the only place that says which view that is -- so the
        # verdict is computed after the text is in hand, not from the arguments.
        extends = ""
        if kind == "ddlx":
            try:
                import naming
                extends = naming.extended_view(text) or ""
            except Exception:
                extends = ""
        verdict, refusal = _naming_gate(name, kind, extends=extends)
        if refusal:
            return refusal
        _get_client()
        with _quiet() as buf:
            res = fn(name=name, source=text, description=description,
                     package=package, transport=transport or None)
        log = buf.getvalue()
        out = dict(res) if isinstance(res, dict) else {"success": bool(res)}
        out["ok"] = bool(out.get("success"))
        out["name"] = name.upper()
        out["type"] = kind
        out["log"] = log[-800:]
        if not out["ok"] and not out.get("error"):
            out["error"] = "create_failed"
        return _with_hint(_with_naming(out, verdict))
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_metadata_extension(name: str, package: str, description: str,
                                  source: str = "", source_file: str = "",
                                  transport: str = "") -> dict:
    """Create a CDS metadata extension (DDLX) from its source.

    adt_create cannot: the generic path answers "Unsupported object type: DDLX/EX".
    A DDLX annotates a view it does not own, so the view it extends must exist and
    carry `@Metadata.allowExtensions: true` -- without that the extension writes
    fine and fails at activation, naming the annotation.

    Pass the source inline as `source` or as a path in `source_file`. Exactly one.
    Not activated here: call adt_activate(object_type="ddlx").
    """
    return _create_cds_companion("ddlx", _get_client().create_metadata_extension,
                                 name, package, description, source, source_file,
                                 transport)


@mcp.tool()
def adt_create_access_control(name: str, package: str, description: str,
                              source: str = "", source_file: str = "",
                              transport: str = "") -> dict:
    """Create a CDS access control (DCLS) from its DCL source.

    adt_create cannot: the generic path answers "Unsupported object type: DCLS/DL".
    The DCL's name must match the view it protects for SAP to bind them, and the
    view has to exist first.

    Pass the source inline as `source` or as a path in `source_file`. Exactly one.
    Not activated here: call adt_activate(object_type="dcls").
    """
    return _create_cds_companion("dcls", _get_client().create_access_control,
                                 name, package, description, source, source_file,
                                 transport)


@mcp.tool()
def adt_create_behavior_definition(name: str, root_entity: str, package: str,
                                   description: str = "", source: str = "",
                                   source_file: str = "", transport: str = "",
                                   activate: bool = False) -> dict:
    """Create a behaviour definition (BDEF) over a root entity.

    adt_create cannot reach this type. `root_entity` must be a **root** view
    entity (`define root view entity`) that is already ACTIVE -- a BDEF over a
    plain view entity, or over one still inactive, writes fine and then fails to
    activate.

    Pass the BDEF body as `source` or `source_file` -- exactly one, and one is
    required. There is no generated starter body: the shell now comes from the
    engine's shared source-object path, which knows this type's endpoint, media
    type and root element, and the old generator's bespoke XML was wrong in four
    separate ways.

    `root_entity` is checked against `define behavior for ...` in the source
    rather than sent to SAP. A mismatch between the two otherwise surfaces at
    activation as something much harder to read.

    `activate` defaults to False. Activation is reported honestly when asked for
    -- `activated` and `activation_error` -- and a failure to activate is NOT
    treated as a failure to create, because the usual cause is a dependency that
    is not active yet.

    There is deliberately no companion tool for behaviour IMPLEMENTATIONS: on
    this system no such endpoint exists (`/sap/bc/adt/bo/behaviorimplementations`
    and `/sap/bc/adt/behaviorimplementations` both 404, and ADT discovery declares
    no collection). In RAP the implementation is an ordinary ABAP class -- create
    it with adt_create/adt_push like any other class.
    """
    buf = None
    try:
        if bool(source) == bool(source_file):
            return {"ok": False, "error": "bad_arguments",
                    "message": "pass exactly one of source / source_file"}
        body = source or Path(source_file).read_text(encoding="utf-8")
        verdict, refusal = _naming_gate(name, "behaviordefinition",
                                        root_entity=root_entity)
        if refusal:
            return refusal
        client = _get_client()
        with _quiet() as buf:
            res = client.create_behavior_definition(
                name=name, root_entity=root_entity, package=package, source=body,
                description=description or name, transport=transport or "",
                activate=bool(activate))
        out = dict(res) if isinstance(res, dict) else {"success": bool(res)}
        out["ok"] = bool(out.get("success"))
        out["name"] = name.upper()
        out["type"] = "bdef"
        out["root_entity"] = root_entity.upper()
        out["log"] = buf.getvalue()[-900:]
        if not out["ok"] and not out.get("error"):
            out["error"] = "create_failed"
        return _with_hint(_with_naming(out, verdict))
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_lock_object(name: str, primary_table: str, package: str,
                           description: str, lock_fields: list | None = None,
                           lock_mode: str = "E", transport: str = "",
                           allow_rfc: bool = False) -> dict:
    """Create a lock object (ENQU) over a table.

    adt_create cannot reach this type at all. SAP requires customer lock objects
    to be named `EZ*` or `EY*` -- the E prefix is part of the object type, not a
    namespace violation -- so the Z/Y guard has to let those through.

    `lock_fields` are the table's key fields to lock on; omit and the primary
    table's keys are used. `lock_mode`: E exclusive (default), S shared,
    X exclusive-not-cumulative.
    """
    buf = None
    try:
        client = _get_client()
        fields = [str(f).upper() for f in (lock_fields or [])]
        if not fields:
            return {"ok": False, "error": "bad_arguments",
                    "message": "lock_fields is required - name the key fields to lock on"}
        with _quiet() as buf:
            done = client.create_lock_object(
                name=name, primary_table=primary_table, description=description,
                package=package, lock_fields=fields, transport=transport or None,
                lock_mode=lock_mode, allow_rfc=bool(allow_rfc))
        log = buf.getvalue()
        if done:
            return {"ok": True, "name": name.upper(), "type": "lockobject",
                    "primary_table": primary_table.upper(), "lock_fields": fields,
                    "log": log[-500:]}
        return _create_failure(log)
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_type_group(name: str, package: str, description: str,
                          types_and_constants: str = "", source_file: str = "",
                          transport: str = "") -> dict:
    """Create a type group (TYPE) from its TYPES/CONSTANTS body.

    adt_create cannot reach this type. Legacy: a type group is consumed with
    `TYPE-POOLS`, and on any system where a class or interface would do, one of
    those is the better home. Kept because older code still declares them.

    Pass the body inline as `types_and_constants` or as a path in `source_file`.
    Exactly one. The `TYPE-POOL <name>.` header line is supplied by SAP; give the
    declarations only.

    **The name is capped at 5 characters.** A type pool's name prefixes every type
    it declares, and SAP enforces the cap by SILENTLY TRUNCATING: asking for
    `ZCM901T` produced an object called `ZCM90`, after which the source push 404s
    against the name you asked for and leaves a nameless-looking husk behind.
    Refused here instead.
    """
    buf = None
    try:
        if bool(types_and_constants) == bool(source_file):
            return {"ok": False, "error": "bad_arguments",
                    "message": "pass exactly one of types_and_constants / source_file"}
        if len(name) > 5:
            return {"ok": False, "error": "name_too_long",
                    "message": ("type group names are capped at 5 characters; SAP would "
                                "silently truncate %r to %r and the source push would then "
                                "404 against the name you asked for"
                                % (name.upper(), name.upper()[:5]))}
        body = types_and_constants or Path(source_file).read_text(encoding="utf-8")
        client = _get_client()
        with _quiet() as buf:
            done = client.create_type_group(
                name=name, types_and_constants=body, description=description,
                package=package, transport=transport or None)
        log = buf.getvalue()
        if done:
            return {"ok": True, "name": name.upper(), "type": "typegroup",
                    "log": log[-500:]}
        return _create_failure(log)
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_table_type(name: str, package: str, description: str, row_type: str,
                          access_type: str = "standard", key_kind: str = "nonUnique",
                          transport: str = "") -> dict:
    """Create a table type (TTYP) over a row type.

    adt_create cannot (TTYP/DA is unsupported there). `row_type` is a data
    element, structure or built-in type name on THIS system. access_type:
    standard | sorted | hashed | index. key_kind: unique | nonUnique | notSpecified.
    """
    client = _get_client()
    existed = _ddic_exists(client, "tabletype", name)
    if not existed:
        res = _ddic_typed(client.create_table_type, name, "tabletype",
                          name=name, row_type=row_type, description=description,
                          package=package, transport=transport or None,
                          access_type=access_type, key_kind=key_kind)
        if not res.get("ok"):
            return res
    # STEP 2 -- the row type. The create returns 201 and keeps none of it: the
    # object comes back predefinedAbapType CHAR(1) with an empty typeName, and the
    # first symptom appears elsewhere ("... is not a valid range table" on a
    # function module that uses it). Same two-step as data elements.
    buf = None
    try:
        with _quiet() as buf:
            filled = client.set_table_type_content(
                name, row_type=row_type, description=description,
                access_type=access_type,
                key_kind=key_kind, transport=transport or None)
        if filled.get("ok"):
            return {"ok": True, "name": name.upper(), "type": "tabletype",
                    "existed": existed,
                    "message": "row type written (%s)" % filled.get("row_type")}
        return {"ok": False, "error": "row_type_not_written",
                "message": str(filled.get("message"))[:900]}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_function_group(name: str, package: str, description: str,
                              transport: str = "") -> dict:
    """Create a function group (FUGR).

    adt_create cannot: the generic path answers "Unsupported object type: FUGR/F".
    A function group is a container -- create it before its function modules and
    before any user-managed include that lives under it.
    """
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            done = client.create_function_group(
                name=name, description=description, package=package,
                transport=transport or None)
        log = buf.getvalue()
        existed = "already exist" in log.lower()
        if done or existed:
            return {"ok": True, "name": name.upper(), "type": "functiongroup",
                    "existed": existed, "log": log[-500:]}
        return _create_failure(log)
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_write_function_module(name: str, function_group: str, source_file: str,
                              description: str = "", transport: str = "") -> dict:
    """Create a function module in its group and push its full source.

    The signature is written INLINE in the source (IMPORTING/EXPORTING as ABAP
    statements after the FUNCTION line), not as an SE37 `*"` comment block -- so
    the whole module, interface included, arrives as text.

    A function module is addressed under its group, never on its own. Create the
    group first.

    NOT covered by ADT: the "Remote-Enabled Module" flag. A transferred RFC module
    lands as a normal one, and `CALL FUNCTION ... DESTINATION` fails at runtime
    with CALL_FUNCTION_NOT_REMOTE until someone ticks it in SE37. Say so rather
    than reporting a clean transfer.
    """
    buf = None
    try:
        client = _get_client()
        src = Path(source_file).read_text(encoding="utf-8")
        with _quiet() as buf:
            client.create_function_module(
                name=name, function_group=function_group,
                description=description or name, transport=transport or None)
            res = client.set_function_module_source(
                name=name, function_group=function_group, source_code=src,
                transport=transport or None)
        log = buf.getvalue()
        good = res.get("success") if isinstance(res, dict) else bool(res)
        if good:
            return {"ok": True, "name": name.upper(), "group": function_group.upper(),
                    "message": "created and source pushed", "log": log[-500:]}
        return {"ok": False, "error": "fm_write_failed",
                "message": (str(res)[:400] + " | " + log[-600:])}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_service_binding(name: str, package: str, description: str,
                               service_definition: str, binding_version: str = "V4",
                               binding_category: str = "0", contract: str = "",
                               transport: str = "") -> dict:
    """Create a service binding (SRVB) for an existing service definition.

    Pass version/category/(contract) as READ FROM THE SOURCE OBJECT, not a
    binding-kind label: object names do not reliably indicate V2 vs V4, and
    `contract` varies by SYSTEM rather than by kind. `service_definition` must be
    the name on THIS system.

    Creating is not delivering -- follow with adt_publish_service_binding.
    """
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            done = client.create_service_binding(
                name=name, description=description, package=package,
                service_definition=service_definition,
                binding_version=binding_version, binding_category=binding_category,
                contract=contract or None, transport=transport or None)
        log = buf.getvalue()
        if done:
            return {"ok": True, "name": name.upper(),
                    "existed": "already exists" in log.lower(),
                    "message": "binding created - publish it next", "log": log[-600:]}
        return {**_create_failure(log), "error": "create_binding_failed"}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_service_binding_status(name: str) -> dict:
    """Is this service binding actually serving? READ ONLY.

    Returns `published` (the OData service exists), `binding_created`, the
    version/category/contract triple and the service definition it binds.

    Use it to answer "is the service live?" without publishing anything, and to
    read a binding's real kind -- object names do not reliably indicate V2 vs V4.
    An activated but unpublished binding looks complete everywhere else.
    """
    try:
        client = _get_client()
        with _quiet():
            return client.get_service_binding_status(name)
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_unpublish_service_binding(name: str, odata_version: str = "V4") -> dict:
    """Withdraw a service binding's OData endpoint — the inverse of publish.

    **Delete a published binding and SAP refuses it**: `412 Service endpoint of
    Service Binding X is published`. Refuse the binding and the service definition
    will not go either (`404 Prerequisites … are not fulfilled`). So a whole RAP
    stack becomes undeletable until the endpoint is withdrawn, and until 2026-08-20
    this engine had no way to do that — it could build a service it could not take
    down (run 3, COMPARISON3 gap 2).

    Order for tearing a stack down: unpublish → delete binding → delete service
    definition → the CDS layer → the table.

    Result carries `verified_published`, read back off `srvb:published` on the
    object, because the call's own answer is a claim and that is the fact.
    """
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            res = client.unpublish_service_binding(name, odata_version=odata_version)
        return {"ok": bool(res.get("unpublished")), "name": name.upper(),
                "severity": res.get("severity"), "short_text": res.get("short_text"),
                "long_text": res.get("long_text"),
                "verified_published": res.get("verified_published"),
                "log": buf.getvalue()[-400:]}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_publish_service_binding(name: str, odata_version: str = "V4") -> dict:
    """Publish a service binding's local OData endpoint, and verify it took.

    Activation is NOT delivery: an activated but unpublished binding looks
    complete in every object list while the OData service does not exist. The
    result carries both the publish response AND `verified_published`, read back
    off `srvb:published` on the object itself.

    "Service Definition ... not yet active" is a known transient -- publish after
    the whole RAP stack has activated, then retry.
    """
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            res = client.publish_service_binding(name, odata_version=odata_version)
        return {"ok": bool(res.get("published")), "name": name.upper(),
                "severity": res.get("severity"), "short_text": res.get("short_text"),
                "long_text": res.get("long_text"),
                "verified_published": res.get("verified_published"),
                "log": buf.getvalue()[-400:]}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create_ddic_shell(name: str, object_type: str, package: str,
                          description: str, transport: str = "") -> dict:
    """Create an EMPTY table or structure, ready for a DDL source push.

    For REPRODUCING an existing DDIC object from its own definition (cross-system
    transfer, restoring from a serialized copy): create the shell here, then send
    the real definition with adt_push, which carries keys, foreign keys and
    .INCLUDEs because it ships the source text rather than a field list.

    Use adt_create for everything else. It cannot do this one: on a modern S/4
    system a table is a "blue source" object and the generic create path answers
    "Unsupported object type: TABL/DT".

    object_type: 'table' or 'structure'. Guardrails apply (Z/Y namespace,
    ADT_READONLY). Creating an object that already exists is success -- the push
    that follows is what delivers the content.
    """
    verdict, refusal = _naming_gate(name, object_type)
    if refusal:
        return refusal
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            done = client.create_ddic_shell(name=name, object_type=object_type,
                                            description=description, package=package,
                                            transport=transport or None)
        log = buf.getvalue()
        if done:
            # `existed` is load-bearing for the caller, not decoration. A shell
            # this call just created contains only SAP's auto-generated placeholder
            # (a `client` field), so the source push that follows legitimately
            # replaces it. An object that was ALREADY there may hold real fields
            # and real data, and its drops must stay behind the pre-push guard.
            existed = "already exists" in log.lower()
            return _with_naming(
                {"ok": True, "name": name.upper(), "type": object_type,
                 "existed": existed,
                 "message": ("object already existed - shell untouched" if existed
                             else "shell created - push the DDL source next"),
                 "log": log[-600:]}, verdict)
        return {**_create_failure(log), "error": "create_shell_failed"}
    except Exception as exc:
        out = _err(exc)
        if buf is not None:
            out["log"] = buf.getvalue()[-2000:]
        return out


@mcp.tool()
def adt_create(object_type: str, name: str, package: str, description: str,
               transport: str = "") -> dict:
    """Create a new ABAP object. Guardrails apply (Z/Y namespace, ADT_READONLY)."""
    verdict, refusal = _naming_gate(name, object_type)
    if refusal:
        return refusal
    buf = None
    try:
        client = _get_client()
        with _quiet() as buf:
            url = client.create_object(object_type=object_type, name=name, package=package,
                                       description=description, transport=transport or None)
        log = buf.getvalue()
        if url:
            return _with_naming({"ok": True, "name": name, "type": object_type,
                                 "url": url}, verdict)
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
            return _with_naming(
                {"ok": True, "name": name, "type": object_type, "url": url or None,
                 "message": ("Object already exists (verified — idempotent create)." if already
                             else "Object created (ADT returned no URL; verified by existence).")},
                verdict)
        return _create_failure(log)
    except Exception as exc:
        out = _err(exc)
        if buf is not None:  # v1.3.4: keep the log on the exception path too
            out["log"] = buf.getvalue()[-2000:]
        # The existence check above only runs when create_object RETURNS. When it
        # raises, the object may still be there: SAP can commit the create and
        # then dump, and on NS4 2026-09-03 two classes were reported
        # "[500] Failed to create CLAS/OC" and were sitting in the system
        # afterwards. The consultant retries, gets "Resource CLASS X does already
        # exist", and now has two answers that both look wrong. Same source of
        # truth as the success path: ask SAP whether the object exists.
        try:
            with _quiet():
                md_after = client.get_object_metadata(name, object_type)
        except Exception:
            md_after = None
        if md_after:
            out["object_exists"] = True
            out["message"] = (
                f"{out.get('message', '')}\n\n"
                f"NOTE: {name.upper()} EXISTS in SAP despite this failure — the "
                f"create reached the system and then failed. Do not retry the "
                f"create; inspect the object (adt_get_source) and either continue "
                f"with it or delete it (adt_delete_object).").strip()
        return out


@mcp.tool()
def adt_activate(name: str = "", object_type: str = "class",
                 objects: list | None = None) -> dict:
    """Activate one object, or several in a single request.

    Returns {ok, activated, log}. On failure the log carries the activation
    messages (syntax errors etc.) instead of swallowing them.

    **Pass `objects` for anything with dependencies between the items** —
    `[{"name": "ZX_D_STATUS", "object_type": "domain"}, {"name": "ZX_E_STATUS",
    "object_type": "dataelement"}, {"name": "ZX_T_TAB", "object_type": "table"}]`.
    They go up as one activation and SAP works out the order.

    One at a time, the caller has to know the dependency order, and getting it
    wrong does not say so: a table over an inactive data element fails with
    `Nametab for table ... cannot be generated`, which names neither the data
    element nor the fact that it is inactive. `objects` removes the question.

    `name` alone still works and is unchanged.
    """
    buf = None
    try:
        client = _get_client()
        if objects:
            with _quiet() as buf:
                res = client.activate_objects(objects)
            ok = bool(res.get("success"))
            out = {"ok": ok, "activated": ok,
                   "objects": res.get("objects", []),
                   "count": len(res.get("objects", []))}
            errs = res.get("errors") or []
            if errs:
                out["errors"] = errs[:10]
            if not ok and buf is not None:
                out["log"] = buf.getvalue()[-2000:]
            return out
        if not name:
            return {"ok": False, "error": "bad_arguments",
                    "message": "pass either name or objects"}
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
            # The transport is conditional and the gate used to demand it flatly.
            # A $TMP object cannot be in one, so a consultant who followed this
            # sentence supplied a transport and walked straight into the ghost
            # guard -- while the code forty lines below already exempted local
            # objects. Say when it applies instead of always.
            return {"ok": False, "error": "confirmation_required",
                    "message": (f"Refusing to delete {object_type} '{name}'. To proceed, call again "
                                f"with confirm_name='{name}' AND force=true. If the object is in a "
                                f"transportable package, also pass transport=<an OPEN request you "
                                f"own> so the deletion is recorded there; a local ($TMP) object "
                                f"takes no transport and needs none.")}
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
def adt_create_package(name: str, description: str, super_package: str = "",
                       transport: str = "", sw_component: str = "",
                       transport_layer: str = "", package_type: str = "development") -> dict:
    """Create a new SAP package under a parent package.

    `super_package` is REQUIRED and has no default. It used to default to `ZAI`,
    a package that does not exist on every system -- and when the parent is
    missing SAP does not say so, it refuses the write for a reason two steps
    away.

    `sw_component` and `transport_layer` are DERIVED from the parent when left
    empty, which is what makes this work. Sending the old `sw_component="HOME"`
    blindly is what produced `Request ... is not a local request`: a message
    naming the transport for a fault in the software component. Pass them only to
    override a parent you know is wrong.

    Requires a transport. Guardrails apply (Z/Y namespace, ADT_READONLY).
    Returns {ok, package, location, message, derived_from}.
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

        verdict, refusal = _naming_gate(name, "package")
        if refusal:
            return refusal

        from create_package import (create_package as _create_package,
                                    check_package_exists, get_package_info)
        client = _get_client()
        adt = client.adt_client

        if not super_package:
            return {"ok": False, "error": "super_package_required",
                    "message": ("super_package is required - name the parent package. "
                                "There is no default: the old one (ZAI) does not exist "
                                "on every system, and a missing parent surfaces as an "
                                "unrelated transport error.")}

        # Pre-flight, the half DIAGNOSIS.md S4 says this tool skips. Three questions,
        # in the order that makes each answer useful.
        derived_from = None
        with _quiet() as buf:
            if check_package_exists(adt, name):
                return {"ok": True, "success": True, "package": name.upper(),
                        "existed": True,
                        "message": f"Package {name.upper()} already exists (idempotent)."}

            parent = get_package_info(adt, super_package)
            if parent is None:
                return {"ok": False, "error": "super_package_not_found",
                        "message": (f"Parent package {super_package.upper()} does not "
                                    f"exist. Create it first, or name one that does - "
                                    f"SAP will not tell you this is the problem.")}

            # Inherit what the parent says rather than guessing. A child whose
            # software component disagrees with its parent is refused, and the
            # refusal names the transport instead.
            if not sw_component:
                sw_component = parent.get('sw_component') or 'HOME'
                derived_from = super_package.upper()
            if not transport_layer:
                transport_layer = parent.get('transport_layer') or ''
                derived_from = super_package.upper()

            result = _create_package(
                adt, name=name, description=description,
                super_package=super_package, sw_component=sw_component,
                transport_layer=transport_layer, package_type=package_type,
                transport=transport,
            )
        out = dict(result) if isinstance(result, dict) else {"success": bool(result)}
        out["ok"] = bool(out.get("success"))
        out["sw_component"] = sw_component
        out["transport_layer"] = transport_layer
        if derived_from:
            out["derived_from"] = derived_from
        log = buf.getvalue()
        # Idempotent: an existing package is success per the skill's create rule.
        if not out["ok"] and "already exist" in (str(out.get("message", "")) + log).lower():
            out["ok"] = True
            # `success` has to move with `ok`, or the payload contradicts itself and
            # the boundary wrapper raises on a call this branch just declared fine.
            out["success"] = True
            out["existed"] = True
            out["message"] = f"Package {name} already exists (idempotent)."
        out["log"] = log[-800:]
        return _with_naming(out, verdict)
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_create_transport(description: str, package: str = "") -> dict:
    """Create a new workbench transport request.

    Returns {ok, transport, target, message}. `target` is the route SAP states on
    the request itself. An EMPTY one does NOT mean a local request — on NS4 a
    request with `tm:target=""` transports perfectly well, the route coming from
    the transport layer instead. Reported, not interpreted.

    `package` is optional and lets SAP infer the route; omit it and SAP decides.
    It no longer defaults to `ZAI`, a package that does not exist everywhere.

    Guardrails: refused if ADT_READONLY is set. Tries the modern tm:root endpoint
    first — the path the live ADT handler uses on-prem too, despite its internal
    name — and falls back to the legacy one only on 404/405/501. Prefer
    adt_list_transports + reusing an existing transport unless a new one is
    genuinely wanted.
    """
    try:
        from guardrails import require_writable, GuardrailViolation
        try:
            require_writable(what="create transport")
        except GuardrailViolation as gv:
            return {"ok": False, "error": "guardrail_violation", "message": str(gv)}
        # v1.3.4: the description 'Generated Request for Change Recording' is RESERVED —
        # it is SAP's auto-generated-ghost signature, and the engine's ghost defenses key on
        # it (GhostRedirectPrevented refuses to push into any transport so described).
        # Creating one by hand would make every push to it refuse. Refuse early instead.
        if (description or "").strip().lower() == "generated request for change recording":
            return {"ok": False, "error": "reserved_description",
                    "message": ("'Generated Request for Change Recording' is SAP's ghost-transport "
                                "signature and is reserved — the engine's defenses refuse to push into "
                                "transports so described. Choose a different description.")}
        client = _get_client()
        with _quiet():
            result = client.adt_client.create_transport(description=description, package_name=package)
        if isinstance(result, dict) and result.get("success"):
            trkorr = result.get("transport")
            out = {"ok": True, "transport": trkorr, "message": result.get("message", "")}
            # Report the route SAP states on the request. One extra read, and it is
            # the fact that makes a later "not a local request" refusal checkable.
            #
            # An EMPTY target is reported as empty and nothing is concluded from it.
            # Verified on NS4: a request whose `tm:target` is "" is still perfectly
            # transportable -- the route comes from the transport layer and is simply
            # not restated on the request. Reading silence as "LOCAL request" would be
            # the same kind of confident wrong answer this repair exists to remove.
            try:
                with _quiet():
                    info = client.get_transport_info(trkorr) if trkorr else None
                if info:
                    out["target"] = info.get("target", "")
                    if not out["target"]:
                        out["target_note"] = ("not stated on the request; the route comes "
                                              "from the transport layer")
            except Exception:
                pass  # the request exists either way; the route is extra information
            return out
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
    classrun fails with 400). If the generator is missing it is installed into
    $TMP automatically (already Remote-Enabled) and the call retries. The FM name defaults
    to ZND_FM_SCREEN_GEN; pass fm_name to target one installed under another name.

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
def adt_message_class(name: str, action: str = "read", description: str = "",
                      package: str = "", messages: list | None = None,
                      transport: str = "", language: str = "",
                      replace: bool = False) -> dict:
    """Read or fill a message class (MSAG) — create it, then write its texts.

    action="read"   → description, package, master language and every message.
    action="create" → **pass `messages` here.** The collection POST really does drop
                      them, so the texts are written by a PUT immediately afterwards,
                      inside this one call. Without `messages` you get an empty shell,
                      which is not a usable object.
    action="write"  → write the texts into a class that already exists. Existing
                      numbers are overwritten, the rest added, everything else
                      preserved (a PUT replaces the whole object, so the current state
                      is read and merged first). replace=True wipes the numbers not
                      listed.

    **If a write answers `User X is currently editing`:** SAP registered the creating
    user as editing the new class and has not let go. **Nothing in this engine clears
    it** — it is not an ENQUEUE lock, so `adt_clear_lock` resolves the object and
    answers "no ENQUEUE lock", and it is not a CTS binding either, so the transport
    check does not see it. It survives a full MCP restart, and SE91/SM12 do not help
    whatever older notes say.

    **It expires in about half an hour.** Measured 2026-08-20: a class created at
    19:28:10Z deleted cleanly at 19:58:41Z, first attempt — 30 min 31 s. One created
    two minutes later was still refused a second after that. So: wait ~30 minutes and
    retry the write. Creating under another name buys nothing; the new one is
    registered too.

    Chaining does not avoid it — passing `messages` to `create` still writes through a
    second HTTP call, and that call is refused just the same. What chaining does buy
    is that the texts are never silently discarded. Three measurements on 2026-08-20
    also killed the theory that this is about the MCP process: a plain Python process
    doing create+write on a fresh name is refused identically, which is the control
    `PROPOSAL.md` addendum 3 relied on and it no longer reproduces. Tracked as fault 3
    there; the standing account is in `sap_client.py` beside
    `set_message_class_messages`.

    `messages`: [{"number": "001", "text": "Malzeme &1 bulunamadı"}] — 3 digits,
    &1..&4 placeholders, text in the LOGIN LANGUAGE with its own characters.

    ALWAYS check the returned `language`. The MSAG handler keys T100-SPRSL by the
    language in the request body; if it ever comes back blank the texts will not
    resolve at runtime and ATC will report every number as missing, while the class
    looks perfectly normal in SE91.
    """
    try:
        client = _get_client()
        with _quiet():
            if action == "read":
                return client.get_message_class(name)
            if action == "create":
                ok = client.create_message_class(name, description, package,
                                                 transport=transport or None,
                                                 language=language or None)
                if not ok:
                    return {"ok": False, "name": name.upper(),
                            "error": "create_failed", "created": False}
                out = {"ok": True, "name": name.upper(), "created": True}
                if not messages:
                    out["message"] = (
                        "Shell created and EMPTY — the collection POST drops message "
                        "texts, SAP keeps only the shell. Pass `messages` to create "
                        "and they are written in the same call; a separate "
                        "action='write' may be refused as 'currently editing'.")
                    return out
                # Chained deliberately. The documented two-step is create-then-write,
                # and on at least two systems the write is refused because the create
                # registered this user as editing the new class. Whether one call
                # clears that is not known -- but a shell with no texts is useless, and
                # `messages` used to be accepted here and silently discarded, which is
                # how an agent ends up believing it wrote texts that do not exist.
                written = client.set_message_class_messages(
                    name, messages, transport=transport or None, replace=replace)
                out["write"] = written
                if written.get("ok"):
                    out["written"] = written.get("written")
                    out["message"] = (f"Created and filled — "
                                      f"{written.get('written')} message(s).")
                    return out
                # The shell exists and is empty: a failure, but re-creating is not the
                # repair. `created` travels with the error so the caller knows that.
                out["ok"] = False
                out["error"] = written.get("error") or "write_failed"
                out["message"] = (
                    f"Shell {name.upper()} was created but is EMPTY — the texts did not "
                    f"land ({written.get('message') or written.get('error')}). Do NOT "
                    f"create it again; retry only the write. If the refusal is "
                    f"'currently editing', see this tool's description.")
                return out
            if action == "write":
                return client.set_message_class_messages(
                    name, messages or [], transport=transport or None, replace=replace)
        return {"ok": False, "error": "bad_action",
                "message": f"unknown action '{action}' (read | create | write)"}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_generate_adobe(interface: str = "", form: str = "", devclass: str = "$TMP",
                       transport: str = "", language: str = "", if_text: str = "",
                       form_text: str = "", template: str = "", mode: str = "WRITE",
                       fm_name: str = "", layout_base64: str = "",
                       param1_name: str = "", param1_type: str = "",
                       param2_name: str = "", param2_type: str = "") -> dict:
    """Build/inspect Adobe Interfaces (SFPI) and Forms (SFPF) — what ADT cannot do.

    ADT does not know these object types at all: they are absent from its supported-type
    list, so read/write/create all fail. This calls an RFC-enabled generator FM over the
    SOAP-RFC channel, wrapping SAP's own SAFPAPI workbench API. If the generator is missing it is
    installed into $TMP automatically (already Remote-Enabled) and the call retries;
    the result then carries an `installed` note. Defaults to ZND_FM_ADOBE_GEN.

    NEVER TRUST THE SUCCESS MESSAGE. ADT cannot show these objects, so the only real
    verification is reading back through the same API. Apparent success has differed from
    reality three times on these objects (active-but-state=I, written-but-unchanged,
    added-but-context-empty). After any write, call mode="STATUS".

    Production modes: WRITE (create + activate) · READ · DELETE · SET_LAYOUT (needs
    layout_base64 — an XDP is an xstring and must travel base64) · GET_LAYOUT (returns
    layout_base64) · SET_PARAMS (param1_*/param2_* = NAME + DDIC type) · SYNC_CONTEXT
    (builds the form's context tree from those parameters; adding parameters does NOT do
    this, and without it SFP's Context tab stays empty).
    Verification modes: STATUS (real A/I state + visible param count) · GET_PARAMS ·
    RTTI_DEBUG (a DDIC type's runtime kind/row type).

    Guardrail: customer (Z/Y) namespace only, on writing modes. A transportable devclass
    without `transport` warns — never fabricate a request.
    EV_RC=0 done · 4 already existed and was LEFT UNTOUCHED · 8 failed (read EV_MESSAGE).
    On a partial failure the objects left behind are INACTIVE, and a form will not activate
    over an inactive interface — run mode="DELETE" before retrying.
    """
    try:
        # The caller (adobe-gen skill) lives in a sibling skill dir.
        adobe_gen_scripts = _SCRIPTS_DIR.parents[1] / "adobe-gen" / "scripts"
        if str(adobe_gen_scripts) not in sys.path:
            sys.path.insert(0, str(adobe_gen_scripts))
        from generate_adobe import generate_adobe as _generate_adobe

        client = _get_client()
        with _quiet():
            result = _generate_adobe(
                client.adt_client, interface=interface, form=form,
                devclass=devclass, transport=transport or None,
                language=language or None, if_text=if_text or None,
                form_text=form_text or None, template=template or None,
                mode=mode, fm_name=fm_name or None,
                layout_base64=layout_base64 or None,
                param1_name=param1_name or None, param1_type=param1_type or None,
                param2_name=param2_name or None, param2_type=param2_type or None,
            )
        return result if isinstance(result, dict) else {"ok": bool(result)}
    except ImportError as exc:
        return {"ok": False, "error": "adobe_gen_unavailable",
                "message": f"adobe-gen skill not found alongside sap-adt: {exc}"}
    except Exception as exc:
        return _err(exc)


@mcp.tool()
def adt_delete_transport(transport: str, confirm_transport: str = "", force: bool = False,
                         recursive: bool = False,
                         remove_locked_objects: bool = False) -> dict:
    """Delete a MODIFIABLE transport the current user OWNS — DESTRUCTIVE, double-confirmed.

    Safety (all enforced; any failure = no-op):
      - Refused if ADT_READONLY is set.
      - Ownership: the transport's E070 owner must equal the logon user (no foreign deletes).
      - Status: must be modifiable (D/L); released (R/N/O) is refused.
      - DOUBLE CHECK: pass confirm_transport equal to `transport` AND force=True. If either
        is missing/mismatched, returns {error:'confirmation_required'} with a preview of the
        owner/status/description and DELETES NOTHING.

    Recommended flow: call once with just `transport` to see the preview, then call again
    with confirm_transport=<same number> and force=True to delete.

    SAP refuses to delete a request that still has TASKS or recorded OBJECTS, which is
    every workbench request that has ever been written to — and the refusal does not say
    which ones. Two opt-in flags clear the way, both behind the same double-confirm:

      - `recursive` — delete the request's tasks first, then the request.
      - `remove_locked_objects` — strip the recorded object entries out of the request
        and its tasks beforehand. Use only when the entries are genuinely unwanted; the
        objects themselves stay on the system, they simply stop being recorded here.

    The result carries `cleared` — the tasks deleted, the objects stripped, and anything
    that resisted — so a partial success says exactly how far it got.
    """
    try:
        client = _get_client()
        with _quiet():
            result = client.delete_transport(
                transport=transport,
                confirm_transport=confirm_transport or None,
                force=force,
                recursive=bool(recursive),
                remove_locked_objects=bool(remove_locked_objects),
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
#
# SECURITY POSTURE (hardened 2026-07-29 after external review).
# This surface can create, push, activate and DELETE objects, and mutate CTS, using
# the credentials in .conn_adt. Loopback is a routing boundary, not an authorization
# one: any other process running as this user, and any web page the user visits, can
# reach 127.0.0.1. So authentication is ON by default and the server generates a
# token if the operator did not set one.
#   ABAP_HTTP_TOKEN=<t>        use this bearer token
#   (unset)                    a random token is generated and printed to stderr
#   ABAP_HTTP_ALLOW_NO_AUTH=1  run with NO authentication (loopback only; refused
#                              on any other bind). Escape hatch for existing local
#                              setups — it is loudly warned about and it is a
#                              deliberate downgrade, not a supported default.
# A non-loopback bind ALWAYS requires a token; bearer tokens travel in cleartext
# over plain HTTP, so put a TLS-terminating authenticating proxy in front of it.
#
# Known limitations, deliberately not "fixed" here (documented so they are not
# mistaken for oversights): one process owns one SAP session, so this is
# single-user and not multi-tenant; a client disconnect or timeout does NOT cancel
# an in-flight SAP operation; and per-call serialization does not give one caller
# ownership of a multi-call lock/push/activate/unlock workflow.
# ---------------------------------------------------------------------------
import hmac as _hmac
import json as _json
import secrets as _secrets
import threading as _threading
import time as _time

_HTTP_CALL_LOCK = _threading.Lock()  # serialize tool calls: ONE SAPClient session

# 1 MiB. Tool arguments are source code at worst; anything larger is a mistake or a
# way to make the server allocate for free.
_HTTP_MAX_BODY = 1 * 1024 * 1024


def _http_is_loopback(host: str) -> bool:
    """True only for addresses that cannot be reached from another machine."""
    import ipaddress
    if host in ("localhost", ""):
        return True
    try:
        return ipaddress.ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False  # a name we cannot resolve to loopback is treated as remote


def _http_audit(event: dict) -> None:
    """One structured JSON line per request, to stderr and optionally to a file.

    There was previously NO request log at all on a surface that can change a
    customer's SAP system: `log_message` is suppressed, so nothing recorded who
    called what. SAP's own logs show the ADT user, which is the same for every
    caller, so they cannot answer "which client did this" or "was it retried".

    Arguments are recorded by KEY ONLY. Values routinely carry ABAP source, SQL
    text and business data; naming the keys is enough to reconstruct what was
    invoked without turning the audit trail into a second copy of the payload.
    Set ABAP_HTTP_AUDIT=<path> to also append to a file — stderr alone is lost when
    the server is started detached, which is exactly how the skills start it.
    """
    line = _json.dumps(event, ensure_ascii=False, sort_keys=True)
    sys.stderr.write(f"[adt-audit] {line}\n")
    sys.stderr.flush()
    path = os.getenv("ABAP_HTTP_AUDIT", "").strip()
    if path:
        try:
            with open(path, "a", encoding="utf-8") as fh:
                fh.write(line + "\n")
        except OSError as exc:
            sys.stderr.write(f"[adt-audit] WARNING: cannot write {path}: {exc}\n")


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
    local = _http_is_loopback(host)
    token = os.getenv("ABAP_HTTP_TOKEN", "").strip()
    allow_no_auth = os.getenv("ABAP_HTTP_ALLOW_NO_AUTH", "").strip() == "1"

    # --- authentication is decided BEFORE the socket is opened -----------------
    # A warning does not stop anything. A write-capable SAP surface bound off
    # loopback with no token is not a configuration to warn about, so it refuses.
    if not local and not token:
        raise SystemExit(
            "[adt-http] REFUSING to start: binding to a non-loopback address "
            f"({host}) exposes SAP write operations to the network.\n"
            "  Set ABAP_HTTP_TOKEN=<secret> and front it with a TLS-terminating "
            "authenticating proxy — a bearer token over plain HTTP travels in "
            "cleartext.\n"
            "  For local use, bind 127.0.0.1 instead.\n")
    if not local and allow_no_auth:
        raise SystemExit(
            "[adt-http] REFUSING to start: ABAP_HTTP_ALLOW_NO_AUTH is loopback-only.\n")
    generated = False
    if not token and not allow_no_auth:
        token = _secrets.token_urlsafe(32)
        generated = True

    # Host values this listener will answer to. A DNS name that resolves to
    # 127.0.0.1 is how a remote page reaches a loopback service; checking Host
    # closes that off, because the browser sends the attacker's name, not ours.
    allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}", f"[::1]:{port}",
                     f"{host}:{port}"} if local else {f"{host}:{port}"}

    class _Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def _send(self, code, obj, extra_headers=None):
            body = _json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            # No CORS headers, ever: a browser must not be able to read a reply
            # from this server, and adding them is the one change that would let it.
            for k, v in (extra_headers or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

        def _auth_ok(self):
            if not token:
                return True  # ABAP_HTTP_ALLOW_NO_AUTH, loopback only
            supplied = self.headers.get("Authorization", "")
            return _hmac.compare_digest(supplied, f"Bearer {token}")

        def _host_ok(self):
            values = self.headers.get_all("Host") or []
            return len(values) == 1 and values[0].strip().lower() in allowed_hosts

        def _guard(self):
            """Checks common to every request. Returns True when it already replied."""
            if not self._host_ok():
                self.close_connection = True
                self._send(421, {"ok": False, "error": "misdirected_request",
                                 "message": "Host header does not match this listener"})
                return True
            if not self._auth_ok():
                self._send(401, {"ok": False, "error": "unauthorized"},
                           {"WWW-Authenticate": "Bearer"})
                return True
            return False

        def log_message(self, *a):  # per-request noise off; _http_audit is the record
            pass

        def do_GET(self):
            if self._guard():
                return
            if self.path in ("/", "/health"):
                return self._send(200, {"ok": True, "server": "sap-consultant-sap-adt-http",
                                        "auth": "none" if not token else "bearer",
                                        "busy": _HTTP_CALL_LOCK.locked(),
                                        "tool_count": len(specs), "tools": sorted(specs)})
            if self.path == "/tools":
                return self._send(200, {"ok": True, "tools": [
                    {"name": n, "description": s["description"], "schema": s["schema"]}
                    for n, s in sorted(specs.items())]})
            return self._send(404, {"ok": False, "error": "not_found"})

        def _read_body(self):
            """Bounded, strictly-framed JSON object. Raises ValueError with a reason."""
            if self.headers.get("Transfer-Encoding"):
                raise ValueError("chunked transfer-encoding is not accepted")
            # A cross-origin form/text POST cannot set this header without a
            # preflight, which is never answered — so requiring it exactly closes
            # off the no-preflight browser POST.
            ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if ctype != "application/json":
                raise ValueError("Content-Type must be application/json")
            values = self.headers.get_all("Content-Length") or []
            if len(values) != 1:
                raise ValueError("exactly one Content-Length header is required")
            try:
                clen = int(values[0])
            except ValueError:
                raise ValueError("Content-Length is not an integer")
            if clen < 0 or clen > _HTTP_MAX_BODY:
                raise ValueError(f"body must be 0..{_HTTP_MAX_BODY} bytes")
            raw = self.rfile.read(clen) if clen else b""
            if len(raw) != clen:
                raise ValueError("body shorter than Content-Length")
            kwargs = _json.loads(raw.decode("utf-8")) if raw else {}
            if not isinstance(kwargs, dict):
                raise ValueError("body must be a JSON object of kwargs")
            return kwargs

        def do_POST(self):
            if self._guard():
                return
            if not self.path.startswith("/tool/"):
                return self._send(404, {"ok": False, "error": "not_found",
                                        "message": "use POST /tool/<name>"})
            name = self.path[len("/tool/"):].strip("/")
            spec = specs.get(name)
            if not spec:
                # A tool that is one environment variable away is not the same
                # thing as a tool that does not exist, and both used to answer
                # "unknown_tool". On the read-only surface adt_sql, adt_unit_test
                # and adt_dumps are gated, not removed -- the server says so on
                # its own stderr and the HTTP caller never saw it, so an agent
                # read "no such tool" and gave up on something it could have had.
                gate = (globals().get("_HTTP_GATED_TOOLS") or {}).get(name)
                if gate:
                    return self._send(403, {
                        "ok": False, "error": "tool_gated",
                        "message": (f"{name} exists on this surface but is closed. "
                                    f"It is not registered because {gate['why']}. "
                                    f"Set {gate['var']}=true (exactly that string) "
                                    f"before starting the server to open it."),
                        "env_var": gate["var"]})
                return self._send(404, {"ok": False, "error": "unknown_tool",
                                        "message": f"no tool {name!r}; GET /tools for the list"})
            try:
                kwargs = self._read_body()
            except ValueError as exc:
                return self._send(400, {"ok": False, "error": "bad_request",
                                        "message": str(exc)})
            except Exception as exc:
                return self._send(400, {"ok": False, "error": "bad_request",
                                        "message": str(exc)})

            # Never queue. A blocked caller times out, gives up, and retries — while
            # its first call is STILL running against SAP. For a push/activate that
            # means the retry mutates state the abandoned call is mid-way through
            # changing. Refusing immediately keeps the failure legible.
            if not _HTTP_CALL_LOCK.acquire(blocking=False):
                _http_audit({"event": "busy", "tool": name, "client": self.client_address[0]})
                return self._send(503, {
                    "ok": False, "error": "sap_session_busy",
                    "message": ("another call owns the SAP session; this server is "
                                "single-session by design. Retry when it is free.")},
                    {"Retry-After": "1"})
            started = _time.time()
            try:
                result = spec["fn"](**kwargs)
                status = "ok"
            except TypeError as exc:
                _http_audit({"event": "call", "tool": name, "outcome": "bad_args",
                             "client": self.client_address[0],
                             "arg_keys": sorted(kwargs)})
                return self._send(400, {"ok": False, "error": "bad_args",
                                        "message": str(exc)})
            except ToolFailure as exc:
                # A tool that failed on its own terms, not an exception from SAP.
                # `_tool_reporting_failures` raises this so the MCP transport can mark
                # the response isError -- stdio MCP has an error channel and should use
                # it. This transport does not: the caller is a non-MCP client that reads
                # the JSON body and nothing else, so here the payload IS the channel and
                # it must arrive whole.
                #
                # Falling through to the generic handler below would flatten it: the
                # class matches none of _err's SAP exception types, so `error` came back
                # "unexpected" while the real code, the hint and error_source sat
                # stringified inside `message`. An aXet agent reading result["error"]
                # got "unexpected" for every failure the engine had carefully described.
                status = "failure"
                try:
                    result = _json.loads(str(exc))
                except Exception:
                    result = {"ok": False, "error": "tool_failure", "message": str(exc)}
            except Exception as exc:
                status = "exception"
                try:
                    result = _err(exc)
                except Exception:
                    result = {"ok": False, "error": "tool_exception", "message": str(exc)}
            finally:
                _HTTP_CALL_LOCK.release()
            # Values would put ABAP source, SQL text and business data in the log.
            _http_audit({"event": "call", "tool": name, "outcome": status,
                         "client": self.client_address[0], "arg_keys": sorted(kwargs),
                         "duration_ms": int((_time.time() - started) * 1000)})
            return self._send(200, result if isinstance(result, dict)
                              else {"ok": True, "result": result})

    srv = ThreadingHTTPServer((host, port), _Handler)
    if token and generated:
        auth_line = ("[adt-http] auth: GENERATED bearer token (no ABAP_HTTP_TOKEN was "
                     f"set) — send:\n[adt-http]   Authorization: Bearer {token}\n")
    elif token:
        auth_line = "[adt-http] auth: bearer token from ABAP_HTTP_TOKEN\n"
    else:
        auth_line = ("[adt-http] !! auth: NONE (ABAP_HTTP_ALLOW_NO_AUTH=1). Any local "
                     "process or web page can drive SAP writes through this port.\n")
    sys.stderr.write(
        f"[adt-http] listening on http://{host}:{port}  ({len(specs)} tools)\n"
        + auth_line
        + "[adt-http] GET /tools  |  POST /tool/<name> with JSON kwargs\n")
    sys.stderr.flush()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        # Stop accepting first, then let an in-flight call finish. Killing the
        # process mid-push is how locks and half-written transports are stranded —
        # the same failure we avoid by holding one session, one layer up.
        srv.shutdown()
        if _HTTP_CALL_LOCK.acquire(timeout=180):
            _HTTP_CALL_LOCK.release()
        else:
            sys.stderr.write("[adt-http] WARNING: a SAP call was still running at "
                             "shutdown; check for stranded locks/transports.\n")
        srv.server_close()


def main():
    import argparse
    ap = argparse.ArgumentParser(add_help=False, description="sap-consultant SAP ADT server")
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
