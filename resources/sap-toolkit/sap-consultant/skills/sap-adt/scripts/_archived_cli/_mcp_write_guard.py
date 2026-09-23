#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP write guard — keep direct CLI writes from bypassing the persistent session.

WHY: a one-off `python push_object.py ...` re-authenticates and opens a SEPARATE
SAP session + lock. A retry then spawns a FRESH lock -> orphaned/ghost K+S
transports (scattered transports). The sap-adt MCP server holds ONE session, so a
retried write reuses the same lock. That retry-idempotency is the whole reason
the MCP exists, and it ONLY applies inside the MCP tools.

This guard is on the standalone SCRIPT entrypoints only. The MCP server calls the
SAPClient library in-process (it never runs these scripts), so the guard never
affects the MCP path — verified: nothing subprocesses these scripts.

Scope: applied only to write scripts that HAVE an MCP twin (push/create/activate),
so the block can always point to a real alternative. Scripts with no MCP tool
(delete_object, create_lock_object) are not guarded.
"""
import os
import sys

# operation -> the MCP tool the agent should use instead
_MCP_TOOL = {
    "push": "adt_push",
    "create": "adt_create",
    "activate": "adt_activate",
}

_TRUTHY = {"1", "true", "yes", "on"}


def require_mcp_or_override(operation: str) -> None:
    """Block a direct CLI write unless an explicit override is present.

    Allowed when EITHER:
      * env  ABAP_DIRECT_WRITE_OK  is truthy, OR
      * the flag  --allow-direct  is on the command line.
    Both are documented as the *MCP-down fallback only* path.
    Otherwise print guidance to stderr and exit 2 (so the agent reads it and
    switches to the MCP tool).
    """
    override_env = os.getenv("ABAP_DIRECT_WRITE_OK", "").strip().lower() in _TRUTHY
    override_flag = "--allow-direct" in sys.argv
    if override_env or override_flag:
        # strip the flag so argparse in the caller doesn't choke on it
        if override_flag:
            sys.argv = [a for a in sys.argv if a != "--allow-direct"]
        sys.stderr.write(
            f"[adt] direct-write override active for '{operation}' "
            "(MCP-down fallback). Prefer the MCP tool when the server is up.\n"
        )
        return

    tool = _MCP_TOOL.get(operation, "the MCP tool")
    sys.stderr.write(
        "\n============================================================\n"
        "  BLOCKED: direct CLI write bypasses the persistent MCP session\n"
        "============================================================\n"
        f"  Operation: {operation}   ->   use the MCP tool:  {tool}\n"
        "\n"
        "  A one-off `python …` write opens a SEPARATE SAP session + lock; a\n"
        "  retry spawns a FRESH lock -> ghost / scattered transports. The sap-adt\n"
        "  MCP server holds ONE session so a retry reuses the same lock.\n"
        "\n"
        f"  -> Call the MCP tool `{tool}` instead.\n"
        "\n"
        "  Genuine fallback ONLY (MCP server truly unavailable):\n"
        "     re-run with  ABAP_DIRECT_WRITE_OK=1   (or add  --allow-direct)\n"
        "============================================================\n"
    )
    sys.exit(2)
