#!/usr/bin/env python3
"""Read SAP Logon's own system list and turn a chosen entry into an ADT connection.

SAP GUI keeps every system a consultant can reach in SAPUILandscape.xml: system
id, application server, instance number, SAProuter hop, and for WEBGUI/FIORI
entries a real HTTPS URL with the client in the query string. That is nearly
everything .conn_adt needs, it is already on the machine, and Basis maintains it.
Retyping it from a screenshot is how a client ends up as 800 instead of 100.

So: list what SAP Logon knows, let the consultant pick one, write .conn_adt.

WHAT THIS DOES NOT DO IS GUESS THE HTTP ENDPOINT FROM A NAME. In a real landscape
"FIORI ELP DEV (FID)" sits on an internal address while "FIORI ELP DEV - WebGUI"
points at a shared portal host, and "A- Index DEV - Chatbot" is not an ABAP stack
at all. Matching those by name produces a confident, wrong ADT_SAP_URL. A web
entry is treated as belonging to a system only when it shares the system id or
the exact host; anything else is offered as a candidate for a human to confirm.

What it does instead is ask the network. ICM publishes HTTP on 80<NN> and HTTPS
on 443<NN> for instance NN, so the candidate list is derivable, and one TCP
connect per candidate settles in a second what no heuristic can:

  a port answers    -> direct ADT over that origin
  nothing answers   -> HTTP really is shut; emit the RFC bridge config too and
                       point ADT_SAP_URL at the bridge

Probing is a bare TCP connect -- no request, no credentials, no ADT call. Pass
--no-probe to skip it and decide from the file alone.

TIER IS NOT INHERITED. .conn_adt reads as DEV when ADT_SAP_TIER is absent
(guardrails.get_active_tier, fail-safe for older files), so repointing a
connection by hand silently carries the previous system's tier with it, and a
production box marked DEV is writable. Switching system therefore REQUIRES
--tier. That is the one thing this script is strict about.

Usage:
  py sapgui_landscape.py --list                     what SAP Logon knows
  py sapgui_landscape.py --list --probe             ...and which ports answer
  py sapgui_landscape.py --json                     machine-readable, for the agent
  py sapgui_landscape.py --connect ELT --tier DEV --password-stdin
  py sapgui_landscape.py --connect ELT --tier DEV --keep-password
  py sapgui_landscape.py --connect ELT --tier DEV --dry-run

Passwords are never accepted as an argument -- that puts them in the shell
history and in the process list of every user on the machine. --password-stdin
reads one line from stdin; ADT_NEW_PASSWORD is the non-interactive equivalent.
"""
import argparse
import json
import os
import socket
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote

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

# The console is cp1252 on the machines this ships to and system descriptions are
# routinely Turkish. Print through a fold rather than dying on the description of
# the system the consultant is trying to pick.
_FOLD = {"\u0131": "i", "\u0130": "I", "\u015f": "s", "\u015e": "S",
         "\u011f": "g", "\u011e": "G", "\u00e7": "c", "\u00c7": "C",
         "\u00f6": "o", "\u00d6": "O", "\u00fc": "u", "\u00dc": "U"}

PROBE_TIMEOUT = 1.5


def ascii_(text):
    return "".join(_FOLD.get(ch, ch) for ch in str(text)).encode(
        "ascii", "replace").decode("ascii")


def say(msg=""):
    sys.stdout.write(ascii_(msg) + "\n")


def die(msg, hint=""):
    say("[ERROR] " + msg)
    if hint:
        say("        " + hint)
    sys.exit(2)


# --------------------------------------------------------------------------
# where SAP Logon keeps it
# --------------------------------------------------------------------------

def landscape_paths(explicit=None):
    """Local landscape files. Never fetches a URL."""
    if explicit:
        return [Path(explicit)]
    env = os.environ.get("SAPUI_LANDSCAPE")
    if env:
        return [Path(p) for p in env.split(os.pathsep) if p]
    roots = []
    for var in ("APPDATA", "LOCALAPPDATA"):
        base = os.environ.get(var)
        if base:
            roots.append(Path(base) / "SAP" / "Common")
    home = Path.home()
    roots += [home / ".sapgui", home / "AppData" / "Roaming" / "SAP" / "Common"]
    found, seen = [], set()
    for root in roots:
        for name in ("SAPUILandscape.xml", "SAPUILandscapeGlobal.xml"):
            p = root / name
            key = str(p).lower()
            if p.is_file() and key not in seen:
                seen.add(key)
                found.append(p)
    return found


def _local_include(url):
    """Resolve a file:// or plain-path Include to a local path, else None."""
    if url.lower().startswith("file:///"):
        return Path(unquote(url[8:]))
    if url.lower().startswith(("http://", "https://")):
        return None
    return Path(unquote(url)) if url else None


# --------------------------------------------------------------------------
# parse
# --------------------------------------------------------------------------

def _sysnr_from_port(port):
    """32NN is a direct application server on instance NN. 36NN is a message server."""
    if not port or not port.isdigit() or len(port) != 4:
        return None, None
    head, tail = port[:2], port[2:]
    if head == "32":
        return tail, "app-server"
    if head == "36":
        return tail, "message-server"
    return None, None


def _origin(parsed):
    if not parsed.scheme or not parsed.hostname:
        return ""
    port = parsed.port
    if port and not ((parsed.scheme == "https" and port == 443) or
                     (parsed.scheme == "http" and port == 80)):
        return "%s://%s:%d" % (parsed.scheme, parsed.hostname, port)
    return "%s://%s" % (parsed.scheme, parsed.hostname)


def parse_landscape(path):
    """-> (gui entries, web entries, include URLs)."""
    root = ET.parse(str(path)).getroot()
    routers = {}
    for r in root.iter("Router"):
        uid = r.get("uuid")
        if uid:
            routers[uid] = r.get("router") or r.get("name") or ""

    gui, web = [], []
    for svc in root.iter("Service"):
        kind = (svc.get("type") or "").upper()
        sid = (svc.get("systemid") or "").upper()
        name = svc.get("name") or ""
        if kind == "SAPGUI":
            host, _, port = (svc.get("server") or "").partition(":")
            sysnr, role = _sysnr_from_port(port)
            gui.append({"type": kind, "sid": sid, "name": name, "host": host,
                        "port": port, "sysnr": sysnr, "role": role,
                        "router": routers.get(svc.get("routerid") or "", ""),
                        "source": path.name})
        else:
            url = svc.get("url") or ""
            parsed = urlparse(url)
            web.append({"type": kind, "sid": sid, "name": name, "url": url,
                        "origin": _origin(parsed), "host": parsed.hostname or "",
                        "client": (parse_qs(parsed.query).get("sap-client") or [""])[0],
                        "source": path.name})
    includes = [i.get("url") or "" for i in root.iter("Include")]
    return gui, web, [u for u in includes if u]


def collect(paths):
    gui, web, includes = [], [], []
    read = set(str(p).lower() for p in paths)
    for p in paths:
        try:
            g, w, inc = parse_landscape(p)
        except ET.ParseError as exc:
            say("[WARN] %s is not readable XML (%s) -- skipped" % (p, exc))
            continue
        gui += g
        web += w
        for url in inc:
            local = _local_include(url)
            # An Include that points at a file we already read is not a gap.
            if local is None or str(local.resolve()).lower() not in read:
                includes.append(url)
    return gui, web, includes


# --------------------------------------------------------------------------
# group -- by system id, or by host when there is no system id
# --------------------------------------------------------------------------

def _stem(name):
    """'A- Index DEV - Chatbot' -> 'a- index dev'; 'ELP DEV (ELT)' -> 'elp dev'."""
    text = name.split(" - ")[0]
    if text.endswith(")") and "(" in text:
        text = text[:text.rindex("(")]
    return " ".join(text.split()).lower()


def build_systems(gui, web):
    systems = {}
    for g in gui:
        key = g["sid"] or g["host"]
        systems.setdefault(key, _blank(key, g["sid"], g["name"]))
        systems[key]["gui"].append(g)

    hosts = {}
    for key, s in systems.items():
        for g in s["gui"]:
            if g["host"]:
                hosts.setdefault(g["host"].lower(), key)

    for w in web:
        owner = None
        if w["sid"] and w["sid"] in systems:
            owner = w["sid"]                       # same system id: certain
        elif w["host"] and w["host"].lower() in hosts:
            owner = hosts[w["host"].lower()]       # same host: certain enough
        if owner:
            systems[owner]["web"].append(w)
            continue
        # A second web entry on a host we have already seen belongs with the first,
        # so the map has to grow as we go -- two URLs on one host are one system.
        # Not certain. If the name stem matches a system, park it as a candidate a
        # human confirms -- a shared portal host and an ABAP stack look identical
        # from here, and so do a chatbot and a Fiori launchpad.
        stem = _stem(w["name"])
        match = next((k for k, s in systems.items() if _stem(s["label"]) == stem), None)
        if match:
            systems[match]["web_maybe"].append(w)
        else:
            key = w["host"] or w["name"]
            systems.setdefault(key, _blank(key, w["sid"], w["name"]))
            systems[key]["web"].append(w)
            if w["host"]:
                hosts.setdefault(w["host"].lower(), key)

    for s in systems.values():
        s["router"] = next((g["router"] for g in s["gui"] if g.get("router")), "")
    return systems


def _blank(key, sid, label):
    return {"key": key, "sid": sid, "label": label, "gui": [], "web": [],
            "web_maybe": [], "router": "", "candidates": [], "reach": "",
            "origin": "", "probed": False}


def candidates(system):
    """Where ADT might answer, best first.

    'confirm' entries are never selected automatically. A TCP connect proves a
    port answers, not that ADT is behind it -- a chatbot and a Web Dispatcher
    both answer on 443, and a Web Dispatcher that routes /sap/bc/gui elsewhere
    answers ADT with ICMENOSYSTEMFOUND. Promoting one of those on the strength
    of an open socket is the mistake this bucket exists to prevent.
    """
    out, seen = [], set()

    def add(origin, why, confirm=False):
        if origin and origin not in seen:
            seen.add(origin)
            out.append({"origin": origin, "why": why, "confirm": confirm})

    for w in system["web"]:
        add(w["origin"], "SAP Logon %s entry" % w["type"])
    # ICM convention: HTTPS on 443<NN>, HTTP on 80<NN> for instance NN.
    for g in system["gui"]:
        # Only for a direct application server: a message server's instance is the
        # message server's, not the ICM's, and a routed host is not reachable here.
        if g["host"] and g["role"] == "app-server" and not g["router"]:
            add("https://%s:443%s" % (g["host"], g["sysnr"]), "ICM default port")
            add("http://%s:80%s" % (g["host"], g["sysnr"]), "ICM default port")
    for w in system["web_maybe"]:
        add(w["origin"], "name matches, DIFFERENT host", confirm=True)
    return out


# --------------------------------------------------------------------------
# probe
# --------------------------------------------------------------------------

def tcp_open(origin):
    parsed = urlparse(origin)
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        with socket.create_connection((parsed.hostname, port), PROBE_TIMEOUT):
            return True
    except OSError:
        return False


def decide(system, probe):
    """Fill reach/origin. 'direct' needs evidence; 'bridge' is the fallback."""
    system["candidates"] = candidates(system)
    if probe:
        system["probed"] = True
        for cand in system["candidates"]:
            cand["open"] = tcp_open(cand["origin"])
            if cand["open"] and not cand["confirm"] and not system["origin"]:
                system["origin"] = cand["origin"]
        system["reach"] = "direct" if system["origin"] else "bridge"
        return
    if system["web"]:
        system["origin"] = system["web"][0]["origin"]
        system["reach"] = "direct"
    elif system["gui"]:
        system["reach"] = "unknown"
    else:
        system["reach"] = "unknown"


# --------------------------------------------------------------------------
# present
# --------------------------------------------------------------------------

_REACH = {"direct": "HTTP", "bridge": "RFC bridge", "unknown": "probe to find out"}


def render_table(views, includes, probe):
    say("SAP Logon systems on this machine")
    say("=" * 78)
    say("%-3s %-5s %-25s %-18s %s" % ("#", "SID", "name", "app server", "reach"))
    say("-" * 78)
    for i, v in enumerate(views, 1):
        g = v["gui"][0] if v["gui"] else {}
        server = g.get("host", "")
        if g.get("sysnr"):
            server += " (%s)" % g["sysnr"]
        reach = _REACH[v["reach"]]
        if v["reach"] == "direct":
            reach += "  " + v["origin"]
        elif v["reach"] == "bridge" and v["router"]:
            reach += " via router"
        say("%-3d %-5s %-25s %-18s %s" % (i, v["sid"] or "-", v["label"][:25],
                                          server[:18], reach))
    say("-" * 78)
    say("")
    if probe:
        say("HTTP       : a port answered -- ADT connects to it directly")
        say("RFC bridge : nothing answered on any candidate port. Router-only")
        say("             system; sap-adt-router-bridge is the path.")
    else:
        say("Ports were not probed (--probe settles direct vs bridge in a second).")
    maybes = [(v, c) for v in views for c in v["candidates"] if c["confirm"]]
    if maybes:
        say("")
        say("[CONFIRM] Web entries whose NAME matches a system but whose HOST does not.")
        say("          Never selected automatically: a chatbot, a portal and an ABAP")
        say("          stack all answer on 443, and a Web Dispatcher that does not")
        say("          route this system answers ADT with ICMENOSYSTEMFOUND.")
        for v, c in maybes:
            state = ""
            if probe:
                state = "  [port answers]" if c.get("open") else "  [no answer]"
            say("            %-5s %s%s" % (v["sid"] or "-", c["origin"], state))
        say("          If Basis confirms one is the ABAP stack's own ICM:")
        say("            --connect <SID> --tier <DEV|QA|PRD> --url <origin>")
    if includes:
        say("")
        say("[NOTE] %d external list(s) referenced by this landscape were NOT read --" % len(includes))
        say("       SAP Logon fetches those, this script does not:")
        for u in includes:
            say("         " + u)
        say("       Systems that live only there are missing from the table.")


# --------------------------------------------------------------------------
# write the connection
# --------------------------------------------------------------------------

def project_dir():
    return Path(os.environ.get("ADT_CWD") or Path.cwd()).resolve()


def read_kv(path):
    values = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            k, _, v = stripped.partition("=")
            values[k.strip()] = v.strip()
    return values


def merge_kv(path, updates, banner):
    """Rewrite only the keys we own; every other line survives untouched.

    create_conn_file() in sap_adt_lib rewrites the whole file, which drops
    ADT_SAP_TIER, the BTP keys and whatever else the project put there. A
    connection switch must not quietly delete a guard setting.
    """
    if path.is_file():
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    else:
        lines = []
    remaining = dict(updates)
    out = []
    for line in lines:
        stripped = line.strip()
        key = stripped.partition("=")[0].strip() if "=" in stripped else ""
        if key and not stripped.startswith("#") and key in remaining:
            out.append("%s=%s" % (key, remaining.pop(key)))
        else:
            out.append(line)
    if remaining:
        if out and out[-1].strip():
            out.append("")
        out.append("# " + banner)
        for k, v in remaining.items():
            out.append("%s=%s" % (k, v))
    return "\n".join(out).rstrip("\n") + "\n"


def resolve_password(args, conn, same_user):
    if args.password_stdin:
        pw = sys.stdin.readline().rstrip("\r\n")
        if not pw:
            die("--password-stdin was given but stdin was empty.")
        return pw
    if os.environ.get("ADT_NEW_PASSWORD"):
        return os.environ["ADT_NEW_PASSWORD"]
    existing = conn.get("ADT_SAP_PASSWORD", "")
    if args.keep_password:
        if not existing:
            die(".conn_adt has no ADT_SAP_PASSWORD to keep.")
        return existing
    if same_user and existing:
        return existing
    return None


def pick(views, target):
    target = target.strip()
    if target.isdigit():
        idx = int(target)
        if not 1 <= idx <= len(views):
            die("no system number %d -- run --list first." % idx)
        return views[idx - 1]
    matches = [v for v in views
               if v["sid"].upper() == target.upper()
               or v["label"].upper() == target.upper()]
    if not matches:
        die("no system '%s' in SAP Logon on this machine." % target,
            "run --list for the names, or pass the number from that table.")
    if len(matches) > 1:
        die("'%s' matches %d entries." % (target, len(matches)),
            "pass the number from --list instead.")
    return matches[0]


def do_connect(args, views):
    view = pick(views, args.connect)
    proj = project_dir()
    conn_path = proj / ".conn_adt"
    env_path = proj / ".env"
    conn = read_kv(conn_path)
    sid = view["sid"] or view["label"]

    # The tier gate comes first, before anything about reachability. It is the
    # safety gate, and a consultant who is off the VPN should still be told that
    # switching system needs one rather than being sent to fix the network.
    # Which system .conn_adt currently points at is a question about the SYSTEM,
    # so it is answered from ADT_SAP_SID -- a URL comparison calls a bridge
    # reconnect "the same system" whatever is behind 127.0.0.1:8410. An older
    # file has no ADT_SAP_SID at all, and unknown has to mean switching.
    switching = conn.get("ADT_SAP_SID", "").upper() != sid.upper()
    tier = (args.tier or "").upper()
    if not tier:
        if switching or not conn.get("ADT_SAP_TIER"):
            die("--tier is required (DEV, QA or PRD).",
                "An absent ADT_SAP_TIER reads as DEV, which is writable. A new "
                "system does not inherit the last one's tier.")
        tier = conn["ADT_SAP_TIER"].upper()
    if tier not in ("DEV", "QA", "PRD"):
        die("--tier must be DEV, QA or PRD (got %s)." % tier)

    if args.url:
        view = dict(view, reach="direct", origin=args.url.rstrip("/"))
    elif view["reach"] == "unknown":
        die("cannot tell how to reach %s without probing." % sid,
            "drop --no-probe, or pass --url to state the ADT endpoint yourself.")

    user = args.user or conn.get("ADT_SAP_USER", "")
    if not user:
        die("no SAP user known.", "pass --user, or set ADT_SAP_USER in .conn_adt.")
    same_user = (user == conn.get("ADT_SAP_USER", ""))

    password = resolve_password(args, conn, same_user)
    if password is None:
        die("a password is needed for user %s on %s." % (user, sid),
            "ask the consultant for it and pipe it in -- never as an argument, it "
            "would land in the shell history: echo <password> | py "
            "sapgui_landscape.py --connect %s --tier %s --password-stdin"
            % (args.connect, tier))

    client = (args.client
              or next((w["client"] for w in view["web"] if w["client"]), "")
              or conn.get("ADT_SAP_CLIENT", ""))
    if not client:
        die("no client for %s." % sid,
            "SAP Logon does not record one for this entry -- pass --client 100.")

    updates = {"ADT_SAP_USER": user, "ADT_SAP_PASSWORD": password,
               "ADT_SAP_CLIENT": client, "ADT_SAP_SID": sid,
               "ADT_SAP_LANGUAGE": conn.get("ADT_SAP_LANGUAGE", "EN"),
               "ADT_SAP_TIER": tier}
    env_updates = {}

    if view["reach"] == "direct":
        updates["ADT_SAP_URL"] = view["origin"]
        why = "given with --url" if args.url else next(
            (c["why"] for c in view["candidates"]
             if c["origin"] == view["origin"]), "")
        plan = "direct ADT over %s  (%s)" % (view["origin"], why)
    else:
        g = view["gui"][0] if view["gui"] else {}
        if not g.get("host"):
            die("SAP Logon records no application server for %s." % sid)
        if g.get("role") == "message-server":
            die("SAP Logon has a message server for %s, not an application server."
                % sid,
                "RFC through the bridge needs a specific host and instance (group "
                "logon is a different connection shape). Ask Basis which "
                "application server to use, then set RFC_ASHOST/RFC_SYSNR in .env.")
        if not g.get("sysnr"):
            die("cannot read an instance number from port %s." % g.get("port"),
                "an application server entry uses port 32<NN>. Ask Basis for the "
                "host and instance, then set RFC_ASHOST/RFC_SYSNR in .env by hand.")
        updates["ADT_SAP_URL"] = "http://127.0.0.1:%s" % args.bridge_port
        env_updates = {"RFC_ASHOST": g["host"], "RFC_SYSNR": g["sysnr"],
                       "BRIDGE_PORT": str(args.bridge_port)}
        if view["router"]:
            env_updates["RFC_SAPROUTER"] = view["router"]
        plan = "RFC bridge on 127.0.0.1:%s -> %s instance %s%s" % (
            args.bridge_port, g["host"], g["sysnr"],
            ", via " + view["router"] if view["router"]
            else " -- no router recorded, check .env")

    say("system      : %s  %s" % (sid, view["label"]))
    say("route       : %s" % plan)
    say("client/user : %s / %s" % (client, user))
    say("tier        : %s%s" % (tier, "  (writable)" if tier == "DEV"
                                else "  (the engine refuses writes)"))
    say("password    : %s" % ("kept from .conn_adt"
                              if password == conn.get("ADT_SAP_PASSWORD")
                              else "new, %d characters" % len(password)))
    say("")

    if args.dry_run:
        say("--dry-run: nothing written.")
        return 0

    if conn_path.is_file():
        backup = conn_path.with_name(conn_path.name + ".bak")
        backup.write_bytes(conn_path.read_bytes())
        say("backed up   : %s" % backup.name)
    conn_path.write_text(merge_kv(conn_path, updates, "set by sapgui_landscape.py"),
                         encoding="utf-8")
    say("wrote       : %s" % conn_path)
    if env_updates:
        env_path.write_text(merge_kv(env_path, env_updates, "SAProuter RFC bridge"),
                            encoding="utf-8")
        say("wrote       : %s" % env_path)
    say("")
    if view["reach"] == "direct":
        say("Next: py plugins/sap-consultant/skills/sap-adt/scripts/sap_doctor.py")
    else:
        say("Next: start the bridge, prove it, then run the engine on top:")
        say("  py plugins/sap-consultant/skills/sap-adt-router-bridge/scripts/"
            "adt_rfc_bridge.py selftest")
        say("  py plugins/sap-consultant/skills/sap-adt-router-bridge/scripts/"
            "adt_rfc_bridge.py")
    return 0


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Read SAP Logon's system list; optionally write .conn_adt from it.")
    ap.add_argument("--file", help="a specific SAPUILandscape.xml")
    ap.add_argument("--list", action="store_true", help="print the systems (default)")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--probe", action="store_true",
                    help="TCP-connect the candidate ports (implied by --connect)")
    ap.add_argument("--no-probe", action="store_true", help="never touch the network")
    ap.add_argument("--connect", metavar="SID|NUMBER",
                    help="write .conn_adt for this system")
    ap.add_argument("--tier", help="DEV, QA or PRD -- required when switching system")
    ap.add_argument("--user", help="SAP user, if different from .conn_adt")
    ap.add_argument("--client", help="override the client")
    ap.add_argument("--url", help="ADT base URL, when you know it better than "
                                  "SAP Logon does (a confirmed Web Dispatcher)")
    ap.add_argument("--bridge-port", type=int,
                    default=int(os.environ.get("BRIDGE_PORT", "8410")),
                    help="port for the RFC bridge (default 8410)")
    ap.add_argument("--password-stdin", action="store_true",
                    help="read the password from stdin")
    ap.add_argument("--keep-password", action="store_true",
                    help="reuse the password already in .conn_adt")
    ap.add_argument("--dry-run", action="store_true", help="show the change, write nothing")
    args = ap.parse_args()

    paths = landscape_paths(args.file)
    if not paths:
        die("no SAPUILandscape.xml found.",
            "SAP GUI keeps it under %APPDATA%\\SAP\\Common. Pass --file, or set "
            "SAPUI_LANDSCAPE, if it lives elsewhere.")

    gui, web, includes = collect(paths)
    systems = build_systems(gui, web)
    if not systems:
        die("SAPUILandscape.xml has no systems in it.")

    probe = (args.probe or bool(args.connect)) and not args.no_probe
    for s in systems.values():
        decide(s, probe)
    views = sorted(systems.values(), key=lambda v: (v["sid"] == "", v["sid"], v["label"]))

    if args.json:
        sys.stdout.write(json.dumps(
            {"files": [str(p) for p in paths], "probed": probe,
             "unfollowed_includes": includes, "systems": views},
            indent=2, ensure_ascii=False) + "\n")
        return 0
    if args.connect:
        return do_connect(args, views)
    render_table(views, includes, probe)
    say("")
    say("Sources: " + ", ".join(str(p) for p in paths))
    return 0


if __name__ == "__main__":
    sys.exit(main())
