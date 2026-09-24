#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — gated_collect.py testleri. Sahte SAP istemcisiyle; SAP yok, ağ yok.

    py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py

Her test yakaladığı hatayı söyler. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import re
import sys
import tempfile
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import gated_collect as gc  # noqa: E402
import gated_quality as gq  # noqa: E402

RESULTS = []
TR = "DS4K900001"
TR2 = "DS4K900002"


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


class FakeSap:
    """SAPClient'ın gated_collect'in kullandığı yüzü. Okumaları kaydeder."""

    def __init__(self, tadir=None, tfdir=None, owners=None, sources=None, session_transport=None,
                 fail_sql=False):
        self.tadir = tadir or {}          # (R3TR, AD) → paket
        self.tfdir = tfdir or {}          # FM → PNAME
        self.owners = owners or {}        # AD → transport
        self.sources = sources or {}      # URL'deki küçük harfli ad → aktif kaynak
        self.session_transport = session_transport
        self.fail_sql = fail_sql
        self.queries, self.source_urls = [], []
        self.adt_client = self

    def run_sql_query(self, query, max_rows=100):
        self.queries.append(query)
        if self.fail_sql:
            raise RuntimeError("HTTP 500")
        m = re.search(r"FROM tadir WHERE pgmid = 'R3TR' AND object = '([^']*)' AND obj_name = '([^']*)'", query)
        if m:
            v = self.tadir.get((m.group(1), m.group(2)))
        else:
            m = re.search(r"FROM tfdir WHERE funcname = '([^']*)'", query)
            v = self.tfdir.get(m.group(1)) if m else None
        return {"columns": ["X"], "data": [[v]] if v else [], "total_rows": 1 if v else 0}

    def _find_existing_transport(self, name, otype, requested):
        return self.owners.get(name, requested)

    def get_transport_info(self, tr):
        return {"number": tr, "owner": "DEV1", "status": "D", "description": f"Açıklama {tr}"}

    def get_object_source(self, url, return_etag=False, version=None):
        self.source_urls.append((url, version))
        key = url.split("/")[-3]
        if key not in self.sources:
            raise RuntimeError("404")
        return self.sources[key]


def project(files=None) -> Path:
    pd = Path(tempfile.mkdtemp(prefix="gc-"))
    for name, data in (files or {}).items():
        (pd / name).parent.mkdir(parents=True, exist_ok=True)
        (pd / name).write_bytes(data)
    return pd


def refused(reason, fn):
    try:
        fn()
    except gc.CollectError as exc:
        assert exc.reason == reason, f"{exc.reason} != {reason}: {exc.message}"
        return exc
    raise AssertionError(f"{reason} bekleniyordu, geçti")


def push_args(**over):
    return {"name": "ZCL_A", "object_type": "class", "source_file": "zcl_a.clas.abap",
            "transport": "", "ack_drop": "", **over}


NEW_SRC = b"CLASS zcl_a.\r\n  yeni.\r\nENDCLASS.\r\n"


def t_push_existing():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR},
                  sources={"zcl_a": "CLASS zcl_a.\n  eski.\nENDCLASS.\n"})
    pd = project({"zcl_a.clas.abap": NEW_SRC})
    r = gc.collect(sap, "adt_push", push_args(), pd)
    o = r["nesneler"][0]
    assert (o["ad"], o["tip"], o["paket"], o["yeni"]) == ("ZCL_A", "CLAS", "ZPKG", False), o
    assert o["kaynak_sha256"] == [gq.src_hash(NEW_SRC)]
    assert "-  eski." in o["fark"] and "+  yeni." in o["fark"] and o["fark_kirpildi"] is False
    assert r["transport"] == TR and r["enjekte_transport"] == TR and r["kalite"] is True
    assert r["transport_bilgi"] == {"aciklama": f"Açıklama {TR}", "sahip": "DEV1", "durum": "D"}
    assert sap.source_urls == [("/sap/bc/adt/oo/classes/zcl_a/source/main", "active")]
    assert "paket" not in r


def t_push_arg_wins():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR}, sources={"zcl_a": ""})
    r = gc.collect(sap, "adt_push", push_args(transport=TR2.lower()), project({"zcl_a.clas.abap": NEW_SRC}))
    assert r["transport"] == TR2 and r["enjekte_transport"] == ""


def t_push_session_fallback():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, sources={"zcl_a": ""}, session_transport=TR2)
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    assert r["transport"] == TR2 and r["enjekte_transport"] == TR2


def t_push_transport_belirsiz():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, sources={"zcl_a": ""})
    refused("transport_belirsiz", lambda: gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC})))


def t_push_local_package():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "$TMP"}, sources={"zcl_a": ""})
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    assert r["transport"] == "" and r["transport_bilgi"] is None and r["enjekte_transport"] == ""


def t_push_new_object():
    sap = FakeSap(session_transport=TR)
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    o = r["nesneler"][0]
    assert o["yeni"] is True and o["paket"] == "" and "fark" not in o
    assert sap.source_urls == [], "yeni nesnede kaynak okundu"


def t_push_unreadable_source():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR})
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    assert "okunamadı" in r["nesneler"][0]["fark"]


def t_sql_failure_refuses():
    sap = FakeSap(fail_sql=True, session_transport=TR)
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC})))


def t_injection_refused():
    sap = FakeSap(session_transport=TR)
    pd = project({"zcl_a.clas.abap": NEW_SRC})
    refused("gecersiz_ad", lambda: gc.collect(sap, "adt_push", push_args(name="ZCL_A' OR '1'='1"), pd))
    refused("gecersiz_ad", lambda: gc.collect(sap, "adt_push", push_args(transport="X' OR 1=1"), pd))
    assert sap.queries == [], f"süzülmemiş ad SQL'e gitti: {sap.queries}"


def t_bad_type_and_file():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, session_transport=TR)
    pd = project()
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_push", push_args(object_type="muz"), pd))
    refused("kaynak_dosyasi_yok", lambda: gc.collect(sap, "adt_push", push_args(), pd))
    refused("kaynak_dosyasi_gerekli", lambda: gc.collect(sap, "adt_push", push_args(source_file=""), pd))
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_push", push_args(object_type="function"), pd))


def fm_args(**over):
    return {"name": "Z_FM", "function_group": "ZFG", "source_file": "z_fm.abap", "description": "", "transport": TR, **over}


def t_write_fm():
    sap = FakeSap(tadir={("FUGR", "ZFG"): "ZPKG"}, tfdir={"Z_FM": "SAPLZFG"}, sources={"z_fm": "FUNCTION z_fm.\n"})
    r = gc.collect(sap, "adt_write_function_module", fm_args(), project({"z_fm.abap": b"FUNCTION z_fm.\n* x\n"}))
    o = r["nesneler"][0]
    assert (o["ad"], o["tip"], o["paket"], o["yeni"]) == ("Z_FM", "FUNC", "ZPKG", False), o
    assert sap.source_urls[0][0].endswith("/groups/zfg/fmodules/z_fm/source/main"), sap.source_urls
    assert r["transport"] == TR and r["kalite"] is True


def t_write_fm_rules():
    pd = project({"z_fm.abap": b"x"})
    sap = FakeSap(tadir={("FUGR", "ZFG"): "ZPKG"}, tfdir={"Z_FM": "SAPLZOTHER"})
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_write_function_module", fm_args(), pd))
    refused("bilgi_toplanamadi", lambda: gc.collect(FakeSap(), "adt_write_function_module", fm_args(), pd))
    sap = FakeSap(tadir={("FUGR", "ZFG"): "ZPKG"}, session_transport=TR2)
    refused("transport_belirsiz", lambda: gc.collect(sap, "adt_write_function_module", fm_args(transport=""), pd))
    sap = FakeSap(tadir={("FUGR", "/ABC/ZFG"): "ZPKG"}, tfdir={"/ABC/Z_FM": "/ABC/SAPLZFG"})
    r = gc.collect(sap, "adt_write_function_module", fm_args(name="/abc/z_fm", function_group="/ABC/ZFG"), pd)
    assert r["nesneler"][0]["paket"] == "ZPKG" and r["nesneler"][0]["yeni"] is False


def t_creates():
    pd = project({"zi_v.ddls.asddls": b"define view entity ZI_V"})
    sap = FakeSap(session_transport=TR)
    r = gc.collect(sap, "adt_create_domain", {"name": "zd_x", "package": "zpkg", "description": "d", "transport": ""}, pd)
    assert r["nesneler"] == [{"ad": "ZD_X", "tip": "DOMA", "paket": "ZPKG", "yeni": True}] and r["kalite"] is False
    assert r["enjekte_transport"] == TR
    r = gc.collect(sap, "adt_create_cds_view", {"name": "ZI_V", "package": "ZPKG", "description": "d", "source": "",
                                               "source_file": "zi_v.ddls.asddls", "transport": TR2}, pd)
    o = r["nesneler"][0]
    assert o["tip"] == "DDLS" and o["yeni"] and o["kaynak_sha256"] and r["kalite"] and r["transport"] == TR2
    r = gc.collect(sap, "adt_create_ddic_shell", {"name": "ZT", "object_type": "structure", "package": "ZPKG",
                                                 "description": "d", "transport": ""}, pd)
    assert r["nesneler"][0]["tip"] == "TABL"
    refused("transport_belirsiz", lambda: gc.collect(FakeSap(), "adt_create", {
        "object_type": "class", "name": "ZCL_B", "package": "ZPKG", "description": "d", "transport": ""}, pd))
    refused("kaynak_dosyasi_gerekli", lambda: gc.collect(sap, "adt_create_type_group", {
        "name": "ZTG", "package": "ZPKG", "description": "d", "types_and_constants": "", "source_file": "",
        "transport": TR}, pd))


def t_create_existing_uses_sap_package():
    sap = FakeSap(tadir={("DOMA", "ZD_X"): "ZREAL"}, session_transport=TR)
    r = gc.collect(sap, "adt_create_domain", {"name": "ZD_X", "package": "ZWRONG", "description": "d", "transport": ""},
                   project())
    assert r["nesneler"][0]["paket"] == "ZREAL" and r["nesneler"][0]["yeni"] is False


def t_activate():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG", ("DDLS", "ZI_V"): "ZPKG"}, owners={"ZCL_A": TR})
    r = gc.collect(sap, "adt_activate", {"name": "", "object_type": "class", "objects": [
        {"name": "ZI_V", "object_type": "cds"}, {"name": "ZCL_A"}]}, project())
    assert [(o["tip"], o["ad"]) for o in r["nesneler"]] == [("DDLS", "ZI_V"), ("CLAS", "ZCL_A")]
    assert r["transport"] == TR and r["kalite"] is False
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_activate", {"name": "", "object_type": "class",
                                                                          "objects": None}, project()))


def t_objectless_tools():
    sap = FakeSap()
    r = gc.collect(sap, "adt_set_transport", {"transport": TR}, project())
    assert r["nesneler"] == [] and r["transport"] == TR and "paket" not in r
    r = gc.collect(sap, "adt_create_transport", {"description": "x", "package": "zpkg"}, project())
    assert r["nesneler"] == [] and r["paket"] == "ZPKG" and r["transport"] == ""
    r = gc.collect(sap, "adt_delete_transport", {"transport": TR, "confirm_transport": TR, "force": True,
                                                 "recursive": False, "remove_locked_objects": False}, project())
    assert r["transport"] == TR
    r = gc.collect(sap, "adt_create_package", {"name": "ZNEW", "description": "d", "super_package": "ZPARENT",
                                               "transport": TR}, project())
    assert r["nesneler"] == [{"ad": "ZNEW", "tip": "DEVC", "paket": "ZPARENT", "yeni": True}]


def t_delete_object_injects_owner():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR})
    r = gc.collect(sap, "adt_delete_object", {"name": "ZCL_A", "object_type": "class", "transport": "",
                                              "confirm_name": "ZCL_A", "force": True}, project())
    assert r["transport"] == TR and r["enjekte_transport"] == TR
    r = gc.collect(sap, "adt_clear_lock", {"name": "ZCL_A", "object_type": "class", "transport": "",
                                           "function_group": ""}, project())
    assert r["transport"] == TR and r["enjekte_transport"] == ""


def t_karma_tools():
    sap = FakeSap(tadir={("PROG", "ZREP"): "ZPKG", ("MSAG", "ZMSG"): "ZPKG"}, owners={"ZREP": TR, "ZMSG": TR})
    r = gc.collect(sap, "adt_generate_screen", {"program": "zrep", "transport": ""}, project())
    assert r["nesneler"][0]["tip"] == "PROG" and r["enjekte_transport"] == TR
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_generate_screen", {"program": "ZNONE", "transport": ""},
                                                    project()))
    r = gc.collect(sap, "adt_generate_adobe", {"interface": "ZIF_F", "form": "ZF_F", "devclass": "$TMP",
                                               "transport": ""}, project())
    assert [(o["tip"], o["paket"], o["yeni"]) for o in r["nesneler"]] == [("SFPI", "$TMP", True), ("SFPF", "$TMP", True)]
    refused("transport_belirsiz", lambda: gc.collect(sap, "adt_generate_adobe", {
        "interface": "ZIF_F", "devclass": "ZPKG", "transport": ""}, project()))
    r = gc.collect(sap, "adt_message_class", {"name": "ZMSG", "action": "write", "package": "", "transport": ""},
                   project())
    assert r["nesneler"][0]["paket"] == "ZPKG" and r["transport"] == TR


def t_teslim_adt():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, sources={"zcl_a": "eski\n"})
    pd = project({"zcl_a.clas.abap": NEW_SRC})
    r = gc.collect_teslim(sap, pd, [{"ad": "ZCL_A", "tip": "class", "kaynak_dosyasi": "zcl_a.clas.abap"},
                                    {"ad": "ZD_X", "tip": "DOMA"}], "zpkg", TR, "adt")
    a, b = r["nesneler"]
    assert a["paket"] == "ZPKG" and not a["yeni"] and a["kaynak_sha256"] == [gq.src_hash(NEW_SRC)] and "fark" in a
    assert b == {"ad": "ZD_X", "tip": "DOMA", "paket": "ZPKG", "yeni": True}
    assert r["teslim"] == {"yontem": "adt"} and r["paket"] == "ZPKG" and r["kalite"] is True
    refused("transport_belirsiz", lambda: gc.collect_teslim(sap, pd, [{"ad": "ZD_X", "tip": "DOMA"}], "ZPKG", "", "adt"))
    refused("bilgi_toplanamadi", lambda: gc.collect_teslim(sap, pd, [], "ZPKG", TR, "adt"))
    refused("bilgi_toplanamadi", lambda: gc.collect_teslim(sap, pd, [], "ZPKG", TR, "ftp"))


def _zip(pd: Path, name="dist/x.zip"):
    p = pd / name
    p.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(p, "w") as z:
        z.writestr("src/zcl_a.clas.abap", NEW_SRC)
        z.writestr("src/zcl_a.clas.xml", b"<x/>")
    return name


def t_teslim_and_abapgit_zip():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"})
    pd = project()
    name = _zip(pd)
    r = gc.collect_teslim(sap, pd, None, "ZPKG", TR, "abapgit", name)
    assert [(o["tip"], o["ad"]) for o in r["nesneler"]] == [("CLAS", "ZCL_A")]
    zsha = r["teslim"]["zip_sha256"]
    assert re.fullmatch(r"[0-9a-f]{64}", zsha)
    g = gc.collect_abapgit(sap, pd, "abapgit_deploy.py", "zpkg", TR, name)
    assert g["abapgit"] == {"script": "abapgit_deploy.py", "paket": "ZPKG", "zip_sha256": zsha}, g["abapgit"]
    assert g["kalite"] is True and g["nesneler"][0]["kaynak_sha256"] == [gq.src_hash(NEW_SRC)]
    g = gc.collect_abapgit(sap, pd, "gui_stage_commit.py")
    assert g["abapgit"] == {"script": "gui_stage_commit.py"} and g["nesneler"] == [] and g["kalite"] is False
    refused("gecersiz_ad", lambda: gc.collect_abapgit(sap, pd, "x; rm -rf /"))
    refused("kaynak_dosyasi_yok", lambda: gc.collect_abapgit(sap, pd, "abapgit_deploy.py", "", "", "yok.zip"))


TESTS = [
    ("push_existing", "paket beyandan geliyor / fark yok / motorun çözeceği transport görünmüyor", t_push_existing),
    ("push_arg_wins", "ajanın verdiği transport sahip transport'la eziliyor", t_push_arg_wins),
    ("push_session", "oturuma sabitlenmiş transport pencerede görünmüyor", t_push_session_fallback),
    ("push_belirsiz", "transport'u belirsiz yazma pencereye transport'suz gidiyor", t_push_transport_belirsiz),
    ("push_local", "$TMP'de transport isteniyor", t_push_local_package),
    ("push_new", "yeni nesnede SAP'tan kaynak okunmaya çalışılıyor", t_push_new_object),
    ("push_unreadable", "aktif kaynak okunamayınca fark boş (değişiklik yok) görünüyor", t_push_unreadable_source),
    ("sql_failure", "TADIR okunamayınca onay bilgisiz gidiyor", t_sql_failure_refuses),
    ("injection", "süzülmemiş ad SQL'e giriyor", t_injection_refused),
    ("bad_type_file", "tanınmayan tip/eksik dosya/FM push'u geçiyor", t_bad_type_and_file),
    ("write_fm", "FM paketi grup üzerinden okunmuyor", t_write_fm),
    ("write_fm_rules", "yanlış grup/olmayan grup/transport'suz FM ya da namespace'li grup", t_write_fm_rules),
    ("creates", "oluşturma araçlarında tip/kalite/transport yanlış", t_creates),
    ("create_existing", "var olan nesnede paket argümandan alınıyor", t_create_existing_uses_sap_package),
    ("activate", "çoklu aktivasyonda nesneler ya da transport eksik", t_activate),
    ("objectless", "nesnesiz araçların bilgisi eksik", t_objectless_tools),
    ("delete_object", "silme sahip transport'a değil hayalet transport'a kaydediliyor", t_delete_object_injects_owner),
    ("karma", "ekran/adobe/mesaj sınıfı bilgisi yanlış", t_karma_tools),
    ("teslim_adt", "teslim listesi yanlış toplanıyor", t_teslim_adt),
    ("teslim_abapgit", "ZIP hash'i teslim ile abapGit onayında farklı", t_teslim_and_abapgit_zip),
]


def main():
    for name, catches, fn in TESTS:
        check(name, catches, fn)
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
