#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate tests for adt_readonly_server.py. No SAP connection, no network.

    py plugins/sap-consultant/skills/sap-adt-readonly/scripts/test_readonly_surface.py

Each test states the failure it would catch. Exit code 0 = all pass.
"""
from __future__ import annotations

import importlib
import io
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

RESULTS = []


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — a crash is a failure, not a stack trace
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


def fresh(**env):
    """Re-import both modules with a clean registry and the given environment.

    Every ADT_RO_ALLOW_* variable is cleared by prefix, not by name: a hard-coded
    list silently stops clearing a gate the moment one is added, and the leftover
    value from the previous test leaks into the next one.
    """
    for k in [k for k in os.environ if k.startswith("ADT_RO_ALLOW_")] + ["ADT_READONLY"]:
        os.environ.pop(k, None)
    os.environ.update(env)
    for mod in ("adt_readonly_server", "adt_mcp_server", "guardrails"):
        sys.modules.pop(mod, None)
    return importlib.import_module("adt_readonly_server")


def quiet(fn, *a, **kw):
    """Run fn with stderr captured — the module narrates to stderr by design."""
    saved, sys.stderr = sys.stderr, io.StringIO()
    try:
        return fn(*a, **kw)
    finally:
        sys.stderr = saved


# --- 1: the classification covers the engine exactly -------------------------
def t_covers_engine():
    ro = fresh()
    registered = set(ro.engine.mcp._tool_manager._tools)
    classified = ro.ALLOW | set(ro.GATED) | ro.DENY
    assert registered == classified, (
        f"unclassified={sorted(registered - classified)} "
        f"stale={sorted(classified - registered)}")
    # A literal, not len(classified) — that would compare the classification to
    # itself and pass through any drift. Bump it deliberately when the engine
    # gains a tool, in the same commit that classifies it.
    # 42 since 2026-08-11. Nine added for cross-system transfer, eight of them
    # writes (DENY): adt_create_ddic_shell, adt_create_domain,
    # adt_create_data_element, adt_create_table_type, adt_create_function_group,
    # adt_write_function_module,
    # adt_create_service_binding,
    # adt_publish_service_binding -- plus adt_service_binding_status (ALLOW, one GET).
    # 50 since 2026-09-03. Eight more, and they had been registered for a while
    # before anyone noticed: nothing runs this file, so the entrypoint's own
    # fail-closed refusal was the first report -- on a consultant's machine, where
    # it read as "the SAP tool does not start". Seven are creators (DENY):
    # adt_create_cds_view, adt_create_metadata_extension,
    # adt_create_behavior_definition, adt_create_access_control,
    # adt_create_type_group, adt_create_lock_object,
    # adt_unpublish_service_binding -- plus adt_capabilities (ALLOW, one GET on
    # /sap/bc/adt/discovery).
    assert len(registered) == 50, f"engine registers {len(registered)} tools, expected 50"


# --- 2: default surface is reads only ----------------------------------------
def t_default_surface():
    ro = fresh()
    keep = quiet(ro.build)
    assert keep == ro.ALLOW, f"surface != ALLOW: {sorted(keep ^ ro.ALLOW)}"
    # 18 since 2026-08-11: adt_service_binding_status joined ALLOW (one GET).
    # 19 since 2026-09-03: adt_capabilities joined ALLOW (one GET).
    assert len(keep) == 19, f"expected 19 tools on install, got {len(keep)}"
    live = set(ro.engine.mcp._tool_manager._tools)
    assert live == keep, f"registry != surface: {sorted(live ^ keep)}"


# --- 3: no write tool survives, in the registry OR as a callable spec ---------
def t_no_write_tools():
    ro = fresh()
    quiet(ro.build)
    live = set(ro.engine.mcp._tool_manager._tools)
    leaked = sorted(ro.DENY & live)
    assert not leaked, f"write tools still registered: {leaked}"
    # The HTTP surface derives from the same registry — assert it, don't assume it.
    specs = set(quiet(ro.engine._http_tool_specs))
    assert not (ro.DENY & specs), f"write tools reachable over HTTP: {sorted(ro.DENY & specs)}"
    assert specs == live, f"HTTP surface != stdio surface: {sorted(specs ^ live)}"


# --- 4: every gate ships closed and opens only on the exact string -----------
def t_gate_closed_by_default():
    ro = fresh()
    keep = quiet(ro.build)
    still_open = sorted(set(ro.GATED) & keep)
    assert not still_open, f"gated tools exposed with no variable set: {still_open}"


def t_gate_rejects_truthy_spellings():
    ro0 = fresh()
    for name, gate in ro0.GATED.items():
        for value in ("1", "yes", "on", "TRUE ", "True"):
            ro = fresh(**{gate["var"]: value})
            keep = quiet(ro.build)
            opened = name in keep
            # 'TRUE '/'True' normalise to true by design (strip+lower); 1/yes/on do not.
            expected = value.strip().lower() == "true"
            assert opened == expected, f"{gate['var']}={value!r} -> {name} opened={opened}"


def t_gate_opens():
    ro0 = fresh()
    # One at a time: opening a gate must expose that tool and nothing else.
    for name, gate in ro0.GATED.items():
        ro = fresh(**{gate["var"]: "true"})
        keep = quiet(ro.build)
        assert keep == ro.ALLOW | {name}, \
            f"{gate['var']}=true changed the surface by more than {name}: " \
            f"{sorted(keep ^ (ro.ALLOW | {name}))}"

    # All three together.
    ro = fresh(**{g["var"]: "true" for g in ro0.GATED.values()})
    keep = quiet(ro.build)
    assert len(keep) == 22, f"expected 22 tools with every gate open, got {len(keep)}"
    assert not (ro.DENY & keep), "opening the gates exposed a write tool"


def t_each_gate_is_a_distinct_variable():
    """One variable must not open two tools."""
    ro = fresh()
    variables = [g["var"] for g in ro.GATED.values()]
    assert len(set(variables)) == len(variables), \
        f"gates share a variable, so one opt-in opens several tools: {variables}"


# --- 5: the belt is on -------------------------------------------------------
def t_belt_set():
    ro = fresh()
    assert os.environ.get("ADT_READONLY") == "true", "ADT_READONLY not set by the entrypoint"
    assert ro.guardrails.is_readonly(), "guardrails does not see the connection as read-only"


def t_refuses_if_belt_cleared():
    ro = fresh()
    os.environ["ADT_READONLY"] = ""
    try:
        quiet(ro.build)
    except SystemExit:
        return
    finally:
        os.environ["ADT_READONLY"] = "true"
    raise AssertionError("build() continued after ADT_READONLY was cleared")


# --- 6: the drift pin ---------------------------------------------------------
def t_drift_new_tool_refuses():
    ro = fresh()

    @ro.engine.mcp.tool()
    def zz_hypothetical_new_write_tool() -> dict:  # noqa: D401
        """A tool a future upstream version might add."""
        return {"ok": True}

    try:
        quiet(ro.build)
    except SystemExit as exc:
        assert "zz_hypothetical_new_write_tool" in str(exc), \
            f"refusal did not name the unclassified tool: {exc}"
        return
    raise AssertionError("an unclassified tool was accepted instead of refusing to start")


def t_drift_renamed_tool_refuses():
    ro = fresh()
    ro.engine.mcp._tool_manager._tools.pop("adt_push")
    try:
        quiet(ro.build)
    except SystemExit as exc:
        assert "adt_push" in str(exc), f"refusal did not name the vanished tool: {exc}"
        return
    raise AssertionError("a stale classification was accepted instead of refusing to start")


def t_classification_disjoint():
    """The shipped sets must not overlap, and an overlap must be refused."""
    ro = fresh()
    assert not (ro.ALLOW & ro.DENY), f"shipped ALLOW & DENY overlap: {ro.ALLOW & ro.DENY}"
    assert not (ro.ALLOW & set(ro.GATED)), "shipped ALLOW & GATED overlap"
    assert not (set(ro.GATED) & ro.DENY), "shipped GATED & DENY overlap"

    # A write tool listed in BOTH sets passes the drift check (the union is
    # unchanged) and then wins, because keep = set(ALLOW).
    ro.ALLOW.add("adt_push")
    try:
        quiet(ro.build)
    except SystemExit as exc:
        assert "adt_push" in str(exc), f"refusal did not name the double-classified tool: {exc}"
        return
    raise AssertionError("a tool classified as both ALLOW and DENY was exposed")


def t_engine_identity():
    """The imported engine must be the sibling skill's file, not any same-named module."""
    ro = fresh()
    engine_dir = Path(ro.__file__).resolve().parents[2] / "sap-adt" / "scripts"
    assert Path(ro.engine.__file__).resolve() == (engine_dir / "adt_mcp_server.py").resolve(), \
        f"engine imported from {ro.engine.__file__}, not the sap-adt skill"
    assert Path(ro.guardrails.__file__).resolve() == (engine_dir / "guardrails.py").resolve(), \
        f"guardrails imported from {ro.guardrails.__file__}, not the sap-adt skill"
    # And the check itself has teeth.
    try:
        ro._assert_origin(ro.engine, engine_dir / "not_the_engine.py")
    except SystemExit:
        return
    raise AssertionError("_assert_origin accepted a module from the wrong file")


def t_refuses_without_registry():
    ro = fresh()
    ro.engine.mcp._tool_manager._tools = None  # simulate an mcp-version internals change
    try:
        quiet(ro.build)
    except SystemExit as exc:
        assert "REFUS" in str(exc).upper(), f"unexpected exit message: {exc}"
        return
    raise AssertionError("build() fell back to belt-only instead of refusing to start")


CHECKS = [
    ("classification covers the engine", "a tool the engine has but nobody classified", t_covers_engine),
    ("default surface is the 19 reads", "an accidental change to the allowlist", t_default_surface),
    ("no write tool in stdio or HTTP", "a write tool surviving the prune", t_no_write_tools),
    ("all gates closed on install", "ABAP run, or personal data read, on a system nobody opted in for", t_gate_closed_by_default),
    ("gates ignore 1/yes/on", "a gate opened by an unrelated truthy env value", t_gate_rejects_truthy_spellings),
    ("each gate opens only itself", "one opt-in quietly widening the surface past what was asked for", t_gate_opens),
    ("gates have distinct variables", "one variable opening three tools at once", t_each_gate_is_a_distinct_variable),
    ("belt in effect", "suspenders-only, with call-time guardrails disarmed", t_belt_set),
    ("refuses if belt cleared", "an env wipe silently re-enabling writes", t_refuses_if_belt_cleared),
    ("drift pin: new tool", "a new upstream write tool silently exposed", t_drift_new_tool_refuses),
    ("drift pin: renamed tool", "a renamed write tool becoming unclassified", t_drift_renamed_tool_refuses),
    ("refuses without a registry", "mcp internals drift degrading this to belt-only", t_refuses_without_registry),
    ("classification is disjoint", "a write tool in ALLOW and DENY at once, exposed by ALLOW", t_classification_disjoint),
    ("engine is the sibling skill's", "pruning the registry of a same-named module that is not served", t_engine_identity),
]


def main():
    for name, catches, fn in CHECKS:
        check(name, catches, fn)
    width = max(len(r[1]) for r in RESULTS)
    failed = 0
    print()
    for status, name, catches, detail in RESULTS:
        mark = "PASS" if status == "PASS" else "FAIL"
        print(f"  [{mark}] {name.ljust(width)}   catches: {catches}")
        if detail:
            failed += 1
            print(f"         -> {detail}")
    total = len(RESULTS)
    print(f"\n  {total - failed}/{total} passed\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
