# The palette — every node type, and what each one's properties do

`node_catalog.md` documents the 37 nodes this skill builds with, in depth, with the
behaviour that bites. This file is the **inventory**: all 95 types the designer offers,
which npm module owns each one, and the properties that decide what it does.

Read it when the flow needs something the catalog does not cover — SharePoint, SQL, a
worker pool, Python — before reaching for a Function node and a workaround.

## How this was captured

Captured the only way that does not involve guessing: **one of each node dragged onto a
canvas in a live project and exported** — 95 types, with the designer's own defaults on
every property. A hand-built node that carries these values lands exactly where the
designer would have put it, which is the difference between a node that works and one
the designer calls "not properly configured".

The sections above document 37 of these in depth, with the behaviour that bites. This
section is the rest: what exists, which module owns it, and the properties that decide
what it does. **A property set is not a manual** — where the purpose is inferred from
the property names rather than from a run, it says so.

Modules and versions on that system, read off `global-config.modules`:

| module | version | gives you |
|---|---|---|
| `deptapps-flows-contrib-nodes-axet` | 2.2.13 | app, form, view actions, app DB, shell, context |
| `deptapps-flows-contrib-nodes-enabler` | 2.2.14 | `enabler-llm` |
| `deptapps-flows-contrib-nodes-audit` | 2.2.5 | `use-case`, `audit-config` |
| `deptapps-flows-contrib-axet-agents` | 1.3.4 | `axet-agents-execute`, `aXet Agent` |
| `axet-flows-contrib-nodes-agents` | 1.0.10 | agent runtime |
| `axet-flows-contrib-nodes-axet-ai-capabilities` | 1.0.8 | `axet-ai-capability-in` / `-out`, `refine`, `query`, `history` |
| `deptapps-flows-contrib-nodes-ms-graph-mail-client` | 1.4.0 | Outlook mail |
| `deptapps-flows-contrib-nodes-ms-graph-sharepoint-client` | 2.3.0 | SharePoint files |
| `axet-flows-contrib-nodes-db-nosql` | 1.0.1 | `nosql-*` |
| `axet-flows-contrib-nodes-db-sql` | 1.0.1 | `sql-query` |
| `deptapps-flows-contrib-excel-utils` | 1.0.2 | the Excel family |
| `deptapps-flows-contrib-credentials` | 1.0.1 | `credentials`, `secret`, `hidden-secret` |
| `deptapps-flows-contrib-email` | 1.1.18 | `e-mail`, `e-mail in`, `check-login` |
| `deptapps-flows-contrib-nodes-session` | 1.0.2 | `get`, `set`, `save`, `destroy` |
| `axet-flows-contrib-nodes-axet-worker` | 1.0.5 | `axet-worker` |
| `axet-flows-contrib-nodes-node-backend` | 1.0.3 | `node-backend` |
| `axet-flows-contrib-nodes-python-agent` | 1.0.6 | `python-agent` |
| `axet-flows-contrib-nodes-userbot` | 1.0.0 | `UserBot` |

### App, pages and session

| type | properties that matter |
|---|---|
| `axetflows-rx-view-action` | `action` (`update`), `page`, `message`, `messageType` (`info`) — the reactive sibling of `axetflows-view-action`, which additionally does `redirectPage`, `downloadFile`/`fileName`/`inputType`. |
| `axetflows-form-data-store` | `name` only. Holds a form's data between steps. |
| `axetflows-get-context` | `outputProp` (`payload`), `outputPropType` (`msg`) — reads the security context onto a msg property. Prefer this to picking `msg.__deptAppsSecurityContext*` apart by hand. |
| `axetflows-http-in` | `url`, `method` (`get`), `upload`, `modelSchema`, `associatedLocalStorageDatabaseId`. The **app-aware** HTTP in — not the core `http in` used by the gateway. |
| `get` · `set` · `save` · `destroy` | session store (`…-nodes-session`). Only `set` carries data: `key`, `value`. Read/write/persist/clear, inferred from the names and property sets — not run here. |

### Code execution

Three ways to run code that is not a Function node, and they are not interchangeable.

`axet-worker` — a Function node on a **worker pool**. Same `func` body, plus `preset`
(`default`), `poolSize`, `idleTimeout`, `maxQueue`, `timeout` (60000). Reach for it when
a synchronous body would otherwise block the event loop.

`python-agent` — real Python, `runtimeMode: "uv"`, `pythonVersion: "3.12"`,
`codeSource` `inline` or a `gitRepo`/`gitBranch`/`entrypoint` (`main.py`),
`requirements` + `autoInstall`, `timeout` 300, `maxMemory` `512m`, `dedicatedEnv`, and
`exposeApi`/`gateway`/`apiName`/`apiRoutes` only when it must serve FastAPI routes.
`enableAxetLlm: true` with `projectid`/`model`/`slug`/`modelClientId` wires the aXet LLM
gateway into the Python side.

`node-backend` — `executionMode` `handler` (invoked by the flow) or server,
`language: "javascript"`, same inline-or-git source shape with `entrypoint: "index.js"`,
`dependencies`, `timeout` 300, `maxMemory` `512m`, plus `adminEndpointsEnabled` /
`adminAllowedEmails`, `autoRestartOnGitChange` and `dryRun`.

`axetflows-shell` — `cwd`, `script`, `env`, `executeInShellMode`,
`notWaitEndBackgroundProcesses`. `axetflows-remote-shell` adds `server`, `port` (`22`),
`operatingSystemType` (`unix`), `authmode` (`credentials`), `certificate`,
`certificatePathFromPayload`. Both run outside the Function sandbox, so both are what a
Sonar hotspot looks like — see the deployment gates in `SKILL.md`.

### Data

`axetflows-db-*` is the **app** database (`find-one`, `persist`, `query`, `remove`,
`remove-all`, `flush`); `nosql-*` is the standalone one (`count`, `find-one`, `persist`,
`query`, `remove`, `remove-all`). They share a property vocabulary:
`dbName` + `dbNameIsBlockByAutogeneration`, `collectionProperty`/`collectionPropertyType`,
`identifierProperty` (`_id` or `topic`), `bindingProperty` (`submission`,
`submission.dataGrid`, `onInitSubmission`), `searchFilterProperty`
(`submission.searchFilterContainer`), and `sort` / `paginator` on the query nodes.
`sql-query` is the whole SQL surface: `query`, and nothing else.

### Microsoft Graph - SharePoint and Outlook

**This is the answer to "how do I reach SharePoint / Outlook from a flow", and it is
not an MCP connector.** These are ordinary palette nodes; see the Tools-tab paragraph
under `axet-agents-execute` in [`node_catalog.md`](node_catalog.md) for why the agent
node's `mcpTools` field is not the route to recommend.

Mail (Outlook): `ms-graph-mail-read` (`box`, `disposition` `READ`, `criteria` `UNSEEN`,
`retrieveAttachments`), `ms-graph-mail-send` (`to`, `subject`, `saveToSentItems`).

SharePoint, all keyed on `site` + `path`: `get-files`, `get-folders`, `upload-file`
(`filename`, `replace`), `download-file` (`filename`, `destination`), `move-file`
(`sourceFilePath`, `destinationFilePath`), `delete-file` (`deletePermanently`),
`create-shareable-link` (`right`, `linkExpiration`, `accessTo`, `usersToGiveAccess`).

This is the supported route to SharePoint. Do not reach for a shell node and a synced
folder path — see the storage rule in `SKILL.md`.

### Files, Office and parsers

`excel` (`file`), `excel-to-json`, `excel-to-json-multiinput` (`sourcetype` `file`,
`filepath`, `parseCellDates`, `rangeCell`, `skipHeader`), `json-to-excel` (`kind`
`auto`, `bufferProp` `payload.buffer`, `payloadProp` `payload.data`). Parsers: `csv`,
`html`, `json`, `xml`, `yaml`, `template`. Storage: `file`, `file in`, `watch`.

### Mail and credentials

`e-mail in` / `check-login` share `protocol` (`IMAP`), `server`, `useSSL`, `port`
(`993`), `box`, `disposition`, `criteria`, `repeat` (300), `fetch` (`trigger`). **The
`server` default on a given tenant is that tenant's own relay — replace it, never copy
one out of an export.**

`credentials` and `hidden-secret` both take `property`/`propertyType` + `encrypt`;
`secret` takes `property`/`propertyType`. None of them makes it safe to put a secret on
`msg` — see the credentials rule in `SKILL.md`.

### AI capabilities

`axet-ai-capability-in` (`capability`, `validateInput: true`) and
`axet-ai-capability-out` (`capability`, `validateOutput: false`,
`defaultErrorStatusCode: 500`) bracket a capability implementation. `refine`
(`language`, `clarification`, `custom`), `query` (`model`, `slug`, `projectid`,
`language`, `groupid`, `context`, `formid`), `history` (`projectid`), `UserBot` (`name`
only).

### Stock Node-RED also on the palette

`split`, `join`, `batch`, `sort`, `range`, `rbe`, `trigger`, `delay`, `complete`,
`status`, `link in`, `link out`, `link call`, `exec`, `debug`.

`template` is on the palette and imports like anything else. A version whose
`usedNodes` lacks a type still loads nodes of that type, and the platform adds the row
itself (measured on a re-export, 2026-09-03). An earlier note here said the reverse;
see `platform.md`, "What an import does to a version".

## Palette map (6.5.2)

`ui` · `aXet UI` (SPA App) · `audit` (use case) · `aXet AI` · `network` ·
`MS Graph Mail` · `MS Graph Sharepoint` · `utils` · `noSQL Engine` · `SQL Engine` ·
`parser` · `common` · `function` · `storage` · `Excel Utils` · `process control` ·
`msg control` · `credentials` · `email` · `session` · `Deprecated Nodes` ·
`aXet Node js` (Backend) · `aXet Python` (Python Agent) · `tutorials` (Install
Dependencies).

Add a node by dragging it, by searching the palette, or by **Ctrl+click on the
workspace**. Subflows sort to the top of the palette.

Third-party Node-RED community libraries can be installed but are subject to the
platform security policy. **Certified Libraries** (Settings -> Palette -> Install) are
the ones the aXet team pre-installed and tested; prefer them.
