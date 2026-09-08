"""Validate an aXet.flows / Node-RED flow export before importing it.

    py validate_flow.py flow.json

Exit 0 = importable, 1 = errors found. Warnings never fail the run.

ERROR is for what breaks on import or cannot run: duplicate ids, a missing or dangling
`z`, a wire pointing at a node that is not in the file, a malformed `wires` shape, an
inject node the designer will refuse to read back, and Function code that reaches for a
Node.js internal the sandbox has removed.

WARN is for what imports and deploys cleanly and is then silently wrong - a file
written to a path the container throws away, a switch that drops every unmatched
message, an http request returning a string to a rule that expects an object. These
cost more time than the errors do, because nothing in the designer reports them.

References between nodes are checked the same way `wires` are: a `securityConfig` on an
`http in`, the `oktaDb` on an app node, the `config` on a `use-case`, a `pageId` on the
menu. Each of those dangling is a live failure with a misleading message, and none of
them is a wire.
"""
import re
import sys

from common import read_raw, unwrap, label_of

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

# Node types that legitimately have no z (they are not on a tab).
NO_TAB_TYPES = {"tab", "subflow", "global-config", "group"}

# The designer reconstructs an inject node's Repeat setting from all four of these. Omit
# one and it falls back to "interval" with an empty period: the node goes invalid, never
# fires, and says nothing. Export always writes them, so a missing field means the JSON
# was hand-built or edited.
INJECT_TIMING_FIELDS = ("repeat", "crontab", "once", "onceDelay")

# Paths inside the flow container. Only the first two are mapped out to the host and
# survive the instance being deleted. /data reads like a persistent volume and is not.
PERSISTENT_PREFIXES = ("/internal-storage-files", "/external-repository-files")
EPHEMERAL_PREFIXES = ("/data", "/tmp", "/home", "/root", "/var")

# The Function node runs in a sandbox with the Node.js internals removed. These produce
# "ReferenceError: process is not defined" at runtime, not at deploy.
SANDBOX_FORBIDDEN = (
    (re.compile(r"\brequire\s*\("), "require() - the sandbox has no module loader"),
    (re.compile(r"\bprocess\s*\."), "process - not defined in the sandbox"),
    (re.compile(r"\bfs\s*\."), "fs - use the file / file in nodes instead"),
)

# node.error(text) writes a log line; only node.error(text, msg) reaches a catch node.
# Matched narrowly - one quoted literal or one bare identifier and nothing else - so
# that the correct two-argument call with a template literal is not flagged.
ONE_ARG_NODE_ERROR = re.compile(
    r"node\.error\s*\(\s*(?:"
    r"(['\"`])(?:\\.|(?!\1).)*\1"
    r"|[A-Za-z_$][\w$.]*"
    r")\s*\)")


def is_config_node(node):
    """Configuration nodes carry no canvas position and no wires.

    In aXet.flows these are the OKTA auth config, the http-in security config, the
    database configs and so on. They may be global (no z at all) or scoped to a tab,
    and the designer lists them in the sidebar rather than drawing them, so demanding
    a z or an x/y would flag every healthy export.
    """
    return "x" not in node and "y" not in node and "wires" not in node


# Escapes a TEMPLATE literal keeps the backslash for. Anything else after a
# backslash is an "identity escape": the backslash is dropped and the next character
# kept, silently. `\/` becomes `/`, `\.` becomes `.`, `\d` becomes `d`. A page with 23
# of them served every regex in it broken (2026-09-02, the chat console) and the export
# looked correct, because the damage happens when Node evaluates the literal.
TEMPLATE_ESCAPE_OK = set("`$\\nrtbfv0ux\n\r")
TEMPLATE_IDENTITY_ESCAPE = re.compile(r"\\(.)", re.S)


def mask_js(src):
    """Blank what is not code, so a rule is not tripped by prose or by page content.

    Returns (code, template_bodies).

    `code` is the source with comments removed and the CONTENTS of every string and
    template literal blanked - the quotes stay, so the shape of the code does not
    shift, and `${...}` interpolations are kept because they do run. A function node
    that serves a browser page holds that page in a literal; the page calls `atob()`,
    which is right in a browser and wrong in the sandbox, and scanning it as sandbox
    code reported a fault that did not exist. The tutorial flows document
    `node.error(text)` in a comment right above the correct two-argument call.

    `template_bodies` is the raw text of every template literal (outside `${...}`),
    for the identity-escape check - the one class of bug that lives INSIDE a literal.

    Regex literals are not recognised: a `/'/` would open a string here. That is the
    same blind spot the previous stripper had, and no real export has hit it.
    """
    out, bodies = [], []
    i, n = 0, len(src)
    while i < n:
        ch = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if ch == "/" and nxt == "/":                   # line comment
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        if ch == "/" and nxt == "*":                   # block comment
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            out.append(" ")
            continue
        if ch in "'\"":                                # plain string: keep the quotes
            out.append(ch)
            i += 1
            while i < n and src[i] != ch:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == "\n":                     # unterminated: stop at the line
                    break
                i += 1
            if i < n and src[i] == ch:
                out.append(ch)
                i += 1
            continue
        if ch == "`":                                  # template literal
            out.append("`")
            i += 1
            body = []
            while i < n and src[i] != "`":
                if src[i] == "\\":
                    body.append(src[i:i + 2])
                    i += 2
                    continue
                if src.startswith("${", i):
                    bodies.append("".join(body))
                    body = []
                    out.append("${")
                    depth, i = 1, i + 2
                    while i < n and depth:
                        if src[i] == "{":
                            depth += 1
                        elif src[i] == "}":
                            depth -= 1
                            if not depth:
                                break
                        out.append(src[i])
                        i += 1
                    out.append("}")
                    i += 1
                    continue
                body.append(src[i])
                i += 1
            bodies.append("".join(body))
            if i < n:
                out.append("`")
                i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out), bodies


def template_identity_escapes(bodies):
    """The backslashes a template literal will silently drop, as backslash+char pairs."""
    hits = []
    for body in bodies:
        for m in TEMPLATE_IDENTITY_ESCAPE.finditer(body):
            if m.group(1) not in TEMPLATE_ESCAPE_OK:
                hits.append(m.group(0))
    return hits


def _filename_of(node):
    """The literal path a file / file in node writes or reads, or None.

    `filenameType` other than `str` means the path arrives on msg and cannot be judged
    from the JSON.
    """
    if node.get("filenameType") not in (None, "str"):
        return None
    name = node.get("filename")
    return name if isinstance(name, str) and name.startswith("/") else None


def check_node_type(node, errors, warnings):
    """Per-type checks for the failures that do not announce themselves.

    Every rule here is one that a real flow hit: it imported, it deployed, the canvas
    showed nothing wrong, and the behaviour was still incorrect.
    """
    nid = node["id"]
    ntype = node.get("type", "")
    name = label_of(node)
    where = "%s (%s '%s')" % (nid, ntype, name)

    if ntype == "inject":
        missing = [f for f in INJECT_TIMING_FIELDS if f not in node]
        if missing:
            errors.append(
                "inject %s is missing %s - the designer will drop Repeat to an empty "
                "interval and the node will never fire. Emit all of %s."
                % (where, ", ".join(missing), ", ".join(INJECT_TIMING_FIELDS)))

    elif ntype == "function":
        raw = node.get("func", "")
        if not raw.strip():
            warnings.append("function node %s has an empty body" % where)
        body, literals = mask_js(raw)
        dropped = template_identity_escapes(literals)
        if dropped:
            sample = sorted(set(dropped))[:6]
            warnings.append(
                "function %s has a template literal with %d backslash escape(s) the "
                "literal will silently drop (%s) - a backslash-slash is served as a bare "
                "slash, so a regex "
                "or a path inside it breaks and the browser blames the next line. "
                "Hold text in a JSON string (json.dumps) instead of a backtick literal."
                % (where, len(dropped), ", ".join(sample)))
        for pattern, why in SANDBOX_FORBIDDEN:
            if pattern.search(body):
                errors.append("function %s uses %s" % (where, why))
        if re.search(r"\batob\s*\(", body):
            warnings.append(
                "function %s uses atob() - it mangles non-ASCII text. Decode base64 "
                "with Buffer.from(data, 'base64').toString('utf8')." % where)
        if ONE_ARG_NODE_ERROR.search(body):
            warnings.append(
                "function %s calls node.error() with one argument - that only writes a "
                "log line. A catch node needs node.error(text, msg)." % where)

    elif ntype == "switch":
        rules = node.get("rules") or []
        if rules and not any(r.get("t") == "else" for r in rules):
            warnings.append(
                "switch %s has no 'otherwise' rule - a message matching none of the %d "
                "rules is dropped with no error" % (where, len(rules)))

    elif ntype == "http request":
        if node.get("ret") not in (None, "obj"):
            warnings.append(
                "http request %s returns %r, not a parsed JSON object - msg.payload "
                "will be a string and any downstream rule on payload.<field> silently "
                "matches nothing" % (where, node.get("ret")))

    elif ntype in ("file", "file in"):
        path = _filename_of(node)
        verb = "reads from" if ntype == "file in" else "writes to"
        if path and not path.startswith(PERSISTENT_PREFIXES):
            if path.startswith(EPHEMERAL_PREFIXES):
                warnings.append(
                    "%s %s %s %s, which does not survive the container. Use "
                    "/internal-storage-files/ for anything that must outlive a redeploy."
                    % (ntype, where, verb, path))
            else:
                warnings.append(
                    "%s %s %s %s, which is not one of the host-mapped container paths "
                    "(%s)" % (ntype, where, verb, path, ", ".join(PERSISTENT_PREFIXES)))
        if (ntype == "file" and path and path.lower().endswith(".xlsx")
                and node.get("encoding") not in (None, "none")):
            errors.append(
                "file %s writes .xlsx with encoding=%r - the Excel buffer is converted "
                "to text and the workbook is corrupt. Encoding must be 'none'."
                % (where, node.get("encoding")))

    elif ntype == "axet-agents-execute":
        for field, what in (("projectId", "Project"), ("model", "Model")):
            if not node.get(field):
                warnings.append(
                    "AI agent %s has no %s - both are mandatory and an empty one only "
                    "fails at run time. Pick it with the mouse; keyboard selection "
                    "renders but does not persist." % (where, what))
        if len(node.get("wires") or []) < 2:
            warnings.append(
                "AI agent %s has no second output wired - that is the error output, and "
                "unwired it hides every model and gateway failure" % where)


def _menu_page_ids(menu):
    """Every pageId in an app node's menu tree, whatever depth it nests to.

    The designer writes `menu` as a LIST holding one `root` entry whose `children`
    are `section` and `page` entries; older hand-built flows wrote `{}`. Both are
    walked.
    """
    found = []
    stack = list(menu) if isinstance(menu, list) else ([menu] if isinstance(menu, dict) else [])
    while stack:
        item = stack.pop()
        if not isinstance(item, dict):
            continue
        if item.get("pageId"):
            found.append(item["pageId"])
        stack.extend(item.get("children") or [])
    return found


def check_references(flow, ids, targets, errors, warnings, is_version=False):
    """References that are not wires but fail exactly like a dangling wire does.

    Every one of these was met live. A `securityConfig` that resolves to nothing
    leaves the route unprotected or unregistered; `authConfig: "Okta"` beside an empty
    `oktaDb`, or an auth node without `dbEngineType`, answers every request with
    HTTP 500 "Credentials is not well configured on App node" before a node runs
    (2026-09-01); a `use-case` nobody wires into declares nothing to the auditor; a
    form page missing from the app menu does not exist to the user.
    """
    by_id = {n["id"]: n for n in flow if isinstance(n, dict) and n.get("id")}
    by_type = {}
    for n in by_id.values():
        by_type.setdefault(n.get("type"), []).append(n)

    def ref(node, field, expected_type, severity, why):
        target = node.get(field)
        where = "%s (%s '%s')" % (node["id"], node.get("type"), label_of(node))
        if not target:
            (errors if severity == "error" else warnings).append(
                "%s has an empty %s - %s" % (where, field, why))
            return None
        hit = by_id.get(target)
        if hit is None:
            (errors if severity == "error" else warnings).append(
                "%s has %s=%s, which is not in this file - %s"
                % (where, field, target, why))
            return None
        if expected_type and hit.get("type") != expected_type:
            (errors if severity == "error" else warnings).append(
                "%s has %s=%s, which is a %s, not a %s"
                % (where, field, target, hit.get("type"), expected_type))
            return None
        return hit

    for n in by_type.get("http in", []):
        ref(n, "securityConfig", "http-in-security-config", "error",
            "without a security config the route has no access rule at all")

    # The audit gate. The use-case node is mandatory (manual 6.5.2: "mandatory to
    # inform the use cases that solve your development project"), and its Use Case
    # field has to name a use case REGISTERED on the project - the ones chosen from
    # the Category / Use case dropdowns when the project was created. An empty field,
    # a placeholder, or an invented id all read as "not filled in" to the auditor;
    # feedback to that effect was received on 2026-09-03 for a node carrying a
    # plausible-looking made-up id. The registered set cannot be read from a flow
    # file, so only emptiness and placeholders can be caught here.
    use_cases = by_type.get("use-case", [])
    # "an action" is any canvas node that is not scaffolding: the app node, comments
    # and the error/status plumbing declare nothing and need no declaration.
    scaffolding = NO_TAB_TYPES | {"axetflows-app", "comment", "catch", "status", "debug"}
    has_action = any(not is_config_node(n) and n.get("type") not in scaffolding
                     for n in by_id.values())
    if not use_cases and has_action:
        msg = ("no use-case node - the audit palette's use-case node is mandatory, one "
               "per action, wired to the action it declares, with the Use Case field "
               "set to a use case registered on the development project")
        if is_version:
            errors.append(msg + ". This is a whole version, so the project has none.")
        else:
            warnings.append(msg + ". If this tab is the whole project, add one.")
    for n in use_cases:
        where = "%s (use-case '%s')" % (n["id"], label_of(n))
        ref(n, "config", "audit-config", "error",
            "the audit declaration needs its credential config")
        uc = n.get("usecaseid")
        if not isinstance(uc, str) or not uc.strip() or "<" in uc or "..." in uc:
            errors.append(
                "%s has no Use Case: usecaseid=%r. The field must name a use case "
                "REGISTERED on the development project (the dropdown in the node's "
                "editor lists them); an empty or placeholder value fails the audit."
                % (where, uc))
        if not (n.get("useCaseCategory") or "").strip():
            errors.append("%s has an empty useCaseCategory - it comes with the registered "
                          "use case" % where)
        if not isinstance(n.get("isAI"), bool):
            warnings.append(
                "%s has isAI=%r - a fresh node carries \"\" and the auditor reads that "
                "as 'not Generative AI'. Set true or false explicitly."
                % (where, n.get("isAI")))
        if n["id"] not in targets:
            warnings.append(
                "use-case %s ('%s') is not wired from any node - the auditor reads the "
                "wiring, and a use-case node parked on the canvas declares nothing. "
                "Wire it from the node that performs the action it describes."
                % (n["id"], label_of(n)))

    # House rule (2026-09-03): apps deploy to the cloud, and a cloud app authenticates
    # with Okta. The platform's floor (user manual 6.5.2, "Production Deployment"): no
    # app node -> standalone only; app node -> cloud possible; app node with OKTA ->
    # cloud and standalone. A desktop build may go without the app node, but that is
    # the user's call to make, so its absence is a warning that says "ask", and an app
    # node with any other login type is an error - it is a cloud-capable app that
    # does not authenticate.
    apps = by_type.get("axetflows-app", [])
    if not apps and any(not is_config_node(n) and n.get("type") not in NO_TAB_TYPES
                        for n in by_id.values()):
        warnings.append(
            "no axetflows-app node - this deploys STANDALONE ONLY and has no login. "
            "Cloud is the default target and needs the app node with Okta "
            "(new_flow.okta_app writes the pair). If a desktop build is really the "
            "target, ask the user before leaving it out; do not assume.")
    if len(apps) > 1:
        warnings.append(
            "%d axetflows-app nodes - a project has one app; two app nodes is not a "
            "bigger app. Reuse the existing one." % len(apps))
    for n in apps:
        where = "%s (axetflows-app '%s')" % (n["id"], label_of(n))
        if n.get("authConfig") != "Okta":
            errors.append(
                "%s has authConfig=%r - every aXet.flows app authenticates with Okta "
                "(house rule; the manual's cloud deployment path assumes it). authNone "
                "and Basic are not options; set authConfig to 'Okta' and point oktaDb "
                "at a deptapps-app-auth-okta node." % (where, n.get("authConfig")))
        if n.get("authConfig") == "Okta":
            auth = ref(n, "oktaDb", "deptapps-app-auth-okta", "error",
                       "authConfig is Okta, and every request will answer HTTP 500 "
                       "'Credentials is not well configured on App node' before any "
                       "node runs")
            if auth is not None and not auth.get("dbEngineType"):
                errors.append(
                    "%s points oktaDb at %s, an auth node with no dbEngineType - the "
                    "field is required and its absence is the second cause of HTTP 500 "
                    "'Credentials is not well configured on App node'. Set it to "
                    "'localStorage' or 'noSQL'." % (where, auth["id"]))
        page_ids = _menu_page_ids(n.get("menu"))
        for pid in page_ids:
            if pid not in by_id:
                errors.append("%s menu names pageId %s, which is not in this file"
                              % (where, pid))
        wp = n.get("welcomePage")
        if wp and wp not in by_id:
            errors.append("%s has welcomePage=%s, which is not in this file" % (where, wp))
        for form in by_type.get("axetflows-form", []):
            if form["id"] not in page_ids and form["id"] != wp:
                warnings.append(
                    "form page %s ('%s') is not on the app node's menu and is not the "
                    "welcome page - no user can reach it. Add a page entry with its id "
                    "as pageId." % (form["id"], label_of(form)))

    if by_type.get("enabler-llm") or by_type.get("axet-agents-execute"):
        declared = [u for u in by_type.get("use-case", []) if u.get("isAI")]
        if not declared:
            warnings.append(
                "the flow calls a model (%s) and no use-case node has isAI ticked - the "
                "Audit gate wants one Generative-AI use-case node per action, wired to it"
                % ", ".join(sorted(t for t in ("enabler-llm", "axet-agents-execute")
                                   if by_type.get(t))))
        tabs_with_llm = {n.get("z") for t in ("enabler-llm", "axet-agents-execute")
                         for n in by_type.get(t, [])}
        tabs_with_catch = {n.get("z") for n in by_type.get("catch", [])}
        for z in tabs_with_llm - tabs_with_catch:
            tab = by_id.get(z)
            warnings.append(
                "tab '%s' calls a model and has no catch node - a provider or gateway "
                "failure raises instead of answering, and the production runner has no "
                "debug sidebar to show it" % (label_of(tab) if tab else z))


def validate(flow, info=None):
    """Check a node array. `info` (a .deptapp envelope) is accepted and unused: the
    envelope gates nothing - the platform recomputes it on import (platform.md,
    "What an import does to a version")."""
    errors = []
    warnings = []

    if not isinstance(flow, list):
        return (["top level is %s, expected a JSON array of nodes"
                 % type(flow).__name__], [])

    ids = {}
    for i, node in enumerate(flow):
        if not isinstance(node, dict):
            errors.append("node #%d is %s, expected an object"
                          % (i, type(node).__name__))
            continue
        nid = node.get("id")
        if not nid:
            errors.append("node #%d has no id" % i)
            continue
        if nid in ids:
            errors.append("duplicate id %s (node #%d and #%d)" % (nid, ids[nid], i))
        ids[nid] = i
        if not node.get("type"):
            errors.append("node %s has no type" % nid)

    tab_ids = {n.get("id") for n in flow
               if isinstance(n, dict) and n.get("type") in ("tab", "subflow")}

    for node in flow:
        if not isinstance(node, dict) or not node.get("id"):
            continue
        nid = node["id"]
        ntype = node.get("type", "")
        name = label_of(node)

        config = is_config_node(node)
        if ntype not in NO_TAB_TYPES and not ntype.startswith("subflow:") and not config:
            z = node.get("z")
            if not z:
                errors.append("node %s (%s '%s') has no z - it belongs to no tab"
                              % (nid, ntype, name))
            elif z not in tab_ids:
                errors.append("node %s (%s '%s') has z=%s, which is not a tab in this "
                              "file" % (nid, ntype, name, z))
            if "x" not in node or "y" not in node:
                warnings.append("node %s (%s) has no x/y - it will land at 0,0"
                                % (nid, ntype))

        wires = node.get("wires")
        if wires is None:
            continue
        if not isinstance(wires, list):
            errors.append("node %s has wires that are not an array" % nid)
            continue
        for out_i, out in enumerate(wires):
            if not isinstance(out, list):
                errors.append("node %s output %d is not an array" % (nid, out_i))
                continue
            for target in out:
                if target not in ids:
                    errors.append("node %s output %d wires to %s, which is not in "
                                  "this file" % (nid, out_i, target))

        if config and node.get("z") and node["z"] not in tab_ids:
            errors.append("config node %s (%s) is scoped to z=%s, which is not a tab "
                          "in this file" % (nid, ntype, node["z"]))

        check_node_type(node, errors, warnings)

    targets = set()
    for node in flow:
        if isinstance(node, dict):
            for out in node.get("wires") or []:
                if isinstance(out, list):
                    targets.update(out)
    check_references([n for n in flow if isinstance(n, dict) and n.get("id")],
                     ids, targets, errors, warnings, is_version=info is not None)

    return errors, warnings


def main():
    if len(sys.argv) != 2:
        print("usage: py validate_flow.py <flow.json>")
        sys.exit(2)
    path = sys.argv[1]
    flow, info = unwrap(read_raw(path), path)
    errors, warnings = validate(flow, info)

    for w in warnings:
        print("WARN  %s" % w)
    for e in errors:
        print("ERROR %s" % e)

    n = len(flow) if isinstance(flow, list) else 0
    if errors:
        print("\nFAIL  %s: %d node(s), %d error(s), %d warning(s)"
              % (path, n, len(errors), len(warnings)))
        sys.exit(1)
    print("\nPASS  %s: %d node(s), %d warning(s)" % (path, n, len(warnings)))


if __name__ == "__main__":
    main()
