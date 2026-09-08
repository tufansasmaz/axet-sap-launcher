FUNCTION znd_fm_screen_fields
  IMPORTING
    VALUE(iv_program) TYPE scrhprog
    VALUE(iv_dynpro) TYPE scrfdynnr DEFAULT '0100'
    VALUE(iv_transport) TYPE trkorr OPTIONAL
    VALUE(iv_title) TYPE rsmpe_titt-text DEFAULT 'Detay'
    VALUE(iv_fields) TYPE string OPTIONAL
    VALUE(iv_lines) TYPE i DEFAULT 20
    VALUE(iv_columns) TYPE i DEFAULT 100
    VALUE(iv_mode) TYPE char10 DEFAULT 'WRITE'
    VALUE(iv_recreate) TYPE char1 DEFAULT ' '
  EXPORTING
    VALUE(ev_rc) TYPE i
    VALUE(ev_message) TYPE string.

* Klasik Dynpro ETIKET + DEGER (template) alan-cifti ureteci - Screen
* Painter (SE51) deseni: solda sabit bir baslik, saginda o alana bagli
* cikti alani, satir basina bir cift. RFC-enabled; /sap/bc/soap/rfc
* uzerinden cagrilir (dialog context; classrun/ADT "400 Session Timed
* Out" verir).
*
* ZND_FM_SCREEN_GEN'in KARDESI, yerine gecmez:
*   ZND_FM_SCREEN_GEN  -> ALV docking/container ekrani + GUI status + titlebar
*   ZND_FM_SCREEN_FIELDS -> duz alan-cifti detay ekrani, GUI status'a HIC dokunmaz
* Bu FM STAT<n>/TIT<n> URETMEZ. Hedef dynpro'nun status/titlebar'i zaten
* var olmali: ayni dynpro numarasi icin bir kez ZND_FM_SCREEN_GEN calistir,
* sonra alan duzenini istedigin kadar bu FM ile yeniden kur.
*
* IV_FIELDS bicimi: "etiket1;alanadi1;uzunluk1|etiket2;alanadi2;uzunluk2|..."
*   etiket   -> sabit baslik metni (sol sutun, TEXT tipi alan)
*   alanadi  -> calisma aninda ekranin baglanacagi ABAP adi
*               (orn. GS_DETAIL-EBELN). Hedef programda GLOBAL bir
*               degisken ya da yapi bileseni OLMALI; lokal degisken ya da
*               sinif niteligi ekrana baglanamaz.
*   uzunluk  -> deger alaninin gorunur genisligi
* IV_MODE: WRITE (uret) / READ (incele) / DELETE (sil).
*
* KOK KONTEYNER SATIRI SILINMEMELI (asagida 'SCREEN'/'SCREEN' APPEND'i).
* RPY_DYNPRO_INSERT'in ic donusturucusu her elemanter alani CONTAINERS
* tablosunda tanimli bir konteynere baglamayi bekler. O satir olmadan
* EV_RC=0 doner ama alanlarin HICBIRI yazilmaz - hatasiz, sessiz kayip.
* NS4'te birebir yasandi: 24 alan gonderildi, ekranda yalnizca OKCODE vardi.
*
* RC=0 tek basina kanit degildir. Yazdiktan sonra IV_MODE='READ' ile
* dogrula: RPY_DYNPRO_READ'in fields_list (d021s) ciktisi, harici formattan
* cevrildikten sonra diskteki dynpro'ya GERCEKTEN ne yazildigini gosterir.

  DATA: ls_header TYPE rpy_dyhead,
        lt_cont   TYPE dycatt_tab,
        lt_f2c    TYPE dyfatc_tab,
        ls_f2c    TYPE LINE OF dyfatc_tab,
        lt_flow   TYPE STANDARD TABLE OF rpy_dyflow,
        ls_flow   TYPE rpy_dyflow,
        lt_native TYPE STANDARD TABLE OF d021s,
        ls_native TYPE d021s,
        lt_rows   TYPE STANDARD TABLE OF string,
        lt_cols   TYPE STANDARD TABLE OF string,
        lv_row    TYPE string,
        lv_line   TYPE i VALUE 2,
        lv_idx    TYPE i VALUE 0.

  CLEAR: ev_rc, ev_message.

*--- READ: yalnizca incele, yazma yok -----------------------------------
  IF iv_mode = 'READ'.
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
    ev_rc = sy-subrc.
    ev_message = |RPY_DYNPRO_READ subrc={ sy-subrc } ext_fields={ lines( lt_f2c ) } native={ lines( lt_native ) }|.
    LOOP AT lt_f2c INTO ls_f2c.
      ev_message = ev_message && | [{ ls_f2c-type } { ls_f2c-name } L{ ls_f2c-line } C{ ls_f2c-column }]|.
    ENDLOOP.
    LOOP AT lt_native INTO ls_native.
      ev_message = ev_message && | N[{ ls_native-fnam } t={ ls_native-type } L{ ls_native-line } C{ ls_native-coln } len={ ls_native-leng }]|.
    ENDLOOP.
    RETURN.
  ENDIF.

*--- DELETE: yalnizca dynpro'yu kaldir ----------------------------------
  IF iv_mode = 'DELETE'.
    CALL FUNCTION 'RS_SCRP_DELETE'
      EXPORTING
        dynnr           = iv_dynpro
        progname        = iv_program
        suppress_checks = 'X'
        with_popup      = space
      CHANGING
        corrnum         = iv_transport
      EXCEPTIONS
        OTHERS          = 0.
    ev_message = |Dynpro { iv_program }/{ iv_dynpro } silindi|.
    RETURN.
  ENDIF.

*--- WRITE: IV_FIELDS ayristir, TEXT + TEMPLATE ciftleri kur, ekle ------
  ls_header-program    = iv_program.
  ls_header-screen     = iv_dynpro.
  ls_header-language   = sy-langu.
  ls_header-descript   = iv_title.
  ls_header-type       = 'N'.
  ls_header-nextscreen = iv_dynpro.
  ls_header-lines      = iv_lines.
  ls_header-columns    = iv_columns.

  ls_flow-line = 'PROCESS BEFORE OUTPUT.'.                  APPEND ls_flow TO lt_flow.
  ls_flow-line = |  MODULE status_{ iv_dynpro }.|.          APPEND ls_flow TO lt_flow.
  ls_flow-line = 'PROCESS AFTER INPUT.'.                    APPEND ls_flow TO lt_flow.
  ls_flow-line = |  MODULE user_command_{ iv_dynpro }.|.    APPEND ls_flow TO lt_flow.

* Kok konteyner. Yukaridaki nota bak: bu satir olmadan alanlar sessizce dusulur.
  APPEND VALUE #( type = 'SCREEN' name = 'SCREEN' ) TO lt_cont.

  IF iv_recreate = 'X'.
    CALL FUNCTION 'RS_SCRP_DELETE'
      EXPORTING
        dynnr           = iv_dynpro
        progname        = iv_program
        suppress_checks = 'X'
        with_popup      = space
      CHANGING
        corrnum         = iv_transport
      EXCEPTIONS
        OTHERS          = 0.
  ENDIF.

  SPLIT iv_fields AT '|' INTO TABLE lt_rows.
  LOOP AT lt_rows INTO lv_row.
    CLEAR lt_cols.
    SPLIT lv_row AT ';' INTO TABLE lt_cols.
    IF lines( lt_cols ) < 3.
      CONTINUE.
    ENDIF.
    lv_idx  = lv_idx + 1.
    lv_line = lv_line + 1.

    CLEAR ls_f2c.
    ls_f2c-cont_type = 'SCREEN'.
    ls_f2c-cont_name = 'SCREEN'.
    ls_f2c-type      = 'TEXT'.
    ls_f2c-name      = |LBL{ lv_idx }|.
    ls_f2c-text      = lt_cols[ 1 ].
    ls_f2c-line      = lv_line.
    ls_f2c-column    = 3.
    ls_f2c-length    = strlen( lt_cols[ 1 ] ).
    APPEND ls_f2c TO lt_f2c.

    CLEAR ls_f2c.
    ls_f2c-cont_type  = 'SCREEN'.
    ls_f2c-cont_name  = 'SCREEN'.
    ls_f2c-type       = 'TEMPLATE'.
    ls_f2c-name       = lt_cols[ 2 ].
    ls_f2c-line       = lv_line.
    ls_f2c-column     = 30.
    ls_f2c-length     = lt_cols[ 3 ].
    ls_f2c-output_fld = 'X'.
    ls_f2c-outputonly = 'X'.
    APPEND ls_f2c TO lt_f2c.
  ENDLOOP.

  CALL FUNCTION 'RPY_DYNPRO_INSERT'
    EXPORTING
      header                 = ls_header
      corrnum                = iv_transport
      suppress_corr_checks   = space
    TABLES
      containers             = lt_cont
      fields_to_containers   = lt_f2c
      flow_logic             = lt_flow
    EXCEPTIONS
      cancelled              = 1
      already_exists         = 2
      program_not_exists     = 3
      not_executed           = 4
      missing_required_field = 5
      illegal_field_value    = 6
      field_not_allowed      = 7
      not_generated          = 8
      illegal_field_position = 9
      OTHERS                 = 10.
  ev_rc = sy-subrc.
  ev_message = |screen({ iv_program }/{ iv_dynpro }) rc={ sy-subrc } fields={ lines( lt_f2c ) }|.
  IF sy-subrc <> 0.
    ev_message = ev_message && | msg={ sy-msgid }{ sy-msgno } { sy-msgv1 } { sy-msgv2 } { sy-msgv3 } { sy-msgv4 }|.
  ENDIF.

ENDFUNCTION.
