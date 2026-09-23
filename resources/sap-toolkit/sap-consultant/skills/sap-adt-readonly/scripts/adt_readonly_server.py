#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Read-only entrypoint for the sap-consultant SAP ADT server.

Same engine, same persistent session, same guardrails as adt_mcp_server.py —
but a surface that CANNOT write, because the write tools are never registered.

WHY A SECOND ENTRYPOINT INSTEAD OF AN ENV VAR
  ADT_READONLY on its own is a *belt*: guardrails.require_writable() reads it at
  call time, so all 33 tools stay listed and callable and a write fails only once
  the agent has already decided to write. That is the right behaviour for a
  DEV connection someone temporarily froze. It is the wrong behaviour when the
  system must be unwriteable by construction — a QA/PRD read, an audit, a review
  board, a demo, a consultant who should not be able to push at all. Two problems
  remain with belt-only:
    - the write tools are still advertised, so the model plans a push, spends the
      turn on it, and only then learns it was refused;
    - one unset env var (a wrapper that clears the environment, a --http launch
      from a different shell, an operator who "fixed" a refusal) silently restores
      full write capability.
  This file adds the *suspenders*: 13 tools that can write — 10 that only write,
  plus 3 mixed-mode ones that write on some arguments — are removed from the MCP
  registry before the transport starts, so they are neither listed nor callable.
  Unsetting ADT_READONLY afterwards does not bring them back — they do not exist
  in this process.

WHAT IS EXPOSED
  17 metadata/source/CTS reads always, plus three tools that each need their own
  variable set to exactly "true". None of the three writes anything — they are
  gated because "read-only" reads as "harmless" to the people this skill is for,
  and these three are not:
    adt_unit_test  ADT_RO_ALLOW_UNIT_TEST  executes ABAP on the target (test classes;
                                           a badly isolated test can commit)
    adt_sql        ADT_RO_ALLOW_SQL        business and personal data, any table the
                                           SAP user can see
    adt_dumps      ADT_RO_ALLOW_DUMPS      short-dump text, which carries field values
  A surface that cannot change the system but hands an agent the payroll table is
  not the thing an auditor means by read-only. Open each one per session, knowing
  which system you are on.

  Surface: 17 tools on install, 20 with all three gates open, out of the engine's 33.

DRIFT PIN
  Every tool the engine registers must appear in exactly one of ALLOW / GATED /
  DENY below. A tool added upstream and not classified here makes this server
  REFUSE TO START, naming it. That is deliberate: the alternative is a new write
  tool silently inheriting either "exposed" (a hole) or "hidden" (a capability
  that quietly disappears from the write server's read-only twin without anyone
  deciding it should).

RUN
  stdio:  py adt_readonly_server.py
  http:   py adt_readonly_server.py --http --port 8790
  (The write server defaults to 8787; a different default port so both can run.)

This file lives in the sap-adt-readonly skill but imports the engine from the
sap-adt skill next door — there is no second copy of the engine, because a fork
is how a read-only server quietly becomes a different server with the same name.

Register it in a client the same way as adt_mcp_server.py, pointing at this file.
It is intentionally NOT in plugins/sap-consultant/.mcp.json: that entry is alwaysLoad,
so a second entry would ADD these tools to the 31, not replace them. The operator
points a client at this file instead of the other one.
"""
from __future__ import annotations

import os
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

# --- BELT: set before the engine imports, so guardrails.is_readonly() is true for
# the whole process life — including any code path that reads it at import time.
os.environ["ADT_READONLY"] = "true"

_SCRIPTS_DIR = Path(__file__).resolve().parent
# The engine lives in the sap-adt skill, one level over. This skill carries no copy
# of it — a forked engine is how a read-only server drifts into being a different
# server with the same name.
_ENGINE_DIR = _SCRIPTS_DIR.parents[1] / "sap-adt" / "scripts"
if not (_ENGINE_DIR / "adt_mcp_server.py").is_file():
    raise SystemExit(
        f"[adt-ro] REFUSING to start: the ADT engine is not where it should be "
        f"({_ENGINE_DIR / 'adt_mcp_server.py'}).\n"
        "  This skill runs the sap-adt engine; it does not carry its own. Keep both "
        "skills together under plugins/sap-consultant/skills/ — this path is resolved "
        "relative to this file, so PYTHONPATH cannot substitute for it.\n")
# The engine directory goes FIRST on sys.path. Inserting at 0 twice reverses the
# order, so this loop runs back-to-front on purpose.
for _p in (str(_SCRIPTS_DIR), str(_ENGINE_DIR)):
    if _p in sys.path:
        sys.path.remove(_p)
    sys.path.insert(0, _p)

import adt_mcp_server as engine  # noqa: E402  (must follow the env var + sys.path)
import guardrails  # noqa: E402


def _assert_origin(mod, expected: Path) -> None:
    """The module we imported must be the file we resolved.

    sys.path order is not a guarantee: a module already in sys.modules wins over
    any path, and 'guardrails'/'adt_mcp_server' are generic enough to be shadowed
    by an unrelated file earlier on the path. Importing *a* module called
    adt_mcp_server and pruning *its* registry proves nothing about the engine this
    server actually runs, so check the identity rather than trusting the lookup.
    """
    got = getattr(mod, "__file__", None)
    if got is None or Path(got).resolve() != expected.resolve():
        raise SystemExit(
            f"[adt-ro] REFUSING to start: imported {mod.__name__!r} from "
            f"{got!r}, but this skill's engine is {expected}.\n"
            "  Another module of the same name was already loaded or shadowed it on "
            "sys.path. The tool registry pruned here would not be the one served.\n")


_assert_origin(engine, _ENGINE_DIR / "adt_mcp_server.py")
_assert_origin(guardrails, _ENGINE_DIR / "guardrails.py")


# --- the classification ------------------------------------------------------
# Every name here is a tool in adt_mcp_server.py. ALLOW | GATED | DENY must equal
# the engine's registered set exactly (see _check_drift).

ALLOW = {
    # session / diagnostics — touch no object
    "ping",
    "adt_doctor",
    "adt_logon",
    # One GET on /sap/bc/adt/discovery plus an in-process lookup of which tools
    # this engine ships. Reports what the system offers; changes nothing.
    "adt_capabilities",
    # source and repository reads
    "adt_get_source",
    "adt_list_package",
    "adt_search",
    "adt_code_search",
    "adt_revisions",
    "adt_inactive_objects",
    "adt_badi_discovery",
    "adt_where_used",
    # One GET on the binding object. Reads whether an OData service is actually
    # published -- the RAP state that looks identical to success everywhere else.
    "adt_service_binding_status",
    # analysis — no source change, no lock, no activation
    "adt_syntax_check",
    "adt_atc_check",
    # transports — read the CTS, never modify it
    "adt_list_transports",
    "adt_transport_status",
    "adt_transport_check",
    "adt_check_scatter",
}

# Exposed only when their own variable is exactly "true". Each of these is
# read-only with respect to the system's STATE, which is why none of them is in
# DENY — and each one costs something the word "read-only" does not warn a
# non-specialist about, which is why none of them is in ALLOW either.
GATED = {
    "adt_unit_test": {
        "var": "ADT_RO_ALLOW_UNIT_TEST",
        "why": "EXECUTES ABAP on the target system (runs the object's test classes)",
    },
    "adt_sql": {
        "var": "ADT_RO_ALLOW_SQL",
        "why": "reads BUSINESS AND PERSONAL DATA out of any table the SAP user can see",
    },
    "adt_dumps": {
        "var": "ADT_RO_ALLOW_DUMPS",
        "why": "returns short-dump text, which routinely contains field values",
    },
}

# Never registered by this entrypoint, whatever the environment says.
DENY = {
    "adt_push",
    "adt_create",
    "adt_create_ddic_shell",        # empty shell for a source-bearing object
    "adt_create_domain",            # DDIC types the generic create cannot make
    "adt_create_data_element",
    "adt_create_table_type",
    "adt_create_function_group",
    "adt_write_function_module",
    "adt_create_service_binding",   # creates SRVB
    "adt_publish_service_binding",  # exposes an OData service on the system
    "adt_unpublish_service_binding",  # withdraws it — same boundary, other direction
    "adt_create_cds_view",          # RAP/CDS creators: each POSTs a new repository
    "adt_create_metadata_extension",  # object, so each is a write however small
    "adt_create_behavior_definition",
    "adt_create_access_control",
    "adt_create_type_group",
    "adt_create_lock_object",       # creates an ENQUEUE object in DDIC
    "adt_activate",
    "adt_delete_object",
    "adt_create_package",
    "adt_create_transport",
    "adt_delete_transport",
    "adt_remove_from_transport",
    "adt_set_transport",   # write-prep: pins the transport a later push would use
    "adt_clear_lock",      # changes ENQUEUE state on the system
    # --- mixed-mode: one tool name, read or write depending on an argument ---
    # These three read OR write according to `mode=` / `action=`, so a name-level
    # decision cannot express them. They are denied whole, and that costs a real
    # read: adt_generate_adobe(mode="READ") is the ONLY way to see an SFPI/SFPF
    # form, because ADT does not know those object types at all. The alternative
    # is worse. Exposing the name and rejecting the write modes inside a wrapper
    # would advertise a write-capable schema on a surface whose whole promise is
    # that write tools are not registered — and it would put an argument parser
    # on the security boundary, where a new enum value, an alias or a defaulted
    # argument is a silent hole. Read these forms through the full sap-adt
    # surface instead. The durable fix is upstream: split each into a read tool
    # and a write tool so every registered name has ONE side-effect class. See
    # references/upstream-split-proposal.md.
    "adt_generate_screen",   # WRITE | READ | DELETE
    "adt_generate_adobe",    # WRITE | DELETE | SET_LAYOUT | SET_PARAMS | SYNC_CONTEXT | READ | STATUS | GET_*
    "adt_message_class",     # create | write | read
}


def _registered_names(mcp) -> set:
    """The tool names the engine registered — or exit.

    Fail closed on API drift. Falling back to "belt only" here would leave a
    server that still calls itself read-only while listing adt_push.
    """
    tm = getattr(mcp, "_tool_manager", None)
    tools = getattr(tm, "_tools", None) if tm is not None else None
    if not isinstance(tools, dict) or not tools:
        raise SystemExit(
            "[adt-ro] REFUSING to start: cannot read the FastMCP tool registry "
            "(mcp._tool_manager._tools). The installed mcp package has changed its "
            "internals, so the write tools cannot be removed and this server would "
            "expose them.\n"
            "  Use adt_mcp_server.py with ADT_READONLY=true (belt only, all tools "
            "listed, writes refused at call time) until this file is updated.\n")
    return set(tools.keys())


def _check_classification() -> None:
    """The three sets must be pairwise disjoint.

    Drift checking compares the UNION against the registry, so a name in both
    ALLOW and DENY passes it — and then `keep = set(ALLOW)` wins and the tool is
    exposed. A write tool would be listed by the server whose whole purpose is not
    listing it, with every test still green. Overlap is a bug, not a preference.
    """
    overlaps = {
        "ALLOW & GATED": ALLOW & set(GATED),
        "ALLOW & DENY": ALLOW & DENY,
        "GATED & DENY": set(GATED) & DENY,
    }
    bad = {k: sorted(v) for k, v in overlaps.items() if v}
    if bad:
        raise SystemExit(
            "[adt-ro] REFUSING to start: a tool is classified twice, so the "
            "classification does not say what this server exposes:\n"
            + "".join(f"    {k}: {', '.join(v)}\n" for k, v in bad.items())
            + "  Each tool belongs in exactly one of ALLOW, GATED or DENY.\n")


def _check_drift(registered: set) -> None:
    classified = ALLOW | set(GATED) | DENY
    unknown = sorted(registered - classified)
    missing = sorted(classified - registered)
    if unknown:
        raise SystemExit(
            "[adt-ro] REFUSING to start: the engine registers tool(s) this "
            "read-only entrypoint has never classified:\n"
            + "".join(f"    {n}\n" for n in unknown)
            + "  A human must decide whether each one reads or writes, and add it to "
              "ALLOW, GATED or DENY in adt_readonly_server.py.\n")
    if missing:
        raise SystemExit(
            "[adt-ro] REFUSING to start: classified tool(s) no longer exist in the "
            "engine (renamed or removed upstream):\n"
            + "".join(f"    {n}\n" for n in missing)
            + "  The classification is stale; a renamed write tool would now be "
              "unclassified. Update adt_readonly_server.py.\n")


def _gate_open(var: str) -> bool:
    """Gates ship closed and open only on the exact string 'true'.

    Not 1/yes/on: a gate that accepts several spellings is a gate someone opens
    by accident.
    """
    return os.getenv(var, "").strip().lower() == "true"


def _prune(mcp, keep: set) -> None:
    tm = mcp._tool_manager
    for name in sorted(set(tm._tools) - keep):
        remove = getattr(mcp, "remove_tool", None) or getattr(tm, "remove_tool", None)
        if callable(remove):
            remove(name)
        else:
            tm._tools.pop(name, None)
    # SUSPENDERS, positively asserted. Not "we called remove and assume it worked".
    left = set(tm._tools)
    if left != keep:
        raise SystemExit(
            "[adt-ro] REFUSING to start: the tool registry after pruning is not "
            "the allowlist.\n"
            f"    unexpected: {sorted(left - keep) or '-'}\n"
            f"    missing:    {sorted(keep - left) or '-'}\n")


def _harden(mcp, keep: set, gated_open: list) -> None:
    """Re-word the server instructions so the model is told the truth up front."""
    text = (
        "SAP ABAP Development Tools (ADT), READ-ONLY. This server exposes "
        f"{len(keep)} read tools; the write tools (push, create, activate, delete, "
        "transport creation, lock clearing) are NOT registered and cannot be called "
        "from here. Do not plan a push, a transport or an activation — propose a "
        "diff for a human to apply from a writable session instead. "
        + "".join(f"{name} IS enabled and {gate['why']}. " for name, gate in gated_open)
        + "Tools that are absent are absent by decision, not by accident: say so and "
          "name what you could not check, rather than working around it."
    )
    # FastMCP.instructions is a read-only property over the low-level server's
    # attribute, so the assignment goes there. Cosmetic only — if a future mcp
    # version moves it, the tool surface is still pruned, so do not fail on it.
    inner = getattr(mcp, "_mcp_server", None)
    try:
        if inner is not None:
            inner.instructions = text
        else:
            mcp.instructions = text
    except Exception as exc:
        sys.stderr.write(f"[adt-ro] note: could not set server instructions ({exc})\n")


def build():
    """Prune the engine's registry down to the read surface. Returns the tool set."""
    if not guardrails.is_readonly():
        # Belt failed — something cleared the env between the top of this file and
        # here. Do not continue on suspenders alone.
        raise SystemExit(
            "[adt-ro] REFUSING to start: ADT_READONLY is not in effect after "
            "being set at import. The environment was modified underneath this "
            "process.\n")

    mcp = engine.mcp
    _check_classification()
    registered = _registered_names(mcp)
    _check_drift(registered)

    keep = set(ALLOW)
    opened, closed = [], []
    for name, gate in GATED.items():
        (opened if _gate_open(gate["var"]) else closed).append((name, gate))

    keep |= {name for name, _ in opened}

    _prune(mcp, keep)
    _harden(mcp, keep, opened)

    sys.stderr.write(
        f"[adt-ro] read-only surface: {len(keep)} tools "
        f"({len(DENY)} write tools not registered)\n")
    for name, gate in opened:
        sys.stderr.write(
            f"[adt-ro] !! gate OPEN: {name} ({gate['var']}=true) — {gate['why']}.\n")
    for name, gate in closed:
        sys.stderr.write(
            f"[adt-ro] gate closed: {name} (set {gate['var']}=true to enable)\n")
    sys.stderr.flush()

    # Tell the HTTP layer which absences are gates rather than deletions, so a
    # call to a closed tool gets "set this variable" instead of the 404 it shares
    # with adt_push. The stderr lines above only reach whoever started the
    # server; the agent making the call sees the response and nothing else.
    # Names only — the engine must not be able to open a gate, only describe one.
    engine._HTTP_GATED_TOOLS = {name: dict(gate) for name, gate in closed}

    return keep


def main():
    import argparse
    ap = argparse.ArgumentParser(
        description="sap-consultant SAP ADT server — read-only entrypoint")
    ap.add_argument("--http", action="store_true",
                    help="Run a local HTTP transport instead of stdio MCP")
    ap.add_argument("--host", default="127.0.0.1", help="HTTP bind host (default localhost)")
    ap.add_argument("--port", type=int, default=8790,
                    help="HTTP port (default 8790; the write server uses 8787)")
    ap.add_argument("--list-tools", action="store_true",
                    help="Print the resulting tool surface and exit (no SAP connection)")
    # parse_args, not parse_known_args: a mistyped --hots would otherwise be
    # silently dropped and the server would bind somewhere the operator did not ask
    # for. A misconfigured read-only server should not start quietly.
    args = ap.parse_args()

    keep = build()

    if args.list_tools:
        for name in sorted(keep):
            gate = GATED.get(name)
            sys.stdout.write(
                f"{name}{'  [gated: ' + gate['var'] + ']' if gate else ''}\n")
        return
    if args.http:
        # _http_tool_specs() derives its map from mcp.list_tools(), so the pruned
        # registry constrains the HTTP surface too — one allowlist, both transports.
        engine.run_http(args.host, args.port)
    else:
        engine.mcp.run()


if __name__ == "__main__":
    main()
