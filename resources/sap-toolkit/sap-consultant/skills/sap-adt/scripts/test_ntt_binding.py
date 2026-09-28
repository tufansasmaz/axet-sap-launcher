#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — ntt_binding.py testleri. SAP'ye, ağa hiçbir istek yok (launcher sahte, yerel port).

    PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_binding.py

Çıkış kodu 0 = hepsi geçti.

Sunucu senaryoları alt süreçte koşuyor: `sap_adt_lib` `.conn_adt`'yi içe
aktarılırken ortama yüklüyor, sunucular da bağlantıyı içe aktarılırken bir kez
yakalıyor. Her senaryo kendi geçici klasöründe, kendi `.conn_adt`'siyle ve temiz
bir ortamla başlıyor; biri ötekinin durumunu taşımıyor.
"""
from __future__ import annotations

import inspect
import json
import os
import subprocess
import sys
import tempfile
import threading
import types
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
_READONLY_DIR = _SCRIPTS_DIR.parents[1] / "sap-adt-readonly" / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import ntt_binding as nb  # noqa: E402

RESULTS = []
DEV = "https://dev.example.test:44300"
PRD = "https://prd.example.test:44300"
PAROLA = "Gizli-Parola-7391"


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


def conn_text(url=DEV, client="100", user="DEVUSER", extra=()):
    lines = ["# NTT Studio tarafından yazıldı", f"ADT_SAP_URL={url}", f"ADT_SAP_USER={user}",
             f"ADT_SAP_PASSWORD={PAROLA}"]
    if client is not None:
        lines.append(f"ADT_SAP_CLIENT={client}")
    lines += list(extra)
    return "\n".join(lines) + "\n"


def binding_env(d, url=DEV, client="100", user="DEVUSER"):
    env = {nb.ENV_URL: url, nb.ENV_USER: user, "ADT_CWD": str(d)}
    if client is not None:
        env[nb.ENV_CLIENT] = client
    return env


class Tmp:
    """Geçici proje klasörü + `.conn_adt`."""

    def __init__(self, text=None):
        self._td = tempfile.TemporaryDirectory(prefix="ntt_binding_")
        self.d = Path(self._td.name)
        if text is not None:
            self.write(text)

    def write(self, text):
        (self.d / ".conn_adt").write_text(text, encoding="utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self._td.cleanup()


# --- saf işlevler -------------------------------------------------------------

def t_normalize_url():
    same = [
        ("https://DEV.example.test", "https://dev.example.test:443"),
        ("HTTPS://dev.example.test:443/", "https://dev.example.test:443"),
        ("https://dev.example.test/sap/bc/adt?x=1", "https://dev.example.test:443"),
        ("http://127.0.0.1:8788", "http://127.0.0.1:8788"),
        ("http://127.0.0.1", "http://127.0.0.1:80"),
        ("  https://dev.example.test:44300//  ", "https://dev.example.test:44300"),
        ("https://[::1]:44300/", "https://[::1]:44300"),
    ]
    for raw, want in same:
        got = nb.normalize_url(raw)
        assert got == want, f"normalize_url({raw!r}) = {got!r}, beklenen {want!r}"
    for raw in (None, "", "   ", "dev.example.test", "https://", "https://host:notaport"):
        assert nb.normalize_url(raw) is None, f"{raw!r} ayrıştırılmamalıydı"
    # Farklı sayılması gerekenler.
    pairs = [("https://dev.example.test", "http://dev.example.test"),
             ("https://dev.example.test", "https://dev.example.test:44300"),
             ("https://dev.example.test", "https://prd.example.test"),
             ("https://dev.example.test", "https://evil@dev.example.test")]
    for a, b in pairs:
        assert nb.normalize_url(a) != nb.normalize_url(b), f"{a} ile {b} eşit sayıldı"


def t_parse_conn():
    text = ("# yorum\n\nexport ADT_SAP_URL = 'https://a.test'\nADT_SAP_CLIENT=\"100\"\n"
            "ADT_SAP_USER=dev # satır sonu yorumu\nbozuk satır\nADT_SAP_CLIENT=200\n")
    got = nb.parse_conn(text)
    assert got["ADT_SAP_URL"] == "https://a.test", got
    assert got["ADT_SAP_USER"] == "dev", got
    assert got["ADT_SAP_CLIENT"] == "200", f"son yazılan geçerli olmalı: {got}"


def t_capture_env():
    assert nb.capture_env_binding({}) is None
    assert nb.capture_env_binding({nb.ENV_URL: "   "}) is None
    b = nb.capture_env_binding({nb.ENV_URL: "HTTPS://Dev.Example.Test:443/sap", nb.ENV_CLIENT: " 100 ",
                                nb.ENV_USER: "devUser"})
    assert b.url == "https://dev.example.test:443" and b.client == "100" and b.user == "devuser", b
    assert b.cwd is None


def _check(t, env=None, lib=None, live=None, **bkw):
    base = binding_env(t.d, **bkw)
    binding = nb.capture_env_binding(base)
    environ = dict(base) if env is None else {**base, **env}
    return nb.check(binding, environ=environ, lib=lib, live_client=live)


def t_match_passes():
    with Tmp(conn_text()) as t:
        assert _check(t) is None, _check(t)
    # Büyük/küçük harf, varsayılan port, sondaki / ve yol fark sayılmıyor.
    with Tmp(conn_text(url="HTTPS://DEV.example.test:44300/sap/bc/adt/", client=" 100", user="devuser")) as t:
        assert _check(t) is None, _check(t)
    with Tmp(conn_text(url="https://dev.example.test/")) as t:
        assert _check(t, url="https://dev.example.test:443") is None


def t_each_field_mismatch():
    cases = [
        ("url", conn_text(url=PRD)),
        ("url", conn_text(url="https://dev.example.test:44301")),        # port
        ("url", conn_text(url="http://dev.example.test:44300")),         # şema
        ("url", conn_text(url="https://dev2.example.test:44300")),       # host
        ("client", conn_text(client="200")),
        ("kullanici", conn_text(user="BASKA")),
    ]
    for field, text in cases:
        with Tmp(text) as t:
            got = _check(t)
            assert got is not None and got["alanlar"] == [field] and got["kaynaklar"] == ["conn_adt"], \
                f"{field}: {got}"


def t_missing_file_or_key():
    with Tmp() as t:
        got = _check(t)
        assert got is not None and got["alanlar"] == ["dosya"], f"dosya yok: {got}"
    with Tmp("ADT_SAP_URL=%s\nADT_SAP_CLIENT=100\n" % DEV) as t:
        got = _check(t)
        assert got is not None and got["alanlar"] == ["kullanici"], f"kullanıcı satırı yok: {got}"
    # Client beklenmiyorsa (BTP) satırın olmaması doğru; bekleniyorsa eksik = fark.
    with Tmp(conn_text(client=None)) as t:
        assert _check(t, client=None) is None, _check(t, client=None)
        got = _check(t)
        assert got is not None and got["alanlar"] == ["client"], got
    with Tmp(conn_text(client="100")) as t:
        got = _check(t, client=None)
        assert got is not None and got["alanlar"] == ["client"], f"beklenmeyen client: {got}"


def t_env_and_engine_sources():
    with Tmp(conn_text()) as t:
        got = _check(t, env={"ADT_SAP_URL": PRD})
        assert got is not None and got["kaynaklar"] == ["ortam"], f"ortam: {got}"
        # Ortamda olmayan değer fark değil (motor onu .conn_adt'den alır).
        assert _check(t, env={}) is None
        lib = types.SimpleNamespace(ADT_SAP_URL=PRD, ADT_SAP_CLIENT="100", ADT_SAP_USER="DEVUSER",
                                    find_conn_file=lambda: t.d / ".conn_adt")
        got = _check(t, lib=lib)
        assert got is not None and got["kaynaklar"] == ["motor"], f"motor: {got}"
        live = types.SimpleNamespace(adt_client=types.SimpleNamespace(url=DEV, client="100", user="OTHER"))
        got = _check(t, live=lambda: live)
        assert got is not None and got["kaynaklar"] == ["oturum"] and got["alanlar"] == ["kullanici"], got
        assert _check(t, live=lambda: None) is None, "oturum yokken fark bulunmamalı"


def t_engine_finds_other_file():
    # Motorun bulacağı dosya ADT_CWD'dekinden farklıysa o da okunuyor.
    with Tmp(conn_text()) as t, Tmp(conn_text(url=PRD)) as other:
        lib = types.SimpleNamespace(find_conn_file=lambda: other.d / ".conn_adt")
        got = _check(t, lib=lib)
        assert got is not None and got["alanlar"] == ["url"], got
        assert [p.get("dosya") for p in got["ayrinti"]] == [str(other.d / ".conn_adt")], got


def t_adt_cwd_redirect():
    with Tmp(conn_text()) as t, Tmp(conn_text(url=PRD)) as other:
        got = _check(t, env={"ADT_CWD": str(other.d)})
        assert got is not None and "klasor" in got["alanlar"], got


def t_no_binding_noop():
    with Tmp(conn_text(url=PRD)) as t:
        assert nb.check(None, environ={}, lib=None) is None
        mod = types.SimpleNamespace(tool=lambda **kw: "motor")
        assert nb.install(mod, ["tool"], None) == 0
        assert mod.tool() == "motor"
        del t


def _fake_engine():
    calls = []

    def adt_get_source(name: str, object_type: str = "class") -> dict:
        calls.append(("adt_get_source", name, object_type))
        return {"ok": True}

    return types.SimpleNamespace(adt_get_source=adt_get_source, not_a_tool=42), calls


def t_wrapper_refuses_without_engine_call():
    with Tmp(conn_text()) as t:
        env = binding_env(t.d)
        binding = nb.capture_env_binding(env)
        engine, calls = _fake_engine()
        seen = []
        n = nb.install(engine, ["adt_get_source", "not_a_tool", "missing"], binding, environ=env,
                       on_mismatch=lambda name, found: seen.append((name, found)))
        assert n == 1, n
        assert list(inspect.signature(engine.adt_get_source).parameters) == ["name", "object_type"], \
            "imza kayboldu (HTTP şeması ve onay sarmalayıcısı imzaya bakıyor)"
        assert engine.adt_get_source(name="ZX") == {"ok": True} and len(calls) == 1
        t.write(conn_text(url=PRD))
        out = engine.adt_get_source(name="ZX")
        assert len(calls) == 1, "motor çağrıldı"
        assert out["ok"] is False and out["error"] == "binding_mismatch", out
        assert "NTT Studio" in out["message"] and "yeniden bağlan" in out["message"], out["message"]
        assert seen and seen[0][0] == "adt_get_source", seen
        # Bildirim hatası reddi açmıyor.
        engine2, calls2 = _fake_engine()

        def boom(*a):
            raise RuntimeError("bildirim")

        nb.install(engine2, ["adt_get_source"], binding, environ=env, on_mismatch=boom)
        assert engine2.adt_get_source(name="ZX")["error"] == "binding_mismatch" and not calls2
        # İkinci kurulum sarmalayıcıyı sarmalamıyor.
        assert nb.install(engine, ["adt_get_source"], binding, environ=env) == 0


def t_no_secret_in_result():
    with Tmp(conn_text(url="https://someone:%s@prd.example.test/" % PAROLA)) as t:
        env = binding_env(t.d)
        found = nb.check(nb.capture_env_binding(env), environ=env)
        text = json.dumps(nb.mismatch_result(found), ensure_ascii=False)
        assert PAROLA not in text and "someone" not in text, text
        assert "prd.example.test" in text, "gözlenen adres görünmeli"


def _multiline_evil(target=PRD, decoy=DEV):
    # dotenv çift tırnaklı değeri satırlara yayıyor: NOTE'un içindeki satır
    # dotenv için değer, satır satır okuyan için bir atama (R2 Y-1).
    return conn_text(url=target, extra=['NOTE="', f"ADT_SAP_URL={decoy}", '"'])


def t_multiline_quote_divergence():
    with Tmp(_multiline_evil()) as t:
        env = binding_env(t.d)
        env["ADT_SAP_URL"], env["ADT_SAP_CLIENT"], env["ADT_SAP_USER"] = DEV, "100", "DEVUSER"
        found = nb.check(nb.capture_env_binding(env), environ=env)
        assert found is not None and "url" in found["alanlar"], f"çok satırlı tırnak kaçtı: {found}"
    # Ayrıştırıcılar ayrışıyorsa hangisi haklı olursa olsun red: `export	`, `${...}`.
    for extra, url in ((["export	ADT_SAP_URL=%s" % PRD], DEV), ([], "${NTT_YOK}" + DEV)):
        with Tmp(conn_text(url=url, extra=extra)) as t:
            env = binding_env(t.d)
            found = nb.check(nb.capture_env_binding(env), environ=env)
            assert found is not None, f"ayrışma kaçtı: {extra or url}"
    # Meşru dosyada yanlış alarm yok: launcher parolayı tırnaksız yazıyor.
    for parola in ("Ab\"c#d$e'f", '"basta-tirnak', "${HOME}x", "a #b"):
        text = conn_text().replace(f"ADT_SAP_PASSWORD={PAROLA}", f"ADT_SAP_PASSWORD={parola}")
        with Tmp(text + "ADT_SAP_LANGUAGE=EN\nADT_SAP_CERT_SHA256=\n") as t:
            env = binding_env(t.d)
            found = nb.check(nb.capture_env_binding(env), environ=env)
            assert found is None, f"parola {parola!r} ile meşru dosya reddedildi: {found}"


def t_wrapper_builds_client_first():
    # İstemci henüz kurulmamışken denetim canlı oturumu göremiyordu; kurulum
    # (motorun .conn_adt'yi override=True ile yeniden yüklemesi) denetimden ÖNCE.
    with Tmp(conn_text()) as t:
        env = binding_env(t.d)
        state = {"client": None, "orig": 0}

        def ensure():
            state["client"] = types.SimpleNamespace(adt_client=types.SimpleNamespace(
                url=PRD, client="100", user="DEVUSER"))
            return state["client"]

        def orig(**kw):
            state["orig"] += 1
            return {"ok": True}

        g = nb.wrap("adt_push", orig, nb.capture_env_binding(env), environ=env,
                    live_client=lambda: state["client"], ensure_client=ensure)
        res = g(name="ZX")
        assert res.get("error") == "binding_mismatch" and "oturum" in res["kaynaklar"], res
        assert state["orig"] == 0, "motor çağrıldı"

        def boom():
            raise RuntimeError("kurulamadı")
        g = nb.wrap("adt_push", orig, nb.capture_env_binding(env), environ=env,
                    live_client=lambda: None, ensure_client=boom)
        assert g(name="ZX") == {"ok": True}, "kurulum hatası denetimi kırmamalı; motor kendi hatasını verir"


# --- sunucular (alt süreç) --------------------------------------------------------

class FakeLauncher:
    """Onay ucu yerine: istekleri kaydeder."""

    def __init__(self):
        self.requests = []
        outer = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _send(self, body):
                data = json.dumps(body).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                outer.requests.append(("GET", self.path, None))
                self._send({"ok": True})

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                outer.requests.append(("POST", self.path, json.loads(self.rfile.read(n).decode("utf-8"))))
                if self.path == "/approvals":
                    return self._send({"karar": "izinli", "id": "onay-1", "mesaj": ""})
                self._send({"ok": True})

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"


LAUNCHER = FakeLauncher()

# argv: 1 = betik klasörü, 2 = "gated" | "readonly", 3 = senaryo JSON'u.
# Motor araçlarının yerine imzasını taşıyan kaydediciler konuyor; `_sap` SAP'a
# gitmek yerine "sap" kaydı düşüp hata veriyor. Böylece "motora gitti mi" ve
# "onay sarmalayıcısı SAP'tan bilgi toplamaya başladı mı" ayrı ayrı görülüyor.
_PROBE = r"""
import functools, json, os, sys
from pathlib import Path
scripts, kind, scen = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
sys.path.insert(0, scripts)
if kind == "gated":
    import adt_gated_server as srv
else:
    import adt_readonly_server as srv
engine = srv.engine
calls = []
def fake(name):
    real = getattr(engine, name)
    @functools.wraps(real)
    def f(**kw):
        calls.append(name)
        return {"ok": True, "fake": name}
    return f
for n in ("adt_get_source", "adt_search", "adt_push"):
    setattr(engine, n, fake(n))
if kind == "gated":
    def _sap():
        calls.append("sap")
        raise RuntimeError("SAP'a gidilmemeli")
    srv._sap = _sap
    srv._project_dir = lambda: Path.cwd()
srv.build()
out = {"binding": srv._ENV_BINDING is not None,
       "wrapped": getattr(engine.adt_get_source, "__ntt_binding__", None) is not None,
       "r1": engine.adt_get_source(name="ZX")}
if scen.get("rewrite"):
    Path(".conn_adt").write_text(scen["rewrite"], encoding="utf-8")
if scen.get("reload"):
    # Motorun ilk SAP çağrısında yaptığı override=True yüklemesinin aynısı.
    import sap_adt_lib
    sap_adt_lib.set_explicit_working_dir(os.getcwd())
out["env_url"] = os.environ.get("ADT_SAP_URL")
out["env_ntt_url"] = os.environ.get("NTT_STUDIO_SAP_URL")
out["r2"] = engine.adt_get_source(name="ZX")
# adt_search iki sunucuda da serbest bir okuma aracı (salt okunur yüzeyde adt_sql kapılı).
out["search"] = engine.adt_search(query="Z*")
if kind == "gated":
    try:
        out["push"] = engine.adt_push(name="ZX", object_type="class", source_file="zx.abap")
    except Exception as exc:
        out["push"] = {"exception": str(exc)}
out["calls"] = calls
# Motor print()'i stderr'e çeviriyor (stdio MCP kanalı korunuyor); sonuç stdout'a doğrudan.
sys.stdout.write("RESULT " + json.dumps(out, default=str, ensure_ascii=False) + "\n")
"""


def _clean_env():
    drop = ("NTT_STUDIO_SAP_TIER", nb.ENV_URL, nb.ENV_CLIENT, nb.ENV_USER, "CLAUDE_CWD", "INIT_CWD",
            "COPILOT_CWD", "PWD")
    env = {k: v for k, v in os.environ.items() if not k.startswith("ADT_") and k not in drop}
    env["PYTHONIOENCODING"] = "utf-8"
    env["NTT_STUDIO_SAP_TIER"] = "DEV"
    return env


def _probe(kind, conn, binding=True, scen=None):
    with Tmp(conn) as t:
        env = _clean_env()
        env["ADT_CWD"] = str(t.d)
        env["ADT_APPROVAL_URL"] = LAUNCHER.url
        env["ADT_APPROVAL_TOKEN"] = "t" * 43
        if binding:
            env.update({nb.ENV_URL: DEV, nb.ENV_CLIENT: "100", nb.ENV_USER: "DEVUSER"})
        LAUNCHER.requests.clear()
        r = subprocess.run([sys.executable, "-c", _PROBE, str(_SCRIPTS_DIR if kind == "gated" else _READONLY_DIR),
                            kind, json.dumps(scen or {})], cwd=t.d, env=env, capture_output=True, text=True,
                           encoding="utf-8", timeout=120)
    line = next((l for l in r.stdout.splitlines() if l.startswith("RESULT ")), None)
    assert line, f"probe çıktısı yok (rc={r.returncode}): {r.stderr[-1200:]}"
    out = json.loads(line[len("RESULT "):])
    out["stderr"] = r.stderr
    out["launcher"] = list(LAUNCHER.requests)
    return out


def _refused(res):
    return isinstance(res, dict) and res.get("ok") is False and res.get("error") == "binding_mismatch"


def t_gated_match_passes():
    o = _probe("gated", conn_text())
    assert o["binding"] and o["wrapped"], o
    assert o["r1"].get("fake") == "adt_get_source" and o["r2"].get("fake") == "adt_get_source", o
    assert o["search"].get("fake") == "adt_search", o
    # Yazma, onay sarmalayıcısına kadar ulaştı (SAP'tan bilgi toplamaya başladı).
    assert "sap" in o["calls"], o["calls"]
    assert not any(r[2] and r[2].get("tur") == "baglanti_uyusmazligi" for r in o["launcher"]), o["launcher"]


def t_gated_conn_changed_env_not():
    o = _probe("gated", conn_text(), scen={"rewrite": conn_text(url=PRD)})
    assert o["r1"].get("fake") == "adt_get_source", o["r1"]
    assert o["env_url"] == DEV, f"ortam değişmemiş olmalıydı: {o['env_url']}"
    for key in ("r2", "search", "push"):
        assert _refused(o[key]), f"{key}: {o[key]}"
    assert o["calls"] == ["adt_get_source"], f"motor/SAP çağrıldı: {o['calls']}"
    paths = [r[1] for r in o["launcher"]]
    assert "/approvals" not in paths, f"onay istendi: {paths}"
    events = [r[2] for r in o["launcher"] if r[1] == "/events"]
    assert events and all(e["tur"] == "baglanti_uyusmazligi" for e in events), events
    assert events[0]["arac"] == "adt_get_source" and events[0]["alanlar"] == ["url"], events[0]
    assert PAROLA not in json.dumps(o["launcher"]) and PAROLA not in o["stderr"], "parola sızdı"
    assert "SAP'a gönderilmedi" in o["stderr"], o["stderr"][-600:]


def t_gated_each_field_at_start():
    for field, text in (("url", conn_text(url="https://dev.example.test:44301")),
                        ("client", conn_text(client="200")), ("kullanici", conn_text(user="BASKA"))):
        o = _probe("gated", text)
        assert _refused(o["r1"]) and o["r1"]["alanlar"] == [field], f"{field}: {o['r1']}"
        assert _refused(o["push"]), f"{field}: {o['push']}"
        assert "sap" not in o["calls"] and not o["calls"], f"{field}: {o['calls']}"


def t_gated_injected_env_after_capture():
    # Ajan .conn_adt'ye beklenen değeri de yazıyor; motor dosyayı override=True
    # ile yeniden yüklüyor. Yakalanan değer yine launcher'ınki.
    evil = conn_text(url=PRD, extra=[f"{nb.ENV_URL}={PRD}", f"{nb.ENV_USER}=DEVUSER"])
    o = _probe("gated", conn_text(), scen={"rewrite": evil, "reload": True})
    assert o["env_ntt_url"] == PRD, f"senaryo kurulamadı: {o['env_ntt_url']}"
    assert _refused(o["r2"]) and _refused(o["push"]), o
    assert o["calls"] == ["adt_get_source"], o["calls"]


def t_gated_adt_cwd_redirect():
    with Tmp(conn_text(url=PRD)) as other:
        evil = conn_text(extra=[f"ADT_CWD={other.d}"])
        o = _probe("gated", conn_text(), scen={"rewrite": evil, "reload": True})
        assert _refused(o["r2"]) and "klasor" in o["r2"]["alanlar"], o["r2"]


def t_gated_no_env_old_behaviour():
    o = _probe("gated", conn_text(url=PRD), binding=False)
    assert not o["binding"] and not o["wrapped"], o
    assert o["r1"].get("fake") == "adt_get_source" and o["search"].get("fake") == "adt_search", o
    assert "sap" in o["calls"], "yazma yolu eskisi gibi onay sarmalayıcısına gitmeli"


def t_readonly_same_check():
    o = _probe("readonly", conn_text(), scen={"rewrite": conn_text(user="BASKA")})
    assert o["binding"] and o["wrapped"], o
    assert o["r1"].get("fake") == "adt_get_source", o["r1"]
    assert _refused(o["r2"]) and _refused(o["search"]), o
    assert o["calls"] == ["adt_get_source"], o["calls"]
    assert "SAP'a gönderilmedi" in o["stderr"], o["stderr"][-600:]
    o = _probe("readonly", conn_text(url=PRD), binding=False)
    assert not o["wrapped"] and o["r2"].get("fake") == "adt_get_source", o
    assert "sabitlenmedi" in o["stderr"], o["stderr"][-600:]

def t_gated_multiline_after_start():
    # R2 Y-1: sunucu açıldıktan sonra ajan .conn_adt'yi çok satırlı tırnakla
    # yazıyor; satır satır okuyan DEV, motor PRD görüyordu. İlk yazma PRD'ye gidiyordu.
    for kind in ("gated", "readonly"):
        o = _probe(kind, conn_text(), scen={"rewrite": _multiline_evil()})
        assert o["r1"].get("fake") == "adt_get_source", f"{kind}: {o['r1']}"
        assert _refused(o["r2"]) and _refused(o["search"]), f"{kind}: {o['r2']} / {o['search']}"
        if kind == "gated":
            assert _refused(o["push"]), o["push"]
        assert o["calls"] == ["adt_get_source"], f"{kind}: motor/SAP çağrıldı: {o['calls']}"



def t_server_source_order():
    gated = (_SCRIPTS_DIR / "adt_gated_server.py").read_text(encoding="utf-8")
    ro = (_READONLY_DIR / "adt_readonly_server.py").read_text(encoding="utf-8")
    for label, src in (("gated", gated), ("readonly", ro)):
        cap = src.find("_ENV_BINDING = ntt_binding.capture_env_binding()")
        eng = src.find("import adt_mcp_server")
        ins = src.find("ntt_binding.install(engine")
        assert cap >= 0 and eng >= 0 and ins >= 0, f"{label}: satır eksik"
        assert cap < eng < ins, f"{label}: sıra yanlış (yakala < motor < kur)"
    # Onaylı sunucuda denetim onay sarmalayıcısından SONRA kuruluyor = en dışta.
    build = gated[gated.find("def build()"):]
    assert build.find("make_wrapper(") < build.find("ntt_binding.install("), "denetim en dışta değil"


check("normalize_url: şema/host küçük, port açık, yol yok", "aynı sistemin farklı sayılması / farklının aynı", t_normalize_url)
check("parse_conn: dotenv biçimi (yorum, export, tırnak)", "motorun okuduğundan farklı değer okumak", t_parse_conn)
check("capture_env_binding: URL yoksa None", "boş değerin sabitleme sayılması", t_capture_env)
check("eşleşen bağlantı geçer (harf/port/yol farkı yok sayılır)", "meşru durumda ret", t_match_passes)
check("URL/host/port/şema/client/kullanıcı farkı yakalanır", "tek alanın kaçırılması", t_each_field_mismatch)
check("dosya ya da anahtar eksik → fark; beklenmeyen client → fark", "eksik satırla başka dosyaya düşmek", t_missing_file_or_key)
check("ortam, motor değişkenleri ve canlı oturum da bakılıyor", "yalnızca dosyaya bakmak", t_env_and_engine_sources)
check("motorun bulacağı başka .conn_adt de okunuyor", "başka klasöre sapmak", t_engine_finds_other_file)
check("ADT_CWD değişirse red", "ADT_CWD satırıyla motoru başka dosyaya çevirmek", t_adt_cwd_redirect)
check("bağlantı yakalanmadıysa dokunmuyor", "elle başlatılan sunucuda davranış değişimi", t_no_binding_noop)
check("sarmalayıcı: fark varsa motor çağrılmıyor, imza korunuyor", "reddin motora sızması", t_wrapper_refuses_without_engine_call)
check("ret yükünde parola/kimlik yok", "adrese gömülü parolanın günlüğe gitmesi", t_no_secret_in_result)
check("onaylı sunucu: eşleşen bağlantıda okuma/yazma yolu açık", "meşru çağrının kırılması", t_gated_match_passes)
check("onaylı sunucu: .conn_adt değişti, ortam değişmedi → red + olay", "Y: onaylı yazmanın başka sisteme gitmesi", t_gated_conn_changed_env_not)
check("onaylı sunucu: port/client/kullanıcı farkı → motor ve SAP çağrılmıyor", "alan atlanması", t_gated_each_field_at_start)
check("onaylı sunucu: .conn_adt'ye NTT_STUDIO_SAP_URL yazmak etkisiz", "yakalamanın motordan sonra yapılması", t_gated_injected_env_after_capture)
check("onaylı sunucu: .conn_adt'deki ADT_CWD satırı → red", "motoru başka klasörün dosyasına çevirmek", t_gated_adt_cwd_redirect)
check("onaylı sunucu: ortam yoksa eski davranış", "elle başlatılan sunucunun kırılması", t_gated_no_env_old_behaviour)
check("salt okunur sunucu: aynı denetim, ortam yoksa uyarı", "PRD'den okumak (GR_PII DEV kademesiyle)", t_readonly_same_check)
check(".conn_adt motorla aynı ayrıştırıcıyla okunuyor; ayrışma → red", "R2 Y-1: çok satırlı tırnakla sabitlemeyi DEV'e kandırmak", t_multiline_quote_divergence)
check("sarmalayıcı: istemci denetimden önce kuruluyor", "R2 Y-1: ilk çağrıda canlı oturumun karşılaştırılmaması", t_wrapper_builds_client_first)
check("iki sunucu: açılıştan sonra çok satırlı .conn_adt → red", "R2 Y-1: ilk yazmanın PRD'ye gitmesi", t_gated_multiline_after_start)
check("iki sunucuda sıra: yakala < motor < kur, denetim en dışta", "yakalamanın geç, denetimin içte kalması", t_server_source_order)

passed = sum(1 for r in RESULTS if r[0] == "PASS")
for status, name, catches, detail in RESULTS:
    print(f"[{status}] {name}" + (f"\n        yakaladığı: {catches}\n        {detail}" if status == "FAIL" else ""))
print(f"\n{passed}/{len(RESULTS)} geçti")
sys.exit(0 if passed == len(RESULTS) else 1)
