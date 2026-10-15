#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — scan_doc_types.py: tablo okuma kararını SUNUCUYA soruyor. SAP yok.

    PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/test-scenarios/scripts/test_scan_doc_types_gate.py

Betik eskiden kendi ortamındaki ADT_RO_ALLOW_SQL'e bakıyordu; NTT Studio o
değişkeni yalnız 8787 sunucusunun ortamına koyuyor, ajanın terminaline değil
(2026-10-15). Karar sunucunun araç listesinde: `adt_sql` yoksa kapalı. Anahtar
da ajanın ortamındaki ABAP_HTTP_TOKEN. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT = Path(__file__).resolve().parent / "scan_doc_types.py"
TOKEN = "t" * 32
RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append(ok)
    print(("GECTI " if ok else "KALDI ") + name + ("" if ok else f" -- {detail}"))


def serve(tools):
    class Handler(BaseHTTPRequestHandler):
        def _reply(self, code, body):
            data = json.dumps(body).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _authorized(self):
            return self.headers.get("Authorization") == f"Bearer {TOKEN}"

        def do_GET(self):  # noqa: N802
            if not self._authorized():
                return self._reply(401, {"ok": False, "error": "unauthorized"})
            self._reply(200, {"ok": True, "tools": tools})

        def do_POST(self):  # noqa: N802
            if not self._authorized():
                return self._reply(401, {"ok": False, "error": "unauthorized"})
            self.rfile.read(int(self.headers.get("Content-Length") or 0))
            if "adt_sql" not in tools:
                return self._reply(404, {"ok": False, "error": "unknown_tool"})
            self._reply(200, {"ok": True, "columns": ["BLART", "LTEXT", "CNT"], "rows": [["SA", "Hesap", 3]]})

        def log_message(self, *args):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def run(srv):
    env = {k: v for k, v in os.environ.items() if not k.startswith("ADT_RO_")}
    env["ABAP_HTTP_TOKEN"] = TOKEN
    env["PYTHONIOENCODING"] = "utf-8"
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--module", "FI", "--server", f"http://127.0.0.1:{srv.server_address[1]}"],
        capture_output=True, text=True, encoding="utf-8", env=env, timeout=60)


srv = serve(["adt_get_source", "adt_sql"])
res = run(srv)
srv.shutdown()
check("sunucuda adt_sql varsa ortamda değişken olmadan tarıyor", res.returncode == 0 and "SA" in res.stdout,
      f"rc={res.returncode} out={res.stdout[-400:]} err={res.stderr[-400:]}")

srv = serve(["adt_get_source"])
res = run(srv)
srv.shutdown()
check("sunucuda adt_sql yoksa SAP'a sormadan 2 ile çıkıyor", res.returncode == 2 and "adt_sql" in res.stdout,
      f"rc={res.returncode} out={res.stdout[-400:]}")

failed = RESULTS.count(False)
print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
sys.exit(1 if failed else 0)
