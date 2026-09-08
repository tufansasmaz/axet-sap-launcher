# Patterns

Three shapes cover most of what gets built. Each is transcribed from a working NTT
project or cookbook, with tenant values replaced by placeholders.

## 1. Okta-protected LLM gateway

**When**: another NTT DATA application needs an LLM, and you want one governed,
audited, logged entry point instead of every app carrying its own key.

```
third-party app
  -> Okta-protected HTTP endpoint in aXet.flows
  -> payload converted to LLM messages
  -> enabler-llm
  -> normal HTTP response
```

Importable skeleton: `assets/templates/llm-gateway.json`, or

```bash
py scripts/new_flow.py --tab "LLM Gateway" --template llm-gateway         -o flow.json
py scripts/new_flow.py --tab "LLM API"     --template llm-gateway-audited -o flow.json
```

**Use `llm-gateway-audited` for anything you intend to deploy.** It is the plain
skeleton plus the four things a live NTT deployment of this pattern actually has and
the skeleton does not: a tab-wide `catch` answering `502` with a structured body, a
`use-case` node wired to the model call with `isAI` ticked, its `audit-config`, and an
`axetflows-app` node. Those are not polish - the first is the only error path a
production runner has, and the last three are two of the three deployment gates. It is
transcribed from a deployment that is live, with every tenant value replaced by a
placeholder and fresh node ids on every run.

There is deliberately **no static asset** for the audited variant. A shipped file has
fixed node ids, and a template imported into many projects is exactly where an id
collision silently merges two nodes.

The three nodes that carry the design:

```json
{"type":"http in","url":"api/llm-enabler/v2","method":"post",
 "upload":false,"skipBodyParsing":false,"securityConfig":"<security config id>"}

{"type":"http-in-security-config","name":"Okta","public":false,
 "roles":["ROLE_ADMIN","ROLE_USER"]}

{"type":"enabler-llm","model":"gpt-4.1","slug":"<your-slug>",
 "projectid":"<your-project-id>"}
```

**The request contract is `msg.messages`, not `msg.payload`.** The Function node in
front of the LLM builds it, and accepts whatever shape the caller happens to send:

```javascript
const body  = msg.payload || {};
const query = body.message || body.prompt || JSON.stringify(body);

msg.messages = [
    {role: "system", content: "You are a helpful assistant for enterprise applications."},
    {role: "user",   content: query}
];
return msg;
```

**That snippet is the shape, not the whole node.** Read literally it is an
uncapped, untyped funnel from an HTTP body into a metered API, and the live NTT
deployment of this pattern shipped exactly that. Three guards belong in front of
it, and the generated templates carry all three:

| guard | what it stops |
|---|---|
| `if (turn.length > MAX_CHARS) reject("too_large")` | `JSON.stringify(body)` on a fat body billing you for a prompt nobody wrote. A cap of 8000 characters is roughly 2k tokens - raise it deliberately, never delete it |
| reject a body that is not a plain object | a string or array body being stringified whole and sent as the question |
| reject a non-string `message` | `{"message": {...}}` arriving as `[object Object]` in the prompt |

Answer a rejection on a **second Function output** wired straight to the
`http response` node, with `413` for the cap and `400` for the rest. Routing it
through the model to say "that was invalid" costs a call to learn what the node
already knew.

Extract the answer immediately - never leak the provider envelope:

```javascript
const data = msg.payload.choices[0].message.content;
msg.payload = data;
return msg;
```

and wrap it in a contract you control, so a model swap is not a breaking change:

```javascript
msg.payload = {
    answer: data,
    model: msg.payload.model,
    traceId: msg.req?.headers?.["x-correlation-id"] || msg._msgid
};
```

Errors get the same treatment - a structured shape, not a stack trace:

```json
{"error":{"code":"llm_gateway_failed","message":"...","traceId":"..."}}
```

Live **after publication**, at the URL the deployment panel shows -
`…/flows/cloud/<app-name>/api/llm-enabler/v2` and `…/flows/cloud/<deptapp-id>/…` have
both been seen, so read it rather than composing it.

The shape a real deployment settles into, as `inspect_flow.py` renders it:

```
-> POST api/llm-enabler/v2 [http in]
  -> build messages [function]
    -> Model [enabler-llm] (out 0)
      -> extract answer [function]
        -> respond [http response]
        -> Audit LLM Call [use-case]
    -> respond [http response] (out 1)
-> any failure on this tab [catch]
  -> error response [function]
    -> respond [http response]
```

Three details in that tree are the whole difference between a demo and a deployment.
`build messages` has **two outputs** and short-circuits a missing question to `respond`
with a 400, so a bad request never costs a completion. `extract answer` calls
`node.error(message, msg)` with **two** arguments when the model returns nothing -
one argument writes a log line and the `catch` branch never runs. And the `use-case`
node hangs off `extract answer`, i.e. off the action it declares, because the auditor
reads the wiring.

**Do not use this pattern as an open public LLM endpoint.** `public:false` and a role
list are the whole point; without them you have published an endpoint that spends
somebody elses token budget.

### Production checklist for this pattern
- [ ] `public:false`, roles restricted to what actually calls it.
- [ ] `slug` / `projectid` from your own project, via `env.get()` where they differ
      per environment.
- [ ] Request validated before the LLM call (a missing question should cost 400, not a
      completion).
- [ ] Stable response contract; provider envelope never exposed.
- [ ] Structured errors with a correlation id.
- [ ] Correlation id read from `x-correlation-id` and echoed back.
- [ ] A `catch` on the tab. It is the only error path the production runner has.
- [ ] Use case node wired to the model call, `isAI` ticked.
- [ ] `axetflows-app` node present, with the Okta config referenced on it.
- [ ] Sonar: 0 Hotspots.
- [ ] Audit requested; expiry noted.
- [ ] Rate and consumption expectations agreed with whoever owns the project budget.

## 2. Form + database CRUD app

**When**: an admin screen over a project database - the shape Flows Assistant generates
for the OKTA user list, and the one to copy for your own entity.

Structure, one tab per entity, `__deptAppsAssociatedEntity` naming it:

```
Search form  --(out: new)---------> view-action redirect -> Details form
             --(out: delete)------> db-remove   -> view-action update
             --(out: edit)--------> function (row id) -> db-find-one -> redirect
             --(out: grid)--------> db-query    -> view-action update
             --(out: onInitForm)--> db-query    -> view-action update

Details form --(out: cancel)------> view-action redirect -> Search form
             --(out: save)--------> db-persist  -> view-action redirect -> Search form
```

Two habits that make this work:

- The **grid, the filter and the paginator are all `msg` properties on the query
  node** (`submission.searchFilterContainer`, `submission.dataGrid`,
  `submission.paginator.*`). Wire the forms grid to those names and pagination is
  free.
- Every branch ends in a **`view-action`**. A database node that does not end in one
  leaves the screen showing stale data.

Do not hand-build this if the Flows Assistant can generate it: **From LocalStorage DB**
produces the tab, the forms and the wiring, and the generated `dbName` is marked
`dbNameIsBlockByAutogeneration: true` so it stays consistent.

## 3. Document intelligence pipeline

**When**: documents in, indexed text out - the aXet.talk shape.

```
File Type Detection
  -> Conversion Agent
  -> RAW TXT generation
  -> Image extraction
  -> CLEAN TXT generation
  -> Preprocessing and chunk splitting
  -> RAG indexing
```

By type: DOCX/PPTX -> RAW -> CLEAN; PDF -> RAW **with OCR** -> CLEAN; TXT -> direct
normalization.

Conversion agents run as Python Agent nodes (`ppt-txt.py`, `pdf-txt.py`,
`langgraph-txt.py`) with their dependencies installed by the **Install Dependencies**
node - around 17 packages including LibreOffice for the Office formats and a WSGI
server (Waitress / Gunicorn) to front them.

Files live under `/internal-storage-files/files/`.

Setup order matters, and it is Phase 0 for a reason: **import the `.deptapp` template
first**, then upload the region-specific credential file, then enter the credential
password, then set the Project ID. Doing it in another order leaves nodes configured
against a project that is not yours.

## 4. Agent chain with an Output Schema contract

**When**: one model call cannot do the job and you want the *chain* to decide, not the
wiring — a draft, a review, and a bounded number of correction rounds.

```
inputs -> join -> [1] Generator -> save
                     -> [2] Refiner -> save
                        -> [3] Reviewer (outputSchema) -> function (read decision)
                           -> switch on msg.decision
                              -> "proceed"  -> [4] final step
                              -> "revise"   -> back to [2]
                              -> "escalate" -> write a hand-off file
```

Three things carry this pattern, and none of them is the wiring.

**The Reviewer's `outputSchema`.** Without it the reviewer returns prose and the switch
has nothing to test. With it, the answer is an object and the decision becomes data:

```javascript
const r = msg.payload;          // typed, because of outputSchema
msg.approved = r.approved === true;
if (msg.approved)             msg.decision = "proceed";
else if (msg.round < MAX)     msg.decision = "revise";
else                          msg.decision = "escalate";
return msg;
```

**The round counter lives on `msg`, not in context** — two triggers running at once
would otherwise share one counter.

**The Reviewer's `instructions` sentence decides the outcome.** In the run this pattern
came from, changing that one sentence was the difference between a chain that escalated
to a human and one that produced 710 lines of ABAP. Tune the instruction, not the graph.

Two bounds are mandatory rather than nice:

- **A maximum number of rounds**, with an `escalate` branch that writes a file naming
  what is still open. A loop with no ceiling is a budget incident.
- **Feed back summaries, not full text.** The node's own timeout is 300 s, but the
  gateway in front of the model has its own, and a loop that re-sends the whole
  document dies with `OriginTimeout` regardless of what the node says.

Wire the agent's **second output** — the error output — everywhere, or model and
gateway failures vanish.

## 5. Scheduled report: Excel, archive, mail

**When**: somebody wants a number every morning and currently reads it off a screen.

```
inject "run now"      (msg.source = "manual")   -\
inject "07:30 Mon-Fri" (msg.source = "scheduled") -> function (build table)
                                                       |-> json-to-excel -> file (.xlsx, Encoding none)
                                                       |                     -> secret -> function -> ms-graph-mail-send
                                                       \-> function (one JSON line) -> file (append, .jsonl)
                                    catch -----------> function -> file (errors.log)
```

The shape of it, in four rules:

- **Two triggers, one chain**, each tagging `msg.source`. The tag goes into the archive
  so "manual or scheduled?" stays answerable.
- **The producing node feeds delivery and archive in parallel**, so a mail failure
  still leaves a report on disk and a row in the history.
- **One `catch` for the whole tab**, writing `source.name | message` to a file — in
  production there is no debug panel, and the file is the only trace.
- Every path under `/internal-storage-files/`.

Contracts, styles, formulas and the JSONL rules: `references/delivery.md`.

## 6. Human review before a consequential action

**When**: the flow can do something that costs money, changes a record or leaves the
company, and a rule cannot decide whether it should.

```
input -> python-agent (start)  -> switch on msg.payload.status
                                    "completed"          -> return
                                    "waiting_for_review" -> form / mail / ticket
                                                            -> collect decision
                                                            -> python-agent (resume)
                                                            -> switch on status
                                                               "approved" -> the action
                                                               "rejected" -> safe stop
```

The agent is called **twice around the same `run_id`** — once to propose, once to
resume with the decision — and the node that waits is never the node that acts.

Three things sink this pattern and none of them is visible on the canvas: the pause
kept in process memory instead of a durable store (a restart loses the request and
nobody is told), no `expires_at` (the flow stops forever), and no idempotency key (a
resubmitted approval executes twice). LangGraph also **re-runs the interrupted node on
resume**, so nothing with a side effect may sit above `interrupt()`.

Before adding it, check it is warranted: read-only, reversible, or rule-decidable steps
should not have a gate, and a flow where *everything* goes to review has a retrieval or
prompt problem wearing a control as a disguise.

The record shape, the python-agent settings, the LangGraph entrypoint and the test
list: `references/human_review.md`.

## Anti-patterns

| do not | why |
|---|---|
| Edit files under `.deptapps-instances-in-designermode` | The designer owns them; one project is up in design mode and it will overwrite you |
| Pass credentials on `msg` | Flow persistence is unencrypted; the platform refuses this by design |
| Rename `deptapps-*` to `axetflows-*` | Both spellings are live in 6.5.2; renaming breaks the node |
| Reuse node ids from another export | A collision silently merges nodes on import. Ids are 16 hex characters - `scripts/new_flow.py` mints fresh ones |
| Publish an LLM endpoint with `public:true` | An open endpoint spending somebody elses project budget |
| An app node with `authNone` or Basic login | Every aXet.flows app authenticates with Okta - house rule; the validator refuses it |
| Leave the app node out because "it is just a flow" | No app node = standalone-only, no login. Cloud is the default; a desktop build is the user's call - ask first |
| Ship an export without scrubbing | Exports carry the live `projectid`, `slug`, database and auth config names |
| Mail a `.deptapp` unscrubbed | Its envelope adds two real mail addresses, the `instanceId` and a `use-case` `userid` that names a person |
| Keep a downloaded cloud deployment YAML | It carries a registry password, an RSA private key and a backend JWT in a base64 `Secret` |
| Read `hasAI` in `usedNodes` as an AI declaration | It is null for every module, `enabler-llm` included. The declaration is `use-case.isAI` |
| Treat the flow score as a gate | It is informational; the gates are the audit and 0 Sonar Hotspots |
| One `use-case` node for a flow that does three things | The audit wants one per action, and rejects the project otherwise |
| A `use-case` node sitting unconnected on the canvas | The auditor sees the wiring; unattached is not a declaration |
| Invent a use case id that looks right | The Use Case field must name a use case registered on the development project; anything else reads as unfilled and the audit rejects it |
| Declare a Generative AI use case as an ordinary one | That is precisely the unregistered AI use the audit exists to catch |
| Deploy and expect a URL | Publication creates the route, not deploy |
| Write anything you need to keep to `/data` | It looks persistent and is a Docker volume; it goes with the container |
| `require`, `process` or `fs` in a Function node | The sandbox removed them; it fails on the first message, not at deploy |
| `atob()` to decode a form upload | Silently mangles every non-ASCII character; use `Buffer.from(x, "base64")` |
| `node.error("text")` and a Catch node | One argument only writes a log line; the Catch branch never runs |
| A `switch` with no `otherwise` | Unmatched messages are dropped with no error and no debug line |
| Hand-build an `inject` without all four timing fields | The designer invalidates it and it never fires, silently |
| An AI node with its error output unwired | Every model and gateway failure disappears |
| A correction loop with no round ceiling | It is a budget incident, not a bug |
| Feed the full document back into a loop | The gateway times out (`OriginTimeout`) long before the node does |
| Promise an unattended AI flow in production | Every restart needs a human at `/credentials/activate.html` |
| Put a user value into a `sql-query` Mustache slot | Mustache concatenates; it does not bind. That is an injection |
| Trust the canvas that a dropped node spliced a wire | It often did not; check `GET /flows` or `inspect_flow.py` |
| `POST /flows` a partial flow set | The deploy replaces everything; the tabs you did not read are deleted |
| `GET /flows` without `Node-RED-API-Version: v2` | You get the v1 array, no `rev`, and the next deploy has nothing to lock against |
| Edit `/data/flows*.json` to make a change | The engine holds the flow in memory and overwrites the file |
| Add a UI page and not register it on the app node menu | The page exists and no user can reach it |
| Hold a review's paused state in process memory | A restart loses the request silently, and the reviewer waits forever |
| A review step with no `expires_at` | Nobody answers, and the flow stops without saying so |
| Let the model approve its own consequential action | The appearance of a control, not a control |
