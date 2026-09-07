# The judgment layer — G4 and G5

ATC catches what someone configured it to catch. This is the rest, and it is judgment,
which means every finding needs the two things an opinion does not have: **a line number
and a concrete replacement.**

Read source filtered. `adt_get_source(name=..., method="GET_SHIP_TO")` or
`grep="SELECT|LOOP AT|AUTHORITY-CHECK"`. Three unfiltered class reads end the session.

---

## Severity, before the lists

The temptation on a judgment finding is to inflate it. Resist it — a board where naming
findings sit next to a missing authority check teaches the reader that the board is noise.

| Severity | Judgment findings that earn it |
|---|---|
| `blocker` | missing/wrong `AUTHORITY-CHECK`, hardcoded credential, modification to a standard object, SQL built from unvalidated input, `COMMIT WORK` inside a loop or in a function that its caller cannot see |
| `major` | `SELECT` inside a `LOOP`, `SELECT *` on a wide table, swallowed exception (`CATCH ... ENDTRY` with an empty body), no error handling on a call whose failure is silent, hardcoded plant/company code/path |
| `minor` | naming, method length, missing ABAP Doc, magic numbers, dead code, commented-out blocks |

---

## G4 · Clean Core

**Deprecated statements** — flag with the replacement, always:

| Found | Write instead |
|---|---|
| `MOVE a TO b` | `b = a` |
| `CALL METHOD obj->m EXPORTING...` | `obj->m( ... )` |
| `CREATE OBJECT obj TYPE cls` | `obj = NEW cls( )` |
| `TABLES t` | a local `TYPE REF TO` / method parameter |
| `WRITE` for output | ALV (`CL_SALV_TABLE`) or Fiori |
| `SELECT *` on a standard table | a CDS view, or a named field list |
| `sy-subrc` chains as control flow | exception classes |
| `LOOP ... WHERE` on a standard table read in full | a `WHERE` on the `SELECT` |

**Namespace and modification** — a `blocker` each, no discussion:

- any object not starting `Z`/`Y` being written to
- an enhancement (implicit or explicit) inside SAP-delivered code
- a modification recorded against an SAP object in the transport (`E071` with a non-Z name)

**Not-released objects** — hand the list to the `clean-core` skill. On an ABAP Cloud
project a Level D object is a `blocker`; on a classic stack with a conversion in the plan
it is a `major` with the target release named.

---

## G5 · Standards

### Naming

Object names are judged against
[`NAMING_STANDARD.md`](../../ts-generator/references/NAMING_STANDARD.md), which is the
authority — do not carry a second table here, and do not review from memory. The shapes
most often got wrong:

```
ZCL_<Module><PkgNo>_<Desc>    ZCL_SD001_SALES_ORDER      class
ZIF_<Module><PkgNo>_<Desc>    ZIF_SD001_SALES_API        interface
Z<Module><PkgNo>_<P|I>_<Desc> ZSD001_P_INVOICE_REPORT    program / include
```

`Z<Module><PkgNo>_CL_<Desc>` is the **legacy** class shape. Flag it on new code; leave it
alone on old.

Variable prefixes, which the standard does not cover and convention does:

```
iv_ / ev_ / cv_ / rv_       importing / exporting / changing / returning
lv_ / lt_ / ls_ / lo_       local scalar / table / structure / object
```

Two hard limits that produce a `blocker` because the object will not activate or will
collide: class name > 30 characters, and a truncated name that no longer matches its
package prefix.

Everything else here is `minor`. Say the replacement: `lv_a` → `lv_addr`.

### Structure

- Method longer than ~50 lines → name the extractable block and its line range.
- More than 5–7 parameters → usually a missing structure or a missing object.
- A class with 30 public methods is not a class; say which two responsibilities it holds.
- `PUBLIC` on something only the class itself calls → `PRIVATE`.

### Performance

The two that actually cost money on a customer system, both `major`:

1. **`SELECT` inside `LOOP`** — say the multiplier out loud in the finding:
   *"400 satırlık tabloda 400 ayrı sorgu"*. Replacement is `FOR ALL ENTRIES`, a JOIN, or
   a CDS view — name which one and why.
2. **`SELECT *`** where four fields are used. Name the four fields.

Then: table type against access pattern (`STANDARD` scanned by key → `SORTED`/`HASHED`),
`READ TABLE ... BINARY SEARCH` on an unsorted table (a correctness bug, not a performance
one — `major`), nested loops over unindexed tables.

### Error handling

- An empty `CATCH` body is a `major`. The exception was raised for a reason and this code
  decided it did not happen.
- A `CATCH cx_root` that continues is nearly always wrong — name the two exceptions the
  block can actually raise.
- `sy-subrc` checked but not acted on, or not checked at all after a call that can fail.
- `MESSAGE ... TYPE 'E'` inside a method that its caller expects to return — say what the
  caller does when the screen has no place to show it.

### Security

- `AUTHORITY-CHECK` absent on a read of data that is authorisation-relevant. This is the
  finding juniors miss most and it is a `blocker`: *"her kullanıcı her plant'ı okuyabiliyor"*
  is a sentence a customer's auditor will write, not you.
- Credentials, endpoints, file paths, or a system ID in source → `blocker`. They belong in
  a customizing table or `SSF`/`SECSTORE`.
- Dynamic SQL or a dynamic `WHERE` built from input that is not validated.
- Hardcoded plant, company code, document type or org unit → `major`. It works in DEV and
  is wrong the first time the customer opens a second plant.

### Turkish-locale traps

Worth their own line because they pass every test written in English:

- `TRANSLATE ... TO UPPER CASE` on data containing `i`/`I` — Turkish dotted/dotless `i`
  makes the round trip lossy. Compare with `cl_abap_char_utilities` or casefold on an
  ASCII-constrained field only.
- Date and decimal formatting assumed from `sy-datum` rendering rather than the user's
  format — shows up as `31.12` vs `12/31` in a printed form.

---

## Writing the finding

Two forms, same code:

> ❌ *"Performans sorunu var."*
>
> ✅ *"`READ_ADRC` içinde 212. satırda `LOOP` içinde `SELECT` — 400 satırlık teslimat
> listesinde 400 ayrı veritabanı sorgusu. `FOR ALL ENTRIES` ile tek sorguya iner; diff s.2."*

The second one can be checked, argued with, and fixed by someone who was not in the room.
The first one is a feeling.
