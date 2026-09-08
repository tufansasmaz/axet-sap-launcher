# `adt_sql` is ABAP Open SQL, not ANSI

Measured against NS4 (S/4HANA) on 2026-09-04. Every line below was a failed
query first.

## Three syntax differences that stop a query dead

| ANSI habit | What SAP answers | Open SQL form |
|---|---|---|
| `ORDER BY cnt DESC` | `"DESC" is not allowed here. "." is expected.` | `ORDER BY cnt DESCENDING` |
| `FROM ekko AS k ... k.bsart` | `Only one SELECT statement is allowed.` | `FROM ekko AS k ... k~bsart` |
| `JOIN t161t t ON ...` | parse error | `INNER JOIN t161t AS t ON ...` — `AS` is not optional |

The second message is the one that wastes time: "Only one SELECT statement is
allowed" is what the parser says when the dot form makes it lose the statement,
and it reads like a restriction on the tool rather than a note about the dialect.

`COUNT(*) AS cnt`, `GROUP BY`, `INNER JOIN`, `WHERE` and `AS` aliases all work
as expected. Counts come back as strings with trailing spaces — strip before
using them as numbers.

## The compound text key

A customising description table is keyed by **language plus the code**, and
sometimes by more. Joining on the code alone silently multiplies rows.

Measured keys (`MANDT` omitted; it is implicit):

| Text table | Key | Text field | Describes |
|---|---|---|---|
| `T161T` | `SPRAS` + `BSART` + **`BSTYP`** | `BATXT` | MM purchasing document types |
| `TVAKT` | `SPRAS` + `AUART` | `BEZEI` | SD sales document types |
| `TVLKT` | `SPRAS` + `LFART` | `VTEXT` | SD delivery types |
| `TVFKT` | `SPRAS` + `FKART` | `VTEXT` | SD billing types |
| `T003T` | `SPRAS` + `BLART` | `LTEXT` | FI document types |

`T161T` is the odd one and it is the one people join wrong. On NS4, `EKKO` has
13 distinct `BSART` values; joining `T161T` on `BSART` alone returned **18**
rows, because a code carries a different description per document category.
With `BSART + BSTYP` it returns 14.

The fourteenth row is not an artifact — it is real and worth having. `RQ` exists
as an internal source request (13 documents) and an internal quotation (14),
13 + 14 = 27, which is exactly the raw count for `RQ`. Those are different things
to test. The plain `GROUP BY bsart` hides the distinction; the wrong join
invents rows that do not exist.

**Check before you join:**

```sql
SELECT fieldname, keyflag FROM dd03l WHERE tabname = 'T161T' ORDER BY position
```

Every field with `keyflag = 'X'` except `MANDT` belongs in the `ON` clause or
the `WHERE`.

## Adding a module to the scan

`scripts/scan_doc_types.py` holds the map in `MODULES`. A new entry needs five
things, and all five should be **probed, not recalled**:

1. the document table and its type field (`SELECT <field> FROM <table>` returns
   rows);
2. the text table and its text field (same test);
3. the text table's full key, from `dd03l` as above;
4. `extra_key` set when the key holds more than language + code (`BSTYP` for MM,
   `None` for everything else so far);
5. a run of the generated query, compared against a plain
   `SELECT <field>, COUNT(*) ... GROUP BY <field>` — if the joined row count is
   **higher**, the key is incomplete.

That last comparison is the whole test. It is how the `T161T` inflation was
found, and it costs one extra query.

## The gate

`adt_sql` is closed by default on the read-only surface and opens only on
`ADT_RO_ALLOW_SQL=true`. It reads business and personal data out of any table
the SAP user can see; the SAP authorisations are what actually limit it, and a
conversion-scoping user is often broadly authorised. `scan_doc_types.py`
refuses to run without the variable rather than reaching for the engine
directly — see its docstring.

A customer-production workspace pins the gate shut through
`sap-adt-readonly`'s `production_exception`, and no profile can override that.
