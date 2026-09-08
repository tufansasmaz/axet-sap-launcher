FUNCTION znd_fm_add_cua_button
  IMPORTING
    VALUE(iv_program)  TYPE scrhprog
    VALUE(iv_status)   TYPE rsmpe_sta-code
    VALUE(iv_fcode)    TYPE rsmpe_but-code
    VALUE(iv_fun_text) TYPE rsmpe_funt-fun_text DEFAULT 'Kalemler'
    VALUE(iv_icon_id)  TYPE rsmpe_funt-icon_id  DEFAULT '@1F@'
    VALUE(iv_butcode)  TYPE rsmpe_sta-butcode   OPTIONAL
    VALUE(iv_devclass) TYPE devclass             OPTIONAL
    VALUE(iv_mode)     TYPE char10               DEFAULT 'WRITE'
    VALUE(iv_modal)    TYPE char1                DEFAULT '-'
    VALUE(iv_but_group) TYPE char10              DEFAULT 'BUTCODE'
  EXPORTING
    VALUE(ev_rc)       TYPE i
    VALUE(ev_message)  TYPE string.

* RFC-enabled helper: adds ONE application-toolbar push button to an
* existing CUA status (FETCH -> modify in-memory -> WRITE -> GENERATE).
*
* Third generator in ZND_FG_AUTO_GEN, alongside ZND_FM_SCREEN_GEN (screen +
* GUI status) and ZND_FM_SCREEN_FIELDS (label/value layout). The status must
* already exist - this FM only adds to it, it never creates one. Called over
* /sap/bc/soap/rfc: RS_CUA_INTERNAL_WRITE needs a dialog context and answers
* 400 "Session Timed Out" from classrun/ADT.
*
* IMPORTANT (classic CUA limitation, verified live 2026-09-03):
* the application toolbar button code (RSMPE_BUT-CODE, domain GUI_BCODE)
* is HARD-LIMITED to 4 characters - unlike menu/pfkey function codes
* (GUI_FUNC, 20 chars). IV_FCODE must be <= 4 characters or SAP silently
* truncates it and the button never binds to any function. The SAME
* 4-char code is used for FUN/SET/PFK/BUT so everything lines up.
*
* Also: RSMPE_STA-BUTCODE is the toolbar GROUP a status points to; if
* it is empty (as it is after ZND_FM_SCREEN_GEN's "clean toolbar" pass,
* which deliberately clears it) NO button can ever show regardless of
* the BUT table content. This FM auto-assigns one (IV_BUTCODE, default
* = last 4 chars of IV_STATUS) when the status has none yet.
*
* Idempotent: if fcode already exists in FUN, returns rc=2, no rewrite.

  DATA: adm  TYPE rsmpe_adm,
        sta  TYPE STANDARD TABLE OF rsmpe_stat,
        fun  TYPE STANDARD TABLE OF rsmpe_funt,
        men  TYPE STANDARD TABLE OF rsmpe_men,
        mtx  TYPE STANDARD TABLE OF rsmpe_mnlt,
        act  TYPE STANDARD TABLE OF rsmpe_act,
        but  TYPE STANDARD TABLE OF rsmpe_but,
        pfk  TYPE STANDARD TABLE OF rsmpe_pfk,
        sett TYPE STANDARD TABLE OF rsmpe_staf,
        doc  TYPE STANDARD TABLE OF rsmpe_atrt,
        tit  TYPE STANDARD TABLE OF rsmpe_titt,
        biv  TYPE STANDARD TABLE OF rsmpe_buts,
        l_trkey    TYPE trkey,
        ls_fun     TYPE rsmpe_funt,
        ls_but     TYPE rsmpe_but,
        ls_set     TYPE rsmpe_staf,
        lv_max_no  TYPE cua_butno,
        lv_butcode TYPE rsmpe_sta-butcode.

  CLEAR: ev_rc, ev_message.

  IF strlen( iv_fcode ) > 4.
    ev_rc = 90.
    ev_message = |IV_FCODE '{ iv_fcode }' is longer than 4 chars - toolbar buttons (RSMPE_BUT-CODE) are hard-limited to 4; use a 4-char code.|.
    RETURN.
  ENDIF.

  CALL FUNCTION 'RS_CUA_INTERNAL_FETCH'
    EXPORTING
      program         = iv_program
      language        = sy-langu
      state           = 'A'
    IMPORTING
      adm             = adm
    TABLES
      sta             = sta
      fun             = fun
      men             = men
      mtx             = mtx
      act             = act
      but             = but
      pfk             = pfk
      set             = sett
      doc             = doc
      tit             = tit
      biv             = biv
    EXCEPTIONS
      not_found       = 1
      unknown_version = 2
      OTHERS          = 3.
  IF sy-subrc <> 0.
    ev_rc = sy-subrc.
    ev_message = |RS_CUA_INTERNAL_FETCH failed subrc={ sy-subrc }|.
    RETURN.
  ENDIF.

* READ: report every table a visible button depends on. "The code is in FUN"
* is NOT the same as "a button shows" - a function can sit in FUN while its
* BUT row, its ACT entry or the status's own BUTCODE group is missing, and
* each of those alone makes the button invisible with no error anywhere.
* Verified on NS4 2026-09-03 with ZOO031_P_PURCHASE_ORDER/STAT0100.
  IF iv_mode = 'READ'.
    READ TABLE sta ASSIGNING FIELD-SYMBOL(<rsta>) WITH KEY code = iv_status.
    IF sy-subrc <> 0.
      ev_rc = 91.
      ev_message = |Status { iv_status } not found in { iv_program }|.
      RETURN.
    ENDIF.
    ev_rc = 0.
*   MODAL is the status TYPE (RSMPE_STA has exactly CODE, MODAL, ACTCODE,
*   PFKCODE, BUTCODE - there is no TYPE or MENCODE field; naming them is how
*   an earlier version of this READ mode failed to activate).
*     ' ' normal dynpro status -> application toolbar is rendered
*     'D' modal dialog box
*     'L' list status -> the LIST processor draws the furniture and no dynpro
*         application toolbar appears, however correct STA/BUT/ACT/SET are.
*   A status copied from an ALV donor such as SAPLKKBL/STANDARD inherits 'L'.
    ev_message = |STATUS { iv_status } modal='{ <rsta>-modal }' butcode='{ <rsta>-butcode }' actcode='{ <rsta>-actcode }' pfkcode='{ <rsta>-pfkcode }'|.
    ev_message = ev_message && | FUN:|.
    LOOP AT fun INTO ls_fun.
      ev_message = ev_message && | [{ ls_fun-code }/{ ls_fun-fun_text }/tt={ ls_fun-text_type }]|.
    ENDLOOP.
    ev_message = ev_message && | BUT:|.
    LOOP AT but INTO ls_but.
      ev_message = ev_message && | [pfk={ ls_but-pfk_code } code={ ls_but-code } no={ ls_but-no }]|.
    ENDLOOP.
    ev_message = ev_message && | ACT(this status):|.
    LOOP AT act ASSIGNING FIELD-SYMBOL(<ract>) WHERE code = <rsta>-actcode.
      ev_message = ev_message && | { <ract>-menucode }|.
    ENDLOOP.
    ev_message = ev_message && | SET(this status):|.
    LOOP AT sett ASSIGNING FIELD-SYMBOL(<rset>) WHERE status = iv_status.
      ev_message = ev_message && | { <rset>-function }|.
    ENDLOOP.
    ev_message = ev_message && | PFK:|.
    LOOP AT pfk ASSIGNING FIELD-SYMBOL(<rpfk>).
      ev_message = ev_message && | [{ <rpfk>-code }]|.
    ENDLOOP.
    RETURN.
  ENDIF.

* GENERATE: re-run RS_CUA_GENERATE without touching the tables.
* The kernel renders the GENERATED status, not the CUA tables, and the two can
* disagree: if an earlier run wrote the tables and its generate failed, every
* later run takes the idempotent branch below ("already in CUA"), returns before
* the generate, and the button stays invisible forever with all four tables
* looking correct. Re-generating is cheap and side-effect-free.
  IF iv_mode = 'GENERATE'.
    CALL FUNCTION 'RS_CUA_GENERATE'
      EXPORTING
        objectname       = iv_program
        without_messages = 'X'
        without_checks   = 'X'
      EXCEPTIONS
        OTHERS           = 5.
    ev_rc = sy-subrc.
    ev_message = |RS_CUA_GENERATE({ iv_program }) rc={ sy-subrc }|.
    RETURN.
  ENDIF.

* The status is read BEFORE the idempotency check on purpose. IV_MODAL has to be
* applied even when the function is already there: the case this exists for is a
* CUA whose four tables are all correct and whose button still does not show,
* and returning early on "already in CUA" is what kept that unfixable.
  READ TABLE sta ASSIGNING FIELD-SYMBOL(<sta>) WITH KEY code = iv_status.
  IF sy-subrc <> 0.
    ev_rc = 91.
    ev_message = |Status { iv_status } not found in { iv_program }'s CUA|.
    RETURN.
  ENDIF.

* 'N' rather than a literal space for "normal": the value crosses a SOAP body,
* and a lone space in an XML element is not reliably delivered as one.
  DATA(lv_modal_changed) = abap_false.
  DATA(lv_want_modal) = iv_modal.
  IF lv_want_modal = 'N'.
    lv_want_modal = space.
  ENDIF.
  IF iv_modal <> '-' AND <sta>-modal <> lv_want_modal.
    ev_message = |modal '{ <sta>-modal }'->'{ lv_want_modal }'; |.
    <sta>-modal = lv_want_modal.
    lv_modal_changed = abap_true.
  ENDIF.

* "Already in CUA" must mean WIRED UP, not just present in FUN. A visible button
* needs all five: FUN, a non-empty BUTCODE group on the status, a BUT row in
* that group, an ACT entry and a SET entry. Testing only FUN is what made this
* unrepairable on NS4 2026-09-03: regenerating the screen cleared BUTCODE, every
* later call answered "already in CUA (idempotent)" and returned without putting
* it back, so the function stayed in FUN and no button ever appeared again.
* The group is resolved BEFORE the wired test, or the test asks about the wrong
* table: with IV_BUT_GROUP='PFKCODE' the row belongs under PFKCODE, and checking
* BUTCODE would find the old row, answer "already wired" and return without ever
* writing the one that was asked for.
  IF iv_but_group = 'PFKCODE'.
    lv_butcode = <sta>-pfkcode.
  ELSEIF <sta>-butcode IS INITIAL.
    IF iv_butcode IS NOT INITIAL.
      lv_butcode = iv_butcode.
    ELSE.
      lv_butcode = iv_status+4(4).  " last 4 chars of e.g. STAT0100 -> 0100
    ENDIF.
  ELSE.
    lv_butcode = <sta>-butcode.
  ENDIF.

  DATA(lv_wired) = xsdbool(
        line_exists( fun[ code = iv_fcode ] )
    AND lv_butcode IS NOT INITIAL
    AND line_exists( pfk[ code = <sta>-pfkcode funcode = iv_fcode ] )
    AND line_exists( act[ code = <sta>-actcode menucode = iv_fcode ] )
    AND line_exists( sett[ status = iv_status function = iv_fcode ] ) ).

  IF lv_wired = abap_true AND lv_modal_changed = abap_false.
    ev_rc = 2.
    ev_message = |{ iv_fcode } already wired in { iv_status } (idempotent)|.
*   Regenerate anyway. Returning here without it is how a correct set of CUA
*   tables ends up paired with a stale generated status that shows no button.
    CALL FUNCTION 'RS_CUA_GENERATE'
      EXPORTING
        objectname       = iv_program
        without_messages = 'X'
        without_checks   = 'X'
      EXCEPTIONS
        OTHERS           = 5.
    ev_message = ev_message && |; regenerate rc={ sy-subrc }|.
    RETURN.
  ENDIF.

  IF NOT line_exists( fun[ code = iv_fcode ] ).
    ls_fun-code      = iv_fcode.
    ls_fun-fun_text  = iv_fun_text.
    ls_fun-icon_id   = iv_icon_id.
    ls_fun-text_type = 'S'.  " con_text_static (RSMPECON) - required or WRITE drops fun_text silently
    APPEND ls_fun TO fun.
  ENDIF.

* IV_MODAL: '-' leave as is (default), ' ' make it a normal dynpro status,
* 'D' make it a modal dialog box. This is the field that decides whether the
* application toolbar is drawn AT ALL: a 'D' status renders its buttons inside
* the popup frame and shows no toolbar, so a button added to one is invisible
* however correct FUN/BUT/ACT/SET are. Found on NS4 2026-09-03 -- STAT0100 was
* 'D' while its screen is called full-screen (CALL SCREEN 0100), and every
* table checked out while nothing appeared.
* Not corrected automatically: a status whose screen really is a popup
* (CALL SCREEN n STARTING AT ...) must STAY 'D'. Only the caller knows which.
* WHICH FIELD KEYS THE BUT TABLE. RSMPE_STA has two group pointers and the
* dictionary does not settle which one the toolbar reads:
*   BUTCODE  CHAR 4,  no data element
*   PFKCODE  CHAR 20, domain GUI_CODE -- the SAME domain as RSMPE_BUT-PFK_CODE
* The donor SAPLKKBL/STANDARD carries the same value ('0021') in both, so its
* data cannot tell them apart either. IV_BUT_GROUP makes the choice testable
* instead of assumed: 'BUTCODE' (default) or 'PFKCODE'.
* Group already resolved above; only the status field still needs writing back,
* and only in the BUTCODE model -- with PFKCODE the status already points there.
  IF iv_but_group = 'PFKCODE'.
    ev_message = ev_message && |BUT group from PFKCODE ('{ lv_butcode }'); |.
  ELSEIF <sta>-butcode IS INITIAL.
    <sta>-butcode = lv_butcode.
  ENDIF.

* CRITICAL: ACT is the ACTIVE-FUNCTION list = validity. A fcode missing
* here is invalid at runtime - the kernel neither renders its toolbar
* button nor accepts it via PF-STATUS (silently invisible, or runtime
* 00256 "select a valid function" if forced). Register it under the
* status's own actcode group.
  IF NOT line_exists( act[ code = <sta>-actcode menucode = iv_fcode ] ).
    APPEND VALUE #( code = <sta>-actcode menucode = iv_fcode ) TO act.
  ENDIF.

* THE APPLICATION TOOLBAR IS THE PFK TABLE, NOT BUT.
*
* Everything above (FUN, ACT, SET, BUTCODE, MODAL) was necessary and none of it
* was sufficient: with all five correct, SE41 still showed an empty application
* toolbar for this status. Typing the same function into SE41's toolbar grid by
* hand explained why -- SAP answered
*     "TEST is not assigned to a function key. Select a function key."
* and after choosing one and activating, RS_CUA_INTERNAL_FETCH showed our BUT
* rows GONE, the function still in FUN, and RSMPE_PFK grown from 35 rows to 866.
* Measured on NS4 2026-09-04 with ZFBL_P_BUTTON_TEST.
*
* RSMPE_PFK ("Menu Painter: Function key assignments (4.0 onwards)") is
*     CODE     the pfkey GROUP -- the status's own PFKCODE
*     PFNO     the F-key number
*     FUNCODE  the function
* A toolbar button IS an F-key assignment; the toolbar renders the assigned
* functions. RSMPE_BUT is the pre-4.0 form and writing it changes nothing --
* which is exactly how this stayed invisible while every table we inspected
* looked correct.
  IF NOT line_exists( pfk[ code = <sta>-pfkcode funcode = iv_fcode ] ).
*   Lowest free key in the status's own group. F1/F3/F12/F15 and friends carry
*   fixed meanings (help, back, cancel, exit), so start above them rather than
*   taking the numerically first hole.
    DATA lv_pfno TYPE cua_pfno.
    CLEAR lv_pfno.
    DO 40 TIMES.
      lv_pfno = sy-index + 4.        " start at F5
      IF NOT line_exists( pfk[ code = <sta>-pfkcode pfno = lv_pfno ] ).
        EXIT.
      ENDIF.
      CLEAR lv_pfno.
    ENDDO.
    IF lv_pfno = 0.
      ev_rc = 92.
      ev_message = |No free function key in group { <sta>-pfkcode } for { iv_fcode }|.
      RETURN.
    ENDIF.
    APPEND VALUE #( code    = <sta>-pfkcode
                    pfno    = lv_pfno
                    funcode = iv_fcode ) TO pfk.
    ev_message = ev_message && |PFK { <sta>-pfkcode }/F{ lv_pfno } = { iv_fcode }; |.
  ENDIF.

  IF NOT line_exists( sett[ status = iv_status function = iv_fcode ] ).
    ls_set-status   = iv_status.
    ls_set-function = iv_fcode.
    APPEND ls_set TO sett.
  ENDIF.

  IF iv_devclass IS NOT INITIAL.
    l_trkey-devclass = iv_devclass.
  ELSE.
    SELECT SINGLE devclass FROM tadir INTO l_trkey-devclass
      WHERE pgmid = 'R3TR' AND object = 'PROG' AND obj_name = iv_program.
  ENDIF.
  l_trkey-obj_type = 'PROG'.
  l_trkey-obj_name = iv_program.
  l_trkey-sub_type = 'CUAD'.
  l_trkey-sub_name = iv_program.

  CALL FUNCTION 'RS_CUA_INTERNAL_WRITE'
    EXPORTING
      program  = iv_program
      language = sy-langu
      tr_key   = l_trkey
      adm      = adm
      state    = 'A'
    TABLES
      sta      = sta
      fun      = fun
      men      = men
      mtx      = mtx
      act      = act
      but      = but
      pfk      = pfk
      set      = sett
      doc      = doc
      tit      = tit
      biv      = biv
    EXCEPTIONS
      not_found    = 1
      invalid_data = 2
      OTHERS       = 3.
  IF sy-subrc <> 0.
    ev_rc = 10 + sy-subrc.
    ev_message = |RS_CUA_INTERNAL_WRITE failed subrc={ sy-subrc }|.
    RETURN.
  ENDIF.

  CALL FUNCTION 'RS_CUA_GENERATE'
    EXPORTING
      objectname       = iv_program
      without_messages = 'X'
      without_checks   = 'X'
    EXCEPTIONS
      OTHERS           = 5.
  ev_rc = sy-subrc.
  ev_message = |{ iv_fcode } added to { iv_status } (butcode={ lv_butcode }); generate rc={ sy-subrc }|.

ENDFUNCTION.
