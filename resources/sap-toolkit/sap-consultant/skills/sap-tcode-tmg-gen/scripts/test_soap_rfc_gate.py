#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — soap_rfc.py kapısı: sahte 8787 ile betik davranışı. SAP yok.

    py -3 -I resources/sap-toolkit/sap-consultant/skills/sap-tcode-tmg-gen/scripts/test_soap_rfc_gate.py

gen_tcode.py ve gen_badi_impl.py gerçek alt süreç olarak (`-I`) çalıştırılır.
Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
BADI = HERE.parents[1] / "sap-badi-impl-gen" / "scripts"
SECRET = "Gizli-Parola-42"
TOKEN = "t" * 43
RESULTS = []


class Fake8787:
    def __init__(self):
        self.requests = []
        self.status, self.answer = 200, {}
        outer = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(n).decode("utf-8")
                outer.requests.append((self.path, dict(self.headers.items()), raw))
                data = json.dumps(outer.answer).encode("utf-8")
                self.send_response(outer.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"

    def reset(self, status=200, answer=None):
        self.requests.clear()
        self.status, self.answer = status, answer or {}


SRV = Fake8787()
OK_RFC = {"ok": True, "rfc": {"ok": True, "http": 200, "fault": None,
                             "out": {"EV_OK": "X", "EV_MESSAGE": "olusturuldu"}}}


def project(tier: str | None) -> Path:
    pd = Path(tempfile.mkdtemp(prefix="srfc-"))
    lines = ["ADT_SAP_URL=https://sap.example:44300", "ADT_SAP_USER=DEV1",
             f"ADT_SAP_PASSWORD={SECRET}", "ADT_SAP_CLIENT=100"]
    if tier:
        lines.append(f"ADT_SAP_TIER={tier}")
    (pd / ".conn_adt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return pd


def run(script: Path, pd: Path, *args, env_extra=None):
    env = {k: v for k, v in os.environ.items() if not k.startswith(("ABAP_HTTP", "NTT_STUDIO"))}
    env.update({"ABAP_HTTP_URL": SRV.url, "ABAP_HTTP_TOKEN": TOKEN, "PYTHONIOENCODING": "utf-8"})
    env.update(env_extra or {})
    p = subprocess.run([sys.executable, "-I", "-X", "utf8", str(script), "--cwd", str(pd), *args],
                       capture_output=True, text=True, encoding="utf-8", env=env, timeout=60)
    assert SECRET not in p.stdout and SECRET not in p.stderr, "parola çıktıya sızdı"
    for _path, headers, raw in SRV.requests:
        assert SECRET not in raw and SECRET not in json.dumps(headers), "parola isteğe sızdı"
    return p


TCODE = HERE / "gen_tcode.py"
TC_ARGS = ("--tcode", "ZPM_X", "--program", "ZPM_P", "--package", "ZPM", "--transport", "DS4K900001")


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


def t_non_dev_refused():
    for tier, extra in (("QA", None), ("PRD", None), (None, None), ("DEV", {"NTT_STUDIO_SAP_TIER": "PRD"})):
        SRV.reset(answer=OK_RFC)
        p = run(TCODE, project(tier), *TC_ARGS, env_extra=extra)
        assert p.returncode == 2 and "GR_TIER" in p.stderr, (tier, extra, p.returncode, p.stderr)
        assert SRV.requests == [], f"{tier}: SAP'a/sunucuya gidildi"


def t_role_refused():
    SRV.reset(status=404, answer={"ok": False, "error": "unknown_tool"})
    p = run(TCODE, project("DEV"), *TC_ARGS)
    assert p.returncode == 2 and "GR_ROLE" in p.stderr, (p.returncode, p.stderr)


def t_no_token_refused():
    SRV.reset(answer=OK_RFC)
    p = run(TCODE, project("DEV"), *TC_ARGS, env_extra={"ABAP_HTTP_TOKEN": ""})
    assert p.returncode == 2 and SRV.requests == [], p.stderr


def t_pending_and_denied():
    SRV.reset(answer={"ok": False, "error": "approval_pending", "message": "pencere"})
    p = run(TCODE, project("DEV"), *TC_ARGS)
    assert p.returncode == 3 and "approval_pending:" in p.stdout, (p.returncode, p.stdout)
    SRV.reset(answer={"ok": False, "error": "approval_denied", "message": "Kullanıcı reddetti."})
    p = run(TCODE, project("DEV"), *TC_ARGS)
    assert p.returncode == 2 and "approval_denied" in p.stderr and "[OK]" not in p.stdout, p.stderr


def t_approved_request_shape():
    SRV.reset(answer=OK_RFC)
    p = run(TCODE, project("DEV"), *TC_ARGS)
    assert p.returncode == 0 and "[OK] olusturuldu" in p.stdout, (p.returncode, p.stdout, p.stderr)
    assert len(SRV.requests) == 1
    path, headers, raw = SRV.requests[0]
    assert path == "/tool/axet_rfc_uret" and headers.get("Authorization") == f"Bearer {TOKEN}"
    body = json.loads(raw)
    assert body["fm"] == "ZND_FM_TCODE_GEN" and body["params"]["IV_DEVCLASS"] == "ZPM", body
    assert body["params"]["IV_TRANSPORT"] == "DS4K900001" and body["kaynak_dosyasi"] == ""


def t_badi_hook_sends_source_file():
    SRV.reset(answer=OK_RFC)
    pd = project("DEV")
    (pd / "hook.abap").write_text("WRITE 'x'.\r\n", encoding="utf-8")
    p = run(BADI / "gen_badi_impl.py", pd, "--kind", "HOOK", "--enhname", "ZEI_X",
            "--program", "SAPMV45A", "--full-name", "\\PR:SAPMV45A", "--source-file",
            str(pd / "hook.abap"))
    assert p.returncode == 0, (p.stdout, p.stderr)
    body = json.loads(SRV.requests[0][2])
    assert body["fm"] == "ZND_FM_BADI_IMPL_GEN" and body["params"]["IV_SOURCE"] == "WRITE 'x'."
    assert Path(body["kaynak_dosyasi"]) == (pd / "hook.abap").resolve(), body


def t_copies_identical():
    a = (HERE / "soap_rfc.py").read_bytes().replace(b"\r\n", b"\n")
    b = (BADI / "soap_rfc.py").read_bytes().replace(b"\r\n", b"\n")
    assert a == b, "iki skill'in soap_rfc.py kopyası ayrıştı"
    assert b"ADT_SAP_PASSWORD" not in a, "soap_rfc.py parola okuyor"


TESTS = [
    ("non_dev_refused", "QA/PRD/bilinmeyen kademede SAP'a gidiliyor", t_non_dev_refused),
    ("role_refused", "salt okunur sunucuda (modül danışmanı / DEV dışı) yazma deneniyor", t_role_refused),
    ("no_token", "NTT Studio dışı terminalden onaysız gidiliyor", t_no_token_refused),
    ("pending_denied", "bekleyen/reddedilen onay başarı sayılıyor", t_pending_and_denied),
    ("approved_shape", "onaylı çağrı yanlış araca/argümanla gidiyor", t_approved_request_shape),
    ("badi_hook_source", "HOOK kaynak dosyası sunucuya gitmiyor", t_badi_hook_sends_source_file),
    ("copies_identical", "kopyalar ayrıştı ya da parola okunuyor", t_copies_identical),
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
