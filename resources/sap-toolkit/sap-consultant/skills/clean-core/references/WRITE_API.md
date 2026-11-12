# Writing to standard SAP data — which API, in which order

For a create / update / delete / action on a **standard business object** (sales order,
delivery, billing document, business partner, material …). Not for Z tables (managed RAP
owns those) and not for reading (reading prefers a released CDS view — the rest of this
skill). Which of the steps below a project may use is its Clean Core profile
([`PROFILES.md`](PROFILES.md)); this file only says the order and what each step must
prove before it is chosen.

**Never, on any profile:** `INSERT / UPDATE / MODIFY / DELETE` on a standard table, a
managed Z BO writing a standard table, an internal FM that skips the BAPI above it, or a
standard update module called `IN UPDATE TASK` directly.

## Step 0 — where does the code run? (decides who commits)

| Context | Who commits |
|---|---|
| RAP behavior handler / action of your own BO | **The framework.** No `COMMIT ENTITIES`, `COMMIT WORK`, `BAPI_TRANSACTION_COMMIT` or implicit commit (`WAIT UP TO`) — `BEHAVIOR_ILLEGAL_STATEMENT`. A BAPI that commits goes into a separate LUW (a Z RFC-enabled wrapper). |
| Classic report, dynpro, job (a RAP *consumer*) | **You.** `COMMIT ENTITIES` after EML, `BAPI_TRANSACTION_COMMIT` after a BAPI, then read back. |
| SEGW `DPC_EXT` | The DPC, around the BAPI. |

The same method carries a different commit rule in each context; an example copied from
another context is usually wrong exactly here.

## Step 1 — a released RAP BO (`I_*TP`) → EML (level A)

The first candidate, but "it exists" needs four checks on the **system**, not from memory:

1. The BDEF is there (`adt_search` `I_<OBJECT>*TP`, `adt_get_source`), and released —
   the authority is ATC *Usage of APIs* on the compiled consumer, not the name.
2. The operation is open: `use create` / `use update` / `use association … { create; }`.
   Necessary, not sufficient — "operation … is not activated for entity" appears only at
   activation or run time, so the first real call is part of the check.
3. The fields you need are writable: no `field ( readonly )` / `( suppress )` in the BDEF,
   no `readonly` in the projection.
4. Known gaps: texts created `BY \_Text` in a handler can succeed in the buffer and never
   persist (`SAVE_TEXT` needs `savemode_direct = 'X'`); late numbering does not return the
   number synchronously (`COMMIT ENTITIES BEGIN … END` + `CONVERT KEY`); standard partners
   are determined automatically — adding them by hand dumps.

An empty `FAILED`, `sy-subrc = 0` or HTTP 200 is not persistence: read the document back.
Surface every message in `REPORTED`.

## Step 2 — a released classic API: BAPI / FM (level B)

When step 1 fails any check. Classified by ATC *Usage of APIs* again. Customer (key-user)
fields go through `CL_CFD_BAPI_MAPPING` — a raw structure image is ignored silently. Every
E/A/X line of `RETURN` is surfaced. In X-flag structures flag only what changes.

## Step 3 — a released OData API (`API_*_SRV`)

Only when neither a usable RAP BO nor a released BAPI exists, or the call is remote. On the
same system call it through the internal gateway proxy, not an SM59 destination. In
`$metadata` an operation is open unless `sap:creatable="false"` / `sap:updatable="false"`
(the default is true; do not search for `="true"`). The ADT tools cannot read `$metadata`:
ask the consultant to open it and paste the `EntitySet`.

## Step 4 — an official but unreleased BAPI / FM (level C)

Write the reason into the TS. An FM called *under* a BAPI doing the same job is internal,
not an API — use the BAPI (`adt_where_used`). An update module is not an official FM. A
non-RFC FM that must run in its own LUW needs a Z RFC-enabled wrapper (`DESTINATION 'NONE'`
on it fails with `CALL_FUNCTION_NOT_REMOTE`). `releaseState="external"` in SE37 is not
"released".

## Step 5 — BDC · Step 6 — the user does it by hand

BDC is screen-bound, slow and hard to error-handle: last resort. At step 6 invent no way
around the business logic; say so and ask for the manual step.

## What goes into the TS

Every development that writes standard data carries an **API choice** table: method · on
the system? · released? · commit (step 0) · error handling · decision. The rejected
alternatives and why are part of the choice — without them the next developer redoes the
research.

---
Adapted from Ozgur Yilmaz's axet-template (MIT, `skills-sap/sap-dev/references/
write-api-selection.md`). Its live evidence is one sales order on one S/4 private DEV
(`I_SalesOrderTP` and the BAPI both worked); other objects were not measured there or
here, so the order says *confirm EML first*, not *EML is mandatory*.
