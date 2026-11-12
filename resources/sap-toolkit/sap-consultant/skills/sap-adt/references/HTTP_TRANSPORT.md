# Local HTTP transport

Moved out of SKILL.md on 2026-11-12 (read only when starting or debugging the HTTP server).

Some agents (e.g. `aXet.code`) can't hold a bidirectional stdio pipe. Calling scripts
per-process instead loses the stateful session (orphaned locks → ghost transports), so
the fix is a local HTTP transport on the SAME long-lived process and the identical
persistent `SAPClient` — no ghost risk.

```bash
# start (single-user, localhost-only; ADT_CWD points at the dir with .conn_adt)
ADT_CWD="$(pwd)" python plugins/sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py --http --port 8787
# -> stderr prints the bearer token to send. Every request needs it.
```

```powershell
$env:ADT_CWD = (Get-Location).Path
python .\scripts\adt_mcp_server.py --http --port 8787
```

Both forms, because PowerShell has no inline `VAR=x command` prefix and the bash
line is a parse error there.

> **8787 is this script's default, and since 2026-08-13 it is also what the
> department setup documents say** — they used to say 8786 for the write server and
> 8787 for the read-only one, which made 8787 mean "read-only" to a consultant and
> "write" to the code. One number, one meaning now: **8787 writes, 8790 is
> read-only.** Still **probe `/health` before starting one**: a second server is a
> second SAP session, i.e. the ghost transport this transport exists to prevent.

Endpoints, all requiring `Authorization: Bearer <token>` (POSTs also
`Content-Type: application/json`):
- `GET  /health` → `{ok, auth, busy, tool_count, tools:[...]}`
- `GET  /tools` → every tool's `name`, description and JSON input `schema`
- `POST /tool/<name>` with a JSON body of kwargs → the tool's structured result

It dispatches to the exact same tool functions as stdio MCP, so every guardrail, the
auth-latch and error hints apply unchanged.

**Security** (hardened 2026-07-29 — loopback is a routing boundary, not an authorization
one; any local process or visited web page can reach `127.0.0.1`):
- **Auth on by default:** set `ABAP_HTTP_TOKEN` or the server generates a token and
  prints it to stderr. `ABAP_HTTP_ALLOW_NO_AUTH=1` disables it on loopback only.
- A non-loopback `--host` is **refused outright** unless `ABAP_HTTP_TOKEN` is set — and
  even then front it with TLS; a bearer token over plain HTTP is cleartext.
- The `Host` header must match the listener (**421** otherwise) — this stops DNS
  rebinding. No CORS headers, ever.
- Bodies capped at 1 MiB, JSON object only; chunked encoding rejected.
- **One call at a time, refused not queued:** a concurrent call gets **`503
  sap_session_busy`** immediately. (This serializes individual calls — it does not give
  one caller exclusive ownership of a multi-call workflow.)
- Every request is audit-logged to stderr (`[adt-audit]`), and to a file when
  `ABAP_HTTP_AUDIT=<path>` is set — arguments **by key only** (values carry ABAP source,
  SQL and business data).
- On shutdown: stop accepting, wait up to 180 s for the in-flight SAP call, so Ctrl-C
  mid-push does not strand a lock.

Not multi-tenant — one `.conn_adt`, one client, one user. A client disconnect does not
cancel an in-flight SAP operation.

