FUNCTION znd_fm_tcode_gen
  IMPORTING
    VALUE(iv_action) TYPE char10 DEFAULT 'CREATE'
    VALUE(iv_tcode) TYPE tstc-tcode
    VALUE(iv_text) TYPE tstct-ttext OPTIONAL
    VALUE(iv_type) TYPE char1 DEFAULT 'R'
    VALUE(iv_program) TYPE trdir-name OPTIONAL
    VALUE(iv_viewname) TYPE tabname OPTIONAL
    VALUE(iv_update) TYPE char1 DEFAULT 'X'
    VALUE(iv_devclass) TYPE devclass DEFAULT '$TMP'
    VALUE(iv_transport) TYPE trkorr OPTIONAL
  EXPORTING
    VALUE(ev_ok) TYPE char1
    VALUE(ev_message) TYPE string.

* Generic transaction code generator (SE93 equivalent), Remote-Enabled.
*   iv_action  CREATE | DELETE
*   iv_type    R = report transaction (needs iv_program)
*              P = parameter transaction calling SM30 for iv_viewname
* Wraps RPY_TRANSACTION_INSERT / RPY_TRANSACTION_DELETE (not RFC-enabled themselves).
* Standard authority checks (S_DEVELOP / S_TCODE) still run inside the wrappers.

  DATA: lv_tcode TYPE tstc-tcode,
        lv_program TYPE trdir-name,
        lt_param TYPE STANDARD TABLE OF rsparam,
        ls_param TYPE rsparam,
        lv_msg   TYPE string.

  CLEAR: ev_ok, ev_message.
  lv_tcode = to_upper( iv_tcode ).

  IF lv_tcode(1) <> 'Z' AND lv_tcode(1) <> 'Y'.
    ev_message = |Transaction { lv_tcode } is outside the customer namespace (Z/Y)|.
    RETURN.
  ENDIF.

  IF iv_action = 'DELETE'.
    CALL FUNCTION 'RPY_TRANSACTION_DELETE'
      EXPORTING
        transaction        = lv_tcode
        transport_number   = iv_transport
        suppress_corr_check = COND #( WHEN iv_devclass = '$TMP' THEN 'X' ELSE space )
      EXCEPTIONS
        not_excecuted      = 1
        object_not_found   = 2
        OTHERS             = 3.
    IF sy-subrc = 0.
      COMMIT WORK AND WAIT.
      ev_ok = 'X'.
      ev_message = |Transaction { lv_tcode } deleted|.
    ELSE.
      MESSAGE ID sy-msgid TYPE 'S' NUMBER sy-msgno
              WITH sy-msgv1 sy-msgv2 sy-msgv3 sy-msgv4 INTO lv_msg.
      ev_message = |Delete failed (subrc { sy-subrc }): { lv_msg }|.
    ENDIF.
    RETURN.
  ENDIF.

  IF iv_type = 'P'.
    IF iv_viewname IS INITIAL.
      ev_message = 'iv_viewname is required for a parameter transaction'.
      RETURN.
    ENDIF.
    ls_param-field = 'VIEWNAME'.
    ls_param-value = to_upper( iv_viewname ).
    APPEND ls_param TO lt_param.
    CLEAR ls_param.
    ls_param-field = 'UPDATE'.
    ls_param-value = iv_update.
    APPEND ls_param TO lt_param.

    CALL FUNCTION 'RPY_TRANSACTION_INSERT'
      EXPORTING
        transaction             = lv_tcode
        shorttext               = iv_text
        development_class       = iv_devclass
        transport_number        = iv_transport
        transaction_type        = 'P'
        called_transaction      = 'SM30'
        called_transaction_skip = 'X'
        suppress_corr_check     = COND #( WHEN iv_devclass = '$TMP' THEN 'X' ELSE space )
      TABLES
        param_values            = lt_param
      EXCEPTIONS
        cancelled               = 1
        already_exist           = 2
        permission_error        = 3
        name_not_allowed        = 4
        name_conflict           = 5
        illegal_type            = 6
        object_inconsistent     = 7
        db_access_error         = 8
        OTHERS                  = 9.
  ELSE.
    IF iv_program IS INITIAL.
      ev_message = 'iv_program is required for a report transaction'.
      RETURN.
    ENDIF.
    lv_program = to_upper( iv_program ).
    CALL FUNCTION 'RPY_TRANSACTION_INSERT'
      EXPORTING
        transaction         = lv_tcode
        program             = lv_program
        shorttext           = iv_text
        development_class   = iv_devclass
        transport_number    = iv_transport
        transaction_type    = 'R'
        suppress_corr_check = COND #( WHEN iv_devclass = '$TMP' THEN 'X' ELSE space )
      EXCEPTIONS
        cancelled           = 1
        already_exist       = 2
        permission_error    = 3
        name_not_allowed    = 4
        name_conflict       = 5
        illegal_type        = 6
        object_inconsistent = 7
        db_access_error     = 8
        OTHERS              = 9.
  ENDIF.

  IF sy-subrc = 0.
    COMMIT WORK AND WAIT.
    ev_ok = 'X'.
    ev_message = |Transaction { lv_tcode } created|.
  ELSEIF sy-subrc = 2.
    ev_message = |Transaction { lv_tcode } already exists|.
  ELSE.
    MESSAGE ID sy-msgid TYPE 'S' NUMBER sy-msgno
            WITH sy-msgv1 sy-msgv2 sy-msgv3 sy-msgv4 INTO lv_msg.
    ev_message = |Create failed (subrc { sy-subrc }): { lv_msg }|.
  ENDIF.

ENDFUNCTION.
