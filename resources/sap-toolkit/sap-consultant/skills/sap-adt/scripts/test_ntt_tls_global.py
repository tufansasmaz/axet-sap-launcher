#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — python-site/sitecustomize.py + ntt_tls_pin.install_global() testleri.

    PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_tls_global.py

YEREL sahte TLS sunucuları ve yerel bir CONNECT vekiliyle; SAP ya da IdP yok.
Asıl durumlar ayrı bir Python sürecinde koşuyor: sitecustomize yalnızca
açılışta, `PYTHONPATH`'ten yükleniyor — NTT Studio'nun ajana verdiği ortamın
aynısı. Aynı çağrının PYTHONPATH'siz koşusu (kontrol) geçtiği için farkı
yaratanın sitecustomize olduğu ölçülüyor.

Her reddedilen bağlantıda sunucunun HİÇ istek almadığı da denetleniyor:
kimlik bilgisinin (Authorization / istemci sırrı) gitmediğinin kanıtı bu.
Sertifikalar depodaki fixture'lar (tests/fixtures/tls); kurulu toolkit
ağacında yoklar, orada test atlanır. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import hashlib
import json
import os
import select
import shutil
import socket
import socketserver
import ssl
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

TOOLKIT = _SCRIPTS_DIR.parents[3]
SITE_DIR = TOOLKIT / "python-site"
FIX = _SCRIPTS_DIR.parents[5] / "tests" / "fixtures" / "tls"
RESULTS = []

# Çocuk sürecin ortamı geliştiricininkinden sızmasın: pin/URL/CA/vekil
# anahtarları temizleniyor, yalnızca testin verdiği kalıyor.
_SCRUB = (
    "PYTHONPATH", "PYTHONSTARTUP", "ADT_CWD", "CLAUDE_CWD", "INIT_CWD", "COPILOT_CWD", "PWD",
    "ADT_SAP_URL", "ADT_SAP_CERT_SHA256", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE", "SSL_CERT_FILE",
    "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy",
)


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


def fingerprint(cert_file: Path) -> str:
    der = ssl.PEM_cert_to_DER_cert(cert_file.read_text(encoding="ascii"))
    return hashlib.sha256(der).hexdigest()


class FakeServer:
    """Aldığı her isteği kaydeden yerel HTTPS sunucusu (GET = ADT, POST = token)."""

    def __init__(self, cert: str, key: str):
        self.requests: list[str] = []
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802
                owner.requests.append("GET auth" if self.headers.get("Authorization") else "GET")
                self._reply(b"ok", "text/plain")

            def do_POST(self):  # noqa: N802
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length).decode("utf-8", "replace")
                owner.requests.append("POST secret" if "client_secret" in body else "POST")
                self._reply(b'{"access_token":"t","expires_in":3600}', "application/json")

            def _reply(self, body, ctype):
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        class Server(ThreadingHTTPServer):
            daemon_threads = True

            def handle_error(self, request, client_address):
                pass

        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(str(FIX / cert), str(FIX / key))
        self.httpd = Server(("127.0.0.1", 0), Handler)
        self.httpd.socket = ctx.wrap_socket(self.httpd.socket, server_side=True)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


class ConnectProxy:
    """Kurum vekilinin taklidi: CONNECT host:port → ham TCP tüneli."""

    def __init__(self):
        self.tunnels = 0
        owner = self

        class Handler(socketserver.BaseRequestHandler):
            def handle(self):
                data = b""
                while b"\r\n\r\n" not in data:
                    chunk = self.request.recv(4096)
                    if not chunk:
                        return
                    data += chunk
                line = data.split(b"\r\n", 1)[0].decode("ascii", "replace")
                method, target, _ = line.split(" ", 2)
                if method != "CONNECT":
                    self.request.sendall(b"HTTP/1.1 405 Method Not Allowed\r\n\r\n")
                    return
                host, port = target.rsplit(":", 1)
                upstream = socket.create_connection((host, int(port)), timeout=5)
                owner.tunnels += 1
                self.request.sendall(b"HTTP/1.1 200 Connection established\r\n\r\n")
                pair = [self.request, upstream]
                try:
                    while True:
                        ready, _, _ = select.select(pair, [], [], 5)
                        if not ready:
                            break
                        for s in ready:
                            buf = s.recv(65536)
                            if not buf:
                                return
                            (upstream if s is self.request else self.request).sendall(buf)
                except OSError:
                    pass
                finally:
                    upstream.close()

        class Server(socketserver.ThreadingTCPServer):
            daemon_threads = True
            allow_reuse_address = True

            def handle_error(self, request, client_address):
                pass

        self.server = Server(("127.0.0.1", 0), Handler)
        self.port = self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


SELF: FakeServer
LEAF: FakeServer
PROXY: ConnectProxy
SELF_FP = ""

CHILD_PRELUDE = r'''
import json, sys
sys.path.insert(0, SCRIPTS)
def out(**k):
    print("RESULT " + json.dumps(k))
def call(fn):
    try:
        r = fn()
        out(status=getattr(r, "status_code", r))
    except Exception as e:
        out(error=type(e).__name__, msg=str(e)[:600])
'''


def run_child(body: str, cwd: Path, env_extra: dict | None = None, site: bool = True, extra_path: str = "") -> dict:
    env = {k: v for k, v in os.environ.items() if k not in _SCRUB}
    env["NO_PROXY"] = "127.0.0.1,localhost"
    env["no_proxy"] = "127.0.0.1,localhost"
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    paths = [str(SITE_DIR)] if site else []
    if extra_path:
        paths.append(extra_path)
    if paths:
        env["PYTHONPATH"] = os.pathsep.join(paths)
    env.update(env_extra or {})
    code = f"SCRIPTS = {str(_SCRIPTS_DIR)!r}\n" + CHILD_PRELUDE + body
    proc = subprocess.run(
        [sys.executable, "-c", code], cwd=str(cwd), env=env, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=90,
    )
    results = [json.loads(line[7:]) for line in proc.stdout.splitlines() if line.startswith("RESULT ")]
    return {"rc": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr, "results": results}


def project(pin: str | None, url: str | None = None) -> tempfile.TemporaryDirectory:
    """Tek bir .conn_adt'li geçici proje klasörü (NTT Studio'nun yazdığı biçim)."""
    tmp = tempfile.TemporaryDirectory()
    lines = [f"ADT_SAP_URL={url or f'https://127.0.0.1:{SELF.port}'}", "ADT_SAP_USER=TESTUSER"]
    lines.append(f"ADT_SAP_CERT_SHA256={pin or ''}")
    (Path(tmp.name) / ".conn_adt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return tmp


def one(res: dict) -> dict:
    assert res["results"], f"çocuk sonuç basmadı (rc={res['rc']}): {res['stderr'][-800:]}"
    return res["results"][0]


def expect_ok(res: dict):
    r = one(res)
    assert r.get("status") == 200, f"200 bekleniyordu: {r} / {res['stderr'][-400:]}"


def expect_ssl(res: dict, note: bool = True):
    r = one(res)
    assert r.get("error") == "SSLError", f"SSLError bekleniyordu: {r}"
    if note:
        assert "NTT Studio TLS" in r.get("msg", ""), f"açıklama yok: {r.get('msg')}"


def no_new(server, before: int):
    time.sleep(0.15)
    assert len(server.requests) == before, f"sunucu istek aldı: {server.requests[before:]}"


GET_SELF_FALSE = "import requests\ncall(lambda: requests.get(URL, auth=('TESTUSER', 'dummy'), verify=False, timeout=5))\n"


def self_url() -> str:
    return f"https://127.0.0.1:{SELF.port}/sap/bc/adt/discovery"


# --- kontrol ---------------------------------------------------------------

def t_control_without_site():
    with project(SELF_FP) as tmp:
        before = len(SELF.requests)
        expect_ok(run_child(f"URL = {self_url()!r}\n" + GET_SELF_FALSE, Path(tmp), site=False))
        assert SELF.requests[before:] == ["GET auth"], "kontrol: verify=False sitecustomize'sız geçmeliydi"


def t_lazy():
    with project(SELF_FP) as tmp:
        res = run_child(
            "out(before='ntt_tls_pin' in sys.modules)\n"
            "import requests\nfrom requests.adapters import HTTPAdapter\n"
            "out(after='ntt_tls_pin' in sys.modules, wrapped=hasattr(HTTPAdapter.send, '__wrapped__'))\n",
            Path(tmp),
        )
        assert res["results"] == [{"before": False}, {"after": True, "wrapped": True}], res["results"] or res["stderr"]


# --- SAP adresi, pin -------------------------------------------------------

def t_pin_verify_false():
    with project(SELF_FP) as tmp:
        before = len(SELF.requests)
        expect_ok(run_child(f"URL = {self_url()!r}\n" + GET_SELF_FALSE, Path(tmp)))
        assert SELF.requests[before:] == ["GET auth"]


def t_pin_mismatch():
    with project("00" * 32) as tmp:
        before = len(SELF.requests)
        expect_ssl(run_child(f"URL = {self_url()!r}\n" + GET_SELF_FALSE, Path(tmp)))
        no_new(SELF, before)


def t_no_pin_self_signed():
    with project(None) as tmp:
        before = len(SELF.requests)
        expect_ssl(run_child(f"URL = {self_url()!r}\n" + GET_SELF_FALSE, Path(tmp)))
        no_new(SELF, before)


def t_session_verify_false():
    body = (
        f"URL = {self_url()!r}\nimport requests\ns = requests.Session()\ns.verify = False\n"
        "call(lambda: s.get(URL, auth=('TESTUSER', 'dummy'), timeout=5))\n"
    )
    with project(SELF_FP) as tmp:
        expect_ok(run_child(body, Path(tmp)))
    with project("11" * 32) as tmp:
        before = len(SELF.requests)
        expect_ssl(run_child(body, Path(tmp)))
        no_new(SELF, before)


def t_pin_only_for_sap_host():
    # Aynı sunucu, başka ad (localhost): pin geçmiyor, zincir isteniyor.
    with project(SELF_FP) as tmp:
        before = len(SELF.requests)
        url = f"https://localhost:{SELF.port}/x"
        expect_ssl(run_child(f"URL = {url!r}\n" + GET_SELF_FALSE, Path(tmp)))
        no_new(SELF, before)


# --- gerçek script'ler -----------------------------------------------------

def t_login_saml_sso_verify_cookies():
    # login_saml_sso.verify_cookies: session.verify = False ile SAP'ye çerezli istek.
    body = (
        "from pathlib import Path\nimport login_saml_sso as m\n"
        "cf = Path('cookies.json'); cf.write_text('{\"session_cookies\": []}', encoding='utf-8')\n"
        "ok = m.verify_cookies({'cookies_file': cf, 'host': '127.0.0.1', 'url': URL})\n"
        "out(status=200 if ok else 0)\n"
    )
    url = f"https://127.0.0.1:{SELF.port}"
    with project(SELF_FP) as tmp:
        before = len(SELF.requests)
        expect_ok(run_child(f"URL = {url!r}\n" + body, Path(tmp)))
        assert len(SELF.requests) == before + 1
    with project("22" * 32) as tmp:
        before = len(SELF.requests)
        res = run_child(f"URL = {url!r}\n" + body, Path(tmp))
        assert one(res).get("status") == 0, one(res)
        assert "NTT Studio TLS" in res["stdout"], res["stdout"][-400:]
        no_new(SELF, before)


def _jwt_body(token_url: str) -> str:
    return (
        f"TOKEN_URL = {token_url!r}\n"
        "from auth.jwt_auth_provider import JWTAuthProvider\n"
        "p = JWTAuthProvider(TOKEN_URL, 'client', 'dummy-secret')\n"
        "try:\n    p.refresh_credentials(); out(status=200)\n"
        "except Exception as e:\n    out(error=type(e).__name__, msg=str(e)[:600])\n"
    )


def t_jwt_provider_other_host():
    # jwt_auth_provider: requests.post(token_url, verify=False) — IdP başka host.
    # Test CA'sı OS deposunda yok: zincir tutmuyor → istemci sırrı gitmiyor.
    token_url = f"https://localhost:{LEAF.port}/oauth/token"
    with project(SELF_FP) as tmp:
        before = len(LEAF.requests)
        res = run_child(_jwt_body(token_url), Path(tmp))
        r = one(res)
        assert r.get("error") == "SAPConnectionError" and "NTT Studio TLS" in r.get("msg", ""), r
        no_new(LEAF, before)
        # Kurum CA'sı REQUESTS_CA_BUNDLE ile verilmişse zincir + ad tutuyor.
        before = len(LEAF.requests)
        expect_ok(run_child(_jwt_body(token_url), Path(tmp), {"REQUESTS_CA_BUNDLE": str(FIX / "ca.crt")}))
        assert LEAF.requests[before:] == ["POST secret"], LEAF.requests[before:]
        # Aynı CA, yanlış ad (SAN'da 127.0.0.1 yok) → ret.
        before = len(LEAF.requests)
        bad = f"https://127.0.0.1:{LEAF.port}/oauth/token"
        res = run_child(_jwt_body(bad), Path(tmp), {"REQUESTS_CA_BUNDLE": str(FIX / "ca.crt")})
        assert one(res).get("error") == "SAPConnectionError", one(res)
        no_new(LEAF, before)


def t_engine_install_auto():
    body = (
        "import sap_adt_lib, ntt_tls_pin\n"
        "w = sap_adt_lib.SAPADTClient.__init__\n"
        "out(wrapped=hasattr(w, '__wrapped__'), once=not hasattr(w.__wrapped__, '__wrapped__'),"
        " same=sys.modules['ntt_tls_pin'] is ntt_tls_pin, fromsite=ntt_tls_pin.__file__)\n"
    )
    with project(SELF_FP) as tmp:
        r = one(run_child(body, Path(tmp)))
        assert r.get("wrapped") and r.get("once") and r.get("same"), r


# --- caller'ın kendi seçimi ------------------------------------------------

def t_caller_choice_kept():
    with project(SELF_FP) as tmp:
        # verify=True + kendinden imzalı başka host: normal requests hatası (not yok).
        url = f"https://localhost:{SELF.port}/x"
        expect_ssl(run_child(f"URL = {url!r}\nimport requests\ncall(lambda: requests.get(URL, timeout=5))\n", Path(tmp)), note=False)
        # Açık CA yolu korunuyor.
        leaf = f"https://localhost:{LEAF.port}/x"
        ca = str(FIX / "ca.crt")
        expect_ok(run_child(f"URL = {leaf!r}\nimport requests\ncall(lambda: requests.get(URL, verify={ca!r}, timeout=5))\n", Path(tmp)))


# --- vekil sunucu ----------------------------------------------------------

def t_proxy_path_pinned():
    body = (
        f"URL = {self_url()!r}\nPX = {{'https': 'http://127.0.0.1:{PROXY.port}'}}\nimport requests\n"
        "call(lambda: requests.get(URL, auth=('TESTUSER', 'dummy'), verify=False, proxies=PX, timeout=5))\n"
    )
    with project(SELF_FP) as tmp:
        tunnels = PROXY.tunnels
        expect_ok(run_child(body, Path(tmp)))
        assert PROXY.tunnels == tunnels + 1, "istek vekilden geçmedi, test bir şey ölçmüyor"
    with project("33" * 32) as tmp:
        before = len(SELF.requests)
        expect_ssl(run_child(body, Path(tmp)))
        no_new(SELF, before)


def t_proxy_fix_is_load_bearing():
    # PinnedAdapter.proxy_manager_for olmadan vekil yolu doğrulamasız
    # (CERT_NONE, parmak izi yok) — bu testin kırmızısı düzeltmenin sebebi.
    import requests
    import ntt_tls_pin as tp
    from requests.adapters import HTTPAdapter

    saved = tp.PinnedAdapter.__dict__["proxy_manager_for"]
    try:
        del tp.PinnedAdapter.proxy_manager_for
        s = requests.Session()
        s.mount("https://", tp.PinnedAdapter("44" * 32))
        before = len(SELF.requests)
        r = s.get(self_url(), verify=False, proxies={"https": f"http://127.0.0.1:{PROXY.port}"}, timeout=5)
        assert r.status_code == 200 and len(SELF.requests) == before + 1, "düzeltmesiz yol da reddetti?"
    finally:
        tp.PinnedAdapter.proxy_manager_for = saved
    s = requests.Session()
    s.mount("https://", tp.PinnedAdapter("44" * 32))
    before = len(SELF.requests)
    try:
        s.get(self_url(), verify=False, proxies={"https": f"http://127.0.0.1:{PROXY.port}"}, timeout=5)
    except requests.exceptions.SSLError:
        pass
    else:
        raise AssertionError("düzeltmeyle vekil yolu yanlış pin'i reddetmeli")
    no_new(SELF, before)
    assert HTTPAdapter is not None


# --- sitecustomize'ın kendisi ----------------------------------------------

def t_chains_existing_sitecustomize():
    with project(SELF_FP) as tmp, tempfile.TemporaryDirectory() as other:
        (Path(other) / "sitecustomize.py").write_text("import os\nos.environ['OTHER_SITECUSTOMIZE'] = '1'\n", encoding="utf-8")
        res = run_child(
            "import os, requests\nfrom requests.adapters import HTTPAdapter\n"
            "out(other=os.environ.get('OTHER_SITECUSTOMIZE'), wrapped=hasattr(HTTPAdapter.send, '__wrapped__'))\n",
            Path(tmp), extra_path=other,
        )
        assert one(res) == {"other": "1", "wrapped": True}, (res["results"], res["stderr"][-400:])


def t_missing_toolkit_is_harmless():
    with tempfile.TemporaryDirectory() as tmp:
        lone = Path(tmp) / "python-site"
        lone.mkdir()
        shutil.copy(SITE_DIR / "sitecustomize.py", lone / "sitecustomize.py")
        env = {k: v for k, v in os.environ.items() if k not in _SCRUB}
        env["PYTHONPATH"] = str(lone)
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        proc = subprocess.run(
            [sys.executable, "-c", "import requests; print('ok')"], cwd=tmp, env=env,
            capture_output=True, text=True, timeout=60,
        )
        assert proc.returncode == 0 and proc.stdout.strip() == "ok", (proc.returncode, proc.stderr[-400:])
        assert proc.stderr.strip() == "", proc.stderr[-400:]


def t_os_trust_context_loaded():
    import ntt_tls_pin as tp

    stats = tp._os_trust_context().cert_store_stats()
    assert stats.get("x509_ca", 0) > 0, f"OS güven deposu yüklenmedi: {stats}"


def t_forced_path_uses_os_context():
    # Kurum CA'sı Windows deposunda olan makinenin taklidi: OS bağlamının
    # yerine test CA'sını yükleyen bir bağlam. Kullanıcının gerçek deposuna
    # DOKUNULMUYOR. Geçiyorsa zorlanan doğrulama gerçekten o bağlamı kullanıyor
    # (yalnız certifi'yi değil) — kurum ağında verify=False script'i kırılmıyor.
    ca = str(FIX / "ca.crt")
    url = f"https://localhost:{LEAF.port}/x"
    body = (
        f"URL = {url!r}\nCA = {ca!r}\nimport ssl, requests, ntt_tls_pin\n"
        "call(lambda: requests.get(URL, verify=False, timeout=5))\n"
        "ntt_tls_pin._OS_CONTEXT = ssl.create_default_context(cafile=CA)\n"
        "call(lambda: requests.get(URL, verify=False, timeout=5))\n"
    )
    with project(SELF_FP) as tmp:
        res = run_child(body, Path(tmp))
        assert len(res["results"]) == 2, res["results"] or res["stderr"][-400:]
        first, second = res["results"]
        # CA deposta değilken ret (verify=False'a rağmen), depodayken geçiş.
        assert first.get("error") == "SSLError", first
        assert second.get("status") == 200, second


TESTS = [
    ("kontrol", "sitecustomize'sız verify=False kendinden imzalıya geçiyor (fark ölçülebilir)", t_control_without_site),
    ("tembel", "requests yüklenmeden ntt_tls_pin yüklenmiyor; yüklenince send sarılı", t_lazy),
    ("pin_verify_false", "requests.get(verify=False) SAP adresine pin'le gidiyor", t_pin_verify_false),
    ("pin_eslesmiyor", "yanlış pin + verify=False → SSLError (NTT Studio notu), istek yok", t_pin_mismatch),
    ("pinsiz", "pin yok + kendinden imzalı + verify=False → ret, istek yok", t_no_pin_self_signed),
    ("session_verify_false", "session.verify=False aynı kurala tabi", t_session_verify_false),
    ("pin_yalniz_sap", "pin yalnızca .conn_adt'teki host:port'a", t_pin_only_for_sap_host),
    ("login_saml_sso", "gerçek verify_cookies: pin'le geçiyor, yanlış pin'de istek yok", t_login_saml_sso_verify_cookies),
    ("jwt_auth_provider", "gerçek JWT sağlayıcısı: zincirsiz ret, kurum CA'sıyla geçer, yanlış adda ret", t_jwt_provider_other_host),
    ("motor_install", "sap_adt_lib içe aktarılınca install() kendiliğinden, tek sarma, tek modül", t_engine_install_auto),
    ("cagiranin_secimi", "verify=True ve açık CA yolu değişmiyor", t_caller_choice_kept),
    ("vekil_pin", "CONNECT vekili üzerinden de pin: doğru geçer, yanlış reddedilir", t_proxy_path_pinned),
    ("vekil_duzeltmesi", "proxy_manager_for olmadan vekil yolu doğrulamasızdı (regresyon)", t_proxy_fix_is_load_bearing),
    ("zincir_sitecustomize", "yoldaki başka sitecustomize de çalışıyor", t_chains_existing_sitecustomize),
    ("toolkit_yok", "ntt_tls_pin yoksa açılış ve requests sessizce çalışıyor", t_missing_toolkit_is_harmless),
    ("os_deposu", "zorlanan doğrulama OS güven deposunu yüklüyor (kurum CA'sı)", t_os_trust_context_loaded),
    ("os_baglami_kullaniliyor", "OS deposundaki kurum CA'sıyla verify=False script'i çalışmaya devam ediyor", t_forced_path_uses_os_context),
]


def main():
    global SELF, LEAF, PROXY, SELF_FP
    if not (FIX / "selfsigned.crt").is_file() or not (SITE_DIR / "sitecustomize.py").is_file():
        print(f"ATLANDI: test sertifikaları ya da python-site yok ({FIX}) — kurulu ağaçta beklenen durum")
        return 0
    SELF = FakeServer("selfsigned.crt", "selfsigned.key")
    LEAF = FakeServer("leaf.crt", "leaf.key")
    PROXY = ConnectProxy()
    SELF_FP = fingerprint(FIX / "selfsigned.crt")
    try:
        for name, catches, fn in TESTS:
            check(name, catches, fn)
    finally:
        SELF.close()
        LEAF.close()
        PROXY.close()
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
