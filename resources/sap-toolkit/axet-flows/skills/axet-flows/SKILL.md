---
name: axet-flows
description: Build, review, debug and hand over aXet.flows projects. Use when the user works with aXet.flows (NTT DATA's Node-RED derivative) flows, deptapp/axetflows nodes, exported flow JSON, .deptapp versions, AI agent nodes (axet-agents-execute) or the LLM Enabler gateway, form/CRUD apps, python-agent LangChain/LangGraph agents and human-approval steps, Excel and e-mail report delivery, the live designer container and its admin API, a flow that deploys cleanly but does nothing, or the audit + Sonar gates before a production deployment.
---

# aXet.flows

aXet.flows (v6.5.2, NTT DATA "AI Inside Transformation") is a **Node-RED derivative**.
A flow is a JSON array of node objects with `id` / `type` / `z` / `x` / `y` / `wires`,
exactly as in Node-RED, plus a family of aXet nodes (`axetflows-*`, `deptapps-*`,
`enabler-llm`) that supply UI, persistence, auth and LLM access.

Everything Node-RED knows about wiring, the Function node and context applies. What is
different is the **platform around it**: how a project is opened, how flow JSON gets in
and out, and which gates stand between a working flow and a deployed one.

## The one thing to get right: how you exchange flows

**The integration surface is Import/Export of flow JSON through the designer.** It is
the one route that works in every mode and survives a version change:

- the local runtime is a WSL-backed Docker instance behind the aXet wrapper, its port
  is not a fixed contract, and **design mode runs exactly one project at a time**;
- the project files under `C:\Users\<user>\AppData\Local\` are owned by the designer.
  **Never edit, move or delete anything there.** The designer will overwrite you, or
  you will corrupt a locked project.

The designer container *does* expose the Node-RED admin API — `GET`/`POST /flows`,
`POST /inject/<id>` — and it is both the fastest way to see what the engine holds
rather than what the canvas draws, and a supported way to apply a change to a running
designer. It is **design-time only**: the production runner disables it, and imported
node ids are regenerated, so an id from your own file 404s. Working against it takes
three headers-and-habits that are easy to miss — `Node-RED-API-Version: v2`, sending
back the `rev` from the `GET`, and reading the *whole* flow set before POSTing one,
because a deploy replaces everything. Calls and caveats in `references/runtime.md`.

So the loop is always:

1. **Out** — flow tab menu -> Export -> *Download* (a `.json` file) or *Copy to
   clipboard*. Selecting nodes first (drag, or Ctrl+click; they highlight orange)
   exports only that selection.
2. **You work on the JSON on disk** with the scripts in `scripts/`.
3. **In** — Import -> paste or choose the file -> *Import to* current flow or new flow.
4. **Deploy** in the designer, then read the debug sidebar.

A whole *version* moves differently: 'Export flow' menu -> `.deptapp` file, and
'Import version' on the other side (it asks to lock the project). Use `.deptapp` for
handing a project to another person or environment; use flow JSON for editing.

## Working rules

- **Generate ids, never invent them.** Node ids are **16 lowercase hex characters** —
  that is what the designer writes in every export, checked across all of them. Use
  `common.generate_id()`. Reusing an id silently merges two nodes on import.
- **Every non-`tab` node needs a `z`** pointing at a real `tab` id in the same array,
  and every id in `wires` must exist. `scripts/validate_flow.py` checks both — run it
  before every import.
- **Never rename `deptapps-*` to `axetflows-*` in an existing flow.** The product's
  rename is unfinished and both spellings are live: tabs carry
  `__deptAppsAssociatedEntity`, the auth node is `deptapps-app-auth-okta`, the contrib
  module is `deptapps-flows-contrib-nodes-enabler`. When you *read* a security context,
  read both `msg.__deptAppsSecurityContext*` and `msg.__axetFlowsSecurityContext*`.
- **Credentials never travel in `msg`.** The platform refuses it by design — flow
  persistence is unencrypted, so anything you put on `msg` is exposed. Use the auth
  config node and the security context.
- **Emit all four inject timing fields** — `repeat`, `crontab`, `once`, `onceDelay` —
  even when empty. Omit one and the designer rebuilds Repeat as an empty `interval`:
  the node goes invalid, never fires, and reports nothing. Export always writes them,
  so this only bites hand-built JSON, which is what this skill produces.
- **The Function node is a sandbox.** `require`, `process` and `fs` are not defined,
  and it fails on the first message rather than at deploy. Use `env.get()`, the
  `file` / `http request` nodes, and `Buffer` — which *is* available, and is how
  base64 works in both directions. Never `atob()`: it mangles non-ASCII text.
- **Only `/internal-storage-files/` and `/external-repository-files/` survive the
  container.** `/data` reads like a persistent volume and is not.
- **A UI page has to be registered on the `axetflows-app` node's menu** (Menu ->
  Add form view) or no user can reach it. And when you add anything to an existing
  project — a page, a tab, a menu entry — **add**: preserve what was already there
  unless replacing it was the request.
- **Every app deploys to the cloud and authenticates with Okta — unless the user says
  desktop.** House rule (2026-09-03). The platform's floor under it is in the user
  manual (6.5.2, "Production Deployment"): no `axetflows-app` node deploys standalone
  only, an app node opens the cloud, an app node with OKTA deploys both ways. So every
  template `new_flow.py` writes carries the app node and its `deptapps-app-auth-okta`
  config, `empty` included; `validate_flow.py` refuses `authNone`/Basic on an app node
  and warns when there is none. A desktop build may leave the pair out
  (`--standalone`), but that is the user's decision: **ask, never assume**.
- **Import the new version before deleting the old ones.** Emptying a project's version
  list drops its audit approval with it, and getting that back is a human review on the
  aXet team's schedule. Import → deploy → confirm it is running → *then* prune. The
  tidy-first instinct is the expensive one (2026-09-02).
- **`menu` and `welcomePage` survive a `.deptapp` import — write them, don't ask for
  the designer.** The tutorial says they are lost; it is describing a plain **flows
  JSON** import, and the two paths differ. Round-tripped on 2026-09-02: both came back
  byte-for-byte. What an import does *not* do is deploy — the app keeps serving the
  previous version, so "the menu we shipped was ignored" is nearly always a version
  that was imported and never run.
- **`info.deptAppVersionInfo.usedNodes` is a manifest the platform recomputes, not a
  gate.** Every row carries `typeName`, the module it came from and a server-side
  numeric `id`; the import discards what you wrote there and rebuilds the list from
  the flow. Measured on the platform's own re-exports: a version sent up with 10 rows
  and a node type missing from them came back with all 14 nodes and 11 rows (1.0.2);
  one sent with 94 copied rows came back with 12 (1.0.6, 1.0.8). This skill claimed
  for a day that the list *dropped* unlisted types - inferred from a `Cannot GET /chat`
  on 1.0.4 and never checked against a re-export. Retracted 2026-09-03; the likelier
  cause is the one 1.0.8 later proved, a deploy that did not replace the running
  container. Read the list for what it is good for: which contrib modules, at which
  versions, the target instance needs.
- **SharePoint and Outlook are palette nodes, not agent tools.** `MS Graph Sharepoint`
  and `MS Graph Mail` are documented and work today; the agent node's `mcpTools` /
  `coreTools` / `customTools` fields exist but appear in no aXet documentation at all
  and in no captured export. Read the node's Tools tab in the designer before answering
  a question about them - `node_catalog.md` says what is known and what is not.
- **Assume a silent failure before a loud one.** The four that cost the most time all
  deploy cleanly: a `switch` with no `otherwise` drops unmatched messages, an
  `http request` returning text makes every `payload.<field>` rule miss, a node the
  designer calls "not properly configured" is simply dead, and a one-argument
  `node.error()` never reaches a Catch node. `validate_flow.py` looks for all of them,
  and since 2026-09-03 for the references that fail like a dangling wire but are not
  one: an `http in` with no `securityConfig`, `authConfig: Okta` beside an empty
  `oktaDb` or an auth node without `dbEngineType` (the two live causes of HTTP 500
  *Credentials is not well configured on App node*), a `use-case` nothing wires into,
  a form page missing from the app menu, and a template literal whose backslashes
  Node will drop. Run against this project's own history it fails 1.0.0 through 1.0.2
  and warns on 1.0.5 and 1.0.6 - every one for the fault that was actually hit.
- **Scrub before you share.** Exports carry tenant configuration: `projectid`, `slug`,
  `dbName`, `oktaDb`, `securityConfig` ids, `configurationName`. A `.deptapp` carries
  more — the owner's and the author's **mail addresses**, the `instanceId`, and on a
  `use-case` node a `userid` that is the **Okta id of a person**. Run
  `scripts/scrub_flow.py` before a flow leaves the project it came from. Published NTT
  cookbooks use `"<your-project-id>"` — match that.
- **A downloaded cloud deployment YAML is a credential file.** It ships a container
  registry password, an RSA private key and a backend JWT inside a Kubernetes
  `Secret` — which is base64-encoded, not encrypted. Read the limit you needed, then
  delete it. Never into a repo, a ticket or SharePoint.
- **Keep script output ASCII.** The Windows console is cp1252; use `py`, not `python`.

## Scripts

```bash
py scripts/inspect_flow.py  flow.json                 # what is in here: tabs, node counts, entrypoints, wiring
py scripts/validate_flow.py flow.json                 # ids, z, wires, config refs + the silent killers -> exit 1 on error
py scripts/new_flow.py      --tab "My Flow" -o f.json # a tab + the Okta app node every app has
py scripts/new_flow.py      --tab "My Flow" --standalone -o f.json  # desktop build, ONLY after asking
py scripts/new_flow.py      --tab "Gateway" --template llm-gateway --console -o f.json
py scripts/new_flow.py      --tab "LLM API" --template llm-gateway-audited \
                            --use-case <registered id> --use-case-category <its category> -o f.json
py scripts/scrub_flow.py    flow.json -o shareable.json --report
py scripts/probe_endpoint.py --url <endpoint from the deployment panel>   # is it live?
```

**All three readers take either shape** — a tab export (a JSON array) or a `.deptapp`
(an object wrapping it at `flowsData.flows`). Point them at whichever file you were
sent; the `.deptapp` is usually the one that arrives by mail. On a `.deptapp`,
`inspect_flow.py` additionally prints the version header, the **module manifest**
(which contrib module and version each node type needs on the target instance) and an
**audit declaration** line per `use-case` node showing its use case id, whether
Generative AI is ticked and whether it is actually wired — the three things the audit
gate turns on. `scrub_flow.py` writes a `.deptapp` back out as a `.deptapp`, envelope
included, so it stays importable as a version.

`scripts/common.py` holds `generate_id()`, `read_flow()`, `write_flow()`, plus
`read_raw()` / `unwrap()` / `deptapp_summary()` / `used_modules()` for the envelope —
import it rather than re-deriving the id format or the wrapper shape.

`assets/templates/llm-gateway.json` is an importable skeleton of the Okta-protected
LLM endpoint, already scrubbed.

`assets/chat-ui/index.html` is a chat console for that endpoint — one static page, no
build step, no CDN, nothing tenant-specific in it. Serve it from a **`function` node on
a public `GET` route in the same app**: same origin is the only way the page can read
the Okta token out of `localStorage`, and the route has to be public because a browser
cannot put an `Authorization` header on a navigation. Nothing secret is served; every
call the page makes goes to the protected API route, so an unauthenticated visitor gets
a page that can call nothing. It offers a model picker, a `max_tokens` field, and a
live inspector showing the request JSON and a runnable `curl` — which is how a
colleague learns the API instead of being handed a terminal command.

**Verify a page by loading it in a browser and reading the console.** Serving the right
bytes and having a working API are two other claims — both were true of this page for
two days while it threw `Uncaught SyntaxError` on every load, because the only checks
run were a `curl` of the HTML and a replay of the request the page *would* make.
Neither executes the page's JavaScript, which is the one thing a user does.

The page is served from a `function` node, the shape verified to load in a browser; a
`template` node with `syntax: plain` should do as well and was abandoned on a misread
failure (see the `usedNodes` rule above). `--console` builds the whole thing, and it embeds the
page as a **JSON string** — `json.dumps(html)`, never a backtick template literal. A
literal reads better in the designer and was the first shape this took; it also ate all
23 backslashes in the page, so `.replace(/\/(ui|chat)\/?$/, "")` was served as
`.replace(//(ui|chat)/?$/` — a line comment — and the browser blamed the *next* line
(`Unexpected token 'var'`). Nothing on this side could see it: the damage happens when
Node evaluates the literal, not when the JSON is written, so the export looked correct
and validated clean. Serve any page this way and the escaping stops being a question.

`probe_endpoint.py` answers the question a browser cannot: **"it deployed and nothing
happens"** looks the same whether the request never passed Okta, the version was never
published, or the model call failed. It runs two stages — an **empty-body probe first**,
because the gateway's own validation answers `400 bad_request` and that 400 *proves* the
request cleared auth and the flow executed, at zero model tokens — then a real call. It
reads the token from `AXET_FLOWS_TOKEN` and the URL from `--url`/`AXET_FLOWS_ENDPOINT`,
never from the file, and exits **0** consuming / **1** reachable-not-answering /
**2** not reachable / **4** blocked before the flow, so it can gate a pipeline.

That last one is the rung worth knowing about. The platform answers in **its own error
envelope** - `{"error": true, "code": <int>, "httpStatus": <int>, "message": "..."}` -
which is a different shape from your flow's `{"error": {"code", "message", "traceId"}}`.
When you see the platform's shape, **not one node of your flow ran**, and there is no
bug in your wiring to find. Verified live on one NTT app, in this order: it answered
`500 "Credentials is not well configured on App node"` on every call - first because
`authConfig: "Okta"` sat next to an empty `oktaDb`, then, after that was wired, because
the auth node itself was missing the required `dbEngineType`. A nonexistent path on the
same app answered a plain 404 throughout, which is how you know the route was
registered and the deployment was fine. Both were fixed **in the JSON**; neither needed
the designer. `references/node_catalog.md` has the node to paste.

**A changed error is progress.** When the app node came right, the same call answered
`400 "Credentials are mandatory to access this resource."` - the endpoint is
`public: false` and the probe carries no token, so that is the correct answer, not a
continuation of the failure.

## References

| file | read it when |
|---|---|
| `references/node_catalog.md` | you need a node's real property set (verified against live exports) |
| `references/palette.md` | the node you want isn't in the catalog — all 95 types, their owning module, and their defaults |
| `references/function_node.md` | writing Function node code — the sandbox, send/done, context, errors |
| `references/patterns.md` | LLM gateway, form+DB CRUD, document pipeline, agent chain, scheduled report, human review |
| `references/human_review.md` | a person must approve before the flow acts — and when that gate should not exist |
| `references/platform.md` | designer, deploy modes, versions, subflows, and the gates before production |
| `references/runtime.md` | it worked yesterday — containers, paths, the 401, production activation, diagnostics |
| `references/delivery.md` | the result has to reach a person — Excel, run history, e-mail, scheduling |

## Before anyone says "it's ready"

Deployment is gated by the platform, not by you. The **`aXet.flows deployment`** button
in the list of versions shows all three gates and their status — read it rather than
guessing:

1. **Audit Status** — a human aXet-team audit, valid **6 months**. The `use-case`
   node is **mandatory** (manual 6.5.2: "mandatory to inform the use cases that solve
   your development project"), **one per action**, not per project (read a JIRA task
   *and* write an Excel file = two nodes), each **wired to the action it describes** —
   the auditor sees the wiring — with **Generative AI ticked** when that is what it is,
   and with the **Use Case field filled**. Filled means: one of the use cases
   **registered on the development project** when it was created (Category ->
   Use case dropdowns, and the node's editor offers the same list). The audit checks
   that those registered use cases are the ones the flows inform, so an invented id
   — `UC-LLM-ENABLER-001` looked perfectly plausible and sat in one project from its
   first version — reads as an *unfilled* field and is rejected (feedback,
   2026-09-03). The registered set cannot be read from a flow file: pick it in the
   designer once, export, and copy it from there. `new_flow.py` has no placeholder
   for it; `--use-case` / `--use-case-category` are required for the audited
   template, and `validate_flow.py` refuses an empty or placeholder value.
2. **Security Analysis Status** — Sonar. **No project with more than 0 Hotspots can be
   deployed.** Not a warning; a block. Run it from *Scan Now* in the version list, the
   *Sonar Scanner* button in the designer, or the *Run Sonar after save?* checkbox. The
   finding carries a **RuleKey** and the offending code; fix the code.
3. **Okta Auth** — on every app, by house rule; the platform itself demands it only
   for the cloud, and the cloud is where NTT apps go. Flows Assistant -> *Apply Auth
   App* -> *OKTA Authentication* writes the auth node plus a user-admin UI; the auth
   node alone (`references/node_catalog.md`) is enough for an API and can be written
   into the JSON. It must be referenced from the `axetflows-app` node's `oktaDb` and
   carry `dbEngineType`. No app node at all = standalone-only = a desktop build, which
   is something the user has to have asked for.
4. The cloud URL is created by **publication**, not by deploy. Two base forms have
   been seen — `…/flows/cloud/<app-name>/` and `…/flows/cloud/<deptapp-id>/` (e.g.
   `/flows/cloud/19238/`). **Read the URL off the deployment panel rather than
   composing it**, and hand the consumer that one.
5. **If the project uses an AI node**, production requires a human to open
   `http://localhost:<port>/credentials/activate.html` **after every restart**. Say so
   at handover — it is what makes an "unattended" flow attended, and it is discovered
   at the worst possible moment otherwise.

The designer's **flow score panel is informational only** — it blocks nothing. Do not
treat a green score as readiness, and do not treat a red one as a blocker. The
"nodes not properly configured" warning is the reverse: it blocks nothing either, and
the node it names is silently dead after deploy.
