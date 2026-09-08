---
name: ui5-dev-pack
description: >
  Point a consultant at the official UI5 team's skill packs
  (UI5/plugins-coding-agents and UI5/webcomponents, both Apache-2.0, 31 skills)
  and explain how to add them. Use when the user works on a SAPUI5 or OpenUI5
  application - modernizing an old app, converting it to TypeScript, fixing
  deprecated controls or JS globals, CSP compliance, manifest.json, async
  Component loading, MDC or smart controls, OPA5 and QUnit tests, the FLP
  sandbox, Fiori elements extensions - or on UI5 Web Components styling and
  accessibility, and the NTT catalog has no skill for it. Also use when the user
  asks "do we have anything for UI5" or "is there a Fiori frontend skill".
allowed-tools: Read, WebFetch, Bash
version: 1.0.0
---

# UI5 application development — the upstream packs

## The gap this fills

The NTT catalog stops at the ABAP backend. `sap-adt` writes classes, CDS views and
OData exposure; nothing in the catalog opens a `webapp/` folder. For any project with
a custom Fiori or Freestyle UI5 front end, that is a real hole.

These two packs are maintained by **the UI5 team at SAP itself**, which makes them the
best-sourced material in the ecosystem: the same people who deprecate an API write the
skill that migrates off it.

## What is in them

**`UI5/plugins-coding-agents`** — 28 skills, Apache-2.0. Two shapes:

- **`fix-*` (16 skills)** — one migration per deprecated pattern: `fix-js-globals`,
  `fix-xml-globals`, `fix-deprecated-controls`, `fix-partially-deprecated-apis`,
  `fix-pseudo-modules`, `fix-component-async`, `fix-library-init`,
  `fix-bootstrap-params`, `fix-manifest-json`, `fix-control-renderer`,
  `fix-csp-compliance`, `fix-cyclic-deps`, `fix-table-row-mode`,
  `fix-xml-native-html`, `fix-fiori-elements-extensions`, `fix-linter-blind-spots`.
- **`ui5-best-practices-*` (8) and `modernize-*` (3)** — guidance rather than
  surgery: accessibility, integration cards, MDC, OPA5, QUnit, smart controls, tables,
  plus `modernize-ui5-app`, `modernize-test-starter`, `modernize-flp-sandbox` and
  `ui5-typescript-conversion`.

**`UI5/webcomponents`** — 3 skills, Apache-2.0: `styling` (CSS shadow parts and custom
properties), `accessibility`, `visual-test`. Only relevant if the project uses UI5 Web
Components rather than SAPUI5 proper.

## How to add them

Neither repository is a Claude Code marketplace, so both go in as loose skill folders.
`plugins-coding-agents` is small; `webcomponents` is the entire UI5 Web Components
monorepo, so clone it shallow and take only the skills.

```bash
git clone --depth 1 https://github.com/UI5/plugins-coding-agents.git
git clone --depth 1 https://github.com/UI5/webcomponents.git
```

**Claude Code** — copy into your user skills directory:

```bash
cp -r plugins-coding-agents/skills/*  ~/.claude/skills/
```

**aXet.code** — same folders, different destination:

```bash
cp -r plugins-coding-agents/skills/*  "$LOCALAPPDATA/axet-code/skills/"
```

Take the `fix-*` skills you need rather than all 16. They are written to be used one
at a time against one finding, and 28 descriptions in the context window crowds out
the SAP skills a consultant is also using.

## What to expect, and what to watch

- **Self-contained.** No MCP server, no API key, no SAP connection. They read and
  rewrite files in the project folder. This is why they work unchanged in aXet.code,
  and it is the main reason these two packs are recommended over the other UI5-adjacent
  packs in the ecosystem.
- **They will rewrite source.** `fix-*` skills edit application code. Run them on a
  branch with a clean working tree, and read the diff — the same discipline as any
  refactor, not a special rule for skills.
- **They track UI5 versions.** Install from source and let them update. A copy taken
  today and frozen will confidently migrate you to an API that moved.
- **Third-party, unsupported by NTT.** Issues go upstream, not to the NTT support desk.
- **`ui5-typescript-conversion` is a project decision, not a task.** Converting an app
  to TypeScript changes the build, the linting and every future handover. Agree it with
  the customer before an agent starts.

## Licence

Apache-2.0, both repositories, SAP SE. Redistributable with attribution — NTT does not
redistribute them, so you install from source and receive updates directly.
