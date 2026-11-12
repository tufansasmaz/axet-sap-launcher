FUNCTION znd_fm_dynpro_dump
  IMPORTING
    VALUE(iv_program) TYPE scrhprog
    VALUE(iv_dynpro) TYPE scrfdynnr
  EXPORTING
    VALUE(ev_text) TYPE string.

* Read-only dynpro inspector (Remote-Enabled): lists screen fields (type, name, text)
* and the flow logic, so a BDC / batch-input recipe can be written without SE51.

  DATA: ls_header TYPE rpy_dyhead,
        lt_cont   TYPE dycatt_tab,
        lt_f2c    TYPE dyfatc_tab,
        ls_f2c    TYPE LINE OF dyfatc_tab,
        lt_flow   TYPE STANDARD TABLE OF rpy_dyflow,
        ls_flow   TYPE rpy_dyflow,
        lt_native TYPE STANDARD TABLE OF d021s,
        lv_nl     TYPE string.

  CLEAR ev_text.
  lv_nl = cl_abap_char_utilities=>newline.

  CALL FUNCTION 'RPY_DYNPRO_READ'
    EXPORTING
      progname              = iv_program
      dynnr                 = iv_dynpro
      suppress_exist_checks = 'X'
      suppress_corr_checks  = 'X'
    TABLES
      containers            = lt_cont
      fields_to_containers  = lt_f2c
      flow_logic            = lt_flow
      fields_list           = lt_native
    EXCEPTIONS
      OTHERS                = 4.
  IF sy-subrc <> 0.
    ev_text = |RPY_DYNPRO_READ subrc { sy-subrc }|.
    RETURN.
  ENDIF.

  LOOP AT lt_f2c INTO ls_f2c.
    ev_text = ev_text && |F;{ ls_f2c-type };{ ls_f2c-name };{ ls_f2c-text };{ ls_f2c-length };{ ls_f2c-push_fcode };{ ls_f2c-group1 }| && lv_nl.
  ENDLOOP.
  LOOP AT lt_flow INTO ls_flow.
    ev_text = ev_text && |L;{ ls_flow-line }| && lv_nl.
  ENDLOOP.
ENDFUNCTION.
