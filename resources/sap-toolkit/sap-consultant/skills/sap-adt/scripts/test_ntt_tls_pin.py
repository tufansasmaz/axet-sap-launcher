#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — ntt_tls_pin.py testleri. YEREL sahte TLS sunucusuyla; SAP yok.

    PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_tls_pin.py

Sertifikalar depodaki sabit test fixture'ları (tests/fixtures/tls); kurulu
toolkit ağacında yoklar, orada test atlanır. Çıkış kodu 0 = hepsi geçti.

Her reddedilen bağlantıda sunucunun HİÇ istek almadığı ayrıca denetleniyor:
kimlik bilgisinin gitmediğinin kanıtı bu.
"""
from __future__ import annotations

import hashlib
import os
import ssl
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

import requests  # noqa: E402
from requests.adapters import HTTPAdapter  # noqa: E402

import ntt_tls_pin as tp  # noqa: E402

FIX = _SCRIPTS_DIR.parents[5] / "tests" / "fixtures" / "tls"
RESULTS = []


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


class FakeSap:
    """Aldığı her isteği (Authorization var mı) kaydeden yerel HTTPS sunucusu."""

    def __init__(self, cert: str, key: str):
        self.requests: list[str] = []
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802
                owner.requests.append("auth" if self.headers.get("Authorization") else "noauth")
                self.send_response(200)
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"ok")

            def log_message(self, *args):  # sessiz
                pass

        class Server(ThreadingHTTPServer):
            daemon_threads = True

            def handle_error(self, request, client_address):  # reddedilen el sıkışmaları sessiz
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


def engine_like_session() -> requests.Session:
    """Motorun oturumunun biçimi: verify=False, kendi adaptörü."""
    s = requests.Session()
    s.verify = False
    s.mount("https://", HTTPAdapter(max_retries=0, pool_connections=4, pool_maxsize=10))
    return s


def get(session: requests.Session, url: str, **kw):
    # auth/i_auth_provider.py istek başına verify=False geçiyor; aynısı.
    return session.get(url + "/sap/bc/adt/discovery", auth=("TESTUSER", "dummy"), timeout=5, **kw)


def expect_ssl_error(fn):
    try:
        fn()
    except requests.exceptions.SSLError:
        return
    raise AssertionError("SSLError bekleniyordu, istek geçti")


SELF: FakeSap
LEAF: FakeSap
SELF_FP = ""
LEAF_FP = ""


def t_pin_match():
    s = engine_like_session()
    url = f"https://127.0.0.1:{SELF.port}"
    tp.harden_session(s, url, SELF_FP)
    before = len(SELF.requests)
    r = get(s, url, verify=False)
    assert r.status_code == 200, r.status_code
    assert SELF.requests[before:] == ["auth"], SELF.requests[before:]


def t_pin_match_colon_upper():
    s = engine_like_session()
    url = f"https://127.0.0.1:{SELF.port}"
    colon = ":".join(SELF_FP[i:i + 2] for i in range(0, 64, 2)).upper()
    tp.harden_session(s, url, colon)
    assert get(s, url).status_code == 200


def t_pin_mismatch():
    s = engine_like_session()
    url = f"https://127.0.0.1:{SELF.port}"
    tp.harden_session(s, url, "00" * 32)
    before = len(SELF.requests)
    expect_ssl_error(lambda: get(s, url, verify=False))
    time.sleep(0.1)
    assert len(SELF.requests) == before, "sunucu istek aldı — kimlik bilgisi gitti"


def t_no_pin_self_signed():
    s = engine_like_session()
    url = f"https://127.0.0.1:{SELF.port}"
    tp.harden_session(s, url, None)
    before = len(SELF.requests)
    expect_ssl_error(lambda: get(s, url, verify=False))
    time.sleep(0.1)
    assert len(SELF.requests) == before, "sunucu istek aldı — kimlik bilgisi gitti"


def t_chain_ok_with_ca_path():
    # ADT_SAP_SSL_VERIFY=<CA dosyası> meşru; o yol korunuyor ve zincir+ad tutuyor.
    s = engine_like_session()
    s.verify = str(FIX / "ca.crt")
    url = f"https://localhost:{LEAF.port}"
    tp.harden_session(s, url, None)
    assert s.get(url + "/", timeout=5).status_code == 200


def t_hostname_mismatch():
    # leaf'in SAN'ında 127.0.0.1 yok: zincir geçerli ama host adı değil.
    s = engine_like_session()
    s.verify = str(FIX / "ca.crt")
    url = f"https://127.0.0.1:{LEAF.port}"
    tp.harden_session(s, url, None)
    before = len(LEAF.requests)
    expect_ssl_error(lambda: s.get(url + "/", auth=("U", "P"), timeout=5))
    time.sleep(0.1)
    assert len(LEAF.requests) == before, "sunucu istek aldı"


def t_other_host_needs_chain():
    # Pin yalnızca SAP adresine; başka bir https adrese (aynı sunucu, farklı
    # ad) pin'le geçilmiyor.
    s = engine_like_session()
    tp.harden_session(s, f"https://127.0.0.1:{SELF.port}", SELF_FP)
    expect_ssl_error(lambda: get(s, f"https://localhost:{SELF.port}", verify=False))


def t_prefix_trailing_slash():
    assert tp._prefixes_for("https://sap.example:4430/sap") == ["https://sap.example:4430/"]
    assert tp._prefixes_for("https://SAP.example/x") == ["https://sap.example:443/", "https://sap.example/"]
    assert tp._prefixes_for("http://sap.example:8000") == []


def t_retry_settings_kept():
    from urllib3.util.retry import Retry

    s = requests.Session()
    s.mount("https://", HTTPAdapter(max_retries=Retry(total=3), pool_connections=4, pool_maxsize=10))
    tp.harden_session(s, "https://sap.example:44300", "ab" * 32)
    chain = s.adapters["https://"]
    pinned = s.get_adapter("https://sap.example:44300/sap/bc/adt")
    assert isinstance(chain, tp.ChainVerifyingAdapter)
    assert isinstance(pinned, tp.PinnedAdapter), type(pinned)
    assert pinned.max_retries.total == 3 and pinned._pool_maxsize == 10


def t_pin_source_file_first():
    with tempfile.TemporaryDirectory() as tmp:
        conn = Path(tmp) / ".conn_adt"
        orig = tp._conn_file
        old_env = os.environ.get(tp.PIN_KEY)
        try:
            tp._conn_file = lambda: conn  # type: ignore[assignment]
            os.environ[tp.PIN_KEY] = "cd" * 32
            conn.write_text(f"ADT_SAP_URL=https://x\n{tp.PIN_KEY}={'AB' * 32}\n", encoding="utf-8")
            assert tp.current_pin() == "ab" * 32
            # Anahtar dosyada boş: pin YOK (başka sistemden kalma ortam değeri kullanılmaz).
            conn.write_text(f"{tp.PIN_KEY}=\n", encoding="utf-8")
            assert tp.current_pin() is None
            # Anahtar dosyada hiç yok: ortam.
            conn.write_text("ADT_SAP_URL=https://x\n", encoding="utf-8")
            assert tp.current_pin() == "cd" * 32
        finally:
            tp._conn_file = orig  # type: ignore[assignment]
            if old_env is None:
                os.environ.pop(tp.PIN_KEY, None)
            else:
                os.environ[tp.PIN_KEY] = old_env


def t_install_wraps_engine():
    # Motor içe aktarılırken .conn_adt'yi çalışma klasöründen okuyor; boş bir
    # klasörde içe aktar ki geliştiricinin kendi .conn_adt'si karışmasın.
    cwd = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)
        old_env = os.environ.get(tp.PIN_KEY)
        try:
            os.environ[tp.PIN_KEY] = SELF_FP
            import sap_adt_lib

            tp.install()
            tp.install()  # iki kez çağrı sarmalı iki kat yapmasın
            url = f"https://127.0.0.1:{SELF.port}"
            client = sap_adt_lib.SAPADTClient(url=url, user="TESTUSER", password="dummy", client="100")
            adapter = client.session.get_adapter(url + "/sap/bc/adt/discovery")
            assert isinstance(adapter, tp.PinnedAdapter), type(adapter)
            assert isinstance(client.session.adapters["https://"], tp.ChainVerifyingAdapter)
            wrapped = sap_adt_lib.SAPADTClient.__init__
            assert getattr(wrapped, "__wrapped__", None) is not None
            assert getattr(wrapped.__wrapped__, "__wrapped__", None) is None, "iki kez sarıldı"
            before = len(SELF.requests)
            r = client.session.get(url + "/sap/bc/adt/discovery", timeout=5, verify=False)
            assert r.status_code == 200 and len(SELF.requests) == before + 1
        finally:
            os.chdir(cwd)
            if old_env is None:
                os.environ.pop(tp.PIN_KEY, None)
            else:
                os.environ[tp.PIN_KEY] = old_env


TESTS = [
    ("pin_eslesiyor", "pin'li SAP adresine istek gider (Authorization sunucuda)", t_pin_match),
    ("pin_bicim", "AB:CD biçimli büyük harf pin aynı pin sayılır", t_pin_match_colon_upper),
    ("pin_eslesmiyor", "yanlış pin → SSLError, sunucu tek istek almaz", t_pin_mismatch),
    ("pinsiz_selfsigned", "pin yok + kendinden imzalı → verify=True reddeder, istek gitmez", t_no_pin_self_signed),
    ("zincir_ca_yolu", "ADT_SAP_SSL_VERIFY=<CA> korunur, zincir+ad tutunca geçer", t_chain_ok_with_ca_path),
    ("host_adi", "zincir geçerli ama host adı tutmuyor → ret, istek gitmez", t_hostname_mismatch),
    ("baska_host", "pin yalnızca SAP adresine; başka ada zincir şart", t_other_host_needs_chain),
    ("onek", "adaptör öneki sonda '/' ile; 443 iki biçimde", t_prefix_trailing_slash),
    ("retry_korunur", "motorun Retry/havuz ayarları yeni adaptörlerde", t_retry_settings_kept),
    ("pin_kaynagi", ".conn_adt önce; boş anahtar = pin yok; yoksa ortam", t_pin_source_file_first),
    ("install", "SAPADTClient oturumu pin adaptörüyle kuruluyor, çift sarma yok", t_install_wraps_engine),
]


def main():
    global SELF, LEAF, SELF_FP, LEAF_FP
    if not (FIX / "selfsigned.crt").is_file():
        print(f"ATLANDI: test sertifikaları yok ({FIX}) — kurulu ağaçta beklenen durum")
        return 0
    SELF = FakeSap("selfsigned.crt", "selfsigned.key")
    LEAF = FakeSap("leaf.crt", "leaf.key")
    SELF_FP = fingerprint(FIX / "selfsigned.crt")
    LEAF_FP = fingerprint(FIX / "leaf.crt")
    try:
        for name, catches, fn in TESTS:
            check(name, catches, fn)
    finally:
        SELF.close()
        LEAF.close()
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
