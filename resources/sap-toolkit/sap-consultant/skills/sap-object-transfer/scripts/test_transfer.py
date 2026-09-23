#!/usr/bin/env python3
"""Self-test for the cross-system transfer scripts. No SAP system, no network.

    py plugins/sap-consultant/skills/sap-object-transfer/scripts/test_transfer.py

Every check names the failure it catches, and most of them exist because that
failure actually happened on 2026-08-11 while this was built against two live
systems. The expensive ones to re-learn are pinned here so they cannot come back:

  * the ADT package listing hands back search uris that serve no content, so an
    empty read looked exactly like "this object has no dependencies";
  * a service binding's category is the STRING "0" -- unquoted in YAML it comes
    back as the integer 0 and reaches SAP as a different value;
  * a RAP behaviour pool cannot deploy with ordinary classes;
  * `select` decides what TRAVELS, not what gets RENAMED.

Exit 0 = all pass. ASCII output only (cp1252 console).
"""
from __future__ import annotations

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
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE.parents[1] / "sap-adt" / "scripts"))

import transfer_deploy as dep  # noqa: E402
import transfer_extract as ext  # noqa: E402
import transfer_rename as ren  # noqa: E402
import transfer_types as tt  # noqa: E402

RESULTS = []


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 - a crash is a failure
        RESULTS.append(("FAIL", name, catches, "%s: %s" % (type(exc).__name__, exc)))


# --- 1: the type table -------------------------------------------------------

def t_table_vs_structure():
    assert tt.code_for("TABL/DT") == "TABL"
    assert tt.code_for("TABL/DS") == "STRU"


def t_packages_are_not_objects():
    for t in ("DEVC/K", "DEVC/P", "DEVC/DV", "DEVC/F"):
        assert tt.code_for(t) is None, "%s treated as transferable" % t


def t_uri_is_built_not_taken():
    # The listing hands back /sap/bc/adt/tabl/dts/<name>, which serves nothing.
    uri = tt.object_uri("TABL", "ZFOO")
    assert uri == "/sap/bc/adt/ddic/tables/zfoo", uri
    assert tt.object_uri("CLAS", "ZCL_FOO") == "/sap/bc/adt/oo/classes/zcl_foo"
    # Types the engine does not know still resolve, from the measured extras.
    assert tt.object_uri("SRVB", "ZSB") == "/sap/bc/adt/businessservices/bindings/zsb"
    assert tt.object_uri("SRVD", "ZSD") == "/sap/bc/adt/ddic/srvd/sources/zsd"
    # Message classes answer on the UPPER-case form; everything else lower.
    assert tt.object_uri("MSAG", "ZMSG").endswith("/ZMSG")


def t_rap_types_have_a_write_path():
    for code, expected in (("BDEF", "behaviordefinition"),
                           ("SRVD", "servicedefinition"),
                           ("DDLS", "cds"), ("TABL", "table"), ("STRU", "structure")):
        assert tt.kit_type_for(code) == expected, "%s -> %s" % (code, tt.kit_type_for(code))


def t_behaviour_pool_deploys_after_its_definition():
    assert tt.order_of("CLAS") == 7
    assert tt.order_of("CLAS", behavior_pool=True) == 13.5
    assert tt.order_of("CLAS", behavior_pool=True) > tt.DEPLOY_ORDER["BDEF"]
    # And a function-group include lands between its FG and the FMs.
    assert tt.DEPLOY_ORDER["FUGR"] < tt.order_of("INCL", parent_fugr="ZFG") \
        < tt.DEPLOY_ORDER["FUNC"]


def t_generated_types_never_travel():
    for t in ("SUSH", "SICF", "IWMO", "IWSV"):
        assert t in tt.GENERATED_TADIR, "%s would be transferred as a real object" % t


# --- 2: plan generation ------------------------------------------------------

def t_yaml_quotes_number_like_values():
    # srvb:category is "0". Unquoted, YAML gives back int 0.
    assert ext.yaml_str("0") == '"0"'
    assert ext.yaml_str("V4") == "V4"
    assert ext.yaml_str("true") == '"true"'
    assert ext.yaml_str("ZKIB_FOO") == "ZKIB_FOO"


def t_prefix_proposal_flags_rather_than_guesses():
    name, note = ext.propose("ZREA_CC_CALL", "ZREA_", "ZKIB_")
    assert name == "ZKIB_CC_CALL" and not note
    name, note = ext.propose("ZCL_SHARED_UTIL", "ZREA_", "ZKIB_")
    assert name == "ZCL_SHARED_UTIL", name
    assert note, "a name outside the prefix was renamed silently"


def t_topo_sort_orders_and_survives_cycles():
    items = [{"from": "B", "needs": ["A"]}, {"from": "A", "needs": []}]
    out = [o["from"] for o in ext.topo_within_tier(items)]
    assert out == ["A", "B"], out
    cyc = [{"from": "X", "needs": ["Y"]}, {"from": "Y", "needs": ["X"]}]
    assert len(ext.topo_within_tier(cyc)) == 2, "a cycle dropped an object"


def t_sort_plan_is_monotone():
    objs = [{"from": "P", "order": 20, "needs": []},
            {"from": "D", "order": 1, "needs": []},
            {"from": "C", "order": 7, "needs": []}]
    orders = [o["order"] for o in ext.sort_plan(objs)]
    assert orders == sorted(orders), orders


def t_every_row_gets_a_tier_before_the_plan_is_sorted():
    """Measured on ZPP_000, 2026-08-24: extract died with KeyError: 'order'.

    The payload loop `continue`s past a `via: request` row -- there is no ADT
    endpoint to read -- and the tier assignment sits at the END of that body, so
    54 of 179 rows never got one. sort_plan then groups by `order` and raised on
    the first of them. Any package holding an untransferable type (ENHO, TRAN,
    TOBJ, SXCI, AQQU/AQSG, AVAS, SUSC) could never be extracted at all.

    The existing untransferable-types test did not catch it because its fixture
    writes `"order": 50` by hand -- it hands the pipeline the very field the
    pipeline forgets. So this one deliberately builds the row the way the loop
    leaves it: with no order at all.
    """
    rows = [{"type": "TRAN", "from": "ZGNLPP001", "to": "ZTSTPP001",
             "select": False, "via": "request"},
            {"type": "DTEL", "from": "ZGNL_E_X", "to": "ZTST_E_X",
             "select": True, "order": 2}]
    ext.ensure_order(rows)
    assert all("order" in r for r in rows), rows
    # Untransferable types are not in DEPLOY_ORDER, so order_of returns its
    # unknown-type fallback and they sort last -- which is where an open item
    # belongs, rather than buried mid-plan.
    by_name = {r["from"]: r for r in rows}
    assert by_name["ZGNLPP001"]["order"] == 50, by_name["ZGNLPP001"]
    # A row that already earned a tier keeps it.
    assert by_name["ZGNL_E_X"]["order"] == 2, by_name["ZGNL_E_X"]
    # And the thing that actually broke now runs.
    orders = [r["order"] for r in ext.sort_plan(rows)]
    assert orders == sorted(orders), orders


def t_binding_triple_is_read_not_guessed():
    xml = ('<srvb:serviceBinding srvb:published="true" adtcore:name="ZSB">'
           '<srvb:services><srvb:content>'
           '<srvb:serviceDefinition adtcore:type="SRVD/SRV" adtcore:name="ZSD_OLD"/>'
           '</srvb:content></srvb:services>'
           '<srvb:binding srvb:type="ODATA" srvb:version="V2" srvb:category="1">'
           '</srvb:binding></srvb:serviceBinding>')
    got = ext.raw_opts("SRVB", xml)
    assert got["binding"] == {"type": "ODATA", "version": "V2", "category": "1"}, got
    assert got["_service_definition_src"] == "ZSD_OLD"
    # contract only when the source actually carries it
    assert "contract" not in got["binding"]
    with_c = ext.raw_opts("SRVB", xml.replace("<srvb:serviceBinding ",
                                              '<srvb:serviceBinding srvb:contract="C1" '))
    assert with_c["binding"]["contract"] == "C1"


def t_message_texts_come_from_the_source():
    xml = ('<mc:messageClass><mc:message mc:msgno="001" mc:msgtext="Malzeme yok"/>'
           '<mc:message mc:msgno="042" mc:msgtext="Tutar hatali"/></mc:messageClass>')
    got = ext.raw_opts("MSAG", xml)
    assert got["messages"] == [{"number": "001", "text": "Malzeme yok"},
                               {"number": "042", "text": "Tutar hatali"}], got
    # An empty message class is legitimate and must still be carried.
    assert ext.raw_opts("MSAG", "<mc:messageClass/>") == {"messages": []}


# --- 3: the rename map -------------------------------------------------------

PLAN_OBJS = [
    {"type": "TABL", "from": "ZREA_CC_CALL", "to": "ZKIB_CC_CALL", "select": True},
    {"type": "TABL", "from": "ZREA_CC_CALLD", "to": "ZKIB_CC_CALLD", "select": True},
    # deselected because it is ALREADY on the target
    {"type": "TABL", "from": "ZREA_GDP_LOG", "to": "ZKIB_GDP_LOG", "select": False,
     "exists_on_target": True},
    {"type": "FUGR", "from": "ZREA_FG01", "to": "ZKIB_FG01", "select": True},
    {"type": "CLAS", "from": "ZREA_OLD", "to": "-", "select": False, "via": "skip"},
]


def t_map_covers_deselected_objects():
    m = ren.build_map(PLAN_OBJS)
    assert m.get("ZREA_GDP_LOG") == "ZKIB_GDP_LOG", \
        "a deselected object's references would keep the SOURCE name"


def t_map_excludes_skipped_objects():
    m = ren.build_map(PLAN_OBJS)
    assert "ZREA_OLD" not in m, "a via:skip row was mapped to a non-name"


def t_map_carries_the_package():
    m = ren.build_map(PLAN_OBJS, "ZREA_DENEME", "ZCMTEST")
    assert m.get("ZREA_DENEME") == "ZCMTEST", \
        "packageRef and program headers would keep the source package"


def t_fugr_includes_are_enumerated():
    m = ren.build_map(PLAN_OBJS)
    for suffix in ("TOP", "UXX", "F01", "O01", "U99"):
        assert m.get("LZREA_FG01" + suffix) == "LZKIB_FG01" + suffix, suffix


def t_word_boundary_does_not_eat_longer_names():
    m = {"ZREA_CC_CALL": "ZKIB_CC_CALL"}
    out, sites = ren.apply_map("SELECT * FROM zrea_cc_calld.", m)
    assert "ZKIB" not in out.upper(), out
    assert not sites


def t_literals_are_renamed_too():
    m = {"Z_REA_FM": "Z_KIB_FM", "ZREA_P_RPT": "ZKIB_P_RPT"}
    out, sites = ren.apply_map("CALL FUNCTION 'Z_REA_FM'.\nSUBMIT zrea_p_rpt.", m)
    assert "Z_KIB_FM" in out and "ZKIB_P_RPT" in out, out
    assert len(sites) == 2, sites


def t_longest_name_wins():
    m = {"ZREA_A": "ZKIB_A", "ZREA_A_B": "ZKIB_A_B"}
    out, _ = ren.apply_map("DATA lv TYPE zrea_a_b.", m)
    assert "ZKIB_A_B" in out, out


# --- 4: deploy-side judgement ------------------------------------------------

class FakeSession:
    def __init__(self, source):
        self.source = source
        self.calls = []

    def call(self, tool, **kw):
        self.calls.append(tool)
        return {"ok": True, "source": self.source}


BARE = ("@EndUserText.label : 'x'\ndefine table zkib_gdp_log {\n\n"
        "  key client : abap.clnt not null;\n\n}")
REAL = ("define table zkib_gdp_log {\n  key mandt : mandt not null;\n"
        "  key log_id : sysuuid_c32 not null;\n  payload : abap.string(0);\n}")


def t_bare_shell_is_recognised():
    assert dep.is_bare_shell(FakeSession(BARE), "ZKIB_GDP_LOG", "table") is True


def t_real_table_is_never_acked():
    assert dep.is_bare_shell(FakeSession(REAL), "ZKIB_GDP_LOG", "table") is False
    # An unreadable object must not be treated as empty either.
    assert dep.is_bare_shell(FakeSession(""), "ZKIB_GDP_LOG", "table") is False


def t_shell_first_types_are_the_source_bearing_ones():
    assert dep.SHELL_FIRST == {"TABL", "STRU", "BDEF", "SRVD", "DDLS"}


def t_failure_reason_keeps_the_engine_log():
    res = {"error": "create_shell_failed",
           "log": "x" * 50 + "[ERROR] [400] Failed to create table shell ZFOO"}
    got = dep.why(res)
    assert "400" in got, "the run file would lose the only actionable detail"


def t_reconcile_never_writes():
    """A stage whose job is to report the truth must not be able to change it."""
    src = (_HERE / "transfer_reconcile.py").read_text(encoding="utf-8")
    called = set()
    for line in src.splitlines():
        if "s.call(" in line and not line.strip().startswith("#"):
            called.add(line.split('s.call("')[1].split('"')[0])
    write_tools = {"adt_push", "adt_create", "adt_create_ddic_shell", "adt_activate",
                   "adt_create_service_binding", "adt_publish_service_binding",
                   "adt_delete_object", "adt_set_transport", "adt_message_class"}
    leaked = called & write_tools
    assert not leaked, "reconcile calls write tools: %s" % sorted(leaked)


_META = {
    "name": "t", "created": "2026-08-13", "reason": "test",
    "source_conn": ".transfer/source", "source_system": "NR4", "source_client": "100",
    "source_package": "ZGNL_PP_001", "target_conn": ".", "target_system": "NS4",
    "target_client": "100", "to_package": "ZCMTEST", "transport": "NS4K900135",
    "catalog": "library", "prefix_from": "ZGNL_", "prefix_to": "ZTST_",
}


def t_untransferable_types_stay_in_the_plan():
    """Rule 6. Measured on ZGNL_PP_001, 2026-08-13: transaction ZGNLPP001 and the
    table-maintenance object ZGNL_PP_001_T_DPS were dropped to a console line, so
    the plan claimed 13 of 13 while two objects had never left the source."""
    import tempfile
    import yaml
    objs = [{"type": "TRAN", "from": "ZGNLPP001", "to": "ZTSTPP001", "order": 50,
             "select": False, "via": "request", "note": "transaction code"},
            {"type": "DTEL", "from": "ZGNL_E_X", "to": "ZTST_E_X", "order": 2,
             "select": True}]
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "plan.yaml"
        ext.write_plan(path, _META, objs)
        text = path.read_text(encoding="utf-8")
        rows = yaml.safe_load(text)["objects"]
    assert "ZGNLPP001" in text, "the untransferable object never reached the plan"
    assert "via:" in text, "the row was written without via -> deploy would try it"
    by_name = {r["from"]: r for r in rows}
    assert by_name["ZGNLPP001"].get("via") == "request", by_name["ZGNLPP001"]
    # The rows that DO travel must not acquire a via -- `defaults: via: adt`
    # covers them, and writing it on every row would bury the exceptions.
    assert "via" not in by_name["ZGNL_E_X"], "via written on an ordinary row"
    # Mirrors the filter in transfer_deploy.py: select AND effective via == adt.
    default_via = yaml.safe_load(text).get("defaults", {}).get("via")
    deployable = [r["from"] for r in rows
                  if r.get("select") and (r.get("via") or default_via) == "adt"]
    assert deployable == ["ZGNL_E_X"], deployable


def t_not_via_adt_is_wired_to_the_extractor():
    """The constant existed and nothing imported it, so the rule it encodes was
    documented and unimplemented for as long as both were in the repo."""
    assert "TRAN" in tt.NOT_VIA_ADT and "DYNP" in tt.NOT_VIA_ADT
    assert ext.NOT_VIA_ADT is tt.NOT_VIA_ADT, "extract does not import the table"
    src = (_HERE / "transfer_extract.py").read_text(encoding="utf-8")
    assert "NOT_VIA_ADT.get(" in src, "the table is imported but never consulted"


def main():
    for fn, name, catches in [
        (t_table_vs_structure, "table and structure stay apart",
         "a structure written as a transparent table"),
        (t_packages_are_not_objects, "package entries are not objects",
         "DEVC rows entering the transfer as objects"),
        (t_uri_is_built_not_taken, "object uris are built from the type",
         "reading a search uri that serves no content, so every object looks dependency-free"),
        (t_rap_types_have_a_write_path, "RAP and DDIC types resolve to a write path",
         "a type silently skipped at deploy time"),
        (t_behaviour_pool_deploys_after_its_definition, "behaviour pool is tiered after BDEF",
         "SAP refusing the class: not a root entity or not released for BEHAVIOR"),
        (t_generated_types_never_travel, "generated Gateway/auth rows are filtered",
         "shipping SICF nodes and authorization defaults as if they were code"),
        (t_yaml_quotes_number_like_values, "number-like values are quoted",
         "srvb category \"0\" read back as the integer 0"),
        (t_prefix_proposal_flags_rather_than_guesses, "names outside the prefix are flagged",
         "an unrelated object renamed without anyone deciding to"),
        (t_topo_sort_orders_and_survives_cycles, "intra-tier topological order",
         "a structure deploying before the structure it includes; a cycle dropping objects"),
        (t_sort_plan_is_monotone, "the plan is emitted in deploy order",
         "a data element deploying after the table that uses it"),
        (t_every_row_gets_a_tier_before_the_plan_is_sorted,
         "every plan row carries a deploy tier",
         "extract dying with KeyError: 'order' on any package holding a "
         "via: request object"),
        (t_binding_triple_is_read_not_guessed, "binding triple is copied from the source",
         "a V2 binding recreated as V4 because its NAME said so"),
        (t_message_texts_come_from_the_source, "message texts travel with the class",
         "an empty message class on the target and no texts at runtime"),
        (t_untransferable_types_stay_in_the_plan, "objects ADT cannot carry stay in the plan",
         "an inventory that looks complete while a TRAN and a TOBJ never left the source"),
        (t_not_via_adt_is_wired_to_the_extractor, "the NOT_VIA_ADT table is consulted",
         "a rule documented in SKILL.md and implemented nowhere"),
        (t_map_covers_deselected_objects, "deselected objects are still renamed",
         "transferred code pointing back at the source system's object"),
        (t_map_excludes_skipped_objects, "skipped objects are not mapped",
         "renaming references to the placeholder '-'"),
        (t_map_carries_the_package, "the package is renamed too",
         "packageRef and program headers keeping the source package"),
        (t_fugr_includes_are_enumerated, "function-group includes are derived",
         "LZREA_FG01TOP surviving because a word boundary never matched it"),
        (t_word_boundary_does_not_eat_longer_names, "renaming respects word boundaries",
         "ZREA_CC_CALL half-replacing inside ZREA_CC_CALLD"),
        (t_literals_are_renamed_too, "string literals are renamed",
         "CALL FUNCTION 'Z_OLD' still calling the source system's module"),
        (t_longest_name_wins, "longest name replaced first",
         "a shorter prefix name corrupting a longer one"),
        (t_bare_shell_is_recognised, "an empty shell is recognised",
         "a first-run transfer permanently blocked by the data-loss guard"),
        (t_real_table_is_never_acked, "a real table is never auto-acked",
         "acking a field drop on a table that holds data"),
        (t_shell_first_types_are_the_source_bearing_ones, "shell-first list matches the types",
         "adt_create being asked for a type it answers Unsupported for"),
        (t_failure_reason_keeps_the_engine_log, "failures keep the engine log",
         "a run file that records the error code and discards the diagnosis"),
        (t_reconcile_never_writes, "reconcile is read-only",
         "the stage that reports the truth being able to change it"),
    ]:
        check(name, catches, fn)

    width = max(len(r[1]) for r in RESULTS)
    failed = 0
    for status, name, catches, detail in RESULTS:
        print("  [%s] %-*s  catches: %s" % (status, width, name, catches))
        if status == "FAIL":
            failed += 1
            print("         -> %s" % detail)
    print()
    print("  %d/%d passed" % (len(RESULTS) - failed, len(RESULTS)))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
