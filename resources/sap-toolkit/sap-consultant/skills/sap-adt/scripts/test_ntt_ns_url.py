#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — ntt_ns_url.py testleri. YEREL sahte HTTP sunucusuyla; SAP yok.

    PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_ns_url.py

Ad alanlı nesne (`/ITETR/CL_EHO_BANK_SERVICE`) adresinin yolunda `//itetr/`
oluşuyor; ADT `%2fitetr%2f` bekliyor ve öteki biçime 404 dönüyor. Sunucunun
GERÇEKTEN aldığı yol denetleniyor. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import sys
import threading
import types
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import requests  # noqa: E402

import ntt_ns_url as ns  # noqa: E402

RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append(ok)
    print(("GECTI " if ok else "KALDI ") + name + ("" if ok else f" -- {detail}"))


# --- saf dönüşüm --------------------------------------------------------------
cases = [
    ("https://h:44300/sap/bc/adt/oo/classes//itetr/cl_eho_bank_service/source/main",
     "https://h:44300/sap/bc/adt/oo/classes/%2fitetr%2fcl_eho_bank_service/source/main"),
    ("/sap/bc/adt/functions/groups//itetr/fg01/fmodules//itetr/fm_read",
     "/sap/bc/adt/functions/groups/%2fitetr%2ffg01/fmodules/%2fitetr%2ffm_read"),
    ("https://h/sap/bc/adt/oo/classes//itetr/cl_x",
     "https://h/sap/bc/adt/oo/classes/%2fitetr%2fcl_x"),
    # ad alanı yok: dokunulmuyor
    ("https://h/sap/bc/adt/oo/classes/cl_gui_alv_grid/source/main",
     "https://h/sap/bc/adt/oo/classes/cl_gui_alv_grid/source/main"),
    # zaten kodlu (adt_search'ün verdiği uri): dokunulmuyor
    ("https://h/sap/bc/adt/oo/classes/%2fitetr%2fcl_x/source/main",
     "https://h/sap/bc/adt/oo/classes/%2fitetr%2fcl_x/source/main"),
    # sorgu dizgisi yol değil: dokunulmuyor
    ("https://h/sap/bc/adt/repository/informationsystem/search?query=//itetr/*",
     "https://h/sap/bc/adt/repository/informationsystem/search?query=//itetr/*"),
]
for raw, want in cases:
    got = ns.encode_namespaces(raw)
    check(f"encode_namespaces({raw})", got == want, f"{got!r} != {want!r}")


# --- gerçek istek: sunucunun aldığı yol --------------------------------------
seen = []


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        seen.append(self.path)
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_address[1]}"

# install(): motorun SAPADTClient'ı yerine sahte bir sınıf; sarmalayıcı yalnız
# `session` özniteliğine bakıyor.
fake = types.ModuleType("sap_adt_lib")


class SAPADTClient:
    def __init__(self, url):
        self.url = url
        self.session = requests.Session()


fake.SAPADTClient = SAPADTClient
sys.modules["sap_adt_lib"] = fake
ns.install()
ns.install()  # ikinci çağrı ikinci kez sarmamalı

client = SAPADTClient(base)
client.session.get(f"{base}/sap/bc/adt/oo/classes//itetr/cl_eho_bank_service/source/main")
client.session.get(f"{base}/sap/bc/adt/oo/classes/cl_gui_alv_grid/source/main")
# requests yüzde kodlamasını büyük harfe çeviriyor (%2F); RFC 3986 §2.1'e göre
# aynı şey, SAP ikisini de çözüyor.
check("SAP oturumunun isteği kodlu yola gidiyor",
      [p.lower() for p in seen[:1]] == ["/sap/bc/adt/oo/classes/%2fitetr%2fcl_eho_bank_service/source/main"], repr(seen))
check("ad alanı olmayan istek değişmiyor",
      seen[1:2] == ["/sap/bc/adt/oo/classes/cl_gui_alv_grid/source/main"], repr(seen))
check("install iki kez sarmıyor",
      getattr(SAPADTClient.__init__, "__wrapped__", None) is not None
      and getattr(SAPADTClient.__init__.__wrapped__, "__wrapped__", None) is None)

# Oturum dışı bir requests çağrısına dokunulmuyor (onay ucu vb.).
plain = requests.Session()
plain.get(f"{base}/x//y/z")
check("motor dışı oturuma dokunulmuyor", seen[-1] == "/x//y/z", repr(seen))

server.shutdown()
failed = RESULTS.count(False)
print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
sys.exit(1 if failed else 0)
