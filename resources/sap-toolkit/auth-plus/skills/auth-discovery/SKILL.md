---
name: auth-discovery
description: >
  Use when someone needs to know what a source SAP system's authorization landscape
  actually contains before an ECC-to-S/4HANA role migration — how many roles, of what
  kind, how complex, which are duplicates, which are customer-built, which grant
  critical authorizations, and which are broken. Reads eleven AGR_*/T* tables over ADT
  and produces raw CSVs, a versioned inventory.json for the gap stage, and an Excel
  landscape report. Stage 1 of AUTH+ (work package WP2).
  Triggers: "role inventory", "authorization landscape", "as-is analysis",
  "which roles do we have", "role complexity", "duplicate roles", "WP2",
  "landscape discovery", "how many roles before we migrate".
  READ-ONLY on the source system. No transport, no objects, no writes.
allowed-tools: Bash(py:*), Bash(python:*), Read, Grep, Glob, Write
---

# auth-discovery — what the source system actually contains

Stage 1 of three. It answers one question honestly: **what is in the source system's
authorization landscape today.** It maps nothing to a target and recommends nothing —
that is [`auth-gap-analysis`](../auth-gap-analysis/SKILL.md).

Read-only throughout. It issues `SELECT` statements through the ADT data preview
endpoint and writes files locally. It never locks an object, never touches a transport,
and never writes to SAP.

## 1. Probe before you extract

```bash
PYTHONPATH="${CLAUDE_PLUGIN_ROOT}/scripts" PYTHONIOENCODING=utf-8 \
  py -X utf8 scripts/authplus_cli.py discover --conn .conn_adt --probe
```

Every one of the eleven tables must resolve and report a row count. A failure here is a
finding worth reporting to the customer, not a crash to work around — a missing `AGR_1252`
means the system has no organisational levels maintained, which changes the migration
estimate.

Three of the eleven are **not** on slide 8 of the deck and the probe says so: `TOBJT`
(object texts — slide 8 attributes them to `TOBJ`, they are not there), `AGR_1252`
(org levels, which WP1 explicitly requires) and `AGR_PROF` (generated profiles, which is
how you find roles that were never generated).

## 2. Pilot, then widen

Start narrow, look at the output, then run the real scope:

```bash
# pilot — one role family, seconds
PYTHONPATH="${CLAUDE_PLUGIN_ROOT}/scripts" PYTHONIOENCODING=utf-8 \
  py -X utf8 scripts/authplus_cli.py discover --conn .conn_adt --role-pattern 'Z_FI_*' --out out

# full customer namespace
PYTHONPATH="${CLAUDE_PLUGIN_ROOT}/scripts" PYTHONIOENCODING=utf-8 \
  py -X utf8 scripts/authplus_cli.py discover --conn .conn_adt --role-pattern 'Z*' --out out
```

| flag | effect |
|---|---|
| `--role-pattern 'Z*'` | SAP-style filter on `AGR_DEFINE.AGR_NAME`; `*` becomes `%` |
| `--limit-roles N` | cap the role universe — for a quick look, not for a real run |
| `--no-users` | skip `AGR_USERS` entirely; every usage metric becomes zero |
| `--keep-user-names` | write real user IDs instead of pseudonyms — see §5 |
| `--from-raw` | re-analyse `out/raw/*.csv` without touching SAP at all |
| `--out DIR` | output directory (default `out`) |

Composites are expanded automatically: a composite role carries no authorizations of its
own, so its child single roles are pulled into scope even when the name filter does not
match them. That is why the role count can exceed the number of names the filter matched.

**Re-analysing is free.** Once `out/raw/` exists, `--from-raw` re-runs every metric from
disk. Use it when you change a weight or want a second report; do not re-extract.

## 3. Read the output honestly

Four traps, all of them real:

1. **`AGR_1251` rows flagged `DELETED = 'X'` are not granted.** The extract keeps them —
   they are evidence of what was removed — but `n_field_values` and every derived metric
   exclude them. So the metric legitimately reads lower than the CSV row count. Do not
   "fix" this.
2. **`AGR_TCODES` rows flagged `EXCLUDE = 'X'` are transactions the role explicitly does
   NOT grant.** Counting them as granted over-states the role.
3. **`AGR_TCODES` is not a transaction list.** Its `TYPE` column separates real
   transactions (`TR`) from other role-menu entries (`OT`) — Web Dynpro applications,
   URLs and reports, which appear as `R3TRWDYA...`. The discovery inventory counts all
   menu entries; the gap stage compares only the `TR` ones.
4. **The complexity score is a convention, not a measurement.** The weights live in one
   constant in `metrics.py`. Slide 16 of the deck lists "definition of complexity and
   risk criteria" as an input still to be agreed with the customer — so say which
   weights produced a number before quoting it.

### Verifying a count against the system

If a row count looks wrong, check it directly. The exact form matters:

```
adt_sql("SELECT COUNT(*) FROM agr_1251 WHERE agr_name = 'ZS_ABAP_USER'")
```

`COUNT(*) AS n` returns **HTTP 400** on this endpoint — the bare aggregate works, the
aliased one does not. An unrestricted `COUNT(*)` on a large table also returns 400;
always give it a `WHERE`.

Compare that number against the **raw CSV row count**, not against `n_field_values` —
see trap 1, or you will report a truncation bug that does not exist.

## 4. Hand off

`out/inventory.json` carries `"schema": "authplus/discovery/1"` and is the contract the
gap stage reads. `out/raw/_meta.json` records system, client, extraction timestamp and
the filter used — the traceability slide 5 asks for. Keep both together; a report without
its `_meta.json` cannot be defended six weeks later.

Then run [`auth-gap-analysis`](../auth-gap-analysis/SKILL.md) against the target system.

## 5. Data protection

`AGR_USERS` puts real user IDs on disk. They are **pseudonymised by default**
(`U#` + SHA-256 prefix), stable within one extract so assignment analysis still works.
`--keep-user-names` writes them in clear and requires a reason you can state; `--no-users`
skips the table entirely.

`.conn_adt` holds the password in plaintext. Never echo it, never paste it into a ticket,
never include it in a report. Error text is redacted before it is printed — do not defeat
that by printing the connection object.

## 6. When it goes wrong

| symptom | cause |
|---|---|
| `TruncatedResult` | a range page hit the row cap; the extractor halves the range and retries. If it still fails, narrow `--role-pattern`. |
| `UnicodeEncodeError` | Windows console codepage. Prefix `PYTHONIOENCODING=utf-8` and use `py -X utf8`. |
| `SSLError` | self-signed certificate; `ADT_SAP_SSL_VERIFY=false` in `.conn_adt` is the default for sandbox systems. |
| HTTP 400 on a query | single-line SQL only, no column aliases on aggregates. |
| thin results | sandbox systems hold few customer-built roles. Say so plainly rather than presenting an empty duplicate analysis as a finding. |
