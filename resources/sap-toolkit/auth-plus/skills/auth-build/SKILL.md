---
name: auth-build
description: >
  Use after the gap analysis decisions have been agreed with the customer, to turn the
  approved roles into a build package for the target S/4HANA sandbox — one JSON per
  role with successors already substituted, an ordered worklist with a manual-check
  column, and written build instructions. Records who approved it. Stage 3 of AUTH+.
  Triggers: "build the roles", "create the roles in S/4", "build package",
  "role worklist", "approved roles", "rebuild these roles in the target",
  "PFCG build list".
  IMPORTANT: this stage writes FILES ONLY. PFCG roles are not ADT objects, so no tool
  here can create a role in an SAP system. It prepares a human build; it does not
  perform one.
allowed-tools: Bash(py:*), Bash(python:*), Read, Grep, Glob, Write
---

# auth-build — the approved worklist, and the boundary

Stage 3 of three. It converts an **approved** gap analysis into everything the security
team needs to build the roles, and stops there.

## 1. What this stage cannot do, and why that is deliberate

**PFCG roles (object type `ACGR`) are not ADT objects.** There is no ADT endpoint that
creates one. No tool in this plugin can build a role in the target system, and none
pretends to.

That boundary is also the right one. Slide 7 of the AUTH+ concept calls this output
*consultant-validated* and puts the build in a sandbox first. A tool that silently
created production-relevant roles from an unapproved analysis would be exactly the wrong
thing to build. The approval belongs to a person, and `--approved-by` records who.

If you need the roles created programmatically, the options are PFCG by hand,
`PRGN_*` / eCATT automation, or a customer-owned RFC wrapper — all outside this plugin,
and all of them a decision for the customer's security team, not for an agent.

## 2. Run it

```bash
PYTHONPATH="${CLAUDE_PLUGIN_ROOT}/scripts" PYTHONIOENCODING=utf-8 \
  py -X utf8 scripts/authplus_cli.py package \
    --out out \
    --include-status ready \
    --approved-by "Name of whoever signed off the decision list"
```

| flag | effect |
|---|---|
| `--include-status ready` | default. Only roles the gap analysis needed no judgement on. |
| `--include-status ready,review` | also package roles needing review — each one's `manual_check` column says what. |
| `--approved-by NAME` | recorded in `build/_meta.json` and in the instructions. Omit it and the package reads `NOT RECORDED` and the run warns. |

`blocked` is never eligible. Asking for it fails with a message naming what is eligible —
by definition something in a blocked role cannot be built.

## 3. What comes out

```
out/build/
  roles/<ROLE>.json    one target role definition
  worklist.csv         build order, with a manual_check column
  _meta.json           provenance: which extract, which gap analysis, which approval
  HOW-TO-BUILD.md      instructions for the person doing the build
```

Each role JSON carries the transaction list **with successors already substituted**, the
authorization field values, the organisational levels, the role-menu entries that are not
transactions, and explicit records of `substituted_transactions`, `dropped_transactions`
and `omitted_objects`.

Those last three are the important ones. Every entry in them is a real reduction in what
the role grants compared to the source, and somebody has to accept each one.

## 4. Before anyone builds anything

Work `worklist.csv` top to bottom and read the `manual_check` column. Four checks matter:

1. **`name_collision = True`** — the role name is already taken in the target. Building
   over it destroys whatever it currently grants. Agree the naming convention first.
2. **Every substitution.** A successor transaction frequently needs *different*
   authorization objects; the values carried here are the source system's.
3. **`dropped_transactions` and `omitted_objects` per role.** These are the reductions.
4. **`menu_entries_not_transactions`.** Web Dynpro applications, URLs and reports were
   never compared against the target — they are carried verbatim and need their own check.

Then: build in the **sandbox**, generate the profile, and have a key user test the role
before it goes anywhere near S/4HANA DEV.

## 5. Reporting it

Say plainly what happened: *"N role definitions were packaged from the approved analysis.
Nothing was written to any SAP system."* Do not describe this stage as having created,
migrated or deployed roles. It produced files.
