---
name: sap-adt-readonly
description: >
  Use when an SAP system must not be written to at all — a QA or production connection,
  an audit, a code review board, a demo, a training session, or a consultant who should
  not be able to push. Starts the same ADT engine as sap-adt with the write tools removed
  from the MCP registry, so push, create, activate, delete, transport creation and lock
  clearing are not listed and cannot be called. 17 tools instead of 33, with SQL, dumps
  and unit-test execution each behind their own opt-in.
  Triggers in Turkish or English: "read-only", "salt okunur", "sadece okuma",
  "yazma yapmasın", "PRD'ye bağlan ama dokunma", "QA connection", "production system",
  "audit only", "don't let it push", "review only", "canlı sisteme bağlan".
  In NTT Studio (aXet.code) the adt_* tools are NOT MCP tools: they are called over
  HTTP at http://127.0.0.1:8787/tool/<name>, which NTT Studio starts on connect. An
  empty adt_* tool list does NOT mean SAP is unreachable.
allowed-tools: Bash(python:*), Bash(py:*), Read, Grep, Glob
---

# sap-adt-readonly — the ADT engine with the write tools removed

> **NTT Studio uyarlaması — MCP değil, HTTP.** Bu dağıtımda MCP yok; aXet.code MCP
> konuşamıyor. Bu yüzden araç listende `adt_*` diye bir araç **görmeyeceksin** — bu
> "SAP'a bağlı değilim" demek DEĞİL. NTT Studio sisteme bağlanırken bu salt okunur
> sunucuyu kendisi başlatıyor: `http://127.0.0.1:8787` (aşağıda yazan 8790 DEĞİL).
> Aşağıda `adt_xxx` MCP aracı denen her yerde `POST http://127.0.0.1:8787/tool/adt_xxx`
> oku (JSON gövde = aracın argümanları).
>
> - Her istekte `Authorization: Bearer $ABAP_HTTP_TOKEN` gerekiyor, `/health` dahil.
>   Token ortamda duruyor; değerini ekrana basma, hiçbir dosyaya yazma.
> - İlk iş `GET /health` (hangi araçlar açık), argümanlar için `GET /tools` (her aracın
>   açıklaması ve JSON şeması). `sap-adt`'ın SKILL.md'si bu projede kurulu
>   olmayabilir — araçların ne yaptığını `/tools` söylüyor.
> - Yazan araçlar (`adt_push`, `adt_create*`, `adt_activate`, …) burada `404
>   unknown_tool` döner. Bu bir arıza değil, sistemin salt okunur olduğunu gösterir;
>   etrafından dolaşmaya kalkma, kullanıcıya söyle.
> - Sunucuyu kendin başlatma, script'leri doğrudan çalıştırma: ikinci süreç ikinci SAP
>   oturumu demek ve kapıyı atlar. Durum için proje klasöründeki `sap-context.md`'ye bak;
>   `/health` cevap vermiyorsa kullanıcıdan NTT Studio'da sisteme yeniden bağlanmasını iste.
>
> ```bash
> python -c "import os, requests; h={'Authorization': 'Bearer ' + os.environ['ABAP_HTTP_TOKEN']}; print(requests.get('http://127.0.0.1:8787/health', headers=h).json())"
> python -c "import os, requests; h={'Authorization': 'Bearer ' + os.environ['ABAP_HTTP_TOKEN']}; print(requests.post('http://127.0.0.1:8787/tool/adt_logon', json={}, headers=h).json())"
> ```

Same engine as [`sap-adt`](../sap-adt/SKILL.md), same persistent session, same
`.conn_adt`, same guardrails. **17 tools instead of 33**, because the write tools are
never registered — not listed, not callable, and not restored by unsetting an
environment variable.

This skill carries no copy of the engine. It imports `adt_mcp_server` from the
`sap-adt` skill next door and prunes the registry before any transport starts. A
forked engine is how a read-only server quietly becomes a different server with the
same name.

```bash
py plugins/sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py                 # stdio MCP
py plugins/sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py --http --port 8790
py plugins/sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py --list-tools    # print the surface, exit
```

For the tool semantics themselves — what `adt_get_source` returns, how `adt_sql` is
shaped, what `adt_atc_check` proves — read `sap-adt`'s SKILL.md. This page is only
about what is exposed and why.

---

## Why this exists, when `ADT_READONLY=true` already does something

`ADT_READONLY` is a **belt**. `guardrails.require_writable()` reads it at call time, so
all 33 tools stay advertised and a write is refused only once the agent has decided to
write, assembled the push, and spent the turn. That is right for a DEV connection
someone froze for an afternoon. It is wrong when the system must not be writeable at
all, for two reasons:

- **The write tools are still on the menu.** The model plans a push, and learns it was
  refused afterwards. On a review or audit run, repeatedly.
- **One unset variable restores full capability.** A wrapper that clears the
  environment, an `--http` launch from a different shell, an operator who "fixed" a
  refusal — and the connection is writable again, with no signal anywhere.

This skill adds the **suspenders**: the write tools are removed from the FastMCP
registry before the transport starts. Unsetting `ADT_READONLY` afterwards does not
bring them back; they do not exist in the process. Both are required — if the belt is
not in effect when the server builds its surface, it refuses to start rather than
continue on suspenders alone.

---

## The surface

**17 tools on install. 20 with all three gates open. Out of 33.**

| Group | Tools |
|---|---|
| Session / diagnostics | `ping`, `adt_doctor`, `adt_logon` |
| Source and repository | `adt_get_source`, `adt_list_package`, `adt_search`, `adt_code_search`, `adt_revisions`, `adt_inactive_objects`, `adt_badi_discovery`, `adt_where_used` |
| Static analysis | `adt_syntax_check`, `adt_atc_check` |
| Transports (read) | `adt_list_transports`, `adt_transport_status`, `adt_transport_check`, `adt_check_scatter` |

**Gated, each off by default and each with its own variable:**

| Tool | Variable | Why it is not simply allowed |
|---|---|---|
| `adt_unit_test` | `ADT_RO_ALLOW_UNIT_TEST` | Executes ABAP on the target — it runs the object's test classes |
| `adt_sql` | `ADT_RO_ALLOW_SQL` | Reads business and personal data from any table the SAP user can see |
| `adt_dumps` | `ADT_RO_ALLOW_DUMPS` | Short-dump text routinely contains field values |

**Not registered (13):** `adt_push`, `adt_create`, `adt_activate`, `adt_delete_object`,
`adt_create_package`, `adt_create_transport`, `adt_delete_transport`,
`adt_remove_from_transport`, `adt_set_transport`, `adt_clear_lock`,
`adt_generate_screen`, `adt_generate_adobe`, `adt_message_class`.

`adt_set_transport` and `adt_clear_lock` are not writes to an ABAP object and are
excluded anyway: the first pins the transport a later push would use — write-prep with
nothing to prep for — and the second changes ENQUEUE state on the system.

**The last three are mixed-mode**, and they are the reason this surface is 17 and not
19. One tool name, read *or* write depending on an argument: `adt_generate_screen(mode=)`,
`adt_generate_adobe(mode=)`, `adt_message_class(action=)`. A name-level allowlist cannot
express that, so all three are denied whole. **This costs a real read:**
`adt_generate_adobe(mode="READ")` is the only way to see an SFPI/SFPF form, because ADT
does not address those object types at all — on this surface, Adobe forms are invisible.
Read them through the full `sap-adt` surface. The durable fix is upstream — split each
into a read tool and a write tool so every name has one side-effect class:
[`references/upstream-split-proposal.md`](references/upstream-split-proposal.md).

### Why those three are gated rather than allowlisted

None of them writes anything. All three would pass a test that only asks "can this
change the system?" — which is exactly why the line is drawn somewhere else.

The people this skill is for read **read-only** as **harmless**, and hand the connection
to an agent on that basis. A surface that cannot change a single object but can select
from `PA0008` is not what an auditor means by the word. `adt_unit_test` is the same
problem from the other side: it runs customer ABAP, and ABAP Unit isolation is the test
author's responsibility, not the runner's, so a badly written test can commit.

So each is opened deliberately, per session, by someone who knows which system they are
pointed at:

```bash
ADT_RO_ALLOW_SQL=true ADT_RO_ALLOW_DUMPS=true py .../adt_readonly_server.py
```

Each gate opens on the exact string `true` — not `1`, `yes` or `on` — and opens only its
own tool. A gate that accepts several spellings is a gate someone opens by accident; a
variable that opens three tools is an opt-in to something nobody asked for.

The server prints which gates are closed at startup, so an investigation that needs
`adt_sql` fails with the reason on screen rather than the model quietly concluding the
data is unavailable.

### If you are running `sap-incident` against this server

Open `ADT_RO_ALLOW_SQL` and `ADT_RO_ALLOW_DUMPS`. Root-cause work leans on `E070`/`E071`
for what shipped, `CDHDR`/`CDPOS` for what changed, and the dump text itself — with those
closed, the skill will correctly report that it could not check them, which is honest and
useless. This is the intended shape: the capability is available for the asking, and
asking is a decision someone made rather than a default nobody saw.

---

## Reads are not free

Read-only is about the SAP system's *state*, not about exposure. This surface still
reads source, transports and **business data**:

- `adt_sql` and `adt_dumps` are gated for this reason, but the gates are meant to be
  opened — and once open, the PII/KVKK guard in `guardrails.py` is what remains. It is
  untouched here: a sensitive table (`KNA1`, `LFA1`, `BSEG`, `PA*`) on a QA/PRD tier still
  needs an explicit acknowledgement.
- `adt_get_source`, `adt_revisions` and `adt_code_search` are ungated and expose customer
  source — intellectual property, and occasionally a credential someone hard-coded.
- SAP API Policy v1.1 Q33–34 does not distinguish read from write. A read-only ADT
  surface driving an agent is exactly the case the policy names.

Nor is "no writes" the same as "no server-side work". Three *ungated* tools make SAP
*do* something rather than just hand something over: `adt_atc_check` runs the check
variant (customer-defined checks are ABAP, and some systems persist the run),
`adt_syntax_check` invokes the compiler, and `adt_logon` creates session and security-audit
records. None of them touch source, the CTS or a lock — which is the line this surface
draws — but on a system where "nothing ran" is the requirement, that line is not the
one you want.

## What this is not

It is not an authorization boundary. It reduces the tool surface of *this process*;
anyone who can start the writable entrypoint, edit the MCP config, or use the same SAP
credentials directly is unaffected by it. It stops the agent from writing and it stops
an operator from writing by accident. It does not stop an operator who means to.

If the requirement is that a system cannot be written to *at all*, the control belongs
in SAP: a separate user with display-only authorizations, whose credentials the writable
session does not have. This skill is how you keep an agent inside that decision — not a
substitute for making it.

---

## Fail-closed by design

| Condition | Behaviour |
|---|---|
| The `sap-adt` engine is not next door | Refuses to start, printing the path it looked in |
| `ADT_READONLY` not in effect at startup | Refuses to start |
| FastMCP registry not readable (mcp internals changed) | Refuses to start — no silent fallback to belt-only |
| A tool exists in the engine that is in neither `ALLOW`, `GATED` nor `DENY` | Refuses to start, **naming it** |
| A classified tool no longer exists in the engine (renamed upstream) | Refuses to start, naming it |
| The registry after pruning is not exactly the allowlist | Refuses to start, listing the difference |

The drift pin is the important one. Without it, a write tool added to the engine would
inherit one of two silent defaults — exposed, which is a hole, or hidden, which is a
capability disappearing from this server with nobody deciding it should. Instead the
server stops and a human classifies it in `ALLOW`, `GATED` or `DENY`.

**Anyone adding a tool to `adt_mcp_server.py` must also classify it here.** That is the
cost of this skill, and it is deliberate.

`--http` needs no separate allowlist: `_http_tool_specs()` derives its map from
`mcp.list_tools()`, so pruning the registry constrains both transports from one list.

---

## Tests

```bash
py plugins/sap-consultant/skills/sap-adt-readonly/scripts/test_readonly_surface.py
```

Fourteen checks, no SAP connection and no network. Each names the failure it catches: the
classification covering the engine exactly and being pairwise disjoint, the engine being
the sibling skill's file rather than any module of the same name, the 17-tool default, no
write tool surviving in stdio **or** HTTP, every gate closed on install, gates ignoring
`1`/`yes`/`on`, each gate opening only its own tool, the belt in effect, and each of the
refuse-to-start paths.

---

## Registering it in a client

It is deliberately **not** in `plugins/sap-consultant/.mcp.json`. That entry is `alwaysLoad`, so
a second entry there would *add* these tools to the 31 rather than replacing them — the
write tools would still be present, which is the whole thing this skill removes.

Point a client at this file **instead of** `adt_mcp_server.py`:

```json
{
  "mcpServers": {
    "sap-consultant-sap-adt-readonly": {
      "command": "${ABAP_PYTHON:-python3}",
      "args": ["${CLAUDE_PLUGIN_ROOT}/skills/sap-adt-readonly/scripts/adt_readonly_server.py"],
      "env": { "ADT_CWD": "${CLAUDE_PROJECT_DIR}" }
    }
  }
}
```

If both servers are registered at once, the agent sees the union — 33 tools — and this
skill has bought you nothing. Run one or the other.

---

## When to reach for it

| Situation | Why |
|---|---|
| QA or PRD connection | The system cannot be written from this session at all. |
| `abap-code-checker` review board | The reviewer reads, runs ATC and syntax, proposes a diff. It has no reason to push. |
| `sap-incident` investigation | Root-cause work is reads; the fix ships as a diff for a named human. |
| A consultant new to the tooling | Nothing they type can change the customer's system. |
| Demo or training | Same. |

Fixes still go out the normal way: a diff, reviewed by a named human, applied from a
writable session against a confirmed transport. Use `sap-adt` for that.
