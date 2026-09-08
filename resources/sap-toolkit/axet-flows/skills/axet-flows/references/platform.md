# The platform around the flows

## Install and runtime

Installed from **Company Portal** (Intune) - no admin rights needed. NodeJS v20, a
WSL-backed local runtime. Working folder:

```
C:\Users\<user>\AppData\Local\.deptapps-instances-in-designermode
```

**Do not touch that folder.** The designer owns it. Editing a project file there is how
you corrupt a locked project or silently lose work on the next deploy.

- **Design mode: exactly one project is up at a time.**
- **Production mode:** several projects at once, but never two versions of the same
  project.
- A project can be **locked by a user**. Importing a version asks to lock it.

The exact folder name has moved between versions (`.deptapps-instances-in-designermode`
in the manual, `axet-flows\.deptapps-instances-in-designer-mode` on a 6.5.2 machine).
Do not hard-code it: the **Docker Dashboard**'s *Internal files Path* on the instance
card reports the real one.

The **Docker Dashboard** card per instance shows name, running version, runtime image
tag, Docker image tag, start date, volume bindings and ports. Its buttons: live log
view, log download, stop instance, open designer. The log viewer is where a truncated
debug message becomes a readable one.

Underneath the designer there is a WSL distro and a Docker container, and several
failures belong to them rather than to your flow - stale credentials after a few
hours, which container paths survive a redeploy, and the activation an AI node needs
in production. Those are in **`references/runtime.md`**.

Two designers exist: the **web designer** (web apps, the default) and the **desktop
designer** (desktop apps), toggled from the systray - *Enable Flows Desktop in design
mode*.

"Missing nodes to install" at designer start is **not an error**. Wait for the install
to finish and refresh.

## The designer

Floating toolbar: **Deploy**, **AI Assistant**, **Flows Assistant**, **Auto layout**,
**Save in cloud**.

Sidebar: flow debugger, debug, information/outline, context data (node / flow /
global), configuration nodes (unused ones dotted).

The **flow debugger** sets breakpoints on node inputs and outputs, pauses, inspects
queued messages, steps forward, and drops a message. Use it before reaching for
`node.warn` everywhere.

The **flow score panel is informational only.** It does not block deploy and does not
block execution. A green score is not a readiness signal.

The **"nodes not properly configured" warning is the opposite trap**: it also does not
block deploy, and the deploy it lets through contains a node that is *silently dead* -
no error, no message, no badge, just a branch that never runs. Treat it as a blocker
even though the product does not.

## Deploy modes

| mode | what restarts |
|---|---|
| **Full** | everything |
| **Modified Flows** | only tabs that changed |
| **Modified Nodes** | only the nodes that changed |
| **Restart Flows** | restarts without redeploying |

Modified Nodes is the fast one and the one that leaves stale state behind - anything
opened in an On Start tab that you did not close in On Stop survives it.

## Versions: `.deptapp`

- "Export flow" menu -> a `.deptapp` file for the whole project version.
- "Import version" on the other side; it asks to confirm locking the project.

**Save in Cloud** takes a version alias (semver is recommended), a version description,
and a *"Run Sonar after save?"* checkbox. Tick it - the Sonar result is a deployment
gate, and finding out at deploy time is late.

### What is actually inside one

A `.deptapp` is **not** a flow export. It is a JSON *object* that wraps one, and the
difference matters the moment you point a tool at it - a reader written for the tab
export meets a `.deptapp` with a traceback, and the `.deptapp` is the shape that
arrives by mail:

```json
{ "log":        {"version": "...", "timestamp": "..."},
  "info":       {"deptAppInfo":        {"name","creationDate","ownerEmailUser","tags"},
                 "deptAppVersionInfo": {"alias","descriptionMessage","creationDate",
                                        "creationEmailUser","usedNodes":[...]}},
  "flowsData":  {"flows": [ ...the node array, exactly as a tab export... ]},
  "configData": {"isAxetFlows","editorTheme","instanceId","nodes","users"},
  "credentials": [] }
```

The node array is at **`flowsData.flows`**. `scripts/inspect_flow.py`,
`validate_flow.py` and `scrub_flow.py` read either shape; `scrub_flow.py` writes a
`.deptapp` back out as a `.deptapp`, because a bare array is no longer a version and
"Import version" refuses it.

**`info.deptAppVersionInfo.usedNodes` is the bill of materials** - one entry per node
*type* used, each naming the module it came from:

```json
{"typeName": "enabler-llm",
 "moduleVersion": {"moduleName": "deptapps-flows-contrib-nodes-enabler",
                   "versionAlias": "2.2.14",
                   "wasInstalledViaPrivateNpmRegistry": false,
                   "npmRegistryUrl": "https://registry.npmjs.org/",
                   "hasAI": null}}
```

Read it before you import a version somebody sent you: it says which contrib modules
the target instance needs, at which versions. On 6.5.2 that is
`deptapps-flows-contrib-nodes-audit@2.2.5`, `deptapps-flows-contrib-nodes-enabler@2.2.14`
and `node-red@v6.5.2 (powered by NODE-RED v4.1.1)` for everything built in.

### What an import does to a version

Measured by diffing what went up against the platform's own re-export of it
(2026-09-02/03, versions 1.0.2, 1.0.6 and 1.0.8 of one project):

| part of the file | after import |
|---|---|
| `flowsData.flows` | **byte-for-byte identical** - every node and field, `menu`, `welcomePage` and `formStructure` included |
| `configData` | identical |
| `info.deptAppInfo` | identical |
| `deptAppVersionInfo.alias` | `_imported` appended (`1.0.8` -> `1.0.8_imported`) |
| `deptAppVersionInfo.descriptionMessage` | a note appended |
| `deptAppVersionInfo.creationDate` | the import time |
| `deptAppVersionInfo.usedNodes` | **recomputed from the flow** - 10 rows with a type missing came back as 11 with it present; 94 copied rows came back as 12 |
| `log.timestamp` | the export time; it says nothing about the version |

Two consequences.

**`usedNodes` is a manifest, not a gate.** Each row is
`{"id": <server int>, "typeName": ..., "moduleVersion": {...}}`, and what you put
there is discarded: a node whose type is absent from the list is imported anyway and
the list grows to name it. This document said the opposite for a day - that the import
"materialises only the types listed and drops the rest" - on the strength of a
`Cannot GET /chat` from version 1.0.4, whose re-export was never opened. Retracted
2026-09-03. The likelier cause is the one proven on 1.0.8 below: the version was
imported and the deployment did not replace the running container.

**An import is not a deploy.** The app keeps serving the previous version until a
deployment of the new one actually starts - and the Cloud Deployments row can name the
new alias while the container still runs the old bytes (1.0.8, 2026-09-02, proven by
evaluating both versions' page node under `node` and diffing against what the URL
served). "The menu we shipped was ignored" and "the route is not there" are both,
first, questions about which version is running. Delete the stale deployment row and
start the new one; a failed start leaves the old container up, which is why the URL
keeps answering.

Read `usedNodes` for what it is good for: the contrib modules and versions the target
instance must have before every node type in the version will load.

**Do not read `hasAI`.** It is `null` for every entry in a real export -
`enabler-llm` included - so it is not a "this uses AI" signal and not a substitute for
the audit. The AI declaration is the `use-case` node's `isAI` flag and nothing else.

**A `.deptapp` identifies people.** `ownerEmailUser` and `creationEmailUser` are real
mail addresses, `configData.instanceId` is the tenant instance, and the nodes inside
carry `projectid`, `slug` and - on a `use-case` node - a `userid` that is the Okta id
of the person who declared the use case. Run `scripts/scrub_flow.py` before it leaves
the project.

## Flows: JSON

- flow tab menu -> **Export** -> *Download* (file) or *Copy to clipboard*.
- Select nodes first to export a subset: drag, or Ctrl+click; selected nodes highlight
  orange.
- **Import** -> paste or choose -> *Import to*: current flow or new flow.

This is the surface to build tooling **on**, because it is the one that works in every
mode and survives a version change.

It is not the only one, though. The **Node-RED admin API is reachable on the designer
container** (`GET`/`POST /flows`, `POST /inject/<id>`) and is the fastest way to see
what the engine holds rather than what the canvas draws - and a supported way to apply
a change to a running designer without touching the canvas. What it is not is a way to
move a project: it is disabled in production, the host port is not a contract, and
imported node ids are regenerated. Design-time tool, not a delivery mechanism.
`references/runtime.md` has the calls, the required headers and the caveats.

## Flows Assistant

| item | what it does |
|---|---|
| From a Form.io | build a page and its wiring from a Form.io definition |
| From LocalStorage DB | build CRUD around an existing project database |
| XLSX to LocalStorage | one database per sheet |
| Import / Export LocalStorage | the **only** transfer route - project DBs are encrypted per project |
| Migrate to ext. database | MongoDB or Cassandra |
| Apply Auth App | OKTA Authentication or Basic Authentication |

**Apply Auth App** generates a user database, CRUD forms, a login configuration and an
admin area. Basic Authentication also seeds `admin/admin` - change it before the
project leaves a sandbox.

## Subflows and sharing

- Install shared subflows: Settings -> Palette -> Install -> **Shared Subflows**.
- A subflow **cannot contain an instance of itself**.
- **Share flow in cloud**: name, description, version alias, version description.
  Pressing it again creates a **new version** of the same shared subflow.
- **Unlink from cloud!** detaches it, so the next share creates a *new* subflow rather
  than a version. That is the escape hatch when a shared subflow was published to the
  wrong place - and the trap when you meant to publish a version.

## Certified Libraries

aXet.flows is based on Node-RED, so third-party community libraries can be installed -
subject to the platform security policy. **Certified** means pre-installed and tested
by the aXet team: Settings -> Palette -> Install -> Certified Libraries. Prefer a
certified library; an uncertified one is a Sonar finding waiting to happen.

## The production gates

There are **two ways to deploy** and they do not have the same requirements:

| | what it needs |
|---|---|
| **Download standalone / desktop executable** | Audit + Sonar |
| **Deploy on cloud** | Audit + Sonar **+ OKTA authentication** |

You do not have to guess where a project stands. In the **list of versions**, the
**`aXet.flows deployment`** button shows all three requirements and their status:

```
Audit Status                      Approved
Security Analysis Status (Sonar)  Approved
Okta Auth                         Approved
```

Read that panel before promising a date. Each gate below is one row of it.

### 1. Audit Status

A human audit by the aXet team, valid for **6 months** - it expires and has to be
redone.

The project must contain **at least one `use-case` node** - the manual calls it
"mandatory to inform the use cases that solve your development project" - correctly
configured and **wired to the action it describes**. Not one per project: **one per
action**. A flow that reads a JIRA task and writes an Excel file is two actions, so it
carries two use-case nodes.

**The Use Case field on the node must be filled, and filled means registered.** Use
cases belong to the development project: when the project is created (Catalog ->
Add Flow) a Category is chosen and then a Use case from the list that category
offers, and the node's editor presents that same list. The audit "will verify that
the use cases selected when registering the development project are appropriate and
properly informed in the flows" (manual 6.5.2, "Production Deployment"). A
`usecaseid` that is not one of them - empty, a placeholder, or an id somebody made
up to look right - reads to the auditor as a node whose Use Case was never filled
in. That feedback arrived on 2026-09-03 for a project whose node had carried
`UC-LLM-ENABLER-001` and category `AUDIT` since its very first version; neither was
registered anywhere. The registered set is not in any flow file, so the way to get
it is to open the node in the designer once, choose, export, and copy the values
from that export into anything built by hand afterwards. `validate_flow.py` refuses
an empty or placeholder Use Case and a version with no use-case node at all;
`new_flow.py --template llm-gateway-audited` will not write a node without
`--use-case` and `--use-case-category`.

The auditor sees the configuration *and* the wiring, so a use-case node parked in a
corner unconnected is not a declaration - it is a rejected audit.

**Generative AI use has to be ticked as such on the node.** An AI use case declared as
an ordinary one is exactly the unregistered-AI case the audit exists to catch.

**Import the new version BEFORE deleting the old ones.** Approval is carried by the
project, and clearing every version out of it takes the approval with it — the audit
then has to be requested again, which is a human review on the aXet team's clock, not
a rebuild. Measured 2026-09-02. Housekeeping an old version list is a reasonable thing
to want; do it in this order and it costs nothing:

1. import the new version,
2. deploy it and confirm it is the one running,
3. *then* delete the versions you no longer want.

The tempting order — clean up first, import into a tidy project — is the one that
reopens the gate.

### 2. Security Analysis Status (Sonar)

**No project with more than 0 Hotspots can be deployed.** Zero, not "few".

Three places run it, and the last is the one to make a habit:

1. **Scan Now** in the list of versions;
2. the **Sonar Scanner** button in the designer;
3. the **Run Sonar after save?** checkbox when saving a version.

The result lists each finding with a **RuleKey** (`S5042` and friends) linking to the
rule, and the code that triggered it. The rule catalogue is at
<https://rules.sonarsource.com/javascript/type/Security%20Hotspot/> - the JavaScript
hotspot list, because a Function node is JavaScript and that is where these come from.

Fix the code the message names. A Hotspot is not a warning you can annotate away.

### 3. Okta Auth

The platform demands it for the **cloud**; NTT demands it for every app, because the
cloud is where NTT apps go (house rule, 2026-09-03). The manual's own statement (6.5.2,
"Production Deployment"): a flow with no `app` node can only be deployed standalone; a
cloud deployment needs an `app` node; an `app` node that uses OKTA can be deployed both
in the cloud and standalone. Flows Assistant -> **Apply Auth App** -> **OKTA
Authentication** writes the auth node, a user store, user-admin CRUD forms and an
administrator area on the site map; an API needs only the auth node, which can be
written into the JSON (`node_catalog.md`, `deptapps-app-auth-okta`) and referenced from
the app node's `oktaDb`.

A **desktop** (standalone) build may go without the app node. That is a decision, not a
default: ask the user which target they mean before leaving Okta out, and say in the
handover that the result is standalone-only. `new_flow.py --standalone` is the opt-out;
`validate_flow.py` warns on a missing app node and refuses any login type but Okta.

Finally: **publication creates the URL, deploy does not.** After publication an HTTP-in
node at `api/llm-enabler/v2` inside app `my-app` answers at

```
POST https://axet.nttdata.com/flows/cloud/my-app/api/llm-enabler/v2
```

**Two forms of that base have been seen, and we have not established the rule.** The
documented one uses the app *name* as above; a deployment made on 2026-09-01 is
reachable at `https://axet.nttdata.com/flows/cloud/19238/`, where `19238` is the
numeric deptapp id. Both work; which one the portal hands out may depend on the
version or on whether the app has a slug.

So: **read the URL off the deployment panel rather than composing it**, and give the
consumer the one the portal shows. Composing it from the app name is the mistake that
produces a 404 nobody can explain, and the id form is the one to paste into a ticket
because it cannot be confused with another app of the same name.

## Handover checklist

- [ ] **One `use-case` node per action**, each wired to the action it describes, and
      Generative AI ticked where that is what it is.
- [ ] Sonar run, **0 Hotspots**.
- [ ] Audit requested, and dated - note when the 6 months expire.
- [ ] The **`aXet.flows deployment`** panel in the version list read, not assumed - all
      three rows Approved (Okta Auth only matters for a cloud deployment).
- [ ] `app` node present if this must run in the cloud, and **every user-facing form
      page registered on its Menu** - a page nobody can navigate to is not delivered.
- [ ] No credentials on `msg`; auth through the config node.
- [ ] Endpoint security config `public:false` for anything that costs money or reads
      data.
- [ ] Environment-specific values via `$(ENV_VAR)` / `env.get()`, not hard-coded.
- [ ] Version saved in cloud with a semver alias and a description.
- [ ] Anything leaving the project run through `scripts/scrub_flow.py`.
- [ ] Every file the flow must keep written under `/internal-storage-files/`, not
      `/data`.
- [ ] **If the flow uses an AI node**: whoever operates it knows that production
      requires a human to open `/credentials/activate.html` **after every restart**.
      Say this out loud at handover - it is the one thing that makes an otherwise
      unattended flow attended.
- [ ] The edit lock released: Catalog -> the flow card's `...` menu -> **Unblock
      Flow**. A held lock looks to the next person like a broken project.
