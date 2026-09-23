# Proposal: split the mixed-mode ADT tools by side-effect class

**Status:** proposed, not implemented. It changes `sap-adt`'s engine, which is not
this skill's to change.
**Raised by:** the drift pin, on the `develop` merge — the first time it fired on
real drift rather than in a test.

---

## What happened

`develop` added two tools to `adt_mcp_server.py`. `sap-adt-readonly` refused to
start and named them:

```
[adt-ro] REFUSING to start: the engine registers tool(s) this read-only
entrypoint has never classified:
    adt_generate_adobe
    adt_message_class
```

That is the pin working. The interesting part is what came next: **neither tool
could be classified honestly.**

## The shape of the problem

This entrypoint classifies **tool names**. Each name goes in exactly one of
`ALLOW`, `GATED`, `DENY`, and the write names are removed from the FastMCP
registry before the transport starts. That works because, for 31 of the 33 tools,
a name has one side-effect class: `adt_get_source` reads, `adt_push` writes.

Three tools break it. One name, read *or* write depending on an argument:

| Tool | Argument | Reads | Writes |
|---|---|---|---|
| `adt_generate_screen` | `mode=` | `READ` | `WRITE`, `DELETE` |
| `adt_generate_adobe` | `mode=` | `READ`, `STATUS`, `GET_PARAMS`, `GET_LAYOUT`, `RTTI_DEBUG` | `WRITE`, `DELETE`, `SET_LAYOUT`, `SET_PARAMS`, `SYNC_CONTEXT` |
| `adt_message_class` | `action=` | `read` | `create`, `write` |

A name-level decision cannot express any of these.

## What was done instead, and what it costs

All three are in `DENY`. `adt_generate_screen` was already there, so this is the
existing precedent rather than a new stance.

**The cost is real and worth stating plainly:** `adt_generate_adobe(mode="READ")`
is the *only* way to see an SFPI/SFPF form, because ADT does not address those
object types at all. On a read-only surface, Adobe forms are now invisible. Read
them through the full `sap-adt` surface instead.

### Why not the alternatives

**Gate them** (`ADT_RO_ALLOW_ADOBE=true`, like `adt_sql`). No. The three existing
gates are all read-only with respect to system state — they are gated because
"read-only" reads as "harmless" and business data is not harmless. A gate that
opens a `DELETE` path is a different thing wearing the same clothes. An
entrypoint whose promise is *the write tools are not registered* cannot have an
env var that registers a write tool. That promise is the only reason to prefer
this skill over `ADT_READONLY=true`.

**Wrap them and reject write arguments at call time.** Tempting, and wrong on two
counts. The advertised MCP schema would still show `mode="DELETE"` as valid, so
the surface would claim a capability it intends to refuse — exactly the "the model
plans a push and only then learns it was refused" failure this skill exists to
avoid. And it puts an argument parser on the security boundary, where a new enum
value added upstream defaults to allowed, an alias or a case difference slips
past, and a later refactor bypasses the wrapper entirely. That is a policy engine,
and a guard that becomes a policy engine stops being auditable.

## The proposal

Split each mixed-mode tool by **side-effect class** — not one tool per operation,
which would be noise, but one tool per class:

```
adt_message_class      ->  adt_message_class_read     (action: read)
                           adt_message_class_modify   (action: create | write)

adt_generate_adobe     ->  adt_adobe_inspect          (READ, STATUS, GET_PARAMS,
                                                       GET_LAYOUT, RTTI_DEBUG)
                           adt_adobe_modify           (WRITE, DELETE, SET_LAYOUT,
                                                       SET_PARAMS, SYNC_CONTEXT)

adt_generate_screen    ->  adt_screen_read            (READ)
                           adt_screen_modify          (WRITE, DELETE)
```

The invariant, which is the whole point: **every registered tool name has exactly
one side-effect class.** Then `ALLOW`/`DENY` says what it means, the read side
comes back to the read-only surface, and no argument parsing happens on the
boundary.

Migration without breaking callers: the engine keeps the mixed-mode names for one
release, marked deprecated; `sap-adt-readonly` denies the old names and exposes
the new read ones. Remove the old names at the next major.

### Before implementing, verify the read modes actually read

`STATUS`, `GET_PARAMS` and `RTTI_DEBUG` are *named* like reads. They call backend
ABAP through a generator function module, and RTTI introspection in particular can
touch buffers and generate runtime objects. Classification has to follow what the
function module does, not what the mode is called — check the FM source and the
SAP authorization objects it triggers before putting any of them in `ALLOW`.

## Related

Sol raised the same design point in an earlier review — `@tool(effect=READ|WRITE|
EXECUTE|SENSITIVE_READ)` metadata on the engine plus a `create_server(profile=…)`
factory, replacing singleton pruning. That is the general version of this proposal
and would make the classification a property of the tool rather than a list
maintained next door. Also not implemented, for the same reason: it is the
engine's to change.
