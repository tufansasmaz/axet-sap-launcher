# The Function node

Standard Node-RED semantics. The parts that cost people time:

## Return

- **Return a `msg` object.** Returning a number or a string is an error, not a payload.
- **Multiple outputs**: return an array, one slot per output. `null` in a slot means
  "send nothing down this branch" — that is how you short-circuit a validation failure
  to an error response without touching the happy path.
- **Multiple messages down one output**: nest an array in that slot.

```javascript
// two outputs: ok, and error
if (!msg.payload.question) {
    msg.statusCode = 400;
    msg.payload = { error: { code: "bad_request", message: "question is required" } };
    return [null, msg];
}
return [msg, null];
```

## Asynchronous work

Do not return from a callback — return nothing and send explicitly:

```javascript
doSomethingAsync(msg.payload, (result) => {
    msg.payload = result;
    node.send(msg);
    node.done();          // tell the runtime this message is finished
});
return;                   // nothing returned synchronously
```

`node.send(msg, false)` skips the message clone. Faster, but the downstream nodes then
share your object — only use it when nothing downstream mutates.

`node.done()` matters for flow-level accounting and for the debugger's queued-message
view. Omit it and a message looks like it is still in flight.

## On Start / On Stop

The **On Start** tab runs when the flow is deployed. It may return a Promise; messages
that arrive while it is still pending are **queued**, not dropped — so it is the right
place to open a connection or preload a table.

Tidy up in the **On Stop** tab, or with `node.on('close', ...)`. Something opened in On
Start and not closed survives a Modified Nodes deploy and leaks.

## Logging and errors

```javascript
node.log("info");  node.warn("something odd");  node.error("broken");
node.trace("...");  node.debug("...");
node.error("hit an error", msg);   // <- triggers a Catch node on the SAME tab
```

The second argument is the difference between a line in the log and a message a Catch
node can handle. A Catch node only sees errors from its own tab.

**Forgetting the second argument is the most common error-handling bug in this
product**, because it fails in the most confusing way available: the flow looks fine,
the log has your message, and the Catch branch you built never runs.
`validate_flow.py` flags a one-argument `node.error()`.

`throw new Error(...)` also reaches the Catch node. Prefer `node.error(text, msg)` —
it keeps the original `msg` intact, which is how a retry counter survives into the
Catch branch. After it, `return null` so the message stops on the happy path and only
the Catch branch continues.

## Status

```javascript
node.status({ fill: "green", shape: "dot", text: "connected" });
node.status({});   // clear
```

`fill`: red, green, yellow, blue, grey. `shape`: ring, dot.

## Context

Three scopes — `context` (this node), `flow` (this tab), `global` (the project).

```javascript
let n = context.get("count") || 0;
context.set("count", n + 1);

flow.set("token", value);
global.get("config");
```

Asynchronous (callback) form, and multi-get / multi-set:

```javascript
context.get("count", (err, count) => { ... });
flow.set(["a", "b"], [1, 2]);
const [a, b] = flow.get(["a", "b"]);
```

A store name may be given as the last argument when more than one context store is
configured.

**Context is not persistence.** It does not survive a full deploy or a restart unless
the store is configured to persist. Anything that must outlive a deploy belongs in a
database node or a file under `/internal-storage-files/`.

**Context is also not per-message.** Two triggers arriving close together share it, so
a retry counter in `flow.set("attempt", ...)` leaks one run's count into the next. Put
anything that belongs to *this* message on the message:

```javascript
msg.attempt = (msg.attempt || 0) + 1;   // survives the Catch node; not shared
```

`msg` is the right place because a Catch node preserves every field of the original
message and only adds `msg.error`.

## The sandbox: no `require`, no `process`, no `fs`

This is the single most expensive surprise in the node, and it is **not** the stock
Node-RED answer. In aXet.flows the Function node runs in a security sandbox with the
Node.js internals removed. Node-RED's two escape hatches — `functionGlobalContext` in
`settings.js` and `functionExternalModules: true` — need access to the runtime's
settings, and you do not have it: the container is built by the platform.

```javascript
process.env.HOME     // ReferenceError: process is not defined
require("os")        // ReferenceError: require is not defined
fs.readFileSync(...) // ReferenceError: fs is not defined
```

Nothing warns you at deploy time. The node goes red on the first message.

What you have instead, and it covers most of what people reach for:

| you wanted | use |
|---|---|
| `process.env.X` | `env.get("X")`, or `$(X)` in a node property |
| `fs.readFile` / `writeFile` | the **`file`** and **`file in`** nodes |
| `axios` / `fetch` | the **`http request`** node |
| `moment` | `new Date()` and `toLocaleString("tr-TR")` |
| `Buffer` | **`Buffer` is available** — it is the one Node.js global that survived |

`Buffer` surviving is what makes base64 work in both directions: decoding a form's
file upload, and encoding an attachment for MS Graph.

```javascript
// a base64 data URL from a form file field -> text
const komma = url.indexOf(",");
const text  = Buffer.from(url.slice(komma + 1), "base64").toString("utf8");
```

**Never use `atob()` for this.** It exists, it returns a string, and it silently
mangles every non-ASCII character — which in a Turkish document is most of them.

The rule that follows from all of it: **a Function node transforms data. It does not
reach the outside world.** Anything that touches a file, a socket or the clock's
environment is a different node's job.

## Timeout

The **Setup** tab has a per-node timeout in seconds. `0` = none. A Function node that
awaits an external call and never gets an answer will otherwise hold the message
forever.

## Environment values

`$(ENV_VAR)` inside a node *property*, `env.get("ENV_VAR")` inside Function code. Use
these instead of hard-coding an endpoint, a project id or a slug — the same flow then
imports into another environment without edits.

## Credentials: not on `msg`

The platform's own answer, verbatim in intent: *for security reasons it is not
possible* to pass user credentials through `msg`, because flow persistence is done
without encryption and they would be exposed. Use the auth configuration node and the
security context (`msg.__deptAppsSecurityContext*` / `msg.__axetFlowsSecurityContext*`
— read both spellings).
