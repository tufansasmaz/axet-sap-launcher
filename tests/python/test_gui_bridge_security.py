#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — SAP GUI Scripting köprüsünün kimlik ve PRD kapısı testleri.

    PYTHONIOENCODING=utf-8 py -3 tests/python/test_gui_bridge_security.py

Gerçek SAP GUI'ye DOKUNMAZ: `pythoncom`/`win32com`/`win32gui` import'tan önce
sahteleriyle değiştiriliyor, `get_application` sahte bir GuiApplication
döndürüyor. Kullanıcının makinesinde açık bir SAP oturumu olsa bile test ona
bağlanamaz - köprüye tek bir gerçek COM çağrısı bile gitmiyor.

Köprünün handler'ı gerçek bir HTTPServer'da, rastgele portta koşuyor; yani
test edilen şey HTTP katmanının kendisi (başlıklar, durum kodları), handler
fonksiyonlarının ayrı ayrı çağrılması değil. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import http.client
import importlib.util
import json
import os
import sys
import threading
import types
from http.server import HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / "resources" / "sap-gui-scripting" / "sap_gui_scripting_bridge.py"
TOKEN = "t" * 43


def _fake_pywin32() -> None:
    """Köprü import anında pywin32 istiyor. Gerçeği yüklenirse bir hata bir
    gün `GetObject("SAPGUI")`'ye ulaşıp kullanıcının oturumuna bağlanabilir;
    sahtesi bunu imkânsız kılıyor."""
    pythoncom = types.ModuleType("pythoncom")
    pythoncom.CoInitialize = lambda: None
    pythoncom.CoUninitialize = lambda: None
    win32com = types.ModuleType("win32com")
    client = types.ModuleType("win32com.client")

    def _no_com(*_a, **_k):
        raise AssertionError("test gerçek COM'a gitmeye çalıştı")

    client.GetObject = _no_com
    win32com.client = client
    win32gui = types.ModuleType("win32gui")
    win32gui.EnumWindows = _no_com
    sys.modules.update({"pythoncom": pythoncom, "win32com": win32com,
                        "win32com.client": client, "win32gui": win32gui})


_fake_pywin32()
_spec = importlib.util.spec_from_file_location("gui_bridge", BRIDGE)
bridge = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bridge)


# --------------------------------------------------------------------------
# Sahte SAP GUI nesneleri - yalnızca köprünün dokunduğu kadarı
# --------------------------------------------------------------------------

class FakeComp:
    def __init__(self):
        self.text = None
        self.pressed = 0

    @property
    def Text(self):  # noqa: N802 - COM adı
        return self.text or ""

    @Text.setter
    def Text(self, value):  # noqa: N802
        self.text = value

    def Press(self):  # noqa: N802
        self.pressed += 1


class FakeWindow:
    def __init__(self):
        self.vkeys: list[int] = []

    def sendVKey(self, vkey):  # noqa: N802
        self.vkeys.append(vkey)


class FakeInfo:
    def __init__(self, sid, client):
        self.SystemName = sid
        self.Client = client


class BrokenInfo:
    @property
    def SystemName(self):  # noqa: N802
        raise RuntimeError("okunamadı")

    Client = "100"


class FakeSession:
    Busy = False

    def __init__(self, info):
        self.Info = info
        self.comp = FakeComp()
        self.ActiveWindow = FakeWindow()

    def findById(self, _id):  # noqa: N802
        return self.comp


class FakeCollection:
    def __init__(self, items):
        self._items = items

    @property
    def Count(self):  # noqa: N802
        return len(self._items)

    def ElementAt(self, i):  # noqa: N802
        return self._items[i]


class FakeConnection:
    Description = "sahte"

    def __init__(self, sessions):
        self.Children = FakeCollection(sessions)


class FakeApp:
    def __init__(self, sessions):
        self.Connections = FakeCollection([FakeConnection(sessions)])


# --------------------------------------------------------------------------
# Sunucu ve istek yardımcıları
# --------------------------------------------------------------------------

STATE: dict = {"app_calls": 0}
SESSIONS: list = []


def _fake_get_application():
    STATE["app_calls"] += 1
    return FakeApp(SESSIONS)


bridge.get_application = _fake_get_application

server = HTTPServer(("127.0.0.1", 0), bridge.build_handler(TOKEN))
PORT = server.server_address[1]
threading.Thread(target=server.serve_forever, daemon=True).start()


def req(method: str, path: str, body=None, headers: dict | None = None, token: str | None = TOKEN):
    conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=10)
    h = dict(headers or {})
    if token is not None:
        h.setdefault("Authorization", f"Bearer {token}")
    data = None
    if body is not None:
        data = body if isinstance(body, (bytes, str)) else json.dumps(body)
        h.setdefault("Content-Type", "application/json")
    conn.request(method, path, body=data, headers=h)
    res = conn.getresponse()
    raw = res.read().decode("utf-8")
    conn.close()
    try:
        parsed = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        parsed = raw
    return res.status, parsed, res


FAILS: list[str] = []
PASSES = 0


def check(name: str, cond: bool, detail: object = "") -> None:
    global PASSES
    if cond:
        PASSES += 1
        print(f"  ok   {name}")
    else:
        FAILS.append(name)
        print(f"  FAIL {name} -> {detail}")


def reset(sessions, prd):
    SESSIONS[:] = sessions
    bridge.set_prd_systems(prd)
    STATE["app_calls"] = 0


# --------------------------------------------------------------------------
# Testler
# --------------------------------------------------------------------------

print("kimlik doğrulama")
reset([FakeSession(FakeInfo("S4D", "100"))], [])

st, js, _ = req("GET", "/health", token=None)
check("/health token'sız 200", st == 200 and js.get("server") == "sap-gui-scripting-bridge", (st, js))

st, js, res = req("GET", "/connections", token=None)
check("GET token'sız 401", st == 401, (st, js))
check("401'de WWW-Authenticate: Bearer", res.getheader("WWW-Authenticate") == "Bearer")
check("401'de COM'a gidilmedi", STATE["app_calls"] == 0, STATE)

st, js, _ = req("GET", "/connections", token="yanlis")
check("GET yanlış token 401", st == 401, (st, js))

st, js, _ = req("GET", "/connections", headers={"Authorization": TOKEN}, token=None)
check("'Bearer ' öneki olmadan 401", st == 401, (st, js))

st, js, _ = req("GET", "/preflight", token=None)
check("/preflight token'sız 401", st == 401, (st, js))

st, js, _ = req("GET", "/screenshot?method=window", token=None)
check("oturumsuz /screenshot token'sız 401", st == 401, (st, js))

st, js, _ = req("GET", "/connections")
check("GET doğru token 200", st == 200 and js.get("ok") is True and len(js["connections"]) == 1, (st, js))

check("Türkçe karakterli başlık çökertmiyor", bridge.bearer_ok("Bearer ğüş", TOKEN) is False)
check("boş token hiçbir başlığı kabul etmiyor", bridge.bearer_ok("Bearer ", "") is False)

print("POST kapıları")
reset([FakeSession(FakeInfo("S4D", "100"))], [])
action ={"action": "setText", "id": "wnd[0]/usr/txtX", "value": "yazildi"}
st, js, _ = req("POST", "/session/0/0/action", body=action, token=None)
check("POST token'sız 401", st == 401, (st, js))
check("POST 401'de gövde işlenmedi", SESSIONS[0].comp.text is None and STATE["app_calls"] == 0)

st, js, _ = req("POST", "/session/0/0/action", body=json.dumps(action), headers={"Content-Type": "text/plain"})
check("POST text/plain 415", st == 415, (st, js))
check("415'te gövde işlenmedi", SESSIONS[0].comp.text is None)

st, js, _ = req("POST", "/session/0/0/action", body=json.dumps(action),
                headers={"Content-Type": "application/x-www-form-urlencoded"})
check("POST form-urlencoded 415", st == 415, (st, js))

st, js, _ = req("POST", "/session/0/0/action", body=action, headers={"Origin": "https://ornek.invalid"})
check("POST Origin başlıklı 403", st == 403, (st, js))
check("Origin'de gövde işlenmedi", SESSIONS[0].comp.text is None)

st, js, _ = req("GET", "/connections", headers={"Origin": "null"})
check("GET Origin başlıklı 403", st == 403, (st, js))

st, js, _ = req("POST", "/session/0/0/action", body=action,
                headers={"Content-Type": "application/json; charset=utf-8"})
check("charset'li application/json kabul, DEV'e yazıldı", st == 200 and SESSIONS[0].comp.text == "yazildi", (st, js))

print("PRD yazma kapısı")
reset([FakeSession(FakeInfo("P01", "100"))], [("P01", "")])
for act in ({"action": "setText", "id": "x", "value": "v"},
            {"action": "press", "id": "x"},
            {"action": "sendVKey", "vkey": 11},
            {"action": "navigate", "value": "SE38"},
            {"action": "popupChoice", "value": "yes"},
            {"action": "select", "id": "x"},
            {"action": "doubleClick", "id": "x"},
            {"action": "selectContextMenuItem", "id": "x", "value": "Y"}):
    st, js, _ = req("POST", "/session/0/0/action", body=act)
    check(f"PRD {act['action']} 403", st == 403 and "PRD" in (js or {}).get("error", ""), (st, js))
sess = SESSIONS[0]
check("PRD'de hiçbir şey yazılmadı", sess.comp.text is None and sess.comp.pressed == 0 and sess.ActiveWindow.vkeys == [])

st, js, _ = req("GET", "/session/0/0/node?id=x")
check("PRD'de okuma serbest (node)", st != 403, (st, js))

# Mandant verilmiş PRD girdisi yalnızca o mandantı kapatır.
reset([FakeSession(FakeInfo("p01", "200"))], [("P01", "100")])
st, js, _ = req("POST", "/session/0/0/action", body={"action": "setText", "id": "x", "value": "v"})
check("P01/100 PRD iken P01/200 serbest", st == 200, (st, js))
reset([FakeSession(FakeInfo("p01", "100"))], [("P01", "100")])
st, js, _ = req("POST", "/session/0/0/action", body={"action": "setText", "id": "x", "value": "v"})
check("SID küçük harfle gelse de P01/100 reddedildi", st == 403, (st, js))

reset([FakeSession(BrokenInfo())], [("P01", "")])
st, js, _ = req("POST", "/session/0/0/action", body={"action": "press", "id": "x"})
check("sistem adı okunamazsa ve liste doluysa 403", st == 403 and SESSIONS[0].comp.pressed == 0, (st, js))

reset([FakeSession(BrokenInfo())], [])
st, js, _ = req("POST", "/session/0/0/action", body={"action": "press", "id": "x"})
check("liste boşken kimliksiz oturum yine çalışıyor", st == 200 and SESSIONS[0].comp.pressed == 1, (st, js))

# handle_action doğrudan: köprünün HTTP'siz yolu da aynı kapıdan geçiyor.
reset([FakeSession(FakeInfo("P01", "100"))], [("P01", "")])
try:
    bridge.handle_action(FakeApp(SESSIONS), 0, 0, {"action": "setText", "id": "x", "value": "v"})
    check("handle_action PRD'de PrdWriteRefused", False, "istisna yok")
except bridge.PrdWriteRefused:
    check("handle_action PRD'de PrdWriteRefused", SESSIONS[0].comp.text is None)

print("PRD listesinin tazelenmesi")
reset([FakeSession(FakeInfo("S4D", "100"))], [])
st, js, _ = req("POST", "/config/prd", body={"systems": [{"sid": "s4d", "client": ""}]}, token=None)
check("/config/prd token'sız 401", st == 401 and bridge._PRD_SYSTEMS == [], (st, js))
st, js, _ = req("POST", "/config/prd", body={"systems": [{"sid": "s4d", "client": ""}]})
check("/config/prd 200", st == 200 and js.get("count") == 1 and bridge._PRD_SYSTEMS == [("S4D", "")], (st, js))
check("/config/prd COM'a dokunmadı", STATE["app_calls"] == 0, STATE)
st, js, _ = req("POST", "/session/0/0/action", body={"action": "setText", "id": "x", "value": "v"})
check("tazelenen liste hemen etkili", st == 403, (st, js))
st, js, _ = req("POST", "/config/prd", body={"systems": [{"client": "100"}]})
check("bozuk liste 400 ve eski liste korunuyor", st == 400 and bridge._PRD_SYSTEMS == [("S4D", "")], (st, js))
st, js, _ = req("POST", "/config/prd", body={"systems": "hepsi"})
check("dizi olmayan liste 400", st == 400, (st, js))
st, js, _ = req("POST", "/config/prd", body={"systems": []})
check("boş liste açıkça verilince kabul", st == 200 and bridge._PRD_SYSTEMS == [], (st, js))

print("başlatma kuralları (main)")


def run_main(argv: list[str], env: dict) -> tuple[int | None, bool]:
    """main()'i çağırır; run_bridge çağrılırsa sunucu açmadan kaydeder."""
    called = {"run": False}
    old_argv, old_env, old_run = sys.argv, dict(os.environ), bridge.run_bridge
    sys.argv = ["bridge", *argv]
    for key in (bridge.TOKEN_ENV, bridge.PRD_ENV):
        os.environ.pop(key, None)
    os.environ.update(env)
    bridge.run_bridge = lambda *a, **k: called.__setitem__("run", True)
    code = None
    try:
        bridge.main()
    except SystemExit as exc:
        code = exc.code
    finally:
        sys.argv, bridge.run_bridge = old_argv, old_run
        os.environ.clear()
        os.environ.update(old_env)
    return code, called["run"]


code, ran = run_main([], {})
check("token'sız başlamıyor", code == 2 and not ran, (code, ran))
code, ran = run_main([], {bridge.TOKEN_ENV: "   "})
check("boşluk token sayılmıyor", code == 2 and not ran, (code, ran))
code, ran = run_main(["--host", "0.0.0.0"], {bridge.TOKEN_ENV: TOKEN})
check("0.0.0.0'a bağlanmıyor", code == 2 and not ran, (code, ran))
code, ran = run_main([], {bridge.TOKEN_ENV: TOKEN, bridge.PRD_ENV: "{bozuk"})
check("bozuk PRD ENV'iyle başlamıyor", code == 2 and not ran, (code, ran))
code, ran = run_main([], {bridge.TOKEN_ENV: TOKEN, bridge.PRD_ENV: json.dumps([{"sid": "P01", "client": ""}])})
check("geçerli token + PRD ile başlıyor", code is None and ran and bridge._PRD_SYSTEMS == [("P01", "")], (code, ran))


def _token_removed() -> bool:
    os.environ[bridge.TOKEN_ENV] = TOKEN
    old_run = bridge.run_bridge
    bridge.run_bridge = lambda *a, **k: None
    old_argv = sys.argv
    sys.argv = ["bridge"]
    try:
        bridge.main()
    finally:
        bridge.run_bridge, sys.argv = old_run, old_argv
    return bridge.TOKEN_ENV not in os.environ


check("token ortamdan siliniyor (alt süreçlere geçmesin)", _token_removed())

server.shutdown()
print(f"\n{PASSES} geçti, {len(FAILS)} kaldı")
if FAILS:
    print("KALANLAR: " + ", ".join(FAILS))
    sys.exit(1)
