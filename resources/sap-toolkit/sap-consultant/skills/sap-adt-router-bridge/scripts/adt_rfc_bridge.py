"""ADT-over-RFC bridge -- speak ADT HTTP to a system that only answers RFC.

Some customer landscapes expose SAP through SAProuter's NI protocol and nothing
else: 443 / 8000 / 44300 are shut at the firewall, so every HTTP ADT client fails
at connect. The system is still reachable, just not over HTTP.

This process is a TRANSPORT SHIM, not a second engine. It listens on
127.0.0.1:<BRIDGE_PORT> and, for each HTTP request, calls the standard
`SADT_REST_RFC_ENDPOINT` function module over RFC (through SAProuter), returning
the SAP response verbatim. Point `ADT_SAP_URL` at it and the normal sap-adt /
sap-adt-readonly server runs on top unchanged -- every guard it has (ghost
transport, source drift, auth breaker, Z/Y namespace, writable tier) still
applies, because none of them care how the bytes reach SAP.

    aXet.code / Claude Code
      -> adt_mcp_server.py            the engine and its guards
      -> http://127.0.0.1:8410        this process
      -> pyrfc | JPype+SAP JCo        whichever RFC library is on the machine
      -> RFC via SAProuter            /H/<router-host>/S/3299
      -> SADT_REST_RFC_ENDPOINT       -> ADT framework

TWO BACKENDS, because consultant machines differ in which one is already there:

  pyrfc   pyrfc 3.3.1 + SAP NetWeaver RFC SDK 7.50 (the SDK is an S-user download
          and the wheel is built against it). A field test on a routed customer
          DEV system had this connecting in under a minute. A pyrfc Connection IS
          one physical RFC handle, so ABAP session context survives across calls
          with no JCoContext equivalent, and it hands back XSTRING as Python
          bytes -- no signed-byte fold.
  jco     SAP JCo, scavenged from an existing Eclipse/ADT install via JPype. No
          SDK, no S-user, nothing to download -- if the consultant has Eclipse,
          this backend already works.

BRIDGE_BACKEND picks: auto (default), pyrfc, jco. `auto` prefers pyrfc when it
imports, because installing it is a deliberate act, and falls back to JCo.

Configuration -- NOTHING is hardcoded here. Values are read, first wins, from:
  1. the environment
  2. <project>/.env         RFC_* keys
  3. <project>/.conn_adt    ADT_SAP_USER / _PASSWORD / _CLIENT / _LANGUAGE
The project is $ADT_CWD if set, else the working directory -- the same rule the
ADT engine uses, so both halves read one file and cannot drift.

  RFC_ASHOST      application server host, as seen FROM the router
  RFC_SYSNR       instance number (00, 01, ...)
  RFC_CLIENT      mandant
  RFC_USER        or ADT_SAP_USER in .conn_adt
  RFC_PASSWD      or ADT_SAP_PASSWORD in .conn_adt
  RFC_LANG        default EN
  RFC_SAPROUTER   ROUTER HOP ONLY, e.g. /H/<router-host>/S/3299
  RFC_DEST_NAME   JCo destination label, default ADT_ROUTER_BRIDGE
  BRIDGE_PORT     default 8410
  BRIDGE_BACKEND  auto | pyrfc | jco
  JCO_JRE         override the Eclipse JRE autodetect   (jco backend)
  JCO_P2_POOL     override the JCo jar autodetect       (jco backend)

Usage:
  py adt_rfc_bridge.py selftest   one ADT discovery call; proves the whole path
  py adt_rfc_bridge.py            serve on 127.0.0.1:$BRIDGE_PORT

Derived from Enrico Andreoli's adt-rfc-bridge (MIT) and the SAP Community post
"Using Claude for SAP ABAP development on RFC-only SAProuter systems".
"""
import atexit
import datetime
import glob as _glob
import os
import queue
import sys
import threading
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


# --------------------------------------------------------------------------
# configuration
# --------------------------------------------------------------------------

def _project_dir():
    """Where .conn_adt / .env live. Same rule as adt_mcp_server.py."""
    return Path(os.environ.get("ADT_CWD") or Path.cwd()).resolve()


def _load_config():
    """Fill os.environ from .env and .conn_adt without clobbering real env vars."""
    proj = _project_dir()

    env_file = proj / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

    # The ADT engine's own file. Reuse its credentials so the consultant keeps ONE
    # set: .conn_adt already holds the user and password for this system, and
    # asking for them twice is how the two halves drift apart.
    conn = proj / ".conn_adt"
    if conn.is_file():
        alias = {
            "ADT_SAP_USER": "RFC_USER",
            "ADT_SAP_PASSWORD": "RFC_PASSWD",
            "ADT_SAP_CLIENT": "RFC_CLIENT",
            "ADT_SAP_LANGUAGE": "RFC_LANG",
        }
        for line in conn.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            target = alias.get(k.strip())
            if target:
                os.environ.setdefault(target, v.strip().strip('"').strip("'"))


def _need(name, hint):
    v = os.environ.get(name)
    if not v:
        sys.stderr.write(
            "ERROR: %s is not set.\n"
            "       %s\n"
            "       Put it in %s\\.env (or export it). This script ships no default\n"
            "       host, router or credential on purpose -- they differ per user and\n"
            "       must never live in the repo.\n" % (name, hint, _project_dir()))
        sys.exit(2)
    return v


_load_config()

RFC_ASHOST = _need("RFC_ASHOST", "SAP application server host, as reachable from the router.")
RFC_SYSNR = _need("RFC_SYSNR", "Instance number, e.g. 00.")
RFC_CLIENT = _need("RFC_CLIENT", "SAP client / mandant, e.g. 100.")
RFC_USER = _need("RFC_USER", "SAP user -- or set ADT_SAP_USER in .conn_adt.")
RFC_PASSWD = _need("RFC_PASSWD", "SAP password -- or set ADT_SAP_PASSWORD in .conn_adt.")
RFC_SAPROUTER = _need("RFC_SAPROUTER", "Router hop ONLY, e.g. /H/<router-host>/S/3299.")
RFC_LANG = os.environ.get("RFC_LANG", "EN")
DEST_NAME = os.environ.get("RFC_DEST_NAME", "ADT_ROUTER_BRIDGE")
BRIDGE_PORT = int(os.environ.get("BRIDGE_PORT", "8410"))

BACKEND_CHOICE = os.environ.get("BRIDGE_BACKEND", "auto").strip().lower()

LOGFILE = _project_dir() / ".tmp" / "adt_router_bridge.log"
_loglock = threading.Lock()

# Hop-by-hop headers describe THIS connection, not the ADT payload, so forwarding
# them corrupts the response we are about to frame ourselves.
_SKIP_RESP_HDR = {"content-length", "transfer-encoding", "connection", "keep-alive"}


def log(msg):
    line = datetime.datetime.now().strftime("%H:%M:%S.%f ") + msg
    with _loglock:
        try:
            LOGFILE.parent.mkdir(parents=True, exist_ok=True)
            with open(LOGFILE, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except OSError:
            pass


# --------------------------------------------------------------------------
# JVM / JCo bootstrap
# --------------------------------------------------------------------------

_JRE_PATTERNS = [
    "C:/Program Files/Eclipse*/plugins/org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_*/jre",
    "C:/Program Files/SAP/*/plugins/org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_*/jre",
    "C:/Users/*/eclipse/*/plugins/org.eclipse.justj.*.win32.x86_64_*/jre",
]


def _find_jre():
    override = os.environ.get("JCO_JRE")
    if override:
        p = Path(override)
        if not p.is_dir():
            sys.exit("ERROR: JCO_JRE=%s is not a directory." % override)
        return p
    pats = list(_JRE_PATTERNS)
    pats.append(str(Path.home() / "eclipse" / "*" / "plugins"
                    / "org.eclipse.justj.*.win32.x86_64_*" / "jre").replace("\\", "/"))
    for pat in pats:
        # Newest last: Eclipse_2025-06 sorts after Eclipse_2024-12, and a machine
        # with two installs should use the current one.
        hits = sorted(Path(p) for p in _glob.glob(pat) if Path(p).is_dir())
        if hits:
            return hits[-1]
    sys.exit(
        "ERROR: no Eclipse JRE found. Install Eclipse with the ADT plugin, or set\n"
        "       JCO_JRE to a 64-bit JRE directory (the one whose bin/server holds jvm.dll).")


def _find_jco_jars():
    """The two jars ADT ships: the JCo classes and the win64 native fragment."""
    pool = os.environ.get("JCO_P2_POOL")
    roots = [Path(pool)] if pool else [
        Path.home() / ".p2" / "pool" / "plugins",
        Path("C:/Program Files"),
    ]
    for root in roots:
        if not root.is_dir():
            continue
        core = sorted(root.rglob("com.sap.conn.jco_*.jar"))
        win = sorted(root.rglob("com.sap.conn.jco.win32.x86_64_*.jar"))
        if core and win:
            # Version is NOT pinned -- 3.1.12 today, 3.1.13 after the next ADT
            # update, and a pinned name turns a routine upgrade into a support call.
            return core[-1], win[-1]
    sys.exit(
        "ERROR: SAP JCo jars not found (com.sap.conn.jco_*.jar plus the\n"
        "       com.sap.conn.jco.win32.x86_64_*.jar fragment). They ship with Eclipse's\n"
        "       ADT plugin. Set JCO_P2_POOL to the plugin folder holding them if the\n"
        "       autodetect misses it.")


def _extract_native(win_jar):
    """sapjco3.dll lives inside the win32 fragment jar; the JVM needs it on disk.

    Extracted to a per-user cache, never into the skill folder: the installed copy
    is shared between projects and may be read-only.
    """
    lib_dir = Path.home() / ".sap-adt-router-bridge" / "lib"
    dll = lib_dir / "sapjco3.dll"
    if dll.is_file():
        return lib_dir
    lib_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(win_jar) as z:
        for member in z.namelist():
            if member.rsplit("/", 1)[-1].lower() == "sapjco3.dll":
                with z.open(member) as src, open(dll, "wb") as out:
                    out.write(src.read())
                return lib_dir
    sys.exit("ERROR: sapjco3.dll not found inside %s" % win_jar)


_jvm_started = False


def _start_jvm():
    global _jvm_started
    try:
        import jpype
    except ImportError:
        sys.exit(
            "ERROR: JPype1 is not installed. It is an on-demand dependency of this\n"
            "       skill only -- nothing else in the marketplace needs a JVM:\n"
            "         py -m pip install JPype1")
    if _jvm_started or jpype.isJVMStarted():
        _jvm_started = True
        return
    jre = _find_jre()
    jvm_lib = jre / "bin" / "server" / "jvm.dll"
    if not jvm_lib.is_file():
        jvm_lib = jre / "lib" / "server" / "libjvm.so"
    if not jvm_lib.is_file():
        sys.exit("ERROR: no jvm library under %s (looked for bin/server/jvm.dll)." % jre)
    core, win = _find_jco_jars()
    lib_dir = _extract_native(win)
    os.environ["PATH"] = str(lib_dir) + os.pathsep + os.environ.get("PATH", "")
    jpype.startJVM(
        str(jvm_lib),
        "-Djava.class.path=" + os.pathsep.join([str(core), str(win)]),
        "-Djava.library.path=" + str(lib_dir),
        convertStrings=True,
    )
    _jvm_started = True
    log("JVM started (jre=%s jco=%s)" % (jre.name, core.name))


_dest_registered = False


def _register_destination():
    global _dest_registered
    if _dest_registered:
        return
    _start_jvm()
    import jpype
    from com.sap.conn.jco.ext import DestinationDataProvider, Environment
    from java.util import Properties as JProperties

    @jpype.JImplements("com.sap.conn.jco.ext.DestinationDataProvider")
    class _Provider(object):
        @jpype.JOverride
        def getDestinationProperties(self, name):
            p = JProperties()
            p.setProperty(DestinationDataProvider.JCO_ASHOST, RFC_ASHOST)
            p.setProperty(DestinationDataProvider.JCO_SYSNR, RFC_SYSNR)
            p.setProperty(DestinationDataProvider.JCO_CLIENT, RFC_CLIENT)
            p.setProperty(DestinationDataProvider.JCO_USER, RFC_USER)
            p.setProperty(DestinationDataProvider.JCO_PASSWD, RFC_PASSWD)
            p.setProperty(DestinationDataProvider.JCO_LANG, RFC_LANG)
            p.setProperty(DestinationDataProvider.JCO_SAPROUTER, RFC_SAPROUTER)
            return p

        @jpype.JOverride
        def supportsEvents(self):
            return False

        @jpype.JOverride
        def setDestinationDataEventListener(self, listener):
            pass

    Environment.registerDestinationDataProvider(_Provider())
    _dest_registered = True
    log("JCo destination %s registered (router hop %s)" % (DEST_NAME, RFC_SAPROUTER))


# --------------------------------------------------------------------------
# which RFC library
#
# `auto` prefers pyrfc: it only imports if someone installed the wheel AND the
# NetWeaver RFC SDK it links against, which is a deliberate act. JCo is the
# fallback precisely because it is NOT deliberate -- the jars come from an
# Eclipse install the consultant already had for ADT.
# --------------------------------------------------------------------------

_backend = None


def _have_pyrfc():
    try:
        import pyrfc  # noqa: F401
        return True
    except Exception:  # noqa: BLE001 -- a missing SDK raises ImportError OR OSError
        return False


def resolve_backend():
    global _backend
    if _backend:
        return _backend
    if BACKEND_CHOICE == "pyrfc":
        if not _have_pyrfc():
            sys.stderr.write(
                "ERROR: BRIDGE_BACKEND=pyrfc but pyrfc will not import.\n"
                "       Needs BOTH: the SAP NetWeaver RFC SDK 7.50 (an S-user\n"
                "       download, unzipped with its lib/ on PATH) and pyrfc 3.3.1\n"
                "       built against it. A wheel without the SDK raises at\n"
                "       import, not at connect.\n")
            sys.exit(2)
        _backend = "pyrfc"
    elif BACKEND_CHOICE == "jco":
        _backend = "jco"
    elif BACKEND_CHOICE == "auto":
        _backend = "pyrfc" if _have_pyrfc() else "jco"
    else:
        sys.stderr.write("ERROR: BRIDGE_BACKEND must be auto, pyrfc or jco (got %s).\n"
                         % BACKEND_CHOICE)
        sys.exit(2)
    log("backend: %s (BRIDGE_BACKEND=%s)" % (_backend, BACKEND_CHOICE))
    return _backend


# --------------------------------------------------------------------------
# the RFC worker
#
# Everything below exists for one reason. SADT_REST_RFC_ENDPOINT opens a NEW ADT
# session per call unless the RFC connection is stateful, so a LOCK handle from
# call 1 is rejected in call 2 with ExceptionResourceInvalidLockHandle and no
# write can ever complete. JCoContext.begin() makes the connection stateful --
# but it binds to the CALLING THREAD, so opening it once in main and then serving
# requests on handler threads does nothing at all.
#
# Hence one dedicated worker: it attaches to the JVM, opens a single JCoContext
# for the life of the process, and every ADT call runs on it. One bridge process
# is one SAP session, which is the same shape as the MCP rule upstairs.
# --------------------------------------------------------------------------

_work = queue.Queue()
_worker_ready = threading.Event()
_worker_error = []
_worker_thread = None


def _open_pyrfc():
    """A Connection IS the stateful handle -- nothing to begin, nothing to bind."""
    import pyrfc
    params = dict(ashost=RFC_ASHOST, sysnr=RFC_SYSNR, client=RFC_CLIENT,
                  user=RFC_USER, passwd=RFC_PASSWD, lang=RFC_LANG)
    if RFC_SAPROUTER:
        params["saprouter"] = RFC_SAPROUTER
    conn = pyrfc.Connection(**params)
    log("pyrfc connection opened (one handle = one ABAP session)")
    return conn, lambda: conn.close()


def _open_jco():
    import jpype
    _register_destination()
    jpype.attachThreadToJVM()
    from com.sap.conn.jco import JCoContext, JCoDestinationManager
    dest = JCoDestinationManager.getDestination(DEST_NAME)
    JCoContext.begin(dest)
    log("stateful JCoContext opened")
    return dest, lambda: JCoContext.end(dest)


def _worker():
    closer = None
    try:
        if resolve_backend() == "pyrfc":
            dest, closer = _open_pyrfc()
        else:
            dest, closer = _open_jco()
    except BaseException as exc:  # noqa: BLE001 -- must reach the caller, not the thread
        _worker_error.append(exc)
        _worker_ready.set()
        return
    _worker_ready.set()
    try:
        while True:
            job = _work.get()
            if job is None:
                break
            fn, args, box, done = job
            try:
                box.append(("ok", fn(dest, *args)))
            except BaseException as exc:  # noqa: BLE001
                box.append(("err", exc))
            finally:
                done.set()
    finally:
        try:
            closer()
            log("RFC session closed")
        except Exception:  # noqa: BLE001
            pass


def _ensure_worker():
    global _worker_thread
    if _worker_thread is not None and _worker_thread.is_alive():
        return
    _worker_ready.clear()
    del _worker_error[:]
    _worker_thread = threading.Thread(target=_worker, name="rfc-session", daemon=True)
    _worker_thread.start()
    _worker_ready.wait()
    if _worker_error:
        raise RuntimeError("RFC connection failed: %s" % _worker_error[0])


def _shutdown():
    if _worker_thread is not None and _worker_thread.is_alive():
        _work.put(None)
        _worker_thread.join(timeout=10)


atexit.register(_shutdown)


def _submit(fn, *args):
    _ensure_worker()
    box = []
    done = threading.Event()
    _work.put((fn, args, box, done))
    done.wait()
    kind, value = box[0]
    if kind == "err":
        raise value
    return value


# --------------------------------------------------------------------------
# one ADT request -> one FM call
# --------------------------------------------------------------------------

# Each RFC call is a logon attempt. SAP locks the account after a handful of bad
# ones and a locked service user costs a Basis ticket, so the FIRST authentication
# failure stops the bridge rather than letting a retrying client spend the rest of
# the attempts. Same reasoning as the ADT engine's auth breaker.
_AUTH_MARKERS = ("RFC_ERROR_LOGON_FAILURE", "Name or password is incorrect",
                 "Password logon no longer possible", "User is locked",
                 "RFC_ERROR_SYSTEM_FAILURE: User")
_auth_tripped = threading.Event()


def _fm_call_jco(dest, method, uri, headers, body):
    import jpype
    fm = dest.getRepository().getFunction("SADT_REST_RFC_ENDPOINT")

    req = fm.getImportParameterList().getStructure("REQUEST")
    line = req.getStructure("REQUEST_LINE")
    line.setValue("METHOD", "GET" if method == "HEAD" else method)
    line.setValue("URI", uri)
    line.setValue("VERSION", "HTTP/1.1")

    tbl = req.getTable("HEADER_FIELDS")
    tbl.deleteAllRows()
    for k, v in headers:
        tbl.appendRow()
        tbl.setValue("NAME", k)
        tbl.setValue("VALUE", v)

    if body:
        # Java byte[] is SIGNED, Python bytes are not. Without this fold every byte
        # >= 128 -- which is every non-ASCII character in ABAP source and in a
        # Turkish comment -- raises on the way in.
        req.setValue("MESSAGE_BODY",
                     jpype.JArray(jpype.JByte)([b - 256 if b > 127 else b for b in body]))
    else:
        req.setValue("MESSAGE_BODY", jpype.JArray(jpype.JByte)(0))

    fm.execute(dest)

    resp = fm.getExportParameterList().getStructure("RESPONSE")
    status = resp.getStructure("STATUS_LINE")
    raw = str(status.getValue("STATUS_CODE") or "").strip()
    code = int(raw) if raw.isdigit() else 200
    reason = str(status.getValue("REASON_PHRASE") or "")

    out_headers = []
    out_tbl = resp.getTable("HEADER_FIELDS")
    for i in range(out_tbl.getNumRows()):
        out_tbl.setRow(i)
        name = str(out_tbl.getValue("NAME") or "")
        value = str(out_tbl.getValue("VALUE") or "")
        if name and name.lower() not in _SKIP_RESP_HDR:
            out_headers.append((name, value))

    val = resp.getValue("MESSAGE_BODY")
    if val is None:
        out_body = b""
    elif isinstance(val, (bytes, bytearray)):
        out_body = bytes(val)
    else:
        out_body = bytes([int(b) & 0xFF for b in val])
    return code, reason, out_headers, out_body


def _fm_call_pyrfc(conn, method, uri, headers, body):
    """Same function module, plain dicts, and no signed-byte fold.

    pyrfc maps XSTRING/RAWSTRING to Python bytes in both directions, so the
    JCo backend's `b - 256 if b > 127` dance -- which exists only because Java's
    byte is signed -- has no counterpart here.
    """
    result = conn.call("SADT_REST_RFC_ENDPOINT", REQUEST={
        "REQUEST_LINE": {"METHOD": "GET" if method == "HEAD" else method,
                         "URI": uri, "VERSION": "HTTP/1.1"},
        "HEADER_FIELDS": [{"NAME": k, "VALUE": v} for k, v in headers],
        "MESSAGE_BODY": body or b"",
    })
    resp = result.get("RESPONSE") or {}
    status = resp.get("STATUS_LINE") or {}
    raw = str(status.get("STATUS_CODE") or "").strip()
    code = int(raw) if raw.isdigit() else 200
    reason = str(status.get("REASON_PHRASE") or "")

    out_headers = [(row.get("NAME") or "", row.get("VALUE") or "")
                   for row in (resp.get("HEADER_FIELDS") or [])]
    out_headers = [(k, v) for k, v in out_headers
                   if k and k.lower() not in _SKIP_RESP_HDR]

    val = resp.get("MESSAGE_BODY")
    if val is None:
        out_body = b""
    elif isinstance(val, (bytes, bytearray)):
        out_body = bytes(val)
    else:
        out_body = str(val).encode("utf-8")
    return code, reason, out_headers, out_body


def adt_call(method, uri, headers, body):
    """Map one ADT HTTP request onto SADT_REST_RFC_ENDPOINT and back."""
    if _auth_tripped.is_set():
        raise RuntimeError(
            "refusing to call SAP: a previous logon failed and retrying locks the "
            "account. Fix the credentials in .conn_adt / .env, then restart the bridge.")
    log(">> %s %s" % (method, uri))
    try:
        fm = _fm_call_pyrfc if resolve_backend() == "pyrfc" else _fm_call_jco
        code, reason, out_headers, out_body = _submit(fm, method, uri, headers, body)
    except BaseException as exc:  # noqa: BLE001
        if any(marker in str(exc) for marker in _AUTH_MARKERS):
            _auth_tripped.set()
            log("AUTH FAILURE -- breaker tripped, no retry")
        raise

    # The engine upstairs fetches a CSRF token before writing. There is no ICM in
    # this path to issue one and SAP does not check it on the RFC endpoint, so a
    # constant satisfies the client without pretending to be a real token.
    if any(k.lower() == "x-csrf-token" and v.strip().lower() == "fetch" for k, v in headers):
        if not any(k.lower() == "x-csrf-token" for k, _ in out_headers):
            out_headers.append(("X-CSRF-Token", "ADT-RFC-BRIDGE"))

    log("<< %d %s (%d bytes)" % (code, reason, len(out_body)))
    return code, reason, out_headers, out_body


# --------------------------------------------------------------------------
# HTTP surface
# --------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass  # the console belongs to the agent; we keep our own log file

    def _handle(self):
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
            body = self.rfile.read(length) if length else b""
            headers = [(k, v) for k, v in self.headers.items()
                       if k.lower() not in ("content-length", "connection", "host")]
            code, reason, out_headers, out_body = adt_call(
                self.command, self.path, headers, body)
        except BaseException as exc:  # noqa: BLE001
            import traceback
            log("ERROR: %s\n%s" % (exc, traceback.format_exc()))
            msg = ("ADT-RFC bridge error: %s" % exc).encode("utf-8", "replace")
            self.send_response(502, "Bad Gateway")
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            return

        self.send_response(code, reason)
        for k, v in out_headers:
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(out_body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(out_body)

    do_GET = do_POST = do_PUT = do_DELETE = do_HEAD = do_OPTIONS = do_PATCH = _handle


def selftest():
    code, reason, hdrs, body = adt_call(
        "GET", "/sap/bc/adt/discovery",
        [("Accept", "application/atomsvc+xml"), ("sap-client", RFC_CLIENT)], b"")
    ctype = dict((k.lower(), v) for k, v in hdrs).get("content-type", "")
    print("SELFTEST  backend: %s" % resolve_backend())
    print("          status : %d %s" % (code, reason))
    print("          type   : %s" % ctype)
    print("          bytes  : %d" % len(body))
    ok = code == 200 and "atomsvc" in ctype
    print("RESULT: %s" % ("PASS - ADT is reachable over RFC"
                          if ok else "FAIL - see %s" % LOGFILE))
    return 0 if ok else 1


def main():
    _ensure_worker()
    srv = ThreadingHTTPServer(("127.0.0.1", BRIDGE_PORT), Handler)
    print("ADT-over-RFC bridge on http://127.0.0.1:%d  (backend: %s)"
          % (BRIDGE_PORT, resolve_backend()))
    print("  target : %s sysnr %s client %s user %s" % (RFC_ASHOST, RFC_SYSNR, RFC_CLIENT, RFC_USER))
    print("  router : %s" % RFC_SAPROUTER)
    print("Set ADT_SAP_URL=http://127.0.0.1:%d in .conn_adt, then start the ADT server."
          % BRIDGE_PORT)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopping")
    finally:
        _shutdown()
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "selftest":
        sys.exit(selftest())
    sys.exit(main())
