---
name: datasphere-skill-pack
description: >
  Point a consultant at the upstream SAP Datasphere skill pack
  (MarioDeFelipe/sap-datasphere-plugin-for-claude-cowork, MIT, 18 skills),
  explain how to add it, and say how it must be read against the NTT rule that
  Datasphere work goes through the official CLI. Use when the user needs
  Datasphere depth the NTT skill does not carry - view design, analytic models,
  data and replication flows, intelligent lookup, task chain troubleshooting,
  row-level security and DACs, catalog governance, data products, transports
  between tenants, S/4HANA entity import, BW bridge migration, performance
  tuning - or asks "is there a bigger Datasphere skill pack" or "should I
  install the community Datasphere plugin".
allowed-tools: Read, WebFetch, Bash
version: 1.0.0
---

# The upstream Datasphere skill pack — and how to read it

## Why this sits next to `datasphere` and not in `sap-ecosystem`

The NTT `datasphere` skill exists partly to **stop** an agent reaching for an
unofficial Datasphere wrapper. So a skill that recommends a community Datasphere pack
has to be read directly against that rule, not filed away with the UI5 and CAP
pointers. The short version:

- The rule refuses **third-party MCP servers** that wrap Datasphere's APIs.
- `MarioDeFelipe/sap-datasphere-plugin-for-claude-cowork` is **not** one. It ships no
  server and no wrapper. It is 18 markdown skills that drive `@sap/datasphere-cli` —
  the same official tool the NTT skill already routes to.

So it is compatible in kind. It is not, however, unconditionally safe: see the
consumption-API caveat below.

## What it adds over the NTT skill

`sap-datasphere/datasphere` is one skill covering the CLI surface: spaces, objects,
task chains, DB users, marketplace. It is deliberately thin, and it is about *how to
drive the tool*.

The upstream pack is 18 skills about *how to do the modelling work*:

| area | skills |
|---|---|
| modelling | `view-architect`, `analytic-model-creator`, `transformation-logic`, `intelligent-lookup` |
| integration | `data-flows`, `flow-doctor`, `connections`, `s4hana-import`, `bw-bridge-migration` |
| governance | `security-architect`, `catalog-steward`, `data-product-publisher` |
| operations | `admin`, `cli-automator`, `transport-manager`, `performance-optimizer`, `explorer`, `business-content-activator` |

`flow-doctor` (diagnosing failed Data/Replication/Transformation flows and task chains)
and `performance-optimizer` (slow views, timeouts) are the two that most often earn the
install — they are troubleshooting knowledge that is otherwise scattered across notes.

## How to add it

The repository carries a `plugin.json` but no marketplace manifest, so it installs as
loose skill folders in both clients.

```bash
git clone --depth 1 https://github.com/MarioDeFelipe/sap-datasphere-plugin-for-claude-cowork.git ds-pack
```

**Claude Code:**

```bash
cp -r ds-pack/skills/* ~/.claude/skills/
```

**aXet.code:**

```bash
cp -r ds-pack/skills/* "$LOCALAPPDATA/axet-code/skills/"
```

No MCP server is required, so it works unchanged in aXet.code. Take the folders you
need — 18 more skill descriptions is a real slice of the context window.

## What to watch

- **Three skills hand-roll HTTP.** `datasphere-admin`, `datasphere-explorer` and
  `datasphere-view-architect` reach `/api/v1/dwc/consumption/` directly rather than
  going through the CLI. That is the one place the pack crosses the NTT rule. Read what
  they propose before running it, and prefer the CLI path where one exists.
- **The NTT guardrails still apply, and they are still procedural.** Datasphere deploys
  are whole-object, so a partial payload overwrites: read the definition before
  deploying, keep definitions as files in the repo, print and confirm every write, and
  on a production tenant print but never run. The upstream pack does not enforce any of
  this — it has no gate at all.
- **Reading a definition is metadata; selecting rows from a view is business data**, and
  possibly personal data. That distinction is the NTT skill's, not the upstream pack's.
  Ask before the second one.
- **`transport-manager` moves objects between tenants.** Treat it like any landscape
  move: not on production, and not without the customer knowing.
- **Two overlaps with other NTT plugins.** The pack's `analytic-model-creator` sits on
  ground `sap-sac` also touches, and `bw-bridge-migration` on ground `sap-bw` touches.
  Where they disagree, the NTT skill is the one wired to our tested surface.
- **Third-party, unsupported by NTT.** Issues go to the upstream repository.

## Licence

MIT, Copyright (c) 2026 Datasphere Automations. Redistributable, but NTT does not
redistribute it — you install from source and receive updates directly.
