FUNCTION znd_fm_tmg_gen
  IMPORTING
    VALUE(iv_table) TYPE tabname
    VALUE(iv_fugr) TYPE tvdir-area
    VALUE(iv_devclass) TYPE devclass DEFAULT '$TMP'
    VALUE(iv_authgrp) TYPE tddat-cclass DEFAULT '&NC&'
    VALUE(iv_mtype) TYPE char1 DEFAULT '1'
    VALUE(iv_liste) TYPE char4 DEFAULT '0001'
    VALUE(iv_detail) TYPE char4 DEFAULT '0000'
    VALUE(iv_pre) TYPE string OPTIONAL
    VALUE(iv_post) TYPE string OPTIONAL
    VALUE(iv_action) TYPE char10 DEFAULT 'CREATE'
  EXPORTING
    VALUE(ev_ok) TYPE char1
    VALUE(ev_message) TYPE string.

* Table Maintenance Generator (SE54 'Generated Objects' > Create/Change), Remote-Enabled.
* SAP ships NO non-dialog API for this, so the FM drives SE54 with batch input
* (CALL TRANSACTION ... MODE 'N'). The function group must already exist.
*   iv_mtype   1 = one-step, 2 = two-step
*   iv_pre     optional popup steps BEFORE the detail screen, iv_post AFTER the save:
*              "PROG;DYNPRO;FIELD=VALUE;...;OKCODE|PROG;..." (popups differ per system).
*   iv_action  CREATE = first generation (=CRMO > =GENE)
*              RESET  = existing TMG, regenerate the overview screen after a table field
*                       change (=RESE > 'Recreate maintenance screen' > overview screen)
* The message log (with the screen each message came from) is returned in ev_message so a
* failed run says exactly which screen the batch input stopped at.

  DATA: lt_bdc  TYPE STANDARD TABLE OF bdcdata,
        ls_bdc  TYPE bdcdata,
        lt_msg  TYPE STANDARD TABLE OF bdcmsgcoll,
        ls_msg  TYPE bdcmsgcoll,
        lv_text TYPE string,
        lv_tab  TYPE tabname,
        lv_cnt  TYPE i,
        ls_opt  TYPE ctu_params,
        lt_steps TYPE STANDARD TABLE OF string,
        lv_step TYPE string,
        lt_parts TYPE STANDARD TABLE OF string,
        lv_n    TYPE i,
        lv_prog TYPE string,
        lv_dyn  TYPE string,
        lv_part TYPE string,
        lv_f    TYPE string,
        lv_v    TYPE string,
        lv_okc  TYPE string.

  CLEAR: ev_ok, ev_message.
  lv_tab = to_upper( iv_table ).

  IF lv_tab(1) <> 'Z' AND lv_tab(1) <> 'Y'.
    ev_message = |Table { lv_tab } is outside the customer namespace (Z/Y)|.
    RETURN.
  ENDIF.

  DEFINE m_dyn.
    CLEAR ls_bdc.
    ls_bdc-program  = &1.
    ls_bdc-dynpro   = &2.
    ls_bdc-dynbegin = 'X'.
    APPEND ls_bdc TO lt_bdc.
  END-OF-DEFINITION.
  DEFINE m_fld.
    CLEAR ls_bdc.
    ls_bdc-fnam = &1.
    ls_bdc-fval = &2.
    APPEND ls_bdc TO lt_bdc.
  END-OF-DEFINITION.

  DEFINE m_steps.
    CLEAR lt_steps.
    IF &1 IS NOT INITIAL.
      SPLIT &1 AT '|' INTO TABLE lt_steps.
    ENDIF.
    LOOP AT lt_steps INTO lv_step.
      SPLIT lv_step AT ';' INTO TABLE lt_parts.
      lv_n = lines( lt_parts ).
      IF lv_n < 3.
        CONTINUE.
      ENDIF.
      lv_prog = lt_parts[ 1 ].
      lv_dyn  = lt_parts[ 2 ].
      m_dyn lv_prog lv_dyn.
      LOOP AT lt_parts INTO lv_part FROM 3 TO lv_n - 1.
        SPLIT lv_part AT '=' INTO lv_f lv_v.
        m_fld lv_f lv_v.
      ENDLOOP.
      lv_okc = lt_parts[ lv_n ].
      m_fld 'BDC_OKCODE' lv_okc.
    ENDLOOP.
  END-OF-DEFINITION.

  m_dyn 'SAPMSVIM' '0050'.
  m_fld 'VIMDYNFLDS-VIEWNAME' lv_tab.
  m_fld 'VIMDYNFLDS-ELEM_GEN' 'X'.
  m_fld 'BDC_OKCODE' '=CRMO'.

  m_steps iv_pre.

  SELECT SINGLE gendate, gentime FROM tvdir WHERE tabname = @lv_tab
    INTO @DATA(ls_gen_before).

  IF iv_action = 'RESET'.
    IF sy-subrc <> 0.
      ev_message = |Table { lv_tab } has no TMG yet, use CREATE|.
      RETURN.
    ENDIF.
    m_dyn 'SAPMSVIM' '0120'.
    m_fld 'BDC_OKCODE' '=RESE'.
    m_dyn 'SAPMSVIM' '1240'.
    m_fld 'VIMDYNFLDS-RES_DYNPRO' 'X'.
    m_fld 'BDC_OKCODE' '=O.K.'.
    m_dyn 'SAPMSVIM' '1243'.
    m_fld 'VIMDYNFLDS-LISTSCR' 'X'.
    IF iv_detail <> '0000' AND iv_detail IS NOT INITIAL.
      m_fld 'VIMDYNFLDS-DETAILSCR' 'X'.
    ENDIF.
    m_fld 'BDC_OKCODE' '=O.K.'.
    m_steps iv_post.
  ELSE.

  m_dyn 'SAPMSVIM' '0120'.
  m_fld 'TDDAT-CCLASS' iv_authgrp.
  m_fld 'TVDIR-AREA' iv_fugr.
  IF iv_devclass <> '$TMP'.
    m_fld 'TVDIR-DEVCLASS' iv_devclass.
  ENDIF.
  IF iv_mtype = '2'.
    m_fld 'VIMDYNFLDS-MTYPE2' 'X'.
  ELSE.
    m_fld 'VIMDYNFLDS-MTYPE1' 'X'.
  ENDIF.
  m_fld 'TVDIR-LISTE' iv_liste.
  IF iv_detail <> '0000' AND iv_detail IS NOT INITIAL.
    m_fld 'TVDIR-DETAIL' iv_detail.
  ENDIF.
  IF iv_devclass <> '$TMP'.
    m_fld 'VIMDYNFLDS-CORR_CON_S' 'X'.
  ENDIF.
  m_fld 'BDC_OKCODE' '=GENE'.

  m_steps iv_post.
  ENDIF.

  ls_opt-dismode  = 'N'.
  ls_opt-updmode  = 'S'.
  ls_opt-nobinpt  = space.
  ls_opt-racommit = 'X'.
  CALL TRANSACTION 'SE54' USING lt_bdc OPTIONS FROM ls_opt MESSAGES INTO lt_msg.
  DATA(lv_subrc) = sy-subrc.

  LOOP AT lt_msg INTO ls_msg.
    MESSAGE ID ls_msg-msgid TYPE 'S' NUMBER ls_msg-msgnr
            WITH ls_msg-msgv1 ls_msg-msgv2 ls_msg-msgv3 ls_msg-msgv4 INTO lv_text.
    ev_message = ev_message && |[{ ls_msg-msgtyp } { ls_msg-dyname }/{ ls_msg-dynumb }] { lv_text } ; |.
    lv_cnt = lv_cnt + 1.
  ENDLOOP.

  " success: CREATE = the TVDIR entry now exists; RESET = its generation stamp moved
  SELECT SINGLE area, gendate, gentime FROM tvdir WHERE tabname = @lv_tab
    INTO @DATA(ls_after).
  DATA(lv_area) = ls_after-area.
  IF iv_action = 'RESET'.
    IF ls_after-gendate <> ls_gen_before-gendate OR ls_after-gentime <> ls_gen_before-gentime.
      ev_ok = 'X'.
      ev_message = |TMG screens regenerated: { lv_tab } -> function group { lv_area } | && ev_message.
    ELSE.
      ev_message = |subrc { lv_subrc }, generation stamp unchanged. | && ev_message.
    ENDIF.
  ELSEIF sy-subrc = 0.
    ev_ok = 'X'.
    ev_message = |TMG generated: { lv_tab } -> function group { lv_area } | && ev_message.
  ELSE.
    ev_message = |subrc { lv_subrc }, no TVDIR entry yet. | && ev_message.
  ENDIF.

ENDFUNCTION.
