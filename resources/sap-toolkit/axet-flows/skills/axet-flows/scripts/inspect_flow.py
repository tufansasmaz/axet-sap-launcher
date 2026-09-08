"""Describe an aXet.flows export without opening the designer.

    py inspect_flow.py flow.json [--tab <id-or-label>] [--json]

Reads both shapes: a tab export (a JSON array of nodes) and a `.deptapp` (the
whole project version, an object). For a `.deptapp` it also prints the version
header and the module manifest - which module and version each node type came
from, and whether any of them is flagged as AI.

Prints, per tab: the node types it contains, the entrypoints (nodes nothing wires
into), the terminals (nodes that wire nowhere), and the chain from each entrypoint.
Configuration nodes are listed separately because they have no position on any canvas.

Use this before editing. A 29-node export is unreadable as raw JSON, and the thing you
usually need - "where does a request enter and what happens to it" - is exactly what
the JSON hides.
"""
import argparse
import json
from collections import Counter, defaultdict

from common import read_raw, unwrap, deptapp_summary, used_modules, label_of

import sys

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

CONFIGLESS = ("tab", "subflow", "global-config", "group")


def is_config(node):
    return "x" not in node and "y" not in node and "wires" not in node


def describe(flow):
    by_id = {n["id"]: n for n in flow if isinstance(n, dict) and n.get("id")}
    tabs = [n for n in flow if n.get("type") == "tab"]
    configs = [n for n in flow if is_config(n) and n.get("type") not in CONFIGLESS]
    globals_ = [n for n in flow if n.get("type") == "global-config"]

    targets = set()
    for n in flow:
        for out in n.get("wires", []) or []:
            targets.update(out)

    per_tab = defaultdict(list)
    for n in flow:
        if n.get("type") in CONFIGLESS or is_config(n):
            continue
        per_tab[n.get("z")].append(n)

    return by_id, tabs, configs, globals_, targets, per_tab


def chain(node, by_id, targets, depth=0, seen=None):
    seen = seen or set()
    if node["id"] in seen or depth > 40:
        return ["%s  ... (cycle or too deep)" % ("  " * depth)]
    seen.add(node["id"])
    line = "%s-> %s [%s]" % ("  " * depth, label_of(node), node.get("type"))
    lines = [line]
    outs = node.get("wires", []) or []
    for i, out in enumerate(outs):
        for tid in out:
            nxt = by_id.get(tid)
            if not nxt:
                lines.append("%s  -> MISSING %s" % ("  " * depth, tid))
                continue
            prefix = "" if len(outs) == 1 else " (out %d)" % i
            sub = chain(nxt, by_id, targets, depth + 1, set(seen))
            if prefix:
                sub[0] = sub[0] + prefix
            lines.extend(sub)
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("flow")
    ap.add_argument("--tab", help="only this tab, by id or label")
    ap.add_argument("--json", action="store_true", help="machine-readable summary")
    args = ap.parse_args()

    raw = read_raw(args.flow)
    flow, info = unwrap(raw, args.flow)
    by_id, tabs, configs, globals_, targets, per_tab = describe(flow)

    if args.json:
        out = {
            "nodes": len(flow),
            "tabs": [{"id": t["id"], "label": t.get("label"),
                      "entity": t.get("__deptAppsAssociatedEntity"),
                      "nodes": len(per_tab.get(t["id"], []))} for t in tabs],
            "types": Counter(n.get("type") for n in flow),
            "configs": [{"id": c["id"], "type": c["type"], "name": label_of(c)}
                        for c in configs],
        }
        if info:
            out["deptapp"] = deptapp_summary(info)
            out["modules"] = [{"type": t, "module": m, "version": v,
                               "hasAI": ai, "privateRegistry": priv}
                              for t, m, v, ai, priv in used_modules(info)]
        print(json.dumps(out, indent=2))
        return

    summary = deptapp_summary(info)
    if summary:
        print(summary)
    print("%s: %d nodes, %d tab(s)" % (args.flow, len(flow), len(tabs)))
    print("types: " + ", ".join("%s x%d" % (t, c) for t, c in
                                Counter(n.get("type") for n in flow).most_common()))

    if configs:
        print("\nconfiguration nodes (no canvas position, referenced by id):")
        for c in configs:
            extra = ""
            if c.get("type") == "http-in-security-config":
                extra = "  public=%s roles=%s" % (c.get("public"), c.get("roles"))
            print("  %s  %-28s %s%s" % (c["id"], c.get("type"), label_of(c), extra))

    apps = [n for n in flow if n.get("type") == "axetflows-app"]
    if apps:
        print("\napp node(s) - the deployment target and login this version can have:")
        for a in apps:
            auth = a.get("authConfig")
            target = by_id.get(a.get("oktaDb") or "")
            okta = ("-> %s" % label_of(target) if target
                    else ("EMPTY" if not a.get("oktaDb") else "UNRESOLVED %s" % a.get("oktaDb")))
            pages = []
            stack = list(a.get("menu") or []) if isinstance(a.get("menu"), list) else []
            while stack:
                item = stack.pop()
                if isinstance(item, dict):
                    if item.get("pageId"):
                        pages.append(item["pageId"])
                    stack.extend(item.get("children") or [])
            print("  %s  '%s'  auth=%s  oktaDb=%s  menu pages=%d  welcomePage=%s"
                  % (a["id"], label_of(a), auth, okta if auth == "Okta" else "n/a",
                     len(pages), a.get("welcomePage") or "-"))
            if auth != "Okta":
                print("  !! not Okta: house rule is every app authenticates with Okta")
    else:
        print("\nno app node: STANDALONE ONLY, no login. Cloud needs an axetflows-app "
              "node with Okta - ask before assuming a desktop build.")

    for g in globals_:
        mods = g.get("modules") or {}
        if mods:
            print("\nglobal modules: " + ", ".join("%s@%s" % kv for kv in mods.items()))

    manifest = used_modules(info)
    if manifest:
        print("\nmodule manifest (from the .deptapp - what the auditor sees):")
        for type_name, module, version, has_ai, private in manifest:
            flags = "".join([" AI" if has_ai else "",
                             " private-registry" if private else ""])
            print("  %-26s %s@%s%s" % (type_name, module, version, flags))
        if all(row[3] is None for row in manifest):
            print("  note: hasAI is null for every module here. It is not a"
                  " declaration - the use-case node's isAI is.")

    use_cases = [n for n in flow if n.get("type") == "use-case"]
    if use_cases:
        print("\naudit declaration (%d use-case node(s) - the audit gate):"
              % len(use_cases))
        for n in use_cases:
            wired = n["id"] in targets or any(o for o in (n.get("wires") or []))
            uc = n.get("usecaseid") or ""
            print("  %-26s usecase=%s category=%s AI=%s wired=%s"
                  % (label_of(n), uc or "EMPTY",
                     n.get("useCaseCategory") or "EMPTY",
                     "yes" if n.get("isAI") else "NO",
                     "yes" if wired else "NO"))
            if not uc or "<" in uc:
                print("  !! Use Case field not filled - the audit rejects this node")
        print("  the Use Case must be one REGISTERED on the development project "
              "(Catalog -> the project's Category / Use case); an invented id reads "
              "as unfilled to the auditor.")
    else:
        print("\nno use-case node: the audit palette's use-case node is MANDATORY - "
              "one per action, wired to it, Use Case field set.")

    for tab in tabs:
        if args.tab and args.tab not in (tab["id"], tab.get("label")):
            continue
        nodes = per_tab.get(tab["id"], [])
        entity = tab.get("__deptAppsAssociatedEntity")
        print("\n=== tab '%s' (%s)%s - %d nodes"
              % (tab.get("label"), tab["id"],
                 "  entity=%s" % entity if entity else "", len(nodes)))
        entry = [n for n in nodes if n["id"] not in targets]
        if not entry:
            print("  (no entrypoint - every node is wired into)")
        for n in entry:
            for line in chain(n, by_id, targets):
                print("  " + line)

    orphan = [z for z in per_tab if z not in {t["id"] for t in tabs}]
    if orphan:
        print("\nWARN nodes reference tab id(s) not in this file: %s"
              % ", ".join(str(z) for z in orphan))


if __name__ == "__main__":
    main()
