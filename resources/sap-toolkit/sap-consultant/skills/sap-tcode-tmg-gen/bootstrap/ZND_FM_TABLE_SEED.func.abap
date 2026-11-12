FUNCTION znd_fm_table_seed
  IMPORTING
    VALUE(iv_table) TYPE tabname
    VALUE(iv_rows) TYPE string
    VALUE(iv_delete_first) TYPE char1 DEFAULT space
  EXPORTING
    VALUE(ev_ok) TYPE char1
    VALUE(ev_count) TYPE i
    VALUE(ev_message) TYPE string.

* Seeds TEST data into a Z/Y customizing table (Remote-Enabled). Guards: customer
* namespace only, delivery class C (customizing) only, client field filled automatically.
*   iv_rows  "FIELD=VALUE;FIELD=VALUE|FIELD=VALUE;FIELD=VALUE|..."  (one row per '|')
* Uses MODIFY, so it can be re-run. Not transported: this is test data, real customizing
* must be maintained through SM30 into a transport request.

  DATA: lt_rows  TYPE STANDARD TABLE OF string,
        lt_cols  TYPE STANDARD TABLE OF string,
        lv_row   TYPE string,
        lv_col   TYPE string,
        lv_name  TYPE string,
        lv_value TYPE string,
        lv_tab   TYPE tabname,
        lv_cont  TYPE dd02l-contflag,
        lr_data  TYPE REF TO data.
  FIELD-SYMBOLS: <ls_row> TYPE any,
                 <lv_fld> TYPE any.

  CLEAR: ev_ok, ev_count, ev_message.
  lv_tab = to_upper( iv_table ).

  IF lv_tab(1) <> 'Z' AND lv_tab(1) <> 'Y'.
    ev_message = |Table { lv_tab } is outside the customer namespace (Z/Y)|.
    RETURN.
  ENDIF.

  SELECT SINGLE contflag FROM dd02l
    WHERE tabname = @lv_tab AND as4local = 'A' AND tabclass = 'TRANSP'
    INTO @lv_cont.
  IF sy-subrc <> 0.
    ev_message = |Table { lv_tab } not found or not transparent|.
    RETURN.
  ENDIF.
  IF lv_cont <> 'C'.
    ev_message = |Table { lv_tab } has delivery class { lv_cont }: only customizing (C) tables are allowed|.
    RETURN.
  ENDIF.

  CREATE DATA lr_data TYPE (lv_tab).
  ASSIGN lr_data->* TO <ls_row>.

  IF iv_delete_first = 'X'.
    DELETE FROM (lv_tab).
  ENDIF.

  SPLIT iv_rows AT '|' INTO TABLE lt_rows.
  LOOP AT lt_rows INTO lv_row.
    CLEAR <ls_row>.
    ASSIGN COMPONENT 'MANDT' OF STRUCTURE <ls_row> TO <lv_fld>.
    IF sy-subrc = 0.
      <lv_fld> = sy-mandt.
    ENDIF.
    SPLIT lv_row AT ';' INTO TABLE lt_cols.
    LOOP AT lt_cols INTO lv_col.
      SPLIT lv_col AT '=' INTO lv_name lv_value.
      lv_name = to_upper( lv_name ).
      ASSIGN COMPONENT lv_name OF STRUCTURE <ls_row> TO <lv_fld>.
      IF sy-subrc <> 0.
        ev_message = |Field { lv_name } does not exist in { lv_tab }|.
        ROLLBACK WORK.
        RETURN.
      ENDIF.
      <lv_fld> = lv_value.
    ENDLOOP.
    MODIFY (lv_tab) FROM <ls_row>.
    IF sy-subrc <> 0.
      ev_message = |MODIFY failed for row { sy-tabix } (subrc { sy-subrc })|.
      ROLLBACK WORK.
      RETURN.
    ENDIF.
    ev_count = ev_count + 1.
  ENDLOOP.

  COMMIT WORK AND WAIT.
  ev_ok = 'X'.
  ev_message = |{ ev_count } row(s) written to { lv_tab }|.
ENDFUNCTION.
