---
name: sap-adt-router-bridge
description: >
  Use when an SAP system is reachable only through SAProuter and its HTTP ports are
  shut — ADT connects fail at TCP connect, curl times out, but SAP GUI works. Starts a
  local shim that turns ADT HTTP calls into RFC calls to SADT_REST_RFC_ENDPOINT through
  the router. Two backends: pyrfc 3.3.1 on the NetWeaver RFC SDK 7.50, or SAP JCo taken
  from an existing Eclipse/ADT install via JPype when neither may be downloaded. It sits
  underneath sap-adt as a transport, so every guard the engine has still applies; it is
  not a second engine and not a way around read-only.
  Triggers in Turkish or English: "SAProuter", "router üzerinden bağlan", "routerlı
  sistem", "HTTP portu kapalı", "port kapalı SAP", "RFC bridge", "JCo bridge", "pyrfc",
  "NetWeaver RFC SDK 7.50", "NI protokol", "RFC SDK yok", "SADT_REST_RFC_ENDPOINT",
  "connection refused SAP", "ADT bağlanamıyor ama SAP GUI çalışıyor", "sadece RFC açık".
allowed-tools: Bash(py:*), Bash(python:*), Read, Write, Edit, Grep, Glob
---

# sap-adt-router-bridge — ADT over RFC, for systems with no open HTTP port

Some customer landscapes publish SAP only through SAProuter's NI protocol. SAP GUI
connects; 443, 8000 and 44300 are closed at the firewall, so every ADT client — this
one included — fails at TCP connect. The system is not unreachable, it just does not
speak HTTP to you.

`SADT_REST_RFC_ENDPOINT` is a standard SAP function module that takes an HTTP request
as parameters, runs it through the ADT framework, and hands back the response. RFC goes
through SAProuter. So the missing piece is a process that accepts ADT HTTP on localhost
and re-emits it as that FM call.

That process is `scripts/adt_rfc_bridge.py`.

```
  agent  ->  adt_mcp_server.py   the sap-adt engine, unchanged, guards intact
         ->  127.0.0.1:8410      this bridge
         ->  pyrfc | JPype+JCo   whichever RFC library this machine has
         ->  RFC via SAProuter   /H/<router-host>/S/3299
         ->  SADT_REST_RFC_ENDPOINT -> ADT framework
```

## It is a transport, not an engine

The bridge goes **underneath** [`sap-adt`](../sap-adt/SKILL.md), never beside it. You
set `ADT_SAP_URL=http://127.0.0.1:8410` and start the normal MCP server on top.

That is the whole design decision, and it is why this skill is small. The engine's
ghost-transport prevention, source-drift guard, auth breaker, Z/Y namespace guard and
stale-lock discipline all keep working, because none of them care how the bytes reach
SAP. A bridge that spoke ADT itself would have to re-earn every one of those guards —
each of which was paid for by a real incident.

Two things this therefore does **not** do:

- **It does not make a system writable.** The writable-tier check reads `ADT_SAP_TIER`
  from `.conn_adt`, not the URL. Pointing at `127.0.0.1` changes nothing; a `PRD` tier
  still refuses writes.
- **It does not bypass read-only.** [`sap-adt-readonly`](../sap-adt-readonly/SKILL.md)
  removes the write tools from the registry before any transport exists. Run it over
  the bridge and it is still read-only.

## First-time setup

### 1. An RFC library — pick whichever your machine is allowed to have

The bridge speaks RFC through one of two libraries. It does not care which, and
`BRIDGE_BACKEND` says so explicitly when you need to force one:

| `BRIDGE_BACKEND` | uses | when |
|---|---|---|
| `auto` *(default)* | pyrfc if it imports, else JCo | leave it here |
| `pyrfc` | pyrfc 3.3.1 on NetWeaver RFC SDK 7.50 | the supported SAP route |
| `jco` | SAP JCo via JPype, from Eclipse/ADT | no S-user download, or the SDK will not install |

`auto` prefers pyrfc because installing it is a deliberate act: nobody has the SDK on
disk by accident, so its presence is a decision that has already been made.

**pyrfc — the SAP-supported route.** Two halves, and both are required:

```bash
# 1. SAP NetWeaver RFC SDK 7.50 -- S-user download from SAP Support Portal
#    (Software Downloads -> SAP NW RFC SDK -> 7.50 -> Windows x86_64)
#    Unzip it, then put its lib\ directory on PATH.
# 2. the Python binding, built against that SDK
py -m pip install pyrfc==3.3.1
```

The wheel installs happily without the SDK and then fails at **import**, not at
connect — which is why `BRIDGE_BACKEND=pyrfc` checks the import at startup and exits
with that message rather than letting the first ADT call fail as a network error.

A field test on a routed customer DEV system had this route configured and connected
in under a minute, so treat a long fight with it as a sign something else is wrong.

**JCo — the no-download route.**

```bash
py -m pip install JPype1
```

Not in `requirements.txt` on purpose: it is the only thing in the marketplace that
needs a JVM, and every consultant who never meets a routed system would pay for it.
Same rule as the Chromium engine behind `office-pdf`.

No JCo download either. If Eclipse with the ADT plugin is installed, its JRE and its
`com.sap.conn.jco*` jars are what the bridge uses. It finds them by glob, so an ADT
update from JCo 3.1.12 to 3.1.13 needs no edit here. `JCO_JRE` and `JCO_P2_POOL`
override the search when the install sits somewhere unusual.

The two are not equivalent in one detail worth knowing: JCo hands back RFC bytes
signed, so the bridge folds values >= 128 on the way in; pyrfc gives `bytes` and needs
no fold. Both produce identical source in SAP — but if you ever see mangled non-ASCII,
that fold is where to look, and only on the JCo side.

### 2. Connection values — in the project, never in the script

The script ships **no** host, router, user or password, and refuses to start without
them. They differ per user and per customer, and a URL in a skill script is a URL in
everyone's copy of that skill.

`.env` in the project directory:

```
RFC_ASHOST    = <app server host as seen FROM the router>
RFC_SYSNR     = 00
RFC_SAPROUTER = /H/<router-host>/S/3299
BRIDGE_PORT   = 8410
```

Credentials come from the ADT engine's own `.conn_adt` (`ADT_SAP_USER`,
`ADT_SAP_PASSWORD`, `ADT_SAP_CLIENT`, `ADT_SAP_LANGUAGE`) so there is one set, not two.
`RFC_USER` / `RFC_PASSWD` / `RFC_CLIENT` in `.env` override that when the RFC user is a
different one. Both files are gitignored; keep it that way.

`RFC_SAPROUTER` is the **router hop only**: `/H/<router>/S/3299`, with the target host
*not* appended. Both libraries take the target from the connection's own host property
and build the full route string themselves (`jco.client.saprouter`, `saprouter=`);
appending it produces a connect error that reads like a network problem and is not one.

### 3. Prove the path before wiring anything on top

```bash
py plugins/sap-consultant/skills/sap-adt-router-bridge/scripts/adt_rfc_bridge.py selftest
```

One ADT discovery call. It prints which backend it resolved before it dials, so this is
also how you confirm `auto` picked the one you expected. `PASS` means RFC, the router,
the FM and the ADT framework all answered. Do this first — a failure here is a connection problem, while the same
failure after the engine is stacked on top looks like an engine problem.

### 4. Run it, then point the engine at it

```bash
py plugins/sap-consultant/skills/sap-adt-router-bridge/scripts/adt_rfc_bridge.py
```

In `.conn_adt`:

```
ADT_SAP_URL = http://127.0.0.1:8410
```

Then start the ADT server as usual — `adt_mcp_server.py`, or
`adt_readonly_server.py --http --port 8787` for aXet.code. Nothing else changes: same
tools, same session rules, same transports.

Leave the bridge running for the whole session. Restarting it drops the SAP session,
which invalidates any lock the engine is holding.

## Two kinds of system this does not reach

Field testing across a customer landscape put every routed system on the bridge except
two shapes, and both fail for reasons no amount of bridge configuration fixes:

- **ECC.** The bridge needs `SADT_REST_RFC_ENDPOINT`, and that FM is part of the ADT
  backend. Classic ECC on older `SAP_BASIS` either does not have it or has no ADT
  framework behind it, so the call comes back `FUNCTION_NOT_FOUND` or the FM answers
  with an ADT error rather than a resource. There is no transport-level fix: an ABAP
  stack with no ADT backend has nothing for an ADT client to talk to, over HTTP or over
  RFC. Use SAP GUI, or `sap-abapgit-workflow` for a file-first path.
- **RDP-only systems.** Some customers expose the system only inside a jump host you
  reach over RDP. The bridge runs on *your* machine and dials the router from there, so
  if your machine cannot reach the router, neither can the bridge. Running it inside the
  RDP session is possible in principle, but then the agent is not there. Not a bug —
  the network boundary is doing what it was built to do.

Everything else in that landscape — routed or not, S/4 on-premise or cloud — connected,
from aXet.code and from SAP Logon alike.

## Why one process is one session

`SADT_REST_RFC_ENDPOINT` opens a **new ADT session per call** unless the RFC connection
is stateful. A LOCK handle belongs to a session, so the next call — the PUT carrying
your source — fails with `ExceptionResourceInvalidLockHandle`, and no write can ever
complete.

`JCoContext.begin()` makes the connection stateful, but it binds to the **calling
thread**: opening it in `main()` and then serving HTTP on handler threads does nothing
at all. So the bridge runs every FM call on one dedicated worker thread that holds a
single `JCoContext` for the life of the process, and the HTTP handlers queue onto it.

One bridge process is one SAP session. That is the same shape as the house rule
upstairs — every SAP write goes through the persistent session — and it is why a second
bridge on a second port is not a way to get parallelism.

## Account lockout

Every RFC call is a logon attempt. SAP locks the user after a few bad ones, and a locked
service account costs a Basis ticket. The bridge therefore **trips on the first
authentication failure** and refuses every later call until it is restarted. If you see
that message, fix the password — do not restart in a loop, and do not let a client
retry.

## `adt_write.py` — a named escape hatch, not the write path

On some NetWeaver 7.52 systems the LOCK response carries
`MODIFICATION_SUPPORT=NoModification` for an object that is perfectly writable, and a
strict ADT client refuses to continue. The write itself succeeds; only the client-side
pre-check is wrong.

`scripts/adt_write.py` does LOCK, PUT, ACTIVATE, UNLOCK without reading that field:

```bash
py plugins/sap-consultant/skills/sap-adt-router-bridge/scripts/adt_write.py PROG ZFOO ./zfoo.abap T74K900123
```

Use it **only** for that failure. It carries none of the engine's guards — no
ghost-transport prevention, no source-drift check, no namespace guard, no tier check —
so the transport is your decision and so is verifying the result afterwards. It always
unlocks in a `finally`, which is the one discipline it does keep.

## When it goes wrong

| symptom | what it means | what to do |
|---|---|---|
| `connect to SAP gateway failed` | router hop wrong, or the target is not reachable from the router | check `RFC_SAPROUTER` is the hop **only**; ask Basis which host the router fronts |
| `ICMENOSYSTEMFOUND` from an earlier HTTP probe | you reached a Web Dispatcher, not this system | not a bridge problem — it is the reason you are here |
| `ExceptionResourceInvalidLockHandle` | the SAP session was lost | the bridge was restarted mid-edit; restart the engine too and redo the lock |
| `RFC_ERROR_LOGON_FAILURE`, then every call refused | the breaker tripped | fix the credentials, restart the bridge. Do **not** retry |
| `FUNCTION_NOT_FOUND: SADT_REST_RFC_ENDPOINT` | no ADT backend on that stack — usually ECC | not fixable here; see *Two kinds of system this does not reach* |
| pyrfc will not import, SDK is installed | the SDK's `lib` is not on `PATH` in this shell | put it on `PATH`, or run with `BRIDGE_BACKEND=jco` to get moving today |
| `UnsatisfiedLinkError` / `sapjco3.dll` | 32-bit JRE, or the native fragment jar is missing | set `JCO_JRE` to a 64-bit JRE; confirm `com.sap.conn.jco.win32.x86_64_*.jar` exists |
| non-ASCII source corrupted on write | the signed-byte fold was skipped | JCo backend only — the bridge folds bytes >= 128 on the way in, so this means the call did not go through it |
| bridge starts, engine still cannot connect | `ADT_SAP_URL` not updated | the engine compares the live binding against `.conn_adt`; the two must agree |

The bridge writes `.tmp/adt_router_bridge.log` in the project (gitignored) with the
method, URI, status and byte count of every call. Read it before guessing.

## Prior art

Enrico Andreoli's `adt-rfc-bridge` (MIT) and the SAP Community post *"Using Claude for
SAP ABAP development on RFC-only SAProuter systems"*. This version differs in the parts
that matter for shipping it to consultants: no credentials or hosts in the source, either
RFC library accepted rather than one hard requirement, JCo located by glob rather than
pinned to a version, the stateful-session worker described above, and the auth breaker.
