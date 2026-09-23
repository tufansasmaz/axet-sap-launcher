#!/usr/bin/env python3
"""Read a package off the SOURCE system and write a transfer plan.

Stage 1 of a cross-system object transfer. Read-only against SAP: it lists a
package, reads each object's payload to discover which other customer objects it
references, orders the result by deploy tier and dependency, proposes target
names from a prefix rule, and writes plan.yaml for a human to review.

It proposes. It never transfers anything.

    py transfer_extract.py --source .transfer/source --package ZREA_DENEME \\
       --to-package ZCMTEST --prefix-from ZREA_ --prefix-to ZKIB_ \\
       --transport NS4K900135 --out .transfer/zrea/plan.yaml
    # optional: --target . also probes which names already exist on the target

Exit 0 = a plan was written. ASCII output only (cp1252 console).
"""
from __future__ import annotations

import argparse
import contextlib
import io
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

_HERE = Path(__file__).resolve().parent
# The ADT engine lives in the sap-adt skill, two levels over. Same plugin, so the
# two always ship and version together -- the reason this skill sits inside
# sap-consultant rather than in a plugin of its own.
_ENGINE = _HERE.parents[1] / "sap-adt" / "scripts"
if not _ENGINE.is_dir():
    sys.exit("[FAIL] ADT engine not found at %s" % _ENGINE)
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_ENGINE))

from transfer_types import (GENERATED_TADIR, NOT_VIA_ADT,  # noqa: E402
                            SOURCE_BEARING, TADIR_TYPE_MAP, code_for,
                            object_uri, order_of)

# A customer object name. Deliberately loose: this feeds a PROPOSAL that a human
# reviews, so a false positive costs a glance and a false negative costs a missing
# dependency. Three chars minimum keeps bare "Z" noise out.
ZREF = re.compile(r"\b[ZY][A-Z0-9_]{2,29}\b")

# SAP truncates over-long names rather than refusing them, which is how a wrong
# object name reaches a system without anyone typing it. The plan FLAGS instead of
# truncating: a silently shortened name is exactly the kind of thing nobody
# notices until the object is already in a transport.
# Per-type name limits. TABL really is 16 -- a transparent table name cannot be
# longer -- but a STRUCTURE may be 30, and treating them alike flagged healthy
# names as too long (the source itself carries a 29-character structure).
MAX_LEN = {"TABL": 16, "MSAG": 20}
MAX_LEN_DEFAULT = 30


def log(msg: str = "") -> None:
    print(msg, flush=True)


@contextlib.contextmanager
def quiet():
    """Swallow the engine's own console output.

    list_package_contents() and search_objects() print a formatted report each
    time they run -- fine when a human called one of them, unreadable when this
    script calls search 29 times in a row. Only stdout is captured; anything the
    engine raises still surfaces.
    """
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        yield buf


def connect(conn_dir: str):
    """One SAPClient for one system. Call again after switching directories."""
    import sap_adt_lib as L
    L.set_explicit_working_dir(str(Path(conn_dir).resolve()))
    from sap_client import SAPClient
    c = SAPClient()
    return c, L.ADT_SAP_URL, L.ADT_SAP_CLIENT


def read_payload(client, code: str, name: str, listing_uri: str = "") -> str:
    """Object payload as text. Source for source-bearing types, XML otherwise.

    The URI is BUILT from the type, not taken from the package listing: the
    listing hands back search uris that do not serve content, and an empty read
    is indistinguishable from an object with no dependencies. The listing uri is
    kept as a last resort so an unmapped type degrades to 'try something'.

    Both source/main and the bare path are tried in either order, because the
    source/XML split is a rule of thumb and a type that answers the other way
    should still be read.
    """
    adt = client.adt_client
    base = object_uri(code, name)
    candidates = []
    if base:
        candidates = ([base + "/source/main", base] if code in SOURCE_BEARING
                      else [base, base + "/source/main"])
    if listing_uri:
        candidates += [listing_uri + "/source/main", listing_uri]
    for p in candidates:
        try:
            r = adt.session.get(adt.url + p, timeout=90)
            if r.status_code == 200 and r.text:
                return r.text
        except Exception:
            continue
    return ""


def raw_opts(code: str, text: str) -> dict:
    """Type-specific facts read off the SOURCE object, before name mapping.

    Collected here rather than at deploy time because this is where the source
    system is connected. A deploy that had to reach back across systems for a
    binding's OData version would need both connections live at once, which is
    exactly the shape this design avoids.
    """
    if not text:
        return {}
    if code == "SRVB":
        out = {}
        b = re.search(r'<srvb:binding\s([^>]*)>', text)
        if b:
            attrs = b.group(1)
            for key, attr in (("version", "srvb:version"),
                              ("category", "srvb:category"),
                              ("type", "srvb:type")):
                m = re.search(r'%s="([^"]*)"' % re.escape(attr), attrs)
                if m:
                    out.setdefault("binding", {})[key] = m.group(1)
        # contract sits on the ROOT element, and only on systems that store it.
        c = re.search(r'<srvb:serviceBinding[^>]*\ssrvb:contract="([^"]*)"', text)
        if c:
            out.setdefault("binding", {})["contract"] = c.group(1)
        sd = re.search(r'<srvb:serviceDefinition[^>]*adtcore:name="([^"]*)"', text)
        if sd:
            out["_service_definition_src"] = sd.group(1).upper()
        return out
    # DOMA / DTEL / TTYP are not source-bearing: the object IS its XML, and it is
    # created from PARAMETERS. Element names read off live objects (NR4,
    # 2026-08-11) rather than assumed -- `doma:datatype` is lower-case d,
    # `doma:length` occurs twice (type information first, then output), and a data
    # element's domain lives in `dtel:typeName`, not in anything called "domain".
    if code == "DOMA":
        def one(tag):
            m = re.search(r"<doma:%s>([^<]*)</doma:%s>" % (tag, tag), text)
            return m.group(1).strip() if m else ""
        # <doma:length> occurs TWICE -- type information first, then output
        # information -- so the output width has to be read from inside its own
        # block. Copying it matters: it is the screen width, and a domain whose
        # owner widened it by hand comes back truncating values if it is derived
        # instead of carried.
        oi = re.search(r"<doma:outputInformation>(.*?)</doma:outputInformation>",
                       text, re.S)
        out_len = ""
        if oi:
            m = re.search(r"<doma:length>([^<]*)</doma:length>", oi.group(1))
            if m:
                out_len = str(int(m.group(1) or 0))
        out = {"datatype": one("datatype"),
               "length": str(int(one("length") or 0)),
               "decimals": str(int(one("decimals") or 0)),
               "output_length": out_len,
               "lowercase": one("lowercase") or "false"}
        return {k: v for k, v in out.items() if v != ""}
    if code == "DTEL":
        def one(tag):
            m = re.search(r"<dtel:%s>([^<]*)</dtel:%s>" % (tag, tag), text)
            return m.group(1).strip() if m else ""
        out = {"domain": one("typeName"), "type_kind": one("typeKind"),
               "short_label": one("shortFieldLabel"),
               "medium_label": one("mediumFieldLabel"),
               "long_label": one("longFieldLabel"),
               "heading_label": one("headingFieldLabel")}
        return {k: v for k, v in out.items() if v}
    if code == "TTYP":
        def one(tag):
            m = re.search(r"<ttyp:%s>([^<]*)</ttyp:%s>" % (tag, tag), text)
            return m.group(1).strip() if m else ""
        out = {"row_type": one("typeName"), "access_type": one("accessType") or "standard",
               "key_kind": one("kind") or "nonUnique"}
        return {k: v for k, v in out.items() if v}
    if code == "MSAG":
        msgs = re.findall(r'mc:msgno="(\d+)"\s+mc:msgtext="([^"]*)"', text)
        if msgs:
            return {"messages": [{"number": n, "text": t} for n, t in msgs]}
        # An empty message class is legitimate and must still travel: the shell
        # carries the namespace other objects raise messages into.
        return {"messages": []}
    return {}


def function_modules(client, group: str) -> list[str]:
    """Hand-written function modules in a group, from TFDIR.

    Function modules are NOT TADIR objects -- they are addressed under their
    group and never appear in a package listing, which is why they can never be
    plan rows of their own. The group carries them.

    Generated modules are excluded by the customer-namespace rule: SE54 table
    maintenance leaves TABLEFRAME_<grp> and TABLEPROC_<grp> in every maintained
    group, and those are regenerated on the target by SE54, not copied. They also
    fail the Z/Y guardrail, so carrying them would only produce noise.
    """
    q = ("SELECT FUNCNAME FROM TFDIR WHERE PNAME = 'SAPL%s'" % group.upper())
    try:
        with quiet():
            res = client.run_sql_query(q, max_rows=200)
    except Exception:
        return []
    out = []
    for row in (res or {}).get("data", []):
        fm = (row[0] or "").strip().upper()
        if fm and fm[:1] in ("Z", "Y"):
            out.append(fm)
    return sorted(out)


def read_fm_source(client, group: str, fm: str) -> str:
    adt = client.adt_client
    url = ("/sap/bc/adt/functions/groups/%s/fmodules/%s/source/main"
           % (group.lower(), fm.lower()))
    try:
        r = adt.session.get(adt.url + url, timeout=90)
        return r.text if r.status_code == 200 else ""
    except Exception:
        return ""


def resolve_tabl(client, name: str) -> str:
    """TADIR says TABL for a transparent table AND for a structure.

    They land in the same deploy tier but not the same write path, so guessing
    would silently create one as the other. Ask ADT which endpoint answers.
    """
    adt = client.adt_client
    for path, code in (("ddic/tables", "TABL"), ("ddic/structures", "STRU")):
        try:
            r = adt.session.get("%s/sap/bc/adt/%s/%s" % (adt.url, path, name.lower()),
                                timeout=60)
            if r.status_code == 200:
                return code
        except Exception:
            continue
    return "TABL"


def propose(name: str, pfrom: str, pto: str) -> tuple[str, str]:
    """Proposed target name + a note when the proposal needs a human decision."""
    up = name.upper()
    if not pfrom:
        return up, ""
    if not up.startswith(pfrom.upper()):
        return up, "does not match the source prefix - name kept, confirm this"
    return pto.upper() + up[len(pfrom):], ""


def topo_within_tier(items: list[dict]) -> list[dict]:
    """Depth-first order inside one tier, honouring `needs` edges.

    Cross-tier edges are ignored on purpose -- the tier numbers already express
    them. Only same-tier dependencies (STRU including STRU, CLAS using CLAS) need
    this. A cycle is broken rather than followed; the plan flags it for a human.
    """
    by_name = {i["from"].upper(): i for i in items}
    seen, stack, out = set(), set(), []

    def visit(o: dict) -> None:
        key = o["from"].upper()
        if key in seen or key in stack:
            return
        stack.add(key)
        for dep in o.get("needs", []):
            d = by_name.get(dep.upper())
            if d is not None:
                visit(d)
        stack.discard(key)
        seen.add(key)
        out.append(o)

    for o in items:
        visit(o)
    return out


def ensure_order(objs: list[dict]) -> list[dict]:
    """Give a deploy tier to any row that does not have one yet.

    The tier a row gets here is its ordinary type tier -- `order_of` returns 50
    for a type it does not know, which is what every untransferable type is, so
    they land last. That is the right place for them: they are not deployed at
    all, and burying an open item in the middle of the plan hides it.

    A function-group include would want its parent's tier, but `parent_fugr` is
    discovered inside the payload loop and a row that never entered the loop has
    no parent to inherit from. It is not a real case -- an INCL is read over ADT
    -- and 50 is the honest answer for a row nothing could classify.
    """
    for o in objs:
        o.setdefault("order", order_of(o["type"], o.get("parent_fugr")))
    return objs


def sort_plan(objs: list[dict]) -> list[dict]:
    tiers: dict[float, list[dict]] = {}
    for o in objs:
        tiers.setdefault(o["order"], []).append(o)
    result = []
    for tier in sorted(tiers):
        result.extend(topo_within_tier(tiers[tier]))
    return result


def yaml_str(s: str) -> str:
    """Quote only when YAML would otherwise mis-read it.

    Number- and boolean-looking values are quoted too. A service binding's
    category is the STRING "0"; unquoted, YAML hands back the integer 0 and it
    reaches SAP as a different value than the source object had.
    """
    if s == "" or re.search(r"[:#\-{}\[\],&*?|>'\"%@`]", s) or s.strip() != s:
        return '"%s"' % s.replace('"', '\\"')
    if re.fullmatch(r"[+-]?\d+(\.\d+)?|true|false|yes|no|on|off|null|~",
                    s, re.IGNORECASE):
        return '"%s"' % s
    return s


def write_plan(path: Path, meta: dict, objs: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    L = []
    L.append("# Generated by transfer_extract.py -- INTENT, not outcome.")
    L.append("# Review the names, deselect what should not travel, then run the")
    L.append("# transfer. Outcomes land in runs/<UTC>.yaml and never touch this file.")
    L.append("version: 1")
    L.append("")
    L.append("transfer:")
    L.append("  name: %s" % yaml_str(meta["name"]))
    L.append("  created: %s" % meta["created"])
    L.append("  reason: %s" % yaml_str(meta["reason"]))
    L.append("")
    L.append("# Pointers only -- credentials stay in .conn_adt. `system`/`client` are a")
    L.append("# RECORD of what the connection reported at extract time; every later run")
    L.append("# re-checks them and stops if it has reached a different system.")
    L.append("source:")
    L.append("  conn: %s" % yaml_str(meta["source_conn"]))
    L.append("  system: %s" % yaml_str(meta["source_system"]))
    L.append("  client: %s" % yaml_str(meta["source_client"]))
    L.append("  package: %s" % yaml_str(meta["source_package"]))
    L.append("")
    L.append("target:")
    L.append("  conn: %s" % yaml_str(meta["target_conn"]))
    L.append("  system: %s" % yaml_str(meta["target_system"]))
    L.append("  client: %s" % yaml_str(meta["target_client"]))
    L.append("  package: %s" % yaml_str(meta["to_package"]))
    L.append("  transport: %s" % yaml_str(meta["transport"]))
    L.append("")
    L.append("naming:")
    L.append("  catalog: %s" % yaml_str(meta["catalog"]))
    L.append("  rule:")
    L.append("    prefix: {from: %s, to: %s}" % (yaml_str(meta["prefix_from"]),
                                                 yaml_str(meta["prefix_to"])))
    L.append("")
    L.append("defaults:")
    L.append("  via: adt")
    L.append("")
    L.append("# `order` and `needs` are generated: deploy tier, then a topological sort")
    L.append("# inside the tier. Written out so the sequence is reviewable.")
    L.append("objects:")
    for o in objs:
        L.append("  - type: %s" % o["type"])
        L.append("    from: %s" % yaml_str(o["from"]))
        L.append("    to:   %s" % yaml_str(o["to"]))
        # Only when it differs from `defaults: via: adt`. Written high on the row
        # rather than after the notes: it is the field that decides whether this
        # object travels at all, and a reviewer scanning the plan should not have
        # to reach the note to find that out.
        if o.get("via") and o["via"] != "adt":
            L.append("    via:  %s" % yaml_str(o["via"]))
        L.append("    order: %s" % (int(o["order"]) if float(o["order"]).is_integer()
                                    else o["order"]))
        if o.get("needs"):
            L.append("    needs: [%s]" % ", ".join(sorted(o["needs"])))
        if o.get("parent_fugr"):
            L.append("    parent_fugr: %s" % o["parent_fugr"])
        if o.get("payload"):
            L.append("    payload: %s" % yaml_str(o["payload"]))
        if o.get("from_package"):
            L.append("    from_package: %s" % yaml_str(o["from_package"]))
        L.append("    select: %s" % ("true" if o["select"] else "false"))
        if "exists_on_target" in o:
            L.append("    exists_on_target: %s" % ("true" if o["exists_on_target"] else "false"))
        if o.get("opts"):
            L.append("    opts:")
            for k, v in sorted(o["opts"].items()):
                if k == "function_modules":
                    L.append("      function_modules:")
                    for fm in v:
                        L.append("        - {from: %s, to: %s}"
                                 % (yaml_str(fm["from"]), yaml_str(fm["to"])))
                elif k == "messages":
                    L.append("      messages:")
                    for m in v:
                        L.append("        - {number: \"%s\", text: %s}"
                                 % (m["number"], yaml_str(m["text"])))
                elif isinstance(v, dict):
                    L.append("      %s: {%s}" % (k, ", ".join(
                        "%s: %s" % (kk, yaml_str(str(vv))) for kk, vv in sorted(v.items()))))
                else:
                    L.append("      %s: %s" % (k, yaml_str(str(v))))
        if o.get("note"):
            L.append("    note: %s" % yaml_str(o["note"]))
        L.append("")
    path.write_text("\n".join(L), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, help="dir holding the SOURCE .conn_adt")
    ap.add_argument("--package", required=True, help="source package to read")
    ap.add_argument("--target", help="dir holding the TARGET .conn_adt (enables the exists probe)")
    ap.add_argument("--to-package", default="", help="target package")
    ap.add_argument("--transport", default="", help="target transport (confirmed by a human)")
    ap.add_argument("--prefix-from", default="", help="source name prefix, e.g. ZREA_")
    ap.add_argument("--prefix-to", default="", help="target name prefix, e.g. ZKIB_")
    ap.add_argument("--catalog", default="standard", help="naming catalog: standard | library")
    ap.add_argument("--name", default="", help="transfer slug (default: the package)")
    ap.add_argument("--reason", default="", help="why this transfer exists")
    ap.add_argument("--created", required=True, help="YYYY-MM-DD (no clock in scripts)")
    ap.add_argument("--out", required=True, help="path to write plan.yaml")
    ap.add_argument("--also-object", default="",
                    help="comma-separated objects to pull in from OUTSIDE the "
                         "package (a type another package owns but this code needs)")
    ap.add_argument("--max-objects", type=int, default=200)
    args = ap.parse_args()

    log("=" * 66)
    log("EXTRACT  package %s" % args.package.upper())
    log("=" * 66)

    client, url, sap_client = connect(args.source)
    log("  source   %s  client=%s" % (url, sap_client))

    with quiet():
        items = client.list_package_contents(args.package.upper()) or []
    log("  listed   %d entries (ADT)" % len(items))

    objs, skipped = [], []
    for it in items:
        code = code_for(it.get("type", ""))
        if code is None:
            skipped.append("%s (%s)" % (it.get("name"), it.get("type")))
            continue
        objs.append({"type": code, "from": (it.get("name") or "").upper(),
                     "uri": it.get("uri", ""), "select": True})

    # The ADT listing is not an inventory -- it silently omits live objects (see
    # GENERATED_TADIR in transfer_types.py for the measurement). TADIR is the
    # registry, so anything it knows and the listing missed gets added here.
    from_adt = {o["from"] for o in objs}
    recovered, deferred = [], []
    with quiet():
        tadir = client.run_sql_query(
            "SELECT OBJECT, OBJ_NAME FROM TADIR WHERE PGMID = 'R3TR' "
            "AND DEVCLASS = '%s'" % args.package.upper(), max_rows=500)
    for obj_type, obj_name in ((tadir or {}).get("data") or []):
        obj_type, obj_name = obj_type.strip().upper(), obj_name.strip().upper()
        if obj_type in GENERATED_TADIR or obj_name in from_adt:
            continue
        if obj_type == "TABL":
            code = resolve_tabl(client, obj_name)
        else:
            code = TADIR_TYPE_MAP.get(obj_type)
        if not code:
            # Rule 6: an object ADT cannot carry STAYS in the plan, routed
            # `via: request`. Dropping it to a console line -- which is all this
            # did until 2026-08-13 -- makes the inventory look COMPLETE when it
            # is not. Measured on ZGNL_PP_001: the plan said 13 of 13 landed
            # while transaction ZGNLPP001 and the table-maintenance dialog
            # ZGNL_PP_001_T_DPS never left the source, and the only trace was a
            # line in a scrollback nobody keeps.
            #
            # Both ends of the pipeline were already built for this row and only
            # this one was missing: transfer_deploy.py skips anything whose `via`
            # is not `adt`, and transfer_reconcile.py already collects
            # request/manual rows into its "deferred" table as open items.
            objs.append({
                "type": obj_type, "from": obj_name, "uri": "", "select": False,
                "via": "request",
                # A type NOT_VIA_ADT knows gets its reason and its alternative;
                # one it does not (TOBJ, the table-maintenance object, is the
                # first found in the field) must say that nobody has assessed it
                # rather than borrow the wording of a decision never taken.
                "note": NOT_VIA_ADT.get(
                    obj_type,
                    "TADIR type %s is not classified by this tool: it was NOT "
                    "transferred and NOT assessed - decide by hand" % obj_type),
            })
            deferred.append("%s %s" % (obj_type, obj_name))
            continue
        objs.append({"type": code, "from": obj_name, "uri": "", "select": True,
                     "note": "not returned by the ADT package listing; "
                             "recovered from TADIR"})
        recovered.append("%s %s" % (code, obj_name))
    if recovered:
        log("  recovered %d object(s) TADIR knows and ADT did not list: %s"
            % (len(recovered), ", ".join(recovered[:6])))
    if deferred:
        log("  %d object(s) ADT cannot carry -> kept in the plan as 'via: request': "
            "%s" % (len(deferred), ", ".join(deferred[:6])))

    # Objects the package does NOT own but this code cannot activate without.
    # A package is never self-contained: a function module's signature types, a
    # shared structure, a central domain all live somewhere else, and residue.md
    # names them precisely. Rather than splitting one delivery into two plans --
    # which splits the review and the run record with it -- they are pulled into
    # this one, renamed by the same rule and ordered by the same tiers.
    wanted_extra = [n.strip().upper() for n in args.also_object.split(",") if n.strip()]
    have = {o["from"] for o in objs}
    for obj_name in wanted_extra:
        if obj_name in have:
            continue
        with quiet():
            row = client.run_sql_query(
                "SELECT OBJECT, DEVCLASS FROM TADIR WHERE PGMID = 'R3TR' "
                "AND OBJ_NAME = '%s'" % obj_name, max_rows=2)
        data = (row or {}).get("data") or []
        if not data:
            log("  [WARN] --also-object %s is not in TADIR on the source - skipped"
                % obj_name)
            continue
        obj_type, owner = data[0][0].strip().upper(), data[0][1].strip()
        code = (resolve_tabl(client, obj_name) if obj_type == "TABL"
                else TADIR_TYPE_MAP.get(obj_type))
        if not code:
            log("  [WARN] --also-object %s is a %s, which this tool cannot carry"
                % (obj_name, obj_type))
            continue
        objs.append({"type": code, "from": obj_name, "uri": "", "select": True,
                     "from_package": owner,
                     "note": "pulled in from package %s - outside this transfer's "
                             "package but referenced by it" % owner})
        log("  pulled in %s %s (owned by %s)" % (code, obj_name, owner))

    # Dedupe: the listing can report the same object under more than one entry.
    seen, unique = set(), []
    for o in objs:
        key = (o["type"], o["from"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(o)
    objs = unique[:args.max_objects]
    log("  usable   %d plan rows  (%d generated/unreadable entries skipped)"
        % (len(objs), len(skipped)))

    names = {o["from"] for o in objs}
    # Payloads are SAVED, not just scanned. The read is already paid for by the
    # dependency scan, and writing it out is what lets the rename stage run with
    # no SAP connection at all -- which in turn makes the transform reviewable and
    # re-runnable without touching the source system again.
    payload_dir = Path(args.out).parent / "payload"
    behavior_pools: set[str] = set()
    log()
    log("  reading payloads for dependency edges...")
    for o in objs:
        # A `via: request` row has no ADT endpoint by definition. Reading one
        # 404s, and the miss-handler below would then overwrite its note with
        # "stale entry; deselected" -- turning a deliberate open item into an
        # apparent dead registry row, which is the opposite of what it is.
        if (o.get("via") or "adt") != "adt":
            continue
        text = read_payload(client, o["type"], o["from"], o.get("uri", ""))
        if text:
            ext = ".src" if o["type"] in SOURCE_BEARING else ".xml"
            f = payload_dir / o["type"] / (o["from"] + ext)
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(text, encoding="utf-8")
            o["payload"] = str(f.relative_to(Path(args.out).parent)).replace("\\", "/")
        o["_raw_opts"] = raw_opts(o["type"], text)
        if o["type"] == "FUGR":
            fms = function_modules(client, o["from"])
            for fm in fms:
                fsrc = read_fm_source(client, o["from"], fm)
                if not fsrc:
                    continue
                f = payload_dir / "FUNC" / (fm + ".src")
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_text(fsrc, encoding="utf-8")
                o.setdefault("_fms", []).append(fm)
        refs = {r.upper() for r in ZREF.findall(text.upper())} if text else set()
        o["needs"] = sorted((refs & names) - {o["from"]})
        if not text:
            # The registry names it and ADT will not serve it. Seen three times
            # across two systems on 2026-08-11 (two classes on NR4, one service
            # binding on NS4) -- usually a stale TADIR row for an object that is
            # gone. Deselected rather than flagged, because a transfer cannot
            # carry what it could not read: leaving it selected only moves the
            # failure to the middle of the run.
            o["select"] = False
            o["note"] = ("could not be fetched from ADT (registry lists it, the "
                         "endpoint 404s) - likely a stale entry; deselected")
        # A function-group include names its parent in the FG's own prefix.
        if o["type"] == "INCL" and o["from"].startswith("L"):
            for cand in objs:
                if cand["type"] == "FUGR" and o["from"].startswith("L" + cand["from"]):
                    o["parent_fugr"] = cand["from"]
                    break
        # A behaviour definition names its implementing class in its own source:
        #   managed implementation in class ZBP_REA_I_CC_CALL unique;
        # That class is a RAP behaviour pool and must deploy AFTER the definition,
        # so it is identified from the source rather than from a ZBP_ name guess --
        # the prefix is a convention, the declaration is a fact.
        if o["type"] == "BDEF" and text:
            for cls in re.findall(r"implementation\s+in\s+class\s+([A-Za-z0-9_/]+)",
                                  text, re.I):
                behavior_pools.add(cls.upper())
        o["order"] = order_of(o["type"], o.get("parent_fugr"))

    # Every row must carry a tier before sort_plan groups by it, INCLUDING the
    # ones the loop above skipped. `via: request` rows `continue` past the tier
    # assignment at the end of that body, so an extract of any package holding
    # one -- ENHO, TRAN, TOBJ, SXCI, AQQU/AQSG, AVAS, SUSC -- died with
    # KeyError: 'order' before it ever wrote a plan. Measured on ZPP_000,
    # 2026-08-24: 54 of 179 rows were via: request and none had a tier.
    #
    # Swept here rather than patched into the `continue` because a sweep cannot
    # be bypassed by the next early exit somebody adds to that loop. setdefault,
    # not assignment: rows that already earned a tier keep it.
    ensure_order(objs)

    # Re-tier now that every BDEF has been read: a class is only known to be a
    # behaviour pool after the definition that names it has been parsed, and that
    # may be later in the list than the class itself.
    for o in objs:
        if o["type"] == "CLAS" and o["from"] in behavior_pools:
            o["order"] = order_of("CLAS", behavior_pool=True)
            o["note"] = ((o.get("note", "") + "; ") if o.get("note") else "") + (
                "RAP behaviour pool - deploys after its behaviour definition")
    if behavior_pools:
        log("  behaviour pool(s) re-tiered after their definitions: %s"
            % ", ".join(sorted(behavior_pools)))

    for o in objs:
        proposed, note = propose(o["from"], args.prefix_from, args.prefix_to)
        limit = MAX_LEN.get(o["type"], MAX_LEN_DEFAULT)
        if len(proposed) > limit:
            note = ("proposed name is %d chars, max %d for %s - shorten it here, "
                    "SAP would truncate silently" % (len(proposed), limit, o["type"]))
        o["to"] = proposed
        if note:
            o["note"] = ((o.get("note", "") + "; ") if o.get("note") else "") + note

    # Names are settled, so cross-object references inside opts can be resolved.
    # A binding that keeps the SOURCE service-definition name activates cleanly on
    # the target and serves the wrong definition -- silent, and only visible to
    # whoever calls the service.
    name_map = {o["from"]: o["to"] for o in objs}
    for o in objs:
        opts = dict(o.pop("_raw_opts", {}) or {})
        # A data element's domain and a table type's row type are OBJECT NAMES. If
        # they travel unmapped, the new object binds to the source system's domain
        # -- which either does not exist on the target or, worse, does and is
        # something else. Names not in this transfer are left alone: STRING and
        # every other SAP standard type is meant to stay as it is.
        for key in ("domain", "row_type"):
            if opts.get(key):
                opts[key] = name_map.get(opts[key].upper(), opts[key])
        fms = o.pop("_fms", None)
        if fms:
            # The same prefix rule as the objects, because a module keeps its
            # group's family name. Written as from/to pairs so the transform and
            # the deploy both work from one list.
            opts["function_modules"] = [
                {"from": fm, "to": propose(fm, args.prefix_from, args.prefix_to)[0]}
                for fm in fms]
        src_sd = opts.pop("_service_definition_src", None)
        if src_sd:
            opts["service_definition"] = name_map.get(src_sd, src_sd)
            if src_sd not in name_map:
                o["note"] = ((o.get("note", "") + "; ") if o.get("note") else "") + (
                    "service definition %s is not in this transfer - the binding "
                    "will point at it by that name on the target" % src_sd)
        if opts:
            o["opts"] = opts

    objs = sort_plan(objs)

    target_system = target_client = ""
    if args.target:
        log()
        log("  probing target for existing names...")
        tclient, turl, tsapclient = connect(args.target)
        target_system, target_client = turl, tsapclient
        log("  target   %s  client=%s" % (turl, tsapclient))
        for o in objs:
            try:
                with quiet():
                    hits = tclient.search_objects(o["to"], max_results=10) or []
                exists = any((h.get("name") or "").upper() == o["to"] for h in hits)
            except Exception:
                exists = False
            o["exists_on_target"] = exists
            # Overwriting an object the target already has must be opted into,
            # never inherited from a default.
            if exists:
                o["select"] = False

    meta = {
        "name": args.name or args.package.lower(),
        "created": args.created,
        "reason": args.reason or ("extracted from %s" % args.package.upper()),
        "source_conn": args.source, "source_system": url or "",
        "source_client": sap_client or "", "source_package": args.package.upper(),
        "target_conn": args.target or "", "target_system": target_system,
        "target_client": target_client, "to_package": args.to_package.upper(),
        "transport": args.transport, "catalog": args.catalog,
        "prefix_from": args.prefix_from, "prefix_to": args.prefix_to,
    }
    out = Path(args.out)
    write_plan(out, meta, objs)

    log()
    log("=" * 66)
    for o in objs:
        # "not selected" is two different facts and an agent summarising this
        # output cannot tell them apart: already on the target (fine, nothing to
        # do) versus ADT cannot carry it (an open item somebody has to move by
        # hand). Say which.
        via = o.get("via") or "adt"
        flag = "" if o["select"] else (
            "  [via: %s - NOT transferred, open item]" % via if via != "adt"
            else "  [not selected]")
        log("  %-5s %-4s %-28s -> %-28s%s"
            % (o["order"], o["type"], o["from"], o["to"], flag))
    # Function modules are NOT rows -- they ride with their group. Printing them
    # is not decoration: a reviewer who reads "20 objects" and approves has not
    # been told about the module travelling alongside, and invisible cargo is the
    # one thing the plan exists to prevent.
    carried = [(o["to"], fm) for o in objs
               for fm in ((o.get("opts") or {}).get("function_modules") or [])]
    if carried:
        log("  %-5s %-4s %s" % ("", "", "-- carried by their group, not rows --"))
        for grp, fm in carried:
            log("  %-5s %-4s %-28s -> %-28s  (in %s)"
                % ("", "FUNC", fm["from"], fm["to"], grp))
    log("=" * 66)
    log("  %d objects%s -> %s"
        % (len(objs),
           (" + %d function module(s)" % len(carried)) if carried else "", out))
    if skipped:
        log("  skipped (not transferable): %s" % ", ".join(skipped[:6]))
    log()
    log("  NEXT: read the plan, fix the names, then transfer. Nothing has moved.")


if __name__ == "__main__":
    main()
