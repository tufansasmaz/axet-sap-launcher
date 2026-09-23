---
name: sap-object-transfer
description: >
  Move ABAP objects between two SAP systems, optionally renaming them to a
  different standard. Use for a customer's old system to their new one
  (ECC -> S/4), NTT's reusable library into a customer system, or one customer
  system to another. Builds a reviewable transfer plan, applies a naming map,
  writes through the persistent ADT session and then reconciles against the
  target. Triggers: obje taşıma, sistemler arası aktarım, başka sisteme kopyala,
  kütüphaneden al, yeniden adlandırarak taşı, ECC'den S/4'e taşı, paketi taşı,
  cross-system transfer, object transfer, rename objects, migrate package.
allowed-tools: Bash(py:*), Bash(python:*), Read, Write, Edit, Grep, Glob
---

# Cross-system object transfer

Four stages. The middle two never touch SAP; the artifacts between them are the
point.

```
1 extract     source (read-only)  -> plan.yaml + payload/
2 rename      files only          -> out/ + residue / external / changes reports
3 deploy      target (MCP session)-> runs/<UTC>.yaml
4 reconcile   target (read-only)  -> reports/reconcile.md
```

> **NTT Studio uyarlaması — MCP değil, HTTP.** Bu sayfada "MCP session" denen şey,
> NTT Studio'nun bağlanırken başlattığı `http://127.0.0.1:8787` sunucusu. Kendin
> başlatma. `transfer_deploy.py`'nin varsayılan portu 8786 — burada **her zaman
> `--port 8787` ver**. Token `ABAP_HTTP_TOKEN` olarak ortamda duruyor ve script onu
> kendisi okuyor; `--token` ile komut satırına yazma. Yazma yalnızca DEV'de açık: hedef
> DEV değilse deploy reddedilir, bu bir arıza DEĞİL.

Everything lives in `.transfer/<slug>/` in the project. That whole tree is
gitignored: `payload/` holds one customer's source code, and a repo is the last
place it should be able to reach another customer.

## The plan is the contract, and the human approval step

`plan.yaml` is INTENT — what moves, what each object is called on the far side,
what cannot travel this way. A human reads it and edits it before anything is
written. That review is not a formality: the riskiest moment of a transfer is
approving several dozen new object names, and it deserves a reviewable file
rather than a scrollback.

Outcomes go to `runs/<UTC>.yaml`, never back into the plan. A partial failure is
normal and the fix is to edit the plan and re-run; a run that rewrote the plan
would clobber the edit it was meant to execute.

## The two connections are asymmetric on purpose

```
<project>/.conn_adt                    TARGET  (written to, via the MCP session)
<project>/.transfer/source/.conn_adt   SOURCE  (read only, by transfer_extract)
```

The source is never written to, and that is structural rather than a rule to
follow: `transfer_extract.py` has no write code path at all. The target is
written to only through the persistent MCP session — a transfer is dozens of
writes in a row, which is exactly the workload the "no one-shot writes" house
rule protects.

**The plan records which systems it was built against, and every later stage
re-checks it.** A plan aimed at one system, run against another, stops before
the first write.

### Stage 0 — the source connection, and who fills which line

The target file already exists: the consultant has been connecting to the target
all along. The SOURCE one is new every time, so **scaffold it for them** rather
than describing a file format and waiting.

Create `.transfer/source/`, write `.conn_adt` there with everything that is not a
secret filled in, and leave exactly two lines empty:

```env
ADT_SAP_URL=https://<source>:44300
ADT_SAP_USER=
ADT_SAP_PASSWORD=
ADT_SAP_CLIENT=100
ADT_SAP_LANGUAGE=EN
```

Then ask them to fill those two lines **in the file** and say when they have.

**Never ask for the password in the conversation** and never accept one offered
there — see the same rule, and the `setup_credentials.py --json` trap it names, in
`../sap-adt/SKILL.md` under "Configuration". The whole point of leaving blanks is
that the transcript never has to hold the credential.

`.conn_adt.*` is already gitignored, so the file cannot reach a repo. The
installer never creates a real `.conn_adt` — only `.conn_adt.example` — which is
why this stage exists at all.

## Running it

Paths below are written `scripts/…`. On an **installed** copy the managed block at
the top of this file carries a `SCRIPTS_DIR` line — run `<SCRIPTS_DIR>/…` instead,
because the project copy is documentation only and the scripts live in the catalog
cache. In this repo they are `plugins/sap-consultant/skills/sap-object-transfer/scripts/`.

```bash
# 1 — read the source, propose names, write the plan
py scripts/transfer_extract.py --source .transfer/source --target . \
   --package ZREA_DENEME --to-package ZCMTEST --transport NS4K900135 \
   --prefix-from ZREA_ --prefix-to ZKIB_ --created 2026-08-11 \
   --out .transfer/zrea/plan.yaml

# 2 — READ THE PLAN. Fix names, deselect what should not travel. Then:
py scripts/transfer_rename.py --plan .transfer/zrea/plan.yaml

# 3 — read reports/residue.md. Only then, with the MCP session running:
py scripts/transfer_deploy.py --plan .transfer/zrea/plan.yaml [--dry-run] [--only NAME1,NAME2]

# 4 — ask the target, not the run file
py scripts/transfer_reconcile.py --plan .transfer/zrea/plan.yaml
```

Stage 1 is the one stage that does **not** use the session: it opens its own
read-only connection to the source. That is the house rule kept, not broken — the
rule is about writes, and `transfer_extract.py` has no write path to strand a lock
with.

Stages 3–4 take `--port` and `--token` and both default to the right thing: **8786**
and `$ABAP_HTTP_TOKEN`. Pass them only when the session is somewhere else.

### The session for stages 3–4

`ADT_CWD` = the project, so it reaches the TARGET.

```bash
ADT_CWD="$PWD" ABAP_HTTP_TOKEN=<token> \
  py <sap-adt scripts>/adt_mcp_server.py --http --port 8786
```

```powershell
$env:ADT_CWD = (Get-Location).Path
$env:ABAP_HTTP_TOKEN = "<token>"
py <sap-adt scripts>\adt_mcp_server.py --http --port 8786
```

Both forms are here because PowerShell has no inline `VAR=x command` prefix — the
bash line is a parse error there, and the aXet.code fleet is Windows.

**The port is a local fact, not a constant. Probe it; do not assume it.**
`adt_mcp_server.py` defaults to 8787, the aXet.code department publishes 8786 for a
technical consultant (and 8787 for the read-only server), and a consultant may have
started theirs anywhere.

```powershell
Invoke-RestMethod http://127.0.0.1:8786/health -Headers @{Authorization="Bearer $env:ABAP_HTTP_TOKEN"}
```

Find the running session before starting one. **A second server is a second SAP
session**, which is the ghost transport this transport exists to prevent — and
starting one because the documented number did not answer is the easiest way to get
there.

## Driving this from a conversation

The consultant says *obje taşıma* and answers questions. They do not type the
commands above — you run them. What that asks of you:

**Ask four things, once, before stage 1:** source system + package, target system +
package, the prefix rule, the transport. Nothing else needs asking; the rest of the
decisions are in the plan, where they can be seen.

**Stop three times. The stops are the skill, not friction in it.**

| after | put in front of the human | do not continue until |
|---|---|---|
| extract | the plan — counts by type, every proposed name, what rides along (Rule 9), what is routed `via: request` | they approve, or edit `plan.yaml` themselves |
| rename | `reports/residue.md`, then `reports/external.md` | residue is empty |
| deploy | the run file's failures, by object and by step | they say what to re-run |

**Do not edit `plan.yaml` for them once they have reviewed it, and do not re-run
extract "to refresh it" — that overwrites the review.** Fix a name by editing the
plan, and say which line you changed.

**Read the artifacts, not your memory of the run.** Every stage's state is on disk:
`plan.yaml`, `reports/`, `runs/<UTC>.yaml`. A transfer outlives a context window and
usually a working day, so the disk is the only thing both of you can still see
tomorrow.

**One call at a time.** The HTTP transport answers `503 sap_session_busy` to a
concurrent call. While `transfer_deploy.py` is running, do not also call `adt_*`
tools to check on it — wait for the exit code and read the run file.

**Exit codes are the answer, not the console text:** `0` every attempted object
landed, `1` at least one failed and the run file names which and at which step,
`2` blocked before anything was written (name collision — see
`reports/collisions.md`).

**Four things you never decide.** The transport (Rule 2); the target names, once
reviewed; whether a dirty residue report is "close enough"; and anything requiring
credentials — the source `.conn_adt` is written by the consultant, not by you.

## Rules

1. **Never deploy with a dirty residue report.** `reports/residue.md` lists names
   that still carry the SOURCE prefix after the transform. Each one is either an
   object missing from the plan or a reference that has to be repointed by hand.
   An empty table is the result you want; anything else means the transfer would
   ship code pointing back at the source system.

2. **The transport is the user's answer, never yours** (sap-adt Critical Rule 2).
   One open request for the whole transfer. Do not invent one, do not take one
   from an error message.

3. **Do not classify a service binding — copy it.** Object names do not reliably
   say V2 or V4 (measured: a `..._O4` binding that is V2, a `..._V2` that is V4),
   and `contract` varies by SYSTEM rather than by binding kind. `extract` reads
   the source object's own triple into the plan; deploy reproduces it.

4. **Activation is not delivery for SRVB.** An activated but unpublished binding
   looks complete in every object list while its OData service does not exist.
   Publish runs as a gate at the END of a run — "Service Definition … not yet
   active" is the normal answer while the rest of the RAP stack is still
   activating — and reconcile checks `srvb:published` on the object itself.

5. **`select` decides what travels, not what gets renamed.** An object already on
   the target is deselected so it is not overwritten; references to it are still
   repointed. Both are true at once.

6. **Objects ADT cannot carry stay in the plan**, routed with `via: request` (or
   `manual`). Dropping them would make the inventory look complete when it is
   not. Reconcile reports them as open items, never as successes.

   Two different notes appear on those rows and they are not the same claim. A
   type in `NOT_VIA_ADT` carries **its reason and its route** ("transaction
   code", "Adobe form - use adobe-gen") — somebody decided how it travels. A type
   the tool does not classify at all says **"NOT transferred and NOT assessed"**;
   `TOBJ`, the table-maintenance object, was the first found in the field, and a
   table arriving without its SM30 dialog is exactly the gap that note exists to
   keep visible. When you summarise a plan, repeat the distinction — "handled by
   transport" and "nobody has looked at this" read the same to a reviewer only
   if you flatten them.

7. **`reports/external.md` is a pre-flight, not noise.** It lists customer
   objects the transferred code references but that are NOT in the transfer. If
   one is missing on the target, everything activates and then fails at runtime.

8. **A message-class lock is not a retry.** ADT's REST layer mistakes its own
   enqueue for a foreign one, so a class created seconds ago answers *"user X is
   currently editing"*. Retrying makes it worse. Report the object name and ask
   for SM12 (or an open/close in SE91), then re-run once.

9. **Say what rides along.** When you summarise a plan for a human, name the
   function modules a group carries. They are not rows and the object count does
   not include them, so "20 objects, 20 selected" is an incomplete sentence if a
   module is going too — and the review it is asking for is worth less than it
   looks.

10. **Function modules travel with their group, never alone.** They are not TADIR
   objects and never appear as plan rows; a FUGR carries them. And RFC-enabling
   cannot be done through ADT at all — a transferred remote FM needs one manual
   tick in SE37 or `CALL FUNCTION … DESTINATION` fails at runtime.

## What travels, and how

| | |
|---|---|
| DOMA, DTEL, TTYP | XML metadata → `adt_create` |
| TABL, STRU, DDLS, BDEF, SRVD | source-bearing → empty shell (`adt_create_ddic_shell`) then a source push, so keys, foreign keys and `.INCLUDE`s survive |
| CLAS, INTF, PROG, INCL, FUGR, FUNC | `adt_create` + push |
| MSAG | `adt_message_class` create, then write the texts (SAP drops messages passed to the create) |
| SRVB | `adt_create_service_binding` from the source's triple → activate → publish |
| dynpro, Adobe/Smartform, **table contents**, TRAN, ENHO | **not via ADT** — transport export/import, or `screen-gen` / `adobe-gen` |

**Ordering is not alphabetical and not obvious.** Two tiers exist because SAP
refuses otherwise, both found by measurement:

- a function-group include deploys after its parent FG and before the FMs (8.5);
- a **RAP behaviour pool class** deploys after its behaviour definition (13.5),
  not with ordinary classes — SAP answers *"is not a root entity or is not
  released for BEHAVIOR implementations"*. The class is identified from the
  BDEF's own `implementation in class …` declaration, not from a `ZBP_` name.

## Before an ECC → S/4 transfer

Release gaps surface at activation, which is late and ugly. Run the source
objects through `abap-code-checker` and `clean-core` (same plugin) BEFORE
deploying, not after.

## Naming

Target names come from the corporate standard — the same
`../ts-generator/references/NAMING_STANDARD.md` the TS generator uses. The
`--prefix-from/--prefix-to` rule only PROPOSES; the `to:` fields in the plan are
the contract, and once a human has reviewed them nothing re-derives them.

Names that do not match the source prefix are flagged, not guessed. Names that
would exceed a type's MaxLen are flagged rather than truncated — SAP truncates
silently, and that is how a wrongly-named object reaches a system without anyone
typing it.

## Tests

`py plugins/sap-consultant/skills/sap-object-transfer/scripts/test_transfer.py`
— no SAP system, no network.
