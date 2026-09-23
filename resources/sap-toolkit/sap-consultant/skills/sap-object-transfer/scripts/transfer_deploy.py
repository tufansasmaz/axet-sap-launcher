#!/usr/bin/env python3
"""Deploy a transformed plan onto the target system, and record what happened.

Stage 3 of a cross-system object transfer. Every SAP write goes through the
PERSISTENT MCP session over its local HTTP transport -- never a one-shot script.
That is the house rule, and a transfer is exactly the workload it protects: dozens
of writes in a row is where stranded locks and ghost transports come from.

Start the session first (target .conn_adt in ADT_CWD):

    ADT_CWD="$PWD" ABAP_HTTP_TOKEN=<token> \\
      py plugins/sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py --http --port 8786

Then:

    py transfer_deploy.py --plan .transfer/zrea/plan.yaml --port 8786 \\
       --token <token> [--only ZKIB_GDP_LOG,ZKIB_GDP_LOG_RPT] [--dry-run]

Writes runs/<UTC>.yaml next to the plan. Exit 0 = every attempted object landed.
Exit 1 = at least one failed (the run file names which and at which step).
ASCII output only (cp1252 console).
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
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

# Types whose definition IS its text and whose generic create path does not exist:
# make an empty shell, then let the push carry the real definition. Everything
# else is created directly by adt_create.
SHELL_FIRST = {"TABL", "STRU", "BDEF", "SRVD", "DDLS"}

try:
    import yaml
except ImportError:
    sys.exit("[FAIL] PyYAML is required:  py -m pip install pyyaml")


class Session:
    """The persistent MCP session, over its documented local HTTP transport."""

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
            with urllib.request.urlopen(req, timeout=600) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return {"ok": False, "error": "HTTP %s" % e.code,
                    "detail": e.read().decode("utf-8", "replace")[:400]}
        except Exception as e:
            return {"ok": False, "error": str(e)[:300]}

    def health(self) -> dict:
        req = urllib.request.Request(self.base + "/health",
                                     headers={"Authorization": "Bearer " + self.token})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))


def log(m: str = "") -> None:
    print(m, flush=True)


def describe(text: str, fallback: str) -> str:
    """A description for adt_create. SAP requires one; the source usually has it."""
    for marker in ("@EndUserText.label", "@EndUserText.label :"):
        for line in text.splitlines()[:12]:
            if marker in line and "'" in line:
                got = line.split("'")[1].strip()
                if got:
                    return got[:60]
    return fallback[:60]


def is_bare_shell(session, name: str, kit_type: str) -> bool:
    """Is the object on the target still SAP's freshly generated empty shell?

    A shell created by adt_create_ddic_shell has exactly one field, and it is the
    generated client placeholder:

        define table zkib_gdp_log {
          key client : abap.clnt not null;
        }

    Nothing hand-written looks like that -- a real customer table names its client
    column `mandt` and has other fields. So this is a safe, re-checkable signal
    that there is no data behind the field the pre-push guard is protecting.

    Anything unreadable or unexpected answers False. Refusing to ack costs a
    blocked push and a human decision; acking wrongly costs a dropped column.
    """
    try:
        res = session.call("adt_get_source", name=name, object_type=kit_type)
    except Exception:
        return False
    src = ""
    if isinstance(res, dict):
        src = res.get("source") or res.get("content") or ""
    if not src or "{" not in src:
        return False
    body = src[src.index("{") + 1:src.rindex("}")] if "}" in src else ""
    fields = [ln.strip() for ln in body.splitlines()
              if ln.strip() and ":" in ln and not ln.strip().startswith("//")]
    return (len(fields) == 1
            and re.match(r"^key\s+client\s*:\s*abap\.clnt\b", fields[0], re.I) is not None)


def ok(res: dict) -> bool:
    """The tools return {ok: ...} or a bare result; treat an absent flag as fine."""
    if not isinstance(res, dict):
        return True
    if "ok" in res:
        return bool(res["ok"])
    return "error" not in res and "error_type" not in res


def why(res: dict) -> str:
    """Everything a human needs to act, in one string.

    The `log` tail is included deliberately. An earlier version reported only the
    short error code ("create_shell_failed") and the engine's own log -- which
    named the actual HTTP status and SAP message -- was discarded. The failure was
    then unreproducible from the run file, which is the one artifact that is
    supposed to survive. A run record that drops the diagnostic is not a record.
    """
    if not isinstance(res, dict):
        return ""
    # Generous caps on purpose. The terminal line slices this down to ~70 chars;
    # the run FILE keeps all of it, and a file has no reason to be terse. The
    # engine's log is where the HTTP status and the SAP message live.
    parts = []
    for k in ("error", "error_type", "hint", "detail"):
        if res.get(k):
            parts.append("%s=%s" % (k, str(res[k])[:300]))
    for k in ("message", "log"):
        if res.get(k):
            parts.append("%s=%s" % (k, str(res[k])[-2000:]))
    return " | ".join(parts) if parts else json.dumps(res)[:500]


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
    ap.add_argument("--only", default="", help="comma-separated TARGET names (thin slice)")
    ap.add_argument("--dry-run", action="store_true",
                    help="resolve and print the sequence; call no write tool")
    args = ap.parse_args()

    if not args.token:
        sys.exit("[FAIL] no token. Either export ABAP_HTTP_TOKEN (the same value "
                 "the MCP server was started with) or pass --token.")

    plan_path = Path(args.plan).resolve()
    base = plan_path.parent
    plan = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
    target = plan.get("target") or {}
    only = {n.strip().upper() for n in args.only.split(",") if n.strip()}

    log("=" * 66)
    log("DEPLOY  %s" % plan_path.name)
    log("=" * 66)

    s = Session(args.port, args.token)
    try:
        h = s.health()
    except Exception as e:
        sys.exit("[FAIL] no MCP session on port %d (%s). Start it first -- see the "
                 "module docstring." % (args.port, str(e)[:120]))
    log("  session  %d tools, auth=%s" % (h.get("tool_count", 0), h.get("auth")))

    # --- landscape guard -----------------------------------------------------
    # The plan RECORDS which system it was built against. Re-checking it here is
    # the whole reason that field exists: a plan aimed at one system, executed
    # against another, is the failure this project already met once (the engine's
    # connection switch silently kept the previous system's credentials).
    logon = s.call("adt_logon")
    connected = str(logon.get("url") or logon.get("sap_url") or "").rstrip("/")
    expected = str(target.get("system") or "").rstrip("/")
    if expected and connected and expected != connected:
        sys.exit("[FAIL] wrong system.\n  plan targets : %s\n  connected to : %s\n"
                 "  Nothing was written." % (expected, connected))
    log("  target   %s%s" % (connected or "(unreported)",
                             "  [matches the plan]" if expected and connected else ""))

    transport = target.get("transport") or ""
    package = target.get("package") or ""
    if not transport or not package:
        sys.exit("[FAIL] plan has no target transport/package. Both are a human's "
                 "decision (Critical Rule 2) -- fill them in and re-run.")

    objs = [o for o in (plan.get("objects") or [])
            if o.get("select") and (o.get("via") or plan.get("defaults", {}).get("via")) == "adt"]
    if only:
        objs = [o for o in objs if str(o["to"]).upper() in only]
    objs.sort(key=lambda o: o.get("order", 50))
    if not objs:
        sys.exit("[FAIL] nothing selected to deploy (check --only spelling).")

    log("  package  %s   transport %s" % (package, transport))
    log("  objects  %d" % len(objs))
    log()

    results, failed, to_publish, to_write_fms = [], 0, [], []
    if args.dry_run:
        for o in objs:
            kt = kit_type_for(o["type"])
            log("  %-5s %-5s %-28s  kit_type=%s%s"
                % (o.get("order"), o["type"], o["to"], kt,
                   "   [NO CREATE PATH]" if not kt else ""))
        log()
        log("  dry run - no write tool was called.")
        return

    pin = s.call("adt_set_transport", transport=transport)
    log("  pinned   %s  %s" % (transport, "ok" if ok(pin) else "FAILED: " + why(pin)))
    log()

    for o in objs:
        name, code = str(o["to"]).upper(), o["type"]
        kit_type = kit_type_for(code)
        row = {"to": name, "type": code}
        opts = o.get("opts") or {}

        # --- message class: create the shell, then write the texts -------------
        # Two steps because SAP silently DROPS messages passed to the create. The
        # texts come from the plan, read off the source at extract time.
        if code == "MSAG":
            res = s.call("adt_message_class", name=name, action="create",
                         description=describe("", "Migrated from %s" % o["from"]),
                         package=package, transport=transport)
            if not ok(res) and "exist" not in why(res).lower():
                row.update(status="error", step="create", message=why(res))
                results.append(row); failed += 1
                log("  %-28s FAIL  create: %s" % (name, why(res)[:70]))
                continue
            msgs = opts.get("messages") or []
            if msgs:
                res = s.call("adt_message_class", name=name, action="write",
                             messages=msgs, transport=transport)
                if not ok(res):
                    # The ADT REST layer for message classes has a known
                    # ETag/enqueue defect: it mistakes its OWN lock for someone
                    # else's, so a class this run created seconds ago answers
                    # "user X is currently editing". Measured on NS4 2026-08-11
                    # against a brand-new object, from a fresh process, after a
                    # server restart and an explicit stateless request -- and
                    # documented as a self-collision in the NTT ARC-1 playbook.
                    #
                    # There is nothing to retry. Retrying is the trap: it burns
                    # time and leaves more locks. Name the object and the remedy.
                    detail = why(res)
                    if "currently editing" in detail:
                        row.update(status="error", step="write",
                                   message="ADT self-collision on the message-class "
                                           "lock. The texts did NOT land. Clear the "
                                           "lock for %s in SM12 (or open and close it "
                                           "in SE91), then re-run -- do not retry in "
                                           "a loop. | %s" % (name, detail))
                        log("  %-28s FAIL  message-class lock (SM12 needed for %s)"
                            % (name, name))
                    else:
                        row.update(status="error", step="write", message=detail)
                        log("  %-28s FAIL  write texts: %s" % (name, detail[:70]))
                    results.append(row); failed += 1
                    continue
            row.update(status="success", step="write")
            results.append(row)
            log("  %-28s ok    created + %d message(s)" % (name, len(msgs)))
            continue

        # --- function group: a container, created before anything it holds -----
        if code == "FUGR":
            res = s.call("adt_create_function_group", name=name, package=package,
                         description=describe("", "Migrated from %s" % o["from"]),
                         transport=transport)
            if not ok(res):
                row.update(status="error", step="create", message=why(res))
                results.append(row); failed += 1
                log("  %-28s FAIL  create: %s" % (name, why(res)[:70]))
                continue
            row.update(status="success", step="create")
            results.append(row)
            log("  %-28s ok    function group created" % name)

            # The modules come with the group -- they are not plan rows and there
            # is nothing else that would carry them. They are WRITTEN LATER: a
            # module body is ordinary ABAP and may call a CDS view, a class or a
            # table that deploys after its group (measured: the group is tier 8,
            # the views it selects from are tier 10, so writing the module here
            # fails activation every time). Queued for an end-of-run pass, the
            # same shape as the publish gate.
            for fm in (opts.get("function_modules") or []):
                to_write_fms.append((name, fm))
            continue

        if False:  # pragma: no cover - superseded by the end-of-run FM pass
            for fm in ():
                fm_to = str(fm.get("to", "")).upper()
                fsrc = base / "out" / "FUNC" / (fm_to + ".src")
                frow = {"to": fm_to, "type": "FUNC"}
                if not fsrc.is_file():
                    frow.update(status="error", step="read",
                                message="transformed module source missing at %s"
                                        % fsrc.name)
                    results.append(frow); failed += 1
                    log("    %-26s FAIL  module source missing" % fm_to)
                    continue
                fres = s.call("adt_write_function_module", name=fm_to,
                              function_group=name, source_file=str(fsrc),
                              description="Migrated from %s" % fm.get("from", ""),
                              transport=transport)
                if ok(fres):
                    frow.update(status="success", step="activate")
                    log("    %-26s ok    module created + source pushed" % fm_to)
                else:
                    frow.update(status="error", step="write", message=why(fres))
                    failed += 1
                    log("    %-26s FAIL  %s" % (fm_to, why(fres)[:60]))
                results.append(frow)
            continue

        # --- parameter-built DDIC: the object IS its metadata ------------------
        # No source to push, and adt_create answers "Unsupported object type" for
        # all three. The parameters were read off the source object at extract
        # time and carried in the plan, so nothing is guessed here.
        if code in ("DOMA", "DTEL", "TTYP"):
            spec = {
                "DOMA": ("adt_create_domain",
                         lambda: {"datatype": opts.get("datatype", "CHAR"),
                                  "length": int(opts.get("length") or 10),
                                  "decimals": int(opts.get("decimals") or 0),
                                  "output_length": int(opts.get("output_length") or 0),
                                  "lowercase": str(opts.get("lowercase", "")).lower() == "true"}),
                "DTEL": ("adt_create_data_element",
                         lambda: {"domain_name": opts.get("domain", ""),
                                  "short_label": opts.get("short_label", ""),
                                  "medium_label": opts.get("medium_label", ""),
                                  "long_label": opts.get("long_label", ""),
                                  "heading_label": opts.get("heading_label", "")}),
                "TTYP": ("adt_create_table_type",
                         lambda: {"row_type": opts.get("row_type", ""),
                                  "access_type": opts.get("access_type", "standard"),
                                  "key_kind": opts.get("key_kind", "nonUnique")}),
            }[code]
            tool, params = spec[0], spec[1]()
            missing = [k for k in ("domain_name", "row_type") if k in params and not params[k]]
            if missing:
                row.update(status="error", step="create",
                           message="plan is missing %s for this %s - re-run extract"
                                   % (", ".join(missing), code))
                results.append(row); failed += 1
                log("  %-28s FAIL  plan missing %s" % (name, ", ".join(missing)))
                continue
            res = s.call(tool, name=name, package=package,
                         description=describe("", "Migrated from %s" % o["from"]),
                         transport=transport, **params)
            if not ok(res) and "exist" not in why(res).lower():
                row.update(status="error", step="create", message=why(res))
                results.append(row); failed += 1
                log("  %-28s FAIL  create: %s" % (name, why(res)[:70]))
                continue
            act = s.call("adt_activate", name=name, object_type=kit_type)
            row.update(status="success" if ok(act) else "error",
                       step="activate", **({} if ok(act) else {"message": why(act)}))
            if not ok(act):
                failed += 1
                log("  %-28s FAIL  activate: %s" % (name, why(act)[:60]))
            else:
                log("  %-28s ok    created + activated" % name)
            results.append(row)
            continue

        # --- service binding: create from the SOURCE's own triple --------------
        # Publishing is NOT done here. It is a gate at the end of the run, because
        # "Service Definition ... not yet active" is the normal answer while the
        # rest of the RAP stack is still activating.
        if code == "SRVB":
            binding = opts.get("binding") or {}
            sd = opts.get("service_definition") or ""
            if not sd:
                row.update(status="error", step="create",
                           message="plan carries no service_definition for this "
                                   "binding; re-run extract or fill it in")
                results.append(row); failed += 1
                log("  %-28s FAIL  no service_definition in the plan" % name)
                continue
            res = s.call("adt_create_service_binding", name=name, package=package,
                         description=describe("", "Migrated from %s" % o["from"]),
                         service_definition=sd,
                         binding_version=binding.get("version", "V4"),
                         binding_category=binding.get("category", "0"),
                         contract=binding.get("contract", ""),
                         transport=transport)
            if not ok(res):
                row.update(status="error", step="create", message=why(res))
                results.append(row); failed += 1
                log("  %-28s FAIL  create: %s" % (name, why(res)[:70]))
                continue
            # Activation is not optional and not implied by create: the publish job
            # answers "Service Binding ... does not exist" for an inactive binding
            # that is plainly there. Measured on NS4 2026-08-11.
            act = s.call("adt_activate", name=name, object_type="servicebinding")
            if not ok(act):
                row.update(status="error", step="activate", message=why(act))
                results.append(row); failed += 1
                log("  %-28s FAIL  activate: %s" % (name, why(act)[:70]))
                continue
            row.update(status="success", step="activate")
            results.append(row)
            to_publish.append((name, binding.get("version", "V4")))
            log("  %-28s ok    binding created + activated -> %s (publish pending)"
                % (name, sd))
            continue

        if not kit_type:
            row.update(status="skipped", step="create",
                       reason="no create path in the engine for %s yet" % code)
            results.append(row)
            log("  %-28s SKIP  no engine create path for %s" % (name, code))
            continue

        src = base / "out" / code / (name + (".xml" if code in ("DOMA", "DTEL", "TTYP",
                                                               "MSAG", "SRVB") else ".src"))
        if not src.is_file():
            row.update(status="error", step="read",
                       message="transformed payload missing at %s" % src.name)
            results.append(row)
            failed += 1
            log("  %-28s FAIL  transformed payload missing" % name)
            continue

        text = src.read_text(encoding="utf-8")
        desc = describe(text, "Migrated from %s" % o["from"])

        # Tables and structures are "blue source" objects on a modern S/4 system:
        # the definition is DDL text, so they need an empty SHELL first and the real
        # definition arrives with the push. adt_create cannot make one -- it answers
        # "Unsupported object type: TABL/DT", because its table path builds an
        # object from a field list rather than reproducing one from its own source.
        if code in SHELL_FIRST:
            res = s.call("adt_create_ddic_shell", name=name, object_type=kit_type,
                         package=package, description=desc, transport=transport)
        else:
            res = s.call("adt_create", object_type=kit_type, name=name, package=package,
                         description=desc, transport=transport)
        created = ok(res) or "exist" in why(res).lower()
        if not created:
            row.update(status="error", step="create", message=why(res))
            results.append(row)
            failed += 1
            log("  %-28s FAIL  create: %s" % (name, why(res)[:70]))
            continue

        # adt_push is atomic: lock -> PUT -> activate -> unlock, inside this one
        # session. That atomicity is why the write goes through MCP at all.
        res = s.call("adt_push", name=name, object_type=kit_type,
                     source_file=str(src), transport=transport)

        # The pre-push guard refuses to drop fields, and it is right to: dropping a
        # column destroys its data. It fires here for a reason that is not data
        # loss at all -- a table shell is born holding SAP's generated placeholder,
        # and the real definition replaces it:
        #
        #     define table zkib_gdp_log { key client : abap.clnt not null; }
        #
        # The ack is therefore allowed only against exactly that shape, checked on
        # the TARGET at this moment. An earlier version keyed off "did this run
        # create it", which broke on the case that matters most: a first attempt
        # that fails leaves a shell behind, and every retry then reads as
        # pre-existing and can never proceed. State is re-checkable; history is not.
        if not ok(res):
            dropped = re.search(r"fields DROPPED:\s*([^.]+)\.", why(res))
            if dropped and is_bare_shell(s, name, kit_type):
                fields = ",".join(f.strip() for f in dropped.group(1).split(","))
                log("  %-28s ..  target is an empty shell; acking the generated "
                    "placeholder (%s)" % (name, fields))
                res = s.call("adt_push", name=name, object_type=kit_type,
                             source_file=str(src), transport=transport,
                             ack_drop=fields)

        if not ok(res):
            row.update(status="error", step="push", message=why(res))
            results.append(row)
            failed += 1
            log("  %-28s FAIL  push: %s" % (name, why(res)[:70]))
            continue

        row.update(status="success", step="activate")
        results.append(row)
        log("  %-28s ok    created + pushed + activated" % name)

    # --- function-module pass --------------------------------------------------
    # After everything else, for the reason above: a module body can reference any
    # object in the transfer, and its group is created early.
    if to_write_fms:
        log()
        log("  function modules (%d)" % len(to_write_fms))
        for group, fm in to_write_fms:
            fm_to = str(fm.get("to", "")).upper()
            fsrc = base / "out" / "FUNC" / (fm_to + ".src")
            frow = {"to": fm_to, "type": "FUNC"}
            if not fsrc.is_file():
                frow.update(status="error", step="read",
                            message="transformed module source missing at %s" % fsrc.name)
                results.append(frow); failed += 1
                log("  %-28s FAIL  module source missing" % fm_to)
                continue
            fres = s.call("adt_write_function_module", name=fm_to,
                                  function_group=group, source_file=str(fsrc),
                                  description="Migrated from %s" % fm.get("from", ""),
                                  transport=transport)
            if ok(fres):
                frow.update(status="success", step="activate")
                log("  %-28s ok    module created + source pushed" % fm_to)
            else:
                frow.update(status="error", step="write", message=why(fres))
                failed += 1
                log("  %-28s FAIL  %s" % (fm_to, why(fres)[:60]))
            results.append(frow)

    # --- publish gate ---------------------------------------------------------
    # Last, and separately. A binding that activates but is never published looks
    # complete in every object list while its OData service does not exist -- found
    # live on this very system. `verified_published` is read back off the object,
    # so the run records the fact rather than the claim.
    if to_publish:
        log()
        log("  publish gate (%d binding(s))" % len(to_publish))
        for bname, bver in to_publish:
            res = s.call("adt_publish_service_binding", name=bname,
                         odata_version=bver)
            verified = res.get("verified_published") if isinstance(res, dict) else None
            row = {"to": bname, "type": "SRVB", "step": "publish"}
            if verified is True:
                row["status"] = "success"
                log("  %-28s ok    published (verified on the object)" % bname)
            else:
                row["status"] = "error"
                row["message"] = why(res) + " | verified_published=%s" % verified
                failed += 1
                log("  %-28s FAIL  publish: %s"
                    % (bname, (res.get("short_text") or why(res))[:60]))
            results.append(row)

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    runs = base / "runs"
    runs.mkdir(parents=True, exist_ok=True)
    run_file = runs / (stamp + ".yaml")
    plan_sha = hashlib.sha256(plan_path.read_bytes()).hexdigest()
    lines = [
        "# Written by transfer_deploy.py. OUTCOME, not intent -- the plan is never",
        "# rewritten by a run.",
        "version: 1",
        "",
        "run:",
        "  plan: %s" % plan_path.name,
        "  plan_sha: %s" % plan_sha,
        "  finished: %s" % stamp,
        "",
        "target: {system: \"%s\", package: %s, transport: %s}"
        % (connected, package, transport),
        "",
        "results:",
    ]
    for r in results:
        # Block style, and the message as a literal block scalar. Flow style
        # collapsed multi-line engine logs into an unreadable single line and then
        # truncated them -- losing exactly the detail a failed run exists to keep.
        lines.append("  - to: %s" % r["to"])
        lines.append("    type: %s" % r["type"])
        lines.append("    status: %s" % r["status"])
        if r.get("step"):
            lines.append("    step: %s" % r["step"])
        if r.get("reason"):
            lines.append("    reason: \"%s\"" % str(r["reason"]).replace('"', "'"))
        if r.get("message"):
            lines.append("    message: |")
            for ml in str(r["message"]).splitlines() or [""]:
                lines.append("      " + ml.rstrip())
    lines += ["", "summary:",
              "  attempted: %d" % len(results),
              "  success: %d" % sum(1 for r in results if r["status"] == "success"),
              "  error: %d" % sum(1 for r in results if r["status"] == "error"),
              "  skipped: %d" % sum(1 for r in results if r["status"] == "skipped"), ""]
    run_file.write_text("\n".join(lines), encoding="utf-8")

    log()
    log("  run      %s" % run_file)
    log("  NEXT: reconcile against the target - a run that claims success is")
    log("        evidence, not proof.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
