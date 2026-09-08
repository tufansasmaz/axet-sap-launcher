---
name: automation-pilot-pack
description: >
  Point a consultant at SAP's own Automation Pilot skill pack
  (SAP/automation-pilot-agent-skills, Apache-2.0, 10 skills) and explain how to
  add it. Use when the user works with SAP Automation Pilot on BTP - writing or
  reviewing commands, the HTTPRequest and ExecuteScript executors, dynamic
  expressions and jq transformations, catalogs and inputs, triggering or
  monitoring executions, scheduled executions, the Content API, or debugging a
  failed execution - and the NTT catalog has no skill for it. Also use when the
  user asks "do we have anything for Automation Pilot" or wants to know what is
  in the pack before installing it.
allowed-tools: Read, WebFetch, Bash
version: 1.0.0
---

# SAP Automation Pilot — the upstream pack

## The gap this fills

Automation Pilot is the BTP service that runs operational automation — the commands
that patch, check, restart and report against a landscape on a schedule. The NTT
catalog has nothing for it, and hand-writing an Automation Pilot command means getting
dynamic expressions and jq transformations right by trial and error against a service
that reports failures late.

This pack is **published by SAP**, which matters more here than usual: the Automation
Pilot expression syntax is not widely documented outside SAP's own material.

## What is in it

10 skills, Apache-2.0:

| skill | what it covers |
|---|---|
| `automation-pilot-command-generation` | writing commands, dynamic expressions, jq transformations |
| `automation-pilot-command-review` | reviewing production commands, inputs and catalogs before they run |
| `automation-pilot-executor-httprequest` | the HTTP executor: parameters, auth, response handling |
| `automation-pilot-executor-executescript` | the ExecuteScript executor |
| `automation-pilot-catalog-explorer` | discovering available commands and catalogs via API |
| `automation-pilot-content-management-via-api` | managing commands, catalogs and inputs through the Content API |
| `automation-pilot-executions-api` | triggering and monitoring executions |
| `automation-pilot-scheduled-executions-api` | creating and managing scheduled executions |
| `automation-pilot-debugger` | diagnosing failed executions |
| `automation-pilot-mcp-server-generation` | generating MCP server definitions from Automation Pilot commands |

## How to add it

Not a Claude Code marketplace, and note the skills sit under `.claude/skills/`, not
`skills/`:

```bash
git clone --depth 1 https://github.com/SAP/automation-pilot-agent-skills.git
```

**Claude Code:**

```bash
cp -r automation-pilot-agent-skills/.claude/skills/* ~/.claude/skills/
```

**aXet.code:**

```bash
cp -r automation-pilot-agent-skills/.claude/skills/* "$LOCALAPPDATA/axet-code/skills/"
```

No MCP server is required — the skills drive the Automation Pilot REST API with the
credentials you supply — so the pack works unchanged in aXet.code.

## What to expect, and what to watch

- **This pack writes to a live BTP service.** `content-management-via-api` creates and
  changes commands; `executions-api` and `scheduled-executions-api` *run* them. An
  Automation Pilot command can restart a system or push a patch. Point it at a
  non-production Automation Pilot instance and read what it generates before you let it
  execute. The NTT rule about live testing applies here in full.
- **Credentials go in the project's `.env`.** The service key for an Automation Pilot
  instance is a live credential and never belongs in a repository or a skill file.
- **`automation-pilot-mcp-server-generation` produces an MCP server.** Useful in Claude
  Code; pointless in aXet.code, which cannot load one. Generating it is harmless either
  way — just do not expect the result to be reachable from the consultant tooling.
- **`command-review` is the one to reach for first** on any existing landscape. Reading
  what is already scheduled is a safer opening move than generating something new.
- **Third-party to NTT even though SAP publishes it.** Issues go to the SAP repository,
  not to the NTT support desk.

## Licence

Apache-2.0, SAP SE. Redistributable with attribution — NTT does not redistribute it,
so you install from source and receive updates directly.
