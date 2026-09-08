"""Create importable aXet.flows JSON with correct ids and wiring.

    py new_flow.py --tab "My Flow" -o flow.json                 # tab + Okta app node
    py new_flow.py --tab "My Flow" --template llm-gateway -o flow.json

Hand-writing this JSON is where flows break: node ids are 16 hex characters, every
node needs a `z` pointing at the tab, and every id in `wires` must exist. This builds
those, then validates the result before writing it.

`--template llm-gateway` emits the Okta-protected LLM endpoint skeleton
(http in -> build messages -> enabler-llm -> extract answer -> http response) with
placeholder tenant values you fill in from your own project.

`--template llm-gateway-audited` emits the same endpoint in the shape that actually
passes the deployment gates: it adds the tab-wide `catch` with a structured 502 and the
`use-case` + `audit-config` pair the Audit gate requires. It needs `--use-case <id>`
and `--use-case-category <cat>`: the use case REGISTERED on the development project.
The audit checks that the registered use cases are the ones the flows inform, so an
invented id reads as an unfilled Use Case field and fails (feedback, 2026-09-03) -
which is why there is no placeholder for it. Transcribed from a deployment that is
live, with every tenant value replaced by a placeholder.

EVERY template - `empty` included - carries an `axetflows-app` node with Okta login and
the `deptapps-app-auth-okta` config node it points at. That is the NTT house rule
(2026-09-03): apps deploy to the cloud, and a cloud app authenticates with Okta. The
platform's own rule underneath it (user manual 6.5.2, "Production Deployment") is that
a flow with no app node deploys standalone only, one with an app node can go to the
cloud, and one whose app node uses OKTA deploys both ways. A DESKTOP build may skip the
pair - `--standalone` - but only once the user has been asked and has said so; never
assume it. `validate_flow.py` refuses an app node with any other login type and warns
when there is no app node at all.

`--console` adds a chat page for that endpoint: a PUBLIC `GET chat` route serving
`assets/chat-ui/index.html` from a function node. Public is deliberate and is not a
hole - a browser cannot put an Authorization header on a navigation, so a protected GET
would answer the navigation with a credentials error instead of a page. What is public
is one static file containing no secret; every call the page makes goes to the
protected API route above, and a visitor without a session gets a page that can call
nothing. It has to be same-origin because the Okta token lives in the app's
localStorage and nothing else can read it. Verified 2026-09-02: the deployed route
answers 200 with the page, and the page loads with a clean console when served from
disk. A conversation through the DEPLOYED page is not yet proven - 1.0.8, the first
version whose page parses, has not run yet.
"""
import argparse
import io
import json
import os
import sys

from common import generate_id, write_flow, read_flow
from validate_flow import validate

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def tab(label, entity=None):
    node = {"id": generate_id(), "type": "tab", "label": label,
            "disabled": False, "info": "", "env": []}
    if entity:
        node["__deptAppsAssociatedEntity"] = entity
    return node


def function(z, name, code, x, y, outputs=1):
    return {"id": generate_id(), "type": "function", "z": z, "name": name,
            "func": code, "outputs": outputs, "timeout": 0, "noerr": 0,
            "initialize": "", "finalize": "", "libs": [],
            "x": x, "y": y, "wires": [[] for _ in range(outputs)]}


def comment(z, name, info, x, y):
    return {"id": generate_id(), "type": "comment", "z": z, "name": name,
            "info": info, "x": x, "y": y, "wires": []}


def wire(src, dst, output=0):
    """Append dst to output `output` of src. Both are node dicts."""
    while len(src["wires"]) <= output:
        src["wires"].append([])
    src["wires"][output].append(dst["id"])


BUILD_MESSAGES = r"""// enabler-llm reads msg.messages - a TOP-LEVEL msg property, not msg.payload.
// Writing the list to msg.payload deploys cleanly and sends the model nothing.
// msg.payload is left as the caller's body.
const MAX_CHARS = 8000;          // ~2k tokens. Raise deliberately, never remove.
const body = msg.payload || {};

// Correlation id first, so even a 400 can be traced.
msg.correlationId =
    (msg.req && msg.req.headers && msg.req.headers["x-correlation-id"]) ||
    (msg.req && msg.req.headers && msg.req.headers["x-request-id"]) ||
    (Date.now() + "-" + Math.random().toString(16).slice(2));

function reject(code, message) {
    msg.statusCode = (code === "too_large") ? 413 : 400;
    msg.payload = {
        error: { code: code, message: message, traceId: msg.correlationId }
    };
    return [null, msg];
}

// A non-object body would otherwise be stringified whole and sent to the model.
if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return reject("bad_request", "body must be a JSON object");
}

// Official contract is { "message": ..., "context": {...} }. Falling back to
// the whole body keeps callers that post free-form JSON working.
const query = body.message || body.prompt || body.question ||
    (Object.keys(body).length ? JSON.stringify(body) : "");

if (!query) {
    return reject("bad_request", "message is required");
}
if (typeof query !== "string") {
    return reject("bad_request", "message must be a string");
}

const turn = body.context
    ? query + "\n\nContext: " + JSON.stringify(body.context)
    : query;

// Unbounded input is unbounded cost, and the caller is not always ours.
// Refuse loudly here rather than discovering it on the invoice.
if (turn.length > MAX_CHARS) {
    return reject("too_large",
        "input is " + turn.length + " characters; the limit is " + MAX_CHARS);
}

// enabler-llm reads these off msg, and msg.model outranks the model set on the
// node itself. Without max_tokens the node's own default of 50 truncates every
// answer mid-sentence - see references/node_catalog.md.
if (typeof body.model === "string" && body.model.trim()) {
    msg.model = body.model.trim();
}
const cap = Number(body.max_tokens);
msg.max_tokens = (cap > 0 && cap <= 8000) ? Math.round(cap) : 2000;

const temp = Number(body.temperature);
if (body.temperature !== undefined && temp >= 0 && temp <= 2) {
    msg.temperature = temp;
}

msg.askedAt = Date.now();
msg.messages = [
    {
        role: "system",
        content: body.system || "You are a helpful assistant for enterprise applications."
    }
];

// Prior turns, oldest first, trimmed so a long session cannot grow the prompt
// without limit. MAX_CHARS above only measures the current turn.
if (Array.isArray(body.history)) {
    body.history.slice(-12).forEach(function (h) {
        if (h && typeof h.content === "string" &&
            (h.role === "user" || h.role === "assistant")) {
            msg.messages.push({ role: h.role, content: h.content });
        }
    });
}

msg.messages.push({ role: "user", content: turn });
return [msg, null];
"""

EXTRACT_ANSWER = r"""// Keep the response contract stable: the caller must not depend on the
// provider's own envelope, which changes between models.
const choice = msg.payload && msg.payload.choices && msg.payload.choices[0];
msg.payload = {
    answer: choice && choice.message ? choice.message.content : "",
    model: msg.payload && msg.payload.model,
    traceId: msg.correlationId
};
return msg;
"""


# These four hold JAVASCRIPT, and they are raw strings on purpose. In a normal
# triple-quoted literal Python would turn the JS escape "\n" into a real line
# break, producing a Function node that fails to parse the first time a message
# reaches it - a deploy-clean, run-time-fatal failure. Caught on 2026-09-01 by
# running the generated code under node; asserted here so it cannot return.
assert "\\n\\nContext: " in BUILD_MESSAGES, (
    "the JS newline escape was interpreted by Python - keep these constants raw")


def okta_app(z, label, x=180, y=460):
    """The app node and its Okta auth config - the pair every aXet.flows app carries.

    House rule (2026-09-03): every app authenticates with Okta. The platform's floor
    under that rule is in the user manual (6.5.2, "Production Deployment"): no app node
    -> standalone only; app node -> cloud possible; app node with OKTA -> cloud AND
    standalone. So this pair is in every template, `empty` included.

    The auth node holds no secret - its registration declares no credentials block and
    the export's credentials array stays empty - so it can be written here rather than
    asked of the designer's wizard. dbEngineType is REQUIRED: an app node pointing at
    an auth node without it answers every request with HTTP 500 "Credentials is not
    well configured on App node" (1.0.2, 2026-09-01). databaseName is the platform's
    autogenerated user store; there is nothing to create. A config node: no z, no
    position, no wires.
    """
    auth = {"id": generate_id(), "type": "deptapps-app-auth-okta",
            "configurationName": "OKTA Authentication",
            "dbEngineType": "localStorage",
            "databaseName": "deptapp-user-login-okta",
            "userField": "userId", "roleField": "roles",
            "autoConfigured": True, "defaults": False,
            "defaultProject": "", "defaultModel": ""}

    app = {"id": generate_id(), "type": "axetflows-app", "z": z,
           "name": label,
           # The designer writes menu as a LIST holding one root entry; pages go
           # into root.children as {"id","text","icon","data","children","type":
           # "page","pageId"}. An empty {} imports but is not what the designer
           # writes, and the menu editor reads root.children.
           "menu": [{"text": "Menu", "type": "root",
                     "state": {"opened": True, "selected": True}, "children": []}],
           "welcomePage": None,
           "sidebarMenuOrientation": "left", "logoImage": "default",
           "schemeColor": "", "customCSS": "", "customCSSErrors": 0,
           "authConfig": "Okta", "sessionExpireTimeInMinutes": None,
           "basicInternalDb": "", "oktaDb": auth["id"], "roles": "",
           "__wellKnownRes": {}, "x": x, "y": y, "wires": []}
    return [auth, app]


def empty(label, entity=None):
    """A tab with nothing on it but the app node every aXet.flows app must have."""
    t = tab(label, entity)
    return [t] + okta_app(t["id"], label, y=200)


def llm_gateway(label):
    t = tab(label)
    z = t["id"]

    sec = {"id": generate_id(), "type": "http-in-security-config", "name": "Okta",
           "public": False, "roles": ["ROLE_ADMIN", "ROLE_USER"]}

    # Name every node. An unnamed node shows as a raw uuid in inspect_flow.py and
    # as its bare type on the canvas, and the deployed flows that are pleasant to
    # read are the ones whose author named things.
    http_in = {"id": generate_id(), "type": "http in", "z": z,
               "name": "POST api/llm-enabler/v2",
               "url": "api/llm-enabler/v2", "method": "post", "upload": False,
               "skipBodyParsing": False, "swaggerDoc": "",
               "securityConfig": sec["id"], "x": 180, "y": 200, "wires": [[]]}

    build = function(z, "build messages", BUILD_MESSAGES, 400, 200, outputs=2)

    llm = {"id": generate_id(), "type": "enabler-llm", "z": z, "name": "Model",
           "model": "gpt-4.1", "slug": "<your-slug>",
           "projectid": "<your-project-id>", "x": 640, "y": 180, "wires": [[]]}

    extract = function(z, "extract answer", EXTRACT_ANSWER, 860, 180)

    resp = {"id": generate_id(), "type": "http response", "z": z, "name": "respond",
            "statusCode": "", "headers": {}, "x": 1080, "y": 200, "wires": []}

    note = comment(z, "Read me first",
                   "Okta-protected LLM endpoint.\n\n"
                   "1. Fill in slug and projectid on the enabler-llm node from your "
                   "own project - do not copy them from someone else's export.\n"
                   "2. public=false on the security config is the point. Do not "
                   "publish this as an open endpoint.\n"
                   "3. The cloud URL exists only after PUBLICATION, not after deploy,\n"
                   "   and it is keyed by the deptapp ID, not by this app's name:\n"
                   "   POST https://<portal>/flows/cloud/<deptapp-id>/api/llm-enabler/v2\n"
                   "   Read it off the deployment panel; do not compose it.\n"
                   "4. Add the mandatory use case node (audit palette) before you "
                   "request an audit.\n"
                   "5. The app node and its Okta auth node are here and wired to each\n"
                   "   other. Every aXet.flows app authenticates with Okta - house rule.\n"
                   "   Nothing confidential lives on the auth node; dbEngineType is\n"
                   "   required, and without it every request dies with HTTP 500\n"
                   "   'Credentials is not well configured on App node'.", 180, 100)

    wire(http_in, build)
    wire(build, llm, 0)
    wire(build, resp, 1)          # validation failure short-circuits to the response
    wire(llm, extract)
    wire(extract, resp)

    return [t, note, sec, http_in, build, llm, extract, resp] + okta_app(z, label)


EXTRACT_ANSWER_AUDITED = r"""// Keep the response contract stable, and fail LOUDLY.
// node.error needs TWO arguments to reach a Catch node - with one, it only
// writes a log line and the Catch branch never runs.
const choice = msg.payload && msg.payload.choices && msg.payload.choices[0];
const answer = choice && choice.message ? choice.message.content : "";
if (!answer) {
    node.error("llm returned no content", msg);
    return null;
}
msg.payload = {
    answer: answer,
    model: msg.payload && msg.payload.model,
    traceId: msg.correlationId,
    latencyMs: Date.now() - (msg.askedAt || Date.now())
};
return msg;
"""

ERROR_RESPONSE = r"""// The only trace in production is what you write here: there is no
// debug sidebar on the runner.
node.warn("llm gateway failed: " + (msg.error && msg.error.message));
msg.statusCode = 502;
msg.payload = {
    error: {
        code: "llm_gateway_failed",
        message: (msg.error && msg.error.message) || "upstream failure",
        traceId: msg.correlationId || msg._msgid
    }
};
return msg;
"""


def llm_gateway_audited(label, usecase_id, usecase_category):
    """The gateway in the shape that actually passes the deployment gates.

    `usecase_id` and `usecase_category` are the use case REGISTERED on the development
    project - chosen from the Category and Use case dropdowns when the project was
    created (user manual 6.5.2, "Add Flow"), and offered again as a dropdown in the
    use-case node's editor. The audit checks that the registered use cases are the
    ones the flows inform (manual, "Audit Status"), so an invented id - however
    plausible it looks - reads as an unfilled field to the auditor and fails the
    audit. Feedback received on exactly that, 2026-09-03. There is no placeholder
    here on purpose: the caller has to bring the real values.
    """
    if not usecase_id or not usecase_category:
        raise ValueError("the audited template needs the registered use case id and "
                         "its category - read them off the project (Catalog -> the "
                         "project's Category / Use case) or off an export whose "
                         "use-case node was filled in the designer")
    flow = llm_gateway(label)
    t, note, sec, http_in, build, llm, extract, resp = flow[:8]
    auth_and_app = flow[8:]
    z = t["id"]

    # fail loudly, so the tab-wide catch can answer with a 502.
    # `build messages` needs no patching here: it already stamps msg.askedAt,
    # which is what the latency figure below is measured against.
    extract["func"] = EXTRACT_ANSWER_AUDITED

    catch = {"id": generate_id(), "type": "catch", "z": z,
             "name": "any failure on this tab", "scope": None, "uncaught": False,
             "x": 400, "y": 380, "wires": [[]]}
    err = function(z, "error response", ERROR_RESPONSE, 660, 380)

    # The Audit gate: one use-case node PER ACTION, wired to the action it
    # declares. This flow performs one action - a Generative AI call - so it
    # declares one, with isAI ticked. Add a second node if you add a second action.
    audit_cfg = {"id": generate_id(), "type": "audit-config",
                 "name": "Audit Credentials",
                 "credentialname": "<your-audit-credential>"}
    use_case = {"id": generate_id(), "type": "use-case", "z": z,
                "name": "Audit LLM Call", "config": audit_cfg["id"],
                "userid": "<okta-user-id>", "projectid": "<your-project-id>",
                "useCaseCategory": usecase_category, "usecaseid": usecase_id,
                "isAI": True, "x": 1080, "y": 280, "wires": [[]]}

    wire(catch, err)
    wire(err, resp)
    wire(extract, use_case)       # declared where the action happens

    note["info"] = note["info"].replace(
        "4. Add the mandatory use case node (audit palette) before you "
        "request an audit.",
        "4. The use-case node is already here, with isAI ticked and the Use Case\n"
        "   field set to the id you passed - it MUST be one of the use cases\n"
        "   registered on the development project, or the audit reads it as\n"
        "   unfilled. Fill userid (the Okta id of whoever declares it), and add\n"
        "   ONE MORE node per additional action - the audit wants one per action.")
    note["info"] += ("\n6. Run Sonar and fix every Hotspot. 0 Hotspots or no deployment.")

    return flow[:8] + [catch, err, audit_cfg, use_case] + auth_and_app


CONSOLE_NOTE = """GET /chat serves a chat page for the API above.

The route is PUBLIC on purpose: a browser cannot send an Authorization
header on a navigation, so a protected GET would answer with a credentials
error instead of a page.

Nothing secret is served. The page reads the Okta token this app already put
in localStorage and calls the PROTECTED api route with it; without a session
it can call nothing.

The page finds its own API: its own path minus a trailing /chat, plus
/api/llm-enabler/v2. Rename the API route and edit that one line in the page.

The page is emitted by a FUNCTION node, the shape verified to load in a browser.
A template node with syntax "plain" should serve it as well: the 1.0.4 failure
that was blamed on the template node was misread - see platform.md, "What an
import does to a version"."""


def console(z, y=340):
    """Public GET route -> function node -> HTML response.

    A function node, because it is the shape verified to load in a browser. The
    obvious alternative - a `template` node with syntax "plain" - was blamed for
    1.0.4's `Cannot GET /chat` and abandoned; the platform's own re-exports later
    showed the import does not drop node types (a version sent with a type missing
    from usedNodes came back with the node present and the row added), so that
    blame was misplaced (2026-09-03). Either should work; this one is proven.

    The HTML is embedded as a **JSON string literal**, not a template literal.
    A template literal reads better in the designer and was the first shape this
    took, but it silently ate every backslash in the page: `\\/` in a regex became
    `/`, so `.replace(/\\/(ui|chat)\\/?$/, "")` was served as `.replace(//(ui|chat)/?$/`
    - a line comment - and the browser reported `Unexpected token 'var'` on the
    NEXT line. 23 backslashes, one broken page, and the export looked correct
    because the damage happens when Node evaluates the literal, not when the JSON
    is written. json.dumps escapes backslash, quote and newline the same way JS
    reads them, so no character in the page needs thinking about again.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "..", "assets", "chat-ui", "index.html")
    html = io.open(path, encoding="utf-8").read()

    sec = {"id": generate_id(), "type": "http-in-security-config",
           "name": "Public (page only)", "public": True, "roles": []}

    http_in = {"id": generate_id(), "type": "http in", "z": z,
               "name": "GET chat (console)", "url": "chat", "method": "get",
               "upload": False, "skipBodyParsing": False, "swaggerDoc": "",
               "securityConfig": sec["id"], "x": 180, "y": y, "wires": [[]]}

    page = {"id": generate_id(), "type": "function", "z": z,
            "name": "chat console (html)",
            "func": ("// The chat console, served as one static page.\n"
                     "//\n"
                     "// Source of truth for this HTML:\n"
                     "//   assets/chat-ui/index.html in the axet-flows skill.\n"
                     "// Edit it there and regenerate; do not hand-edit the copy below.\n"
                     "//\n"
                     "// A JSON string, not a template literal: a literal eats the\n"
                     "// page's backslashes and breaks every regex in it.\n"
                     'msg.headers = { "content-type": "text/html; charset=utf-8" };\n'
                     "msg.payload = " + json.dumps(html) + ";\n"
                     "return msg;\n"),
            "outputs": 1, "timeout": 0, "noerr": 0,
            "initialize": "", "finalize": "", "libs": [],
            "x": 440, "y": y, "wires": [[]]}

    resp = {"id": generate_id(), "type": "http response", "z": z,
            "name": "respond html", "statusCode": "200", "headers": {},
            "x": 700, "y": y, "wires": []}

    note = comment(z, "The console", CONSOLE_NOTE, 180, y - 60)

    wire(http_in, page)
    wire(page, resp)
    return [note, sec, http_in, page, resp]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tab", required=True, help="tab label")
    ap.add_argument("--entity", help="set __deptAppsAssociatedEntity on the tab")
    ap.add_argument("--template",
                    choices=["empty", "llm-gateway", "llm-gateway-audited"],
                    default="empty")
    ap.add_argument("--console", action="store_true",
                    help="add a public GET chat route serving the chat console page "
                         "(llm-gateway templates only)")
    ap.add_argument("--use-case", default="",
                    help="the use case id REGISTERED on the development project "
                         "(llm-gateway-audited). Read it off the project or off an "
                         "export whose use-case node was filled in the designer; an "
                         "invented id fails the audit.")
    ap.add_argument("--use-case-category", default="",
                    help="the registered use case's category (llm-gateway-audited)")
    ap.add_argument("--standalone", action="store_true",
                    help="omit the Okta app node: a DESKTOP (standalone) build only, and "
                         "only after the user has confirmed that is the target. Cloud "
                         "is the default and always gets Okta.")
    ap.add_argument("-o", "--output", required=True)
    args = ap.parse_args()

    if args.template == "llm-gateway":
        flow = llm_gateway(args.tab)
    elif args.template == "llm-gateway-audited":
        if not args.use_case or not args.use_case_category:
            print("ERROR --template llm-gateway-audited needs --use-case <id> and "
                  "--use-case-category <category>: the registered use case of the "
                  "development project. The audit rejects a use-case node whose Use "
                  "Case field is empty or names a use case the project does not have, "
                  "so there is no placeholder to fall back on. Read the values off the "
                  "project (Catalog) or off an export whose node was filled in the "
                  "designer.")
            sys.exit(1)
        flow = llm_gateway_audited(args.tab, args.use_case, args.use_case_category)
    else:
        flow = empty(args.tab, args.entity)

    if args.standalone:
        # The user has said desktop. Drop the pair; the validator will still warn
        # that the flow is standalone-only, which is the point of the warning.
        flow = [n for n in flow
                if n["type"] not in ("axetflows-app", "deptapps-app-auth-okta")]

    if args.console:
        if args.template == "empty":
            print("ERROR --console needs an llm-gateway template to talk to")
            sys.exit(1)
        flow = flow + console(flow[0]["id"])

    errors, warnings = validate(flow)
    for w in warnings:
        print("WARN  %s" % w)
    if errors:
        for e in errors:
            print("ERROR %s" % e)
        print("refusing to write a flow that will not import")
        sys.exit(1)

    write_flow(flow, args.output)
    print("import it: designer -> flow tab menu -> Import -> select file -> "
          "Import to: new flow")


if __name__ == "__main__":
    main()
