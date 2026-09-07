# RAP — what "correct" means

The rules a RAP object is reviewed against: layering, behaviour definition, the standard-
object surface, service publication, and verification. Naming is **not** here — the
authority is
[`NAMING_STANDARD.md`](../../ts-generator/references/NAMING_STANDARD.md), §4.1 and §4.2.

> Do not carry a second naming table. The one this document was adapted from had gone
> stale: it still taught `_I_` as the RAP root and `ZCL_SD001_ORDER` as the behaviour
> class, both of which the corporate guideline v2.0 replaced on 2026-08-15 (`_R_` root,
> BDEF name = root view name, `ZCL_{M}{N}_BP_{D}`). One authority, one file.

---

## 1 · RAP or classic

| Scenario | Track |
|---|---|
| New Z transactional document (Z table, wraps no standard document) | **RAP managed** |
| Create/update *on* a standard document (VBAK, LIKP…) | **RAP unmanaged** over a released BAPI/EML — writing to the standard table directly is forbidden |
| Read-only list / worklist / value help, large data, pushdown | **read-only query CDS**, exposed without behaviour |
| Read-only list whose data does not fit CDS (FM call, recursion, external service — e.g. multi-level BOM explosion) | **custom entity + `IF_RAP_QUERY_PROVIDER`**. No BDEF, no DCL; an own exception class is mandatory (SAP's concrete ones cannot be raised) |
| Classic dialog/report, or an existing SEGW service | **classic** — leave it; no forced migration |

The reason for the choice is written down, with the Clean Core level. Levels and released
successors: the **`clean-core`** skill, not this file.

---

## 2 · Layering (mandatory)

```
Service Binding  (UI/API, _O2/_O4)      ← publish
  └ Service Definition (UI/API)          ← expose list
      ├ Projection view   _C_            ← consumption layer  (+ behaviour projection)
      └ Root view entity  _R_            ← interface layer, composition of child
          ├ Behavior Definition (same name as the root view)
          └ Z table(s)  _T_              ← persistence, Z only
```

The projection never reads a table; it reads the root view. The root view reads only Z
tables. A transactional BO persists **only** into Z tables.

`_I_` is a reusable VDM interface layer opened for others to consume — it is not the RAP
root. A classic program's includes share the `_I_` letter (`Z<MOD><NNN>_I_<PRG>_TOP`);
they are told apart by object type and by the role suffix. Never give the same root name
to both.

---

## 3 · Behavior definition

| Topic | Rule |
|---|---|
| Implementation type | Z table and wraps nothing standard → **managed**. Wraps a standard document → **unmanaged** over a released BAPI/EML. Direct EML onto a standard table is forbidden. |
| Draft | Off by default. If drafts are needed the decision is explicit and the draft table is `_A_…_D`. |
| Numbering | Managed early/late numbering. The number range object is supplied by the user — the agent consumes it, never creates it. |
| Actions | Factory/instance actions in camelCase (`copyWithReference`). Business logic lives in the behaviour class. |
| Lock | Managed framework optimistic locking (ETag) plus the existing lock object. Do not hand-roll `ENQUEUE`. |
| **Lock + ETag** | ⛔ A managed root with create/update/delete **must** carry `lock master` and `etag master <LastChangedField>`. The ETag field needs `@Semantics.systemDateTime.lastChangedAt: true` on the root view (with the `createdAt`/`createdBy`/`lastChangedBy` admin fields — §5). Children: `lock dependent by _assoc`, `etag dependent`. Without it managed concurrency does not work. Check on every new BDEF. |
| Validation / determination | Mandatory fields and code checks → validation. Defaults and derived values → determination. |
| EML | One `MODIFY ENTITIES` block, all `DATA` at the top of the method, unique `%cid`, and no `COMMIT ENTITIES` inside a Gateway context. |
| **`READ ENTITIES BY _assoc`** | ⚠ `READ ENTITIES … ENTITY parent BY _child FROM <key> RESULT lt` fills the child's **key fields only**. Every non-key field (date, status, type, amount) stays initial, so the validation or determination reading them is **silently wrong**: syntax clean, ATC clean, activates, and only fails at runtime. To read non-key fields use `ALL FIELDS WITH <key>`, or `FIELDS ( f1 f2 ) WITH <key>` — `WITH`, not `FROM`. `FROM` is correct only for an existence check. |

**A document lock in the VA02 sense** — lock on open, read-only for the second user — is
not what managed locking gives you. In a freestyle/V2, draft-less app it needs an
application-level lock (a `Z…_T_LOCK` table plus acquire/release static actions, with a UI
heartbeat and a timeout). If the object is a real SAP document that VA02 also opens, add
`ENQUEUE_READ` on top.

---

## 4 · Standard objects — the RAP surface

| | In RAP this looks like |
|---|---|
| **Do not touch standard objects** | Root and projection views read Z tables and Z CDS only. No append or extend on a standard CDS or BO. No `extension` on a standard behaviour. |
| **No direct I/U/D on standard tables** | Managed EML writes to Z tables only. For a standard document: unmanaged + a released BAPI/RFC (in that order, then BDC, then manual). `MODIFY ENTITIES` or SQL against a standard table is forbidden. |
| **Do not silently choose the target** | Creating a package or a transport is allowed; **choosing** one without the user confirming it is not. This reversed on 2026-08-04 — the axis is the silent choice, not the creation. The engine's namespace guard blocks the Z/Y boundary; the target is a discipline question. |
| **Z texts complete and in the master language** | CDS `@EndUserText.label`, BDEF `@EndUserText`, service definition title — taken from the FS/TS, never guessed, and confirmed by reading the object back after activation. |

Field names come from the live DDIC (`adt_get_source`, `adt_sql`), never from memory —
they are system-dependent.

---

## 5 · Audit fields fill themselves

Where the table carries `created_by`/`create_date`/`create_time`/`updated_by`/
`update_date`/`update_time` or equivalents, the agent fills them without being asked.

1. Read the audit fields out of DDIC and confirm the convention with the user.
2. Default: **create writes both `created_*` and `updated_*`; every later update writes
   only `updated_*`; `created_*` never changes.**
3. Mechanism: an **idempotent `setAdmin` determination**, `on save { create; update; }` on
   root and child, with an instance guard (without it the cyclical call dumps) and
   `IN LOCAL MODE`. Do not use `with additional save` together with early numbering — the
   create component comes through empty.
4. `Edm.Time` on the UI side is `sap.ui.model.odata.type.Time`; on export, `EdmType.Time`.

---

## 6 · Shared value helps

Value helps over generic master or org data (`but000`, `tvkot`, `tvknt`, `t001`…) that
carry no application logic are created **once**, in the module's shared package, as
`Z<MOD>000_I_*`, and consumed through `expose` plus an association. No copying. Value
helps specific to the app or to a Z table stay local to their package.

Every development draws up its value-help inventory and asks the user, per candidate,
shared or package-local. The agent does not decide alone. Check first whether the shared
view already exists (`adt_search`).

**The BPNAME anti-pattern — do not build a generic business-partner lookup.** A partner
field's value is *always* either a customer (`KNA1`/`KUNNR`) or a vendor (`LFA1`/`LIFNR`).
Never create a generic `BusinessPartner` (`but000`/`BU_PARTNER`) search help or name
resolution. Classify each partner field:

- **customer** → picker over `knvv` (or a partner-function-specific one over `knvp`); name
  resolution through the released `I_Customer`.
- **vendor** → picker over `I_Supplier`; name resolution through `I_Supplier`.

The reason: `BU_PARTNER` is not `KUNNR`/`LIFNR` (CVI mapping), so a generic BP join
returns an empty or wrong name — quietly.

---

## 7 · Service definition, binding, publish

| Topic | Rule |
|---|---|
| Service definition | `UI` (Fiori) or `API` (integration). The `expose` list carries projection views and read-only query CDS. The root view is not exposed directly. |
| Service binding | OData V2 UI is primary (`_O2`). A V4 binding (`_O4`) on the same definition may be created and published as a hedge — it costs nothing and opens the door without a backend rewrite. |
| Order | create → **activate** → publish. Publishing an inactive binding reports "does not exist". |
| Adding to a live service | A new **field** on an already-exposed entity needs only a re-publish. A new **entity** needs `expose` in the service definition, activation, then re-publish. Either way, confirm against live `$metadata` before anyone tests the UI. |
| Verification | After publish, fetch the live service: `GET …/$metadata` must return 200 and contain the expected entity sets. |

**The name the consumer sees is not the name you wrote.** A composition exposed as `_Child`
arrives in OData V2 metadata as **`to_Child`** — SADL prefixes it. A consumer written
against `_Child` fails *quietly*: `createEntry("_Child")` saves an empty record and
`$expand=_Child` returns nothing, with no error on either side. Whoever consumes the
service reads the navigation name out of live `$metadata`, never out of the CDS source.

---

## 8 · Security

Every root and projection view carries `@AccessControl.authorizationCheck` — `#NOT_REQUIRED`
or `#CHECK`. Where authorisation is required, a DCL access control object goes with it.

Publishing a service binding is not FLP or IAM exposure. Tiles, catalogues and business
roles are separate authorisation work.

---

## 9 · Verification

- **The activation result is not proof.** Read the active version back (`adt_get_source`).
  The text check above happens on that same readback, not as a second call.
- **Persist is not buffer.** In EML, `fc = 0`, `sy-subrc = 0` and HTTP 200 all mean the
  buffer accepted it. Confirm the row with `adt_sql` and the source with `adt_get_source`.
- **Method signatures fail at save, not at activation.** A `CURR` data element, a
  `RANGE OF` parameter, or a built-in `TYPE p LENGTH n` in a method signature can fail the
  resource scan when the class is saved. When in doubt run `adt_syntax_check` first —
  details in [`ABAP_TRAPS.md`](ABAP_TRAPS.md) §1.

---

**Provenance.** Adapted 2026-08-19 from the ARC-1 kit's `standards/05-coding-rap.md`.
Removed: the naming table (stale, and duplicated our own authority), the Clean Core
section (the `clean-core` skill covers it in three reference files), and the role/scope
preamble. Rewritten: the "no package or transport creation" rule, which our standard
reversed on 2026-08-04, and every ARC-1 tool name — see [`gates.md`](gates.md) for the
mapping.
