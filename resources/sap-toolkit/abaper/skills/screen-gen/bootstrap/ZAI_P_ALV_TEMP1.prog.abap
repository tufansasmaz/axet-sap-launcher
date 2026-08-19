*&---------------------------------------------------------------------*
*& Report ZAI_P_ALV_TEMP1
*&---------------------------------------------------------------------*
*& KANONİK TEMPLATE 1 — Docking ALV (tek ALV, custom container YOK).
*& En basit klasik liste deseni: docking container içinde tam-ekran ALV.
*& - ALV = template-first (ADR 0012 / std 06 §2): field catalog (TR title +
*&   hotspot) + event handler (lcl_event) programa İNLİNE; reusable class YOK.
*& - Screen 0100 + GUI status STAT0100 + titlebar TIT0100 AI ile üretilir
*&   (ZAI_FM_SCREEN_GEN RFC FM, SOAP-RFC). Reçete: references/SCREEN_GEN_RECIPE.md.
*& - fcode: F3=BACK, Shift+F3=EXIT, F12=CANCEL (PAI'de handle).
*& Diğer template'ler: ZAI_P_ALV_TEMP2 (custom control container),
*&   ZAI_P_ALV_TEMP3 (split screen).
*&---------------------------------------------------------------------*
REPORT zai_p_alv_temp1.

TABLES vbak.

TYPES: BEGIN OF ty_row,
         vbeln TYPE vbak-vbeln,
         erdat TYPE vbak-erdat,
         ernam TYPE vbak-ernam,
         netwr TYPE vbak-netwr,
         waerk TYPE vbak-waerk,
       END OF ty_row.

DATA: gt_data    TYPE STANDARD TABLE OF ty_row,
      go_docking TYPE REF TO cl_gui_docking_container,
      go_grid    TYPE REF TO cl_gui_alv_grid,
      gt_fcat    TYPE lvc_t_fcat,
      gs_layout  TYPE lvc_s_layo.

SELECT-OPTIONS s_vbeln FOR vbak-vbeln.

CLASS lcl_event DEFINITION.
  PUBLIC SECTION.
    METHODS on_hotspot
      FOR EVENT hotspot_click OF cl_gui_alv_grid
      IMPORTING e_row_id e_column_id.
    METHODS on_double_click
      FOR EVENT double_click OF cl_gui_alv_grid
      IMPORTING e_row e_column.
    METHODS on_user_command
      FOR EVENT user_command OF cl_gui_alv_grid
      IMPORTING e_ucomm.
ENDCLASS.

CLASS lcl_event IMPLEMENTATION.
  METHOD on_hotspot.
    READ TABLE gt_data INTO DATA(ls_row) INDEX e_row_id-index.
    IF sy-subrc = 0.
      MESSAGE |Belge { ls_row-vbeln } seçildi (kolon { e_column_id-fieldname })| TYPE 'I'.
    ENDIF.
  ENDMETHOD.
  METHOD on_double_click.
    READ TABLE gt_data INTO DATA(ls_row) INDEX e_row-index.
    IF sy-subrc = 0.
      MESSAGE |Belge { ls_row-vbeln } (çift tık)| TYPE 'I'.
    ENDIF.
  ENDMETHOD.
  METHOD on_user_command.
    CASE e_ucomm.
      WHEN OTHERS.
    ENDCASE.
  ENDMETHOD.
ENDCLASS.

DATA go_evt TYPE REF TO lcl_event.

FORM build_fcat.
  gt_fcat = VALUE lvc_t_fcat(
    ( fieldname = 'VBELN' coltext = 'Satış Belgesi'    hotspot = abap_true outputlen = 12 )
    ( fieldname = 'ERDAT' coltext = 'Oluşturma Tarihi' )
    ( fieldname = 'ERNAM' coltext = 'Oluşturan' )
    ( fieldname = 'NETWR' coltext = 'Net Değer'        do_sum  = abap_true )
    ( fieldname = 'WAERK' coltext = 'Para Birimi' ) ).
ENDFORM.

START-OF-SELECTION.
  SELECT vbeln, erdat, ernam, netwr, waerk
    FROM vbak INTO TABLE @gt_data
    UP TO 500 ROWS
    WHERE vbeln IN @s_vbeln.
  CALL SCREEN 0100.

MODULE status_0100 OUTPUT.
  SET PF-STATUS 'STAT0100'.
  SET TITLEBAR 'TIT0100'.
  IF go_grid IS INITIAL.
    go_docking = NEW #( side  = cl_gui_docking_container=>dock_at_top
                        ratio = 95 ).
    go_grid    = NEW #( i_parent = go_docking ).
    PERFORM build_fcat.
    gs_layout = VALUE #( cwidth_opt = abap_true zebra = abap_true sel_mode = 'A' ).
    go_evt = NEW #( ).
    SET HANDLER go_evt->on_hotspot
                go_evt->on_double_click
                go_evt->on_user_command FOR go_grid.
    go_grid->set_table_for_first_display(
      EXPORTING is_layout = gs_layout i_save = 'A'
      CHANGING  it_outtab = gt_data it_fieldcatalog = gt_fcat ).
  ELSE.
    go_grid->refresh_table_display( ).
  ENDIF.
ENDMODULE.

MODULE exit_command_0100 INPUT.
  " type='E' fonksiyonlar (BACK/EXIT/CANCEL) + ESC -> AT EXIT-COMMAND ile buraya gelir.
  CASE sy-ucomm.
    WHEN 'BACK' OR 'EXIT' OR 'CANCEL'.
      LEAVE PROGRAM.
  ENDCASE.
ENDMODULE.

MODULE user_command_0100 INPUT.
  CASE sy-ucomm.
    WHEN 'BACK' OR 'EXIT' OR 'CANCEL'.
      LEAVE PROGRAM.
  ENDCASE.
ENDMODULE.
