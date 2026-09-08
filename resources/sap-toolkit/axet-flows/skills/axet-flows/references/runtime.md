# The runtime under the designer

`platform.md` covers the designer and the gates. This file covers what is underneath
it — the container your flow actually runs in. Everything here is a failure that looks
like a bug in your flow and is not.

## The chain

```
portal (axet.nttdata.com)
  -> aXet.flows Desktop, a local agent at https://localhost:65430
     -> WSL distro  aXet-flows_WSL
        -> Docker inside WSL
           -> one designer container, random host port -> 1880
```

Five links, and a failure in any of them looks the same from the browser: the designer
does not open. Work down the chain — systray agent, `wsl -l -v`, `docker ps` inside
the distro — rather than restarting the browser.

- **Designer container**: image `axet-flows/flows:latest-prod`, the editor served at
  `/`.
- **Production (runner) container**: version-pinned (`6.5.2`), the **admin UI is
  disabled** — `/flows` and `/settings` return 404 and the log says
  `Admin UI disabled`. What it serves at `/` is the *application*, not the editor.

Find the host port on the **Docker Dashboard** card for the instance. It is not a
contract: it changes between instances.

## Finding the container

The designer container is named `deptapps-flows-designer-container-<numbers>`, and it
is reached through whichever engine the machine runs — WSL Docker or Podman:

```bash
wsl -d aXet-flows_WSL -- docker ps                       # WSL Docker
podman ps                                                # Podman

wsl -d aXet-flows_WSL -- docker exec -it <container> sh  # a shell inside it
```

`docker ps` prints the mapping you need: `172.17.0.1:43541->1880/tcp`. **If more than
one container is up, ask which one** rather than picking the first — design mode runs
one project, but a stopped instance can still be listed.

## The admin API is available in the designer

The Node-RED admin API is reachable on the designer container, and it is the only way
to see what the **engine** holds rather than what the canvas draws:

```bash
curl -H "Node-RED-API-Version: v2" http://127.0.0.1:<PORT>/flows      # {rev, flows}
curl -X POST http://127.0.0.1:<PORT>/flows \
     -H "Content-Type: application/json" \
     -H "Node-RED-API-Version: v2" \
     -H "Node-RED-Deployment-Type: full" \
     --data-binary @flows.json                           # deploy a full flow set
curl -X POST http://127.0.0.1:<PORT>/inject/<NODE-ID>    # fire an inject node
```

Five things to know before you rely on it:

- **Send `Node-RED-API-Version: v2`.** Without it `GET /flows` answers in the v1 shape
  — a bare array, no `rev` — and the deploy that follows has nothing to send back.
- **Preserve the `rev`.** `GET` returns `{"rev": "<hash>", "flows": [...]}`; the `POST`
  body must carry that same `rev`. It is the optimistic-lock token, and a deploy that
  drops it is how two people overwrite each other. If a deploy fails, check the `rev`
  before you check anything else.
- **`POST /flows`, never `PUT /flows`.**
- **Node ids are regenerated on import.** Injecting the id from your own JSON file
  returns 404. Read the real id from `GET /flows` first.
- **None of this works in production.** The runner disables the admin UI, so anything
  built on these endpoints is a design-time tool only. For handing a project to
  another environment, the supported route is still Import/Export and `.deptapp`.

Two habits go with it. **The canvas is not the engine** — dropping a node onto an
existing wire frequently does *not* splice it in; it lands looking connected while its
`wires` is `[[]]`. Draw the wires by hand and verify against `GET /flows` or
`inspect_flow.py`, not against the picture. And **extend, do not replace**: a deploy
sends the *whole* flow set, so a POST built from a partial read deletes every tab, page
and menu entry it did not know about. Read first, merge, then send.

### What the editor does after an external deploy

An open editor does not notice the deploy by itself. It shows a banner —
**"The flows on the server have been updated"** — with a **Review changes** button;
when there are no conflicts the dialog offers **Merge**, which loads the server's
version into the canvas.

**Sometimes the banner does not appear at all.** Then refresh the editor, or open the
application URL, and verify by hand. Do not assume the deploy failed because the canvas
looks unchanged — check `GET /flows`.

```
external Admin API deploy
  -> refresh the editor
     -> banner appears  -> Review changes -> Merge
     -> no banner       -> verify the flow / application directly
```

### Discovering what nodes this instance actually has

The installed node packages — the ground truth for which types exist and what
properties they take — are inside the container at

```
/usr/src/node-red/node_modules/
```

e.g. `axet-flows-contrib-nodes-db-sql/package.json`. Read those rather than guessing a
property name: a palette differs between instances, and `node_catalog.md` records what
was verified on ours, not what is installed on yours.

## In the cloud it is a Kubernetes pod

A cloud deployment offers a **deployment YAML** for download, and reading it is the
only place several operational limits are stated. Verified against one real
deployment on 6.5.2 — five objects: **two** `Secret`s (a registry pull
secret and the app's own), a `PersistentVolumeClaim`, a `Service` and a `Deployment`
whose pod runs an `initContainer` first, purely to `chown`/`chmod 0700` the
volume.

| what the YAML says | why it matters to your flow |
|---|---|
| `replicas: 1`, strategy `RollingUpdate` | **one instance.** Flow context and any in-memory state are per-pod, but there is no second pod to disagree with — and equally, a redeploy loses everything not on disk |
| a `PersistentVolumeClaim`, **500Mi**, `ReadWriteOnce`, `private-azurefile-csi`, mounted at `/internal-storage-files` | this is *why* that path survives and `/data` does not. It is also a **quota**: an append-only JSONL history or a daily `.xlsx` will reach 500Mi eventually. Rotate |
| `NODE_RED_DISABLE_EDITOR: "true"`, `running.mode: headless-runner` | the admin API and the editor really are off in production. Design-time tooling only |
| `TZ: "Europe/Istanbul"` | **an `inject` `crontab` fires in the container's timezone, not the user's.** "07:30" means 07:30 in Istanbul wherever the consumer sits |
| `containerPort: 1880`, `Service` port `<assigned>` -> 1880, `ClusterIP` | there is no public port. The portal's ingress is the only way in, which is why the Okta gate is not optional in cloud |
| `image: <registry>/axet-flows/flows:6.5.2` | production is **version-pinned**, while the designer runs `latest-prod`. A flow that works in design can meet an older runtime |
| **no `resources` block on the app container** (only the initContainer has one) | no CPU or memory limit means QoS class *BestEffort*: under node pressure this pod is the **first evicted**, and nothing warns you. A flow that buffers a large file in memory is the usual trigger |
| **no `livenessProbe`, no `readinessProbe`** | Kubernetes cannot tell a wedged flow from a healthy one, so it will neither restart it nor stop routing to it. **You** have to notice. This is the argument for a trivial health route on every deployed flow, and for `scripts/probe_endpoint.py` on a schedule |
| `DEPTAPPS_WEB_BACKEND_ENDPOINT` points at the platform backend, and a JWT is mounted to reach it | a deployed flow is **not** standalone. It phones home for audit, credentials and notifications; if the backend is unreachable the flow is not simply degraded, parts of it stop |
| `START_SELENIUM_SERVER: false`, `START_DESKTOP_CONTROL_SERVER: false`, `START_VIRTUAL_SCREEN: true` | the browser/desktop automation surface is **off in cloud**. A flow that drives a browser or the desktop has to be deployed standalone. The virtual screen still starts, which is why a VNC password exists at all |
| the desktop endpoints resolve to `172.17.0.1` (the Docker bridge host) | meaningless inside the cluster. Those variables are the standalone shape carried along unchanged; do not read them as a cloud capability |
| `ELK_*` and `*_RABBITMQ` credential names | production logging goes to **ELK**, coordination over RabbitMQ/MQTT. `node.warn` is not lost, but it is not in a debug sidebar either. Ask the platform team for the index rather than adding your own file logging |
| `securityContext: privileged: true` on the app container | worth knowing before a security review asks. It is the platform's choice, not something a flow sets, and it is the reason `Function` sandboxing matters more here rather than less |

**Everything is named by the deptapp id, and that is where the URL comes from.** The
`Deployment`, the `Service`, the PVC and the pod labels are all `deptapp-<id>`; the
human name survives only as a label, with spaces replaced (`SAP AI Agent` becomes
`SAP_AI_Agent`). There is **no `Ingress` in the file** - the `Service` is `ClusterIP`
on an assigned port - so the portal's shared gateway routes to it by id. That is why a
published URL looks like `/flows/cloud/19238/`: the id is the only key that is stable
and URL-safe. A second id, `DEPTAPP_VERSION_ID`, names the *version* and is what the
container itself is named after - quote both when you open a platform ticket.

**The deployment YAML is a credential-bearing file.** In the one examined it carried,
in a Kubernetes `Secret` — which is base64-**encoded, not encrypted** — a container
registry username and password, a complete RSA private key, a signed backend JWT, the
application's user credential and a VNC password. Treat it exactly like a `.pem`:

- do not attach it to a ticket, a mail or a SharePoint folder;
- do not commit it to any repository, including a private one;
- if one has already been shared, tell the platform operators — a rotation is theirs
  to do, and a deployment export handing out a registry credential is a platform-side
  problem, not yours.

Download it to read a limit, note the limit, delete the file.

## Container paths: what survives

| path in the container | survives `docker rm`? | on Windows |
|---|---|---|
| `/internal-storage-files/files/` | **yes** | `AppData\Local\axet-flows\.deptapps-instances-in-designer-mode\<no>\files\` (design) / `.deptapps-instances\<id>\` (production) |
| `/external-repository-files/` | **yes** | `AppData\Local\axet-flows\.deptapps-desktop\repository-files\` |
| `/data` | **no** | a Docker volume; it goes with the instance |
| `/tmp`, `/home`, `/root` | **no** | gone |

`/data` is the trap twice over. It reads like the persistent path and is not — and it
is not yours either: it is the runtime's own directory, holding
`flows_<instance>.json` (the active flow), `flows_<instance>.cred.json` (credentials),
`settings.js` and `package.json`. **Read it to diagnose; never write there, and never
edit `flows*.json` to make a change** — the running engine holds the flow in memory and
will overwrite the file on its next deploy. Changes go through the admin API or the
designer.

Anything that has to outlive a redeploy — a log, a run history, a produced report —
goes under `/internal-storage-files/`. The Docker Dashboard's **Internal files Path**
on the instance card tells you where that lands on your own machine.

These are also the only paths a person can open in Explorer, which matters more than it
sounds: it is how a consultant checks the output without an editor session.

## AI agents in production need a human with a browser

Before an AI node will run in a **production** deployment, someone has to open

```
http://localhost:<production-port>/credentials/activate.html
```

and complete the activation. **This must be repeated after every restart of the
production container.** As shipped, a fully unattended AI flow is therefore not
possible — scope it that way from the start rather than discovering it at handover.

In **design** mode activation is not needed, and the page says so:
*"It is not necessary to activate the nodes in design mode."*

## The 401 that appears after a few hours

Symptom: a designer that worked all morning starts returning `Request failed with
status code 401` from `sql-query`, and the AI agent reports
`OKTA token not returned from ai-config endpoint`.

Cause: **the container takes its platform credentials at startup and never refreshes
them.** Nothing in your flow changed.

`/credentials/activate.html` does **not** fix this — it decides you are already active
and redirects to `done.html` without going to Okta. The fix is a fresh container:

1. **Save in Cloud** in the designer, or you lose the session's work.
2. Docker Dashboard -> *In Design* -> kill instance.
3. Catalog -> the flow -> **New Version -> Regular Deployment**.

## Locking

**New Version takes an exclusive edit lock** on the flow. If a colleague — or your own
abandoned session — holds it, release it from Catalog -> the flow card's `…` menu ->
**Unblock Flow**.

## Reading errors

- **A `504` in the debug panel that names no node of yours is the designer's own
  background call** (`deptapps-flows-shared-subflow/list`). It is platform-side noise.
  Ignore it.
- General technique: expand the debug message and read `config.url`. It tells you whose
  request failed, which is usually not the node you were looking at.
- The debug panel **truncates**. For an AI or gateway error the full chain — Mastra ->
  litellm -> the provider — is only in `docker logs <container>`, or in the log viewer
  on the Docker Dashboard card.
- **"Nodes not properly configured" does not block Deploy.** It also does not stop the
  deploy from producing a flow in which that node is *silently dead* — no error, no
  message, no badge. Treat the warning as a blocker even though the product does not.

## Working against a live container: the operating rules

Driving the designer from outside is a supported way to work — it is what the aXet
team's own `axet-flows-admin` skill does. The rules that keep it safe are all about
*not* reaching past the API:

- **Use the admin API for normal changes.** Editing `/data/flows*.json` or restarting
  the runtime are recovery actions, not a workflow — do neither unless the person you
  are working for asks for it in those words.
- **Preserve what you did not come to change.** Existing pages, nodes and menu entries
  stay unless replacing them was the request. "Add a page" must not mean "the app now
  has one page".
- **Reuse the existing `axetflows-app` node** for a project that already has one.
  Two app nodes is not a bigger app.
- **Verify the behaviour, not the node count.** A deploy that returns 200 has proved
  that the JSON parsed. Submit the form, fire the inject, read the debug panel.
- **Do not print the container's configuration or environment.** It carries the
  platform credentials the container took at startup.

| symptom | look at |
|---|---|
| container not found | is WSL / Podman up, does the designer container exist |
| more than one container | ask which; do not guess |
| `GET /flows` fails | the mapped `1880/tcp` port and the base URL |
| `GET /flows` returns a bare array | the `Node-RED-API-Version: v2` header is missing |
| deploy fails | the `rev`, the endpoint, and that it is `POST` not `PUT` |
| an existing page disappeared | a partial flow set was POSTed over the whole one |
| the editor shows nothing new | refresh; then Review changes -> Merge, or verify by hand |
