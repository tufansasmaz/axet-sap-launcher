"""Direct LOCK -> PUT -> ACTIVATE -> UNLOCK against the bridge. ESCAPE HATCH ONLY.

The normal path is the ADT engine (sap-adt) pointed at the bridge via
ADT_SAP_URL. Use this script only for the one failure it exists for:

    On some NetWeaver 7.52 systems the LOCK response carries
    MODIFICATION_SUPPORT=NoModification even though the object is perfectly
    writable, and a strict ADT client refuses to continue. The write itself
    succeeds; only the client-side pre-check is wrong.

This script does not read that field, so it gets the change in. It also carries
NONE of the engine's guards -- no ghost-transport prevention, no source-drift
check, no Z/Y namespace guard, no writable-tier check. Every use is a manual
decision: name the transport yourself, and check the object afterwards.

Requires the bridge (adt_rfc_bridge.py) to be running.

    py adt_write.py PROG ZFOO ./zfoo.abap T74K900123
    py adt_write.py CLAS ZCL_BAR ./zcl_bar.abap T74K900123
    py adt_write.py PROG ZLOCAL ./zlocal.abap            (local object, no transport)

Stdlib only, on purpose: it has to run on a consultant machine with nothing
installed but Python.
"""
import os
import sys
import urllib.error
import urllib.request

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

BRIDGE_URL = os.environ.get(
    "BRIDGE_URL", "http://127.0.0.1:%s" % os.environ.get("BRIDGE_PORT", "8410"))

# The bridge synthesises this token; there is no ICM in the RFC path to issue a
# real one and SAP does not check it on SADT_REST_RFC_ENDPOINT.
COMMON = {
    "X-sap-adt-sessiontype": "stateful",
    "X-CSRF-Token": "ADT-RFC-BRIDGE",
}

PATHS = {
    "CLAS": ("/sap/bc/adt/oo/classes/%s", "application/vnd.sap.adt.oo.classes.v4+xml"),
    "INTF": ("/sap/bc/adt/oo/interfaces/%s", "application/vnd.sap.adt.oo.interfaces.v2+xml"),
    "PROG": ("/sap/bc/adt/programs/programs/%s", "application/vnd.sap.adt.programs.programs.v2+xml"),
    "FUGR": ("/sap/bc/adt/functions/groups/%s", "application/vnd.sap.adt.functions.groups.v2+xml"),
}


def call(method, path, headers=None, body=None):
    req = urllib.request.Request(BRIDGE_URL + path, data=body, method=method)
    for k, v in dict(COMMON, **(headers or {})).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def write_object(objtype, name, source_file, transport=None):
    objtype = objtype.upper()
    if objtype not in PATHS:
        sys.exit("ERROR: unsupported type %s (have %s)" % (objtype, ", ".join(sorted(PATHS))))
    tmpl, accept = PATHS[objtype]
    base = tmpl % name.lower()

    with open(source_file, "rb") as f:
        source = f.read()

    code, body = call("POST", base + "?_action=LOCK&accessMode=MODIFY",
                      {"Accept": accept})
    if code >= 300:
        sys.exit("LOCK failed (%d): %s" % (code, body[:400].decode("utf-8", "replace")))
    text = body.decode("utf-8", "replace")
    start = text.find("<LOCK_HANDLE>")
    if start < 0:
        sys.exit("LOCK returned no handle: %s" % text[:400])
    handle = text[start + 13:text.find("</LOCK_HANDLE>")]
    print("locked   %s (%s)" % (name, handle[:12] + "..."))

    ok = False
    try:
        uri = base + "/source/main?lockHandle=" + handle
        if transport:
            uri += "&corrNr=" + transport
        # Both headers are mandatory: without Accept the endpoint answers 406, and
        # without corrNr a transportable object is rejected as not assigned.
        code, body = call("PUT", uri,
                          {"Content-Type": "text/plain; charset=utf-8", "Accept": "text/plain"},
                          source)
        if code >= 300:
            sys.exit("PUT failed (%d): %s" % (code, body[:400].decode("utf-8", "replace")))
        print("written  %d bytes" % len(source))

        act = ('<?xml version="1.0" encoding="UTF-8"?>'
               '<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">'
               '<adtcore:objectReference adtcore:uri="%s" adtcore:name="%s"/>'
               '</adtcore:objectReferences>') % (base, name.upper())
        code, body = call("POST", "/sap/bc/adt/activation?method=activate&preauditRequested=true",
                          {"Content-Type": "application/xml", "Accept": "application/xml"},
                          act.encode("utf-8"))
        report = body.decode("utf-8", "replace")
        if code >= 300 or "<chkl:messages" in report or 'severity="E"' in report:
            print("ACTIVATION REPORTED PROBLEMS (%d):\n%s" % (code, report[:1200]))
        else:
            print("activated")
            ok = True
    finally:
        call("POST", base + "?_action=UNLOCK&lockHandle=" + handle)
        print("unlocked")
    return 0 if ok else 1


def main(argv):
    if len(argv) < 4:
        sys.exit(__doc__.strip().splitlines()[0] + "\n\n"
                 "usage: py adt_write.py <CLAS|INTF|PROG|FUGR> <NAME> <source-file> [TRANSPORT]")
    return write_object(argv[1], argv[2], argv[3], argv[4] if len(argv) > 4 else None)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
