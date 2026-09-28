#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — ntt_tier.py testleri. SAP'ye, ağa hiçbir istek yok.

    PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_tier.py

Çıkış kodu 0 = hepsi geçti.

Neden alt süreçler: `guardrails`, `sap_adt_lib` ve sunucular modül düzeyinde
durum tutuyor (ortam, `.conn_adt` yolu, sarmalanmış işlev). Her senaryo kendi
geçici klasöründe, kendi `.conn_adt`'siyle ve temiz bir ortamla ayrı bir
Python sürecinde koşuyor; biri ötekinin durumunu taşımıyor.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import types
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
_READONLY_SERVER = _SCRIPTS_DIR.parents[1] / "sap-adt-readonly" / "scripts" / "adt_readonly_server.py"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import ntt_tier  # noqa: E402

RESULTS = []


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


# --- Saf işlevler ------------------------------------------------------------

def t_stricter_table():
    cases = [
        ("DEV", "DEV", "DEV"), ("DEV", "QA", "QA"), ("QA", "DEV", "QA"),
        ("DEV", "PRD", "PRD"), ("PRD", "DEV", "PRD"), ("QA", "PRD", "PRD"),
        ("DEV", None, "DEV"), (None, "QA", "QA"), (None, None, None),
        # Tanınmayan değer en kısıtlayıcı: DEV'e düşmesin.
        ("DEV", "WEIRD", "WEIRD"), ("PRD", "WEIRD", "WEIRD"),
    ]
    for a, b, want in cases:
        got = ntt_tier.stricter(a, b)
        assert got == want, f"stricter({a},{b}) = {got}, beklenen {want}"


def t_capture_env():
    assert ntt_tier.capture_env_tier({}) is None
    assert ntt_tier.capture_env_tier({"NTT_STUDIO_SAP_TIER": "  "}) is None
    assert ntt_tier.capture_env_tier({"NTT_STUDIO_SAP_TIER": " qa "}) == "qa"


def _fake_guardrails(tier_from_conn):
    mod = types.SimpleNamespace()
    mod._TIER_ALIASES = {"DEV": "DEV", "SANDBOX": "DEV", "QA": "QA", "PRD": "PRD", "PROD": "PRD"}
    state = {"conn": tier_from_conn}

    def get_active_tier():
        if isinstance(state["conn"], Exception):
            raise state["conn"]
        return state["conn"]

    mod.get_active_tier = get_active_tier
    return mod, state


def t_install_fake():
    mod, state = _fake_guardrails("DEV")
    assert ntt_tier.install(mod, "QA") is True
    assert mod.get_active_tier() == "QA", "conn DEV + ortam QA → QA olmalı"
    state["conn"] = "PRD"
    assert mod.get_active_tier() == "PRD", "conn PRD + ortam QA → PRD (daha kısıtlayıcı)"
    state["conn"] = "SANDBOX"
    assert mod.get_active_tier() == "QA", "SANDBOX (=DEV) ortam QA'yı gevşetemez"
    state["conn"] = RuntimeError("okunamadı")
    assert mod.get_active_tier() == "QA", "okuma hatası kapıyı açmamalı"
    assert ntt_tier.pinned_tier(mod) == "QA"


def t_install_no_env_noop():
    mod, _ = _fake_guardrails("DEV")
    before = mod.get_active_tier
    assert ntt_tier.install(mod, None) is False
    assert mod.get_active_tier is before, "ortam değeri yoksa dokunulmamalı"
    assert ntt_tier.pinned_tier(mod) is None


def t_install_twice_no_double_wrap():
    mod, state = _fake_guardrails("DEV")
    ntt_tier.install(mod, "PRD")
    ntt_tier.install(mod, "DEV")
    # İkinci kurulum özgün işlevi sarmalı, ilk sarmalayıcıyı değil; yoksa ilk
    # sabitleme (PRD) sessizce kalır ve davranış tahmin edilemez olurdu.
    assert mod.get_active_tier() == "DEV", mod.get_active_tier()
    assert ntt_tier.pinned_tier(mod) == "DEV"


# --- Gerçek guardrails, alt süreçte ------------------------------------------

_PROBE = r"""
import json, os, sys
sys.path.insert(0, sys.argv[1])
import ntt_tier
env_tier = ntt_tier.capture_env_tier()
import guardrails, sap_adt_lib
ntt_tier.install(guardrails, env_tier)
out = {"pinned": ntt_tier.pinned_tier(guardrails), "tier": guardrails.get_active_tier()}
try:
    guardrails.require_writable_tier(what="test")
    out["write"] = "open"
except guardrails.GuardrailViolation as exc:
    out["write"] = "GR_TIER" if "GR_TIER" in str(exc) or getattr(exc, "code", "") == "GR_TIER" else str(exc)
try:
    guardrails.require_data_access("KNA1")
    out["pii"] = "open"
except guardrails.GuardrailViolation:
    out["pii"] = "GR_PII"
# Motorun .conn_adt'yi override=True ile ortama yüklemesi: .conn_adt'ye yazılmış
# bir NTT_STUDIO_SAP_TIER satırı ortamı değiştirir ama sabitlenen değeri değiştirmemeli.
sap_adt_lib.set_explicit_working_dir(os.getcwd())
out["env_after_reload"] = os.environ.get("NTT_STUDIO_SAP_TIER")
out["tier_after_reload"] = guardrails.get_active_tier()
print("RESULT " + json.dumps(out))
"""


def _clean_env(env_tier):
    env = {k: v for k, v in os.environ.items()
           if not k.startswith("ADT_") and k not in ("NTT_STUDIO_SAP_TIER", "CLAUDE_CWD", "INIT_CWD", "COPILOT_CWD", "PWD")}
    if env_tier is not None:
        env["NTT_STUDIO_SAP_TIER"] = env_tier
    env["PYTHONIOENCODING"] = "utf-8"
    return env


def _probe(conn_lines, env_tier):
    with tempfile.TemporaryDirectory(prefix="ntt_tier_") as d:
        Path(d, ".conn_adt").write_text(
            "ADT_SAP_URL=http://127.0.0.1:9\nADT_SAP_USER=X\nADT_SAP_PASSWORD=x\n" + "".join(l + "\n" for l in conn_lines),
            encoding="utf-8")
        r = subprocess.run([sys.executable, "-c", _PROBE, str(_SCRIPTS_DIR)], cwd=d, env=_clean_env(env_tier),
                           capture_output=True, text=True, encoding="utf-8", timeout=60)
    line = next((l for l in r.stdout.splitlines() if l.startswith("RESULT ")), None)
    assert line, f"probe çıktısı yok (rc={r.returncode}): {r.stderr[-800:]}"
    return json.loads(line[len("RESULT "):])


def t_real_conn_dev_env_qa():
    # Asıl açık: ajan .conn_adt'ye DEV yazıyor, sistem QA.
    o = _probe(["ADT_SAP_TIER=DEV"], "QA")
    assert o["tier"] == "QA" and o["write"] == "GR_TIER" and o["pii"] == "GR_PII", o


def t_real_conn_line_deleted_env_prd():
    # Satırı silmek: motor tek başına DEV varsayardı.
    o = _probe([], "PRD")
    assert o["tier"] == "PRD" and o["write"] == "GR_TIER" and o["pii"] == "GR_PII", o


def t_real_conn_prd_env_dev():
    # .conn_adt yalnızca daha kısıtlayıcı yöne çekebilir.
    o = _probe(["ADT_SAP_TIER=PRD"], "DEV")
    assert o["tier"] == "PRD" and o["write"] == "GR_TIER", o


def t_real_env_dev_conn_missing_line():
    o = _probe([], "DEV")
    assert o["tier"] == "DEV" and o["write"] == "open" and o["pii"] == "open", o


def t_real_no_env_vendor_behaviour():
    # Ortam değeri yoksa (elle başlatılmış sunucu) motorun kendi davranışı aynen.
    o = _probe(["ADT_SAP_TIER=QA"], None)
    assert o["pinned"] is None and o["tier"] == "QA", o


def t_real_conn_env_injection_after_capture():
    # .conn_adt'ye NTT_STUDIO_SAP_TIER=DEV yazmak: motor onu ortama yüklüyor,
    # ama değer motor içe aktarılmadan önce yakalandığı için etkisiz.
    o = _probe(["ADT_SAP_TIER=DEV", "NTT_STUDIO_SAP_TIER=DEV"], "QA")
    assert o["env_after_reload"] == "DEV", f"ön koşul: yeniden yükleme ortamı ezmeliydi: {o}"
    assert o["tier_after_reload"] == "QA" and o["pinned"] == "QA", o


# --- Sunucular ---------------------------------------------------------------

_GATED_MAIN = r"""
import sys
sys.path.insert(0, sys.argv[1])
import adt_gated_server as gs
gs.main(["--http", "--port", "1"])
"""


def _gated(env_tier):
    with tempfile.TemporaryDirectory(prefix="ntt_tier_g_") as d:
        Path(d, ".conn_adt").write_text("ADT_SAP_URL=http://127.0.0.1:9\nADT_SAP_TIER=DEV\n", encoding="utf-8")
        env = _clean_env(env_tier)
        env["ADT_CWD"] = d
        return subprocess.run([sys.executable, "-c", _GATED_MAIN, str(_SCRIPTS_DIR)], cwd=d, env=env,
                              capture_output=True, text=True, encoding="utf-8", timeout=90)


def t_gated_refuses_non_dev():
    for tier in ("QA", "PRD"):
        r = _gated(tier)
        assert r.returncode != 0, f"{tier}: sunucu başladı (rc=0)"
        assert "BAŞLAMIYOR" in r.stderr and tier in r.stderr, f"{tier}: {r.stderr[-600:]}"


def t_server_source_order():
    gated = (_SCRIPTS_DIR / "adt_gated_server.py").read_text(encoding="utf-8")
    ro = _READONLY_SERVER.read_text(encoding="utf-8")
    for label, src in (("gated", gated), ("readonly", ro)):
        cap = src.find("_ENV_TIER = ntt_tier.capture_env_tier()")
        eng = src.find("import adt_mcp_server")
        ins = src.find("ntt_tier.install(guardrails, _ENV_TIER)")
        assert cap >= 0 and eng >= 0 and ins >= 0, f"{label}: satır eksik"
        assert cap < eng < ins, f"{label}: sıra yanlış (yakala < motor < kur)"


check("stricter: daha kısıtlayıcı olan, tanınmayan en kısıtlayıcı", "DEV'e düşen bir sıralama", t_stricter_table)
check("capture_env_tier: boş = None", "boş değerin sabitleme sayılması", t_capture_env)
check("install: conn gevşek olsa da ortam kademesi", "sarmalayıcının conn'a teslim olması", t_install_fake)
check("install: ortam yoksa dokunmuyor", "elle başlatılan sunucuda davranış değişimi", t_install_no_env_noop)
check("install: iki kez kurulunca özgün işlev sarılıyor", "iç içe sarmalayıcı", t_install_twice_no_double_wrap)
check("gerçek guardrails: conn DEV + ortam QA → GR_TIER, GR_PII", "Y3: .conn_adt ile kapıyı açmak", t_real_conn_dev_env_qa)
check("gerçek guardrails: satır silinmiş + ortam PRD → PRD", "motorun DEV varsayılanı", t_real_conn_line_deleted_env_prd)
check("gerçek guardrails: conn PRD + ortam DEV → PRD", "kısıtlamanın yok sayılması", t_real_conn_prd_env_dev)
check("gerçek guardrails: ortam DEV, satır yok → DEV (yazma açık)", "DEV'in yanlışlıkla kapanması", t_real_env_dev_conn_missing_line)
check("gerçek guardrails: ortam yok → motorun davranışı", "sarmalayıcının boşta devreye girmesi", t_real_no_env_vendor_behaviour)
check(".conn_adt'ye NTT_STUDIO_SAP_TIER yazmak etkisiz", "yakalamanın motordan sonra yapılması", t_real_conn_env_injection_after_capture)
check("onaylı sunucu QA/PRD ortamında başlamıyor", "yazan yüzeyin DEV dışında açılması", t_gated_refuses_non_dev)
check("iki sunucuda sıra: yakala < motor < kur", "yakalamanın geç yapılması", t_server_source_order)

passed = sum(1 for r in RESULTS if r[0] == "PASS")
for status, name, catches, detail in RESULTS:
    print(f"[{status}] {name}" + (f"\n        yakaladığı: {catches}\n        {detail}" if status == "FAIL" else ""))
print(f"\n{passed}/{len(RESULTS)} geçti")
sys.exit(0 if passed == len(RESULTS) else 1)
