#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — axet_rfc_uret (RFC üreteçleri için onaylı yazma) testleri. SAP yok.

    py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_rfc_uret.py

Sahte launcher ve FakeSap test_gated_flow / test_gated_collect'ten; RFC çağrısı sahte.
Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import ntt_rfc_uret as ru  # noqa: E402
from test_gated_flow import LAUNCHER, Env, gs  # noqa: E402

RESULTS = []
TR = "DS4K900001"
GEN_OK = {"ZND_FM_TCODE_GEN": "SAPLZND_FG_AUTO_GEN", "ZND_FM_TMG_GEN": "SAPLZND_FG_AUTO_GEN",
          "ZND_FM_TABLE_SEED": "SAPLZND_FG_AUTO_GEN", "ZND_FM_BADI_IMPL_GEN": "SAPLZND_FG_AUTO_GEN"}


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


class Rfc:
    """ru.post ve kurulumun yerine: çağrıları kaydeder."""

    def __init__(self):
        self.calls, self.installs = [], []
        gs.ru.post = lambda adt, fm, params, timeout=300: (
            self.calls.append((fm, dict(params))) or
            {"ok": True, "http": 200, "fault": None, "out": {"EV_OK": "X", "EV_MESSAGE": "tamam"}})
        gs._rfc_adt = lambda: object()
        gs._rfc_install = lambda fm: (self.installs.append(fm) or (True, "kuruldu"))
        gs.guardrails.require_writable = _dev


def _dev(*, what="mutation"):
    return None


def _qa(*, what="mutation"):
    raise gs.guardrails.GuardrailViolation("GR_TIER", f"{what} refused — active system tier=QA")


def tcode(**over):
    p = {"IV_ACTION": "CREATE", "IV_TCODE": "ZPM_X", "IV_TEXT": "t", "IV_TYPE": "R",
         "IV_PROGRAM": "ZPM_P", "IV_UPDATE": "X", "IV_DEVCLASS": "ZPM", "IV_TRANSPORT": TR}
    p.update(over)
    return p


def refused(reason, fn):
    try:
        fn()
    except ru.PlanError as exc:
        assert exc.reason == reason, f"{exc.reason} != {reason}: {exc.message}"
        return
    raise AssertionError(f"{reason} bekleniyordu")


# --- plan -----------------------------------------------------------------------
def t_plan_rules():
    p = ru.plan("ZND_FM_TCODE_GEN", tcode())
    assert p == {"islem": "TCODE_CREATE", "nesneler": [{"ad": "ZPM_X", "tip": "TRAN"}],
                 "paket": "ZPM", "transport": TR}, p
    refused("paket_gerekli", lambda: ru.plan("ZND_FM_TCODE_GEN", tcode(IV_DEVCLASS="")))
    refused("transport_belirsiz", lambda: ru.plan("ZND_FM_TCODE_GEN", tcode(IV_TRANSPORT="")))
    assert ru.plan("ZND_FM_TCODE_GEN", tcode(IV_DEVCLASS="$TMP", IV_TRANSPORT=""))["transport"] == ""
    refused("musteri_ad_alani", lambda: ru.plan("ZND_FM_TCODE_GEN", tcode(IV_TCODE="VA01")))
    refused("bilinmeyen_uretec", lambda: ru.plan("RFC_READ_TABLE", {}))
    refused("gecersiz_ad", lambda: ru.plan("ZND_FM_TCODE_GEN", tcode(IV_TRANSPORT="x' or 1=1")))
    refused("bilgi_eksik", lambda: ru.plan("ZND_FM_TCODE_GEN", {"iv-bad": 1}))


def t_plan_tmg():
    post = "SAPLSTRD;0100;KO007-L_DEVCLASS=ZPM;/00|SAPLSTRD;0300;KO008-TRKORR=" + TR + ";/00"
    base = {"IV_TABLE": "ZPM_T", "IV_FUGR": "ZFG_PM", "IV_DEVCLASS": "$TMP", "IV_POST": post}
    p = ru.plan("ZND_FM_TMG_GEN", base)
    assert (p["paket"], p["transport"], p["islem"]) == ("ZPM", TR, "TMG_CREATE"), p
    assert [o["tip"] for o in p["nesneler"]] == ["TOBJ", "FUGR"]
    refused("paket_uyusmazligi", lambda: ru.plan("ZND_FM_TMG_GEN", {
        **base, "IV_POST": post + "|SAPLSTRD;0100;KO007-L_DEVCLASS=ZOTHER;/00"}))
    refused("paket_uyusmazligi", lambda: ru.plan("ZND_FM_TMG_GEN", {**base, "IV_DEVCLASS": "ZPM"}))
    refused("paket_gerekli", lambda: ru.plan("ZND_FM_TMG_GEN", {**base, "IV_POST": ""}))
    refused("transport_belirsiz", lambda: ru.plan("ZND_FM_TMG_GEN", {
        **base, "IV_POST": "SAPLSTRD;0100;KO007-L_DEVCLASS=ZPM;/00"}))
    # RESET: paket SAP'tan okunacak (None), tahmin yok.
    assert ru.plan("ZND_FM_TMG_GEN", {**base, "IV_ACTION": "RESET", "IV_POST": ""})["paket"] is None


def t_plan_seed_badi():
    p = ru.plan("ZND_FM_TABLE_SEED", {"IV_TABLE": "ZPM_T", "IV_ROWS": "A=1", "IV_DELETE_FIRST": "X"})
    assert (p["islem"], p["paket"], p["nesneler"][0]["tip"]) == ("TABLO_SIL_DOLDUR", None, "TABU"), p
    p = ru.plan("ZND_FM_BADI_IMPL_GEN", {"IV_KIND": "CLASSIC", "IV_IMPL": "ZIMP", "IV_DEVCLASS": "$TMP"})
    assert p["nesneler"] == [{"ad": "ZIMP", "tip": "SXCI"}]
    refused("bilgi_eksik", lambda: ru.plan("ZND_FM_BADI_IMPL_GEN", {"IV_KIND": "X", "IV_DEVCLASS": "$TMP"}))


# --- sunucu akışı -----------------------------------------------------------------
def t_tier_refused():
    Env(tfdir=GEN_OK)
    rfc = Rfc()
    gs.guardrails.require_writable = _qa
    out = gs.axet_rfc_uret("ZND_FM_TCODE_GEN", tcode())
    assert out["ok"] is False and out["error"] == "GR_TIER", out
    assert LAUNCHER.requests == [] and rfc.calls == [], "QA'da pencere/RFC olmamalı"


def t_denied_no_rfc():
    Env(tfdir=GEN_OK)
    rfc = Rfc()
    LAUNCHER.reset(karar="reddedildi")
    out = gs.axet_rfc_uret("ZND_FM_TCODE_GEN", tcode())
    assert out["error"] == "approval_denied", out
    assert rfc.calls == [], "redde RFC gitti"
    fact = LAUNCHER.bodies("/approvals")[0]
    assert fact["arac"] == "axet_rfc_uret" and fact["sinif"] == "HER_SEFER", fact
    assert fact["islem"] == "TCODE_CREATE" and fact["transport"] == TR and fact["paket"] == "ZPM", fact
    assert fact["nesneler"][0]["ad"] == "ZPM_X" and fact["nesneler"][0]["tip"] == "TRAN"


def t_pending_no_rfc():
    Env(tfdir=GEN_OK)
    rfc = Rfc()
    LAUNCHER.reset(karar="bekliyor")
    out = gs.axet_rfc_uret("ZND_FM_TCODE_GEN", tcode())
    assert out["error"] == "approval_pending" and rfc.calls == [], out


def t_approved_one_write():
    Env(tfdir=GEN_OK)
    rfc = Rfc()
    out = gs.axet_rfc_uret("ZND_FM_TCODE_GEN", tcode())
    assert out["ok"] is True and out["rfc"]["out"]["EV_OK"] == "X", out
    assert rfc.calls == [("ZND_FM_TCODE_GEN", tcode())], rfc.calls
    assert LAUNCHER.paths().count("/approvals") == 1 and "/results" in LAUNCHER.paths()


def t_unknown_fm_and_bad_package():
    Env(tfdir=GEN_OK, tadir={("TRAN", "ZPM_X"): "ZBASKA"})
    rfc = Rfc()
    assert gs.axet_rfc_uret("RFC_READ_TABLE", {})["error"] == "bilinmeyen_uretec"
    out = gs.axet_rfc_uret("ZND_FM_TCODE_GEN", tcode())
    assert out["error"] == "paket_uyusmazligi", out
    assert LAUNCHER.requests == [] and rfc.calls == []


def t_generator_install_needs_own_approval():
    Env(tfdir={})
    rfc = Rfc()
    LAUNCHER.reset(karar="reddedildi")
    out = gs.axet_rfc_uret("ZND_FM_TCODE_GEN", tcode())
    assert out["error"] == "approval_denied" and rfc.installs == [] and rfc.calls == [], out
    assert LAUNCHER.bodies("/approvals")[0]["islem"] == "JENERATOR_KUR"
    Env(tfdir={})
    rfc = Rfc()
    out = gs.axet_rfc_uret("ZND_FM_TCODE_GEN", tcode())
    assert out["ok"] and rfc.installs == ["ZND_FM_TCODE_GEN"] and len(rfc.calls) == 1, (out, rfc.__dict__)
    assert [b["islem"] for b in LAUNCHER.bodies("/approvals")] == ["JENERATOR_KUR", "TCODE_CREATE"]


def t_hook_review_gate():
    src = b"WRITE 'x'.\r\n"
    params = {"IV_KIND": "HOOK", "IV_ENHNAME": "ZEI_X", "IV_PROGRAM": "SAPMV45A",
              "IV_FULL_NAME": "\\PR:SAPMV45A", "IV_SOURCE": "WRITE 'x'.",
              "IV_DEVCLASS": "$TMP", "IV_TRANSPORT": ""}
    env = Env(files={"hook.abap": src}, tfdir=GEN_OK)
    rfc = Rfc()
    out = gs.axet_rfc_uret("ZND_FM_BADI_IMPL_GEN", params, kaynak_dosyasi="hook.abap")
    assert out["error"] == "inceleme_yok" and rfc.calls == [] and LAUNCHER.requests[:1] != [], out
    assert gs.axet_rfc_uret("ZND_FM_BADI_IMPL_GEN", params)["error"] == "kaynak_dosyasi_gerekli"
    bad = {**params, "IV_SOURCE": "WRITE 'baska'."}
    assert gs.axet_rfc_uret("ZND_FM_BADI_IMPL_GEN", bad, kaynak_dosyasi="hook.abap")["error"] == "kaynak_uyusmuyor"
    env.review("ENHO", "ZEI_X", ["hook.abap"])
    LAUNCHER.reset()
    out = gs.axet_rfc_uret("ZND_FM_BADI_IMPL_GEN", params, kaynak_dosyasi="hook.abap")
    assert out["ok"] and len(rfc.calls) == 1, out
    env.review("ENHO", "ZEI_X", ["hook.abap"], kritik=1)
    out = gs.axet_rfc_uret("ZND_FM_BADI_IMPL_GEN", params, kaynak_dosyasi="hook.abap")
    assert out["error"] == "kritik_bulgu" and len(rfc.calls) == 1, out


def t_registered():
    assert "axet_rfc_uret" in gs.AXET_TOOLS


TESTS = [
    ("plan_rules", "paket tahmini / ad alanı / transport'suz taşınabilir paket", t_plan_rules),
    ("plan_tmg", "TMG popup'larındaki paket/transport okunmuyor ya da çelişki geçiyor", t_plan_tmg),
    ("plan_seed_badi", "tablo doldurma / BAdI türleri yanlış nesne gösteriyor", t_plan_seed_badi),
    ("tier_refused", "DEV dışında pencere açılıyor ya da RFC gidiyor", t_tier_refused),
    ("denied_no_rfc", "ret sonrası RFC gidiyor / pencere bilgisi eksik", t_denied_no_rfc),
    ("pending_no_rfc", "onay beklerken RFC gidiyor", t_pending_no_rfc),
    ("approved_one_write", "onaylı çağrı birden fazla RFC yapıyor ya da sonucu bildirmiyor", t_approved_one_write),
    ("unknown_fm_bad_package", "izinsiz FM ya da başka paketteki nesne geçiyor", t_unknown_fm_and_bad_package),
    ("generator_install", "üreteç kurulumu onaysız yapılıyor", t_generator_install_needs_own_approval),
    ("hook_review", "HOOK kaynağı incelemesiz / farklı kaynakla yazılıyor", t_hook_review_gate),
    ("registered", "araç onaylı sunucuda kayıtlı değil", t_registered),
]


def main():
    saved = (gs.ru.post, gs._rfc_adt, gs._rfc_install, gs.guardrails.require_writable)
    try:
        for name, catches, fn in TESTS:
            check(name, catches, fn)
    finally:
        gs.ru.post, gs._rfc_adt, gs._rfc_install, gs.guardrails.require_writable = saved
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
