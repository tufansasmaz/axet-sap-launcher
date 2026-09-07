# Object gates — DDIC, CDS, RAP

Run **before** creating or updating the object and **again after activation**. These are
not code-review opinions; each row is a pass/fail with a named way to check it.

Many rows are marked **activation-only** or **runtime-only**. Those pass the syntax check
and ATC and still fail later — they are the reason this list exists.

**Output.** Every row gets an explicit PASS or FAIL plus evidence (the readback line, the
violating source line). "Looks fine" is a FAIL — no evidence, no pass. One BLOCKER open
means nothing is written to SAP.

---

## Every object, whatever the type

| ID | Check | Severity | How |
|---|---|---|---|
| OBJ-01 | Name follows [`NAMING_STANDARD.md`](../../ts-generator/references/NAMING_STANDARD.md) for its type | BLOCKER | manual — the engine has no naming gate yet, see `docs/specs/2026-08-19-naming-gate/` |
| OBJ-02 | **Reuse first** — does a released standard object, or an existing Z one, already do this? | BLOCKER | `adt_search` |
| OBJ-03 | Labels and descriptions come from the FS/TS, complete, never guessed, never left blank | BLOCKER | manual + readback |
| OBJ-04 | `masterLanguage` after create is the language it should be | BLOCKER | `adt_get_source` |
| OBJ-05 | After activation: `version=active` **and the source is not empty**. HTTP 200 and a tool's own success message are not evidence — the empty-shell case returns both | BLOCKER | `adt_get_source` |
| OBJ-06 | Transport is the active request the user named; the target was not chosen silently | BLOCKER | discipline |
| OBJ-07 | No standard object created, modified or appended to | BLOCKER | Z/Y namespace guard + manual |

Everything below is *in addition* to these seven.

---

## DDIC — domain, data element, table, structure, table type, lock object

### Domain and data element

| ID | Check | Severity |
|---|---|---|
| DD-DOM-01 | Output length matches the formula (DEC/QUAN/CURR = length + 4; integers fixed; CHAR = length) | BLOCKER |
| DD-DOM-02 | Fixed values or value table present where needed; an addition is additive — old **and** new confirmed by readback | WARNING |
| DD-DTEL-01 | All four field labels filled (short ≤10, medium ≤20, long ≤40, heading ≤55), confirmed by readback | BLOCKER |
| DD-DTEL-02 | Built-in type is `typeKind=domain` + `typeName=DATS/TIMS/INT*`. There is no separate BUILTIN kind | BLOCKER |
| DD-DTEL-03 | Domain is compatible with the foreign-key target — an incompatible one stops the dependent structure or table activating | BLOCKER |

### Table and structure

| ID | Check | Severity |
|---|---|---|
| DD-TBL-01 | `@AbapCatalog.enhancement.category` present (`#NOT_EXTENSIBLE` unless deliberately otherwise) | BLOCKER |
| DD-TBL-02 | A client-dependent table has a client field, first, in the key. **Both spellings are valid** — `key client : abap.clnt not null;` (what ADT generates) and `key mandt : mandt not null;` (the classic form) | BLOCKER |
| DD-TBL-03 | `not null` only on key fields | BLOCKER |
| DD-TBL-04 | CURR/QUAN fields carry qualified `@Semantics…: 'TABLE.FIELD'`, the referenced field carries its marker (`currencyCode`/`unitOfMeasure`), and it lives in the same table | BLOCKER |
| DD-TBL-05 | Type references lowercase; namespaced data elements unquoted | BLOCKER |
| DD-TBL-06 | No duplicate field names (case-insensitive) | BLOCKER |
| DD-TBL-07 | Every Z data element used is **active** | BLOCKER |
| DD-TBL-08 | Before an update the current source was read; new business fields were added **above** the audit block | WARNING |
| DD-TBL-09 | A field DROP, RENAME or TYPE change was preceded by a write-path analysis (where-used plus the code that writes it), the cascade scope was listed, and the **user approved** | BLOCKER |
| DD-TBL-10 | Before CREATE, the field list, keys and data elements were shown to the user and approved | BLOCKER |
| DD-STR-01 | After create the structure source is **not empty** — the placeholder-shell trap | BLOCKER |
| DD-TTYP-01 | Row type read back after create **and** activation. It can come back NULL | BLOCKER |
| DD-ENQ-01 | Lock object name starts with `EZ`/`EY` (SAP's own constraint, not the NTT formula); primary table, lock mode (E/S/X) and parameters (MANDT + keys) correct | BLOCKER |
| DD-ENQ-02 | Activated, and the `ENQUEUE_*`/`DEQUEUE_*` function modules were generated. An inactive lock object cannot be used | BLOCKER |

### Cascade

| ID | Check | Severity |
|---|---|---|
| DD-CASC-01 | After a domain or data element change, no dependent object left inconsistent — reactivate the chain (table → CDS → structure) | BLOCKER |
| DD-CASC-02 | Interdependent new objects activated in one pass, in reverse dependency order | WARNING |

---

## CDS — classic view, view entity, abstract entity

Verify with `adt_syntax_check`, `adt_atc_check`, `adt_get_source` for readback, and
`adt_where_used` for impact.

| ID | Check | Severity | Note |
|---|---|---|---|
| CDS-TYPE-01 | Right kind chosen: has a SELECT → view / view entity; parameters or a result with no SELECT → abstract entity | BLOCKER | |
| CDS-SQLV-01 | Classic view: `@AbapCatalog.sqlViewName` present, ≤10 chars, **right the first time** — activating a wrong one leaves a broken rename needing SE14 | BLOCKER | |
| CDS-SQLV-02 | View entity: `sqlViewName` **absent** | BLOCKER | |
| CDS-LABEL-01 | `@EndUserText.label` present, ≤40 chars | BLOCKER | |
| CDS-AUTH-01 | `@AccessControl.authorizationCheck` present (`#NOT_REQUIRED` or `#CHECK`) | BLOCKER | |
| CDS-DEPR-01 | `@AbapCatalog.preserveKey` not used (deprecated) | WARNING | |
| CDS-FROM-01 | Every source table and CDS exists and is active | BLOCKER | |
| CDS-FROM-02 | Standard field names read from the live definition, not from memory — a data element name is not a field name | BLOCKER | |
| CDS-FROM-03 | Clean Core: released CDS preferred over the raw table (MARA → `I_Product`, KNA1 → `I_Customer`, LFA1 → `I_Supplier`). Deliberate table use is allowed with a written reason | WARNING | ATC |
| CDS-KEY-01 | At least one `key` field | WARNING | |
| CDS-AGG-01 | `sum()`/`count()`/`max()` present → `group by` complete | BLOCKER | |
| CDS-AGG-02 | No aggregate over a UNIT or CUKY field (`max(vrkme)` is illegal — move it to `group by`) | BLOCKER | activation-only |
| CDS-CUR-01 | CURR/QUAN fields carry qualified `@Semantics.amount.currencyCode` / `.quantity.unitOfMeasure` plus the marker on the referenced field | BLOCKER | |
| CDS-QTY-01 | No amount- or quantity-semantic field pushed into arithmetic without stripping the semantics first (`cast( … as abap.dec )`) | BLOCKER | activation-only |
| CDS-UNION-01 | `union all`: no EXISTS subquery (use LEFT JOIN + IS NULL); element `@Semantics` only in the first branch; header carries `@Metadata.ignorePropagatedAnnotations: true` | BLOCKER | activation-only |
| CDS-CASE-01 | Arithmetic on the left of `case when` is not wrapped in outer parentheses | BLOCKER | activation-only, the syntax check misses it |
| CDS-JOIN-01 | No cast or function in a JOIN ON condition. If one is needed: a pre-cast bridge view, `lpad`, and equal-length casts | BLOCKER | activation-only |
| CDS-JOIN-02 | A `$projection` field used in an association ON is a base-table field — if it is association-derived, SDDL 061 follows; use an intermediate view or a LEFT JOIN | HIGH | activation-only |
| CDS-CONS-01 | A root view entity may only project onto another **root**. `as projection on` itself is fine with no behaviour behind it | BLOCKER | |
| CDS-CONVEXIT-01 | A field with a conversion exit exposed to OData: read-only → cast to char; **writable → casting is forbidden** (decide an exit-free Z data element with the user) | BLOCKER | publish-only |
| CDS-DEP-01 | Removing a field from an active view goes in reverse order (consumer first, then interface). A join-field rename is a three-step transition; a base ↔ consumption rename activates together | BLOCKER | `adt_where_used` |
| CDS-2PHASE-01 | A helper key change and its consumer's join change are **not** in the same round | BLOCKER | |
| CDS-VIRT-01 | Virtual element with a SADL exit: char cast (not string), uppercase original element, verified against live OData and the dump feed | HIGH | runtime-only |
| CDS-AMDP-01 | AMDP table function: client handling complete, ASCII-7 body, no apostrophe in comments, namespaced table access verified; consumers do not pass `p_client` explicitly | HIGH | |
| CDS-CLASSIC-01 | No view-entity syntax leaking into a classic `define view` (`IN (…)`, cast inside an aggregate, `key` in a second UNION branch, `$projection`) | BLOCKER | activation-only |
| CDS-CAP-01 | A claim that the system supports some CDS feature (`string_agg`, a new built-in) was verified against a live example or an activation — not inferred from the release | HIGH | |
| CDS-SPEC-01 | The spec's "removed field / join / filter" decisions are reflected in the source; with no spec, the user approved | BLOCKER | |

---

## RAP — view entity, BDEF, behaviour class, service definition, binding, publish

The CDS rows above apply to the RAP view layer as well. Rules and reasoning:
[`RAP_STANDARD.md`](RAP_STANDARD.md).

### View entity layer

| ID | Check | Severity |
|---|---|---|
| RAP-VE-01 | `define [root] view entity` — not classic `define view`; no `sqlViewName` | BLOCKER |
| RAP-VE-02 | The root's projection is also `define root view entity` | BLOCKER |
| RAP-VE-03 | Composition and association are consistent root ↔ child (parent association, `redirected to` pairs) | BLOCKER |
| RAP-VE-04 | Expressions (`cast`, `coalesce`, `case`) live in the interface layer; the projection exposes them flat | BLOCKER |
| RAP-VE-05 | No aggregation on the root — use a helper view plus an association | BLOCKER |
| RAP-AE-01 | Abstract entity (parameters/result) built with the right types; plain `abap.dec` instead of a quantity or amount field | BLOCKER |

### Behavior definition

| ID | Check | Severity |
|---|---|---|
| RAP-BD-01 | Implementation type justified: managed = Z table; unmanaged façade = standard data behind a released BO | BLOCKER |
| RAP-BD-02 | Child behaviour sits **outside** the parent block, as a sibling | BLOCKER |
| RAP-BD-03 | Number-range or CHAR key → an `early numbering` line **and** an `earlynumbering_create` handler. `numbering : managed` not used, and the number is not set in a determination | BLOCKER |
| RAP-BD-04 | The number range object came from the user; the agent only consumes it | BLOCKER |
| RAP-BD-05 | An `on save` trigger with `update` also has `create` (`{ create; update; }`) | BLOCKER |
| RAP-BD-06 | `authorization master ( global )` has its (possibly empty) `get_global_authorizations` handler | BLOCKER |
| RAP-BD-07 | Calculated and association fields are not declared `field(readonly)`; a composition child key is `field ( readonly : update )` | WARNING |
| RAP-BD-08 | Managed BO with writes carries `lock master` **and** `etag master` | BLOCKER |
| RAP-BD-09 | A read-only, static-only façade does **not** carry `strict ( 2 )` | BLOCKER |
| RAP-BD-10 | The draft decision is explicit (default: no draft) | WARNING |

### Behaviour class

| ID | Check | Severity | Note |
|---|---|---|---|
| RAP-BH-01 | ⛔ No `COMMIT WORK`, `ROLLBACK`, `BAPI_TRANSACTION_*` or `COMMIT ENTITIES` in the handler **or in anything it calls**. A BAPI that needs a commit goes through an RFC FM with `DESTINATION 'NONE'` | BLOCKER | runtime-only dump |
| RAP-BH-02 | ⛔ No `MESSAGE` statement in a handler — use `reported` / `failed` | BLOCKER | runtime-only |
| RAP-BH-03 | No non-key field read through `READ ENTITIES BY _assoc … FROM` — that returns keys only. Use `ALL FIELDS WITH` | HIGH | runtime-only |
| RAP-BH-04 | `CREATE BY _assoc` on an existing document uses `<Key>ForEdit`, not the semantic key; key values ALPHA-padded; read first, then route to update/create/delete | HIGH | |
| RAP-BH-05 | The released BO's operation (UPDATE/CREATE) is actually open in this system — verified live | HIGH | |
| RAP-BH-06 | Action result is `%param`-nested with `%cid = keys-%cid`; for `$self`, `%tky` plus `%param` | HIGH | |
| RAP-BH-07 | Audit fields use the idempotent `setAdmin` determination — instance guard, `IN LOCAL MODE`, `%control` | HIGH | |
| RAP-BH-08 | Determinations and validations were added one at a time, after plain CRUD was green end to end | WARNING | |
| RAP-BH-09 | Long texts: `_Text` through EML does not persist — use `SAVE_TEXT` with `savemode_direct = 'X'`, then read back | HIGH | runtime-only |
| RAP-BH-10 | No credentials or endpoints in source; an SAP-internal API call goes through the configured gateway/SM59 destination | BLOCKER | |
| RAP-BH-11 | No generic table parameter with `LOOP … WHERE` — the row type must be statically determinable; callers match the typed parameter | HIGH | |

### Activation order

| ID | Check | Severity |
|---|---|---|
| RAP-ACT-01 | Order: interface CDS → projection CDS → BDEF (interface + projection) → behaviour class → service definition → binding → publish | BLOCKER |
| RAP-ACT-02 | BDEF and behaviour class activate **together**, in one pass; a CDS change re-activates the BDEF | BLOCKER |
| RAP-ACT-03 | A circular "CREATE not activated" is resolved by staging: BDEFs first, then the class | BLOCKER |
| RAP-ACT-04 | The activation output was **parsed** — did it run, and are there E messages? 200 is not "active" | BLOCKER |

### Service and publish

| ID | Check | Severity |
|---|---|---|
| RAP-SB-01 | The service definition exposes projection and query CDS only — not the interface view. Value-help views are exposed | BLOCKER |
| RAP-SB-02 | Binding suffix correct: `_O2` for V2, `_O4` for V4 | BLOCKER |
| RAP-SB-03 | Order create → **activate** → publish. Publishing an inactive binding reports "does not exist" | BLOCKER |
| RAP-SB-04 | After publish, live `GET …/$metadata` returns 200 and contains the expected entity sets and function imports | BLOCKER |
| RAP-SB-05 | End-to-end evidence: a deep-create POST returns 201 with a number assigned, and a validation rejection returns 400 with its message | BLOCKER |
| RAP-SB-06 | A failed publish stops and is reported to the user — no blind retries | BLOCKER |

### ATC

Run `adt_atc_check`. **Priority 1 findings are fixed, not waived.** Silencing them with a
pseudo-comment or a pragma is not allowed; priority 2 and 3 pass only with the user's
agreement. A raw `KNA1`/`LFA1` SELECT is a common priority-1 source — use `I_Customer` /
`I_Supplier`.

---

**Provenance.** Adapted 2026-08-19 from the ARC-1 kit's `playbook/checklists/`
(`cds-review.md`, `ddic-review.md`, `rap-review.md`). Fifteen rows repeated across the
three lists — naming, labels, master language, transport, readback, standard objects —
were hoisted into the shared preamble. ARC-1 tool names were mapped to `adt_*`; rows whose
only verification was `SAPLint` are marked manual, because this engine has no linter.
`SAP_ALLOWED_PACKAGES` was replaced by the Z/Y namespace guard, which is what actually
enforces the boundary here.

**Two rules corrected 2026-08-20, against evidence rather than argument.** An acceptance
run built a full RAP stack on a live system specifically to test what this file had just
imported (`ns4-kit-compare/result/COMPARISON3.md`, finding 6), and two rows did not
survive it.

- **`DD-TBL-02`** demanded `key mandt : mandt not null;` and forbade `client : abap.clnt`.
  But `adt_create_ddic_shell` generates exactly the forbidden form, so a consultant
  following this file edits `client` → `mandt` and is stopped by the engine's data-loss
  guard: *"fields DROPPED: client. This destroys data."* The guard is right; the rule was
  wrong. Keeping the generated form, `ZCM909_T_ORDER` activated and a root view,
  projection, service definition, binding and a live OData service were built on top of
  it. Both spellings are valid ABAP; what actually matters is that a client-dependent
  table has its client field first in the key.
- **`CDS-CONS-01`** said read-only consumption with no BO may not use `as projection on`.
  `ZCM909_C_ORDER` is `define root view entity … as projection on ZCM909_R_ORDER` and it
  activated with **no BDEF in existence at the time**. The half of that rule that holds is
  the second half — a root may only project onto a root — and that is what it now says.

The lesson is not about these two rows. A checklist imported wholesale carries its source's
assumptions, and the only way to find which of them are false here is to run them against
a system. Anything else in this file that has never been exercised is in the same position.
