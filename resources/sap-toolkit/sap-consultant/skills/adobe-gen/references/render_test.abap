"! Render test for an Adobe Form: call the generated form module through ADS and print the PDF.
"!
"! Replace the @@...@@ placeholders, create this as a local class in $TMP, run it with the
"! classrun tool, save the console output to a file and give it to scripts/render_pdf_check.py.
"! Delete the class afterwards.
"!
"!   @@CLASS@@        a throw-away class name (customer namespace, e.g. ZSD001_CL_RENDER_TMP)
"!   @@FORM@@         the form to render
"!   @@P1@@ / @@P1_TYPE@@   interface parameter 1 and its DDIC type (a structure)
"!   @@P2@@ / @@P2_TYPE@@   interface parameter 2 and its table type
"!   @@COPIES@@       how many times the test rows are repeated: 1 for a single page, 40 to see
"!                    the page break and the repeated table header
"!
"! TEST VALUES ONLY: no real customer, material or person data in the rows below.
"!
"! Why each line is here (every one was a blank page once):
"!   - FP_JOB_OPEN with getpdf = X: the PDF comes back instead of being spooled.
"!   - /1BCDWB/DOCPARAMS (language, country) MUST be passed. Without it ADS returns an empty
"!     page (about 4600 bytes) from a program although SFP's F8 preview is fine.
"!   - The PDF is in the form module's /1BCDWB/FORMOUTPUT parameter. FP_JOB_CLOSE's
"!     e_result has no PDF.
"!   - The module name comes from FP_FUNCTION_MODULE_NAME; it differs per system.
CLASS @@CLASS@@ DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS @@CLASS@@ IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    DATA: ls_p1 TYPE @@P1_TYPE@@,
          lt_p2 TYPE @@P2_TYPE@@.

*   ---- build TEST data for the two parameters here ------------------------------------
*   ls_p1-field = 'TEST-001'.
*   APPEND VALUE #( field = 'TEST ROW' ) TO lt_p2.
*   --------------------------------------------------------------------------------------

    DATA(lv_copies) = @@COPIES@@.
    IF lv_copies > 1 AND lt_p2 IS NOT INITIAL.
      DATA(lt_base) = lt_p2.
      DO lv_copies - 1 TIMES.
        APPEND LINES OF lt_base TO lt_p2.
      ENDDO.
    ENDIF.

    DATA ls_params TYPE sfpoutputparams.
    ls_params-nodialog = abap_true.
    ls_params-getpdf   = abap_true.
    ls_params-dest     = 'LP01'.        " any valid output device; nothing is printed with getpdf
    CALL FUNCTION 'FP_JOB_OPEN'
      CHANGING
        ie_outputparams = ls_params
      EXCEPTIONS
        OTHERS          = 5.
    IF sy-subrc <> 0.
      out->write( |FP_JOB_OPEN failed, subrc { sy-subrc }| ).
      RETURN.
    ENDIF.

    DATA lv_fm TYPE funcname.
    CALL FUNCTION 'FP_FUNCTION_MODULE_NAME'
      EXPORTING
        i_name     = '@@FORM@@'
      IMPORTING
        e_funcname = lv_fm.
    out->write( |form @@FORM@@ -> function module { lv_fm }| ).

    DATA(ls_doc) = VALUE sfpdocparams( langu = 'T' country = 'TR' ).
    DATA ls_fo TYPE fpformoutput.
    CALL FUNCTION lv_fm
      EXPORTING
        /1bcdwb/docparams  = ls_doc
        @@P1@@             = ls_p1
        @@P2@@             = lt_p2
      IMPORTING
        /1bcdwb/formoutput = ls_fo
      EXCEPTIONS
        OTHERS             = 4.
    out->write( |call subrc { sy-subrc } { sy-msgty }{ sy-msgid }{ sy-msgno } { sy-msgv1 } rows { lines( lt_p2 ) }| ).
    CALL FUNCTION 'FP_JOB_CLOSE' EXCEPTIONS OTHERS = 4.

    out->write( |pdf { xstrlen( ls_fo-pdf ) } bytes| ).
    DATA(lv_b64) = cl_http_utility=>encode_x_base64( ls_fo-pdf ).
    DATA(lv_len) = strlen( lv_b64 ).
    DATA(lv_off) = 0.
    WHILE lv_off < lv_len.
      DATA(lv_n) = nmin( val1 = 200 val2 = lv_len - lv_off ).
      out->write( |B64:{ substring( val = lv_b64 off = lv_off len = lv_n ) }| ).
      lv_off = lv_off + lv_n.
    ENDWHILE.
  ENDMETHOD.
ENDCLASS.
