# Connection setup: switching systems, BTP

Moved out of SKILL.md on 2026-11-12 (read when the user switches systems or connects to BTP Public Cloud).

### Build it from SAP Logon instead of asking — `sapgui_landscape.py`

Almost everything `.conn_adt` needs is already on the machine. SAP GUI keeps every
system the consultant can reach in `SAPUILandscape.xml` (`%APPDATA%\SAP\Common\`):
system id, application server, instance number, SAProuter hop, and for WEBGUI/FIORI
entries a real HTTPS URL with the client in the query string. Read it rather than
dictating a URL back to someone reading a screenshot — that is how a client becomes
800 instead of 100.

```bash
py plugins/sap-consultant/skills/sap-adt/scripts/sapgui_landscape.py --list --probe
py plugins/sap-consultant/skills/sap-adt/scripts/sapgui_landscape.py --json   # for you
```

**The flow to run when the user wants to switch systems:**

1. `--list --probe`, and show the table. `--probe` is a bare TCP connect to each
   candidate port — no request, no credentials — and it is what separates a system
   ADT can reach directly from one that needs the RFC bridge. Guessing that from the
   file alone is not possible.
2. **Ask which system.** Offer the numbers from the table; never pick for them.
3. **Ask which tier that system is** — DEV, QA or PRD. This is not optional and not
   inferable: an absent `ADT_SAP_TIER` reads as **DEV**, and DEV is the only writable
   tier, so a production box that inherits a blank tier is writable. `--tier` is
   therefore mandatory whenever the system changes. If the consultant is unsure, PRD.
4. **Ask for a password only if it is a different one.** The script reuses what is in
   `.conn_adt` when the user is unchanged (`--keep-password` forces that). It asks
   for a new one only when `--user` differs or the file has none.
5. Run `--connect <SID> --tier <TIER>`, then `sap_doctor.py`, then **restart the MCP
   server** — it caches one client for its lifetime.

```bash
echo <password> | py .../sapgui_landscape.py --connect ELT --tier DEV --password-stdin
py .../sapgui_landscape.py --connect ELT --tier DEV --keep-password
py .../sapgui_landscape.py --connect ELT --tier DEV --dry-run      # show, write nothing
```

**Never put a password on the command line.** There is deliberately no `--password`
option: an argument lands in the shell history and in the process list of every user
on the machine. `--password-stdin` reads one line from stdin; `ADT_NEW_PASSWORD` is
the non-interactive equivalent. The rule above still holds — you do not ask for a
password in the conversation either; hand the consultant the command to run.

**What it refuses to do, and why each refusal is right:**

| situation | what happens |
|---|---|
| a web entry whose **name** matches a system but whose **host** differs | reported under `[CONFIRM]`, **never selected** — even when its port answers. A chatbot, a portal and an ABAP stack all answer on 443, and a Web Dispatcher that does not route this system answers ADT with `ICMENOSYSTEMFOUND`. Basis confirms it; then pass `--url <origin>` |
| nothing answers on any candidate port | the system is router-only → it writes the **RFC bridge** config (`RFC_ASHOST`, `RFC_SYSNR`, `RFC_SAPROUTER` in `.env`) and points `ADT_SAP_URL` at `http://127.0.0.1:8410`. See [`sap-adt-router-bridge`](../../sap-adt-router-bridge/SKILL.md) |
| the entry is a **message server** (port `36NN`) | refused. Group logon is a different connection shape; ask Basis for an application server |
| `.conn_adt` already has `ADT_SAP_TIER`, BTP keys, `NTTH_*` | all preserved. The file is **merged**, not rewritten, and the previous version is kept as `.conn_adt.bak` |

`ADT_CWD` decides which project's `.conn_adt` is written, exactly as it does for the
MCP server. The script writes two local files and contacts no SAP system.

### BTP Cloud Public Edition (.s4hana.cloud.sap)

Basic Auth is **NOT supported**. Two options:

**A — SAML SSO (Playwright, most compatible):** add
`ADT_SAML_COOKIES_FILE=.saml_cookies.json` to `.conn_adt`, run
`login_saml_sso.py --cwd <PROJECT_DIR>` once (`--headed` for MFA); re-run when the
session expires (~8–12 h).

**B — OAuth2/IAS (headless, needs the SAP_COM_0901 arrangement):** set
`ADT_IAS_TOKEN_URL`, `ADT_IAS_CLIENT_ID`, `ADT_IAS_CLIENT_SECRET` in `.conn_adt`.

**BTP warnings:**
- `/sap/bc/adt/discovery` returns 200 publicly even without auth — the logon check does
  a second authenticated probe and reports `btp_cloud: true` when SAML is needed.
- `ParseError: not well-formed` = a SAML HTML redirect instead of ADT XML → re-run
  `login_saml_sso.py`.
- Transport creation uses `/sap/bc/adt/cts/transportrequests` with
  `tm:useraction="newrequest"`; **HTTP 406 = SUCCESS**, the number is in the `Location`
  header. The old `/cts/transports` endpoint is not supported there.

