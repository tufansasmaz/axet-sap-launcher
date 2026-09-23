#!/usr/bin/env python3
"""Compare a transfer plan against what is actually on the target system.

Stage 4 -- the last one, and the only one that can tell you the transfer worked.
It reads the TARGET, never the run files: a run records what the deploy believed,
and the whole point of this stage is that belief and reality diverge. The failure
it exists to catch is the quiet one -- an object that landed but never activated,
a service binding that activated but was never published, a name that was renamed
everywhere except in the one place that mattered.

Needs the persistent MCP session (read-only tools only):

    ADT_CWD="$PWD" ABAP_HTTP_TOKEN=<token> \\
      py plugins/sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py --http --port 8786

    py transfer_reconcile.py --plan .transfer/zrea/plan.yaml --port 8786 --token <token>

Writes reports/reconcile.md next to the plan.
Exit 0 = everything the plan promised is on the target and healthy.
Exit 1 = at least one gap. ASCII output only (cp1252 console).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
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

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE.parents[1] / "sap-adt" / "scripts"))

from transfer_types import kit_type_for  # noqa: E402

try:
    import yaml
except ImportError:
    sys.exit("[FAIL] PyYAML is required:  py -m pip install pyyaml")

XML_EXT = {"DOMA", "DTEL", "TTYP", "MSAG", "SRVB"}


class Session:
    def __init__(self, port: int, token: str):
        self.base = "http://127.0.0.1:%d" % port
        self.token = token

    def call(self, tool: str, **kwargs) -> dict:
        req = urllib.request.Request(
            "%s/tool/%s" % (self.base, tool),
            data=json.dumps(kwargs).encode("utf-8"),
            headers={"Authorization": "Bearer " + self.token,
                     "Content-Type": "application/json"},
            method="POST")
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return {"ok": False, "error": "HTTP %s" % e.code,
                    "detail": e.read().decode("utf-8", "replace")[:300]}
        except Exception as e:
            return {"ok": False, "error": str(e)[:200]}

    def health(self) -> dict:
        req = urllib.request.Request(self.base + "/health",
                                     headers={"Authorization": "Bearer " + self.token})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))


def log(m: str = "") -> None:
    print(m, flush=True)


def norm(s: str) -> str:
    """Whitespace-insensitive comparison.

    SAP reformats what it stores -- indentation and trailing newlines come back
    different from what was sent, every time. Comparing raw text would report
    drift on every single object and the report would be worthless.
    """
    return " ".join((s or "").lower().split())


def fetch_source(session, name: str, code: str) -> tuple[str, str]:
    """(source, error). Empty source with no error means the object is absent."""
    kit_type = kit_type_for(code)
    if not kit_type:
        return "", "no read path for %s" % code
    res = session.call("adt_get_source", name=name, object_type=kit_type)
    if isinstance(res, dict) and (res.get("source") or res.get("content")):
        return res.get("source") or res.get("content"), ""
    err = ""
    if isinstance(res, dict):
        err = str(res.get("error") or res.get("message") or "")[:160]
    return "", err


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plan", required=True)
    # 8786 is the port the published aXet.code setup tells a technical
    # consultant to start the wrapper on. Defaulting to anything else makes the
    # consultant supply a number they have no reason to know.
    ap.add_argument("--port", type=int, default=8786)
    # Optional: the server accepts ABAP_HTTP_TOKEN, so the same variable that
    # started it answers here. --token stays for a session started elsewhere.
    ap.add_argument("--token", default=os.environ.get("ABAP_HTTP_TOKEN", ""))
    args = ap.parse_args()

    if not args.token:
        sys.exit("[FAIL] no token. Either export ABAP_HTTP_TOKEN (the same value "
                 "the MCP server was started with) or pass --token.")

    plan_path = Path(args.plan).resolve()
    base = plan_path.parent
    plan = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
    target = plan.get("target") or {}
    default_via = (plan.get("defaults") or {}).get("via", "adt")

    log("=" * 66)
    log("RECONCILE  %s" % plan_path.name)
    log("=" * 66)

    s = Session(args.port, args.token)
    try:
        h = s.health()
    except Exception as e:
        sys.exit("[FAIL] no MCP session on port %d (%s)." % (args.port, str(e)[:120]))
    log("  session  %d tools" % h.get("tool_count", 0))

    # Same landscape guard as the deploy. Reconciling against the wrong system
    # would produce a report that is confidently, completely wrong.
    logon = s.call("adt_logon")
    connected = str(logon.get("url") or logon.get("sap_url") or "").rstrip("/")
    expected = str(target.get("system") or "").rstrip("/")
    if expected and connected and expected != connected:
        sys.exit("[FAIL] wrong system.\n  plan targets : %s\n  connected to : %s"
                 % (expected, connected))
    log("  target   %s" % (connected or "(unreported)"))

    # One call for the whole system beats one call per object, and inactivity is
    # the failure most likely to be mistaken for success: the object is there, it
    # reads back correctly, and it does not run.
    inactive = set()
    res = s.call("adt_inactive_objects")
    for row in (res.get("objects") or res.get("inactive") or []) if isinstance(res, dict) else []:
        n = (row.get("name") if isinstance(row, dict) else str(row)) or ""
        if n:
            inactive.add(n.upper())
    log("  inactive objects on the system: %d" % len(inactive))
    log()

    ok_rows, gaps, deferred, present_only, excluded = [], [], [], [], []

    for o in plan.get("objects") or []:
        name = str(o.get("to") or "").upper()
        code = o["type"]
        via = o.get("via") or default_via

        if not name or name == "-" or via == "skip":
            continue
        if via in ("request", "manual"):
            deferred.append([name, code, via, o.get("note", "")])
            continue

        # Deselected AND not on the target = deliberately left out of this delivery
        # (unreadable at the source, superseded, a human unticked it). Absence is
        # the intended outcome, so it is recorded, not raised. Deselected because
        # it was ALREADY on the target is a different thing entirely -- that one
        # still has to be there, and stays in the checks below.
        if not o.get("select") and not o.get("exists_on_target"):
            excluded.append([name, code, o.get("note", "") or "not selected"])
            continue

        # --- service binding: existence is not delivery -----------------------
        if code == "SRVB":
            # srvb:published is an attribute on the binding itself, so this is a
            # plain read. Nothing in reconcile may write -- a stage whose job is to
            # report the truth must not be able to change it, and calling publish
            # here would turn "is it published?" into "publish it".
            res = s.call("adt_service_binding_status", name=name)
            if not (isinstance(res, dict) and res.get("ok")):
                gaps.append([name, code, "UNREADABLE",
                             "binding could not be read, so publish state is "
                             "unknown - check it by hand"])
                continue
            if res.get("published"):
                ok_rows.append([name, code, "published"])
            else:
                gaps.append([name, code, "NOT PUBLISHED",
                             "the object exists; the OData service does not"])
            continue

        # XML-bearing types have no source to fetch, so asking for one reports a
        # healthy object as MISSING -- which is worse than not checking, because it
        # buries the real gaps in false ones. They are verified by existence and
        # activation instead: there is nothing textual to compare, and "it is there
        # and it is active" is the whole of what can honestly be claimed.
        # A function group has no comparable source of its own -- its content is
        # the function modules and includes underneath it, and the "source" ADT
        # returns is a generated main program. Comparing it to what was sent
        # reported a healthy container as DRIFT (903 chars vs 1290).
        if code in XML_EXT or code == "FUGR":
            hits = s.call("adt_search", query=name, max_results=10)
            rows = (hits.get("objects") or hits.get("results") or []) if isinstance(hits, dict) else []
            found = any((r.get("name") or "").upper() == name
                        for r in rows if isinstance(r, dict))
            if not found:
                gaps.append([name, code, "MISSING", "not found on the target"])
            elif name in inactive:
                gaps.append([name, code, "INACTIVE",
                             "on the system but not activated"])
            elif code == "MSAG" and (o.get("opts") or {}).get("messages"):
                # Presence is NOT delivery for a message class either. Its texts
                # are the payload, and they arrive through a separate write that
                # can fail on its own (a stale edit lock will do it). Claiming
                # "verified" for an empty class is the exact silent half-delivery
                # this stage exists to catch -- so it gets its own verdict rather
                # than a pass, until there is a read-only way to count the texts.
                present_only.append([name, code,
                                     "present and active - %d message(s) NOT verified"
                                     % len((o["opts"]["messages"]))])
            else:
                ok_rows.append([name, code, "present and active (no source to compare)"])
            continue

        live, err = fetch_source(s, name, code)
        if not live:
            gaps.append([name, code, "MISSING", err or "not found on the target"])
            continue

        if name in inactive:
            gaps.append([name, code, "INACTIVE",
                         "source is on the system but not activated"])
            continue

        ext = ".xml" if code in XML_EXT else ".src"
        sent = base / "out" / code / (name + ext)
        if not sent.is_file():
            # No transformed payload: the object was not part of this transfer's
            # output (already on the target, deselected). Present and active is all
            # that can honestly be claimed.
            present_only.append([name, code, "present (not compared)"])
            continue

        if norm(live) == norm(sent.read_text(encoding="utf-8")):
            ok_rows.append([name, code, "matches what was sent"])
        else:
            gaps.append([name, code, "DRIFT",
                         "on the target but not what this transfer sent "
                         "(%d vs %d chars)" % (len(live), len(sent.read_text(encoding='utf-8')))])

    # --- report ---------------------------------------------------------------
    def table(rows, head):
        out = ["| " + " | ".join(head) + " |",
               "|" + "|".join(["---"] * len(head)) + "|"]
        out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
        return out

    reports = base / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    md = ["# Reconciliation - plan vs the target system", "",
          "Read from **%s**, not from the run files. A run records what the deploy"
          % (connected or "the target"),
          "believed; this is what the system actually holds.", "",
          "| | |", "|---|---|",
          "| verified | %d |" % len(ok_rows),
          "| gaps | %d |" % len(gaps),
          "| present, not compared | %d |" % len(present_only),
          "| deferred to another method | %d |" % len(deferred),
          "| deliberately excluded | %d |" % len(excluded), ""]

    md += ["## Gaps", ""]
    md += (table(gaps, ["object", "type", "verdict", "detail"]) if gaps
           else ["_None. Everything the plan promised is on the target and healthy._"])
    md += ["", "## Deferred - not this tool's to deliver", "",
           "Routed to another method in the plan. They are not failures and they are",
           "not done either; nothing here has been checked on the target.", ""]
    md += (table(deferred, ["object", "type", "via", "note"]) if deferred
           else ["_None._"])
    md += ["", "## Present but not compared", "",
           "On the target and active, but this transfer produced no payload for them",
           "(already there, deselected). Presence is all that is claimed.", ""]
    md += (table(present_only, ["object", "type", "verdict"]) if present_only
           else ["_None._"])
    md += ["", "## Deliberately excluded", "",
           "Deselected in the plan and not on the target. Absence is the intended",
           "outcome here -- these are recorded so the inventory stays complete, not",
           "because anything is wrong.", ""]
    md += (table(excluded, ["object", "type", "reason"]) if excluded else ["_None._"])
    md += ["", "## Verified", ""]
    md += (table(ok_rows, ["object", "type", "verdict"]) if ok_rows else ["_None._"])
    (reports / "reconcile.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    for r in gaps:
        log("  %-28s %-6s %s" % (r[0], r[1], r[2]))
    log()
    log("  verified %d | gaps %d | present-not-compared %d | deferred %d | "
        "excluded %d" % (len(ok_rows), len(gaps), len(present_only),
                         len(deferred), len(excluded)))
    log("  report   %s" % (reports / "reconcile.md"))
    sys.exit(1 if gaps else 0)


if __name__ == "__main__":
    main()
