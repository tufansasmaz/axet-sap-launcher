# Verifying the object list against the system

The TS names standard objects a developer will build against — a BAPI and its
parameters, a table and its fields, a data element. Until 2026-08-21 nothing checked
any of them: the only mandatory check asks ROSA whether an object is *released for
ABAP Cloud*, which is a statement about SAP's product, not about this customer's
system. So a wrong field name reached the developer and surfaced at activation, or
at runtime.

This closes that, in six or seven queries, for an object list of any size.

> **No connection means no change.** If `.conn_adt` is absent, the VPN is down, or
> `adt_sql` is unavailable, the TS is written **exactly as it was before this file
> existed** and every row's verification column reads `— doğrulanamadı`. That is a
> supported outcome, not a degraded one: a TS is often written before anyone has a
> system, and a rule that blocked would teach people to skip verification entirely.
> Never ask the user to set up a connection in order to write a TS.

## How it works

Not one call per object — one call per **catalog table**, each carrying an `IN` list
of everything the TS asserts about it. The check is a **set difference**: ask which
of these exist, and whatever does not come back is not verified. Nothing is parsed
out of prose, and the cost does not grow with the object count.

Chunk `IN` lists at ~100 names. A longer list is two calls, not a different method.

## The queries

Run through `adt_sql`. All seven were verified against a live S/4HANA system on
2026-08-21.

**1 · Tables and structures exist**
```sql
SELECT tabname, tabclass FROM dd02l WHERE tabname IN ( 'MARA', 'VBAK' )
```

**2 · The fields the TS names** — filtered on *both* sides, so the result is only the
pairs that genuinely exist. `VBAK-MATNR` does not come back from the query below,
which is the precision this depends on.
```sql
SELECT tabname, fieldname FROM dd03l
 WHERE tabname IN ( 'MARA', 'VBAK' ) AND fieldname IN ( 'MATNR', 'VBELN' )
```

**3 · Data elements**
```sql
SELECT rollname FROM dd04l WHERE rollname IN ( 'MATNR', 'VBELN' )
```

**4 · Domains**
```sql
SELECT domname FROM dd01l WHERE domname IN ( 'MATNR', 'VBELN' )
```

**5 · Function modules, and the group each lives in**
```sql
SELECT funcname, pname FROM tfdir WHERE funcname IN ( 'BAPI_MATERIAL_SAVEDATA' )
```
`PNAME` minus its leading `SAPL` is the function group — worth carrying into the TS,
because writing an FM later needs it (`adt_write_function_module`).

**6 · FM parameters and their direction** — the query that pays for the exercise.
```sql
SELECT funcname, parameter, paramtype FROM fupararef
 WHERE funcname IN ( 'BAPI_MATERIAL_SAVEDATA' )
   AND parameter IN ( 'HEADDATA', 'CLIENTDATA', 'RETURN' )
```
`paramtype` is `I` importing, `E` exporting, `C` changing, `T` tables, `X` exception.
So this catches a parameter that does not exist **and** one the TS has on the wrong
side — the mistake that survives review because the name looks right.

**The second `IN` list is not optional.** Without it, `BAPI_MATERIAL_SAVEDATA` alone
returns **57 rows**; five such BAPIs would bury the answer in noise.

**7 · Classes, interfaces, CDS views, BAdI spots — and the `Z` collision check**
```sql
SELECT object, obj_name FROM tadir
 WHERE obj_name IN ( 'CL_GUI_ALV_GRID', 'I_PRODUCT', 'ZSD001_T_ORDER' ) AND delflag = ''
```
`TADIR` holds one row per **object type**, so a single name can come back several
times (`I_PRODUCT` appears as `CFDC`, `DDLS`, `STOB`…). Group by `obj_name`: any row
means it exists, and the `object` column is what distinguishes a CDS view from a
class.

## Two questions, the same queries

The object list holds two kinds of entry, and they need opposite verdicts.

| entry | expectation | a surprise means |
|---|---|---|
| **consumed** — standard tables, BAPIs, data elements, released CDS | must exist | the TS is wrong |
| **created** — the `Z`/`Y` names this TS invents | must **not** exist | name collision |

The collision check costs nothing extra — it is query 7 read the other way round. A
collision found while writing the TS is one edit; found at build time it is a rename
across five document parts, the transport, and everything already referencing it.

## The verdict column

§2.1 gains one column beside the Clean Core evidence column that is already there.

| value | meaning |
|---|---|
| `✓ doğrulandı` | found on the system; for an FM, the named parameters match in name and direction |
| `✗ bulunamadı` | queried and absent — **a defect in the TS**, fix it before the TS goes out |
| `⚠ ad çakışması` | a `Z` name this TS invents already exists |
| `— doğrulanamadı` | no connection, or this object type has no cheap check |

`✗` and `⚠` are not decoration. Neither should reach a developer.

## What this does not do

- No business logic — only that the named technical objects exist and fit.
- No data. Catalog tables only, so nothing customer-confidential leaves the system.
- It does not replace the Clean Core check. *"Exists here"* and *"released for ABAP
  Cloud"* are different questions; both columns stay.
- It does not write. Read-only queries, through the surface every TS-writing role
  already installs (`sap-adt-readonly`).
