# Classification — four shapes of non-incident work

Classification is not paperwork. Each shape has a different sizing driver, a different set of
things that go wrong, and a different commercial treatment. Getting it wrong at intake is
expensive in a way that no later care recovers.

---

## First, the split that decides who pays

| | Incident | Change request |
|---|---|---|
| Test | behaviour **existed** and stopped | behaviour **never existed** |
| Proof | `adt_revisions` / transport history shows it working before | nothing shows it ever worked |
| Contract | support scope | billable, or a separate budget |

The honest hard case: *"it worked in the old system."* That is a **CR**. Migration gaps are
not defects of the new system, and calling them incidents is how a migration budget quietly
becomes a support contract.

The other hard case: **a bug in something we built last month, still in warranty.** Route it
through `sap-incident`, but say in the report that it originated from CR-nnnn. That link is
what makes estimate calibration honest rather than flattering.

---

## Shape A — addition to an existing Z object

You own the code, so the risk is not writing it, it is everything already calling it.

- **Sizing driver:** the caller list from `adt_where_used`, not the lines you will write.
- **Goes wrong when:** a background job calls the same method and nobody tested that path;
  a second customer's variant flows through the same class.
- **Always check:** does the object have unit tests (`adt_unit_test`)? If not, part of this
  CR's effort is the test you will need in order to change it safely — put it in the estimate
  as its own line, visible, or it gets cut and then skipped.

## Shape B — changing standard SAP behaviour

- **Sizing driver:** which extension point exists. `adt_badi_discovery` tells you not only
  which BAdIs exist but which implementation is **active in this client** — the single most
  common way a Shape B estimate goes wrong is discovering, mid-build, that an existing
  implementation already occupies the point.
- **Order of preference:** released API → BAdI → CDS/behaviour extension → classic
  enhancement → implicit enhancement → modification. Take the first one that fits, and record
  in the ledger which ones you rejected and why.
- **Goes wrong when:** the enhancement fires in the wrong place, so the effort lands in
  finding the right hook, not in the logic. Budget the search, not just the code.
- **Never** size a modification without pricing the recurring upgrade cost in the document.

## Shape C — greenfield

A new object, report, interface or app.

- **Sizing driver:** the technology decision, then the data model. Both belong in the document.
- **Goes wrong when:** the estimate covers the happy path only. Authorisation, selection
  screen behaviour, mass data volume, error handling, the transport, and *somebody being
  trained to use it* are all part of the delivery.
- **Ask early:** does this need to run in background at volume? A report designed for 200 rows
  and run against 2 million is a rewrite, not a tuning exercise.

## Shape D — the "small request"

One field on a form. One extra column. A text change. Twenty minutes, genuinely.

This shape does not fail on effort, it fails on **process**. It arrives by chat, gets done
between two other tasks, and is never written down. Ten a month for eighteen months is a
system nobody can explain.

Minimum that still applies at this size:

- a ticket number and a case, even if the case has three ledger rows;
- a transport — never a "quick change" outside one;
- one line in the document saying what changed and why;
- a number, even if the number is 0.25 days.

If the customer's process makes that overhead absurd, batch them: one CR per month collecting
the small requests, one document, one transport, one signature. What is not acceptable is the
undocumented path, because that is the one that produces an untraceable production system.

---

## Recording it

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" set --case cr/CR-2291 \
  --classification "B — BAdI, credit check at order save" --decision build
```

The classification string goes on page 1 of the document. A customer who can see that their
"small request" is a Shape B change to standard SAP behaviour argues about the estimate far
less than one who is handed a number.
