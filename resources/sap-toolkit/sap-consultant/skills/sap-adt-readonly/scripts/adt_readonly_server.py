#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Read-only HTTP gate for the abaper SAP ADT engine (aXet.code edition).

WHY THIS EXISTS
    aXet.code (Crush-based) cannot speak MCP stdio, so SAP ADT is reached over a
    localhost HTTP wrapper instead. This repo is handed to NEW users who must be
    able to *read* SAP but must NOT change it yet. This launcher is the guarantee.

    It reuses abaper's engine (adt_mcp_server.py + sap_client + sap_adt_lib)
    UNCHANGED and adds two independent locks — belt and suspenders:

      BELT       ADT_READONLY=true is forced into the environment BEFORE the
                 engine imports, so every write path in guardrails.require_writable()
                 refuses at the source (GR_READONLY) even if a tool is reachable.
      SUSPENDERS the HTTP surface is filtered to a fixed READ allowlist. Write
                 tools (push/create/activate/delete/transport-mutations/screen-gen)
                 are not registered at all -> POST returns 404 unknown_tool.

    Net effect: a new user physically cannot mutate SAP through this server.

USAGE
    ADT_CWD=<dir-with-.conn_adt> python adt_readonly_server.py [--host 127.0.0.1] [--port 8787]

    GET  /health          -> {ok, readonly:true, tool_count, tools[]}
    GET  /tools           -> read tool names + JSON schemas
    POST /tool/<name>     -> run a read tool with a JSON kwargs body
    Optional auth: set ABAP_HTTP_TOKEN -> require "Authorization: Bearer <token>".
"""
from __future__ import annotations

import json as _json
import os
import sys
import threading as _threading

# --- BELT: force read-only BEFORE the engine is imported --------------------
# guardrails.is_readonly() reads this live; forcing it here means no code path,
# reachable or not, can perform a write against SAP.
os.environ["ADT_READONLY"] = "true"

# Make the vendored engine importable (this file sits next to adt_mcp_server.py).
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import adt_mcp_server as _engine  # noqa: E402  (engine reused verbatim)

# --- SUSPENDERS: the only tools this server will ever expose -----------------
# Every entry is a pure read or a passive analysis. Unit tests are included per
# product decision: they write nothing to CTS (they only execute the object's
# own test classes). Anything that mutates SAP or CTS is deliberately absent.
READONLY_TOOLS = frozenset({
    "ping",                 # liveness
    "adt_logon",            # verify connection / auth
    "adt_doctor",           # connection diagnostics
    "adt_sql",              # read-only ABAP SQL SELECT (PII guard still applies)
    "adt_search",           # object-name search
    "adt_code_search",      # full-text source search
    "adt_get_source",       # read active source
    "adt_list_package",     # list package contents
    "adt_where_used",       # usages of an object
    "adt_revisions",        # version history
    "adt_syntax_check",     # syntax-check WITHOUT activating
    "adt_atc_check",        # ATC quality analysis (read-only)
    "adt_unit_test",        # runs the object's test classes (no CTS write)
    "adt_check_scatter",    # detect scattered class includes (read)
    "adt_inactive_objects", # list inactive objects (read)
    "adt_badi_discovery",   # classic-BAdI cross-reference (read)
    "adt_dumps",            # recent ST22 short dumps (read)
    "adt_list_transports",  # list the user's transports (read)
    "adt_transport_status", # pinned-transport orientation (read)
    "adt_transport_check",  # pre-write transport check (read-only, no lock)
})

# Write tools intentionally NOT served (documented so the exclusion is auditable):
#   adt_push, adt_create, adt_activate, adt_delete_object,
#   adt_clear_lock, adt_set_transport, adt_create_transport, adt_delete_transport,
#   adt_remove_from_transport, adt_create_package, adt_generate_screen

_HTTP_CALL_LOCK = _threading.Lock()  # one persistent SAPClient => one call at a time


def _read_specs():
    """All engine tool specs, filtered down to the read allowlist."""
    full = _engine._http_tool_specs()
    specs = {n: s for n, s in full.items() if n in READONLY_TOOLS}
    missing = READONLY_TOOLS - set(full)
    if missing:
        sys.stderr.write(
            f"[abaper-ro] WARNING: allowlisted tools not found in engine: "
            f"{sorted(missing)} (engine version drift?)\n")
    return specs


def run_readonly_http(host: str = "127.0.0.1", port: int = 8787) -> None:
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    specs = _read_specs()
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
            return not token or self.headers.get("Authorization", "") == f"Bearer {token}"

        def log_message(self, *a):  # keep stdout/stderr clean per request
            pass

        def do_GET(self):
            if not self._auth_ok():
                return self._send(401, {"ok": False, "error": "unauthorized"})
            if self.path in ("/", "/health"):
                return self._send(200, {
                    "ok": True, "server": "abaper-sap-adt-readonly-http",
                    "readonly": True, "tool_count": len(specs),
                    "tools": sorted(specs)})
            if self.path == "/tools":
                return self._send(200, {"ok": True, "readonly": True, "tools": [
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
                # Either an unknown tool, or a write tool blocked by the read gate.
                return self._send(404, {
                    "ok": False, "error": "unknown_tool",
                    "message": (f"tool {name!r} is not available on this READ-ONLY "
                                f"server. GET /tools for the allowed read tools.")})
            try:
                clen = int(self.headers.get("Content-Length", 0) or 0)
                raw = self.rfile.read(clen) if clen else b""
                kwargs = _json.loads(raw.decode("utf-8")) if raw else {}
                if not isinstance(kwargs, dict):
                    raise ValueError("request body must be a JSON object of kwargs")
            except Exception as exc:
                return self._send(400, {"ok": False, "error": "bad_request", "message": str(exc)})
            try:
                with _HTTP_CALL_LOCK:
                    result = spec["fn"](**kwargs)
            except TypeError as exc:
                return self._send(400, {"ok": False, "error": "bad_args", "message": str(exc)})
            except Exception as exc:
                try:
                    result = _engine._err(exc)
                except Exception:
                    result = {"ok": False, "error": "tool_exception", "message": str(exc)}
            return self._send(200, result if isinstance(result, dict)
                              else {"ok": True, "result": result})

    srv = ThreadingHTTPServer((host, port), _Handler)
    local = host in ("127.0.0.1", "localhost", "::1")
    sys.stderr.write(
        f"[abaper-ro] READ-ONLY server listening on http://{host}:{port}  "
        f"({len(specs)} read tools; ADT_READONLY=true)\n"
        + ("" if local else
           "[abaper-ro] !! WARNING: non-localhost bind — still read-only, but avoid exposing SAP reads on the network!\n")
        + f"[abaper-ro] auth: {'Bearer token (ABAP_HTTP_TOKEN)' if token else 'none - localhost only'}\n"
        + "[abaper-ro] GET /tools  |  POST /tool/<name> with JSON kwargs  |  writes are NOT served\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


def main():
    import argparse
    ap = argparse.ArgumentParser(description="abaper SAP ADT READ-ONLY HTTP server (aXet.code)")
    ap.add_argument("--host", default="127.0.0.1", help="bind host (default localhost)")
    ap.add_argument("--port", type=int, default=8787, help="port (default 8787)")
    args, _unknown = ap.parse_known_args()
    run_readonly_http(args.host, args.port)


if __name__ == "__main__":
    main()
