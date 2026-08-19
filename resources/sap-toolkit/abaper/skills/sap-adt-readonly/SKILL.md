---
name: sap-adt-readonly
description: >
  READ-ONLY SAP ABAP inspection via the SAP ADT REST API, reached over a localhost
  HTTP server (aXet.code cannot use MCP). Use to read ABAP source, run SELECT-only
  SQL, search the repository, inspect CDS/DDIC objects, list packages and transports,
  run ATC and syntax checks, find where-used, view revisions, and read short dumps.
  This toolkit CANNOT change SAP — no create, edit, push, activate, delete, or
  transport writes. Also covers RFC-over-SAProuter bridging (adt_rfc_bridge.py /
  adt_rfc_probe.py) for systems whose router denies raw HTTPS but allows native
  SAP protocol (ADT_RFC_MODE=true in .conn_adt, "-94"/"NIEROUT_PERM_DENIED"/"route
  permission denied" errors). Triggers: SAP, ABAP, ADT, read SAP, inspect class,
  view source, SQL SELECT, ATC, where-used, CDS, DDIC, package, transport, dump,
  .conn_adt, saprouter, route permission denied, RFC bridge, ADT_RFC_MODE.
---

# SAP ADT — READ-ONLY (aXet.code edition)

Inspect a SAP system through the ADT REST API **without changing anything**. This
is the safe, read-only toolkit handed to new users: you can look everywhere you are
authorised, but you cannot mutate SAP or its transport system.

## The one rule: talk to the HTTP server, never the scripts

aXet.code cannot speak MCP, so SAP is reached over a small **localhost HTTP server**
that holds ONE persistent SAP session. You call read tools with `POST /tool/<name>`.

- ✅ **Always** go through `http://127.0.0.1:8787` (the read-only gate).
- ❌ **Never** run `adt_mcp_server.py` or the CLI scripts directly — a fresh process
  each call means a new SAP session, and it bypasses the read-only gate.

The gate enforces read-only **twice**: it forces `ADT_READONLY=true` into the engine
(every write path refuses), **and** it only registers the 20 read tools below — write
tools (push/create/activate/delete/transport/screen-gen) return `404 unknown_tool`.

## Step 1 — Is the server running?

```bash
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())" 2>/dev/null || echo "NOT RUNNING"
```

`{"ok": true, "readonly": true, ...}` → go to Step 3. `NOT RUNNING` → Step 2.

## Step 2 — Start the read-only server (background)

Set `ADT_CWD` to the folder that holds the project's `.conn_adt`, then start the
gate. **Run this with `run_in_background: true`.** Adjust the path to wherever this
repo was cloned (`py` on Windows, `python3` on macOS/Linux):

```bash
# Windows
ADT_CWD=$(pwd) py "<sap-toolkit>/abaper/skills/sap-adt-readonly/scripts/adt_readonly_server.py" --port 8787

# macOS/Linux
ADT_CWD=$(pwd) python3 "<sap-toolkit>/abaper/skills/sap-adt-readonly/scripts/adt_readonly_server.py" --port 8787
```

Wait 2–3 seconds, then re-check `/health`.

## Step 3 — Verify the connection

```bash
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_logon', json={}); print(r.json())"
```

Expected: `{"ok": true, "url": "...", "user": "...", ...}`. If it fails, check
`.conn_adt` (see the repo README → Configuration) and VPN, then try `adt_doctor`.

## Step 4 — Call read tools

Pattern: `POST http://127.0.0.1:8787/tool/<TOOL_NAME>` with a JSON body of kwargs.

```bash
# Read a class's active source
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_get_source', json={'name':'ZCL_MY_CLASS','object_type':'class'}); print(r.json())"

# Search objects by name pattern
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_search', json={'query':'ZAI*','max_results':20}); print(r.json())"

# Full-text search inside source code
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_code_search', json={'query':'SELECT SINGLE','max_results':30}); print(r.json())"

# Read-only SQL (SELECT only)
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_sql', json={'query':'SELECT * FROM t000','max_rows':10}); print(r.json())"

# Where-used
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_where_used', json={'name':'ZCL_MY_CLASS','object_type':'class'}); print(r.json())"
```

For large source files, `adt_get_source` accepts `grep` (regex) and `method`
filters to return only the slice you need — cheaper than reading the whole object.

## Read tools available (20)

| Tool | JSON body (example) | What it reads |
|------|---------------------|---------------|
| `ping` | `{}` | Server liveness + version |
| `adt_logon` | `{}` | Verify connection / auth |
| `adt_doctor` | `{}` | Connection diagnostics (VPN/auth/package) |
| `adt_get_source` | `{"name":"ZCL_X","object_type":"class"}` | Active source (`grep`/`method` filters) |
| `adt_search` | `{"query":"Z*","obj_type":"CLAS","max_results":20}` | Repository objects by name pattern |
| `adt_code_search` | `{"query":"COMMIT WORK","max_results":30}` | Full-text search inside source |
| `adt_sql` | `{"query":"SELECT ...","max_rows":100}` | Read-only ABAP SQL SELECT |
| `adt_list_package` | `{"package":"ZAI"}` | Objects in a package |
| `adt_where_used` | `{"name":"ZIF_X","object_type":"intf"}` | Usages of an object |
| `adt_revisions` | `{"name":"ZCL_X","object_type":"class"}` | Version history |
| `adt_syntax_check` | `{"name":"ZCL_X","object_type":"class"}` | Syntax check (no activation) |
| `adt_atc_check` | `{"name":"ZCL_X","object_type":"class"}` | ATC quality findings |
| `adt_unit_test` | `{"name":"ZCL_X","object_type":"class"}` | Runs the object's ABAP Unit tests |
| `adt_check_scatter` | `{"object_name":"ZCL_X"}` | Detect class includes split across transports |
| `adt_inactive_objects` | `{}` | System-wide inactive objects |
| `adt_badi_discovery` | `{"badi_definition":"..."}` | Classic BAdI cross-reference graph |
| `adt_dumps` | `{"max_results":10}` | Recent ST22 short dumps |
| `adt_list_transports` | `{}` | Your transports |
| `adt_transport_status` | `{}` | Pinned-transport orientation |
| `adt_transport_check` | `{"name":"ZCL_X","object_type":"class"}` | Pre-write transport check (read-only) |

> `adt_unit_test` runs the object's test classes on SAP. It writes nothing to the
> transport system, but it does execute ABAP — only run it against objects whose
> tests are safe to execute.

## When the user asks to CHANGE SAP

This toolkit is read-only by design. If the user wants to create, edit, push,
activate, delete, or move objects into transports:

1. Explain that this is the **read-only** SAP toolkit — those operations are
   deliberately disabled.
2. Point them at the compliant delivery path: the **abapgit-workflow** skill (manual
   abapGit ZIP cycle) — Claude edits `src/`, the developer carries the ZIP into
   SAPGUI. That keeps a human in the loop and stays within SAP's API policy.

Do not try to work around the gate (it returns `404` for write tools anyway).

## Reference material (in this skill folder)

- `references/OBJECT_TYPES.md` — ADT object-type codes (CLAS/INTF/PROG/TABL/...)
- `references/DDIC_OBJECTS.md` — domains, data elements, structures, tables
- `references/RAP_CDS_OBJECTS.md` — CDS + RAP object reading
- `references/ABAP_SQL_REFERENCE.md` — SELECT syntax for `adt_sql`
- `references/WINDOWS_ENCODING.md` — UTF-8 gotchas on Windows shells

## Router-only sistemler (SAProuter native/raw HTTP izni yok) — RFC bridge

Bazı müşteri SAProuter'ları `saprouttab` izin tablosunda **SAP protokolü
(native/message-mode — DIAG, RFC)** trafiğine izin verir ama **ADT'nin düz
HTTPS trafiğine (ICM portu, 443NN)** izin vermez. Bu durumda aXet SAP
Launcher `.conn_adt`'a şu ek alanları yazar:

```
ADT_RFC_MODE=true
ADT_RFC_ASHOST=<hedef host>
ADT_RFC_SYSNR=<instance no>
ADT_RFC_SAPROUTER=<router route string>
ADT_RFC_BRIDGE_PORT=8788
ADT_SAP_URL=http://127.0.0.1:8788
```

`ADT_SAP_URL` zaten bu bridge'e işaret ediyor — yani `%sap-adt-readonly`'yi
**her zamanki gibi** kullan (SKILL.md'nin üstündeki adımlar), sadece bridge'i
önce ayakta tutman gerekiyor:

### Kurulum (bir kere, kullanıcının kendi SAP S-user'ı gerekli)

RFC bağlantısı **lisanslı SAP NW RFC SDK** gerektirir — bunu bu asistan
senin adına indiremez (S-user kimlik doğrulaması gerekiyor, dağıtımı SAP
tarafından yasak):

1. `https://support.sap.com/en/product/connectors/nwrfcsdk.html` adresinden
   kendi SAP S-user'ınla "SAP NW RFC SDK"yı indir (ek ücret yok, sadece
   indirme yetkisi gerekiyor — yoksa SAP Note 1037575'e bak).
2. ZIP'i aç, `SAPNWRFC_HOME` ortam değişkenini açılan klasöre ayarla.
3. `py -m pip install pyrfc` (SDK header/lib'lerine karşı derlenir; Python
   sürümünle uyumlu bir C/C++ toolchain gerekir).

### Kullanım

```bash
# 1) Kurulumu doğrula (RFC_PING + SADT_REST_RFC_ENDPOINT arayüzünü kontrol eder)
py "<sap-toolkit>/abaper/skills/sap-adt-readonly/scripts/adt_rfc_probe.py"

# 2) Bridge'i başlat (run_in_background: true)
ADT_CWD=$(pwd) py "<sap-toolkit>/abaper/skills/sap-adt-readonly/scripts/adt_rfc_bridge.py" --port 8788

# 3) Normal akışa devam et — %sap-adt-readonly zaten ADT_SAP_URL üzerinden bu bridge'e gidiyor
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())"
```

**Nasıl çalışıyor**: Bridge, router'ın izin verdiği native RFC kanalını
kullanıp SAP'ın `SADT_REST_RFC_ENDPOINT` fonksiyon modülüyle (resmi olarak
dokümante edilmemiş ama Eclipse ADT'nin de kullandığı, topluluk tarafında
doğrulanmış bir mekanizma) her ADT REST isteğini RFC üzerinden proxy'liyor.
Bu sayede mevcut `sap_adt_lib.py`/`adt_readonly_server.py` kodu **hiç
değişmeden** çalışıyor — sadece hedef URL yerelde bir bridge'e işaret ediyor.

**Sınırlar**: Okuma araçları (get_source, search, sql, where_used,
syntax_check, atc_check, list_package, revisions, dumps, list_transports)
güvenilir çalışır. Çok adımlı stateful akışlar (özellikle **aktivasyon**)
gerçek bir HTTP session gerektirdiği için bu bridge üzerinden **güvenilir
çalışmaz** — zaten bu read-only server'da aktivasyon yok, sorun değil.

`adt_rfc_probe.py` her zaman önce çalıştırılmalı: `SADT_REST_RFC_ENDPOINT`
alan adları (REQUEST_LINE/HEADER_FIELDS/MESSAGE_BODY, STATUS_LINE) SAP
sürümüne göre değişebilir — probe gerçek alan adlarını
`RFC_GET_FUNCTION_INTERFACE` ile bastırır, uyumsuzluk varsa
`adt_rfc_bridge.py`'deki marshalling kodunu ona göre düzelt.

