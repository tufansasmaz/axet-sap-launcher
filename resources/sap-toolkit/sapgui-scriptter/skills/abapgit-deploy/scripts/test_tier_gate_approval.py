#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — tier_gate.require_write_approval testleri. Sahte 8787 ile; SAP yok.

    py -3 resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/test_tier_gate_approval.py

Sahte sunucu rastgele portta dinliyor; tier_gate.ADT_HTTP_URL test süresince ona
çevriliyor. 9 yazma script'inin main()'i de gerçekten çağrılıyor: onay beklerken
SAP GUI'ye bağlanmaya (attach_scripting_engine / _run_step) HİÇ gelmemeli.
Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import contextlib
import importlib
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import tier_gate as tg  # noqa: E402

TOKEN = "test-token"


class Fake:
    """Sıradaki cevabı veren, gelen her isteği kaydeden sahte 8787."""

    def __init__(self):
        self.calls: list[dict] = []
        self.replies: list[tuple[int, object]] = []
        fake = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                fake.calls.append({"path": self.path, "auth": self.headers.get("Authorization"),
                                   "body": json.loads(self.rfile.read(n).decode("utf-8"))})
                code, body = fake.replies.pop(0) if fake.replies else (200, {"ok": False, "error": "yok"})
                data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.srv.server_address[1]}"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def reply(self, code, body):
        self.replies.append((code, body))


FAKE = Fake()
tg.ADT_HTTP_URL = FAKE.url


@contextlib.contextmanager
def fresh(**kv):
    """Temiz sahte sunucu + ortam: token var, üst onay yok, proxy yok (kv ile değiştirilir)."""
    FAKE.calls.clear()
    FAKE.replies.clear()
    want = {"ABAP_HTTP_TOKEN": TOKEN, tg.APPROVAL_ENV: None, "HTTP_PROXY": None, "http_proxy": None}
    want.update(kv)
    old = {k: os.environ.get(k) for k in want}
    for k, v in want.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    try:
        yield
    finally:
        for k, v in old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def run(fn):
    """fn() → (dönüş, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        rc = fn()
    return rc, out.getvalue(), err.getvalue()


TESTS = []


def test(fn):
    TESTS.append(fn)
    return fn


# --- fonksiyon -------------------------------------------------------------------
@test
def token_yoksa_sorulmadan_ret():
    with fresh(ABAP_HTTP_TOKEN=None):
        rc, out, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc == 2 and not FAKE.calls, (rc, FAKE.calls)
        assert "REFUSED [GR_APPROVAL] approval_unavailable" in err, err


@test
def izinli_kimligi_ortama_yaziyor_ve_dogru_soruyor():
    with fresh(), tempfile.TemporaryDirectory() as d:
        FAKE.reply(200, {"ok": True, "onay_id": "onay-1"})
        z = Path(d) / "a.zip"
        z.write_bytes(b"x")
        cwd = os.getcwd()
        os.chdir(d)
        try:
            rc, out, err = run(lambda: tg.require_write_approval(
                str(HERE / "gui_run_zabapgit_auto.py"), paket="ZPKG", transport="DS4K900001",
                zip_dosyasi="a.zip"))
        finally:
            os.chdir(cwd)
        assert rc is None, (rc, err)
        assert os.environ.get(tg.APPROVAL_ENV) == "onay-1"
        c = FAKE.calls[0]
        assert c["path"] == "/tool/axet_abapgit_onay", c
        assert c["auth"] == f"Bearer {TOKEN}", c
        # Script yalnızca adıyla gidiyor; ZIP mutlak yolla (sunucunun cwd'si başka).
        assert c["body"] == {"script": "gui_run_zabapgit_auto.py", "paket": "ZPKG",
                             "transport": "DS4K900001", "zip_dosyasi": str(z.resolve()),
                             "ust_onay": ""}, c["body"]


@test
def ust_onay_ortamdan_gidiyor():
    with fresh(**{tg.APPROVAL_ENV: "onay-ebeveyn"}):
        FAKE.reply(200, {"ok": True, "onay_id": "onay-2"})
        rc, _, _ = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc is None
        assert FAKE.calls[0]["body"]["ust_onay"] == "onay-ebeveyn"
        assert os.environ[tg.APPROVAL_ENV] == "onay-2"


@test
def bekliyor_stdoutta_approval_pending_ve_3():
    with fresh():
        FAKE.reply(200, {"ok": False, "error": "approval_pending", "approval_id": "x1",
                         "message": "NTT Studio'da onay penceresi açıldı."})
        rc, out, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc == 3, (rc, out, err)
        assert out.startswith("approval_pending: NTT Studio'da onay penceresi açıldı."), out
        assert tg.APPROVAL_ENV not in os.environ


@test
def ret_ve_mod_hatalari_2():
    for error in ("approval_denied", "yerel_mod", "mod_secilmedi", "kalite_kaydi_yok", "approval_unavailable", "transport_belirsiz"):
        with fresh():
            FAKE.reply(200, {"ok": False, "error": error, "message": "m"})
            rc, out, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
            assert rc == 2 and f"REFUSED [GR_APPROVAL] {error}: m" in err, (error, rc, err)
            assert "approval_pending" not in out
            assert tg.APPROVAL_ENV not in os.environ


@test
def ok_ama_kimlik_yoksa_ret():
    for body in ({"ok": True}, {"ok": True, "onay_id": ""}, {"ok": "true", "onay_id": "a"}, ["ok"]):
        with fresh():
            FAKE.reply(200, body)
            rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
            assert rc == 2 and tg.APPROVAL_ENV not in os.environ, (body, rc, err)


@test
def http_hatalari_2():
    for code, word in ((401, "401"), (404, "axet_abapgit_onay yok"), (503, "sap_session_busy"), (500, "HTTP 500")):
        with fresh():
            FAKE.reply(code, {"ok": False, "error": "x"})
            rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
            assert rc == 2 and word in err, (code, rc, err)


@test
def bozuk_govde_2():
    with fresh():
        FAKE.reply(200, b"<html>")
        rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc == 2 and "approval_unavailable" in err, err


@test
def ulasilamazsa_2():
    with fresh():
        rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py", url="http://127.0.0.1:9"))
        assert rc == 2 and "ulaşılamadı" in err, err


@test
def proxy_tanimliyken_loopback_dogrudan():
    with fresh(HTTP_PROXY="http://127.0.0.1:9", http_proxy="http://127.0.0.1:9"):
        FAKE.reply(200, {"ok": True, "onay_id": "p1"})
        rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc is None, err


@test
def ham_tcp_cevab_cikis_2():
    # Sahte sunucu: ham TCP sunucu (HTTP olmayan protokol) garbage ile çıkıyor
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", 0))
    sock.listen(1)
    port = sock.getsockname()[1]

    def accept_garbage():
        client, _ = sock.accept()
        client.send(b"garbage\r\n\r\n")
        client.close()

    import threading
    thread = threading.Thread(target=accept_garbage, daemon=True)
    thread.start()

    with fresh():
        rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py", url=f"http://127.0.0.1:{port}"))
        assert rc == 2 and "GR_APPROVAL" in err, err

    sock.close()


@test
def gui_import_zip_transport_gidiyor():
    mod = importlib.import_module("gui_import_zip")
    with tempfile.TemporaryDirectory() as tmp, fresh():
        d = Path(tmp)
        _dev_dir(d)
        FAKE.reply(200, {"ok": False, "error": "approval_pending", "approval_id": "x", "message": "bekle"})
        cwd, old_argv = os.getcwd(), sys.argv
        os.chdir(d)
        sys.argv = ["gui_import_zip.py", "--offline-repo", "Z", "--zip", str(d / "p.zip"), "--transport", "ds4k900001"]
        try:
            rc, out, err = run(mod.main)
        finally:
            os.chdir(cwd)
            sys.argv = old_argv
        assert rc == 3, (rc, out, err)
        assert "approval_pending: bekle" in out, out
        assert len(FAKE.calls) == 1, FAKE.calls
        b = FAKE.calls[0]["body"]
        assert b["script"] == "gui_import_zip.py", b
        assert b["transport"] == "ds4k900001", b
        assert b["zip_dosyasi"] == str((d / "p.zip").resolve()), b


# --- 9 script: onay beklerken SAP GUI'ye dokunulmuyor ------------------------------
def _dev_dir(d: Path):
    (d / ".conn_adt").write_text("ADT_SAP_TIER=DEV\n", encoding="utf-8")
    with zipfile.ZipFile(d / "p.zip", "w") as z:
        z.writestr("src/zcl_a.clas.abap", "CLASS zcl_a DEFINITION.\nENDCLASS.\n")
    (d / "objs.txt").write_text("CLAS ZCL_A\n", encoding="utf-8")


def _boom(*a, **k):
    raise AssertionError("onay beklerken SAP GUI'ye / alt adıma gidildi")


# script → (argv, beklenen gövde). "{d}" geçici DEV klasörü.
SCRIPTS = {
    "abapgit_bootstrap.py": (["--package", "ZPKG", "--cwd", "{d}"], {"paket": "ZPKG"}),
    "abapgit_deploy.py": (["--offline-repo", "ZREPO", "--package", "ZPKG", "--transport", "DS4K900001",
                           "--no-export", "--zip", "{d}/p.zip"],
                          {"paket": "ZPKG", "transport": "DS4K900001", "zip": True}),
    "gui_activate_package.py": (["--package", "ZPKG"], {"paket": "ZPKG"}),
    "gui_import_zip.py": (["--offline-repo", "ZREPO", "--zip", "{d}/p.zip"], {"zip": True}),
    "gui_run_zabapgit_auto.py": (["--offline-repo", "ZREPO", "--zip", "{d}/p.zip", "--transport", "DS4K900001"],
                                 {"transport": "DS4K900001", "zip": True}),
    "gui_run_zabapgit_bootstrap.py": (["--package", "ZPKG", "--out", "{d}/o.zip"], {"paket": "ZPKG"}),
    "gui_run_zabapgit_bootstrap_multi.py": (["--objs", "{d}/objs.txt", "--root", "ZPKG", "--out", "{d}/o.zip"], {}),
    "gui_run_zabapgit_deploy_multi.py": (["--zip", "{d}/p.zip", "--root", "ZPKG", "--transport", "DS4K900001"],
                                         {"transport": "DS4K900001", "zip": True}),
    "gui_stage_commit.py": (["--message", "m"], {}),
}


def _script_test(name, argv, expect):
    def t():
        mod = importlib.import_module(name[:-3])
        for attr in ("attach_scripting_engine", "_run_step"):
            if hasattr(mod, attr):
                setattr(mod, attr, _boom)
        with tempfile.TemporaryDirectory() as tmp, fresh():
            d = Path(tmp)
            _dev_dir(d)
            if name == "abapgit_deploy.py":
                subprocess.run(["git", "init", "-q", str(d)], check=True)
            FAKE.reply(200, {"ok": False, "error": "approval_pending", "approval_id": "x", "message": "bekle"})
            cwd, old_argv = os.getcwd(), sys.argv
            os.chdir(d)
            sys.argv = [name] + [a.replace("{d}", str(d)) for a in argv]
            try:
                rc, out, err = run(mod.main)
            finally:
                os.chdir(cwd)
                sys.argv = old_argv
            assert rc == 3, (name, rc, out, err)
            assert "approval_pending: bekle" in out, out
            assert len(FAKE.calls) == 1, FAKE.calls
            b = FAKE.calls[0]["body"]
            assert b["script"] == name, b
            assert b["paket"] == expect.get("paket", ""), b
            assert b["transport"] == expect.get("transport", ""), b
            if expect.get("zip"):
                assert Path(b["zip_dosyasi"]) == (d / "p.zip").resolve(), b
            else:
                assert b["zip_dosyasi"] == "", b
    t.__name__ = f"script_{name[:-3]}"
    return t


for _n, (_a, _e) in SCRIPTS.items():
    test(_script_test(_n, _a, _e))


@test
def qa_sisteminde_onaya_hic_sorulmuyor():
    mod = importlib.import_module("gui_import_zip")
    with tempfile.TemporaryDirectory() as tmp, fresh():
        d = Path(tmp)
        (d / ".conn_adt").write_text("ADT_SAP_TIER=QA\n", encoding="utf-8")
        cwd, old_argv = os.getcwd(), sys.argv
        os.chdir(d)
        sys.argv = ["gui_import_zip.py", "--offline-repo", "Z", "--zip", "p.zip"]
        try:
            rc, _, err = run(mod.main)
        finally:
            os.chdir(cwd)
            sys.argv = old_argv
        assert rc == 2 and "GR_TIER" in err and not FAKE.calls, (rc, err, FAKE.calls)


def main():
    ok = 0
    for t in TESTS:
        try:
            t()
            ok += 1
            print(f"geçti  {t.__name__}")
        except Exception as exc:  # noqa: BLE001
            print(f"KALDI  {t.__name__}: {exc!r}")
    print(f"{ok}/{len(TESTS)} geçti")
    return 0 if ok == len(TESTS) else 1


if __name__ == "__main__":
    sys.exit(main())
