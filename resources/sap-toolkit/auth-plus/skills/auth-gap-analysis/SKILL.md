---
name: auth-gap-analysis
description: >
  Use after auth-discovery, when the source landscape must be compared against the
  target S/4HANA system: which transactions still exist, which are obsolete, which have
  a named successor, which authorization objects are missing, which role names already
  collide, and what the customer therefore has to decide. Reads TSTC/TSTCT/TOBJ/TOBJT/
  AGR_DEFINE on the TARGET over ADT, optionally takes an SAP Simplification List as
  input, and produces gap.json plus a WP3 decision workbook with per-role confidence
  and evidence. Stage 2 of AUTH+ (work package WP3).
  Triggers: "gap analysis", "role mapping", "obsolete transactions", "successors",
  "simplification list", "what breaks in S/4", "WP3", "can we lift and shift this role",
  "which roles are ready".
  READ-ONLY on the target system. No transport, no objects, no writes.
allowed-tools: Bash(py:*), Bash(python:*), Read, Grep, Glob, Write
---

# auth-gap-analysis — what survives the move, and what the customer must decide

Stage 2 of three. It takes the discovery extract, reads four facts from the **target**
system, and sorts every transaction and authorization object into a disposition with a
sentence of evidence attached.

It decides nothing. A role that comes out `ready` is one where **no human judgement was
required** — not one that has been approved. Everything it cannot settle goes into the
decision list, which is the actual deliverable slide 7 asks for.

Read-only on both systems. It reads the source extract from disk and issues `SELECT`
statements against the target.

## 1. Two sources of truth, and they answer different questions

This is the distinction the whole stage rests on:

- **The target system answers *existence*.** `TSTC` says whether a transaction code is
  installed. `TOBJ` says whether an authorization object exists. `AGR_DEFINE` says
  whether a role name is already taken.
- **The Simplification List answers *obsolescence and successors*.** SAP publishes it
  through the Simplification Item Catalog and Note attachments — there is no table to
  read it from, so it is a **file you supply**.

A transaction missing from `TSTC` tells you it is gone. It does not tell you what to use
instead. Without the Simplification List the tool will not invent one — it reports the
transaction as `missing` and raises "supply the Simplification List" as decision
priority 1. That is the single largest source of false blockers, and the summary sheet
says so in plain words.

## 2. Run it

```bash
PYTHONPATH="${CLAUDE_PLUGIN_ROOT}/scripts" PYTHONIOENCODING=utf-8 \
  py -X utf8 scripts/authplus_cli.py gap \
    --target-conn .conn_adt_s4 \
    --simplification simplification-list.csv \
    --out out
```

`--out` is the directory the discovery stage wrote; `gap` reads `out/raw/` and
`out/inventory.json` from it and writes `out/gap.json` and
`out/wp3_gap_analysis.xlsx` beside them.

`--target-conn` is a **second** `.conn_adt` pointing at the target. If it resolves to the
same system and client as the source, the run prints a warning and continues — that
exercises the code path, it is not a migration gap analysis, and any number it produces
must be labelled as such.

`--simplification` accepts CSV, JSON or Excel with liberal column naming: the
transaction column may be `tcode` / `transaction` / `transaction_code` / `object`, and
there may be `status` / `category`, `successor` / `replacement` / `target`, and
`note` / `simplification_item`. See `examples/simplification-list.sample.csv` for the
shape. A row naming a successor is treated as a replacement whatever its status column
says; the two disagree often enough in hand-maintained lists to matter.

## 3. What the dispositions mean

| disposition | meaning | confidence credit |
|---|---|---|
| `ok` | exists in the target, nothing flagged | 100% |
| `replaced` | a successor is named | 80% — someone still has to confirm equivalence |
| `restricted` | flagged as limited in S/4HANA | 60% |
| `custom` | Z/Y — outside Lift & Shift scope (slide 4) | not scored |
| `missing` | absent from the target, no Simplification entry | 0% |
| `obsolete` | gone, and nothing named to replace it | 0% |

**Confidence** is the share of a role's transactions *and* authorization objects that
need no decision. Custom entries are excluded from the denominator — they are assessed
separately, not scored against the role. A role with nothing scoreable has **no**
confidence, reported as null, not as zero.

**Status** is separate from confidence. `blocked` means something in the role cannot be
built at all; `review` means a human has to look; `ready` means the analysis needed no
judgement. A role can score 99.9% confidence and still be `blocked` by one missing
object — that is correct, because a single missing object stops the role generating.

## 4. Three things that produce false findings

1. **Non-transaction role-menu entries.** `AGR_TCODES.TYPE = 'OT'` rows are Web Dynpro
   applications, URLs and reports, not transaction codes. They are not in `TSTC` and
   never will be. They are excluded from the comparison and raised as their own decision
   item. Comparing them against `TSTC` reports every one as a missing transaction — on
   one sandbox run that was 100 false blockers out of 100.
2. **"Missing" in a sandbox usually means "not activated in this client"**, not "removed
   from the product". The decision list asks that question rather than answering it.
3. **Role name collisions are counted, not judged.** Every collision means the name is
   taken in the target; building over it destroys whatever it currently grants. On a
   same-system run every single role collides, which is expected and meaningless.

## 5. Read the workbook in order

`out/wp3_gap_analysis.xlsx`:

- **Summary** — provenance, whether a Simplification List was supplied and what follows
  if it was not, role status counts, mean confidence.
- **Decisions** — start here. One row per thing a human must decide, ranked by how much
  it blocks, each with the count affected, examples and why it matters.
- **Roles** — per-role status, confidence and the reason for it.
- **Transactions / Objects** — every entry with its disposition and the evidence
  sentence behind it.

Every row carries evidence because a recommendation a consultant cannot defend in a
customer meeting is worse than no recommendation.

## 6. Hand off

`out/gap.json` carries `"schema": "authplus/gap/1"`. Walk the Decisions sheet with the
customer, get the answers recorded, and only then run
[`auth-build`](../auth-build/SKILL.md) — which packages the approved roles and, by
design, still writes nothing to SAP.
