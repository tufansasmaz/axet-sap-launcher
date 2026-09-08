"""Shared helpers for aXet.flows flow JSON.

Output is ASCII only: the Windows console this runs on is cp1252.
"""
import json
import random
import sys


def generate_id() -> str:
    """A node id in aXet.flows / Node-RED shape: 16 lowercase hex characters.

    Not a hyphen-less uuid4, which is 32 and is what this used to emit. Every
    export the designer itself writes is 16 - checked across all of them, 106
    ids, no exception. The runtime treats an id as an opaque string, so 32 also
    imports; it just marks the flow as machine-written at a glance, which is not
    a distinction worth carrying.
    """
    return "%016x" % random.getrandbits(64)


def read_raw(path):
    """Load the file as-is: a node array OR a .deptapp envelope. Never a traceback."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        print("ERROR: no such file: %s" % path)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print("ERROR: %s is not valid JSON: %s" % (path, exc))
        sys.exit(1)


def read_flow(path):
    """Load a flow export. Exits 1 with a readable message instead of a traceback.

    Accepts both shapes a consultant is handed:

      * a flow EXPORT  - the bare JSON array of nodes, from the tab menu;
      * a .deptapp     - a whole project version, which is an OBJECT wrapping
                         the node array at flowsData.flows.

    The .deptapp is the handover format, so it is the one most likely to
    arrive by mail - and the array-only reader met it with a traceback.
    """
    flow, _ = unwrap(read_raw(path), path)
    return flow


def unwrap(data, path="<input>"):
    """Return (node_list, deptapp_info_or_None) for either accepted shape."""
    if isinstance(data, list):
        return data, None

    if isinstance(data, dict):
        nodes = data.get("flowsData", {}).get("flows")
        if isinstance(nodes, list):
            return nodes, data.get("info") or {}
        # A single node object is a common copy/paste slip; say so precisely.
        if "type" in data and "id" in data:
            print("ERROR: %s is ONE node object, not a flow. Export the tab, "
                  "or wrap it in a JSON array." % path)
            sys.exit(1)
        print("ERROR: %s is a JSON object but carries no flowsData.flows. "
              "Expected a flow export (array) or a .deptapp." % path)
        sys.exit(1)

    print("ERROR: %s is neither a flow export (array) nor a .deptapp (object)."
          % path)
    sys.exit(1)


def deptapp_summary(info):
    """One ASCII line describing a .deptapp envelope, or None."""
    if not info:
        return None
    app = info.get("deptAppInfo") or {}
    ver = info.get("deptAppVersionInfo") or {}
    return ".deptapp  project=%s  version=%s  saved=%s  used_types=%d" % (
        app.get("name", "?"),
        ver.get("alias", "?"),
        (ver.get("creationDate") or "?")[:10],
        len(ver.get("usedNodes") or []),
    )


def used_modules(info):
    """The .deptapp bill of materials: one row per node type actually used.

    Returns [(type_name, module, version, has_ai, private_registry), ...] sorted
    by module then type. This is the manifest an auditor reads: it names every
    contrib module the version depends on.

    `has_ai` is tri-state and is `None` far more often than not - on 6.5.2 it is
    null for every entry, `enabler-llm` included. Do not read it as "no AI here":
    the AI declaration is the `use-case` node's `isAI`, not this field.
    """
    if not info:
        return []
    rows = []
    for entry in (info.get("deptAppVersionInfo") or {}).get("usedNodes") or []:
        mod = entry.get("moduleVersion") or {}
        rows.append((
            entry.get("typeName", "?"),
            mod.get("moduleName", "?"),
            mod.get("versionAlias", "?"),
            mod.get("hasAI"),
            bool(mod.get("wasInstalledViaPrivateNpmRegistry")),
        ))
    return sorted(rows, key=lambda r: (r[1], r[0]))


def write_flow(flow, path):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(flow, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote %s (%d nodes)" % (path, len(flow)))


def write_json(data, path, note=""):
    """Write any accepted shape back, keeping it importable as what it was.

    A .deptapp that comes out as a bare array is no longer a version - the
    recipient's "Import version" refuses it - so the envelope has to survive
    a round trip through the scrubber.
    """
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote %s%s" % (path, ("  (%s)" % note) if note else ""))


def tabs(flow):
    return [n for n in flow if n.get("type") == "tab"]


def label_of(node):
    """A human label for reporting: name, or label for a tab, else the id.

    Auth config nodes (`deptapps-app-auth-*`) carry neither - their label lives in
    `configurationName`, and without it they report as a bare id, which is exactly
    the node you most want named when an App node refuses to authenticate.
    """
    return (node.get("name") or node.get("label")
            or node.get("configurationName") or node.get("id", "?"))
