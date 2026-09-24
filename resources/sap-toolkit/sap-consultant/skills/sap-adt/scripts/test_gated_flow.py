#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — adt_gated_server.py akış testleri. SAP yok; launcher sahte (yerel port).

    py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_flow.py

Gerçek motoru içe aktarır (`mcp` paketi gerekir; SAP bağlantısı gerekmez) ve
test_gated_collect.py'deki FakeSap'i kullanır. Her test yakaladığı hatayı söyler.
Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import inspect
import json
import os
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import adt_gated_server as gs  # noqa: E402
import gated_quality as gq  # noqa: E402
from test_gated_collect import FakeSap  # noqa: E402

engine = gs.engine
RESULTS = []
TOKEN = "t" * 43


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


# --- sahte launcher ------------------------------------------------------------
class FakeLauncher:
    """Onay ucunun yerine geçer: her isteği kaydeder, programlanan cevabı döner."""

    def __init__(self):
        self.requests = []
        self.karar = "izinli"
        self.status = 200
        self.raw = None           # verilirse gövde olarak bu gider (bozuk JSON testi)
        self.health_status = 200
        outer = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _send(self, status, body):
                data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                outer.requests.append(("GET", self.path, self.headers.get("Authorization"), None))
                self._send(outer.health_status, {"ok": outer.health_status == 200})

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(n).decode("utf-8"))
                outer.requests.append(("POST", self.path, self.headers.get("Authorization"), body))
                if outer.raw is not None:
                    return self._send(200, outer.raw)
                if self.path == "/approvals":
                    return self._send(outer.status, {"karar": outer.karar, "id": "onay-1", "mesaj": ""})
                self._send(200, {"ok": True})

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"

    def reset(self, karar="izinli", status=200):
        self.requests.clear()
        self.karar, self.status, self.raw, self.health_status = karar, status, None, 200

    def paths(self):
        return [r[1] for r in self.requests]

    def bodies(self, path):
        return [r[3] for r in self.requests if r[1] == path]


LAUNCHER = FakeLauncher()
os.environ["ADT_APPROVAL_URL"] = LAUNCHER.url
os.environ["ADT_APPROVAL_TOKEN"] = TOKEN


class Env:
    """Bir test için sahte SAP + proje klasörü; gs._sap/_project_dir'i yamalar."""

    def __init__(self, files=None, **sap_kw):
        self.pd = Path(tempfile.mkdtemp(prefix="gf-"))
        for name, data in (files or {}).items():
            (self.pd / name).parent.mkdir(parents=True, exist_ok=True)
            (self.pd / name).write_bytes(data)
        self.sap = FakeSap(**sap_kw)
        gs._sap = lambda: self.sap
        gs._project_dir = lambda: self.pd
        LAUNCHER.reset()

    def review(self, tip, ad, files, **bulgular):
        b = {"kritik": 0, "yuksek": 0, "orta": 0, "dusuk": 0, **bulgular}
        return gq.write_review(self.pd, ad, tip, files, b)


class FakeTool:
    """Motor aracının yerine: gerçek imzayı taşır, çağrıları kaydeder."""

    def __init__(self, name, result=None, raises=None):
        self.calls = []
        self.result = {"ok": True, "success": True} if result is None else result
        self.raises = raises
        real = getattr(engine, name)
        self.__signature__ = inspect.signature(real)
        self.__name__ = name
        self.__doc__ = real.__doc__
        self.__qualname__ = name
        self.__module__ = "fake"

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        if self.raises:
            raise self.raises
        return dict(self.result)


def gated(name, **kw):
    fake = FakeTool(name, **kw)
    return gs.make_wrapper(name, fake), fake


def no_atc():
    calls = []

    def atc(name, object_type="class", variant="DEFAULT"):
        calls.append((name, object_type))
        return {"ok": True, "findings": [{"priority": 1}, {"priority": 2}, {"priority": 2}]}
    engine.adt_atc_check = atc
    return calls


SRC = b"CLASS zcl_a DEFINITION.\nENDCLASS.\n"
PUSH_OWNED = dict(tadir={("CLAS", "ZCL_A"): "ZPAKET"}, owners={"ZCL_A": "DS4K900111"},
                  sources={"zcl_a": "CLASS zcl_a DEFINITION.\nENDCLASS.\n* eski\n"})


# --- testler ---------------------------------------------------------------------
def t_arg_hash_canonical():
    info = {"transport": "DS4K900111", "nesneler": [{"tip": "CLAS", "ad": "ZCL_A", "paket": "Z",
                                                     "kaynak_sha256": ["b" * 64, "a" * 64]}]}
    h1 = gs.arg_hash("adt_push", {"name": "ZCL_A", "transport": ""}, info)
    info2 = {"nesneler": [{"kaynak_sha256": ["a" * 64, "b" * 64], "paket": "Z", "ad": "ZCL_A", "tip": "CLAS",
                           "fark": "başka fark", "kalite": {"kritik": 0}}], "transport": "DS4K900111"}
    h2 = gs.arg_hash("adt_push", {"transport": "", "name": "ZCL_A"}, info2)
    assert h1 == h2, "sıra ya da fark/kalite hash'i değiştirdi"
    assert len(h1) == 64 and all(c in "0123456789abcdef" for c in h1)


def t_arg_hash_changes():
    base = {"transport": "DS4K900111", "nesneler": [{"tip": "CLAS", "ad": "ZCL_A", "paket": "Z",
                                                     "kaynak_sha256": ["a" * 64]}]}
    h = gs.arg_hash("adt_push", {"name": "ZCL_A"}, base)
    assert gs.arg_hash("adt_push", {"name": "ZCL_A"}, {**base, "transport": "DS4K900222"}) != h, \
        "sabitleme değişince aynı onay kullanılır"
    other = {**base, "nesneler": [{**base["nesneler"][0], "kaynak_sha256": ["c" * 64]}]}
    assert gs.arg_hash("adt_push", {"name": "ZCL_A"}, other) != h, "kaynak değişince aynı onay kullanılır"
    assert gs.arg_hash("adt_push", {"name": "ZCL_B"}, base) != h
    assert gs.arg_hash("adt_activate", {"name": "ZCL_A"}, base) != h


def t_classify():
    assert gs.classify("adt_generate_screen", {"mode": "write"}) == "TRANSPORT_ONAYLI"
    assert gs.classify("adt_generate_screen", {"mode": " read "}) == "SERBEST"
    assert gs.classify("adt_generate_adobe", {"mode": "SET_LAYOUT"}) == "TRANSPORT_ONAYLI"
    assert gs.classify("adt_generate_adobe", {"mode": "YENI_MOD"}) == "HER_SEFER", "tanınmayan mod gevşek"
    assert gs.classify("adt_message_class", {"action": "READ"}) == "SERBEST"
    assert gs.classify("adt_message_class", {}) == "mod_belirtilmeli", "msag varsayılanı sessizce okuma"
    assert gs.classify("adt_generate_screen", {"mode": ""}) == "mod_belirtilmeli"
    assert gs.classify("adt_delete_object", {}) == "HER_SEFER"
    assert gs.classify("adt_sql", {}) == "SERBEST"


def t_classes_and_drift():
    gs._check_classification()
    registered = gs._registered_names(engine.mcp) - set(gs.AXET_TOOLS)
    gs._check_drift(registered)
    for bad, word in ((registered | {"adt_yeni_arac"}, "adt_yeni_arac"),
                      (registered - {"adt_push"}, "adt_push")):
        try:
            gs._check_drift(bad)
        except SystemExit as exc:
            assert word in str(exc), str(exc)
            continue
        raise AssertionError(f"drift geçti: {word}")
    saved = set(gs.SERBEST)
    gs.SERBEST.add("adt_push")
    try:
        gs._check_classification()
        raise AssertionError("iki sınıftaki araç geçti")
    except SystemExit as exc:
        assert "adt_push" in str(exc)
    finally:
        gs.SERBEST.clear()
        gs.SERBEST.update(saved)


def t_karma_read_passes():
    Env()
    fn, fake = gated("adt_message_class")
    fn(name="ZMSG", action="read")
    assert len(fake.calls) == 1 and LAUNCHER.requests == [], LAUNCHER.paths()


def t_missing_mode():
    Env()
    fn, fake = gated("adt_message_class")
    out = fn(name="ZMSG")
    assert out["error"] == "mod_belirtilmeli" and not fake.calls and not LAUNCHER.requests


def t_inline_source_refused():
    Env()
    fn, fake = gated("adt_create_cds_view")
    out = fn(name="ZI_V", package="ZPAKET", description="x", source="define view entity ZI_V ...")
    assert out["error"] == "kaynak_dosyasi_gerekli" and not fake.calls and not LAUNCHER.requests


def t_quality_refusals():
    for setup, reason in ((lambda e: None, "inceleme_yok"),
                          (lambda e: e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"], kritik=1), "kritik_bulgu")):
        e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
        setup(e)
        fn, fake = gated("adt_push")
        out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
        assert out.get("error") == reason, out
        assert "/approvals" not in LAUNCHER.paths(), "kalite reddinde onay soruldu"
        ev = LAUNCHER.bodies("/events")
        assert ev and ev[0]["tur"] == "kalite_reddi" and ev[0]["sebep"] == reason, ev
        assert ev[0]["nesneler"] == [{"ad": "ZCL_A", "tip": "CLAS"}]
        assert not fake.calls


def t_source_edit_after_review():
    e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    fn, fake = gated("adt_push")
    LAUNCHER.karar = "bekliyor"
    fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    h1 = LAUNCHER.bodies("/approvals")[0]["arg_hash"]
    (e.pd / "zcl_a.clas.abap").write_bytes(SRC + b"* sonradan\n")
    LAUNCHER.reset("izinli")
    out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert out["error"] == "inceleme_eski", out
    assert not fake.calls and "/approvals" not in LAUNCHER.paths()
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    LAUNCHER.reset("bekliyor")
    fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert LAUNCHER.bodies("/approvals")[0]["arg_hash"] != h1, "düzenlenen kaynak eski onayla eşleşir"


def t_pending_no_engine():
    e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"], orta=2)
    LAUNCHER.karar = "bekliyor"
    fn, fake = gated("adt_push")
    out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert out["error"] == "approval_pending" and out["approval_id"] == "onay-1", out
    assert not fake.calls, "onay beklerken motor çağrıldı"
    req = [r for r in LAUNCHER.requests if r[1] == "/approvals"][0]
    assert req[2] == f"Bearer {TOKEN}"
    fact = req[3]
    assert fact["arac"] == "adt_push" and fact["sinif"] == "TRANSPORT_ONAYLI"
    assert fact["transport"] == "DS4K900111" and fact["transport_bilgi"]["sahip"] == "DEV1"
    o = fact["nesneler"][0]
    assert o["kalite"] == {"kritik": 0, "yuksek": 0, "orta": 2, "dusuk": 0} and o["yeni"] is False
    assert "-* eski" in o["fark"], o.get("fark")


def t_denied_and_modes():
    for karar, error in (("reddedildi", "approval_denied"), ("sure_doldu", "approval_denied"),
                         ("yerel_mod", "yerel_mod"), ("mod_secilmedi", "mod_secilmedi"),
                         ("bilinmeyen", "approval_unavailable")):
        Env(tadir={("DOMA", "ZD"): "ZPAKET"}, owners={}, session_transport="DS4K900111")
        LAUNCHER.karar = karar
        fn, fake = gated("adt_create_domain")
        out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
        assert out["error"] == error, (karar, out)
        assert not fake.calls
    assert out["message"]


def t_izinli_injects_and_reports():
    e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    atc_calls = no_atc()
    fn, fake = gated("adt_push", result={"success": True, "activated": True, "corrnr": "DS4K900999"})
    out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert fake.calls == [{"name": "ZCL_A", "object_type": "class", "source_file": "zcl_a.clas.abap",
                           "transport": "DS4K900111"}], fake.calls
    assert atc_calls == [("ZCL_A", "class")]
    assert out["axet_atc"][0]["toplam"] == 3 and out["axet_atc"][0]["oncelik"] == {"1": 1, "2": 2}
    assert "DS4K900111" in out["axet_uyari"] and "DS4K900999" in out["axet_uyari"]
    res = LAUNCHER.bodies("/results")
    assert len(res) == 1 and res[0]["id"] == "onay-1" and res[0]["sap_sonucu"]["activated"] is True
    assert res[0]["atc"][0]["toplam"] == 3


def t_explicit_transport_not_overridden():
    # Sahipsiz nesne: motor argümandaki transport'u yönlendirmez, katman da üstüne enjekte etmez.
    e = Env({"zcl_a.clas.abap": SRC}, **{**PUSH_OWNED, "owners": {}})
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    no_atc()
    fn, fake = gated("adt_push")
    fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap", transport="ds4k900222")
    assert fake.calls[0]["transport"] == "ds4k900222"
    assert LAUNCHER.bodies("/approvals")[0]["transport"] == "DS4K900222"


def t_toolfailure_reported_and_reraised():
    Env(tadir={("DOMA", "ZD"): "ZPAKET"}, session_transport="DS4K900111")
    payload = {"ok": False, "error": "activation failed", "error_type": "ActivationError"}
    fn, fake = gated("adt_create_domain", raises=engine.ToolFailure(json.dumps(payload)))
    try:
        fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
        raise AssertionError("ToolFailure yutuldu")
    except engine.ToolFailure:
        pass
    res = LAUNCHER.bodies("/results")
    assert res == [{"id": "onay-1", "sap_sonucu": payload}], res


def t_delete_preview_passes():
    Env(tadir={("CLAS", "ZCL_A"): "ZPAKET"}, owners={"ZCL_A": "DS4K900111"})
    fn, fake = gated("adt_delete_object")
    fn(name="ZCL_A", object_type="class")
    fn(name="ZCL_A", object_type="class", force=True)
    fn(name="ZCL_A", object_type="class", confirm_name="ZCL_A")
    assert len(fake.calls) == 3 and not LAUNCHER.requests, LAUNCHER.paths()
    LAUNCHER.karar = "bekliyor"
    out = fn(name="ZCL_A", object_type="class", force=True, confirm_name="YANLIS")
    assert out["error"] == "approval_pending", "eşleşmeyen confirm onaysız geçti"
    assert LAUNCHER.bodies("/approvals")[0]["sinif"] == "HER_SEFER"
    fn2, fake2 = gated("adt_set_transport")
    LAUNCHER.reset()
    fn2(transport="")
    assert fake2.calls and not LAUNCHER.requests


def t_env_missing_unavailable():
    Env(tadir={("DOMA", "ZD"): "ZPAKET"}, session_transport="DS4K900111")
    saved = os.environ.pop("ADT_APPROVAL_TOKEN")
    try:
        fn, fake = gated("adt_create_domain")
        out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
    finally:
        os.environ["ADT_APPROVAL_TOKEN"] = saved
    assert out["error"] == "approval_unavailable" and not fake.calls and not LAUNCHER.requests


def t_launcher_401_is_unavailable():
    for status, raw in ((401, None), (200, b"<html>")):
        Env(tadir={("DOMA", "ZD"): "ZPAKET"}, session_transport="DS4K900111")
        LAUNCHER.status, LAUNCHER.raw = status, raw
        fn, fake = gated("adt_create_domain")
        out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
        assert out["error"] == "approval_unavailable", (status, out)
        assert not fake.calls


def t_collect_error_and_bad_args():
    Env()
    fn, fake = gated("adt_create_domain")
    out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10,
             transport="X' OR 1=1")
    assert out["error"] == "gecersiz_ad" and not fake.calls and not LAUNCHER.requests
    Env(fail_sql=True)
    out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
    assert out["error"] == "bilgi_toplanamadi"
    try:
        fn(name="ZD", bilinmeyen=1)
        raise AssertionError("bilinmeyen argüman geçti")
    except TypeError:
        pass


def t_namespace_review_path():
    e = Env({"src/#abc#cl_x.clas.abap": b"CLASS /abc/cl_x.\n"},
            tadir={("CLAS", "/ABC/CL_X"): "/ABC/PAKET"}, owners={"/ABC/CL_X": "DS4K900111"})
    out = gs.axet_inceleme_kaydet(nesne="/abc/cl_x", tip="class",
                                  kaynak_dosyalari=["src/#abc#cl_x.clas.abap"],
                                  bulgular={"kritik": 0, "yuksek": 1})
    assert out["ok"] and out["kayit"].endswith("CLAS_#ABC#CL_X.json"), out
    assert (e.pd / ".sap-review" / "CLAS_#ABC#CL_X.json").is_file()
    LAUNCHER.karar = "bekliyor"
    fn, _ = gated("adt_push")
    res = fn(name="/ABC/CL_X", object_type="class", source_file="src/#abc#cl_x.clas.abap")
    assert res["error"] == "approval_pending", res


def t_inceleme_kaydet_refuses():
    e = Env({"a.abap": b"x\n"})
    assert gs.axet_inceleme_kaydet("ZCL_A", "class", ["yok.abap"], {"kritik": 0})["error"] == "gecersiz_inceleme"
    assert gs.axet_inceleme_kaydet("ZCL A", "class", ["a.abap"], {"kritik": 0})["error"] == "gecersiz_ad"
    out = gs.axet_inceleme_kaydet("ZCL_A", "class", ["a.abap"], {"kritik": 2})
    assert out["ok"] and out["message"] == gs.MESAJ["kritik_bulgu"]
    assert not LAUNCHER.requests
    assert not (e.pd / ".sap-review" / "CLAS_ZCL A.json").exists()


def t_teslim():
    e = Env({"zcl_a.clas.abap": SRC}, tadir={})
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    out = gs.axet_teslim(nesneler=[{"ad": "ZCL_A", "tip": "class", "kaynak_dosyasi": "zcl_a.clas.abap"}],
                         paket="ZPAKET", transport="DS4K900111")
    assert out["ok"] and out["onay_id"] == "onay-1", out
    fact = LAUNCHER.bodies("/approvals")[0]
    assert fact["arac"] == "axet_teslim" and fact["teslim"] == {"yontem": "adt"} and fact["paket"] == "ZPAKET"
    assert fact["nesneler"][0]["yeni"] is True and fact["nesneler"][0]["paket"] == "ZPAKET"
    Env({"zcl_a.clas.abap": SRC}, tadir={})
    out = gs.axet_teslim(nesneler=[{"ad": "ZCL_A", "tip": "class", "kaynak_dosyasi": "zcl_a.clas.abap"}],
                         paket="ZPAKET", transport="DS4K900111")
    assert out["error"] == "inceleme_yok" and "/approvals" not in LAUNCHER.paths()


def t_abapgit_onay():
    Env()
    out = gs.axet_abapgit_onay(script="deploy.py", paket="ZPAKET", transport="DS4K900111", ust_onay="onay-0")
    assert out == {"ok": True, "onay_id": "onay-1"}, out
    fact = LAUNCHER.bodies("/approvals")[0]
    assert fact["ust_onay"] == "onay-0" and fact["abapgit"]["script"] == "deploy.py"
    assert out == gs.axet_abapgit_onay(script="deploy.py", paket="ZPAKET", transport="DS4K900111",
                                       ust_onay="onay-0")
    h = [b["arg_hash"] for b in LAUNCHER.bodies("/approvals")]
    assert h[0] == h[1], "aynı çağrı farklı hash üretti"
    assert gs.axet_abapgit_onay(script="../x.sh")["error"] == "gecersiz_ad"


def t_heartbeat():
    Env()
    dead = []
    hb = gs.Heartbeat(interval=0.01, max_miss=3, on_dead=lambda: dead.append(1))
    LAUNCHER.health_status = 401
    assert hb.tick() and hb.tick()
    LAUNCHER.health_status = 200
    assert hb.tick() and hb.misses == 0, "başarılı yoklama sayacı sıfırlamadı"
    LAUNCHER.health_status = 500
    assert hb.tick() and hb.tick() and not dead
    assert hb.tick() is False and dead == [1]
    assert all(r[2] == f"Bearer {TOKEN}" for r in LAUNCHER.requests)


def t_main_refuses_stdio():
    called = []
    saved = gs.build, engine.run_http
    gs.build = lambda: called.append("build") or set()
    engine.run_http = lambda *a, **k: called.append("run_http")
    try:
        gs.main([])
        raise AssertionError("stdio'da başladı")
    except SystemExit as exc:
        assert "stdio" in str(exc) and "--http" in str(exc), str(exc)
    finally:
        gs.build, engine.run_http = saved
    assert not called, f"reddetmeden önce çalıştı: {called}"


def t_build():
    """En son çalışır: motor global'lerini gerçekten değiştirir."""
    real_sql = engine.adt_sql
    tools = gs.build()
    assert set(gs.AXET_TOOLS) <= tools, tools
    assert len(tools) == 53, len(tools)
    for name in gs.TRANSPORT_ONAYLI | gs.HER_SEFER | set(gs.KARMA):
        assert getattr(getattr(engine, name), "_axet_gated", False), f"{name} sarmalanmadı"
    for name in gs.SERBEST:
        assert not getattr(getattr(engine, name), "_axet_gated", False), f"{name} gereksiz sarmalandı"
    assert engine.adt_sql is real_sql
    specs = engine._http_tool_specs()
    assert getattr(specs["adt_push"]["fn"], "_axet_gated", False), "HTTP sarmalayıcıyı görmüyor"
    assert "axet_teslim" in specs and specs["axet_teslim"]["schema"]["properties"]["nesneler"]


TESTS = [
    ("arg_hash_canonical", "aynı çağrı farklı hash alıyor ya da fark/kalite hash'e giriyor", t_arg_hash_canonical),
    ("arg_hash_changes", "transport/kaynak değişince eski onay geçerli sayılıyor", t_arg_hash_changes),
    ("classify", "KARMA mod gevşek sınıflanıyor ya da eksik mod okuma sayılıyor", t_classify),
    ("classes_and_drift", "sınıflanmamış/kaybolmuş/iki sınıflı araçla sunucu başlıyor", t_classes_and_drift),
    ("karma_read_passes", "KARMA okuma pencere açıyor", t_karma_read_passes),
    ("missing_mode", "mod verilmeyen KARMA çağrısı geçiyor", t_missing_mode),
    ("inline_source", "satır içi kaynak kalite kapısını atlıyor", t_inline_source_refused),
    ("quality_refusals", "incelenmemiş/kritik kaynak için onay soruluyor ya da günlüğe düşmüyor", t_quality_refusals),
    ("source_edit_after_review", "incelemeden sonra düzenlenen kaynak geçiyor", t_source_edit_after_review),
    ("pending_no_engine", "onay beklerken SAP'a yazılıyor ya da pencere eksik bilgi alıyor", t_pending_no_engine),
    ("denied_and_modes", "ret/yerel mod/anlaşılmayan karar yazmaya izin veriyor", t_denied_and_modes),
    ("izinli_injects", "izinli çağrı onaylanan transport'a gitmiyor ya da sonuç/ATC bildirilmiyor",
     t_izinli_injects_and_reports),
    ("explicit_transport", "verilen transport eziliyor", t_explicit_transport_not_overridden),
    ("toolfailure", "SAP hatası günlüğe düşmüyor ya da yutuluyor", t_toolfailure_reported_and_reraised),
    ("delete_preview", "önizleme silme pencere açıyor ya da eşleşmeyen confirm onaysız geçiyor",
     t_delete_preview_passes),
    ("env_missing", "onay ucu yokken yazılıyor", t_env_missing_unavailable),
    ("launcher_401", "401/bozuk cevap izin sayılıyor", t_launcher_401_is_unavailable),
    ("collect_error", "geçersiz argüman/okunamayan SAP bilgisiyle onay soruluyor", t_collect_error_and_bad_args),
    ("namespace_review", "namespace'li nesnenin incelemesi bulunamıyor", t_namespace_review_path),
    ("inceleme_kaydet", "geçersiz inceleme kaydı yazılıyor", t_inceleme_kaydet_refuses),
    ("teslim", "teslim penceresi eksik/incelemesiz geçiyor", t_teslim),
    ("abapgit_onay", "abapGit onayı üst onayı taşımıyor ya da hash kararsız", t_abapgit_onay),
    ("heartbeat", "launcher ölünce sunucu açık kalıyor", t_heartbeat),
    ("main_stdio", "stdio'da başlayıp onayı atlıyor", t_main_refuses_stdio),
    ("build", "yazan araç sarmalanmıyor ya da HTTP sarmalayıcıyı görmüyor", t_build),
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
