---
name: cap-dev-pack
description: >
  Point a consultant at the CAP team's skill pack (capire/skills, Apache-2.0)
  and explain how to add it, plus what SAP-samples/cap-agentic-engineered does
  and does not give you. Use when the user builds or extends a SAP Cloud
  Application Programming Model service - CDS modelling, cds upgrade, adding a
  remote service, Node.js CAP project layout - and the NTT catalog has no skill
  for it. Also use when the user asks "do we have anything for CAP or CDS",
  "which CAP skill pack should I install", or wants to know why the
  cap-agentic-engineered pack will not work in aXet.code.
allowed-tools: Read, WebFetch, Bash
version: 1.0.0
---

# CAP / CDS development — the upstream pack

## The gap this fills

The NTT catalog covers ABAP-side development and Datasphere. It has nothing for CAP —
the model most BTP side-by-side extensions are actually built in. For a project doing
extension development on BTP rather than in the ABAP stack, that is the whole toolchain
missing.

Two packs claim this ground. **They are not equivalent**, and picking the wrong one
gets you skills that do nothing.

## The one to install: `capire/skills`

Apache-2.0, 4 skills, maintained by the CAP team (`capire` is the CAP documentation
project). Drives the **`cds` CLI**, which the developer already has installed — no MCP
server, no extra runtime.

| skill | what it does |
|---|---|
| `cap-developer` | the main one: building and extending CAP services, CDS modelling guidance |
| `cap-upgrade` | drives `cds upgrade` to move a project to a newer CDS version |
| `cap-add-remote-service` | adds a remote service integration to an existing CAP Node.js app |
| `cap-trivia` | an interactive quiz over the CAP docs; harmless, skip it |

Published as a Claude Code marketplace:

```
/plugin marketplace add capire/skills
/plugin install skills
```

For **aXet.code**, clone and copy the folders:

```bash
git clone --depth 1 https://github.com/capire/skills.git capire-skills
cp -r capire-skills/skills/* "$LOCALAPPDATA/axet-code/skills/"
```

## The one to think twice about: `SAP-samples/cap-agentic-engineered`

Apache-2.0, and it looks larger than it is. The repository ships the same three SAP
skills twice (once under `skills/`, once under `.claude/skills/`), so the real content
is **seven** skills, not ten:

- **`sap-cap`, `sap-fiori`, `sap-ui5`** — every one of them calls
  `mcp__cap__search_docs`, `mcp__fiori__search_docs`, `mcp__cap__search_model` or
  similar. **They require SAP's documentation MCP servers.** Without those servers the
  skills load, announce themselves, and then have no way to do the thing they promise.
  **aXet.code has no MCP support at all**, so there they are permanently inert.
- **`openspec-*` (4)** — `openspec-propose`, `openspec-apply-change`,
  `openspec-archive-change`, `openspec-explore`. A spec-driven change workflow. Not
  CAP-specific, and it overlaps how NTT already runs specs through `sap-specs` and the
  project brief. Adopting it is a process decision, not a tooling one.

So: install it only on **Claude Code**, only if you have also configured SAP's CAP and
Fiori MCP servers, and only if you want the OpenSpec workflow. Otherwise `capire/skills`
is the pack that does the work.

## What to expect, and what to watch

- **CAP work is BTP work, not ABAP work.** None of this touches an ABAP system, so the
  ADT rules — transports, the persistent MCP session, the namespace guard — do not
  apply. Git is the change record here.
- **`cds upgrade` rewrites the project.** Clean tree, own branch, read the diff.
- **Credentials belong in the project's `.env`,** as everywhere else in this
  marketplace. A CAP service binding pulled down with `cf` or the BTP CLI is a live
  credential; it does not go in a repository.
- **Third-party, unsupported by NTT.** Issues go upstream.

## Licence

Apache-2.0 for both, SAP SE. Redistributable with attribution — NTT does not
redistribute them, so you install from source and receive updates directly.
