FUNCTION znd_fm_adobe_ctx
  IMPORTING
    VALUE(iv_interface) TYPE fpname OPTIONAL
    VALUE(iv_form) TYPE fpname OPTIONAL
    VALUE(iv_devclass) TYPE devclass DEFAULT '$TMP'
    VALUE(iv_transport) TYPE trkorr OPTIONAL
    VALUE(iv_language) TYPE langu DEFAULT sy-langu
    VALUE(iv_if_text) TYPE fptext OPTIONAL
    VALUE(iv_form_text) TYPE fptext OPTIONAL
    VALUE(iv_template) TYPE fpname OPTIONAL
    VALUE(iv_mode) TYPE char20 DEFAULT 'STATUS'
    VALUE(iv_layout_base64) TYPE string OPTIONAL
    VALUE(iv_param1_name) TYPE fpvarname OPTIONAL
    VALUE(iv_param1_type) TYPE fptypename OPTIONAL
    VALUE(iv_param2_name) TYPE fpvarname OPTIONAL
    VALUE(iv_param2_type) TYPE fptypename OPTIONAL
    VALUE(iv_layout_type) TYPE fplayouttype DEFAULT 'S'
  EXPORTING
    VALUE(ev_rc) TYPE i
    VALUE(ev_message) TYPE string
    VALUE(ev_layout_base64) TYPE string.

* Adds NEW interface fields to an EXISTING (populated) Adobe form context.
* Same signature as ZND_FM_ADOBE_GEN, so adt_generate_adobe can call it with fm_name.
*
* For each context node named in IV_PARAM1_NAME / IV_PARAM2_NAME (a structure or a
* loop), the node is refreshed from the DDIC (IF_FP_STRUCTURE / IF_FP_LOOP REFRESH, the
* API behind the SFP refresh). Only the nodes that did not exist before are set active;
* nodes a developer deactivated on purpose stay as they are.
*
* IV_MODE
*   STATUS        dry run: refresh in memory and report the new fields, nothing is saved
*   SYNC_CONTEXT  refresh, save, activate and generate the form
*
* Why this works on a populated context, where ZND_FM_ADOBE_GEN SYNC_CONTEXT cannot:
* the form is loaded with CL_FP_WB_FORM=>LOAD (no delayed loading), so SAVE serializes
* the changed context. It is then activated with CL_FP_WB_FORM=>ACTIVATE, which reads
* the INACTIVE version, also without delayed loading. CL_FP_WB_HELPER=>FORM_ACTIVATE
* is not used: it loads with delayed loading and writes the raw context blob of the
* version it loaded back unchanged.

  TYPES: BEGIN OF lty_name,
           name TYPE fpnodename,
         END OF lty_name.

  DATA: lo_wb_form   TYPE REF TO if_fp_wb_form,
        lo_form      TYPE REF TO if_fp_form,
        lo_context   TYPE REF TO if_fp_context,
        lo_top       TYPE REF TO if_fp_node,
        lo_target    TYPE REF TO if_fp_node,
        lo_child     TYPE REF TO if_fp_node,
        lo_refreshed TYPE REF TO if_fp_node,
        lo_struct    TYPE REF TO if_fp_structure,
        lo_loop      TYPE REF TO if_fp_loop,
        lt_nodes     TYPE STANDARD TABLE OF fpnodename WITH EMPTY KEY,
        lt_before    TYPE SORTED TABLE OF lty_name WITH UNIQUE KEY name,
        lv_node      TYPE fpnodename,
        lv_count     TYPE i,
        lv_added     TYPE string,
        lv_total     TYPE i,
        lv_step      TYPE string VALUE 'START',
        lv_gen_note  TYPE string.

  CLEAR: ev_rc, ev_message, ev_layout_base64.

  IF iv_form IS INITIAL.
    ev_rc = 8.
    ev_message = 'IV_FORM is empty.'.
    RETURN.
  ENDIF.
  IF iv_mode <> 'STATUS' AND iv_mode <> 'SYNC_CONTEXT'.
    ev_rc = 8.
    ev_message = |Unknown IV_MODE '{ iv_mode }' - STATUS (dry run) or SYNC_CONTEXT expected.|.
    RETURN.
  ENDIF.

  IF iv_param1_name IS NOT INITIAL.
    APPEND CONV fpnodename( iv_param1_name ) TO lt_nodes.
  ENDIF.
  IF iv_param2_name IS NOT INITIAL.
    APPEND CONV fpnodename( iv_param2_name ) TO lt_nodes.
  ENDIF.
  IF lt_nodes IS INITIAL.
    ev_rc = 8.
    ev_message = 'Name the context nodes to refresh in IV_PARAM1_NAME / IV_PARAM2_NAME.'.
    RETURN.
  ENDIF.

  TRY.
      lv_step = 'LOAD'.
      IF iv_mode = 'SYNC_CONTEXT'.
        lo_wb_form = cl_fp_wb_form=>load( i_name     = iv_form
                                          i_mode     = if_fp_wb_object=>c_mode_write
                                          i_ordernum = iv_transport
                                          i_dark     = abap_true ).
      ELSE.
        lo_wb_form = cl_fp_wb_form=>load( i_name = iv_form
                                          i_dark = abap_true ).
      ENDIF.
      lo_form ?= lo_wb_form->get_object( ).
      lo_context = lo_form->get_context( ).

      LOOP AT lt_nodes INTO lv_node.
        lv_step = |FIND_{ lv_node }|.
        lo_top = lo_context->if_fp_node~get_child_by_name( lv_node ).
        IF lo_top IS NOT BOUND.
          ev_rc = 8.
          ev_message = |Context node { lv_node } not found in form { iv_form }.|.
          RETURN.
        ENDIF.

        CASE lo_top->get_type( ).
          WHEN if_fp_node=>c_type_structure.
            lo_struct ?= lo_top.
            lo_target = lo_top.
          WHEN if_fp_node=>c_type_loop.
            lo_loop ?= lo_top.
            lo_target = lo_loop->get_loop_data( ).
          WHEN OTHERS.
            ev_rc = 8.
            ev_message = |Context node { lv_node } is neither a structure nor a loop.|.
            RETURN.
        ENDCASE.

        CLEAR lt_before.
        lo_child = lo_target->get_child( ).
        WHILE lo_child IS BOUND.
          INSERT VALUE #( name = lo_child->get_name( ) ) INTO TABLE lt_before.
          lo_child = lo_child->get_successor( ).
        ENDWHILE.

        lv_step = |REFRESH_{ lv_node }|.
        CLEAR: lv_count, lo_refreshed.
        IF lo_top->get_type( ) = if_fp_node=>c_type_structure.
          lo_struct->refresh( IMPORTING e_refreshed_node = lo_refreshed
                              CHANGING  c_refreshed      = lv_count ).
        ELSE.
          lo_loop->refresh( IMPORTING e_refreshed_node = lo_refreshed
                            CHANGING  c_refreshed      = lv_count ).
        ENDIF.

        "refresh may return a new node instance - read the children from it
        IF lo_refreshed IS BOUND.
          lo_top = lo_refreshed.
          IF lo_top->get_type( ) = if_fp_node=>c_type_loop.
            lo_loop ?= lo_top.
            lo_target = lo_loop->get_loop_data( ).
          ELSE.
            lo_target = lo_top.
          ENDIF.
        ENDIF.

        lv_added = |{ lv_added } { lv_node }:|.
        lv_step = |ACTIVATE_NODES_{ lv_node }|.
        lo_child = lo_target->get_child( ).
        WHILE lo_child IS BOUND.
          IF NOT line_exists( lt_before[ name = lo_child->get_name( ) ] ).
            lo_child->set_state( if_fp_node=>c_state_active ).
            lv_added = |{ lv_added } { lo_child->get_name( ) }|.
            lv_total = lv_total + 1.
          ENDIF.
          lo_child = lo_child->get_successor( ).
        ENDWHILE.
      ENDLOOP.

      IF iv_mode = 'STATUS'.
        lo_wb_form->free( ).
        ev_rc = 0.
        ev_message = |DRY RUN form { iv_form }: { lv_total } new field(s).{ lv_added }. Nothing saved.|.
        RETURN.
      ENDIF.

      IF lv_total = 0.
        lo_wb_form->free( ).
        ev_rc = 4.
        ev_message = |Form { iv_form }: context already up to date, nothing saved.|.
        RETURN.
      ENDIF.

      lv_step = 'SAVE'.
      lo_wb_form->save( ).
      lv_step = 'COMMIT'.
      COMMIT WORK AND WAIT.
      lo_wb_form->free( ).

      lv_step = 'ACTIVATE'.
      cl_fp_wb_form=>activate( i_name     = iv_form
                               i_ordernum = iv_transport
                               i_dark     = abap_true ).
      COMMIT WORK AND WAIT.

      TRY.
          cl_fp_wb_form=>generate( i_name = iv_form ).
        CATCH cx_root INTO DATA(lx_gen).
          lv_gen_note = | (generate skipped: { lx_gen->get_text( ) })|.
      ENDTRY.

      ev_rc = 0.
      ev_message = |Form { iv_form }: { lv_total } field(s) added and activated.{ lv_added }.| &&
                   |{ lv_gen_note } Verify with GET_CONTEXT.|.
    CATCH cx_root INTO DATA(lx_any).
      ev_rc = 8.
      ev_message = |Context refresh failed [step={ lv_step }]: { lx_any->get_text( ) }|.
  ENDTRY.

ENDFUNCTION.
