# The bundled scope-item reference — what it is, how to refresh it, how to override it

`references/bp/` holds the SAP Best Practice scope-item catalogue
that this skill matches described content against. **It ships with the kit.**
A consultant does not download anything, does not put anything anywhere, and
does not need to read this file to use the skill.

```
references/bp/
  _meta.json          which export, its sha256, row count, date
  finance.tsv         8499 rows
  sales.tsv           1515
  sourcing.tsv        1219
  manufacturing.tsv    969
  supply-chain.tsv     741
  ... eight more, one per LOB
```

## Why the names are short

The synced OneDrive root for the project department measures 151 characters and
Windows still refuses 260, which leaves 109 for everything under it. The first
version of this bundle used the LOB names verbatim, and
`best-practices/Application-Platform-and-Infrastructure.tsv` came to 111 — it
broke a live publish. The publisher empties the folder before it copies, so the
shared library sat without its `catalog.json`, `setup.md` or manual until it was
republished. `sync_best_practices.py` now refuses to write a name that would not
fit.

## Why it is split by LOB

Because the workflow narrows by LOB before it searches. An MM blueprint reads a
232 KB file instead of three megabytes. The split is not a filing preference — it
is the search, pre-done.

It must not turn a wrong mapping into an empty result, so when the module does
not land cleanly on one LOB the skill greps the **directory**. Slower, still
correct.

## What is not in it

Two of the eleven exported columns are dropped: `Fiori Semantic Object` and
`Fiori Semantic Action`. Those build Fiori deep links; a BBP process flow does
not use them. Everything else is kept, including the leading spaces in
`Solution Activity (Hierarchy)` — four per level — which are the process tree.

## Where it came from, and why that is written down at all

This is **SAP's** material (Best Practices Explorer / Fiori Apps Library), not
NTT's. Bundling third-party content is against this repo's default (see
`CLAUDE.md`, `sap-ecosystem`) and was a deliberate maintainer decision, taken
because the alternative — every consultant fetching their own export — left the
work with the person the kit exists to help.

The decision does not make the content current, so `_meta.json` records the
source file, its sha256, the row count and the date it was taken. The original
loose TSV carried none of that: you could not ask "is this current?", because
nothing said what it was current *as of*. Now you can.

**The licence question belongs to whoever owns the SAP partner relationship, not
to this file.** What this file guarantees is that the question is answerable.

## Refreshing it

Maintainer side, not consultant side:

```bash
py scripts/sync_best_practices.py --source "<export>.tsv"   # or .csv / .xlsx
py scripts/sync_best_practices.py --check                    # shape + age, writes nothing
```

Regeneration is deterministic — the same export twice produces byte-identical
files, so a refresh that changes nothing does not produce a phantom diff or a new
catalog stamp.

**Refresh on the release cycle, not on every SAP content update.**
`catalog_version` follows content, so each refresh rewrites every installed skill
on every consultant machine. The gap between releases is covered by the date in
`_meta.json`, which the skill reports once per document.

## Overriding it for one project

Drop an export in the project folder — conventionally `Best Practices/` — as
`.tsv`, `.csv` or `.xlsx`. The skill prefers it over the bundle and says which
one it used. Reach for this when the customer is on a release the bundle predates,
or when they have their own curated scope-item list.

Column names as SAP exports them; only the first five matter:

| column | used for |
|---|---|
| `LOB` | narrowing by module |
| `Business Area` | narrowing inside an LOB |
| `Scope Item ID` | the ID quoted next to every best practice referenced |
| `Description` | keyword matching against the topic |
| `Solution Activity (Hierarchy)` | the process-flow steps, in order, depth in leading spaces |
| `Fiori App or Transaction Title` / `ID` | the app or tcode per step; also what the Clean Core check prefers |
| `Business Role Description` / `ID` | the role a step belongs to, when a chapter needs it |

A different spelling is fine — say so and it will be mapped.
