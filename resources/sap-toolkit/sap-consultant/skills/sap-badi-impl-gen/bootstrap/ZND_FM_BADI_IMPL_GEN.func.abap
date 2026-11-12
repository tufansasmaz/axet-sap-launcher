FUNCTION znd_fm_badi_impl_gen
  IMPORTING
    VALUE(iv_kind) TYPE char10 DEFAULT 'NEW'
    VALUE(iv_spot) TYPE enhspotname OPTIONAL
    VALUE(iv_badi) TYPE char30
    VALUE(iv_enhname) TYPE enhname OPTIONAL
    VALUE(iv_impl) TYPE char30
    VALUE(iv_class) TYPE seoclsname
    VALUE(iv_text) TYPE char72 OPTIONAL
    VALUE(iv_active) TYPE char1 DEFAULT 'X'
    VALUE(iv_devclass) TYPE devclass DEFAULT '$TMP'
    VALUE(iv_transport) TYPE trkorr OPTIONAL
    VALUE(iv_program) TYPE progname OPTIONAL
    VALUE(iv_full_name) TYPE string OPTIONAL
    VALUE(iv_source) TYPE string OPTIONAL
    VALUE(iv_enhmode) TYPE char1 DEFAULT 'D'
  EXPORTING
    VALUE(ev_ok) TYPE char1
    VALUE(ev_message) TYPE string.

* BAdI implementation generator (SE19 equivalent), Remote-Enabled.
*   iv_kind NEW     = new (kernel) BAdI: enhancement implementation iv_enhname with
*                     BAdI implementation iv_impl for spot iv_spot / BAdI iv_badi.
*                     iv_class must already exist and implement the BAdI interface.
*                     API: CL_ENH_FACTORY=>CREATE_ENHANCEMENT + CL_ENH_TOOL_BADI_IMPL.
*   iv_kind HOOK    = source code enhancement (ENHO, tool HOOK_IMPL) at an explicit
*                     enhancement point / implicit point of main program iv_program.
*                     iv_full_name e.g. \PR:SAPMV45A\EX:BELEG_SICHERN_14\EI (explicit,
*                     iv_enhmode D) or \PR:SAPMV45A\FO:<form>\SE:BEGIN\EI (implicit, S).
*                     iv_source = ABAP lines separated by newline. iv_spot = the point's spot
*                     (explicit only). iv_impl/iv_class are not used (pass iv_enhname twice).
*   iv_kind CLASSIC = classic BAdI (SXCI): NOT supported, returns a message only
*                     (SXO_IMPL_CREATE needs SAP GUI, see the CLASSIC branch).
* Customer namespace only. Standard authority / CTS checks run inside the SAP APIs.

  DATA: lv_devclass TYPE devclass,
        lv_trkorr   TYPE trkorr.

  CLEAR: ev_ok, ev_message.
  lv_devclass = to_upper( iv_devclass ).
  lv_trkorr   = iv_transport.

  " ---- guards -----------------------------------------------------------
  IF iv_kind = 'HOOK'.
    " no BAdI implementation / class involved
  ELSEIF iv_impl(1) <> 'Z' AND iv_impl(1) <> 'Y'.
    ev_message = |Implementation { iv_impl } is outside the customer namespace (Z/Y)|.
    RETURN.
  ENDIF.
  IF iv_kind <> 'HOOK' AND iv_class(1) <> 'Z' AND iv_class(1) <> 'Y'.
    ev_message = |Class { iv_class } is outside the customer namespace (Z/Y)|.
    RETURN.
  ENDIF.
  IF lv_devclass(1) <> '$' AND lv_trkorr IS INITIAL.
    ev_message = |Package { lv_devclass } is transportable: a transport request is required|.
    RETURN.
  ENDIF.

  CASE to_upper( iv_kind ).

    WHEN 'NEW'.
      DATA: lo_tool TYPE REF TO if_enh_tool,
            lo_badi TYPE REF TO cl_enh_tool_badi_impl,
            lx_enh  TYPE REF TO cx_enh_root.

      IF iv_enhname IS INITIAL OR iv_spot IS INITIAL.
        ev_message = 'iv_enhname and iv_spot are required for a new BAdI'.
        RETURN.
      ENDIF.
      IF iv_enhname(1) <> 'Z' AND iv_enhname(1) <> 'Y'.
        ev_message = |Enhancement { iv_enhname } is outside the customer namespace (Z/Y)|.
        RETURN.
      ENDIF.

      TRY.
          cl_enh_factory=>create_enhancement(
            EXPORTING
              enhname     = iv_enhname
              enhtype     = cl_abstract_enh_tool_redef=>credefinition
              enhtooltype = cl_enh_tool_badi_impl=>tooltype
              dark        = abap_true
            IMPORTING
              enhancement = lo_tool
            CHANGING
              trkorr      = lv_trkorr
              devclass    = lv_devclass ).

          lo_badi ?= lo_tool.
          lo_badi->set_spot_name( iv_spot ).
          lo_badi->add_implementation( VALUE enh_badi_impl_data(
            spot_name      = iv_spot
            badi_name      = iv_badi
            impl_name      = iv_impl
            impl_class     = iv_class
            active         = iv_active
            impl_shorttext = iv_text ) ).
          IF iv_text IS NOT INITIAL.
            lo_tool->if_enh_object_docu~set_shorttext( CONV string( iv_text ) ).
          ENDIF.

          lo_tool->if_enh_object~save(
            EXPORTING run_dark = abap_true
            CHANGING  trkorr   = lv_trkorr
                      devclass = lv_devclass ).
          lo_tool->if_enh_object~activate(
            EXPORTING run_dark = abap_true
            CHANGING  trkorr   = lv_trkorr
                      devclass = lv_devclass ).
          lo_tool->if_enh_object~unlock( ).

          COMMIT WORK AND WAIT.
          ev_ok = 'X'.
          ev_message = |Enhancement implementation { iv_enhname } / BAdI implementation { iv_impl } | &&
                       |created for { iv_badi } (class { iv_class }, request { lv_trkorr })|.
        CATCH cx_enh_root INTO lx_enh.
          IF lo_tool IS BOUND.
            TRY.
                lo_tool->if_enh_object~unlock( ).
              CATCH cx_enh_root ##NO_HANDLER.
            ENDTRY.
          ENDIF.
          ROLLBACK WORK.
          ev_message = |{ cl_abap_classdescr=>get_class_name( lx_enh ) }: { lx_enh->get_text( ) }|.
      ENDTRY.

    WHEN 'HOOK'.
      DATA: lo_htool TYPE REF TO if_enh_tool,
            lo_hook  TYPE REF TO cl_enh_tool_hook_impl,
            lt_src   TYPE rswsourcet,
            lx_henh  TYPE REF TO cx_enh_root.

      IF iv_enhname IS INITIAL OR iv_program IS INITIAL OR iv_full_name IS INITIAL
      OR iv_source IS INITIAL.
        ev_message = 'iv_enhname, iv_program, iv_full_name and iv_source are required for HOOK'.
        RETURN.
      ENDIF.
      IF iv_enhname(1) <> 'Z' AND iv_enhname(1) <> 'Y'.
        ev_message = |Enhancement { iv_enhname } is outside the customer namespace (Z/Y)|.
        RETURN.
      ENDIF.
      SPLIT iv_source AT cl_abap_char_utilities=>newline INTO TABLE lt_src.

      TRY.
          cl_enh_factory=>create_enhancement(
            EXPORTING
              enhname     = iv_enhname
              enhtype     = cl_abstract_enh_tool_redef=>credefinition
              enhtooltype = cl_enh_tool_hook_impl=>tooltype
              dark        = abap_true
            IMPORTING
              enhancement = lo_htool
            CHANGING
              trkorr      = lv_trkorr
              devclass    = lv_devclass ).

          lo_hook ?= lo_htool.
          lo_hook->set_original_object(
            pgmid    = 'R3TR'
            obj_name = CONV trobj_name( iv_program )
            obj_type = 'PROG'
            program  = iv_program ).
          lo_hook->add_hook_impl(
            enhmode   = iv_enhmode
            full_name = iv_full_name
            source    = lt_src
            spot      = iv_spot ).
          IF iv_text IS NOT INITIAL.
            lo_htool->if_enh_object_docu~set_shorttext( CONV string( iv_text ) ).
          ENDIF.

          lo_htool->if_enh_object~save(
            EXPORTING run_dark = abap_true
            CHANGING  trkorr   = lv_trkorr
                      devclass = lv_devclass ).
          lo_htool->if_enh_object~activate(
            EXPORTING run_dark = abap_true
            CHANGING  trkorr   = lv_trkorr
                      devclass = lv_devclass ).
          lo_htool->if_enh_object~unlock( ).

          COMMIT WORK AND WAIT.
          ev_ok = 'X'.
          ev_message = |Source enhancement { iv_enhname } created at { iv_full_name } (request { lv_trkorr })|.
        CATCH cx_enh_root INTO lx_henh.
          IF lo_htool IS BOUND.
            TRY.
                lo_htool->if_enh_object~unlock( ).
              CATCH cx_enh_root ##NO_HANDLER.
            ENDTRY.
          ENDIF.
          ROLLBACK WORK.
          ev_message = |{ cl_abap_classdescr=>get_class_name( lx_henh ) }: { lx_henh->get_text( ) }|.
      ENDTRY.

    WHEN 'CLASSIC'.
      " Not supported: the SE19 back end (SXO_IMPL_CREATE) builds an ALV grid for filter
      " values; via RFC it dumps (DYNPRO_SEND_IN_BACKGROUND), in a batch job the step
      " ends silently after the list output and nothing is created. Use SE19.
      ev_message = |Classic BAdI implementations cannot be created without SAP GUI: | &&
                   |create { iv_impl } for { iv_badi } in SE19 (class { iv_class })|.

    WHEN OTHERS.
      ev_message = |Unknown iv_kind { iv_kind } (use NEW or CLASSIC)|.
  ENDCASE.

ENDFUNCTION.
