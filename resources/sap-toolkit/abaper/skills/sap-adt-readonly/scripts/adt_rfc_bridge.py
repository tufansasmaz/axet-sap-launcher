#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HTTP-to-RFC bridge for ADT access through a SAProuter that denies raw/native
TCP tunneling to the ICM HTTP(S) port but permits native SAP-protocol traffic
(DIAG, RFC). See adt_rfc_probe.py's docstring and PROJE-BILGI.md "BONY" bulgusu
for the full background on why this exists.

WHAT THIS IS
    A tiny localhost HTTP server that:
      1. Opens ONE persistent RFC connection through the SAProuter (pyrfc),
         reusing the exact "native SAP protocol" channel SAP GUI's DIAG
         connection already uses successfully on these restricted routers.
      2. On every incoming HTTP request, marshals it into a call to the
         (community-documented, NOT an official SAP public API) function
         module SADT_REST_RFC_ENDPOINT, and marshals the RFC response back
         into a real HTTP response.
      3. Because it speaks plain HTTP on 127.0.0.1, the EXISTING sap_adt_lib.py
         / adt_readonly_server.py / adt_mcp_server.py code works completely
         UNCHANGED against it — you just point ADT_SAP_URL at this bridge
         instead of the real (blocked) HTTPS endpoint. aXet SAP Launcher
         already does this automatically in .conn_adt when it detects a
         router -94 permission-denied failure.

LIMITATIONS (read before relying on this for anything beyond reads)
    - SADT_REST_RFC_ENDPOINT is stateless per RFC call — it does not carry a
      real HTTP session/cookie. This bridge synthesizes a placeholder CSRF
      token so sap_adt_lib.py's "X-CSRF-Token: Fetch" flow gets a response,
      but multi-step stateful flows (notably object ACTIVATION) are known to
      NOT work reliably over this bridge. Reads (get_source, search, sql,
      where_used, syntax_check, atc_check, list_package, revisions, dumps,
      list_transports, transport_status) are the intended, tested use case.
    - HEAD requests are converted to GET internally (the FM has been observed
      to reject literal HTTP HEAD) and the response body is dropped before
      returning, to keep HEAD semantics correct for the caller.
    - This is NOT an officially documented SAP integration point. If
      SADT_REST_RFC_ENDPOINT's parameter/field names differ on your system's
      release, run adt_rfc_probe.py first — it prints the real names via
      RFC_GET_FUNCTION_INTERFACE so you can fix the marshalling below.

REQUIRES (see SKILL.md "Router-only sistemler (RFC bridge)")
    aXet SAP Launcher bundles its own Python + pyrfc + SAP NW RFC SDK
    (resources/rfc-runtime) and spawns this script with that runtime
    automatically — you normally never need to install anything. This
    section only applies if you run this script standalone (outside the
    launcher) with your own Python:
    - SAP NW RFC SDK (licensed, requires your own SAP S-user download
      authorization) + SAPNWRFC_HOME environment variable pointing at it.
    - pip install pyrfc (compiles against the SDK; needs a matching C/C++
      toolchain for your Python version).

USAGE
    ADT_CWD=<dir-with-.conn_adt> py adt_rfc_bridge.py [--host 127.0.0.1] [--port 8788]

    Then point ADT_SAP_URL at this bridge (aXet SAP Launcher already writes
    ADT_SAP_URL=http://127.0.0.1:8788 into .conn_adt when RFC mode is needed)
    and use %sap-adt-readonly exactly as documented — it will transparently
    go through this bridge instead of talking to SAP directly.
"""
from __future__ import annotations

import os
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit

try:
    from dotenv import load_dotenv
except ImportError:
    print("[adt-rfc-bridge] FAIL: python-dotenv not installed. pip install python-dotenv", file=sys.stderr)
    sys.exit(1)


def _ensure_sapnwrfc_dll_dir() -> None:
    """Two independent DLL-search mechanisms need SAPNWRFC_HOME/lib:
    1. Python >=3.8's own extension-module loader (pyrfc's _cyrfc.pyd) no
       longer searches PATH (PEP 3118 / bpo-36085) -- needs os.add_dll_directory().
    2. sapnwrfc.dll's OWN internal LoadLibrary calls for its ICU dependencies
       (icuuc50.dll/icudt50.dll/icuin50.dll), made deep inside the native RFC
       runtime when a Connection is actually opened, are classic LoadLibrary
       calls that only honour the process PATH -- add_dll_directory() does not
       cover those, so PATH must be extended too, or you get a native
       'Could not open the ICU common library' error at logon time (not at
       import time), pointing at [nlsui0.c] / SAP note 519753."""
    if sys.platform != "win32":
        return
    home = os.getenv("SAPNWRFC_HOME")
    if not home:
        return
    lib_dir = Path(home) / "lib"
    if not lib_dir.is_dir():
        return
    try:
        os.add_dll_directory(str(lib_dir))
    except (AttributeError, OSError):
        pass
    lib_dir_str = str(lib_dir)
    path = os.environ.get("PATH", "")
    if lib_dir_str not in path.split(os.pathsep):
        os.environ["PATH"] = lib_dir_str + os.pathsep + path


def find_conn_file() -> Path:
    for env_var in ("CLAUDE_CWD", "INIT_CWD", "COPILOT_CWD", "ADT_CWD"):
        value = os.getenv(env_var)
        if value:
            p = Path(value)
            if p.exists():
                candidate = p.resolve() / ".conn_adt"
                if candidate.exists():
                    return candidate
    cwd_candidate = Path.cwd().resolve() / ".conn_adt"
    if cwd_candidate.exists():
        return cwd_candidate
    value = os.getenv("PWD")
    if value:
        p = Path(value)
        if p.exists():
            candidate = p.resolve() / ".conn_adt"
            if candidate.exists():
                return candidate
    return cwd_candidate


def load_rfc_config() -> dict:
    conn_path = find_conn_file()
    if not conn_path.exists():
        sys.stderr.write(f"[adt-rfc-bridge] FAIL: .conn_adt not found (looked at {conn_path}).\n")
        sys.exit(1)
    load_dotenv(dotenv_path=conn_path)

    if os.getenv("ADT_RFC_MODE", "").lower() not in ("true", "1", "yes"):
        sys.stderr.write(
            "[adt-rfc-bridge] FAIL: ADT_RFC_MODE is not 'true' in .conn_adt. This bridge is "
            "only meant for systems aXet SAP Launcher flagged as router-permission-denied.\n"
        )
        sys.exit(1)

    cfg = {
        "ashost": os.getenv("ADT_RFC_ASHOST"),
        "sysnr": os.getenv("ADT_RFC_SYSNR", "00"),
        "client": os.getenv("ADT_SAP_CLIENT", "").strip() or "000",
        "user": os.getenv("ADT_SAP_USER"),
        "passwd": os.getenv("ADT_SAP_PASSWORD"),
        "lang": os.getenv("ADT_SAP_LANGUAGE", "EN"),
        "saprouter": os.getenv("ADT_RFC_SAPROUTER"),
    }
    missing = [k for k in ("ashost", "user", "passwd", "saprouter") if not cfg.get(k)]
    if missing:
        sys.stderr.write(f"[adt-rfc-bridge] FAIL: .conn_adt is missing RFC fields: {missing}\n")
        sys.exit(1)
    return cfg


class RfcBridgeBusy(Exception):
    """Raised when a caller can't get the connection lock within
    RfcAdtClient._LOCK_ACQUIRE_TIMEOUT -- i.e. a PREVIOUS request is still
    stuck opening the RFC connection (see class docstring). Handled
    separately from generic RFC errors so the HTTP response (503, not 502)
    and message make it obvious this is "still trying", not "failed"."""


class RfcAdtClient:
    """Holds one lazily-opened, lock-serialized RFC connection and knows how to
    turn (method, uri, headers, body) into a SADT_REST_RFC_ENDPOINT call and
    back into (status, reason, headers, body)."""

    # Router olayında ilk pyrfc.Connection() denemesi (özellikle SAProuter'ın
    # paketi AÇIKÇA reddetmediği, sessizce DÜŞÜRDÜĞÜ durumlarda -- bkz.
    # launcher.ts describeRfcEndpointFailure "zaman aşımı" notu) OS'in kendi
    # TCP connect timeout'una kadar (onlarca saniye/dakika) BLOKE olabilir.
    # Bu blok self._lock'u tutar -- eskiden sonraki HER istek (bir "tekrar
    # dene" dahil) bu lock'un ARKASINDA süresiz sıraya giriyordu, yani her
    # tekrar deneme aynı yanıltıcı "zaman aşımı" sonucunu (aslında hâlâ İLK
    # denemenin kendisi) üretiyordu -- kullanıcıya "az önce de aynı hata,
    # şimdi de aynı hata" gibi görünüyordu. Artık lock timeout'lu acquire
    # ediliyor: hâlâ meşgulse (ilk deneme sürüyor) HEMEN, dürüst bir 503
    # dönülüyor -- "hâlâ kuruluyor" ile "gerçekten başarısız oldu" birbirine
    # karışmıyor.
    _LOCK_ACQUIRE_TIMEOUT = 30.0

    def __init__(self, cfg: dict):
        self._cfg = cfg
        self._conn = None
        self._lock = threading.Lock()
        self._csrf_counter = 0
        self._connecting_since: float | None = None

    def _ensure_connection(self):
        if self._conn is not None:
            return
        _ensure_sapnwrfc_dll_dir()
        import pyrfc

        self._conn = pyrfc.Connection(
            ashost=self._cfg["ashost"],
            sysnr=self._cfg["sysnr"],
            client=self._cfg["client"],
            user=self._cfg["user"],
            passwd=self._cfg["passwd"],
            lang=self._cfg["lang"],
            saprouter=self._cfg["saprouter"],
        )
        self._connecting_since = None

    def _call_endpoint(self, request_struct: dict):
        """Calls SADT_REST_RFC_ENDPOINT, retrying ONCE after a fresh reconnect
        if the call raises (e.g. the RFC connection died underneath us).
        Deliberately does NOT retry more than once -- repeated logon attempts
        on a bad connection can lock the SAP user, same caution the reference
        adt-rfc-bridge implementation (enricoandreoli/adt-rfc-bridge) takes."""
        try:
            self._ensure_connection()
            return self._conn.call("SADT_REST_RFC_ENDPOINT", REQUEST=request_struct)
        except Exception:
            self._conn = None
            self._connecting_since = None
            self._ensure_connection()
            return self._conn.call("SADT_REST_RFC_ENDPOINT", REQUEST=request_struct)

    def request(self, method: str, uri: str, headers: list, body: bytes):
        """Returns (status_code, reason_phrase, headers_list, body_bytes)."""
        acquired = self._lock.acquire(timeout=self._LOCK_ACQUIRE_TIMEOUT)
        if not acquired:
            waited = time.monotonic() - (self._connecting_since or time.monotonic())
            raise RfcBridgeBusy(
                f"RFC bağlantısı hâlâ kuruluyor (ilk deneme ~{waited:.0f}s'dir sürüyor) -- bu genelde "
                "SAProuter'ın paketi AÇIKÇA reddetmeyip SESSİZCE düşürdüğü bir durumun işareti (bkz. "
                "sap-context.md 'zaman aşımı' notu). Tekrar tekrar deneme aynı sonucu üretir; Basis/network "
                "ekibinin gateway portu (33<instance no>) için saprouttab izni kontrol etmesi gerekiyor."
            )
        try:
            if self._conn is None and self._connecting_since is None:
                self._connecting_since = time.monotonic()
            fetch_csrf = any(h[0].lower() == "x-csrf-token" and h[1] == "Fetch" for h in headers)
            real_method = "GET" if method.upper() == "HEAD" else method.upper()

            forwarded_headers = [{"NAME": k, "VALUE": v} for (k, v) in headers if k.lower() != "x-csrf-token"]

            request_struct = {
                "REQUEST_LINE": {"METHOD": real_method, "URI": uri, "VERSION": "HTTP/1.1"},
                "HEADER_FIELDS": forwarded_headers,
                "MESSAGE_BODY": body or b"",
            }

            result = self._call_endpoint(request_struct)
            response = result["RESPONSE"]
            status_line = response["STATUS_LINE"]
            status_code = int(status_line.get("STATUS_CODE", 500))
            reason = status_line.get("REASON_PHRASE", "")
            resp_headers = [(h["NAME"], h["VALUE"]) for h in response.get("HEADER_FIELDS", [])]
            resp_body = response.get("MESSAGE_BODY", b"") or b""

            if fetch_csrf:
                self._csrf_counter += 1
                # SADT_REST_RFC_ENDPOINT calls carry no HTTP session, so SAP
                # never issues a real CSRF token here. The FM itself does not
                # validate CSRF (the RFC logon already authenticated the
                # call), so any stable placeholder that round-trips back on
                # the next request satisfies clients that merely check for
                # a non-empty X-CSRF-Token header before attempting a write.
                resp_headers = [h for h in resp_headers if h[0].lower() != "x-csrf-token"]
                resp_headers.append(("X-CSRF-Token", f"rfc-bridge-placeholder-{self._csrf_counter}"))

            if method.upper() == "HEAD":
                resp_body = b""

            return status_code, reason, resp_headers, resp_body
        finally:
            self._lock.release()

    def close(self):
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None


def run_bridge(host: str, port: int, cfg: dict) -> None:
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    client = RfcAdtClient(cfg)

    class _Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def _bridge_health(self):
            import json
            body = json.dumps({
                "ok": True,
                "server": "adt-rfc-bridge",
                "mode": "rfc-over-saprouter",
                "ashost": cfg["ashost"],
                "saprouter": cfg["saprouter"],
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _handle(self, method: str):
            if self.path in ("/__bridge_health", "/health") and method == "GET":
                return self._bridge_health()

            uri = self.path
            headers = [(k, v) for k, v in self.headers.items()]
            clen = int(self.headers.get("Content-Length", 0) or 0)
            body = self.rfile.read(clen) if clen else b""

            try:
                status, reason, resp_headers, resp_body = client.request(method, uri, headers, body)
            except RfcBridgeBusy as exc:
                msg = str(exc).encode("utf-8")
                self.send_response(503)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(msg)))
                self.end_headers()
                self.wfile.write(msg)
                return
            except Exception as exc:
                msg = f"adt-rfc-bridge error calling SADT_REST_RFC_ENDPOINT: {exc}".encode("utf-8")
                self.send_response(502)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(msg)))
                self.end_headers()
                self.wfile.write(msg)
                return

            self.send_response(status, reason or None)
            skip = {"content-length", "transfer-encoding", "connection"}
            for name, value in resp_headers:
                if name.lower() in skip:
                    continue
                self.send_header(name, value)
            self.send_header("Content-Length", str(len(resp_body)))
            self.end_headers()
            if resp_body:
                self.wfile.write(resp_body)

        def do_GET(self):
            self._handle("GET")

        def do_HEAD(self):
            self._handle("HEAD")

        def do_POST(self):
            self._handle("POST")

        def do_PUT(self):
            self._handle("PUT")

        def do_DELETE(self):
            self._handle("DELETE")

    srv = ThreadingHTTPServer((host, port), _Handler)
    sys.stderr.write(
        f"[adt-rfc-bridge] listening on http://{host}:{port} -> RFC ashost={cfg['ashost']} "
        f"sysnr={cfg['sysnr']} via saprouter={cfg['saprouter']}\n"
        f"[adt-rfc-bridge] point ADT_SAP_URL at this address; existing ADT tooling works unchanged.\n"
        f"[adt-rfc-bridge] GET /health for a liveness check.\n"
    )
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()
    finally:
        client.close()


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description="HTTP-to-RFC bridge for ADT over a restrictive SAProuter")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=None, help="default: ADT_RFC_BRIDGE_PORT from .conn_adt, else 8788")
    args, _unknown = ap.parse_known_args()

    cfg = load_rfc_config()

    _ensure_sapnwrfc_dll_dir()
    try:
        import pyrfc  # noqa: F401
    except ImportError as exc:
        sys.stderr.write(
            "[adt-rfc-bridge] FAIL: pyrfc is not installed/importable: " + str(exc) + "\n"
            "  See SKILL.md 'Router-only sistemler (RFC bridge)' for setup steps — you need\n"
            "  the SAP NW RFC SDK (your own SAP S-user download) + SAPNWRFC_HOME + pip install pyrfc.\n"
            "  Run adt_rfc_probe.py first to validate the setup before starting this bridge.\n"
        )
        sys.exit(1)

    port = args.port or int(os.getenv("ADT_RFC_BRIDGE_PORT", "8788"))
    run_bridge(args.host, port, cfg)


if __name__ == "__main__":
    main()
