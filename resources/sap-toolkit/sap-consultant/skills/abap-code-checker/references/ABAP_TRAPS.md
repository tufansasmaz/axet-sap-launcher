# Traps that pass every static gate

Syntax check is green, ATC is clean, the object activates — and the code is still wrong.
Everything below is in that class, which is why it is written down: a gate cannot find it
and a reviewer only finds it if they know it exists.

Each entry names the symptom, the cause, and the replacement. If you cannot name the
replacement, it is not a finding yet (`review-checklist.md`).

---

## 1 · `RANGE OF` in a method signature

**Symptom.** The class saves, then fails on activation — or fails the resource scan at save
time with a message that does not mention ranges.

**Cause.** `TYPE RANGE OF x` is legal only in a local `DATA` declaration. In an
IMPORTING/EXPORTING/CHANGING parameter it is not.

```abap
METHODS constructor
  IMPORTING it_prices TYPE zsd001_tt_sel_price.      " correct
" IMPORTING it_prices TYPE RANGE OF zz1_price_code.  " does not activate
```

**Replacement, two cases:**

| The field is | Do |
|---|---|
| a standard SAP field | find the range table type SAP already ships — SE11 where-used on the data element, or ask the operator |
| a custom `Z`/`ZZ1_` field | create the structure + table type yourself (below) |

Structure: `SIGN` TYPE `DDSIGN`, `OPTION` TYPE `DDOPTION`, `LOW`/`HIGH` TYPE
`<your data element>`. Table type: row type = that structure, kind = standard. Name both
by the standard (`_S_` / `_TT_`).

Three range table types verified on one on-prem system — treat as a starting point for the
where-used search, not as a list to trust blind:

| Field | Data element | Table type | Row type |
|---|---|---|---|
| `vkorg` | `VKORG` | `SD_VKORG_RANGES` | `SDSLS_VKORG_RANGE` |
| `kunnr` | `KUNNR` | `SHP_KUNNR_RANGE_T` | `SHP_KUNNR_RANGE` |
| `budat` | `BUDAT` | `TDT_RG_BUDAT` | `TDS_RG_BUDAT` |

A range declared locally inside the method is fine and needs none of this.

---

## 2 · `FOR ALL ENTRIES` with `GROUP BY`

The combination is a syntax error. Two ways out, and the choice is not stylistic.

**A · Join the internal table (S/4HANA 1909+, preferred).**

```abap
DATA lt_filter TYPE HASHED TABLE OF ty_filter WITH UNIQUE KEY siparis_no kalem_no.
lt_filter = VALUE #( FOR ls IN mt_siparisler ( siparis_no = ls-siparis_no
                                               kalem_no   = ls-kalem_no ) ).

SELECT l~vgbel AS siparis_no, l~vgpos AS kalem_no, SUM( l~lfimg ) AS toplam_mik
  FROM lips AS l
  INNER JOIN @lt_filter AS fil ON  fil~siparis_no = l~vgbel
                              AND fil~kalem_no   = l~vgpos
  GROUP BY l~vgbel, l~vgpos
  INTO TABLE @DATA(lt_sonuc)
  ##db_feature_mode[itabs_in_from_clause] ##itab_db_select.
```

Both pragmas are mandatory. The joined table must be `HASHED` or `SORTED`.

**B · Read raw rows, aggregate in ABAP.** Mandatory when the source field is wide —
a CDS `CURR(34,2)` summed into a smaller target overflows, and A cannot help you.

**Choosing:**

| Situation | Method |
|---|---|
| target field is narrow (`wrbtr`, `kwmeng`) | A |
| target field is wide (`CURR(34,2)`) | B — `SUM` will not fit |
| internal table is very large (100k+) | B is safer |

**The hidden one.** Rewriting a `SELECT SUM(...)` into "raw rows + `COLLECT`": if the
SELECT list does not carry the source table's **full unique key**, `FOR ALL ENTRIES`
applies an implicit `DISTINCT`, two physically distinct rows with the same projection
collapse into one, and the total is **silently short**. Put the full key in the SELECT
list; keep the `COLLECT` target at {group key + quantity}.

---

## 3 · `FOR ALL ENTRIES` over an empty table

If the driving table is empty, SAP **drops the WHERE clause and reads everything**. Not
only a performance problem — the result is wrong data, and it is wrong quietly.

```abap
IF lt_musteriler IS NOT INITIAL.
  SELECT matnr, netpr FROM a004
    FOR ALL ENTRIES IN lt_musteriler
    WHERE kunnr = lt_musteriler-kunnr
    INTO TABLE @lt_fiyat.
ENDIF.
```

`INNER JOIN @lt_itab` does not share the flaw — an empty table yields an empty result. The
guard there is only to save a round trip.

`WHERE f IN @lt_range` is different again: an empty range means "no restriction" by design.
That is expected behaviour, not a bug — do not flag it.

---

## 4 · Exchange rates — never read `TCURR` directly

`TCURR` is a trap in three ways: `GDATU` is `CHAR(8)` holding an *inverted* date
(`99999999 - YYYYMMDD`), `FFACT`/`TFACT` can be zero (division by zero), and `UKURS`
alone is not the rate — you need the factor formula.

`I_ExchangeRate` solves all three: `ExchangeRateEffectiveDate` is a plain date and
`EffectiveExchangeRate` is already computed.

```abap
SELECT SourceCurrency AS fcurr, TargetCurrency AS tcurr,
       EffectiveExchangeRate AS exchrate
  FROM I_ExchangeRate AS er
  INTO TABLE @lt_kur
  WHERE er~ExchangeRateType = 'M'
    AND er~SourceCurrency IN @lt_all_waers
    AND er~TargetCurrency IN @lt_target_waers
    AND er~ExchangeRateEffectiveDate =
          ( SELECT MAX( e2~ExchangeRateEffectiveDate ) FROM I_ExchangeRate AS e2
             WHERE e2~ExchangeRateType          = er~ExchangeRateType
               AND e2~SourceCurrency            = er~SourceCurrency
               AND e2~TargetCurrency            = er~TargetCurrency
               AND e2~ExchangeRateEffectiveDate <= @sy-datum ).
```

Guard the ranges (§3) and guard the rate: `IF sy-subrc = 0 AND <kur>-exchrate <> 0.`

---

## 5 · Activation-only syntax

Four shapes that survive the linter and the syntax check and die on activation.

- **Substring length cannot be an expression.** In `obj+off(len)`, `len` must be a literal
  or a bare variable. `obj+480(lv_len - 480)` and `obj+720( COND ... )` are parse errors.
  Compute into a variable first.
- **`PERFORM ... USING` actuals cannot be expressions.** `PERFORM f USING |{ x }|` gives
  "Field | is unknown". Assign to a variable, or use a method — methods accept expressions.
- **`COLLECT` requires every non-key field to be numeric.** One `CHAR` non-key field (a
  unit, a name) is a compile error. Move it into the key, or replace `COLLECT` with
  `READ TABLE` + manual accumulation.
- **`TYPE charNNN` above 40 does not exist.** `char150` → "Type CHAR150 is unknown".
  Use `c LENGTH n` locally, `string`, or a real data element (`text255`, `bapi_msg`).

---

**Provenance.** Adapted 2026-08-19 from the ARC-1 kit's
`playbook/04-abap-coding-patterns.md`, which recorded each of these against a live system.
Reorganised around symptom → cause → replacement, the two summary tables that restated
their own sections dropped, and the range-table-type list marked as one system's evidence
rather than a standard.
