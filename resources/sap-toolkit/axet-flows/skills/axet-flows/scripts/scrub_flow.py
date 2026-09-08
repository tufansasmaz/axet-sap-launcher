"""Strip tenant configuration out of a flow export before sharing it.

    py scrub_flow.py flow.json -o shareable.json [--report]

An aXet.flows export is a working configuration, not a diagram. It carries the live
project id, the tenant slug, database names, the OKTA configuration name and whatever
credentials, URLs or ids somebody typed into a Function node. The published NTT
cookbooks ship placeholders (`<your-project-id>`); anything you paste into a ticket, a
repo, a chat or a document should too.

Two passes:

  REPLACED - known tenant fields are rewritten to placeholders.
  FLAGGED  - anything that looks like a secret or an endpoint anywhere else in the
             file is reported and left alone. Function bodies are not rewritten
             automatically: a blind substitution there breaks working code.

Internal ids (node ids, `z`, `wires`, `securityConfig`, `redirectPage`, `oktaDb`) are
kept. They are references into this same file - replacing them would break the import
and they identify nothing outside it.

A `.deptapp` is scrubbed as a whole and written back as a `.deptapp`. Its envelope
carries things no node does - the owner's and the author's mail addresses, the
instance id - and it is the shape most likely to be mailed to somebody.
"""
import argparse
import json
import re
import sys

from common import read_raw, unwrap, write_json

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

# field name -> placeholder. Matched anywhere, at any depth, node or envelope.
TENANT_FIELDS = {
    "projectid": "<your-project-id>",
    "projectId": "<your-project-id>",
    "slug": "<your-slug>",
    "dbName": "<your-db-name>",
    "databaseName": "<your-db-name>",
    "basicInternalDb": "<your-db-name>",
    "configurationName": "<your-auth-config-name>",
    "defaultProject": "",
    "defaultModel": "",
    # a use-case node names the PERSON who declared the use case, by Okta id
    "userid": "<okta-user-id>",
    # an audit-config credential name is "AuthType=...;TenantId=<guid>;ClientId=<guid>"
    "credentialname": "<your-audit-credential>",
    # .deptapp envelope: real mail addresses and the tenant instance
    "ownerEmailUser": "<owner@example.com>",
    "creationEmailUser": "<author@example.com>",
    "instanceId": "<your-instance-id>",
}

# whole keys that are dropped rather than blanked
DROP_KEYS = ("credentials",)

SUSPECT = [
    (re.compile(r"https?://[^\s\"'<>]+", re.I), "url"),
    (re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b"), "ip address"),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "email"),
    (re.compile(r"(?i)\b(api[_-]?key|secret|password|passwd|token|bearer|client[_-]?secret)\b"),
     "credential keyword"),
    (re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I),
     "uuid (project/tenant id?)"),
    (re.compile(r"\b00u[A-Za-z0-9]{10,}\b"), "okta user id (identifies a person)"),
]

# URLs that are the product itself, not a tenant detail
SAFE_URL = re.compile(r"^https?://(www\.)?(nodered\.org|nodejs\.org)", re.I)


def scrub_value(where, key, value, replaced, flagged):
    if isinstance(value, dict):
        return {k: scrub_value(where, k, v, replaced, flagged)
                for k, v in value.items() if k not in DROP_KEYS}
    if isinstance(value, list):
        return [scrub_value(where, key, v, replaced, flagged) for v in value]

    if key in TENANT_FIELDS and isinstance(value, str) and value:
        new = TENANT_FIELDS[key]
        if new != value:
            replaced.append("%s: %s = %r -> %r" % (where, key, value, new))
            return new
        return value

    if isinstance(value, str) and value:
        for pattern, what in SUSPECT:
            for hit in pattern.findall(value):
                text = hit if isinstance(hit, str) else hit[0]
                if what == "url" and SAFE_URL.match(text):
                    continue
                flagged.append("%s: %s contains a %s: %s"
                               % (where, key, what, text[:120]))
    return value


def scrub_nodes(flow, replaced, flagged):
    out = []
    for node in flow:
        if not isinstance(node, dict):
            out.append(node)
            continue
        where = "%s (%s)" % (node.get("id", "?"), node.get("type", "?"))
        out.append({k: scrub_value(where, k, v, replaced, flagged)
                    for k, v in node.items() if k not in DROP_KEYS})
    return out


def scrub(data):
    """Scrub either accepted shape, and return the SAME shape.

    A .deptapp comes back a .deptapp. Emitting the bare node array instead
    would strip the version header and the module manifest, and the recipient's
    "Import version" would refuse the file.
    """
    replaced, flagged = [], []

    if isinstance(data, list):
        return scrub_nodes(data, replaced, flagged), replaced, flagged

    nodes = (data.get("flowsData") or {}).get("flows") or []
    shell = {k: v for k, v in data.items() if k != "flowsData"}
    out = scrub_value(".deptapp envelope", "", shell, replaced, flagged)

    # `credentials` is dropped inside nodes, but the envelope needs the key to
    # stay for the import to accept the file - so empty it rather than remove it.
    if "credentials" in data:
        if data["credentials"]:
            replaced.append(".deptapp envelope: credentials emptied (%d entr(y/ies))"
                            % len(data["credentials"]))
        out["credentials"] = []

    out["flowsData"] = dict(data.get("flowsData") or {})
    out["flowsData"]["flows"] = scrub_nodes(nodes, replaced, flagged)
    return out, replaced, flagged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("flow")
    ap.add_argument("-o", "--output")
    ap.add_argument("--report", action="store_true",
                    help="print the findings only, write nothing")
    args = ap.parse_args()

    data = read_raw(args.flow)
    flow, info = unwrap(data, args.flow)      # validates the shape, reports plainly
    is_deptapp = info is not None

    out, replaced, flagged = scrub(data)

    print("input: %s, %d node(s)"
          % (".deptapp (envelope scrubbed too)" if is_deptapp else "flow export",
             len(flow)))
    print("REPLACED (%d)" % len(replaced))
    for line in replaced:
        print("  " + line)
    seen = set()
    unique = [f for f in flagged if not (f in seen or seen.add(f))]
    print("FLAGGED - review by hand, NOT changed (%d)" % len(unique))
    for line in unique:
        print("  " + line)

    if args.report:
        return
    if not args.output:
        print("\nERROR: give -o <file> to write the scrubbed flow, or --report")
        sys.exit(2)
    write_json(out, args.output,
               "%s, %d nodes" % (".deptapp" if is_deptapp else "flow export",
                                 len(flow)))
    if unique:
        print("NOTE: %d flagged item(s) are still in the output. Read them before "
              "you share the file." % len(unique))


if __name__ == "__main__":
    main()
