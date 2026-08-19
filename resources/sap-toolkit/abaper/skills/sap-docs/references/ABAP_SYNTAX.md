# ABAP Syntax Reference

Common ABAP syntax patterns and statements.

## Data Declaration

### DATA Statement

```abap
" Simple variable
DATA: lv_value TYPE i VALUE 0.

" Multiple variables
DATA: lv_name TYPE string,
      lv_age  TYPE i.

" With inline declaration
DATA(lv_result) = calculate_value( ).

" Read-only
DATA(lv_constant) = VALUE #( ) READ-ONLY.

" With type reference
DATA(lo_object) = NEW zcl_my_class( ).
```

## SQL - SELECT

### Single Record

```abap
SELECT SINGLE field1, field2
  FROM table_name
  INTO @DATA(ls_record)
  WHERE key_field = @lv_key.
```

### Multiple Records

```abap
SELECT field1, field2
  FROM table_name
  INTO TABLE @DATA(lt_records)
  WHERE condition = @lv_condition
  ORDER BY field1.

" With UP TO rows
SELECT *
  FROM table_name
  INTO TABLE @DATA(lt_top)
  UP TO 10 ROWS.
```

### JOINs

```abap
SELECT a~field1, b~field2
  FROM table1 AS a
  INNER JOIN table2 AS b
    ON a~key = b~key
  INTO TABLE @DATA(lt_joined).
```

### FOR ALL ENTRIES

```abap
IF lt_keys IS NOT INITIAL.
  SELECT *
    FROM target_table
    FOR ALL ENTRIES IN @lt_keys
    WHERE key_field = @lt_keys-key_field
    INTO TABLE @DATA(lt_results).
ENDIF.
```

## Control Flow

### LOOP

```abap
LOOP AT itab INTO DATA(ls_line).
  " Process
ENDLOOP.

" With WHERE
LOOP AT itab INTO DATA(ls_line) WHERE status = 'A'.
  " Process
ENDLOOP.

" With index
LOOP AT itab INTO DATA(ls_line) FROM 1 TO 10.
  " Process
ENDLOOP.
```

### IF

```abap
IF condition1.
  " ...
ELSEIF condition2.
  " ...
ELSE.
  " ...
ENDIF.
```

### CASE

```abap
CASE lv_value.
  WHEN 'A'.
    " ...
  WHEN 'B' OR 'C'.
    " ...
  WHEN OTHERS.
    " ...
ENDCASE.
```

## Internal Tables

### MODIFY

```abap
" Modify single line
MODIFY TABLE itab FROM ls_line.

" Modify with index
MODIFY itab FROM ls_line INDEX 1.

" Modify specific fields
MODIFY itab FROM ls_line TRANSPORTING field1 field2.
```

### APPEND

```abap
APPEND ls_line TO itab.
APPEND VALUE #( field1 = value1 ) TO itab.
```

### INSERT

```abap
INSERT ls_line INTO itab INDEX 1.
INSERT ls_line INTO TABLE itab.
```

### DELETE

```abap
DELETE itab INDEX 1.
DELETE TABLE itab FROM ls_line.
DELETE itab WHERE field = value.
```

## Object-Oriented ABAP

### Class Definition

```abap
CLASS zcl_my_class DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS:
      constructor,
      process_data IMPORTING iv_data TYPE string,
      get_result RETURNING VALUE(rv_result) TYPE string.

  PRIVATE SECTION.
    DATA:
      mv_data TYPE string,
      mv_result TYPE string.

ENDCLASS.
```

### Method Declaration

```abap
METHODS:
  my_method
    IMPORTING
      iv_input TYPE string
    EXPORTING
      ev_output TYPE i
    RETURNING
      VALUE(rv_ret) TYPE string
    RAISING
      cx_static_check.
```

### Interface Definition

```abap
INTERFACE zif_my_interface.
  METHODS:
    process_data IMPORTING iv_data TYPE string.
ENDINTERFACE.
```

## RAP - EML (Entity Manipulation Language)

```abap
MODIFY ENTITIES OF z_i_my_entity
  ENTITY FIELDS ( field1 field2 )
    CREATE
      FIELDS ( field1 field2 )
      WITH VALUE #( ( field1 = 'A' field2 = 'B' ) )
  FAILED DATA(lt_failed)
  MAPPED DATA(lt_mapped)
  REPORTED DATA(lt_reported).
```

## String Processing

```abap
" Concatenation
lv_result = |{ lv_part1 } { lv_part2 }|.

" Template string
lv_text = |Hello { lv_name }, you have { lv_count } items|.

" Condense
CONDENSE lv_text NO-GAPS.

" Split
SPLIT lv_text AT ',' INTO TABLE DATA(lt_parts).
```

## Date/Time

```abap
" Current date/time
GET TIME STAMP FIELD DATA(lv_timestamp).

" Date calculations
lv_date = cl_abap_datfm_utilities=>conv_date_to_ext_date(
  iv_dat1 = sy-datlo
  iv_datfm = '1'
).
```

## Documentation Links

- [ABAP Keyword Documentation](https://help.sap.com/abap-docs/latest/en-US/index.htm)
- [ABAP SQL Reference](https://help.sap.com/abap-docs/latest/en-US/abapselect.htm)
- [ABAP OO Reference](https://help.sap.com/abap-docs/latest/en-US/abapclass.htm)
